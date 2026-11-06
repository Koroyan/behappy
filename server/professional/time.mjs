// Time zones and bookable slots.
//
// Professionals set weekly hours in their own time zone; bookings are stored
// in UTC. Converting a local wall-clock time to UTC uses Intl only (no extra
// dependency) and handles daylight-saving changes.

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const partsCache = new Map();
function formatter(tz) {
  if (!partsCache.has(tz)) {
    partsCache.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
  }
  return partsCache.get(tz);
}

const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Local calendar parts of an instant in a time zone. */
export function zonedParts(ms, tz) {
  const out = {};
  for (const p of formatter(tz).formatToParts(new Date(ms))) out[p.type] = p.value;
  return { year: Number(out.year), month: Number(out.month), day: Number(out.day), hour: Number(out.hour), minute: Number(out.minute), weekday: WEEKDAYS[out.weekday] };
}

/** Offset of a time zone at an instant, in minutes (local - UTC). */
function offsetMinutes(ms, tz) {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(ms / MINUTE) * MINUTE) / MINUTE);
}

/** UTC instant of a local wall-clock time (y, m 1-12, d, minutes since midnight). */
export function zonedToUtc(year, month, day, minutesOfDay, tz) {
  const guess = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  let t = guess - offsetMinutes(guess, tz) * MINUTE;
  // Second pass fixes the hour around a daylight-saving change.
  t = guess - offsetMinutes(t, tz) * MINUTE;
  return t;
}

export const localDateKey = (ms, tz) => {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/**
 * Bookable slot start times (UTC ms) for one service between `from` and `to`.
 *  rules:      [{ weekday 1-7, startMinute, endMinute }]
 *  exceptions: Set of local 'YYYY-MM-DD' days off
 *  busy:       [{ start, end }] active bookings (UTC ms)
 */
export function computeSlots({ tz, rules, exceptions = new Set(), busy = [], minutes, bufferMinutes = 0, noticeHours = 0, from, to, now }) {
  const out = [];
  const earliest = now + noticeHours * 60 * MINUTE;
  const step = (minutes + bufferMinutes) * MINUTE;
  const start = Math.max(from, now);
  const fromParts = zonedParts(start, tz);
  // Walk local calendar days from the start day until past `to`.
  for (let i = 0; i < 60; i += 1) {
    const dayStartUtc = zonedToUtc(fromParts.year, fromParts.month, fromParts.day + i, 0, tz);
    if (dayStartUtc > to) break;
    const p = zonedParts(dayStartUtc + 12 * 60 * MINUTE, tz);
    const key = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    if (exceptions.has(key)) continue;
    for (const rule of rules.filter((r) => r.weekday === p.weekday)) {
      for (let m = rule.startMinute; m + minutes <= rule.endMinute; m += minutes + bufferMinutes) {
        const s = zonedToUtc(p.year, p.month, p.day, m, tz);
        const e = s + minutes * MINUTE;
        if (s < earliest || s < from || s > to) continue;
        // Keep the buffer free around existing bookings too.
        const clash = busy.some((b) => s < b.end + bufferMinutes * MINUTE && e + bufferMinutes * MINUTE > b.start);
        if (!clash) out.push(s);
      }
    }
    if (out.length > 400) break;
  }
  void step;
  return [...new Set(out)].sort((a, b) => a - b);
}

export const DAY_MS = DAY;
