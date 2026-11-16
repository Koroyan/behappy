// Community discovery: which rooms are actually active, scheduled discussions
// led by real people, and honest notes for quiet rooms and languages with few
// moderators.
//
// Truthful by design: activity is computed from real, visible member messages
// only (never Bea's, never system notices), shown as a coarse level ("active
// today", "active this week", "quiet") instead of counts of people or
// messages, so nobody's participation pattern can be read from it. Nothing
// is invented: no sample posts, no fake members, no inflated numbers. Posts
// are never copied or translated into other rooms.

import { ms, ts } from '../db/index.mjs';
import { createLimiter } from '../rateLimit.mjs';
import { notify } from '../notify/notifications.mjs';
import { isRoomId, LANGUAGES, TOPICS } from './constants.mjs';
import { CommunityError, loadProfile } from './service.mjs';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** An interest count is shown only from this many people (never "1 person is interested"). */
export const MIN_INTEREST_SHOWN = 3;
const HOST_ROLES = ['moderator', 'facilitator', 'professional'];
const STAFF_HOSTS = ['moderator', 'admin', 'owner'];

const fail = (status, code, extra) => {
  throw new CommunityError(status, code, extra);
};

export const activityLevel = (lastAt, now) => (!lastAt ? 'quiet' : now - lastAt <= DAY ? 'today' : now - lastAt <= 7 * DAY ? 'week' : 'quiet');
const LEVEL_RANK = { today: 0, week: 1, quiet: 2 };

