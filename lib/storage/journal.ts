/**
 * Journal storage.
 *
 * Saving never depends on AI or the network: an entry is written to the
 * device first, always. An AI reflection is optional, requested separately,
 * and attached to the entry afterwards.
 *
 * Storage key "journal_entries" is unchanged from earlier versions. Older
 * entries had no id (which made "delete one" remove all of them); they are
 * given stable ids on first load, without changing any of their content.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { trackAction } from '@/lib/analytics';

import { publish, readJson, uid, writeJson } from './json';

export const JOURNAL_KEY = 'journal_entries';
const DRAFT_KEY = '@behappy_journal_draft_v1';
export const JOURNAL_TOPIC = 'journal';

export type MoodLevel = 0 | 1 | 2 | 3 | 4;

export interface JournalEntry {
  id: string;
  /** Epoch ms of creation (legacy field name kept). */
  timestamp: number;
  updatedAt?: number;
  title?: string;
  content: string;
  mood?: MoodLevel;
  promptId?: string;
  /** Legacy: localized prompt title at the time of writing. */
  promptTitle?: string;
  /** Optional AI reflection, added only on request. */
  aiResponse?: string;
  aiRespondedAt?: number;
  /** Legacy display string; kept for older entries. */
  date?: string;
}

export interface JournalDraft {
  entryId?: string;
  title: string;
  content: string;
  mood?: MoodLevel;
  promptId?: string;
  savedAt: number;
}

function extractText(response: any): string | undefined {
  if (!response) return undefined;
  if (typeof response === 'string') return response;
  const chat = response?.choices?.[0]?.message?.content;
  if (typeof chat === 'string') return chat;
  if (typeof response?.content === 'string') return response.content;
  return undefined;
}

function normalize(raw: any, index: number): JournalEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const timestamp = typeof raw.timestamp === 'number' ? raw.timestamp : Date.parse(raw.date) || Date.now() - index;
  const mood = typeof raw.mood === 'number' && raw.mood >= 0 && raw.mood <= 4 ? (Math.round(raw.mood) as MoodLevel) : undefined;
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `legacy_${timestamp}_${index}`,
    timestamp,
    content: typeof raw.content === 'string' ? raw.content : '',
    mood,
    aiResponse: extractText(raw.aiResponse),
  };
}

export async function loadEntries(): Promise<JournalEntry[]> {
  const raw = await readJson<any[]>(JOURNAL_KEY, []);
  const list = (Array.isArray(raw) ? raw : []).map(normalize).filter(Boolean) as JournalEntry[];
  const needsMigration = Array.isArray(raw) && raw.some((e) => !e?.id || (e?.aiResponse && typeof e.aiResponse !== 'string'));
  if (needsMigration) await writeJson(JOURNAL_KEY, list);
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

async function persist(list: JournalEntry[]) {
  await writeJson(JOURNAL_KEY, list);
  publish(JOURNAL_TOPIC);
}

export async function createEntry(input: { title?: string; content: string; mood?: MoodLevel; promptId?: string; promptTitle?: string }): Promise<JournalEntry> {
  const list = await loadEntries();
  const entry: JournalEntry = {
    id: uid('je'),
    timestamp: Date.now(),
    title: input.title?.trim() || undefined,
    content: input.content,
    mood: input.mood,
    promptId: input.promptId,
    promptTitle: input.promptTitle,
  };
  await persist([entry, ...list]);
  // Only that an entry was saved: never its text or mood.
  trackAction('journal', 'entry_saved');
  return entry;
}

export async function updateEntry(id: string, patch: Partial<Omit<JournalEntry, 'id' | 'timestamp'>>): Promise<JournalEntry | null> {
  const list = await loadEntries();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch, updatedAt: patch.aiResponse !== undefined && Object.keys(patch).length <= 2 ? list[idx].updatedAt : Date.now() };
  list[idx] = next;
  await persist(list);
  return next;
}

export async function deleteEntry(id: string): Promise<void> {
  const list = await loadEntries();
  await persist(list.filter((e) => e.id !== id));
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const list = await loadEntries();
  return list.find((e) => e.id === id) ?? null;
}

export function searchEntries(list: JournalEntry[], query: string): JournalEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((e) => `${e.title ?? ''} ${e.content} ${e.promptTitle ?? ''} ${e.aiResponse ?? ''}`.toLowerCase().includes(q));
}

export async function saveDraft(draft: Omit<JournalDraft, 'savedAt'>): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
}

export async function loadDraft(): Promise<JournalDraft | null> {
  return readJson<JournalDraft | null>(DRAFT_KEY, null);
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
