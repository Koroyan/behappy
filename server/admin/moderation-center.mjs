// Moderation 2.0: the investigation workspace behind /admin/moderation.
//
// Everything here starts from a report. There is no endpoint that browses
// rooms or anyone's messages freely: message context needs a report about
// that message, and every view of it is logged. Members are shown by their
// community name and member reference only; the link to a real account is
// returned only to staff who may also open account profiles
// (users.view + users.community.view).
//
// Actions reuse the community moderation service (same notifications to the
// member, same moderation_actions history) and add a reason, the previous and
// new status of the report, and an audit entry for each decision.

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { communityFor } from '../community/index.mjs';
import { activeSuspension, loadMessageRows, messageForViewer } from '../community/service.mjs';
import { ms, ts } from '../db/index.mjs';
import { permissionsFor, primaryRole } from './permissions.mjs';
import { safetyFor } from './safety.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const VIEWS = ['open', 'urgent', 'mine', 'unassigned', 'in_review', 'resolved', 'dismissed', 'all'];
const ACTIONS = ['dismiss', 'remove_message', 'approve_message', 'warn', 'restrict_24h', 'restrict_7d', 'restrict_custom', 'restrict_permanent'];
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};
const needText = (v, min, code = 'reason_required', max = 1000) => {
  const s = String(v || '').trim();
  if (s.length < min) fail(400, code);
  return s.slice(0, max);
};

