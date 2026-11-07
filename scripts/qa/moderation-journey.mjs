// Moderation 2.0 journey in real browsers (Chrome via playwright-core).
//   npm run qa:moderation                        localhost
//   npm run qa:moderation -- --app https://<tunnel> --out <folder>
//
// Needs the dev API with --dev-tools (test code 123456) and ADMIN_TOKEN in
// server/.env (used by server/scripts/grant-role.mjs, never printed). Each
// run creates fresh accounts: two moderators, a support agent, two members.
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
const OUT = path.resolve(opt('out', './qa-shots/moderation'));
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const TUNNEL = { 'ngrok-skip-browser-warning': '1' };
const CODE = '123456';
const PASSWORD = 'calm-river-stone-42';

const results = [];
let active = null; // the page used last, photographed when a step fails
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
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
const status = async (p, token) => (await fetch(APP + p, { headers: { ...TUNNEL, Authorization: `Bearer ${token}` } })).status;
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
    fill: (t, v) => page.locator(`${id(t)} input, ${id(t)} textarea, input${id(t)}, textarea${id(t)}`).filter({ visible: true }).first().fill(v),
    text: (s, timeout = 20000) => page.getByText(s, { exact: false }).filter({ visible: true }).first().waitFor({ timeout }),
    shot: (name) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: false }),
    close: () => ctx.close(),
  };
}
const answer = async (C, value) => {
  await C.fill('admin-ask-input', value);
  await C.click('admin-ask-submit');
};

// ---------- People and a conversation with a reported message ----------
const tag = Date.now().toString(36).slice(-4);
const mod1 = await registered('qa-mod');
const mod2 = await registered('qa-mod2');
const support = await registered('qa-support');
const a = await registered('qa-member-a');
const b = await registered('qa-member-b');
grant(mod1.email, 'moderator');
grant(mod2.email, 'moderator');
grant(support.email, 'support');
const ROOM = 'stress:en';
const pa = (await j('/api/community/profile', { method: 'PUT', token: a.token, body: JSON.stringify({ pseudonym: `Tamta ${tag}`, acceptGuidelines: true }) })).profile;
const pb = (await j('/api/community/profile', { method: 'PUT', token: b.token, body: JSON.stringify({ pseudonym: `Irakli ${tag}`, acceptGuidelines: true }) })).profile;
for (const u of [a, b]) await j(`/api/community/rooms/${ROOM}/join`, { method: 'POST', token: u.token, body: '{}' });
const say = async (u, body) => (await j(`/api/community/rooms/${ROOM}/messages`, { method: 'POST', token: u.token, body: JSON.stringify({ body }) })).message;
await say(a, 'Work has been really heavy this week.');
const meh = await say(b, 'Same here, my boss keeps adding deadlines.');
await say(a, 'I try to take short walks at lunch. It helps a bit.');
const bad = await say(b, 'Honestly you are all pathetic, stop whining.');
await say(a, 'That hurt to read.');
const report = (await j(`/api/community/messages/${bad.id}/report`, { method: 'POST', token: a.token, body: JSON.stringify({ reason: 'harassment', details: 'Insulting everyone in the room' }) })).reportId;
const report2 = (await j(`/api/community/messages/${meh.id}/report`, { method: 'POST', token: a.token, body: JSON.stringify({ reason: 'spam' }) })).reportId;

const M1 = await client(mod1, { width: 1440, height: 900 }, 'desktop-mod1');
try {
  await step('queue: the report is listed; search by number; three columns', async () => {
    await M1.go('/admin/moderation');
    await M1.wait('screen-admin-moderation', 60000);
    await M1.fill('mod-search', String(report));
    await M1.page.waitForURL((u) => u.searchParams.get('q') === String(report), { timeout: 10000 });
    await M1.wait(`mod-row-${report}`);
    await M1.click(`mod-row-${report}`);
    await M1.wait('mod-report');
    await M1.wait('mod-actions');
    await M1.wait('mod-member');
    const url = M1.page.url();
    if (!url.includes(`report=${report}`) || !url.includes(`q=${report}`)) throw new Error(`filters not in the URL: ${url}`);
    await M1.page.waitForTimeout(500);
    await M1.shot('report');
    return 'report, actions and member side by side; URL keeps q and report';
  });
  await step('evidence and the conversation around it (highlighted)', async () => {
    await M1.text('Honestly you are all pathetic');
    await M1.click('mod-show-context');
    await M1.wait('mod-context-focus');
    await M1.text('I try to take short walks');
    await M1.page.waitForTimeout(300);
    await M1.shot('context');
  });
  await step('no real identity in the moderation view', async () => {
    const html = await M1.page.content();
    if (html.includes(b.email) || html.includes(b.accountId)) throw new Error('identity visible');
    await M1.text(`Irakli ${tag}`);
  });
  await step('take, note, ask for a second review (then cannot decide)', async () => {
    await M1.click('mod-take');
    await M1.text('You took this report');
    await M1.click('mod-note');
    await answer(M1, 'Second sharp message from this member today.');
    await M1.text('Note added');
    await M1.click('mod-second');
    await answer(M1, 'Unsure whether this is venting or harassment.');
    await M1.text('Another moderator will decide');
    await M1.text('so another moderator decides');
    const d = await j(`/api/admin/moderation/reports/${report}`, { token: mod1.token });
    if (!d.report.secondReview?.byMe) throw new Error('second review not recorded');
  });
  await step('keyboard: ? opens the shortcuts', async () => {
    await M1.page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
    await M1.page.keyboard.press('Shift+Slash');
    await M1.wait('mod-keys');
    await M1.page.keyboard.press('Escape');
  });
} finally {
  await M1.close();
}

