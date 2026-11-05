// Entitlements are derived from verified orders, never stored as a loose flag.
//
// Recomputing from the order history every time keeps refunds/reversals exact:
// a reversed order simply stops contributing, and the Plus expiry shrinks by
// exactly that order's duration.

const DAY = 24 * 60 * 60 * 1000;

export function computeEntitlements(orders, now = Date.now()) {
  const approved = orders
    .filter((o) => o.status === 'approved' && o.approvedAt)
    .sort((a, b) => a.approvedAt - b.approvedAt);

  let plusExpiresAt = 0;
  let artProgram = null;

  for (const order of approved) {
    if (order.productKind === 'plus' && order.durationDays) {
      const base = Math.max(plusExpiresAt, order.approvedAt);
      plusExpiresAt = base + order.durationDays * DAY;
    }
    if (order.productKind === 'art' && !artProgram) {
      artProgram = { grantedAt: order.approvedAt, orderId: order.id };
    }
  }

  const plusActive = plusExpiresAt > now;
  return {
    plus: { active: plusActive, expiresAt: plusExpiresAt || null },
    artProgram: { active: Boolean(artProgram) || plusActive, owned: Boolean(artProgram), grantedAt: artProgram?.grantedAt ?? null },
    cards: { active: plusActive },
    tier: plusActive ? 'plus' : 'free',
  };
}

export function ordersForAccount(store, accountId) {
  return Object.values(store.orders).filter((o) => o.accountId === accountId);
}

export function entitlementsForAccount(store, accountId, now = Date.now()) {
  return computeEntitlements(ordersForAccount(store, accountId), now);
}
