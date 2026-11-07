// Account 360° journey in real browsers (Chrome via playwright-core).
//   npm run qa:account360                        localhost
//   npm run qa:account360 -- --app https://<tunnel> --out <folder>
//
// Needs the dev API with --dev-tools (test code 123456) and ADMIN_TOKEN in
// server/.env (used by server/scripts/grant-role.mjs, never printed). Fresh
// accounts each run: an owner, a support agent, a finance person, a member.
// The payment steps use a Flitt TEST order already in the database (from
// npm run qa:payments); without one they are reported as skipped.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const repo = process.cwd();
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const APP = opt('app', 'http://localhost:8081').replace(/\/$/, '');
const OUT = path.resolve(opt('out', './qa-shots/account360'));
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const TUNNEL = { 'ngrok-skip-browser-warning': '1' };
const CODE = '123456';
const PASSWORD = 'calm-river-stone-42';

const results = [];
let active = null;
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`${note === 'SKIP' ? 'SKIP' : 'PASS'} ${name}${note && note !== 'SKIP' ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`);
    if (active) await active.screenshot({ path: path.join(OUT, 'FAILED-step.png') }).catch(() => {});
    console.log(results.join('\n'));
    throw e;
  }
};
const j = async (p, { token, ...opts } = {}) => {
  const res = await fetch(APP + p, { ...opts, headers: { 'Content-Type': 'application/json', ...TUNNEL, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} → ${res.status} ${body.error || ''}`);
  return body;
};
async function registered(tag) {
  const email = `${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@example.org`;
  const acct = await j('/api/account', { method: 'POST', body: '{}' });
  const reg = await j('/api/auth/register', { method: 'POST', token: acct.token, body: JSON.stringify({ email, password: PASSWORD }) });
  await j('/api/auth/verify-email', { method: 'POST', token: acct.token, body: JSON.stringify({ code: reg.testCode || CODE }) });
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
  return { accountId: login.accountId, token: login.token, email };
}
const grant = (email, role) => execFileSync(process.execPath, ['server/scripts/grant-role.mjs', email, role], { cwd: repo, stdio: 'ignore' });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [];
async function client(user, viewport, label, { lang = 'en', theme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (!APP.startsWith('http://localhost')) {
    const host = new URL(APP).host;
    await ctx.route((url) => url.host === host, (route) => route.continue({ headers: { ...route.request().headers(), ...TUNNEL } }));
  }
  await ctx.addInitScript(
    ({ acc, lang: l, theme: th }) => {
      try {
        localStorage.setItem('@behappy_onboarding_v2', 'done');
        localStorage.setItem('@behappy_language', l);
        localStorage.setItem('theme', th);
        localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now(), kind: 'password' }));
      } catch {}
    },
    { acc: user, lang, theme }
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  const id = (t) => `[data-testid="${t}"]`;
  const visible = (t) => {
    active = page;
    return page.locator(id(t)).filter({ visible: true }).first();
  };
  return {
    page,
    go: (p) => page.goto(APP + p, { waitUntil: 'load', timeout: 90000 }),
    wait: (t, timeout = 30000) => visible(t).waitFor({ timeout }),
    click: (t) => visible(t).click(),
    count: (t) => page.locator(id(t)).filter({ visible: true }).count(),
    fill: (t, v) => page.locator(`${id(t)} input, ${id(t)} textarea, input${id(t)}, textarea${id(t)}`).filter({ visible: true }).first().fill(v),
    text: (s, timeout = 20000) => page.getByText(s, { exact: false }).filter({ visible: true }).first().waitFor({ timeout }),
    shot: (name) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: false }),
    close: () => ctx.close(),
  };
}

// ---------- People and some account history ----------
const owner = await registered('qa-owner');
const support = await registered('qa-support');
const finance = await registered('qa-finance');
const member = await registered('qa-member');
grant(owner.email, 'owner');
grant(support.email, 'support');
grant(finance.email, 'finance');
await j('/api/community/profile', { method: 'PUT', token: member.token, body: JSON.stringify({ pseudonym: `Lika ${Date.now().toString(36).slice(-4)}`, acceptGuidelines: true }) });
await j('/api/community/rooms/sleep:en/join', { method: 'POST', token: member.token, body: '{}' });
const ticket = await j('/api/support/tickets', { method: 'POST', token: member.token, body: JSON.stringify({ category: 'payment', subject: 'QA: where is my receipt?', body: 'I paid for Plus and cannot find the receipt.' }) });
await j('/api/admin/step-up', { method: 'POST', token: owner.token, body: JSON.stringify({ password: PASSWORD }) });
await j(`/api/admin/users/${member.accountId}/grants`, { method: 'POST', token: owner.token, body: JSON.stringify({ days: 14, reason: 'QA goodwill after an outage' }) });
// A TEST order from earlier payment runs, if the database has one.
const payments = await j('/api/admin/payments', { token: owner.token }).catch(() => ({ payments: [] }));
const order = (payments.payments || []).find((p) => p.status === 'approved') || (payments.payments || [])[0] || null;

const O = await client(owner, { width: 1440, height: 900 }, 'desktop-owner');
try {
  await step('owner: all tabs; plans show the complimentary period, never as a payment', async () => {
    await O.go(`/admin/users/${member.accountId}?tab=subscriptions`);
    await O.wait('screen-admin-user', 60000);
    for (const tab of ['overview', 'activity', 'transactions', 'subscriptions', 'appointments', 'community', 'support', 'security']) await O.wait(`admin-user-tabs-${tab}`);
    await O.wait('admin-user-periods');
    await O.text('Complimentary');
    await O.page.waitForTimeout(300);
    await O.shot('plans');
  });
  await step('owner: activity timeline links to the support request', async () => {
    await O.click('admin-user-tabs-activity');
    await O.wait('admin-user-timeline');
    await O.text('Complimentary Plus given');
    await O.text('Which room is never shown');
    await O.page.waitForTimeout(300);
    await O.shot('activity');
    await O.click('admin-user-event-support_request');
    await O.page.waitForURL((u) => u.pathname === `/admin/support/${ticket.ticket.id}`, { timeout: 20000 });
  });
  await step('owner: community tab links to the moderation member profile', async () => {
    await O.go(`/admin/users/${member.accountId}?tab=community`);
    await O.wait('admin-user-member', 60000);
    await O.click('admin-user-member');
    await O.wait('screen-admin-moderation-member');
  });
  await step('Finance → payment drawer (TEST) → the account, with the payment open', async () => {
    if (!order) return 'SKIP';
    await O.go('/admin/finance');
    await O.wait('screen-admin-finance', 60000);
    await O.page.locator('[data-testid="admin-finance-payment"]').filter({ visible: true }).first().click();
    await O.wait('admin-tx-drawer');
    await O.text('TEST · sandbox');
    await O.wait('admin-tx-entitlement');
    await O.page.waitForTimeout(300);
    await O.shot('finance-drawer');
    await O.click('admin-tx-open-account');
    await O.page.waitForURL((u) => u.pathname.startsWith('/admin/users/') && u.searchParams.get('tab') === 'transactions' && Boolean(u.searchParams.get('order')), { timeout: 20000 });
    await O.wait('admin-tx-drawer');
    await O.page.waitForTimeout(300);
    await O.shot('account-drawer');
    return 'deep link ?tab=transactions&order=…';
  });
  await step('accounts list keeps the search when coming back', async () => {
    await O.go('/admin/users');
    await O.wait('screen-admin-users', 60000);
    await O.fill('admin-users-search', member.email);
    await O.page.waitForURL((u) => u.searchParams.get('q') === member.email, { timeout: 10000 });
    await O.page.locator('[data-testid="admin-user-row"]').filter({ hasText: member.email.slice(0, 6) }).first().click({ timeout: 20000 });
    await O.wait('screen-admin-user');
    await O.click('admin-user-back');
    await O.wait('screen-admin-users');
    const value = await O.page.locator('[data-testid="admin-users-search"] input, input[data-testid="admin-users-search"]').first().inputValue();
    if (value !== member.email) throw new Error(`search lost: "${value}"`);
  });
} finally {
  await O.close();
}

const S = await client(support, { width: 1280, height: 860 }, 'desktop-support');
try {
  await step('support: payments, plans and security, but no usage statistics or community link', async () => {
    await S.go(`/admin/users/${member.accountId}`);
    await S.wait('screen-admin-user', 60000);
    await S.wait('admin-user-tabs-transactions');
    await S.wait('admin-user-tabs-security');
    if (await S.count('admin-user-tabs-activity')) throw new Error('activity tab visible to support');
    if (await S.count('admin-user-tabs-community')) throw new Error('community tab visible to support');
    await S.text('Not available for your role');
    const forbidden = await fetch(`${APP}/api/admin/users/${member.accountId}/community`, { headers: { ...TUNNEL, Authorization: `Bearer ${support.token}` } });
    if (forbidden.status !== 403) throw new Error(`community API answered ${forbidden.status}`);
    // A tab in the URL that the role can't open falls back to the overview.
    await S.go(`/admin/users/${member.accountId}?tab=activity`);
    await S.wait('admin-user-account', 60000);
    await S.click('admin-user-tabs-security');
    await S.text('Devices and sessions');
    await S.page.waitForTimeout(300);
    await S.shot('security');
  });
} finally {
  await S.close();
}

const F = await client(finance, { width: 1280, height: 860 }, 'desktop-finance');
try {
  await step('finance: the payment drawer without a link to the person', async () => {
    if (!order) return 'SKIP';
    await F.go('/admin/finance');
    await F.wait('screen-admin-finance', 60000);
    await F.page.locator('[data-testid="admin-finance-payment"]').filter({ visible: true }).first().click();
    await F.wait('admin-tx-drawer');
    await F.text('TEST · sandbox');
    if (await F.count('admin-tx-open-account')) throw new Error('account link shown to finance');
  });
} finally {
  await F.close();
}

const P = await client(owner, { width: 390, height: 844 }, 'mobile-owner');
try {
  await step('phone: tabs scroll, the timeline fits', async () => {
    await P.go(`/admin/users/${member.accountId}?tab=activity`);
    await P.wait('admin-user-timeline', 60000);
    await P.page.waitForTimeout(400);
    await P.shot('activity');
  });
} finally {
  await P.close();
}

const K = await client(owner, { width: 1280, height: 860 }, 'georgian-dark', { lang: 'ka', theme: 'dark' });
try {
  await step('Georgian, dark mode', async () => {
    await K.go(`/admin/users/${member.accountId}?tab=subscriptions`);
    await K.wait('admin-user-periods', 60000);
    await K.text('საჩუქარი');
    await K.page.waitForTimeout(400);
    await K.shot('plans');
  });
} finally {
  await K.close();
}

await step('no page errors', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});

await browser.close();
console.log(results.join('\n'));
fs.writeFileSync(path.join(OUT, 'results.txt'), results.join('\n'));
