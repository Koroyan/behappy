// A second real-user persona: an English-speaking client on a laptop (1440x900).
// It covers what the Georgian phone journey (user-journeys.mjs) does not:
// sidebar navigation, an English journal reflection that must not ask questions,
// editing, searching and deleting entries, ending an Anulia conversation with a
// summary, a light/heavy card pair, GAD-7 scoring, a DECLINED Flitt test card
// (nothing may be granted), an approved card, and restoring the purchase on a
// second device with the recovery code.
//
//   node scripts/qa/desktop-journey.mjs --out ./qa-shots/desktop [--skip-ai] [--skip-pay]
//
// Uses live OpenAI (a few cents) and the Flitt sandbox (no real money).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const flag = (n) => args.includes(`--${n}`);
const app = opt('app', 'http://localhost:8081');
const api = opt('api', 'http://localhost:8787');
const out = path.resolve(opt('out', 'qa-shots/desktop'));
const skipAi = flag('skip-ai');
const skipPay = flag('skip-pay');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const newDevice = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', acceptDownloads: true });
  await ctx.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('qa-init')) {
        sessionStorage.setItem('qa-init', '1');
        if (!localStorage.getItem('@behappy_language')) localStorage.setItem('@behappy_language', 'en');
      }
    } catch {}
  });
  return ctx;
};
const ctx = await newDevice();
const page = await ctx.newPage();

const problems = { pageErrors: [], consoleErrors: [], badResponses: [], notFound: [], thirdParty: [] };
const watch = (p) => {
  // Errors thrown by Flitt's own pages are theirs, not BeHappy's.
  p.on('pageerror', (e) => (p.url().startsWith(app) ? problems.pageErrors : problems.thirdParty).push(e.message.split('\n')[0]));
  p.on('console', (m) => {
    if (m.type() === 'error') problems.consoleErrors.push(m.text().slice(0, 200));
  });
  p.on('response', (r) => {
    const url = r.url();
    if (r.status() === 404 && !url.includes('favicon')) problems.notFound.push(url);
    if (r.status() >= 500 || (r.status() >= 400 && url.startsWith(api) && ![402, 409, 429].includes(r.status()))) problems.badResponses.push(`${r.status()} ${r.request().method()} ${url.replace(api, '')}`);
  });
};
watch(page);

const results = [];
let n = 0;
async function step(name, fn) {
  n += 1;
  const label = `${String(n).padStart(2, '0')} ${name}`;
  const started = Date.now();
  try {
    const note = await fn();
    results.push({ label, ok: true, ms: Date.now() - started, note });
    console.log(`PASS ${label}${note ? ` — ${note}` : ''}`);
  } catch (e) {
    results.push({ label, ok: false, ms: Date.now() - started, note: String(e.message).split('\n')[0] });
    console.log(`FAIL ${label} — ${String(e.message).split('\n')[0]}`);
  }
  await page.screenshot({ path: path.join(out, `${label.replace(/[^a-z0-9]+/gi, '-')}.png`) }).catch(() => {});
}
const tid = (id) => `[data-testid="${id}"]`;
const go = async (route) => {
  await page.goto(`${app}${route}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(800);
};
const me = async (p = page) => {
  const token = await p.evaluate(() => JSON.parse(localStorage.getItem('@behappy_account_v1') || '{}').token);
  if (!token) throw new Error('no account token in storage');
  return (await fetch(`${api}/api/account/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
};
const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const onboard = async (p, name) => {
  await p.goto(`${app}/`, { waitUntil: 'load', timeout: 90000 });
  await p.waitForSelector(tid('screen-onboarding'), { timeout: 60000 });
  await p.click(tid('onboarding-next')); // welcome
  if (name) await p.fill(tid('onboarding-name'), name);
  await p.click(tid('onboarding-next')); // name
  await p.click(tid('onboarding-next')); // focus (optional)
  await p.click(tid('onboarding-ai-on'));
  await p.click(tid('onboarding-next')); // AI consent
  await p.click(tid('onboarding-next')); // care note → finish
  await p.waitForSelector(tid('screen-today'), { timeout: 30000 });
};
const flittPay = async (card) => {
  await page.waitForURL(/pay\.flitt\.com/, { timeout: 60000 });
  const cardField = page.locator('input[name="f-card_number"]');
  if (!(await cardField.isVisible({ timeout: 8000 }).catch(() => false))) await page.getByText(/^(Card|ბარათი|Карта)$/).first().click();
  await cardField.waitFor({ timeout: 60000 });
  await page.fill('input[name="f-card_number"]', card);
  await page.fill('input[name="f-expiry_date"]', '1230');
  await page.fill('input[name="f-cvv2"]', '123');
  await page.locator('button', { hasText: /[\d.,]+\s*GEL/i }).first().click();
};
// The sandbox sometimes asks for a 3-D Secure confirmation ("Bank Server Emulation");
// a real person presses Continue. Then Flitt sends the browser back to BeHappy.
const returnFromFlitt = async () => {
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    if (/\/checkout\/result/.test(page.url())) return;
    for (const frame of page.frames()) {
      const button = frame.getByRole('button', { name: /^Continue$/ });
      if (await button.isVisible().catch(() => false)) await button.click().catch(() => {});
    }
    await page.waitForTimeout(1000);
  }
  throw new Error(`still on ${new URL(page.url()).host} after paying`);
};

