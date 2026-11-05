/**
 * Mood check-ins (new in 2.0). One tap from Today; optional feelings + note.
 * Entries from the pre-2.0 detailed mood tracker ("moodTrackingData", 1–10
 * scale) are imported read-only on first load so older history appears in
 * Insights.
 */
import { MoodLevel } from './journal';
import { dayKey, publish, readJson, uid, writeJson } from './json';

const KEY = '@behappy_mood_checkins_v1';
const LEGACY_KEY = 'moodTrackingData';
const MIGRATED_FLAG = '@behappy_mood_checkins_migrated';
export const CHECKIN_TOPIC = 'checkins';

export const FEELINGS = ['calm', 'grateful', 'hopeful', 'content', 'energized', 'tired', 'anxious', 'sad', 'irritated', 'lonely', 'overwhelmed', 'numb'] as const;
export type Feeling = (typeof FEELINGS)[number];

export interface CheckIn {
  id: string;
  at: number;
  mood: MoodLevel;
  feelings: Feeling[];
  note?: string;
  source?: 'today' | 'legacy';
}

async function migrateLegacy(): Promise<CheckIn[]> {
  const done = await readJson<boolean>(MIGRATED_FLAG, false);
  if (done) return [];
  const legacy = await readJson<any[]>(LEGACY_KEY, []);
  const imported: CheckIn[] = (Array.isArray(legacy) ? legacy : [])
    .filter((e) => e && typeof e.mood === 'number')
    .map((e, i) => {
      const at = Date.parse(e.timestamp || e.date) || Date.now() - i * 86400000;
      const scaled = Math.max(0, Math.min(4, Math.round(((Number(e.mood) - 1) / 9) * 4))) as MoodLevel;
      return { id: `legacy_mood_${at}_${i}`, at, mood: scaled, feelings: [], note: typeof e.notes === 'string' && e.notes ? e.notes : undefined, source: 'legacy' as const };
    });
  await writeJson(MIGRATED_FLAG, true);
  return imported;
}

export async function loadCheckIns(): Promise<CheckIn[]> {
  const list = await readJson<CheckIn[]>(KEY, []);
  const legacy = await migrateLegacy();
  if (legacy.length) {
    const merged = [...list, ...legacy];
    await writeJson(KEY, merged);
    return merged.sort((a, b) => b.at - a.at);
  }
  return (Array.isArray(list) ? list : []).sort((a, b) => b.at - a.at);
}

export async function addCheckIn(input: { mood: MoodLevel; feelings?: Feeling[]; note?: string }): Promise<CheckIn> {
  const list = await loadCheckIns();
  const entry: CheckIn = { id: uid('ci'), at: Date.now(), mood: input.mood, feelings: input.feelings ?? [], note: input.note?.trim() || undefined, source: 'today' };
  await writeJson(KEY, [entry, ...list]);
  publish(CHECKIN_TOPIC);
  return entry;
}

export async function updateCheckIn(id: string, patch: Partial<Omit<CheckIn, 'id' | 'at'>>): Promise<void> {
  const list = await loadCheckIns();
  await writeJson(
    KEY,
    list.map((c) => (c.id === id ? { ...c, ...patch } : c))
  );
  publish(CHECKIN_TOPIC);
}

export function latestToday(list: CheckIn[]): CheckIn | undefined {
  const today = dayKey();
  return list.find((c) => dayKey(c.at) === today);
}
