// Live evaluation of art-reflection models through the real checking pipeline
// (server/art/turn.mjs) with synthetic conversations and synthetic drawings —
// no real person's data. Costs real OpenAI tokens (a few dollars at most).
//
//   node scripts/qa/art-model-eval.mjs --models gpt-6.1-sol,gpt-5.4-mini [--reasoning medium] [--only regression,identical] [--out docs/eval/x.json]
//
// For every turn it records what the RAW model answered (before the app's
// checks) and what the person would see, plus latency and tokens. The rubric
// (docs/BEHAPPY_AI_MODEL_EVALUATION.md) is binary per turn:
//   json        the first answer was one complete JSON object
//   contradict  the raw answer reversed the person's stated feeling
//   visual      the raw answer described a drawing change the comparison didn't find
//   state       the raw answer broke the three-phase state (needed a state fix)
//   language    the shown text is in the selected language (script check)
//   twoQ        an image-upload turn asked exactly two questions (raw)
import fs from 'node:fs';
import path from 'node:path';

import { createArtTurns } from '../../server/art/turn.mjs';
import { config as serverConfig } from '../../server/config.mjs';
import { SERVER_PROMPTS } from '../../server/prompts/index.mjs';
import * as img from '../../server/test/art-images.mjs';
import { startTestServer } from '../../server/test/helpers.mjs';

const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const MODELS = arg('models', 'gpt-6.1-sol,gpt-5.4-mini').split(',');
const REASONING = arg('reasoning', 'medium');
const ONLY = arg('only', '') ? new Set(arg('only', '').split(',')) : null;
const OUT = arg('out', '');
// USD per 1M tokens (input, output), published list prices (Nov 2026); cached input not discounted here.
const PRICES = { 'gpt-6.1-sol': [2, 10], 'gpt-6.1-terra': [1, 5], 'gpt-6-astra': [10, 50], 'gpt-5.4-mini': [0.75, 4.5] };

// A photo of a crayon drawing on paper: uneven strokes, paper grain, uneven light.
function crayon() {
  const c = img.canvas(640, 480, [238, 232, 218]);
  let seed = 11;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const blob = (cx, cy, r, col, density = 0.7) => {
    for (let k = 0; k < r * r * 2.2; k += 1) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * (0.9 + rnd() * 0.2);
      if (rnd() < density) img.circle(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.6, col);
    }
  };
  const stroke = (x0, y0, x1, y1, col, w = 3) => {
    const n = Math.hypot(x1 - x0, y1 - y0);
    for (let i = 0; i < n; i += 1.5) img.circle(c, x0 + ((x1 - x0) * i) / n + (rnd() - 0.5) * 3, y0 + ((y1 - y0) * i) / n + (rnd() - 0.5) * 3, w * (0.6 + rnd() * 0.6), col);
  };
  blob(320, 170, 80, [205, 52, 45]);
  for (let k = 0; k < 10; k += 1) { const a = (k / 10) * Math.PI * 2; stroke(320 + Math.cos(a) * 95, 170 + Math.sin(a) * 95, 320 + Math.cos(a) * 140, 170 + Math.sin(a) * 140, [230, 170, 40]); }
  for (let y = 300; y < 340; y += 9) stroke(40, y + rnd() * 8, 600, y + rnd() * 8, [50, 90, 190], 2.5);
  for (let x = 50; x < 600; x += 7) stroke(x, 420, x + (rnd() - 0.5) * 10, 380 - rnd() * 25, [70, 140, 70], 1.6);
  return img.noise(img.lighting(c, { gradient: 0.18, gain: 0.97 }), 9);
}
const base = crayon();
const FIRST = img.encode(base, 85);
const LIGHTING = img.encode(img.lighting(base, { gain: 0.8, gradient: 0.3, cast: [1.07, 1, 0.9] }), 78);
const MODIFIED = img.encode(img.circle(img.clone(base), 520, 110, 45, [35, 30, 40]), 85);
// Seen in a real session: a few thin dark strokes added across the middle of the same picture.
const STROKES = (() => {
  const c = img.clone(base);
  const y = Math.round(c.h / 2);
  for (const [x, dy] of [[0.1, -4], [0.22, 2], [0.55, -2], [0.72, 4]]) img.rect(c, Math.round(c.w * x), y + dy, Math.round(c.w * x) + 34, y + dy + 3, [25, 25, 30]);
  return img.encode(c, 85);
})();

const RU = 'Russian (Русский)';
const KA = 'Georgian (ქართული)';
const EN = 'English';

