/**
 * AI transport. All AI features call these helpers; they reach OpenAI only
 * through the BeHappy server, which holds the key and applies allowances.
 */
import { Platform } from 'react-native';

import { assertAiConsent } from '@/lib/privacy/consent';

import { API_BASE_URL, ApiError, apiFetch, ensureAccount, NetworkError, parseError, QuotaError, TUNNEL_HEADERS } from './client';

export type AiFeature = 'anulia' | 'art' | 'cards' | 'journal' | 'summary' | 'motivation' | 'transcribe' | 'speech' | 'reflection';

export interface AiContext {
  feature: AiFeature;
  conversationId?: string;
  artSessionId?: number | string;
  /** One run of an art session (its start time): the server keeps image fingerprints per run. */
  artRunId?: string;
}

/** Thrown when a previous_response_id can't be continued (expired or not ours). */
export class StaleChainError extends ApiError {
  constructor() {
    super(409, 'stale_previous_response', 'previous_response_id not found');
    this.name = 'StaleChainError';
  }
}

export interface AiMeta {
  tier?: string;
  remaining?: number;
  grace?: number;
}

function ctxHeaders(ctx: AiContext): Record<string, string> {
  const h: Record<string, string> = { 'X-BeHappy-Feature': ctx.feature };
  if (ctx.conversationId) h['X-BeHappy-Conversation'] = String(ctx.conversationId).slice(0, 80);
  if (ctx.artSessionId !== undefined) h['X-BeHappy-Art-Session'] = String(ctx.artSessionId);
  if (ctx.artRunId && /^[A-Za-z0-9_-]{1,64}$/.test(ctx.artRunId)) h['X-BeHappy-Art-Run'] = ctx.artRunId;
  return h;
}

function readMeta(headers: Headers | { get(name: string): string | null }): AiMeta {
  const remaining = headers.get('X-BeHappy-Remaining');
  const grace = headers.get('X-BeHappy-Grace');
  return {
    tier: headers.get('X-BeHappy-Tier') ?? undefined,
    remaining: remaining !== null ? Number(remaining) : undefined,
    grace: grace !== null ? Number(grace) : undefined,
  };
}

let lastMeta: AiMeta = {};
export const getLastAiMeta = () => lastMeta;

async function post(path: string, body: unknown, ctx: AiContext) {
  await assertAiConsent();
  const res = await apiFetch(path, { method: 'POST', body, headers: ctxHeaders(ctx) });
  if (res.status === 409) {
    const data = await res.json().catch(() => ({}));
    if (data?.error === 'stale_previous_response') throw new StaleChainError();
    throw new ApiError(409, data?.error, data?.message || 'Conflict', data);
  }
  if (!res.ok) await parseError(res);
  lastMeta = readMeta(res.headers);
  return res;
}

/** Responses API with a hosted prompt (non-streaming). */
export async function aiResponses<T = any>(body: Record<string, unknown>, ctx: AiContext): Promise<T> {
  const res = await post('/api/ai/responses', body, ctx);
  return (await res.json()) as T;
}

/** A JSON POST to an AI route (e.g. /api/ai/reflection). */
export async function aiPost<T = any>(path: string, body: Record<string, unknown>, ctx: AiContext): Promise<T> {
  const res = await post(path, body, ctx);
  return (await res.json()) as T;
}

/** Chat Completions (summaries, journal reflections, short texts). */
export async function aiChat<T = any>(body: Record<string, unknown>, ctx: AiContext): Promise<T> {
  const res = await post('/api/ai/chat', body, ctx);
  return (await res.json()) as T;
}

/**
 * Streams a Responses API call. `onChunk` receives raw SSE text as it arrives.
 * Web uses fetch + ReadableStream; native uses XMLHttpRequest progress events,
 * because React Native's fetch does not expose a readable body stream.
 */
