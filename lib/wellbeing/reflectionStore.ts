/**
 * Daily reflection: settings and history on this device
 * (@behappy_reflection_v1), and making today's reflection.
 *
 * The factual recap needs nothing but the device. The AI reflection needs AI
 * consent and is checked on the server; if it can't be made (offline, no
 * credits, limit reached, didn't pass the checks) the factual recap is shown
 * instead — never an unchecked text. Journal text and art summaries go to the
 * AI only with their own separate permissions.
 */
import type { AppLanguage } from '@/contexts/LanguageContext';
import { aiPost } from '@/lib/api/ai';
import { ApiError, NetworkError, QuotaError } from '@/lib/api/client';
import { loadConsent } from '@/lib/privacy/consent';
import { loadGoals } from '@/lib/storage/goals';
import { loadEntries } from '@/lib/storage/journal';
import { publish, readJson, writeJson } from '@/lib/storage/json';

import { addDays, dayKey } from './dates';
import { loadEvents } from './eventStore';
import { loadProgress } from './progressStore';
import { dayFacts, factsForModel, RECAP_CATEGORIES, RecapCategory, RecapFact } from './recap';
import { loadStepData } from './stepStore';
import { artSummaries } from '@/features/anulia/memoryLoader';

const KEY = '@behappy_reflection_v1';
export const REFLECTION_TOPIC = 'reflection';

export interface ReflectionSettings {
  /** Local reminder at this time ("HH:MM"); the reflection is made when the app is opened. */
  enabled: boolean;
  time: string;
  categories: Record<RecapCategory, boolean>;
  /** Separate permissions: full journal text / art summaries may be sent to the AI. */
  journalText: boolean;
  artSummaries: boolean;
}

export interface AiReflection {
  reflection: string;
  patterns: { text: string; facts: string[] }[];
  suggestion: string;
}

export interface ReflectionRecord {
  day: string;
  facts: RecapFact[];
  ai?: AiReflection;
  source: 'ai' | 'facts';
  /** Why there is no AI text (for an honest one-line note). */
  reason?: 'consent' | 'offline' | 'unavailable' | 'limit' | 'unverified' | 'nothing';
  createdAt: number;
}

interface ReflectionData {
  v: 1;
  settings: ReflectionSettings;
  history: ReflectionRecord[];
}

export const DEFAULT_REFLECTION: ReflectionSettings = {
  enabled: false,
  time: '21:00',
  categories: Object.fromEntries(RECAP_CATEGORIES.map((c) => [c, true])) as Record<RecapCategory, boolean>,
  journalText: false,
  artSummaries: false,
};

export async function loadReflection(): Promise<ReflectionData> {
  const raw = await readJson<Partial<ReflectionData>>(KEY, {});
  return { v: 1, settings: { ...DEFAULT_REFLECTION, ...(raw.settings || {}), categories: { ...DEFAULT_REFLECTION.categories, ...(raw.settings?.categories || {}) } }, history: raw.history || [] };
}

async function save(d: ReflectionData) {
  await writeJson(KEY, d);
  publish(REFLECTION_TOPIC);
}

export async function setReflectionSettings(patch: Partial<ReflectionSettings>) {
  const d = await loadReflection();
  await save({ ...d, settings: { ...d.settings, ...patch, categories: { ...d.settings.categories, ...(patch.categories || {}) } } });
}

/** Today's facts (no AI, no network). */
export async function factsFor(day = dayKey()): Promise<RecapFact[]> {
  const [d, events, steps, goals, progress] = await Promise.all([loadReflection(), loadEvents(), loadStepData(), loadGoals(), loadProgress()]);
  return dayFacts({ day, events, steps, goals, challenges: progress.challenges, categories: d.settings.categories });
}

export async function deleteReflection(day: string) {
  const d = await loadReflection();
  await save({ ...d, history: d.history.filter((h) => h.day !== day) });
}

export const reflectionFor = async (day = dayKey()) => (await loadReflection()).history.find((h) => h.day === day) ?? null;

/**
 * Makes (or re-makes) the reflection for a day. `useAi` false → facts only.
 * The result is saved; history keeps 90 days.
 */
export async function makeReflection(language: AppLanguage, languageName: string, { day = dayKey(), useAi = true, describe }: { day?: string; useAi?: boolean; describe?: (f: RecapFact) => string } = {}): Promise<ReflectionRecord> {
  const d = await loadReflection();
  const facts = await factsFor(day);
  let record: ReflectionRecord = { day, facts, source: 'facts', createdAt: Date.now() };
  if (!facts.length) record.reason = 'nothing';
  else if (useAi && !(await loadConsent()).ai) record.reason = 'consent';
  else if (useAi) {
    try {
      const journal = d.settings.journalText
        ? (await loadEntries())
            .filter((e) => dayKey(e.timestamp) === day)
            .slice(0, 3)
            .map((e) => `${e.title ? `${e.title}. ` : ''}${e.content}`.slice(0, 600))
        : [];
      const art = d.settings.artSummaries ? (await artSummaries()).filter((a) => dayKey(a.completedAt) === day).map((a) => a.summary.slice(0, 600)) : [];
      const res = await aiPost<AiReflection & { source: 'ai' }>('/api/ai/reflection', { day, language: languageName, facts: factsForModel(facts, describe), journal, art }, { feature: 'reflection' });
      record = { ...record, ai: { reflection: res.reflection, patterns: res.patterns || [], suggestion: res.suggestion || '' }, source: 'ai' };
    } catch (e) {
      record.reason = e instanceof QuotaError ? 'limit' : e instanceof NetworkError ? 'offline' : e instanceof ApiError && e.status === 422 ? 'unverified' : 'unavailable';
    }
  }
  const keepFrom = addDays(day, -90);
  // A failed AI attempt never replaces an AI reflection already made that day.
  const previous = d.history.find((h) => h.day === day);
  if (previous?.source === 'ai' && record.source === 'facts' && useAi) record = { ...previous, facts, reason: record.reason };
  await save({ ...d, history: [record, ...d.history.filter((h) => h.day !== day && h.day >= keepFrom)] });
  void language;
  return record;
}
