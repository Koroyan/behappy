/**
 * Anulia — conversation service.
 *
 * Conversations are stored on the device under the pre-2.0 key
 * "therapy_sessions" (same shape), so existing history carries over.
 * Replies stream through the BeHappy server, which adds Anulia's instructions
 * (server/prompts/anulia.md) to every request. Images
 * are sent as input_image parts of the same conversation, so text and image
 * turns share one continuous context.
 */
import type { AppLanguage } from '@/contexts/LanguageContext';
import { aiChat, aiResponsesStream, createResponseStreamParser, parseJsonLoose, partialJsonField, StaleChainError } from '@/lib/api/ai';
import { canPersonalize } from '@/lib/privacy/consent';
import { publish, readJson, uid, writeJson } from '@/lib/storage/json';
import { buildProfileContextBlock, getUserProfile } from '@/services/userProfileService';

const SESSIONS_KEY = 'therapy_sessions';
export const ANULIA_TOPIC = 'anulia';

export interface AnuliaReply {
  response_text: string;
  detected_emotion?: string;
  key_insights?: string[];
  crisis_level?: string | null;
  interactive_component?: 'breathing' | 'journaling' | 'drawing' | 'emotion_tracker' | null;
}

export interface AnuliaMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  imageUri?: string;
  aiResponse?: AnuliaReply;
  failed?: boolean;
}

export interface ConversationSummary {
  themes: string[];
  insights: string[];
  practice: string[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  messages: AnuliaMessage[];
  startTime: string;
  endTime?: string;
  insights: string[];
  emotions: { emotion: string; intensity: number; timestamp: string }[];
  lastResponseId?: string;
  summary?: ConversationSummary;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German',
  fr: 'French', pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};

/** Normalizes stored sessions from any app version. */
function normalize(raw: any): Conversation | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `legacy_${Date.parse(raw.startTime) || Date.now()}`;
  const messages: AnuliaMessage[] = (Array.isArray(raw.messages) ? raw.messages : []).map((m: any, i: number) => ({
    id: typeof m?.id === 'string' && m.id ? m.id : `${id}_${i}`,
    type: m?.type === 'user' ? 'user' : 'ai',
    content: typeof m?.content === 'string' ? m.content : '',
    timestamp: new Date(m?.timestamp || raw.startTime || Date.now()).toISOString(),
    imageUri: typeof m?.imageUri === 'string' && !m.imageUri.startsWith('blob:') ? m.imageUri : undefined,
    aiResponse: m?.aiResponse
      ? {
          response_text: String(m.aiResponse.response_text || m.content || ''),
          detected_emotion: m.aiResponse.detected_emotion,
          key_insights: Array.isArray(m.aiResponse.key_insights) ? m.aiResponse.key_insights : [],
          crisis_level: m.aiResponse.crisis_level ?? null,
        }
      : undefined,
    failed: Boolean(m?.failed),
  }));
  return {
    id,
    messages,
    startTime: new Date(raw.startTime || Date.now()).toISOString(),
    endTime: raw.endTime ? new Date(raw.endTime).toISOString() : undefined,
    insights: Array.isArray(raw.insights) ? raw.insights.filter((x: any) => typeof x === 'string') : [],
    emotions: Array.isArray(raw.emotions) ? raw.emotions : [],
    lastResponseId: typeof raw.lastResponseId === 'string' ? raw.lastResponseId : undefined,
    summary: raw.summary,
  };
}

export const lastActivity = (c: Conversation) => {
  const last = c.messages[c.messages.length - 1];
  return Date.parse(last?.timestamp || c.endTime || c.startTime) || 0;
};

export async function listConversations(): Promise<Conversation[]> {
  const raw = await readJson<any[]>(SESSIONS_KEY, []);
  return (Array.isArray(raw) ? raw : [])
    .map(normalize)
    .filter((c): c is Conversation => Boolean(c))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return (await listConversations()).find((c) => c.id === id) ?? null;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const raw = await readJson<any[]>(SESSIONS_KEY, []);
  const list = (Array.isArray(raw) ? raw : []).map(normalize).filter(Boolean) as Conversation[];
  const idx = list.findIndex((c) => c.id === conv.id);
  // Data URLs of shared images can be large; keep text, drop the inline image.
  const slim: Conversation = { ...conv, messages: conv.messages.map((m) => (m.imageUri?.startsWith('data:') ? { ...m, imageUri: undefined } : m)) };
  if (idx >= 0) list[idx] = slim;
  else list.push(slim);
  await writeJson(SESSIONS_KEY, list);
  publish(ANULIA_TOPIC);
}

export async function deleteConversation(id: string): Promise<void> {
  const raw = await readJson<any[]>(SESSIONS_KEY, []);
  await writeJson(
    SESSIONS_KEY,
    (Array.isArray(raw) ? raw : []).filter((c) => c?.id !== id)
  );
  publish(ANULIA_TOPIC);
}

export function newConversation(): Conversation {
  return { id: uid('conv'), messages: [], startTime: new Date().toISOString(), insights: [], emotions: [] };
}

export function makeMessage(type: AnuliaMessage['type'], content: string, extra: Partial<AnuliaMessage> = {}): AnuliaMessage {
  return { id: uid(type === 'user' ? 'mu' : 'ma'), type, content, timestamp: new Date().toISOString(), ...extra };
}

