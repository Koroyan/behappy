// Shared test harness: an in-memory PostgreSQL (PGlite), the app on a random
// port, a fake Flitt, a fake OpenAI, a dev mailer and a movable clock.
import { createApp } from '../app.mjs';
import { createClock } from '../clock.mjs';
import { createDatabase } from '../db/index.mjs';
import { migrate } from '../db/migrate.mjs';
import { sign } from '../flitt.mjs';
import { createMailer } from '../notify/mailer.mjs';

export const DAY = 24 * 60 * 60 * 1000;

export function makeConfig(overrides = {}) {
  return {
    port: 0,
    isProduction: false,
    devTools: true,
    publicApiUrl: 'http://api.test',
    appPublicUrls: ['http://app.test'],
    appScheme: 'behappy',
    corsOrigins: [],
    adminToken: 'admin-secret',
    catalog: 'current',
    openai: { apiKey: 'sk-test-not-real', baseUrl: 'http://openai.test/v1', globalDailyRequestCap: 100000, keySource: 'test' },
    ai: { models: { anulia: 'gpt-5.4-mini', art: 'gpt-5.4-mini', cards: 'gpt-5.4-mini', community: 'gpt-5.4-mini' } },
    flitt: { mode: 'test', merchantId: 1549901, secretKey: 'test', apiBase: 'http://flitt.test', orderLifetimeSeconds: 3600 },
    mail: { driver: 'log' },
    sms: { driver: 'log' },
    encryption: { documentsKey: '', messagesKey: '', identifierSalt: '' },
    professional: { amountMinor: 7900, currency: 'GEL', durationDays: 30, trialDays: 14, graceDays: 0, verificationValidDays: 365 },
    community: { aiModeration: false, anuliaHourlyRoomCap: 30, anuliaDailyGlobalCap: 2000 },
    ...overrides,
  };
}

export class FakeFlitt {
  constructor() {
    this.created = [];
    this.statusById = new Map();
    this.reversed = [];
  }

  async createCheckout(args) {
    this.created.push(args);
    return { checkout_url: `https://pay.flitt.test/checkout?order=${args.orderId}`, payment_id: 12345 };
  }

  async getOrderStatus(orderId) {
    const s = this.statusById.get(orderId);
    if (!s) throw new Error('order not found');
    return s;
  }

  async reverse(args) {
    this.reversed.push(args);
    return { reverse_status: 'approved' };
  }
}

/** Fake OpenAI. `reply` may be a function (body) => output_text. */
export function makeOpenAiFetch({ reply } = {}) {
  let n = 0;
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, body: init?.body });
    n += 1;
    const body = init?.body ? JSON.parse(init.body) : {};
    if (String(url).endsWith('/responses')) {
      const text = typeof reply === 'function' ? reply(body) : reply || '{"response_text":"hi"}';
      return new Response(JSON.stringify({ id: `resp_fake${n}`, output_text: text, output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 12, output_tokens: 7 } }), { status: 200 });
    }
    if (String(url).endsWith('/chat/completions')) {
      const text = typeof reply === 'function' ? reply(body) : 'ok';
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
    }
    if (String(url).endsWith('/moderations')) {
      return new Response(JSON.stringify({ results: [{ flagged: false, categories: {} }] }), { status: 200 });
    }
    return new Response('nope', { status: 404 });
  };
  fn.calls = calls;
  return fn;
}

export function signedCallback(order, fields) {
  const payload = {
    order_id: order.id,
    merchant_id: 1549901,
    amount: order.amountMinor,
    currency: order.currency,
    order_status: 'approved',
    payment_id: 777001,
    masked_card: '444455XXXXXX6666',
    ...fields,
  };
  return { ...payload, signature: sign('test', payload) };
}

/** Starts the app (with optional feature modules) and returns helpers. */
export async function startTestServer({ config: overrides = {}, extend = [], services = [], openai = makeOpenAiFetch() } = {}) {
  const db = await createDatabase({ memory: true });
  await migrate(db);
  const config = makeConfig(overrides);
  const flitt = new FakeFlitt();
  const clock = createClock({ allowOffset: true });
  const mailer = createMailer({ driver: 'log' });
  const app = createApp({ db, config, fetchImpl: openai, flittClient: flitt, clock, mailer, extend });
  const http = await import('node:http');
  const server = http.createServer(app);
  const started = [];
  for (const s of services) started.push(await s({ server, app, deps: app.locals.deps }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const api = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      redirect: 'manual',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, json, headers: res.headers };
  };

  const newAccount = async () => (await api('/api/account', { method: 'POST', body: {} })).json;

  /** Anonymous account → registered (email verified + password) → password session. */
  const registered = async (email = `p${Math.random().toString(36).slice(2, 10)}@example.org`, password = 'calm-river-stone-42') => {
    const acct = await newAccount();
    const reg = await api('/api/auth/register', { token: acct.token, method: 'POST', body: { email, password } });
    if (reg.status !== 200) throw new Error(`register failed ${reg.status} ${JSON.stringify(reg.json)}`);
    const code = /(\d{6})/.exec(mailer.lastTo(email).text)[1];
    const ver = await api('/api/auth/verify-email', { token: acct.token, method: 'POST', body: { code } });
    if (ver.status !== 200) throw new Error(`verify failed ${ver.status}`);
    const login = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    return { ...acct, deviceToken: acct.token, token: login.json.token, email, password };
  };

  const grantRole = async (accountId, role) => db.query('update accounts set roles = array_append(roles, $2) where id = $1', [accountId, role]);

  const stop = async () => {
    for (const s of started) await s?.stop?.();
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  };

  return { db, config, flitt, clock, mailer, openai, app, server, base, api, newAccount, registered, grantRole, stop };
}
