/**
 * Web build of reminders.ts: browsers can't schedule notifications reliably,
 * so reminders are a phone feature and the settings don't offer them here.
 * Same exports, so shared screens compile and run on every platform.
 */
import { DEFAULT_REMINDER_PREFS, PlannedReminder, ReminderPrefs } from './planner';

export const remindersSupported = false;

export type ReminderCopy = (r: PlannedReminder) => { title: string; body: string };

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  return { ...DEFAULT_REMINDER_PREFS };
}

export async function saveReminderPrefs(_next: ReminderPrefs): Promise<void> {}

export async function notificationsAllowed(): Promise<boolean> {
  return false;
}

export async function askNotificationPermission(): Promise<'granted' | 'denied'> {
  return 'denied';
}

export async function rescheduleReminders(_copy: ReminderCopy): Promise<PlannedReminder[]> {
  return [];
}

export async function scheduledReminders(): Promise<{ kind: PlannedReminder['kind']; at: number }[]> {
  return [];
}
