// Entitlements are derived from verified orders, never stored as a loose flag.
//
// Recomputing from the order history every time keeps refunds/reversals exact:
// a reversed order simply stops contributing, and the Plus expiry shrinks by
// exactly that order's duration. Complimentary days granted by staff stack the
// same way but are never payments. Professional memberships are separate
// (professional/membership.mjs) and never unlock consumer features.

import { ordersForAccount } from './orders.mjs';

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

export { ordersForAccount };

/** Complimentary Plus days from staff (entitlement_grants): stacked like a purchase, never revenue. */
export async function grantsForAccount(db, accountId) {
  const r = await db.query('select id, days, starts_at from entitlement_grants where account_id = $1 and revoked_at is null', [accountId]);
  return r.rows.map((g) => ({ id: `grant_${g.id}`, status: 'approved', approvedAt: new Date(g.starts_at).getTime(), productKind: 'plus', durationDays: g.days, complimentary: true }));
}

export async function entitlementsForAccount(db, accountId, now = Date.now()) {
  const orders = await ordersForAccount(db, accountId);
  const grants = await grantsForAccount(db, accountId);
  return computeEntitlements([...orders, ...grants], now);
}
