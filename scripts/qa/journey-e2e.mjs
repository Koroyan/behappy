// The first-days journey in a real browser (Chrome via playwright-core):
//   npm run qa:journey                         localhost (dev web on 8081, API with --dev-tools)
//   npm run qa:journey -- --app <url> --out <folder>
//
// What it checks, step by step (PASS/FAIL per step, screenshots in --out):
//  1. first launch: the one question, six options; nothing is switched on
//     (no AI consent, statistics only queued on the device);
//  2. "Reduce stress" → a guided minute of breathing at once, no account;
//  3. after it: one next step on Today and the one-time statistics question;
//     "Yes" sends what waited on the device;
//  4. a seven-day program: start, "I did this", a private reflection that
//     persists, day 2 waits for tomorrow; Today shows the program;
//  5. "Talk with Bea" asks for AI consent first; "Not now" keeps it off;
//     "Sleep better" opens the wind-down;
//  6. community discovery: topic chips, honest "quiet" labels, starters that
//     only fill the message box;
//  7. encrypted backup on two devices: the recovery key, a restore on a new
//     device, a wrong key refused, the server copy unreadable, and two devices
//     editing at the same time without losing either entry;
//  8. the welcome screen in Georgian, Russian, Armenian and Arabic (RTL) on a
//     small phone and a desktop: no horizontal scrolling.
// Fresh accounts each run (dev test code). Costs no AI tokens.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const repo = process.cwd();
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const APP = opt('app', 'http://localhost:8081').replace(/\/$/, '');
const OUT = path.resolve(opt('out', './qa-shots/journey'));
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');
const CODE = '123456';
const PASSWORD = 'calm-river-stone-42';

const results = [];
let active = null;
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`);
    if (active) await active.screenshot({ path: path.join(OUT, `FAILED-${results.length}.png`) }).catch(() => {});
  }
};
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
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
  await j('/api/auth/verify-email', { method: 'POST', token: acct.token, body: JSON.stringify({ code: reg.testCode || CODE }) });
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
  return { accountId: login.accountId, token: login.token, email };
}
/** Another device of the same person: a new password sign-in. */
const signIn = async (email) => {
  const login = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
  return { accountId: login.accountId, token: login.token, email };
};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [];
const tid = (id) => `[data-testid="${id}"]`;

async function device({ user = null, lang = 'en', viewport = { width: 390, height: 844 }, onboarded = Boolean(user), label }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(
    ({ acc, l, done }) => {
      try {
        if (!sessionStorage.getItem('qa-init')) {
          sessionStorage.setItem('qa-init', '1');
          localStorage.setItem('@behappy_language', l);
          if (done) localStorage.setItem('@behappy_onboarding_v2', 'done');
          if (acc) localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now(), kind: 'password' }));
        }
      } catch {}
    },
    { acc: user, l: lang, done: onboarded }
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message.split('\n')[0]}`));
  const events = [];
  page.on('response', async (r) => {
    if (!r.url().includes('/api/events') || r.request().method() !== 'POST') return;
    const body = await r.json().catch(() => ({}));
    events.push(body);
  });
  return { ctx, page, events };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const ls = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