// A scenario is a list of person turns. phase = the app's phase before the turn.
const SCENARIOS = {
  regression: { lang: RU, turns: [{ image: FIRST }, { text: 'witeli' }, { text: 'energia' }, { text: 'tavshi' }, { text: 'naprajenie' }, { text: 'ara sasiamovno', expect: -1 }] },
  pleasant_ka: { lang: RU, turns: [{ image: FIRST }, { text: 'kargad vgrdznob da vgrdznobdi', expect: 1 }, { text: 'bevri peri', expect: 1 }] },
  mixed: { lang: RU, turns: [{ image: FIRST }, { text: 'сначала было naprajenie, mere ufro mshvidad var' }, { text: 'не знаю' }, { text: 'не знаю' }] },
  georgian_ui: { lang: KA, turns: [{ image: FIRST }, { text: 'ცოტა მძიმედ, დაძაბულობა მკერდში', expect: -1 }, { text: 'არ ვიცი' }] },
  english_short: { lang: EN, turns: [{ image: FIRST }, { text: 'not good', expect: -1 }, { text: 'tense', expect: -1 }] },
  stop: { lang: RU, turns: [{ image: FIRST }, { text: 'спокойно' }, { text: 'давайте закончим сессию на этом', closes: true }] },
  identical: { lang: RU, turns: [{ image: FIRST }, { text: 'красный это энергия' }, { text: 'хочу изменить рисунок', phase: 1 }, { image: FIRST, phase: 1, v2: 'identical' }, { text: 'да', phase: 1, compare: 'identical' }, { text: 'это ничего не значит', phase: 1 }, { text: 'давайте закончим', phase: 2, closes: true }] },
  lighting: { lang: RU, turns: [{ image: FIRST }, { text: 'красный это энергия' }, { text: 'хочу изменить рисунок', phase: 1 }, { image: LIGHTING, phase: 1, v2: 'likely_same' }, { text: 'спокойно', phase: 1, compare: 'likely_same' }] },
  strokes: { lang: KA, turns: [{ image: FIRST }, { text: 'mzes vxatavdi, sixarulia' }, { text: 'minda naxati shevcvalo', phase: 1 }, { image: STROKES, phase: 1, v2: 'different' }, { text: 'ki', phase: 1, compare: 'different' }] },
  modified: { lang: RU, turns: [{ image: FIRST }, { text: 'солнце это радость' }, { text: 'хочу изменить рисунок', phase: 1 }, { image: MODIFIED, phase: 1, v2: 'different' }, { text: 'интересно', phase: 1, compare: 'different' }] },
};

const scriptOk = (text, lang) => {
  const letters = String(text).replace(/[^\p{L}]/gu, '');
  if (!letters) return false;
  const share = (re) => (letters.match(re) || []).length / letters.length;
  if (lang === RU) return share(/[А-Яа-яЁё]/g) > 0.6;
  if (lang === KA) return share(/[ა-ჰ]/g) > 0.6;
  return share(/[A-Za-z]/g) > 0.6;
};

const contextBlock = (lang, phase, closes) =>
  `\n\n[Session Context: Theme: Inner weather, Language: ${lang}, Phase: ${phase}. CRITICAL: You MUST respond in ${lang} language for ALL text. Respond with valid JSON matching the ArtTherapyResponse schema.]` +
  (closes ? '\n[Prior Sessions]\n[User Action: The person asked to close the session via text.]' : '');

