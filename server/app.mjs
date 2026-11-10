// Express application factory (also used by the test suite).
//
// Dependencies are passed in: db (PostgreSQL or PGlite, see db/index.mjs),
// config, a Flitt client, an OpenAI fetch, a clock and a mailer. Nothing here
// reads process.env.

import crypto from 'node:crypto';

import cors from 'cors';
import express from 'express';

import { isStaffRole, permissionsFor } from './admin/permissions.mjs';
import { settingsFor } from './admin/settings.mjs';
import { staffFor, staffRouter } from './admin/staff.mjs';
import { createAiRouter } from './ai.mjs';
import { audit } from './audit.mjs';
import { bearerToken, createAccount, requireAccount, restoreAccount, rotateRecoveryCode } from './auth.mjs';
import { findProduct, getCatalog } from './catalog.mjs';
import { createClock } from './clock.mjs';
import { createCrypto } from './crypto.mjs';
import { schemaVersion } from './db/migrate.mjs';
import { entitlementsForAccount, ordersForAccount } from './entitlements.mjs';
import { FlittClient } from './flitt.mjs';
import { createAuthRouter } from './identity.mjs';
import { runAccountDeletionHooks } from './lifecycle.mjs';
import { aggregateMetrics } from './metrics.mjs';
import { createMailer } from './notify/mailer.mjs';
import { listNotifications, unreadCount } from './notify/notifications.mjs';
import { getOrder } from './orders.mjs';
import { applyFlittUpdate, createCheckout, isFinal, publicOrder, refreshOrderFromFlitt } from './payments.mjs';
import { AI_ALLOWANCES, LIMITS, usageSummary } from './quota.mjs';
import { createPromotions, PromoError } from './promotions.mjs';
import { ts } from './db/index.mjs';
import { createLimiter } from './rateLimit.mjs';

const SAFE_PATH = /^\/[A-Za-z0-9/_-]{0,80}$/;

/** Builds the post-payment redirect target from validated pieces only. */
export function buildReturnUrl(config, returnTo = {}) {
  if (returnTo.platform === 'native') return `${config.appScheme}://checkout/result`;
  const origin = String(returnTo.origin || '').replace(/\/$/, '');
  const base = config.appPublicUrls.includes(origin) ? origin : config.appPublicUrls[0];
  const pathPart = SAFE_PATH.test(String(returnTo.path || '')) ? returnTo.path : '/checkout/result';
  return `${base}${pathPart}`;
}

/**
 * The public address of this API for the current request. When the API is
 * served on the app's own origin (dev proxy, tunnel, production proxy) and that
 * origin is an allowed app URL, Flitt sends the payer and its callbacks back
 * there; otherwise PUBLIC_API_URL is used. Only allowed origins are accepted.
 */
export function requestApiBase(config, req) {
  const host = String(req.get('x-forwarded-host') || '').split(',')[0].trim();
  const proto = String(req.get('x-forwarded-proto') || 'http').split(',')[0].trim();
  const origin = host ? `${proto}://${host}` : '';
  return origin && config.appPublicUrls.includes(origin) ? origin : config.publicApiUrl;
}

/** Development tools answer only on this machine, never through a tunnel. */
const isLocalRequest = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);

