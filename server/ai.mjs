// OpenAI proxy. The client never sees the API key.
//
// Every request is: authenticated (account token) → validated against an
// allowlist (features, models, field names, size caps) → metered by quota.mjs
// → forwarded with the server's key and the server's own instructions
// (server/prompts/). Conversation chains (previous_response_id) are bound to
// the account that created them, so one user can't continue another user's
// conversation.

import express from 'express';
import { requireAccount } from './auth.mjs';
import { entitlementsForAccount } from './entitlements.mjs';
import { CHAT_PREAMBLE, LEGACY_PROMPT_IDS, SERVER_PROMPTS } from './prompts/index.mjs';
import { checkAndRecord } from './quota.mjs';

const DEFAULT_MODELS = { anulia: 'gpt-5.4-mini', art: 'gpt-5.4-mini', cards: 'gpt-5.4-mini' };
const CHAT_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']);
// `prompt` is still accepted from app builds before 3.0, then replaced (see below).
const RESPONSES_FIELDS = new Set(['input', 'prompt', 'model', 'max_output_tokens', 'stream', 'store', 'previous_response_id', 'text', 'temperature']);
const CHAT_FIELDS = new Set(['model', 'messages', 'max_tokens', 'temperature', 'response_format']);
const VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);
const FEATURES = new Set(['anulia', 'art', 'cards', 'journal', 'summary', 'motivation', 'transcribe', 'speech']);

const MAX_OUTPUT_TOKENS = 2048;
const MAX_CHAT_TOKENS = 2000;
const MAX_TTS_CHARS = 2000;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

class SlidingWindow {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  allow(key, now = Date.now()) {
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    return true;
  }
}

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

/** Chat-completions messages from clients: user/assistant/system text only (the server's preamble is prepended). */
function isChatMessage(m) {
  return m && typeof m === 'object' && ['system', 'user', 'assistant'].includes(m.role) && (typeof m.content === 'string' || Array.isArray(m.content));
}

function readContext(req) {
  return {
    feature: String(req.get('x-behappy-feature') || '').toLowerCase(),
    conversationId: req.get('x-behappy-conversation') || '',
    artSessionId: req.get('x-behappy-art-session') || '',
  };
}

/** Token counts reported by OpenAI (Responses or Chat Completions shape). */
export function readUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
  return input || output ? { input, output } : null;
}

/** Records token counts only (no content) for the admin cost report. */
export async function recordAiUsage(db, { accountId, feature, model, usage }) {
  const u = readUsage(usage);
  if (!u) return;
  try {
    await db.query('insert into ai_usage (account_id, feature, model, input_tokens, output_tokens) values ($1, $2, $3, $4, $5)', [accountId || null, feature, model, u.input, u.output]);
  } catch {
    // Cost reporting must never break a reply.
  }
}

