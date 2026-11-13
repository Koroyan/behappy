// Is this computer's clock right? Compared once at start with the Date header
// of a service the server already talks to (Flitt). A wrong clock breaks
// things quietly: Apple refuses Web Push signed with it (403
// ExpiredProviderToken), reminders go out hours late, sessions and offers
// expire at the wrong time. Never blocks the start; only says so, loudly.

const LIMIT_SECONDS = 120;

export function describeSkew(seconds) {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.round((abs % 3600) / 60);
  return `${h ? `${h} h ` : ''}${m} min ${seconds < 0 ? 'behind' : 'ahead'}`;
}

/** Seconds the local clock is off (positive: the real time is later), or null if unknown. */
export async function measureClockSkew(url, fetchImpl = globalThis.fetch) {
  try {
    const started = Date.now();
    const res = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    const remote = Date.parse(res.headers.get('date') || '');
    if (!Number.isFinite(remote)) return null;
    const local = (started + Date.now()) / 2;
    return Math.round((remote - local) / 1000);
  } catch {
    return null;
  }
}

export async function warnIfClockIsWrong(url, log = console.warn) {
  const skew = await measureClockSkew(url);
  if (skew === null || Math.abs(skew) <= LIMIT_SECONDS) return skew;
  log(
    `[clock] This computer's clock is ${describeSkew(-skew)} (compared with ${new URL(url).host}). ` +
      'Web Push to iPhones fails with it (Apple: ExpiredProviderToken), and reminders and expiry times are off. ' +
      'Turn on automatic time (Windows: Settings → Time & language → Date & time → Set time automatically → Sync now; servers: NTP).'
  );
  return skew;
}