const M2 = await client(mod2, { width: 1440, height: 900 }, 'desktop-mod2');
try {
  await step('another moderator decides: pause posting 24 h, with a reason', async () => {
    await M2.go(`/admin/moderation?q=${report}&report=${report}`);
    await M2.wait('mod-actions', 60000);
    await M2.click('mod-decide-restrict_24h');
    await answer(M2, 'Harassment of other members.');
    await M2.text('Done: Pause posting 24 h');
    const n = await j('/api/notifications', { token: b.token });
    if (!n.notifications.some((x) => x.kind === 'moderation_suspended')) throw new Error('member not told');
    await M2.page.waitForTimeout(400);
    await M2.shot('decided');
    return 'member notified';
  });
  await step('member profile page: standing and history, community name only', async () => {
    await M2.click('mod-open-member');
    await M2.wait('screen-admin-moderation-member');
    await M2.text('Posting paused');
    const html = await M2.page.content();
    if (html.includes(b.email)) throw new Error('email visible');
    await M2.page.waitForTimeout(400);
    await M2.shot('member');
  });
  await step('review request: the deciding moderator cannot answer it', async () => {
    const me = await j('/api/account/me', { token: b.token });
    const suspensionId = me.community?.suspension?.id;
    if (!suspensionId) throw new Error('no suspension on the member');
    await j('/api/community/appeals', { method: 'POST', token: b.token, body: JSON.stringify({ suspensionId, body: 'I was having a terrible day. I am sorry, it will not happen again.' }) });
    await M2.go('/admin/moderation?view=appeals');
    await M2.wait('screen-admin-moderation', 60000);
    await M2.page.locator('[data-testid^="mod-appeal-"]').filter({ hasText: `Irakli ${tag}` }).first().click();
    await M2.click('mod-overturn');
    await answer(M2, 'Apology accepted.');
    await M2.text('another moderator answers the review');
  });
} finally {
  await M2.close();
}

const P1 = await client(mod1, { width: 390, height: 844 }, 'mobile-mod1');
try {
  await step('phone: the first moderator answers the review request', async () => {
    await P1.go('/admin/moderation?view=appeals');
    await P1.wait('screen-admin-moderation', 60000);
    await P1.page.locator('[data-testid^="mod-appeal-"]').filter({ hasText: `Irakli ${tag}` }).first().click();
    await P1.wait('mod-appeal');
    await P1.click('mod-overturn');
    await answer(P1, 'Apology accepted; first incident.');
    await P1.text('Review request answered');
    const me = await j('/api/account/me', { token: b.token });
    if (me.community?.suspension) throw new Error('restriction not lifted');
  });
  await step('phone: queue → report page → decisions in a sheet', async () => {
    await P1.go(`/admin/moderation?q=${report2}`);
    await P1.wait(`mod-row-${report2}`, 60000);
    await P1.click(`mod-row-${report2}`);
    await P1.wait('screen-admin-moderation-report');
    await P1.click('mod-decide');
    await P1.wait('mod-decide-sheet');
    await P1.page.waitForTimeout(500);
    await P1.shot('decide-sheet');
    await P1.click('mod-decide-dismiss');
    await answer(P1, 'Not spam; an ordinary reply.');
    await P1.text('Done: Dismiss');
    await P1.click('mod-back-queue');
    await P1.wait('screen-admin-moderation');
    if (!P1.page.url().includes(`q=${report2}`)) throw new Error('filters lost on the way back');
    return 'back to the queue keeps the search';
  });
  await step('phone: the conversation page opens only through a report', async () => {
    await P1.go(`/admin/moderation/messages/${bad.id}?report=${report}`);
    await P1.wait('mod-context-focus', 60000);
    await P1.page.waitForTimeout(400);
    await P1.shot('context');
    await P1.go(`/admin/moderation/messages/${bad.id}`);
    await P1.text('Open this from a report', 60000);
  });
} finally {
  await P1.close();
}

await step('support role: no moderation access (server and screen)', async () => {
  const code = await status('/api/admin/moderation/queue', support.token);
  if (code !== 403) throw new Error(`queue answered ${code}`);
  const memberCode = await status(`/api/admin/moderation/members/${pb.ref}`, support.token);
  if (memberCode !== 403) throw new Error(`member profile answered ${memberCode}`);
  const S = await client(support, { width: 1280, height: 860 }, 'desktop-support');
  try {
    await S.go('/admin/moderation');
    await S.text('Your role doesn’t include this area', 60000);
  } finally {
    await S.close();
  }
});

const K = await client(mod1, { width: 1440, height: 900 }, 'georgian-dark', { lang: 'ka', theme: 'dark' });
try {
  await step('Georgian, dark mode', async () => {
    await K.go(`/admin/moderation?view=resolved&q=${report}&report=${report}`);
    await K.wait('mod-report', 60000);
    await K.text('მოქმედებები');
    await K.page.waitForTimeout(600);
    await K.shot('report');
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
