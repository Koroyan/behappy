// Order lifecycle and payment verification.
//
// Trust rules (see docs/BEHAPPY_SECURITY_REVIEW.md):
//  1. Only the server creates orders, and only from the server-side catalog.
//  2. An order becomes "approved" only from a Flitt payload that (a) carries a
//     valid signature made with the merchant secret, or (b) came back from our
//     own signed server-to-server status request to Flitt.
//  3. merchant_id, amount and currency must match the stored order exactly.
//  4. Each (order, payment, status) event is applied once (replay protection),
//     and status can't move backwards (approved can only become reversed).
//  5. Browser redirects, URL flags and client messages never change an order.

import crypto from 'node:crypto';
import { durationMs, findProduct, orderDescription } from './catalog.mjs';
import { FINAL_STATUSES, KNOWN_STATUSES, verifySignature } from './flitt.mjs';

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

/**
 * Creates a pending order and a Flitt hosted checkout for it.
 * `returnUrl` must already be validated by the caller.
 */
export async function createCheckout({ store, config, flitt, accountId, productId, lang, returnUrl }) {
  const product = findProduct(config.catalog, productId);
  if (!product) {
    const err = new Error('Unknown product');
    err.status = 400;
    throw err;
  }

  const recent = Object.values(store.orders).filter(
    (o) => o.accountId === accountId && Date.now() - o.createdAt < 60 * 60 * 1000
  );
  if (recent.length >= 10) {
    const err = new Error('Too many checkout attempts. Please try again later.');
    err.status = 429;
    throw err;
  }

  const orderId = newOrderId();
  const now = Date.now();
  const order = {
    id: orderId,
    accountId,
    productId: product.id,
    productKind: product.kind,
    durationDays: product.durationDays,
    amountMinor: product.amountMinor,
    currency: product.currency,
    mode: 'test',
    status: 'created',
    createdAt: now,
    updatedAt: now,
    returnUrl,
    history: [{ at: now, status: 'created', via: 'server' }],
  };
  store.mutate((db) => {
    db.orders[orderId] = order;
  });

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
    store.mutate((db) => {
      db.orders[orderId].checkoutUrl = response.checkout_url;
      db.orders[orderId].paymentId = response.payment_id ? String(response.payment_id) : undefined;
      db.orders[orderId].updatedAt = Date.now();
    });
    return { order: store.orders[orderId], checkoutUrl: response.checkout_url, product };
  } catch (error) {
    store.mutate((db) => {
      db.orders[orderId].status = 'error';
      db.orders[orderId].errorReason = 'checkout_create_failed';
      db.orders[orderId].updatedAt = Date.now();
      db.orders[orderId].history.push({ at: Date.now(), status: 'error', via: 'server', note: String(error.message).slice(0, 200) });
    });
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
export function applyFlittUpdate({ store, config, payload, via, trustedChannel = false }) {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'empty_payload' };

  const orderId = String(payload.order_id || '');
  const order = store.orders[orderId];
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
  if (!KNOWN_STATUSES.has(status)) {
    return { ok: false, order, reason: 'unknown_status' };
  }

  // Amount and currency must match what we priced server-side.
  const amount = Number(payload.amount);
  const currency = String(payload.currency || '').toUpperCase();
  if (status === 'approved' || status === 'processing' || status === 'reversed') {
    if (!Number.isFinite(amount) || amount !== order.amountMinor || currency !== order.currency) {
      store.mutate((db) => {
        const o = db.orders[orderId];
        o.status = 'error';
        o.errorReason = 'amount_or_currency_mismatch';
        o.updatedAt = Date.now();
        o.history.push({ at: Date.now(), status: 'error', via, note: `amount=${payload.amount} currency=${payload.currency}` });
      });
      return { ok: false, order: store.orders[orderId], reason: 'amount_or_currency_mismatch' };
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
    store.mutate((db) => {
      const o = db.orders[orderId];
      o.lastResponseCode = code || o.lastResponseCode;
      o.lastResponseDescription = payload.response_description ? String(payload.response_description).slice(0, 200) : o.lastResponseDescription;
      o.attemptDeclined = Boolean(code) && status !== 'approved';
    });
  }

  const dedupeKey = `${orderId}:${payload.payment_id || ''}:${nextStatus}:${payload.reversal_amount || ''}`;
  if (store.data.paymentEvents[dedupeKey]) {
    return { ok: true, order, changed: false, duplicate: true };
  }

  if (nextStatus === order.status) {
    store.mutate((db) => {
      db.paymentEvents[dedupeKey] = { at: Date.now(), via };
    });
    return { ok: true, order, changed: false };
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] || new Set();
  if (!allowed.has(nextStatus)) {
    store.mutate((db) => {
      db.paymentEvents[dedupeKey] = { at: Date.now(), via, ignored: `transition ${order.status}->${nextStatus}` };
    });
    return { ok: true, order, changed: false, reason: 'transition_ignored' };
  }

  store.mutate((db) => {
    const o = db.orders[orderId];
    const now = Date.now();
    o.status = nextStatus;
    o.updatedAt = now;
    o.flittStatus = status;
    if (payload.payment_id) o.paymentId = String(payload.payment_id);
    if (payload.masked_card) o.maskedCard = String(payload.masked_card);
    if (nextStatus === 'approved') o.approvedAt = now;
    if (nextStatus === 'reversed' || nextStatus === 'partially_reversed') {
      o.reversedAt = now;
      o.reversalAmount = Number(payload.reversal_amount || o.amountMinor);
    }
    o.history.push({ at: now, status: nextStatus, via });
    db.paymentEvents[dedupeKey] = { at: now, via };
  });

  return { ok: true, order: store.orders[orderId], changed: true };
}

/** Asks Flitt for the authoritative status of a pending order. */
export async function refreshOrderFromFlitt({ store, config, flitt, orderId, minIntervalMs = 2500, force = false }) {
  const order = store.orders[orderId];
  if (!order) return order;
  // Final orders are only re-checked on request (e.g. right after a refund).
  if (isFinal(order.status) && !force) return order;
  if (order.lastStatusCheckAt && Date.now() - order.lastStatusCheckAt < minIntervalMs) return order;

  store.mutate((db) => {
    db.orders[orderId].lastStatusCheckAt = Date.now();
  });

  try {
    const response = await flitt.getOrderStatus(orderId);
    applyFlittUpdate({ store, config, payload: response, via: 'status', trustedChannel: true });
  } catch (error) {
    // Flitt answers "order not found" for orders it never saw. Once the order
    // lifetime has passed, close it locally as expired so it stops polling.
    const lifetimeMs = (config.flitt.orderLifetimeSeconds + 600) * 1000;
    if (Date.now() - order.createdAt > lifetimeMs) {
      store.mutate((db) => {
        const o = db.orders[orderId];
        if (!isFinal(o.status)) {
          o.status = 'expired';
          o.updatedAt = Date.now();
          o.history.push({ at: Date.now(), status: 'expired', via: 'server', note: 'lifetime passed' });
        }
      });
    }
  }
  return store.orders[orderId];
}

export const productDuration = durationMs;
