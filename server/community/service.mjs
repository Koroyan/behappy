// BeHappy Community: members, rooms and messages.
//
// Privacy: other members only ever see a pseudonym and an opaque member ref,
// never account ids, emails, professional profiles or bookings. Communities
// are peer support, not therapy; safety resources are always one tap away.
//
// Every write runs in a transaction. Real-time fan-out happens after commit
// through `bus` (see realtime.mjs), so a rolled-back message is never sent.

import crypto from 'node:crypto';

import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { isRoomId, REACTIONS, REPORT_REASONS, TOPICS } from './constants.mjs';
import { analyzeMessage, mentionedPseudonyms, mentionsAnulia, normalizePseudonym, pseudonymProblem } from './text.mjs';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const MAX_BODY = 2000;
const PAGE = 40;

export class CommunityError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** A tiny synchronous event bus: services emit after commit, realtime listens. */
export function createBus() {
  const handlers = new Map();
  return {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
    },
    emit(event, payload) {
      for (const fn of handlers.get(event) || []) {
        Promise.resolve()
          .then(() => fn(payload))
          .catch((e) => console.error(`[bus] ${event} handler failed`, e?.message));
      }
    },
  };
}

class Window {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.map = new Map();
  }

  allow(key, now) {
    const list = (this.map.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) {
      this.map.set(key, list);
      return false;
    }
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

const newRef = () => `m_${crypto.randomBytes(8).toString('hex')}`;

export async function activeSuspension(q, accountId, now) {
  const r = await q.query(
    `select * from suspensions where account_id = $1 and lifted_at is null and starts_at <= $2 and (ends_at is null or ends_at > $2)
     order by (ends_at is null) desc, ends_at desc limit 1`,
    [accountId, ts(now)]
  );
  const s = r.rows[0];
  return s ? { id: s.id, kind: s.kind, scope: s.scope, reason: s.reason, startsAt: ms(s.starts_at), endsAt: ms(s.ends_at) } : null;
}

export async function loadProfile(q, accountId) {
  const r = await q.query('select * from community_profiles where account_id = $1', [accountId]);
  const p = r.rows[0];
  return p ? { accountId: p.account_id, pseudonym: p.pseudonym, ref: p.ref, avatarSeed: p.avatar_seed, createdAt: ms(p.created_at), guidelinesAcceptedAt: ms(p.guidelines_accepted_at) } : null;
}

export async function accountForRef(q, ref) {
  const r = await q.query('select account_id, pseudonym from community_profiles where ref = $1', [String(ref || '')]);
  return r.rows[0] || null;
}

/** The viewer's relations, used to filter what they see. */
export async function relationsFor(q, accountId) {
  const [blocked, muted] = await Promise.all([
    q.query('select blocked_id from user_blocks where blocker_id = $1', [accountId]),
    q.query('select muted_id from user_mutes where muter_id = $1', [accountId]),
  ]);
  return { id: accountId, blocked: new Set(blocked.rows.map((r) => r.blocked_id)), muted: new Set(muted.rows.map((r) => r.muted_id)) };
}

const MESSAGE_SELECT = `select m.*, p.pseudonym as current_pseudonym, p.avatar_seed, p.ref as author_ref,
    r.author_kind as reply_kind, r.status as reply_status, r.body as reply_body, coalesce(rp.pseudonym, r.author_pseudonym) as reply_pseudonym
  from community_messages m
  left join community_profiles p on p.account_id = m.author_account_id
  left join community_messages r on r.id = m.reply_to_id
  left join community_profiles rp on rp.account_id = r.author_account_id`;

export async function loadMessageRows(q, ids) {
  if (!ids.length) return [];
  const r = await q.query(`${MESSAGE_SELECT} where m.id = any($1::bigint[])`, [ids]);
  return r.rows;
}

export async function reactionsFor(q, ids, viewerId) {
  const out = new Map();
  if (!ids.length) return out;
  const r = await q.query('select message_id, reaction, count(*)::int as n, bool_or(account_id = $2) as mine from message_reactions where message_id = any($1::bigint[]) group by message_id, reaction', [ids, viewerId || '']);
  for (const row of r.rows) {
    const entry = out.get(row.message_id) || { counts: {}, mine: [] };
    entry.counts[row.reaction] = row.n;
    if (row.mine) entry.mine.push(row.reaction);
    out.set(row.message_id, entry);
  }
  return out;
}

const snippet = (s, n = 120) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/**
 * What one viewer may see of a message. Returns null when the viewer must not
 * see it at all (blocked author, someone else's held message).
 */
export function messageForViewer(row, viewer, reactions) {
  if (!row) return null;
  if (row.author_account_id && viewer?.blocked?.has(row.author_account_id)) return null;
  const mine = Boolean(viewer && row.author_account_id === viewer.id);
  if (row.status === 'held' && !mine && !viewer?.staff) return null;
  const hidden = row.status === 'removed' || row.status === 'deleted';
  const formerMember = row.author_kind === 'member' && !row.author_account_id;
  const replyHidden = row.reply_status === 'removed' || row.reply_status === 'deleted';
  return {
    id: row.id,
    roomId: row.room_id,
    author: {
      kind: row.author_kind,
      pseudonym: row.author_kind === 'anulia' ? 'Anulia' : formerMember ? null : row.current_pseudonym || row.author_pseudonym,
      ref: row.author_kind === 'member' && !formerMember ? row.author_ref : null,
      avatarSeed: row.avatar_seed ?? 0,
      isMe: mine,
      formerMember,
    },
    body: hidden ? '' : row.body,
    status: row.status,
    heldReason: row.status === 'held' ? row.flags?.hold || 'review' : null,
    replyTo: row.reply_to_id
      ? { id: row.reply_to_id, kind: row.reply_kind, pseudonym: row.reply_kind === 'anulia' ? 'Anulia' : row.reply_pseudonym || null, snippet: replyHidden ? '' : snippet(row.reply_body), hidden: replyHidden }
      : null,
    asksAnulia: row.asks_anulia,
    createdAt: ms(row.created_at),
    reactions: reactions?.get(row.id)?.counts || {},
    myReactions: reactions?.get(row.id)?.mine || [],
    mutedAuthor: Boolean(row.author_account_id && viewer?.muted?.has(row.author_account_id)),
  };
}

export function createCommunity({ db, clock = { now: () => Date.now() }, bus = createBus() }) {
  const burst = new Window(5, 30 * 1000);
  const hourly = new Window(60, 60 * MINUTE);
  const reports = new Window(20, 60 * MINUTE);
  let anuliaHandler = null;

  const fail = (status, code, extra) => {
    throw new CommunityError(status, code, extra);
  };

  async function requireMember(q, account) {
    if (!account?.registered) fail(403, 'registration_required');
    if (account.status && account.status !== 'active') fail(403, 'account_suspended');
    const profile = await loadProfile(q, account.id);
    if (!profile) fail(403, 'profile_required');
    if (!profile.guidelinesAcceptedAt) fail(403, 'guidelines_required');
    return profile;
  }

  async function membershipOf(q, accountId, roomId) {
    const r = await q.query('select joined_at, last_read_message_id, notify from room_memberships where room_id = $1 and account_id = $2', [roomId, accountId]);
    return r.rows[0] || null;
  }

  /**
   * Reading a room's messages (history, search, live stream, pinned message)
   * requires a registered member who accepted the guidelines AND joined that
   * room. Knowing a room id is never enough. A platform-wide suspension also
   * closes reading; a community suspension only stops writing.
   */
  async function assertRoomAccess(q, account, roomId) {
    const profile = await requireMember(q, account);
    const roomRow = await getRoom(q, roomId);
    if (!(await membershipOf(q, account.id, roomId))) fail(403, 'not_a_member');
    const s = await activeSuspension(q, account.id, clock.now());
    if (s?.scope === 'platform') fail(403, 'suspended', { suspension: s });
    return { profile, room: roomRow };
  }

  async function assertNotSuspended(q, accountId, now) {
    const s = await activeSuspension(q, accountId, now);
    if (s) fail(403, 'suspended', { suspension: s });
  }

  async function getRoom(q, roomId) {
    if (!isRoomId(roomId)) fail(404, 'room_not_found');
    const r = await q.query('select r.*, t.icon, t.sort from community_rooms r join community_topics t on t.id = r.topic_id where r.id = $1 and not r.is_archived and t.is_active', [roomId]);
    if (!r.rowCount) fail(404, 'room_not_found');
    return r.rows[0];
  }

  // ---------- Profile ----------
  async function profile(account) {
    return loadProfile(db, account.id);
  }

  async function setProfile(account, { pseudonym, acceptGuidelines }) {
    if (!account?.registered) fail(403, 'registration_required');
    const name = normalizePseudonym(pseudonym);
    const problem = pseudonymProblem(name);
    if (problem) fail(400, problem);
    const now = clock.now();
    return db.tx(async (t) => {
      const existing = await loadProfile(t, account.id);
      if (!existing && acceptGuidelines !== true) fail(400, 'guidelines_required');
      const taken = await t.query('select 1 from community_profiles where pseudonym = $1 and account_id <> $2', [name, account.id]);
      if (taken.rowCount) fail(409, 'pseudonym_taken');
      if (existing) {
        await t.query('update community_profiles set pseudonym = $2, updated_at = $3 where account_id = $1', [account.id, name, ts(now)]);
      } else {
        await t.query('insert into community_profiles (account_id, pseudonym, avatar_seed, guidelines_accepted_at, created_at, updated_at, ref) values ($1, $2, $3, $4, $4, $4, $5)', [
          account.id,
          name,
          crypto.randomInt(0, 12),
          ts(now),
          newRef(),
        ]);
      }
      return loadProfile(t, account.id);
    });
  }

  // ---------- Rooms ----------
  const ROOM_SELECT = `select r.id, r.topic_id, r.language, r.pinned_message_id, r.is_paused, t.icon, t.sort,
      (select count(*)::int from room_memberships rm where rm.room_id = r.id) as members,
      (select cm.created_at from community_messages cm where cm.room_id = r.id and cm.status = 'visible' order by cm.id desc limit 1) as last_at,
      m.joined_at, m.last_read_message_id, m.notify,
      case when m.account_id is null then 0 else (select count(*)::int from (select 1 from community_messages cm
          where cm.room_id = r.id and cm.id > m.last_read_message_id and cm.status = 'visible'
            and coalesce(cm.author_account_id, '') <> $1
            and (cm.author_account_id is null or cm.author_account_id not in (select blocked_id from user_blocks where blocker_id = $1))
          limit 100) x) end as unread
    from community_rooms r join community_topics t on t.id = r.topic_id
    left join room_memberships m on m.room_id = r.id and m.account_id = $1`;

  const toRoom = (r) => ({
    id: r.id,
    topic: r.topic_id,
    language: r.language,
    icon: r.icon,
    members: r.members,
    lastActivityAt: ms(r.last_at),
    joined: Boolean(r.joined_at),
    unread: r.unread || 0,
    notify: r.notify || null,
    pinnedMessageId: r.pinned_message_id || null,
    paused: Boolean(r.is_paused),
  });

  async function rooms(account, language) {
    const r = await db.query(`${ROOM_SELECT} where r.language = $2 and not r.is_archived and t.is_active order by t.sort`, [account?.id || '', language]);
    return r.rows.map(toRoom);
  }

  async function myRooms(account) {
    const r = await db.query(`${ROOM_SELECT} where m.account_id = $1 and not r.is_archived order by t.sort, r.language`, [account.id]);
    return r.rows.map(toRoom);
  }

  /** Room details anyone signed in may see (topic, language, member count); the pinned message only for members. */
  async function room(account, roomId) {
    await getRoom(db, roomId);
    const r = await db.query(`${ROOM_SELECT} where r.id = $2`, [account?.id || '', roomId]);
    const out = toRoom(r.rows[0]);
    if (out.pinnedMessageId && out.joined) {
      const viewer = account ? await relationsFor(db, account.id) : null;
      const rows = await loadMessageRows(db, [out.pinnedMessageId]);
      out.pinned = messageForViewer(rows[0], viewer, new Map());
    }
    return out;
  }

  async function join(account, roomId) {
    await requireMember(db, account);
    await assertNotSuspended(db, account.id, clock.now());
    await getRoom(db, roomId);
    const last = await db.query("select coalesce(max(id), 0)::int8 as id from community_messages where room_id = $1", [roomId]);
    // Joining starts "read" at the newest message: no wall of unread history.
    await db.query('insert into room_memberships (room_id, account_id, joined_at, last_read_message_id) values ($1, $2, $3, $4) on conflict (room_id, account_id) do nothing', [roomId, account.id, ts(clock.now()), last.rows[0].id]);
    return room(account, roomId);
  }

  async function leave(account, roomId) {
    const r = await db.query('delete from room_memberships where room_id = $1 and account_id = $2', [roomId, account.id]);
    // Every device of this person stops receiving the room's live stream.
    if (r.rowCount) bus.emit('membership:left', { roomId, accountId: account.id });
    return { ok: true };
  }

  async function setNotify(account, roomId, value) {
    if (!['all', 'mentions', 'none'].includes(value)) fail(400, 'bad_notify');
    const r = await db.query('update room_memberships set notify = $3 where room_id = $1 and account_id = $2', [roomId, account.id, value]);
    if (!r.rowCount) fail(404, 'not_a_member');
    return { ok: true, notify: value };
  }

  // ---------- Messages ----------
  async function viewerFor(account) {
    if (!account) return null;
    const rel = await relationsFor(db, account.id);
    return rel;
  }

  async function shape(rows, viewer) {
    const reactions = await reactionsFor(db, rows.map((r) => r.id), viewer?.id);
    return rows.map((r) => messageForViewer(r, viewer, reactions)).filter(Boolean);
  }

  /** Newest first from the database; returned oldest → newest. */
  async function messages(account, roomId, { before, after, limit = PAGE } = {}) {
    await assertRoomAccess(db, account, roomId);
    const viewer = await viewerFor(account);
    const lim = Math.max(1, Math.min(Number(limit) || PAGE, 100));
    const b = Number(before) > 0 ? Number(before) : null;
    const a = Number(after) > 0 ? Number(after) : null;
    const r = await db.query(
      `${MESSAGE_SELECT}
       where m.room_id = $1
         and (m.status in ('visible', 'removed', 'deleted') or (m.status = 'held' and m.author_account_id = $2))
         and (m.author_account_id is null or m.author_account_id not in (select blocked_id from user_blocks where blocker_id = $2))
         and ($3::bigint is null or m.id < $3)
         and ($4::bigint is null or m.id > $4)
       order by m.id ${a ? 'asc' : 'desc'} limit $5`,
      [roomId, account?.id || '', b, a, lim + 1]
    );
    const more = r.rows.length > lim;
    const rows = r.rows.slice(0, lim);
    if (!a) rows.reverse();
    return { messages: await shape(rows, viewer), hasMore: more };
  }

  async function search(account, roomId, query) {
    await assertRoomAccess(db, account, roomId);
    const text = String(query || '').trim();
    if (text.length < 2 || text.length > 100) fail(400, 'bad_query');
    const viewer = await viewerFor(account);
    const like = `%${text.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const r = await db.query(
      `${MESSAGE_SELECT}
       where m.room_id = $1 and m.status = 'visible' and m.body ilike $2
         and (m.author_account_id is null or m.author_account_id not in (select blocked_id from user_blocks where blocker_id = $3))
       order by m.id desc limit 50`,
      [roomId, like, account?.id || '']
    );
    return { results: await shape(r.rows, viewer) };
  }

  async function post(account, roomId, { body, replyToId, nonce, askAnulia = false } = {}) {
    const now = clock.now();
    const text = String(body || '').replace(/\r\n/g, '\n').trim();
    if (!text) fail(400, 'empty_message');
    if (text.length > MAX_BODY) fail(400, 'message_too_long');
    const clientNonce = nonce === undefined || nonce === null ? null : String(nonce).slice(0, 64);
    if (!account?.registered) fail(403, 'registration_required');

    const result = await db.tx(async (t) => {
      const { profile, room: roomRow } = await assertRoomAccess(t, account, roomId);
      await assertNotSuspended(t, account.id, now);
      if (roomRow.is_paused) fail(423, 'room_paused');
      if (clientNonce) {
        const existing = await t.query('select id from community_messages where author_account_id = $1 and client_nonce = $2', [account.id, clientNonce]);
        if (existing.rowCount) return { id: existing.rows[0].id, duplicate: true };
      }
      // Limits are checked after the nonce, so a retried send is never refused.
      if (!burst.allow(account.id, now) || !hourly.allow(account.id, now)) fail(429, 'slow_down');
      const dup = await t.query("select 1 from community_messages where author_account_id = $1 and room_id = $2 and body = $3 and created_at > $4 and status <> 'deleted'", [account.id, roomId, text, ts(now - 2 * MINUTE)]);
      if (dup.rowCount) fail(409, 'duplicate_message');

      let replyAuthor = null;
      if (replyToId) {
        const rr = await t.query('select room_id, status, author_account_id from community_messages where id = $1', [Number(replyToId)]);
        const target = rr.rows[0];
        if (!target || target.room_id !== roomId || !['visible'].includes(target.status)) fail(400, 'bad_reply');
        replyAuthor = target.author_account_id;
      }

      const analysis = analyzeMessage(text, { newMember: now - profile.createdAt < 7 * DAY });
      const asks = Boolean(askAnulia) || mentionsAnulia(text);
      const flags = { ...analysis.flags, ...(analysis.hold ? { hold: analysis.hold } : {}) };
      const ins = await t.query(
        `insert into community_messages (room_id, author_account_id, author_kind, author_pseudonym, body, reply_to_id, asks_anulia, status, created_at, client_nonce, flags)
         values ($1, $2, 'member', $3, $4, $5, $6, $7, $8, $9, $10::jsonb) returning id`,
        [roomId, account.id, profile.pseudonym, text, replyToId ? Number(replyToId) : null, asks, analysis.hold ? 'held' : 'visible', ts(now), clientNonce, JSON.stringify(flags)]
      );
      const id = ins.rows[0].id;
      await t.query('update room_memberships set last_read_message_id = greatest(last_read_message_id, $3) where room_id = $1 and account_id = $2', [roomId, account.id, id]);

      const snapshot = JSON.stringify({ body: text, pseudonym: profile.pseudonym, roomId });
      if (analysis.hold) {
        const reason = analysis.hold === 'contact_details' ? 'privacy' : analysis.hold === 'professional_claim' ? 'impersonation' : 'spam';
        await t.query("insert into reports (reporter_kind, target_type, target_id, target_account_id, room_id, reason, details, snapshot, priority, created_at) values ('system', 'message', $1, $2, $3, $4, $5, $6::jsonb, 1, $7)", [
          String(id),
          account.id,
          roomId,
          reason,
          `held automatically: ${analysis.hold}`,
          snapshot,
          ts(now),
        ]);
      }
      if (analysis.risk) {
        await t.query("insert into reports (reporter_kind, target_type, target_id, target_account_id, room_id, reason, details, snapshot, priority, created_at) values ('system', 'message', $1, $2, $3, 'self_harm_risk', 'automatic safety check: possible risk to the author', $4::jsonb, 3, $5)", [
          String(id),
          account.id,
          roomId,
          snapshot,
          ts(now),
        ]);
      }

      // Notifications for replies and @mentions (visible messages only; never from someone the recipient blocked).
      const notified = [];
      if (!analysis.hold) {
        const recipients = new Map();
        if (replyAuthor && replyAuthor !== account.id) recipients.set(replyAuthor, 'community_reply');
        const names = mentionedPseudonyms(text);
        if (names.length) {
          const found = await t.query('select account_id from community_profiles where pseudonym = any($1::citext[])', [names]);
          for (const row of found.rows) if (row.account_id !== account.id && !recipients.has(row.account_id)) recipients.set(row.account_id, 'community_mention');
        }
        for (const [recipient, kind] of recipients) {
          const blocked = await t.query('select 1 from user_blocks where blocker_id = $1 and blocked_id = $2', [recipient, account.id]);
          if (blocked.rowCount) continue;
          const pref = await t.query('select notify from room_memberships where room_id = $1 and account_id = $2', [roomId, recipient]);
          if (pref.rows[0]?.notify === 'none') continue;
          const nid = await notify(t, recipient, kind, { roomId, messageId: id, pseudonym: profile.pseudonym }, `${kind}:${id}`);
          if (nid) notified.push(recipient);
        }
        // Members who follow every message of this room ("Every message" in the
        // room's settings): one notification per unread burst, not one per
        // message. The key holds their read position, so after they read the
        // room the next message starts a new one.
        const following = await t.query(
          `insert into notifications (account_id, kind, data, ref_key)
           select m.account_id, 'community_activity', jsonb_build_object('roomId', $1::text, 'messageId', $3::bigint, 'pseudonym', $4::text), 'activity:' || $1 || ':' || m.last_read_message_id
           from room_memberships m
           where m.room_id = $1 and m.notify = 'all' and m.account_id <> $2 and not (m.account_id = any($5::text[]))
             and not exists (select 1 from user_blocks b where b.blocker_id = m.account_id and b.blocked_id = $2)
             and not exists (select 1 from user_mutes u where u.muter_id = m.account_id and u.muted_id = $2)
           on conflict (account_id, kind, ref_key) do nothing
           returning account_id`,
          [roomId, account.id, id, profile.pseudonym, [...recipients.keys()]]
        );
        for (const row of following.rows) notified.push(row.account_id);
      }
      return { id, duplicate: false, hold: analysis.hold, risk: analysis.risk, asks, notified };
    });

    if (!result.duplicate) {
      if (!result.hold) bus.emit('message:new', { roomId, messageId: result.id });
      else bus.emit('message:held', { roomId, messageId: result.id, accountId: account.id });
      if (result.risk) bus.emit('safety:notice', { accountId: account.id, roomId, messageId: result.id });
      for (const recipient of result.notified) bus.emit('notification', { accountId: recipient });
      if (result.asks && !result.hold && anuliaHandler) {
        bus.emit('anulia:thinking', { roomId, replyToId: result.id });
        anuliaHandler({ roomId, messageId: result.id, account }).catch((e) => console.error('[community] Anulia reply failed', e?.message));
      }
    }
    const viewer = await viewerFor(account);
    const [shaped] = await shape(await loadMessageRows(db, [result.id]), viewer);
    return { message: shaped, duplicate: result.duplicate, held: Boolean(result.hold), safetyNotice: Boolean(result.risk) };
  }

  async function deleteOwn(account, messageId) {
    const r = await db.query("update community_messages set status = 'deleted' where id = $1 and author_account_id = $2 and status in ('visible', 'held') returning room_id", [Number(messageId), account.id]);
    if (!r.rowCount) fail(404, 'not_found');
    bus.emit('message:update', { roomId: r.rows[0].room_id, messageId: Number(messageId) });
    return { ok: true };
  }

  async function react(account, messageId, reaction, on = true) {
    if (!REACTIONS.includes(reaction)) fail(400, 'bad_reaction');
    await requireMember(db, account);
    await assertNotSuspended(db, account.id, clock.now());
    const r = await db.query("select room_id, author_account_id from community_messages where id = $1 and status = 'visible'", [Number(messageId)]);
    if (!r.rowCount) fail(404, 'not_found');
    const { room: roomRow } = await assertRoomAccess(db, account, r.rows[0].room_id);
    if (roomRow.is_paused) fail(423, 'room_paused');
    if (on) await db.query('insert into message_reactions (message_id, account_id, reaction) values ($1, $2, $3) on conflict do nothing', [Number(messageId), account.id, reaction]);
    else await db.query('delete from message_reactions where message_id = $1 and account_id = $2 and reaction = $3', [Number(messageId), account.id, reaction]);
    bus.emit('message:reactions', { roomId: r.rows[0].room_id, messageId: Number(messageId) });
    const map = await reactionsFor(db, [Number(messageId)], account.id);
    return { reactions: map.get(Number(messageId))?.counts || {}, myReactions: map.get(Number(messageId))?.mine || [] };
  }

  async function markRead(account, roomId, messageId) {
    const upTo = Number(messageId) || 0;
    await db.query('update room_memberships set last_read_message_id = greatest(last_read_message_id, $3) where room_id = $1 and account_id = $2', [roomId, account.id, upTo]);
    // Reading the room also settles its notifications (replies, mentions,
    // "new messages"), so the bell and the app icon don't keep counting them.
    const settled = await db.query(
      `update notifications set read_at = $4 where account_id = $1 and read_at is null and kind like 'community\\_%'
         and data->>'roomId' = $2 and coalesce((data->>'messageId')::bigint, 0) <= $3`,
      [account.id, roomId, upTo, ts(clock.now())]
    );
    if (settled.rowCount) bus.emit('unread', { accountId: account.id });
    return { ok: true };
  }

  // ---------- Block, mute, report ----------
  async function memberFromRef(ref) {
    const m = await accountForRef(db, ref);
    if (!m) fail(404, 'member_not_found');
    return m;
  }

  async function block(account, ref, on = true) {
    const m = await memberFromRef(ref);
    if (m.account_id === account.id) fail(400, 'cannot_block_self');
    if (on) await db.query('insert into user_blocks (blocker_id, blocked_id, created_at) values ($1, $2, $3) on conflict do nothing', [account.id, m.account_id, ts(clock.now())]);
    else await db.query('delete from user_blocks where blocker_id = $1 and blocked_id = $2', [account.id, m.account_id]);
    bus.emit('relations', { accountId: account.id });
    return { ok: true };
  }

  async function mute(account, ref, on = true) {
    const m = await memberFromRef(ref);
    if (m.account_id === account.id) fail(400, 'cannot_mute_self');
    if (on) await db.query('insert into user_mutes (muter_id, muted_id, created_at) values ($1, $2, $3) on conflict do nothing', [account.id, m.account_id, ts(clock.now())]);
    else await db.query('delete from user_mutes where muter_id = $1 and muted_id = $2', [account.id, m.account_id]);
    bus.emit('relations', { accountId: account.id });
    return { ok: true };
  }

  async function relations(account) {
    const [b, m] = await Promise.all([
      db.query('select p.ref, p.pseudonym, b.created_at from user_blocks b join community_profiles p on p.account_id = b.blocked_id where b.blocker_id = $1 order by b.created_at desc', [account.id]),
      db.query('select p.ref, p.pseudonym, u.created_at from user_mutes u join community_profiles p on p.account_id = u.muted_id where u.muter_id = $1 order by u.created_at desc', [account.id]),
    ]);
    const map = (rows) => rows.map((r) => ({ ref: r.ref, pseudonym: r.pseudonym, since: ms(r.created_at) }));
    return { blocked: map(b.rows), muted: map(m.rows) };
  }

  async function report(account, { messageId, memberRef, reason, details }) {
    if (!account?.registered) fail(403, 'registration_required');
    if (!REPORT_REASONS.includes(reason)) fail(400, 'bad_reason');
    const now = clock.now();
    if (!reports.allow(account.id, now)) fail(429, 'slow_down');
    const note = details ? String(details).slice(0, 1000) : null;
    let target;
    if (messageId) {
      await requireMember(db, account);
      const r = await db.query('select id, room_id, author_account_id, author_pseudonym, body, status from community_messages where id = $1', [Number(messageId)]);
      const m = r.rows[0];
      // Only messages the reporter can see: a member of that room, a message that was shown.
      if (!m || !['visible', 'deleted'].includes(m.status)) fail(404, 'not_found');
      if (!(await membershipOf(db, account.id, m.room_id))) fail(404, 'not_found');
      target = { type: 'message', id: String(m.id), accountId: m.author_account_id, roomId: m.room_id, snapshot: { body: m.body, pseudonym: m.author_pseudonym, roomId: m.room_id, status: m.status } };
    } else if (memberRef) {
      await requireMember(db, account);
      const m = await memberFromRef(memberRef);
      target = { type: 'member', id: memberRef, accountId: m.account_id, roomId: null, snapshot: { pseudonym: m.pseudonym } };
    } else fail(400, 'bad_target');
    if (target.accountId === account.id) fail(400, 'cannot_report_self');
    const priority = reason === 'self_harm_risk' || reason === 'violence' ? 3 : reason === 'harassment' || reason === 'hate' || reason === 'sexual' ? 2 : 1;
    try {
      const r = await db.query(
        'insert into reports (reporter_account_id, target_type, target_id, target_account_id, room_id, reason, details, snapshot, priority, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) returning id',
        [account.id, target.type, target.id, target.accountId, target.roomId, reason, note, JSON.stringify(target.snapshot), priority, ts(now)]
      );
      bus.emit('report:new', { reportId: r.rows[0].id, priority });
      return { ok: true, reportId: r.rows[0].id };
    } catch (e) {
      if (e.code === '23505') return { ok: true, alreadyReported: true };
      throw e;
    }
  }

  // ---------- Suspensions and appeals (the member's own view) ----------
  async function status(account) {
    const now = clock.now();
    const suspension = await activeSuspension(db, account.id, now);
    const appeals = await db.query('select id, suspension_id, status, created_at, decided_at, decision_note from appeals where account_id = $1 order by created_at desc limit 10', [account.id]);
    return {
      suspension,
      appeals: appeals.rows.map((a) => ({ id: a.id, suspensionId: a.suspension_id, status: a.status, createdAt: ms(a.created_at), decidedAt: ms(a.decided_at), note: a.decision_note })),
    };
  }

  async function appeal(account, { suspensionId, body }) {
    const text = String(body || '').trim();
    if (text.length < 10 || text.length > 2000) fail(400, 'bad_appeal');
    const s = await db.query('select id from suspensions where id = $1 and account_id = $2', [Number(suspensionId), account.id]);
    if (!s.rowCount) fail(404, 'not_found');
    try {
      const r = await db.query('insert into appeals (account_id, suspension_id, body, created_at) values ($1, $2, $3, $4) returning id', [account.id, Number(suspensionId), text, ts(clock.now())]);
      bus.emit('appeal:new', { appealId: r.rows[0].id });
      return { ok: true, appealId: r.rows[0].id };
    } catch (e) {
      if (e.code === '23505') fail(409, 'appeal_open');
      throw e;
    }
  }

  /** For GET /api/account/me. */
  async function meSection(q, account) {
    if (!account.registered) return { profile: null, suspension: null, unreadRooms: 0, unreadMessages: 0, unreadByRoom: {} };
    const p = await loadProfile(q, account.id);
    const suspension = await activeSuspension(q, account.id, clock.now());
    let unreadByRoom = {};
    if (p) {
      // Unread messages per joined room (at most 100 counted per room), the
      // same rule as the room list: not your own, not from people you blocked.
      const r = await q.query(
        `select m.room_id, (select count(*)::int from (select 1 from community_messages cm
             where cm.room_id = m.room_id and cm.id > m.last_read_message_id and cm.status = 'visible'
               and coalesce(cm.author_account_id, '') <> $1
               and (cm.author_account_id is null or cm.author_account_id not in (select blocked_id from user_blocks where blocker_id = $1))
             limit 100) x) as n
         from room_memberships m where m.account_id = $1`,
        [account.id]
      );
      unreadByRoom = Object.fromEntries(r.rows.filter((x) => x.n > 0).map((x) => [x.room_id, x.n]));
    }
    const counts = Object.values(unreadByRoom);
    return {
      profile: p ? { pseudonym: p.pseudonym, ref: p.ref, avatarSeed: p.avatarSeed } : null,
      suspension,
      unreadRooms: counts.length,
      unreadMessages: counts.reduce((a, b) => a + b, 0),
      unreadByRoom,
    };
  }

  return {
    bus,
    topics: () => TOPICS,
    profile,
    setProfile,
    rooms,
    myRooms,
    room,
    join,
    leave,
    setNotify,
    messages,
    search,
    post,
    deleteOwn,
    react,
    markRead,
    block,
    mute,
    relations,
    report,
    status,
    appeal,
    meSection,
    viewerFor,
    shape,
    assertRoomAccess: (account, roomId) => assertRoomAccess(db, account, roomId),
    onAnulia(fn) {
      anuliaHandler = fn;
    },
  };
}
