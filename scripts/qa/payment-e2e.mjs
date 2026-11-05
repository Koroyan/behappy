// End-to-end TEST payment through the real Flitt sandbox, in a real browser.
//
//   node scripts/qa/payment-e2e.mjs --out ./qa-shots [--product plus_30] [--card approve|decline]
//
// Requires: the API (npm run server) and the web app (npm run web) running,
// plus a local Chrome. Uses Flitt's public test cards (docs.flitt.com/api/testing):
//   4444 5555 1111 6666  → approved (no 3-D Secure)
//   4444 1111 5555 6666  → declined (no 3-D Secure)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = path.resolve(opt('out', 'qa-shots'));
const product = opt('product', 'plus_30');
const cardKind = opt('card', 'approve');
const app = opt('app', 'http://localhost:8081');
const api = opt('api', 'http://localhost:8787');
const CARD = cardKind === 'decline' ? '4444111155556666' : '4444555511116666';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('@behappy_onboarding_v2', 'done');
    localStorage.setItem('@behappy_language', 'en');
  } catch {}
});
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: path.join(out, `pay-${cardKind}-${name}.png` ) });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  console.log('1. pricing');
  await page.goto(`${app}/pricing`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector(`[data-testid="buy-${product}"]`, { timeout: 60000 });
  await shot('1-pricing');
  await page.click(`[data-testid="buy-${product}"]`);

  console.log('2. review order');
  await page.waitForSelector('[data-testid="checkout-pay"]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const total = await page.textContent('[data-testid="checkout-total"]');
  console.log('   total shown:', total);
  await shot('2-review');
  await page.click('[data-testid="checkout-pay"]');

  console.log('3. Flitt hosted checkout');
  await page.waitForURL(/pay\.flitt\.com/, { timeout: 60000 });
  await page.waitForSelector('input[name="f-card_number"]', { timeout: 60000 });
  await page.fill('input[name="f-card_number"]', CARD);
  await page.fill('input[name="f-expiry_date"]', '1230');
  await page.fill('input[name="f-cvv2"]', '123');
  await shot('3-flitt-filled');
  // The card form's submit button shows the amount ("Pay 51.00GEL"); other
  // buttons such as "Pay by bank" must not match.
  const payButton = page.locator('button', { hasText: /Pay\s+[\d.,]+\s*GEL/i }).first();
  console.log('   pay button:', (await payButton.textContent())?.replace(/\s+/g, ' ').trim());
  await payButton.click();

  console.log('4. back to the app result page');
  if (cardKind === 'decline') {
    // Flitt keeps the payer on its page after a decline (so they can retry);
    // the person then returns to the app, which asks the server for the status.
    await page.getByText(/Declined/i).first().waitFor({ timeout: 60000 });
    await shot('3b-flitt-declined');
    const pending = await page.evaluate(() => null);
    void pending;
    await page.goto(`${app}/checkout/result`, { waitUntil: 'load', timeout: 60000 });
  }
  await page.waitForURL(new RegExp(`${app.replace(/[.:/]/g, (c) => `\\${c}`)}/checkout/result`), { timeout: 120000 });
  console.log('   returned to:', page.url());
  const expected = cardKind === 'decline' ? /didn.t go through/i : /Payment confirmed/i;
  await page.waitForFunction(
    (re) => new RegExp(re, 'i').test(document.querySelector('[data-testid="checkout-result-title"]')?.textContent || ''),
    expected.source,
    { timeout: 90000 }
  );
  const title = await page.textContent('[data-testid="checkout-result-title"]');
  console.log('   result title:', title);
  await page.waitForTimeout(1500);
  await shot('4-result');

  console.log('5. server-side entitlement check');
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('@behappy_account_v1') || '{}').token);
  const me = await (await fetch(`${api}/api/account/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
  console.log('   plus active:', me.entitlements.plus.active, 'expires:', me.entitlements.plus.expiresAt ? new Date(me.entitlements.plus.expiresAt).toISOString() : null);
  const orders = await (await fetch(`${api}/api/payments/orders`, { headers: { Authorization: `Bearer ${token}` } })).json();
  console.log('   latest order:', JSON.stringify(orders.orders[0]));
  const ok = cardKind === 'decline' ? !me.entitlements.artProgram.owned && !me.entitlements.plus.active && (orders.orders[0].status === 'declined' || orders.orders[0].attemptDeclined) : me.entitlements.plus.active && orders.orders[0].status === 'approved';
  console.log(ok ? '\nPASS' : '\nFAIL');
  if (!ok) process.exitCode = 1;
} catch (e) {
  console.error('FAIL', e.message);
  await shot('zz-error').catch(() => {});
  process.exitCode = 1;
} finally {
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await browser.close();
}
