import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-tabbar');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const browser = await chromium.launch({ headless: true });

// Two viewports: a tall notch-y phone size and a device with no home-indicator concept,
// just to eyeball that nothing looks broken at different heights.
for (const [name, viewport] of Object.entries({ 'iphone-tall': { width: 390, height: 844 }, 'android-ish': { width: 412, height: 915 } })) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('@behappy_user_profile', JSON.stringify({ name: 'Test', gender: 'prefer_not_to_say', age: 25, updatedAt: new Date().toISOString() }));
  });
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, `${name}-home.png`) });
  console.log(`📸 ${name}-home`, errors.length ? `ERRORS: ${errors.join(' | ')}` : '(no errors)');
  await ctx.close();
}

await browser.close();
console.log('DONE');
