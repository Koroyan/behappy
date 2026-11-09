// BeHappy unit economics report, from the one model the server uses
// (server/finance/model.mjs). Every number is computed; assumptions and their
// sources are in server/finance/assumptions.mjs.
//
//   node scripts/unit-economics.mjs            # Markdown report (tables A-D)
//   node scripts/unit-economics.mjs --json     # raw numbers
//   node scripts/unit-economics.mjs --check    # exit 1 if any product breaks the 15 GEL minimum
//
// Before this version the script priced Art with gpt-5.4-mini rates, assumed 8
// turns per Art session (the server allowed 80) and a flat $0.05 per user for
// hosting; it showed a profitable 50 GEL Art program that in fact lost money.
import { RESERVE_USD } from '../server/aiPricing.mjs';
import { getCatalog, getProfessionalCatalog } from '../server/catalog.mjs';
import { ASSUMPTIONS, SOURCES } from '../server/finance/assumptions.mjs';
import { assumptions, breakEven, checkInvariant, contribution, forecast, infraMonthlyUsd, maxSafeDiscount, minSafePrice, profileCosts, requiredGel, supportedChannels, unitCosts } from '../server/finance/model.mjs';
import { AI_ALLOWANCES, LIMITS } from '../server/quota.mjs';

const args = process.argv.slice(2);
const A = ASSUMPTIONS;
const fx = A.fx.usdGel;
// The prices before this change (git history), for comparison only.
const OLD_PRICES = { plus_30: 51, plus_90: 142, plus_365: 519, art_program: 50, professional_30d: 79 };
const products = [...getCatalog('current'), ...getProfessionalCatalog()];
const affordable = Object.fromEntries(getCatalog('affordable').map((p) => [p.id, p.amountMinor / 100]));

