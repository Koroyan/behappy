// Human moderation. Automatic checks only hold messages and raise reports;
// every removal, suspension and appeal decision is made by a moderator or an
// admin, recorded in moderation_actions (the room's audit history) and in the
// audit log. Moderators see reported content, never journals, Anulia
// conversations, bookings or professional documents.

import { audit } from '../audit.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { accountForRef, CommunityError } from './service.mjs';

const HOUR = 60 * 60 * 1000;

export function createModeration({ db, clock = { now: () => Date.now() }, bus }) {
  const fail = (status, code, extra) => {
    throw new CommunityError(status, code, extra);
  };
  // moderation_actions.actor_kind is 'admin' or 'moderator'; the owner counts as admin.
  const seniorStaff = (roles = []) => roles.includes('admin') || roles.includes('owner');
  const actorKind = (actor) => (seniorStaff(actor.roles) ? 'admin' : 'moderator');

  async function record(t, actor, entry, now) {
    const r = await t.query(
      'insert into moderation_actions (actor_account_id, actor_kind, action, target_account_id, target_message_id, report_id, room_id, reason, note, duration_hours, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id',
      [
        actor?.id || null,
        actor ? actorKind(actor) : 'system',
        entry.action,
        entry.targetAccountId || null,
        entry.messageId || null,
        entry.reportId || null,
        entry.roomId || null,
        entry.reason || null,
        entry.note ? String(entry.note).slice(0, 1000) : null,
        entry.hours || null,
        ts(now),
      ]
    );
    await audit(t, { actorId: actor?.id || null, actorRole: actor ? actorKind(actor) : 'system', action: `moderation.${entry.action}`, targetType: entry.messageId ? 'community_message' : 'account', targetId: entry.messageId || entry.targetAccountId, metadata: { reportId: entry.reportId || null, hours: entry.hours || null } });
    return r.rows[0].id;
  }

  const toReport = (r) => ({
    id: r.id,
    reporterKind: r.reporter_kind,
    targetType: r.target_type,
    targetId: r.target_id,
    roomId: r.room_id,
    reason: r.reason,
    details: r.details,
    snapshot: r.snapshot || {},
    priority: r.priority,
    status: r.status,
    assignedToMe: false,
    createdAt: ms(r.created_at),
    resolvedAt: ms(r.resolved_at),
    resolution: r.resolution,
    resolutionNote: r.resolution_note,
    messageStatus: r.message_status || null,
    targetMemberRef: r.target_ref || null,
    targetPseudonym: r.target_pseudonym || null,
    priorReports: r.prior_reports ?? 0,
  });

  async function listReports(actor, { status = 'open', limit = 50 } = {}) {
    const statuses = status === 'all' ? ['open', 'in_review', 'resolved', 'dismissed'] : status === 'open' ? ['open', 'in_review'] : [status];
    const r = await db.query(
      `select rep.*, m.status as message_status, p.ref as target_ref, p.pseudonym as target_pseudonym,
         (select count(*)::int from reports x where x.target_account_id = rep.target_account_id and x.id <> rep.id) as prior_reports
       from reports rep
       left join community_messages m on rep.target_type = 'message' and m.id::text = rep.target_id
       left join community_profiles p on p.account_id = rep.target_account_id
       where rep.status = any($1::text[]) and rep.target_type in ('message', 'member')
       order by rep.priority desc, rep.created_at asc limit $2`,
      [statuses, Math.min(Number(limit) || 50, 200)]
    );
    return r.rows.map((row) => ({ ...toReport(row), assignedToMe: row.assigned_to === actor.id }));
  }

  async function claim(actor, reportId) {
    const r = await db.query("update reports set status = 'in_review', assigned_to = $2 where id = $1 and status in ('open', 'in_review') returning id", [Number(reportId), actor.id]);
    if (!r.rowCount) fail(404, 'not_found');
    return { ok: true };
  }

  async function setMessageStatus(t, actor, messageId, status, reason, now, reportId) {
    const r = await t.query('select id, room_id, author_account_id, status from community_messages where id = $1 for update', [Number(messageId)]);
    const m = r.rows[0];
    if (!m) fail(404, 'not_found');
    if (status === 'removed') {
      await t.query("update community_messages set status = 'removed', removal_reason = $2, removed_by = $3 where id = $1", [m.id, reason || 'guidelines', actor.id]);
      await record(t, actor, { action: 'remove_message', messageId: m.id, targetAccountId: m.author_account_id, roomId: m.room_id, reason, reportId }, now);
      if (m.author_account_id) await notify(t, m.author_account_id, 'moderation_removed', { roomId: m.room_id, messageId: m.id, reason: reason || 'guidelines' }, `removed:${m.id}`);
    } else if (status === 'visible') {
      await t.query("update community_messages set status = 'visible', removal_reason = null, removed_by = null where id = $1", [m.id]);
      await record(t, actor, { action: m.status === 'held' ? 'approve_message' : 'restore_message', messageId: m.id, targetAccountId: m.author_account_id, roomId: m.room_id, reportId }, now);
    }
    return m;
  }

  async function removeMessage(actor, messageId, { reason, note } = {}) {
    const now = clock.now();
    const m = await db.tx(async (t) => {
      const row = await setMessageStatus(t, actor, messageId, 'removed', reason, now);
      // Open reports about this message are settled by the removal.
      await t.query("update reports set status = 'resolved', resolved_at = $2, resolved_by = $3, resolution = 'message_removed', resolution_note = $4 where target_type = 'message' and target_id = $1 and status in ('open', 'in_review')", [String(row.id), ts(now), actor.id, note || null]);
      return row;
    });
    bus.emit('message:update', { roomId: m.room_id, messageId: m.id });
    if (m.author_account_id) bus.emit('notification', { accountId: m.author_account_id });
    return { ok: true };
  }

  async function restoreMessage(actor, messageId) {
    const now = clock.now();
    const m = await db.tx((t) => setMessageStatus(t, actor, messageId, 'visible', null, now));
    bus.emit(m.status === 'held' ? 'message:new' : 'message:update', { roomId: m.room_id, messageId: m.id });
    return { ok: true };
  }

  async function suspend(actor, { memberRef, accountId, kind = 'temporary', hours = 24, reason, reportId }) {
    if (!['temporary', 'permanent'].includes(kind)) fail(400, 'bad_kind');
    if (!reason || String(reason).trim().length < 3) fail(400, 'reason_required');
    const h = Math.max(1, Math.min(Number(hours) || 24, 24 * 90));
    let target = accountId;
    if (!target) {
      const m = await accountForRef(db, memberRef);
      if (!m) fail(404, 'member_not_found');
      target = m.account_id;
    }
    if (target === actor.id) fail(400, 'cannot_suspend_self');
    const staff = await db.query('select roles from accounts where id = $1', [target]);
    if (seniorStaff(staff.rows[0]?.roles || []) && !seniorStaff(actor.roles)) fail(403, 'cannot_suspend_admin');
    const now = clock.now();
    const id = await db.tx(async (t) => {
      const r = await t.query("insert into suspensions (account_id, scope, kind, reason, starts_at, ends_at, created_by, created_at) values ($1, 'community', $2, $3, $4, $5, $6, $4) returning id", [
        target,
        kind,
        String(reason).slice(0, 500),
        ts(now),
        kind === 'temporary' ? ts(now + h * HOUR) : null,
        actor.id,
      ]);
      await record(t, actor, { action: kind === 'permanent' ? 'ban' : 'suspend', targetAccountId: target, reason, hours: kind === 'temporary' ? h : null, reportId }, now);
      await notify(t, target, 'moderation_suspended', { kind, until: kind === 'temporary' ? now + h * HOUR : null, suspensionId: r.rows[0].id }, `suspended:${r.rows[0].id}`);
      return r.rows[0].id;
    });
    bus.emit('notification', { accountId: target });
    bus.emit('suspended', { accountId: target });
    return { ok: true, suspensionId: id };
  }

  async function lift(actor, suspensionId, note) {
    const now = clock.now();
    const target = await db.tx(async (t) => {
      const r = await t.query('update suspensions set lifted_at = $2, lifted_by = $3 where id = $1 and lifted_at is null returning account_id', [Number(suspensionId), ts(now), actor.id]);
      if (!r.rowCount) fail(404, 'not_found');
      await record(t, actor, { action: 'lift_suspension', targetAccountId: r.rows[0].account_id, note }, now);
      await notify(t, r.rows[0].account_id, 'moderation_lifted', { suspensionId: Number(suspensionId) }, `lifted:${suspensionId}`);
      return r.rows[0].account_id;
    });
    bus.emit('notification', { accountId: target });
    return { ok: true };
  }

  /** Settles a report with one action: dismiss, remove the message, approve it, warn, suspend or ban. */
  async function resolve(actor, reportId, { action, hours, note, reason }) {
    const now = clock.now();
    const r = await db.query('select * from reports where id = $1', [Number(reportId)]);
    const rep = r.rows[0];
    if (!rep) fail(404, 'not_found');
    if (!['open', 'in_review'].includes(rep.status)) fail(409, 'already_resolved');
    if (action === 'remove_message') {
      if (rep.target_type !== 'message') fail(400, 'not_a_message');
      await removeMessage(actor, Number(rep.target_id), { reason: reason || rep.reason, note });
    } else if (action === 'approve_message') {
      if (rep.target_type !== 'message') fail(400, 'not_a_message');
      await restoreMessage(actor, Number(rep.target_id));
    } else if (action === 'suspend' || action === 'ban') {
      if (!rep.target_account_id) fail(409, 'account_gone');
      await suspend(actor, { accountId: rep.target_account_id, kind: action === 'ban' ? 'permanent' : 'temporary', hours, reason: reason || rep.reason, reportId: rep.id });
    } else if (action === 'warn') {
      if (!rep.target_account_id) fail(409, 'account_gone');
      await db.tx(async (t) => {
        await record(t, actor, { action: 'warn', targetAccountId: rep.target_account_id, reportId: rep.id, reason: reason || rep.reason, note }, now);
        await notify(t, rep.target_account_id, 'moderation_warning', { reason: reason || rep.reason }, `warn:${rep.id}`);
      });
      bus.emit('notification', { accountId: rep.target_account_id });
    } else if (action !== 'dismiss') {
      fail(400, 'bad_action');
    }
    await db.tx(async (t) => {
      await t.query("update reports set status = $2, resolved_at = $3, resolved_by = $4, resolution = $5, resolution_note = $6 where id = $1 and status in ('open', 'in_review')", [
        rep.id,
        action === 'dismiss' ? 'dismissed' : 'resolved',
        ts(now),
        actor.id,
        action,
        note ? String(note).slice(0, 1000) : null,
      ]);
      if (action === 'dismiss') await record(t, actor, { action: 'dismiss_report', reportId: rep.id, targetAccountId: rep.target_account_id, note }, now);
    });
    return { ok: true };
  }

  async function listAppeals(actor, { status = 'open' } = {}) {
    const r = await db.query(
      `select a.*, s.kind, s.reason as suspension_reason, s.ends_at, s.lifted_at, p.pseudonym, p.ref
       from appeals a left join suspensions s on s.id = a.suspension_id left join community_profiles p on p.account_id = a.account_id
       where a.status = $1 order by a.created_at asc limit 100`,
      [status]
    );
    return r.rows.map((a) => ({
      id: a.id,
      body: a.body,
      status: a.status,
      createdAt: ms(a.created_at),
      suspensionId: a.suspension_id,
      suspensionKind: a.kind,
      suspensionReason: a.suspension_reason,
      suspensionEndsAt: ms(a.ends_at),
      suspensionLifted: Boolean(a.lifted_at),
      pseudonym: a.pseudonym,
      memberRef: a.ref,
      decisionNote: a.decision_note,
    }));
  }

  async function decideAppeal(actor, appealId, { decision, note }) {
    if (!['upheld', 'overturned'].includes(decision)) fail(400, 'bad_decision');
    const now = clock.now();
    const target = await db.tx(async (t) => {
      // A review request is decided by someone other than the moderator who
      // issued the suspension (members are told "a different moderator will read it").
      const cur = await t.query("select a.status, s.created_by from appeals a left join suspensions s on s.id = a.suspension_id where a.id = $1 for update of a", [Number(appealId)]);
      if (!cur.rowCount || cur.rows[0].status !== 'open') fail(404, 'not_found');
      if (cur.rows[0].created_by && cur.rows[0].created_by === actor.id) fail(409, 'own_decision');
      const r = await t.query("update appeals set status = $2, decided_at = $3, decided_by = $4, decision_note = $5 where id = $1 and status = 'open' returning account_id, suspension_id", [Number(appealId), decision, ts(now), actor.id, note ? String(note).slice(0, 1000) : null]);
      if (!r.rowCount) fail(404, 'not_found');
      const { account_id: accountId, suspension_id: suspensionId } = r.rows[0];
      if (decision === 'overturned' && suspensionId) await t.query('update suspensions set lifted_at = $2, lifted_by = $3 where id = $1 and lifted_at is null', [suspensionId, ts(now), actor.id]);
      await record(t, actor, { action: decision === 'overturned' ? 'appeal_overturned' : 'appeal_upheld', targetAccountId: accountId, note }, now);
      await notify(t, accountId, 'moderation_appeal_decided', { decision, appealId: Number(appealId) }, `appeal:${appealId}`);
      return accountId;
    });
    bus.emit('notification', { accountId: target });
    return { ok: true };
  }

  async function history(actor, { memberRef, limit = 100 } = {}) {
    let target = null;
    if (memberRef) {
      const m = await accountForRef(db, memberRef);
      if (!m) fail(404, 'member_not_found');
      target = m.account_id;
    }
    const r = await db.query(
      `select a.*, coalesce(p.pseudonym, '') as target_pseudonym, coalesce(ap.pseudonym, '') as actor_pseudonym
       from moderation_actions a left join community_profiles p on p.account_id = a.target_account_id left join community_profiles ap on ap.account_id = a.actor_account_id
       where ($1::text is null or a.target_account_id = $1) order by a.created_at desc limit $2`,
      [target, Math.min(Number(limit) || 100, 500)]
    );
    const suspensions = target ? (await db.query('select id, kind, reason, starts_at, ends_at, lifted_at from suspensions where account_id = $1 order by starts_at desc', [target])).rows : [];
    return {
      actions: r.rows.map((a) => ({ id: a.id, action: a.action, actorKind: a.actor_kind, actorPseudonym: a.actor_pseudonym || null, targetPseudonym: a.target_pseudonym || null, messageId: a.target_message_id, reportId: a.report_id, reason: a.reason, note: a.note, hours: a.duration_hours, createdAt: ms(a.created_at) })),
      suspensions: suspensions.map((s) => ({ id: s.id, kind: s.kind, reason: s.reason, startsAt: ms(s.starts_at), endsAt: ms(s.ends_at), lifted: Boolean(s.lifted_at) })),
    };
  }

  async function pin(actor, roomId, messageId) {
    const now = clock.now();
    await db.tx(async (t) => {
      if (messageId) {
        const r = await t.query("select 1 from community_messages where id = $1 and room_id = $2 and status = 'visible'", [Number(messageId), roomId]);
        if (!r.rowCount) fail(404, 'not_found');
      }
      const u = await t.query('update community_rooms set pinned_message_id = $2 where id = $1', [roomId, messageId ? Number(messageId) : null]);
      if (!u.rowCount) fail(404, 'room_not_found');
      await record(t, actor, { action: messageId ? 'pin_message' : 'unpin_message', messageId: messageId ? Number(messageId) : null, roomId }, now);
    });
    bus.emit('room:update', { roomId });
    return { ok: true };
  }

  async function queueCounts() {
    const r = await db.query("select count(*) filter (where status in ('open', 'in_review'))::int as reports, count(*) filter (where status in ('open', 'in_review') and priority >= 3)::int as urgent from reports where target_type in ('message', 'member')");
    const a = await db.query("select count(*)::int as n from appeals where status = 'open'");
    return { openReports: r.rows[0].reports, urgentReports: r.rows[0].urgent, openAppeals: a.rows[0].n };
  }

  return { listReports, claim, removeMessage, restoreMessage, suspend, lift, resolve, listAppeals, decideAppeal, history, pin, queueCounts };
}
