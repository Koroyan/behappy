/**
 * Small rules that keep an art-reflection session consistent on the device
 * (pure, unit-tested in turnGuard.test.mjs). The three-phase flow itself is
 * unchanged; these only stop technical accidents:
 *
 *  - runIdFor: one run of a session = its start time. The server keeps the
 *    fingerprints of the first and changed drawing per run.
 *  - isStaleTurn: a reply that arrives after the stored conversation moved on
 *    (the screen was left and opened again and the person kept writing) must
 *    not overwrite the newer messages.
 *  - nextPhase: the phase the app stores after a reply — never backwards.
 */

export function runIdFor(startedAt: Date | string | number | undefined | null): string | undefined {
  if (!startedAt) return undefined;
  const ms = startedAt instanceof Date ? startedAt.getTime() : typeof startedAt === 'number' ? startedAt : Date.parse(startedAt);
  return Number.isFinite(ms) && ms > 0 ? `run-${ms}` : undefined;
}

/** True when the stored conversation no longer ends with the message this reply answers. */
export function isStaleTurn(stored: { id?: string; role?: string }[] | undefined | null, sentMessageId: string): boolean {
  if (!stored || !stored.length) return false;
  const last = stored[stored.length - 1];
  return last?.id !== sentMessageId;
}

/** The phase to keep after a reply: the reply's phase, but never lower than where the session was. */
export function nextPhase(current: 0 | 1 | 2, replied: unknown): 0 | 1 | 2 {
  const r = replied === 0 || replied === 1 || replied === 2 ? replied : current;
  return (r < current ? current : r) as 0 | 1 | 2;
}
