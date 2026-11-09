// BeHappy economics: what each product leaves after every cost, in the worst
// usage the server allows. One model for the report (scripts/unit-economics.mjs),
// the CI invariant (server/test/finance.test.mjs), the promotions guard
// (server/promotions.mjs) and the admin finance center.
//
// NET CONTRIBUTION per product and period =
//     revenue excluding VAT
//   - payment processing (on the gross amount)
//   - turnover tax (on revenue excluding VAT)
//   - refund/chargeback reserve
//   - AI: the per-account AI allowance the server enforces (server/quota.mjs),
//         fully used, plus one request of overshoot
//   - hosting, database, email, builds: fixed monthly costs spread over the
//         paying customers, plus a variable cost per active user
//   - support (and SMS verification for professionals)
//   - free users: their capped AI and infrastructure, allocated per paying customer
//   - acquisition cost (when known)
//
// The worst case does not depend on prompt caching, token counts or retries:
// the allowance is in dollars and is reserved before each call. Those factors
// only decide how soon a heavy user meets the allowance (see unitCosts()).

import { MODEL_PRICES, RESERVE_USD, callCostUsd, transcribeCostUsd, speechCostUsd } from '../aiPricing.mjs';
import { getCatalog, getProfessionalCatalog } from '../catalog.mjs';
import { AI_ALLOWANCES, LIMITS } from '../quota.mjs';
import { ASSUMPTIONS } from './assumptions.mjs';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function merge(a, b) {
  if (!isObj(b)) return b === undefined ? a : b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a?.[k]) ? merge(a[k], v) : v;
  return out;
}

export const assumptions = (overrides = {}) => merge(ASSUMPTIONS, overrides);

/** 30-day windows a rolling allowance can be spent in during `days` (conservative: rounded up). */
export const windowsIn = (days) => Math.max(1, Math.ceil(days / 30));
/** The minimum contribution a product must leave: 15 GEL per whole 30 days (30 → 15, 90 → 45, 365 → 180). */
export const requiredGel = (product, A = ASSUMPTIONS) => (product.kind === 'art' ? A.minContributionGelPer30Days : A.minContributionGelPer30Days * Math.max(1, Math.floor((product.durationDays || 30) / 30)));
/** Overshoot: the worst single request beyond its reservation (reservations are worst cases, so this is a buffer). */
export const overshootUsd = () => Math.max(...Object.values(RESERVE_USD));

// ---------- Infrastructure ----------

export function infraMonthlyUsd(A, activeUsers, option = A.infra.chosen) {
  const tiers = A.infra.options[option].tiers;
  const tier = tiers.find((t) => t.activeUsers >= activeUsers) || tiers[tiers.length - 1];
  const scale = activeUsers > tier.activeUsers ? activeUsers / tier.activeUsers : 1;
  const hosting = (tier.eur * A.fx.eurUsd + tier.usd) * scale;
  const fixed = Object.values(A.infra.fixedUsd).reduce((s, x) => s + x, 0);
  return { hosting, fixed, total: hosting + fixed, tier: tier.activeUsers, option };
}

/** Free users' monthly cost (USD) per free account: their AI allowance, their first Art session (amortised), infrastructure. */
export function freeUserMonthlyUsd(A) {
  return AI_ALLOWANCES.free.usd + AI_ALLOWANCES.freeArt.usd / A.free.artSessionAmortiseMonths + A.infra.perActiveUserUsd;
}

// ---------- Unit costs (what features cost per use) ----------

const priceOf = (model, stress = 1) => {
  const p = MODEL_PRICES[model];
  return { inputPerMillion: p.inputPerMillion * stress, cachedPerMillion: p.cachedPerMillion * stress, outputPerMillion: p.outputPerMillion * stress };
};
const turnCost = (model, input, output, cacheShare, stress) => callCostUsd({ model, input, output, cached: input * cacheShare }, priceOf(model, stress));

