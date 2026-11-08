// One art-reflection turn, checked before the person sees it.
//
// The art feature used to stream the model's reply straight through. Now the
// server:
//   1. reads the turn: the person's own words (without the app's context
//      block), the phase and language from that block, an uploaded drawing;
//   2. fingerprints the drawing and, for a changed drawing, compares it with
//      the first one (imageCompare.mjs);
//   3. extracts what the person said (facts.mjs) and gives the model a short
//      developer note: how to read Latin-typed Georgian/Russian, the feelings
//      to keep (with negation), the comparison result, and for closing the
//      verified facts the summary may use;
//   4. asks the model (not streamed), then checks the reply (validate.mjs):
//      phase/state, contradicted feelings, invented drawing changes, clinical
//      labels, summary sentences. One corrective retry; if still wrong, a
//      short fixed reply in the person's language;
//   5. sends the result in the same Server-Sent Events shape the app already
//      reads (or JSON for non-streaming calls).
//
// The three phases, their order, the questions and the completion rules are
// unchanged: they live in server/prompts/art.md. Nothing here adds a phase.

import { recordAiUsage } from '../ai.mjs';
import { ts } from '../db/index.mjs';
import { clinicalClaims, endIntent, extractFacts, languageNote, polarityOf } from './facts.mjs';
import { compareFingerprints, fingerprint } from './imageCompare.mjs';
import { artText, languageCode } from './texts.mjs';
import { checkContent, cleanSummary, fallbackReply, normalizeState, parseModelJson } from './validate.mjs';

const IMAGE_ONLY = 'An image was uploaded without text.';
const MAX_CALLS = 3;
const MAX_FACTS = 80;

/** Settings for the art model (validated in config.mjs; defaults here for tests). */
export const artSettings = (config) => ({
  model: config.ai?.models?.art || 'gpt-5.4-mini',
  fallbackModel: config.ai?.art?.fallbackModel || null,
  reasoning: config.ai?.art?.reasoning || 'medium',
  maxOutputTokens: config.ai?.art?.maxOutputTokens || 8000,
  store: config.ai?.art?.store !== false,
  timeoutMs: config.ai?.art?.timeoutMs || 120000,
});

const textOf = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item.content === 'string') return item.content;
  return (item.content || []).filter((p) => p.type === 'input_text' || p.type === 'output_text').map((p) => p.text || '').join('\n');
};
const imagesOf = (item) => (Array.isArray(item?.content) ? item.content.filter((p) => p.type === 'input_image' && typeof p.image_url === 'string') : []);

/** The person's own words from a user turn (the app's context block removed). */
export function ownWords(text) {
  const own = String(text || '').split('\n\n[Session Context:')[0].trim();
  return own.startsWith(IMAGE_ONLY) ? '' : own;
}

/** What this request is: phase, language, upload, end request, the person's words. */
export function readTurn(input, headers = {}) {
  const items = Array.isArray(input) ? input : [{ role: 'user', content: String(input || '') }];
  const users = items.filter((i) => i && i.role === 'user');
  const last = users[users.length - 1];
  const full = textOf(last);
  const phaseMatch = /\[Session Context:[^\]]*Phase:\s*([012])/.exec(full);
  const langMatch = /\[Session Context:[^\]]*Language:\s*([^,\]]+)/.exec(full);
  const headerPhase = Number(headers.phase);
  const phase = [0, 1, 2].includes(headerPhase) && headers.phase !== '' && headers.phase !== undefined ? headerPhase : phaseMatch ? Number(phaseMatch[1]) : null;
  const images = imagesOf(last);
  const words = ownWords(full);
  let upload = ['image_v1', 'image_v2'].includes(headers.upload) ? headers.upload : null;
  if (!upload && images.length) upload = phase !== null && phase >= 1 ? 'image_v2' : 'image_v1';
  return {
    phase,
    language: languageCode(headers.language || langMatch?.[1] || 'en'),
    words,
    earlierWords: users.slice(0, -1).map((u) => ownWords(textOf(u))).filter(Boolean),
    images,
    upload: images.length ? upload : null,
    endRequested: /\[User Action: The person asked to close the session via button\.\]/.test(full),
    endIntent: /\[User Action: The person asked to close the session via text\.\]/.test(full) || endIntent(words),
  };
}

