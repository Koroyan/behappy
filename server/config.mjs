// BeHappy API server configuration.
//
// Every secret lives here on the server, never in the Expo client bundle.
// Values come from server/.env (see server/.env.example). A missing optional
// value falls back to a safe development default; a missing required value in
// production stops the server from starting.

// env.mjs must be the first import: it loads server/.env before anything below
// (or any module importing this one) reads process.env.
import { PROJECT_DIR, rootEnvHasLeakedKey, SERVER_DIR } from './env.mjs';

import path from 'node:path';

// The OpenAI key comes only from OPENAI_API_KEY (server/.env or the host's
// environment). There is deliberately no fallback: the key that older
// checkouts kept in the project-root .env (EXPO_PUBLIC_API_KEY) was published
// and must be revoked, never reused.
export const LEAKED_ROOT_KEY_PRESENT = rootEnvHasLeakedKey();

const env = process.env;
const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};
const int = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};
/** One of the allowed values; anything else falls back (with a warning). */
const oneOf = (value, allowed, fallback, name) => {
  if (value === undefined || value === '') return fallback;
  const v = String(value).trim().toLowerCase();
  if (allowed.includes(v)) return v;
  console.warn(`[config] ${name}="${value}" is not one of ${allowed.join(', ')}; using "${fallback}".`);
  return fallback;
};
/** A plausible OpenAI model id (letters, digits, dot, dash). */
const modelId = (value, fallback) => (value && /^[a-z0-9][a-z0-9.\-]{1,63}$/i.test(String(value).trim()) ? String(value).trim() : fallback);

export const NODE_ENV = env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Development QA tools (read the dev email outbox, move the server clock) are
// off unless the server is started with --dev-tools (npm run server:dev) or
// DEV_TOOLS=1, and never available when NODE_ENV=production.
const DEV_TOOLS = !IS_PRODUCTION && (process.argv.includes('--dev-tools') || bool(env.DEV_TOOLS));

