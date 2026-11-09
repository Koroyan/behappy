// Financial control center (admin): what the business really earns and spends,
// next to what the economics model says each product leaves in the worst case.
//
// Actual numbers come from the database (approved orders, recorded AI costs).
// Model numbers come from server/finance/model.mjs and say so. A cost that is
// not known is reported as "UNVERIFIED" with a reason — never as 0.

import express from 'express';

import { spendToday } from '../ai.mjs';
import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { getCatalog, getProfessionalCatalog } from '../catalog.mjs';
import { ts } from '../db/index.mjs';
import { ASSUMPTIONS, SOURCES } from '../finance/assumptions.mjs';
import { breakEven, contribution, forecast, infraMonthlyUsd, maxSafeDiscount, requiredGel, supportedChannels } from '../finance/model.mjs';
import { createPromotions, guardAssumptions, PromoError } from '../promotions.mjs';
import { AI_ALLOWANCES, spentUsd } from '../quota.mjs';
import { staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const COUNTED = "status in ('ok', 'error', 'reserved')";

export function createEconomics({ db, config, clock = { now: () => Date.now() } }) {
  async function revenueMinor(fromMs, toMs) {
    const r = await db.query(
      `select product_id, count(*)::int as n, coalesce(sum(amount_minor), 0)::bigint as gross, coalesce(sum(coalesce(reversal_amount, 0)), 0)::bigint as reversed
         from orders where status in ('approved', 'reversed', 'partially_reversed') and approved_at >= $1 and approved_at < $2 group by product_id`,
      [ts(fromMs), ts(toMs)]
    );
    const byProduct = Object.fromEntries(r.rows.map((x) => [x.product_id, { payments: x.n, grossMinor: Number(x.gross), reversedMinor: Number(x.reversed) }]));
    const gross = r.rows.reduce((s, x) => s + Number(x.gross), 0);
    const reversed = r.rows.reduce((s, x) => s + Number(x.reversed), 0);
    return { grossMinor: gross, reversedMinor: reversed, netMinor: gross - reversed, byProduct };
  }

  async function payingAccounts(now) {
    // Active paid access now: an approved order still inside its period (art: lifetime).
    const r = await db.query(
      `select product_kind, count(distinct account_id)::int as n from orders
        where status = 'approved' and (duration_days is null or approved_at + (duration_days || ' days')::interval > $1) group by product_kind`,
      [ts(now)]
    );
    const byKind = Object.fromEntries(r.rows.map((x) => [x.product_kind, x.n]));
    const all = await db.query(`select count(distinct account_id)::int as n from orders where status = 'approved' and (duration_days is null or approved_at + (duration_days || ' days')::interval > $1)`, [ts(now)]);
    const accounts = await db.query('select count(*)::int as n from accounts');
    return { paying: all.rows[0].n, byKind, accounts: accounts.rows[0].n };
  }

  async function overview() {
    const now = clock.now();
    const A = guardAssumptions(config);
    const scenario = A.taxes.invariantScenario;
    const fx = A.fx.usdGel;
    const dayStart = Date.parse(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z');
    const monthStart = Date.parse(new Date(now).toISOString().slice(0, 7) + '-01T00:00:00Z');
    const [today, month, users] = await Promise.all([revenueMinor(dayStart, now + 1), revenueMinor(monthStart, now + 1), payingAccounts(now)]);
    const free = Math.max(0, users.accounts - users.paying);

    // AI: recorded costs (reservations included until released).
    const aiMonth = await spentUsd(db, `created_at >= $1 and ${COUNTED}`, [ts(monthStart)]);
    const aiToday = await spendToday(db, now);
    const byModelRows = await db.query(`select model, coalesce(sum(cost_usd), 0)::float8 as usd, count(*)::int as calls from ai_usage where created_at >= $1 and ${COUNTED} and model <> 'reservation' group by model order by usd desc`, [ts(monthStart)]);
    const reservedNow = await db.query("select count(*)::int as n, coalesce(sum(cost_usd), 0)::float8 as usd from ai_usage where status = 'reserved'");

    const monthGel = month.netMinor / 100;
    const tax = A.taxes.scenarios[scenario];
    const feeRate = A.payments.channels.flitt_international.fee; // the channel split is not recorded: the higher rate
    const fees = (month.grossMinor / 100) * feeRate;
    const vat = (monthGel * tax.vat) / (1 + tax.vat);
    const turnover = (monthGel - vat) * tax.turnover;
    const daysSoFar = Math.max(1, (now - monthStart) / DAY);
    const infraMonth = infraMonthlyUsd(A, Math.max(1, users.accounts)).total * fx;
    const hostingSoFar = (infraMonth * daysSoFar) / 30;
    const support = users.paying * A.operations.supportGelPerPaidMonth * (daysSoFar / 30);
    const aiGel = aiMonth.total * fx;
    const netContribution = monthGel - vat - fees - turnover - aiGel - hostingSoFar - support;

    // Per-account margin this month (cohorts by product; no identities).
    const cohorts = await db.query(
      `select o.product_id, o.account_id, o.amount_minor, o.duration_days,
              (select coalesce(sum(u.cost_usd), 0)::float8 from ai_usage u where u.account_id = o.account_id and u.created_at >= $1 and u.${COUNTED}) as ai_usd
         from orders o where o.status = 'approved' and (o.duration_days is null or o.approved_at + (o.duration_days || ' days')::interval > $2)`,
      [ts(monthStart), ts(now)]
    );
    const cohortMap = {};
    for (const c of cohorts.rows) {
      const monthly = Number(c.amount_minor) / 100 / Math.max(1, (c.duration_days || 90) / 30);
      const net = monthly / (1 + tax.vat);
      const margin = net - monthly * feeRate - net * tax.turnover - Number(c.ai_usd) * fx;
      const k = c.product_id;
      cohortMap[k] ||= { productId: k, accounts: 0, aiUsd: 0, worstMarginGel: Infinity, avgMarginGel: 0 };
      const g = cohortMap[k];
      g.accounts += 1;
      g.aiUsd += Number(c.ai_usd);
      g.avgMarginGel += margin;
      g.worstMarginGel = Math.min(g.worstMarginGel, margin);
    }
    const cohortList = Object.values(cohortMap).map((g) => ({ ...g, avgMarginGel: g.avgMarginGel / g.accounts, aiUsd: Math.round(g.aiUsd * 100) / 100 })).sort((a, b) => a.worstMarginGel - b.worstMarginGel);

    // The model: every product, its worst-case contribution, floor and safe discount.
    const promotions = createPromotions({ db, config, clock });
    const promos = await promotions.list({ all: true });
    const products = [...getCatalog(config.catalog), ...getProfessionalCatalog(config.professional)].map((p) => {
      const rows = supportedChannels(A).map((channel) => contribution(p, { A, scenario, channel }));
      const worst = rows.reduce((m, r) => (r.contributionGel < m.contributionGel ? r : m));
      const safe = maxSafeDiscount(p, { A, scenario });
      return {
        productId: p.id,
        priceGel: p.amountMinor / 100,
        durationDays: p.durationDays,
        worstContributionGel: Math.round(worst.contributionGel * 100) / 100,
        requiredGel: requiredGel(p, A),
        headroomGel: Math.round((worst.contributionGel - requiredGel(p, A)) * 100) / 100,
        passes: rows.every((r) => r.passes),
        floorGel: safe.floorGel,
        maxSafeDiscountPercent: Math.floor(safe.maxShare * 1000) / 10,
        parts: Object.fromEntries(Object.entries(worst.parts).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      };
    });

    // Promotions with what each really charges.
    const promoRows = [];
    for (const p of promos) {
      const prices = [];
      for (const product of products) {
        if (p.productIds.length && !p.productIds.includes(product.productId)) continue;
        const q = await promotions.quote({ productId: product.productId, code: p.code, now }).catch(() => null);
        if (q) prices.push({ productId: product.productId, listGel: q.listMinor / 100, finalGel: q.finalMinor / 100, clamped: q.clamped });
      }
      promoRows.push({ ...p, prices });
    }

    const plus30 = getCatalog(config.catalog).find((p) => p.id === 'plus_30');
    const be = plus30 ? breakEven(plus30, { A, scenario }) : null;
    const paidShare = users.accounts ? users.paying / users.accounts : 0;
    const projected = forecast({ users: Math.max(users.accounts, 1), paidShare: Math.max(paidShare, 0.0001), A, catalog: getCatalog(config.catalog) });

    const alerts = [];
    for (const p of products) {
      if (!p.passes) alerts.push({ level: 'danger', code: 'below_minimum', productId: p.productId, message: `${p.productId}: modelled worst-case contribution ${p.worstContributionGel} GEL is under the ${p.requiredGel} GEL minimum` });
      else if (p.headroomGel < (config.finance?.alertMarginGel ?? 5)) alerts.push({ level: 'warning', code: 'near_minimum', productId: p.productId, message: `${p.productId}: only ${p.headroomGel} GEL above the minimum in the worst case` });
    }
    for (const c of cohortList) if (c.worstMarginGel < 0) alerts.push({ level: 'warning', code: 'loss_cohort', productId: c.productId, message: `${c.productId}: at least one customer cost more in AI this month than their share of the price` });
    if (A.cacGel === null) alerts.push({ level: 'info', code: 'cac_unverified', message: 'Acquisition cost (CAC) is UNVERIFIED: the 15 GEL minimum excludes it, so it is not a full profit guarantee (set FINANCE_CAC_GEL).' });
    if (scenario === 'worst_case') alerts.push({ level: 'info', code: 'tax_unverified', message: 'Tax status is not confirmed: the conservative case (18% VAT inside prices + 3% of turnover) is used. ACCOUNTANT/LEGAL APPROVAL REQUIRED.' });

    const r2 = (x) => Math.round(x * 100) / 100;
    return {
      mode: 'test',
      label: 'Flitt TEST (sandbox) orders. Not real income.',
      asOf: new Date(now).toISOString(),
      taxScenario: { id: scenario, ...A.taxes.scenarios[scenario] },
      fxUsdGel: fx,
      revenue: { todayGel: today.netMinor / 100, monthGel: monthGel, monthGrossGel: month.grossMinor / 100, refundsGel: month.reversedMinor / 100, byProduct: month.byProduct },
      users: { paying: users.paying, free, total: users.accounts, byKind: users.byKind, revenuePerPayingGel: users.paying ? r2(monthGel / users.paying) : null },
      ai: {
        todayUsd: r2(aiToday.total),
        monthUsd: r2(aiMonth.total),
        monthGel: r2(aiGel),
        byFeatureUsd: Object.fromEntries(Object.entries(aiMonth.byFeature).filter(([k]) => k).map(([k, v]) => [k, r2(v)])),
        byModelUsd: byModelRows.rows.map((x) => ({ model: x.model, usd: r2(Number(x.usd)), calls: x.calls })),
        reservedNow: { requests: reservedNow.rows[0].n, usd: r2(Number(reservedNow.rows[0].usd)) },
        allowances: AI_ALLOWANCES,
      },
      costs: {
        paymentFeesGel: r2(fees),
        paymentFeesNote: 'ESTIMATE: the card origin is not recorded, so the higher Flitt rate (2.5%, international) is applied.',
        vatGel: r2(vat),
        turnoverTaxGel: r2(turnover),
        hostingMonthGel: r2(infraMonth),
        hostingSoFarGel: r2(hostingSoFar),
        supportSoFarGel: r2(support),
        cacGel: A.cacGel === null ? 'UNVERIFIED' : A.cacGel,
        monitoringGel: 'UNVERIFIED',
        pushGel: 'UNVERIFIED',
      },
      taxScenarios: Object.fromEntries(Object.entries(A.taxes.scenarios).map(([id, s]) => {
        const v = (monthGel * s.vat) / (1 + s.vat);
        return [id, { label: s.label, vatGel: r2(v), turnoverTaxGel: r2((monthGel - v) * s.turnover), approval: s.approval }];
      })),
      netContributionMonthGel: r2(netContribution),
      products,
      lossMaking: products.filter((p) => !p.passes).map((p) => p.productId),
      cohorts: cohortList.map((c) => ({ ...c, worstMarginGel: r2(c.worstMarginGel), avgMarginGel: r2(c.avgMarginGel) })),
      promotions: promoRows,
      breakEvenPlus30Subscribers: be?.paid ?? null,
      projectedMonth: { profitTypicalGel: r2(projected.profitTypical), profitWorstGel: r2(projected.profitWorst), revenueGel: r2(projected.revenue) },
      alerts,
      sources: SOURCES,
      assumptionsCheckedAt: ASSUMPTIONS.fx ? '2026-11-09' : null,
    };
  }

  return { overview };
}

export function mountEconomics(app, deps) {
  const e = createEconomics(deps);
  const staff = staffFor(deps);
  const promotions = createPromotions(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '16kb' });
  const can = (p, opts) => [json, auth, staff.guard(p, opts)];
  const r = express.Router();
  const wrap = (fn) => async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (error) {
      if (error instanceof PromoError) return res.status(error.status).json({ error: error.code, ...(error.preview ? { preview: error.preview } : {}) });
      console.error('[economics]', error?.message);
      res.status(500).json({ error: 'economics_failed' });
    }
  };
  r.get('/economics', ...can('finance.economics'), wrap(() => e.overview()));
  r.get('/promotions', ...can('finance.economics'), wrap(async () => ({ promotions: await promotions.list({ all: true }) })));
  // Money-affecting: a fresh confirmation, and the guard checks the floor on the server.
  r.post('/promotions', ...can('promotions.manage', { stepUp: true }), wrap(async (req) => {
    const out = await promotions.create(req.body || {}, { staffId: req.account.id });
    await audit(deps.db, { actorId: req.account.id, actorRole: req.account.primaryRole || 'staff', action: 'promotion.created', targetType: 'promotion', targetId: out.promotion.id, metadata: { name: out.promotion.name, kind: out.promotion.kind, value: out.promotion.value } });
    return out;
  }));
  r.put('/promotions/:id', ...can('promotions.manage', { stepUp: true }), wrap(async (req) => {
    const p = await promotions.setActive(req.params.id, req.body?.active);
    await audit(deps.db, { actorId: req.account.id, actorRole: req.account.primaryRole || 'staff', action: p.active ? 'promotion.resumed' : 'promotion.paused', targetType: 'promotion', targetId: p.id, metadata: {} });
    return { promotion: p };
  }));
  app.use('/api/admin', r);
}