export function createDiscovery({ db, clock = { now: () => Date.now() } }) {
  const interestLimit = createLimiter(db, { name: 'community-interest', limit: 30, windowMs: HOUR });

  /** Last visible member message per room (Bea and notices don't make a room "active"). */
  async function lastActivity(where, params) {
    const r = await db.query(
      `select r.id, r.topic_id, r.language, t.sort, t.icon, r.is_paused,
              (select count(*)::int from room_memberships rm where rm.room_id = r.id) as members,
              (select max(cm.created_at) from community_messages cm where cm.room_id = r.id and cm.status = 'visible' and cm.author_kind = 'member') as last_at
       from community_rooms r join community_topics t on t.id = r.topic_id
       where not r.is_archived and t.is_active and ${where}`,
      params
    );
    return r.rows;
  }

  async function moderatorsFor(language) {
    const r = await db.query(
      `select count(distinct a.id)::int as n from accounts a join moderator_languages l on l.account_id = a.id
       where l.language = $1 and a.roles && $2::text[] and a.status = 'active' and a.staff_suspended_at is null`,
      [language, STAFF_HOSTS]
    ).catch(() => ({ rows: [{ n: 0 }] }));
    return r.rows[0].n;
  }

  const shapeEvent = (e, now) => ({
    id: Number(e.id),
    roomId: e.room_id,
    topic: e.topic_id,
    language: e.language,
    title: e.title,
    description: e.description,
    startsAt: ms(e.starts_at),
    endsAt: ms(e.ends_at),
    host: { name: e.host_name, role: e.host_role },
    live: ms(e.starts_at) <= now && ms(e.ends_at) > now,
    interested: Boolean(e.mine),
    interestCount: e.interest >= MIN_INTEREST_SHOWN ? e.interest : null,
  });

  async function events(account, { language, roomIds = [], roomId } = {}) {
    const now = clock.now();
    const r = await db.query(
      `select e.*, r.topic_id, r.language,
              (select count(*)::int from community_event_interest i where i.event_id = e.id) as interest,
              exists (select 1 from community_event_interest i where i.event_id = e.id and i.account_id = $1) as mine
       from community_events e join community_rooms r on r.id = e.room_id
       where e.status = 'scheduled' and e.ends_at > $2 and e.starts_at < $3
         and (($4::text is not null and e.room_id = $4) or ($4::text is null and (r.language = $5 or e.room_id = any($6::text[]))))
       order by e.starts_at limit 20`,
      [account?.id || '', ts(now), ts(now + 21 * DAY), roomId || null, language || '', roomIds]
    );
    return r.rows.map((e) => shapeEvent(e, now));
  }

  /**
   * Rooms in one language, the person's chosen topic first, then rooms with
   * real recent activity, then the quiet ones (the app folds those away).
   */
  async function discover(account, { language, topic } = {}) {
    const now = clock.now();
    const lang = LANGUAGES.includes(language) ? language : 'en';
    const wanted = TOPICS.some((t) => t.id === topic) ? topic : null;
    const rows = await lastActivity('r.language = $1', [lang]);
    const mine = account ? await db.query('select room_id from room_memberships where account_id = $1', [account.id]) : { rows: [] };
    const joined = new Set(mine.rows.map((x) => x.room_id));
    const rooms = rows
      .map((x) => ({ id: x.id, topic: x.topic_id, language: x.language, icon: x.icon, members: x.members, joined: joined.has(x.id), paused: Boolean(x.is_paused), lastActivityAt: ms(x.last_at), activity: activityLevel(ms(x.last_at), now), sort: x.sort }))
      .sort((a, b) => LEVEL_RANK[a.activity] - LEVEL_RANK[b.activity] || (b.lastActivityAt || 0) - (a.lastActivityAt || 0) || a.sort - b.sort);
    const strip = ({ sort, ...room }) => room;
    const topicRoom = wanted ? rooms.find((x) => x.topic === wanted) || null : null;
    const active = rooms.filter((x) => x.activity !== 'quiet' && x !== topicRoom);
    const quiet = rooms.filter((x) => x.activity === 'quiet' && x !== topicRoom).sort((a, b) => a.sort - b.sort);
    const moderators = await moderatorsFor(lang);
    return {
      language: lang,
      topicRoom: topicRoom ? strip(topicRoom) : null,
      active: active.map(strip),
      quiet: quiet.map(strip),
      // Honest about moderation: in a language without a moderator who reads it, reports still reach the team, but may take longer.
      moderation: { coverage: moderators > 0 ? 'staffed' : 'limited' },
      events: await events(account, { language: lang, roomIds: [...joined] }),
    };
  }

  /** The same topic in other languages, only those with real recent activity (on request). */
  async function related(account, { topic, exclude } = {}) {
    if (!TOPICS.some((t) => t.id === topic)) fail(400, 'bad_topic');
    const now = clock.now();
    const rows = await lastActivity('r.topic_id = $1 and r.language <> $2', [topic, LANGUAGES.includes(exclude) ? exclude : '']);
    return {
      topic,
      rooms: rows
        .map((x) => ({ id: x.id, topic: x.topic_id, language: x.language, icon: x.icon, members: x.members, lastActivityAt: ms(x.last_at), activity: activityLevel(ms(x.last_at), now) }))
        .filter((x) => x.activity !== 'quiet')
        .sort((a, b) => LEVEL_RANK[a.activity] - LEVEL_RANK[b.activity] || (b.lastActivityAt || 0) - (a.lastActivityAt || 0)),
    };
  }

  /** "I'm interested": a reminder shortly before the start. Members only; never shown to others. */
  async function setInterest(account, eventId, on) {
    if (!account?.registered) fail(403, 'registration_required');
    const profile = await loadProfile(db, account.id);
    if (!profile?.guidelinesAcceptedAt) fail(403, 'profile_required');
    const now = clock.now();
    if (!(await interestLimit.allow(account.id, now))) fail(429, 'slow_down');
    const e = await db.query("select id from community_events where id = $1 and status = 'scheduled' and ends_at > $2", [Number(eventId) || 0, ts(now)]);
    if (!e.rowCount) fail(404, 'event_not_found');
    if (on) await db.query('insert into community_event_interest (event_id, account_id, created_at) values ($1, $2, $3) on conflict do nothing', [e.rows[0].id, account.id, ts(now)]);
    else await db.query('delete from community_event_interest where event_id = $1 and account_id = $2', [e.rows[0].id, account.id]);
    const n = await db.query('select count(*)::int as n from community_event_interest where event_id = $1', [e.rows[0].id]);
    return { interested: Boolean(on), interestCount: n.rows[0].n >= MIN_INTEREST_SHOWN ? n.rows[0].n : null };
  }

  // ---------- Staff ----------

  /** A discussion hosted by a real person (moderator, facilitator or verified professional). */
  async function createEvent(actor, body = {}) {
    const now = clock.now();
    const roomId = String(body.roomId || '');
    if (!isRoomId(roomId)) fail(400, 'room_not_found');
    const title = String(body.title || '').replace(/\s+/g, ' ').trim();
    const description = String(body.description || '').replace(/\r\n/g, '\n').trim().slice(0, 1000);
    const hostName = String(body.hostName || '').replace(/\s+/g, ' ').trim();
    const hostRole = HOST_ROLES.includes(body.hostRole) ? body.hostRole : null;
    const startsAt = Number(body.startsAt);
    const minutes = Math.round(Number(body.minutes) || 60);
    if (title.length < 3 || title.length > 120) fail(400, 'bad_title');
    if (hostName.length < 2 || hostName.length > 60) fail(400, 'bad_host');
    if (!hostRole) fail(400, 'bad_host_role');
    if (/\bbea\b|anulia|\bai\b|\bbot\b/i.test(hostName)) fail(400, 'host_must_be_a_person');
    if (!Number.isFinite(startsAt) || startsAt < now + 10 * MINUTE || startsAt > now + 90 * DAY) fail(400, 'bad_start');
    if (minutes < 15 || minutes > 180) fail(400, 'bad_length');
    const room = await db.query('select id from community_rooms where id = $1 and not is_archived', [roomId]);
    if (!room.rowCount) fail(404, 'room_not_found');
    const ins = await db.query(
      `insert into community_events (room_id, title, description, starts_at, ends_at, host_account_id, host_name, host_role, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $6, $9) returning id`,
      [roomId, title, description, ts(startsAt), ts(startsAt + minutes * MINUTE), actor.id, hostName, hostRole, ts(now)]
    );
    return { id: Number(ins.rows[0].id) };
  }

  async function cancelEvent(actor, eventId) {
    const now = clock.now();
    const r = await db.query("update community_events set status = 'cancelled', cancelled_at = $2 where id = $1 and status = 'scheduled' returning id, room_id", [Number(eventId) || 0, ts(now)]);
    if (!r.rowCount) fail(404, 'event_not_found');
    // People who were interested hear that it won't happen.
    const people = await db.query('select account_id from community_event_interest where event_id = $1', [r.rows[0].id]);
    for (const p of people.rows) await notify(db, p.account_id, 'community_event', { roomId: r.rows[0].room_id, eventId: Number(r.rows[0].id), cancelled: true }, `event:${r.rows[0].id}:cancelled`);
    return { ok: true };
  }

  /** Staff list: upcoming and recent discussions with interest counts (no names). */
  async function listForStaff() {
    const now = clock.now();
    const r = await db.query(
      `select e.*, r.topic_id, r.language, (select count(*)::int from community_event_interest i where i.event_id = e.id) as interest, false as mine
       from community_events e join community_rooms r on r.id = e.room_id where e.ends_at > $1 order by e.starts_at limit 100`,
      [ts(now - 7 * DAY)]
    );
    return { events: r.rows.map((e) => ({ ...shapeEvent(e, now), status: e.status, interestCount: e.interest })) };
  }

  /** Scheduler: a reminder ~15 minutes before the start to the people who are interested (once). */
  async function remindUpcoming(now = clock.now()) {
    const due = await db.query("select id, room_id, starts_at from community_events where status = 'scheduled' and reminded_at is null and starts_at > $1 and starts_at <= $2", [ts(now), ts(now + 20 * MINUTE)]);
    let sent = 0;
    for (const e of due.rows) {
      const people = await db.query('select account_id from community_event_interest where event_id = $1', [e.id]);
      for (const p of people.rows) if (await notify(db, p.account_id, 'community_event', { roomId: e.room_id, eventId: Number(e.id), startsAt: ms(e.starts_at) }, `event:${e.id}:soon`)) sent += 1;
      await db.query('update community_events set reminded_at = $2 where id = $1', [e.id, ts(now)]);
    }
    return sent;
  }

  return { discover, related, events, setInterest, createEvent, cancelEvent, listForStaff, remindUpcoming };
}
