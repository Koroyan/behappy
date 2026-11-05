/**
 * Card reflection storage — same keys and shape as before 2.0
 * ("card_therapy_ongoing_sessions", "card_therapy_completed_sessions"), so
 * earlier reflections stay in history. New sessions store which deck/cards
 * were chosen instead of large base64 image copies.
 */
import { publish, readJson, writeJson } from '@/lib/storage/json';
import type { CardContext, ChatMessage } from '@/services/cardTherapyService';

const ONGOING = 'card_therapy_ongoing_sessions';
const COMPLETED = 'card_therapy_completed_sessions';
export const CARDS_TOPIC = 'cards';

export interface CardChoice {
  deck: string;
  /** 0-based card indexes: [single] or [light, heavy]. */
  cards: number[];
}

export interface CardSession {
  id: string;
  cardContext: CardContext;
  messages: ChatMessage[];
  startedAt: number;
  lastUpdatedAt: number;
  exchangeCount: number;
  lastResponseId?: string;
  choice?: CardChoice;
  // Legacy fields (pre-2.0 sessions).
  cardImageBase64?: string | null;
  positiveImageBase64?: string | null;
  negativeImageBase64?: string | null;
}

export interface CompletedCardSession extends CardSession {
  completedAt: number;
  messageCount: number;
  summary?: any;
  summaryText?: string;
}

export const newCardSessionId = () => `card_session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export async function listOngoing(): Promise<CardSession[]> {
  const list = await readJson<CardSession[]>(ONGOING, []);
  return Array.isArray(list) ? list : [];
}

export async function listCompleted(): Promise<CompletedCardSession[]> {
  const list = await readJson<CompletedCardSession[]>(COMPLETED, []);
  return Array.isArray(list) ? list : [];
}

export async function getSession(id: string): Promise<{ session: CardSession | CompletedCardSession; completed: boolean } | null> {
  const ongoing = (await listOngoing()).find((s) => s.id === id);
  if (ongoing) return { session: ongoing, completed: false };
  const done = (await listCompleted()).find((s) => s.id === id);
  return done ? { session: done, completed: true } : null;
}

export async function saveOngoing(session: CardSession): Promise<void> {
  const list = await listOngoing();
  const idx = list.findIndex((s) => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  await writeJson(ONGOING, list.slice(0, 20));
  publish(CARDS_TOPIC);
}

export async function completeSession(session: CardSession, summaryText: string): Promise<void> {
  const done: CompletedCardSession = { ...session, completedAt: Date.now(), messageCount: session.messages.length, summaryText, summary: { text: summaryText } };
  const completed = await listCompleted();
  await writeJson(COMPLETED, [done, ...completed.filter((c) => c.id !== session.id)].slice(0, 50));
  await writeJson(
    ONGOING,
    (await listOngoing()).filter((s) => s.id !== session.id)
  );
  publish(CARDS_TOPIC);
}

export async function deleteCardSession(id: string): Promise<void> {
  await writeJson(
    ONGOING,
    (await listOngoing()).filter((s) => s.id !== id)
  );
  await writeJson(
    COMPLETED,
    (await listCompleted()).filter((s) => s.id !== id)
  );
  publish(CARDS_TOPIC);
}