export function createModerationCenter(deps) {
  const { db, clock } = deps;
  const c = communityFor(deps);
  const mod = c.moderation;
  const role = (a) => primaryRole(a.roles) || 'moderator';
  const seal = (text) => deps.crypto.encrypt('messages', text);
  const open = (r) => deps.crypto.decryptText('messages', { ciphertext: r.body_ciphertext, iv: r.body_iv, tag: r.body_tag });

  const viewWhere = (view, params, actorId) => {
    switch (view) {
      case 'urgent':
        return "rep.status in ('open', 'in_review') and rep.priority >= 3";
      case 'mine':
        params.push(actorId);
        return `rep.status in ('open', 'in_review') and rep.assigned_to = $${params.length}`;
      case 'unassigned':
        return "rep.status in ('open', 'in_review') and rep.assigned_to is null";
      case 'in_review':
        return "rep.status = 'in_review'";
      case 'resolved':
        return "rep.status = 'resolved'";
      case 'dismissed':
        return "rep.status = 'dismissed'";
      case 'all':
        return 'true';
      default:
        return "rep.status in ('open', 'in_review')";
    }
  };

  async function counts(actor) {
    const r = await db.query(
      `select count(*) filter (where status in ('open', 'in_review'))::int as open,
              count(*) filter (where status in ('open', 'in_review') and priority >= 3)::int as urgent,
              count(*) filter (where status in ('open', 'in_review') and assigned_to = $1)::int as mine,
              count(*) filter (where status in ('open', 'in_review') and assigned_to is null)::int as unassigned,
              count(*) filter (where status = 'in_review')::int as in_review,
              count(*) filter (where status = 'resolved')::int as resolved,
              count(*) filter (where status = 'dismissed')::int as dismissed
       from reports where target_type in ('message', 'member')`,
      [actor.id]
    );
    const a = await db.query("select count(*)::int as n from appeals where status = 'open'");
    return { ...r.rows[0], appeals: a.rows[0].n };
  }

  async function queue(actor, query) {
    const view = VIEWS.includes(query.view) ? query.view : 'open';
    const limit = Math.max(1, Math.min(Number(query.limit) || 50, 100));
    const params = [];
    const where = [viewWhere(view, params, actor.id), "rep.target_type in ('message', 'member')"];
    if (query.q) {
      const q = String(query.q).trim().slice(0, 80);
      if (/^[0-9]+$/.test(q)) {
        params.push(Number(q));
        where.push(`(rep.id = $${params.length} or (rep.target_type = 'message' and rep.target_id = $${params.length}::text))`);
      } else {
        params.push(`%${q.split('%').join('')}%`);
        where.push(`(p.pseudonym ilike $${params.length} or rep.room_id ilike $${params.length})`);
      }
    }
    if (Number(query.before) > 0) {
      params.push(Number(query.before));
      where.push(`rep.id < $${params.length}`);
    }
    params.push(limit + 1);
    const done = ['resolved', 'dismissed', 'all'].includes(view);
    const r = await db.query(
      `select rep.id, rep.reporter_kind, rep.target_type, rep.target_id, rep.room_id, rep.reason, rep.priority, rep.status, rep.created_at, rep.resolved_at,
              rep.assigned_to, rep.snapshot, rep.second_review_requested_at, a.email as assignee_email,
              m.status as message_status, p.ref as member_ref, p.pseudonym as member_pseudonym
       from reports rep
       left join community_messages m on rep.target_type = 'message' and m.id::text = rep.target_id
       left join community_profiles p on p.account_id = rep.target_account_id
       left join accounts a on a.id = rep.assigned_to
       where ${where.join(' and ')}
       order by ${done ? 'rep.id desc' : 'rep.priority desc, rep.created_at asc, rep.id desc'} limit $${params.length}`,
      params
    );
    const rows = r.rows.slice(0, limit);
    return {
      view,
      counts: await counts(actor),
      reports: rows.map((x) => ({
        id: Number(x.id),
        priority: x.priority,
        reason: x.reason,
        status: x.status,
        source: x.reporter_kind === 'system' ? 'automatic' : 'member',
        createdAt: ms(x.created_at),
        resolvedAt: ms(x.resolved_at),
        target: x.target_type,
        messageId: x.target_type === 'message' ? Number(x.target_id) : null,
        messageStatus: x.message_status || null,
        roomId: x.room_id,
        member: x.member_ref ? { ref: x.member_ref, pseudonym: x.member_pseudonym } : null,
        snippet: x.snapshot?.body ? String(x.snapshot.body).slice(0, 140) : null,
        assignedTo: x.assigned_to ? { id: x.assigned_to, label: x.assignee_email, me: x.assigned_to === actor.id } : null,
        secondReview: Boolean(x.second_review_requested_at),
      })),
      nextBefore: r.rows.length > limit && done ? Number(rows[rows.length - 1].id) : null,
    };
  }

  async function loadReport(q, id, { lock = false } = {}) {
    const r = await q.query(`select * from reports where id = $1${lock ? ' for update' : ''}`, [Number(id)]);
    if (!r.rows[0]) fail(404, 'not_found');
    return r.rows[0];
  }

  async function detail(actor, id) {
    const rep = await loadReport(db, id);
    const [msg, member, reporter, notes, actions, previous, incident, assignee] = await Promise.all([
      rep.target_type === 'message'
        ? db.query('select m.id, m.room_id, m.status, m.body, m.created_at, m.removal_reason, r.topic_id, r.language, r.is_archived, r.is_paused from community_messages m left join community_rooms r on r.id = m.room_id where m.id = $1', [Number(rep.target_id)])
        : { rows: [] },
      rep.target_account_id ? db.query('select ref, pseudonym, created_at from community_profiles where account_id = $1', [rep.target_account_id]) : { rows: [] },
      rep.reporter_account_id ? db.query('select ref, pseudonym from community_profiles where account_id = $1', [rep.reporter_account_id]) : { rows: [] },
      db.query('select n.*, a.email from moderation_report_notes n left join accounts a on a.id = n.author_id where n.report_id = $1 order by n.id', [rep.id]),
      db.query('select a.*, s.email as actor_email from moderation_actions a left join accounts s on s.id = a.actor_account_id where a.report_id = $1 order by a.id', [rep.id]),
      rep.target_account_id
        ? db.query("select id, reason, status, resolution, resolved_at, created_at from reports where target_account_id = $1 and id <> $2 order by id desc limit 10", [rep.target_account_id, rep.id])
        : { rows: [] },
      db.query('select id, status from safety_incidents where report_id = $1', [rep.id]),
      rep.assigned_to ? db.query('select email from accounts where id = $1', [rep.assigned_to]) : { rows: [] },
    ]);
    const m = msg.rows[0];
    const p = member.rows[0];
    return {
      report: {
        id: Number(rep.id),
        priority: rep.priority,
        reason: rep.reason,
        details: rep.details,
        status: rep.status,
        source: rep.reporter_kind === 'system' ? 'automatic' : 'member',
        reporter: rep.reporter_kind === 'system' ? null : reporter.rows[0] ? { ref: reporter.rows[0].ref, pseudonym: reporter.rows[0].pseudonym } : { ref: null, pseudonym: null },
        createdAt: ms(rep.created_at),
        assignedTo: rep.assigned_to ? { id: rep.assigned_to, label: assignee.rows[0]?.email || null, me: rep.assigned_to === actor.id, since: ms(rep.assigned_at) } : null,
        resolution: rep.resolution,
        resolutionNote: rep.resolution_note,
        resolvedAt: ms(rep.resolved_at),
        secondReview: rep.second_review_requested_at ? { at: ms(rep.second_review_requested_at), byMe: rep.second_review_requested_by === actor.id, reason: rep.second_review_reason } : null,
        target: rep.target_type,
      },
      // What was reported, kept as evidence (resolved snapshots are cleared after 180 days).
      evidence: { body: rep.snapshot?.body ?? null, pseudonym: rep.snapshot?.pseudonym ?? null, roomId: rep.snapshot?.roomId ?? rep.room_id, statusAtReport: rep.snapshot?.status ?? null },
      // What the message is now.
      current: m
        ? {
            messageId: Number(m.id),
            status: m.status,
            visibleToMembers: m.status === 'visible',
            body: m.status === 'deleted' ? '' : m.body,
            removalReason: m.removal_reason,
            createdAt: ms(m.created_at),
            room: { id: m.room_id, topic: m.topic_id, language: m.language, archived: Boolean(m.is_archived), paused: Boolean(m.is_paused) },
          }
        : null,
      member: p ? { ref: p.ref, pseudonym: p.pseudonym, since: ms(p.created_at) } : null,
      safetyIncident: incident.rows[0] ? { id: Number(incident.rows[0].id), status: incident.rows[0].status } : null,
      notes: notes.rows.map((n) => ({ id: Number(n.id), author: n.email || null, body: open(n), at: ms(n.created_at) })),
      history: actions.rows.map((a) => ({ id: Number(a.id), action: a.action, actor: a.actor_email || a.actor_kind, reason: a.reason, note: a.note, hours: a.duration_hours, at: ms(a.created_at) })),
      previousReports: previous.rows.map((x) => ({ id: Number(x.id), reason: x.reason, status: x.status, resolution: x.resolution, at: ms(x.created_at) })),
    };
  }

  /** A few messages around one reported message. The report is the authorization; every view is logged. */
  async function context(actor, id, { before = 5, after = 5 } = {}) {
    const rep = await loadReport(db, id);
    if (rep.target_type !== 'message' || !rep.room_id) fail(409, 'no_context');
    const b = Math.max(0, Math.min(Number(before) || 5, 10));
    const a = Math.max(0, Math.min(Number(after) || 5, 10));
    const mid = Number(rep.target_id);
    const ids = await db.query(
      `(select id from community_messages where room_id = $1 and id < $2 order by id desc limit $3)
       union all (select id from community_messages where room_id = $1 and id = $2)
       union all (select id from community_messages where room_id = $1 and id > $2 order by id asc limit $4)`,
      [rep.room_id, mid, b, a]
    );
    const rows = await loadMessageRows(db, ids.rows.map((x) => x.id));
    rows.sort((x, y) => Number(x.id) - Number(y.id));
    const room = await db.query('select r.id, r.topic_id, r.language, r.is_archived, r.is_paused from community_rooms r where r.id = $1', [rep.room_id]);
    const viewer = { id: actor.id, blocked: new Set(), muted: new Set(), staff: true };
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.context_viewed', targetType: 'report', targetId: rep.id, metadata: { roomId: rep.room_id, messages: rows.length, before: b, after: a } });
    return {
      reportId: Number(rep.id),
      roomId: rep.room_id,
      room: room.rows[0] ? { id: room.rows[0].id, topic: room.rows[0].topic_id, language: room.rows[0].language, archived: Boolean(room.rows[0].is_archived), paused: Boolean(room.rows[0].is_paused) } : null,
      focusMessageId: mid,
      focusFound: rows.some((x) => Number(x.id) === mid),
      messages: rows.map((x) => {
        const dto = messageForViewer(x, viewer, new Map());
        return dto ? { ...dto, isFocus: Number(x.id) === mid } : null;
      }).filter(Boolean),
    };
  }

  /** The community-side profile of a member: standing and moderation history, no real identity. */
  async function member(actor, ref) {
    const pr = await db.query('select account_id, ref, pseudonym, created_at from community_profiles where ref = $1', [String(ref || '')]);
    const p = pr.rows[0];
    if (!p) fail(404, 'member_not_found');
    const id = p.account_id;
    const now = clock.now();
    const [rooms, messages, reports, actions, suspensions, appeals, reportedRooms] = await Promise.all([
      db.query('select count(*)::int as n from room_memberships where account_id = $1', [id]),
      db.query("select count(*)::int as n, count(*) filter (where status = 'removed')::int as removed from community_messages where author_account_id = $1", [id]),
      db.query('select id, reason, status, resolution, priority, created_at, target_type, target_id from reports where target_account_id = $1 order by id desc limit 30', [id]),
      db.query('select id, action, reason, duration_hours, report_id, created_at from moderation_actions where target_account_id = $1 order by id desc limit 50', [id]),
      db.query('select id, kind, scope, reason, starts_at, ends_at, lifted_at from suspensions where account_id = $1 order by starts_at desc limit 20', [id]),
      db.query('select id, status, created_at, decided_at from appeals where account_id = $1 order by id desc limit 20', [id]),
      // Only rooms where this member's messages were reported (no list of every room they joined).
      db.query("select room_id, count(*)::int as n from reports where target_account_id = $1 and room_id is not null group by room_id order by n desc limit 10", [id]),
    ]);
    const active = await activeSuspension(db, id, now);
    const warnings = actions.rows.filter((a) => a.action === 'warn').length;
    const standing = active ? (active.kind === 'permanent' ? 'restricted_permanently' : 'restricted') : warnings ? 'warned' : reports.rows.some((r) => r.status === 'resolved' && r.resolution && r.resolution !== 'dismiss') ? 'past_actions' : 'good';
    const perms = permissionsFor(actor.roles);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.member_viewed', targetType: 'community_member', targetId: p.ref });
    return {
      member: {
        ref: p.ref,
        pseudonym: p.pseudonym,
        since: ms(p.created_at),
        standing,
        roomsJoined: rooms.rows[0].n,
        messages: messages.rows[0].n,
        removedMessages: messages.rows[0].removed,
        reportsAgainst: reports.rows.length,
        warnings,
        activeRestriction: active ? { id: active.id, kind: active.kind, reason: active.reason, endsAt: active.endsAt } : null,
      },
      reportedRooms: reportedRooms.rows.map((r) => ({ roomId: r.room_id, reports: r.n })),
      reports: reports.rows.map((r) => ({ id: Number(r.id), reason: r.reason, status: r.status, resolution: r.resolution, priority: r.priority, at: ms(r.created_at), messageId: r.target_type === 'message' ? Number(r.target_id) : null })),
      decisions: actions.rows.map((a) => ({ id: Number(a.id), action: a.action, reason: a.reason, hours: a.duration_hours, reportId: a.report_id ? Number(a.report_id) : null, at: ms(a.created_at) })),
      restrictions: suspensions.rows.map((s) => ({ id: Number(s.id), kind: s.kind, scope: s.scope, reason: s.reason, startsAt: ms(s.starts_at), endsAt: ms(s.ends_at), lifted: Boolean(s.lifted_at) })),
      appeals: appeals.rows.map((x) => ({ id: Number(x.id), status: x.status, at: ms(x.created_at), decidedAt: ms(x.decided_at) })),
      // Only for staff who may also open account profiles.
      accountId: perms.has('users.view') && perms.has('users.community.view') ? id : undefined,
    };
  }

  const settle = async (actor, rep, from, to, action, reason) =>
    audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.report_settled', targetType: 'report', targetId: rep.id, metadata: { from, to, action, reason } });

  async function assign(actor, id, assigneeId) {
    const target = assigneeId || actor.id;
    if (target !== actor.id) {
      const a = await db.query('select roles, staff_suspended_at from accounts where id = $1', [target]);
      if (!a.rows[0] || a.rows[0].staff_suspended_at || !permissionsFor(a.rows[0].roles).has('moderation.act')) fail(400, 'bad_assignee');
    }
    const now = ts(clock.now());
    const r = await db.query("update reports set status = 'in_review', assigned_to = $2, assigned_at = $3 where id = $1 and status in ('open', 'in_review') returning id", [Number(id), target, now]);
    if (!r.rowCount) fail(409, 'not_open');
    await db.query("insert into moderation_actions (actor_account_id, actor_kind, action, report_id, note, created_at) values ($1, $2, 'assign', $3, $4, $5)", [actor.id, actor.roles.includes('admin') || actor.roles.includes('owner') ? 'admin' : 'moderator', Number(id), target === actor.id ? 'claimed' : 'reassigned', now]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: target === actor.id ? 'moderation.report_claimed' : 'moderation.report_reassigned', targetType: 'report', targetId: Number(id), metadata: { assignee: target } });
    return { ok: true };
  }

  async function addNote(actor, id, body) {
    const text = needText(body, 2, 'note_required', 2000);
    await loadReport(db, id);
    const enc = seal(text);
    await db.query('insert into moderation_report_notes (report_id, author_id, body_ciphertext, body_iv, body_tag, created_at) values ($1, $2, $3, $4, $5, $6)', [Number(id), actor.id, enc.ciphertext, enc.iv, enc.tag, ts(clock.now())]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.report_note', targetType: 'report', targetId: Number(id) });
    return { ok: true };
  }

  async function secondReview(actor, id, reason) {
    const why = needText(reason, 5);
    const r = await db.query("update reports set second_review_requested_at = $2, second_review_requested_by = $3, second_review_reason = $4, assigned_to = null where id = $1 and status in ('open', 'in_review') returning id", [Number(id), ts(clock.now()), actor.id, why]);
    if (!r.rowCount) fail(409, 'not_open');
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.second_review_requested', targetType: 'report', targetId: Number(id), metadata: { reason: why } });
    return { ok: true };
  }

  async function decide(actor, id, { action, hours, reason, note }) {
    if (!ACTIONS.includes(action)) fail(400, 'bad_action');
    const why = action === 'approve_message' ? String(reason || '').trim().slice(0, 500) : needText(reason, 3, 'reason_required', 500);
    const rep = await loadReport(db, id);
    if (!['open', 'in_review'].includes(rep.status)) fail(409, 'already_resolved');
    if (rep.second_review_requested_by && rep.second_review_requested_by === actor.id) fail(409, 'second_reviewer_required');
    const map = {
      dismiss: ['dismiss', {}],
      remove_message: ['remove_message', {}],
      approve_message: ['approve_message', {}],
      warn: ['warn', {}],
      restrict_24h: ['suspend', { hours: 24 }],
      restrict_7d: ['suspend', { hours: 24 * 7 }],
      restrict_custom: ['suspend', { hours: Math.max(1, Math.min(Number(hours) || 0, 24 * 90)) }],
      restrict_permanent: ['ban', {}],
    };
    const [serviceAction, extra] = map[action];
    if (action === 'restrict_custom' && !(Number(hours) >= 1)) fail(400, 'bad_hours');
    await mod.resolve(actor, rep.id, { action: serviceAction, hours: extra.hours, note: note ? String(note).slice(0, 1000) : null, reason: why || rep.reason });
    const after = await loadReport(db, rep.id);
    await settle(actor, rep, rep.status, after.status, action, why);
    return { ok: true, status: after.status };
  }

  async function escalate(actor, id, note) {
    const text = needText(note, 10, 'note_required', 2000);
    const rep = await loadReport(db, id);
    const safety = safetyFor(deps);
    const existing = await db.query('select id from safety_incidents where report_id = $1', [rep.id]);
    let incidentId = existing.rows[0]?.id;
    if (!incidentId) {
      const ins = await db.query("insert into safety_incidents (report_id, source, room_id, subject_account_id, priority, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $6) on conflict (report_id) do nothing returning id", [
        rep.id,
        rep.reporter_kind === 'system' ? 'automatic' : 'report',
        rep.room_id,
        rep.target_account_id,
        Math.max(3, rep.priority || 0),
        ts(clock.now()),
      ]);
      incidentId = ins.rows[0]?.id || (await db.query('select id from safety_incidents where report_id = $1', [rep.id])).rows[0].id;
    }
    await safety.escalate(actor, incidentId, { body: text });
    await db.query("insert into moderation_actions (actor_account_id, actor_kind, action, report_id, target_account_id, room_id, note, created_at) values ($1, $2, 'escalate_safety', $3, $4, $5, $6, $7)", [
      actor.id,
      actor.roles.includes('admin') || actor.roles.includes('owner') ? 'admin' : 'moderator',
      rep.id,
      rep.target_account_id,
      rep.room_id,
      'escalated to the safety team',
      ts(clock.now()),
    ]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.escalated_to_safety', targetType: 'report', targetId: rep.id, metadata: { incidentId: Number(incidentId) } });
    return { ok: true, incidentId: Number(incidentId) };
  }

  async function restrictMember(actor, ref, { hours, permanent, reason, reportId }) {
    const why = needText(reason, 3);
    const h = Number(hours);
    if (!permanent && !(h >= 1 && h <= 24 * 90)) fail(400, 'bad_hours');
    const out = await mod.suspend(actor, { memberRef: ref, kind: permanent ? 'permanent' : 'temporary', hours: permanent ? null : h, reason: why, reportId: reportId ? Number(reportId) : null });
    return { ok: true, restrictionId: Number(out.suspensionId) };
  }

  async function liftRestriction(actor, suspensionId, note) {
    const why = needText(note, 3);
    return mod.lift(actor, suspensionId, why);
  }

  /** Staff who can take reports (for reassigning). Staff addresses only; never members. */
  async function moderators(actor) {
    const r = await db.query('select id, email, roles from accounts where staff_suspended_at is null and cardinality(roles) > 0 order by email');
    return { moderators: r.rows.filter((a) => permissionsFor(a.roles).has('moderation.act')).map((a) => ({ id: a.id, label: a.email, me: a.id === actor.id })) };
  }

  /** Puts a removed message back, with a reason, linked to the report. */
  async function restore(actor, id, reason) {
    const why = needText(reason, 3);
    const rep = await loadReport(db, id);
    if (rep.target_type !== 'message') fail(409, 'no_message');
    const m = await db.query('select status from community_messages where id = $1', [Number(rep.target_id)]);
    if (!m.rows[0]) fail(404, 'not_found');
    const from = m.rows[0].status;
    if (from !== 'removed') fail(409, 'not_removed');
    await mod.restoreMessage(actor, rep.target_id);
    await db.query("update moderation_actions set report_id = $1, reason = $2 where id = (select max(id) from moderation_actions where target_message_id = $3 and action = 'restore_message')", [rep.id, why, Number(rep.target_id)]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'moderation.message_restored', targetType: 'report', targetId: rep.id, metadata: { from, to: 'visible', reason: why, messageId: Number(rep.target_id) } });
    return { ok: true };
  }

  return { counts, queue, detail, context, member, assign, addNote, secondReview, decide, escalate, restrictMember, liftRestriction, moderators, restore };
}

