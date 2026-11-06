// BeHappy Professional membership: one fixed fee per period, 0% commission.
//
//  - The free trial starts when verification is approved (not while the
//    application waits), once per person: keyed by HMACs of the verified
//    phone, licence/registration numbers and email.
//  - Paid periods come only from verified Flitt payments (payments.mjs calls
//    the fulfilment hooks inside the payment transaction). A renewal starts
//    where the current period ends, so nothing is lost by renewing early.
//  - A refund (reversal) revokes the period it paid for.
//  - Prepaid passes, manual renewal: nothing renews or charges by itself.
//  - Expiry hides the profile from the directory and stops new bookings and
//    new inquiries; confirmed appointments, their messages and all records stay.

import { audit } from '../audit.mjs';
import { getProfessionalCatalog } from '../catalog.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { createCheckout, publicOrder, registerFulfillment } from '../payments.mjs';
import { ProError } from './profiles.mjs';

const DAY = 24 * 60 * 60 * 1000;
const PENDING_VERIFICATION = new Set(['draft', 'submitted', 'under_review', 'more_info_required']);

const normalizeLicense = (n) => String(n || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

export function createMembership({ db, config, clock = { now: () => Date.now() }, crypto, flitt }) {
  const pro = () => ({ trialDays: 14, durationDays: 30, amountMinor: 7900, currency: 'GEL', graceDays: 0, ...(config.professional || {}) });

  async function periods(q, proId) {
    const r = await q.query('select * from professional_memberships where professional_id = $1 order by starts_at', [proId]);
    return r.rows.map((m) => ({ id: m.id, kind: m.kind, startsAt: ms(m.starts_at), endsAt: ms(m.ends_at), orderId: m.order_id, revokedAt: ms(m.revoked_at), revokeReason: m.revoke_reason }));
  }

  /** The membership state shown to the professional and used everywhere else. */
  async function state(q, p, now = clock.now()) {
    const list = await periods(q, p.id);
    const live = list.filter((m) => !m.revokedAt);
    const current = live.find((m) => m.startsAt <= now && m.endsAt > now) || null;
    const lastEnd = live.reduce((max, m) => Math.max(max, m.endsAt), 0);
    const trialUsed = list.some((m) => m.kind === 'trial');
    const daysLeft = current ? Math.max(0, Math.ceil((lastEnd - now) / DAY)) : 0;
    const graceUntil = !current && lastEnd && pro().graceDays ? lastEnd + pro().graceDays * DAY : null;
    let s;
    if (PENDING_VERIFICATION.has(p.status)) s = 'verification_pending';
    else if (p.status === 'rejected') s = 'rejected';
    else if (p.status === 'suspended') s = 'suspended';
    else if (p.status === 'expired' || (p.verification_expires_at && ms(p.verification_expires_at) <= now)) s = 'verification_expired';
    else if (current) {
      if (p.membership_cancelled_at) s = 'cancelled';
      else if (lastEnd - now <= 7 * DAY) s = 'renewal_due';
      else s = current.kind === 'trial' ? 'trial_active' : 'active';
    } else if (graceUntil && graceUntil > now) s = 'grace';
    else {
      const failed = await q.query(
        "select 1 from orders where professional_id = $1 and created_at > $2 and (status in ('declined', 'error') or (attempt_declined and status not in ('approved', 'reversed', 'partially_reversed'))) limit 1",
        [p.id, ts(now - 7 * DAY)]
      );
      s = failed.rowCount ? 'payment_failed' : 'expired';
    }
    return {
      state: s,
      active: Boolean(current) || s === 'grace',
      current: current ? { kind: current.kind, startsAt: current.startsAt, endsAt: current.endsAt } : null,
      endsAt: lastEnd || null,
      daysLeft,
      graceUntil,
      trialUsed,
      periods: list,
      product: getProfessionalCatalog(pro())[0],
      remindersEnabled: p.reminders_enabled,
      cancelledAt: ms(p.membership_cancelled_at),
    };
  }

  async function trialKeys(q, p) {
    const keys = [{ kind: 'account', value: `account:${p.account_id}` }];
    if (p.phone_e164 && p.phone_verified_at) keys.push({ kind: 'phone', value: `phone:${p.phone_e164}` });
    if (p.contact_email) keys.push({ kind: 'email', value: `email:${String(p.contact_email).toLowerCase()}` });
    const quals = await q.query("select number from professional_qualifications where professional_id = $1 and kind in ('license', 'registration') and number is not null", [p.id]);
    for (const { number } of quals.rows) if (normalizeLicense(number).length >= 4) keys.push({ kind: 'license', value: `license:${normalizeLicense(number)}` });
    return keys.map((k) => ({ ...k, hash: crypto.hmac(k.value) }));
  }

  /** Called inside the approval transaction. Grants the trial at most once per person. */
  async function grantTrialOnApproval(t, p, now) {
    const days = pro().trialDays;
    if (!days) return { granted: false, reason: 'no_trial_configured' };
    const existing = await t.query("select 1 from professional_memberships where professional_id = $1 and kind = 'trial'", [p.id]);
    if (existing.rowCount) return { granted: false, reason: 'already_had_trial' };
    const keys = await trialKeys(t, p);
    const used = await t.query('select kind from trial_grants where key_hash = any($1::text[])', [keys.map((k) => k.hash)]);
    if (used.rowCount) {
      await t.query("insert into verification_events (professional_id, from_status, to_status, actor_kind, message, created_at) values ($1, 'approved', 'approved', 'system', $2, $3)", [p.id, 'trial_not_granted', ts(now)]);
      return { granted: false, reason: 'trial_used_before' };
    }
    await t.query("insert into professional_memberships (professional_id, kind, starts_at, ends_at) values ($1, 'trial', $2, $3)", [p.id, ts(now), ts(now + days * DAY)]);
    for (const k of keys) await t.query('insert into trial_grants (key_hash, professional_id, kind) values ($1, $2, $3) on conflict do nothing', [k.hash, p.id, k.kind]);
    await notify(t, p.account_id, 'membership_trial_started', { endsAt: now + days * DAY, days }, `trial:${p.id}`);
    return { granted: true, endsAt: now + days * DAY };
  }

  // Paid periods are created only here, from a verified payment, inside the
  // payment transaction. The unique order_id makes a duplicate callback a no-op.
  registerFulfillment('professional', {
    async approve(t, order, now) {
      if (!order.professionalId) return;
      const last = await t.query('select max(ends_at) as e from professional_memberships where professional_id = $1 and revoked_at is null', [order.professionalId]);
      const start = Math.max(now, ms(last.rows[0].e) || 0);
      const days = order.durationDays || 30;
      await t.query("insert into professional_memberships (professional_id, kind, starts_at, ends_at, order_id) values ($1, 'paid', $2, $3, $4) on conflict (order_id) do nothing", [order.professionalId, ts(start), ts(start + days * DAY), order.id]);
      await t.query('update professional_profiles set membership_cancelled_at = null where id = $1', [order.professionalId]);
      const p = await t.query('select account_id from professional_profiles where id = $1', [order.professionalId]);
      if (p.rows[0]) await notify(t, p.rows[0].account_id, 'membership_activated', { endsAt: start + days * DAY, orderId: order.id }, `paid:${order.id}`);
    },
    async reverse(t, order, now) {
      await t.query("update professional_memberships set revoked_at = $2, revoke_reason = 'refund' where order_id = $1 and revoked_at is null", [order.id, ts(now)]);
      const p = await t.query('select account_id from professional_profiles where id = $1', [order.professionalId]);
      if (p.rows[0]) await notify(t, p.rows[0].account_id, 'membership_refunded', { orderId: order.id }, `refund:${order.id}`);
    },
  });

  async function ownProfile(account) {
    const r = await db.query('select * from professional_profiles where account_id = $1', [account.id]);
    if (!r.rows[0]) throw new ProError(404, 'no_application');
    return r.rows[0];
  }

  async function overview(account) {
    const p = await ownProfile(account);
    const s = await state(db, p);
    const orders = await db.query('select * from orders where professional_id = $1 order by created_at desc limit 50', [p.id]);
    const { toOrder } = await import('../orders.mjs');
    return { ...s, orders: orders.rows.map((o) => publicOrder(toOrder(o))) };
  }

  /** Membership checkout. Only verified professionals can pay: money never buys verification. */
  async function checkout(account, { returnUrl, lang, apiBase }) {
    const p = await ownProfile(account);
    const s = await state(db, p);
    if (['verification_pending', 'rejected', 'suspended', 'verification_expired'].includes(s.state)) throw new ProError(409, 'verification_required', { state: s.state });
    // Don't sell more than about a year ahead.
    if (s.endsAt && s.endsAt - clock.now() > 330 * DAY) throw new ProError(409, 'far_enough_ahead');
    return createCheckout({ db, config, flitt, accountId: account.id, productId: 'professional_30d', lang, returnUrl, professionalId: p.id, now: clock.now(), audience: 'professional', apiBase });
  }

  async function setCancelled(account, cancelled) {
    const p = await ownProfile(account);
    await db.query('update professional_profiles set membership_cancelled_at = $2, updated_at = $3 where id = $1', [p.id, cancelled ? ts(clock.now()) : null, ts(clock.now())]);
    await audit(db, { actorId: account.id, actorRole: 'professional', action: cancelled ? 'membership.cancelled' : 'membership.resumed', targetType: 'professional', targetId: p.id });
    return overview(account);
  }

  async function receipt(account, orderId) {
    const p = await ownProfile(account);
    const r = await db.query("select * from orders where id = $1 and professional_id = $2 and status in ('approved', 'reversed', 'partially_reversed')", [orderId, p.id]);
    const o = r.rows[0];
    if (!o) throw new ProError(404, 'not_found');
    const period = await db.query('select starts_at, ends_at, revoked_at from professional_memberships where order_id = $1', [o.id]);
    return {
      receiptNumber: `BH-${o.id.slice(3).toUpperCase()}`,
      mode: 'test',
      seller: 'BeHappy',
      buyer: p.legal_name || p.public_name,
      product: 'BeHappy Professional',
      durationDays: o.duration_days,
      amountMinor: o.amount_minor,
      currency: o.currency,
      status: o.status,
      paidAt: ms(o.approved_at),
      reversedAt: ms(o.reversed_at),
      maskedCard: o.masked_card,
      period: period.rows[0] ? { startsAt: ms(period.rows[0].starts_at), endsAt: ms(period.rows[0].ends_at), revoked: Boolean(period.rows[0].revoked_at) } : null,
      commissionPercent: 0,
      note: 'TEST payment in the Flitt sandbox. No real money was charged.',
    };
  }

  /** Admin: a complimentary period (audited), e.g. for support cases. */
  async function grant(admin, proId, days, reason) {
    const n = Math.max(1, Math.min(Number(days) || 0, 365));
    const now = clock.now();
    await db.tx(async (t) => {
      const last = await t.query('select max(ends_at) as e from professional_memberships where professional_id = $1 and revoked_at is null', [proId]);
      const start = Math.max(now, ms(last.rows[0].e) || 0);
      await t.query("insert into professional_memberships (professional_id, kind, starts_at, ends_at) values ($1, 'grant', $2, $3)", [proId, ts(start), ts(start + n * DAY)]);
      await audit(t, { actorId: admin.id, actorRole: 'admin', action: 'membership.granted', targetType: 'professional', targetId: proId, metadata: { days: n, reason: String(reason || '').slice(0, 200) } });
    });
    return { ok: true };
  }

  return { state, periods, grantTrialOnApproval, overview, checkout, setCancelled, receipt, grant };
}
