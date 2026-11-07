// Community in the staff tools: rooms (pause, archive, describe, official
// notices, topic order), moderator languages, room statistics and
// moderation statistics.
//
// Statistics are per room and per topic, never per person: nothing here
// infers anything about someone's health from the rooms they join. Groups
// smaller than ANALYTICS_MIN_COHORT people are hidden. The context around a
// report (a few messages before and after, from the same room) opens one
// report at a time and every view is logged; there is no way to browse
// rooms or people's histories from here.

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { communityFor } from '../community/index.mjs';
import { ms, ts } from '../db/index.mjs';
import { parseRange } from '../analytics/index.mjs';
import { primaryRole } from './permissions.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const LANGS = ['en', 'ka', 'ru', 'hy', 'uk', 'tr', 'az', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'id', 'ja', 'ko', 'zh', 'ar', 'hi'];
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};
const needText = (v, min, code = 'reason_required', max = 500) => {
  const s = String(v || '').trim();
  if (s.length < min) fail(400, code);
  return s.slice(0, max);
};
const dayMs = (iso) => Date.parse(`${iso}T00:00:00Z`);

export function createCommunityAdmin(deps) {
  const { db, clock, config } = deps;
  const c = communityFor(deps);
  const minCohort = Math.max(1, Number(config.analytics?.minCohort) || 5);
  const role = (a) => primaryRole(a.roles) || 'admin';

  async function rooms(query) {
    const now = clock.now();
    const params = [ts(now - 7 * DAY), ts(now - 30 * DAY)];
    const where = [];
    if (query.lang && LANGS.includes(query.lang)) {
      params.push(query.lang);
      where.push(`r.language = $${params.length}`);
    }
    if (query.topic) {
      params.push(String(query.topic));
      where.push(`r.topic_id = $${params.length}`);
    }
    if (query.state === 'paused') where.push('r.is_paused');
    if (query.state === 'archived') where.push('r.is_archived');
    if (query.state === 'active') where.push('not r.is_paused and not r.is_archived');
    const r = await db.query(
      `select r.id, r.topic_id, r.language, r.is_paused, r.paused_at, r.pause_reason, r.is_archived, r.description, r.pinned_message_id, t.sort, t.is_active,
              (select count(*)::int from room_memberships m where m.room_id = r.id) as members,
              (select count(*)::int from community_messages x where x.room_id = r.id and x.created_at > $1 and x.author_kind = 'member') as messages7d,
              (select count(*)::int from community_messages x where x.room_id = r.id and x.created_at > $2 and x.author_kind = 'member') as messages30d,
              (select count(distinct x.author_account_id)::int from community_messages x where x.room_id = r.id and x.created_at > $2) as authors30d,
              (select max(x.created_at) from community_messages x where x.room_id = r.id and x.status = 'visible') as last_at,
              (select count(*)::int from reports p where p.room_id = r.id and p.status in ('open', 'in_review')) as open_reports
       from community_rooms r join community_topics t on t.id = r.topic_id
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by t.sort, r.language`,
      params
    );
    return {
      rooms: r.rows.map((x) => ({
        id: x.id,
        topic: x.topic_id,
        language: x.language,
        paused: x.is_paused,
        pausedAt: ms(x.paused_at),
        pauseReason: x.pause_reason,
        archived: x.is_archived,
        topicActive: x.is_active,
        description: x.description || {},
        members: x.members < minCohort ? null : x.members,
        messages7d: x.messages7d,
        messages30d: x.messages30d,
        authors30d: x.authors30d < minCohort ? null : x.authors30d,
        lastActivityAt: ms(x.last_at),
        openReports: x.open_reports,
      })),
      minCohort,
    };
  }

  async function setRoomState(actor, roomId, { action, reason }) {
    const why = needText(reason, 5);
    const now = clock.now();
    const sets = {
      pause: ['is_paused = true, paused_at = $2, paused_by = $3, pause_reason = $4', 'community.room_paused'],
      resume: ['is_paused = false, paused_at = null, paused_by = null, pause_reason = null', 'community.room_resumed'],
      archive: ['is_archived = true', 'community.room_archived'],
      restore: ['is_archived = false', 'community.room_restored'],
    }[action];
    if (!sets) fail(400, 'bad_action');
    await db.tx(async (t) => {
      const params = action === 'pause' ? [roomId, ts(now), actor.id, why] : [roomId];
      const r = await t.query(`update community_rooms set ${sets[0]} where id = $1 returning id`, params);
      if (!r.rowCount) fail(404, 'not_found');
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: sets[1], targetType: 'community_room', targetId: roomId, metadata: { reason: why } });
    });
    if (action === 'archive') c.bus.emit('room:archived', { roomId });
    else c.bus.emit('room:update', { roomId });
    return { ok: true };
  }

  async function setDescription(actor, roomId, description) {
    const clean = {};
    for (const [lang, text] of Object.entries(description || {})) {
      if (!LANGS.includes(lang)) continue;
      const s = String(text || '').trim();
      if (s.length > 400) fail(400, 'too_long');
      if (s) clean[lang] = s;
    }
    const r = await db.query('update community_rooms set description = $2::jsonb where id = $1 returning id', [roomId, JSON.stringify(clean)]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'community.room_described', targetType: 'community_room', targetId: roomId, metadata: { languages: Object.keys(clean) } });
    c.bus.emit('room:update', { roomId });
    return { ok: true, description: clean };
  }

  /** An official BeHappy notice in a room, clearly marked as from the team. */
  async function postNotice(actor, roomId, { body, pin }) {
    const text = needText(body, 5, 'body_required', 1000);
    const now = clock.now();
    const id = await db.tx(async (t) => {
      const room = await t.query('select id from community_rooms where id = $1 and not is_archived', [roomId]);
      if (!room.rowCount) fail(404, 'not_found');
      const ins = await t.query("insert into community_messages (room_id, author_account_id, author_kind, author_pseudonym, body, status, created_at, flags) values ($1, null, 'system', 'BeHappy', $2, 'visible', $3, $4::jsonb) returning id", [
        roomId,
        text,
        ts(now),
        JSON.stringify({ official: true }),
      ]);
      const mid = ins.rows[0].id;
      if (pin) await t.query('update community_rooms set pinned_message_id = $2 where id = $1', [roomId, mid]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'community.notice_posted', targetType: 'community_room', targetId: roomId, metadata: { messageId: Number(mid), pinned: Boolean(pin) } });
      return mid;
    });
    c.bus.emit('message:new', { roomId, messageId: id });
    if (pin) c.bus.emit('room:update', { roomId });
    return { ok: true, messageId: Number(id) };
  }

  async function topics() {
    const r = await db.query('select id, sort, icon, is_active from community_topics order by sort');
    return { topics: r.rows.map((x) => ({ id: x.id, sort: x.sort, icon: x.icon, active: x.is_active })) };
  }

  async function orderTopics(actor, order) {
    if (!Array.isArray(order) || !order.length) fail(400, 'bad_order');
    const known = (await topics()).topics.map((x) => x.id);
    if (order.length !== known.length || !order.every((id) => known.includes(id))) fail(400, 'bad_order');
    await db.tx(async (t) => {
      for (let i = 0; i < order.length; i += 1) await t.query('update community_topics set sort = $2 where id = $1', [order[i], i + 1]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'community.topics_ordered', targetType: 'community', targetId: 'topics', metadata: { order } });
    });
    return topics();
  }

  async function moderatorLanguages() {
    const r = await db.query(
      `select a.id, a.email, a.roles, coalesce(array_agg(l.language order by l.language) filter (where l.language is not null), '{}') as languages
       from accounts a left join moderator_languages l on l.account_id = a.id
       where a.roles && array['moderator', 'admin', 'owner']::text[] group by a.id order by a.email`
    );
    return { moderators: r.rows.map((x) => ({ id: x.id, email: x.email, roles: x.roles, languages: x.languages })) };
  }

  async function setModeratorLanguages(actor, accountId, languages) {
    const list = [...new Set((Array.isArray(languages) ? languages : []).filter((l) => LANGS.includes(l)))];
    await db.tx(async (t) => {
      const a = await t.query("select id from accounts where id = $1 and roles && array['moderator', 'admin', 'owner']::text[]", [accountId]);
      if (!a.rowCount) fail(404, 'not_found');
      await t.query('delete from moderator_languages where account_id = $1', [accountId]);
      for (const l of list) await t.query('insert into moderator_languages (account_id, language) values ($1, $2)', [accountId, l]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'community.moderator_languages', targetType: 'account', targetId: accountId, metadata: { languages: list } });
    });
    return { ok: true, languages: list };
  }

  async function stats(query) {
    const range = parseRange(query, clock.now());
    const from = ts(dayMs(range.from));
    const to = ts(dayMs(range.to) + DAY);
    const daily = await db.query(
      `select (created_at at time zone 'UTC')::date::text as day,
              count(*) filter (where author_kind = 'member')::int as messages,
              count(distinct author_account_id)::int as authors,
              count(*) filter (where author_kind = 'anulia')::int as anulia,
              count(*) filter (where status = 'held' or flags ? 'hold')::int as held
       from community_messages where created_at >= $1 and created_at < $2 group by 1 order by 1`,
      [from, to]
    );
    const joins = await db.query("select count(*)::int as n from room_memberships where joined_at >= $1 and joined_at < $2", [from, to]);
    const byTopic = await db.query(
      `select r.topic_id as topic, count(*)::int as messages, count(distinct m.author_account_id)::int as authors
       from community_messages m join community_rooms r on r.id = m.room_id
       where m.created_at >= $1 and m.created_at < $2 and m.author_kind = 'member' group by r.topic_id order by messages desc`,
      [from, to]
    );
    const byLanguage = await db.query(
      `select r.language, count(*)::int as messages from community_messages m join community_rooms r on r.id = m.room_id
       where m.created_at >= $1 and m.created_at < $2 and m.author_kind = 'member' group by r.language order by messages desc`,
      [from, to]
    );
    const map = new Map(daily.rows.map((d) => [d.day, d]));
    const series = [];
    for (let d = dayMs(range.from); d <= dayMs(range.to); d += DAY) {
      const key = new Date(d).toISOString().slice(0, 10);
      const row = map.get(key);
      series.push({ day: key, messages: row?.messages || 0, authors: row ? (row.authors < minCohort ? null : row.authors) : 0, anulia: row?.anulia || 0, held: row?.held || 0 });
    }
    return {
      range,
      minCohort,
      totals: { messages: series.reduce((s, x) => s + x.messages, 0), anulia: series.reduce((s, x) => s + x.anulia, 0), held: series.reduce((s, x) => s + x.held, 0), joins: joins.rows[0].n },
      daily: series,
      byTopic: byTopic.rows.map((x) => ({ topic: x.topic, messages: x.messages, authors: x.authors < minCohort ? null : x.authors })),
      byLanguage: byLanguage.rows,
    };
  }

  async function moderationStats(query) {
    const range = parseRange(query, clock.now());
    const from = ts(dayMs(range.from));
    const to = ts(dayMs(range.to) + DAY);
    const [opened, byReason, resolved, actions, appeals, queue, perModerator] = await Promise.all([
      db.query("select (created_at at time zone 'UTC')::date::text as day, count(*)::int as n, count(*) filter (where reporter_kind = 'system')::int as automatic from reports where created_at >= $1 and created_at < $2 group by 1 order by 1", [from, to]),
      db.query('select reason, count(*)::int as n from reports where created_at >= $1 and created_at < $2 group by reason order by n desc', [from, to]),
      db.query(
        `select count(*)::int as n, percentile_cont(0.5) within group (order by extract(epoch from (resolved_at - created_at))) as median_seconds,
                percentile_cont(0.9) within group (order by extract(epoch from (resolved_at - created_at))) as p90_seconds,
                count(*) filter (where status = 'dismissed')::int as dismissed
         from reports where resolved_at >= $1 and resolved_at < $2`,
        [from, to]
      ),
      db.query('select action, count(*)::int as n from moderation_actions where created_at >= $1 and created_at < $2 group by action order by n desc', [from, to]),
      db.query("select status, count(*)::int as n from appeals where created_at >= $1 and created_at < $2 group by status", [from, to]),
      db.query("select count(*) filter (where status in ('open', 'in_review'))::int as open, count(*) filter (where status in ('open', 'in_review') and priority >= 3)::int as urgent, min(created_at) filter (where status in ('open', 'in_review')) as oldest from reports"),
      db.query("select actor_account_id as id, count(*)::int as n from moderation_actions where created_at >= $1 and created_at < $2 and actor_account_id is not null group by 1 order by n desc limit 20", [from, to]),
    ]);
    const res = resolved.rows[0];
    return {
      range,
      queue: { open: queue.rows[0].open, urgent: queue.rows[0].urgent, oldestOpenAt: ms(queue.rows[0].oldest) },
      reportsPerDay: opened.rows,
      byReason: byReason.rows,
      resolved: { count: res.n, dismissed: res.dismissed, medianMinutes: res.median_seconds === null ? null : Math.round(Number(res.median_seconds) / 60), p90Minutes: res.p90_seconds === null ? null : Math.round(Number(res.p90_seconds) / 60) },
      actions: actions.rows,
      appeals: Object.fromEntries(appeals.rows.map((a) => [a.status, a.n])),
      workload: perModerator.rows.map((x) => ({ moderatorId: x.id, actions: x.n })),
    };
  }

  return { rooms, setRoomState, setDescription, postNotice, topics, orderTopics, moderatorLanguages, setModeratorLanguages, stats, moderationStats };
}