export function mountModerationCenter(app, deps) {
  const m = createModerationCenter(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/moderation/queue', ...can('moderation.act'), handle((req) => m.queue(req.account, req.query)));
  r.get('/moderation/moderators', ...can('moderation.act'), handle((req) => m.moderators(req.account)));
  r.get('/moderation/counts', ...can('moderation.act'), handle((req) => m.counts(req.account)));
  r.post('/moderation/reports/:id/restore', ...can('moderation.act'), handle((req) => m.restore(req.account, req.params.id, req.body?.reason)));
  r.get('/moderation/reports/:id', ...can('moderation.act'), handle((req) => m.detail(req.account, req.params.id)));
  r.get('/moderation/reports/:id/context', ...can('moderation.context'), handle((req) => m.context(req.account, req.params.id, { before: req.query.before, after: req.query.after })));
  r.post('/moderation/reports/:id/assign', ...can('moderation.act'), handle((req) => m.assign(req.account, req.params.id, req.body?.assigneeId)));
  r.post('/moderation/reports/:id/notes', ...can('moderation.act'), handle((req) => m.addNote(req.account, req.params.id, req.body?.body)));
  r.post('/moderation/reports/:id/second-review', ...can('moderation.act'), handle((req) => m.secondReview(req.account, req.params.id, req.body?.reason)));
  r.post('/moderation/reports/:id/decide', ...can('moderation.act'), handle((req) => m.decide(req.account, req.params.id, req.body || {})));
  r.post('/moderation/reports/:id/escalate', ...can('safety.manage'), handle((req) => m.escalate(req.account, req.params.id, req.body?.note)));
  r.get('/moderation/members/:ref', ...can('moderation.members.view'), handle((req) => m.member(req.account, req.params.ref)));
  r.post('/moderation/members/:ref/restrict', ...can('moderation.act'), handle((req) => m.restrictMember(req.account, req.params.ref, req.body || {})));
  r.post('/moderation/restrictions/:id/lift', ...can('moderation.act'), handle((req) => m.liftRestriction(req.account, req.params.id, req.body?.note)));
  app.use('/api/admin', r);
}
