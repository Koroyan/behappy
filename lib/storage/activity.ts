/**
 * Read-only aggregation over what the user actually recorded. No scores,
 * no predictions — just counts and averages of their own entries.
 */
import { CheckIn, loadCheckIns } from './checkins';
import { JournalEntry, loadEntries } from './journal';
import { recordEvent } from '@/lib/wellbeing/eventStore';

import { dayKey, readJson, writeJson } from './json';

/** Published when art therapy progress changes (services/artTherapyProgramNew.ts). */
export const ART_TOPIC = 'art';

const BREATHING_KEY = '@behappy_breathing_progress'; // pre-2.0 key, same shape
const MEDITATION_KEY = '@behappy_meditation_log_v1';
const ART_KEY = '@behappy_art_therapy_progress';
const ANULIA_KEY = 'therapy_sessions';
const CARDS_DONE_KEY = 'card_therapy_completed_sessions';

interface BreathingStore {
  totalMinutes?: number;
  completedSessions?: { patternId?: string; completedAt?: string; durationMinutes?: number }[];
}

/** Called when a breathing session is finished (never when the screen opens). */
export async function logBreathing(patternId: string, minutes: number) {
  const current = await readJson<BreathingStore>(BREATHING_KEY, {});
  const sessions = Array.isArray(current.completedSessions) ? current.completedSessions : [];
  const at = Date.now();
  const durationMinutes = Math.max(1, Math.round(minutes));
  const next = [{ patternId, completedAt: new Date(at).toISOString(), durationMinutes }, ...sessions].slice(0, 300);
  await writeJson(BREATHING_KEY, {
    totalMinutes: next.reduce((s, x) => s + (Number(x.durationMinutes) || 0), 0),
    completedSessions: next,
  });
  // Same key as the legacy import (the end time), so it is counted once.
  await recordEvent('breathing.completed', Date.parse(new Date(at).toISOString()), { minutes: durationMinutes, pattern: patternId }, at).catch(() => null);
}

/** Called when a meditation is finished. */
export async function logMeditation(sessionId: string, minutes: number) {
  const list = await readJson<{ sessionId: string; at: number; minutes: number }[]>(MEDITATION_KEY, []);
  const at = Date.now();
  await writeJson(MEDITATION_KEY, [{ sessionId, at, minutes }, ...list].slice(0, 300));
  await recordEvent('meditation.completed', `${sessionId}:${at}`, { minutes }, at).catch(() => null);
}

/** Called when all five grounding steps are done. */
export async function logGrounding() {
  const at = Date.now();
  await recordEvent('grounding.completed', at, { minutes: 3 }, at).catch(() => null);
}

export interface ActivityData {
  journal: JournalEntry[];
  checkIns: CheckIn[];
  breathing: number[];
  meditation: number[];
  artCompleted: number[];
  artStarted: { id: number; at: number; completed: boolean }[];
  cards: number[];
  anulia: number[];
}

export async function loadActivity(): Promise<ActivityData> {
  const [journal, checkIns, breathingStore, meditation, art, anulia, cards] = await Promise.all([
    loadEntries(),
    loadCheckIns(),
    readJson<BreathingStore>(BREATHING_KEY, {}),
    readJson<{ at: number }[]>(MEDITATION_KEY, []),
    readJson<Record<string, any>>(ART_KEY, {}),
    readJson<any[]>(ANULIA_KEY, []),
    readJson<any[]>(CARDS_DONE_KEY, []),
  ]);
  const artRows = Object.values(art || {}).filter(Boolean) as any[];
  return {
    journal,
    checkIns,
    breathing: (breathingStore.completedSessions || []).map((s) => Date.parse(s.completedAt || '')).filter((n) => !Number.isNaN(n)),
    meditation: (Array.isArray(meditation) ? meditation : []).map((m) => m.at).filter(Boolean),
    artCompleted: artRows.filter((r) => r.completed && r.completedAt).map((r) => Date.parse(r.completedAt)).filter((n) => !Number.isNaN(n)),
    artStarted: artRows.map((r) => ({ id: Number(r.sessionId), at: Date.parse(r.startedAt || r.completedAt || '') || 0, completed: Boolean(r.completed) })),
    cards: (Array.isArray(cards) ? cards : []).map((c) => Number(c.completedAt)).filter(Boolean),
    anulia: (Array.isArray(anulia) ? anulia : []).map((s) => Date.parse(s.endTime || s.startTime || '')).filter((n) => !Number.isNaN(n)),
  };
}

const inRange = (ts: number, since: number) => ts >= since;

export function summarize(data: ActivityData, sinceMs: number) {
  const since = Date.now() - sinceMs;
  return {
    checkIns: data.checkIns.filter((c) => inRange(c.at, since)).length,
    journal: data.journal.filter((e) => inRange(e.timestamp, since)).length,
    breathing: data.breathing.filter((t) => inRange(t, since)).length,
    meditation: data.meditation.filter((t) => inRange(t, since)).length,
    art: data.artCompleted.filter((t) => inRange(t, since)).length,
    cards: data.cards.filter((t) => inRange(t, since)).length,
    anulia: data.anulia.filter((t) => inRange(t, since)).length,
  };
}

/** Per-day average mood (0–4) from check-ins and journal moods; null = no data. */
export function moodSeries(data: ActivityData, days: number): { day: string; value: number | null; count: number }[] {
  const buckets = new Map<string, number[]>();
  for (const c of data.checkIns) {
    const k = dayKey(c.at);
    buckets.set(k, [...(buckets.get(k) || []), c.mood]);
  }
  for (const e of data.journal) {
    if (typeof e.mood !== 'number') continue;
    const k = dayKey(e.timestamp);
    buckets.set(k, [...(buckets.get(k) || []), e.mood]);
  }
  const out: { day: string; value: number | null; count: number }[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const k = dayKey(cursor);
    const vals = buckets.get(k) || [];
    out.push({ day: k, value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, count: vals.length });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function feelingCounts(data: ActivityData, sinceMs: number) {
  const since = Date.now() - sinceMs;
  const counts = new Map<string, number>();
  for (const c of data.checkIns) {
    if (c.at < since) continue;
    for (const f of c.feelings || []) counts.set(f, (counts.get(f) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
