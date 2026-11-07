// Professionals in the staff tools: directory, document review outcomes,
// renewing or ending a verification, and country verification policies.
//
// Verification is never granted because of a payment, and nobody reviews
// their own application or approves their own policy draft. Country
// policies record their legal source; a draft becomes active only when a
// different person activates it with a review reference. Until then the
// built-in default applies (identity document and degree), which states
// that the country's rules have not been reviewed.

import express from 'express';

import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { DEFAULT_RULE, isCountry, setActivePolicies } from '../professional/catalogs.mjs';
import { professionalsFor } from '../professional/index.mjs';
import { primaryRole } from './permissions.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};
const needText = (v, min, code = 'reason_required', max = 500) => {
  const s = String(v || '').trim();
  if (s.length < min) fail(400, code);
  return s.slice(0, max);
};

const policyDto = (p) => ({
  id: Number(p.id),
  country: p.country,
  version: p.version,
  status: p.status,
  identityDocument: p.identity_document,
  degreeDocument: p.degree_document,
  licenseRequired: p.license_required,
  registryUrl: p.registry_url,
  notes: p.notes,
  sourceReference: p.source_reference,
  draftedBy: p.drafted_by,
  draftedAt: ms(p.drafted_at),
  approvedBy: p.approved_by,
  approvedAt: ms(p.approved_at),
  reviewReference: p.review_reference,
  retiredAt: ms(p.retired_at),
});

