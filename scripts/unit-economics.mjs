// BeHappy unit economics: what one user costs per month, and what each plan
// earns after payment fees, for several usage profiles.
//
//   node scripts/unit-economics.mjs                 # Markdown tables
//   node scripts/unit-economics.mjs --json          # raw numbers
//   node scripts/unit-economics.mjs --assumptions my.json   # deep-merged overrides
//
// Every number below is an ASSUMPTION unless marked as a quoted price. Check
// quoted prices before relying on them; they change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);

export const DEFAULTS = {
  asOf: '2026-11',
  // Quoted: NBG official rate was about 2.62 GEL per USD in Aug 2026. Rounded up to be conservative.
  usdToGel: 2.65,
  // Quoted: Flitt lists 2.5% for international cards (0-50k GEL monthly volume). The
  // domestic-card rate is not published; 2.5% is used for every payment.
  paymentFee: 0.025,
  // Georgian VAT is 18% once the business is VAT-registered. Prices shown are final,
  // so VAT would come out of them. 0 = not registered.
  vatRate: 0,
  // Hosting, storage and monitoring per active user per month (assumption).
  infraUsdPerActiveUser: 0.05,
  // Quoted: gpt-5.4-mini, USD per 1M tokens (OpenAI model page, Nov 2026).
  model: { inputPerM: 0.75, cachedInputPerM: 0.075, outputPerM: 4.5 },
  // Share of the repeated prompt/history prefix billed at the cached rate.
  cacheShare: 0.5,
  // Quoted (third-party, launch pricing): gpt-4o-mini-transcribe and gpt-4o-mini-tts.
  transcribeUsdPerMin: 0.003,
  ttsUsdPerMin: 0.015,
  // Token sizes per turn (assumptions, measured roughly from the hosted prompts).
  features: {
    anulia: { promptTokens: 3000, userTokens: 90, outputTokens: 230, reasoningTokens: 150, turnsPerConversation: 10, summaryOutputTokens: 300 },
    art: { promptTokens: 6500, userTokens: 70, outputTokens: 320, reasoningTokens: 200, turnsPerSession: 8, imageTokens: 1500, imagesPerSession: 2 },
    cards: { promptTokens: 3500, userTokens: 60, outputTokens: 240, reasoningTokens: 150, turnsPerConversation: 8, imageTokens: 1500, imagesPerConversation: 1 },
    journal: { promptTokens: 500, entryTokens: 350, outputTokens: 260, reasoningTokens: 100 },
    voice: { minutesPerClip: 0.5, minutesPerListen: 1.1 },
  },
  // Monthly usage per profile. "cap" = every daily limit used every day (worst case).
  profiles: {
    free: { anuliaMessages: 23, artSessions: 1, cardConversations: 1, journalReflections: 8, voiceClips: 4, listens: 4 },
    light: { anuliaMessages: 60, artSessions: 4, cardConversations: 2, journalReflections: 8, voiceClips: 10, listens: 5 },
    typical: { anuliaMessages: 250, artSessions: 10, cardConversations: 8, journalReflections: 20, voiceClips: 40, listens: 20 },
    heavy: { anuliaMessages: 700, artSessions: 22, cardConversations: 30, journalReflections: 60, voiceClips: 150, listens: 90 },
  },
  plans: {
    current: [
      { id: 'plus_30', label: 'Plus 30 days', priceGel: 51, months: 1 },
      { id: 'plus_90', label: 'Plus 90 days', priceGel: 142, months: 3 },
      { id: 'plus_365', label: 'Plus 365 days', priceGel: 519, months: 12 },
    ],
    proposal: [
      { id: 'plus_30', label: 'Plus 30 days', priceGel: 29, months: 1 },
      { id: 'plus_365', label: 'Plus 365 days', priceGel: 249, months: 12 },
    ],
  },
  artProgram: { priceGel: 50, sessions: 43 },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => {
  if (!isObj(b)) return b === undefined ? a : b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a?.[k]) ? merge(a[k], v) : v;
  return out;
};

