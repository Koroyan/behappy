// Web Push: notifications for the installed BeHappy web app and browsers.
//
// The browser gives the app a subscription: an endpoint URL at its push
// service (Google, Mozilla, Apple, Microsoft) and two public keys. Messages
// are encrypted for that browser alone (RFC 8291) and signed with BeHappy's
// VAPID key (RFC 8292); the push service can neither read nor forge them.
// The `web-push` library does both; this module adds the rules:
//
//  - Only endpoints at known push services are accepted. The server makes
//    requests to these URLs, so anything else (an internal address, a random
//    site) is refused when the subscription is registered.
//  - VAPID keys come from the environment (WEB_PUSH_PUBLIC_KEY / _PRIVATE_KEY /
//    _SUBJECT). Development makes a pair once and keeps it in the database, so
//    subscriptions survive restarts. Production without keys: web push is off.
//  - Errors are mapped onto the push queue's words (push.mjs): 404/410 mean the
//    subscription is gone ("DeviceNotRegistered"), 429/5xx/network are retried.

import { createHash } from 'node:crypto';

import webpush from 'web-push';

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge (some), Android browsers, Opera, Samsung Internet
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/, // Safari, installed iOS web apps (iOS 16.4+)
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge on Windows (WNS)
];
const B64URL = /^[A-Za-z0-9_-]+$/;

const b64urlBytes = (s) => {
  try {
    return Buffer.from(String(s), 'base64url').length;
  } catch {
    return 0;
  }
};

/** A push service endpoint BeHappy may send to (https, known host, no credentials or odd ports). */
export function validWebEndpoint(endpoint, extraHosts = []) {
  const s = String(endpoint || '');
  if (s.length > 2048) return false;
  let u;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false;
  return [...PUSH_HOSTS, ...extraHosts].some((re) => re.test(u.hostname));
}

/** The browser's keys: p256dh is an uncompressed P-256 point (65 bytes), auth 16 bytes. */
export function validWebKeys(keys) {
  const p = keys?.p256dh;
  const a = keys?.auth;
  return typeof p === 'string' && typeof a === 'string' && B64URL.test(p) && B64URL.test(a) && b64urlBytes(p) === 65 && b64urlBytes(a) === 16;
}

/**
 * The contact in every VAPID signature ("sub"). Apple's push service refuses
 * made-up ones (403 BadJwtToken: localhost, .invalid and the like), so: the
 * configured WEB_PUSH_SUBJECT, else SUPPORT_EMAIL, else the app's own public
 * https address (development: the tunnel in APP_PUBLIC_URLS).
 */
export function vapidSubject(config = {}) {
  const c = config.push?.web || {};
  if (/^(mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}|https:\/\/)/i.test(c.subject || '')) return c.subject;
  if (config.supportEmail) return `mailto:${config.supportEmail}`;
  const publicUrl = [...(config.appPublicUrls || []), config.publicApiUrl].find((u) => /^https:\/\//.test(u || '') && !/\/\/(localhost|127\.|\[::1\])/.test(u));
  return publicUrl || 'https://behappy.app';
}

/** The VAPID key pair: configured, or (development) made once and kept. Null = web push off. */
export async function vapidKeys(deps) {
  if (deps.vapid) return deps.vapid;
  deps.vapid = (async () => {
    const c = deps.config?.push?.web || {};
    const subject = vapidSubject(deps.config);
    if (c.publicKey && c.privateKey) return { publicKey: c.publicKey, privateKey: c.privateKey, subject };
    if (deps.config?.isProduction) return null;
    const row = (await deps.db.query("select value from server_keys where name = 'vapid'")).rows[0];
    if (row) return { ...JSON.parse(row.value), subject };
    const pair = webpush.generateVAPIDKeys();
    await deps.db.query("insert into server_keys (name, value) values ('vapid', $1) on conflict (name) do nothing", [JSON.stringify(pair)]);
    const kept = (await deps.db.query("select value from server_keys where name = 'vapid'")).rows[0];
    return { ...JSON.parse(kept.value), subject };
  })().catch((e) => {
    deps.vapid = null;
    throw e;
  });
  return deps.vapid;
}

/**
 * The Topic header (messages with the same topic replace each other while
 * waiting at the push service). RFC 8030 allows up to 32 base64url
 * characters, but Apple also decodes it as base64url and refuses a length
 * no base64 string can have (4n+1: "chats", "r-checkin") with 400
 * BadWebPushTopic, so the notification never arrives. Such names, and
 * anything else unusual, become a fixed 32-character digest of the name:
 * still the same topic every time for the same name.
 */
export function webTopic(name) {
  if (!name) return undefined;
  const s = String(name);
  if (s.length <= 32 && B64URL.test(s) && s.length % 4 !== 1) return s;
  return createHash('sha256').update(s).digest('base64url').slice(0, 32);
}

const TEMPORARY_STATUS = (code) => code === 429 || code >= 500;

/**
 * Sends one message to one subscription. Returns { status: 'ok' } or
 * { status: 'error', error, final? } in the push queue's terms.
 * deps.webPushSend (tests) replaces the network call: (subscription, payload, options) → { statusCode }.
 */
export async function sendWebPush(deps, device, message, { ttlSeconds = 4 * 60 * 60, urgency = 'normal', topic } = {}) {
  const keys = await vapidKeys(deps).catch(() => null);
  if (!keys) return { status: 'error', error: 'web_push_off', final: true };
  const subscription = { endpoint: device.token, keys: { p256dh: device.web_p256dh, auth: device.web_auth } };
  const payload = JSON.stringify(message);
  const safeTopic = webTopic(topic);
  const options = {
    TTL: ttlSeconds,
    urgency,
    ...(safeTopic ? { topic: safeTopic } : {}),
    vapidDetails: { subject: keys.subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
    timeout: 15000,
  };
  try {
    const send = deps.webPushSend || ((s, p, o) => webpush.sendNotification(s, p, o));
    const res = await send(subscription, payload, options);
    const code = Number(res?.statusCode || 201);
    if (code >= 200 && code < 300) return { status: 'ok', id: null };
    return mapStatus(code);
  } catch (e) {
    if (e?.statusCode) return mapStatus(Number(e.statusCode), e.body);
    return { status: 'error', error: e?.code === 'ETIMEDOUT' || /timeout/i.test(String(e?.message)) ? 'timeout' : 'network' };
  }
}

function mapStatus(code, body) {
  if (code === 404 || code === 410) return { status: 'error', error: 'DeviceNotRegistered' };
  if (code === 429) return { status: 'error', error: 'http_429' };
  if (TEMPORARY_STATUS(code)) return { status: 'error', error: 'http_5xx' };
  let reason = '';
  try {
    reason = String(JSON.parse(String(body || '{}')).reason || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40);
  } catch {
    reason = '';
  }
  return { status: 'error', error: reason ? `http_${code}_${reason}` : `http_${code}`, final: true };
}