const usd = (x) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(3)}`);
const gel = (x) => `${x.toFixed(2)}`;
const worstOf = (p, opts = {}) => Math.min(...supportedChannels(opts.A || A).map((channel) => contribution(p, { channel, ...opts }).contributionGel));
const worstRow = (p, opts = {}) => supportedChannels(opts.A || A).map((channel) => contribution(p, { channel, ...opts })).reduce((m, r) => (r.contributionGel < m.contributionGel ? r : m));

function costTable() {
  const base = unitCosts(A);
  const nocache = unitCosts(A, { cacheShare: 0 });
  const heavy = unitCosts(A, { cacheShare: 0, percentile: 'p95', contextGrowth: 1.5 });
  const rows = [
    ['Anulia: one message', 'anuliaMessage'],
    ['Anulia: 10-message conversation', 'anulia10'],
    ['Anulia: 20-message conversation', 'anulia20'],
    ['Anulia: 40-message conversation', 'anulia40'],
    ['Anulia memory block (per message, max 4,500 chars)', 'memoryBlockPerMessage'],
    ['Conversation summary', 'summary'],
    ['Daily reflection', 'reflection'],
    ['Daily reflection with its correction round', 'reflectionWithCorrection'],
    ['Art: one turn (gpt-6.1-sol, all calls)', 'artTurn'],
    [`Art: one session (${A.artTurnsPerSession} turns)`, 'artSession'],
    [`Art: session at the cap (${LIMITS.plus.art.messagesPerSession} turns, every turn retried twice)`, 'artSessionMax'],
    [`Art: full program, 43 sessions x ${A.artTurnsPerSession} turns`, 'artProgram43'],
    ['Reflection cards: one message', 'cardMessage'],
    ['Reflection cards: 8-message conversation', 'cardConversation'],
    ['Journal reflection (gpt-4.1-mini)', 'journalReflection'],
    ['Community companion reply', 'communityReply'],
    ['Speech-to-text, 1 minute', 'transcribeMinute'],
    ['Text-to-speech, 1,000 characters', 'speech1000Chars'],
  ];
  const L = ['### A. Cost breakdown (per use)', '', `Measured token counts (ai_usage, p50; heavy = p95 with +50% context). USD list prices ${SOURCES.openai}. GEL at ${fx} per USD (NBG ${A.fx.usdGelOfficial} + 10%).`, '', '| Feature | Typical (50% cached) | No caching | Heavy, no caching | Heavy in GEL |', '|---|---|---|---|---|'];
  for (const [label, k] of rows) L.push(`| ${label} | ${usd(base[k])} | ${usd(nocache[k])} | ${usd(heavy[k])} | ${gel(heavy[k] * fx)} |`);
  L.push('', 'Worst case per request (reserved before each call, so parallel requests cannot overrun an allowance):', '', `| ${Object.keys(RESERVE_USD).join(' | ')} |`, `|${Object.keys(RESERVE_USD).map(() => '---').join('|')}|`, `| ${Object.values(RESERVE_USD).map((x) => usd(x)).join(' | ')} |`);
  const prof = profileCosts(A);
  L.push('', 'Monthly AI cost by user profile (USD; "charged" = what the server lets an account spend):', '', '| Profile | Uncapped use | Charged | Hits the allowance |', '|---|---|---|---|');
  for (const [k, v] of Object.entries(prof)) L.push(`| ${k} | ${usd(v.uncapped)} | ${usd(v.charged)} | ${v.capped ? 'yes' : 'no'} |`);
  L.push('', `AI allowances (server/quota.mjs): Plus $${AI_ALLOWANCES.plus.usd} per rolling 30 days; free $${AI_ALLOWANCES.free.usd} per 30 days (+ $${AI_ALLOWANCES.freeArt.usd} once for the free Art session); Art program $${AI_ALLOWANCES.artProgram.usd} for all 43 sessions.`);
  return L.join('\n');
}

function pricingTable() {
  const L = ['### B. Pricing recommendation', '', `Worst case = every allowance fully used, ${A.taxes.scenarios.worst_case.label}, Flitt international card ${A.payments.channels.flitt_international.fee * 100}%, refunds ${A.payments.refundReserve * 100}%, ${A.free.perPaid} free users per paying customer, fixed costs over ${A.designPaidSubscribers} paying customers, CAC ${A.cacGel === null ? 'UNKNOWN (not included)' : A.cacGel + ' GEL'}.`, '', '| Product | Old price | Typical cost | Recommended price | Promo floor (max safe discount) | Worst-case cost | NET margin (worst case) | Required |', '|---|---|---|---|---|---|---|---|'];
  const typicalAi = profileCosts(A).normal_plus.charged;
  for (const p of products) {
    const r = worstRow(p);
    const price = p.amountMinor / 100;
    const worstCost = price - r.contributionGel;
    const months = p.kind === 'art' ? 3 : (p.durationDays || 30) / 30;
    const typicalAiGel = p.kind === 'plus' ? typicalAi * months * fx : p.kind === 'art' ? unitCosts(A).artProgram43 * fx : 0;
    const typical = worstCost - r.parts.ai + typicalAiGel;
    const d = maxSafeDiscount(p);
    L.push(`| ${p.id} | ${OLD_PRICES[p.id] ?? '—'} GEL | ${gel(typical)} | **${price} GEL** | ${d.floorGel} GEL (${(d.maxShare * 100).toFixed(1)}%) | ${gel(worstCost)} | ${gel(r.contributionGel)} | ${requiredGel(p)} |`);
  }
  L.push('', '**Old prices in the same worst case:**', '', '| Product | Old price | NET margin | Passes |', '|---|---|---|---|');
  for (const p of products) {
    const old = OLD_PRICES[p.id];
    const c = worstOf(p, { priceGel: old });
    L.push(`| ${p.id} | ${old} GEL | ${gel(c)} | ${c >= requiredGel(p) ? 'yes' : '**NO**'} |`);
  }
  L.push('', '**Pricing strategies compared** (GEL; worst-case NET margin in brackets):', '', '| Product | Existing | Affordable (only if 1% status confirmed) | Recommended | Promotional floor | Annual equivalent / month | Worst-case safe minimum |', '|---|---|---|---|---|---|---|');
  for (const p of products) {
    const price = p.amountMinor / 100;
    const aff = affordable[p.id];
    const minSafe = Math.max(...supportedChannels(A).map((channel) => minSafePrice(p, { channel })));
    const monthly = p.durationDays ? (price / (p.durationDays / 30)).toFixed(2) : '—';
    L.push(`| ${p.id} | ${OLD_PRICES[p.id]} [${gel(worstOf(p, { priceGel: OLD_PRICES[p.id] }))}] | ${aff ? `${aff} [1%: ${gel(worstOf(p, { priceGel: aff, scenario: 'small_business_1' }))}]` : '—'} | ${price} [${gel(worstOf(p))}] | ${maxSafeDiscount(p).floorGel} | ${monthly} | ${minSafe} |`);
  }
  return L.join('\n');
}

function forecastTable() {
  const L = ['### C. Monthly business forecast', '', `Mix of paying customers: 50% Plus 30, 30% Plus 90, 20% Plus 365 (monthly share of the price). Typical = normal usage; worst = every paying account spends its whole AI allowance. Hosting: ${A.infra.options[A.infra.chosen].label}. GEL.`, '', '| Users | Paid share | Paying | Revenue | Taxes+fees+refunds | Hosting & services | Support | AI typical | AI worst | Profit typical | Profit worst |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const users of [100, 500, 1000, 5000, 10000]) {
    for (const share of [0.02, 0.05, 0.1]) {
      const f = forecast({ users, paidShare: share });
      L.push(`| ${users} | ${share * 100}% | ${f.paid} | ${gel(f.revenue)} | ${gel(f.deductions)} | ${gel(f.infra)} | ${gel(f.support)} | ${gel(f.typicalAi)} | ${gel(f.worstAi)} | ${gel(f.profitTypical)} | ${gel(f.profitWorst)} |`);
    }
  }
  L.push('', '**Hosting options** (USD per month incl. email, domain and store builds):', '', '| Active users | Hetzner | DigitalOcean |', '|---|---|---|');
  for (const users of [100, 1000, 5000, 10000]) L.push(`| ${users} | ${infraMonthlyUsd(A, users, 'hetzner').total.toFixed(2)} | ${infraMonthlyUsd(A, users, 'digitalocean').total.toFixed(2)} |`);
  L.push('', '**Break-even** (paying customers to cover the fixed costs, worst case):', '');
  for (const p of products) {
    const be = breakEven(p);
    L.push(`- ${p.id}: ${be.paid ?? 'not reached'}`);
  }
  return L.join('\n');
}

export function stressScenarios() {
  return [
    ['Base (worst case, design assumptions)', {}],
    ['0% prompt caching', {}, 'allowance in USD: unchanged'],
    ['GEL weakens to 3.20 per USD', { A: assumptions({ fx: { usdGel: 3.2 } }) }],
    ['Flitt fee 3.5%', { A: assumptions({ payments: { channels: { flitt_international: { fee: 0.035 }, flitt_domestic: { fee: 0.035 } } } }) }],
    ['20 free users per paying customer', { A: assumptions({ free: { perPaid: 20 } }) }],
    ['Model prices x2, price table NOT updated', { aiStress: 2 }],
    ['Only 30 paying customers carry the fixed costs', { paid: 30 }],
    ['Eligible small business 1% (if confirmed)', { scenario: 'small_business_1' }],
    ['LLC, VAT-registered', { scenario: 'llc_vat' }],
    ['CAC 20 GEL per customer', { A: assumptions({ cacGel: 20 }) }],
  ];
}

function stressTable() {
  const L = ['### D. Stress test (passes the 15 GEL-per-30-days rule?)', '', `| Scenario | ${products.map((p) => p.id).join(' | ')} |`, `|---|${products.map(() => '---').join('|')}|`];
  for (const [name, opts, note] of stressScenarios()) {
    const cells = products.map((p) => {
      const c = worstOf(p, opts);
      return `${c >= requiredGel(p) ? 'PASS' : '**FAIL**'} ${gel(c)}`;
    });
    L.push(`| ${name}${note ? ` (${note})` : ''} | ${cells.join(' | ')} |`);
  }
  const app = products.filter((p) => p.kind !== 'professional').map((p) => `${p.id}: ${Math.ceil(minSafePrice(p, { channel: 'app_store' }))} GEL`);
  L.push('', `In-app purchase is NOT supported in this build. If it were, Apple's 30% would need: ${app.join(', ')}.`);
  return L.join('\n');
}

if (args.includes('--check')) {
  const r = checkInvariant();
  for (const row of r.rows) console.log(`${row.passes ? 'PASS' : 'FAIL'} ${row.productId} @ ${row.channel}: ${row.contributionGel.toFixed(2)} GEL (required ${row.requiredGel})`);
  if (!r.ok) {
    console.error('Economics check FAILED: a product leaves less than the required contribution.');
    process.exit(1);
  }
  console.log(`Economics check passed (tax case ${A.taxes.invariantScenario}; CAC ${A.cacGel === null ? 'UNKNOWN, not included' : A.cacGel}).`);
} else if (args.includes('--json')) {
  console.log(JSON.stringify({ assumptions: A, unit: unitCosts(A), profiles: profileCosts(A), invariant: checkInvariant() }, null, 2));
} else {
  console.log([`Assumptions checked ${'2026-11-09'}. Sources: ${Object.values(SOURCES).join('; ')}.`, '', costTable(), '', pricingTable(), '', forecastTable(), '', stressTable()].join('\n'));
}
