// Financial assumptions for the BeHappy economics model (server/finance/model.mjs).
//
// Every figure says where it comes from: QUOTED (an official page, with the
// date it was read), MEASURED (this codebase's own ai_usage rows), or
// ASSUMPTION (a documented, conservative estimate). Anything that needs a
// professional's confirmation says ACCOUNTANT/LEGAL APPROVAL REQUIRED.
// Change numbers here (or pass overrides to run()), never in the screens.

export const CHECKED_AT = '2026-11-09';

export const SOURCES = {
  openai: 'https://developers.openai.com/api/docs/pricing (read 2026-11-09; no last-updated date on the page)',
  flitt: 'https://flitt.com/ka/pricing/ and https://flitt.com/pricing/ (read 2026-11-09; no date on the page)',
  nbg: 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/ (USD 2.5943 GEL, valid from 2026-11-10)',
  taxCode: 'https://matsne.gov.ge/ka/document/view/1043717 (Tax Code; Arts. 81, 83-98 read 2026-11-09; VAT Arts. 161-165 NOT read)',
  smallBusinessExclusions: 'https://matsne.gov.ge/ka/document/view/1164635 (Government Resolution 415, Annex 4; only the 2010 text was readable)',
  hetzner: 'https://www.hetzner.com/cloud/cost-optimized/ , /storage/object-storage/ (read 2026-11-09; EUR, excl. VAT)',
  digitalocean: 'https://www.digitalocean.com/pricing/droplets , /pricing/managed-databases , /products/spaces (read 2026-11-09)',
  resend: 'https://resend.com/pricing (read 2026-11-09)',
  twilio: 'https://www.twilio.com/en-us/verify/pricing and /sms/pricing/ge (pricing current as of October 2026)',
  expo: 'https://expo.dev/pricing (read 2026-11-09; push pricing not listed)',
};

