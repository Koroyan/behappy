// Scroll and bar QA. For each route and width it scrolls the main scroll area
// to the end and checks that:
//   - the page itself never scrolls (only the inner scroll area does), so the
//     top bar, tab bar and composer cannot slide away;
//   - nothing overflows sideways;
//   - the scroll area ends above the tab bar, a screen footer or a chat composer;
//   - a pinned back button keeps its place and content starts below it;
//   - the last piece of content is reachable (visible after scrolling).
//   node scripts/qa/scroll.mjs --widths 320,390,768,1440 --routes /,/journal --out ./qa-shots
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = path.resolve(opt('out', 'qa-shots'));
const routes = opt('routes', '/').split(',');
const widths = opt('widths', opt('width', '390')).split(',').map(Number);
const lang = opt('lang', 'en');
const app = opt('base', 'http://localhost:8081');
const shots = opt('shots', 'phone'); // phone | all | none
fs.mkdirSync(out, { recursive: true });

const heightFor = (w) => (w < 500 ? (w <= 320 ? 568 : w <= 375 ? 667 : w <= 390 ? 844 : 932) : w < 1100 ? 1024 : w < 1500 ? 900 : 1080);

// Runs in the page.
const measure = () => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  };
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const doc = document.scrollingElement || document.documentElement;
  const scrollers = [...document.querySelectorAll('div')].filter((el) => {
    const s = getComputedStyle(el);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.clientHeight > 120 && visible(el) && !el.closest('[role="dialog"]');
  });
  scrollers.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
  const main = scrollers[0] ?? null;
  const pick = (sel) => {
    const el = document.querySelector(sel);
    return visible(el) ? box(el) : null;
  };
  let last = null;
  if (main) {
    const leaves = [...main.querySelectorAll('*')].filter((el) => el.children.length === 0 && visible(el) && ((el.textContent || '').trim() || el.tagName === 'IMG'));
    leaves.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
    const lowest = leaves[0];
    last = lowest ? { bottom: lowest.getBoundingClientRect().bottom, text: (lowest.textContent || lowest.tagName).trim().slice(0, 40) } : null;
  }
  return {
    vh,
    vw,
    pageScroll: doc.scrollHeight - doc.clientHeight,
    hOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
    main: main ? { ...box(main), scrollTop: main.scrollTop, scrollHeight: main.scrollHeight, clientHeight: main.clientHeight, hOverflow: main.scrollWidth - main.clientWidth } : null,
    tab: pick('[role="tablist"]'),
    footer: pick('[data-testid="screen-footer"]'),
    composer: pick('[data-testid="composer-input"]'),
    back: pick('[data-testid="screen-back"]'),
    topbar: pick('[data-testid="screen-topbar"]'),
    last,
  };
};

const scrollToEnd = () => {
  const scrollers = [...document.querySelectorAll('div')].filter((el) => {
    const s = getComputedStyle(el);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.clientHeight > 120 && !el.closest('[role="dialog"]');
  });
  scrollers.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
  if (scrollers[0]) scrollers[0].scrollTop = scrollers[0].scrollHeight;
};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const issues = [];
for (const width of widths) {
  const height = heightFor(width);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1 });
  await ctx.addInitScript(({ l, th }) => {
    try {
      localStorage.setItem('@behappy_onboarding_v2', 'done');
      localStorage.setItem('@behappy_language', l);
      if (th) localStorage.setItem('theme', th);
    } catch {}
  }, { l: lang, th: opt('theme', '') });
  const page = await ctx.newPage();
  for (const route of routes) {
    const name = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
    const tag = `${route} @${width}`;
    try {
      await page.goto(`${app}${route}`, { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(2500);
      const shoot = shots === 'all' || (shots === 'phone' && width < 500);
      if (shoot) await page.screenshot({ path: path.join(out, `${name}-${width}-top.png`) });
      const before = await page.evaluate(measure);
      await page.evaluate(scrollToEnd);
      await page.waitForTimeout(700);
      const after = await page.evaluate(measure);
      if (shoot) await page.screenshot({ path: path.join(out, `${name}-${width}-bottom.png`) });

      const m = after.main;
      if (after.pageScroll > 1) issues.push(`${tag}: the whole page scrolls by ${after.pageScroll}px (bars can slide away)`);
      if (after.hOverflow > 1) issues.push(`${tag}: page overflows sideways by ${after.hOverflow}px`);
      if (m && m.hOverflow > 1) issues.push(`${tag}: scroll area overflows sideways by ${m.hOverflow}px`);
      if (m) {
        const limits = [after.tab?.top, after.footer?.top, after.composer && after.composer.top > m.top ? after.composer.top : undefined].filter((x) => typeof x === 'number');
        const floor = limits.length ? Math.min(...limits) : after.vh;
        if (m.bottom > floor + 1) issues.push(`${tag}: scroll area ends ${Math.round(m.bottom - floor)}px under a bar`);
        const visibleBottom = Math.min(m.bottom, floor);
        if (after.last && after.last.bottom > visibleBottom + 1) issues.push(`${tag}: last content "${after.last.text}" is cut off (${Math.round(after.last.bottom)} > ${Math.round(visibleBottom)})`);
        if (after.topbar && m.top < after.topbar.bottom - 1) issues.push(`${tag}: scroll area starts under the top bar`);
      }
      if (before.back && !after.back) issues.push(`${tag}: back button disappears after scrolling`);
      if (before.back && after.back && width < 768 && Math.abs(after.back.top - before.back.top) > 1) issues.push(`${tag}: back button moved ${Math.round(after.back.top - before.back.top)}px while scrolling (not pinned)`);
      if (before.composer && after.composer && Math.abs(after.composer.top - before.composer.top) > 1) issues.push(`${tag}: composer moved while scrolling`);
      if (before.tab && after.tab && Math.abs(after.tab.top - before.tab.top) > 1) issues.push(`${tag}: tab bar moved while scrolling`);
      if (after.tab && after.tab.bottom > after.vh + 1) issues.push(`${tag}: tab bar extends past the bottom of the screen`);
      const parts = [m ? `scroll ${Math.round(m.scrollTop)}/${m.scrollHeight - m.clientHeight}` : 'no scroll area'];
      if (after.tab) parts.push(`tab@${Math.round(after.tab.top)}`);
      if (after.composer) parts.push(`composer@${Math.round(after.composer.top)}`);
      if (after.back) parts.push(`back@${Math.round(after.back.top)}`);
      console.log(tag, parts.join(' '));
    } catch (e) {
      issues.push(`${tag}: failed (${String(e.message).split('\n')[0]})`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(issues.length ? `\nISSUES (${issues.length}):\n${issues.join('\n')}` : '\nno scroll or bar issues');
if (issues.length) process.exitCode = 1;
