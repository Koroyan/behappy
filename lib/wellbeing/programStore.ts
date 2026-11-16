/**
 * My Programs on this device (@behappy_programs_v1). One program is active
 * at a time; starting another pauses it (nothing is lost). Verified events
 * complete the current day (WellbeingBridge); a finished day and a finished
 * program also become events, so badges and the recap see them.
 *
 * The person's own day reflections stay here: never sent to the server,
 * never in analytics (only in their own encrypted backup, if they turn it on).
 */
import { trackAction } from '@/lib/analytics';
import { publish, readJson, uid, writeJson } from '@/lib/storage/json';

import { dayKey } from './dates';
import { recordEvent } from './eventStore';
import type { WellbeingEvent } from './events';
import { autoMarkFor, markDay, newRun, ProgramId, programById, ProgramRun, runState, setNote } from './programs';

const KEY = '@behappy_programs_v1';
export const PROGRAMS_TOPIC = 'programs';

export interface ProgramData {
  v: 1;
  runs: ProgramRun[];
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
};

export async function loadPrograms(): Promise<ProgramData> {
  const raw = await readJson<Partial<ProgramData>>(KEY, {});
  const runs = Array.isArray(raw.runs) ? raw.runs.filter((r) => r && programById(r.programId)) : [];
  return { v: 1, runs };
}

async function update(fn: (d: ProgramData) => ProgramData): Promise<ProgramData> {
  const next = await serial(async () => {
    const d = fn(await loadPrograms());
    await writeJson(KEY, d);
    return d;
  });
  publish(PROGRAMS_TOPIC);
  return next;
}

export const activeRun = (d: ProgramData) => d.runs.find((r) => r.status === 'active') || null;
export const latestRunOf = (d: ProgramData, id: ProgramId) => [...d.runs].filter((r) => r.programId === id).sort((a, b) => b.startedAt - a.startedAt)[0] || null;

/** Starts a program (or a new round of one). Any other active program is paused. */
export async function startProgram(id: ProgramId): Promise<ProgramRun> {
  const def = programById(id);
  if (!def) throw new Error(`unknown program ${id}`);
  const now = Date.now();
  const run = newRun(def, uid('prg'), now);
  let paused = false;
  await update((d) => ({
    ...d,
    runs: [
      ...d.runs.map((r) => {
        if (r.status !== 'active') return r;
        paused = true;
        return { ...r, status: 'paused' as const, pausedAt: now, updatedAt: now };
      }),
      run,
    ],
  }));
  if (paused) trackAction('programs', 'paused');
  trackAction('programs', 'started', { program: id });
  return run;
}

export async function pauseProgram(runId: string): Promise<void> {
  const now = Date.now();
  await update((d) => ({ ...d, runs: d.runs.map((r) => (r.runId === runId && r.status === 'active' ? { ...r, status: 'paused', pausedAt: now, updatedAt: now } : r)) }));
  trackAction('programs', 'paused');
}

/** Resuming makes this one the active program (another active one is paused). */
export async function resumeProgram(runId: string): Promise<void> {
  const now = Date.now();
  await update((d) => ({
    ...d,
    runs: d.runs.map((r) => {
      if (r.runId === runId && r.status === 'paused') return { ...r, status: 'active' as const, pausedAt: undefined, updatedAt: now };
      if (r.runId !== runId && r.status === 'active') return { ...r, status: 'paused' as const, pausedAt: now, updatedAt: now };
      return r;
    }),
  }));
  trackAction('programs', 'resumed');
}

/** Leaving is fine: the run ends, what was done and written stays. */
export async function stopProgram(runId: string): Promise<void> {
  const now = Date.now();
  await update((d) => ({ ...d, runs: d.runs.map((r) => (r.runId === runId && (r.status === 'active' || r.status === 'paused') ? { ...r, status: 'stopped', stoppedAt: now, updatedAt: now } : r)) }));
  trackAction('programs', 'stopped');
}

async function afterMark(before: ProgramRun | undefined, after: ProgramRun | undefined, n: number) {
  if (!before || !after || before === after || !after.days[String(n)]) return;
  const mark = after.days[String(n)];
  await recordEvent('program.day', `${after.runId}:${n}`, { program: after.programId, day: n, source: mark.source }, mark.doneAt).catch(() => null);
  trackAction('programs', 'day_completed', { program: after.programId, day: n });
  if (after.status === 'completed' && before.status !== 'completed') {
    await recordEvent('program.completed', after.runId, { program: after.programId }, after.completedAt || mark.doneAt).catch(() => null);
    trackAction('programs', 'completed', { program: after.programId });
  }
}

/** "I did this": the current, open day. */
export async function completeDayManually(runId: string, n: number): Promise<boolean> {
  const now = Date.now();
  let before: ProgramRun | undefined;
  let after: ProgramRun | undefined;
  await update((d) => ({
    ...d,
    runs: d.runs.map((r) => {
      if (r.runId !== runId) return r;
      before = r;
      after = markDay(r, n, { doneAt: now, doneDay: dayKey(now), source: 'manual' });
      return after;
    }),
  }));
  await afterMark(before, after, n);
  return Boolean(after && after !== before);
}

export async function saveDayNote(runId: string, n: number, text: string): Promise<void> {
  const now = Date.now();
  await update((d) => ({ ...d, runs: d.runs.map((r) => (r.runId === runId ? setNote(r, n, text, now) : r)) }));
}

export async function setProgramReminder(runId: string, reminder: { enabled: boolean; time: string }): Promise<void> {
  const now = Date.now();
  await update((d) => ({ ...d, runs: d.runs.map((r) => (r.runId === runId ? { ...r, reminder, updatedAt: now } : r)) }));
}

/** Registered by WellbeingBridge: a verified event completes the current day of the active program. */
export async function applyEventsToPrograms(events: WellbeingEvent[]): Promise<number> {
  const relevant = events.filter((e) => !e.type.startsWith('program.'));
  if (!relevant.length) return 0;
  const changes: { before: ProgramRun; after: ProgramRun; n: number }[] = [];
  await update((d) => ({
    ...d,
    runs: d.runs.map((r) => {
      let cur = r;
      for (const e of [...relevant].sort((a, b) => a.at - b.at)) {
        const hit = autoMarkFor(cur, e);
        if (!hit) continue;
        const next = markDay(cur, hit.n, hit.mark);
        if (next !== cur) {
          changes.push({ before: cur, after: next, n: hit.n });
          cur = next;
        }
      }
      return cur;
    }),
  }));
  for (const c of changes) await afterMark(c.before, c.after, c.n);
  return changes.length;
}

/** For Today and reminders: the active run and where it stands. */
export async function activeProgram(today = dayKey()) {
  const d = await loadPrograms();
  const run = activeRun(d);
  if (!run) return null;
  return { run, def: programById(run.programId)!, state: runState(run, today) };
}