async function contextBlock(language: AppLanguage): Promise<string> {
  const profile = (await canPersonalize()) ? buildProfileContextBlock(await getUserProfile()) : '';
  const lang = LANGUAGE_NAMES[language] || 'English';
  return [profile, `[Reply in the language the person writes in. If unclear, use ${lang}.]`].filter(Boolean).join('\n');
}

function toReply(raw: string): AnuliaReply {
  const parsed = parseJsonLoose(raw);
  if (parsed && typeof parsed === 'object') {
    const text = parsed.response_text || parsed.message || parsed.content;
    // 3.0 server instructions use neutral keys; the older hosted-prompt keys are still read.
    const emotion = parsed.emotional_state ?? parsed.clinical_assessment?.emotional_state;
    const themes = Array.isArray(parsed.themes) ? parsed.themes : [parsed.session_data?.presenting_concern, parsed.session_data?.treatment_target];
    return {
      response_text: typeof text === 'string' && text.trim() ? text : raw,
      detected_emotion: typeof emotion === 'string' && emotion.split(/\s+/).length === 1 && emotion.length <= 20 ? emotion.toLowerCase() : undefined,
      key_insights: themes.filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 3),
      crisis_level: parsed.safety?.risk_level ?? parsed.crisis_response?.risk_level ?? null,
      interactive_component: null,
    };
  }
  return { response_text: raw };
}

export interface SendOptions {
  conversation: Conversation;
  /** Messages already including the new user message. */
  history: AnuliaMessage[];
  text: string;
  imageDataUrl?: string;
  language: AppLanguage;
  onDelta?: (partialText: string) => void;
}

/**
 * Sends one user turn and resolves with Anulia's reply and the new chain id.
 * Throws QuotaError (402), ConsentRequiredError, NetworkError or ApiError.
 */
export async function sendToAnulia({ conversation, history, text, imageDataUrl, language, onDelta }: SendOptions): Promise<{ reply: AnuliaReply; responseId?: string }> {
  const ctx = await contextBlock(language);
  const schemaHint = '[Reply with the JSON object described in your instructions.]';

  const userContent = (withContext: string) => {
    const parts: any[] = [{ type: 'input_text', text: `${withContext}\n\n${text}\n\n${schemaHint}` }];
    if (imageDataUrl) parts.push({ type: 'input_image', image_url: imageDataUrl, detail: 'high' });
    return parts;
  };

  const fullInput = () => {
    const prior = history.slice(0, -1).slice(-20);
    const input: any[] = prior
      .filter((m) => m.content && !m.failed)
      .map((m) =>
        m.type === 'user'
          ? { role: 'user', content: [{ type: 'input_text', text: m.content }] }
          : { role: 'assistant', content: [{ type: 'output_text', text: m.content }] }
      );
    input.push({ role: 'user', content: userContent(ctx) });
    return input;
  };
  const incrementalInput = () => [{ role: 'user', content: userContent(ctx) }];

  const run = async (input: any[], chainId?: string) => {
    let lastShown = '';
    const parser = createResponseStreamParser({
      onDelta: (full) => {
        const partial = partialJsonField(full, 'response_text');
        if (partial && partial !== lastShown) {
          lastShown = partial;
          onDelta?.(partial);
        }
      },
    });
    await aiResponsesStream(
      {
        input,
        store: true,
        max_output_tokens: 1400,
        text: { format: { type: 'json_object' } },
        ...(chainId ? { previous_response_id: chainId } : {}),
      },
      { feature: 'anulia', conversationId: conversation.id },
      (chunk) => parser.push(chunk)
    );
    const { text: finalText, id } = parser.finish();
    if (!finalText.trim()) throw new Error('Empty reply');
    return { reply: toReply(finalText), responseId: id };
  };

  if (conversation.lastResponseId) {
    try {
      return await run(incrementalInput(), conversation.lastResponseId);
    } catch (e) {
      if (!(e instanceof StaleChainError)) throw e;
    }
  }
  return run(fullInput(), undefined);
}

/**
 * A short, gentle reflection on a finished conversation. Deliberately no
 * scores, ratings or clinical labels.
 */
export async function summarizeConversation(conv: Conversation, language: AppLanguage): Promise<ConversationSummary> {
  const transcript = conv.messages
    .filter((m) => m.content && !m.failed)
    .slice(-40)
    .map((m) => `${m.type === 'user' ? 'Person' : 'Anulia'}: ${m.content}`)
    .join('\n');
  const lang = LANGUAGE_NAMES[language] || 'English';
  const data = await aiChat(
    {
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `You write a short, warm reflection of a conversation between a person and Anulia, an AI well-being companion (not a therapist). ` +
            `Write in ${lang}, addressing the person as "you". Return JSON: {"themes": [2-4 short phrases about what they explored], ` +
            `"insights": [1-3 gentle observations in their own terms], "practice": [1-2 small, optional, concrete things to try]}. ` +
            `No scores, no ratings, no diagnoses, no clinical labels, no progress judgments.`,
        },
        { role: 'user', content: transcript || '(empty)' },
      ],
    },
    { feature: 'summary', conversationId: conv.id }
  );
  const parsed = parseJsonLoose(data?.choices?.[0]?.message?.content || '') || {};
  const list = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4) : []);
  return { themes: list(parsed.themes), insights: list(parsed.insights), practice: list(parsed.practice), createdAt: Date.now() };
}

export const conversationTitle = (c: Conversation) => {
  const first = c.messages.find((m) => m.type === 'user' && m.content);
  return (first?.content || '').replace(/\s+/g, ' ').slice(0, 80);
};
