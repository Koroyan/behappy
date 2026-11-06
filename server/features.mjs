// Feature modules mounted on the API and background services, so app.mjs
// stays small and every module gets the same deps.

import { mountAdmin } from './admin/routes.mjs';
import { mountCommunity, startCommunityRealtime } from './community/index.mjs';
import { mountProfessionals } from './professional/index.mjs';
import { startScheduler } from './scheduler.mjs';

export const FEATURE_MODULES = [mountCommunity, mountProfessionals, mountAdmin];

export const SERVICES = [startCommunityRealtime, startScheduler];

/** Starts background services (real-time rooms, the scheduler). */
export async function startFeatureServices({ server, app, deps }) {
  const started = [];
  for (const s of SERVICES) started.push(await s({ server, app, deps }));
  return {
    stop: async () => {
      for (const s of started) await s?.stop?.();
    },
  };
}