export const ASSUMPTIONS = {
  // ---------- Currency ----------
  fx: {
    // QUOTED: NBG official rate valid from 2026-11-10.
    usdGelOfficial: 2.5943,
    // ASSUMPTION: the invariant uses a rate 10% weaker than today's, so a
    // moderate GEL depreciation can't break it. Stress test: 3.20 (+23%).
    usdGel: 2.86,
    eurUsd: 1.1, // ASSUMPTION (Hetzner bills in EUR)
  },

  // ---------- Payments ----------
  payments: {
    // QUOTED (Flitt): card 2.2% (0-10,000 GEL/month), 2.0% (10,000-50,000),
    // international cards 2.5%, larger volumes "custom". The page does not
    // say the 2.2%/2.0% rate is only for Georgian cards (inference).
    channels: {
      flitt_domestic: { fee: 0.022, supported: true, label: 'Flitt, Georgian card (0-10k GEL/month)' },
      flitt_international: { fee: 0.025, supported: true, label: 'Flitt, international card' },
      // NOT SUPPORTED in this build (no in-app purchase code). Shown so the
      // price an app-store sale would need is visible. Apple: 30% (15% in the
      // Small Business Program); Google Play: 15% on subscriptions.
      app_store: { fee: 0.3, supported: false, label: 'Apple App Store (not supported in this build)' },
      app_store_small_business: { fee: 0.15, supported: false, label: 'Apple Small Business Program (not supported)' },
      google_play: { fee: 0.15, supported: false, label: 'Google Play subscriptions (not supported)' },
    },
    // ASSUMPTION: refunds and chargebacks reserve (share of gross revenue).
    // Flitt lists no refund/chargeback fee; a refund returns the whole price.
    refundReserve: 0.03,
    // ASSUMPTION: a failed payment costs nothing (Flitt charges on success).
    failedPaymentCostGel: 0,
  },

  // ---------- Taxes (ACCOUNTANT/LEGAL APPROVAL REQUIRED) ----------
  // Tax Code Art. 88: small business status for individual entrepreneurs, 1%
  // of turnover up to 500,000 GEL a year (Art. 90(1)), 3% above (Art. 90(2)).
  // Government Resolution 415 Annex 4 excludes some activities (2010 text:
  // licensed activities, consulting, ...). Software/SaaS is not named there,
  // but the current annex could not be read: eligibility is NOT assumed.
  // VAT: an 18% rate and a 100,000 GEL registration threshold are general
  // knowledge, NOT verified here (Arts. 161-165 were not readable) — UNVERIFIED.
  // Art. 92 shows a small-business entrepreneur can also be a VAT payer.
  // LLC: 15% profit tax on distributed profit (Art. 98), not on revenue, so it
  // is a cash-flow item outside unit contribution.
  taxes: {
    scenarios: {
      small_business_1: { label: 'Eligible small business, 1% (not VAT-registered)', vat: 0, turnover: 0.01, approval: 'ACCOUNTANT/LEGAL APPROVAL REQUIRED' },
      small_business_3: { label: 'Small business above 500,000 GEL/year, 3%', vat: 0, turnover: 0.03, approval: 'ACCOUNTANT/LEGAL APPROVAL REQUIRED' },
      small_business_vat: { label: 'VAT-registered small business, 18% VAT + 3%', vat: 0.18, turnover: 0.03, approval: 'ACCOUNTANT/LEGAL APPROVAL REQUIRED; VAT rate UNVERIFIED' },
      llc_vat: { label: 'LLC, VAT-registered (18%); 15% profit tax only on distributed profit', vat: 0.18, turnover: 0, profitTaxOnDistribution: 0.15, approval: 'ACCOUNTANT/LEGAL APPROVAL REQUIRED' },
      international: { label: 'Foreign customer (VAT place of supply UNVERIFIED: treated as VAT 18% + 3%)', vat: 0.18, turnover: 0.03, approval: 'ACCOUNTANT/LEGAL APPROVAL REQUIRED' },
      worst_case: { label: 'Conservative worst case: 18% VAT inside the price + 3% of turnover', vat: 0.18, turnover: 0.03, approval: 'Used by the invariant until the tax status is confirmed' },
    },
    invariantScenario: 'worst_case',
  },

  // ---------- AI usage (MEASURED from ai_usage, 2026-11-09, test traffic) ----------
  // p50/p95 input and output tokens per request (Art: one turn incl. all calls).
  measured: {
    art: { model: 'gpt-6.1-sol', p50: { input: 7774, output: 274 }, p95: { input: 18571, output: 427 }, samples: 54 },
    anulia: { model: 'gpt-5.4-mini', p50: { input: 2009, output: 132 }, p95: { input: 2362, output: 245 }, samples: 11 },
    cards: { model: 'gpt-5.4-mini', p50: { input: 2384, output: 68 }, p95: { input: 3671, output: 82 }, samples: 11 },
    journal: { model: 'gpt-4.1-mini', p50: { input: 571, output: 86 }, p95: { input: 708, output: 103 }, samples: 12 },
    summary: { model: 'gpt-5.4-mini', p50: { input: 562, output: 154 }, p95: { input: 923, output: 200 }, samples: 6 },
    reflection: { model: 'gpt-5.4-mini', p50: { input: 768, output: 183 }, p95: { input: 945, output: 292 }, samples: 17 },
    community: { model: 'gpt-5.4-mini', p50: { input: 1087, output: 155 }, p95: { input: 1361, output: 188 }, samples: 9 },
  },
  // ASSUMPTION: share of input billed at the cached rate in normal use (OpenAI
  // caches repeated prefixes; not yet measured — recorded from now on).
  // Stress: 0.
  cacheShare: 0.5,
  // ASSUMPTION: an Art session is 12 turns on average (phases 0→1→2), 24 at most.
  artTurnsPerSession: 12,

  // ---------- Hosting and operations (QUOTED list prices, monthly) ----------
  infra: {
    // Option A (recommended): Hetzner. Option B: DigitalOcean managed database.
    options: {
      hetzner: {
        label: 'Hetzner Cloud (EU): app server + database server + backups + object storage',
        tiers: [
          { activeUsers: 100, eur: 5.99 + 5.99 + 2.4 + 6.49, usd: 0 },
          { activeUsers: 1000, eur: 8.99 + 5.99 + 3.0 + 6.49, usd: 0 },
          { activeUsers: 5000, eur: 16.49 + 8.99 + 5.1 + 6.49, usd: 0 },
          { activeUsers: 10000, eur: 2 * 16.49 + 16.49 + 9.9 + 6.49 + 10, usd: 0 },
        ],
      },
      digitalocean: {
        label: 'DigitalOcean: droplet + Managed PostgreSQL + backups + Spaces',
        tiers: [
          { activeUsers: 100, eur: 0, usd: 12 + 15.15 + 2.4 + 5 },
          { activeUsers: 1000, eur: 0, usd: 24 + 15.15 + 4.8 + 5 },
          { activeUsers: 5000, eur: 0, usd: 48 + 30.45 + 9.6 + 5 },
          { activeUsers: 10000, eur: 0, usd: 2 * 48 + 60.9 + 19.2 + 10 },
        ],
      },
    },
    chosen: 'hetzner',
    // Monthly fixed services next to hosting (USD).
    fixedUsd: {
      email: 20, // QUOTED Resend Pro (50,000 emails); the free plan (3,000/month) is not counted on
      domain: 1.25, // ASSUMPTION ~15 USD/year
      monitoring: 0, // ASSUMPTION free tiers (UNVERIFIED for production volumes)
      push: 0, // Expo push: pricing not listed on expo.dev/pricing (UNVERIFIED)
      builds: 19, // QUOTED Expo Starter (store builds and updates)
    },
    // ASSUMPTION: variable infrastructure per active user per month (storage, traffic).
    perActiveUserUsd: 0.01,
  },
  operations: {
    // ASSUMPTION: support time and tools per paying customer per month.
    supportGelPerPaidMonth: 1.0,
    // QUOTED Twilio: $0.05 per successful verification + $0.1684 per SMS to
    // Georgia; ASSUMPTION 2 SMS per verification. Only professionals verify a phone.
    smsVerificationUsd: 0.05 + 2 * 0.1684,
    // ASSUMPTION: professional support and verification review per month.
    professionalSupportGel: 3.0,
  },

  // ---------- Free users and acquisition ----------
  free: {
    // ASSUMPTION: free accounts per paying customer (stress: 20).
    perPaid: 10,
    // Free users' AI is capped per account (server/quota.mjs); their worst-case
    // cost is that cap. Their first Art session is a separate lifetime cap,
    // amortised over 12 months.
    artSessionAmortiseMonths: 12,
  },
  // Customer acquisition cost per new paying customer (GEL). null = UNKNOWN:
  // the report then refuses to call the 15 GEL minimum a full guarantee.
  cacGel: null,
  // Paying customers the fixed costs are spread over in the invariant
  // (the break-even count is reported separately).
  designPaidSubscribers: 100,

  // The non-negotiable minimum net contribution per paying customer per 30 days.
  minContributionGelPer30Days: 15,
};
