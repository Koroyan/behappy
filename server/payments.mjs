// Order lifecycle and payment verification.
//
// Trust rules (see docs/BEHAPPY_3_SECURITY.md):
//  1. Only the server creates orders, and only from the server-side catalog.
//  2. An order becomes "approved" only from a Flitt payload that (a) carries a
//     valid signature made with the merchant secret, or (b) came back from our
//     own signed server-to-server status request to Flitt.
//  3. merchant_id, amount and currency must match the stored order exactly.
//  4. Each (order, payment, status) event is applied once (replay protection),
//     and status can't move backwards (approved can only become reversed).
//  5. Browser redirects, URL flags and client messages never change an order.
//  6. Every update runs in one transaction with the order row locked, so a
//     duplicate callback arriving at the same moment can't apply twice.

import crypto from 'node:crypto';

import { durationMs, findProduct, orderDescription } from './catalog.mjs';
import { ts } from './db/index.mjs';
import { FINAL_STATUSES, KNOWN_STATUSES, verifySignature } from './flitt.mjs';
import { getOrder } from './orders.mjs';

const ALLOWED_TRANSITIONS = {
  created: new Set(['processing', 'approved', 'declined', 'expired']),
  processing: new Set(['approved', 'declined', 'expired']),
  declined: new Set(['approved']), // money can still move on a retried attempt of the same order
  expired: new Set(['approved']),
  approved: new Set(['reversed', 'partially_reversed']),
  partially_reversed: new Set(['reversed']),
  reversed: new Set(),
  error: new Set(),
};

export const isFinal = (status) => FINAL_STATUSES.has(status) || status === 'error' || status === 'partially_reversed';

/**
 * Side effects of a confirmed payment, per product kind. Consumer kinds
 * (plus, art) have none: their entitlements are recomputed from orders. The
 * professional membership registers handlers that add or revoke a paid period
 * inside the same transaction as the status change.
 */
const FULFILLMENT = new Map();
export function registerFulfillment(kind, handlers) {
  FULFILLMENT.set(kind, handlers);
}

