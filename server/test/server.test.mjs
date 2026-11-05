// Run: npm run test:server
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../app.mjs';
import { computeEntitlements } from '../entitlements.mjs';
import { buildSignatureString, sign, verifySignature } from '../flitt.mjs';
import { MemoryStore } from '../store.mjs';

const DAY = 24 * 60 * 60 * 1000;

function makeConfig(overrides = {}) {
  return {
    port: 0,
    publicApiUrl: 'http://api.test',
    appPublicUrls: ['http://app.test'],
    appScheme: 'behappy',
    corsOrigins: [],
    adminToken: 'admin-secret',
    catalog: 'current',
    openai: { apiKey: 'sk-test-not-real', baseUrl: 'http://openai.test/v1', globalDailyRequestCap: 100000, keySource: 'test' },
    flitt: { mode: 'test', merchantId: 1549901, secretKey: 'test', apiBase: 'http://flitt.test', orderLifetimeSeconds: 3600 },
    ...overrides,
  };
}

// Fake Flitt client: records orders, lets tests decide what status returns.
class FakeFlitt {
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

// Fake OpenAI upstream.
function makeOpenAiFetch() {
  let n = 0;
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, body: init?.body });
    n += 1;
    if (String(url).endsWith('/responses')) {
      return new Response(JSON.stringify({ id: `resp_fake${n}`, output_text: '{"response_text":"hi"}' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).endsWith('/chat/completions')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }
    return new Response('nope', { status: 404 });
  };
  fn.calls = calls;
  return fn;
}

