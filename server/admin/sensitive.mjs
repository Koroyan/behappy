// Governed access to protected data, for rare cases such as a legal
// obligation or a risk to someone's life. It is not a way to browse people's
// data and there is no "read all" permission.
//
//  - Off unless the owner enables features.sensitiveAccess.
//  - One request = one item (one private conversation, or one booking's
//    note), with a written purpose, a lawful basis and a ticket reference.
//  - Someone else (sensitive.approve, the owner by default) approves or
//    refuses; never the requester.
//  - Approval is time-limited (at most 24 hours) and only the requester can
//    open the item; every view is logged. Revocable at any time.
//
// Journals, Anulia conversations, assessments and safety plans are stored on
// people's devices, not on the server, so no request can reach them.

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { primaryRole } from './permissions.mjs';
import { settingsFor } from './settings.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const HOUR = 60 * 60 * 1000;
const CATEGORIES = ['private_messages', 'booking_notes'];
// Each lawful basis needs a real, open case of a matching kind about the
// person concerned. A generic "legitimate interest" is not accepted for
// confidential health-related messages.
const CASE_FOR_BASIS = { legal_obligation: 'legal_case', vital_interests: 'safety_case', user_request: 'support_ticket' };
const BASES = Object.keys(CASE_FOR_BASIS);
const MAX_OPEN_PER_REQUESTER = 2;
const MAX_PER_30_DAYS = 5;
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

const dto = (r) => ({
  id: Number(r.id),
  requesterId: r.requester_id,
  subjectAccountId: r.subject_account_id,
  category: r.category,
  resourceId: r.resource_id,
  purpose: r.purpose,
  lawfulBasis: r.lawful_basis,
  ticketRef: r.ticket_ref,
  caseType: r.case_type || null,
  caseId: r.case_id || null,
  evidenceReference: r.evidence_reference || null,
  status: r.status,
  decidedBy: r.decided_by,
  decidedAt: ms(r.decided_at),
  decisionNote: r.decision_note,
  expiresAt: ms(r.expires_at),
  views: r.views,
  createdAt: ms(r.created_at),
});

