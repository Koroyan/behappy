// Express application factory (also used by the test suite).

import crypto from 'node:crypto';

import cors from 'cors';
import express from 'express';
import { createAiRouter } from './ai.mjs';
import { createAccount, requireAccount, restoreAccount, rotateRecoveryCode } from './auth.mjs';
import { getCatalog } from './catalog.mjs';
import { entitlementsForAccount, ordersForAccount } from './entitlements.mjs';
import { FlittClient } from './flitt.mjs';
import { applyFlittUpdate, createCheckout, isFinal, publicOrder, refreshOrderFromFlitt } from './payments.mjs';
import { LIMITS, usageSummary } from './quota.mjs';
import { aggregateMetrics } from './metrics.mjs';

class IpWindow {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.map = new Map();
  }

  allow(key) {
    const now = Date.now();
    const list = (this.map.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) return false;
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

const SAFE_PATH = /^\/[A-Za-z0-9/_-]{0,80}$/;

/** Builds the post-payment redirect target from validated pieces only. */
export function buildReturnUrl(config, returnTo = {}) {
  if (returnTo.platform === 'native') return `${config.appScheme}://checkout/result`;
  const origin = String(returnTo.origin || '').replace(/\/$/, '');
  const base = config.appPublicUrls.includes(origin) ? origin : config.appPublicUrls[0];
  const pathPart = SAFE_PATH.test(String(returnTo.path || '')) ? returnTo.path : '/checkout/result';
  return `${base}${pathPart}`;
}

const withQuery = (url, params) => {
  const qs = new URLSearchParams(params).toString();
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const sameSecret = (given, expected) => {
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

export function createApp({ store, config, fetchImpl = globalThis.fetch, flittClient } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Only trust X-Forwarded-For from a proxy we know about; otherwise clients
  // could fake their IP and slip past the per-IP limits.
  app.set('trust proxy', config.trustProxy);

  const flitt =
    flittClient ||
    new FlittClient({
      merchantId: config.flitt.merchantId,
      secretKey: config.flitt.secretKey,
      apiBase: config.flitt.apiBase,
      fetchImpl,
    });

  const allowedOrigins = new Set([...config.appPublicUrls, ...config.corsOrigins]);
  app.use(
    cors({
      origin(origin, cb) {
        // Native apps and server-to-server calls send no Origin header.
        if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return cb(null, true);
        return cb(null, false);
      },
      exposedHeaders: ['X-BeHappy-Tier', 'X-BeHappy-Remaining', 'X-BeHappy-Grace'],
    })
  );

  const accountCreation = new IpWindow(20, 60 * 60 * 1000);
  const restoreAttempts = new IpWindow(10, 15 * 60 * 1000);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, payments: 'flitt-test', ai: Boolean(config.openai.apiKey) });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({
      mode: 'test',
      catalog: config.catalog,
      products: getCatalog(config.catalog),
      // Shown on the pricing page; the same numbers are enforced in quota.mjs.
      limits: {
        free: { anuliaMessages: LIMITS.free.anulia.messages, anuliaPeriod: LIMITS.free.anulia.period, journalReflectionsPerDay: LIMITS.free.journal.reflections, cardConversations: LIMITS.free.cards.conversations, freeArtSessions: LIMITS.free.art.freeSessionIds.length },
        plus: { anuliaMessages: LIMITS.plus.anulia.messages, anuliaPeriod: LIMITS.plus.anulia.period, journalReflectionsPerDay: LIMITS.plus.journal.reflections, cardConversationsPerDay: LIMITS.plus.cards.conversations, newArtSessionsPerDay: LIMITS.plus.art.newSessions },
      },
    });
  });

  // ---------- Accounts ----------
  app.post('/api/account', express.json({ limit: '10kb' }), (req, res) => {
    if (!accountCreation.allow(req.ip)) return res.status(429).json({ error: 'rate_limited' });
    res.status(201).json(createAccount(store));
  });

  app.post('/api/account/restore', express.json({ limit: '10kb' }), (req, res) => {
    if (!restoreAttempts.allow(req.ip)) return res.status(429).json({ error: 'rate_limited' });
    const restored = restoreAccount(store, req.body?.recoveryCode);
    if (!restored) return res.status(404).json({ error: 'not_found', message: 'No account matches this recovery code.' });
    res.json(restored);
  });

  const auth = requireAccount(store);

  app.get('/api/account/me', auth, (req, res) => {
    const entitlements = entitlementsForAccount(store, req.account.id);
    res.json({
      accountId: req.account.id,
      createdAt: req.account.createdAt,
      entitlements,
      usage: usageSummary({ store, accountId: req.account.id, entitlements }),
      payments: { provider: 'flitt', mode: 'test' },
      ai: { available: Boolean(config.openai.apiKey) },
    });
  });

  app.post('/api/account/recovery-code', auth, (req, res) => {
    res.json({ recoveryCode: rotateRecoveryCode(store, req.account.id) });
  });

  app.delete('/api/account', auth, (req, res) => {
    const id = req.account.id;
    store.mutate((db) => {
      delete db.accounts[id];
      delete db.usage[id];
      // Payment records are kept for accounting, detached from the account.
      for (const order of Object.values(db.orders)) {
        if (order.accountId === id) order.accountId = 'deleted';
      }
      for (const [rid, row] of Object.entries(db.responseOwners)) {
        if (row.accountId === id) delete db.responseOwners[rid];
      }
    });
    res.json({ ok: true });
  });

  // ---------- AI proxy ----------
  app.use('/api/ai', express.json({ limit: '20mb' }), createAiRouter({ store, config, fetchImpl }));

  // ---------- Payments (Flitt TEST) ----------
  app.post('/api/payments/checkout', express.json({ limit: '10kb' }), auth, async (req, res) => {
    try {
      const returnUrl = buildReturnUrl(config, req.body?.returnTo);
      const { order, checkoutUrl, product } = await createCheckout({
        store,
        config,
        flitt,
        accountId: req.account.id,
        productId: String(req.body?.productId || ''),
        lang: String(req.body?.lang || 'en'),
        returnUrl,
      });
      res.status(201).json({ order: publicOrder(order), checkoutUrl, product, mode: 'test' });
    } catch (error) {
      res.status(error.status || 500).json({ error: 'checkout_failed', message: error.message });
    }
  });

  app.get('/api/payments/orders', auth, (req, res) => {
    const orders = ordersForAccount(store, req.account.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(publicOrder);
    res.json({ orders });
  });

  app.get('/api/payments/orders/:orderId', auth, async (req, res) => {
    const order = store.orders[req.params.orderId];
    if (!order || order.accountId !== req.account.id) return res.status(404).json({ error: 'not_found' });
    const refreshed = isFinal(order.status) ? order : await refreshOrderFromFlitt({ store, config, flitt, orderId: order.id });
    res.json({
      order: publicOrder(refreshed),
      entitlements: entitlementsForAccount(store, req.account.id),
    });
  });

  // Flitt → our server (JSON). Must answer 200 once handled, or Flitt retries.
  app.post(
    '/api/payments/flitt/callback',
    express.json({ limit: '100kb' }),
    express.urlencoded({ extended: false, limit: '100kb' }),
    (req, res) => {
      const result = applyFlittUpdate({ store, config, payload: req.body, via: 'callback' });
      if (!result.ok && (result.reason === 'bad_signature' || result.reason === 'merchant_mismatch')) {
        return res.status(400).json({ ok: false, reason: result.reason });
      }
      if (!result.ok && result.reason === 'unknown_order') return res.status(404).json({ ok: false, reason: result.reason });
      res.status(200).json({ ok: true, duplicate: Boolean(result.duplicate) });
    }
  );

  // Browser redirect after checkout (Flitt may POST form fields or GET).
  app.all('/api/payments/flitt/return', express.urlencoded({ extended: false, limit: '100kb' }), express.json({ limit: '100kb' }), async (req, res) => {
    const orderId = String(req.query.orderId || req.body?.order_id || '');
    const order = store.orders[orderId];
    if (!order) return res.redirect(303, withQuery(`${config.appPublicUrls[0]}/checkout/result`, { error: 'unknown_order' }));

    // A signed payload in the redirect is applied like a callback; an unsigned
    // or forged one is ignored. Either way we then ask Flitt directly.
    if (req.body && req.body.signature) applyFlittUpdate({ store, config, payload: req.body, via: 'return' });
    try {
      await refreshOrderFromFlitt({ store, config, flitt, orderId, minIntervalMs: 0 });
    } catch {
      // status will be retried by the result screen's polling
    }
    res.redirect(303, withQuery(order.returnUrl || `${config.appPublicUrls[0]}/checkout/result`, { orderId }));
  });

  // Test-only refund, for verifying the reversal path. Requires ADMIN_TOKEN.
  app.get('/api/admin/metrics', (req, res) => {
    if (!config.adminToken || !sameSecret(req.get('x-admin-token'), config.adminToken)) return res.status(403).json({ error: 'forbidden' });
    res.json(aggregateMetrics(store));
  });

  app.post('/api/admin/orders/:orderId/refund', express.json({ limit: '10kb' }), async (req, res) => {
    if (!config.adminToken || !sameSecret(req.get('x-admin-token'), config.adminToken)) return res.status(403).json({ error: 'forbidden' });
    const order = store.orders[req.params.orderId];
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (order.status !== 'approved') return res.status(409).json({ error: 'not_refundable', status: order.status });
    try {
      const response = await flitt.reverse({
        orderId: order.id,
        amountMinor: order.amountMinor,
        currency: order.currency,
        reverseId: `rev-${order.id}`,
      });
      store.mutate((db) => {
        db.orders[order.id].lastStatusCheckAt = 0;
      });
      const refreshed = await refreshOrderFromFlitt({ store, config, flitt, orderId: order.id, minIntervalMs: 0, force: true });
      res.json({ reverse: { status: response.reverse_status }, order: publicOrder(refreshed) });
    } catch (error) {
      res.status(502).json({ error: 'refund_failed', message: error.message });
    }
  });

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'payload_too_large' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
    console.error('[server] unhandled error', err);
    res.status(500).json({ error: 'server_error' });
  });

  return app;
}
