// Promotions: launch offers, percentage or fixed-price campaigns, first-purchase
// discounts, promo codes, staff-managed campaigns.
//
// The one rule: no discount may take a product's modelled net contribution
// under the minimum (15 GEL per 30 days, server/finance/model.mjs) on any
// supported payment channel in the configured tax case. Every price is decided
// here, on the server, when the order is created; the app only shows it.
//   - a promotion that would go under the floor is reduced to the floor
//     (clamp_to_safe, the default) or refused;
//   - promotions combine only when every one of them is stackable, and the
//     combination is held to the same floor;
//   - the regular price shown as the reference is the catalog price that is
//     actually charged without a promotion — never an invented "was" price.

import crypto from 'node:crypto';

import { findProduct, getCatalog, getProfessionalCatalog } from './catalog.mjs';
import { ts } from './db/index.mjs';
import { assumptions, maxSafeDiscount } from './finance/model.mjs';

export class PromoError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const KINDS = new Set(['percent', 'fixed_price', 'amount_off']);
const CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function toPromotion(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    kind: r.kind,
    value: Number(r.value),
    productIds: r.product_ids || [],
    firstPurchaseOnly: Boolean(r.first_purchase_only),
    startsAt: r.starts_at ? new Date(r.starts_at).getTime() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).getTime() : null,
    maxRedemptions: r.max_redemptions === null || r.max_redemptions === undefined ? null : Number(r.max_redemptions),
    perAccountLimit: Number(r.per_account_limit ?? 1),
    stackable: Boolean(r.stackable),
    clampToSafe: r.clamp_to_safe !== false,
    active: Boolean(r.active),
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
  };
}

/** The finance assumptions the guard uses (tax case and CAC from config). */
export const guardAssumptions = (config = {}) => assumptions({ taxes: { invariantScenario: config.finance?.taxScenario || 'worst_case' }, cacGel: config.finance?.cacGel ?? null });

/** Lowest safe price (minor units) for a product, from the finance model. */
export function floorMinor(product, config = {}) {
  const A = guardAssumptions(config);
  return Math.round(maxSafeDiscount(product, { A, scenario: A.taxes.invariantScenario }).floorGel * 100);
}

/** Price after one promotion, before the floor. */
export function applyOne(listMinor, promo) {
  if (promo.kind === 'percent') return Math.round(listMinor * (1 - Math.min(100, promo.value) / 100));
  if (promo.kind === 'fixed_price') return Math.round(promo.value * 100);
  return listMinor - Math.round(promo.value * 100); // amount_off, in GEL
}

