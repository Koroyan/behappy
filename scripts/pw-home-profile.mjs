import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-home');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 430, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleLines = [];
page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleLines.push('[pageerror] ' + e.message));

try {
  console.log('-> loading home...');
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(OUT, '01-home.png') });

  // wait a bit more for the AI motivation card to resolve (network call)
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT, '02-home-after-ai.png') });

  console.log('-> loading profile (general)...');
  await page.goto(`${BASE}/(tabs)/general`, { waitUntil: 'load', timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE}/general`, { waitUntil: 'load', timeout: 60000 });
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT, '03-profile.png') });

  console.log('\n✅ DONE');
} catch (e) {
  console.error('❌ ERROR', e.message);
  await page.screenshot({ path: path.join(OUT, 'ZZ-error.png') }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  console.log('\n----- CONSOLE (last 60) -----');
  console.log(consoleLines.slice(-60).join('\n'));
  await browser.close();
}