export const config = {
  isProduction: IS_PRODUCTION,
  devTools: DEV_TOOLS,
  // Development only: while no email/SMS provider is connected, every
  // verification code is this fixed value (and the app says so on screen).
  // Never active in production: DEV_TOOLS is always false there.
  devFixedCode: DEV_TOOLS ? (env.DEV_FIXED_CODE || '123456').replace(/\D/g, '').slice(0, 6).padStart(6, '0') : null,
  // PostgreSQL connection string. Without it the server uses an embedded
  // PostgreSQL (PGlite) in DATA_DIR/pg, for development only.
  databaseUrl: env.DATABASE_URL || '',
  mail: {
    driver: (env.MAIL_DRIVER || (IS_PRODUCTION ? 'none' : 'log')).toLowerCase(),
    from: env.MAIL_FROM || '',
    resendApiKey: env.RESEND_API_KEY || '',
  },
  // Phone notifications through Expo's push service (free; an access token is
  // optional and only needed if "enhanced push security" is on for the project).
  // PUSH_DRIVER=log keeps them on this machine (printed, never sent); off disables.
  push: {
    driver: (env.PUSH_DRIVER || 'expo').toLowerCase(),
    accessToken: env.EXPO_ACCESS_TOKEN || '',
    // Web Push for the installed web app and browsers (VAPID). Generate a pair
    // once with `npx web-push generate-vapid-keys`; the public key is public,
    // the private key is a secret. Development makes and keeps its own pair.
    web: {
      publicKey: env.WEB_PUSH_PUBLIC_KEY || '',
      privateKey: env.WEB_PUSH_PRIVATE_KEY || '',
      subject: env.WEB_PUSH_SUBJECT || '',
    },
  },
  sms: {
    driver: (env.SMS_DRIVER || (IS_PRODUCTION ? 'none' : 'log')).toLowerCase(),
    twilioAccountSid: env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: env.TWILIO_AUTH_TOKEN || '',
    twilioVerifyServiceSid: env.TWILIO_VERIFY_SERVICE_SID || '',
  },
  // 32-byte keys (base64) for encrypting verification documents and private
  // client/professional messages at rest. Development generates throwaway
  // keys in DATA_DIR; production must set them (and keep them safe).
  encryption: {
    documentsKey: env.DOCUMENT_ENCRYPTION_KEY || '',
    messagesKey: env.MESSAGE_ENCRYPTION_KEY || '',
    identifierSalt: env.IDENTIFIER_HMAC_KEY || '',
  },
  // BeHappy Professional membership (fixed fee, 0% commission). TEST values,
  // configurable by the owner.
  professional: {
    amountMinor: int(env.PRO_PRICE_MINOR, 7900),
    currency: 'GEL',
    durationDays: int(env.PRO_DURATION_DAYS, 30),
    trialDays: int(env.PRO_TRIAL_DAYS, 14),
    graceDays: int(env.PRO_GRACE_DAYS, 0),
    verificationValidDays: int(env.PRO_VERIFICATION_VALID_DAYS, 365),
  },
  community: {
    // Optional automated pre-screen of community messages with OpenAI's
    // moderation endpoint (off by default; human moderators always decide).
    aiModeration: bool(env.COMMUNITY_AI_MODERATION, false),
    anuliaHourlyRoomCap: int(env.COMMUNITY_ANULIA_ROOM_HOURLY_CAP, 30),
    anuliaDailyGlobalCap: int(env.COMMUNITY_ANULIA_DAILY_CAP, 2000),
  },
  analytics: {
    // Aggregates for groups smaller than this are hidden in the staff tools.
    minCohort: int(env.ANALYTICS_MIN_COHORT, 5),
  },
  supportEmail: env.SUPPORT_EMAIL || '',
  port: int(env.PORT, 8787),
  // Public URL of this API, used to build Flitt response/callback URLs.
  publicApiUrl: (env.PUBLIC_API_URL || `http://localhost:${int(env.PORT, 8787)}`).replace(/\/$/, ''),
  // Public URL of the web app, used for post-payment redirects. Comma separated
  // list is allowed; the first entry is the default redirect target.
  appPublicUrls: (env.APP_PUBLIC_URLS || env.APP_PUBLIC_URL || 'http://localhost:8081')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Native deep-link scheme from app.config.js ("behappy").
  appScheme: env.APP_SCHEME || 'behappy',
  // Allowed browser origins for CORS. Defaults to the app URLs.
  corsOrigins: (env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Outside server/ so file-watching dev servers don't restart on every write.
  dataDir: env.DATA_DIR || path.join(PROJECT_DIR, '.server-data'),
  serverDir: SERVER_DIR,
  adminToken: env.ADMIN_TOKEN || '',
  // Express "trust proxy". Default: only a proxy on this machine. Behind a
  // hosting platform's load balancer set TRUST_PROXY=1 (one hop).
  trustProxy: env.TRUST_PROXY === undefined || env.TRUST_PROXY === '' ? 'loopback' : /^[0-9]+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY,

  openai: {
    apiKey: env.OPENAI_API_KEY || '',
    keySource: env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'missing',
    baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    // Optional hard ceiling on proxied AI requests per UTC day across all users.
    globalDailyRequestCap: int(env.AI_GLOBAL_DAILY_REQUEST_CAP, 5000),
  },

  // Models per feature. Read here, after server/.env is loaded (see env.mjs).
  // The instructions themselves are server-owned (server/prompts/).
  ai: {
    models: {
      anulia: env.AI_MODEL_ANULIA || 'gpt-5.4-mini',
      // Art reflection reads two photos, follows a three-phase method and keeps
      // the person's words straight; it uses a stronger model than the others
      // (docs/BEHAPPY_AI_MODEL_EVALUATION.md). Other features stay independent.
      art: modelId(env.AI_MODEL_ART, 'gpt-6.1-sol'),
      cards: env.AI_MODEL_CARDS || 'gpt-5.4-mini',
      community: env.AI_MODEL_COMMUNITY || 'gpt-5.4-mini',
      // Daily reflection: short, checked text from facts (server/reflection).
      reflection: modelId(env.AI_MODEL_REFLECTION, 'gpt-5.4-mini'),
    },
    art: {
      // Used once if the art model is unavailable for this OpenAI project.
      fallbackModel: modelId(env.AI_MODEL_ART_FALLBACK, 'gpt-5.4-mini'),
      reasoning: oneOf(env.AI_REASONING_ART, ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'], 'medium', 'AI_REASONING_ART'),
      // Reasoning tokens count against this budget; too small cuts the JSON off.
      maxOutputTokens: Math.min(32000, Math.max(2048, int(env.AI_ART_MAX_OUTPUT_TOKENS, 8000))),
      // true: OpenAI keeps responses (30 days by default) so turns can chain
      // with previous_response_id. false: nothing is stored there and the app
      // resends the session history each turn (more input tokens).
      store: bool(env.AI_ART_STORE, true),
      timeoutMs: Math.min(300000, Math.max(20000, int(env.AI_ART_TIMEOUT_MS, 120000))),
    },
  },

  flitt: {
    // TEST ONLY. Live mode is intentionally not implemented in this build.
    mode: (env.FLITT_MODE || 'test').toLowerCase(),
    // Public Flitt sandbox merchant from https://docs.flitt.com/api/testing/
    merchantId: int(env.FLITT_MERCHANT_ID, 1549901),
    secretKey: env.FLITT_SECRET_KEY || 'test',
    apiBase: (env.FLITT_API_BASE || 'https://pay.flitt.com').replace(/\/$/, ''),
    // Seconds before an unpaid checkout expires (Flitt default is 36000).
    orderLifetimeSeconds: int(env.FLITT_ORDER_LIFETIME_SECONDS, 3600),
  },

  // Which product catalog is active. "current" keeps the prices that were in
  // the app before the 2.0 rebuild; "proposal" is the recommended structure
  // from docs/BEHAPPY_PRICING_STRATEGY.md. Both are TEST values until the
  // business approves them.
  // Shared rate limits (server/rateLimit.mjs, stored in the database, so a
  // restart doesn't reset them). Local QA servers (--dev-tools) allow more.
  limits: { accountsPerHourPerIp: int(env.ACCOUNTS_PER_HOUR_PER_IP, DEV_TOOLS ? 1000 : 20) },
  catalog: env.BEHAPPY_CATALOG === 'affordable' ? 'affordable' : 'current',
  // Which tax case the economics guard uses (server/finance/assumptions.mjs).
  // Leave worst_case until an accountant confirms the business's tax status.
  finance: {
    taxScenario: ['worst_case', 'small_business_1', 'small_business_3', 'small_business_vat', 'llc_vat', 'international'].includes(env.FINANCE_TAX_SCENARIO) ? env.FINANCE_TAX_SCENARIO : 'worst_case',
    cacGel: env.FINANCE_CAC_GEL === undefined || env.FINANCE_CAC_GEL === '' ? null : Number(env.FINANCE_CAC_GEL),
    // Staff are alerted when a product's modelled contribution is within this of the minimum.
    alertMarginGel: Number(env.FINANCE_ALERT_MARGIN_GEL || 5),
  },
};

export const FLITT_TEST_MERCHANT_ID = 1549901;

/** Throws when the configuration would allow real money to move. */
export function assertTestModeOnly() {
  const { mode, merchantId } = config.flitt;
  if (mode !== 'test') {
    throw new Error(
      `FLITT_MODE="${mode}" is not allowed. This build only supports Flitt TEST mode. ` +
        'Live payments must be enabled deliberately in a separate, reviewed change.'
    );
  }
  if (merchantId !== FLITT_TEST_MERCHANT_ID && !bool(env.FLITT_ALLOW_CUSTOM_TEST_MERCHANT)) {
    throw new Error(
      `FLITT_MERCHANT_ID=${merchantId} is not the public Flitt test merchant. ` +
        'Set FLITT_ALLOW_CUSTOM_TEST_MERCHANT=true only for a sandbox merchant issued to you by Flitt.'
    );
  }
}

export function describeConfig() {
  return {
    env: NODE_ENV,
    port: config.port,
    publicApiUrl: config.publicApiUrl,
    appPublicUrls: config.appPublicUrls,
    openaiKey: config.openai.apiKey ? `present (${config.openai.keySource})` : 'MISSING',
    flittMode: config.flitt.mode,
    flittMerchant: config.flitt.merchantId,
    catalog: config.catalog,
    database: config.databaseUrl ? 'postgresql (DATABASE_URL)' : `embedded PGlite in ${config.dataDir} (development only)`,
    email: config.mail.driver,
    sms: config.sms.driver,
    push: config.push.driver,
    webPush: config.push.web.publicKey && config.push.web.privateKey ? 'configured (WEB_PUSH_*)' : config.isProduction ? 'OFF (WEB_PUSH_* not set)' : 'development key pair',
    devTools: config.devTools,
    professional: `${config.professional.amountMinor / 100} ${config.professional.currency} / ${config.professional.durationDays} days, trial ${config.professional.trialDays} days, 0% commission`,
  };
}

const isHttps = (url) => /^https:\/\//i.test(url);
const isKey = (value) => {
  try {
    return Buffer.from(String(value), 'base64').length === 32;
  } catch {
    return false;
  }
};

/**
 * Configuration problems that must stop a production start (blocking) and
 * ones that only disable a feature (warnings). Nothing here prints a secret.
 */
export function productionProblems(c = config) {
  const blocking = [];
  const warnings = [];
  if (!c.isProduction) return { blocking, warnings };
  if (!c.databaseUrl) blocking.push('DATABASE_URL is required in production (the embedded database is for development only).');
  if (!isHttps(c.publicApiUrl)) blocking.push('PUBLIC_API_URL must be an https:// URL in production.');
  if (!c.appPublicUrls.every(isHttps)) blocking.push('APP_PUBLIC_URLS must all be https:// URLs in production.');
  if (!isKey(c.encryption.documentsKey)) blocking.push('DOCUMENT_ENCRYPTION_KEY must be a base64 32-byte key in production.');
  if (!isKey(c.encryption.messagesKey)) blocking.push('MESSAGE_ENCRYPTION_KEY must be a base64 32-byte key in production.');
  if (!isKey(c.encryption.identifierSalt)) blocking.push('IDENTIFIER_HMAC_KEY must be a base64 32-byte key in production.');
  if (c.trustProxy === 'loopback') warnings.push('TRUST_PROXY is not set: behind a hosting load balancer set TRUST_PROXY=1, or per-IP limits see the proxy address.');
  if (c.mail.driver !== 'resend' || !c.mail.resendApiKey || !c.mail.from) warnings.push('Email is not configured (MAIL_DRIVER=resend, RESEND_API_KEY, MAIL_FROM): registration and password reset answer 503.');
  if (c.sms.driver !== 'twilio' || !c.sms.twilioAccountSid) warnings.push('SMS is not configured (SMS_DRIVER=twilio + TWILIO_*): professional phone verification answers 503.');
  if (!c.openai.apiKey) warnings.push('OPENAI_API_KEY is missing: AI features answer 503.');
  if (!c.push.web.publicKey || !c.push.web.privateKey || !/^(mailto:|https:\/\/)/.test(c.push.web.subject || ''))
    warnings.push('Web Push is not configured (WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT=mailto:…): the web app offers no notifications or reminders.');
  return { blocking, warnings };
}
