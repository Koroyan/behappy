// Private client <-> professional messages, encrypted at rest.
//
// Who can write:
//  - a client: to a listed professional (an inquiry), or to any professional
//    they have a booking with;
//  - a professional: in a thread with a requested or confirmed booking that
//    ended less than 30 days ago (always, even after the membership expires:
//    existing obligations are never cut off), or to any inquiry while their
//    membership is active (new leads need an active membership);
//  - nobody while suspended (platform) or after the other side was deleted.
// Staff can't read threads. A reported message is shared with moderators
// only through the reporter's own report.

import { newId } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { ProError } from './profiles.mjs';

const DAY = 24 * 60 * 60 * 1000;
const fail = (status, code, extra) => {
  throw new ProError(status, code, extra);
};

class Window {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.map = new Map();
  }

  allow(key, now) {
    const list = (this.map.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) return false;
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

export function createMessaging({ db, clock = { now: () => Date.now() }, crypto, profiles, membership, booking, emit = () => {} }) {
  const flood = new Window(30, 60 * 60 * 1000);

  const THREAD_SELECT = `select th.*, p.account_id as pro_account_id, p.public_name as pro_public_name, p.status as pro_status
    from pro_threads th join professional_profiles p on p.id = th.professional_id`;

  async function threadFor(q, account, id) {
    const r = await q.query(`${THREAD_SELECT} where th.id = $1`, [id]);
    const th = r.rows[0];
    if (!th) fail(404, 'not_found');
    const side = th.client_account_id === account.id ? 'client' : th.pro_account_id === account.id ? 'professional' : null;
    if (!side) fail(404, 'not_found');
    return { th, side };
  }

  async function canWrite(q, th, side, now) {
    if (side === 'professional') {
      if (th.pro_status === 'suspended') return { ok: false, reason: 'suspended' };
      if (!th.client_account_id) return { ok: false, reason: 'client_gone' };
      const b = await q.query("select 1 from bookings where professional_id = $1 and client_account_id = $2 and status in ('requested', 'confirmed') and ends_at > $3 limit 1", [th.professional_id, th.client_account_id, ts(now - 30 * DAY)]);
      if (b.rowCount) return { ok: true };
      const p = await profiles.load(q, { id: th.professional_id });
      const s = await membership.state(q, p, now);
      return s.active ? { ok: true } : { ok: false, reason: 'membership_required' };
    }
    if (await profiles.isDiscoverable(q, th.professional_id, now)) return { ok: true };
    const b = await q.query('select 1 from bookings where professional_id = $1 and client_account_id = $2 limit 1', [th.professional_id, th.client_account_id]);
    return b.rowCount ? { ok: true } : { ok: false, reason: 'not_available' };
  }

  const decode = (m) => ({ id: m.id, sender: m.sender_kind, body: crypto.decryptText('messages', { ciphertext: m.ciphertext, iv: m.iv, tag: m.tag }), createdAt: ms(m.created_at) });

  async function threadDto(q, th, side, now, { withMessages = false } = {}) {
    const last = await q.query('select * from pro_messages where thread_id = $1 order by id desc limit 1', [th.id]);
    const readAt = side === 'client' ? th.client_last_read_at : th.pro_last_read_at;
    const other = side === 'client' ? 'professional' : 'client';
    const unread = await q.query('select count(*)::int as n from pro_messages where thread_id = $1 and sender_kind = $2 and created_at > coalesce($3, \'epoch\'::timestamptz)', [th.id, other, readAt]);
    const write = await canWrite(q, th, side, now);
    const dto = {
      id: th.id,
      professionalId: th.professional_id,
      professionalName: th.pro_public_name,
      clientName: side === 'professional' ? th.client_display_name || 'Former client' : undefined,
      lastMessage: last.rows[0] ? { ...decode(last.rows[0]), body: decode(last.rows[0]).body.slice(0, 140) } : null,
      lastMessageAt: ms(th.last_message_at),
      unread: unread.rows[0].n,
      canWrite: write.ok,
      writeBlockedReason: write.ok ? null : write.reason,
      side,
    };
    if (withMessages) {
      const m = await q.query('select * from pro_messages where thread_id = $1 order by id asc limit 500', [th.id]);
      dto.messages = m.rows.map(decode);
    }
    return dto;
  }

  async function list(account) {
    const now = clock.now();
    const p = await profiles.load(db, { accountId: account.id });
    const r = await db.query(`${THREAD_SELECT} where th.client_account_id = $1 ${p ? 'or th.professional_id = $2' : ''} order by coalesce(th.last_message_at, th.created_at) desc limit 200`, p ? [account.id, p.id] : [account.id]);
    const out = [];
    for (const th of r.rows) out.push(await threadDto(db, th, th.client_account_id === account.id ? 'client' : 'professional', now));
    return out;
  }

  async function open(account, id) {
    const { th, side } = await threadFor(db, account, id);
    await db.query(`update pro_threads set ${side === 'client' ? 'client_last_read_at' : 'pro_last_read_at'} = $2 where id = $1`, [th.id, ts(clock.now())]);
    // Opening the conversation settles its "new message" notifications too.
    const settled = await db.query("update notifications set read_at = $3 where account_id = $1 and kind = 'pro_message' and read_at is null and data->>'threadId' = $2", [account.id, th.id, ts(clock.now())]);
    if (settled.rowCount) emit(account.id, 'unread:changed', {});
    return threadDto(db, { ...th, [side === 'client' ? 'client_last_read_at' : 'pro_last_read_at']: new Date(clock.now()) }, side, clock.now(), { withMessages: true });
  }

  /** A client starts (or reopens) a conversation with a professional. */
  async function startInquiry(account, professionalId, body) {
    if (!account.registered) fail(403, 'registration_required');
    const now = clock.now();
    const name = await booking.clientProfile(db, account.id);
    if (!name) fail(403, 'client_profile_required');
    const p = await profiles.load(db, { id: professionalId });
    if (!p) fail(404, 'not_found');
    if (p.account_id === account.id) fail(400, 'cannot_message_self');
    const has = await db.query('select 1 from bookings where professional_id = $1 and client_account_id = $2 limit 1', [p.id, account.id]);
    if (!has.rowCount && !(await profiles.isDiscoverable(db, p.id, now))) fail(409, 'not_available');
    const id = await db.tx(async (t) => {
      const threadId = await booking.ensureThread(t, p, account.id, name);
      const existing = await t.query('select count(*)::int as n from pro_messages where thread_id = $1', [threadId]);
      if (!existing.rows[0].n) await profiles.bumpStat(t, p.id, 'inquiries', now);
      return threadId;
    });
    if (body) await send(account, id, body);
    return open(account, id);
  }

  async function send(account, id, body) {
    const now = clock.now();
    const text = String(body || '').trim();
    if (!text) fail(400, 'empty_message');
    if (text.length > 4000) fail(400, 'message_too_long');
    if (!flood.allow(`${account.id}:${id}`, now)) fail(429, 'slow_down');
    const recipient = await db.tx(async (t) => {
      const { th, side } = await threadFor(t, account, id);
      const write = await canWrite(t, th, side, now);
      if (!write.ok) fail(409, write.reason);
      const enc = crypto.encrypt('messages', text);
      await t.query('insert into pro_messages (thread_id, sender_kind, ciphertext, iv, tag, created_at) values ($1, $2, $3, $4, $5, $6)', [th.id, side, enc.ciphertext, enc.iv, enc.tag, ts(now)]);
      await t.query(`update pro_threads set last_message_at = $2, ${side === 'client' ? 'client_last_read_at' : 'pro_last_read_at'} = $2 where id = $1`, [th.id, ts(now)]);
      const to = side === 'client' ? th.pro_account_id : th.client_account_id;
      // One notification per unread burst, not per message.
      if (to) await notify(t, to, 'pro_message', { threadId: th.id, from: side === 'client' ? th.client_display_name : th.pro_public_name }, `msg:${th.id}:${Math.floor(now / (30 * 60 * 1000))}`);
      return to;
    });
    if (recipient) {
      emit(recipient, 'thread:message', { threadId: id });
      emit(recipient, 'notification:new', {});
    }
    return open(account, id);
  }

  /** The reporter shares one message with moderators; nothing else in the thread. */
  async function report(account, threadId, messageId, reason, details) {
    const { th, side } = await threadFor(db, account, threadId);
    const m = await db.query('select * from pro_messages where id = $1 and thread_id = $2', [Number(messageId), th.id]);
    if (!m.rowCount) fail(404, 'not_found');
    const msg = decode(m.rows[0]);
    if (msg.sender === side) fail(400, 'cannot_report_self');
    const target = side === 'client' ? th.pro_account_id : th.client_account_id;
    await db.query(
      "insert into reports (reporter_account_id, target_type, target_id, target_account_id, reason, details, snapshot, priority, created_at) values ($1, 'pro_message', $2, $3, $4, $5, $6::jsonb, 2, $7)",
      [account.id, String(m.rows[0].id), target, reason, details ? String(details).slice(0, 1000) : null, JSON.stringify({ body: msg.body, threadId: th.id, professionalId: th.professional_id }), ts(clock.now())]
    );
    return { ok: true };
  }

  async function unreadTotal(q, account) {
    const p = await profiles.load(q, { accountId: account.id });
    const r = await q.query(
      `select count(*)::int as n from pro_messages m join pro_threads th on th.id = m.thread_id
       where (th.client_account_id = $1 and m.sender_kind = 'professional' and m.created_at > coalesce(th.client_last_read_at, 'epoch'::timestamptz))
          or ($2::text is not null and th.professional_id = $2 and m.sender_kind = 'client' and m.created_at > coalesce(th.pro_last_read_at, 'epoch'::timestamptz))`,
      [account.id, p?.id || null]
    );
    return r.rows[0].n;
  }

  void newId;
  return { list, open, startInquiry, send, report, unreadTotal, canWrite };
}
