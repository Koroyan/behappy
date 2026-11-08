// Checks every art-reflection reply against what the app knows before the
// person sees it. Two kinds of checks:
//
//  1. State (normalizeState): the reply's session_phase / phase_complete /
//     session_complete / required_input / action must fit the existing
//     three-phase flow (server/prompts/art.md). Nothing here changes the flow;
//     it only stops a model from breaking it: going back to phase 0, skipping
//     the change-or-story choice, closing an unfinished session, or talking
//     about a second drawing that was never uploaded.
//  2. Content (checkContent): the reply must not contradict what the person
//     said about their feelings, must not describe changes the image
//     comparison didn't find, and must not use diagnostic labels.
//
// Fixes are the smallest possible and are reported as `fixes` / `problems`
// (codes only, never content) for tests and the AI usage log.

import { assertedFeelings, claimPolarity, claimsVisualChange, clinicalClaims, sentences } from './facts.mjs';
import { artText } from './texts.mjs';

const REQUIRED = new Set(['none', 'text', 'image_v1', 'image_v2']);
const ACTIONS = new Set(['none', 'continue_exploration', 'request_modified_drawing', 'analyze_second_drawing', 'compare_drawings', 'close_session']);
const hasQuestion = (text) => /[?？]/.test(String(text || ''));

/** The model's JSON (also when wrapped in stray text). */
export function parseModelJson(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, error: 'empty' };
  const tryParse = (s) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const value = tryParse(t) || (t.indexOf('{') >= 0 ? tryParse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) : null);
  if (!value) return { ok: false, error: 'not_json' };
  if (typeof value.response_text !== 'string' || !value.response_text.trim()) return { ok: false, error: 'no_response_text', value };
  return { ok: true, value };
}

/**
 * ctx: { phase: 0|1|2|null (where the session is), upload: 'image_v1'|'image_v2'|null
 * (what this turn uploaded), hasSecondImage, endRequested (the app's "End
 * session" button), endIntent (the person wrote that they want to stop),
 * language }
 */
export function normalizeState(input, ctx = {}) {
  const out = { ...input };
  const fixes = [];
  const fix = (code) => fixes.push(code);
  const known = [0, 1, 2].includes(ctx.phase) ? ctx.phase : null;

  if (![0, 1, 2].includes(out.session_phase)) {
    out.session_phase = known ?? 0;
    fix('phase_missing');
  }
  for (const k of ['phase_complete', 'session_complete']) {
    if (typeof out[k] !== 'boolean') {
      out[k] = out[k] === 'true';
      if (input[k] !== undefined) fix(`${k}_type`);
    }
  }
  if (!REQUIRED.has(out.required_input)) {
    out.required_input = 'text';
    fix('required_input_invalid');
  }
  if (!ACTIONS.has(out.action)) {
    out.action = 'continue_exploration';
    fix('action_invalid');
  }
  for (const k of ['phase_summary', 'session_summary']) if (out[k] !== undefined && typeof out[k] !== 'string') out[k] = '';

  // A changed drawing was just uploaded: always phase 1, "analyze_second_drawing".
  if (ctx.upload === 'image_v2') {
    const want = { session_phase: 1, phase_complete: false, session_complete: false, required_input: 'text', action: 'analyze_second_drawing' };
    if (Object.entries(want).some(([k, v]) => out[k] !== v)) fix('image_v2_turn');
    Object.assign(out, want);
    return { value: out, fixes };
  }

  // Never back, never past the change-or-story choice without closing.
  if (known !== null && out.session_phase < known) {
    out.session_phase = known;
    fix('phase_backwards');
  }
  const closing = out.session_complete || out.action === 'close_session';
  if (known === 0 && out.session_phase === 2 && !closing && !ctx.endRequested) {
    out.session_phase = 1;
    fix('phase_skipped');
  }

  // No second drawing in this session: nothing to analyse or compare.
  if (ctx.hasSecondImage === false && ['analyze_second_drawing', 'compare_drawings'].includes(out.action)) {
    out.action = 'continue_exploration';
    fix('no_second_image');
  }
  if (out.required_input === 'image_v2' && out.session_phase !== 1) {
    out.required_input = 'text';
    fix('image_v2_outside_phase_1');
  }
  if (out.required_input === 'image_v1' && known !== null && known > 0) {
    out.required_input = 'text';
    fix('image_v1_after_phase_0');
  }

  // Closing: only in phase 2, only without a question, always with a summary.
  if (closing) {
    if (hasQuestion(out.response_text) && !ctx.endRequested) {
      Object.assign(out, { session_complete: false, phase_complete: false, required_input: 'text', action: 'continue_exploration' });
      fix('close_with_question');
    } else if (known === 0 && !ctx.endRequested && !ctx.endIntent) {
      // art.md: never complete in phase 0 unless the person asks to end.
      Object.assign(out, { session_phase: Math.min(out.session_phase, 1), session_complete: false, phase_complete: out.session_phase >= 1, required_input: 'text', action: 'continue_exploration', session_summary: '' });
      fix('premature_close');
    } else {
      if (out.session_phase !== 2 || !out.session_complete || out.action !== 'close_session' || out.required_input !== 'none' || !out.phase_complete) fix('close_completed');
      Object.assign(out, { session_phase: 2, session_complete: true, phase_complete: true, required_input: 'none', action: 'close_session' });
      if (!String(out.session_summary || '').trim()) {
        out.session_summary = String(out.phase_summary || '').trim() || artText(ctx.language, 'thanks');
        fix('summary_missing');
      }
    }
  } else if (ctx.endRequested) {
    // The person asked to end: close warmly, whatever the model planned.
    Object.assign(out, { session_phase: 2, session_complete: true, phase_complete: true, required_input: 'none', action: 'close_session' });
    if (!String(out.session_summary || '').trim()) out.session_summary = String(out.phase_summary || '').trim() || artText(ctx.language, 'thanks');
    if (hasQuestion(out.response_text)) out.response_text = sentences(out.response_text).filter((s) => !/[?？]/.test(s)).join(' ') || artText(ctx.language, 'thanks');
    fix('end_requested');
  } else if (out.session_phase === 2 && out.phase_complete && String(out.session_summary || '').trim()) {
    // The app treats "phase 2 complete with a summary" as closed; keep it unambiguous.
    out.phase_complete = false;
    out.session_summary = '';
    fix('summary_without_close');
  }
  return { value: out, fixes };
}

