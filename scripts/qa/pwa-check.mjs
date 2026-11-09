// The installable web app, checked in Chrome against the production build.
//
//   npm run build:web && npm run pwa:serve        (another terminal; API on 8787)
//   npm run qa:pwa [-- --app http://localhost:8090 --dist dist --out <folder>]
//
// Checks: the manifest and Chrome's own installability verdict; the HTML shell
// (viewport-fit, iOS tags); the service worker controls the page; nothing from
// /api or another origin is cached; offline: a visited page opens from the
// cache and an unvisited one shows the offline page; a new deployment shows
// "Refresh" and switches only when tapped; a push message becomes a
// notification with the right link; the install card (iPhone) and the
// iPhone "add to Home Screen first" notice; no page errors, no hydration errors.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = opt('app', 'http://localhost:8090').replace(/\/$/, '');
const DIST = path.resolve(opt('dist', 'dist'));
const OUT = path.resolve(opt('out', 'qa-shots/pwa'));
fs.mkdirSync(OUT, { recursive: true });

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const results = [];
const pageErrors = [];
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

function watch(page, label) {
  page.on('pageerror', (e) => pageErrors.push(`[${label}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    const text = m.text();
    // Offline steps fail their API calls on purpose.
    if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::ERR|status of 50[234]/.test(text)) pageErrors.push(`[${label}] console: ${text.slice(0, 300)}`);
  });
}

const swState = (page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const keys = await caches.keys();
    const entries = {};
    for (const k of keys) entries[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
    return { controlled: Boolean(navigator.serviceWorker.controller), active: reg?.active?.scriptURL || null, waiting: Boolean(reg?.waiting), keys, entries };
  });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const seed = (lang = 'en') => {
  localStorage.setItem('@behappy_onboarding_v2', 'done');
  localStorage.setItem('@behappy_language', lang);
};

// ---------- Android-like phone (Chrome) ----------
// A real (persistent) profile: Chrome neither installs web apps nor allows
// Web Push in incognito, which is what a plain Playwright context is.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'behappy-pwa-'));
const ctx = await chromium.launchPersistentContext(profile, { headless: true, channel: 'chrome', viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(seed);
const page = ctx.pages()[0] || (await ctx.newPage());
watch(page, 'android');
const cdp = await ctx.newCDPSession(page);

await step('HTML shell: manifest link, viewport-fit=cover, iOS home-screen tags, theme colours', async () => {
  const res = await page.goto(`${APP}/`, { waitUntil: 'load' });
  check(res.ok(), `home answered ${res.status()}`);
  const head = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
    viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content'),
    apple: document.querySelector('meta[name=apple-mobile-web-app-capable]')?.getAttribute('content'),
    status: document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.getAttribute('content'),
    touch: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
    themes: [...document.querySelectorAll('meta[name=theme-color]')].length,
    scripts: document.querySelectorAll('script[src*="/_expo/static/"]').length,
  }));
  check(head.manifest === '/manifest.webmanifest', 'manifest link');
  check(/viewport-fit=cover/.test(head.viewport || ''), 'viewport-fit=cover');
  check(head.apple === 'yes' && head.status === 'black-translucent' && head.touch, 'iOS tags');
  check(head.themes === 2, 'theme-color for light and dark');
  check(head.scripts > 0, 'app scripts present');
  return `${head.scripts} scripts`;
});

await step('the app starts from the production build (Today)', async () => {
  await page.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
});

await step('service worker installs, controls the page and installs the app shell', async () => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
  const s = await swState(page);
  check(s.controlled, 'page not controlled by the service worker');
  check(/\/sw\.js$/.test(s.active || ''), `active worker: ${s.active}`);
  const statics = Object.entries(s.entries).find(([k]) => k.startsWith('bh-static-'));
  check(statics, `no static cache (${s.keys.join(', ')})`);
  check(statics[1].includes('/offline.html') && statics[1].some((p) => p.includes('/_expo/static/js/web/entry-')), 'offline page and entry script installed');
  return `${statics[1].length} files in ${statics[0]}`;
});

await step('Chrome: installable (no installability errors) and the manifest parses cleanly', async () => {
  const errors = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors || [];
  check(errors.length === 0, `installability errors: ${JSON.stringify(errors)}`);
  const m = await cdp.send('Page.getAppManifest');
  check(!m.errors?.length, `manifest errors: ${JSON.stringify(m.errors)}`);
  const parsed = JSON.parse(m.data);
  check(parsed.display === 'standalone' && parsed.icons.some((i) => i.purpose === 'maskable'), 'standalone + maskable icon');
  return `${parsed.name}, ${parsed.icons.length} icons, ${parsed.shortcuts.length} shortcuts`;
});

await step('visited pages and static files are cached; API answers never are', async () => {
  for (const route of ['/journal', '/steps', '/settings/notifications']) {
    await page.goto(`${APP}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
  }
  await page.evaluate(() => fetch('/api/health').then((r) => r.text()));
  await page.waitForTimeout(1500);
  const s = await swState(page);
  const all = Object.values(s.entries).flat();
  check(!all.some((p) => p.startsWith('/api') || p.startsWith('/socket.io')), `API cached: ${all.filter((p) => p.startsWith('/api'))}`);
  const pages = Object.entries(s.entries).find(([k]) => k.startsWith('bh-pages-'))?.[1] || [];
  check(pages.includes('/journal') && pages.includes('/steps'), `pages cached: ${pages.join(', ')}`);
  return `${pages.length} pages, ${all.length} entries, none from /api`;
});