export function createProsAdmin(deps) {
  const { db, clock, config } = deps;
  const pro = professionalsFor(deps);
  const role = (a) => primaryRole(a.roles) || 'admin';

  async function reloadPolicies() {
    const r = await db.query("select * from country_policies where status = 'active'");
    setActivePolicies(r.rows.map(policyDto));
    return r.rowCount;
  }

  async function directory(query) {
    const params = [];
    const where = [];
    if (query.status) {
      params.push(String(query.status));
      where.push(`p.status = $${params.length}`);
    }
    if (query.country && isCountry(String(query.country).toUpperCase())) {
      params.push(String(query.country).toUpperCase());
      where.push(`p.country = $${params.length}`);
    }
    if (query.q) {
      params.push(`%${String(query.q).trim().slice(0, 80).split('%').join('')}%`);
      where.push(`(p.public_name ilike $${params.length} or p.legal_name ilike $${params.length} or p.city ilike $${params.length})`);
    }
    const r = await db.query(
      `select p.*, (select count(*)::int from bookings b where b.professional_id = p.id and b.created_at > $${params.length + 1}) as bookings30d,
              (select count(*)::int from verification_documents d where d.professional_id = p.id) as documents
       from professional_profiles p ${where.length ? `where ${where.join(' and ')}` : ''}
       order by p.updated_at desc limit 300`,
      [...params, ts(clock.now() - 30 * DAY)]
    );
    const now = clock.now();
    const out = [];
    for (const p of r.rows) {
      const s = await pro.membership.state(db, p, now);
      out.push({
        id: p.id,
        publicName: p.public_name,
        legalName: p.legal_name,
        country: p.country,
        city: p.city,
        status: p.status,
        published: p.published,
        listed: await pro.profiles.isDiscoverable(db, p.id, now),
        verifiedAt: ms(p.verified_at),
        verificationExpiresAt: ms(p.verification_expires_at),
        membership: { state: s.state, endsAt: s.endsAt },
        bookings30d: p.bookings30d,
        documents: p.documents,
        updatedAt: ms(p.updated_at),
      });
    }
    return { professionals: out };
  }

  async function loadPro(t, id) {
    const r = await t.query('select * from professional_profiles where id = $1 for update', [id]);
    if (!r.rows[0]) fail(404, 'not_found');
    return r.rows[0];
  }

  async function verificationEvent(t, p, to, actor, message) {
    await t.query("insert into verification_events (professional_id, from_status, to_status, actor_account_id, actor_kind, message, created_at) values ($1, $2, $3, $4, 'admin', $5, $6)", [p.id, p.status, to, actor.id, message, ts(clock.now())]);
  }

  async function reviewDocument(actor, proId, docId, { outcome, note }) {
    if (!['accepted', 'rejected', 'unclear'].includes(outcome)) fail(400, 'bad_outcome');
    const text = outcome === 'accepted' ? String(note || '').slice(0, 500) : needText(note, 5, 'note_required');
    return db.tx(async (t) => {
      const p = await loadPro(t, proId);
      if (p.account_id === actor.id) fail(403, 'cannot_review_self');
      const r = await t.query('update verification_documents set review_outcome = $3, reviewed_by = $4, reviewed_at = $5, review_note = $6 where id = $1 and professional_id = $2 returning id', [docId, proId, outcome, actor.id, ts(clock.now()), text || null]);
      if (!r.rowCount) fail(404, 'not_found');
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'verification_document.reviewed', targetType: 'professional', targetId: proId, metadata: { documentId: docId, outcome } });
      return { ok: true, outcome };
    });
  }

  async function renew(actor, proId, { reason, reviewReference }) {
    const why = needText(reason, 5);
    const ref = needText(reviewReference, 3, 'review_reference_required', 200);
    const now = clock.now();
    const until = now + (config.professional?.verificationValidDays || 365) * DAY;
    await db.tx(async (t) => {
      const p = await loadPro(t, proId);
      if (p.account_id === actor.id) fail(403, 'cannot_review_self');
      if (p.status !== 'approved') fail(409, 'bad_transition', { status: p.status });
      await t.query('update professional_profiles set verification_expires_at = $2, updated_at = $3 where id = $1', [proId, ts(until), ts(now)]);
      await verificationEvent(t, p, 'approved', actor, 'verification_renewed');
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'professional.verification_renewed', targetType: 'professional', targetId: proId, metadata: { until, reason: why, reviewReference: ref } });
      await notify(t, p.account_id, 'pro_verification', { status: 'approved', renewedUntil: until }, `verification:${proId}:renewed:${now}`);
    });
    return { ok: true, verificationExpiresAt: until };
  }

  async function expireNow(actor, proId, { reason }) {
    const why = needText(reason, 5);
    const now = clock.now();
    await db.tx(async (t) => {
      const p = await loadPro(t, proId);
      if (p.account_id === actor.id) fail(403, 'cannot_review_self');
      if (p.status !== 'approved') fail(409, 'bad_transition', { status: p.status });
      await t.query("update professional_profiles set status = 'expired', published = false, verification_expires_at = $2, updated_at = $2 where id = $1", [proId, ts(now)]);
      await verificationEvent(t, p, 'expired', actor, 'verification_ended_by_staff');
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'professional.verification_expired', targetType: 'professional', targetId: proId, metadata: { reason: why } });
      await notify(t, p.account_id, 'pro_verification', { status: 'expired' }, `verification:${proId}:expired:${now}`);
    });
    return { ok: true };
  }

  async function setMembershipStopped(actor, proId, stop, reason) {
    const why = needText(reason, 5);
    const now = clock.now();
    await db.tx(async (t) => {
      const p = await loadPro(t, proId);
      await t.query('update professional_profiles set membership_cancelled_at = $2, updated_at = $3 where id = $1', [proId, stop ? ts(now) : null, ts(now)]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: stop ? 'membership.stopped_by_staff' : 'membership.resumed_by_staff', targetType: 'professional', targetId: proId, metadata: { reason: why } });
      await notify(t, p.account_id, 'membership_changed', { stopped: stop }, `membership:${proId}:${stop ? 'stop' : 'resume'}:${now}`);
    });
    return { ok: true };
  }

  /** Corrects a membership period given by mistake (trial or staff grant). Paid periods are corrected only by a TEST refund. */
  async function revokePeriod(actor, proId, membershipId, reason) {
    const why = needText(reason, 5);
    await db.tx(async (t) => {
      const r = await t.query("update professional_memberships set revoked_at = $3, revoke_reason = $4 where id = $1 and professional_id = $2 and kind in ('trial', 'grant') and revoked_at is null returning kind", [Number(membershipId), proId, ts(clock.now()), `staff: ${why}`.slice(0, 300)]);
      if (!r.rowCount) fail(404, 'not_found');
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'membership.period_revoked', targetType: 'professional', targetId: proId, metadata: { membershipId: Number(membershipId), kind: r.rows[0].kind, reason: why } });
    });
    return { ok: true };
  }

  async function membershipPeriods(proId) {
    const r = await db.query('select id, kind, starts_at, ends_at, order_id, revoked_at, revoke_reason from professional_memberships where professional_id = $1 order by starts_at desc', [proId]);
    return r.rows.map((m) => ({ id: Number(m.id), kind: m.kind, startsAt: ms(m.starts_at), endsAt: ms(m.ends_at), orderId: m.order_id, revokedAt: ms(m.revoked_at), revokeReason: m.revoke_reason }));
  }

  async function documents(proId) {
    const r = await db.query('select id, kind, file_name, mime, size_bytes, uploaded_at, review_outcome, reviewed_by, reviewed_at, review_note from verification_documents where professional_id = $1 order by uploaded_at', [proId]);
    return r.rows.map((d) => ({ id: d.id, kind: d.kind, fileName: d.file_name, mime: d.mime, size: d.size_bytes, uploadedAt: ms(d.uploaded_at), review: d.review_outcome ? { outcome: d.review_outcome, by: d.reviewed_by, at: ms(d.reviewed_at), note: d.review_note } : null }));
  }

  // ---------- Country policies ----------
  async function policies(query) {
    const params = [];
    let where = '';
    if (query.country && isCountry(String(query.country).toUpperCase())) {
      params.push(String(query.country).toUpperCase());
      where = 'where country = $1';
    }
    const r = await db.query(`select * from country_policies ${where} order by country, version desc`, params);
    return { policies: r.rows.map(policyDto), defaultRule: DEFAULT_RULE };
  }

  async function draftPolicy(actor, body) {
    const country = String(body.country || '').toUpperCase();
    if (!isCountry(country)) fail(400, 'bad_country');
    const source = needText(body.sourceReference, 5, 'source_required', 300);
    const url = body.registryUrl ? String(body.registryUrl).trim().slice(0, 300) : null;
    if (url && !/^https:[/][/]/.test(url)) fail(400, 'bad_url');
    return db.tx(async (t) => {
      const v = await t.query('select coalesce(max(version), 0) + 1 as v from country_policies where country = $1', [country]);
      const r = await t.query(
        `insert into country_policies (country, version, identity_document, degree_document, license_required, registry_url, notes, source_reference, drafted_by, drafted_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [country, v.rows[0].v, body.identityDocument !== false, body.degreeDocument !== false, body.licenseRequired === true, url, body.notes ? String(body.notes).slice(0, 1500) : null, source, actor.id, ts(clock.now())]
      );
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'policy.drafted', targetType: 'country_policy', targetId: r.rows[0].id, metadata: { country, version: r.rows[0].version } });
      return { policy: policyDto(r.rows[0]) };
    });
  }

  async function activatePolicy(actor, id, { reviewReference }) {
    const ref = needText(reviewReference, 5, 'review_reference_required', 300);
    const out = await db.tx(async (t) => {
      const r = await t.query('select * from country_policies where id = $1 for update', [Number(id)]);
      const p = r.rows[0];
      if (!p) fail(404, 'not_found');
      if (p.status !== 'draft') fail(409, 'not_a_draft');
      if (p.drafted_by === actor.id) fail(403, 'cannot_approve_own_draft');
      const now = ts(clock.now());
      await t.query("update country_policies set status = 'retired', retired_at = $2 where country = $1 and status = 'active'", [p.country, now]);
      const a = await t.query("update country_policies set status = 'active', approved_by = $2, approved_at = $3, review_reference = $4 where id = $1 returning *", [p.id, actor.id, now, ref]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: 'policy.activated', targetType: 'country_policy', targetId: p.id, metadata: { country: p.country, version: p.version, reviewReference: ref } });
      return policyDto(a.rows[0]);
    });
    await reloadPolicies();
    return { policy: out };
  }

  async function closePolicy(actor, id, { reason }, to) {
    const why = needText(reason, 5);
    const out = await db.tx(async (t) => {
      const r = await t.query('select * from country_policies where id = $1 for update', [Number(id)]);
      const p = r.rows[0];
      if (!p) fail(404, 'not_found');
      if (to === 'withdrawn' && p.status !== 'draft') fail(409, 'not_a_draft');
      if (to === 'retired' && p.status !== 'active') fail(409, 'not_active');
      await t.query('update country_policies set status = $2, retired_at = $3 where id = $1', [p.id, to, ts(clock.now())]);
      await audit(t, { actorId: actor.id, actorRole: role(actor), action: `policy.${to}`, targetType: 'country_policy', targetId: p.id, metadata: { country: p.country, version: p.version, reason: why } });
      return { ok: true };
    });
    await reloadPolicies();
    return out;
  }

  return { reloadPolicies, directory, reviewDocument, renew, expireNow, setMembershipStopped, revokePeriod, membershipPeriods, documents, policies, draftPolicy, activatePolicy, closePolicy };
}

export function mountProsAdmin(app, deps) {
  const admin = createProsAdmin(deps);
  deps.prosAdmin = admin;
  admin.reloadPolicies().catch((e) => console.error('[policies] load failed', e?.message));
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/professionals', ...can('professionals.view'), handle((req) => admin.directory(req.query)));
  r.get('/professionals/:id/documents', ...can('professionals.view'), handle(async (req) => ({ documents: await admin.documents(req.params.id) })));
  r.get('/professionals/:id/memberships', ...can('memberships.view'), handle(async (req) => ({ periods: await admin.membershipPeriods(req.params.id) })));
  r.post('/professionals/:id/documents/:docId/review', ...can('professionals.verify'), handle((req) => admin.reviewDocument(req.account, req.params.id, req.params.docId, req.body || {})));
  r.post('/professionals/:id/verification/renew', ...can('professionals.manage'), handle((req) => admin.renew(req.account, req.params.id, req.body || {})));
  r.post('/professionals/:id/verification/expire', ...can('professionals.manage'), handle((req) => admin.expireNow(req.account, req.params.id, req.body || {})));
  r.post('/professionals/:id/membership/stop', ...can('memberships.manage'), handle((req) => admin.setMembershipStopped(req.account, req.params.id, true, req.body?.reason)));
  r.post('/professionals/:id/membership/resume', ...can('memberships.manage'), handle((req) => admin.setMembershipStopped(req.account, req.params.id, false, req.body?.reason)));
  r.post('/professionals/:id/membership/:membershipId/revoke', ...can('memberships.manage'), handle((req) => admin.revokePeriod(req.account, req.params.id, req.params.membershipId, req.body?.reason)));
  r.get('/policies', ...can('professionals.view'), handle((req) => admin.policies(req.query)));
  r.post('/policies', ...can('policies.edit'), handle((req) => admin.draftPolicy(req.account, req.body || {})));
  r.post('/policies/:id/activate', ...can('policies.approve'), handle((req) => admin.activatePolicy(req.account, req.params.id, req.body || {})));
  r.post('/policies/:id/withdraw', ...can('policies.edit'), handle((req) => admin.closePolicy(req.account, req.params.id, req.body || {}, 'withdrawn')));
  r.post('/policies/:id/retire', ...can('policies.approve'), handle((req) => admin.closePolicy(req.account, req.params.id, req.body || {}, 'retired')));
  app.use('/api/admin', r);
}
