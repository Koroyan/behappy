// Run: node --test server/test/webpush.test.mjs
// Web Push for the installed web app and browsers: which subscriptions are
// accepted, that messages are really encrypted for the browser and signed with
// the server's VAPID key, chat notifications by the same rules as phones, and
// server-sent reminders (each once, at its time, never after sign-out).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { after, before, describe, test } from 'node:test';

import { mountCommunity, startCommunityRealtime } from '../community/index.mjs';
import { cleanReminders, createPush } from '../notify/push.mjs';
import { mountPush } from '../notify/routes.mjs';
import { validWebEndpoint, validWebKeys } from '../notify/webpush.mjs';
import { startTestServer } from './helpers.mjs';

const require = createRequire(import.meta.url);
const webpush = require('web-push');
const ece = require('http_ece');

const HOUR = 60 * 60 * 1000;
const ROOM = 'sleep:en';

/** A browser: its own key pair and auth secret, like PushManager.subscribe() makes. */
function browser(host = 'fcm.googleapis.com') {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  const endpoint = `https://${host}/fcm/send/${crypto.randomBytes(12).toString('base64url')}`;
  return { ecdh, auth, endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
}

/** What the push service would receive: the real request web-push builds, decrypted with the browser's key. */
function fakePushService() {
  const received = [];
  const browsers = new Map();
  let answer = () => 201;
  const send = async (subscription, payload, options) => {
    const details = webpush.generateRequestDetails(subscription, payload, options);
    const b = browsers.get(subscription.endpoint);
    const plain = b ? ece.decrypt(details.body, { version: 'aes128gcm', privateKey: b.ecdh, authSecret: b.auth.toString('base64url') }).toString('utf8') : null;
    const code = answer(subscription.endpoint, received.length);
    received.push({ endpoint: subscription.endpoint, headers: details.headers, message: plain ? JSON.parse(plain) : null, code });
    if (code >= 400) throw Object.assign(new Error(`push service ${code}`), { statusCode: code });
    return { statusCode: code };
  };
  return {
    send,
    received,
    add: (b) => browsers.set(b.endpoint, b),
    answer: (fn) => {
      answer = fn;
    },
  };
}

/** Checks the VAPID JWT: ES256, signed by `publicKey`, for the push service's origin, not expired. */
function verifyVapid(headers, publicKey, endpoint) {
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(headers.Authorization);
  assert.ok(m, `VAPID header: ${headers.Authorization}`);
  assert.equal(m[2], publicKey);
  const [h, p, s] = m[1].split('.');
  const raw = Buffer.from(publicKey, 'base64url');
  const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33, 65).toString('base64url') }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${p}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')), 'VAPID signature verifies');
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  assert.equal(claims.aud, new URL(endpoint).origin);
  assert.ok(claims.exp * 1000 > Date.now());
  assert.match(claims.sub, /^mailto:|^https:/);
}

describe('Web Push rules (pure)', () => {
  test('only https endpoints at known push services are accepted', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QGx',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ])
      assert.equal(validWebEndpoint(ok), true, ok);
    for (const bad of [
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://127.0.0.1/fcm/send/abc',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'https://fcm.googleapis.com.evil.example/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'https://evil.example/x',
      `https://fcm.googleapis.com/${'a'.repeat(2100)}`,
      'ExponentPushToken[abc]',
      '',
    ])
      assert.equal(validWebEndpoint(bad), false, bad);
  });

  test('browser keys must be a P-256 point and a 16-byte secret', () => {
    const b = browser();
    assert.equal(validWebKeys(b.keys), true);
    assert.equal(validWebKeys({ ...b.keys, auth: crypto.randomBytes(8).toString('base64url') }), false);
    assert.equal(validWebKeys({ ...b.keys, p256dh: 'not base64!' }), false);
    assert.equal(validWebKeys(null), false);
  });

  test('a reminder plan accepts only app paths, known kinds and near times', () => {
    const now = Date.now();
    const r = { id: 'journal-2026-11-10', kind: 'journal', at: now + HOUR, title: 'BeHappy', body: 'A few minutes for your journal?', url: '/journal/editor' };
    assert.equal(cleanReminders([r], now).length, 1);
    assert.equal(cleanReminders([{ ...r, id: 'step-step_m3k9x2ab12cd-2026-11-10', kind: 'step', url: '/steps' }], now).length, 1, 'Step reminder ids');
    const refused = [
      { url: '//evil.example' },
      { url: 'https://evil.example' },
      { url: 'javascript:alert(1)' },
      { kind: 'anything' },
      { id: 'Bad Id' },
      { at: now + 9 * 24 * HOUR },
      { at: now - 3 * HOUR },
      { title: '' },
      { body: 'x'.repeat(301) },
    ];
    for (const patch of refused) assert.throws(() => cleanReminders([{ ...r, ...patch }], now), /bad_reminders/, JSON.stringify(patch));
    assert.throws(() => cleanReminders([r, r], now), /bad_reminders/, 'duplicate ids');
    assert.throws(() => cleanReminders(Array.from({ length: 61 }, (_, i) => ({ ...r, id: `step-${i}` })), now), /bad_reminders/);
  });
});

