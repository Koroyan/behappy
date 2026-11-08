// Estimated AI cost per model.
//
// List prices in USD per million tokens (November 2026; cached-input discounts
// are not applied, so estimates are an upper bound). Sources for the GPT-6.1
// and GPT-5.4 prices: docs/BEHAPPY_AI_MODEL_EVALUATION.md. A price staff set in
// the admin center (setting ai.pricing) or the AI_PRICE_*_PER_MTOK variables
// overrides this table for every model, as before.
//
// Before this table, nothing was priced unless staff entered a price, so the
// AI page showed "—" and the daily budget switch could never trigger.

export const MODEL_PRICES = {
  'gpt-6.1-sol': { inputPerMillion: 2, outputPerMillion: 10 },
  'gpt-6.1-terra': { inputPerMillion: 1, outputPerMillion: 5 },
  'gpt-6-astra': { inputPerMillion: 10, outputPerMillion: 50 },
  'gpt-5.4-mini': { inputPerMillion: 0.75, outputPerMillion: 4.5 },
  'gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8 },
  'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
};

/** Staff/env override (one price for all models) or null. */
export function overridePrice(setting) {
  const p = setting || {};
  const input = p.inputPerMillion ?? (Number(process.env.AI_PRICE_INPUT_PER_MTOK || 0) || null);
  const output = p.outputPerMillion ?? (Number(process.env.AI_PRICE_OUTPUT_PER_MTOK || 0) || null);
  return input || output ? { inputPerMillion: input || 0, outputPerMillion: output || 0 } : null;
}

/** Price for one model: the override, else the table (dated snapshots like "gpt-4o-mini-2024-07-18" use their base model). */
export function priceFor(model, override) {
  if (override) return override;
  const m = String(model || '');
  return MODEL_PRICES[m] || MODEL_PRICES[m.replace(/-\d{4}-\d{2}-\d{2}$/, '')] || null;
}

/**
 * Cost of rows [{ model, input, output }] in USD (2 decimals), or null when no
 * row has a known price. Rows of unpriced models (e.g. speech) are left out.
 */
export function costOf(rows, override) {
  let usd = 0;
  let priced = false;
  for (const r of rows) {
    const p = priceFor(r.model, override);
    if (!p) continue;
    priced = true;
    usd += (Number(r.input || 0) * p.inputPerMillion + Number(r.output || 0) * p.outputPerMillion) / 1e6;
  }
  return priced ? Math.round(usd * 100) / 100 : null;
}

/** Unrounded spend, for the daily budget check. */
export function spendOf(rows, override) {
  return rows.reduce((sum, r) => {
    const p = priceFor(r.model, override);
    return p ? sum + (Number(r.input || 0) * p.inputPerMillion + Number(r.output || 0) * p.outputPerMillion) / 1e6 : sum;
  }, 0);
}
