/**
 * The reminder plan for this device, the same on every platform: the
 * preferences, and the next seven days planned from what the person recorded
 * here (planner.ts). Phones schedule it as local notifications (reminders.ts);
 * the web app sends it to the server, which sends each reminder by Web Push at
 * its time (reminders.web.ts). The recorded activity itself never leaves the
 * device: only the times, the discreet wording and where a tap leads.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSound } from '@/lib/audio/soundStore';
import { loadActivity } from '@/lib/storage/activity';
import { dayKey } from '@/lib/wellbeing/dates';
import { loadEvents } from '@/lib/wellbeing/eventStore';
import { loadReflection } from '@/lib/wellbeing/reflectionStore';
import { loadStepData } from '@/lib/wellbeing/stepStore';

import { ActivitySnapshot, DEFAULT_REMINDER_PREFS, planReflectionReminders, planReminders, PlannedReminder, planSleepCheckIn, planStepReminders, ReminderPrefs } from './planner';

const KEY = '@behappy_reminders_v1';
export const PLAN_KEY = '@behappy_reminders_plan_v1';

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_REMINDER_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_REMINDER_PREFS };
  } catch {
    return { ...DEFAULT_REMINDER_PREFS };
  }
}

export async function saveReminderPrefs(next: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

async function snapshot(): Promise<ActivitySnapshot> {
  const a = await loadActivity();
  const unfinished = a.artStarted.filter((s) => !s.completed && s.at > 0).sort((x, y) => y.at - x.at)[0];
  return {
    journal: a.journal.map((e) => e.timestamp),
    art: a.artCompleted,
    artUnfinished: unfinished ? { id: unfinished.id, at: unfinished.at } : null,
    cards: a.cards,
    checkIns: a.checkIns.map((c) => ({ at: c.at, mood: c.mood })),
    other: [...a.breathing, ...a.meditation, ...a.anulia],
  };
}

async function requestedPlans(prefs: ReminderPrefs, now: number): Promise<PlannedReminder[]> {
  const [steps, reflection, events, sound] = await Promise.all([loadStepData(), loadReflection(), loadEvents(), loadSound()]);
  const marked = new Set(steps.marks.map((m) => `${m.stepId}:${m.day}`));
  const today = dayKey(now);
  const bedtimes = events.filter((e) => e.type === 'sleep.bedtime').map((e) => e.at);
  const checked = new Set(events.filter((e) => e.type === 'sleep.checkin').map((e) => e.day));
  return [
    ...planStepReminders(steps.steps, marked, prefs, now),
    ...planReflectionReminders(reflection.settings, reflection.history.some((h) => h.day === today), prefs, now),
    ...planSleepCheckIn(bedtimes.length ? Math.max(...bedtimes) : null, checked, sound.morningCheckIn, prefs, now),
  ];
}

/**
 * Gentle reminders only when switched on; Step, reflection and sleep
 * reminders were asked for one by one and follow their own switches.
 */
export async function buildReminderPlan(prefs: ReminderPrefs, now: number): Promise<PlannedReminder[]> {
  return [...(prefs.enabled ? planReminders(await snapshot(), prefs, now) : []), ...(await requestedPlans(prefs, now))];
}

export async function savePlanSummary(plan: PlannedReminder[] | null): Promise<void> {
  if (!plan) await AsyncStorage.removeItem(PLAN_KEY).catch(() => {});
  else await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan.map((r) => ({ kind: r.kind, at: r.at })))).catch(() => {});
}

/** What is planned now (for the settings screen), as last scheduled. */
export async function loadPlanSummary(): Promise<{ kind: PlannedReminder['kind']; at: number }[]> {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(PLAN_KEY)) || '[]') as { kind: PlannedReminder['kind']; at: number }[];
    const now = Date.now();
    return (Array.isArray(list) ? list : []).filter((x) => x && x.at > now).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}