// ---------- 1–4: first launch, a free tool, the next step, a program ----------
{
  const { page, events, ctx } = await device({ label: 'new' });
  active = page;
  await step('first launch shows one question with six options', async () => {
    await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector(tid('screen-onboarding'), { timeout: 90000 });
    for (const g of ['stress', 'sleep', 'bea', 'wellbeing', 'psychologist', 'explore']) assert(await page.locator(tid(`start-${g}`)).isVisible(), `option ${g} missing`);
    await shot(page, '1-welcome-en');
    assert(!(await ls(page, '@behappy_ai_consent_v1'))?.includes('true'), 'AI consent must not be on');
    return 'no AI consent, no name asked';
  });
  await step('"Reduce stress" starts a guided minute of breathing right away, without an account', async () => {
    await page.click(tid('start-stress'));
    await page.waitForSelector(tid('calm-breathing'), { timeout: 30000 });
    assert(page.url().includes('/calm'), `url ${page.url()}`);
    await shot(page, '2-calm-breathing');
    await page.waitForSelector(tid('calm-done'), { timeout: 90000 });
    const reg = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_account_v1') || 'null'));
    return `finished; signed-in account: ${reg?.kind === 'password' ? 'yes' : 'no (anonymous device only)'}`;
  });
  await step('nothing was counted before the person answered (events wait on the device)', async () => {
    const accepted = events.reduce((s, e) => s + (e.accepted || 0), 0);
    assert(accepted === 0, `server accepted ${accepted} events before consent`);
    const queue = JSON.parse((await ls(page, '@behappy_analytics_queue_v1')) || '[]');
    assert(queue.length > 0, 'expected events queued locally');
    return `${events.length} send attempts answered "${[...new Set(events.map((e) => e.disabled))].join(', ') || 'none'}", ${queue.length} events waiting here`;
  });
  await step('after the first activity: one next step and the statistics question on Today', async () => {
    await page.click(tid('calm-next'));
    await page.waitForSelector(tid('screen-today'), { timeout: 30000 });
    await page.waitForSelector(tid('today-next-step'), { timeout: 20000 });
    await page.waitForSelector(tid('today-stats-question'), { timeout: 20000 });
    await shot(page, '3-today-next-step');
    return (await page.locator(tid('today-next-step')).innerText()).replace(/\s+/g, ' ').slice(0, 90);
  });
  await step('"Yes" to statistics sends what waited on the device', async () => {
    const before = events.length;
    await page.click(tid('stats-yes'));
    await page.waitForSelector(tid('today-stats-question'), { state: 'detached', timeout: 20000 });
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !events.slice(before).some((e) => e.accepted > 0)) await page.waitForTimeout(500);
    const accepted = events.slice(before).reduce((s, e) => s + (e.accepted || 0), 0);
    assert(accepted > 0, 'no events accepted after yes');
    return `${accepted} events accepted`;
  });
  await step('a seven-day program: start, "I did this", a private reflection that persists, day 2 waits', async () => {
    await page.click(tid('today-next-open'));
    await page.waitForSelector(tid('program-start'), { timeout: 30000 });
    await page.click(tid('program-start'));
    await page.waitForSelector(tid('program-did-it'), { timeout: 20000 });
    await page.click(tid('program-did-it'));
    await page.waitForSelector(tid('program-reflect'), { timeout: 20000 });
    await page.fill(`${tid('program-note')} textarea, textarea${tid('program-note')}, ${tid('program-note')}`, 'The breathing helped more than I expected.');
    await page.click(tid('program-note-save'));
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector(tid('program-reflect'), { timeout: 60000 });
    const text = await page.locator(tid('program-today')).innerText();
    assert(/Day 1 done/.test(text), `today card: ${text.slice(0, 120)}`);
    assert(/Day 2 opens tomorrow/.test(text), 'day 2 should open tomorrow');
    const stored = await ls(page, '@behappy_programs_v1');
    assert(stored.includes('The breathing helped'), 'reflection not stored');
    await shot(page, '4-program-day1');
    const queued = (await ls(page, '@behappy_analytics_queue_v1')) || '';
    assert(!queued.includes('breathing helped'), 'reflection text must never be in analytics');
    return 'stored only on this device; not in the analytics queue';
  });
  await step('Today shows the active program; Programs lists it', async () => {
    await page.goto(`${APP}/`, { waitUntil: 'load' });
    await page.waitForSelector(tid('today-program'), { timeout: 60000 });
    await page.goto(`${APP}/programs`, { waitUntil: 'load' });
    await page.waitForSelector(tid('program-active-calm'), { timeout: 60000 });
    await shot(page, '5-programs');
    return (await page.locator(tid('today-program')).count()) === 0 ? 'on Programs' : 'on Today and Programs';
  });
  await ctx.close();
}

// ---------- 5: Bea asks for consent first; sleep opens the wind-down ----------
{
  const { page, ctx } = await device({ label: 'bea' });
  active = page;
  await step('"Talk with Bea" introduces her and asks for AI consent; "Not now" keeps it off', async () => {
    await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector(tid('start-bea'), { timeout: 90000 });
    await page.click(tid('start-bea'));
    await page.waitForSelector(tid('start-bea-agree'), { timeout: 20000 });
    await shot(page, '6-bea-consent');
    await page.click(tid('start-bea-later'));
    await page.waitForSelector(tid('screen-today'), { timeout: 30000 });
    const consent = await ls(page, '@behappy_ai_consent_v1');
    assert(!consent || !consent.includes('true'), `consent stored: ${consent}`);
    await page.waitForSelector(tid('today-resume'), { timeout: 20000 });
    return 'consent still off; Today offers to pick up where they left off';
  });
  await ctx.close();
  const s = await device({ label: 'sleep' });
  active = s.page;
  await step('"Sleep better" opens the wind-down', async () => {
    await s.page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
    await s.page.waitForSelector(tid('start-sleep'), { timeout: 90000 });
    await s.page.click(tid('start-sleep'));
    await s.page.waitForSelector(tid('sleep-start-intro'), { timeout: 30000 });
    await shot(s.page, '7-sleep');
  });
  await s.ctx.close();
}

