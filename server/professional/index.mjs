// Wires professionals, verification, bookings, messages and memberships
// into the server.

import { staffFor } from '../admin/staff.mjs';
import { createCrypto } from '../crypto.mjs';
import { registerAccountDeletionHook } from '../lifecycle.mjs';
import { createSms } from '../notify/sms.mjs';
import { createBooking } from './booking.mjs';
import { createMembership } from './membership.mjs';
import { createMessaging } from './messaging.mjs';
import { createProfiles } from './profiles.mjs';
import { professionalRouters } from './routes.mjs';

const instances = new WeakMap();

export function professionalsFor(deps) {
  if (!instances.has(deps)) {
    const { db, config, clock, flitt } = deps;
    const fieldCrypto = deps.crypto || createCrypto({ ...config, persistDevKeys: !config.isProduction && Boolean(config.dataDir) && !deps.ephemeral });
    const sms = deps.sms || createSms({ ...(config.sms || {}), isProduction: config.isProduction, fixedCode: config.devTools && !config.isProduction ? config.devFixedCode || null : null });
    const emit = (accountId, event, payload) => deps.realtime?.toUser(accountId, event, payload);
    const membership = createMembership({ db, config, clock, crypto: fieldCrypto, flitt });
    const profiles = createProfiles({ db, config, clock, crypto: fieldCrypto, sms, hooks: { onApproved: (t, p, now) => membership.grantTrialOnApproval(t, p, now) } });
    const booking = createBooking({ db, clock, crypto: fieldCrypto, profiles, membership, emit });
    const messaging = createMessaging({ db, clock, crypto: fieldCrypto, profiles, membership, booking, emit });
    instances.set(deps, { profiles, membership, booking, messaging, sms, crypto: fieldCrypto });
  }
  return instances.get(deps);
}

export function mountProfessionals(app, deps) {
  const pro = professionalsFor(deps);
  const r = professionalRouters({ db: deps.db, config: deps.config, clock: deps.clock, pro, guard: (perm) => staffFor(deps).guard(perm) });
  app.use('/api/pros', r.directory);
  app.use('/api', r.client);
  app.use('/api/pro', r.workspace);
  app.use('/api/admin', r.admin);
  if (deps.config.devTools && !deps.config.isProduction) {
    app.get('/api/dev/sms', (req, res) => (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip) ? res.json({ message: pro.sms.lastTo(String(req.query.to || '')) }) : res.status(403).json({ error: 'local_only' })));
  }
  deps.meSections.push({
    name: 'professional',
    fn: async (q, account) => {
      const p = await pro.profiles.load(q, { accountId: account.id });
      if (!p) return null;
      const s = await pro.membership.state(q, p);
      return { id: p.id, status: p.status, membershipState: s.state, daysLeft: s.daysLeft, endsAt: s.endsAt, published: p.published, listed: await pro.profiles.isDiscoverable(q, p.id) };
    },
  });
  deps.meSections.push({
    name: 'client',
    fn: async (q, account) => {
      if (!account.registered) return { displayName: null, unreadMessages: 0 };
      return { displayName: await pro.booking.clientProfile(q, account.id), unreadMessages: await pro.messaging.unreadTotal(q, account) };
    },
  });
}

// Deleting an account: a client's bookings stay in the professional's
// records as "Former client" (the name snapshot is cleared, notes too); a
// professional's profile, documents, services and threads are deleted with
// the account (cascade); payment orders stay detached for accounting.
registerAccountDeletionHook('professionals', async (t, accountId) => {
  await t.query("update bookings set client_display_name = 'Former client', client_note_enc = null, client_note_iv = null, client_note_tag = null where client_account_id = $1", [accountId]);
  await t.query("update bookings set status = 'cancelled_by_client', cancel_reason = 'account_deleted', cancelled_at = now() where client_account_id = $1 and status in ('requested', 'confirmed') and starts_at > now()", [accountId]);
  await t.query("update pro_threads set client_display_name = 'Former client' where client_account_id = $1", [accountId]);
});
