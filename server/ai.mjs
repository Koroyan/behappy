// OpenAI proxy. The client never sees the API key.
//
// Every request is: authenticated (anonymous account token) → validated
// against an allowlist (hosted prompt ids, models, field names, size caps) →
// metered by quota.mjs → forwarded with the server's key. Conversation chains
// (previous_response_id) are bound to the account that created them, so one
// user can't continue another user's conversation.

import express from 'express';
import { requireAccount } from './auth.mjs';
import { entitlementsForAccount } from './entitlements.mjs';
import { checkAndRecord } from './quota.mjs';

export const PROMPTS = {
  anulia: process.env.PROMPT_ID_ANULIA || 'pmpt_6902692e3d8081959fff3a192b21482902ebe8295781d9fb',
  art: process.env.PROMPT_ID_ART || 'pmpt_690baa7920308196a2d94f41d4be76be0bd44ed1840b1049',
  cards: process.env.PROMPT_ID_CARDS || 'pmpt_690f8a73181481968bdf18821d56058203765a60aea147e6',
};

// The server picks the model for each hosted prompt. The prompts themselves
// were pinned to *-chat-latest models that OpenAI has since retired, which
// made every AI feature fail; overriding here keeps them working and lets the
// model be changed without an app release.
export const RESPONSES_MODEL = {
  anulia: process.env.AI_MODEL_ANULIA || 'gpt-5.4-mini',
  art: process.env.AI_MODEL_ART || 'gpt-5.4-mini',
  cards: process.env.AI_MODEL_CARDS || 'gpt-5.4-mini',
};
const CHAT_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']);
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

function readContext(req) {
  return {
    feature: String(req.get('x-behappy-feature') || '').toLowerCase(),
    conversationId: req.get('x-behappy-conversation') || '',
    artSessionId: req.get('x-behappy-art-session') || '',
  };
}

export function createAiRouter({ store, config, fetchImpl = globalThis.fetch }) {
  const router = express.Router();
  const perAccount = new SlidingWindow(40, 60 * 1000);
  let globalDay = '';
  let globalCount = 0;

  const openaiHeaders = (extra = {}) => ({ Authorization: `Bearer ${config.openai.apiKey}`, ...extra });

  // Shared guard: auth, configured key, feature, rate limit, global cap, quota.
  const guard = (expectedFeatures) => [
    requireAccount(store),
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

  const meter = (req, res) => {
    const entitlements = entitlementsForAccount(store, req.account.id);
    const decision = checkAndRecord({ store, accountId: req.account.id, entitlements, ctx: req.aiContext });
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

  const rememberResponse = (id, accountId) => {
    if (typeof id !== 'string' || !id.startsWith('resp_')) return;
    store.mutate((db) => {
      db.responseOwners[id] = { accountId, at: Date.now() };
    });
  };

  // ---------- Responses API (hosted prompts) ----------
  router.post('/responses', ...guard(['anulia', 'art', 'cards']), async (req, res) => {
    const body = req.body || {};
    for (const key of Object.keys(body)) {
      if (!RESPONSES_FIELDS.has(key)) return bad(res, 400, 'bad_field', `Field "${key}" is not allowed.`);
    }
    const feature = req.aiContext.feature;
    if (!body.prompt || body.prompt.id !== PROMPTS[feature]) {
      return bad(res, 400, 'bad_prompt', 'This prompt is not allowed for this feature.');
    }
    if (body.prompt.version !== undefined && !/^\d{1,4}$/.test(String(body.prompt.version))) {
      return bad(res, 400, 'bad_prompt_version', 'Invalid prompt version.');
    }
    if (body.previous_response_id !== undefined) {
      const owner = store.data.responseOwners[body.previous_response_id];
      if (!owner || owner.accountId !== req.account.id) {
        // Not ours (or expired from our records): treat as stale so the client
        // resends full context instead of continuing someone else's chain.
        return bad(res, 409, 'stale_previous_response', 'previous_response_id not found');
      }
    }
    const clean = {
      ...body,
      model: RESPONSES_MODEL[feature],
      max_output_tokens: Math.min(Number(body.max_output_tokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    };

    if (!meter(req, res)) return;

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
      rememberResponse(data?.id, req.account.id);
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
    try {
      for await (const chunk of upstream.body) {
        if (!captured) {
          head += Buffer.from(chunk).toString('utf8');
          const m = head.match(/"id"\s*:\s*"(resp_[A-Za-z0-9_-]+)"/);
          if (m) {
            rememberResponse(m[1], req.account.id);
            captured = true;
            head = '';
          } else if (head.length > 16384) {
            captured = true;
            head = '';
          }
        }
        res.write(chunk);
      }
    } catch {
      // Client or upstream disconnected; nothing else to do.
    }
    res.end();
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
    const clean = {
      model: body.model,
      messages: body.messages,
      max_tokens: Math.min(Number(body.max_tokens) || 800, MAX_CHAT_TOKENS),
      ...(body.temperature !== undefined ? { temperature: Math.max(0, Math.min(1.2, Number(body.temperature) || 0.7)) } : {}),
      ...(body.response_format ? { response_format: body.response_format } : {}),
    };

    if (!meter(req, res)) return;

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

    if (!meter(req, res)) return;

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

    if (!meter(req, res)) return;

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