// ---------- 6: community discovery ----------
{
  const user = await registered('qa-discover');
  await j('/api/community/profile', { method: 'PUT', token: user.token, body: JSON.stringify({ pseudonym: `Qa${Date.now().toString(36).slice(-5)}`, acceptGuidelines: true }) });
  const { page, ctx } = await device({ user, label: 'community' });
  active = page;
  await step('community: topic first, honest activity, quiet rooms folded', async () => {
    await page.goto(`${APP}/community`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector(tid('community-discover'), { timeout: 90000 });
    await page.click(tid('discover-topic-grief'));
    await page.waitForTimeout(1500);
    const txt = await page.locator(tid('community-discover')).innerText();
    assert(/Your topic/.test(txt), 'your topic section');
    assert(/Active today|Active this week|Quiet for now/.test(txt), 'activity labels');
    await shot(page, '8-community-discover');
    return txt.includes('Quiet rooms') ? 'quiet rooms folded' : 'all rooms active';
  });
  await step('a quiet room: first-post guidance, starters only fill the box', async () => {
    await page.goto(`${APP}/community/${encodeURIComponent('grief:en')}`, { waitUntil: 'load' });
    await page.waitForSelector(tid('room-join'), { timeout: 60000 });
    await page.click(tid('room-join'));
    await page.waitForSelector(tid('room-quiet-help'), { timeout: 30000 });
    await page.click(tid('room-starter-0'));
    const value = await page.locator(tid('room-composer')).inputValue();
    assert(value.length > 5, 'starter not in the box');
    const sent = await j(`/api/community/rooms/${encodeURIComponent('grief:en')}/messages`, { token: user.token });
    assert(!sent.messages.some((m) => m.author.isMe), 'a starter must never be sent for the person');
    await shot(page, '9-room-quiet');
    return `box: "${value.slice(0, 40)}…", nothing sent`;
  });
  await ctx.close();
}

// ---------- 7: encrypted backup on two devices ----------
{
  const user = await registered('qa-backup');
  const marker = `backup-marker-${Date.now().toString(36)}`;
  const a = await device({ user, label: 'deviceA' });
  active = a.page;
  let recoveryKey = '';
  await step('device A: turn on backup, see the recovery key once, confirm it, first backup', async () => {
    await a.page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
    await a.page.waitForSelector(tid('screen-today'), { timeout: 90000 });
    await a.page.evaluate((m) => localStorage.setItem('journal_entries', JSON.stringify([{ id: 'qa_j1', timestamp: Date.now(), content: m }])), marker);
    await a.page.goto(`${APP}/settings/backup`, { waitUntil: 'load' });
    await a.page.waitForSelector(tid('backup-turn-on'), { timeout: 60000 });
    await a.page.click(tid('backup-turn-on'));
    await a.page.waitForSelector(tid('backup-recovery-key'), { timeout: 30000 });
    recoveryKey = (await a.page.locator(tid('backup-recovery-key')).innerText()).trim();
    assert(/^([0-9A-Z]{4}-){8}[0-9A-Z]{4}$/.test(recoveryKey), 'recovery key format');
    await shot(a.page, '10-backup-key');
    await a.page.click(tid('backup-key-saved'));
    await a.page.fill(tid('backup-key-confirm'), recoveryKey.slice(-4));
    await a.page.click(tid('backup-key-continue'));
    await a.page.waitForSelector(tid('backup-on'), { timeout: 60000 });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && !/Last backup/.test(await a.page.locator(tid('backup-last')).innerText())) await a.page.waitForTimeout(500);
    assert(/Last backup/.test(await a.page.locator(tid('backup-last')).innerText()), 'no backup time shown');
    await shot(a.page, '11-backup-on');
    return 'key shown once, confirmed with its last 4 characters';
  });
  await step('the server copy is unreadable (no plaintext, no key)', async () => {
    const s = await j('/api/backup', { token: user.token });
    const part = await j('/api/backup/snapshot?part=0', { token: user.token });
    const raw = Buffer.from(part.data, 'base64').toString('latin1');
    assert(!raw.includes(marker), 'plaintext found in the server copy');
    assert(!JSON.stringify(s.keyEnvelope).includes(recoveryKey.replace(/-/g, '')), 'recovery key on the server');
    return `revision ${s.revision}, ${s.size} bytes sealed`;
  });
  const user2 = await signIn(user.email);
  const b = await device({ user: user2, label: 'deviceB' });
  active = b.page;
  await step('device B (new): a wrong recovery key is refused, nothing changes', async () => {
    await b.page.goto(`${APP}/settings/backup`, { waitUntil: 'load', timeout: 120000 });
    await b.page.waitForSelector(tid('backup-restore-step'), { timeout: 90000 });
    await b.page.fill(tid('backup-enter-key'), 'ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789-ABCD');
    await b.page.click(tid('backup-restore'));
    await b.page.waitForTimeout(1500);
    const body = await b.page.evaluate(() => document.body.innerText);
    assert(/typo|doesn’t open|36 letters/.test(body), 'no error shown');
    assert(!((await ls(b.page, 'journal_entries')) || '').includes(marker), 'data must not change');
  });
  await step('device B: the right recovery key restores the journal', async () => {
    await b.page.fill(tid('backup-enter-key'), recoveryKey.toLowerCase().replace(/-/g, ' '));
    await b.page.click(tid('backup-restore'));
    await b.page.waitForSelector(tid('backup-on'), { timeout: 90000 });
    const entries = (await ls(b.page, 'journal_entries')) || '';
    assert(entries.includes(marker), 'journal not restored');
    await b.page.goto(`${APP}/journal`, { waitUntil: 'load' });
    await b.page.waitForSelector(tid('journal-entry'), { timeout: 60000 });
    await shot(b.page, '12-restored-journal');
    return 'typed in lower case with spaces: accepted';
  });
  await step('two devices write at the same time: after syncing, both have both entries', async () => {
    const addEntry = (p, id, text) => p.evaluate(({ i, tx }) => {
      const list = JSON.parse(localStorage.getItem('journal_entries') || '[]');
      list.unshift({ id: i, timestamp: Date.now(), content: tx });
      localStorage.setItem('journal_entries', JSON.stringify(list));
    }, { i: id, tx: text });
    await addEntry(a.page, 'qa_from_a', `${marker}-A`);
    await addEntry(b.page, 'qa_from_b', `${marker}-B`);
    const backUp = async (p) => {
      await p.goto(`${APP}/settings/backup`, { waitUntil: 'load' });
      await p.waitForSelector(tid('backup-now'), { timeout: 60000 });
      const before = await p.locator(tid('backup-last')).innerText();
      await p.click(tid('backup-now'));
      const t0 = Date.now();
      while (Date.now() - t0 < 60000 && (await p.locator(tid('backup-last')).innerText()) === before) await p.waitForTimeout(500);
    };
    await backUp(b.page);
    await backUp(a.page);
    await backUp(b.page);
    const ea = (await ls(a.page, 'journal_entries')) || '';
    const eb = (await ls(b.page, 'journal_entries')) || '';
    for (const [name, e] of [['A', ea], ['B', eb]]) assert(e.includes(`${marker}-A`) && e.includes(`${marker}-B`) && e.includes(`"${marker}"`), `device ${name} is missing an entry`);
    return 'nothing overwritten';
  });
  await step('consent is not restored: device B still has AI consent off', async () => {
    const consent = await ls(b.page, '@behappy_ai_consent_v1');
    assert(!consent || !consent.includes('true'), 'consent was restored');
  });
  await a.ctx.close();
  await b.ctx.close();
}

// ---------- 8: languages and layouts ----------
for (const [lang, viewport, name] of [
  ['ka', { width: 360, height: 740 }, 'ka-small-phone'],
  ['ru', { width: 390, height: 844 }, 'ru-phone'],
  ['hy', { width: 768, height: 1024 }, 'hy-tablet'],
  ['ar', { width: 390, height: 844 }, 'ar-rtl-phone'],
  ['ka', { width: 1440, height: 900 }, 'ka-desktop'],
]) {
  const { page, ctx } = await device({ lang, viewport, label: name });
  active = page;
  await step(`welcome screen ${name}: fits, no horizontal scroll`, async () => {
    await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector(tid('start-stress'), { timeout: 90000 });
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `overflows by ${overflow}px`);
    await shot(page, `13-welcome-${name}`);
    return (await page.locator(tid('start-stress')).innerText()).split('\n')[0];
  });
  await ctx.close();
}

await browser.close();
const bad = errors.filter((e) => !/ResizeObserver/.test(e));
results.push(bad.length ? `FAIL page errors — ${bad.slice(0, 3).join(' | ')}` : 'PASS no page errors');
console.log(results.join('\n'));
console.log(`screenshots: ${OUT}`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
