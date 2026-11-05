import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-subscription');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); console.log('📸', name); };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleLines = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; consoleLines.push(t); });
page.on('pageerror', e => consoleLines.push('[pageerror] ' + e.message));

try {
  // Fresh state: clear any prior local storage from earlier runs, but seed a
  // profile so the onboarding gate doesn't redirect us away from the home tab.
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('@behappy_user_profile', JSON.stringify({
      name: 'Test', gender: 'prefer_not_to_say', age: 25, updatedAt: new Date().toISOString(),
    }));
  });

  log('→ home page');
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6000);
  await shot(page, '01-home');

  const premiumBanner = page.getByText(/Premium/i).first();
  await premiumBanner.waitFor({ timeout: 15000 }).catch(() => log('⚠️ premium banner text not found on home'));

  log('→ navigating to /subscription');
  await page.goto(`${BASE}/subscription`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await shot(page, '02-subscription-first-visit');

  // Plan cards + sticky CTA visible?
  const planWords = ['MOST POPULAR', 'ПОПУЛЯРНЫЙ', 'BEST VALUE', 'ВЫГОДНЕЕ'];
  for (const w of planWords) {
    const found = await page.getByText(new RegExp(w, 'i')).first().isVisible().catch(() => false);
    log(`  badge "${w}" visible:`, found);
  }

  await page.mouse.move(215, 450);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await shot(page, '02b-subscription-scrolled');

  // The exact sticky-footer link text (avoid matching the hero copy, which also says "free"/"бесплатно").
  const freeLink = page.getByText(/начни 1 бесплатную сессию|start your 1 free session/i).first();
  const freeLinkVisible = await freeLink.isVisible().catch(() => false);
  log('free-session link visible (before use):', freeLinkVisible);

  if (freeLinkVisible) {
    log('→ clicking free session link');
    await freeLink.click({ timeout: 8000 });
    await page.waitForTimeout(2500);
    log('url after click:', page.url());
    await page.waitForTimeout(1500);
    await shot(page, '03-after-free-session-click');
  }

  log('→ revisiting /subscription (free session should now be spent, link should be gone)');
  await page.goto(`${BASE}/subscription`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot(page, '04-subscription-after-free-used');
  const freeLinkStillVisible = await page.getByText(/начни 1 бесплатную сессию|start your 1 free session/i).first().isVisible().catch(() => false);
  log('free-session link visible (after use):', freeLinkStillVisible);

  log('→ navigating to /art-therapy (should now show the paywall, not the tool)');
  await page.goto(`${BASE}/art-therapy`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await shot(page, '05-art-therapy-paywall');

  const premiumBtn = page.getByText('Смотреть тарифы Premium', { exact: true }).first();
  const premiumBtnVisible = await premiumBtn.isVisible().catch(() => false);
  log('paywall "Premium" button visible:', premiumBtnVisible);

  if (premiumBtnVisible) {
    log('→ clicking paywall CTA');
    await premiumBtn.click({ timeout: 8000 });
    await page.waitForTimeout(3000);
    await shot(page, '06-paywall-cta-to-subscription');
    log('url after paywall CTA click:', page.url());
  }

  log('\n✅ PLAYWRIGHT RUN DONE.');
} catch (e) {
  log('❌ PW ERROR:', e.message);
  await shot(page, 'ZZ-error');
} finally {
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));
  log('\n----- BROWSER CONSOLE (last 60) -----');
  log(consoleLines.slice(-60).join('\n'));
  await browser.close();
}