/**
 * Content checks. ctx adds: userFacts (this turn's feelings), recentFacts
 * (earlier turns, newest last), comparison ({ state }), userUsedClinical.
 * Returns problem codes with a short machine-readable detail.
 */
export function checkContent(out, ctx = {}) {
  const problems = [];
  const current = claimPolarity(ctx.userFacts || []);
  const userPolarity = current !== 0 ? current : claimPolarity((ctx.recentFacts || []).slice(-6));
  const texts = [out.response_text, out.session_complete ? out.session_summary : ''].filter(Boolean);

  if (userPolarity !== 0) {
    const claimed = claimPolarity(assertedFeelings(out.response_text));
    if (claimed === -userPolarity) problems.push({ code: 'contradiction', where: 'response_text', user: userPolarity });
  }
  const state = ctx.comparison?.state;
  const afterChangedImage = ctx.upload === 'image_v2' || ctx.hasSecondImage;
  if (afterChangedImage && ['identical', 'likely_same', 'uncertain'].includes(state)) {
    if (out.comparison_claim === 'change_described' || claimsVisualChange(out.response_text)) problems.push({ code: 'visual_claim', where: 'response_text', state });
  }
  if (!ctx.userUsedClinical) for (const t of texts) if (clinicalClaims(t).length) problems.push({ code: 'clinical', where: t === out.response_text ? 'response_text' : 'session_summary' });
  return problems;
}

const AI_NOTE = new RegExp(String.raw`(?<!\p{L})(AI|ИИ|ШІ|KI|IA)(?!\p{L})|ხელოვნური ინტელექტ|արհեստական բանականությ|yapay zek|süni intellekt|人工知能|AIの|AI 동반자|인공지능|ذكاء اصطناعي|AI साथी|kecerdasan buatan|pendamping AI|AI伙伴|AI 伙伴`, 'iu');

/**
 * Keeps only summary sentences supported by what the person said: drops
 * sentences that reverse their feelings, describe drawing changes the
 * comparison didn't find, or use clinical labels. The closing "AI companion"
 * sentence is kept or added.
 */
export function cleanSummary(summary, ctx = {}) {
  const sessionFacts = ctx.sessionFacts || [];
  const evals = sessionFacts.filter((f) => f.kind === 'eval' || f.polarity !== 0);
  const sessionPolarity = claimPolarity(evals);
  const noChange = ['identical', 'likely_same', 'uncertain', 'comparison_unavailable'].includes(ctx.comparison?.state) && ctx.hasSecondImage;
  const removed = [];
  const kept = sentences(summary).filter((s) => {
    if (AI_NOTE.test(s)) return true;
    const claimed = claimPolarity(assertedFeelings(s));
    if (sessionPolarity !== 0 && claimed === -sessionPolarity) return removed.push('contradiction'), false;
    if (noChange && claimsVisualChange(s)) return removed.push('visual_claim'), false;
    if (!ctx.userUsedClinical && clinicalClaims(s).length) return removed.push('clinical'), false;
    return true;
  });
  let text = kept.join(' ').trim();
  const body = kept.filter((s) => !AI_NOTE.test(s));
  if (!body.length) text = `${artText(ctx.language, 'thanks')} ${kept.filter((s) => AI_NOTE.test(s)).join(' ')}`.trim();
  if (!AI_NOTE.test(text)) text = `${text} ${artText(ctx.language, 'note')}`.trim();
  return { text, removed };
}

/**
 * The deterministic replacement when a reply is still wrong after a retry:
 * a short, honest sentence in the person's language, in the same phase.
 */
export function fallbackReply(out, problems, ctx = {}) {
  const v = { ...out };
  const codes = new Set(problems.map((p) => p.code));
  if (codes.has('visual_claim')) {
    v.response_text = artText(ctx.language, ctx.comparison?.state === 'identical' ? 'identical' : 'uncertain');
  } else if (codes.has('contradiction')) {
    const user = problems.find((p) => p.code === 'contradiction')?.user;
    if (v.session_complete) {
      // A closing reply stays a closing reply: only the contradicting sentences go.
      const kept = sentences(v.response_text).filter((s) => claimPolarity(assertedFeelings(s)) !== -user).join(' ').trim();
      v.response_text = kept || artText(ctx.language, 'thanks');
    } else {
      v.response_text = artText(ctx.language, user < 0 ? 'clarifyNeg' : 'clarifyPos');
      if (ctx.upload !== 'image_v2') Object.assign(v, { required_input: 'text', action: v.action === 'compare_drawings' ? 'compare_drawings' : 'continue_exploration' });
    }
  } else if (codes.has('clinical')) {
    const kept = sentences(v.response_text).filter((s) => !clinicalClaims(s).length).join(' ').trim();
    v.response_text = kept || artText(ctx.language, 'retry');
  }
  // A question can't close a session.
  if (v.session_complete && hasQuestion(v.response_text)) Object.assign(v, { session_complete: false, phase_complete: false, required_input: 'text', action: 'continue_exploration', session_summary: '' });
  return v;
}
