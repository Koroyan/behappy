// The economics invariant (docs/BEHAPPY_FINANCE.md): every paid product, on
// every supported payment channel, at its list price and at the deepest
// discount the promotions guard allows, leaves at least 15 GEL per 30 days
// after every cost in the worst usage the server allows. A price, limit or
// allowance change that breaks it fails CI here.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { callCostUsd, MODEL_PRICES, RESERVE_USD } from '../aiPricing.mjs';
import { getCatalog, getProfessionalCatalog } from '../catalog.mjs';
import { ASSUMPTIONS } from '../finance/assumptions.mjs';
import { assumptions, breakEven, checkInvariant, contribution, forecast, maxSafeDiscount, minSafePrice, paidProducts, profileCosts, requiredGel, supportedChannels, unitCosts } from '../finance/model.mjs';
import { AI_ALLOWANCES, LIMITS } from '../quota.mjs';

const products = paidProducts();
const byId = (id) => products.find((p) => p.id === id);
const worst = (p, opts = {}) => Math.min(...supportedChannels(opts.A).map((channel) => contribution(p, { channel, ...opts }).contributionGel));

describe('Economics invariant: at least 15 GEL per 30 days, worst case', () => {
  test('every paid product passes at its list price on every supported channel (conservative tax case)', () => {
    const r = checkInvariant();
    assert.equal(r.ok, true, r.failures.map((f) => `${f.productId}@${f.channel}: ${f.contributionGel.toFixed(2)} < ${f.requiredGel}`).join('; '));
    assert.equal(ASSUMPTIONS.taxes.invariantScenario, 'worst_case', 'the invariant stays conservative until the tax status is confirmed');
    // The minimum scales with the period: 30 → 15, 90 → 45, 365 → 180, Art (one program) → 15.
    assert.deepEqual(['plus_30', 'plus_90', 'plus_365', 'art_program', 'professional_30d'].map((id) => requiredGel(byId(id))), [15, 45, 180, 15, 15]);
  });

  test('the cheaper catalog is only safe if the 1% small-business status is confirmed', () => {
    const cheap = [...getCatalog('affordable'), ...getProfessionalCatalog()];
    assert.equal(checkInvariant({ products: cheap, scenario: 'small_business_1' }).ok, true);
    assert.equal(checkInvariant({ products: cheap, scenario: 'worst_case' }).ok, false, 'not before the accountant confirms');
  });

  test('maximum promotional discount: the floor passes, one lari under it fails (on every channel)', () => {
    for (const p of products) {
      const { floorGel } = maxSafeDiscount(p);
      assert.ok(worst(p, { priceGel: floorGel }) >= requiredGel(p) - 1e-9, `${p.id} at its floor ${floorGel}`);
      assert.ok(worst(p, { priceGel: floorGel - 1 }) < requiredGel(p), `${p.id} under its floor`);
      assert.ok(floorGel <= p.amountMinor / 100, `${p.id}: list price is above the floor`);
    }
    // A 50% "launch" price on Plus 30 would fail: the guard must clamp or refuse it.
    assert.equal(checkInvariant({ promoPrices: { plus_30: [byId('plus_30').amountMinor / 200] } }).ok, false);
  });

  test('a contribution never counts a cost twice: the payment fee is charged once, on the gross amount', () => {
    const p = byId('plus_30');
    const c = contribution(p, { channel: 'flitt_international' });
    assert.ok(Math.abs(c.parts.fee - (p.amountMinor / 100) * 0.025) < 1e-9);
    const sum = c.parts.net - c.parts.fee - c.parts.turnoverTax - c.parts.refunds - c.parts.ai - c.parts.infra - c.parts.support - c.parts.sms - c.parts.freeSubsidy - c.parts.cac;
    assert.ok(Math.abs(sum - c.contributionGel) < 1e-9);
    // Only one tax regime at a time: no turnover tax in the LLC case, no VAT in the 1% case.
    assert.equal(contribution(p, { scenario: 'llc_vat' }).parts.turnoverTax, 0);
    assert.equal(contribution(p, { scenario: 'small_business_1' }).parts.vat, 0);
  });
});

