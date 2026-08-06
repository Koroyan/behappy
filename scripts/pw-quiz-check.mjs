import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-quiz');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); console.log('📸', name); };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => consoleLines.push('[pageerror] ' + e.message));

// The first-option Russian label for each of the 6 questions, in order — default app
// language is 'ru', so these are exactly what renders.
const FIRST_OPTION_LABELS = [
  'Тревога, на нервах',
  'Очень плохо, почти каждую ночь',
  'Тревога и навязчивые мысли',
  'Да, и это помогло',
  'На нуле',
  'Спокойствие и меньше тревоги',
];

try {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());

  log('→ /quiz (intro)');
  await page.goto(`${BASE}/quiz`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot(page, '01-intro');

  await page.getByText(/Начать/i).first().click({ timeout: 8000 });
  await page.waitForTimeout(700);
  await shot(page, '02-question-1');

  for (let i = 0; i < FIRST_OPTION_LABELS.length; i++) {
    const label = FIRST_OPTION_LABELS[i];
    log(`→ answering Q${i + 1}: "${label}"`);
    await page.getByText(label, { exact: true }).first().click({ timeout: 8000 });
    await page.waitForTimeout(500);
    if (i === 2) await shot(page, '03-mid-question');
  }

  // Should now be on "analyzing" -> auto-advances to "email" after ~1.8s
  await page.waitForTimeout(600);
  await shot(page, '04-analyzing');
  await page.waitForTimeout(2200);
  await shot(page, '05-email-capture');

  // Fill email and continue
  const emailInput = page.locator('input[type="email"], input').first();
  await emailInput.fill('lead-test@example.com');
  await page.getByText(/Показать результат/i).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  await shot(page, '06-results');

  // Scroll to see the rest of results + CTAs
  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
      const s = getComputedStyle(d);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 20;
    });
    for (const c of candidates) c.scrollTop = c.scrollHeight;
  });
  await page.waitForTimeout(500);
  await shot(page, '07-results-scrolled');

  const storedEmail = await page.evaluate(() => localStorage.getItem('quiz:leadEmail'));
  const storedAnswers = await page.evaluate(() => localStorage.getItem('quiz:leadAnswers'));
  log('stored email:', storedEmail);
  log('stored answers:', storedAnswers);

  // Click the free-session CTA and confirm it routes into the app
  await page.getByText(/Начать первую сессию/i).first().click({ timeout: 8000 });
  await page.waitForTimeout(2500);
  await shot(page, '08-after-free-cta');
  log('url after free CTA:', page.url());

  log('\n✅ DONE');
} catch (e) {
  log('❌ ERROR:', e.message);
  await shot(page, 'ZZ-error');
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  const errors = consoleLines.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  log('\n----- ERRORS -----');
  log(errors.join('\n') || '(none)');
  await browser.close();
}