export function newOrderId() {
  return `bh-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    productId: order.productId,
    productKind: order.productKind,
    durationDays: order.durationDays,
    amountMinor: order.amountMinor,
    currency: order.currency,
    status: order.status,
    mode: order.mode,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    approvedAt: order.approvedAt ?? null,
    reversedAt: order.reversedAt ?? null,
    maskedCard: order.maskedCard ?? null,
    errorReason: order.errorReason ?? null,
    // Flitt keeps an order open ("processing") after a declined attempt so the
    // payer can retry; the decline is visible only in the attempt's response code.
    attemptDeclined: Boolean(order.attemptDeclined) && !['approved', 'reversed', 'partially_reversed'].includes(order.status),
    declineReason: order.attemptDeclined ? order.lastResponseDescription ?? null : null,
  };
}

const historyEntry = (at, status, via, note) => JSON.stringify([{ at, status, via, ...(note ? { note } : {}) }]);

/**
 * Creates a pending order and a Flitt hosted checkout for it.
 * `returnUrl` must already be validated by the caller. `professionalId` ties a
 * membership order to a professional profile (checked by the caller).
 */
export async function createCheckout({ db, config, flitt, accountId, productId, lang, returnUrl, professionalId = null, now = Date.now(), audience = 'consumer' }) {
  const product = findProduct(config.catalog, productId, { audience, professional: config.professional });
  if (!product) {
    const err = new Error('Unknown product');
    err.status = 400;
    throw err;
  }

  const recent = await db.query("select count(*)::int as n from orders where account_id = $1 and created_at > $2", [accountId, ts(now - 60 * 60 * 1000)]);
  if (recent.rows[0].n >= 10) {
    const err = new Error('Too many checkout attempts. Please try again later.');
    err.status = 429;
    throw err;
  }

  const orderId = newOrderId();
  await db.query(
    `insert into orders (id, account_id, professional_id, product_id, product_kind, duration_days, amount_minor, currency, mode, status, created_at, updated_at, return_url, history)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'test', 'created', $9, $9, $10, $11::jsonb)`,
    [orderId, accountId, professionalId, product.id, product.kind, product.durationDays, product.amountMinor, product.currency, ts(now), returnUrl, historyEntry(now, 'created', 'server')]
  );

  try {
    const response = await flitt.createCheckout({
      orderId,
      amountMinor: product.amountMinor,
      currency: product.currency,
      description: orderDescription(product),
      responseUrl: `${config.publicApiUrl}/api/payments/flitt/return?orderId=${encodeURIComponent(orderId)}`,
      callbackUrl: `${config.publicApiUrl}/api/payments/flitt/callback`,
      lifetimeSeconds: config.flitt.orderLifetimeSeconds,
      lang: ['ka', 'en', 'ru', 'uk', 'pl', 'de', 'fr', 'es', 'it', 'az'].includes(lang) ? lang : 'en',
      productId: product.id,
    });
    await db.query('update orders set checkout_url = $2, payment_id = $3, updated_at = $4 where id = $1', [
      orderId,
      response.checkout_url,
      response.payment_id ? String(response.payment_id) : null,
      ts(Date.now()),
    ]);
    return { order: await getOrder(db, orderId), checkoutUrl: response.checkout_url, product };
  } catch (error) {
    await db.query("update orders set status = 'error', error_reason = 'checkout_create_failed', updated_at = $2, history = history || $3::jsonb where id = $1", [
      orderId,
      ts(Date.now()),
      historyEntry(Date.now(), 'error', 'server', String(error.message).slice(0, 200)),
    ]);
    const err = new Error('The payment provider could not create a checkout. Please try again.');
    err.status = 502;
    err.cause = error;
    throw err;
  }
}

/**
 * Applies a Flitt payload to an order after verifying it.
 * via: 'callback' | 'return' | 'status'
 * Returns { ok, order, changed, duplicate, reason }.
 */
export async function applyFlittUpdate({ db, config, payload, via, trustedChannel = false, now = Date.now() }) {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'empty_payload' };
  const orderId = String(payload.order_id || '');

  return db.tx(async (t) => {
    const order = await getOrder(t, orderId, { forUpdate: true });
    if (!order) return { ok: false, reason: 'unknown_order' };

    // Signature: mandatory for anything that arrived from outside (callback,
    // browser return). The status response comes from our own signed request,
    // and is verified inside FlittClient when Flitt includes a signature.
    if (!trustedChannel && !verifySignature(config.flitt.secretKey, payload)) {
      return { ok: false, order, reason: 'bad_signature' };
    }
    if (Number(payload.merchant_id) !== Number(config.flitt.merchantId)) {
      return { ok: false, order, reason: 'merchant_mismatch' };
    }
    const status = String(payload.order_status || '').toLowerCase();
    if (!KNOWN_STATUSES.has(status)) return { ok: false, order, reason: 'unknown_status' };

    // Amount and currency must match what we priced server-side.
    const amount = Number(payload.amount);
    const currency = String(payload.currency || '').toUpperCase();
    if (status === 'approved' || status === 'processing' || status === 'reversed') {
      if (!Number.isFinite(amount) || amount !== order.amountMinor || currency !== order.currency) {
        await t.query("update orders set status = 'error', error_reason = 'amount_or_currency_mismatch', updated_at = $2, history = history || $3::jsonb where id = $1", [
          orderId,
          ts(now),
          historyEntry(now, 'error', via, `amount=${payload.amount} currency=${payload.currency}`),
        ]);
        return { ok: false, order: await getOrder(t, orderId), reason: 'amount_or_currency_mismatch' };
      }
    }

    let nextStatus = status;
    if (status === 'reversed') {
      const reversal = Number(payload.reversal_amount || 0);
      if (reversal > 0 && reversal < order.amountMinor) nextStatus = 'partially_reversed';
    }

    // Record the latest attempt result (a declined attempt leaves the order "processing").
    const code = payload.response_code !== undefined && payload.response_code !== null ? String(payload.response_code) : '';
    if (code || payload.response_description) {
      await t.query('update orders set last_response_code = coalesce($2, last_response_code), last_response_description = coalesce($3, last_response_description), attempt_declined = $4 where id = $1', [
        orderId,
        code || null,
        payload.response_description ? String(payload.response_description).slice(0, 200) : null,
        Boolean(code) && status !== 'approved',
      ]);
    }

    const dedupeKey = `${orderId}:${payload.payment_id || ''}:${nextStatus}:${payload.reversal_amount || ''}`;
    const seen = await t.query('select 1 from payment_events where dedupe_key = $1', [dedupeKey]);
    if (seen.rowCount) return { ok: true, order: await getOrder(t, orderId), changed: false, duplicate: true };

    if (nextStatus === order.status) {
      await t.query('insert into payment_events (dedupe_key, order_id, via, created_at) values ($1, $2, $3, $4)', [dedupeKey, orderId, via, ts(now)]);
      return { ok: true, order: await getOrder(t, orderId), changed: false };
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] || new Set();
    if (!allowed.has(nextStatus)) {
      await t.query('insert into payment_events (dedupe_key, order_id, via, note, created_at) values ($1, $2, $3, $4, $5)', [dedupeKey, orderId, via, `transition ${order.status}->${nextStatus} ignored`, ts(now)]);
      return { ok: true, order: await getOrder(t, orderId), changed: false, reason: 'transition_ignored' };
    }

    const reversed = nextStatus === 'reversed' || nextStatus === 'partially_reversed';
    await t.query(
      `update orders set status = $2, updated_at = $3, flitt_status = $4,
         payment_id = coalesce($5, payment_id), masked_card = coalesce($6, masked_card),
         approved_at = case when $2 = 'approved' then $3::timestamptz else approved_at end,
         reversed_at = case when $7 then $3::timestamptz else reversed_at end,
         reversal_amount = case when $7 then $8::int else reversal_amount end,
         history = history || $9::jsonb
       where id = $1`,
      [
        orderId,
        nextStatus,
        ts(now),
        status,
        payload.payment_id ? String(payload.payment_id) : null,
        payload.masked_card ? String(payload.masked_card) : null,
        reversed,
        Number(payload.reversal_amount || order.amountMinor),
        historyEntry(now, nextStatus, via),
      ]
    );
    await t.query('insert into payment_events (dedupe_key, order_id, via, created_at) values ($1, $2, $3, $4)', [dedupeKey, orderId, via, ts(now)]);

    const updated = await getOrder(t, orderId);
    const handlers = FULFILLMENT.get(updated.productKind);
    if (handlers) {
      if (nextStatus === 'approved' && handlers.approve) await handlers.approve(t, updated, now);
      if (reversed && handlers.reverse) await handlers.reverse(t, updated, now);
    }
    return { ok: true, order: updated, changed: true };
  });
}

/** Asks Flitt for the authoritative status of a pending order. */
export async function refreshOrderFromFlitt({ db, config, flitt, orderId, minIntervalMs = 2500, force = false, now = Date.now() }) {
  const order = await getOrder(db, orderId);
  if (!order) return order;
  // Final orders are only re-checked on request (e.g. right after a refund).
  if (isFinal(order.status) && !force) return order;
  if (order.lastStatusCheckAt && now - order.lastStatusCheckAt < minIntervalMs) return order;

  await db.query('update orders set last_status_check_at = $2 where id = $1', [orderId, ts(now)]);

  try {
    const response = await flitt.getOrderStatus(orderId);
    await applyFlittUpdate({ db, config, payload: response, via: 'status', trustedChannel: true, now });
  } catch {
    // Flitt answers "order not found" for orders it never saw. Once the order
    // lifetime has passed, close it locally as expired so it stops polling.
    const lifetimeMs = (config.flitt.orderLifetimeSeconds + 600) * 1000;
    if (now - order.createdAt > lifetimeMs) {
      await db.query(
        "update orders set status = 'expired', updated_at = $2, history = history || $3::jsonb where id = $1 and status not in ('approved', 'declined', 'expired', 'reversed', 'partially_reversed', 'error')",
        [orderId, ts(now), historyEntry(now, 'expired', 'server', 'lifetime passed')]
      );
    }
  }
  return getOrder(db, orderId);
}

export const productDuration = durationMs;