const compact = (facts, at) => [
  ...facts.feelings.map((f) => ({ k: f.kind, s: f.stem, w: f.term.slice(0, 40), p: f.polarity, n: f.negated ? 1 : 0, at })),
  ...facts.colours.map((c) => ({ k: 'colour', c, at })),
  ...facts.body.map((b) => ({ k: 'body', b, at })),
];
const asFeelings = (ledger) => ledger.filter((f) => f.k === 'eval' || f.k === 'state').map((f) => ({ kind: f.k, stem: f.s, term: f.w, polarity: f.p, negated: Boolean(f.n) }));
const label = (p) => (p < 0 ? 'unpleasant' : p > 0 ? 'pleasant' : 'neutral');

function factsLine(ledger) {
  const feelings = asFeelings(ledger).slice(-10);
  const colours = [...new Set(ledger.filter((f) => f.k === 'colour').map((f) => f.c))];
  const body = [...new Set(ledger.filter((f) => f.k === 'body').map((f) => f.b))];
  const parts = [];
  if (feelings.length) parts.push(`feelings in their own words: ${feelings.map((f) => `"${f.term}"${f.negated ? ' (negated)' : ''} = ${label(f.polarity)}`).join(', ')}`);
  if (colours.length) parts.push(`colours they named: ${colours.join(', ')}`);
  if (body.length) parts.push(`where in the body: ${body.join(', ')}`);
  return parts.join('; ');
}

const COMPARISON_NOTE = {
  identical:
    'IMAGE COMPARISON (exact, reliable): the "changed" drawing is the same image as the first one — no visible change. Do not describe any change. In response_text say, in the selected language, that you don\'t see changes between the two images, that perhaps the same drawing was sent, and that you can continue with it. Set comparison_claim = "no_change".',
  likely_same:
    'IMAGE COMPARISON (reliable): the two photos are very likely the same drawing; the differences look like light, camera angle or compression only. Never claim the drawing changed. When it is time to compare, say that you can\'t see a clear change and ask what they changed or meant to change.',
  uncertain:
    'IMAGE COMPARISON: uncertain — the app can\'t tell reliably what changed{where}. Do not assert any specific change; when it is time to compare, ask the person what they changed.',
  different:
    'IMAGE COMPARISON (reliable): the drawing changed; the clearest differences are {where}{kind}. When you name one difference, name only something you can actually see there, neutrally, without interpreting it.',
  comparison_unavailable:
    'IMAGE COMPARISON: not available for these photos. Only mention a difference that is clearly visible in both images; if you are not sure, ask the person what they changed.',
};

function comparisonNote(cmp) {
  if (!cmp?.state) return '';
  const ev = cmp.evidence || {};
  const where = ev.regions?.length ? ` in the ${ev.regions.join(' and ')} area` : '';
  const kind = ev.kind === 'colour' ? ' (colours changed)' : ev.kind === 'more_drawn' ? ' (more was drawn)' : ev.kind === 'less_drawn' ? ' (something was removed or lightened)' : '';
  return (COMPARISON_NOTE[cmp.state] || '').replace('{where}', cmp.state === 'different' ? where.trim() || 'in the drawing' : where).replace('{kind}', kind);
}

/** The developer note for this turn (never shown; the model must not mention it). */
export function buildNote({ turn, ledger, turnFacts, comparison, afterChange, correction, closingLikely }) {
  const lines = ['[BeHappy app note for this turn. Computed by the app and reliable. Never mention or quote this note.]'];
  const ln = languageNote(turn.words);
  if (ln) lines.push(ln);
  if (turnFacts.feelings.length) {
    const p = polarityOf(turnFacts.feelings);
    lines.push(`In this message the person said: ${turnFacts.feelings.map((f) => `"${f.term}"${f.negated ? ' (negated)' : ''} = ${label(f.polarity)}`).join(', ')}${p ? ` — overall ${label(p)}` : ''}. Keep their meaning and any negation; never describe it as the opposite. If you are not sure what they meant, ask one short clarifying question instead of guessing.`);
  } else if (ledger.length) {
    const line = factsLine(ledger);
    if (line) lines.push(`Earlier in this session the person said — ${line}. Don't contradict it.`);
  }
  if (afterChange && comparison) lines.push(comparisonNote(comparison));
  if (afterChange) lines.push('Set comparison_claim to "change_described" if response_text describes a visual change, "no_change" if it says there is none, "uncertain" if it asks what changed, otherwise "none".');
  if (correction?.text) lines.push(`Correction: the person did not see your previous draft. What they actually saw from you was: «${correction.text.slice(0, 600)}». Continue from that.`);
  if (closingLikely) {
    const line = factsLine(ledger);
    lines.push(`If you close the session now, session_summary may contain only what the person said or chose, their own interpretations, and the image comparison as stated above — nothing invented, no diagnosis, no claim of improvement they didn't make.${line ? ` Verified from their words: ${line}.` : ''}${comparison?.state && afterChange ? ` Image comparison: ${comparison.state.replace(/_/g, ' ')}.` : ''}`);
  }
  return lines.join('\n');
}

