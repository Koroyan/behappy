// Periodic jobs. Each job is idempotent (notifications carry a ref key), so
// running twice, or after a restart, never sends anything twice.
//
//  - bookings: expire stale requests, 24-hour reminders
//  - memberships: reminders 7/3/1 days before the end (optional; the
//    professional can turn them off) and the expiry notice (always)
//  - verification: expires at its review date; the profile leaves the directory
//  - safety: urgent reports open safety cases; country policies are reloaded
//  - retention: response-chain owners after 31 days, used codes after 7 days,
//    resolved report snapshots after 180 days, raw analytics events after
//    analytics.retentionDays (daily totals after 760 days), security events
//    after 400 days

import { safetyFor } from './admin/safety.mjs';
import { analyticsFor } from './analytics/index.mjs';
import { ms, ts } from './db/index.mjs';
import { notify } from './notify/notifications.mjs';
import { professionalsFor } from './professional/index.mjs';

const DAY = 24 * 60 * 60 * 1000;

export async function runAllJobs(deps, now = deps.clock.now()) {
  const { db } = deps;
  const pro = professionalsFor(deps);
  const out = { bookings: await pro.booking.runJobs(now), reminders: 0, expiredNotices: 0, verificationExpired: 0, cleaned: 0 };

  const ending = await db.query(
    `select p.id, p.account_id, p.reminders_enabled, p.membership_cancelled_at, max(m.ends_at) as ends
     from professional_profiles p join professional_memberships m on m.professional_id = p.id and m.revoked_at is null
     where p.status = 'approved'
     group by p.id having max(m.ends_at) > $1 and max(m.ends_at) <= $2`,
    [ts(now - DAY), ts(now + 7 * DAY)]
  );
  for (const row of ending.rows) {
    const end = ms(row.ends);
    if (end > now) {
      if (!row.reminders_enabled || row.membership_cancelled_at) continue;
      const left = Math.ceil((end - now) / DAY);
      const bucket = left <= 1 ? 1 : left <= 3 ? 3 : 7;
      if (await notify(db, row.account_id, 'membership_reminder', { endsAt: end, daysLeft: bucket }, `${end}:${bucket}`)) out.reminders += 1;
    } else if (await notify(db, row.account_id, 'membership_expired', { endedAt: end }, `${end}:expired`)) {
      out.expiredNotices += 1;
    }
  }

  const expired = await db.query("update professional_profiles set status = 'expired', published = false, updated_at = $1 where status = 'approved' and verification_expires_at <= $1 returning id, account_id", [ts(now)]);
  for (const p of expired.rows) {
    await db.query("insert into verification_events (professional_id, from_status, to_status, actor_kind, message, created_at) values ($1, 'approved', 'expired', 'system', 'verification_period_ended', $2)", [p.id, ts(now)]);
    await notify(db, p.account_id, 'pro_verification', { status: 'expired' }, `verification:${p.id}:expired:${now}`);
    out.verificationExpired += 1;
  }

  const c1 = await db.query('delete from ai_response_owners where created_at < $1', [ts(now - 31 * DAY)]);
  const c2 = await db.query('delete from verification_codes where created_at < $1', [ts(now - 7 * DAY)]);
  const c3 = await db.query("update reports set snapshot = '{}'::jsonb where status in ('resolved', 'dismissed') and resolved_at < $1 and snapshot <> '{}'::jsonb", [ts(now - 180 * DAY)]);
  // Urgent reports become safety cases even when nobody has opened the queue;
  // reviewed country policies are re-read (other server instances may have changed them).
  out.safetyCasesOpened = await safetyFor(deps).sync();
  if (deps.prosAdmin) await deps.prosAdmin.reloadPolicies();
  const c4 = await analyticsFor(deps).cleanup(now);
  const c5 = await db.query('delete from auth_events where created_at < $1', [ts(now - 400 * DAY)]);
  out.cleaned = c1.rowCount + c2.rowCount + c3.rowCount + c4 + c5.rowCount;
  deps.lastSchedulerRun = { at: now, ...out };
  return out;
}

/** Background service: every few minutes (SCHEDULER_INTERVAL_SECONDS, default 300). */
export async function startScheduler({ deps }) {
  const seconds = Number(process.env.SCHEDULER_INTERVAL_SECONDS || 300);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runAllJobs(deps);
    } catch (e) {
      console.error('[scheduler] run failed', e?.message);
    } finally {
      running = false;
    }
  };
  const first = setTimeout(tick, 5000);
  const timer = setInterval(tick, Math.max(30, seconds) * 1000);
  timer.unref?.();
  first.unref?.();
  return {
    stop: async () => {
      clearTimeout(first);
      clearInterval(timer);
    },
  };
}
