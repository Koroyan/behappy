// Phone notifications (Expo push service) for in-app notifications.
//
// Every notification is written to the database first (notify.mjs); this
// module only decides whether, when and how to tell the person's phones about
// it. The rules are meant to be helpful rather than loud:
//
//  - Only what is still unread. A reply in a room the person has since read,
//    or a private message they already opened, is never pushed.
//  - Not while they are looking at it. Someone reading that room or thread
//    right now sees the message live; their phone stays quiet.
//  - One push per burst and phone. Several notifications become a single
//    summary ("New notifications: 3"); a phone gets at most one push a minute.
//  - Quiet hours (22:00–08:00 by default) on EACH phone's own clock: a phone in
//    New York stays quiet at night even when the person's phone in Tbilisi is
//    awake. What is still unread afterwards comes as one summary. After 14
//    hours a notification stays in the app only.
//  - Categories the person turned off are never pushed. Names appear only if
//    they chose "show who wrote"; message text never does (see pushText.mjs).
//
// Reliability (migration 013): a notification becomes one delivery record per
// phone. A delivery is marked "sent" only when Expo accepted it (a ticket);
// temporary errors (network, 5xx, 429, rate limits) are retried with
// exponential backoff (30 s, 1, 2, 4 min…, at most 5 attempts); phones Expo no
// longer knows are removed; deliveries claimed by a worker that crashed are
// taken back after 5 minutes. Claims happen in a transaction with
// FOR UPDATE SKIP LOCKED, so several server instances never send the same
// delivery twice. Later, Expo's receipts say whether Apple/Google accepted it
// (receipt_status) — the closest a server can get to "delivered".
//
// Drivers: "expo" (https://exp.host, the default), "log" (development and
// tests: kept in `outbox`, nothing leaves the machine) and "off".

import { ms, ts } from '../db/index.mjs';
import { categoryOf, pushText, pushUrl } from './pushText.mjs';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const MAX_AGE = 14 * HOUR;
const MIN_GAP = MINUTE;
const MAX_ATTEMPTS = 5;
const STUCK_AFTER = 5 * MINUTE;
const RECEIPT_AFTER = 15 * MINUTE;
const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';
const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;
// Expo ticket/receipt errors worth trying again later; everything else is final.
const TEMPORARY = new Set(['MessageRateExceeded', 'network', 'http_5xx', 'http_429', 'timeout', 'unknown']);

export const DEFAULT_PREFS = Object.freeze({
  community: true,
  messages: true,
  appointments: true,
  account: true,
  previews: false,
  quiet: true,
  quietFrom: 22 * 60,
  quietTo: 8 * 60,
});

const minuteOfDay = (v, fallback) => (Number.isInteger(v) && v >= 0 && v < 24 * 60 ? v : fallback);

/** Only known keys with the right types; anything else keeps its default. */
export function cleanPrefs(input = {}, base = DEFAULT_PREFS) {
  const out = { ...base };
  for (const k of ['community', 'messages', 'appointments', 'account', 'previews', 'quiet']) if (typeof input[k] === 'boolean') out[k] = input[k];
  out.quietFrom = minuteOfDay(input.quietFrom, base.quietFrom);
  out.quietTo = minuteOfDay(input.quietTo, base.quietTo);
  return out;
}

/** Minutes after local midnight in an IANA time zone (UTC if it is unknown). */
export function localMinutes(now, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now));
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return (h % 24) * 60 + m;
  } catch {
    // unknown zone
  }
  const d = new Date(now);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Inside quiet hours? The window may cross midnight (22:00–08:00). */
export function inQuietHours(prefs, now, tz) {
  if (!prefs.quiet || prefs.quietFrom === prefs.quietTo) return false;
  const m = localMinutes(now, tz);
  return prefs.quietFrom < prefs.quietTo ? m >= prefs.quietFrom && m < prefs.quietTo : m >= prefs.quietFrom || m < prefs.quietTo;
}

/** When the phone's quiet hours end (ms), counted on its own clock. */
export function quietEndsAt(prefs, now, tz) {
  const m = localMinutes(now, tz);
  const minutes = (prefs.quietTo - m + 24 * 60) % (24 * 60) || 24 * 60;
  return now + minutes * MINUTE - (new Date(now).getUTCSeconds() * 1000) + 1000;
}

