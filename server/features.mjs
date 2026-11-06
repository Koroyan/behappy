// Feature modules mounted on the API and background services. Each phase of
// 3.0 adds its module here (community, professionals, bookings, memberships,
// admin), so app.mjs stays small and every module gets the same deps.

import { mountCommunity, startCommunityRealtime } from './community/index.mjs';

export const FEATURE_MODULES = [mountCommunity];

export const SERVICES = [startCommunityRealtime];

/** Starts background services (real-time rooms, the reminder scheduler). */
export async function startFeatureServices({ server, app, deps }) {
  const started = [];
  for (const s of SERVICES) started.push(await s({ server, app, deps }));
  return {
    stop: async () => {
      for (const s of started) await s?.stop?.();
    },
  };
}
