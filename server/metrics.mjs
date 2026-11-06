// Owner metrics: aggregate counts only. No message, journal or assessment
// content exists on the server, and this report never lists accounts, order
// ids or anything that identifies a person.

import { ts } from './db/index.mjs';

const DAY = 24 * 60 * 60 * 1000;

export async function aggregateMetrics(db, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const a = (
    await db.query(
      `select count(*)::int as total,
         count(*) filter (where created_at > $1)::int as new7d,
         count(*) filter (where created_at > $2)::int as new30d,
         count(*) filter (where last_seen_at > $1)::int as active7d,
         count(*) filter (where last_seen_at > $2)::int as active30d,
         count(*) filter (where email_verified_at is not null and password_hash is not null)::int as registered
       from accounts`,
      [ts(now - 7 * DAY), ts(now - 30 * DAY)]
    )
  ).rows[0];

  const byStatus = {};
  for (const r of (await db.query('select status, count(*)::int as n from orders group by status')).rows) byStatus[r.status] = r.n;
  const approvedByProduct = {};
  for (const r of (await db.query("select product_id, count(*)::int as n from orders where status = 'approved' group by product_id")).rows) approvedByProduct[r.product_id] = r.n;
  const approvedMinor = (await db.query("select coalesce(sum(amount_minor), 0)::int as n from orders where status = 'approved'")).rows[0].n;

  const usage = {};
  const u = await db.query(
    `select name,
       coalesce(sum(count) filter (where period = $1), 0)::int as today,
       coalesce(sum(count) filter (where period = $2 or period like $2 || '-%'), 0)::int as this_month
     from usage_counters group by name`,
    [today, month]
  );
  for (const r of u.rows) usage[r.name] = { today: r.today, thisMonth: r.this_month };

  return {
    generatedAt: new Date(now).toISOString(),
    accounts: { total: a.total, new7d: a.new7d, new30d: a.new30d, active7d: a.active7d, active30d: a.active30d, registered: a.registered },
    orders: { byStatus, approvedByProduct, approvedAmountMinor: approvedMinor, currency: 'GEL', mode: 'test' },
    usage,
    note: 'Counts only. Activity is approximate (last seen is updated at most hourly).',
  };
}