describe('Web Push', () => {
  let t;
  let push;
  let service;
  let publicKey;
  let clockAt = Date.now();
  const later = (ms = 2 * 60 * 1000) => (clockAt += ms);

  const member = async (name) => {
    const u = await t.registered(`${name.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    const p = await t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym: name, acceptGuidelines: true } });
    assert.equal(p.status, 200, JSON.stringify(p.json));
    await t.api(`/api/community/rooms/${ROOM}/join`, { token: u.token, method: 'POST' });
    return u;
  };
  const subscribe = async (u, extra = {}) => {
    const b = browser();
    service.add(b);
    const r = await t.api('/api/push/devices', { token: u.token, method: 'POST', body: { token: b.endpoint, platform: 'web', keys: b.keys, language: 'en', tz: 'UTC', ...extra } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return b;
  };
  // Default quiet hours (22:00-08:00) would hold chat pushes when the tests run at night.
  const awake = (u) => t.api('/api/push/prefs', { token: u.token, method: 'PUT', body: { prefs: { quiet: false } } });
  const plan = (u, b, reminders) => t.api('/api/push/reminders', { token: u.token, method: 'PUT', body: { token: b.endpoint, reminders } });
  const reminder = (id, at, extra = {}) => ({ id, kind: 'journal', at, title: 'BeHappy', body: 'A few minutes for your journal?', url: '/journal/editor', ...extra });
  const to = (b) => service.received.filter((m) => m.endpoint === b.endpoint);

  before(async () => {
    service = fakePushService();
    t = await startTestServer({
      extend: [mountCommunity, mountPush],
      services: [startCommunityRealtime],
      config: { push: { driver: 'log', autoFlush: false, web: {} }, quietPushLog: true },
    });
    t.app.locals.deps.webPushSend = service.send;
    push = t.app.locals.deps.push;
    await push.setPrefs((await t.newAccount()).accountId, {}).catch(() => {});
  });
  after(() => t.stop());

  test('the public key is served and stays the same (development keeps its pair)', async () => {
    const a = await t.api('/api/push/web-key');
    assert.equal(a.status, 200);
    publicKey = a.json.publicKey;
    assert.equal(Buffer.from(publicKey, 'base64url').length, 65);
    const b = await t.api('/api/push/web-key');
    assert.equal(b.json.publicKey, publicKey);
    const stored = (await t.db.query("select value from server_keys where name = 'vapid'")).rows[0];
    assert.ok(stored, 'the development pair is kept in the database');
  });

  test('a subscription is refused unless it points at a push service and has valid keys', async () => {
    const u = await member('Rezi');
    const b = browser();
    const post = (body) => t.api('/api/push/devices', { token: u.token, method: 'POST', body: { platform: 'web', language: 'en', ...body } });
    assert.equal((await post({ token: 'https://127.0.0.1/steal', keys: b.keys })).json.error, 'bad_token');
    assert.equal((await post({ token: b.endpoint, keys: { p256dh: 'x', auth: 'y' } })).json.error, 'bad_keys');
    assert.equal((await post({ token: b.endpoint, keys: b.keys, platform: 'ios' })).json.error, 'bad_token', 'a web endpoint is not an Expo token');
    assert.equal((await t.api('/api/push/devices', { method: 'POST', body: { token: b.endpoint, platform: 'web', keys: b.keys } })).status, 401);
  });

  test('a reply reaches the browser encrypted for it alone, signed with the server key, without the message text', async () => {
    const giorgi = await member('Giorgi');
    const lika = await member('Lika');
    const tab = await subscribe(lika);
    await awake(lika);
    const first = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: lika.token, method: 'POST', body: { body: 'Hello room' } });
    await t.api(`/api/community/rooms/${ROOM}/messages`, { token: giorgi.token, method: 'POST', body: { body: 'very private words', replyToId: first.json.message.id } });
    await push.flushOnce(later());
    const got = to(tab);
    assert.equal(got.length, 1, JSON.stringify(service.received.map((r) => r.message)));
    const { message, headers } = got[0];
    assert.equal(message.title, 'BeHappy');
    assert.equal(message.tag, 'behappy-chats');
    assert.match(message.url, /^\/community\//);
    assert.ok(!JSON.stringify(message).includes('private words'), 'no message text in a push');
    assert.equal(headers['Content-Encoding'], 'aes128gcm');
    assert.equal(headers.Urgency, 'high');
    assert.ok(Number(headers.TTL) > 0);
    verifyVapid(headers, publicKey, tab.endpoint);
  });

  test('a browser registered only for reminders gets no chat pushes', async () => {
    const nino = await member('Nino');
    const sandro = await member('Sandro');
    const tab = await subscribe(nino, { chats: false });
    await awake(nino);
    const first = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: nino.token, method: 'POST', body: { body: 'Hi' } });
    await t.api(`/api/community/rooms/${ROOM}/messages`, { token: sandro.token, method: 'POST', body: { body: 'Hi Nino', replyToId: first.json.message.id } });
    await push.flushOnce(later());
    assert.equal(to(tab).length, 0);
    // The same person turns chat pushes on for this browser: now the next reply arrives.
    await t.api('/api/push/devices', { token: nino.token, method: 'POST', body: { token: tab.endpoint, platform: 'web', keys: tab.keys, language: 'en', tz: 'UTC', chats: true } });
    await t.api(`/api/community/rooms/${ROOM}/messages`, { token: sandro.token, method: 'POST', body: { body: 'Still there?', replyToId: first.json.message.id } });
    await push.flushOnce(later());
    assert.equal(to(tab).length, 1);
  });

  test('reminders: sent once at their time, replanning replaces pending ones, late ones are dropped', async () => {
    const u = await member('Ana');
    const tab = await subscribe(u, { chats: false });
    const now = Date.now();
    const r1 = reminder('journal-a', now + HOUR);
    const r2 = reminder('cards-a', now + 3 * HOUR, { kind: 'cards', url: '/cards', body: 'A card for today?' });
    const res = await plan(u, tab, [r1, r2]);
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.deepEqual(res.json.pending.map((p) => p.id), ['journal-a', 'cards-a']);

    await push.flushOnce(now + 30 * 60 * 1000);
    assert.equal(to(tab).length, 0, 'nothing before its time');

    await push.flushOnce(now + HOUR + 1000);
    assert.equal(to(tab).length, 1);
    assert.deepEqual(to(tab)[0].message, { title: 'BeHappy', body: 'A few minutes for your journal?', url: '/journal/editor', kind: 'reminder', reminder: 'journal', tag: 'behappy-reminder-journal' });
    verifyVapid(to(tab)[0].headers, publicKey, tab.endpoint);

    await push.flushOnce(now + HOUR + 60 * 1000);
    assert.equal(to(tab).length, 1, 'never twice');
    const sent = (await t.db.query("select status, title, body, sent_at from push_reminders where token = $1 and reminder_id = 'journal-a'", [tab.endpoint])).rows[0];
    assert.equal(sent.status, 'sent');
    assert.ok(sent.sent_at);
    assert.equal(sent.title + sent.body, '', 'the text is not kept once sent');

    // The app plans again (journal-a is still in its list; cards-a moved; a new one appeared).
    const again = await plan(u, tab, [r1, { ...r2, at: now + 4 * HOUR }, reminder('journal-b', now + 5 * HOUR)]);
    assert.deepEqual(again.json.pending.map((p) => p.id), ['cards-a', 'journal-b'], 'a sent reminder is not planned again');
    await push.flushOnce(now + 3 * HOUR + 1000);
    assert.equal(to(tab).length, 1, 'the moved reminder is not sent at its old time');

    // The person did it already: the next plan leaves it out, so it is cancelled.
    await plan(u, tab, [reminder('journal-b', now + 5 * HOUR)]);
    await push.flushOnce(now + 4 * HOUR + 1000);
    assert.equal(to(tab).length, 1, 'cancelled');

    // The server was down for three hours: a reminder that late is dropped, not sent.
    await push.flushOnce(now + 8 * HOUR);
    assert.equal(to(tab).length, 1);
    const row = (await t.db.query("select status from push_reminders where token = $1 and reminder_id = 'journal-b'", [tab.endpoint])).rows[0];
    assert.equal(row.status, 'expired');
  });

  test('reminders: only for your own browser, and a bad plan changes nothing', async () => {
    const owner = await member('Tamar');
    const other = await member('Luka');
    const tab = await subscribe(owner, { chats: false });
    const now = Date.now();
    await plan(owner, tab, [reminder('journal-x', now + HOUR)]);
    assert.equal((await plan(other, tab, [reminder('journal-y', now + HOUR)])).status, 404, 'someone else’s browser');
    assert.equal((await plan(owner, { endpoint: 'https://fcm.googleapis.com/fcm/send/unknown' }, [])).status, 404);
    assert.equal((await plan(owner, tab, [reminder('journal-z', now + HOUR, { url: '//evil.example' })])).status, 400);
    const pending = (await t.db.query("select reminder_id from push_reminders where token = $1 and status = 'pending'", [tab.endpoint])).rows.map((r) => r.reminder_id);
    assert.deepEqual(pending, ['journal-x'], 'the refused plan replaced nothing');
  });

  test('reminders: a temporary error is retried, a gone subscription is removed with its reminders', async () => {
    const u = await member('Keti');
    const tab = await subscribe(u, { chats: false });
    const now = Date.now();
    await plan(u, tab, [reminder('journal-r', now + HOUR), reminder('cards-r', now + 2 * HOUR, { kind: 'cards', url: '/cards' })]);
    let fail = true;
    service.answer((endpoint) => (endpoint === tab.endpoint && fail ? 503 : 201));
    await push.flushOnce(now + HOUR + 1000);
    assert.equal(to(tab).length, 1);
    assert.equal(to(tab)[0].code, 503);
    fail = false;
    await push.flushOnce(now + HOUR + 1000 + 10 * 1000);
    assert.equal(to(tab).length, 1, 'waits for the backoff');
    await push.flushOnce(now + HOUR + 2 * 60 * 1000);
    assert.equal(to(tab).length, 2);
    assert.equal(to(tab)[1].code, 201);

    service.answer((endpoint) => (endpoint === tab.endpoint ? 410 : 201));
    await push.flushOnce(now + 2 * HOUR + 1000);
    service.answer(() => 201);
    assert.equal((await t.db.query('select 1 from push_devices where token = $1', [tab.endpoint])).rowCount, 0, 'subscription removed');
    assert.equal((await t.db.query('select 1 from push_reminders where token = $1', [tab.endpoint])).rowCount, 0, 'its reminders too');
  });

  test('reminders stop when the person signs out', async () => {
    const u = await member('Dato');
    const tab = await subscribe(u, { chats: false });
    const now = Date.now();
    await plan(u, tab, [reminder('journal-s', now + HOUR)]);
    await t.api('/api/auth/logout', { token: u.token, method: 'POST', body: {} });
    await push.flushOnce(now + HOUR + 1000);
    assert.equal(to(tab).length, 0);
  });

  test('two server instances never send the same reminder twice', async () => {
    const u = await member('Mari');
    const tab = await subscribe(u, { chats: false });
    const now = Date.now();
    await plan(u, tab, [reminder('journal-m', now + HOUR), reminder('cards-m', now + HOUR + 1000, { kind: 'cards', url: '/cards' })]);
    const second = createPush({ ...t.app.locals.deps, webPushSend: service.send });
    const moment = now + HOUR + 5000;
    await Promise.all([push.flushOnce(moment), second.flushOnce(moment)]);
    assert.equal(to(tab).length, 2);
    assert.deepEqual(to(tab).map((m) => m.message.reminder).sort(), ['cards', 'journal']);
  });

  test('the same browser signed in to another account: the first account’s reminders go away', async () => {
    const a = await member('Eka');
    const b = await member('Irakli');
    const tab = await subscribe(a, { chats: false });
    const now = Date.now();
    await plan(a, tab, [reminder('journal-e', now + HOUR)]);
    const r = await t.api('/api/push/devices', { token: b.token, method: 'POST', body: { token: tab.endpoint, platform: 'web', keys: tab.keys, language: 'en', chats: false } });
    assert.equal(r.status, 200);
    await push.flushOnce(now + HOUR + 1000);
    assert.equal(to(tab).length, 0);
  });
});
