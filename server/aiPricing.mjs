// AI prices and the cost of each call.
//
// List prices, USD per 1M tokens, Standard tier, short context — read from
// https://developers.openai.com/api/docs/pricing on 2026-11-09 (the page has no
// "last updated" date). Cached input is billed at its own rate; reasoning
// tokens are part of output tokens. A price staff set in the admin center
// (setting ai.pricing) or the AI_PRICE_*_PER_MTOK variables overrides this table
// for every model (a stress or contract price), as before.

export const PRICES_CHECKED = { at: '2026-11-09', source: 'https://developers.openai.com/api/docs/pricing' };

export const MODEL_PRICES = {
  'gpt-6.1-sol': { inputPerMillion: 2, cachedPerMillion: 0.1, outputPerMillion: 10 },
  'gpt-6.1-terra': { inputPerMillion: 1, cachedPerMillion: 0.05, outputPerMillion: 5 },
  'gpt-6-astra': { inputPerMillion: 10, cachedPerMillion: 1, outputPerMillion: 50 },
  'gpt-5.4': { inputPerMillion: 2.5, cachedPerMillion: 0.25, outputPerMillion: 15 },
  'gpt-5.4-mini': { inputPerMillion: 0.75, cachedPerMillion: 0.075, outputPerMillion: 4.5 },
  'gpt-4.1': { inputPerMillion: 2, cachedPerMillion: 0.5, outputPerMillion: 8 },
  'gpt-4.1-mini': { inputPerMillion: 0.4, cachedPerMillion: 0.1, outputPerMillion: 1.6 },
  'gpt-4o': { inputPerMillion: 2.5, cachedPerMillion: 1.25, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, cachedPerMillion: 0.075, outputPerMillion: 0.6 },
  // Transcription: tokens in/out; the page's own estimate is $0.003 per minute.
  'gpt-4o-mini-transcribe': { inputPerMillion: 1.25, cachedPerMillion: 1.25, outputPerMillion: 5 },
  // Speech: text in $0.60, audio out $12.00 per 1M tokens.
  'gpt-4o-mini-tts': { inputPerMillion: 0.6, cachedPerMillion: 0.6, outputPerMillion: 12 },
};

/**
 * Audio, where OpenAI does not return token counts to us (ASSUMPTIONS, marked
 * as such in the finance report):
 *  - transcription: the published estimate, $0.003 per minute; minutes from the
 *    upload size at 8 KB/s (64 kbit/s AAC, which over-counts typical voice notes).
 *  - speech: about 1,250 audio tokens per minute of speech and ~900 characters
 *    per minute; text tokens ≈ characters / 3 (Georgian and other non-Latin
 *    scripts use more tokens per character than English).
 */
export const AUDIO = { transcribeUsdPerMinute: 0.003, uploadBytesPerSecond: 8000, ttsAudioTokensPerMinute: 1250, ttsCharsPerMinute: 900, charsPerTextToken: 3 };

export function transcribeCostUsd(bytes) {
  const minutes = Math.max(1 / 60, Number(bytes || 0) / AUDIO.uploadBytesPerSecond / 60);
  return minutes * AUDIO.transcribeUsdPerMinute;
}

export function speechCostUsd(chars, override = null) {
  const p = priceFor('gpt-4o-mini-tts', override);
  const minutes = Number(chars || 0) / AUDIO.ttsCharsPerMinute;
  const audioTokens = minutes * AUDIO.ttsAudioTokensPerMinute;
  const textTokens = Number(chars || 0) / AUDIO.charsPerTextToken;
  return (textTokens * p.inputPerMillion + audioTokens * p.outputPerMillion) / 1e6;
}

/** Staff/env override (one price for all models) or null. */
export function overridePrice(setting) {
  const p = setting || {};
  const input = p.inputPerMillion ?? (Number(process.env.AI_PRICE_INPUT_PER_MTOK || 0) || null);
  const output = p.outputPerMillion ?? (Number(process.env.AI_PRICE_OUTPUT_PER_MTOK || 0) || null);
  return input || output ? { inputPerMillion: input || 0, cachedPerMillion: p.cachedPerMillion ?? (input || 0), outputPerMillion: output || 0 } : null;
}

/** Price for one model: the override, else the table (dated snapshots like "gpt-4o-mini-2024-07-18" use their base model). */
export function priceFor(model, override) {
  if (override) return override;
  const m = String(model || '');
  return MODEL_PRICES[m] || MODEL_PRICES[m.replace(/-\d{4}-\d{2}-\d{2}$/, '')] || null;
}

/**
 * Cost of one call in USD. `cached` input tokens are billed at the cached rate
 * (they are included in `input`, as OpenAI reports them). An unknown model is
 * priced as the most expensive known model, never as free.
 */
export function callCostUsd({ model, input = 0, output = 0, cached = 0 }, override = null) {
  const p = priceFor(model, override) || MODEL_PRICES['gpt-6-astra'];
  const c = Math.min(Number(cached || 0), Number(input || 0));
  return ((Number(input || 0) - c) * p.inputPerMillion + c * (p.cachedPerMillion ?? p.inputPerMillion) + Number(output || 0) * p.outputPerMillion) / 1e6;
}

/**
 * Worst-case cost of one request per feature, reserved before the call so an
 * allowance can't be overrun by requests running at the same time. Derived
 * from the server's own caps (output tokens, retries, history) with 0% cache.
 */
export const RESERVE_USD = {
  // gpt-5.4-mini: up to ~24k input (instructions, memory, 60 turns) and 2,048 output.
  anulia: 0.03,
  summary: 0.02,
  motivation: 0.01,
  journal: 0.01,
  cards: 0.03,
  community: 0.01,
  reflection: 0.02, // one draft and one correction
  // gpt-6.1-sol, 24 messages per session at most: up to 3 calls, each ~19k input
  // (instructions, history, two photos) and 8,000 output (12,800 after a cut-off).
  art: 0.4,
  transcribe: 0.01, // 15 MB upload cap ≈ 31 min at the assumed bitrate
  speech: 0.04, // 2,000 characters
};

/** Cost of rows [{ model, input, output, cached? }] in USD (2 decimals), or null when no row has a known price. */
export function costOf(rows, override) {
  let usd = 0;
  let priced = false;
  for (const r of rows) {
    if (!priceFor(r.model, override)) continue;
    priced = true;
    usd += callCostUsd({ model: r.model, input: r.input, output: r.output, cached: r.cached }, override);
  }
  return priced ? Math.round(usd * 100) / 100 : null;
}

/** Unrounded spend, for budget checks. */
export function spendOf(rows, override) {
  return rows.reduce((sum, r) => (priceFor(r.model, override) ? sum + callCostUsd({ model: r.model, input: r.input, output: r.output, cached: r.cached }, override) : sum), 0);
}
