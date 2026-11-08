/**
 * Gentle reminders on the phone (journal, art therapy, reflection cards).
 *
 * Everything happens on the device: the plan is made from what the person
 * recorded (lib/storage, never sent anywhere) and scheduled as local
 * notifications. The next seven days are planned again whenever the app
 * opens, comes back to the foreground or something is recorded, so a
 * reminder for something already done disappears and the timing keeps up
 * with the person's habits. Off by default; turning it on asks the phone
 * for permission. Not on the web (browsers can't schedule notifications
 * reliably), so the settings don't offer it there.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { loadActivity } from '@/lib/storage/activity';

import { loadSound } from '@/lib/audio/soundStore';
import { dayKey } from '@/lib/wellbeing/dates';
import { loadEvents } from '@/lib/wellbeing/eventStore';
import { loadReflection } from '@/lib/wellbeing/reflectionStore';
import { loadStepData } from '@/lib/wellbeing/stepStore';

import { ActivitySnapshot, DEFAULT_REMINDER_PREFS, planReflectionReminders, planReminders, PlannedReminder, planSleepCheckIn, planStepReminders, ReminderPrefs } from './planner';

const KEY = '@behappy_reminders_v1';
const PLAN_KEY = '@behappy_reminders_plan_v1';
const PREFIX = 'bh-reminder-';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export type ReminderCopy = (r: PlannedReminder) => { title: string; body: string };

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

/** Granted (or "provisional" on iOS, which delivers quietly). */
export async function notificationsAllowed(): Promise<boolean> {
  if (!remindersSupported) return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Asks once; if the person said no before, the phone's settings are the only way back. */
export async function askNotificationPermission(): Promise<'granted' | 'denied'> {
  if (!remindersSupported) return 'denied';
  if (await notificationsAllowed()) return 'granted';
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied';
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

let queue: Promise<unknown> = Promise.resolve();

/** Replaces the scheduled reminders with a fresh plan. Calls are serialized. */
export function rescheduleReminders(copy: ReminderCopy): Promise<PlannedReminder[]> {
  const run = async (): Promise<PlannedReminder[]> => {
    if (!remindersSupported) return [];
    const prefs = await loadReminderPrefs();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => n.identifier.startsWith(PREFIX));
    if (!(await notificationsAllowed())) {
      await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
      await AsyncStorage.removeItem(PLAN_KEY).catch(() => {});
      return [];
    }
    const now = Date.now();
    // Gentle reminders only when switched on; Step, reflection and sleep
    // reminders were asked for one by one and follow their own switches.
    const plan = [...(prefs.enabled ? planReminders(await snapshot(), prefs, now) : []), ...(await requestedPlans(prefs, now))];
    const keep = new Set(plan.map((r) => PREFIX + r.id));
    await Promise.all(ours.filter((n) => !keep.has(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    for (const r of plan) {
      const text = copy(r);
      // The same identifier replaces an earlier schedule for that day.
      await Notifications.scheduleNotificationAsync({
        identifier: PREFIX + r.id,
        content: { title: text.title, body: text.body, data: { url: r.url, kind: 'reminder', reminder: r.kind }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: 'reminders' },
      });
    }
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan.map((r) => ({ kind: r.kind, at: r.at })))).catch(() => {});
    return plan;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** What is planned now (for the settings screen), as last scheduled. */
export async function scheduledReminders(): Promise<{ kind: PlannedReminder['kind']; at: number }[]> {
  if (!remindersSupported) return [];
  try {
    const list = JSON.parse((await AsyncStorage.getItem(PLAN_KEY)) || '[]') as { kind: PlannedReminder['kind']; at: number }[];
    const now = Date.now();
    return (Array.isArray(list) ? list : []).filter((x) => x && x.at > now).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}