const withQuery = (url, params) => {
  const qs = new URLSearchParams(params).toString();
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

export const sameSecret = (given, expected) => {
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

/**
 * Express app. `extend(app, deps)` lets feature modules (community,
 * professionals, admin) mount their routers with the same dependencies.
 */
export function createApp({ db, config, fetchImpl = globalThis.fetch, flittClient, clock = createClock(), mailer, extend = [] } = {}) {
  if (!db) throw new Error('createApp needs a database');
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
  const mail = mailer || createMailer({ driver: config.mail?.driver || 'log', from: config.mail?.from, resendApiKey: config.mail?.resendApiKey, isProduction: config.isProduction });
  // meSections: extra parts of GET /api/account/me, added by feature modules.
  const deps = { db, config, flitt, clock, mailer: mail, fetchImpl, meSections: [] };
  // One field-encryption instance for every module (documents, messages, staff codes).
  deps.crypto = createCrypto({ ...config, persistDevKeys: !config.isProduction && Boolean(config.dataDir) });
  app.locals.deps = deps;
  const authEvent = (kind, info) => staffFor(deps).recordEvent(kind, info).catch(() => {});

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
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Shared by every server instance (table rate_counters).
  const accountCreation = createLimiter(db, { name: 'accounts-ip', limit: config.limits?.accountsPerHourPerIp ?? 20, windowMs: 60 * 60 * 1000 });
  const restoreAttempts = createLimiter(db, { name: 'restore-ip', limit: 10, windowMs: 15 * 60 * 1000 });
  const auth = requireAccount(db, { clock });
  const json = express.json({ limit: '10kb' });

  app.get('/api/health', async (_req, res) => {
    let database = 'ok';
    let schema = null;
    try {
      await db.query('select 1');
      schema = await schemaVersion(db);
    } catch {
      database = 'error';
    }
    res.status(database === 'ok' ? 200 : 503).json({ ok: database === 'ok', database, schema, driver: db.kind, payments: 'flitt-test', ai: Boolean(config.openai.apiKey), email: mail.available });
  });

  const promotions = createPromotions({ db, config, clock });
  app.get('/api/catalog', async (_req, res) => {
    res.json({
      mode: 'test',
      catalog: config.catalog,
      products: getCatalog(config.catalog),
      // Automatic offers anyone gets now (server-checked; the reference price is the regular price).
      offers: await promotions.offers(clock.now()).catch(() => ({})),
      // Shown on the pricing page; the same numbers are enforced in quota.mjs.
      limits: {
        free: { anuliaMessages: LIMITS.free.anulia.messages, anuliaPeriod: LIMITS.free.anulia.period, journalReflectionsPerDay: LIMITS.free.journal.reflections, cardConversations: LIMITS.free.cards.conversations, freeArtSessions: LIMITS.free.art.freeSessionIds.length, artMessagesPerSession: LIMITS.free.art.messagesPerSession },
        plus: { anuliaMessages: LIMITS.plus.anulia.messages, anuliaPeriod: LIMITS.plus.anulia.period, journalReflectionsPerDay: LIMITS.plus.journal.reflections, cardConversationsPerDay: LIMITS.plus.cards.conversations, newArtSessionsPerDay: LIMITS.plus.art.newSessions, artMessagesPerSession: LIMITS.plus.art.messagesPerSession },
        // The fair-use AI allowance per account (USD, server-enforced), shown as "fair use" with a usage meter.
        allowances: { plusUsdPer30Days: AI_ALLOWANCES.plus.usd, freeUsdPer30Days: AI_ALLOWANCES.free.usd, artProgramUsd: AI_ALLOWANCES.artProgram.usd },
      },
      renewal: 'manual',
    });
  });

  // ---------- Accounts ----------
  app.post('/api/account', json, async (req, res) => {
    if (!(await accountCreation.allow(req.ip, clock.now()))) return res.status(429).json({ error: 'rate_limited' });
    res.status(201).json(await createAccount(db, { now: clock.now(), userAgent: req.get('user-agent') }));
  });

  app.post('/api/account/restore', json, async (req, res) => {
    if (!(await restoreAttempts.allow(req.ip, clock.now()))) return res.status(429).json({ error: 'rate_limited' });
    const restored = await restoreAccount(db, req.body?.recoveryCode, { now: clock.now(), userAgent: req.get('user-agent') });
    if (!restored) return res.status(404).json({ error: 'not_found', message: 'No account matches this recovery code.' });
    res.json(restored);
  });

  app.get('/api/account/me', auth, async (req, res) => {
    const now = clock.now();
    const a = req.account;
    const entitlements = await entitlementsForAccount(db, a.id, now);
    res.json({
      accountId: a.id,
      createdAt: a.createdAt,
      entitlements,
      usage: await usageSummary({ db, accountId: a.id, entitlements, now }),
      payments: { provider: 'flitt', mode: 'test' },
      ai: { available: Boolean(config.openai.apiKey) },
      identity: {
        registered: a.registered,
        email: a.email,
        emailVerified: a.emailVerified,
        roles: a.roles,
        // What the staff tools will allow (the server checks again on every request).
        staffPermissions: a.roles.some(isStaffRole) && !a.staffSuspendedAt ? [...permissionsFor(a.roles)].sort() : [],
        sessionKind: a.sessionKind,
        status: a.status,
        analytics: !a.analyticsOptOut,
        emailAvailable: mail.available,
        testCode: config.devTools && !config.isProduction ? config.devFixedCode || null : null,
      },
      platform: await settingsFor(deps).publicView(now),
      notifications: { unread: await unreadCount(db, a.id) },
      ...Object.fromEntries(await Promise.all(deps.meSections.map(async (s) => [s.name, await s.fn(db, a, now)]))),
    });
  });

  app.post('/api/account/recovery-code', auth, async (req, res) => {
    res.json({ recoveryCode: await rotateRecoveryCode(db, req.account.id) });
  });

  // Deletes the account and everything attached to it in one transaction. If
  // any part fails, nothing is deleted and the app is told (no silent success).
  app.delete('/api/account', auth, async (req, res) => {
    const id = req.account.id;
    const now = clock.now();
    await db.tx(async (t) => {
      // Payment records are kept for accounting, detached from the account.
      await t.query('update orders set account_deleted = true where account_id = $1', [id]);
      await runAccountDeletionHooks(t, id, now);
      await t.query('delete from accounts where id = $1', [id]);
      await audit(t, { actorRole: 'system', action: 'account.deleted', targetType: 'account', targetId: crypto.createHash('sha256').update(id).digest('hex').slice(0, 16) });
    });
    await Promise.resolve(deps.realtime?.disconnect(id)).catch(() => {});
    res.json({ ok: true });
  });

  // ---------- Email + password ----------
  app.use(
    '/api/auth',
    createAuthRouter({
      db,
      mailer: mail,
      clock,
      limits: config.limits || {},
      devFixedCode: config.devTools && !config.isProduction ? config.devFixedCode || null : null,
      onSessionsRevoked: (accountId, opts) => deps.realtime?.disconnect(accountId, opts),
      onAuthEvent: authEvent,
    })
  );

  // ---------- Notifications ----------
  app.get('/api/notifications', auth, async (req, res) => {
    res.json({ notifications: await listNotifications(db, req.account.id, { before: req.query.before }), unread: await unreadCount(db, req.account.id) });
  });

  app.post('/api/notifications/read', json, auth, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite).slice(0, 200) : null;
    if (ids) await db.query('update notifications set read_at = $3 where account_id = $1 and id = any($2::bigint[]) and read_at is null', [req.account.id, ids, ts(clock.now())]);
    else await db.query('update notifications set read_at = $2 where account_id = $1 and read_at is null', [req.account.id, ts(clock.now())]);
    deps.realtime?.toUser(req.account.id, 'unread:changed', {});
    res.json({ ok: true, unread: await unreadCount(db, req.account.id) });
  });

  // ---------- AI proxy ----------
  app.use('/api/ai', express.json({ limit: '20mb' }), createAiRouter({ db, config, fetchImpl, clock, settings: settingsFor(deps) }));

  // ---------- Payments (Flitt TEST) ----------
  // The price this account would pay now (a promo code is optional), decided on the server.
  app.post('/api/payments/quote', json, auth, async (req, res) => {
    try {
      const q = await promotions.quote({ accountId: req.account.id, productId: String(req.body?.productId || ''), code: req.body?.promoCode ? String(req.body.promoCode).slice(0, 32) : null, now: clock.now() });
      res.json({ productId: q.product.id, listMinor: q.listMinor, finalMinor: q.finalMinor, discountMinor: q.discountMinor, promotion: q.promotion ? { id: q.promotion.id, name: q.promotion.name, endsAt: q.promotion.endsAt } : null, clamped: q.clamped, codeNotBetter: Boolean(q.codeNotBetter), currency: q.product.currency });
    } catch (error) {
      if (error instanceof PromoError) return res.status(error.status).json({ error: error.code });
      res.status(500).json({ error: 'quote_failed' });
    }
  });

  /**
   * No paying twice by mistake. The account's recent open orders are brought up
   * to date with Flitt first, so a payment made a moment ago (perhaps in a
   * browser window the app didn't see) already counts. Then:
   *  - the Art program is bought once: owned → 409 already_owned;
   *  - Plus while Plus is active → 409 plus_active, unless the app sends
   *    extend: true after showing that the new days come after the current end.
   */
  async function purchaseGuard(account, productId, extend) {
    const product = findProduct(config.catalog, productId, { professional: config.professional });
    if (!product || (product.kind !== 'art' && product.kind !== 'plus')) return null;
    const now = clock.now();
    const open = (await ordersForAccount(db, account.id)).filter((o) => !isFinal(o.status) && now - o.createdAt < 2 * 60 * 60 * 1000);
    await Promise.all(open.map((o) => refreshOrderFromFlitt({ db, config, flitt, orderId: o.id, minIntervalMs: 0, now }).catch(() => null)));
    const ent = await entitlementsForAccount(db, account.id, now);
    if (product.kind === 'art' && ent.artProgram.owned) return { error: 'already_owned', productKind: 'art' };
    if (product.kind === 'plus' && ent.plus.active && !extend) return { error: 'plus_active', expiresAt: ent.plus.expiresAt };
    return null;
  }

  app.post('/api/payments/checkout', json, auth, async (req, res) => {
    try {
      const blocked = await purchaseGuard(req.account, String(req.body?.productId || ''), req.body?.extend === true);
      if (blocked) return res.status(409).json(blocked);
      const returnUrl = buildReturnUrl(config, req.body?.returnTo);
      // The price is decided here (promotions held to the safe floor), never by the client.
      const q = await promotions.quote({ accountId: req.account.id, productId: String(req.body?.productId || ''), code: req.body?.promoCode ? String(req.body.promoCode).slice(0, 32) : null, now: clock.now() }).catch((e) => {
        if (e instanceof PromoError && e.code !== 'unknown_product') throw Object.assign(new Error(e.code), { status: e.status, code: e.code });
        return null;
      });
      const { order, checkoutUrl, product } = await createCheckout({
        db,
        config,
        flitt,
        accountId: req.account.id,
        productId: String(req.body?.productId || ''),
        lang: String(req.body?.lang || 'en'),
        returnUrl,
        now: clock.now(),
        apiBase: requestApiBase(config, req),
        pricing: q ? { productId: q.product.id, finalMinor: q.finalMinor, promotionId: q.promotion?.id || null } : null,
      });
      res.status(201).json({ order: publicOrder(order), checkoutUrl, product, mode: 'test' });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.code || 'checkout_failed', message: error.message });
    }
  });

  app.get('/api/payments/orders', auth, async (req, res) => {
    const now = clock.now();
    // Bring the newest open orders up to date with Flitt first (a declined attempt,
    // an expiry), so the list never shows a stale "started". At most three, always
    // asked afresh: a check a moment earlier (the app watching its order) may have
    // come before Flitt had the result. refreshOrderFromFlitt never throws.
    const open = (await ordersForAccount(db, req.account.id))
      .filter((o) => !isFinal(o.status))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
    await Promise.all(open.map((o) => refreshOrderFromFlitt({ db, config, flitt, orderId: o.id, minIntervalMs: 0, now }).catch(() => null)));
    const orders = (await ordersForAccount(db, req.account.id)).sort((a, b) => b.createdAt - a.createdAt).map(publicOrder);
    res.json({ orders });
  });

  app.get('/api/payments/orders/:orderId', auth, async (req, res) => {
    const now = clock.now();
    const order = await getOrder(db, req.params.orderId);
    if (!order || order.accountId !== req.account.id) return res.status(404).json({ error: 'not_found' });
    const refreshed = isFinal(order.status) ? order : await refreshOrderFromFlitt({ db, config, flitt, orderId: order.id, now });
    res.json({
      order: publicOrder(refreshed),
      entitlements: await entitlementsForAccount(db, req.account.id, now),
    });
  });

  // Flitt → our server (JSON). Must answer 200 once handled, or Flitt retries.
  app.post('/api/payments/flitt/callback', express.json({ limit: '100kb' }), express.urlencoded({ extended: false, limit: '100kb' }), async (req, res) => {
    const result = await applyFlittUpdate({ db, config, payload: req.body, via: 'callback', now: clock.now() });
    if (!result.ok && (result.reason === 'bad_signature' || result.reason === 'merchant_mismatch')) {
      return res.status(400).json({ ok: false, reason: result.reason });
    }
    if (!result.ok && result.reason === 'unknown_order') return res.status(404).json({ ok: false, reason: result.reason });
    res.status(200).json({ ok: true, duplicate: Boolean(result.duplicate) });
  });

  // The page Flitt sends the payer back to may open where the app's sign-in is
  // not: on iPhone, an installed web app shows Flitt (another site) in a browser
  // sheet, and the return lands in that sheet. The return link carries a receipt
  // (an HMAC of the order id) that lets that page show the verified status of
  // that one order: nothing about the account, no way to look up other orders.
  const receiptFor = (orderId) => deps.crypto.hmac(`order-receipt:${orderId}`).slice(0, 32);

  app.get('/api/payments/orders/:orderId/receipt', async (req, res) => {
    const orderId = String(req.params.orderId || '');
    const given = Buffer.from(String(req.query.r || ''));
    const expected = Buffer.from(receiptFor(orderId));
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return res.status(404).json({ error: 'not_found' });
    const order = await getOrder(db, orderId);
    if (!order) return res.status(404).json({ error: 'not_found' });
    const now = clock.now();
    const refreshed = isFinal(order.status) ? order : await refreshOrderFromFlitt({ db, config, flitt, orderId, now }).catch(() => order);
    const p = publicOrder(refreshed);
    res.set('Cache-Control', 'no-store').json({ status: p.status, productKind: p.productKind, attemptDeclined: p.attemptDeclined });
  });

  // Browser redirect after checkout (Flitt may POST form fields or GET).
  app.all('/api/payments/flitt/return', express.urlencoded({ extended: false, limit: '100kb' }), express.json({ limit: '100kb' }), async (req, res) => {
    const orderId = String(req.query.orderId || req.body?.order_id || '');
    const order = await getOrder(db, orderId);
    if (!order) return res.redirect(303, withQuery(`${config.appPublicUrls[0]}/checkout/result`, { error: 'unknown_order' }));

    // A signed payload in the redirect is applied like a callback; an unsigned
    // or forged one is ignored. Either way we then ask Flitt directly.
    if (req.body && req.body.signature) await applyFlittUpdate({ db, config, payload: req.body, via: 'return', now: clock.now() });
    try {
      await refreshOrderFromFlitt({ db, config, flitt, orderId, minIntervalMs: 0, now: clock.now() });
    } catch {
      // status will be retried by the result screen's polling
    }
    res.redirect(303, withQuery(order.returnUrl || `${config.appPublicUrls[0]}/checkout/result`, { orderId, r: receiptFor(orderId) }));
  });

  // ---------- Owner tools: the server-side ADMIN_TOKEN (scripts), or a staff session with the permission ----------
  // The token lives only in server/.env on the server. It is documented in
  // docs/BEHAPPY_ADMIN_SECURITY.md, every use is audited as "owner_token",
  // and it can do only what these three routes do.
  const tokenOr = (permission) => async (req, res, next) => {
    if (config.adminToken && req.get('x-admin-token') && sameSecret(req.get('x-admin-token'), config.adminToken)) {
      req.adminVia = 'token';
      return next();
    }
    if (!bearerToken(req)) return res.status(403).json({ error: 'forbidden' });
    return auth(req, res, () => staffFor(deps).guard(permission)(req, res, next));
  };

  // Grants or revokes a staff role for a registered account. The ADMIN_TOKEN
  // bootstraps the first owner (npm run admin:grant); after that, owners do it
  // in the staff tools (never for themselves).
  app.post('/api/admin/roles', json, tokenOr('staff.manage'), async (req, res) => {
    const role = String(req.body?.role || '');
    if (!isStaffRole(role)) return res.status(400).json({ error: 'bad_role' });
    const grant = req.body?.grant !== false;
    if (req.adminVia !== 'token') {
      try {
        const out = await staffFor(deps).changeRole(req.account, { email: req.body?.email, role, grant, reason: req.body?.reason || 'staff tools' }, req.ip);
        return res.json({ ...out, role, granted: grant });
      } catch (e) {
        return res.status(e.status || 500).json({ error: e.code || 'server_error' });
      }
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const id = await db.tx(async (t) => {
      const r = await t.query('select id, roles from accounts where email = $1 and email_verified_at is not null and password_hash is not null for update', [email]);
      const row = r.rows[0];
      if (!row) return null;
      const roles = grant ? [...new Set([...row.roles, role])] : row.roles.filter((x) => x !== role);
      await t.query('update accounts set roles = $2::text[] where id = $1', [row.id, roles]);
      await audit(t, { actorRole: 'owner_token', action: grant ? 'staff.role_granted' : 'staff.role_revoked', targetType: 'account', targetId: row.id, metadata: { role, via: 'ADMIN_TOKEN' } });
      return row.id;
    });
    if (!id) return res.status(404).json({ error: 'not_found', message: 'No registered account with this email.' });
    await authEvent(grant ? 'role_granted' : 'role_revoked', { accountId: id, ip: req.ip, metadata: { role, by: 'owner_token' } });
    res.json({ ok: true, accountId: id, role, granted: grant });
  });

  app.get('/api/admin/metrics', tokenOr('analytics.view'), async (_req, res) => {
    res.json(await aggregateMetrics(db, clock.now()));
  });

  // TEST-mode refund through Flitt's reversal API.
  app.post('/api/admin/orders/:orderId/refund', json, tokenOr('payments.refund'), async (req, res) => {
    const order = await getOrder(db, req.params.orderId);
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (order.status !== 'approved') return res.status(409).json({ error: 'not_refundable', status: order.status });
    try {
      const response = await flitt.reverse({ orderId: order.id, amountMinor: order.amountMinor, currency: order.currency, reverseId: `rev-${order.id}` });
      await db.query('update orders set last_status_check_at = null where id = $1', [order.id]);
      const refreshed = await refreshOrderFromFlitt({ db, config, flitt, orderId: order.id, minIntervalMs: 0, force: true, now: clock.now() });
      await audit(db, { actorId: req.account?.id || null, actorRole: req.adminVia === 'token' ? 'owner_token' : req.account?.primaryRole || 'admin', action: 'order.refund_requested', targetType: 'order', targetId: order.id, metadata: { reverseStatus: response.reverse_status, mode: 'test', reason: String(req.body?.reason || '').slice(0, 300) || null } });
      res.json({ reverse: { status: response.reverse_status }, order: publicOrder(refreshed) });
    } catch (error) {
      res.status(502).json({ error: 'refund_failed', message: error.message });
    }
  });

  // Staff: who am I, step-up confirmation, two-step codes, staff management.
  app.use('/api/admin', staffRouter(deps, { auth }));

  // ---------- Feature modules ----------
  for (const mount of extend) mount(app, deps);

  // ---------- Development tools (never in production) ----------
  if (config.devTools && !config.isProduction) {
    app.use('/api/dev', (req, res, next) => (isLocalRequest(req) ? next() : res.status(403).json({ error: 'local_only' })));
    app.get('/api/dev/outbox', (req, res) => {
      const m = mail.lastTo(String(req.query.to || ''));
      res.json({ message: m });
    });
    // Clears one registered account's AI allowances (daily/monthly counters and
    // conversation counts) so a tester can go through several sessions in a day.
    // Started art sessions stay started.
    app.post('/api/dev/usage/reset', json, async (req, res) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const r = email ? await db.query('select id from accounts where email = $1 and email_verified_at is not null', [email]) : { rows: [] };
      const id = r.rows[0]?.id;
      if (!id) return res.status(404).json({ error: 'not_found' });
      const counters = await db.query('delete from usage_counters where account_id = $1', [id]);
      const conversations = await db.query('delete from ai_conversations where account_id = $1', [id]);
      res.json({ ok: true, counters: counters.affectedRows ?? counters.rowCount ?? null, conversations: conversations.affectedRows ?? conversations.rowCount ?? null });
    });
    app.post('/api/dev/clock', json, (req, res) => {
      try {
        clock.setOffset(Number(req.body?.offsetMs) || 0);
        res.json({ ok: true, offsetMs: clock.offset, now: clock.now() });
      } catch (e) {
        res.status(403).json({ error: 'clock_locked', message: e.message });
      }
    });
  }

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'payload_too_large' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
    if (err?.status && err?.code && err.status < 500) return res.status(err.status).json({ error: err.code, message: err.message });
    console.error('[server] unhandled error', err);
    res.status(err?.status === 503 ? 503 : 500).json({ error: err?.code === 'email_unavailable' ? 'email_unavailable' : 'server_error' });
  });

  return app;
}
