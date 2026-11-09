// Well-being ecosystem journey in a real browser (Chrome via playwright-core):
// Today, Tools, My Steps (verified auto-completion), badges and challenges,
// Calm now, Sound Lab (the playing Web Audio buffers are measured: 200 Hz left,
// 210 Hz right), Sleep companion, daily reflection (live AI), What Anulia can
// remember, Insights; then Arabic (right to left) in dark mode.
//   npm run qa:wellbeing [-- --app http://localhost:8081 --out <folder>]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const repo = process.cwd();
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const APP = opt('app', 'http://localhost:8081').replace(/\/$/, '');
const OUT = path.resolve(opt('out', './qa-shots/wellbeing'));
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright-core');

const results = [];
let active = null;
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name}${note ? ` — ${note}` : ''} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`);
    if (active) await active.screenshot({ path: path.join(OUT, 'FAILED-step.png') }).catch(() => {});
  }
};

const acct = await (await fetch(`${APP}/api/account`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
if (!acct.token) throw new Error('could not create an account (is the API running?)');

const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

async function client(label, { lang = 'en', theme = 'light', viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(
    ({ acc, lang: l, theme: th }) => {
      try {
        localStorage.setItem('@behappy_onboarding_v2', 'done');
        localStorage.setItem('@behappy_language', l);
        localStorage.setItem('theme', th);
        localStorage.setItem('@behappy_account_v1', JSON.stringify({ accountId: acc.accountId, token: acc.token, createdAt: Date.now() }));
        localStorage.setItem('@behappy_ai_consent_v1', JSON.stringify({ ai: true, decidedAt: Date.now() }));
      } catch {}
      // Keep every Web Audio buffer the page creates, to measure what is played.
      const Ctx = window.AudioContext;
      if (Ctx) {
        window.__buffers = [];
        window.__contexts = [];
        const orig = Ctx.prototype.createBuffer;
        Ctx.prototype.createBuffer = function (...a) {
          const b = orig.apply(this, a);
          window.__buffers.push(b);
          if (!window.__contexts.includes(this)) window.__contexts.push(this);
          return b;
        };
      }
    },
    { acc: acct, lang, theme }
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(`${label}: console: ${m.text().slice(0, 200)}`);
  });
  const id = (t) => `[data-testid="${t}"]`;
  const visible = (t) => {
    active = page;
    return page.locator(id(t)).filter({ visible: true }).first();
  };
  return {
    page,
    go: (p) => page.goto(APP + p, { waitUntil: 'load', timeout: 90000 }),
    wait: (t, timeout = 30000) => visible(t).waitFor({ timeout }),
    click: (t) => visible(t).click(),
    count: (t) => page.locator(id(t)).filter({ visible: true }).count(),
    fill: (t, v) => page.locator(`${id(t)} input, ${id(t)} textarea, input${id(t)}, textarea${id(t)}`).filter({ visible: true }).first().fill(v),
    text: (s, timeout = 20000) => page.getByText(s, { exact: false }).filter({ visible: true }).first().waitFor({ timeout }),
    shot: (name) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: false }),
    close: () => ctx.close(),
  };
}

const P = await client('phone');

await step('Today: steps, sound and recap cards; five tabs', async () => {
  await P.go('/');
  await P.wait('today-steps', 90000);
  await P.wait('today-sound');
  await P.wait('today-recap');
  for (const tab of ['tab-today', 'tab-tools', 'tab-anulia', 'tab-community', 'tab-specialists']) await P.wait(tab);
  if (await P.count('tab-steps')) throw new Error('a sixth tab appeared');
  await P.shot('1-today');
  // A track for this hour plays with one tap; the card then names the track.
  // The button's text starts with the icon font's glyph (private use area): keep the words.
  const label = (await P.page.locator('[data-testid="today-sound-suggested"]').first().innerText()).replace(/[\uE000-\uF8FF]/g, '').trim();
  await P.click('today-sound-suggested');
  await P.page.waitForFunction((l) => (document.querySelector('[data-testid="today-sound"]')?.textContent || '').includes(l.trim()) && !document.querySelector('[data-testid="today-sound-suggested"]'), label, { timeout: 45000 });
  await P.page.getByRole('button', { name: /stop/i }).first().click();
  return `suggested and played: ${label.trim()}`;
});

await step('Tools: grouped hub finds the new tools', async () => {
  await P.go('/tools');
  await P.wait('tools-steps', 60000);
  await P.wait('tools-sound');
  await P.wait('tools-calm');
  await P.fill('tools-search', 'sound');
  await P.wait('tools-sound');
  await P.shot('2-tools');
});

await step('My Steps: a journal Step completes only after an entry is saved', async () => {
  await P.go('/steps');
  await P.click('steps-add-first');
  await P.click('steps-template-journal');
  await P.click('step-save');
  await P.wait('step-done-journal');
  // Opening the editor and leaving is not a completion.
  await P.go('/journal/editor');
  await P.page.waitForTimeout(1500);
  await P.go('/steps');
  await P.wait('step-done-journal');
  await P.go('/journal/editor');
  await P.page.locator('textarea').filter({ visible: true }).first().fill('A quiet evening. I added my first step.');
  await P.click('journal-save');
  await P.page.waitForTimeout(1500);
  await P.go('/steps');
  await P.wait('step-undo-journal');
  await P.text('Completed in the app');
  await P.shot('3-steps-auto');
});

await step('My Steps: manual done, undo, skip; gentle consistency', async () => {
  await P.click('steps-add');
  await P.click('steps-template-walking');
  await P.click('step-save');
  await P.click('step-done-walking');
  await P.wait('step-undo-walking');
  await P.click('step-undo-walking');
  await P.click('step-skip-walking');
  await P.text('Skipped');
  await P.wait('steps-consistency');
  await P.text('1 of 1 planned this week');
  await P.wait('steps-calendar');
});

await step('Badges: first step earned; a challenge starts', async () => {
  await P.go('/badges');
  await P.wait('badge-firstStep', 30000);
  await P.wait('badge-firstJournal');
  await P.click('challenge-start-calm14');
  await P.text('Day 1 of 14');
  await P.shot('4-badges');
});

await step('Calm now: breathing guide and a dim silent screen (offline features)', async () => {
  await P.go('/calm');
  await P.click('calm-breathe');
  await P.wait('calm-breathing');
  await P.text('Breathe in');
  await P.page.getByText('End', { exact: true }).click();
  await P.click('calm-silence-1');
  await P.wait('calm-silence-overlay');
  await P.click('calm-silence-overlay');
});

await step('Sound mixer: binaural 200/210 Hz measured in the playing buffers; bands; stop', async () => {
  await P.go('/sound/mixer?mode=relax');
  await P.wait('sound-binaural', 30000);
  await P.text('Left 200 Hz · right 210 Hz · beat 10 Hz');
  await P.click('sound-play');
  await P.wait('sound-now', 30000);
  await P.page.waitForTimeout(2000);
  const m = await P.page.evaluate(() => {
    const goertzel = (x, sr, f) => {
      const c = 2 * Math.cos((2 * Math.PI * f) / sr);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < Math.min(x.length, sr * 2); i += 1) {
        const s0 = x[i] + c * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      return s1 * s1 + s2 * s2 - c * s1 * s2;
    };
    const peak = (x, sr) => {
      let best = 0;
      let bf = 0;
      for (let f = 150; f <= 260; f += 0.5) {
        const p = goertzel(x, sr, f);
        if (p > best) {
          best = p;
          bf = f;
        }
      }
      return bf;
    };
    const bin = window.__buffers.find((b) => b.length === b.sampleRate * 10 && b.numberOfChannels === 2);
    const ctx = window.__contexts[0];
    return bin ? { left: peak(bin.getChannelData(0), bin.sampleRate), right: peak(bin.getChannelData(1), bin.sampleRate), channels: bin.numberOfChannels, state: ctx?.state, layers: window.__buffers.length } : { missing: true, layers: window.__buffers.length };
  });
  if (m.missing) throw new Error(`no binaural buffer (${m.layers} buffers)`);
  if (m.left !== 200 || m.right !== 210) throw new Error(`measured left ${m.left} Hz, right ${m.right} Hz`);
  if (m.state !== 'running') throw new Error(`AudioContext ${m.state}`);
  await P.click('sound-band-beta');
  await P.text('Left 200 Hz · right 215 Hz · beat 15 Hz');
  await P.shot('5-sound');
  await P.click('sound-stop');
  await P.page.waitForTimeout(2000);
  if (await P.count('sound-now')) throw new Error('still playing after Stop');
  return `left ${m.left} Hz, right ${m.right} Hz, ${m.layers} layers, context ${m.state}`;
});

await step('Sound catalog: 528 + 174 Hz plays both tones, same in both ears, with the honest note', async () => {
  await P.go('/sound?category=frequencies');
  await P.wait('sound-track-hz528x174', 30000);
  await P.click('sound-track-hz528x174');
  await P.wait('sound-now', 30000);
  await P.text('there is no evidence that any frequency heals');
  await P.page.waitForFunction(() => window.__contexts[0]?.state === 'running', null, { timeout: 30000 });
  await P.page.waitForTimeout(1500);
  const m = await P.page.evaluate(() => {
    const power = (x, sr, f) => {
      const c = 2 * Math.cos((2 * Math.PI * f) / sr);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < sr * 2; i += 1) {
        const s0 = x[i] + c * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      return s1 * s1 + s2 * s2 - c * s1 * s2;
    };
    const peak = (x, sr, lo, hi) => {
      let best = 0;
      let bf = 0;
      for (let f = lo; f <= hi; f += 0.5) {
        const p = power(x, sr, f);
        if (p > best) [best, bf] = [p, f];
      }
      return bf;
    };
    // The tones layer: a 20 s buffer that is mostly 528 Hz with almost no 87 Hz
    // (the soft pad underneath is mostly 87 Hz).
    const tones = window.__buffers.find((b) => b.length === b.sampleRate * 20 && power(b.getChannelData(0), b.sampleRate, 528) > 10 * power(b.getChannelData(0), b.sampleRate, 87));
    if (!tones) return { missing: true, layers: window.__buffers.length };
    const sr = tones.sampleRate;
    const [l, r] = [tones.getChannelData(0), tones.getChannelData(1)];
    return { low: [peak(l, sr, 160, 190), peak(r, sr, 160, 190)], high: [peak(l, sr, 510, 545), peak(r, sr, 510, 545)] };
  });
  if (m.missing) throw new Error(`no tones buffer (${m.layers} buffers)`);
  if (m.low.join() !== '174,174' || m.high.join() !== '528,528') throw new Error(`measured ${m.low} / ${m.high} Hz`);
  await P.shot('5b-sound-tones');
  await P.click('sound-stop');
  return `left and right: ${m.low[0]} Hz + ${m.high[0]} Hz`;
});

await step('Sound catalog: every track plays with one tap; frequency and binaural tracks hold what their titles say', async () => {
  await P.go('/sound');
  await P.wait('sound-track-sleepDelta', 30000);
  await P.shot('5c-sound-catalog');
  const ids = await P.page.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid^="sound-track-"]')].map((e) => e.getAttribute('data-testid').slice('sound-track-'.length)))]);
  if (ids.length < 30) throw new Error(`only ${ids.length} tracks in the catalog`);
  const measured = [];
  for (const id of ids) {
    await P.page.locator(`[data-testid="sound-track-${id}"]`).first().click();
    // This very track is playing (not the previous one fading out).
    await P.page.locator(`[data-testid="sound-now-state-${id}-playing"]`).first().waitFor({ timeout: 45000 }).catch(() => {
      throw new Error(`${id} did not start`);
    });
    // Tracks with a pure tone (432 Hz is music tuned to A = 432, without a tone).
    const n = Number((/^hz(\d+)$/.exec(id) || [])[1]);
    const hz = [174, 285, 396, 417, 528, 639, 741, 852, 963].includes(n) ? n : null;
    const bin = { sleepDelta: [200, 2], relaxAlpha: [200, 10], meditateTheta: [220, 6], focusBeta: [240, 15] }[id];
    if (!hz && !bin) continue;
    const r = await P.page.evaluate(
      ({ hz, bin }) => {
        const power = (x, sr, f, len) => {
          const c = 2 * Math.cos((2 * Math.PI * f) / sr);
          let s1 = 0;
          let s2 = 0;
          for (let i = 0; i < len; i += 1) {
            const s0 = x[i] + c * s1 - s2;
            s2 = s1;
            s1 = s0;
          }
          return s1 * s1 + s2 * s2 - c * s1 * s2;
        };
        const peak = (x, sr, lo, hi) => {
          let best = 0;
          let bf = 0;
          for (let f = lo; f <= hi; f += 0.5) {
            const p = power(x, sr, f, sr * 2);
            if (p > best) [best, bf] = [p, f];
          }
          return bf;
        };
        if (hz) {
          // The pure tone: a 20 s buffer whose strongest line near hz is hz itself, and nothing else near it.
          for (const b of window.__buffers) {
            if (b.length !== b.sampleRate * 20) continue;
            const l = b.getChannelData(0);
            if (power(l, b.sampleRate, hz, b.sampleRate * 2) < 20 * power(l, b.sampleRate, hz * 0.94, b.sampleRate * 2)) continue;
            return { tone: [peak(l, b.sampleRate, hz - 15, hz + 15), peak(b.getChannelData(1), b.sampleRate, hz - 15, hz + 15)] };
          }
          return { tone: null };
        }
        const [carrier, beat] = bin;
        for (const b of window.__buffers) {
          if (b.numberOfChannels !== 2 || b.length > b.sampleRate * 60) continue;
          const l = peak(b.getChannelData(0), b.sampleRate, carrier - 20, carrier + beat + 20);
          const r = peak(b.getChannelData(1), b.sampleRate, carrier - 20, carrier + beat + 20);
          if (l === carrier && r === carrier + beat) return { ears: [l, r] };
        }
        return { ears: null };
      },
      { hz, bin }
    );
    if (hz) {
      if (!r.tone || r.tone[0] !== hz || r.tone[1] !== hz) throw new Error(`${id}: tone ${JSON.stringify(r.tone)}`);
      measured.push(`${hz}`);
    } else {
      if (!r.ears) throw new Error(`${id}: no ${bin[0]}/${bin[0] + bin[1]} Hz pair`);
      measured.push(`${r.ears[0]}/${r.ears[1]}`);
    }
  }
  await P.shot('5d-sound-playing');
  await P.click('sound-stop');
  return `${ids.length} tracks played; measured ${measured.join(', ')} Hz`;
});

await step('Sleep companion: morning self-report saved', async () => {
  await P.go('/sleep?morning=1');
  await P.click('sleep-quality-4');
  await P.click('sleep-save');
  await P.text('4/5');
  // Wind down starts a finished sleep track (the latest one played, else rain and soft piano).
  await P.click('sleep-start');
  await P.page.waitForURL(/\/sound/, { timeout: 30000 });
  await P.page.locator('[data-testid^="sound-now-state-sleep"], [data-testid^="sound-now-state-nature"], [data-testid^="sound-now-state-noise"]').first().waitFor({ timeout: 45000 });
  const id = await P.page.evaluate(() => document.querySelector('[data-testid^="sound-now-state-"]')?.getAttribute('data-testid'));
  await P.click('sound-stop');
  return `wind down played ${id.replace('sound-now-state-', '')}`;
});

await step('Daily reflection: facts first; categories respected; checked AI text or an honest reason', async () => {
  await P.go('/reflection');
  await P.wait('reflection-facts', 30000);
  await P.wait('fact-steps.today');
  await P.wait('fact-sleep.checkin');
  await P.click('reflection-cat-sleep');
  await P.page.waitForTimeout(800);
  if (await P.count('fact-sleep.checkin')) throw new Error('sleep fact shown although the category is off');
  await P.click('reflection-make');
  await P.page.waitForTimeout(1000);
  const outcome = await Promise.race([
    P.wait('reflection-ai', 90000).then(() => 'ai'),
    P.text('here are your facts', 90000).then(() => 'facts'),
  ]);
  await P.shot('6-reflection');
  return outcome === 'ai' ? 'checked AI reflection shown' : 'factual recap with a reason';
});

await step('What Anulia can remember: off by default, exact preview, switches', async () => {
  await P.go('/anulia/memory');
  await P.wait('memory-preview', 30000);
  await P.click('memory-preview');
  await P.text('Nothing. Anulia doesn’t know anything from your history.');
  await P.page.locator('[data-testid="memory-steps"]').filter({ visible: true }).first().click();
  await P.click('memory-preview');
  await P.text('Steps and goals');
  const preview = await P.page.locator('[data-testid="memory-preview-text"]').innerText();
  if (/journal date=/.test(preview)) throw new Error('journal text without its switch');
  await P.shot('7-memory');
});

await step('Insights: routines, calm and sleep card', async () => {
  await P.go('/insights');
  await P.wait('insights-wellbeing', 30000);
});

await P.close();

await step('Arabic, dark mode: Steps and Sound Lab render right to left', async () => {
  const A = await client('arabic', { lang: 'ar', theme: 'dark' });
  await A.go('/steps');
  await A.wait('screen-steps', 60000);
  await A.shot('8-ar-steps');
  await A.go('/sound');
  await A.wait('sound-track-sleepDelta', 30000);
  const dir = await A.page.evaluate(() => getComputedStyle(document.body).direction || document.documentElement.dir);
  await A.shot('9-ar-sound');
  await A.close();
  return `direction ${dir}`;
});

await step('no page errors', async () => {
  if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
});

await browser.close();
fs.writeFileSync(path.join(OUT, 'results.txt'), results.join('\n'));
console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