/**
 * Cost of each feature per use (USD), from measured token counts, at a cache
 * share and a model-price multiplier. A conversation re-sends its history:
 * each turn adds the previous turn's text to the input.
 */
export function unitCosts(A = ASSUMPTIONS, { cacheShare = A.cacheShare, stress = 1, contextGrowth = 1, percentile = 'p50' } = {}) {
  const m = A.measured;
  const conv = (f, turns, perTurnHistory, { calls = 1 } = {}) => {
    let usd = 0;
    for (let k = 0; k < turns; k += 1) usd += calls * turnCost(m[f].model, (m[f][percentile].input + k * perTurnHistory) * contextGrowth, m[f][percentile].output, cacheShare, stress);
    return usd;
  };
  const one = (f) => turnCost(m[f].model, m[f][percentile].input * contextGrowth, m[f][percentile].output, cacheShare, stress);
  const artTurns = A.artTurnsPerSession;
  const maxArtTurns = LIMITS.plus.art.messagesPerSession;
  return {
    anuliaMessage: one('anulia'),
    anulia10: conv('anulia', 10, 330),
    anulia20: conv('anulia', 20, 330),
    anulia40: conv('anulia', 40, 330),
    memoryBlockPerMessage: turnCost(m.anulia.model, 1500 * contextGrowth, 0, cacheShare, stress), // up to 4,500 characters of memory
    summary: one('summary'),
    reflection: one('reflection'),
    reflectionWithCorrection: 2 * one('reflection'),
    artTurn: one('art'),
    artSession: conv('art', artTurns, 450),
    artSessionMax: conv('art', maxArtTurns, 450, { calls: 3 }), // every turn retried twice: the "unexpected retry" bound
    artProgram43: 43 * conv('art', artTurns, 450),
    cardMessage: one('cards'),
    cardConversation: conv('cards', 8, 300),
    journalReflection: one('journal'),
    communityReply: one('community'),
    transcribeMinute: transcribeCostUsd(A.infra ? 8000 * 60 : 480000) * stress,
    speech1000Chars: speechCostUsd(1000) * stress,
  };
}

/** Monthly AI cost of usage profiles (USD), bounded by the allowance the server enforces. */
export function profileCosts(A = ASSUMPTIONS, opts = {}) {
  const u = unitCosts(A, opts);
  const per = (p) =>
    p.anuliaMessages * (u.anulia20 / 20) + p.artSessions * u.artSession + p.cardConversations * u.cardConversation + p.journal * u.journalReflection + p.reflections * u.reflection + p.summaries * u.summary + p.voiceMinutes * u.transcribeMinute + (p.ttsChars / 1000) * u.speech1000Chars + p.community * u.communityReply;
  const P = LIMITS.plus;
  const profiles = {
    free: { anuliaMessages: 20, artSessions: 0, cardConversations: 0, journal: 10, reflections: 10, summaries: 2, voiceMinutes: 2, ttsChars: 2000, community: 5, cap: AI_ALLOWANCES.free.usd },
    light_plus: { anuliaMessages: 60, artSessions: 3, cardConversations: 2, journal: 8, reflections: 8, summaries: 4, voiceMinutes: 5, ttsChars: 5000, community: 10, cap: AI_ALLOWANCES.plus.usd },
    normal_plus: { anuliaMessages: 300, artSessions: 8, cardConversations: 8, journal: 20, reflections: 25, summaries: 15, voiceMinutes: 20, ttsChars: 20000, community: 30, cap: AI_ALLOWANCES.plus.usd },
    heavy_plus: { anuliaMessages: 900, artSessions: 20, cardConversations: 30, journal: 60, reflections: 60, summaries: 60, voiceMinutes: 90, ttsChars: 90000, community: 150, cap: AI_ALLOWANCES.plus.usd },
    // Every daily limit, every day, including grace messages.
    max_allowed_plus: {
      anuliaMessages: 30 * (P.anulia.messages + P.anulia.gracePerPeriod),
      artSessions: 30 * P.art.newSessions,
      cardConversations: 30 * P.cards.conversations,
      journal: 30 * P.journal.reflections,
      reflections: 30 * P.reflection.count,
      summaries: 30 * P.summary.count,
      voiceMinutes: 30 * P.transcribe.count * 2,
      ttsChars: 30 * P.speech.count * 2000,
      community: 30 * P.community.count,
      cap: AI_ALLOWANCES.plus.usd,
    },
  };
  return Object.fromEntries(
    Object.entries(profiles).map(([k, p]) => {
      const uncapped = per(p);
      return [k, { uncapped, charged: Math.min(uncapped, p.cap + overshootUsd()), capped: uncapped > p.cap }];
    })
  );
}

