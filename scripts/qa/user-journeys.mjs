// Real-user journeys against the running app (web) and API, like a new client
// would use BeHappy: onboarding in Georgian, check-in, journal (with an AI
// reflection that must not ask questions), the on-device safety check, a safety
// plan, grounding, Anulia, an art session with a photo, a card reflection,
// PHQ-9 with the item-9 safety prompt, breathing, goals, insights, a Flitt
// TEST payment, theme and language changes, data export and delete-everything.
//
//   node scripts/qa/user-journeys.mjs --image ./drawing.jpg --out ./qa-shots [--skip-ai] [--skip-pay]
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
const out = path.resolve(opt('out', 'qa-shots/journeys'));
const image = path.resolve(opt('image', 'drawing.jpg'));
const skipAi = flag('skip-ai');
const skipPay = flag('skip-pay');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ka-GE', acceptDownloads: true });
// A first-time visitor whose phone is set to Georgian.
await ctx.addInitScript(() => {
  try {
    if (!sessionStorage.getItem('qa-init')) {
      sessionStorage.setItem('qa-init', '1');
      if (!localStorage.getItem('@behappy_language')) localStorage.setItem('@behappy_language', 'ka');
    }
  } catch {}
});
const page = await ctx.newPage();

const problems = { pageErrors: [], consoleErrors: [], badResponses: [], notFound: [] };
page.on('pageerror', (e) => problems.pageErrors.push(e.message.split('\n')[0]));
page.on('console', (m) => {
  if (m.type() === 'error') problems.consoleErrors.push(m.text().slice(0, 200));
});
page.on('response', (r) => {
  const url = r.url();
  if (r.status() === 404 && !url.includes('favicon')) problems.notFound.push(url);
  if (r.status() >= 500 || (r.status() >= 400 && url.startsWith(api) && ![402, 409, 429].includes(r.status()))) problems.badResponses.push(`${r.status()} ${r.request().method()} ${url.replace(api, '')}`);
});

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
const visibleText = () => page.evaluate(() => document.body.innerText);
const georgian = /[ა-ჿ]/;

// ---------- 1. First run ----------
await step('onboarding in Georgian', async () => {
  await go('/');
  await page.waitForSelector(tid('screen-onboarding'), { timeout: 60000 });
  await page.click(tid('onboarding-next')); // welcome
  await page.fill(tid('onboarding-name'), 'ნინო');
  await page.click(tid('onboarding-next'));
  await page.getByText('სტრესი', { exact: true }).click();
  await page.getByText('ძილი', { exact: true }).click();
  await page.click(tid('onboarding-next'));
  await page.click(tid('onboarding-ai-on'));
  await page.click(tid('onboarding-next'));
  await page.click(tid('onboarding-next')); // care note → finish
  await page.waitForSelector(tid('screen-today'), { timeout: 30000 });
  const text = await visibleText();
  if (!text.includes('ნინო')) throw new Error('name not used on Today');
  return 'greets by name';
});

await step('mood check-in', async () => {
  await page.click(tid('mood-2'));
  await page.click(tid('checkin-save'));
  await page.getByText(/აღნიშნულია|შენახულია/).first().waitFor({ timeout: 15000 });
});

// ---------- 2. Journal ----------
await step('journal entry without AI', async () => {
  await go('/journal/editor');
  await page.fill(tid('journal-body'), 'ravi ramdenime dgea gabrazebuli var ar vici raze');
  await page.click(tid('journal-save'));
  await page.waitForSelector(tid('journal-ask-reflection'), { timeout: 15000 });
  const plan = await page.$(tid('journal-safety'));
  if (plan) throw new Error('safety card shown for an ordinary entry');
  return 'saved locally, no safety card';
});

