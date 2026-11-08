// Checks a daily-reflection draft before the person sees it.
//
// The model receives only facts (ids and values) the person allowed, plus,
// with separate permission, short journal excerpts as data. A draft is
// rejected when it:
//   - cites facts that weren't given, or makes a pattern without citing any;
//   - states a number that isn't in the facts (invented counts, minutes…);
//   - uses diagnostic / clinical labels;
//   - claims causes ("because", "due to", "led to"…) — patterns may only be
//     cautious observations of what happened together;
//   - names feelings when no mood was recorded that day.
import { clinicalClaims, extractFacts } from '../art/facts.mjs';

export const LIMITS = { reflection: 900, pattern: 280, suggestion: 280, patterns: 3 };

const CAUSAL = [
  /\b(because|caused|causes|cause of|due to|led to|leads to|results? in|resulted in|made you|makes you|thanks to|that'?s why|which is why)\b/i,
  /(?<!\p{L})(იმიტომ|რის გამოც|გამოიწვია|იწვევს|განაპირობა|ამის გამო|გამო)(?!\p{L})/iu,
  /(?<!\p{L})(потому что|из-за|вызвал[аио]?|вызывает|привел[аио]?|приводит|благодаря|поэтому)(?!\p{L})/iu,
  /(?<!\p{L})(որովհետև|պատճառով|հանգեցրեց|առաջացրեց)(?!\p{L})/iu,
];

export function parseDraft(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const j = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
    return {
      reflection: typeof j.reflection === 'string' ? j.reflection.trim() : '',
      patterns: Array.isArray(j.patterns) ? j.patterns.filter((p) => p && typeof p.text === 'string').map((p) => ({ text: p.text.trim(), facts: Array.isArray(p.facts) ? p.facts.map(String) : [] })) : [],
      suggestion: typeof j.suggestion === 'string' ? j.suggestion.trim() : '',
    };
  } catch {
    return null;
  }
}

/** Every number found in the facts (also inside strings like "1, 3"). */
function allowedNumbers(facts, day) {
  const out = new Set();
  for (const f of facts) for (const v of Object.values(f)) for (const n of String(v).match(/\d+(?:[.,]\d+)?/g) || []) out.add(n.replace(',', '.'));
  for (const n of String(day || '').split('-')) out.add(String(Number(n)));
  return out;
}

export function verifyReflection(draft, facts, { day } = {}) {
  const problems = [];
  if (!draft) return { ok: false, problems: ['json'] };
  if (!draft.reflection || draft.reflection.length > LIMITS.reflection) problems.push('length');
  if (draft.patterns.length > LIMITS.patterns || draft.patterns.some((p) => p.text.length > LIMITS.pattern)) problems.push('length');
  if (draft.suggestion.length > LIMITS.suggestion) problems.push('length');
  const ids = new Set(facts.map((f) => f.id));
  if (draft.patterns.some((p) => !p.facts.length || p.facts.some((id) => !ids.has(id)))) problems.push('uncited');
  const texts = [draft.reflection, ...draft.patterns.map((p) => p.text), draft.suggestion];
  const all = texts.join('\n');
  const numbers = allowedNumbers(facts, day);
  // Small counting words are fine ("one practice"); digits must come from the facts.
  for (const n of all.match(/\d+(?:[.,]\d+)?/g) || []) if (!numbers.has(n.replace(',', '.'))) problems.push(`number:${n}`);
  if (texts.some((t) => clinicalClaims(t).length)) problems.push('clinical');
  if (CAUSAL.some((re) => re.test(all))) problems.push('causal');
  const moodRecorded = facts.some((f) => String(f.id).startsWith('mood.'));
  if (!moodRecorded && extractFacts(all).feelings.length) problems.push('feelings');
  return { ok: problems.length === 0, problems: [...new Set(problems)] };
}

/** What the model is told when its draft failed (codes only, no content). */
export function correctionFor(problems) {
  const lines = [];
  if (problems.includes('json')) lines.push('Return one JSON object with "reflection", "patterns" and "suggestion".');
  if (problems.includes('uncited')) lines.push('Every pattern must list the ids of the facts it is based on, using only ids from FACTS.');
  if (problems.some((p) => p.startsWith('number:'))) lines.push('Use only numbers that appear in FACTS.');
  if (problems.includes('clinical')) lines.push('Remove every diagnostic or clinical word.');
  if (problems.includes('causal')) lines.push('Do not say that one thing caused or led to another; only that they happened on the same day.');
  if (problems.includes('feelings')) lines.push('No mood was recorded today: do not name any feeling.');
  if (problems.includes('length')) lines.push('Keep it short: reflection under 600 characters, at most 3 patterns.');
  return lines.join(' ');
}
