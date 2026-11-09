/**
 * Gentle reminders on the phone (journal, art therapy, reflection cards).
 *
 * Everything happens on the device: the plan is made from what the person
 * recorded (lib/storage, never sent anywhere) and scheduled as local
 * notifications. The next seven days are planned again whenever the app
 * opens, comes back to the foreground or something is recorded, so a
 * reminder for something already done disappears and the timing keeps up
 * with the person's habits. Off by default; turning it on asks the phone
 * for permission. The web app plans the same way and has the server send
 * the reminders by Web Push (reminders.web.ts); the plan is shared (plan.ts).
 */
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { buildReminderPlan, loadPlanSummary, loadReminderPrefs, savePlanSummary } from './plan';
import { PlannedReminder } from './planner';

export { loadReminderPrefs, saveReminderPrefs } from './plan';

const PREFIX = 'bh-reminder-';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export type ReminderCopy = (r: PlannedReminder) => { title: string; body: string };

/** Granted (or "provisional" on iOS, which delivers quietly). */
export async function notificationsAllowed(): Promise<boolean> {
  if (!remindersSupported) return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Turning reminders on: 'ok' or why not (the web version can also say 'needs-install' / 'unsupported'). */
export async function enableReminders(): Promise<'ok' | 'denied' | 'needs-install' | 'unsupported'> {
  return (await askNotificationPermission()) === 'granted' ? 'ok' : 'denied';
}

/** Asks once; if the person said no before, the phone's settings are the only way back. */
export async function askNotificationPermission(): Promise<'granted' | 'denied'> {
  if (!remindersSupported) return 'denied';
  if (await notificationsAllowed()) return 'granted';
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied';
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
      await savePlanSummary(null);
      return [];
    }
    const plan = await buildReminderPlan(prefs, Date.now());
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
    await savePlanSummary(plan);
    return plan;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** What is planned now (for the settings screen), as last scheduled. */
export async function scheduledReminders(): Promise<{ kind: PlannedReminder['kind']; at: number }[]> {
  if (!remindersSupported) return [];
  return loadPlanSummary();
}
