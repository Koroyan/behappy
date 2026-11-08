/**
 * Steps on this device (@behappy_steps_v1). Marks also become events
 * (step.done / step.skipped) so badges, challenges and the recap see them;
 * undo removes both.
 */
import { publish, readJson, uid, writeJson } from '@/lib/storage/json';

import { dayKey } from './dates';
import { recordEvent, removeEvents } from './eventStore';
import type { WellbeingEvent } from './events';
import { autoMarksFor, clearMark, MarkStatus, newStep, setMark, Step, StepMark, StepTemplate } from './steps';

const KEY = '@behappy_steps_v1';
export const STEPS_TOPIC = 'steps';

interface StepData {
  v: 1;
  steps: Step[];
  marks: StepMark[];
  /** The person opted in to classic streaks (shown only if the owner flag is on too). */
  showStreaks?: boolean;
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
};

export async function loadStepData(): Promise<StepData> {
  const raw = await readJson<Partial<StepData>>(KEY, {});
  return { v: 1, steps: Array.isArray(raw.steps) ? raw.steps : [], marks: Array.isArray(raw.marks) ? raw.marks : [], showStreaks: Boolean(raw.showStreaks) };
}

async function update(fn: (d: StepData) => StepData): Promise<StepData> {
  const next = await serial(async () => {
    const d = fn(await loadStepData());
    // Marks older than two years are dropped (the events keep the history).
    const cutoff = dayKey(Date.now() - 730 * 86400000);
    d.marks = d.marks.filter((m) => m.day >= cutoff);
    await writeJson(KEY, d);
    return d;
  });
  publish(STEPS_TOPIC);
  return next;
}

export async function addStep(template: StepTemplate, patch: Partial<Step> = {}): Promise<Step> {
  const step = newStep(template, uid('step'), Date.now(), patch);
  await update((d) => ({ ...d, steps: [...d.steps, step] }));
  return step;
}

export async function editStep(id: string, patch: Partial<Omit<Step, 'id' | 'createdAt'>>): Promise<void> {
  await update((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)) }));
}

/** Removed from plans; its history (marks, events, badges) stays. */
export const archiveStep = (id: string) => editStep(id, { archived: true });
export const setStepPaused = (id: string, paused: boolean) => editStep(id, { paused });
export async function setShowStreaks(showStreaks: boolean) {
  await update((d) => ({ ...d, showStreaks }));
}

const eventType = (status: MarkStatus) => (status === 'done' ? 'step.done' : 'step.skipped');

export async function markStep(step: Step, day: string, status: MarkStatus): Promise<void> {
  const at = Date.now();
  let previous: StepMark | undefined;
  await update((d) => {
    previous = d.marks.find((m) => m.stepId === step.id && m.day === day);
    return { ...d, marks: setMark(d.marks, { stepId: step.id, day, status, at, source: 'manual' }) };
  });
  if (previous && previous.status !== status) await removeEvents([`${eventType(previous.status)}:${step.id}:${day}`]);
  await recordEvent(eventType(status), `${step.id}:${day}`, { template: step.template }, at);
}

export async function undoMark(step: Step, day: string): Promise<void> {
  let previous: StepMark | undefined;
  await update((d) => {
    previous = d.marks.find((m) => m.stepId === step.id && m.day === day);
    return { ...d, marks: clearMark(d.marks, step.id, day) };
  });
  if (previous) await removeEvents([`${eventType(previous.status)}:${step.id}:${day}`]);
}

/** Registered by WellbeingBridge: verified events complete matching Steps. */
export async function applyEventsToSteps(events: WellbeingEvent[]): Promise<number> {
  const relevant = events.filter((e) => !e.type.startsWith('step.'));
  if (!relevant.length) return 0;
  const added: StepMark[] = [];
  await update((d) => {
    let marks = d.marks;
    for (const e of relevant) {
      for (const m of autoMarksFor(d.steps, marks, e)) {
        marks = setMark(marks, m);
        added.push(m);
      }
    }
    return { ...d, marks };
  });
  for (const m of added) {
    const step = (await loadStepData()).steps.find((s) => s.id === m.stepId);
    await recordEvent('step.done', `${m.stepId}:${m.day}`, { template: step?.template ?? null, auto: true }, m.at);
  }
  return added.length;
}