export function mountCommunityAdmin(app, deps) {
  const a = createCommunityAdmin(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/community/rooms', ...can('community.view'), handle((req) => a.rooms(req.query)));
  r.post('/community/rooms/:id/state', ...can('community.manage'), handle((req) => a.setRoomState(req.account, req.params.id, req.body || {})));
  r.put('/community/rooms/:id/description', ...can('community.manage'), handle((req) => a.setDescription(req.account, req.params.id, req.body?.description)));
  r.post('/community/rooms/:id/notice', ...can('community.manage'), handle((req) => a.postNotice(req.account, req.params.id, req.body || {})));
  r.get('/community/topics', ...can('community.view'), handle(() => a.topics()));
  r.put('/community/topics/order', ...can('community.manage'), handle((req) => a.orderTopics(req.account, req.body?.order)));
  r.get('/community/moderators', ...can('community.view'), handle(() => a.moderatorLanguages()));
  r.put('/community/moderators/:id/languages', ...can('community.manage'), handle((req) => a.setModeratorLanguages(req.account, req.params.id, req.body?.languages)));
  r.get('/community/stats', ...can('community.view'), handle((req) => a.stats(req.query)));
  r.get('/moderation/stats', ...can('moderation.act'), handle((req) => a.moderationStats(req.query)));

  app.use('/api/admin', r);
}
