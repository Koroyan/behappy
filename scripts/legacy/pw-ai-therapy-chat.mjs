import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-ai-chat');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 430, height: 950 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleLines = [];
page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleLines.push('[pageerror] ' + e.message));

async function bubbleTexts() {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('div'))
      .map((d) => (d.childElementCount === 0 ? (d.textContent || '').trim() : ''))
      .filter((t) => t.length > 8)
  );
}

async function waitForNewBubble(prevCount, label, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const texts = await bubbleTexts();
    if (texts.length > prevCount) {
      await page.waitForTimeout(1500);
      return await bubbleTexts();
    }
    await page.waitForTimeout(1000);
  }
  console.log(`⚠️ timeout waiting for: ${label}`);
  return await bubbleTexts();
}

try {
  console.log('-> clearing storage, loading ai-therapy-chat fresh...');
  await page.goto(`${BASE}/ai-therapy-chat`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('therapy_sessions'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT, '01-loaded.png') });

  const headerText = await page.evaluate(() => document.body.innerText);
  console.log('Header shows Dr. Pijilo:', headerText.includes('Dr. Pijilo'));

  let texts = await bubbleTexts();
  console.log('initial bubble count:', texts.length);

  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ timeout: 20000 });

  console.log('-> sending message 1...');
  await textarea.fill('ბოლო დროს ვერ ვიძინებ, სულ ვნერვიულობ სამსახურის გამო.');
  await page.locator('textarea').first().locator('xpath=following-sibling::*[last()]').click();
  texts = await waitForNewBubble(texts.length + 1, 'AI reply 1'); // +1 for user bubble
  await page.screenshot({ path: path.join(OUT, '02-turn1.png') });
  console.log('AFTER TURN 1 — bubble count:', texts.length, '\nlast bubble:', texts[texts.length - 1]?.slice(0, 300));

  console.log('-> sending message 2...');
  await textarea.fill('კარგი, ვცდი ცოტა მეტი ვთქვა ამაზე.');
  await page.locator('textarea').first().locator('xpath=following-sibling::*[last()]').click();
  texts = await waitForNewBubble(texts.length + 1, 'AI reply 2');
  await page.screenshot({ path: path.join(OUT, '03-turn2.png') });
  console.log('AFTER TURN 2 — bubble count:', texts.length, '\nlast bubble:', texts[texts.length - 1]?.slice(0, 300));

  // Navigate to History via clock icon (first icon button in header row)
  console.log('-> opening history...');
  const historyBtn = page.locator('svg[data-testid], [aria-label]').first();
  // Fallback: click by approximate position — the two small icon buttons are right before "End Session"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div[role="button"], [class*="css-view"]'));
  });
  await page.goto(`${BASE}/screens/session-history`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, '04-history.png') });

  const historyText = await page.evaluate(() => document.body.innerText);
  console.log('History has 1 session card mentioning "messages":', (historyText.match(/messages|შეტყობინება|сообщений/gi) || []).length);
  console.log('History shows Continue button:', /Continue|გაგრძელება|Продолжить/.test(historyText));

  // Tap first "Continue" button
  const continueBtn = page.getByText(/^Continue$|^გაგრძელება$|^Продолжить$/).first();
  await continueBtn.click({ timeout: 10000 }).catch(async () => {
    console.log('⚠️ Continue text-locator failed, trying broader match');
    await page.getByText(/Continue|გაგრძელება|Продолжить/).first().click();
  });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT, '05-continued.png') });

  const resumedTexts = await bubbleTexts();
  console.log('After Continue — bubble count (should match prior conversation, ~4+):', resumedTexts.length);

  console.log('\n✅ PLAYWRIGHT RUN DONE');
} catch (e) {
  console.error('❌ ERROR:', e.message);
  await page.screenshot({ path: path.join(OUT, 'ZZ-error.png') }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  console.log('\n----- CONSOLE (last 40) -----');
  console.log(consoleLines.slice(-40).join('\n'));
  await browser.close();
}