export function createAiRouter({ db, config, fetchImpl = globalThis.fetch, clock = { now: () => Date.now() } }) {
  const router = express.Router();
  const perAccount = new SlidingWindow(40, 60 * 1000);
  let globalDay = '';
  let globalCount = 0;

  const openaiHeaders = (extra = {}) => ({ Authorization: `Bearer ${config.openai.apiKey}`, ...extra });

  // Shared guard: auth, configured key, feature, rate limit, global cap, quota.
  const guard = (expectedFeatures) => [
    requireAccount(db, { clock }),
    (req, res, next) => {
      if (!config.openai.apiKey) return bad(res, 503, 'ai_unavailable', 'AI is not configured on the server.');
      const ctx = readContext(req);
      if (!FEATURES.has(ctx.feature) || (expectedFeatures && !expectedFeatures.includes(ctx.feature))) {
        return bad(res, 400, 'bad_feature', 'Unknown or missing X-BeHappy-Feature header.');
      }
      if (!perAccount.allow(req.account.id)) return bad(res, 429, 'rate_limited', 'Too many requests. Please slow down.');
      const today = new Date().toISOString().slice(0, 10);
      if (today !== globalDay) {
        globalDay = today;
        globalCount = 0;
      }
      if (globalCount >= config.openai.globalDailyRequestCap) {
        return bad(res, 503, 'ai_busy', 'AI is temporarily unavailable. Please try again later.');
      }
      req.aiContext = ctx;
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
    globalCount += 1;
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

    let upstream;
    try {
      upstream = await fetchImpl(`${config.openai.baseUrl}/responses`, {
        method: 'POST',
        headers: openaiHeaders({ 'Content-Type': 'application/json', Accept: clean.stream ? 'text/event-stream' : 'application/json' }),
        body: JSON.stringify(clean),
      });
    } catch {
      return bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      const stale = /previous_response/i.test(text) || (/not found/i.test(text) && upstream.status === 404);
      return res.status(stale ? 409 : upstream.status >= 500 ? 502 : 400).json({
        error: stale ? 'stale_previous_response' : 'ai_upstream_error',
        message: stale ? 'previous_response_id not found' : 'The AI service returned an error.',
        upstreamStatus: upstream.status,
      });
    }

    if (!clean.stream) {
      const data = await upstream.json();
      await rememberResponse(data?.id, req.account.id);
      await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, usage: data?.usage });
      return res.json(data);
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let head = '';
    let tail = '';
    let captured = false;
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
        // The final "response.completed" event carries the token counts.
        tail = (tail + text).slice(-8192);
        res.write(chunk);
      }
    } catch {
      // Client or upstream disconnected; nothing else to do.
    }
    res.end();
    const inTok = tail.match(/"input_tokens"\s*:\s*(\d+)/);
    const outTok = tail.match(/"output_tokens"\s*:\s*(\d+)/);
    if (inTok || outTok) await recordAiUsage(db, { accountId: req.account.id, feature, model: clean.model, usage: { input_tokens: Number(inTok?.[1] || 0), output_tokens: Number(outTok?.[1] || 0) } });
  });

  // ---------- Chat Completions (vision turns, summaries, journal, motivation) ----------
  router.post('/chat', ...guard(['anulia', 'summary', 'journal', 'motivation']), async (req, res) => {
    const body = req.body || {};
    for (const key of Object.keys(body)) {
      if (!CHAT_FIELDS.has(key)) return bad(res, 400, 'bad_field', `Field "${key}" is not allowed.`);
    }
    if (!CHAT_MODELS.has(body.model)) return bad(res, 400, 'bad_model', 'Model not allowed.');
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 60) {
      return bad(res, 400, 'bad_messages', 'messages must be a non-empty array of at most 60 items.');
    }
    // The server's preamble always comes first, whatever the client wrote.
    const clean = {
      model: body.model,
      messages: [{ role: 'system', content: CHAT_PREAMBLE }, ...body.messages.filter(isChatMessage)],
      max_tokens: Math.min(Number(body.max_tokens) || 800, MAX_CHAT_TOKENS),
      ...(body.temperature !== undefined ? { temperature: Math.max(0, Math.min(1.2, Number(body.temperature) || 0.7)) } : {}),
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
        return res.status(upstream.status >= 500 ? 502 : 400).json({ error: 'ai_upstream_error', message: 'The AI service returned an error.', upstreamStatus: upstream.status });
      }
      try {
        await recordAiUsage(db, { accountId: req.account.id, feature: req.aiContext.feature, model: clean.model, usage: JSON.parse(text)?.usage });
      } catch {
        // not JSON: nothing to record
      }
      res.type('application/json').send(text);
    } catch {
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  // ---------- Speech-to-text ----------
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
      if (!upstream.ok) return res.status(502).json({ error: 'ai_upstream_error', upstreamStatus: upstream.status });
      res.json({ text: text.trim() });
    } catch {
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
      if (!upstream.ok) return res.status(502).json({ error: 'ai_upstream_error', upstreamStatus: upstream.status });
      const audio = Buffer.from(await upstream.arrayBuffer());
      res.type('audio/mpeg').send(audio);
    } catch {
      bad(res, 502, 'ai_upstream_unreachable', 'Could not reach the AI service.');
    }
  });

  return router;
}