// ---------- Contribution ----------

/**
 * Net contribution (GEL) of one sale. Every component is returned, so a
 * report can show where the money goes. `months` of service are covered by
 * the sale (art: the program's assumed active period).
 */
export function contribution(product, { priceGel = product.amountMinor / 100, scenario, channel = 'flitt_international', A = ASSUMPTIONS, paid = A.designPaidSubscribers, freePerPaid = A.free.perPaid, fx = A.fx.usdGel, aiStress = 1 } = {}) {
  const tax = A.taxes.scenarios[scenario || A.taxes.invariantScenario];
  const ch = A.payments.channels[channel];
  const days = product.kind === 'art' ? 90 : product.durationDays || 30;
  const months = days / 30;
  const windows = windowsIn(days);
  const gross = priceGel;
  const vat = (gross * tax.vat) / (1 + tax.vat);
  const net = gross - vat;
  const fee = gross * ch.fee;
  const turnoverTax = net * tax.turnover;
  const refunds = gross * A.payments.refundReserve;
  let aiUsd = 0;
  if (product.kind === 'plus') aiUsd = windows * AI_ALLOWANCES.plus.usd + overshootUsd();
  if (product.kind === 'art') aiUsd = AI_ALLOWANCES.artProgram.usd + overshootUsd();
  const ai = aiUsd * fx * aiStress;
  const active = paid * (1 + freePerPaid);
  const infraMonth = infraMonthlyUsd(A, active);
  const infra = ((infraMonth.total / paid) * months + A.infra.perActiveUserUsd * months) * fx;
  const support = (product.kind === 'professional' ? A.operations.professionalSupportGel : A.operations.supportGelPerPaidMonth) * months;
  const sms = product.kind === 'professional' ? A.operations.smsVerificationUsd * fx : 0;
  const freeSubsidy = freePerPaid * freeUserMonthlyUsd(A) * months * fx;
  const cac = A.cacGel ?? 0;
  const total = net - fee - turnoverTax - refunds - ai - infra - support - sms - freeSubsidy - cac;
  return {
    productId: product.id,
    priceGel: gross,
    scenario: scenario || A.taxes.invariantScenario,
    channel,
    parts: { vat, net, fee, turnoverTax, refunds, ai, infra, support, sms, freeSubsidy, cac },
    contributionGel: total,
    requiredGel: requiredGel(product, A),
    passes: total >= requiredGel(product, A) - 1e-9,
    cacKnown: A.cacGel !== null && A.cacGel !== undefined,
  };
}

/** Lowest price (GEL, rounded up to whole lari) that still leaves the required contribution. */
export function minSafePrice(product, opts = {}) {
  // contribution is linear in the price: c(p) = c(0) + slope * p
  const c0 = contribution(product, { ...opts, priceGel: 0 }).contributionGel;
  const c100 = contribution(product, { ...opts, priceGel: 100 }).contributionGel;
  const slope = (c100 - c0) / 100;
  const need = requiredGel(product, opts.A || ASSUMPTIONS);
  return Math.ceil((need - c0) / slope);
}

