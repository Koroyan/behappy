// Server time. Business rules (memberships, trials, bookings, reminders) read
// the time from here, never directly from Date.now(), so tests and the
// development QA tools can move time forward to check expiry. The offset can
// only be changed when explicitly allowed (tests, DEV_TOOLS outside production).

export function createClock({ allowOffset = false, start = 0 } = {}) {
  let offset = start;
  return {
    now: () => Date.now() + offset,
    get offset() {
      return offset;
    },
    setOffset(ms) {
      if (!allowOffset) throw new Error('This clock cannot be moved.');
      offset = Number(ms) || 0;
    },
    advance(ms) {
      if (!allowOffset) throw new Error('This clock cannot be moved.');
      offset += Number(ms) || 0;
    },
  };
}
