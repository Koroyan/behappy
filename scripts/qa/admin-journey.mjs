// Admin control center journey in real browsers (Chrome via playwright-core).
//   npm run qa:admin                        localhost
//   npm run qa:admin -- --app https://<tunnel>
//
// Needs the dev API with --dev-tools (test code 123456) and ADMIN_TOKEN in
// server/.env (used by server/scripts/grant-role.mjs, never printed). It
// creates fresh QA accounts each run: an owner, an analyst and a member.
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
const OUT = path.resolve(opt('out', './qa-shots/admin'));
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const TUNNEL = { 'ngrok-skip-browser-warning': '1' };
const CODE = '123456';
const PASSWORD = 'calm-river-stone-42';

const results = [];
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`);
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
  // Console errors count as failures: Expo shows them on screen on the web (SDK 55+). The browser's own
  // 'Failed to load resource' lines are expected API refusals (for example 403 for a role).
  page.on('console', (m) => {
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(`${label}: console: ${m.text().slice(0, 200)}`);
  });
  const id = (t) => `[data-testid="${t}"]`;
  const visible = (t) => page.locator(id(t)).filter({ visible: true }).first();
  return {
    page,
    go: (p) => page.goto(APP + p, { waitUntil: 'load', timeout: 90000 }),
    wait: (t, timeout = 30000) => visible(t).waitFor({ timeout }),
    click: (t) => visible(t).click(),
    fill: (t, v) => page.locator(`${id(t)} input, ${id(t)} textarea, input${id(t)}, textarea${id(t)}`).filter({ visible: true }).first().fill(v),
    text: (s, timeout = 20000) => page.getByText(s, { exact: false }).filter({ visible: true }).first().waitFor({ timeout }),
    shot: (name) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: false }),
  };
}

// ---------- Accounts and some activity to look at ----------
const owner = await registered('qa-owner');
const analyst = await registered('qa-analyst');
const member = await registered('qa-member');
grant(owner.email, 'owner');
grant(analyst.email, 'analyst');
await j('/api/community/profile', { method: 'PUT', token: member.token, body: JSON.stringify({ pseudonym: `Quiet ${Date.now().toString(36).slice(-4)}`, acceptGuidelines: true }) });
await j('/api/community/rooms/anxiety:en/join', { method: 'POST', token: member.token, body: '{}' });
await j('/api/community/rooms/anxiety:en/messages', { method: 'POST', token: member.token, body: JSON.stringify({ body: 'Some nights I feel like I want to end my life.' }) });
// A subject of its own per run: older runs leave tickets with the same words in the queue.
const SUBJECT = `QA: charged twice? ${Date.now().toString(36)}`;
const ticket = await j('/api/support/tickets', { method: 'POST', token: member.token, body: JSON.stringify({ category: 'payment', subject: SUBJECT, body: 'I think I was charged twice for Plus yesterday.' }) });

const O = await client(owner, { width: 1440, height: 900 }, 'desktop-owner');
try {
  await step('owner opens the admin center: sidebar, KPI tiles, TEST badge', async () => {
    await O.go('/admin');
    await O.wait('screen-admin-overview', 60000);
    await O.wait('admin-sidebar');
    await O.wait('admin-kpi-new');
    await O.text('TEST');
    await O.shot('overview');
  });
  await step('date range and analytics', async () => {
    await O.click('admin-range-7d');
    await O.click('admin-nav-analytics');
    await O.wait('screen-admin-analytics');
    await O.shot('analytics');
  });
  await step('users: search, detail without private content, complimentary Plus after a password confirmation', async () => {
    await O.click('admin-nav-users');
    await O.wait('screen-admin-users');
    await O.fill('admin-users-search', member.email);
    await O.page.locator('[data-testid="admin-user-row"]').filter({ hasText: member.email }).first().click({ timeout: 20000 });
    await O.wait('screen-admin-user');
    await O.text('not available here');
    await O.click('admin-user-grant');
    await O.fill('admin-ask-input', '7');
    await O.click('admin-ask-submit');
    await O.fill('admin-ask-input', 'QA journey goodwill');
    await O.click('admin-ask-submit');
    await O.wait('admin-step-up');
    await O.fill('admin-step-up-password', PASSWORD);
    await O.click('admin-step-up-submit');
    await O.text('Plus days given');
    const me = await j('/api/account/me', { token: member.token });
    if (me.entitlements.tier !== 'plus') throw new Error('Plus not active');
    await O.shot('user');
    return 'tier plus without any payment record';
  });
  await step('support: the request is readable and the reply reaches the person', async () => {
    await O.click('admin-nav-support');
    await O.wait('screen-admin-support');
    await O.page.locator('[data-testid="admin-ticket-row"]').filter({ hasText: SUBJECT }).first().click();
    await O.wait('screen-admin-ticket');
    await O.fill('admin-ticket-reply', 'We checked: it was a TEST payment, nothing was charged.');
    await O.click('admin-ticket-send');
    await O.text('Reply sent');
    const t = await j(`/api/support/tickets/${ticket.ticket.id}`, { token: member.token });
    if (!t.ticket.messages.some((m) => m.from === 'staff')) throw new Error('reply missing');
  });
  await step('safety: the automatic urgent report is a case; take it and close it with an outcome', async () => {
    await O.click('admin-nav-safety');
    await O.wait('screen-admin-safety');
    await O.page.locator('[data-testid="admin-safety-row"]').first().click();
    await O.wait('screen-admin-safety-case');
    await O.click('admin-safety-take');
    await O.text('You took this case');
    await O.click('admin-safety-outcome-resources_shared');
    await O.click('admin-safety-resolve');
    await O.text('Case closed');
    await O.shot('safety-case');
  });
  await step('country policy: a draft needs another reviewer', async () => {
    await O.click('admin-nav-policies');
    await O.wait('screen-admin-policies');
    await O.click('admin-policy-new');
    await O.fill('admin-policy-country', 'ge');
    await O.fill('admin-policy-source', 'QA placeholder, to be confirmed by counsel');
    await O.click('admin-policy-save');
    await O.text('Needs another reviewer');
  });
  for (const [nav, screen] of [
    ['professionals', 'screen-admin-professionals'],
    ['appointments', 'screen-admin-appointments'],
    ['rooms', 'screen-admin-community'],
    ['moderation', 'screen-admin-moderation'],
    ['ai', 'screen-admin-ai'],
    ['finance', 'screen-admin-finance'],
    ['security', 'screen-admin-security'],
    ['staff', 'screen-admin-staff'],
    ['audit', 'screen-admin-audit'],
    ['system', 'screen-admin-system'],
    ['protected', 'screen-admin-protected'],
    ['me', 'screen-admin-me'],
  ]) {
    await step(`page: ${nav}`, async () => {
      await O.click(`admin-nav-${nav}`);
      await O.wait(screen);
      await O.page.waitForTimeout(600);
      await O.shot(nav);
    });
  }
  await step('finance says TEST and not income', async () => {
    await O.click('admin-nav-finance');
    await O.text('not real money');
  });
  await step('settings: an announcement reaches Today', async () => {
    await O.click('admin-nav-settings');
    await O.wait('screen-admin-settings');
    await O.click('admin-announcement-active');
    await O.fill('admin-announcement-title-en', 'QA notice: short maintenance tonight');
    await O.click('admin-announcement-save');
    await O.fill('admin-ask-input', 'QA journey announcement');
    await O.click('admin-ask-submit');
    await O.text('Saved');
    const M = await client(member, { width: 390, height: 844 }, 'member');
    await M.go('/');
    await M.text('QA notice: short maintenance tonight', 40000);
    await M.shot('today-announcement');
    await M.click('today-announcement-close');
    // Switch it off again.
    await O.click('admin-announcement-active');
    await O.click('admin-announcement-save');
    await O.fill('admin-ask-input', 'QA cleanup');
    await O.click('admin-ask-submit');
    await O.text('Saved');
  });
  await step('audit log lists the grant', async () => {
    await O.click('admin-nav-audit');
    await O.text('entitlement.granted');
  });
} finally {
  await O.page.close();
}

const A = await client(analyst, { width: 390, height: 844 }, 'mobile-analyst');
await step('analyst on a phone: menu sheet, analytics only, no account lists', async () => {
  await A.go('/admin');
  await A.wait('screen-admin-overview', 60000);
  await A.click('admin-menu');
  await A.wait('admin-nav-analytics');
  if (await A.page.locator('[data-testid="admin-nav-users"]').count()) throw new Error('users visible to analyst');
  await A.page.waitForTimeout(700);
  await A.shot('menu');
  await A.click('admin-nav-analytics');
  await A.wait('screen-admin-analytics');
  await A.shot('analytics');
});

const K = await client(owner, { width: 1280, height: 860 }, 'georgian-dark', { lang: 'ka', theme: 'dark' });
await step('Georgian, dark mode', async () => {
  await K.go('/admin');
  await K.wait('screen-admin-overview', 60000);
  await K.text('ადმინისტრირების ცენტრი');
  await K.wait('admin-kpi-new', 30000);
  await K.page.waitForTimeout(800);
  await K.shot('overview');
});

const R = await client(owner, { width: 390, height: 844 }, 'arabic-rtl', { lang: 'ar' });
await step('Arabic (right to left) falls back to English text', async () => {
  await R.go('/admin/users');
  await R.wait('screen-admin-users', 60000);
  await R.shot('users');
});

await step('no page errors', async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});

await browser.close();
console.log(results.join('\n'));
fs.writeFileSync(path.join(OUT, 'results.txt'), results.join('\n'));
