// The BeHappy logo: a sun rising over a smile-shaped horizon (the "happy" in
// BeHappy), soft rays, still water — on a deep teal. One SVG master, rendered
// to every icon the app ships (Chrome via playwright-core, already used by QA).
//
//   node scripts/brand/logo.mjs        → assets/images/{icon,adaptive-icon,splash-icon,favicon}.png + assets/brand/*.svg
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright-core');

export const COLORS = { tealLight: '#5FAE9F', teal: '#3A7D73', tealDeep: '#285D55', sunTop: '#FFE2A8', sunBottom: '#F6A98E', ivory: '#FBF8F1' };

/** The artwork on a 1024 grid; `bg` false = transparent background (adaptive/splash foreground). */
export function artwork({ bg = true, scale = 1 } = {}) {
  const c = COLORS;
  const s = (n) => (512 + (n - 512) * scale).toFixed(1);
  const w = (n) => (n * scale).toFixed(1);
  const rays = [-62, -31, 0, 31, 62]
    .map((deg) => {
      const a = ((deg - 90) * Math.PI) / 180;
      const r1 = 300;
      const r2 = deg === 0 ? 372 : 356;
      const cx = 512;
      const cy = 600;
      return `<line x1="${s(cx + r1 * Math.cos(a))}" y1="${s(cy + r1 * Math.sin(a))}" x2="${s(cx + r2 * Math.cos(a))}" y2="${s(cy + r2 * Math.sin(a))}" stroke="${c.ivory}" stroke-opacity="0.9" stroke-width="${w(34)}" stroke-linecap="round"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.tealLight}"/><stop offset="0.55" stop-color="${c.teal}"/><stop offset="1" stop-color="${c.tealDeep}"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sunTop}"/><stop offset="1" stop-color="${c.sunBottom}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.58" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <clipPath id="above"><rect x="0" y="0" width="1024" height="${s(604)}"/></clipPath>
  </defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>' : ''}
  ${rays}
  <circle cx="512" cy="${s(604)}" r="${w(232)}" fill="url(#sun)" clip-path="url(#above)"/>
  <path d="M${s(214)} ${s(612)} Q512 ${s(812)} ${s(810)} ${s(612)}" fill="none" stroke="${c.ivory}" stroke-width="${w(54)}" stroke-linecap="round"/>
  <path d="M${s(330)} ${s(790)} Q512 ${s(870)} ${s(694)} ${s(790)}" fill="none" stroke="${c.ivory}" stroke-opacity="0.55" stroke-width="${w(30)}" stroke-linecap="round"/>
</svg>`;
}

async function render(page, svg, size, file, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const out = path.join(root, 'assets/images');
  fs.mkdirSync(path.join(root, 'assets/brand'), { recursive: true });
  const full = artwork();
  // Android adaptive icons crop to a circle/squircle: keep the art inside the 66% safe zone.
  const fg = artwork({ bg: false, scale: 0.62 });
  const splash = artwork({ bg: false, scale: 0.9 }).replace('<rect width="1024" height="1024" fill="url(#bg)"/>', '');
  fs.writeFileSync(path.join(root, 'assets/brand/behappy-logo.svg'), full);
  fs.writeFileSync(path.join(root, 'assets/brand/behappy-mark-transparent.svg'), artwork({ bg: false }));
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  await render(page, full, 1024, path.join(out, 'icon.png'), false);
  await render(page, fg, 1024, path.join(out, 'adaptive-icon.png'), true);
  // Splash: the mark in a rounded teal tile, on the app's ivory splash background.
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs><clipPath id="r"><rect x="112" y="112" width="800" height="800" rx="200"/></clipPath></defs><g clip-path="url(#r)"><g transform="translate(112 112) scale(0.78125)">${full.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g></g></svg>`;
  await render(page, tile, 1024, path.join(out, 'splash-icon.png'), true);
  await render(page, full, 48, path.join(out, 'favicon.png'), false);
  await render(page, full, 256, path.join(root, 'assets/brand/behappy-logo-256.png'), false);
  await browser.close();
  void splash;
  console.log('icons written: icon.png, adaptive-icon.png, splash-icon.png, favicon.png (+ assets/brand)');
}
