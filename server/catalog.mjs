// Product catalog — the single server-side source of truth for what can be
// bought, for how much, and what it unlocks. The client only displays what
// this returns; it never sends a price to the server.
//
// Amounts are in minor units (tetri for GEL: 100 tetri = 1 GEL), which is what
// Flitt's `amount` field expects ("Order amount in cents without separator").
//
// IMPORTANT: every price below is a TEST value while Flitt runs in sandbox
// mode. "current" mirrors the prices that were configured in the app before
// the 2.0 rebuild (including the 50 GEL Art Therapy price). "proposal" is the
// recommendation from docs/BEHAPPY_PRICING_STRATEGY.md. Neither is a final
// business decision; switch with BEHAPPY_CATALOG=current|proposal.

const DAY = 24 * 60 * 60 * 1000;

const PLUS_FEATURES = ['anulia_plus', 'cards', 'art_program', 'journal_reflections_plus'];

const CATALOGS = {
  current: [
    {
      id: 'plus_30',
      kind: 'plus',
      amountMinor: 5100,
      currency: 'GEL',
      durationDays: 30,
      recurring: false,
      grants: PLUS_FEATURES,
      highlight: false,
    },
    {
      id: 'plus_90',
      kind: 'plus',
      amountMinor: 14200,
      currency: 'GEL',
      durationDays: 90,
      recurring: false,
      grants: PLUS_FEATURES,
      highlight: true,
    },
    {
      id: 'plus_365',
      kind: 'plus',
      amountMinor: 51900,
      currency: 'GEL',
      durationDays: 365,
      recurring: false,
      grants: PLUS_FEATURES,
      highlight: false,
    },
    {
      id: 'art_program',
      kind: 'art',
      amountMinor: 5000,
      currency: 'GEL',
      durationDays: null, // lifetime access to the 43-session program
      recurring: false,
      grants: ['art_program'],
      highlight: false,
    },
  ],
  proposal: [
    {
      id: 'plus_30',
      kind: 'plus',
      amountMinor: 2900,
      currency: 'GEL',
      durationDays: 30,
      recurring: false,
      grants: PLUS_FEATURES,
      highlight: false,
    },
    {
      id: 'plus_365',
      kind: 'plus',
      amountMinor: 24900,
      currency: 'GEL',
      durationDays: 365,
      recurring: false,
      grants: PLUS_FEATURES,
      highlight: true,
    },
    {
      id: 'art_program',
      kind: 'art',
      amountMinor: 5000,
      currency: 'GEL',
      durationDays: null,
      recurring: false,
      grants: ['art_program'],
      highlight: false,
    },
  ],
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
