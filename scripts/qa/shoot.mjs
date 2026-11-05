// Visual QA: screenshots of routes at several widths, light/dark, any language.
//
//   node scripts/qa/shoot.mjs --out ./qa-shots --routes /,/explore --widths 390,1440
//        [--dark] [--lang ka] [--fresh] [--base http://localhost:8081] [--full]
//
// Uses the locally installed Chrome (channel "chrome"); no browser download needed.
// --fresh keeps onboarding enabled; otherwise onboarding is marked done so a
// screen can be captured directly.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const base = opt('base', 'http://localhost:8081');
const out = path.resolve(opt('out', 'qa-shots'));
const routes = opt('routes', '/').split(',');
const widths = opt('widths', '390,1440').split(',').map(Number);
const dark = flag('dark');
const lang = opt('lang', 'en');
const full = flag('full');
const wait = Number(opt('wait', '3500'));

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const problems = [];

for (const width of widths) {
  const height = width < 700 ? 900 : 1000;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 700 ? 2 : 1, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(
    ({ fresh, lang: l, dark: d }) => {
      try {
        if (!fresh) localStorage.setItem('@behappy_onboarding_v2', 'done');
        localStorage.setItem('@behappy_language', l);
        localStorage.setItem('theme', d ? 'dark' : 'light');
      } catch {}
    },
    { fresh: flag('fresh'), lang, dark }
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${width}] pageerror ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${width}] console ${m.text().slice(0, 300)}`);
  });
  for (const route of routes) {
    const name = `${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${width}${dark ? '-dark' : ''}-${lang}.png`;
    try {
      await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(wait);
      await page.screenshot({ path: path.join(out, name), fullPage: full });
      console.log('shot', name);
    } catch (e) {
      problems.push(`[${width}] ${route}: ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of [...new Set(problems)]) console.log(' -', p);
}
