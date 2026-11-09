// Feature modules mounted on the API and background services, so app.mjs
// stays small and every module gets the same deps.

import { mountAppointmentsAdmin } from './admin/appointments.mjs';
import { mountCommunityAdmin } from './admin/community.mjs';
import { mountEconomics } from './admin/economics.mjs';
import { mountInsights } from './admin/insights.mjs';
import { mountModerationCenter } from './admin/moderation-center.mjs';
import { mountProsAdmin } from './admin/professionals.mjs';
import { mountAdmin } from './admin/routes.mjs';
import { mountSafety } from './admin/safety.mjs';
import { mountSensitive } from './admin/sensitive.mjs';
import { mountUsersAdmin } from './admin/users.mjs';
import { mountAnalytics } from './analytics/index.mjs';
import { mountCommunity, startCommunityRealtime } from './community/index.mjs';
import { mountPush, startPushService } from './notify/routes.mjs';
import { mountProfessionals } from './professional/index.mjs';
import { startScheduler } from './scheduler.mjs';
import { mountSupport } from './support/index.mjs';

// Order matters only for readability: every admin route checks its own permission.
export const FEATURE_MODULES = [
  mountCommunity,
  mountProfessionals,
  mountPush,
  mountAnalytics,
  mountSupport,
  mountAdmin,
  mountUsersAdmin,
  mountProsAdmin,
  mountAppointmentsAdmin,
  mountCommunityAdmin,
  mountModerationCenter,
  mountSafety,
  mountSensitive,
  mountInsights,
  mountEconomics,
];

export const SERVICES = [startCommunityRealtime, startScheduler, startPushService];

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
