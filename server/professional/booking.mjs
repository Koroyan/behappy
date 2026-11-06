// Client bookings with verified professionals. BeHappy takes no commission
// and does not collect the session fee: each booking records the
// professional's own price and payment arrangement, and payment_status can
// only say "not collected by BeHappy". Booking status, attendance and payment
// are separate fields; nothing is marked as happened by a button press alone
// (attendance is the professional's own record, shown as such).

import { newId } from '../auth.mjs';
import { ms, PG, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { ProError } from './profiles.mjs';
import { computeSlots, zonedParts } from './time.mjs';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ACTIVE = ['requested', 'confirmed'];

const fail = (status, code, extra) => {
  throw new ProError(status, code, extra);
};

export function createBooking({ db, clock = { now: () => Date.now() }, crypto, profiles, membership, emit = () => {} }) {
  async function clientProfile(q, accountId) {
    const r = await q.query('select display_name from client_profiles where account_id = $1', [accountId]);
    return r.rows[0]?.display_name || null;
  }

  async function setClientProfile(account, displayName) {
    if (!account.registered) fail(403, 'registration_required');
    const name = String(displayName || '').trim().slice(0, 60);
    if (!name) fail(400, 'name_required');
    await db.query('insert into client_profiles (account_id, display_name) values ($1, $2) on conflict (account_id) do update set display_name = excluded.display_name, updated_at = now()', [account.id, name]);
    return { displayName: name };
  }

  async function loadRulesAndBusy(q, p, from, to) {
    const [rules, exceptions, busy] = await Promise.all([
      q.query('select weekday, start_minute, end_minute from availability_rules where professional_id = $1', [p.id]),
      q.query('select day::text as day from availability_exceptions where professional_id = $1', [p.id]),
      q.query("select starts_at, ends_at from bookings where professional_id = $1 and status in ('requested', 'confirmed') and ends_at > $2 and starts_at < $3", [p.id, ts(from - DAY), ts(to + DAY)]),
    ]);
    return {
      rules: rules.rows.map((r) => ({ weekday: r.weekday, startMinute: r.start_minute, endMinute: r.end_minute })),
      exceptions: new Set(exceptions.rows.map((e) => e.day)),
      busy: busy.rows.map((b) => ({ start: ms(b.starts_at), end: ms(b.ends_at) })),
    };
  }

  async function slotsFor(q, p, service, from, to, now) {
    const { rules, exceptions, busy } = await loadRulesAndBusy(q, p, from, to);
    return computeSlots({ tz: p.timezone, rules, exceptions, busy, minutes: service.minutes, bufferMinutes: p.buffer_minutes, noticeHours: p.booking_notice_hours, from, to, now });
  }

  async function service(q, proId, serviceId) {
    const r = await q.query('select * from professional_services where id = $1 and professional_id = $2 and active', [serviceId, proId]);
    if (!r.rowCount) fail(404, 'service_not_found');
    return r.rows[0];
  }

  /** Bookable times for a listed professional (up to 28 days ahead). */
  async function slots(proId, serviceId, { from, days = 14 } = {}) {
    const now = clock.now();
    if (!(await profiles.isDiscoverable(db, proId, now))) fail(404, 'not_found');
    const p = await profiles.load(db, { id: proId });
    const s = await service(db, proId, serviceId);
    const start = Math.max(now, Number(from) || now);
    const end = start + Math.min(Math.max(Number(days) || 14, 1), 28) * DAY;
    const list = await slotsFor(db, p, s, start, end, now);
    return { timezone: p.timezone, minutes: s.minutes, slots: list };
  }

  const bookingDto = (b, viewerKind) => ({
    id: b.id,
    professionalId: b.professional_id,
    professionalName: b.pro_public_name || null,
    clientName: viewerKind === 'professional' ? b.client_display_name || 'Former client' : undefined,
    serviceTitle: b.service_title,
    mode: b.mode,
    startsAt: ms(b.starts_at),
    endsAt: ms(b.ends_at),
    status: b.status,
    attendance: b.attendance,
    paymentStatus: b.payment_status,
    priceMinor: b.price_minor,
    currency: b.currency,
    paymentArrangement: b.payment_arrangement,
    cancellationPolicy: b.cancellation_policy,
    cancellationNoticeHours: b.cancellation_notice_hours,
    lateCancellation: b.late_cancellation,
    cancelReason: b.cancel_reason,
    rescheduledFrom: b.rescheduled_from,
    createdAt: ms(b.created_at),
    confirmedAt: ms(b.confirmed_at),
    cancelledAt: ms(b.cancelled_at),
    inPersonAddress: b.status === 'confirmed' && b.mode === 'in_person' ? b.pro_address || null : null,
    clientNote: b.client_note_enc && viewerKind === 'professional' ? crypto.decryptText('messages', { ciphertext: b.client_note_enc, iv: b.client_note_iv, tag: b.client_note_tag }) : undefined,
  });

  const SELECT = `select b.*, p.public_name as pro_public_name, p.in_person_address as pro_address, p.account_id as pro_account_id
    from bookings b join professional_profiles p on p.id = b.professional_id`;

  async function event(q, bookingId, actorKind, ev, from, to, note) {
    await q.query('insert into booking_events (booking_id, actor_kind, event, from_status, to_status, note, created_at) values ($1, $2, $3, $4, $5, $6, $7)', [bookingId, actorKind, ev, from, to, note ? String(note).slice(0, 500) : null, ts(clock.now())]);
  }

  async function ensureThread(q, p, clientAccountId, clientName) {
    const r = await q.query(
      `insert into pro_threads (id, professional_id, client_account_id, client_display_name, created_at) values ($1, $2, $3, $4, $5)
       on conflict (professional_id, client_account_id) do update set client_display_name = excluded.client_display_name returning id`,
      [newId('th'), p.id, clientAccountId, clientName, ts(clock.now())]
    );
    return r.rows[0].id;
  }

  async function create(account, { professionalId, serviceId, startsAt, note, rescheduleOf } = {}) {
    if (!account.registered) fail(403, 'registration_required');
    const now = clock.now();
    const start = Number(startsAt);
    if (!Number.isFinite(start)) fail(400, 'bad_time');
    const result = await db.tx(async (t) => {
      const name = await clientProfile(t, account.id);
      if (!name) fail(403, 'client_profile_required');
      const p = await profiles.load(t, { id: professionalId }, { forUpdate: true });
      if (!p) fail(404, 'not_found');
      if (p.account_id === account.id) fail(400, 'cannot_book_self');
      if (!(await profiles.isDiscoverable(t, p.id, now))) fail(409, 'not_bookable');
      const s = await service(t, p.id, serviceId);
      const pending = await t.query("select count(*) filter (where professional_id = $2)::int as same, count(*)::int as total from bookings where client_account_id = $1 and status = 'requested' and starts_at > $3", [account.id, p.id, ts(now)]);
      if (pending.rows[0].same >= 3 || pending.rows[0].total >= 10) fail(429, 'too_many_requests');

      let old = null;
      if (rescheduleOf) {
        const r = await t.query(`${SELECT} where b.id = $1 and b.client_account_id = $2 for update of b`, [rescheduleOf, account.id]);
        old = r.rows[0];
        if (!old || !ACTIVE.includes(old.status) || old.professional_id !== p.id) fail(409, 'cannot_reschedule');
        if (ms(old.starts_at) <= now) fail(409, 'already_started');
        await t.query("update bookings set status = 'cancelled_by_client', cancel_reason = 'rescheduled', cancelled_at = $2, updated_at = $2 where id = $1", [old.id, ts(now)]);
        await event(t, old.id, 'client', 'rescheduled', old.status, 'cancelled_by_client');
      }

      // The time must be one of the bookable slots right now.
      const dayStart = start - DAY;
      const allowed = await slotsFor(t, p, s, Math.max(now, dayStart), start + DAY, now);
      if (!allowed.includes(start)) fail(409, 'slot_unavailable');

      const id = newId('bk');
      const status = p.auto_confirm ? 'confirmed' : 'requested';
      const enc = note ? crypto.encrypt('messages', String(note).trim().slice(0, 1000)) : null;
      try {
        await t.query(
          `insert into bookings (id, professional_id, client_account_id, client_display_name, service_id, service_title, mode, starts_at, ends_at, status,
             price_minor, currency, payment_arrangement, cancellation_policy, cancellation_notice_hours, client_note_enc, client_note_iv, client_note_tag,
             rescheduled_from, confirmed_at, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21)`,
          [
            id,
            p.id,
            account.id,
            name,
            s.id,
            s.title,
            s.mode,
            ts(start),
            ts(start + s.minutes * 60 * 1000),
            status,
            s.price_minor,
            s.currency,
            p.payment_arrangement,
            p.cancellation_policy,
            p.cancellation_notice_hours,
            enc?.ciphertext || null,
            enc?.iv || null,
            enc?.tag || null,
            old?.id || null,
            status === 'confirmed' ? ts(now) : null,
            ts(now),
          ]
        );
      } catch (e) {
        if (e.code === PG.EXCLUSION) fail(409, 'slot_unavailable');
        throw e;
      }
      await event(t, id, 'client', old ? 'rescheduled_request' : 'requested', null, status);
      await ensureThread(t, p, account.id, name);
      await profiles.bumpStat(t, p.id, 'booking_requests', now);
      await notify(t, p.account_id, status === 'confirmed' ? 'booking_confirmed_auto' : 'booking_requested', { bookingId: id, startsAt: start, clientName: name, rescheduled: Boolean(old) }, `booking:${id}:${status}`);
      if (status === 'confirmed') await notify(t, account.id, 'booking_confirmed', { bookingId: id, startsAt: start, professionalName: p.public_name }, `booking:${id}:confirmed`);
      return { id, proAccountId: p.account_id };
    });
    emit(result.proAccountId, 'notification:new', {});
    return get(account, result.id);
  }

  async function get(account, id) {
    const r = await db.query(`${SELECT} where b.id = $1`, [id]);
    const b = r.rows[0];
    if (!b) fail(404, 'not_found');
    if (b.client_account_id === account.id) return bookingDto(b, 'client');
    if (b.pro_account_id === account.id) return bookingDto(b, 'professional');
    fail(404, 'not_found');
  }

  async function listForClient(account) {
    const r = await db.query(`${SELECT} where b.client_account_id = $1 order by b.starts_at desc limit 200`, [account.id]);
    return r.rows.map((b) => bookingDto(b, 'client'));
  }

  async function listForProfessional(account, { scope = 'upcoming' } = {}) {
    const p = await profiles.load(db, { accountId: account.id });
    if (!p) fail(404, 'no_application');
    const now = ts(clock.now());
    const where = scope === 'past' ? 'b.ends_at <= $2' : scope === 'requests' ? "b.status = 'requested' and b.starts_at > $2" : "b.ends_at > $2 and b.status in ('requested', 'confirmed')";
    const r = await db.query(`${SELECT} where b.professional_id = $1 and ${where} order by b.starts_at ${scope === 'past' ? 'desc' : 'asc'} limit 200`, [p.id, now]);
    return r.rows.map((b) => bookingDto(b, 'professional'));
  }

  async function transition(account, id, action, { reason } = {}) {
    const now = clock.now();
    const out = await db.tx(async (t) => {
      const r = await t.query(`${SELECT} where b.id = $1 for update of b`, [id]);
      const b = r.rows[0];
      if (!b) fail(404, 'not_found');
      const asPro = b.pro_account_id === account.id;
      const asClient = b.client_account_id === account.id;
      if (!asPro && !asClient) fail(404, 'not_found');
      let next;
      let notifyAccount;
      let kind;
      const extra = {};
      if (action === 'confirm' || action === 'decline') {
        if (!asPro) fail(403, 'forbidden');
        if (b.status !== 'requested') fail(409, 'bad_transition');
        if (ms(b.starts_at) <= now) fail(409, 'already_started');
        next = action === 'confirm' ? 'confirmed' : 'declined';
        notifyAccount = b.client_account_id;
        kind = action === 'confirm' ? 'booking_confirmed' : 'booking_declined';
        if (action === 'confirm') extra.confirmed_at = ts(now);
        extra.decided_at = ts(now);
      } else if (action === 'cancel') {
        if (!ACTIVE.includes(b.status)) fail(409, 'bad_transition');
        if (ms(b.starts_at) <= now) fail(409, 'already_started');
        next = asPro ? 'cancelled_by_professional' : 'cancelled_by_client';
        notifyAccount = asPro ? b.client_account_id : b.pro_account_id;
        kind = 'booking_cancelled';
        extra.cancelled_at = ts(now);
        extra.cancel_reason = reason ? String(reason).slice(0, 300) : null;
        // Inside the published notice window it is recorded as late (no fee is charged by BeHappy).
        extra.late_cancellation = b.status === 'confirmed' && ms(b.starts_at) - now < b.cancellation_notice_hours * HOUR;
      } else fail(400, 'bad_action');
      const cols = Object.keys(extra);
      await t.query(`update bookings set status = $2, updated_at = $3${cols.map((c, i) => `, ${c} = $${i + 4}`).join('')} where id = $1`, [b.id, next, ts(now), ...cols.map((c) => extra[c])]);
      await event(t, b.id, asPro ? 'professional' : 'client', action, b.status, next, reason);
      if (notifyAccount) await notify(t, notifyAccount, kind, { bookingId: b.id, startsAt: ms(b.starts_at), by: asPro ? 'professional' : 'client', late: Boolean(extra.late_cancellation) }, `booking:${b.id}:${next}`);
      return notifyAccount;
    });
    if (out) emit(out, 'notification:new', {});
    return get(account, id);
  }

  async function markAttendance(account, id, attendance) {
    if (!['attended', 'client_no_show'].includes(attendance)) fail(400, 'bad_attendance');
    const now = clock.now();
    await db.tx(async (t) => {
      const r = await t.query(`${SELECT} where b.id = $1 for update of b`, [id]);
      const b = r.rows[0];
      if (!b || b.pro_account_id !== account.id) fail(404, 'not_found');
      if (b.status !== 'confirmed') fail(409, 'bad_transition');
      if (ms(b.starts_at) > now) fail(409, 'not_yet');
      await t.query('update bookings set attendance = $2, attendance_marked_at = $3, updated_at = $3 where id = $1', [b.id, attendance, ts(now)]);
      await event(t, b.id, 'professional', `attendance_${attendance}`, b.status, b.status);
    });
    return get(account, id);
  }

  /** Scheduler: expire stale requests, send 24-hour reminders. */
  async function runJobs(now = clock.now()) {
    const expired = await db.query(
      "update bookings set status = 'expired', updated_at = $1 where status = 'requested' and (starts_at <= $2 or created_at <= $3) returning id, client_account_id, starts_at",
      [ts(now), ts(now + HOUR), ts(now - 48 * HOUR)]
    );
    for (const b of expired.rows) {
      await event(db, b.id, 'system', 'expired', 'requested', 'expired');
      if (b.client_account_id) await notify(db, b.client_account_id, 'booking_expired', { bookingId: b.id, startsAt: ms(b.starts_at) }, `booking:${b.id}:expired`);
    }
    const soon = await db.query(`${SELECT} where b.status = 'confirmed' and b.starts_at > $1 and b.starts_at <= $2`, [ts(now), ts(now + 24 * HOUR)]);
    for (const b of soon.rows) {
      const data = { bookingId: b.id, startsAt: ms(b.starts_at), professionalName: b.pro_public_name, clientName: b.client_display_name };
      if (b.client_account_id) await notify(db, b.client_account_id, 'booking_reminder', data, `booking:${b.id}:reminder`);
      await notify(db, b.pro_account_id, 'booking_reminder', data, `booking:${b.id}:reminder`);
    }
    return { expired: expired.rowCount, reminders: soon.rowCount };
  }

  /** Today's and upcoming numbers for the professional dashboard (no revenue guesses). */
  async function dashboardCounts(p, now = clock.now()) {
    const local = zonedParts(now, p.timezone);
    void local;
    const r = await db.query(
      `select
         count(*) filter (where status = 'requested' and starts_at > $2)::int as requests,
         count(*) filter (where status = 'confirmed' and starts_at > $2)::int as upcoming,
         count(*) filter (where status = 'confirmed' and starts_at > $2 and starts_at <= $3)::int as next7,
         count(*) filter (where attendance = 'attended')::int as attended
       from bookings where professional_id = $1`,
      [p.id, ts(now), ts(now + 7 * DAY)]
    );
    return r.rows[0];
  }

  return { setClientProfile, clientProfile, slots, create, get, listForClient, listForProfessional, transition, markAttendance, runJobs, dashboardCounts, ensureThread };
}