function signedCallback(order, fields) {
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

describe('Flitt signature', () => {
  test('matches the worked example in docs.flitt.com/api/building-signature', () => {
    const params = {
      order_id: 'TestOrder2',
      amount: 1000,
      currency: 'GEL',
      merchant_id: 1549901,
      order_desc: 'Test payment',
      server_callback_url: 'http://myshop/callback/',
    };
    assert.equal(buildSignatureString('test', params), 'test|1000|GEL|1549901|Test payment|TestOrder2|http://myshop/callback/');
    // The docs' printed signature values were produced with a different
    // (masked, 10-character) secret, so they can't be reproduced with "test".
    // The concatenation is what matters; the live sandbox call proves the hash.
  });

  test('response concatenation matches the response_signature_string hint in the docs', () => {
    const response = {
      rrn: '', masked_card: '', sender_cell_phone: '', sender_account: '', currency: 'GEL', fee: '',
      reversal_amount: '0', settlement_amount: '0', actual_amount: '', response_description: '', sender_email: '',
      order_status: 'expired', response_status: 'success', order_time: '28.02.2018 19:18:16', actual_currency: '',
      order_id: 'TestOrder2', tran_type: 'purchase', eci: '', settlement_date: '', payment_system: '', approval_code: '',
      merchant_id: 1549901, settlement_currency: '', payment_id: 83456044, card_bin: '', response_code: '', card_type: '',
      amount: '1000', signature: '268b8f189f97c85696134fe6ae0f7f5ab93f28d5', product_id: '', merchant_data: '',
      rectoken: '', rectoken_lifetime: '', verification_status: '', parent_order_id: '', fee_oplata: '0',
      additional_info: '{"capture_status": null, "capture_amount": null, "reservation_data": null, "transaction_id": null, "bank_response_code": null, "bank_response_description": null, "client_fee": null, "settlement_fee": 0.0, "bank_name": null, "bank_country": null, "card_type": null, "card_product": null, "card_category": null, "timeend": "01.03.2018 05:18:17", "ipaddress_v4": "52.30.149.20", "payment_method": null}',
      response_signature_string: 'ignored',
    };
    const hintFromDocs =
      '**********|{"capture_status": null, "capture_amount": null, "reservation_data": null, "transaction_id": null, "bank_response_code": null, "bank_response_description": null, "client_fee": null, "settlement_fee": 0.0, "bank_name": null, "bank_country": null, "card_type": null, "card_product": null, "card_category": null, "timeend": "01.03.2018 05:18:17", "ipaddress_v4": "52.30.149.20", "payment_method": null}|1000|GEL|0|1549901|TestOrder2|expired|28.02.2018 19:18:16|83456044|success|0|0|purchase';
    assert.equal(buildSignatureString('**********', response), hintFromDocs);
  });

  test('ignores empty values, signature and response_signature_string', () => {
    const base = { a: '1', b: '', c: null, d: 'x' };
    const withExtras = { ...base, signature: 'zzz', response_signature_string: 'hint' };
    assert.equal(sign('k', base), sign('k', withExtras));
  });

  test('verifySignature rejects tampering', () => {
    const p = { order_id: 'o1', amount: 100, currency: 'GEL', merchant_id: 1549901, order_status: 'approved' };
    const good = { ...p, signature: sign('test', p) };
    assert.equal(verifySignature('test', good), true);
    assert.equal(verifySignature('test', { ...good, amount: 1 }), false);
    assert.equal(verifySignature('wrong-secret', good), false);
  });
});

describe('Entitlements are derived from orders', () => {
  test('stacks Plus passes and drops reversed orders', () => {
    const t0 = Date.UTC(2026, 0, 1);
    const orders = [
      { id: 'a', status: 'approved', approvedAt: t0, productKind: 'plus', durationDays: 30 },
      { id: 'b', status: 'approved', approvedAt: t0 + DAY, productKind: 'plus', durationDays: 30 },
      { id: 'c', status: 'reversed', approvedAt: t0 + 2 * DAY, productKind: 'plus', durationDays: 365 },
    ];
    const e = computeEntitlements(orders, t0 + 2 * DAY);
    assert.equal(e.plus.expiresAt, t0 + 60 * DAY);
    assert.equal(e.plus.active, true);
    assert.equal(e.artProgram.active, true, 'Plus includes the art program while active');
    assert.equal(e.artProgram.owned, false);
  });
});

describe('API', () => {
  let server;
  let base;
  let store;
  let flitt;
  let openai;

  before(async () => {
    store = new MemoryStore();
    flitt = new FakeFlitt();
    openai = makeOpenAiFetch();
    const app = createApp({ store, config: makeConfig(), fetchImpl: openai, flittClient: flitt });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => server.close());

  const api = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
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

  test('creates an anonymous account and requires its token', async () => {
    const acct = await newAccount();
    assert.match(acct.accountId, /^acc_/);
    assert.ok(acct.token.length > 30);
    assert.match(acct.recoveryCode, /^[0-9A-Z]{5}(-[0-9A-Z]{5}){3}$/);
    assert.equal((await api('/api/account/me')).status, 401);
    const me = await api('/api/account/me', { token: acct.token });
    assert.equal(me.status, 200);
    assert.equal(me.json.entitlements.tier, 'free');
    assert.equal(me.json.payments.mode, 'test');
  });

  test('recovery code restores the same account; a wrong code does not', async () => {
    const acct = await newAccount();
    const restored = await api('/api/account/restore', { method: 'POST', body: { recoveryCode: acct.recoveryCode.toLowerCase() } });
    assert.equal(restored.status, 200);
    assert.equal(restored.json.accountId, acct.accountId);
    assert.notEqual(restored.json.token, acct.token);
    assert.equal((await api('/api/account/me', { token: acct.token })).status, 401, 'old token is rotated out');
    assert.equal((await api('/api/account/me', { token: restored.json.token })).status, 200);
    const wrong = await api('/api/account/restore', { method: 'POST', body: { recoveryCode: 'AAAAA-BBBBB-CCCCC-DDDDD' } });
    assert.equal(wrong.status, 404);
  });

  test('checkout uses the server price, never a client-supplied one', async () => {
    const acct = await newAccount();
    const res = await api('/api/payments/checkout', {
      token: acct.token,
      method: 'POST',
      body: { productId: 'art_program', amount: 1, amountMinor: 1, returnTo: { platform: 'web', origin: 'http://evil.test', path: '//evil.test' } },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.order.amountMinor, 5000, 'Art Therapy keeps its configured 50 GEL price');
    assert.equal(res.json.order.currency, 'GEL');
    assert.equal(res.json.mode, 'test');
    const created = flitt.created.at(-1);
    assert.equal(created.amountMinor, 5000);
    const stored = store.orders[res.json.order.id];
    assert.equal(stored.returnUrl, 'http://app.test/checkout/result', 'unknown origins and unsafe paths fall back to the app URL');
    assert.equal((await api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'free_money' } })).status, 400);
  });

  test('forged, tampered and replayed callbacks never grant access', async () => {
    const acct = await newAccount();
    const { json } = await api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'plus_30' } });
    const order = store.orders[json.order.id];

    const unsigned = { order_id: order.id, merchant_id: 1549901, amount: order.amountMinor, currency: 'GEL', order_status: 'approved' };
    assert.equal((await api('/api/payments/flitt/callback', { method: 'POST', body: unsigned })).status, 400);
    assert.equal(store.orders[order.id].status, 'created');

    const wrongMerchant = signedCallback(order, { merchant_id: 999 });
    assert.equal((await api('/api/payments/flitt/callback', { method: 'POST', body: wrongMerchant })).status, 400);

    const cheap = signedCallback(order, { amount: 1 });
    await api('/api/payments/flitt/callback', { method: 'POST', body: cheap });
    assert.equal(store.orders[order.id].status, 'error', 'amount mismatch quarantines the order');
    const me = await api('/api/account/me', { token: acct.token });
    assert.equal(me.json.entitlements.plus.active, false);
  });

  test('a valid signed callback grants Plus exactly once', async () => {
    const acct = await newAccount();
    const { json } = await api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'plus_30' } });
    const order = store.orders[json.order.id];
    const payload = signedCallback(order);
    const first = await api('/api/payments/flitt/callback', { method: 'POST', body: payload });
    assert.equal(first.status, 200);
    const me1 = await api('/api/account/me', { token: acct.token });
    assert.equal(me1.json.entitlements.plus.active, true);
    const expiry = me1.json.entitlements.plus.expiresAt;
    assert.ok(Math.abs(expiry - (Date.now() + 30 * DAY)) < 60 * 1000);

    const replay = await api('/api/payments/flitt/callback', { method: 'POST', body: payload });
    assert.equal(replay.status, 200);
    assert.equal(replay.json.duplicate, true);
    const me2 = await api('/api/account/me', { token: acct.token });
    assert.equal(me2.json.entitlements.plus.expiresAt, expiry, 'replay does not extend access');

    const regress = signedCallback(order, { order_status: 'processing', payment_id: 777002 });
    await api('/api/payments/flitt/callback', { method: 'POST', body: regress });
    assert.equal(store.orders[order.id].status, 'approved', 'status never moves backwards');
  });

  test('browser return with unsigned "success" does not approve; Flitt status does', async () => {
    const acct = await newAccount();
    const { json } = await api('/api/payments/checkout', {
      token: acct.token,
      method: 'POST',
      body: { productId: 'art_program', returnTo: { platform: 'web', origin: 'http://app.test', path: '/checkout/result' } },
    });
    const order = store.orders[json.order.id];

    flitt.statusById.set(order.id, { order_id: order.id, merchant_id: 1549901, amount: order.amountMinor, currency: 'GEL', order_status: 'processing' });
    const ret = await fetch(`${base}/api/payments/flitt/return?orderId=${order.id}&success=true&status=success`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `order_id=${order.id}&order_status=approved&amount=${order.amountMinor}&currency=GEL&merchant_id=1549901`,
    });
    assert.equal(ret.status, 303);
    assert.equal(ret.headers.get('location'), `http://app.test/checkout/result?orderId=${order.id}`);
    assert.equal(store.orders[order.id].status, 'processing');
    assert.equal((await api('/api/account/me', { token: acct.token })).json.entitlements.artProgram.owned, false);

    flitt.statusById.set(order.id, { order_id: order.id, merchant_id: 1549901, amount: order.amountMinor, currency: 'GEL', order_status: 'approved', payment_id: 55 });
    store.orders[order.id].lastStatusCheckAt = 0;
    const polled = await api(`/api/payments/orders/${order.id}`, { token: acct.token });
    assert.equal(polled.json.order.status, 'approved');
    assert.equal(polled.json.entitlements.artProgram.owned, true);

    const other = await newAccount();
    assert.equal((await api(`/api/payments/orders/${order.id}`, { token: other.token })).status, 404, 'orders are private to their account');
  });

  test('the purchases list shows a declined attempt and grants nothing', async () => {
    const acct = await newAccount();
    const { json } = await api('/api/payments/checkout', {
      token: acct.token,
      method: 'POST',
      body: { productId: 'plus_30', returnTo: { platform: 'web', origin: 'http://app.test', path: '/checkout/result' } },
    });
    const order = store.orders[json.order.id];
    // Flitt keeps the order open after a declined card; the decline is only in the response code.
    flitt.statusById.set(order.id, { order_id: order.id, merchant_id: 1549901, amount: order.amountMinor, currency: 'GEL', order_status: 'processing', response_code: 1014, response_description: 'Declined by issuing bank' });
    store.orders[order.id].lastStatusCheckAt = 0;
    const list = await api('/api/payments/orders', { token: acct.token });
    const row = list.json.orders.find((o) => o.id === order.id);
    assert.equal(row.attemptDeclined, true);
    assert.notEqual(row.status, 'approved');
    assert.equal((await api('/api/account/me', { token: acct.token })).json.entitlements.plus.active, false);
  });

  test('a refund (reversal) removes the entitlement', async () => {
    const acct = await newAccount();
    const { json } = await api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'plus_90' } });
    const order = store.orders[json.order.id];
    await api('/api/payments/flitt/callback', { method: 'POST', body: signedCallback(order) });
    assert.equal((await api('/api/account/me', { token: acct.token })).json.entitlements.plus.active, true);

    assert.equal((await api(`/api/admin/orders/${order.id}/refund`, { method: 'POST', body: {} })).status, 403);
    flitt.statusById.set(order.id, {
      order_id: order.id,
      merchant_id: 1549901,
      amount: order.amountMinor,
      currency: 'GEL',
      order_status: 'reversed',
      reversal_amount: order.amountMinor,
      payment_id: 777001,
    });
    const refund = await api(`/api/admin/orders/${order.id}/refund`, { method: 'POST', body: {}, headers: { 'x-admin-token': 'admin-secret' } });
    assert.equal(refund.status, 200);
    assert.equal(refund.json.order.status, 'reversed');
    assert.equal((await api('/api/account/me', { token: acct.token })).json.entitlements.plus.active, false);
  });

  test('owner metrics are aggregate counts behind the admin token', async () => {
    assert.equal((await api('/api/admin/metrics')).status, 403);
    assert.equal((await api('/api/admin/metrics', { headers: { 'x-admin-token': 'wrong' } })).status, 403);
    const res = await api('/api/admin/metrics', { headers: { 'x-admin-token': 'admin-secret' } });
    assert.equal(res.status, 200);
    assert.ok(res.json.accounts.total >= 1);
    assert.ok(res.json.orders.byStatus.reversed >= 1);
    const text = JSON.stringify(res.json);
    for (const id of Object.keys(store.accounts)) assert.ok(!text.includes(id), 'no account ids in metrics');
    for (const id of Object.keys(store.orders)) assert.ok(!text.includes(id), 'no order ids in metrics');
  });

  const anulia = (token, conv, extra = {}) =>
    api('/api/ai/responses', {
      token,
      method: 'POST',
      headers: { 'x-behappy-feature': 'anulia', 'x-behappy-conversation': conv },
      body: { model: 'gpt-5-chat-latest', prompt: { id: 'pmpt_6902692e3d8081959fff3a192b21482902ebe8295781d9fb', version: '11' }, input: 'hello', ...extra },
    });

  test('AI proxy validates prompt, model and fields', async () => {
    const acct = await newAccount();
    assert.equal((await api('/api/ai/responses', { method: 'POST', body: {} })).status, 401);
    const badPrompt = await api('/api/ai/responses', {
      token: acct.token,
      method: 'POST',
      headers: { 'x-behappy-feature': 'anulia' },
      body: { prompt: { id: 'pmpt_someone_else' }, input: 'x' },
    });
    assert.equal(badPrompt.status, 400);
    const forced = await anulia(acct.token, 'c1', { model: 'gpt-4-32k' });
    assert.equal(forced.status, 200);
    assert.equal(JSON.parse(openai.calls.at(-1).body).model, 'gpt-5.4-mini', 'the server, not the client, chooses the model');
    assert.equal((await anulia(acct.token, 'c1', { tools: [] })).status, 400);
    const ok = await anulia(acct.token, 'c1', { max_output_tokens: 99999 });
    assert.equal(ok.status, 200);
    const sent = JSON.parse(openai.calls.at(-1).body);
    assert.equal(sent.max_output_tokens, 2048, 'output tokens are capped');
    assert.ok(!openai.calls.at(-1).body.includes('sk-test-not-real'), 'key travels only in the header');
  });

  test('conversation chains are bound to the account that created them', async () => {
    const a = await newAccount();
    const b = await newAccount();
    const first = await anulia(a.token, 'conv-a');
    const respId = first.json.id;
    assert.match(respId, /^resp_/);
    assert.equal((await anulia(a.token, 'conv-a', { previous_response_id: respId })).status, 200);
    assert.equal((await anulia(b.token, 'conv-b', { previous_response_id: respId })).status, 409);
  });

  test('free Anulia allowance ends gently: grace for the open conversation, then a calm 402', async () => {
    const acct = await newAccount();
    for (let i = 0; i < 20; i += 1) assert.equal((await anulia(acct.token, 'talk')).status, 200, `message ${i + 1}`);
    const g1 = await anulia(acct.token, 'talk');
    assert.equal(g1.status, 200);
    assert.equal(g1.headers.get('x-behappy-grace'), '2');
    await anulia(acct.token, 'talk');
    await anulia(acct.token, 'talk');
    const blocked = await anulia(acct.token, 'talk');
    assert.equal(blocked.status, 402);
    assert.equal(blocked.json.reason, 'free_limit');
    assert.ok(blocked.json.resetAt > Date.now());
    assert.equal((await anulia(acct.token, 'brand-new')).status, 402, 'no grace for a conversation started after the limit');
  });

  test('cards: one free conversation, then Plus is needed', async () => {
    const acct = await newAccount();
    const cards = (conv) =>
      api('/api/ai/responses', {
        token: acct.token,
        method: 'POST',
        headers: { 'x-behappy-feature': 'cards', 'x-behappy-conversation': conv },
        body: { prompt: { id: 'pmpt_690f8a73181481968bdf18821d56058203765a60aea147e6', version: '1' }, input: 'x' },
      });
    assert.equal((await cards('deck-1')).status, 200);
    assert.equal((await cards('deck-1')).status, 200, 'the trial conversation can continue');
    const second = await cards('deck-2');
    assert.equal(second.status, 402);
    assert.equal(second.json.reason, 'need_plus');
  });

  test('art: session 1 is free; later sessions need the program; one new session per day', async () => {
    const acct = await newAccount();
    const art = (session) =>
      api('/api/ai/responses', {
        token: acct.token,
        method: 'POST',
        headers: { 'x-behappy-feature': 'art', 'x-behappy-art-session': String(session) },
        body: { prompt: { id: 'pmpt_690baa7920308196a2d94f41d4be76be0bd44ed1840b1049', version: '21' }, input: 'x' },
      });
    assert.equal((await art(1)).status, 200);
    const locked = await art(2);
    assert.equal(locked.status, 402);
    assert.equal(locked.json.reason, 'need_art_access');

    const { json } = await api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'art_program' } });
    await api('/api/payments/flitt/callback', { method: 'POST', body: signedCallback(store.orders[json.order.id]) });
    const capped = await art(2);
    assert.equal(capped.status, 402, 'session 1 already used today’s new-session allowance');
    assert.equal(capped.json.reason, 'daily_new_session_limit');
    assert.equal((await art(1)).status, 200, 'an already-started session can continue');
  });

  test('unknown AI features are rejected', async () => {
    const acct = await newAccount();
    const res = await api('/api/ai/chat', {
      token: acct.token,
      method: 'POST',
      headers: { 'x-behappy-feature': 'free-for-all' },
      body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }] },
    });
    assert.equal(res.status, 400);
  });
});

describe('Test-mode lock', () => {
  test('live mode is refused', async () => {
    const { assertTestModeOnly, config } = await import('../config.mjs');
    const previous = config.flitt.mode;
    config.flitt.mode = 'live';
    assert.throws(() => assertTestModeOnly(), /TEST mode/);
    config.flitt.mode = previous;
  });
});
