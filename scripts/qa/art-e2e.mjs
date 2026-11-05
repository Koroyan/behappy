// Live art-therapy session check through the BeHappy server (small OpenAI cost).
//   node scripts/qa/art-e2e.mjs --image ./drawing.jpg --out ./qa-shots [--lang ka]
// Session 1 (free): consent → text turn → photo upload → AI replies stream in.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = path.resolve(opt('out', 'qa-shots'));
const image = path.resolve(opt('image', 'drawing.jpg'));
const lang = opt('lang', 'ka');
const app = 'http://localhost:8081';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((l) => {
  try {
    localStorage.setItem('@behappy_onboarding_v2', 'done');
    localStorage.setItem('@behappy_language', l);
  } catch {}
}, lang);
const page = await ctx.newPage();
const failures = [];
page.on('response', async (r) => {
  if (r.url().includes('/api/ai/') && r.status() >= 400) failures.push(`${r.status()} ${await r.text().catch(() => '')}`);
});
let failed = false;
const aiCount = () => page.locator('[data-testid="screen-art-session"] [data-testid="msg-ai"], [data-testid="screen-art-session"] >> text=/./').count();

try {
  await page.goto(`${app}/art/session?sessionId=1`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('[data-testid="composer-input"]', { timeout: 60000 });
  const bubbles = async () => page.locator('[data-testid="screen-art-session"] div[dir], [data-testid="screen-art-session"] [class]').count();
  void bubbles;
  void aiCount;
  console.log('1. text turn');
  await page.fill('[data-testid="composer-input"]', 'გამარჯობა, მზად ვარ დასაწყებად.');
  await page.click('[data-testid="composer-send"]');
  await page.waitForSelector('[data-testid="consent-sheet"]', { timeout: 20000 });
  await page.click('[data-testid="consent-agree"]');
  await page.waitForFunction(() => document.body.innerText.includes('გამარჯობა, მზად ვარ დასაწყებად.'), null, { timeout: 20000 });
  // wait until the reply is saved (welcome + user + reply)
  await page.waitForFunction(() => ((JSON.parse(localStorage.getItem('@behappy_art_therapy_progress') || '{}')['1']?.chatHistory) || []).filter((m) => m.role === 'assistant').length >= 2, null, { timeout: 120000 });
  await page.screenshot({ path: path.join(out, 'art-1-text.png') });

  console.log('2. photo upload');
  const chooser = page.waitForEvent('filechooser', { timeout: 20000 });
  await page.click('[data-testid="art-upload"]');
  (await chooser).setFiles(image);
  await page.waitForFunction(() => ((JSON.parse(localStorage.getItem('@behappy_art_therapy_progress') || '{}')['1']?.chatHistory) || []).filter((m) => m.role === 'assistant').length >= 3, null, { timeout: 150000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'art-2-photo.png') });
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_art_therapy_progress') || '{}'));
  const s1 = progress['1'];
  const roles = (s1?.chatHistory || []).map((m) => m.role);
  console.log('   saved roles:', roles.join(','));
  const lastAi = [...(s1?.chatHistory || [])].reverse().find((m) => m.role === 'assistant');
  console.log('   last AI text:', String(lastAi?.content || '').replace(/\s+/g, ' ').slice(0, 220));
  const artworks = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('behappy', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('artworks', 'readonly');
          const all = tx.objectStore('artworks').getAll();
          all.onsuccess = () => resolve(all.result.length);
          all.onerror = () => resolve(-1);
        };
        req.onerror = () => resolve(-1);
      })
  );
  console.log('   artworks saved in gallery:', artworks);
  if (roles.filter((r) => r === 'assistant').length < 3 || artworks < 1) failed = true;
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
  await page.screenshot({ path: path.join(out, 'art-zz-error.png') }).catch(() => {});
} finally {
  if (failures.length) {
    failed = true;
    console.log('AI errors:', failures.slice(0, 3));
  }
  console.log(failed ? '\nFAIL' : '\nPASS');
  if (failed) process.exitCode = 1;
  await browser.close();
}
