// Product catalog — the single server-side source of truth for what can be
// bought, for how much, and what it unlocks. The client only displays what
// this returns; it never sends a price to the server.
//
// Amounts are in minor units (tetri for GEL: 100 tetri = 1 GEL), which is what
// Flitt's `amount` field expects ("Order amount in cents without separator").
//
// Prices come from the economics model (server/finance/model.mjs,
// docs/BEHAPPY_FINANCE.md): each is the lowest round price that leaves at
// least 15 GEL per 30 days after every cost in the worst usage the server
// allows, in the conservative tax case (18% VAT inside the price + 3% of
// turnover) — the CI test server/test/finance.test.mjs fails otherwise.
// "current" is active. "affordable" is only safe once an accountant confirms
// the 1% small-business status without VAT (BEHAPPY_CATALOG=affordable and
// FINANCE_TAX_SCENARIO=small_business_1). Flitt runs in TEST mode.

const DAY = 24 * 60 * 60 * 1000;

const PLUS_FEATURES = ['anulia_plus', 'cards', 'art_program', 'journal_reflections_plus'];

const plus = (id, amountMinor, durationDays, highlight = false) => ({ id, kind: 'plus', amountMinor, currency: 'GEL', durationDays, recurring: false, grants: PLUS_FEATURES, highlight });
const art = (amountMinor) => ({ id: 'art_program', kind: 'art', amountMinor, currency: 'GEL', durationDays: null, recurring: false, grants: ['art_program'], highlight: false });

const CATALOGS = {
  current: [plus('plus_30', 4900, 30), plus('plus_90', 13500, 90, true), plus('plus_365', 54900, 365), art(10500)],
  affordable: [plus('plus_30', 3900, 30), plus('plus_90', 10900, 90, true), plus('plus_365', 44900, 365), art(8500)],
};

export function getCatalog(name = 'current') {
  return (CATALOGS[name] || CATALOGS.current).map((p) => ({ ...p }));
}

/**
 * BeHappy Professional: a fixed-price membership a verified psychologist pays
 * for the platform's tools. BeHappy takes no commission on sessions. A
 * prepaid pass with manual renewal (recurring: false) until an authorised
 * recurring-payment flow exists. Price, duration and trial come from config
 * (PRO_PRICE_MINOR, PRO_DURATION_DAYS, PRO_TRIAL_DAYS), so the owner can change
 * them; the values below are only defaults.
 */
export const PROFESSIONAL_DEFAULTS = { amountMinor: 7900, currency: 'GEL', durationDays: 30, trialDays: 14, graceDays: 0 };

export function getProfessionalCatalog(professional = PROFESSIONAL_DEFAULTS) {
  const p = { ...PROFESSIONAL_DEFAULTS, ...(professional || {}) };
  return [
    {
      id: 'professional_30d',
      kind: 'professional',
      amountMinor: p.amountMinor,
      currency: p.currency,
      durationDays: p.durationDays,
      recurring: false,
      trialDays: p.trialDays,
      commissionPercent: 0,
      audience: 'verified_professionals',
      grants: ['professional_listing', 'booking_calendar', 'client_messages', 'profile_analytics'],
      highlight: true,
    },
  ];
}

/**
 * Finds a product for checkout. Consumer and professional catalogs are kept
 * apart: a consumer checkout can't buy a membership and vice versa.
 */
export function findProduct(catalogName, productId, { audience = 'consumer', professional } = {}) {
  const list = audience === 'professional' ? getProfessionalCatalog(professional) : getCatalog(catalogName);
  return list.find((p) => p.id === productId) || null;
}

/** ASCII-only order description (Flitt order_desc is shown on the checkout page). */
export function orderDescription(product) {
  if (product.kind === 'plus') return `BeHappy Plus - ${product.durationDays} days (TEST)`;
  if (product.kind === 'art') return 'BeHappy Art Therapy Program (TEST)';
  if (product.kind === 'professional') return `BeHappy Professional - ${product.durationDays} days (TEST)`;
  return 'BeHappy (TEST)';
}

export const durationMs = (product) => (product.durationDays ? product.durationDays * DAY : null);
