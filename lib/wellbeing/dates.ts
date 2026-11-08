/**
 * Calendar days in the person's own time zone, as "YYYY-MM-DD" strings.
 *
 * Everything that counts days (Steps, challenges, recaps) works on these keys,
 * never on "now + 24 h": a day with a daylight-saving change has 23 or 25
 * hours, and adding milliseconds would skip or repeat a day.
 */

export function dayKey(value: number | string | Date = Date.now()): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Noon of that day (local): safe for weekday and arithmetic across DST changes. */
export function dayDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(day: string, n: number): string {
  const d = dayDate(day);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (day: string) => dayDate(day).getDay();

/** Whole calendar days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayDate(b).getTime() - dayDate(a).getTime()) / 86400000);
}

/** The day keys from `from` to `to`, inclusive. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 1000; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "HH:MM" → minutes after midnight (null when malformed). */
export function parseTime(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** A local moment on a given day at a given minute (DST-correct: built from the calendar). */
export function atMinute(day: string, minute: number): number {
  const d = dayDate(day);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d.getTime();
}
