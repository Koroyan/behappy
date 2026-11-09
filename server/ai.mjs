// OpenAI proxy. The client never sees the API key.
//
// Every request is: authenticated (account token) → validated against an
// allowlist (features, models, field names, size caps) → metered by quota.mjs
// → forwarded with the server's key and the server's own instructions
// (server/prompts/). Conversation chains (previous_response_id) are bound to
// the account that created them, so one user can't continue another user's
// conversation.

import express from 'express';
import { callCostUsd, RESERVE_USD, speechCostUsd, transcribeCostUsd } from './aiPricing.mjs';
import { createArtTurns } from './art/turn.mjs';
import { cleanReflectionInput, createReflection } from './reflection/run.mjs';
import { requireAccount } from './auth.mjs';
import { entitlementsForAccount } from './entitlements.mjs';
import { CHAT_PREAMBLE, CHAT_PROMPTS, LEGACY_PROMPT_IDS, SERVER_PROMPTS } from './prompts/index.mjs';
import { checkAndRecord, releaseReservation, spentUsd } from './quota.mjs';
import { createLimiter } from './rateLimit.mjs';

// The server decides which model each feature uses (config.ai.models overrides);
// a model a client names is ignored.
const DEFAULT_MODELS = { anulia: 'gpt-5.4-mini', art: 'gpt-6.1-sol', cards: 'gpt-5.4-mini', journal: 'gpt-4.1-mini', summary: 'gpt-5.4-mini', motivation: 'gpt-4.1-mini' };
// Reasoning models: the server sets their output budget and effort (the client can't).
const REASONING_CHAT_MODELS = new Set(['gpt-5.4-mini', 'gpt-5.4', 'gpt-6.1-sol', 'gpt-6.1-terra']);
// `prompt` is still accepted from app builds before 3.0, then replaced (see below).
const RESPONSES_FIELDS = new Set(['input', 'prompt', 'model', 'max_output_tokens', 'stream', 'store', 'previous_response_id', 'text', 'temperature']);
// `model` is still accepted from older app builds and ignored; `language` names the reply language.
const CHAT_FIELDS = new Set(['model', 'messages', 'max_tokens', 'temperature', 'response_format', 'language']);
const VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);
const FEATURES = new Set(['anulia', 'art', 'cards', 'journal', 'summary', 'motivation', 'transcribe', 'speech', 'reflection']);

const MAX_OUTPUT_TOKENS = 2048;
const MAX_CHAT_TOKENS = 2000;
const MAX_TTS_CHARS = 2000;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

const bad = (res, status, error, message) => res.status(status).json({ error, message });

const PART_TYPES = new Set(['input_text', 'input_image', 'output_text']);
/** A user or assistant message whose content is text or text/image parts. */
export function isConversationTurn(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (item.role !== 'user' && item.role !== 'assistant') return false;
  if (Object.keys(item).some((k) => !['role', 'content', 'type'].includes(k))) return false;
  if (item.type !== undefined && item.type !== 'message') return false;
  if (typeof item.content === 'string') return true;
  return Array.isArray(item.content) && item.content.every((p) => p && typeof p === 'object' && PART_TYPES.has(p.type));
}

/**
 * Chat-completions messages from clients: user and assistant turns only. A
 * client's `system` messages (older app builds sent their own instructions)
 * are dropped — the server's instructions replace them; any other role
 * (`developer`, `tool`, ...) refuses the request.
 */
export function cleanChatMessages(messages) {
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !(typeof m.content === 'string' || Array.isArray(m.content))) return null;
    if (m.role === 'system') continue;
    if (m.role !== 'user' && m.role !== 'assistant') return null;
    if (Array.isArray(m.content) && !m.content.every((p) => p && typeof p === 'object' && ['text', 'image_url'].includes(p.type))) return null;
    out.push({ role: m.role, content: m.content });
  }
  return out.length ? out : null;
}

const LANGUAGE = /^[A-Za-z][A-Za-z ()-]{1,38}$/;

function readContext(req) {
  return {
    feature: String(req.get('x-behappy-feature') || '').toLowerCase(),
    conversationId: req.get('x-behappy-conversation') || '',
    artSessionId: req.get('x-behappy-art-session') || '',
  };
}

/** Token counts reported by OpenAI (Responses or Chat Completions shape), with cached input. */
export function readUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
  const cached = Number(usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0) || 0;
  return input || output ? { input, output, cached: Math.min(cached, input) } : null;
}

