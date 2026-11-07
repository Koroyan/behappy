// Safety cases. Every urgent report (possible risk to someone's life or
// safety, from a member, the automatic check, or a "safety" support request)
// becomes a case that a person takes, notes, escalates and closes. The person
// at risk always sees emergency resources immediately in the app,
// automatically; this queue is for follow-up during staffed hours and does
// not promise round-the-clock human intervention.
//
// Staff notes are encrypted at rest. No diagnosis or label about anyone's
// mental health is recorded: outcomes are operational (resources shared,
// referred to emergency services, no risk found, duplicate, other).

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { permissionsFor, primaryRole } from './permissions.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const RESOLUTIONS = ['resources_shared', 'no_risk_found', 'referred_to_emergency', 'duplicate', 'other'];
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

export function createSafety(deps) {
  const { db, clock } = deps;
  const crypto = deps.crypto;
  const role = (a) => primaryRole(a.roles) || 'admin';

  /** Opens a case for every urgent report that doesn't have one yet (idempotent). */
  async function sync() {
    const r = await db.query(
      `insert into safety_incidents (report_id, source, room_id, subject_account_id, priority, created_at, updated_at)
       select r.id, case when r.reporter_kind = 'system' then 'automatic' else 'report' end, r.room_id, r.target_account_id, r.priority, r.created_at, r.created_at
       from reports r where r.priority >= 3 and not exists (select 1 from safety_incidents s where s.report_id = r.id)
       on conflict (report_id) do nothing`
    );
    return r.rowCount;
  }

  async function openFromSupport(q, { accountId, ticketId }) {
    const r = await q.query("insert into safety_incidents (source, subject_account_id, priority, created_at, updated_at) values ('support', $1, 3, $2, $2) returning id", [accountId, ts(clock.now())]);
    await audit(q, { actorRole: 'system', action: 'safety.case_opened', targetType: 'safety_incident', targetId: r.rows[0].id, metadata: { source: 'support', ticketId } });
    return r.rows[0].id;
  }

  const seal = (text) => crypto.encrypt('messages', text);
  const open = (n) => (n.body_ciphertext ? crypto.decryptText('messages', { ciphertext: n.body_ciphertext, iv: n.body_iv, tag: n.body_tag }) : null);

  async function list(query) {
    await sync();
    const params = [];
    const where = [];
    if (query.status === 'active') where.push("i.status in ('open', 'in_progress', 'escalated')");
    else if (query.status) {
      params.push(String(query.status));
      where.push(`i.status = $${params.length}`);
    }
    const r = await db.query(
      `select i.*, r.reason, r.reporter_kind, r.snapshot, a.email as assignee_email
       from safety_incidents i left join reports r on r.id = i.report_id left join accounts a on a.id = i.assigned_to
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by case i.status when 'escalated' then 0 when 'open' then 1 when 'in_progress' then 2 else 3 end, i.created_at asc limit 200`,
      params
    );
    const counts = await db.query('select status, count(*)::int as n from safety_incidents group by status');
    return {
      incidents: r.rows.map((i) => ({
        id: Number(i.id),
        source: i.source,
        status: i.status,
        priority: i.priority,
        reason: i.reason || (i.source === 'support' ? 'support_request' : null),
        roomId: i.room_id,
        snippet: i.snapshot?.body ? String(i.snapshot.body).slice(0, 140) : null,
        assignedTo: i.assigned_to ? { id: i.assigned_to, email: i.assignee_email } : null,
        createdAt: ms(i.created_at),
        updatedAt: ms(i.updated_at),
        resolvedAt: ms(i.resolved_at),
        resolution: i.resolution,
      })),
      counts: Object.fromEntries(counts.rows.map((c) => [c.status, c.n])),
      staffedHoursOnly: true,
    };
  }

  async function detail(actor, id) {
    const r = await db.query(
      `select i.*, r.reason, r.details, r.snapshot, r.reporter_kind, r.status as report_status, p.pseudonym
       from safety_incidents i left join reports r on r.id = i.report_id left join community_profiles p on p.account_id = i.subject_account_id where i.id = $1`,
      [Number(id)]
    );
    const i = r.rows[0];
    if (!i) fail(404, 'not_found');
    const notes = await db.query('select n.*, a.email from safety_incident_notes n left join accounts a on a.id = n.author_id where n.incident_id = $1 order by n.id', [i.id]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'safety.case_viewed', targetType: 'safety_incident', targetId: i.id });
    return {
      incident: {
        id: Number(i.id),
        source: i.source,
        status: i.status,
        priority: i.priority,
        roomId: i.room_id,
        reportId: i.report_id ? Number(i.report_id) : null,
        reportStatus: i.report_status || null,
        reason: i.reason || null,
        reporter: i.reporter_kind || null,
        // What was reported (the same snapshot moderators see in the report queue).
        reported: i.snapshot?.body ? { body: i.snapshot.body, pseudonym: i.snapshot.pseudonym || null } : null,
        details: i.details || null,
        member: i.pseudonym ? { pseudonym: i.pseudonym } : null,
        subjectAccountId: i.subject_account_id,
        assignedTo: i.assigned_to,
        resolution: i.resolution,
        createdAt: ms(i.created_at),
        resolvedAt: ms(i.resolved_at),
      },
      notes: notes.rows.map((n) => ({ id: Number(n.id), kind: n.kind, author: n.author_id ? { id: n.author_id, email: n.email } : null, body: open(n), at: ms(n.created_at) })),
    };
  }

  async function act(actor, id, fn) {
    return db.tx(async (t) => {
      const r = await t.query('select * from safety_incidents where id = $1 for update', [Number(id)]);
      const i = r.rows[0];
      if (!i) fail(404, 'not_found');
      return fn(t, i);
    });
  }

  const addNoteRow = async (t, incidentId, actor, kind, body) => {
    const enc = body ? seal(body) : null;
    await t.query('insert into safety_incident_notes (incident_id, author_id, kind, body_ciphertext, body_iv, body_tag, created_at) values ($1, $2, $3, $4, $5, $6, $7)', [incidentId, actor.id, kind, enc?.ciphertext || null, enc?.iv || null, enc?.tag || null, ts(clock.now())]);
  };
  const note = (v, min) => {
    const s = String(v || '').trim();
    if (s.length < min) fail(400, 'note_required');
    return s.slice(0, 2000);
  };

  async function assign(actor, id, { assigneeId }) {
    const target = assigneeId || actor.id;
    const a = await db.query('select id, roles, staff_suspended_at from accounts where id = $1', [target]);
    if (!a.rows[0] || a.rows[0].staff_suspended_at || !permissionsFor(a.rows[0].roles).has('safety.manage')) fail(400, 'bad_assignee');
    return act(actor, id, async (t, i) => {
      if (i.status === 'resolved') fail(409, 'resolved');
      await t.query("update safety_incidents set assigned_to = $2, status = case when status = 'open' then 'in_progress' else status end, updated_at = $3 where id = $1", [i.id, target, ts(clock.now())]);
      await addNoteRow(t, i.id, actor, 'assigned', null);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'safety.case_assigned', targetType: 'safety_incident', targetId: i.id, metadata: { assignee: target } });
      return { ok: true };
    });
  }

  async function addNote(actor, id, { body }) {
    const text = note(body, 3);
    return act(actor, id, async (t, i) => {
      await addNoteRow(t, i.id, actor, 'note', text);
      await t.query('update safety_incidents set updated_at = $2 where id = $1', [i.id, ts(clock.now())]);
      return { ok: true };
    });
  }

  async function escalate(actor, id, { body }) {
    const text = note(body, 10);
    return act(actor, id, async (t, i) => {
      if (i.status === 'resolved') fail(409, 'resolved');
      await t.query("update safety_incidents set status = 'escalated', updated_at = $2 where id = $1", [i.id, ts(clock.now())]);
      await addNoteRow(t, i.id, actor, 'escalated', text);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'safety.case_escalated', targetType: 'safety_incident', targetId: i.id });
      return { ok: true };
    });
  }

  async function resolve(actor, id, { resolution, body }) {
    if (!RESOLUTIONS.includes(resolution)) fail(400, 'bad_resolution');
    const text = resolution === 'other' ? note(body, 10) : String(body || '').trim().slice(0, 2000);
    return act(actor, id, async (t, i) => {
      if (i.status === 'resolved') fail(409, 'resolved');
      const now = ts(clock.now());
      await t.query("update safety_incidents set status = 'resolved', resolution = $2, resolved_at = $3, updated_at = $3 where id = $1", [i.id, resolution, now]);
      await addNoteRow(t, i.id, actor, 'resolved', text || null);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'safety.case_resolved', targetType: 'safety_incident', targetId: i.id, metadata: { resolution } });
      return { ok: true };
    });
  }

  async function reopen(actor, id, { body }) {
    const text = note(body, 5);
    return act(actor, id, async (t, i) => {
      if (i.status !== 'resolved') fail(409, 'not_resolved');
      await t.query("update safety_incidents set status = 'open', resolution = null, resolved_at = null, updated_at = $2 where id = $1", [i.id, ts(clock.now())]);
      await addNoteRow(t, i.id, actor, 'reopened', text);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'safety.case_reopened', targetType: 'safety_incident', targetId: i.id });
      return { ok: true };
    });
  }

  return { sync, openFromSupport, list, detail, assign, addNote, escalate, resolve, reopen };
}

export function safetyFor(deps) {
  deps.safety ||= createSafety(deps);
  return deps.safety;
}

export function mountSafety(app, deps) {
  const s = safetyFor(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '16kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/safety/incidents', ...can('safety.view'), handle((req) => s.list(req.query)));
  r.get('/safety/incidents/:id', ...can('safety.view'), handle((req) => s.detail(req.account, req.params.id)));
  r.post('/safety/incidents/:id/assign', ...can('safety.manage'), handle((req) => s.assign(req.account, req.params.id, req.body || {})));
  r.post('/safety/incidents/:id/notes', ...can('safety.manage'), handle((req) => s.addNote(req.account, req.params.id, req.body || {})));
  r.post('/safety/incidents/:id/escalate', ...can('safety.manage'), handle((req) => s.escalate(req.account, req.params.id, req.body || {})));
  r.post('/safety/incidents/:id/resolve', ...can('safety.manage'), handle((req) => s.resolve(req.account, req.params.id, req.body || {})));
  r.post('/safety/incidents/:id/reopen', ...can('safety.manage'), handle((req) => s.reopen(req.account, req.params.id, req.body || {})));
  app.use('/api/admin', r);
}