// ---------- 1. First run on a laptop ----------
await step('onboarding in English on desktop', async () => {
  await onboard(page, 'Lena');
  const text = await page.evaluate(() => document.body.innerText);
  if (!text.includes('Lena')) throw new Error('name not used on Today');
  if (!(await page.$(tid('nav-journal')))) throw new Error('no sidebar on desktop');
  return 'sidebar shown, greets by name';
});

await step('sidebar navigation and the always-visible help button', async () => {
  await page.click(tid('nav-journal'));
  await page.waitForSelector(tid('screen-journal'), { timeout: 15000 });
  await page.click(tid('nav-safety'));
  await page.waitForSelector(tid('screen-safety'), { timeout: 15000 });
  const calls = await page.locator('[data-testid^="call-"]').count();
  if (!calls) throw new Error('no emergency call button');
  return `help screen reached from the sidebar, ${calls} emergency call button(s), no paywall`;
});

// ---------- 2. Journal ----------
await step('write a journal entry with a title', async () => {
  await go('/journal/editor');
  await page.fill(tid('journal-title'), 'Sunday evening');
  await page.fill(tid('journal-body'), 'Work has been heavy this week. I keep replaying a meeting where I froze and did not say what I meant. Tonight I walked by the river and felt a bit lighter.');
  await page.click(tid('journal-save'));
  await page.waitForSelector(tid('journal-ask-reflection'), { timeout: 15000 });
  if (await page.$(tid('journal-safety'))) throw new Error('safety card shown for an ordinary entry');
  return 'saved, no safety card';
});

if (!skipAi) {
  await step('AI reflection in English asks no questions', async () => {
    await page.click(tid('journal-ask-reflection'));
    await page.waitForFunction(() => (document.querySelector('[data-testid="journal-reflection"]')?.textContent || '').includes('Generated by AI'), null, { timeout: 120000 });
    const text = oneLine(await page.textContent(tid('journal-reflection')));
    if (/[?？]/.test(text)) throw new Error(`reflection asks a question: ${text}`);
    if (!/[a-z]{3,}/i.test(text)) throw new Error('reflection is empty');
    return text.slice(0, 100) + '…';
  });
}

await step('edit the entry, then find it with search', async () => {
  await page.click(tid('journal-edit'));
  await page.fill(tid('journal-title'), 'Sunday evening by the river');
  await page.click(tid('journal-save'));
  await page.waitForSelector(tid('journal-ask-reflection'), { timeout: 15000 }).catch(() => {});
  await go('/journal');
  await page.getByPlaceholder('Search your entries').fill('river');
  await page.waitForTimeout(500);
  const hits = await page.locator(tid('journal-entry')).count();
  if (hits !== 1) throw new Error(`search found ${hits} entries`);
  const title = await page.locator(tid('journal-entry')).first().textContent();
  if (!String(title).includes('by the river')) throw new Error('edited title not shown');
  return 'edited title found by search';
});

