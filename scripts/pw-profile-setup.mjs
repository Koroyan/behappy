import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-profile');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 430, height: 950 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const consoleLines = [];
page.on('pageerror', (e) => consoleLines.push('[pageerror] ' + e.message));

try {
  console.log('-> clearing profile + sessions, loading Home fresh...');
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.removeItem('@behappy_user_profile');
    localStorage.removeItem('therapy_sessions');
  });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(7000); // allow gate redirect
  await page.screenshot({ path: path.join(OUT, '01-onboarding-gate.png') });
  console.log('URL after gate:', page.url());

  const textInputs = page.locator('input, textarea');
  await textInputs.first().waitFor({ timeout: 15000 });

  console.log('-> filling profile form...');
  const nameInput = page.locator('input').first();
  await nameInput.fill('ნინო');
  // gender chip "Female" (Georgian label "მდედრობითი")
  await page.getByText('მდედრობითი').click({ timeout: 8000 }).catch(() => console.log('gender chip click failed'));
  const ageInput = page.locator('input').nth(1);
  await ageInput.fill('29');
  await page.screenshot({ path: path.join(OUT, '02-filled.png') });

  console.log('-> saving...');
  await page.getByText(/^შენახვა$|^Save$|^Сохранить$/).first().click({ timeout: 8000 });
  await page.waitForTimeout(3000);
  console.log('URL after save:', page.url());
  await page.screenshot({ path: path.join(OUT, '03-after-save.png') });

  console.log('-> checking general.tsx panel...');
  await page.goto(`${BASE}/general`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT, '04-general-panel.png') });
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('general.tsx shows name ნინო:', bodyText.includes('ნინო'));

  console.log('\n✅ DONE');
} catch (e) {
  console.error('❌ ERROR:', e.message);
  await page.screenshot({ path: path.join(OUT, 'ZZ-error.png') }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  await browser.close();
}