/**
 * Token counts from a Responses stream: `usage` of the final response.completed
 * (or .incomplete) event. Reading the first "input_tokens" in the text picked up
 * OpenAI's `tool_usage.image_gen.input_tokens: 0`, so every streamed Anulia
 * reply was recorded with 0 tokens (no cost, invisible to the daily budget).
 */
export function streamUsage() {
  let pending = '';
  let usage = null;
  const frame = (raw) => {
    if (!raw.includes('"response.completed"') && !raw.includes('"response.incomplete"')) return;
    const data = raw
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('\n');
    try {
      const evt = JSON.parse(data);
      if (evt?.response?.usage) usage = evt.response.usage;
    } catch {
      // not JSON: ignore
    }
  };
  return {
    push(text) {
      pending += text.replace(/\r\n/g, '\n');
      let i = pending.indexOf('\n\n');
      while (i >= 0) {
        frame(pending.slice(0, i));
        pending = pending.slice(i + 2);
        i = pending.indexOf('\n\n');
      }
      // A frame without an end yet: keep it, but never more than 2 MB.
      if (pending.length > 2_000_000) pending = '';
    },
    result() {
      if (pending.trim()) frame(pending);
      pending = '';
      return usage;
    },
  };
}

/**
 * Records token counts, the cost in USD, outcome and latency (never content)
 * for the admin AI report, the allowances and the budgets. `costUsd` replaces
 * the token-based cost where tokens aren't reported (speech, transcription) or
 * a call failed after the provider may already have billed it (a timeout).
 * `reservationId` releases the request's reservation in the same step.
 */
export async function recordAiUsage(db, { accountId, feature, model, usage, latencyMs = null, status = 'ok', errorCode = null, costUsd = null, reservationId = null }) {
  const u = readUsage(usage) || { input: 0, output: 0, cached: 0 };
  const cost = costUsd !== null ? costUsd : callCostUsd({ model, input: u.input, output: u.output, cached: u.cached });
  try {
    await db.query('insert into ai_usage (account_id, feature, model, input_tokens, output_tokens, cached_tokens, cost_usd, status, latency_ms, error_code) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
      accountId || null,
      feature,
      model,
      u.input,
      u.output,
      u.cached || 0,
      Math.round(cost * 1e6) / 1e6,
      status,
      latencyMs === null ? null : Math.round(latencyMs),
      errorCode,
    ]);
  } catch {
    // Cost reporting must never break a reply.
  }
  if (reservationId) await releaseReservation(db, reservationId);
}

// Which staff switch (settings ai.features) covers each request feature.
const SWITCH_FOR = { anulia: 'anulia', summary: 'anulia', motivation: 'anulia', transcribe: 'anulia', speech: 'anulia', reflection: 'anulia', journal: 'journal', cards: 'cards', art: 'art', community: 'community' };

/**
 * Staff controls: a feature switched off, or today's estimated spend at the
 * daily budget, answers 503 before anything reaches the AI provider. Safety
 * resources never depend on AI.
 */
