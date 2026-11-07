// Fixed vocabularies for professional profiles, and per-country verification
// rules.
//
// COUNTRY_RULES is deliberately conservative and incomplete: which documents
// a country legally requires before someone may offer psychological services
// (and advertise them in a directory) must be confirmed by a lawyer for each
// operating market. Until a country has a reviewed rule, the default applies:
// an identity document and a degree are required, and a licence or
// registration is checked wherever an official register exists.

export const SPECIALIZATIONS = [
  'anxiety', 'depression', 'panic', 'trauma', 'stress_burnout', 'relationships', 'family', 'grief', 'self_esteem', 'emotional_regulation',
  'sleep', 'addiction', 'eating', 'ocd', 'children_adolescents', 'work_career', 'life_transitions', 'lgbtq', 'personal_growth',
];

export const PAYMENT_METHODS = ['bank_transfer', 'card_link', 'cash_in_person', 'other'];

export const SERVICE_LANGUAGES = ['ka', 'en', 'ru', 'hy', 'uk', 'tr', 'az', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'id', 'ar', 'hi', 'zh', 'ja', 'ko'];

export const DOCUMENT_KINDS = ['identity', 'degree', 'license', 'certification', 'other'];

export const DEFAULT_RULE = {
  identityDocument: true,
  degreeDocument: true,
  licenseRequired: false,
  reviewed: false,
  note: 'Default rule. The legal requirements for this country have not been reviewed yet.',
};

export const COUNTRY_RULES = {
  // Example of a reviewed entry once legal advice is available:
  // GE: { identityDocument: true, degreeDocument: true, licenseRequired: false, reviewed: true, note: '…' },
};

// Reviewed policies activated in the staff tools (country_policies), loaded at
// start and after every change (server/admin/professionals.mjs).
let activePolicies = {};
export function setActivePolicies(list) {
  activePolicies = Object.fromEntries(
    list.map((p) => [p.country, { identityDocument: p.identityDocument, degreeDocument: p.degreeDocument, licenseRequired: p.licenseRequired, registryUrl: p.registryUrl || null, reviewed: true, policyVersion: p.version, note: p.notes || '' }])
  );
}

export const ruleFor = (country) => {
  const c = String(country || '').toUpperCase();
  return { ...DEFAULT_RULE, ...(COUNTRY_RULES[c] || {}), ...(activePolicies[c] || {}) };
};

/** The checklist an admin works through (stored with each decision). */
export const REVIEW_CHECKLIST = ['identity_matches', 'degree_verified', 'license_checked', 'languages_plausible', 'profile_appropriate', 'no_conflicts'];

export const isCountry = (c) => /^[A-Z]{2}$/.test(String(c || ''));

export const isTimezone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(tz) });
    return true;
  } catch {
    return false;
  }
};