export function createSensitive(deps) {
  const { db, clock } = deps;
  const settings = settingsFor(deps);
  const role = (a) => primaryRole(a.roles) || 'admin';

  async function enabled() {
    if (!(await settings.get('features.sensitiveAccess'))) fail(403, 'feature_disabled');
  }

  /** The item and the two people it belongs to (client and professional). */
  async function resourceExists(category, id) {
    const r =
      category === 'private_messages'
        ? await db.query('select t.client_account_id, p.account_id as pro_account_id from pro_threads t join professional_profiles p on p.id = t.professional_id where t.id = $1', [id])
        : await db.query('select b.client_account_id, p.account_id as pro_account_id from bookings b join professional_profiles p on p.id = b.professional_id where b.id = $1', [id]);
    const row = r.rows[0];
    return row ? { subject: row.client_account_id, parties: [row.client_account_id, row.pro_account_id].filter(Boolean) } : null;
  }

  /** The cited case must exist, be open, and concern one of the people the item belongs to. */
  async function caseFor(caseType, caseId) {
    if (caseType === 'legal_case') {
      const r = await db.query('select id, reference, authority, evidence_reference, subject_account_id, status from legal_cases where id = $1', [Number(caseId) || 0]);
      const c = r.rows[0];
      return c ? { open: c.status === 'open', subject: c.subject_account_id, evidence: `${c.authority} · ${c.reference} · ${c.evidence_reference}` } : null;
    }
    if (caseType === 'safety_case') {
      const r = await db.query('select id, status, subject_account_id from safety_incidents where id = $1', [Number(caseId) || 0]);
      const c = r.rows[0];
      return c ? { open: c.status !== 'resolved', subject: c.subject_account_id, evidence: `safety case ${c.id}` } : null;
    }
    const r = await db.query('select id, status, account_id, category from support_tickets where id = $1', [String(caseId || '')]);
    const c = r.rows[0];
    return c ? { open: !['resolved', 'closed'].includes(c.status), subject: c.account_id, evidence: `support request ${c.id} (${c.category})` } : null;
  }

  async function request(actor, body) {
    await enabled();
    const category = String(body.category || '');
    if (!CATEGORIES.includes(category)) fail(400, 'bad_category');
    if (!BASES.includes(body.lawfulBasis)) fail(400, 'bad_basis');
    const purpose = String(body.purpose || '').trim();
    if (purpose.length < 30) fail(400, 'purpose_required');
    const caseType = CASE_FOR_BASIS[body.lawfulBasis];
    const caseId = String(body.caseId || body.ticketRef || '').trim().slice(0, 80);
    if (!caseId) fail(400, 'case_required');
    const resourceId = String(body.resourceId || '').trim().slice(0, 80);
    const found = await resourceExists(category, resourceId);
    if (!found) fail(404, 'not_found');
    const kase = await caseFor(caseType, caseId);
    if (!kase) fail(400, 'case_not_found', { caseType });
    if (!kase.open) fail(409, 'case_closed');
    // The case must be about someone this item belongs to (a legal case may name no account).
    if (caseType !== 'legal_case' || kase.subject) {
      if (!kase.subject || !found.parties.includes(kase.subject)) fail(409, 'case_scope_mismatch');
    }
    // No bulk browsing: few open requests per person, and one per item at a time.
    const now = clock.now();
    const mine = await db.query(
      "select count(*) filter (where status in ('requested', 'approved') and (expires_at is null or expires_at > $2))::int as open, count(*) filter (where created_at > $3)::int as recent, count(*) filter (where status in ('requested', 'approved') and resource_id = $4 and (expires_at is null or expires_at > $2))::int as same from sensitive_access_requests where requester_id = $1",
      [actor.id, ts(now), ts(now - 30 * 24 * HOUR), resourceId]
    );
    if (mine.rows[0].same) fail(409, 'already_requested');
    if (mine.rows[0].open >= MAX_OPEN_PER_REQUESTER || mine.rows[0].recent >= MAX_PER_30_DAYS) fail(429, 'too_many_requests');
    const r = await db.query(
      'insert into sensitive_access_requests (requester_id, subject_account_id, category, resource_id, purpose, lawful_basis, ticket_ref, case_type, case_id, evidence_reference, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *',
      [actor.id, found.subject, category, resourceId, purpose.slice(0, 2000), body.lawfulBasis, caseId, caseType, caseId, kase.evidence.slice(0, 300), ts(now)]
    );
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'sensitive.requested', targetType: 'sensitive_request', targetId: r.rows[0].id, metadata: { category, lawfulBasis: body.lawfulBasis, caseType, caseId } });
    return { request: dto(r.rows[0]) };
  }

  async function list(actor) {
    const on = Boolean(await settings.get('features.sensitiveAccess'));
    await db.query("update sensitive_access_requests set status = 'expired' where status = 'approved' and expires_at <= $1", [ts(clock.now())]);
    const r = await db.query('select * from sensitive_access_requests order by id desc limit 200');
    return { enabled: on, requests: r.rows.map(dto), mine: actor.id };
  }

  async function decide(actor, id, { approve, note, hours }) {
    await enabled();
    const why = String(note || '').trim();
    if (why.length < 10) fail(400, 'note_required');
    const h = Math.max(1, Math.min(Number(hours) || 4, 24));
    const out = await db.tx(async (t) => {
      const r = await t.query('select * from sensitive_access_requests where id = $1 for update', [Number(id)]);
      const q = r.rows[0];
      if (!q) fail(404, 'not_found');
      if (q.status !== 'requested') fail(409, 'already_decided');
      if (q.requester_id === actor.id) fail(403, 'cannot_approve_own_request');
      const now = clock.now();
      const u = await t.query('update sensitive_access_requests set status = $2, decided_by = $3, decided_at = $4, decision_note = $5, expires_at = $6 where id = $1 returning *', [
        q.id,
        approve ? 'approved' : 'denied',
        actor.id,
        ts(now),
        why.slice(0, 1000),
        approve ? ts(now + h * HOUR) : null,
      ]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: approve ? 'sensitive.approved' : 'sensitive.denied', targetType: 'sensitive_request', targetId: q.id, metadata: { hours: approve ? h : null } });
      return dto(u.rows[0]);
    });
    return { request: out };
  }

  async function revoke(actor, id, note) {
    const r = await db.query("update sensitive_access_requests set status = 'revoked', decision_note = coalesce(decision_note, '') || $2 where id = $1 and status in ('requested', 'approved') returning id", [Number(id), ` | revoked: ${String(note || '').slice(0, 300)}`]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'sensitive.revoked', targetType: 'sensitive_request', targetId: Number(id) });
    return { ok: true };
  }

  /** Opens the one approved item, for the requester only, while the approval lasts. */
  async function view(actor, id) {
    await enabled();
    const r = await db.query('select * from sensitive_access_requests where id = $1', [Number(id)]);
    const q = r.rows[0];
    if (!q) fail(404, 'not_found');
    if (q.requester_id !== actor.id) fail(403, 'not_your_request');
    if (q.status !== 'approved' || !q.expires_at || ms(q.expires_at) <= clock.now()) fail(403, 'not_approved');
    // Access ends when the reason ends: a closed case closes the request.
    if (q.case_type) {
      const kase = await caseFor(q.case_type, q.case_id);
      if (!kase || !kase.open) {
        await db.query("update sensitive_access_requests set status = 'revoked', decision_note = coalesce(decision_note, '') || ' | revoked: the case was closed' where id = $1", [q.id]);
        await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'sensitive.revoked_case_closed', targetType: 'sensitive_request', targetId: q.id });
        fail(403, 'case_closed');
      }
    }
    let data;
    if (q.category === 'private_messages') {
      const m = await db.query('select id, sender_kind, ciphertext, iv, tag, created_at from pro_messages where thread_id = $1 order by id', [q.resource_id]);
      data = { messages: m.rows.map((x) => ({ id: Number(x.id), from: x.sender_kind, body: deps.crypto.decryptText('messages', { ciphertext: x.ciphertext, iv: x.iv, tag: x.tag }), at: ms(x.created_at) })) };
    } else {
      const b = await db.query('select client_note_enc, client_note_iv, client_note_tag from bookings where id = $1', [q.resource_id]);
      const x = b.rows[0];
      data = { note: x?.client_note_enc ? deps.crypto.decryptText('messages', { ciphertext: x.client_note_enc, iv: x.client_note_iv, tag: x.client_note_tag }) : null };
    }
    await db.query('update sensitive_access_requests set views = views + 1 where id = $1', [q.id]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'sensitive.viewed', targetType: 'sensitive_request', targetId: q.id, metadata: { category: q.category, resourceId: q.resource_id } });
    return { request: dto(q), data, expiresAt: ms(q.expires_at) };
  }

  // ---------- Legal cases (recorded by an owner, with evidence) ----------
  async function addLegalCase(actor, body) {
    await enabled();
    const reference = String(body.reference || '').trim();
    const authority = String(body.authority || '').trim();
    const evidence = String(body.evidenceReference || '').trim();
    const received = Number(body.receivedAt) || Date.parse(String(body.receivedAt || ''));
    if (reference.length < 3 || authority.length < 3 || evidence.length < 5 || !Number.isFinite(received)) fail(400, 'case_details_required');
    let subject = null;
    if (body.subjectAccountId) {
      const a = await db.query('select id from accounts where id = $1', [String(body.subjectAccountId)]);
      if (!a.rows[0]) fail(404, 'account_not_found');
      subject = a.rows[0].id;
    }
    const r = await db.query('insert into legal_cases (reference, authority, received_at, subject_account_id, evidence_reference, recorded_by) values ($1, $2, $3, $4, $5, $6) returning id', [reference.slice(0, 120), authority.slice(0, 120), ts(received), subject, evidence.slice(0, 300), actor.id]);
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'legal_case.recorded', targetType: 'legal_case', targetId: r.rows[0].id, metadata: { authority: authority.slice(0, 120) } });
    return { id: Number(r.rows[0].id) };
  }

  async function legalCases() {
    const r = await db.query('select * from legal_cases order by id desc limit 100');
    return { cases: r.rows.map((c) => ({ id: Number(c.id), reference: c.reference, authority: c.authority, receivedAt: ms(c.received_at), subjectAccountId: c.subject_account_id, evidenceReference: c.evidence_reference, status: c.status, createdAt: ms(c.created_at), closedAt: ms(c.closed_at) })) };
  }

  async function closeLegalCase(actor, id) {
    const r = await db.query("update legal_cases set status = 'closed', closed_at = $2 where id = $1 and status = 'open' returning id", [Number(id), ts(clock.now())]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'legal_case.closed', targetType: 'legal_case', targetId: Number(id) });
    return { ok: true };
  }

  return { request, list, decide, revoke, view, addLegalCase, legalCases, closeLegalCase };
}

export function mountSensitive(app, deps) {
  const s = createSensitive(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '16kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/sensitive/requests', ...can('sensitive.request'), handle((req) => s.list(req.account)));
  r.post('/sensitive/requests', ...can('sensitive.request'), handle((req) => s.request(req.account, req.body || {})));
  r.post('/sensitive/requests/:id/decide', ...can('sensitive.approve'), handle((req) => s.decide(req.account, req.params.id, req.body || {})));
  r.post('/sensitive/requests/:id/revoke', ...can('sensitive.request'), handle((req) => s.revoke(req.account, req.params.id, req.body?.note)));
  r.get('/sensitive/requests/:id/view', ...can('sensitive.request'), handle((req) => s.view(req.account, req.params.id)));
  r.get('/sensitive/legal-cases', ...can('sensitive.request'), handle(() => s.legalCases()));
  r.post('/sensitive/legal-cases', ...can('sensitive.approve'), handle((req) => s.addLegalCase(req.account, req.body || {})));
  r.post('/sensitive/legal-cases/:id/close', ...can('sensitive.approve'), handle((req) => s.closeLegalCase(req.account, req.params.id)));
  app.use('/api/admin', r);
}
