// Wires the community into the server: HTTP routes, real-time rooms, the
// Anulia helper, the account-deletion hook and the /api/account/me section.

import { registerAccountDeletionHook } from '../lifecycle.mjs';
import { createCommunityAnulia } from './anulia.mjs';
import { seedCommunity } from './constants.mjs';
import { createModeration } from './moderation.mjs';
import { startRealtime } from './realtime.mjs';
import { settingsFor } from '../admin/settings.mjs';
import { staffFor } from '../admin/staff.mjs';
import { communityRouter, moderationRouter } from './routes.mjs';
import { createBus, createCommunity } from './service.mjs';

// One community instance per app (tests start several apps in one process).
const instances = new WeakMap();
export function communityFor(deps) {
  if (!instances.has(deps)) {
    const bus = createBus();
    const community = createCommunity({ db: deps.db, clock: deps.clock, bus });
    const moderation = createModeration({ db: deps.db, clock: deps.clock, bus });
    community.onAnulia(createCommunityAnulia({ db: deps.db, config: deps.config, fetchImpl: deps.fetchImpl, clock: deps.clock, bus, settings: settingsFor(deps) }));
    instances.set(deps, { bus, community, moderation, seeded: seedCommunity(deps.db) });
  }
  return instances.get(deps);
}

/** Express mount (FEATURE_MODULES). */
export function mountCommunity(app, deps) {
  const c = communityFor(deps);
  app.use('/api/community', async (_req, _res, next) => {
    await c.seeded;
    next();
  });
  app.use('/api/community', communityRouter({ db: deps.db, clock: deps.clock, community: c.community }));
  app.use('/api/moderation', moderationRouter({ db: deps.db, clock: deps.clock, moderation: c.moderation, guard: (perm) => staffFor(deps).guard(perm) }));
  deps.meSections.push({ name: 'community', fn: (q, account) => c.community.meSection(q, account) });
}

/** Background service (SERVICES): Socket.IO on the same HTTP server. */
export async function startCommunityRealtime({ server, deps }) {
  const c = communityFor(deps);
  await c.seeded;
  return startRealtime({ server, deps, community: c.community });
}

// When an account is deleted its messages are emptied and shown as "Former
// member"; replies around them stay readable. Reactions, memberships, blocks,
// mutes and the community profile go with the account (foreign keys).
registerAccountDeletionHook('community', async (t, accountId) => {
  await t.query(
    `update community_messages set body = '', author_pseudonym = null,
       status = case when status in ('visible', 'held') then 'deleted' else status end,
       flags = flags || '{"authorDeleted": true}'::jsonb
     where author_account_id = $1`,
    [accountId]
  );
});