/** Today's AI spend in USD (UTC day), in total and per feature, from recorded costs (reservations included). */
export async function spendToday(db, now = Date.now()) {
  const start = new Date(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z');
  const s = await spentUsd(db, "created_at >= $1 and status in ('ok', 'error', 'reserved')", [start]);
  return { total: s.total, byFeature: s.byFeature };
}

export function createAiControls({ db, settings, clock = { now: () => Date.now() } }) {
  let cache = { at: 0, spend: { total: 0, byFeature: {} } };
  async function spent() {
    const now = clock.now();
    // Short cache: budgets are checked on every request across instances.
    if (now - cache.at < 15 * 1000) return cache.spend;
    cache = { at: now, spend: await spendToday(db, now) };
    return cache.spend;
  }
  /** null when allowed, otherwise the refusal code. */
  return async function check(feature) {
    if (!settings) return null;
    const switches = await settings.get('ai.features');
    const key = SWITCH_FOR[feature];
    if (switches && key && switches[key] === false) return 'ai_paused';
    const budget = Number(await settings.get('ai.dailyBudgetUsd')) || 0;
    const featureBudgets = (await settings.get('ai.featureBudgetsUsd')) || {};
    if (!budget && !Object.keys(featureBudgets).length) return null;
    const s = await spent();
    // Cost-based: the next request's worst case must still fit.
    const next = RESERVE_USD[feature] ?? 0.05;
    if (budget && s.total + next > budget) return 'ai_budget_reached';
    const fb = Number(featureBudgets[feature]) || 0;
    if (fb && (s.byFeature[feature] || 0) + next > fb) return 'ai_budget_reached';
    return null;
  };
}

export function createAiRouter({ db, config, fetchImpl = globalThis.fetch, clock = { now: () => Date.now() }, settings = null }) {
  const router = express.Router();
  // Shared by every server instance (table rate_counters).
  const perAccount = createLimiter(db, { name: 'ai-account', limit: 40, windowMs: 60 * 1000 });
  const globalDaily = createLimiter(db, { name: 'ai-global', limit: config.openai.globalDailyRequestCap, windowMs: 24 * 60 * 60 * 1000 });
  const controls = createAiControls({ db, settings, clock });
  const artTurns = createArtTurns({ db, config, fetchImpl, clock });
  const reflection = createReflection({ config, fetchImpl });

  const openaiHeaders = (extra = {}) => ({ Authorization: `Bearer ${config.openai.apiKey}`, ...extra });

  // Shared guard: auth, configured key, feature, rate limit, global cap, quota.
  const guard = (expectedFeatures) => [
    requireAccount(db, { clock }),
    async (req, res, next) => {
      if (!config.openai.apiKey) return bad(res, 503, 'ai_unavailable', 'AI is not configured on the server.');
      const ctx = readContext(req);
      if (!FEATURES.has(ctx.feature) || (expectedFeatures && !expectedFeatures.includes(ctx.feature))) {
        return bad(res, 400, 'bad_feature', 'Unknown or missing X-BeHappy-Feature header.');
      }
      if (!(await perAccount.allow(req.account.id, clock.now()))) return bad(res, 429, 'rate_limited', 'Too many requests. Please slow down.');
      if ((await globalDaily.count('all', clock.now())) >= config.openai.globalDailyRequestCap) {
        return bad(res, 503, 'ai_busy', 'AI is temporarily unavailable. Please try again later.');
      }
      try {
        const refused = await controls(ctx.feature);
        if (refused) return bad(res, 503, refused, refused === 'ai_paused' ? 'This AI feature is paused for now.' : 'AI features are paused for the rest of the day.');
      } catch {
        // If the controls can't be read, fall through: the other limits still apply.
      }
      req.aiContext = ctx;
      req.aiStartedAt = Date.now();
      next();
    },
  ];

  const meter = async (req, res) => {
    const now = clock.now();
    const entitlements = await entitlementsForAccount(db, req.account.id, now);
    const decision = await checkAndRecord({ db, accountId: req.account.id, entitlements, ctx: req.aiContext, now });
    if (!decision.allowed) {
      res.status(decision.status || 402).json(decision);
      return null;
    }
    await globalDaily.allow('all', clock.now());
    req.reservationId = decision.reservationId || null;
    // A path that ends without recording (a client gone mid-stream) still releases it.
    if (req.reservationId) res.on('close', () => setTimeout(() => releaseReservation(db, req.reservationId), 30 * 1000).unref?.());
    res.setHeader('X-BeHappy-Tier', decision.tier || 'free');
    if (decision.remaining !== undefined) res.setHeader('X-BeHappy-Remaining', String(decision.remaining));
    if (decision.grace) res.setHeader('X-BeHappy-Grace', String(decision.graceLeft ?? 0));
    return decision;
  };

  const rememberResponse = async (id, accountId) => {
    if (typeof id !== 'string' || !id.startsWith('resp_')) return;
    await db.query('insert into ai_response_owners (response_id, account_id) values ($1, $2) on conflict (response_id) do nothing', [id, accountId]);
  };

  // ---------- Responses API (hosted prompts) ----------
  router.post('/responses', ...guard(['anulia', 'art', 'cards']), async (req, res) => {
    const body = req.body || {};
    for (const key of Object.keys(body)) {
      if (!RESPONSES_FIELDS.has(key)) return bad(res, 400, 'bad_field', `Field "${key}" is not allowed.`);
    }
    const feature = req.aiContext.feature;
    // Older app builds name the hosted prompt they were written for. Only the
    // matching id is accepted, and it is never forwarded: the server's own
    // instructions replace it.
    if (body.prompt !== undefined && (typeof body.prompt !== 'object' || body.prompt === null || body.prompt.id !== LEGACY_PROMPT_IDS[feature])) {
      return bad(res, 400, 'bad_prompt', 'This prompt is not allowed for this feature.');
    }
    if (body.text !== undefined && !(body.text && typeof body.text === 'object' && ['json_object', 'text'].includes(body.text?.format?.type) && Object.keys(body.text).every((k) => k === 'format'))) {
      return bad(res, 400, 'bad_text_format', 'Only plain text or JSON object output is allowed.');
    }
    if (!Array.isArray(body.input) && typeof body.input !== 'string') {
      return bad(res, 400, 'bad_input', 'input must be a string or an array of messages.');
    }
    // Clients send only conversation turns. System/developer messages, tool
    // calls and other item types would let a client add its own instructions.
    if (Array.isArray(body.input) && !body.input.every(isConversationTurn)) {
      return bad(res, 400, 'bad_input', 'input may contain only user and assistant messages.');
    }
    if (body.previous_response_id !== undefined) {
      const r = await db.query('select account_id from ai_response_owners where response_id = $1', [String(body.previous_response_id)]);
      if (r.rows[0]?.account_id !== req.account.id) {
        // Not ours (or expired from our records): treat as stale so the client
        // resends full context instead of continuing someone else's chain.
        return bad(res, 409, 'stale_previous_response', 'previous_response_id not found');
      }
    }
    // Art without OpenAI storage (AI_ART_STORE=false): there is no chain to
    // continue, so the app is told to resend its own history (before metering).
    if (feature === 'art' && config.ai?.art?.store === false && body.previous_response_id !== undefined) {
      return bad(res, 409, 'stale_previous_response', 'previous_response_id not found');
    }
    const serverPrompt = SERVER_PROMPTS[feature];
    const { prompt: _ignoredPrompt, model: _ignoredModel, ...rest } = body;
    const clean = {
      ...rest,
      model: config.ai?.models?.[feature] || DEFAULT_MODELS[feature],
      instructions: serverPrompt.instructions,
      reasoning: serverPrompt.reasoning,
      max_output_tokens: Math.min(Number(body.max_output_tokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    };

    if (!(await meter(req, res))) return;

    // Art reflection: every reply is checked before the person sees it
    // (image comparison, their own words, the three-phase state, summaries).
    if (feature === 'art') {
      try {
        return await artTurns.handle(req, res, clean, { rememberResponse });
      } catch (e) {
        console.error('[art] turn failed', e?.message);
        if (!res.headersSent) return bad(res, 502, 'ai_upstream_error', 'The AI service returned an error.');
        return res.end();
      } finally {
        // Art records each call's real cost itself; the reservation ends with the turn.
        await releaseReservation(db, req.reservationId);
      }
    }

    let upstream;
    try {
      upstream = await fetchImpl(`${config.openai.baseUrl}/responses`, {
        method: 'POST',
        headers: openaiHeaders({ 'Content-Type': 'application/json', Accept: clean.stream ? 'text/event-stream' : 'application/json' }),
        body: JSON.stringify(clean),
      });
    } catch {
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, status: 'error', errorCode: 'unreachable', latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      return bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }

    if (!upstream.ok) {
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, status: 'error', errorCode: `upstream_${upstream.status}`, latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      const text = await upstream.text().catch(() => '');
      if (upstream.status === 429) {
        if (/insufficient_quota|credit_balance/i.test(text)) console.warn('[ai] OpenAI reports no credits left (insufficient_quota): AI features are unavailable until credits are added.');
        return bad(res, 503, 'ai_unavailable', 'AI is temporarily unavailable. Please try again later.');
      }
      const stale = /previous[_ ]response/i.test(text) || (/not found/i.test(text) && upstream.status === 404);
      return res.status(stale ? 409 : upstream.status >= 500 ? 502 : 400).json({
        error: stale ? 'stale_previous_response' : 'ai_upstream_error',
        message: stale ? 'previous_response_id not found' : 'The AI service returned an error.',
        upstreamStatus: upstream.status,
      });
    }

    if (!clean.stream) {
      const data = await upstream.json();
      await rememberResponse(data?.id, req.account.id);
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, usage: data?.usage, latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      return res.json(data);
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let head = '';
    let captured = false;
    const usage = streamUsage();
    try {
      for await (const chunk of upstream.body) {
        const text = Buffer.from(chunk).toString('utf8');
        if (!captured) {
          head += text;
          const m = head.match(/"id"\s*:\s*"(resp_[A-Za-z0-9_-]+)"/);
          if (m) {
            await rememberResponse(m[1], req.account.id);
            captured = true;
            head = '';
          } else if (head.length > 16384) {
            captured = true;
            head = '';
          }
        }
        usage.push(text);
        res.write(chunk);
      }
    } catch {
      // Client or upstream disconnected; nothing else to do.
    }
    // Recorded before the stream ends, so the next request sees this cost.
    const finalUsage = usage.result();
    await recordAiUsage(db, {
      accountId: req.account.id,
      feature,
      model: clean.model,
      usage: finalUsage,
      latencyMs: Date.now() - req.aiStartedAt,
      // A stream cut before OpenAI reported usage may still be billed: count the reservation.
      ...(finalUsage ? {} : { status: 'error', errorCode: 'stream_no_usage', costUsd: RESERVE_USD[feature] ?? 0.05 }),
      reservationId: req.reservationId,
    });
    res.end();
  });

  // ---------- Chat Completions (vision turns, summaries, journal, motivation) ----------
  router.post('/chat', ...guard(['anulia', 'summary', 'journal', 'motivation']), async (req, res) => {
    const body = req.body || {};
    for (const key of Object.keys(body)) {
      if (!CHAT_FIELDS.has(key)) return bad(res, 400, 'bad_field', `Field "${key}" is not allowed.`);
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 60) {
      return bad(res, 400, 'bad_messages', 'messages must be a non-empty array of at most 60 items.');
    }
    const messages = cleanChatMessages(body.messages);
    if (!messages) return bad(res, 400, 'bad_messages', 'messages may contain only user and assistant turns.');
    if (body.response_format !== undefined && !(body.response_format && ['json_object', 'text'].includes(body.response_format.type) && Object.keys(body.response_format).length === 1)) {
      return bad(res, 400, 'bad_response_format', 'Only text or JSON object output is allowed.');
    }
    const feature = req.aiContext.feature;
    const language = typeof body.language === 'string' && LANGUAGE.test(body.language) ? body.language : 'English';
    // The server chooses the model and writes every instruction.
    const model = config.ai?.models?.[feature] || DEFAULT_MODELS[feature];
    const reasoning = REASONING_CHAT_MODELS.has(model);
    const outputCap = Math.min(Number(body.max_tokens) || 800, MAX_CHAT_TOKENS);
    const instructions = `${CHAT_PREAMBLE}\n\n${CHAT_PROMPTS[feature] ? CHAT_PROMPTS[feature](language) : ''}`.trim();
    const clean = {
      model,
      messages: [{ role: 'system', content: instructions }, ...messages],
      // GPT-5 models take max_completion_tokens (reasoning counts toward it) and no temperature.
      ...(reasoning
        ? { max_completion_tokens: outputCap + 1500, reasoning_effort: 'low' }
        : { max_tokens: outputCap, ...(body.temperature !== undefined ? { temperature: Math.max(0, Math.min(1.2, Number(body.temperature) || 0.7)) } : {}) }),
      ...(body.response_format ? { response_format: body.response_format } : {}),
    };

    if (!(await meter(req, res))) return;

    try {
      const upstream = await fetchImpl(`${config.openai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: openaiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(clean),
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, status: 'error', errorCode: `upstream_${upstream.status}`, latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
        return res.status(upstream.status >= 500 ? 502 : 400).json({ error: 'ai_upstream_error', message: 'The AI service returned an error.', upstreamStatus: upstream.status });
      }
      let usage = null;
      try {
        usage = JSON.parse(text)?.usage || null;
      } catch {
        // not JSON
      }
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, usage, latencyMs: Date.now() - req.aiStartedAt, ...(usage ? {} : { status: 'error', errorCode: 'no_usage', costUsd: RESERVE_USD[feature] ?? 0.02 }), reservationId: req.reservationId });
      res.type('application/json').send(text);
    } catch {
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, status: 'error', errorCode: 'unreachable', latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  // ---------- Speech-to-text ----------
  // ---------- Daily reflection (facts in, checked text out) ----------
  router.post('/reflection', ...guard(['reflection']), async (req, res) => {
    const cleaned = cleanReflectionInput(req.body);
    if (cleaned.error) return bad(res, 400, cleaned.error, 'Invalid reflection request.');
    // Nothing to reflect on: the app shows its factual recap (no AI call, no allowance used).
    if (!cleaned.input.facts.length) return res.status(422).json({ error: 'no_facts', fallback: 'facts' });
    if (!(await meter(req, res))) return;
    try {
      const r = await reflection.run(cleaned.input);
      await recordAiUsage(db, { accountId: req.account.id, feature: 'reflection', model: r.model, usage: r.usage, latencyMs: Date.now() - req.aiStartedAt, status: r.status === 200 ? 'ok' : 'error', errorCode: r.status === 200 ? null : r.body.error, reservationId: req.reservationId });
      res.status(r.status).json(r.body);
    } catch {
      await recordAiUsage(db, { accountId: req.account.id, feature: 'reflection', model: config.ai?.models?.reflection || 'gpt-5.4-mini', status: 'error', errorCode: 'unreachable', reservationId: req.reservationId });
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  router.post('/transcribe', ...guard(['transcribe']), async (req, res) => {
    const { audioBase64, mimeType = 'audio/m4a', fileName = 'audio.m4a', language } = req.body || {};
    if (typeof audioBase64 !== 'string' || audioBase64.length < 100) return bad(res, 400, 'bad_audio', 'audioBase64 is required.');
    const bytes = Buffer.from(audioBase64.replace(/^data:[^,]+,/, ''), 'base64');
    if (bytes.length > MAX_AUDIO_BYTES) return bad(res, 413, 'audio_too_large', 'Audio is too large.');
    if (!/^audio\/[a-z0-9.+-]+$/i.test(String(mimeType).split(';')[0])) return bad(res, 400, 'bad_mime', 'Unsupported audio type.');

    if (!(await meter(req, res))) return;

    try {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: String(mimeType).split(';')[0] }), String(fileName).replace(/[^A-Za-z0-9._-]/g, '') || 'audio.m4a');
      form.append('model', 'gpt-4o-mini-transcribe');
      form.append('response_format', 'text');
      if (typeof language === 'string' && /^[a-z]{2}$/.test(language)) form.append('language', language);
      const upstream = await fetchImpl(`${config.openai.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: openaiHeaders(),
        body: form,
      });
      const text = await upstream.text();
      // Transcription returns no token counts here: its cost is estimated from the audio size.
      await recordAiUsage(db, { accountId: req.account.id, feature: 'transcribe', model: 'gpt-4o-mini-transcribe', costUsd: upstream.ok ? transcribeCostUsd(bytes.length) : 0, status: upstream.ok ? 'ok' : 'error', errorCode: upstream.ok ? null : `upstream_${upstream.status}`, latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      if (!upstream.ok) return res.status(502).json({ error: 'ai_upstream_error', upstreamStatus: upstream.status });
      res.json({ text: text.trim() });
    } catch {
      await recordAiUsage(db, { accountId: req.account.id, feature: 'transcribe', model: 'gpt-4o-mini-transcribe', costUsd: 0, status: 'error', errorCode: 'unreachable', reservationId: req.reservationId });
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  // ---------- Text-to-speech ----------
  router.post('/speech', ...guard(['speech']), async (req, res) => {
    const { input, voice = 'marin' } = req.body || {};
    if (typeof input !== 'string' || !input.trim()) return bad(res, 400, 'bad_input', 'input is required.');
    if (input.length > MAX_TTS_CHARS) return bad(res, 413, 'input_too_long', `input must be at most ${MAX_TTS_CHARS} characters.`);
    if (!VOICES.has(voice)) return bad(res, 400, 'bad_voice', 'Voice not allowed.');

    if (!(await meter(req, res))) return;

    try {
      const upstream = await fetchImpl(`${config.openai.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: openaiHeaders({ 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
        body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input, format: 'mp3' }),
      });
      // Speech returns audio, not token counts: its cost is estimated from the text length.
      await recordAiUsage(db, { accountId: req.account.id, feature: 'speech', model: 'gpt-4o-mini-tts', costUsd: upstream.ok ? speechCostUsd(input.length) : 0, status: upstream.ok ? 'ok' : 'error', errorCode: upstream.ok ? null : `upstream_${upstream.status}`, latencyMs: Date.now() - req.aiStartedAt, reservationId: req.reservationId });
      if (!upstream.ok) return res.status(502).json({ error: 'ai_upstream_error', upstreamStatus: upstream.status });
      const audio = Buffer.from(await upstream.arrayBuffer());
      res.type('audio/mpeg').send(audio);
    } catch {
      await recordAiUsage(db, { accountId: req.account.id, feature: 'speech', model: 'gpt-4o-mini-tts', costUsd: 0, status: 'error', errorCode: 'unreachable', reservationId: req.reservationId });
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  return router;
}
