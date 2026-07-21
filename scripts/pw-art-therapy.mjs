import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots');
fs.mkdirSync(OUT, { recursive: true });
const IMG1 = 'C:/Users/mailk/Downloads/art-therapy-type-drawing.jpg';
const IMG2 = 'C:/Users/mailk/Downloads/1130470882_sara roizen (12-18-10) - 019.jpg';
const BASE = 'http://localhost:8081';
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); console.log('📸', name); };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleLines = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; consoleLines.push(t); });
page.on('pageerror', e => consoleLines.push('[pageerror] ' + e.message));

// Count AI (assistant) bubbles by scanning visible Georgian text length; simpler: count via textContent snapshots
async function bubbleTexts() {
  return await page.evaluate(() => Array.from(document.querySelectorAll('div'))
    .map(d => d.childElementCount === 0 ? (d.textContent || '').trim() : '')
    .filter(t => t.length > 12));
}

async function waitForNewAssistant(prevCount, label, timeout = 90000) {
  const start = Date.now();
  let last = prevCount;
  while (Date.now() - start < timeout) {
    const texts = await bubbleTexts();
    if (texts.length > prevCount) {
      await page.waitForTimeout(2500); // let streaming settle
      return await bubbleTexts();
    }
    last = texts.length;
    await page.waitForTimeout(1500);
  }
  log(`⚠️ timeout waiting for: ${label} (had ${prevCount}, now ${last})`);
  return await bubbleTexts();
}

try {
  log('→ opening session…');
  await page.goto(`${BASE}/art-therapy-session?sessionId=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(9000); // RN web hydration + session load
  await shot(page, '01-loaded');

  let texts = await bubbleTexts();
  log('initial bubbles:', texts.length);

  // Locate input + image button
  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ timeout: 20000 }).catch(() => log('⚠️ no textarea found'));
  const imageBtn = page.locator('textarea').first().locator('xpath=preceding-sibling::div[1]');

  // ---- Turn 1: upload first drawing ----
  log('→ uploading image 1…');
  const [chooser1] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    imageBtn.click({ timeout: 10000 }),
  ]);
  await chooser1.setFiles(IMG1);
  await shot(page, '02-img1-picked');
  texts = await waitForNewAssistant(texts.length, 'AI reply to image 1');
  await shot(page, '03-img1-reply');
  log('AFTER IMG1 — last bubble:\n', texts[texts.length - 1]?.slice(0, 400));

  // ---- Turn 2: reflection text ----
  log('→ typing reflection…');
  await textarea.fill('როცა ვხატავდი, დაძაბული და სევდიანი ვიყავი. ახლა უფრო მშვიდად ვგრძნობ თავს, მაგრამ სიცარიელეც არის.');
  await page.waitForTimeout(500);
  // send button = last sibling after textarea
  const sendBtn = page.locator('textarea').first().locator('xpath=following-sibling::*[last()]');
  await sendBtn.click({ timeout: 8000 }).catch(async () => { await textarea.press('Enter'); });
  await shot(page, '04-reflection-sent');
  texts = await waitForNewAssistant(texts.length + 1, 'AI reply to reflection'); // +1 accounts for user bubble
  await shot(page, '05-reflection-reply');
  log('AFTER REFLECTION — last bubble:\n', texts[texts.length - 1]?.slice(0, 400));

  // ---- Turn 3: second drawing ----
  log('→ uploading image 2…');
  const [chooser2] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    imageBtn.click({ timeout: 10000 }),
  ]);
  await chooser2.setFiles(IMG2);
  await shot(page, '06-img2-picked');
  texts = await waitForNewAssistant(texts.length, 'AI reply to image 2');
  await shot(page, '07-img2-reply');
  log('AFTER IMG2 — last bubble:\n', texts[texts.length - 1]?.slice(0, 400));

  // ---- Turn 4: end session ----
  log('→ ending session…');
  await textarea.fill('ახლა მინდა სესიის დასრულება, მადლობა.');
  await page.waitForTimeout(400);
  await sendBtn.click({ timeout: 8000 }).catch(async () => { await textarea.press('Enter'); });
  texts = await waitForNewAssistant(texts.length + 1, 'AI closing + summary', 120000);
  await shot(page, '08-session-end');
  log('CLOSING — last bubble:\n', texts[texts.length - 1]?.slice(0, 600));

  await shot(page, '09-final');
  log('\n✅ PLAYWRIGHT RUN DONE. total bubbles:', texts.length);
} catch (e) {
  log('❌ PW ERROR:', e.message);
  await shot(page, 'ZZ-error');
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  log('\n----- BROWSER CONSOLE (last 40) -----');
  log(consoleLines.slice(-40).join('\n'));
  await browser.close();
}
