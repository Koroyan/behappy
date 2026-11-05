import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-pricing');
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

const seedProfile = async () => page.evaluate(() => {
  localStorage.setItem('@behappy_user_profile', JSON.stringify({ name: 'Test', gender: 'prefer_not_to_say', age: 25, updatedAt: new Date().toISOString() }));
});

try {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await seedProfile();

  // ---- 1. New pricing page (fresh user, nothing consumed yet) ----
  log('→ /subscription (fresh)');
  await page.goto(`${BASE}/subscription`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '01-subscription-new-pricing');

  // ---- 2. Cards Therapy: premium-only paywall (not premium) ----
  log('→ /screens/cards (not premium)');
  await page.goto(`${BASE}/screens/cards`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '02-cards-paywall');

  // ---- 3. Art Therapy: first visit = free session works (shows the tool) ----
  log('→ /art-therapy (first ever visit, free session)');
  await page.goto(`${BASE}/art-therapy`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '03-art-therapy-free-session');

  // Simulate the free session having been used (as if they'd started session 1),
  // without actually running a real session end-to-end.
  await page.evaluate(() => localStorage.setItem('quota:artTherapyFreeUsed', 'true'));
  log('→ /art-therapy (free session already used, no premium)');
  await page.goto(`${BASE}/art-therapy`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '04-art-therapy-paywall-after-free-used');

  // ---- 4. AI Chat: simulate free-message quota exhausted ----
  await page.evaluate(() => localStorage.setItem('quota:aiChatFreeMessageCount', '15'));
  log('→ /(tabs)/ai-therapy-chat (free AI messages exhausted)');
  await page.goto(`${BASE}/(tabs)/ai-therapy-chat`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '05-ai-chat-before-send');
  const input = page.locator('textarea, input[type="text"]').first();
  const hasInput = await input.isVisible().catch(() => false);
  if (hasInput) {
    await input.fill('hello');
    // Click the send button (last touchable sibling after the input) rather than Enter,
    // since this screen may not wire onSubmitEditing to send.
    const sendBtn = input.locator('xpath=following-sibling::*[last()]');
    await sendBtn.click({ timeout: 5000 }).catch(async () => { await page.keyboard.press('Enter'); });
    await page.waitForTimeout(2500);
  }
  await shot(page, '06-ai-chat-after-exhausted-send');
  log('url after exhausted AI-chat send:', page.url());

  // ---- 5. Journal: simulate daily cap already used ----
  await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('quota:dailyDate', today);
    localStorage.setItem('quota:dailyJournal', '1');
  });
  log('→ /screens/journal (daily cap already used)');
  page.on('dialog', async (d) => { log('DIALOG:', d.message()); await d.dismiss(); });
  await page.goto(`${BASE}/screens/journal`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '07-journal-loaded');

  const quickEntry = page.getByText(/Быстрая запись|Quick entry|სწრაფი ჩანაწერი/i).first();
  if (await quickEntry.isVisible().catch(() => false)) {
    await quickEntry.click();
    await page.waitForTimeout(1000);
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test entry hitting the daily cap.');
    await shot(page, '08-journal-writing');
    const saveBtn = page.getByText(/Сохранить|Save|შენახვა/i).last();
    await saveBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '09-journal-after-save-attempt');
  }

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
