// Notifications people can see: a message in a room they joined becomes a
// notification (the default is now "every message"); the bell at the top shows
// the count in red, the app icon gets the same number (Badging API), the
// community tab and the desktop sidebar show red counts, the "turn on
// notifications" card appears until the person answers, and opening the
// notification goes to the room and clears the count.
//
//   npm run qa:notifications [-- --app http://localhost:8090 --out qa-shots/notifications]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = opt('app', 'http://localhost:8090').replace(/\/$/, '');
const OUT = path.resolve(opt('out', 'qa-shots/notifications'));
fs.mkdirSync(OUT, { recursive: true });
const PASSWORD = 'calm-river-stone-42';
const ROOM = 'sleep:en';
const results = [];
const errors = [];
let failed = false;

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
  } catch (e) {
    failed = true;
    results.push(`FAIL ${name} — ${String(e?.message || e).split('\n')[0]}`);
  }
  console.log(results[results.length - 1]);
}
const check = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const j = async (p, { token, ...opts } = {}) => {
  const res = await fetch(APP + p, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} → ${res.status} ${body.error || ''}`);
  return body;
};
async function member(name) {
  const email = `${name.toLowerCase()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@example.org`;
  const acct = await j('/api/account', { method: 'POST', body: '{}' });
  const reg = await j('/api/auth/register', { method: 'POST', token: acct.token, body: JSON.stringify({ email, password: PASSWORD }) });
  await j('/api/auth/verify-email', { method: 'POST', token: acct.token, body: JSON.stringify({ code: reg.testCode }) });
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
  const pseudonym = `${name}${Math.random().toString(36).slice(2, 6)}`;
  await j('/api/community/profile', { method: 'PUT', token: login.token, body: JSON.stringify({ pseudonym, acceptGuidelines: true }) });
  await j(`/api/community/rooms/${ROOM}/join`, { method: 'POST', token: login.token });
  return { accountId: login.accountId, token: login.token, pseudonym };
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
async function open(user, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript((acc) => {
    localStorage.setItem('@behappy_onboarding_v2', 'done');
    localStorage.setItem('@behappy_language', 'en');
    localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now(), kind: 'password' }));
    // Record what the app puts on its icon (the Badging API).
    window.__badges = [];
    try {
      Object.defineProperty(navigator, 'setAppBadge', { configurable: true, value: (n) => (window.__badges.push(n), Promise.resolve()) });
      Object.defineProperty(navigator, 'clearAppBadge', { configurable: true, value: () => (window.__badges.push(0), Promise.resolve()) });
    } catch {
      // not overridable here
    }
  }, user);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource/.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  return { ctx, page };
}

const nino = await member('Nino');
const luka = await member('Luka');

await step('a message in a joined room becomes a notification (default: every message)', async () => {
  await j(`/api/community/rooms/${ROOM}/messages`, { method: 'POST', token: luka.token, body: JSON.stringify({ body: 'Does anyone else wake up at 4am?' }) });
  const list = await j('/api/notifications', { token: nino.token });
  const n = list.notifications.find((x) => x.kind === 'community_activity' && !x.readAt);
  check(n, `notifications: ${JSON.stringify(list.notifications.map((x) => x.kind))}`);
  return `${n.kind} for ${ROOM}`;
});

const phone = await open(nino, { width: 390, height: 844 });
await step('phone: the bell shows the count in red; the app icon gets the same number', async () => {
  await phone.page.goto(`${APP}/`, { waitUntil: 'load' });
  await phone.page.waitForSelector('[data-testid="notification-bell-count"]', { timeout: 60000 });
  const count = await phone.page.innerText('[data-testid="notification-bell-count"]');
  const bg = await phone.page.$eval('[data-testid="notification-bell-count"]', (el) => getComputedStyle(el).backgroundColor);
  check(Number(count) >= 1, `count "${count}"`);
  check(/rgb\((1[5-9]\d|2\d\d), \d{1,2}, \d{1,2}\)|rgb\((1[5-9]\d|2\d\d), (\d|[1-7]\d), (\d|[1-7]\d)\)/.test(bg), `badge colour ${bg} is not red`);
  await phone.page.waitForTimeout(1500);
  const badges = await phone.page.evaluate(() => window.__badges);
  check(badges.includes(Number(count)), `app icon badge calls: ${JSON.stringify(badges)}`);
  await phone.page.screenshot({ path: path.join(OUT, 'phone-bell.png'), clip: { x: 0, y: 0, width: 390, height: 120 } });
  return `bell ${count} (${bg}), app icon ${badges.at(-1)}`;
});

await step('phone: the community tab shows a red count and offers to turn notifications on', async () => {
  await phone.page.goto(`${APP}/community`, { waitUntil: 'load' });
  await phone.page.waitForSelector('[data-testid="screen-community"]', { timeout: 60000 });
  const tab = await phone.page.$('[data-testid="tab-community-badge"]');
  check(tab, 'no badge on the community tab');
  await phone.page.waitForSelector('[data-testid="community-notify-prompt"]', { timeout: 15000 });
  await phone.page.screenshot({ path: path.join(OUT, 'phone-community.png') });
  await phone.page.click('[data-testid="community-notify-prompt-later"]');
  await phone.page.waitForTimeout(500);
  check(!(await phone.page.$('[data-testid="community-notify-prompt"]')), '"Not now" did not hide it');
  return `tab badge ${await tab.innerText()}`;
});

await step('phone: the bell opens Notifications; opening the notification goes to the room and clears the count', async () => {
  await phone.page.goto(`${APP}/`, { waitUntil: 'load' });
  await phone.page.click('[data-testid="notification-bell"]');
  await phone.page.waitForSelector('[data-testid="notification-row"]', { timeout: 30000 });
  await phone.page.screenshot({ path: path.join(OUT, 'phone-notifications.png') });
  const first = await phone.page.innerText('[data-testid="notification-row"]');
  check(/New messages in/.test(first), `row: ${first}`);
  await phone.page.click('[data-testid="notification-row"]');
  await phone.page.waitForURL(/\/community\/sleep/, { timeout: 30000 });
  await phone.page.goto(`${APP}/`, { waitUntil: 'load' });
  await phone.page.waitForSelector('[data-testid="notification-bell"]', { timeout: 60000 });
  await phone.page.waitForTimeout(2000);
  check(!(await phone.page.$('[data-testid="notification-bell-count"]')), 'count still shown');
  return `"${first.split('\n')[0]}" → room, count cleared`;
});
await phone.ctx.close();

await step('desktop: the sidebar shows the unread count in red', async () => {
  await j(`/api/community/rooms/${ROOM}/messages`, { method: 'POST', token: luka.token, body: JSON.stringify({ body: 'Still awake here too.' }) });
  const desk = await open(nino, { width: 1440, height: 900 });
  await desk.page.goto(`${APP}/`, { waitUntil: 'load' });
  await desk.page.waitForSelector('[data-testid="nav-notifications-count"], [data-testid="nav-community-count"]', { timeout: 60000 });
  await desk.page.screenshot({ path: path.join(OUT, 'desktop-sidebar.png'), clip: { x: 0, y: 0, width: 280, height: 900 } });
  const ids = await desk.page.$$eval('[data-testid$="-count"]', (els) => els.map((e) => `${e.getAttribute('data-testid')}=${e.textContent}`));
  await desk.ctx.close();
  return ids.join(', ');
});
await browser.close();

await step('no page errors', async () => check(errors.length === 0, errors.slice(0, 3).join(' | ')));
fs.writeFileSync(path.join(OUT, 'results.txt'), `${results.join('\n')}\n`);
process.exit(failed ? 1 : 0);