await step('offline: a visited page opens from the cache, an unvisited one shows the offline page', async () => {
  await ctx.setOffline(true);
  try {
    await page.goto(`${APP}/journal`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="screen-journal"]', { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, 'offline-journal.png') });
    await page.goto(`${APP}/pricing`, { waitUntil: 'load' });
    const text = await page.innerText('body');
    check(/You're offline/.test(text) && /112/.test(text), `offline page not shown: ${text.slice(0, 120)}`);
    await page.screenshot({ path: path.join(OUT, 'offline-page.png') });
  } finally {
    await ctx.setOffline(false);
  }
  await page.goto(`${APP}/`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
  return 'cached journal + offline page with the emergency number';
});

await step('a push message becomes a notification (title, text, link) via the service worker', async () => {
  await ctx.grantPermissions(['notifications'], { origin: APP });
  await cdp.send('ServiceWorker.enable');
  const reg = await new Promise((resolve) => {
    cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => {
      const r = e.registrations.find((x) => x.scopeURL.startsWith(APP));
      if (r) resolve(r);
    });
  });
  const data = JSON.stringify({ title: 'BeHappy', body: 'A few minutes for your journal?', url: '/journal/editor', kind: 'reminder', tag: 'behappy-reminder-journal' });
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: `${APP}/`, registrationId: reg.registrationId, data });
  let shown = [];
  for (let i = 0; i < 20 && !shown.length; i += 1) {
    await page.waitForTimeout(250);
    shown = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({ title: n.title, body: n.body, tag: n.tag, url: n.data?.url })));
  }
  check(shown.length === 1, `notifications: ${JSON.stringify(shown)}`);
  check(shown[0].body === 'A few minutes for your journal?' && shown[0].url === '/journal/editor' && shown[0].tag === 'behappy-reminder-journal', JSON.stringify(shown[0]));
  // A link to another site is never followed.
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: `${APP}/`, registrationId: reg.registrationId, data: JSON.stringify({ title: 'x', body: 'y', url: '//evil.example/', tag: 'behappy-chats' }) });
  await page.waitForTimeout(800);
  const evil = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications({ tag: 'behappy-chats' })).map((n) => n.data?.url));
  check(evil[0] === '/', `unsafe link kept: ${evil}`);
  return 'reminder shown with /journal/editor; a foreign link became "/"';
});

