// Opens a Flitt TEST checkout URL and lists its form fields (for writing the E2E test).
//   node scripts/qa/flitt-inspect.mjs <checkout_url> <out.png>
import { chromium } from 'playwright-core';

const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: out, fullPage: true });
const describe = async (frame, label) => {
  const fields = await frame.$$eval('input, button, select', (els) =>
    els.map((e) => ({ tag: e.tagName, type: e.getAttribute('type'), name: e.getAttribute('name'), id: e.id, ph: e.getAttribute('placeholder'), aria: e.getAttribute('aria-label'), text: (e.textContent || '').trim().slice(0, 40), visible: !!(e.offsetWidth || e.offsetHeight) }))
  );
  console.log(`--- ${label}: ${frame.url().slice(0, 100)}`);
  for (const f of fields.filter((x) => x.visible)) console.log(JSON.stringify(f));
};
await describe(page.mainFrame(), 'main');
for (const f of page.frames()) if (f !== page.mainFrame()) await describe(f, 'frame');
await browser.close();