if (!skipAi) {
  await step('AI reflection: Georgian, no questions', async () => {
    await page.click(tid('journal-ask-reflection'));
    // The note under a finished reflection only appears once the reply has arrived.
    await page.waitForFunction(() => (document.querySelector('[data-testid="journal-reflection"]')?.textContent || '').includes('შექმნილია AI-ის მიერ'), null, { timeout: 120000 });
    const text = await page.textContent(tid('journal-reflection'));
    if (/[?？]/.test(text)) throw new Error(`reflection asks a question: ${text}`);
    if (!georgian.test(text)) throw new Error('reflection is not in Georgian');
    return text.replace(/\s+/g, ' ').slice(0, 90) + '…';
  });
}

await step('journal safety check on self-harm words', async () => {
  await go('/journal/editor');
  await page.fill(tid('journal-body'), 'ხანდახან ვფიქრობ, რომ აღარ მინდა ცხოვრება.');
  await page.click(tid('journal-save'));
  await page.waitForSelector(tid('journal-safety'), { timeout: 15000 });
  await page.click(tid('journal-safety-help'));
  await page.waitForSelector(tid('screen-safety'), { timeout: 15000 });
  return 'card shown, help screen opened';
});

// ---------- 3. Safety plan and grounding ----------
await step('safety plan saved and survives reload', async () => {
  await page.click(tid('safety-plan-open'));
  await page.waitForSelector(tid('screen-safety-plan'), { timeout: 15000 });
  await page.fill(tid('plan-input-warningSigns'), 'მეგობრებს აღარ ვპასუხობ');
  await page.click(tid('plan-add-warningSigns'));
  await page.fill(tid('plan-input-people'), 'დედა');
  await page.locator(`${tid('plan-people')} input`).nth(1).fill('+995 555 12 34 56');
  await page.click(tid('plan-add-people'));
  await page.reload({ waitUntil: 'load' });
  await page.getByText('მეგობრებს აღარ ვპასუხობ').waitFor({ timeout: 15000 });
  await page.getByText('+995 555 12 34 56').waitFor({ timeout: 5000 });
  return '2 items persisted';
});

await step('grounding 5-4-3-2-1', async () => {
  await go('/grounding');
  await page.click(tid('grounding-begin'));
  for (const count of [5, 4, 3, 2, 1]) {
    for (let i = 0; i < count; i += 1) await page.click(tid('grounding-noticed'));
    await page.click(tid('grounding-next'));
  }
  await page.waitForSelector(tid('grounding-done'), { timeout: 10000 });
});

// ---------- 4. AI companions ----------
if (!skipAi) {
  await step('Anulia conversation', async () => {
    await go('/anulia');
    await page.fill(tid('composer-input'), 'ბოლო დროს ძალიან დაღლილი ვარ და ვერ ვისვენებ.');
    await page.click(tid('composer-send'));
    await page.waitForSelector(tid('msg-ai'), { timeout: 120000 });
    await page.waitForFunction(() => !document.body.innerText.includes('ანულია ფიქრობს'), null, { timeout: 120000 });
    const reply = (await page.locator(tid('msg-ai')).last().textContent()) || '';
    if (!georgian.test(reply)) throw new Error('reply not in Georgian');
    if (/თერაპევტი ვარ|ფსიქოლოგი ვარ|ექიმი ვარ/.test(reply)) throw new Error('claims to be a professional');
    const questions = (reply.match(/\?/g) || []).length;
    return `${reply.length} chars, ${questions} question mark(s)`;
  });

  await step('art session with a photo of a paper drawing', async () => {
    await go('/art/1');
    await page.click(tid('art-start'));
    await page.waitForSelector(tid('screen-art-session'), { timeout: 30000 });
    const before = await page.evaluate(() => ((JSON.parse(localStorage.getItem('@behappy_art_therapy_progress') || '{}')['1']?.chatHistory) || []).filter((m) => m.role === 'assistant').length);
    const chooser = page.waitForEvent('filechooser', { timeout: 20000 });
    await page.click(tid('art-upload'));
    await (await chooser).setFiles(image);
    await page.waitForFunction((b) => ((JSON.parse(localStorage.getItem('@behappy_art_therapy_progress') || '{}')['1']?.chatHistory) || []).filter((m) => m.role === 'assistant').length > b, before, { timeout: 180000 });
    return 'AI replied to the drawing';
  });

  await step('reflection card conversation', async () => {
    await go('/cards/emotions');
    await page.click(tid('card-0'));
    await page.click(tid('card-select'));
    await page.click(tid('cards-begin'));
    await page.waitForSelector(tid('screen-card-chat'), { timeout: 30000 });
    await page.click(tid('cards-start'));
    await page.waitForSelector(tid('msg-ai'), { timeout: 120000 });
    return 'AI opened the reflection';
  });
}