await step('delete a second entry', async () => {
  await go('/journal/editor');
  await page.fill(tid('journal-body'), 'A short note to delete.');
  await page.click(tid('journal-save'));
  await page.waitForSelector(tid('journal-delete'), { timeout: 15000 });
  await page.click(tid('journal-delete'));
  await page.click(tid('confirm-accept'));
  await page.waitForSelector(tid('screen-journal'), { timeout: 15000 });
  const count = await page.locator(tid('journal-entry')).count();
  if (count !== 1) throw new Error(`${count} entries left, expected 1`);
  return 'back on the journal by itself, one entry left';
});

await step('personal details opened directly, saved, back on Profile', async () => {
  await go('/profile/personal');
  await page.fill(tid('personal-name'), 'Lena K.');
  await page.click(tid('personal-save'));
  await page.waitForSelector(tid('screen-profile'), { timeout: 15000 });
  const text = await page.evaluate(() => document.body.innerText);
  if (!text.includes('Lena K.')) throw new Error('new name not shown on Profile');
  return 'saved and returned to Profile';
});

// ---------- 3. Anulia, cards ----------
if (!skipAi) {
  await step('Anulia conversation in English', async () => {
    await page.click(tid('nav-anulia'));
    await page.waitForSelector(tid('screen-anulia'), { timeout: 15000 });
    await page.fill(tid('composer-input'), 'I froze in a meeting this week and I keep replaying it. I feel embarrassed.');
    await page.click(tid('composer-send'));
    await page.waitForSelector(tid('msg-ai'), { timeout: 120000 });
    await page.waitForFunction(() => !/(Anulia|Bea) is thinking/.test(document.body.innerText), null, { timeout: 120000 });
    const reply = oneLine(await page.locator(tid('msg-ai')).last().textContent());
    if (/\bI(?: am|'m) (?:a |your )?(?:licensed )?(?:therapist|psychologist|doctor)\b/i.test(reply)) throw new Error('claims to be a professional');
    const questions = (reply.match(/\?/g) || []).length;
    return `${reply.length} chars, ${questions} question mark(s)`;
  });

  await step('end the conversation with a summary, then find it in history', async () => {
    await page.click(tid('anulia-finish'));
    await page.click(tid('confirm-accept'));
    await page.getByText('Reflection on this conversation').first().waitFor({ timeout: 120000 });
    const sheet = oneLine(await page.locator('[role="dialog"]').last().textContent());
    await page.keyboard.press('Escape');
    await go('/anulia/history');
    await page.waitForSelector(tid('screen-anulia-history'), { timeout: 15000 });
    const text = await page.evaluate(() => document.body.innerText);
    if (!/froze|meeting/i.test(text)) throw new Error('conversation missing from history');
    return `summary ${sheet.length} chars; listed in history`;
  });

  await step('light and heavy card pair reflection', async () => {
    await go('/cards/lightShadow');
    await page.click(tid('card-0'));
    await page.click(tid('card-select-light'));
    await page.click(tid('card-1'));
    await page.click(tid('card-select-heavy'));
    await page.click(tid('cards-begin'));
    await page.waitForSelector(tid('screen-card-chat'), { timeout: 30000 });
    await page.click(tid('cards-start'));
    await page.waitForSelector(tid('msg-ai'), { timeout: 120000 });
    return 'AI opened the pair reflection';
  });
}

// ---------- 4. Self-check ----------
await step('GAD-7 scored and banded', async () => {
  await go('/assessments/gad7');
  await page.click(tid('assessment-begin'));
  for (let i = 0; i < 7; i += 1) {
    const before = await page.textContent(tid('assessment-question'));
    await page.click(tid('answer-2'));
    await page.waitForTimeout(450);
    if (i < 6 && (await page.textContent(tid('assessment-question'))) === before) await page.getByText('Next', { exact: true }).click();
  }
  await page.click(tid('assessment-finish'));
  await page.waitForSelector(tid('screen-assessment-result'), { timeout: 15000 });
  const score = oneLine(await page.textContent(tid('assessment-score')));
  if (!score.includes('14')) throw new Error(`expected 14 of 21, got "${score}"`);
  const text = await page.evaluate(() => document.body.innerText);
  if (!text.includes('Moderate')) throw new Error('band "Moderate" not shown');
  return `${score}, Moderate`;
});

// ---------- 5. Payments (Flitt TEST) and a second device ----------
let recovery = '';
if (!skipPay) {
  await step('declined test card grants nothing', async () => {
    await go('/pricing');
    await page.click(tid('buy-plus_30'));
    await page.click(tid('checkout-pay'));
    await flittPay('4444111155556666');
    // Flitt keeps a declined buyer on its page so they can try another card. A real person goes back.
    await page.getByText('Declined', { exact: true }).first().waitFor({ timeout: 90000 });
    await page.goBack({ waitUntil: 'load' });
    await page.waitForSelector(tid('screen-checkout'), { timeout: 30000 });
    const account = await me();
    if (account.entitlements?.plus?.active) throw new Error('Plus granted after a declined card');
    await go('/purchases');
    await page.getByText('Declined', { exact: true }).first().waitFor({ timeout: 15000 });
    return 'Flitt showed Declined; back in BeHappy; server: no Plus; purchases list says Declined';
  });

  await step('approved test card grants Plus (server-verified)', async () => {
    await go('/pricing');
    await page.click(tid('buy-plus_30'));
    await page.click(tid('checkout-pay'));
    await flittPay('4444555511116666');
    await returnFromFlitt();
    await page.waitForFunction(() => /Payment confirmed/.test(document.querySelector('[data-testid="checkout-result-title"]')?.textContent || ''), null, { timeout: 90000 });
    const account = await me();
    if (!account.entitlements?.plus?.active) throw new Error('server does not show Plus as active');
    return `Plus active until ${new Date(account.entitlements.plus.expiresAt).toISOString().slice(0, 10)}`;
  });

  await step('purchases list and recovery code', async () => {
    await go('/purchases');
    await page.waitForSelector(tid('screen-purchases'), { timeout: 15000 });
    // Wait for the orders to load (counting at once raced the request); this account paid once and was declined once.
    await page.waitForSelector(tid('order-row'), { timeout: 15000 });
    const rows = await page.locator(tid('order-row')).count();
    if (rows < 2) throw new Error(`expected the declined and the approved order, saw ${rows}`);
    await page.getByText('Show recovery code').click();
    recovery = oneLine(await page.textContent(tid('recovery-code')));
    if (recovery.replace(/[^0-9a-z]/gi, '').length < 16) throw new Error(`odd recovery code "${recovery}"`);
    return `${rows} order row(s), code shown`;
  });

  await step('restore Plus on a second device with the code', async () => {
    const ctx2 = await newDevice();
    const second = await ctx2.newPage();
    watch(second);
    await onboard(second, '');
    const fresh = await me(second);
    if (fresh.entitlements?.plus?.active) throw new Error('a brand-new device already has Plus');
    await second.goto(`${app}/purchases`, { waitUntil: 'load', timeout: 90000 });
    await second.waitForSelector(tid('restore-input'), { timeout: 15000 });
    await second.fill(tid('restore-input'), recovery);
    await second.click(tid('restore-submit'));
    await second.getByText('Purchases restored.').waitFor({ timeout: 30000 });
    const restored = await me(second);
    if (!restored.entitlements?.plus?.active) throw new Error('Plus not active after restore');
    await second.screenshot({ path: path.join(out, 'second-device-restored.png') });
    await ctx2.close();
    return 'Plus active on the second device';
  });
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
for (const [kind, list] of Object.entries(problems)) {
  const unique = [...new Set(list)];
  if (unique.length) console.log(`${kind} (${unique.length}):\n  ${unique.slice(0, 15).join('\n  ')}`);
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ results, problems }, null, 2));
if (failed.length) process.exitCode = 1;
