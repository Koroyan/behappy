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
//  - One push per burst. Several notifications for one person within a short
//    window become a single summary ("New notifications: 3"), and the same
//    person is not pushed more than once a minute.
//  - Quiet hours (22:00–08:00 on the phone's own clock by default). Nothing
//    arrives during them; what is still unread afterwards comes as one
//    summary. After 14 hours a notification stays in the app only.
//  - Categories the person turned off are never pushed. Names appear only if
//    they chose "show who wrote"; message text never does (see pushText.mjs).
//
// Drivers: "expo" (https://exp.host, the default), "log" (development and
// tests: kept in `outbox`, nothing leaves the machine) and "off".

import { ms, ts } from '../db/index.mjs';
import { categoryOf, pushText, pushUrl } from './pushText.mjs';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const MAX_AGE = 14 * HOUR;
const MIN_GAP = MINUTE;
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;

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

export const validPushToken = (token) => TOKEN_RE.test(String(token || ''));

export function createPush(deps) {
  const { db, clock } = deps;
  const driver = String(deps.config?.push?.driver || 'log').toLowerCase();
  const accessToken = deps.config?.push?.accessToken || '';
  // Read when sending, so tests can put a fake Expo endpoint in place.
  const send = (...a) => (deps.pushFetch || globalThis.fetch)(...a);
  const outbox = [];
  const lastPushAt = new Map();
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
    // A first phone starts fresh: what is already in the app is not pushed now.
    if (!had.rowCount) await db.query('update notifications set pushed_at = $2 where account_id = $1 and pushed_at is null', [account.id, ts(now)]);
  }

  async function removeDevice(account, token) {
    await db.query('delete from push_devices where token = $1 and account_id = $2', [token, account.id]);
  }

  /** Phones that may still be notified: their session is neither revoked nor expired. */
  async function devicesFor(q, accountId, now) {
    const r = await q.query(
      `select d.token, d.platform, d.language, d.tz, d.last_seen_at from push_devices d join sessions s on s.id = d.session_id
       where d.account_id = $1 and s.revoked_at is null and (s.expires_at is null or s.expires_at > $2)
       order by d.last_seen_at desc`,
      [accountId, ts(now)]
    );
    return r.rows;
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

  async function deliver(messages) {
    if (!messages.length) return [];
    if (driver === 'off') return messages.map(() => ({ status: 'ok' }));
    if (driver !== 'expo') {
      outbox.push(...messages);
      if (outbox.length > 200) outbox.splice(0, outbox.length - 200);
      if (!deps.config?.isProduction && driver === 'log' && !deps.config?.quietPushLog) console.log(`[push] (log) ${messages.length} message(s) → ${messages.map((m) => m.body).join(' | ')}`);
      return messages.map(() => ({ status: 'ok' }));
    }
    const tickets = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const res = await send(EXPO_URL, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: JSON.stringify(chunk),
        });
        const body = await res.json().catch(() => ({}));
        const data = Array.isArray(body?.data) ? body.data : [];
        chunk.forEach((_, j) => tickets.push(data[j] || { status: res.ok ? 'ok' : 'error' }));
        if (!res.ok) console.warn(`[push] Expo answered ${res.status}`);
      } catch (e) {
        console.warn('[push] could not reach the Expo push service:', e?.message);
        chunk.forEach(() => tickets.push({ status: 'error', details: { error: 'network' } }));
      }
    }
    return tickets;
  }

  /** One pass: decide, merge and send. Safe to run at any time and in parallel with writes. */
  async function flushOnce(now = clock.now()) {
    const out = { sent: 0, skipped: 0, held: 0 };
    // Too old or already read: stays in the app only.
    const stale = await db.query('update notifications set pushed_at = $1 where pushed_at is null and (read_at is not null or created_at < $2)', [ts(now), ts(now - MAX_AGE)]);
    out.skipped += stale.rowCount;

    const rows = (
      await db.query(
        `select n.id, n.account_id, n.kind, n.data, n.created_at from notifications n
         where n.pushed_at is null and n.read_at is null
           and exists (select 1 from push_devices d join sessions s on s.id = d.session_id
                       where d.account_id = n.account_id and s.revoked_at is null and (s.expires_at is null or s.expires_at > $1))
         order by n.id limit 500`,
        [ts(now)]
      )
    ).rows;
    const byAccount = new Map();
    for (const r of rows) byAccount.set(r.account_id, [...(byAccount.get(r.account_id) || []), r]);

    const messages = [];
    const plan = [];
    for (const [accountId, list] of byAccount) {
      if (now - (lastPushAt.get(accountId) || 0) < MIN_GAP) {
        out.held += list.length;
        continue;
      }
      const prefs = await getPrefs(db, accountId);
      const keep = [];
      const drop = [];
      for (const n of list) {
        if (!prefs[categoryOf(n.kind)] || !(await stillUnread(db, n)) || (await watching(n))) drop.push(n.id);
        else keep.push(n);
      }
      if (drop.length) {
        await db.query('update notifications set pushed_at = $2 where id = any($1::bigint[])', [drop, ts(now)]);
        out.skipped += drop.length;
      }
      if (!keep.length) continue;
      const devices = await devicesFor(db, accountId, now);
      if (!devices.length) continue;
      if (inQuietHours(prefs, now, devices[0].tz)) {
        out.held += keep.length;
        continue;
      }
      const badge = await badgeFor(db, accountId);
      const url = pushUrl(keep);
      for (const d of devices) {
        const text = pushText(d.language, keep, { previews: prefs.previews });
        messages.push({
          to: d.token,
          title: text.title,
          body: text.body,
          sound: 'default',
          badge,
          priority: 'high',
          channelId: ['community', 'messages'].includes(categoryOf(keep[0].kind)) ? 'messages' : 'updates',
          data: { url, kind: keep.length === 1 ? keep[0].kind : 'summary', notificationIds: keep.map((n) => Number(n.id)) },
        });
        plan.push(d.token);
      }
      await db.query('update notifications set pushed_at = $2 where id = any($1::bigint[])', [keep.map((n) => n.id), ts(now)]);
      lastPushAt.set(accountId, now);
      out.sent += keep.length;
    }

    const tickets = await deliver(messages);
    // Phones that uninstalled the app or turned BeHappy off are forgotten.
    const gone = tickets.map((t, i) => (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered' ? plan[i] : null)).filter(Boolean);
    if (gone.length) await db.query('delete from push_devices where token = any($1::text[])', [gone]);
    return out;
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

  return { driver, outbox, getPrefs: (accountId) => getPrefs(db, accountId), setPrefs, registerDevice, removeDevice, flush, poke, stop };
}

const instances = new WeakMap();
/** One dispatcher per app (tests start several apps in one process). */
export function pushFor(deps) {
  if (!instances.has(deps)) instances.set(deps, createPush(deps));
  return instances.get(deps);
}
