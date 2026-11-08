/**
 * Imports what the older stores already hold into the event log. Kept apart
 * from eventStore so journal/check-in storage can record events without an
 * import cycle.
 */
import { loadCheckIns } from '@/lib/storage/checkins';
import { loadEntries } from '@/lib/storage/journal';
import { readJson } from '@/lib/storage/json';

import { addEvents } from './eventStore';
import { legacyEvents } from './events';

const BREATHING_KEY = '@behappy_breathing_progress';
const MEDITATION_KEY = '@behappy_meditation_log_v1';
const ART_KEY = '@behappy_art_therapy_progress';
const CARDS_DONE_KEY = 'card_therapy_completed_sessions';

/**
 * Imports what the older stores hold (journal, check-ins, breathing,
 * meditation, art therapy, cards). Safe to run on every start: ids are
 * deterministic. Art therapy and cards are read, never changed.
 */
export async function syncLegacyEvents(): Promise<number> {
  const [journal, checkIns, breathing, meditation, art, cards] = await Promise.all([
    loadEntries().catch(() => []),
    loadCheckIns().catch(() => []),
    readJson<{ completedSessions?: { patternId?: string; completedAt?: string; durationMinutes?: number }[] }>(BREATHING_KEY, {}),
    readJson<{ sessionId?: string; at?: number; minutes?: number }[]>(MEDITATION_KEY, []),
    readJson<Record<string, any>>(ART_KEY, {}),
    readJson<any[]>(CARDS_DONE_KEY, []),
  ]);
  const events = legacyEvents({
    journal: journal.map((e) => ({ id: e.id, timestamp: e.timestamp, mood: e.mood, promptId: (e as any).promptId })),
    checkIns: checkIns.map((c) => ({ id: c.id, at: c.at, mood: c.mood, feelings: c.feelings as string[] | undefined })),
    breathing: (breathing.completedSessions || []).map((s) => ({ at: Date.parse(s.completedAt || '') || 0, minutes: s.durationMinutes, pattern: s.patternId })),
    meditation: (Array.isArray(meditation) ? meditation : []).map((m) => ({ at: Number(m.at) || 0, minutes: m.minutes, session: m.sessionId })),
    art: Object.values(art || {})
      .filter((r: any) => r && r.completed && r.completedAt)
      .map((r: any) => ({ sessionId: Number(r.sessionId), completedAt: Date.parse(r.completedAt) || 0 })),
    cards: (Array.isArray(cards) ? cards : []).map((c) => ({ id: String(c?.id || ''), completedAt: Number(c?.completedAt) || 0 })),
  });
  return (await addEvents(events)).length;
}

