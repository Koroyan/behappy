// Owner metrics: aggregate counts only. No message, journal or assessment
// content exists on the server, and this report never lists accounts, order
// ids or anything that identifies a person.

const DAY = 24 * 60 * 60 * 1000;

export function aggregateMetrics(store, now = Date.now()) {
  const accounts = Object.values(store.data.accounts || {});
  const orders = Object.values(store.data.orders || {});
  const today = new Date(now).toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const within = (t, ms) => typeof t === 'number' && now - t <= ms;

  const byStatus = {};
  const approvedByProduct = {};
  let approvedMinor = 0;
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (o.status === 'approved') {
      approvedByProduct[o.productId] = (approvedByProduct[o.productId] || 0) + 1;
      approvedMinor += o.amountMinor || 0;
    }
  }

  const usage = {};
  for (const u of Object.values(store.data.usage || {})) {
    for (const [key, n] of Object.entries(u.counters || {})) {
      const [name, period = ''] = key.split(':');
      const row = (usage[name] ||= { today: 0, thisMonth: 0 });
      if (period === today) row.today += n;
      if (period === month || period.startsWith(`${month}-`)) row.thisMonth += n;
    }
  }

  return {
    generatedAt: new Date(now).toISOString(),
    accounts: {
      total: accounts.length,
      new7d: accounts.filter((a) => within(a.createdAt, 7 * DAY)).length,
      new30d: accounts.filter((a) => within(a.createdAt, 30 * DAY)).length,
      active7d: accounts.filter((a) => within(a.lastSeenAt, 7 * DAY)).length,
      active30d: accounts.filter((a) => within(a.lastSeenAt, 30 * DAY)).length,
    },
    orders: { byStatus, approvedByProduct, approvedAmountMinor: approvedMinor, currency: 'GEL', mode: 'test' },
    usage,
    note: 'Counts only. Activity is approximate (last seen is updated at most hourly).',
  };
}
