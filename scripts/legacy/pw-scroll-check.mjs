import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scripts', 'pw-shots-scroll');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('📸', name); };
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const scrollToBottom = async () => {
  await page.evaluate(() => {
    // Find the scrollable node (RN ScrollView renders as an overflow:auto div)
    const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
      const s = getComputedStyle(d);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 20;
    });
    for (const c of candidates) c.scrollTop = c.scrollHeight;
  });
};

try {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('@behappy_user_profile', JSON.stringify({ name: 'Test', gender: 'prefer_not_to_say', age: 25, updatedAt: new Date().toISOString() }));
  });

  const routes = [
    ['(tabs)', 'home'],
    ['(tabs)/general', 'general'],
    ['art-therapy', 'art-therapy'],
  ];

  for (const [route, name] of routes) {
    log(`→ ${route}`);
    await page.goto(`${BASE}/${route}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);
    await scrollToBottom();
    await page.waitForTimeout(500);
    await shot(page, `${name}-scrolled-to-bottom`);
  }

  log('\n✅ DONE');
} catch (e) {
  log('❌ ERROR:', e.message);
  await shot(page, 'ZZ-error');
} finally {
  log('\n----- ERRORS -----');
  log(errors.join('\n') || '(none)');
  await browser.close();
}
