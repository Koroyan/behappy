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
const BASES = ['legal_obligation', 'vital_interests', 'user_request', 'legitimate_interest'];
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

  async function resourceExists(category, id) {
    if (category === 'private_messages') {
      const r = await db.query('select client_account_id from pro_threads where id = $1', [id]);
      return r.rows[0] ? { subject: r.rows[0].client_account_id } : null;
    }
    const r = await db.query('select client_account_id from bookings where id = $1', [id]);
    return r.rows[0] ? { subject: r.rows[0].client_account_id } : null;
  }

  async function request(actor, body) {
    await enabled();
    const category = String(body.category || '');
    if (!CATEGORIES.includes(category)) fail(400, 'bad_category');
    if (!BASES.includes(body.lawfulBasis)) fail(400, 'bad_basis');
    const purpose = String(body.purpose || '').trim();
    if (purpose.length < 30) fail(400, 'purpose_required');
    const ticket = String(body.ticketRef || '').trim();
    if (ticket.length < 3) fail(400, 'ticket_required');
    const resourceId = String(body.resourceId || '').trim().slice(0, 80);
    const found = await resourceExists(category, resourceId);
    if (!found) fail(404, 'not_found');
    const r = await db.query(
      'insert into sensitive_access_requests (requester_id, subject_account_id, category, resource_id, purpose, lawful_basis, ticket_ref, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *',
      [actor.id, found.subject, category, resourceId, purpose.slice(0, 2000), body.lawfulBasis, ticket.slice(0, 120), ts(clock.now())]
    );
    await audit(db, { actorId: actor.id, actorRole: role(actor), action: 'sensitive.requested', targetType: 'sensitive_request', targetId: r.rows[0].id, metadata: { category, lawfulBasis: body.lawfulBasis, ticketRef: ticket } });
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

  return { request, list, decide, revoke, view };
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
  app.use('/api/admin', r);
}