await step('Web Push: subscribing this browser and sending a reminder plan to the server', async () => {
  // Uses the real browser API. Headless Chrome may have no push service: then report it, don't fake it.
  const r = await page.evaluate(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch('/api/push/web-key')).json();
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      return { ok: true, endpoint: sub.endpoint };
    } catch (e) {
      return { ok: false, error: `${e.name}: ${e.message}` };
    }
  });
  if (!r.ok) return `NOT VERIFIED here: headless Chrome has no push service (${r.error}); server side covered by tests with real encryption`;
  check(/^https:\/\/fcm\.googleapis\.com\//.test(r.endpoint), `endpoint ${r.endpoint}`);
  // The app's own registration path: the server accepts this browser and a reminder plan for it.
  const reg = await page.evaluate(async (endpoint) => {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    const account = JSON.parse(localStorage.getItem('@behappy_account_v1') || 'null');
    return { endpoint, keys: sub.toJSON().keys, token: account?.token || null };
  }, r.endpoint);
  if (!reg.token) return `subscribed at ${new URL(r.endpoint).host} (no account token found to register)`;
  const post = await fetch(`${APP}/api/push/devices`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` }, body: JSON.stringify({ token: reg.endpoint, platform: 'web', keys: reg.keys, chats: false, language: 'en', tz: 'UTC' }) });
  check(post.ok, `register: ${post.status}`);
  const at = Date.now() + 60 * 60 * 1000;
  const plan = await fetch(`${APP}/api/push/reminders`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` }, body: JSON.stringify({ token: reg.endpoint, reminders: [{ id: 'journal-qa', kind: 'journal', at, title: 'BeHappy', body: 'A few minutes for your journal?', url: '/journal/editor' }] }) });
  check(plan.ok, `plan: ${plan.status}`);
  const json = await plan.json();
  check(json.pending?.[0]?.id === 'journal-qa', JSON.stringify(json));
  // End to end: the server's worker sends a reminder due in a few seconds through the real push
  // service to this browser, and the service worker shows it.
  const soon = await fetch(`${APP}/api/push/reminders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` },
    body: JSON.stringify({ token: reg.endpoint, reminders: [{ id: 'cards-qa', kind: 'cards', at: Date.now() + 3000, title: 'BeHappy', body: 'Pick a card and see what it brings up.', url: '/cards' }] }),
  });
  check(soon.ok, `plan: ${soon.status}`);
  let arrived = null;
  for (let i = 0; i < 60 && !arrived; i += 1) {
    await page.waitForTimeout(1500);
    arrived = await page.evaluate(async () => {
      const n = (await (await navigator.serviceWorker.ready).getNotifications({ tag: 'behappy-reminder-cards' }))[0];
      return n ? { body: n.body, url: n.data?.url } : null;
    });
  }
  if (!arrived) return `subscribed at ${new URL(r.endpoint).host}; server accepted it; the reminder did NOT arrive within 90 s (headless Chrome may not receive from the push service)`;
  check(arrived.url === '/cards', JSON.stringify(arrived));
  return `server → ${new URL(r.endpoint).host} → this browser: the reminder arrived ("${arrived.body}")`;
});

await step('a new deployment: "Refresh" appears, nothing switches until it is tapped', async () => {
  const swFile = path.join(DIST, 'sw.js');
  const original = fs.readFileSync(swFile, 'utf8');
  const before = (await swState(page)).keys.find((k) => k.startsWith('bh-static-'));
  try {
    fs.writeFileSync(swFile, original.replace(/const BUILD = "([0-9a-f]+)"/, 'const BUILD = "qa$1"'));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/')).update());
    await page.waitForSelector('[data-testid="pwa-update"]', { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, 'update-banner.png') });
    check((await swState(page)).keys.includes(before), 'the old version is still in use before Refresh');
    await Promise.all([page.waitForEvent('load', { timeout: 30000 }), page.click('[data-testid="pwa-update-refresh"]')]);
    await page.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
    const after = await swState(page);
    const now = after.keys.find((k) => k.startsWith('bh-static-'));
    check(now && now.startsWith('bh-static-qa') && !after.keys.includes(before), `caches after refresh: ${after.keys.join(', ')}`);
    return `${before} → ${now}, old caches removed`;
  } finally {
    fs.writeFileSync(swFile, original);
  }
});
await ctx.close();