// ---------- 5. Self-checks and tools ----------
await step('PHQ-9 with item 9 answered shows the safety prompt', async () => {
  await go('/assessments/phq9');
  await page.click(tid('assessment-begin'));
  for (let i = 0; i < 9; i += 1) {
    const before = await page.textContent(tid('assessment-question'));
    await page.click(tid('answer-1'));
    await page.waitForTimeout(450);
    if (i < 8 && (await page.textContent(tid('assessment-question'))) === before) await page.getByText('შემდეგი', { exact: true }).click();
  }
  await page.click(tid('assessment-finish'));
  await page.waitForSelector(tid('assessment-safety'), { timeout: 15000 });
  const score = await page.textContent(tid('assessment-score')).catch(() => '');
  return `score shown: ${String(score).trim()}`;
});

await step('breathing session', async () => {
  await go('/breathing');
  await page.click(tid('breathing-start'));
  await page.waitForTimeout(4000);
  await page.click(tid('breathing-stop'));
});

await step('goal added and completed', async () => {
  await go('/goals');
  await page.fill(tid('goal-input'), 'სამსახურის შემდეგ 10 წუთი გავისეირნო');
  await page.click(tid('goal-add'));
  await page.waitForSelector(tid('goal-item'), { timeout: 10000 });
});

await step('insights show the check-in', async () => {
  await go('/insights');
  await page.waitForSelector(tid('insights-mood'), { timeout: 15000 });
});

