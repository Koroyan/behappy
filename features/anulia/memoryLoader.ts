/**
 * Loads what the person allowed Anulia to remember (only the switched-on
 * categories are even read) and builds the memory block (lib/wellbeing/memory).
 * Nothing here is cached: switching a category off takes effect on the very
 * next message.
 */
import { loadConsent, loadMemoryConsent, MemoryConsent } from '@/lib/privacy/consent';
import { listResults } from '@/lib/storage/assessments';
import { loadGoals } from '@/lib/storage/goals';
import { loadEntries } from '@/lib/storage/journal';
import { readJson } from '@/lib/storage/json';
import { loadEvents } from '@/lib/wellbeing/eventStore';
import { buildMemoryBlock, MemoryBlock, MemoryInput } from '@/lib/wellbeing/memory';
import { loadStepData } from '@/lib/wellbeing/stepStore';
import { buildProfileContextBlock, getUserProfile } from '@/services/userProfileService';

const ART_KEY = '@behappy_art_therapy_progress';
const SESSIONS_KEY = 'therapy_sessions';

/** Completed art sessions with their closing summary (read only; art therapy is not changed). */
export async function artSummaries(): Promise<NonNullable<MemoryInput['art']>> {
  const art = await readJson<Record<string, any>>(ART_KEY, {});
  return Object.values(art || {})
    .filter((r: any) => r?.completed && r?.completedAt && (r.clinicalSummary?.session_summary || r.clinicalSummary?.phase_summary))
    .map((r: any) => ({ sessionId: Number(r.sessionId), title: `Art session ${r.sessionId}`, completedAt: Date.parse(r.completedAt) || 0, summary: String(r.clinicalSummary.session_summary || r.clinicalSummary.phase_summary) }));
}

/** Earlier Anulia conversations that have a summary. */
export async function chatSummaries(): Promise<NonNullable<MemoryInput['chats']>> {
  const raw = await readJson<any[]>(SESSIONS_KEY, []);
  return (Array.isArray(raw) ? raw : [])
    .filter((c) => c?.id && c.summary && (c.summary.themes?.length || c.summary.insights?.length))
    .map((c) => ({ id: String(c.id), endedAt: Number(c.summary.createdAt) || Date.parse(c.endTime || c.startTime) || 0, themes: c.summary.themes || [], insights: c.summary.insights || [] }));
}

export async function loadAnuliaMemory(opts: { query: string; conversationId?: string; consent?: MemoryConsent; now?: number }): Promise<MemoryBlock & { version: number }> {
  const consent = opts.consent ?? (await loadMemoryConsent());
  const ai = await loadConsent();
  if (!ai.ai) return { text: '', sources: [], chars: 0, version: consent.version };
  const c = consent.categories;
  const anyEvents = c.mood || c.activity || c.sound || c.sleep || c.steps;
  const [profile, steps, goals, events, journal, art, assessments, chats] = await Promise.all([
    c.profile ? getUserProfile().then((p) => buildProfileContextBlock(p)) : Promise.resolve(''),
    c.steps ? loadStepData() : Promise.resolve(null),
    c.steps ? loadGoals() : Promise.resolve([]),
    anyEvents ? loadEvents() : Promise.resolve([]),
    c.journalText ? loadEntries() : Promise.resolve([]),
    c.artSummaries ? artSummaries() : Promise.resolve([]),
    c.assessments ? listResults() : Promise.resolve([]),
    c.priorChats ? chatSummaries() : Promise.resolve([]),
  ]);
  const block = buildMemoryBlock({
    consent,
    now: opts.now ?? Date.now(),
    query: opts.query,
    conversationId: opts.conversationId,
    profile: profile || undefined,
    steps: steps ? { steps: steps.steps, marks: steps.marks } : undefined,
    goals,
    events,
    journal: journal.map((e) => ({ id: e.id, timestamp: e.timestamp, title: e.title, content: e.content, mood: e.mood })),
    art,
    assessments: assessments.map((a) => {
      const r: any = a.result;
      const simple = typeof r?.total === 'number';
      return { id: a.id, test: String(a.test).toUpperCase(), score: simple ? r.total : Math.max(r?.depression?.score ?? 0, r?.anxiety?.score ?? 0, r?.stress?.score ?? 0), band: simple ? String(r.band) : String(r?.meaning ?? ''), at: a.at };
    }),
    chats,
  });
  return { ...block, version: consent.version };
}

/** Short stable hash (to send the block again only when it changed). */
export function hashText(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
