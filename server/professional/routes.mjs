// HTTP API: directory, bookings, private messages, the professional's
// workspace and the admin verification desk.

import express from 'express';

import { buildReturnUrl, requestApiBase } from '../app.mjs';
import { optionalAccount, requireAccount, requireStaff } from '../auth.mjs';
import { getProfessionalCatalog } from '../catalog.mjs';
import { publicOrder } from '../payments.mjs';
import { DOCUMENT_KINDS, PAYMENT_METHODS, REVIEW_CHECKLIST, SERVICE_LANGUAGES, SPECIALIZATIONS } from './catalogs.mjs';
import { ProError } from './profiles.mjs';

const wrap = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (e instanceof ProError) return res.status(e.status).json({ error: e.code, ...e.extra });
    if (e?.status && e?.code && e.status < 600) return res.status(e.status).json({ error: e.code, message: e.message });
    throw e;
  }
};

export function professionalRouters({ db, config, clock, pro }) {
  const { profiles, membership, booking, messaging } = pro;
  const auth = requireAccount(db, { clock });
  const maybe = optionalAccount(db, { clock });
  const small = express.json({ limit: '64kb' });

  // ---------- Public directory ----------
  const directory = express.Router();
  directory.get('/catalog', (_req, res) =>
    res.json({
      specializations: SPECIALIZATIONS,
      paymentMethods: PAYMENT_METHODS,
      languages: SERVICE_LANGUAGES,
      documentKinds: DOCUMENT_KINDS,
      membership: getProfessionalCatalog(config.professional)[0],
      commissionPercent: 0,
      mode: 'test',
    })
  );
  directory.get('/', maybe, wrap(async (req) => ({ professionals: await profiles.search({ language: req.query.language, specialization: req.query.specialization, country: req.query.country, city: req.query.city, mode: req.query.mode, maxPrice: req.query.maxPrice, q: req.query.q }) })));
  directory.get('/:id', maybe, wrap(async (req) => ({ professional: await profiles.publicProfile(req.account || null, req.params.id) })));
  directory.get(
    '/:id/photo',
    maybe,
    wrap(async (req, res) => {
      const { bytes, mime } = await profiles.photo(req.account || null, req.params.id);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.type(mime).send(bytes);
    })
  );
  directory.get('/:id/slots', maybe, wrap((req) => booking.slots(req.params.id, String(req.query.serviceId || ''), { from: req.query.from, days: req.query.days })));

  // ---------- Client side: profile, bookings, messages ----------
  const client = express.Router();
  // Sign-in is checked per route: this router is mounted on /api and must not
  // catch paths that belong to other modules.
  const signedIn = [small, auth];
  client.get('/client/profile', ...signedIn, wrap(async (req) => ({ displayName: await booking.clientProfile(db, req.account.id) })));
  client.put('/client/profile', ...signedIn, wrap((req) => booking.setClientProfile(req.account, req.body?.displayName)));
  client.get('/bookings', ...signedIn, wrap(async (req) => ({ bookings: await booking.listForClient(req.account) })));
  client.post('/bookings', ...signedIn, wrap(async (req) => ({ booking: await booking.create(req.account, { professionalId: req.body?.professionalId, serviceId: req.body?.serviceId, startsAt: req.body?.startsAt, note: req.body?.note }) })));
  client.get('/bookings/:id', ...signedIn, wrap(async (req) => ({ booking: await booking.get(req.account, req.params.id) })));
  client.post('/bookings/:id/cancel', ...signedIn, wrap(async (req) => ({ booking: await booking.transition(req.account, req.params.id, 'cancel', { reason: req.body?.reason }) })));
  client.post(
    '/bookings/:id/reschedule',
    ...signedIn,
    wrap(async (req) => {
      const old = await booking.get(req.account, req.params.id);
      return { booking: await booking.create(req.account, { professionalId: old.professionalId, serviceId: req.body?.serviceId, startsAt: req.body?.startsAt, rescheduleOf: old.id }) };
    })
  );
  client.get('/threads', ...signedIn, wrap(async (req) => ({ threads: await messaging.list(req.account) })));
  client.post('/threads', ...signedIn, wrap(async (req) => ({ thread: await messaging.startInquiry(req.account, req.body?.professionalId, req.body?.body) })));
  client.get('/threads/:id', ...signedIn, wrap(async (req) => ({ thread: await messaging.open(req.account, req.params.id) })));
  client.post('/threads/:id/messages', ...signedIn, wrap(async (req) => ({ thread: await messaging.send(req.account, req.params.id, req.body?.body) })));
  client.post('/threads/:id/messages/:mid/report', ...signedIn, wrap((req) => messaging.report(req.account, req.params.id, req.params.mid, req.body?.reason, req.body?.details)));

  // ---------- The professional's workspace ----------
  const workspace = express.Router();
  workspace.use(auth);
  const own = async (req) => {
    const p = await profiles.load(db, { accountId: req.account.id });
    return p;
  };
  workspace.get(
    '/me',
    wrap(async (req) => {
      const p = await own(req);
      if (!p) return { profile: null };
      const [profile, state, stats, counts, unread] = await Promise.all([profiles.mine(req.account), membership.state(db, p), profiles.stats(req.account), booking.dashboardCounts(p), messaging.unreadTotal(db, req.account)]);
      return { profile, membership: state, stats, counts, unreadMessages: unread, listed: await profiles.isDiscoverable(db, p.id) };
    })
  );
  workspace.post('/application', small, wrap(async (req) => ({ profile: await profiles.start(req.account) })));
  workspace.put('/profile', small, wrap(async (req) => ({ profile: await profiles.update(req.account, req.body || {}) })));
  workspace.put('/qualifications', small, wrap(async (req) => ({ profile: await profiles.setQualifications(req.account, req.body?.qualifications) })));
  workspace.put('/services', small, wrap(async (req) => ({ profile: await profiles.setServices(req.account, req.body?.services) })));
  workspace.put('/availability', small, wrap(async (req) => ({ profile: await profiles.setAvailability(req.account, { rules: req.body?.rules, daysOff: req.body?.daysOff }) })));
  workspace.put('/photo', express.json({ limit: '3mb' }), wrap(async (req) => ({ profile: await profiles.setPhoto(req.account, { dataBase64: req.body?.dataBase64, mime: req.body?.mime }) })));
  workspace.post('/documents', express.json({ limit: '15mb' }), wrap(async (req) => ({ profile: await profiles.addDocument(req.account, req.body || {}) })));
  workspace.delete('/documents/:id', wrap(async (req) => ({ profile: await profiles.removeDocument(req.account, req.params.id) })));
  workspace.post('/phone', small, wrap((req) => profiles.startPhone(req.account, req.body?.phone)));
  workspace.post('/phone/verify', small, wrap(async (req) => ({ profile: await profiles.verifyPhone(req.account, req.body?.code) })));
  workspace.post('/submit', small, wrap(async (req) => ({ profile: await profiles.submit(req.account) })));
  workspace.post('/publish', small, wrap(async (req) => ({ profile: await profiles.setPublished(req.account, req.body?.published !== false) })));
  workspace.get('/bookings', wrap(async (req) => ({ bookings: await booking.listForProfessional(req.account, { scope: req.query.scope }) })));
  workspace.post(
    '/bookings/:id/:action',
    small,
    wrap(async (req) => {
      if (req.params.action === 'attendance') return { booking: await booking.markAttendance(req.account, req.params.id, req.body?.attendance) };
      if (!['confirm', 'decline', 'cancel'].includes(req.params.action)) throw new ProError(404, 'not_found');
      return { booking: await booking.transition(req.account, req.params.id, req.params.action, { reason: req.body?.reason }) };
    })
  );
  workspace.get('/membership', wrap((req) => membership.overview(req.account)));
  workspace.post(
    '/membership/checkout',
    small,
    wrap(async (req, res) => {
      const out = await membership.checkout(req.account, { returnUrl: buildReturnUrl(config, req.body?.returnTo), lang: String(req.body?.lang || 'en'), apiBase: requestApiBase(config, req) });
      res.status(201);
      return { order: publicOrder(out.order), checkoutUrl: out.checkoutUrl, product: out.product, mode: 'test' };
    })
  );
  workspace.post('/membership/cancel', small, wrap((req) => membership.setCancelled(req.account, true)));
  workspace.post('/membership/resume', small, wrap((req) => membership.setCancelled(req.account, false)));
  workspace.get('/membership/receipts/:orderId', wrap(async (req) => ({ receipt: await membership.receipt(req.account, req.params.orderId) })));

  // ---------- Admin: verification desk ----------
  const admin = express.Router();
  admin.use(small, auth, requireStaff('admin'));
  admin.get('/pros', wrap(async (req) => ({ professionals: await profiles.adminList({ status: req.query.status ? String(req.query.status) : undefined }), checklist: REVIEW_CHECKLIST })));
  admin.get('/pros/:id', wrap(async (req) => ({ professional: await profiles.adminGet(req.params.id), membership: await membership.state(db, await profiles.load(db, { id: req.params.id })) })));
  admin.get(
    '/pros/:id/documents/:docId',
    wrap(async (req, res) => {
      const d = await profiles.adminDocument(req.account, req.params.id, req.params.docId);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(d.fileName)}"`);
      res.type(d.mime).send(d.bytes);
    })
  );
  admin.post('/pros/:id/review', wrap((req) => profiles.review(req.account, req.params.id, req.body || {})));
  admin.post('/pros/:id/membership/grant', wrap((req) => membership.grant(req.account, req.params.id, req.body?.days, req.body?.reason)));

  return { directory, client, workspace, admin };
}