/** Wait before attempt n+1: 30 s, 1, 2, 4, 8 min (at most 30 min). */
export const backoffMs = (attempts) => Math.min(30 * MINUTE, 30 * 1000 * 2 ** Math.max(0, attempts - 1));

export const validPushToken = (token) => TOKEN_RE.test(String(token || ''));

export function createPush(deps) {
  const { db, clock } = deps;
  const driver = String(deps.config?.push?.driver || 'log').toLowerCase();
  const accessToken = deps.config?.push?.accessToken || '';
  // Read when sending, so tests can put a fake Expo endpoint in place.
  const send = (...a) => (deps.pushFetch || globalThis.fetch)(...a);
  const outbox = [];
  let running = null;
  let poked = null;

  async function getPrefs(q, accountId) {
    const r = await q.query('select prefs from notification_prefs where account_id = $1', [accountId]);
    return cleanPrefs(r.rows[0]?.prefs || {});
  }

  async function setPrefs(accountId, input) {
    const next = cleanPrefs(input, await getPrefs(db, accountId));
    await db.query(
      'insert into notification_prefs (account_id, prefs, updated_at) values ($1, $2::jsonb, $3) on conflict (account_id) do update set prefs = excluded.prefs, updated_at = excluded.updated_at',
      [accountId, JSON.stringify(next), ts(clock.now())]
    );
    return next;
  }

  async function registerDevice(account, { token, platform, language, tz }) {
    const now = clock.now();
    const had = await db.query('select 1 from push_devices where account_id = $1 limit 1', [account.id]);
    await db.query(
      `insert into push_devices (token, account_id, session_id, platform, language, tz, created_at, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7, $7)
       on conflict (token) do update set account_id = excluded.account_id, session_id = excluded.session_id, platform = excluded.platform,
         language = excluded.language, tz = excluded.tz, last_seen_at = excluded.last_seen_at`,
      [token, account.id, account.sessionId || null, platform, String(language || 'en').slice(0, 12), tz ? String(tz).slice(0, 64) : null, ts(now)]
    );
    // The phone now belongs to this account: nothing still queued for someone else.
    await db.query("update push_deliveries set status = 'skipped', last_error = 'device_reassigned' where token = $1 and account_id <> $2 and status in ('pending', 'sending')", [token, account.id]);
    // A first phone starts fresh: what is already in the app is not pushed now.
    if (!had.rowCount) await db.query('update notifications set pushed_at = $2 where account_id = $1 and pushed_at is null', [account.id, ts(now)]);
  }

  async function removeDevice(account, token) {
    await db.query('delete from push_devices where token = $1 and account_id = $2', [token, account.id]);
  }

  /** The app icon number: unread notifications plus unread private messages. */
  async function badgeFor(q, accountId) {
    const n = await q.query('select count(*)::int as n from notifications where account_id = $1 and read_at is null', [accountId]);
    const m = await q.query(
      `select count(*)::int as n from pro_messages m join pro_threads th on th.id = m.thread_id
       left join professional_profiles p on p.id = th.professional_id
       where (th.client_account_id = $1 and m.sender_kind = 'professional' and m.created_at > coalesce(th.client_last_read_at, 'epoch'::timestamptz))
          or (p.account_id = $1 and m.sender_kind = 'client' and m.created_at > coalesce(th.pro_last_read_at, 'epoch'::timestamptz))`,
      [accountId]
    );
    return n.rows[0].n + m.rows[0].n;
  }

  /** Still worth telling? (Not read in the app, the room or the thread since.) */
  async function stillUnread(q, n) {
    if (n.read_at) return false;
    const d = n.data || {};
    if (n.kind.startsWith('community_') && d.roomId && d.messageId) {
      const r = await q.query(
        `select m.last_read_message_id, cm.status from room_memberships m left join community_messages cm on cm.id = $3
         where m.room_id = $1 and m.account_id = $2`,
        [d.roomId, n.account_id, Number(d.messageId)]
      );
      const row = r.rows[0];
      return Boolean(row && Number(row.last_read_message_id) < Number(d.messageId) && (row.status === 'visible' || row.status == null));
    }
    if (n.kind === 'pro_message' && d.threadId) {
      const r = await q.query('select client_account_id, client_last_read_at, pro_last_read_at from pro_threads where id = $1', [d.threadId]);
      const th = r.rows[0];
      if (!th) return false;
      const readAt = ms(th.client_account_id === n.account_id ? th.client_last_read_at : th.pro_last_read_at);
      return !readAt || readAt < ms(n.created_at);
    }
    return true;
  }

  /** Looking at it right now (that room or thread open on a connected device)? */
  async function watching(n) {
    const d = n.data || {};
    const live = deps.realtime?.isWatching;
    if (!live) return false;
    if (n.kind.startsWith('community_') && d.roomId) return live(n.account_id, `room:${d.roomId}`);
    if (n.kind === 'pro_message' && d.threadId) return live(n.account_id, `thread:${d.threadId}`);
    return false;
  }

  /** Sends messages; returns one ticket per message ({ status: 'ok', id } or { status: 'error', error }). */
  async function deliver(messages) {
    if (!messages.length) return [];
    if (driver === 'off') return messages.map(() => ({ status: 'error', error: 'push_off', final: true }));
    if (driver !== 'expo') {
      outbox.push(...messages);
      if (outbox.length > 200) outbox.splice(0, outbox.length - 200);
      if (!deps.config?.isProduction && driver === 'log' && !deps.config?.quietPushLog) console.log(`[push] (log) ${messages.length} message(s) → ${messages.map((m) => m.body).join(' | ')}`);
      return messages.map((_, i) => ({ status: 'ok', id: `log-${clock.now()}-${i}` }));
    }
    const tickets = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      let res;
      try {
        res = await send(EXPO_SEND, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: JSON.stringify(chunk),
        });
      } catch (e) {
        console.warn('[push] could not reach the Expo push service:', e?.message);
        chunk.forEach(() => tickets.push({ status: 'error', error: 'network' }));
        continue;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = res.status === 429 ? 'http_429' : res.status >= 500 ? 'http_5xx' : `http_${res.status}`;
        console.warn(`[push] Expo answered ${res.status}`);
        chunk.forEach(() => tickets.push({ status: 'error', error }));
        continue;
      }
      const data = Array.isArray(body?.data) ? body.data : [];
      chunk.forEach((_, j) => {
        const t = data[j];
        if (t?.status === 'ok') tickets.push({ status: 'ok', id: t.id || null });
        else tickets.push({ status: 'error', error: t?.details?.error || 'unknown', message: t?.message });
      });
    }
    return tickets;
  }

  /** Turns new notifications into one pending delivery per active phone. */
  async function expand(now) {
    await db.query('update notifications set pushed_at = $1 where pushed_at is null and (read_at is not null or created_at < $2)', [ts(now), ts(now - MAX_AGE)]);
    return db.tx(async (t) => {
      const rows = (
        await t.query(
          `select id, account_id from notifications where pushed_at is null and read_at is null and created_at >= $1 order by id limit 500 for update skip locked`,
          [ts(now - MAX_AGE)]
        )
      ).rows;
      if (!rows.length) return 0;
      const ids = rows.map((r) => r.id);
      // Phones whose session is neither revoked nor expired.
      await t.query(
        `insert into push_deliveries (notification_id, account_id, token, next_attempt_at)
         select n.id, n.account_id, d.token, $2 from notifications n
         join push_devices d on d.account_id = n.account_id
         join sessions s on s.id = d.session_id and s.revoked_at is null and (s.expires_at is null or s.expires_at > $2)
         where n.id = any($1::bigint[])
         on conflict (notification_id, token) do nothing`,
        [ids, ts(now)]
      );
      await t.query('update notifications set pushed_at = $2 where id = any($1::bigint[])', [ids, ts(now)]);
      return rows.length;
    });
  }

  /** Takes due deliveries for this worker (other workers skip them). */
  async function claim(now) {
    await db.query("update push_deliveries set status = 'pending', claimed_at = null where status = 'sending' and claimed_at < $1", [ts(now - STUCK_AFTER)]);
    await db.query(
      `update push_deliveries d set status = 'expired', last_error = 'too_old' from notifications n
       where d.notification_id = n.id and d.status = 'pending' and n.created_at < $1`,
      [ts(now - MAX_AGE)]
    );
    return db.tx(async (t) => {
      const due = (await t.query("select id from push_deliveries where status = 'pending' and next_attempt_at <= $1 order by id limit 500 for update skip locked", [ts(now)])).rows.map((r) => r.id);
      if (!due.length) return [];
      return (
        await t.query(
          `update push_deliveries set status = 'sending', claimed_at = $2 where id = any($1::bigint[])
           returning id, notification_id, account_id, token, attempts`,
          [due, ts(now)]
        )
      ).rows;
    });
  }

  const setStatus = (ids, status, extra = {}) =>
    ids.length
      ? db.query(
          `update push_deliveries set status = $2, claimed_at = null, last_error = coalesce($3, last_error), next_attempt_at = coalesce($4, next_attempt_at), sent_at = coalesce($5, sent_at), ticket_id = coalesce($6, ticket_id), attempts = attempts + $7 where id = any($1::bigint[])`,
          [ids, status, extra.error ?? null, extra.next ? ts(extra.next) : null, extra.sentAt ? ts(extra.sentAt) : null, extra.ticket ?? null, extra.attempt ? 1 : 0]
        )
      : null;

  /** One pass: expand, claim, decide per phone, send, record. */
  async function flushOnce(now = clock.now()) {
    const out = { sent: 0, skipped: 0, held: 0, retried: 0, failed: 0 };
    await expand(now);
    const claimed = await claim(now);
    if (!claimed.length) {
      await checkReceipts(now).catch(() => {});
      return out;
    }

    const notifications = new Map(
      (await db.query('select id, account_id, kind, data, created_at, read_at from notifications where id = any($1::bigint[])', [[...new Set(claimed.map((c) => c.notification_id))]])).rows.map((n) => [Number(n.id), n])
    );
    const byToken = new Map();
    for (const d of claimed) byToken.set(d.token, [...(byToken.get(d.token) || []), d]);

    const messages = [];
    const plan = [];
    const prefsCache = new Map();
    const badgeCache = new Map();
    for (const [token, list] of byToken) {
      const device = (
        await db.query(
          `select d.token, d.account_id, d.language, d.tz, d.last_push_at from push_devices d join sessions s on s.id = d.session_id
           where d.token = $1 and s.revoked_at is null and (s.expires_at is null or s.expires_at > $2)`,
          [token, ts(now)]
        )
      ).rows[0];
      if (!device || device.account_id !== list[0].account_id) {
        await setStatus(list.map((d) => d.id), 'skipped', { error: 'device_gone' });
        out.skipped += list.length;
        continue;
      }
      if (!prefsCache.has(device.account_id)) prefsCache.set(device.account_id, await getPrefs(db, device.account_id));
      const prefs = prefsCache.get(device.account_id);

      const keep = [];
      const drop = [];
      for (const d of list) {
        const n = notifications.get(Number(d.notification_id));
        if (!n || !prefs[categoryOf(n.kind)] || !(await stillUnread(db, n)) || (await watching(n))) drop.push(d.id);
        else keep.push({ d, n });
      }
      if (drop.length) {
        await setStatus(drop, 'skipped', { error: 'not_needed' });
        out.skipped += drop.length;
      }
      if (!keep.length) continue;

      // This phone's own night, and at most one push a minute to it.
      let wait = null;
      if (inQuietHours(prefs, now, device.tz)) wait = quietEndsAt(prefs, now, device.tz);
      else if (device.last_push_at && now - ms(device.last_push_at) < MIN_GAP) wait = ms(device.last_push_at) + MIN_GAP;
      if (wait) {
        await setStatus(keep.map((k) => k.d.id), 'pending', { next: wait });
        out.held += keep.length;
        continue;
      }

      if (!badgeCache.has(device.account_id)) badgeCache.set(device.account_id, await badgeFor(db, device.account_id));
      const items = keep.map((k) => k.n);
      const text = pushText(device.language, items, { previews: prefs.previews });
      messages.push({
        to: token,
        title: text.title,
        body: text.body,
        sound: 'default',
        badge: badgeCache.get(device.account_id),
        priority: 'high',
        channelId: ['community', 'messages'].includes(categoryOf(items[0].kind)) ? 'messages' : 'updates',
        data: { url: pushUrl(items), kind: items.length === 1 ? items[0].kind : 'summary', notificationIds: items.map((n) => Number(n.id)) },
      });
      plan.push({ token, ids: keep.map((k) => k.d.id), attempts: Math.max(...keep.map((k) => k.d.attempts)) });
    }

    const tickets = await deliver(messages);
    for (let i = 0; i < plan.length; i += 1) {
      const p = plan[i];
      const t = tickets[i] || { status: 'error', error: 'unknown' };
      if (t.status === 'ok') {
        await setStatus(p.ids, 'sent', { sentAt: now, ticket: t.id, attempt: true });
        await db.query('update push_devices set last_push_at = $2 where token = $1', [p.token, ts(now)]);
        out.sent += p.ids.length;
      } else if (t.error === 'DeviceNotRegistered') {
        await setStatus(p.ids, 'invalid_token', { error: t.error, attempt: true });
        await db.query('delete from push_devices where token = $1', [p.token]);
        out.failed += p.ids.length;
      } else if (TEMPORARY.has(t.error) && p.attempts + 1 < MAX_ATTEMPTS && !t.final) {
        await setStatus(p.ids, 'pending', { error: t.error, next: now + backoffMs(p.attempts + 1), attempt: true });
        out.retried += p.ids.length;
      } else {
        await setStatus(p.ids, 'failed', { error: String(t.error).slice(0, 80), attempt: true });
        out.failed += p.ids.length;
      }
    }
    await checkReceipts(now).catch(() => {});
    return out;
  }

  /**
   * Expo's receipts (about 15 minutes after sending): did Apple/Google accept
   * the notification? A phone that no longer exists is removed.
   */
  async function checkReceipts(now) {
    if (driver !== 'expo') return 0;
    const rows = (
      await db.query("select id, ticket_id, token from push_deliveries where status = 'sent' and receipt_status is null and ticket_id is not null and sent_at < $1 order by id limit 300", [ts(now - RECEIPT_AFTER)])
    ).rows;
    if (!rows.length) return 0;
    let body;
    try {
      const res = await send(EXPO_RECEIPTS, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ ids: rows.map((r) => r.ticket_id) }),
      });
      if (!res.ok) return 0;
      body = await res.json();
    } catch {
      return 0;
    }
    const data = body?.data || {};
    for (const r of rows) {
      const receipt = data[r.ticket_id];
      if (!receipt) continue;
      const error = receipt.status === 'ok' ? null : receipt.details?.error || 'error';
      await db.query('update push_deliveries set receipt_status = $2, receipt_checked_at = $3, last_error = coalesce($4, last_error) where id = $1', [r.id, receipt.status === 'ok' ? 'ok' : 'error', ts(now), error]);
      if (error === 'DeviceNotRegistered') await db.query('delete from push_devices where token = $1', [r.token]);
    }
    return rows.length;
  }

  async function flush(now) {
    if (running) return running;
    running = flushOnce(now).finally(() => {
      running = null;
    });
    return running;
  }

  /** Something new was written: send soon, so a burst of writes becomes one push. */
  function poke(delayMs = 2500) {
    if (poked) return;
    poked = setTimeout(() => {
      poked = null;
      flush().catch((e) => console.error('[push] flush failed', e?.message));
    }, delayMs);
    poked.unref?.();
  }

  function stop() {
    if (poked) clearTimeout(poked);
    poked = null;
  }

  return { driver, outbox, getPrefs: (accountId) => getPrefs(db, accountId), setPrefs, registerDevice, removeDevice, flush, flushOnce, checkReceipts, poke, stop };
}

const instances = new WeakMap();
/** One dispatcher per app (tests start several apps in one process). */
export function pushFor(deps) {
  if (!instances.has(deps)) instances.set(deps, createPush(deps));
  return instances.get(deps);
}