// ---------- iPhone (Safari in a tab) ----------
const ios = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE_UA });
await ios.addInitScript(seed);
const ip = await ios.newPage();
watch(ip, 'iphone');

await step('iPhone: from the second visit Today offers "Install BeHappy" with the steps (no fake install button)', async () => {
  await ip.goto(`${APP}/`, { waitUntil: 'load' });
  await ip.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
  await ip.waitForTimeout(1500);
  check(!(await ip.$('[data-testid="install-card"]')), 'shown on the first visit');
  await ip.reload({ waitUntil: 'load' });
  await ip.waitForSelector('[data-testid="install-card"]', { timeout: 30000 });
  const label = await ip.innerText('[data-testid="install-card-go"]');
  check(/Show me how/.test(label), `button: ${label}`);
  await ip.screenshot({ path: path.join(OUT, 'iphone-install-card.png') });
  await ip.click('[data-testid="install-card-go"]');
  await ip.waitForSelector('[data-testid="screen-install"]', { timeout: 30000 });
  const first = await ip.evaluate(() => {
    const ids = [...document.querySelectorAll('[data-testid^="install-"]')].map((e) => e.getAttribute('data-testid'));
    return ids.filter((i) => ['install-ios', 'install-android', 'install-desktop'].includes(i));
  });
  check(first[0] === 'install-ios', `order: ${first.join(', ')}`);
  check(!(await ip.$('[data-testid="install-now"]')), 'no install button on iOS');
  await ip.screenshot({ path: path.join(OUT, 'iphone-install-steps.png'), fullPage: false });
  return 'card → steps, iPhone first';
});

await step('iPhone: "Not now" hides the card', async () => {
  await ip.goto(`${APP}/`, { waitUntil: 'load' });
  await ip.waitForSelector('[data-testid="install-card"]', { timeout: 30000 });
  await ip.click('[data-testid="install-card-later"]');
  await ip.waitForTimeout(500);
  check(!(await ip.$('[data-testid="install-card"]')), 'still shown');
  await ip.reload({ waitUntil: 'load' });
  await ip.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
  await ip.waitForTimeout(1500);
  check(!(await ip.$('[data-testid="install-card"]')), 'back after reload');
});

await step('iPhone in Safari: reminders explain "add to Home Screen first" instead of failing silently', async () => {
  await ip.goto(`${APP}/settings/notifications`, { waitUntil: 'load' });
  await ip.waitForSelector('[data-testid="toggle-reminders"]', { timeout: 60000 });
  await ip.click('[data-testid="toggle-reminders"]');
  await ip.waitForSelector('[data-testid="notifications-install"]', { timeout: 15000 });
  const text = await ip.innerText('[data-testid="screen-notification-settings"]');
  check(/Home Screen/.test(text), 'notice text');
  await ip.screenshot({ path: path.join(OUT, 'iphone-reminders-needs-install.png') });
});
await ios.close();

// ---------- Desktop: unchanged layout, no install card ----------
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await desk.addInitScript(seed);
const dp = await desk.newPage();
watch(dp, 'desktop');
await step('desktop: sidebar layout as before, no install card on Today', async () => {
  for (let i = 0; i < 2; i += 1) {
    await dp.goto(`${APP}/`, { waitUntil: 'load' });
    await dp.waitForSelector('[data-testid="screen-today"]', { timeout: 60000 });
  }
  await dp.waitForTimeout(1500);
  check(!(await dp.$('[data-testid="install-card"]')), 'install card on desktop');
  check(await dp.$('[data-testid="nav-safety"]'), 'sidebar');
  await dp.screenshot({ path: path.join(OUT, 'desktop-today.png') });
});
await desk.close();
await browser.close();

await step('no page errors and no hydration errors', async () => {
  check(pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
});

fs.writeFileSync(path.join(OUT, 'results.txt'), `${results.join('\n')}\n`);
process.exit(failed ? 1 : 0);
