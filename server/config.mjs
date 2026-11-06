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

export const NODE_ENV = env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

export const config = {
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
      art: env.AI_MODEL_ART || 'gpt-5.4-mini',
      cards: env.AI_MODEL_CARDS || 'gpt-5.4-mini',
      community: env.AI_MODEL_COMMUNITY || 'gpt-5.4-mini',
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
  catalog: env.BEHAPPY_CATALOG === 'proposal' ? 'proposal' : 'current',
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
    dataDir: config.dataDir,
  };
}
