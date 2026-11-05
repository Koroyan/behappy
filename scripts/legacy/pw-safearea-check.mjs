import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-safearea');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); console.log('📸', name); };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
// Simulate an iPhone-like viewport with device scale, closest thing to checking header spacing on web
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleLines = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; consoleLines.push(t); });
page.on('pageerror', e => consoleLines.push('[pageerror] ' + e.message));

try {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('@behappy_user_profile', JSON.stringify({ name: 'Test', gender: 'prefer_not_to_say', age: 25, updatedAt: new Date().toISOString() }));
  });

  const routes = [
    ['art-therapy-session?sessionId=1', '01-art-therapy-session'],
    ['screens/meditation', '02-meditation'],
    ['screens/breathing', '03-breathing'],
    ['screens/journal', '04-journal'],
    ['screens/cards', '05-cards-index'],
    ['screens/ai-assistant', '06-ai-assistant'],
    ['screens/recommendations', '07-recommendations'],
    ['(tabs)', '08-home-tab'],
    ['(tabs)/general', '09-settings-tab'],
  ];

  for (const [route, name] of routes) {
    log(`→ ${route}`);
    await page.goto(`${BASE}/${route}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);
    await shot(page, name);
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
