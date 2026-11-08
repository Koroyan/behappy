// Opens every screen in a real browser and lists console errors and warnings
// per screen (the Expo web error overlay shows these since SDK 55).
//   npm run qa:console                       localhost:8081
//   npm run qa:console -- --app http://localhost:8084 --only admin
//
// Needs the dev API with --dev-tools (test code 123456) and ADMIN_TOKEN in
// server/.env for the admin pass (server/scripts/grant-role.mjs, never printed).
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
const ONLY = opt('only', 'all'); // all | user | admin
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const PASSWORD = 'calm-river-stone-42';

const j = async (p, { token, ...opts } = {}) => {
  const res = await fetch(APP + p, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} → ${res.status} ${body.error || ''}`);
  return body;
};
async function registered(tag) {
  const email = `${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@example.org`;
  const acct = await j('/api/account', { method: 'POST', body: '{}' });
  const reg = await j('/api/auth/register', { method: 'POST', token: acct.token, body: JSON.stringify({ email, password: PASSWORD }) });
  await j('/api/auth/verify-email', { method: 'POST', token: acct.token, body: JSON.stringify({ code: reg.testCode || '123456' }) });
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
  return { accountId: login.accountId, token: login.token, email, kind: 'password' };
}

const USER_ROUTES = [
  '/', '/tools', '/anulia', '/anulia/history', '/community', '/community/topics', '/community/guidelines', '/community/settings', '/specialists',
  '/profile', '/profile/personal', '/journal', '/journal/editor', '/cards', '/cards/history', '/art', '/art/gallery', '/breathing', '/meditation',
  '/grounding', '/assessments', '/assessments/phq9', '/insights', '/goals', '/safety', '/safety-plan', '/about', '/pricing', '/purchases',
  '/notifications', '/settings/notifications', '/appointments', '/messages', '/support', '/pro', '/pro/apply', '/pro/membership', '/account', '/account/create', '/account/sign-in',
  '/quiz', '/onboarding', '/explore', '/moderation',
];
const ADMIN_ROUTES = [
  '/admin', '/admin/analytics', '/admin/users', '/admin/support', '/admin/applications', '/admin/professionals', '/admin/policies', '/admin/appointments',
  '/admin/community', '/admin/moderation', '/admin/moderation/stats', '/admin/safety', '/admin/ai', '/admin/finance', '/admin/security', '/admin/staff',
  '/admin/settings', '/admin/protected', '/admin/audit', '/admin/system', '/admin/me',
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const findings = new Map(); // message -> Set(route@size)
const add = (msg, where) => {
  const key = msg.replace(/\s+/g, ' ').slice(0, 220);
  if (!findings.has(key)) findings.set(key, new Set());
  findings.get(key).add(where);
};
// Noise that is not about the app: dev-only bundler chatter, favicon, React DevTools hint.
const IGNORE = [/Download the React DevTools/i, /favicon/i, /\[HMR\]/, /Running application/i, /\[i18n\] missing key/];

async function sweep(user, routes, viewport, label, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(
    ({ acc, lang, onboarded }) => {
      try {
        if (onboarded) localStorage.setItem('@behappy_onboarding_v2', 'done');
        localStorage.setItem('@behappy_language', lang);
        localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now(), kind: acc.kind || 'device' }));
      } catch {}
    },
    { acc: user, lang: extra.lang || 'en', onboarded: true }
  );
  const page = await ctx.newPage();
  let where = '';
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const text = m.text();
    if (IGNORE.some((r) => r.test(text))) return;
    // Chrome's own "Failed to load resource" lines: the [http …] entries name the request.
    if (/^Failed to load resource/.test(text)) return;
    add(`[${m.type()}] ${text}`, where);
  });
  page.on('pageerror', (e) => add(`[pageerror] ${e.message}`, where));
  // Which request failed (the console line itself doesn't say).
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const u = new URL(res.url());
    add(`[http ${res.status()}] ${res.request().method()} ${u.pathname}`, where);
  });
  for (const r of routes) {
    where = `${r} @${label}`;
    try {
      await page.goto(APP + r, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      add(`[navigation] ${String(e.message).split('\n')[0]}`, where);
    }
  }
  await ctx.close();
}

const device = await j('/api/account', { method: 'POST', body: '{}' });
if (ONLY !== 'admin') {
  const member = await registered('qa-sweep');
  await sweep(device, USER_ROUTES, { width: 390, height: 844 }, 'phone-device');
  await sweep(member, USER_ROUTES, { width: 1440, height: 900 }, 'desktop-member');
}
if (ONLY !== 'user') {
  const owner = await registered('qa-sweep-owner');
  execFileSync(process.execPath, ['server/scripts/grant-role.mjs', owner.email, 'owner'], { cwd: repo, stdio: 'ignore' });
  await sweep(owner, ADMIN_ROUTES, { width: 1440, height: 900 }, 'admin-desktop');
  await sweep(owner, ADMIN_ROUTES, { width: 390, height: 844 }, 'admin-phone', { lang: 'ka' });
}
await browser.close();

if (!findings.size) console.log('no console errors or warnings');
for (const [msg, where] of findings) {
  const list = [...where];
  console.log(`\n${msg}\n   on ${list.length} screen(s): ${list.slice(0, 6).join(', ')}${list.length > 6 ? ' …' : ''}`);
}
process.exit(findings.size ? 1 : 0);
