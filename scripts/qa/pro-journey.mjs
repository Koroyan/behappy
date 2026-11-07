// End-to-end: a psychologist applies, an admin verifies them, the free trial
// starts, they publish, a client books, the booking is confirmed, both sides
// message each other, and the professional opens the Flitt TEST checkout.
//   node scripts/qa/pro-journey.mjs --out ./qa-shots [--app http://localhost:8081] [--pay]
// Needs the dev stack (proxy + Expo + API with --dev-tools, so codes are 123456)
// and ADMIN_TOKEN in server/.env (used by server/scripts/grant-role.mjs, never printed).
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
const OUT = path.resolve(opt('out', './qa-shots/pro'));
const PAY = process.argv.includes('--pay');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const TUNNEL = { 'ngrok-skip-browser-warning': '1' };
const CODE = '123456';

const results = [];
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
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
  const email = `${tag}-${Date.now().toString(36)}@example.org`;
  const password = 'calm-river-stone-42';
  const acct = await j('/api/account', { method: 'POST', body: '{}' });
  const reg = await j('/api/auth/register', { method: 'POST', token: acct.token, body: JSON.stringify({ email, password }) });
  await j('/api/auth/verify-email', { method: 'POST', token: acct.token, body: JSON.stringify({ code: reg.testCode || CODE }) });
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  return { accountId: login.accountId, token: login.token, email };
}