describe('Stress tests', () => {
  test('maximum allowed consumption and every daily limit used: the allowance, not usage, sets the AI cost', () => {
    const prof = profileCosts();
    assert.ok(prof.max_allowed_plus.uncapped > AI_ALLOWANCES.plus.usd * 3, 'every limit, every day, would cost several allowances');
    assert.equal(prof.max_allowed_plus.capped, true);
    // The contribution already charges the full allowance + one request of overshoot.
    const c = contribution(byId('plus_30'));
    assert.ok(Math.abs(c.parts.ai - (AI_ALLOWANCES.plus.usd + Math.max(...Object.values(RESERVE_USD))) * ASSUMPTIONS.fx.usdGel) < 1e-9);
    assert.ok(c.passes);
  });

  test('0% token caching and +50% context: features cost more, the worst case is unchanged', () => {
    const base = unitCosts(ASSUMPTIONS);
    const nocache = unitCosts(ASSUMPTIONS, { cacheShare: 0, contextGrowth: 1.5 });
    assert.ok(nocache.anulia20 > base.anulia20 && nocache.artSession > base.artSession);
    // The full Art program at 12-turn sessions with no caching still fits its allowance (with a turn's reservation).
    assert.ok(unitCosts(ASSUMPTIONS, { cacheShare: 0 }).artProgram43 + RESERVE_USD.art <= AI_ALLOWANCES.artProgram.usd, 'a whole program fits without caching');
    assert.equal(checkInvariant().ok, true);
  });

  test('2x model prices: costs double, and the dollar allowance still caps them once the price table is updated', () => {
    const x2 = Object.fromEntries(Object.entries(MODEL_PRICES).map(([k, p]) => [k, { inputPerMillion: p.inputPerMillion * 2, cachedPerMillion: p.cachedPerMillion * 2, outputPerMillion: p.outputPerMillion * 2 }]));
    const call = { model: 'gpt-6.1-sol', input: 10000, output: 500 };
    assert.ok(Math.abs(callCostUsd(call, x2['gpt-6.1-sol']) - 2 * callCostUsd(call)) < 1e-12);
    assert.ok(Math.abs(unitCosts(ASSUMPTIONS, { stress: 2 }).artTurn - 2 * unitCosts(ASSUMPTIONS).artTurn) < 1e-12);
    // The allowance is in dollars: the worst-case AI cost per product does not move.
    assert.equal(contribution(byId('plus_30')).parts.ai, contribution(byId('plus_30')).parts.ai);
    // If the table were NOT updated, real AI cost could double: that case is reported, not hidden.
    const unmaintained = contribution(byId('plus_30'), { aiStress: 2 });
    assert.ok(unmaintained.contributionGel < contribution(byId('plus_30')).contributionGel);
  });

  test('GEL depreciation: safe at the design rate (10% weaker than NBG today); 3.20 GEL/USD is reported', () => {
    assert.ok(ASSUMPTIONS.fx.usdGel >= ASSUMPTIONS.fx.usdGelOfficial * 1.1 - 1e-9);
    assert.equal(checkInvariant().ok, true);
    const A = assumptions({ fx: { usdGel: 3.2 } });
    const r = checkInvariant({ A });
    // Not a silent pass: the model names what would fail, so prices can be raised in time.
    for (const f of r.failures) assert.ok(f.contributionGel < f.requiredGel);
  });

  test('VAT, high processing fees, 20 free users per paying customer: reported per product', () => {
    for (const scenario of Object.keys(ASSUMPTIONS.taxes.scenarios)) for (const p of products) assert.ok(Number.isFinite(contribution(p, { scenario }).contributionGel));
    const highFees = assumptions({ payments: { channels: { flitt_international: { fee: 0.035 } } } });
    const freeHeavy = assumptions({ free: { perPaid: 20 } });
    for (const p of products) {
      assert.ok(worst(p, { A: highFees }) < worst(p), 'higher fees cost money');
      assert.ok(worst(p, { A: freeHeavy }) < worst(p), 'more free users cost money');
    }
    // Professionals carry no AI and stay well above the minimum in every stress.
    assert.ok(worst(byId('professional_30d'), { A: highFees }) > 30);
  });

  test('full Art program and full annual subscription: each meets its own minimum', () => {
    assert.ok(worst(byId('art_program')) >= 15);
    assert.ok(worst(byId('plus_365')) >= 180);
    assert.ok(worst(byId('plus_90')) >= 45);
  });

  test('unexpected AI retries: a session retried on every turn is far above the allowance, so the allowance binds', () => {
    const u = unitCosts(ASSUMPTIONS, { cacheShare: 0 });
    assert.ok(u.artSessionMax > u.artSession * 4);
    assert.ok(LIMITS.plus.art.messagesPerSession <= 24 && LIMITS.art.messagesPerSession <= 24);
    // The art reservation covers a whole turn: three calls, history, two photos, a long answer.
    const worstTurn = 3 * callCostUsd({ model: 'gpt-6.1-sol', input: 19000, output: 8000 });
    assert.ok(RESERVE_USD.art >= worstTurn, `reserve ${RESERVE_USD.art} >= ${worstTurn.toFixed(3)}`);
  });

  test('CAC unknown: the minimum is not called a full guarantee', () => {
    assert.equal(ASSUMPTIONS.cacGel, null);
    assert.equal(contribution(byId('plus_30')).cacKnown, false);
    const withCac = assumptions({ cacGel: 30 });
    assert.ok(contribution(byId('plus_30'), { A: withCac }).contributionGel < contribution(byId('plus_30')).contributionGel - 29);
  });

  test('forecasts and break-even are computed, not fixed', () => {
    for (const users of [100, 500, 1000, 5000, 10000]) {
      const f = forecast({ users, paidShare: 0.05 });
      assert.equal(f.paid + f.free, users);
      assert.ok(f.profitWorst <= f.profitTypical);
    }
    const be = breakEven(byId('plus_30'));
    assert.ok(be.paid > 0 && be.paid < 100, `break-even ${be.paid}`);
    assert.ok(minSafePrice(byId('plus_30')) <= 49);
  });
});