/** The largest discount (share of the list price) that keeps the minimum, on every supported channel. */
export function maxSafeDiscount(product, opts = {}) {
  const A = opts.A || ASSUMPTIONS;
  const floor = Math.max(...supportedChannels(A).map((channel) => minSafePrice(product, { ...opts, channel })));
  const list = product.amountMinor / 100;
  return { floorGel: floor, maxShare: Math.max(0, (list - floor) / list), maxGel: Math.max(0, list - floor) };
}

export const supportedChannels = (A = ASSUMPTIONS) => Object.entries(A.payments.channels).filter(([, c]) => c.supported).map(([k]) => k);

export function paidProducts(config = {}) {
  return [...getCatalog(config.catalog || 'current'), ...getProfessionalCatalog(config.professional)];
}

/**
 * The invariant: every paid product, on every supported channel, at its list
 * price and at every promotional price given, leaves at least the required
 * contribution in the configured tax scenario.
 */
export function checkInvariant({ A = ASSUMPTIONS, products = paidProducts(), promoPrices = {}, scenario, ...rest } = {}) {
  const rows = [];
  for (const product of products) {
    const prices = [product.amountMinor / 100, ...(promoPrices[product.id] || [])];
    for (const channel of supportedChannels(A)) for (const priceGel of prices) rows.push(contribution(product, { A, priceGel, channel, scenario, ...rest }));
  }
  return { ok: rows.every((r) => r.passes), rows, failures: rows.filter((r) => !r.passes) };
}

/** Paying customers needed for the fixed costs (break-even on contribution after variable costs). */
export function breakEven(product, opts = {}) {
  const A = opts.A || ASSUMPTIONS;
  for (let paid = 1; paid <= 100000; paid = Math.ceil(paid * 1.15) + 1) {
    const c = contribution(product, { ...opts, paid });
    if (c.contributionGel >= 0) {
      // refine linearly downward
      let lo = Math.floor(paid / 1.15) - 1;
      while (lo < paid && contribution(product, { ...opts, paid: Math.max(1, lo) }).contributionGel < 0) lo += 1;
      return { paid: Math.max(1, lo), minimum: false };
    }
  }
  return { paid: null, minimum: false };
}

/**
 * Monthly business forecast for a user base: revenue, every cost and profit,
 * in a typical month (normal usage) and in the worst case (every paying
 * account spends its whole allowance).
 */
export function forecast({ users, paidShare, mix = { plus_30: 0.5, plus_90: 0.3, plus_365: 0.2 }, A = ASSUMPTIONS, catalog = getCatalog() }) {
  const paid = Math.max(1, Math.round(users * paidShare));
  const free = users - paid;
  const fx = A.fx.usdGel;
  const prof = profileCosts(A);
  const tax = A.taxes.scenarios[A.taxes.invariantScenario];
  let revenue = 0;
  let deductions = 0;
  for (const [id, share] of Object.entries(mix)) {
    const p = catalog.find((x) => x.id === id);
    if (!p) continue;
    const monthly = p.amountMinor / 100 / (p.durationDays / 30);
    const n = paid * share;
    revenue += n * monthly;
    const vat = (monthly * tax.vat) / (1 + tax.vat);
    deductions += n * (vat + monthly * A.payments.channels.flitt_international.fee + (monthly - vat) * tax.turnover + monthly * A.payments.refundReserve);
  }
  const infra = infraMonthlyUsd(A, users).total * fx + users * A.infra.perActiveUserUsd * fx;
  const support = paid * A.operations.supportGelPerPaidMonth;
  const typicalAi = (paid * prof.normal_plus.charged + free * Math.min(prof.free.charged, AI_ALLOWANCES.free.usd)) * fx;
  const worstAi = (paid * (AI_ALLOWANCES.plus.usd + overshootUsd()) + free * freeUserMonthlyUsd(A)) * fx;
  const base = revenue - deductions - infra - support;
  return { users, paid, free, revenue, deductions, infra, support, typicalAi, worstAi, profitTypical: base - typicalAi, profitWorst: base - worstAi };
}