/** Monthly worst case taken from the server's real daily limits. */
async function capProfile() {
  const { LIMITS } = await import(path.join(root, 'server/quota.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const p = LIMITS.plus;
  const days = 30;
  return {
    anuliaMessages: p.anulia.messages * days,
    artSessions: p.art.newSessions * days,
    cardConversations: p.cards.conversations * days,
    journalReflections: p.journal.reflections * days,
    voiceClips: p.transcribe.count * days,
    listens: p.speech.count * days,
  };
}

export function unitCosts(A) {
  const { inputPerM, cachedInputPerM, outputPerM } = A.model;
  const inRate = ((1 - A.cacheShare) * inputPerM + A.cacheShare * cachedInputPerM) / 1e6;
  const outRate = outputPerM / 1e6;

  // A chained conversation re-sends the prompt and the history on every turn.
  const conversation = ({ promptTokens: P, userTokens: u, outputTokens: o, reasoningTokens: r = 0 }, turns, images = 0, imageTokens = 0) => {
    let input = 0;
    for (let k = 1; k <= turns; k += 1) input += P + (k - 1) * (u + o) + u;
    for (let i = 0; i < images; i += 1) {
      const uploadedAt = 1 + Math.floor((i * turns) / Math.max(images, 1));
      input += imageTokens * (turns - uploadedAt + 1);
    }
    const output = turns * (o + r);
    return { input, output, usd: input * inRate + output * outRate };
  };

  const f = A.features;
  const anuliaConv = conversation(f.anulia, f.anulia.turnsPerConversation);
  const summaryUsd = (f.anulia.turnsPerConversation * (f.anulia.userTokens + f.anulia.outputTokens) + 400) * inRate + f.anulia.summaryOutputTokens * outRate;
  const art = conversation(f.art, f.art.turnsPerSession, f.art.imagesPerSession, f.art.imageTokens);
  const cards = conversation(f.cards, f.cards.turnsPerConversation, f.cards.imagesPerConversation, f.cards.imageTokens);
  const journalUsd = (f.journal.promptTokens + f.journal.entryTokens) * inRate + (f.journal.outputTokens + f.journal.reasoningTokens) * outRate;
  return {
    anuliaMessage: (anuliaConv.usd + summaryUsd) / f.anulia.turnsPerConversation,
    artSession: art.usd,
    cardConversation: cards.usd,
    journalReflection: journalUsd,
    voiceClip: f.voice.minutesPerClip * A.transcribeUsdPerMin,
    listen: f.voice.minutesPerListen * A.ttsUsdPerMin,
  };
}

export function monthlyCost(A, unit, usage) {
  const parts = {
    anulia: usage.anuliaMessages * unit.anuliaMessage,
    art: usage.artSessions * unit.artSession,
    cards: usage.cardConversations * unit.cardConversation,
    journal: usage.journalReflections * unit.journalReflection,
    voice: usage.voiceClips * unit.voiceClip + usage.listens * unit.listen,
    infra: A.infraUsdPerActiveUser,
  };
  return { ...parts, total: Object.values(parts).reduce((s, x) => s + x, 0) };
}

const netMonthlyGel = (A, plan) => (plan.priceGel / plan.months) * (1 - A.paymentFee) / (1 + A.vatRate);

export async function run(overrides = {}) {
  const A = merge(DEFAULTS, overrides);
  const profiles = { ...A.profiles, cap: A.profiles.cap ?? (await capProfile()) };
  const unit = unitCosts(A);
  const costs = Object.fromEntries(Object.entries(profiles).map(([k, u]) => [k, monthlyCost(A, unit, u)]));
  const plans = {};
  for (const [catalog, list] of Object.entries(A.plans)) {
    plans[catalog] = list.map((plan) => {
      const net = netMonthlyGel(A, plan);
      const margins = Object.fromEntries(
        ['light', 'typical', 'heavy', 'cap'].map((k) => {
          const costGel = costs[k].total * A.usdToGel;
          return [k, { costGel, marginGel: net - costGel, marginPct: (net - costGel) / net }];
        })
      );
      return { ...plan, netMonthlyGel: net, margins };
    });
  }
  const freeGel = costs.free.total * A.usdToGel;
  const typicalPlusMargin = plans.current[0].margins.typical.marginGel;
  const art = {
    priceGel: A.artProgram.priceGel,
    netGel: A.artProgram.priceGel * (1 - A.paymentFee) / (1 + A.vatRate),
    costGel: A.artProgram.sessions * unit.artSession * A.usdToGel,
  };
  return {
    assumptions: A,
    unit,
    costs,
    plans,
    free: { monthlyGel: freeGel, breakEvenConversion: freeGel / (freeGel + typicalPlusMargin) },
    art: { ...art, marginGel: art.netGel - art.costGel },
  };
}

const usd = (x) => `$${x < 0.1 ? x.toFixed(4) : x.toFixed(2)}`;
const gel = (x) => `${x.toFixed(2)} GEL`;
const pct = (x) => `${Number((x * 100).toFixed(1))}%`;

function markdown(r) {
  const L = [];
  L.push(`Assumptions as of ${r.assumptions.asOf}: 1 USD = ${r.assumptions.usdToGel} GEL, payment fee ${pct(r.assumptions.paymentFee)}, VAT ${pct(r.assumptions.vatRate)}, cache share ${pct(r.assumptions.cacheShare)}.`, '');
  L.push('| Unit | Cost |', '|---|---|');
  L.push(`| Anulia message (incl. share of summary) | ${usd(r.unit.anuliaMessage)} |`);
  L.push(`| Art session (${r.assumptions.features.art.turnsPerSession} turns, ${r.assumptions.features.art.imagesPerSession} photos) | ${usd(r.unit.artSession)} |`);
  L.push(`| Card reflection (${r.assumptions.features.cards.turnsPerConversation} turns) | ${usd(r.unit.cardConversation)} |`);
  L.push(`| Journal reflection | ${usd(r.unit.journalReflection)} |`);
  L.push(`| Voice message transcribed | ${usd(r.unit.voiceClip)} |`);
  L.push(`| Message read aloud | ${usd(r.unit.listen)} |`, '');
  L.push('| Profile | Anulia | Art | Cards | Journal | Voice | Infra | Total / month |', '|---|---|---|---|---|---|---|---|');
  for (const [k, c] of Object.entries(r.costs)) {
    L.push(`| ${k} | ${usd(c.anulia)} | ${usd(c.art)} | ${usd(c.cards)} | ${usd(c.journal)} | ${usd(c.voice)} | ${usd(c.infra)} | ${usd(c.total)} (${gel(c.total * r.assumptions.usdToGel)}) |`);
  }
  for (const [catalog, list] of Object.entries(r.plans)) {
    L.push('', `**${catalog === 'current' ? 'Current prices (active)' : 'Proposal (not active)'}**: net revenue per month after fees, and margin by profile.`, '');
    L.push('| Plan | Price | Net / month | Light | Typical | Heavy | Cap (every limit, every day) |', '|---|---|---|---|---|---|---|');
    for (const p of list) {
      const m = p.margins;
      const cell = (x) => `${gel(x.marginGel)} (${pct(x.marginPct)})`;
      L.push(`| ${p.label} | ${p.priceGel} GEL | ${gel(p.netMonthlyGel)} | ${cell(m.light)} | ${cell(m.typical)} | ${cell(m.heavy)} | ${cell(m.cap)} |`);
    }
  }
  L.push('', `Free user: ${gel(r.free.monthlyGel)} per month. Break-even conversion to Plus 30 at typical use: ${(r.free.breakEvenConversion * 100).toFixed(2)}%.`);
  L.push(`Art program: ${r.art.priceGel} GEL, net ${gel(r.art.netGel)}, AI cost for all ${r.assumptions.artProgram.sessions} sessions ${gel(r.art.costGel)}, margin ${gel(r.art.marginGel)}.`);
  return L.join('\n');
}

async function sensitivity() {
  const cases = [
    ['Base', {}],
    ['No prompt caching', { cacheShare: 0 }],
    ['Model price x2', { model: { inputPerM: 1.5, cachedInputPerM: 0.15, outputPerM: 9 } }],
    ['Longer prompts (+50%)', { features: { anulia: { promptTokens: 4500 }, art: { promptTokens: 9750 }, cards: { promptTokens: 5250 } } }],
    ['VAT-registered (18%)', { vatRate: 0.18 }],
    ['GEL weakens to 3.00/USD', { usdToGel: 3.0 }],
  ];
  const L = ['', '**Sensitivity** (margin of Plus 30 at current price; proposal Plus 365 in brackets):', '', '| Scenario | Typical | Heavy | Cap |', '|---|---|---|---|'];
  for (const [name, o] of cases) {
    const r = await run(o);
    const cur = r.plans.current.find((p) => p.id === 'plus_30').margins;
    const pro = r.plans.proposal.find((p) => p.id === 'plus_365').margins;
    const cell = (a, b) => `${gel(a.marginGel)} [${gel(b.marginGel)}]`;
    L.push(`| ${name} | ${cell(cur.typical, pro.typical)} | ${cell(cur.heavy, pro.heavy)} | ${cell(cur.cap, pro.cap)} |`);
  }
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = opt('assumptions');
  const overrides = file ? JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) : {};
  const result = await run(overrides);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else console.log(markdown(result) + '\n' + (file ? '' : await sensitivity()));
}