export async function aiResponsesStream(body: Record<string, unknown>, ctx: AiContext, onChunk: (text: string) => void): Promise<void> {
  await assertAiConsent();
  const account = await ensureAccount();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...TUNNEL_HEADERS,
    Authorization: `Bearer ${account.token}`,
    ...ctxHeaders(ctx),
  };
  const payload = JSON.stringify({ ...body, stream: true });

  const fail = (status: number, text: string): never => {
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    if (status === 402 && data?.error === 'quota_exceeded') throw new QuotaError(data);
    if (status === 409 && data?.error === 'stale_previous_response') throw new StaleChainError();
    throw new ApiError(status, data?.error, data?.message || `AI request failed (${status})`, data);
  };

  if (Platform.OS !== 'web') {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/ai/responses`);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      let seen = 0;
      const pull = () => {
        if (xhr.status && (xhr.status < 200 || xhr.status >= 300)) return;
        const full = xhr.responseText || '';
        if (full.length > seen) {
          const next = full.slice(seen);
          seen = full.length;
          onChunk(next);
        }
      };
      xhr.onprogress = () => {
        try {
          pull();
        } catch (e) {
          reject(e);
        }
      };
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          try {
            fail(xhr.status, xhr.responseText);
          } catch (e) {
            reject(e);
          }
          return;
        }
        lastMeta = readMeta({ get: (n: string) => xhr.getResponseHeader(n) });
        try {
          pull();
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = () => reject(new NetworkError());
      xhr.send(payload);
    });
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ai/responses`, { method: 'POST', headers, body: payload });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) fail(res.status, await res.text());
  lastMeta = readMeta(res.headers);
  const reader = (res.body as any)?.getReader?.();
  if (!reader) {
    onChunk(await res.text());
    return;
  }
  const decoder = new TextDecoder('utf-8');
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) onChunk(decoder.decode(value, { stream: true }));
  }
}

/** Speech-to-text. `audioBase64` without the data: prefix is fine either way. */
export async function aiTranscribe(audioBase64: string, mimeType: string, fileName: string, language?: string): Promise<string> {
  const res = await post('/api/ai/transcribe', { audioBase64, mimeType, fileName, language }, { feature: 'transcribe' });
  const json = await res.json();
  return String(json?.text || '').trim();
}

/** Text-to-speech. Returns MP3 bytes. */
export async function aiSpeech(input: string, voice: string): Promise<ArrayBuffer> {
  const res = await post('/api/ai/speech', { input, voice }, { feature: 'speech' });
  return res.arrayBuffer();
}

/** Extracts the assistant text from a Responses API object. */
export function responseText(data: any): string {
  if (!data) return '';
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  const outputs = Array.isArray(data.output) ? data.output : [];
  for (const item of outputs) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      const part = item.content.find((c: any) => typeof c?.text === 'string');
      if (part) return part.text;
    }
  }
  return '';
}

/** Parses a JSON object out of model text (handles ``` fences and stray prose). */
export function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Incremental SSE parser for Responses streaming. Feed raw chunks; it emits
 * output text deltas and captures the response id and final text.
 */
export function createResponseStreamParser(handlers: { onDelta?: (fullText: string) => void; onId?: (id: string) => void }) {
  let buffer = '';
  let text = '';
  let id: string | undefined;
  let completed: any = null;
  const handleEvent = (raw: string) => {
    const dataLines = raw
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim());
    if (!dataLines.length) return;
    const data = dataLines.join('\n');
    if (data === '[DONE]') return;
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      return;
    }
    const rid = evt?.response?.id;
    if (rid && !id) {
      id = rid;
      handlers.onId?.(rid);
    }
    if (evt?.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
      text += evt.delta;
      handlers.onDelta?.(text);
    } else if (evt?.type === 'response.output_text.done' && typeof evt.text === 'string') {
      text = evt.text;
    } else if (evt?.type === 'response.completed') {
      completed = evt.response;
    }
  };
  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n');
      let idx = buffer.indexOf('\n\n');
      while (idx >= 0) {
        handleEvent(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        idx = buffer.indexOf('\n\n');
      }
    },
    finish() {
      if (buffer.trim()) handleEvent(buffer);
      buffer = '';
      const finalText = text || (completed ? responseText(completed) : '');
      return { text: finalText, id: id ?? completed?.id };
    },
  };
}

/** Reads the current value of the "response_text" field from partial JSON. */
export function partialJsonField(buffer: string, field = 'response_text'): string | null {
  const m = buffer.match(new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`));
  if (!m) return null;
  return m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