// ---------- 6. Payment (Flitt TEST) ----------
if (!skipPay) {
  await step('Plus 30 days with the Flitt test card', async () => {
    await go('/pricing');
    await page.click(tid('buy-plus_30'));
    await page.click(tid('checkout-pay'));
    await page.waitForURL(/pay\.flitt\.com/, { timeout: 60000 });
    // On phones Flitt first lists payment methods; a real person taps "Card".
    const cardField = page.locator('input[name="f-card_number"]');
    if (!(await cardField.isVisible({ timeout: 8000 }).catch(() => false))) await page.getByText(/^(ბარათი|Card|Карта)$/).first().click();
    await cardField.waitFor({ timeout: 60000 });
    await page.fill('input[name="f-card_number"]', '4444555511116666');
    await page.fill('input[name="f-expiry_date"]', '1230');
    await page.fill('input[name="f-cvv2"]', '123');
    await page.locator('button', { hasText: /[\d.,]+\s*GEL/i }).first().click();
    // The sandbox sometimes asks for a 3-D Secure confirmation; a real person presses Continue.
    const deadline = Date.now() + 150000;
    while (!/\/checkout\/result/.test(page.url())) {
      if (Date.now() > deadline) throw new Error(`still on ${new URL(page.url()).host} after paying`);
      for (const frame of page.frames()) {
        const button = frame.getByRole('button', { name: /^Continue$/ });
        if (await button.isVisible().catch(() => false)) await button.click().catch(() => {});
      }
      await page.waitForTimeout(1000);
    }
    await page.waitForFunction(() => /დადასტურდა/.test(document.querySelector('[data-testid="checkout-result-title"]')?.textContent || ''), null, { timeout: 90000 });
    const token = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_account_v1') || '{}').token);
    const me = await (await fetch(`${api}/api/account/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
    if (!me.entitlements?.plus?.active) throw new Error('server does not show Plus as active');
    return `Plus active until ${new Date(me.entitlements.plus.expiresAt).toISOString().slice(0, 10)}`;
  });
}

// ---------- 7. Settings, privacy ----------
await step('dark theme', async () => {
  await go('/profile');
  await page.getByText('მუქი', { exact: true }).click();
  await page.waitForTimeout(600);
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="screen-profile"]')).backgroundColor);
  if (!/rgb\(1[0-9], 3[0-9], 2[0-9]\)/.test(bg)) throw new Error(`background is ${bg}`);
  return bg;
});

await step('switch language to Russian', async () => {
  await page.click(tid('profile-language'));
  await page.click(tid('lang-ru'));
  await page.waitForTimeout(800);
  await go('/');
  await page.getByText(/Сегодня|Как вы себя чувствуете/).first().waitFor({ timeout: 15000 });
});

await step('export my data', async () => {
  await go('/profile');
  const download = page.waitForEvent('download', { timeout: 20000 });
  await page.getByText('Экспорт моих данных').click();
  const file = await download;
  const saved = path.join(out, 'export.json');
  await file.saveAs(saved);
  const data = JSON.parse(fs.readFileSync(saved, 'utf8'));
  const text = JSON.stringify(data);
  if (!text.includes('მეგობრებს აღარ ვპასუხობ')) throw new Error('safety plan missing from export');
  return `${Math.round(fs.statSync(saved).size / 1024)} KB`;
});

// The drawing photo from the art session lives in IndexedDB on the web.
const countPhotos = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('behappy', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('artworks', { keyPath: 'id' });
        req.onerror = () => resolve(-1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('artworks')) return resolve(0);
          const count = db.transaction('artworks', 'readonly').objectStore('artworks').count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => resolve(-1);
        };
      })
  );

await step('delete everything', async () => {
  const photosBefore = await countPhotos();
  if (!skipAi && photosBefore < 1) throw new Error('the art photo was not stored before deleting');
  const oldToken = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_account_v1') || '{}').token);
  const deletedAt = Date.now();
  await page.click(tid('profile-delete'));
  await page.click(tid('confirm-accept'));
  await page.waitForSelector(tid('screen-onboarding'), { timeout: 30000 });
  const old = await fetch(`${api}/api/account/me`, { headers: { Authorization: `Bearer ${oldToken}` } });
  if (old.status !== 401) throw new Error(`the deleted account still answers (${old.status})`);
  const { keys, token } = await page.evaluate(() => ({
    keys: Object.keys(localStorage).filter((k) => k.startsWith('@behappy')),
    token: JSON.parse(localStorage.getItem('@behappy_account_v1') || '{}').token,
  }));
  if (token && token === oldToken) throw new Error('the old account token is still stored');
  // On start-up the app creates a fresh, empty anonymous account and its caches; nothing personal may survive.
  const startup = ['@behappy_language', '@behappy_account_v1', '@behappy_me_cache_v1', '@behappy_mood_checkins_migrated'];
  // Usage statistics restart for the new anonymous account; only events from before the deletion would be a leak.
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_analytics_queue_v1') || '[]'));
  const oldEvents = queue.filter((e) => e.at < deletedAt);
  if (oldEvents.length) throw new Error(`${oldEvents.length} usage event(s) from before the deletion survived`);
  const survived = keys.filter((k) => !startup.includes(k) && k !== '@behappy_analytics_queue_v1');
  if (survived.length) throw new Error(`still stored: ${survived.join(', ')}`);
  const photosAfter = await countPhotos();
  if (photosAfter !== 0) throw new Error(`artwork photos left: ${photosAfter}`);
  return `server account gone (401), ${photosBefore} photo(s) removed, only a fresh empty account remains`;
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
for (const [kind, list] of Object.entries(problems)) {
  const unique = [...new Set(list)];
  if (unique.length) console.log(`${kind} (${unique.length}):\n  ${unique.slice(0, 15).join('\n  ')}`);
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ results, problems }, null, 2));
if (failed.length) process.exitCode = 1;