export function createPromotions({ db, config, clock = { now: () => Date.now() } }) {
  const productFor = (productId) => findProduct(config.catalog, productId) || findProduct(config.catalog, productId, { audience: 'professional', professional: config.professional });

  const live = (p, now) => p.active && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt > now);
  const appliesTo = (p, productId) => !p.productIds.length || p.productIds.includes(productId);

  async function redemptions(promotionId, accountId = null) {
    const r = await db.query(
      `select count(*)::int as n from orders where promotion_id = $1 and status in ('approved', 'processing', 'created')${accountId ? ' and account_id = $2' : ''}`,
      accountId ? [promotionId, accountId] : [promotionId]
    );
    return Number(r.rows[0].n);
  }

  async function eligible(p, { accountId, productId, now }) {
    if (!live(p, now) || !appliesTo(p, productId)) return false;
    if (p.maxRedemptions !== null && (await redemptions(p.id)) >= p.maxRedemptions) return false;
    if (accountId) {
      if ((await redemptions(p.id, accountId)) >= p.perAccountLimit) return false;
      if (p.firstPurchaseOnly) {
        const r = await db.query("select 1 from orders where account_id = $1 and status = 'approved' limit 1", [accountId]);
        if (r.rowCount) return false;
      }
    }
    return true;
  }

  async function list({ all = false } = {}) {
    const r = await db.query(`select * from promotions${all ? '' : ' where active'} order by created_at desc`);
    return r.rows.map(toPromotion);
  }

  /**
   * The price an account pays for a product now: the best automatic campaign
   * and/or a promo code, held to the safe floor. Never below the floor.
   */
  async function quote({ accountId = null, productId, code = null, now = clock.now() }) {
    const product = productFor(productId);
    if (!product) throw new PromoError(400, 'unknown_product');
    const listMinor = product.amountMinor;
    const floor = Math.min(listMinor, floorMinor(product, config));
    const all = await list();
    const autos = [];
    for (const p of all) if (!p.code && (await eligible(p, { accountId, productId, now }))) autos.push(p);
    let coded = null;
    if (code) {
      const c = String(code).trim().toUpperCase();
      coded = all.find((p) => p.code === c) || null;
      if (!coded || !(await eligible(coded, { accountId, productId, now }))) throw new PromoError(400, 'promo_not_valid');
    }
    // The best single offer, or a stack when every part allows stacking.
    const candidates = [...autos, ...(coded ? [coded] : [])];
    let best = { price: listMinor, applied: [] };
    for (const p of candidates) {
      const price = applyOne(listMinor, p);
      if (price < best.price) best = { price, applied: [p] };
    }
    const stack = candidates.filter((p) => p.stackable);
    if (stack.length > 1) {
      const price = stack.reduce((pr, p) => applyOne(pr, p), listMinor);
      if (price < best.price) best = { price, applied: stack };
    }
    if (coded && !best.applied.includes(coded)) {
      // A code the person typed that isn't better than what applies anyway: say so.
      return { product, listMinor, finalMinor: best.price < listMinor ? Math.max(best.price, floor) : listMinor, discountMinor: Math.max(0, listMinor - Math.max(best.price, floor)), promotion: best.applied[0] || null, clamped: best.price < floor, endsAt: best.applied[0]?.endsAt ?? null, codeNotBetter: true, floorMinor: floor };
    }
    let finalMinor = best.price;
    let clamped = false;
    if (finalMinor < floor) {
      // Every applied promotion must allow clamping; otherwise the offer isn't available.
      if (best.applied.some((p) => !p.clampToSafe)) {
        if (coded) throw new PromoError(409, 'promo_not_safe');
        finalMinor = listMinor;
        best.applied = [];
      } else {
        finalMinor = floor;
        clamped = true;
      }
    }
    if (finalMinor > listMinor) finalMinor = listMinor; // a "fixed price" above the list price is no offer
    const promotion = finalMinor < listMinor ? best.applied[0] || null : null;
    return { product, listMinor, finalMinor, discountMinor: listMinor - finalMinor, promotion, stackedIds: best.applied.length > 1 ? best.applied.map((p) => p.id) : undefined, clamped, endsAt: promotion?.endsAt ?? null, floorMinor: floor };
  }

  /** Staff create a promotion; it is checked against every product it applies to. */
  async function create(input, { staffId = null } = {}) {
    const kind = String(input.kind || '');
    const value = Number(input.value);
    if (!KINDS.has(kind) || !(value > 0) || (kind === 'percent' && value >= 100)) throw new PromoError(400, 'bad_promotion');
    const code = input.code ? String(input.code).trim().toUpperCase() : null;
    if (code && !CODE.test(code)) throw new PromoError(400, 'bad_code');
    const name = String(input.name || '').trim().slice(0, 80);
    if (!name) throw new PromoError(400, 'bad_name');
    const productIds = Array.isArray(input.productIds) ? input.productIds.map(String).filter((id) => productFor(id)) : [];
    const startsAt = input.startsAt ? Number(new Date(input.startsAt)) : null;
    const endsAt = input.endsAt ? Number(new Date(input.endsAt)) : null;
    if (endsAt && startsAt && endsAt <= startsAt) throw new PromoError(400, 'bad_dates');
    const clampToSafe = input.clampToSafe !== false;
    // Check now, so staff see what will really be charged.
    const products = productIds.length ? productIds.map(productFor) : [...getCatalog(config.catalog), ...getProfessionalCatalog(config.professional)];
    const preview = products.map((product) => {
      const raw = applyOne(product.amountMinor, { kind, value });
      const floor = Math.min(product.amountMinor, floorMinor(product, config));
      return { productId: product.id, listMinor: product.amountMinor, requestedMinor: raw, finalMinor: raw < floor ? (clampToSafe ? floor : null) : Math.min(raw, product.amountMinor), floorMinor: floor, safe: raw >= floor };
    });
    if (!clampToSafe && preview.some((p) => !p.safe)) throw Object.assign(new PromoError(409, 'promo_not_safe'), { preview });
    const id = `promo_${crypto.randomBytes(6).toString('hex')}`;
    try {
      await db.query(
        `insert into promotions (id, code, name, kind, value, product_ids, first_purchase_only, starts_at, ends_at, max_redemptions, per_account_limit, stackable, clamp_to_safe, active, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)`,
        [id, code, name, kind, value, productIds, Boolean(input.firstPurchaseOnly), ts(startsAt), ts(endsAt), input.maxRedemptions ? Number(input.maxRedemptions) : null, Number(input.perAccountLimit) || 1, Boolean(input.stackable), clampToSafe, staffId]
      );
    } catch (e) {
      if (String(e.code) === '23505') throw new PromoError(409, 'code_taken');
      throw e;
    }
    return { promotion: toPromotion((await db.query('select * from promotions where id = $1', [id])).rows[0]), preview };
  }

  async function setActive(id, active) {
    const r = await db.query('update promotions set active = $2, updated_at = now() where id = $1 returning *', [id, Boolean(active)]);
    if (!r.rowCount) throw new PromoError(404, 'not_found');
    return toPromotion(r.rows[0]);
  }

  /** Public offers for the pricing page: per product, the automatic offer that applies to anyone. */
  async function offers(now = clock.now()) {
    const out = {};
    for (const product of [...getCatalog(config.catalog), ...getProfessionalCatalog(config.professional)]) {
      const q = await quote({ productId: product.id, now }).catch(() => null);
      if (q && q.finalMinor < q.listMinor) out[product.id] = { listMinor: q.listMinor, finalMinor: q.finalMinor, savingMinor: q.discountMinor, endsAt: q.endsAt, name: q.promotion?.name || null, firstPurchaseOnly: Boolean(q.promotion?.firstPurchaseOnly) };
    }
    return out;
  }

  return { list, quote, create, setActive, offers };
}