async function runScenario(t, artTurns, accountId, name, sc, runId) {
  let prev;
  let phase = 0;
  const rows = [];
  for (const [i, turnSpec] of sc.turns.entries()) {
    phase = turnSpec.phase ?? phase;
    const HERE = { [RU]: turnSpec.v2 ? 'Вот изменённый рисунок на бумаге.' : 'Вот мой рисунок цветными карандашами на бумаге.', [KA]: 'აი ჩემი ნახატი ფერადი ფანქრებით ქაღალდზე.', [EN]: 'Here is my drawing with coloured pencils on paper.' };
    const text = turnSpec.text || (turnSpec.image ? HERE[sc.lang] : '');
    const content = [{ type: 'input_text', text: text + contextBlock(sc.lang, phase, turnSpec.closes) }];
    // As the app does: a changed drawing goes with the first one, labelled, side by side.
    if (turnSpec.image && turnSpec.v2) content.push({ type: 'input_text', text: '[First drawing — before the change:]' }, { type: 'input_image', image_url: sc.turns[0].image, detail: 'high' }, { type: 'input_text', text: '[Changed drawing — after the change:]' });
    if (turnSpec.image) content.push({ type: 'input_image', image_url: turnSpec.image, detail: 'high' });
    const clean = { input: [{ role: 'user', content }], instructions: SERVER_PROMPTS.art.instructions, ...(prev ? { previous_response_id: prev } : {}) };
    const out = await artTurns.run({ accountId, artSessionId: 1, runIdHeader: runId, clean });
    if (out.status !== 200) {
      rows.push({ scenario: name, turn: i, error: out.error, status: out.status });
      break;
    }
    prev = out.id;
    const first = out.report.drafts?.[0] || {};
    // The FIRST answer of the model, before any retry or fix by the app.
    const problems = out.report.attempts?.[0] || [];
    const STATE = ['phase_backwards', 'phase_skipped', 'premature_close', 'no_second_image', 'close_with_question', 'image_v1_after_phase_0', 'image_v2_outside_phase_1'];
    const stateFixes = problems.filter((p) => p.startsWith('state_')).map((p) => p.slice(6)).filter((f) => STATE.includes(f));
    rows.push({
      scenario: name,
      turn: i,
      person: turnSpec.text || (turnSpec.image ? `[image${turnSpec.v2 ? ` v2: ${turnSpec.v2}` : ''}]` : ''),
      raw: first.text,
      shown: out.final.response_text,
      summary: out.final.session_summary || '',
      rawSummary: first.summary || '',
      phase: out.final.session_phase,
      action: out.final.action,
      complete: out.final.session_complete,
      json: !problems.some((p) => ['not_json', 'incomplete', 'no_response_text', 'empty'].includes(p)),
      contradict: problems.includes('contradiction'),
      visual: problems.includes('visual_claim'),
      clinical: problems.includes('clinical'),
      summaryFixed: problems.some((p) => p.startsWith('summary_')),
      state: stateFixes.length > 0,
      stateFixes,
      language: scriptOk(out.final.response_text, sc.lang),
      twoQ: turnSpec.image && !turnSpec.v2 ? (String(first.text || '').match(/[?？]/g) || []).length === 2 : null,
      comparison: out.report.comparison,
      calls: out.report.calls,
      ms: out.report.ms,
      firstMs: first.ms,
      inTok: out.usage.input_tokens,
      outTok: out.usage.output_tokens,
      closesAsExpected: turnSpec.closes ? out.final.session_complete === true : null,
    });
    phase = out.final.session_phase;
    process.stdout.write('.');
  }
  return rows;
}

const t = await startTestServer({ openai: globalThis.fetch });
const results = [];
for (const model of MODELS) {
  const config = {
    openai: { apiKey: serverConfig.openai.apiKey, baseUrl: serverConfig.openai.baseUrl },
    ai: { models: { art: model }, art: { reasoning: REASONING, maxOutputTokens: 8000, store: true, keepDrafts: true, fallbackModel: null, timeoutMs: 180000 } },
  };
  const artTurns = createArtTurns({ db: t.db, config, fetchImpl: globalThis.fetch });
  const account = await t.newAccount();
  process.stdout.write(`\n${model} (${REASONING}) `);
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    if (ONLY && !ONLY.has(name)) continue;
    // Run ids allow only [A-Za-z0-9_-]: one clean run (own facts, own drawings) per scenario.
    const rows = await runScenario(t, artTurns, account.accountId, name, sc, `eval-${model.replace(/[^A-Za-z0-9_-]/g, "_")}-${name}-${Date.now()}`.slice(0, 64));
    for (const r of rows) results.push({ model, reasoning: REASONING, ...r });
  }
}
await t.stop();

// ---------- Summary ----------
const by = (m) => results.filter((r) => r.model === m && !r.error);
const pct = (arr, k) => (arr.length ? `${Math.round((arr.filter((r) => r[k]).length / arr.length) * 100)}%` : '–');
console.log('\n\n| model | turns | errors | JSON ok (1st) | contradicted (raw) | invented change (raw) | state fix | summary fixed | language ok | 2 questions on image | median ms (1st call) | avg in/out tokens | est. $/turn |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const m of MODELS) {
  const rows = by(m);
  const errs = results.filter((r) => r.model === m && r.error).length;
  const med = (v) => (v.length ? v.sort((a, b) => a - b)[Math.floor(v.length / 2)] : 0);
  const avgIn = rows.reduce((s, r) => s + r.inTok, 0) / (rows.length || 1);
  const avgOut = rows.reduce((s, r) => s + r.outTok, 0) / (rows.length || 1);
  const [pi, po] = PRICES[m] || [0, 0];
  const cost = (avgIn * pi + avgOut * po) / 1e6;
  const imgRows = rows.filter((r) => r.twoQ !== null);
  console.log(`| ${m} | ${rows.length} | ${errs} | ${pct(rows, 'json')} | ${rows.filter((r) => r.contradict).length} | ${rows.filter((r) => r.visual).length} | ${rows.filter((r) => r.state).length} | ${rows.filter((r) => r.summaryFixed).length} | ${pct(rows, 'language')} | ${imgRows.filter((r) => r.twoQ).length}/${imgRows.length} | ${med(rows.map((r) => r.firstMs || r.ms))} | ${Math.round(avgIn)}/${Math.round(avgOut)} | ${cost ? cost.toFixed(4) : 'n/a'} |`);
}
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), reasoning: REASONING, models: MODELS, prices: PRICES, results }, null, 2));
  console.log(`\nwritten ${OUT}`);
}