const CORRECT = {
  contradiction: (p) => `Your draft described the person's feeling as ${p.user < 0 ? 'pleasant or positive' : 'unpleasant or negative'}, but they said it was ${p.user < 0 ? 'unpleasant' : 'pleasant'}. Rewrite response_text so it matches what they said, or ask one short clarifying question.`,
  visual_claim: (p) => `Your draft described a change in the drawing, but the app's image comparison found: ${String(p.state).replace(/_/g, ' ')}. Do not describe any change; follow the IMAGE COMPARISON instruction.`,
  clinical: () => 'Your draft used diagnostic or clinical labels. Remove them; describe only what the person said, in everyday words.',
  summary: (codes) => `Your session_summary contained statements that the conversation doesn't support (${codes.join(', ')}). Rewrite session_summary using only the verified facts above and the person's own words.`,
  json: () => 'Your previous answer was not one complete JSON object (or it was cut off). Return only the JSON object with every key of the schema; keep response_text short.',
};

export function createArtTurns({ db, config, fetchImpl, clock = { now: () => Date.now() } }) {
  const settings = () => artSettings(config);

  async function loadRun(accountId, session, runId) {
    const r = await db.query('select facts, comparison, correction from art_runs where account_id = $1 and art_session = $2 and run_id = $3', [accountId, session, runId]);
    const fp = await db.query('select kind, count(*)::int as n from art_image_fingerprints where account_id = $1 and art_session = $2 and run_id = $3 group by kind', [accountId, session, runId]);
    const counts = Object.fromEntries(fp.rows.map((x) => [x.kind, x.n]));
    return { facts: r.rows[0]?.facts || [], comparison: r.rows[0]?.comparison || null, correction: r.rows[0]?.correction || null, v1: counts.image_v1 || 0, v2: counts.image_v2 || 0 };
  }

  async function saveRun(accountId, session, runId, { facts, comparison, correction }) {
    await db.query(
      `insert into art_runs (account_id, art_session, run_id, facts, comparison, correction, updated_at) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
       on conflict (account_id, art_session, run_id) do update set facts = excluded.facts, comparison = excluded.comparison, correction = excluded.correction, updated_at = excluded.updated_at`,
      [accountId, session, runId, JSON.stringify(facts.slice(-MAX_FACTS)), comparison ? JSON.stringify(comparison) : null, correction ? JSON.stringify(correction) : null, ts(clock.now())]
    );
  }

  /** One upstream call. Returns { ok, status, data, text, usage, ms } or an upstream error. */
  async function call(body) {
    const started = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), settings().timeoutMs);
    try {
      const res = await fetchImpl(`${config.openai.baseUrl}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.openai.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, status: res.status, errorText: text, ms: Date.now() - started };
      }
      const data = await res.json();
      const text = typeof data.output_text === 'string' && data.output_text ? data.output_text : (data.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('');
      const incomplete = data.status === 'incomplete';
      return { ok: true, data, text, usage: data.usage, incomplete, ms: Date.now() - started };
    } catch (e) {
      return { ok: false, status: 0, errorText: e?.name === 'AbortError' ? 'timeout' : 'unreachable', ms: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Runs a checked turn. `clean` is the request the AI proxy built (server
   * instructions, validated input). Returns { status, error?, final, id,
   * usage, report } — report lists what was fixed (codes only).
   */
  async function run({ accountId, artSessionId, runIdHeader, headers = {}, clean }) {
    const s = settings();
    const session = Number(artSessionId) || 0;
    const runId = /^[A-Za-z0-9_-]{1,64}$/.test(String(runIdHeader || '')) ? String(runIdHeader) : 'legacy';
    const turn = readTurn(clean.input, headers);
    const runState = await loadRun(accountId, session, runId);
    const now = clock.now();
    let comparison = runState.comparison;

    // 2. Fingerprints and the comparison (first image of a run replaces the old one).
    if (turn.upload && turn.images[0]) {
      const fp = fingerprint(turn.images[0].image_url);
      await db.query('insert into art_image_fingerprints (account_id, art_session, run_id, kind, fingerprint) values ($1, $2, $3, $4, $5::jsonb)', [accountId, session, runId, turn.upload, JSON.stringify(fp)]);
      if (turn.upload === 'image_v1') comparison = null;
      else {
        const first = await db.query("select fingerprint from art_image_fingerprints where account_id = $1 and art_session = $2 and run_id = $3 and kind = 'image_v1' order by id desc limit 1", [accountId, session, runId]);
        comparison = { ...compareFingerprints(first.rows[0]?.fingerprint || null, fp), at: now };
      }
    }
    const hasV2 = turn.upload === 'image_v2' || runState.v2 > 0;
    // Sessions that began before fingerprints existed: unknown, not "no".
    const hasSecondImage = hasV2 ? true : runState.v1 > 0 || turn.upload === 'image_v1' ? false : null;

    // 3. Facts from the person's words (this turn, plus earlier turns on a full resend).
    const turnFacts = extractFacts(turn.words);
    const earlier = runState.facts.length ? [] : turn.earlierWords.flatMap((w) => compact(extractFacts(w), now));
    const ledger = [...runState.facts, ...earlier, ...compact(turnFacts, now)].slice(-MAX_FACTS);
    const userUsedClinical = [turn.words, ...turn.earlierWords].some((w) => clinicalClaims(w).length);
    const closingLikely = turn.endRequested || turn.endIntent || turn.phase === 2;
    const correction = runState.correction && clean.previous_response_id === runState.correction.responseId ? runState.correction : null;
    const note = buildNote({ turn, ledger, turnFacts, comparison, afterChange: hasV2, correction, closingLikely });

    const ctx = {
      phase: turn.phase,
      upload: turn.upload,
      hasSecondImage,
      endRequested: turn.endRequested,
      endIntent: turn.endIntent,
      language: turn.language,
      userFacts: turnFacts.feelings,
      recentFacts: asFeelings(ledger),
      sessionFacts: asFeelings(ledger),
      comparison: hasV2 ? comparison : null,
      userUsedClinical,
    };

    // 4. Ask, check, correct.
    const input = Array.isArray(clean.input) ? [...clean.input] : [{ role: 'user', content: String(clean.input || '') }];
    const lastUser = input.map((i) => i?.role).lastIndexOf('user');
    const base = {
      model: s.model,
      instructions: clean.instructions,
      reasoning: s.reasoning === 'default' ? undefined : { effort: s.reasoning },
      max_output_tokens: s.maxOutputTokens,
      text: { format: { type: 'json_object' } },
      store: s.store,
      ...(clean.previous_response_id && s.store ? { previous_response_id: clean.previous_response_id } : {}),
    };
    const withNote = (extra) => {
      const items = [...input];
      items.splice(lastUser < 0 ? 0 : lastUser, 0, { role: 'developer', content: extra ? `${note}\n${extra}` : note });
      return { ...base, input: items };
    };

    const report = { calls: 0, retries: [], fixes: [], problems: [], comparison: hasV2 ? comparison?.state || null : null, ms: 0, usage: { input_tokens: 0, output_tokens: 0 } };
    let last = null;
    let value = null;
    let extra = '';
    for (let attempt = 0; attempt < MAX_CALLS; attempt += 1) {
      const body = withNote(extra);
      if (attempt > 0 && last?.incomplete) body.max_output_tokens = Math.min(32000, Math.round(s.maxOutputTokens * 1.6));
      let r = await call(body);
      // The art model isn't available to this OpenAI project: the fallback model, once.
      if (!r.ok && [400, 403, 404].includes(r.status) && /model/i.test(r.errorText || '') && s.fallbackModel && body.model !== s.fallbackModel) {
        report.fallbackModel = s.fallbackModel;
        base.model = s.fallbackModel;
        r = await call({ ...body, model: s.fallbackModel });
      }
      report.calls += 1;
      report.ms += r.ms;
      if (!r.ok) {
        await recordAiUsage(db, { accountId, feature: 'art', model: base.model, status: 'error', errorCode: r.errorText === 'timeout' ? 'timeout' : `upstream_${r.status}`, latencyMs: r.ms });
        if (value) break; // keep the best reply we already have
        const stale = /previous[_ ]response/i.test(r.errorText || '') || (r.status === 404 && /not found/i.test(r.errorText || ''));
        return { status: stale ? 409 : r.status === 0 ? 502 : r.status >= 500 ? 502 : 400, error: stale ? 'stale_previous_response' : r.status === 0 ? 'ai_upstream_unreachable' : 'ai_upstream_error', report };
      }
      report.usage.input_tokens += Number(r.usage?.input_tokens || 0);
      report.usage.output_tokens += Number(r.usage?.output_tokens || 0);
      last = r;
      const parsed = parseModelJson(r.text);
      if (!parsed.ok) {
        report.problems.push(r.incomplete ? 'incomplete' : parsed.error);
        extra = CORRECT.json();
        report.retries.push('json');
        continue;
      }
      const state = normalizeState(parsed.value, ctx);
      report.fixes.push(...state.fixes);
      const problems = checkContent(state.value, ctx);
      let summaryCodes = [];
      if (state.value.session_complete) summaryCodes = cleanSummary(state.value.session_summary, ctx).removed;
      value = { candidate: state.value, problems, summaryCodes, id: r.data?.id };
      if (!problems.length && !summaryCodes.length) break;
      report.problems.push(...problems.map((p) => p.code), ...summaryCodes.map((c) => `summary_${c}`));
      if (attempt === MAX_CALLS - 1) break;
      extra = [...problems.map((p) => CORRECT[p.code](p)), ...(summaryCodes.length ? [CORRECT.summary([...new Set(summaryCodes)])] : [])].join('\n');
      report.retries.push(...problems.map((p) => p.code), ...(summaryCodes.length ? ['summary'] : []));
    }

    // Still nothing usable: a short honest reply in the same phase.
    let final;
    let replaced = false;
    if (!value) {
      final = fallbackReply(normalizeState({ response_text: '', session_phase: turn.phase ?? 0 }, ctx).value, [], ctx);
      final.response_text = artText(turn.language, 'retry');
      replaced = true;
    } else {
      final = value.candidate;
      if (value.problems.length) {
        final = fallbackReply(final, value.problems, ctx);
        replaced = true;
        report.fixes.push(...value.problems.map((p) => `fallback_${p.code}`));
      }
      if (final.session_complete) {
        const cleaned = cleanSummary(final.session_summary, ctx);
        if (cleaned.text !== final.session_summary) report.fixes.push('summary_cleaned');
        final.session_summary = cleaned.text;
      }
    }
    delete final.comparison_claim;

    const id = s.store ? last?.data?.id || value?.id : undefined;
    const nextCorrection = replaced && id ? { responseId: id, text: final.response_text } : null;
    await saveRun(accountId, session, runId, { facts: ledger, comparison: hasV2 ? comparison : null, correction: nextCorrection });
    await recordAiUsage(db, { accountId, feature: 'art', model: base.model, usage: report.usage, latencyMs: report.ms, errorCode: [...new Set([...report.problems, ...report.fixes.filter((f) => f.startsWith('fallback') || f === 'summary_cleaned')])].join(',').slice(0, 120) || null });
    return { status: 200, final, id, usage: report.usage, report };
  }

  /** Express handler part: runs the turn and answers in the shape the app reads. */
  async function handle(req, res, clean, { rememberResponse }) {
    const headers = { phase: req.get('x-behappy-art-phase'), upload: req.get('x-behappy-art-upload'), language: req.get('x-behappy-art-lang') };
    const out = await run({ accountId: req.account.id, artSessionId: req.aiContext?.artSessionId, runIdHeader: req.get('x-behappy-art-run'), headers, clean });
    if (out.status !== 200) {
      return res.status(out.status).json({ error: out.error, message: out.error === 'stale_previous_response' ? 'previous_response_id not found' : 'The AI service returned an error.' });
    }
    if (out.id) await rememberResponse(out.id, req.account.id);
    const json = JSON.stringify(out.final);
    const response = { id: out.id, object: 'response', status: 'completed', model: artSettings(config).model, output_text: json, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: json }] }], usage: out.usage };
    if (!clean.stream) return res.json(response);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const send = (evt) => res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
    send({ type: 'response.created', response: { id: out.id, status: 'in_progress' } });
    send({ type: 'response.output_text.delta', delta: json });
    send({ type: 'response.output_text.done', text: json });
    send({ type: 'response.completed', response });
    res.end();
  }

  return { run, handle };
}
