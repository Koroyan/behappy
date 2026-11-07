// Appointments in the staff tools: find a booking, see its history, and
// cancel it for BeHappy when something is wrong (for example a professional
// suspended for misconduct). Session notes and private messages are never
// shown here. A confirmed appointment is never changed silently: a
// cancellation always tells both people why.

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { primaryRole } from './permissions.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

const dto = (b) => ({
  id: b.id,
  status: b.status,
  attendance: b.attendance,
  startsAt: ms(b.starts_at),
  endsAt: ms(b.ends_at),
  mode: b.mode,
  serviceTitle: b.service_title,
  priceMinor: b.price_minor,
  currency: b.currency,
  paymentStatus: b.payment_status,
  professional: { id: b.professional_id, publicName: b.public_name },
  client: { displayName: b.client_display_name, accountId: b.client_account_id || null, deleted: !b.client_account_id },
  hasClientNote: Boolean(b.client_note_enc),
  lateCancellation: b.late_cancellation,
  cancelReason: b.cancel_reason,
  rescheduledFrom: b.rescheduled_from,
  createdAt: ms(b.created_at),
  updatedAt: ms(b.updated_at),
});

export function createAppointmentsAdmin(deps) {
  const { db, clock } = deps;

  async function list(query) {
    const params = [];
    const where = [];
    const add = (sql, v) => {
      params.push(v);
      where.push(sql.split('?').join(`$${params.length}`));
    };
    if (query.status) add('b.status = ?', String(query.status));
    if (query.professional) add('b.professional_id = ?', String(query.professional));
    if (query.client) add('b.client_account_id = ?', String(query.client));
    if (Number(query.from) > 0) add('b.starts_at >= ?', ts(Number(query.from)));
    if (Number(query.to) > 0) add('b.starts_at < ?', ts(Number(query.to)));
    if (query.q) {
      const q = String(query.q).trim().slice(0, 80);
      params.push(q, `%${q.split('%').join('')}%`);
      where.push(`(b.id = $${params.length - 1} or p.public_name ilike $${params.length} or b.client_display_name ilike $${params.length})`);
    }
    const r = await db.query(
      `select b.*, p.public_name from bookings b join professional_profiles p on p.id = b.professional_id
       ${where.length ? `where ${where.join(' and ')}` : ''} order by b.starts_at desc limit 300`,
      params
    );
    const counts = await db.query('select status, count(*)::int as n from bookings group by status');
    return { appointments: r.rows.map(dto), byStatus: Object.fromEntries(counts.rows.map((c) => [c.status, c.n])) };
  }

  async function detail(id) {
    const r = await db.query('select b.*, p.public_name, p.account_id as pro_account_id from bookings b join professional_profiles p on p.id = b.professional_id where b.id = $1', [id]);
    if (!r.rows[0]) fail(404, 'not_found');
    const events = await db.query('select actor_kind, event, from_status, to_status, created_at from booking_events where booking_id = $1 order by id', [id]);
    const audits = await db.query("select action, actor_role, metadata, created_at from audit_log where target_type = 'booking' and target_id = $1 order by id", [id]);
    return {
      appointment: dto(r.rows[0]),
      // The client's note and any messages stay private between the two people.
      history: events.rows.map((e) => ({ actor: e.actor_kind, event: e.event, from: e.from_status, to: e.to_status, at: ms(e.created_at) })),
      staffActions: audits.rows.map((a) => ({ action: a.action, actorRole: a.actor_role, reason: a.metadata?.reason || null, at: ms(a.created_at) })),
    };
  }

  async function cancel(actor, id, { reason, messageToClient, messageToProfessional }) {
    const why = String(reason || '').trim();
    if (why.length < 10) fail(400, 'reason_required');
    const now = clock.now();
    const out = await db.tx(async (t) => {
      const r = await t.query('select b.*, p.account_id as pro_account_id, p.public_name from bookings b join professional_profiles p on p.id = b.professional_id where b.id = $1 for update of b', [id]);
      const b = r.rows[0];
      if (!b) fail(404, 'not_found');
      if (!['requested', 'confirmed'].includes(b.status)) fail(409, 'not_active', { status: b.status });
      if (ms(b.ends_at) <= now) fail(409, 'already_past');
      if (b.pro_account_id === actor.id || b.client_account_id === actor.id) fail(403, 'not_on_yourself');
      await t.query("update bookings set status = 'cancelled_by_admin', cancelled_at = $2, cancel_reason = $3, updated_at = $2 where id = $1", [id, ts(now), why.slice(0, 500)]);
      await t.query("insert into booking_events (booking_id, actor_kind, event, from_status, to_status, note, created_at) values ($1, 'admin', 'cancelled', $2, 'cancelled_by_admin', null, $3)", [id, b.status, ts(now)]);
      await audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: 'booking.cancelled_by_staff', targetType: 'booking', targetId: id, metadata: { reason: why.slice(0, 500), from: b.status } });
      const data = { bookingId: id, startsAt: ms(b.starts_at), professionalName: b.public_name };
      const told = [];
      if (b.client_account_id) {
        await notify(t, b.client_account_id, 'booking_cancelled_by_admin', { ...data, message: messageToClient ? String(messageToClient).slice(0, 300) : null }, `booking:${id}:admin_cancel`);
        told.push(b.client_account_id);
      }
      await notify(t, b.pro_account_id, 'booking_cancelled_by_admin', { ...data, message: messageToProfessional ? String(messageToProfessional).slice(0, 300) : null }, `booking:${id}:admin_cancel`);
      told.push(b.pro_account_id);
      return told;
    });
    for (const accountId of out) {
      deps.realtime?.toUser(accountId, 'notification:new', {});
      deps.realtime?.toUser(accountId, 'booking:update', { bookingId: id });
    }
    return { ok: true, status: 'cancelled_by_admin', notified: out.length };
  }

  return { list, detail, cancel };
}

export function mountAppointmentsAdmin(app, deps) {
  const a = createAppointmentsAdmin(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '16kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/appointments', ...can('appointments.view'), handle((req) => a.list(req.query)));
  r.get('/appointments/:id', ...can('appointments.view'), handle((req) => a.detail(req.params.id)));
  r.post('/appointments/:id/cancel', ...can('appointments.manage'), handle((req) => a.cancel(req.account, req.params.id, req.body || {})));
  app.use('/api/admin', r);
}