const unique = Date.now().toString(36).slice(-4);
const PRO_NAME = `Nino Beridze ${unique}`;
// A fresh phone each run: the free trial is once per phone, email and licence.
const PHONE = `+9955${String(Date.now()).slice(-8)}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const files = Object.fromEntries(['identity', 'degree', 'license'].map((k) => [k, path.join(OUT, `${k}.png`)]));
for (const f of Object.values(files)) fs.writeFileSync(f, png);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
async function client(user, viewport, label) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (!APP.startsWith('http://localhost')) {
    const host = new URL(APP).host;
    await ctx.route((url) => url.host === host, (route) => route.continue({ headers: { ...route.request().headers(), ...TUNNEL } }));
  }
  await ctx.addInitScript((acc) => {
    try {
      localStorage.setItem('@behappy_onboarding_v2', 'done');
      localStorage.setItem('@behappy_language', 'en');
      localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now(), kind: 'password' }));
    } catch {}
  }, user);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  const id = (t) => `[data-testid="${t}"]`;
  return {
    ctx,
    page,
    id,
    go: (p) => page.goto(APP + p, { waitUntil: 'load', timeout: 90000 }),
    wait: (t, timeout = 30000) => page.waitForSelector(id(t), { timeout }),
    click: (t) => page.click(id(t)),
    fill: (t, v) => page.fill(id(t), v),
    text: (s, timeout = 20000) => page.getByText(s).filter({ visible: true }).first().waitFor({ timeout }),
    shot: (name) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: true }),
  };
}

const pro = await registered('pro');
const admin = await registered('admin');
const member = await registered('client');
execFileSync(process.execPath, ['server/scripts/grant-role.mjs', admin.email, 'admin'], { cwd: repo, stdio: 'ignore' });

const P = await client(pro, { width: 390, height: 844 }, 'pro');
const A = await client(admin, { width: 1440, height: 900 }, 'admin');
const C = await client(member, { width: 375, height: 812 }, 'client');
let proId = null;

try {
  await step('pro: join page shows price, trial and 0% commission', async () => {
    await P.go('/pro');
    await P.wait('screen-pro-join', 60000);
    await P.text(/per 30 days/);
    await P.text(/0% commission/);
    await P.shot('1-join');
    await P.click('pro-apply');
    await P.wait('apply-legal-name');
    return 'application started';
  });

  await step('pro: phone confirmed with the test code', async () => {
    await P.fill('apply-phone', PHONE);
    await P.click('apply-send-code');
    await P.wait('apply-code');
    await P.fill('apply-code', CODE);
    await P.click('apply-confirm-code');
    await P.text('Phone confirmed');
  });

  await step('pro: identity saved', async () => {
    await P.fill('apply-legal-name', 'Nino Beridze');
    await P.fill('apply-public-name', PRO_NAME);
    await P.fill('apply-country', 'GE');
    await P.fill('apply-city', 'Tbilisi');
    await P.fill('apply-contact-email', pro.email);
    await P.shot('2-identity');
    await P.click('apply-save');
    await P.wait('apply-qual-title-0');
  });

  await step('pro: documents uploaded (file chooser) and qualifications saved', async () => {
    for (const kind of ['identity', 'degree', 'license']) {
      await P.click(`doc-kind-${kind}`);
      const [chooser] = await Promise.all([P.page.waitForEvent('filechooser', { timeout: 15000 }), P.click('apply-upload')]);
      await chooser.setFiles(files[kind]);
      await P.text(new RegExp(`${kind}\\.png`));
    }
    await P.fill('apply-qual-title-0', 'MSc Clinical Psychology');
    await P.click('apply-add-qual');
    await P.fill('apply-qual-title-1', 'Licensed psychologist');
    await P.shot('3-qualifications');
    await P.click('apply-save');
    await P.wait('apply-bio');
    return '3 documents';
  });

  await step('pro: practice saved (bio, languages confirmed, focus, experience)', async () => {
    await P.fill('apply-bio', 'I work with adults who live with anxiety, panic and stress. Sessions are calm, structured and practical, in Georgian or English.');
    await P.click('apply-lang-ka');
    await P.click('apply-lang-en');
    await P.click('apply-confirm-languages');
    await P.click('apply-spec-anxiety');
    await P.click('apply-spec-panic');
    await P.fill('apply-experience', '7');
    await P.shot('4-practice');
    await P.click('apply-save');
    await P.wait('apply-service-title-0');
  });

  await step('pro: sessions and policies saved', async () => {
    await P.fill('apply-service-title-0', 'Individual session');
    await P.fill('apply-service-price-0', '90');
    await P.fill('apply-payment', 'Bank transfer after the session.');
    await P.fill('apply-cancellation', 'Free cancellation until 24 hours before.');
    await P.shot('5-services');
    await P.click('apply-save');
    await P.wait('apply-day-1');
  });

  await step('pro: weekly hours saved and application sent', async () => {
    for (const d of [1, 2, 3, 4, 5, 6, 7]) await P.click(`apply-day-${d}`);
    await P.shot('6-hours');
    await P.click('apply-save');
    await P.wait('apply-submit');
    await P.text('Everything needed is here.');
    await P.click('apply-submit');
    await P.text(/Sent: waiting for review|Sent\. You’ll get a notification/);
    await P.shot('7-sent');
    proId = (await j('/api/pro/me', { token: pro.token })).profile.id;
    return proId;
  });

  await step('client: the unverified profile is not in the directory', async () => {
    const list = await j(`/api/pros?q=${encodeURIComponent(unique)}`, { token: member.token });
    if (list.professionals.some((x) => x.id === proId)) throw new Error('listed before verification');
  });

  await step('admin: review desk shows the application; approve with checklist', async () => {
    await A.go('/admin/applications');
    await A.wait('screen-admin-applications', 60000);
    await A.text(PRO_NAME);
    await A.shot('1-queue');
    await A.page.getByText(PRO_NAME).filter({ visible: true }).first().click();
    await A.wait('screen-admin-application');
    await A.wait('admin-action-start_review');
    await A.click('admin-action-start_review');
    await A.wait('admin-action-approve');
    for (const k of ['identity_matches', 'degree_verified', 'license_checked', 'languages_plausible', 'profile_appropriate', 'no_conflicts']) await A.click(`admin-check-${k}`);
    await A.shot('2-review');
    await A.click('admin-action-approve');
    await A.wait('confirm-accept');
    await A.click('confirm-accept');
    await A.wait('admin-action-suspend');
    await A.shot('3-approved');
    return 'start_review → approve';
  });

  await step('pro: verified, free trial active, publish → listed', async () => {
    await P.go('/pro');
    await P.wait('screen-pro', 60000);
    await P.text('Free trial');
    await P.wait('pro-publish');
    await P.click('pro-publish');
    await P.text('Listed in the directory');
    await P.shot('8-dashboard');
  });

  await step('client: finds the specialist and requests a session', async () => {
    await C.go('/specialists');
    await C.wait('screen-specialists', 60000);
    await C.fill('specialists-search', unique);
    await C.wait(`pro-${proId}`);
    await C.shot('1-directory');
    await C.click(`pro-${proId}`);
    await C.wait('specialist-book');
    await C.wait('verified-info');
    await C.shot('2-profile');
    await C.click('specialist-book');
    await C.wait('screen-book');
    await C.page.locator(C.id('slot-day')).nth(1).click();
    await C.page.locator(C.id('slot-time')).first().click();
    await C.fill('book-name', 'Luka');
    await C.fill('book-note', 'First session, please.');
    await C.shot('3-book');
    await C.click('book-submit');
    await C.wait('screen-book-done');
    await C.text('Request sent');
    await C.shot('4-requested');
  });

  await step('pro: confirms the request', async () => {
    await P.go('/pro/bookings');
    await P.wait('pro-booking-confirm', 60000);
    await P.text('First session, please.');
    await P.shot('9-request');
    await P.click('pro-booking-confirm');
    await P.page.waitForSelector(P.id('pro-booking-confirm'), { state: 'detached', timeout: 20000 });
  });

  await step('client: sees the confirmed appointment and messages the specialist', async () => {
    await C.go('/appointments');
    await C.wait('appointment-row', 60000);
    await C.text('Confirmed');
    await C.page.locator(C.id('appointment-row')).filter({ visible: true }).first().click();
    await C.wait('screen-appointment');
    await C.shot('5-appointment');
    await C.page.getByText('Message', { exact: true }).filter({ visible: true }).first().click();
    await C.wait('thread-composer');
    await C.fill('thread-composer', `Hello, see you soon ${unique}`);
    await C.click('composer-send');
    await C.text(`Hello, see you soon ${unique}`);
    await C.shot('6-thread');
  });

  await step('pro: message arrives; reply reaches the client live', async () => {
    await P.go('/messages');
    await P.wait('thread-row', 60000);
    await P.page.locator(P.id('thread-row')).filter({ visible: true }).first().click();
    await P.wait('screen-thread');
    await P.text(`Hello, see you soon ${unique}`);
    results.push('  · pro sees the client message');
    await P.fill('thread-composer', `Thank you, Luka ${unique}`);
    await P.click('composer-send');
    await C.text(`Thank you, Luka ${unique}`, 20000);
    await P.shot('10-thread');
    return 'no reload on the client';
  });

  await step('pro: notifications list the booking request and verification', async () => {
    await P.go('/notifications');
    await P.wait('notification-row', 60000);
    await P.text(/asked to book|New booking/);
    await P.text('Update on your verification');
    await P.shot('11-notifications');
  });

  await step('pro: membership page and Flitt TEST checkout', async () => {
    await P.go('/pro/membership');
    await P.wait('membership-pay', 60000);
    await P.text(/Free trial until/);
    await P.text(/TEST payments only/);
    await P.shot('12-membership');
    await P.click('membership-pay');
    await P.page.waitForURL(/pay\.flitt\.com/, { timeout: 60000 });
    if (!PAY) return 'reached Flitt TEST checkout (not paid: run with --pay)';
    // On narrow screens Flitt first shows a list of payment methods.
    const cardInput = P.page.locator('input[name="f-card_number"]');
    await P.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    if (!(await cardInput.isVisible().catch(() => false))) await P.page.getByText('Card', { exact: true }).first().click();
    await cardInput.waitFor({ timeout: 60000 });
    await P.shot('13a-flitt-card');
    await P.page.fill('input[name="f-card_number"]', '4444555511116666');
    await P.page.fill('input[name="f-expiry_date"]', '1230');
    await P.page.fill('input[name="f-cvv2"]', '123');
    await P.page.locator('button', { hasText: /Pay\s+[\d.,]+\s*GEL/i }).first().click();
    await P.page.waitForURL(/\/checkout\/result/, { timeout: 120000 });
    await P.text('Your BeHappy Professional pass is active', 120000);
    await P.shot('13b-paid');
    const m = await j('/api/pro/membership', { token: pro.token });
    const paid = m.periods.filter((x) => x.kind === 'paid' && !x.revokedAt);
    if (!paid.length) throw new Error('no paid period after the verified payment');
    const receiptOrder = m.orders.find((o) => o.status === 'approved');
    await P.go(`/pro/receipt/${receiptOrder.id}`);
    await P.text('Receipt number');
    await P.shot('14-receipt');
    return `paid period until ${new Date(paid[paid.length - 1].endsAt).toISOString().slice(0, 10)}`;
  });

  await step('admin center: overview, the professional listed in the directory, TEST revenue in finance', async () => {
    await A.go('/admin');
    await A.wait('admin-kpi-new', 60000);
    await A.shot('4-overview');
    await A.go('/admin/professionals');
    await A.wait('screen-admin-professionals', 60000);
    await A.page.locator('[data-testid="admin-pro-row"]').filter({ hasText: PRO_NAME }).filter({ hasText: 'Listed' }).first().waitFor({ timeout: 30000 });
    await A.go('/admin/finance');
    await A.wait('screen-admin-finance', 60000);
    await A.text('not real money');
    await A.shot('5-finance');
  });
} catch {
  // The failing step is already recorded; keep what each person saw.
  for (const [who, c] of [['pro', P], ['admin', A], ['client', C]]) await c.page.screenshot({ path: path.join(OUT, `fail-${who}.png`), fullPage: true }).catch(() => {});
} finally {
  for (const [who, c] of [['pro', P], ['admin', A], ['client', C]]) if (c.page.errors.length) results.push(`WARN ${who} page errors: ${[...new Set(c.page.errors)].slice(0, 3).join(' | ')}`);
  await browser.close();
  // Test-account sessions for follow-up QA (dev server only; written to --out, never the repo).
  fs.writeFileSync(path.join(OUT, 'accounts.json'), JSON.stringify({ app: APP, proId, pro, admin, member }, null, 2));
  console.log(results.join('\n'));
  fs.writeFileSync(path.join(OUT, 'results.txt'), results.join('\n') + '\n');
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
}
