/**
 * Web build of reminders.ts. A browser can't schedule notifications itself, so
 * the app plans the reminders exactly as a phone does (plan.ts, from data that
 * stays on this device) and sends the plan to the BeHappy server, which sends
 * each one by Web Push at its time (server/notify/push.mjs). Planned again on
 * the same occasions as on a phone (NotificationsBridge), so a reminder for
 * something already done is cancelled.
 *
 * Needs Web Push: an installed BeHappy on iPhone/iPad (iOS 16.4+), or a
 * browser that supports it. Where it doesn't work, turning reminders on says
 * why (settings screen) instead of pretending.
 */
import { buildReminderPlan, loadPlanSummary, loadReminderPrefs, savePlanSummary } from './plan';
import { PlannedReminder } from './planner';
import { appLanguage, enableWebPush, loadWebPushState, uploadReminders, webPushSupport } from './webPush';

export { loadReminderPrefs, saveReminderPrefs } from './plan';

/** Offered on the web (it may still be unavailable in this browser: see webPushSupport). */
export const remindersSupported = true;

export type ReminderCopy = (r: PlannedReminder) => { title: string; body: string };

export async function notificationsAllowed(): Promise<boolean> {
  return webPushSupport() === 'ok' && typeof Notification !== 'undefined' && Notification.permission === 'granted' && loadWebPushState().reminders;
}

/** Turning reminders on (a tap): 'ok', or why not, so the screen can say what to do. */
export async function enableReminders(): Promise<'ok' | 'denied' | 'needs-install' | 'unsupported'> {
  const r = await enableWebPush('reminders', appLanguage());
  return r === 'ok' || r === 'denied' || r === 'needs-install' ? r : 'unsupported';
}

/** Called from a tap ("remind me"): asks the browser, subscribes this device for reminders. */
export async function askNotificationPermission(): Promise<'granted' | 'denied'> {
  return (await enableWebPush('reminders', appLanguage())) === 'ok' ? 'granted' : 'denied';
}

let queue: Promise<unknown> = Promise.resolve();

/** Sends a fresh plan to the server (it replaces what was pending). Calls are serialized. */
export function rescheduleReminders(copy: ReminderCopy): Promise<PlannedReminder[]> {
  const run = async (): Promise<PlannedReminder[]> => {
    if (!(await notificationsAllowed())) {
      await savePlanSummary(null);
      return [];
    }
    const plan = await buildReminderPlan(await loadReminderPrefs(), Date.now());
    const sent = await uploadReminders(
      plan.map((r) => ({ id: r.id, kind: r.kind, at: r.at, url: r.url, ...copy(r) })),
      appLanguage()
    ).catch(() => false);
    await savePlanSummary(sent ? plan : null);
    return sent ? plan : [];
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export async function scheduledReminders(): Promise<{ kind: PlannedReminder['kind']; at: number }[]> {
  return loadPlanSummary();
}
