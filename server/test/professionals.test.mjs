// Run: node --test server/test/professionals.test.mjs
// Professional applications, independent verification, the directory,
// bookings with slot locking, private messages and the BeHappy Professional
// membership (14-day trial at approval, 79 GEL / 30 days, 0% commission).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { mountAppointmentsAdmin } from '../admin/appointments.mjs';
import { mountProsAdmin } from '../admin/professionals.mjs';
import { mountSensitive } from '../admin/sensitive.mjs';
import { mountAdmin } from '../admin/routes.mjs';
import { mountCommunity } from '../community/index.mjs';
import { mountProfessionals } from '../professional/index.mjs';
import { runAllJobs } from '../scheduler.mjs';
import { signedCallback, startTestServer } from './helpers.mjs';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
const PDF = Buffer.from('%PDF-1.4 test document').toString('base64');

describe('Professionals', () => {
  let t;
  let admin;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountAdmin, mountProsAdmin, mountAppointmentsAdmin, mountSensitive], config: { devFixedCode: '123456', devTools: true } });
    admin = await t.registered('desk-admin@example.org');
    await t.grantRole(admin.accountId, 'admin');
  });
  after(() => t.stop());

  /** A complete application, ready to submit. */
  async function applicant(name, { phone = `+99559${Math.floor(1000000 + Math.random() * 8999999)}`, license = `PSY-${Math.floor(Math.random() * 1e6)}` } = {}) {
    const u = await t.registered(`${name.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    assert.equal((await call(u, '/api/pro/application', 'POST', {})).status, 200);
    const upd = await call(u, '/api/pro/profile', 'PUT', {
      legalName: `${name} Beridze`,
      publicName: `${name} B.`,
      country: 'GE',
      city: 'Tbilisi',
      bio: 'I work with adults who live with anxiety, panic and burnout, using evidence-based approaches and a calm, practical style.',
      experienceYears: 8,
      languages: ['ka', 'en'],
      confirmLanguages: true,
      specializations: ['anxiety', 'panic'],
      offersOnline: true,
      timezone: 'Asia/Tbilisi',
      paymentArrangement: 'You pay me directly by bank transfer after the session.',
      paymentMethods: ['bank_transfer'],
      cancellationPolicy: 'Free cancellation until 24 hours before.',
      cancellationNoticeHours: 24,
      bookingNoticeHours: 2,
      bufferMinutes: 10,
    });
    assert.equal(upd.status, 200, JSON.stringify(upd.json));
    await call(u, '/api/pro/qualifications', 'PUT', { qualifications: [{ kind: 'degree', title: 'MSc Clinical Psychology', institution: 'Tbilisi State University', year: 2016 }, { kind: 'license', title: 'Psychologist registration', number: license, country: 'GE' }] });
    await call(u, '/api/pro/services', 'PUT', { services: [{ title: 'Online session', mode: 'online', minutes: 50, priceMinor: 12000 }] });
    await call(u, '/api/pro/availability', 'PUT', { rules: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 18 * 60 })), daysOff: [] });
    for (const kind of ['identity', 'degree']) assert.equal((await call(u, '/api/pro/documents', 'POST', { kind, fileName: `${kind}.pdf`, mime: 'application/pdf', dataBase64: PDF })).status, 200);
    assert.equal((await call(u, '/api/pro/phone', 'POST', { phone })).status, 200);
    assert.equal((await call(u, '/api/pro/phone/verify', 'POST', { code: '123456' })).status, 200);
    return { ...u, phone, license };
  }

  const approve = async (u, extra = {}) => {
    const me = await call(u, '/api/pro/me');
    return call(admin, `/api/admin/pros/${me.json.profile.id}/review`, 'POST', { action: 'approve', checklist: { identity_matches: true, degree_verified: true }, ...extra });
  };

  test('staff tools: country policies need a source and someone else to activate them; documents get review outcomes', async () => {
    const verifier = await t.registered(`verifier-${Date.now()}@example.org`);
    await t.grantRole(verifier.accountId, 'verifier');
    const draft = await call(verifier, '/api/admin/policies', 'POST', { country: 'AM', licenseRequired: true, sourceReference: 'Ministry of Health order 2024 (to confirm with counsel)', registryUrl: 'https://example.org/registry' });
    assert.equal(draft.status, 200, JSON.stringify(draft.json));
    assert.equal(draft.json.policy.status, 'draft');
    assert.equal((await call(verifier, '/api/admin/policies', 'POST', { country: 'AM' })).json.error, 'source_required');
    // A verifier can draft but not activate; an admin can activate someone else's draft with a review reference.
    assert.equal((await call(verifier, `/api/admin/policies/${draft.json.policy.id}/activate`, 'POST', { reviewReference: 'Legal review 12' })).json.error, 'forbidden');
    await call(admin, '/api/admin/step-up', 'POST', { password: admin.password });
    assert.equal((await call(admin, `/api/admin/policies/${draft.json.policy.id}/activate`, 'POST', {})).json.error, 'review_reference_required');
    const own = await call(admin, '/api/admin/policies', 'POST', { country: 'AZ', sourceReference: 'Draft by the admin themselves' });
    assert.equal((await call(admin, `/api/admin/policies/${own.json.policy.id}/activate`, 'POST', { reviewReference: 'Legal review 13' })).json.error, 'cannot_approve_own_draft');
    const active = await call(admin, `/api/admin/policies/${draft.json.policy.id}/activate`, 'POST', { reviewReference: 'Legal review 12, 2026-11-07' });
    assert.equal(active.json.policy.status, 'active');
    // The reviewed policy now applies to applications from that country.
    const armenian = await t.registered(`am-${Date.now()}@example.org`);
    await call(armenian, '/api/pro/application', 'POST', {});
    await call(armenian, '/api/pro/profile', 'PUT', { country: 'AM', city: 'Yerevan' });
    const me = await call(armenian, '/api/pro/me');
    assert.equal(me.json.profile.rule.reviewed, true);
    assert.equal(me.json.profile.rule.licenseRequired, true);
    assert.ok(me.json.profile.missing.includes('license_document'));
    assert.equal((await call(admin, `/api/admin/policies/${draft.json.policy.id}/retire`, 'POST', { reason: 'superseded by counsel advice' })).status, 200);
    assert.equal((await call(armenian, '/api/pro/me')).json.profile.rule.reviewed, false, 'back to the default');

    // Document outcomes: a rejection needs a note; nobody reviews their own documents.
    const u = await applicant('Ana');
    const proId = (await call(u, '/api/pro/me')).json.profile.id;
    const docs = (await call(verifier, `/api/admin/professionals/${proId}/documents`)).json.documents;
    assert.equal(docs.length, 2);
    assert.equal((await call(verifier, `/api/admin/professionals/${proId}/documents/${docs[0].id}/review`, 'POST', { outcome: 'rejected' })).json.error, 'note_required');
    assert.equal((await call(verifier, `/api/admin/professionals/${proId}/documents/${docs[0].id}/review`, 'POST', { outcome: 'unclear', note: 'The scan is too dark to read.' })).status, 200);
    assert.equal((await call(verifier, `/api/admin/professionals/${proId}/documents`)).json.documents[0].review.outcome, 'unclear');
    await t.grantRole(u.accountId, 'verifier');
    assert.equal((await call(u, `/api/admin/professionals/${proId}/documents/${docs[1].id}/review`, 'POST', { outcome: 'accepted' })).json.error, 'cannot_review_self');
  });

  test('staff tools: renewing and ending a verification, and cancelling an appointment for BeHappy tells both people', async () => {
    const pro = await applicant('Dato');
    await call(pro, '/api/pro/submit', 'POST', {});
    await approve(pro);
    await call(pro, '/api/pro/publish', 'POST', { published: true });
    const me = (await call(pro, '/api/pro/me')).json.profile;
    await call(admin, '/api/admin/step-up', 'POST', { password: admin.password });
    assert.equal((await call(admin, `/api/admin/professionals/${me.id}/verification/renew`, 'POST', { reason: 'annual check done' })).json.error, 'review_reference_required');
    const renewed = await call(admin, `/api/admin/professionals/${me.id}/verification/renew`, 'POST', { reason: 'annual check done', reviewReference: 'Registry check 2026-11' });
    assert.equal(renewed.status, 200);

    const client = await t.registered();
    await call(client, '/api/client/profile', 'PUT', { displayName: 'Mzia' });
    const slots = (await t.api(`/api/pros/${me.id}/slots?serviceId=${me.services[0].id}&days=3`)).json.slots;
    const booked = await call(client, '/api/bookings', 'POST', { professionalId: me.id, serviceId: me.services[0].id, startsAt: slots[2], note: 'Private note for the specialist' });
    assert.equal(booked.status, 200, JSON.stringify(booked.json));
    const bookingId = booked.json.booking.id;
    const support = await t.registered(`support-${Date.now()}@example.org`);
    await t.grantRole(support.accountId, 'support');
    const seen = await call(support, `/api/admin/appointments/${bookingId}`);
    assert.equal(seen.status, 200);
    assert.equal(seen.json.appointment.hasClientNote, true);
    assert.ok(!JSON.stringify(seen.json).includes('Private note'), 'the note itself is never shown');
    assert.equal((await call(support, `/api/admin/appointments/${bookingId}/cancel`, 'POST', { reason: 'specialist unavailable' })).json.error, 'forbidden');
    assert.equal((await call(admin, `/api/admin/appointments/${bookingId}/cancel`, 'POST', { reason: 'short' })).json.error, 'reason_required');
    const cancelled = await call(admin, `/api/admin/appointments/${bookingId}/cancel`, 'POST', { reason: 'The specialist is temporarily unavailable.', messageToClient: 'Sorry, please choose another specialist.' });
    assert.equal(cancelled.json.notified, 2);
    assert.equal((await call(client, `/api/bookings/${bookingId}`)).json.booking.status, 'cancelled_by_admin');
    const kinds = (await call(client, '/api/notifications')).json.notifications.map((n) => n.kind);
    assert.ok(kinds.includes('booking_cancelled_by_admin'));
    assert.ok((await call(pro, '/api/notifications')).json.notifications.some((n) => n.kind === 'booking_cancelled_by_admin'));
    assert.equal((await call(admin, `/api/admin/appointments/${bookingId}/cancel`, 'POST', { reason: 'The specialist is temporarily unavailable.' })).json.error, 'not_active');

    // Protected data: off by default; one item, a purpose and lawful basis, approved by someone else, time-limited, logged.
    const owner = await t.registered(`owner-${Date.now()}@example.org`);
    await t.grantRole(owner.accountId, 'owner');
    const request = { category: 'booking_notes', resourceId: bookingId, purpose: 'Police request about a threat written in this booking note.', lawfulBasis: 'legal_obligation', ticketRef: 'LEG-2026-14' };
    assert.equal((await call(admin, '/api/admin/sensitive/requests', 'POST', request)).json.error, 'feature_disabled');
    await call(owner, '/api/admin/step-up', 'POST', { password: owner.password });
    assert.equal((await call(owner, '/api/admin/settings/features.sensitiveAccess', 'PUT', { value: true, reason: 'formal request received' })).status, 200);
    t.clock.advance(6000);
    assert.equal((await call(admin, '/api/admin/sensitive/requests', 'POST', { ...request, purpose: 'too short' })).json.error, 'purpose_required');
    const asked = await call(admin, '/api/admin/sensitive/requests', 'POST', request);
    assert.equal(asked.status, 200, JSON.stringify(asked.json));
    const rid = asked.json.request.id;
    assert.equal((await call(admin, `/api/admin/sensitive/requests/${rid}/view`)).json.error, 'not_approved');
    assert.equal((await call(admin, `/api/admin/sensitive/requests/${rid}/decide`, 'POST', { approve: true, note: 'Looks justified to me.' })).json.error, 'forbidden', 'admins cannot approve');
    const ownRequest = await call(owner, '/api/admin/sensitive/requests', 'POST', request);
    assert.equal((await call(owner, `/api/admin/sensitive/requests/${ownRequest.json.request.id}/decide`, 'POST', { approve: true, note: 'Approving my own request.' })).json.error, 'cannot_approve_own_request');
    assert.equal((await call(owner, `/api/admin/sensitive/requests/${rid}/decide`, 'POST', { approve: true, note: 'Formal police request LEG-2026-14 checked.', hours: 2 })).status, 200);
    const opened = await call(admin, `/api/admin/sensitive/requests/${rid}/view`);
    assert.equal(opened.json.data.note, 'Private note for the specialist');
    assert.equal((await call(owner, `/api/admin/sensitive/requests/${rid}/view`)).json.error, 'not_your_request');
    assert.equal((await t.db.query("select count(*)::int as n from audit_log where action = 'sensitive.viewed'")).rows[0].n, 1);
    t.clock.advance(3 * 60 * 60 * 1000);
    assert.equal((await call(admin, `/api/admin/sensitive/requests/${rid}/view`)).json.error, 'step_up_required', 'the confirmation expired too');
    await call(admin, '/api/admin/step-up', 'POST', { password: admin.password });
    assert.equal((await call(admin, `/api/admin/sensitive/requests/${rid}/view`)).json.error, 'not_approved', 'the approval expires');

    // Ending a verification takes the profile out of the directory.
    assert.equal((await call(admin, `/api/admin/professionals/${me.id}/verification/expire`, 'POST', { reason: 'licence lapsed per registry' })).status, 200);
    assert.equal((await call(pro, '/api/pro/me')).json.profile.status, 'expired');
    assert.equal((await t.api(`/api/pros/${me.id}`)).status, 404);
  });

  test('an application lists what is missing and locks while under review', async () => {
    const u = await t.registered();
    await call(u, '/api/pro/application', 'POST', {});
    const early = await call(u, '/api/pro/submit', 'POST', {});
    assert.equal(early.status, 400);
    assert.ok(early.json.missing.includes('phone_verified'));
    assert.ok(early.json.missing.includes('identity_document'));
    const ready = await applicant('Nino');
    assert.equal((await call(ready, '/api/pro/submit', 'POST', {})).status, 200);
    const me = await call(ready, '/api/pro/me');
    assert.equal(me.json.profile.status, 'submitted');
    assert.equal(me.json.membership.state, 'verification_pending', 'no trial is spent while waiting');
    assert.equal((await call(ready, '/api/pro/profile', 'PUT', { bio: 'changed while under review' })).json.error, 'locked_during_review');
  });

  test('documents are encrypted at rest; only admins can open them, and every view is audited', async () => {
    const u = await applicant('Tamar');
    const me = await call(u, '/api/pro/me');
    const doc = me.json.profile.documents[0];
    const raw = await t.db.query('select ciphertext from verification_documents where id = $1', [doc.id]);
    assert.ok(!Buffer.from(raw.rows[0].ciphertext).toString('latin1').includes('%PDF'), 'stored encrypted');
    assert.equal((await call(u, `/api/admin/pros/${me.json.profile.id}/documents/${doc.id}`)).status, 403);
    // Identity documents need a fresh password confirmation, even for an admin (earlier ones have lapsed).
    t.clock.advance(16 * 60 * 1000);
    assert.equal((await call(admin, `/api/admin/pros/${me.json.profile.id}/documents/${doc.id}`)).json.error, 'step_up_required');
    assert.equal((await call(admin, '/api/admin/step-up', 'POST', { password: admin.password })).status, 200);
    const res = await fetch(`${t.base}/api/admin/pros/${me.json.profile.id}/documents/${doc.id}`, { headers: { Authorization: `Bearer ${admin.token}` } });
    assert.equal(res.status, 200);
    assert.ok((await res.text()).startsWith('%PDF'));
    const audit = await t.db.query("select count(*)::int as n from audit_log where action = 'verification_document.viewed' and target_id = $1", [me.json.profile.id]);
    assert.equal(audit.rows[0].n, 1);
  });

  test('admin review: request info, resubmit, approve; rejection is final; staff only', async () => {
    const u = await applicant('Levan');
    await call(u, '/api/pro/submit', 'POST', {});
    const id = (await call(u, '/api/pro/me')).json.profile.id;
    assert.equal((await call(u, `/api/admin/pros/${id}/review`, 'POST', { action: 'approve' })).status, 403, 'not an admin');
    assert.equal((await call(admin, `/api/admin/pros/${id}/review`, 'POST', { action: 'request_info' })).json.error, 'message_required');
    assert.equal((await call(admin, `/api/admin/pros/${id}/review`, 'POST', { action: 'request_info', message: 'Please upload a clearer copy of your diploma.' })).status, 200);
    const me = await call(u, '/api/pro/me');
    assert.equal(me.json.profile.status, 'more_info_required');
    assert.equal(me.json.profile.events[0].message, 'Please upload a clearer copy of your diploma.');
    assert.ok((await call(u, '/api/notifications')).json.notifications.some((n) => n.kind === 'pro_verification'));
    assert.equal((await call(u, '/api/pro/submit', 'POST', {})).status, 200);
    assert.equal((await approve(u)).status, 200);
    const other = await applicant('Gia');
    await call(other, '/api/pro/submit', 'POST', {});
    const oid = (await call(other, '/api/pro/me')).json.profile.id;
    assert.equal((await call(admin, `/api/admin/pros/${oid}/review`, 'POST', { action: 'reject', message: 'The licence number could not be found in the register.' })).status, 200);
    assert.equal((await call(other, '/api/pro/submit', 'POST', {})).json.error, 'not_submittable');
  });

  test('approval starts the 14-day trial; verified + published + active membership = listed', async () => {
    const u = await applicant('Salome');
    await call(u, '/api/pro/submit', 'POST', {});
    const approved = await approve(u);
    assert.equal(approved.json.trial.granted, true);
    let me = (await call(u, '/api/pro/me')).json;
    assert.equal(me.membership.state, 'trial_active');
    assert.equal(me.membership.daysLeft, 14);
    assert.equal(me.listed, false, 'not listed until the professional publishes');
    await call(u, '/api/pro/publish', 'POST', { published: true });
    me = (await call(u, '/api/pro/me')).json;
    assert.equal(me.listed, true);
    const search = await t.api('/api/pros?language=ka&specialization=panic');
    const found = search.json.professionals.find((p) => p.id === me.profile.id);
    assert.ok(found, 'listed in the directory');
    assert.equal(found.verified, true);
    for (const secret of ['legalName', 'contactEmail', 'phone', 'inPersonAddress']) assert.ok(!found[secret], `${secret} is never public`);
    assert.equal(found.priceFromMinor, 12000);
    assert.equal((await t.api('/api/pros?language=ja')).json.professionals.some((p) => p.id === me.profile.id), false, 'service languages are filtered');
  });

  test('a paid pass never verifies anyone; unverified applicants cannot pay or be listed', async () => {
    const u = await applicant('Ana');
    await call(u, '/api/pro/submit', 'POST', {});
    const pay = await call(u, '/api/pro/membership/checkout', 'POST', {});
    assert.equal(pay.status, 409);
    assert.equal(pay.json.error, 'verification_required');
    assert.equal((await call(u, '/api/pro/publish', 'POST', { published: true })).json.error, 'not_verified');
    // Even an approved Flitt order for this profile changes nothing about verification.
    const me = (await call(u, '/api/pro/me')).json;
    await t.db.query("insert into orders (id, account_id, professional_id, product_id, product_kind, duration_days, amount_minor, currency, status, created_at, updated_at) values ('bh-forged', $1, $2, 'professional_30d', 'professional', 30, 7900, 'GEL', 'created', now(), now())", [u.accountId, me.profile.id]);
    await t.api('/api/payments/flitt/callback', { method: 'POST', body: signedCallback({ id: 'bh-forged', amountMinor: 7900, currency: 'GEL' }) });
    const after = (await call(u, '/api/pro/me')).json;
    assert.equal(after.profile.status, 'submitted');
    assert.equal(after.profile.verified, false);
    assert.equal(after.listed, false);
  });

  test('one free trial per person: the same phone or licence number cannot start another', async () => {
    const first = await applicant('Maka', { phone: '+995591112233', license: 'GE-TRIAL-1' });
    await call(first, '/api/pro/submit', 'POST', {});
    assert.equal((await approve(first)).json.trial.granted, true);
    const again = await applicant('Maka2', { phone: '+995591112233', license: 'OTHER-9' });
    await call(again, '/api/pro/submit', 'POST', {});
    const res = await approve(again);
    assert.equal(res.json.trial.granted, false);
    assert.equal(res.json.trial.reason, 'trial_used_before');
    const again_ = (await call(again, '/api/pro/me')).json.membership;
    assert.equal(again_.state, 'not_started', 'verified, but no free period');
    assert.equal(again_.trialRefused, true, 'the professional is told why there is no trial');
    assert.equal(again_.active, false);
  });

  test('membership checkout: 79 GEL / 30 days from the server catalog; approve, duplicate, refund', async () => {
    const u = await applicant('Dato');
    await call(u, '/api/pro/submit', 'POST', {});
    await approve(u);
    const co = await call(u, '/api/pro/membership/checkout', 'POST', { returnTo: { platform: 'web', origin: 'http://app.test', path: '/pro/membership' } });
    assert.equal(co.status, 201);
    assert.equal(co.json.order.amountMinor, 7900);
    assert.equal(co.json.order.durationDays, 30);
    assert.equal(co.json.order.productKind, 'professional');
    assert.equal(t.flitt.created.at(-1).amountMinor, 7900);
    // A consumer checkout can't buy the professional pass.
    assert.equal((await call(u, '/api/payments/checkout', 'POST', { productId: 'professional_30d' })).status, 400);
    const before = (await call(u, '/api/pro/me')).json.membership;
    const order = { id: co.json.order.id, amountMinor: 7900, currency: 'GEL' };
    assert.equal((await t.api('/api/payments/flitt/callback', { method: 'POST', body: { ...signedCallback(order), signature: 'forged' } })).status, 400, 'forged callback refused');
    assert.equal((await t.api('/api/payments/flitt/callback', { method: 'POST', body: signedCallback(order) })).status, 200);
    const dup = await t.api('/api/payments/flitt/callback', { method: 'POST', body: signedCallback(order) });
    assert.equal(dup.json.duplicate, true);
    const after = (await call(u, '/api/pro/me')).json.membership;
    assert.equal(after.periods.filter((p) => p.kind === 'paid').length, 1, 'a duplicate callback adds nothing');
    assert.equal(after.endsAt - before.endsAt, 30 * DAY, 'a renewal starts where the trial ends');
    const receipt = await call(u, `/api/pro/membership/receipts/${co.json.order.id}`);
    assert.equal(receipt.json.receipt.commissionPercent, 0);
    assert.equal(receipt.json.receipt.mode, 'test');
    // Refund through Flitt's reversal revokes the paid period.
    t.flitt.statusById.set(co.json.order.id, { order_id: co.json.order.id, merchant_id: 1549901, amount: 7900, currency: 'GEL', order_status: 'reversed', reversal_amount: 7900, payment_id: 777001 });
    assert.equal((await t.api(`/api/admin/orders/${co.json.order.id}/refund`, { method: 'POST', body: {}, headers: { 'x-admin-token': 'admin-secret' } })).status, 200);
    const refunded = (await call(u, '/api/pro/me')).json.membership;
    assert.ok(refunded.periods.find((p) => p.orderId === co.json.order.id).revokedAt);
    assert.equal(refunded.endsAt, before.endsAt);
  });

  test('bookings: real slots only, no double booking, statuses kept apart, no commission', async () => {
    const pro = await applicant('Irakli');
    await call(pro, '/api/pro/submit', 'POST', {});
    await approve(pro);
    await call(pro, '/api/pro/publish', 'POST', { published: true });
    const proId = (await call(pro, '/api/pro/me')).json.profile.id;
    const serviceId = (await call(pro, '/api/pro/me')).json.profile.services[0].id;
    const a = await t.registered();
    const b = await t.registered();
    assert.equal((await call(a, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: Date.now() + DAY })).json.error, 'client_profile_required');
    await call(a, '/api/client/profile', 'PUT', { displayName: 'Keti' });
    await call(b, '/api/client/profile', 'PUT', { displayName: 'Beka' });
    const slots = (await t.api(`/api/pros/${proId}/slots?serviceId=${serviceId}&days=3`)).json;
    assert.ok(slots.slots.length > 5);
    const slot = slots.slots[3];
    assert.equal((await call(a, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: slot + 7 * 60 * 1000 })).json.error, 'slot_unavailable', 'only offered times');
    const [r1, r2] = await Promise.all([
      call(a, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: slot, note: 'First time, a bit nervous.' }),
      call(b, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: slot }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [200, 409], 'two clients, one slot: exactly one booking');
    const winner = r1.status === 200 ? r1 : r2;
    const bk = winner.json.booking;
    assert.equal(bk.status, 'requested');
    assert.equal(bk.paymentStatus, 'not_collected_by_behappy');
    assert.equal(bk.priceMinor, 12000, "the professional's own price");
    assert.equal(bk.attendance, 'unknown');
    // The professional sees the note; the slot is gone for everyone.
    const proView = (await call(pro, '/api/pro/bookings?scope=requests')).json.bookings.find((x) => x.id === bk.id);
    assert.equal(proView.clientName, winner === r1 ? 'Keti' : 'Beka');
    if (winner === r1) assert.equal(proView.clientNote, 'First time, a bit nervous.');
    assert.ok(!(await t.api(`/api/pros/${proId}/slots?serviceId=${serviceId}&days=3`)).json.slots.includes(slot));
    // Someone else can't touch it; the professional confirms.
    const stranger = await t.registered();
    assert.equal((await call(stranger, `/api/bookings/${bk.id}`)).status, 404);
    assert.equal((await call(pro, `/api/pro/bookings/${bk.id}/confirm`, 'POST', {})).json.booking.status, 'confirmed');
    // Attendance can't be marked before the time; nothing "happens" by a button press.
    assert.equal((await call(pro, `/api/pro/bookings/${bk.id}/attendance`, 'POST', { attendance: 'attended' })).json.error, 'not_yet');
    // A late cancellation is recorded as late, with no fee by BeHappy.
    const winnerUser = winner === r1 ? a : b;
    t.clock.setOffset(slot - Date.now() - 5 * HOUR);
    const cancelled = await call(winnerUser, `/api/bookings/${bk.id}/cancel`, 'POST', { reason: 'unwell' });
    assert.equal(cancelled.json.booking.status, 'cancelled_by_client');
    assert.equal(cancelled.json.booking.lateCancellation, true);
    t.clock.setOffset(0);
  });

  test('messages are private and encrypted; expiry hides the profile but keeps confirmed clients reachable', async () => {
    const pro = await applicant('Eka');
    await call(pro, '/api/pro/submit', 'POST', {});
    await approve(pro);
    await call(pro, '/api/pro/publish', 'POST', { published: true });
    const me = (await call(pro, '/api/pro/me')).json;
    const proId = me.profile.id;
    const serviceId = me.profile.services[0].id;
    const client = await t.registered();
    await call(client, '/api/client/profile', 'PUT', { displayName: 'Lika' });
    const lead = await t.registered();
    await call(lead, '/api/client/profile', 'PUT', { displayName: 'Mzia' });
    const thread = await call(client, '/api/threads', 'POST', { professionalId: proId, body: 'Hello, do you work with panic attacks?' });
    assert.equal(thread.status, 200);
    const raw = await t.db.query('select ciphertext from pro_messages order by id desc limit 1');
    assert.ok(!Buffer.from(raw.rows[0].ciphertext).toString('utf8').includes('panic'), 'stored encrypted');
    const proThreads = (await call(pro, '/api/threads')).json.threads;
    assert.equal(proThreads[0].clientName, 'Lika');
    assert.equal(proThreads[0].unread, 1);
    assert.equal((await call(lead, `/api/threads/${thread.json.thread.id}`)).status, 404, 'nobody else can open a thread');
    // A confirmed booking 20 days from now.
    const slot = (await t.api(`/api/pros/${proId}/slots?serviceId=${serviceId}&from=${Date.now() + 19 * DAY}&days=3`)).json.slots[0];
    const bk = (await call(client, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: slot })).json.booking;
    await call(pro, `/api/pro/bookings/${bk.id}/confirm`, 'POST', {});
    const leadThread = (await call(lead, '/api/threads', 'POST', { professionalId: proId, body: 'Are you taking new clients?' })).json.thread;

    // The 14-day trial runs out.
    t.clock.setOffset(15 * DAY);
    const state = (await call(pro, '/api/pro/me')).json;
    assert.equal(state.membership.state, 'expired');
    assert.equal(state.listed, false);
    assert.equal((await t.api(`/api/pros/${proId}`)).status, 404, 'hidden from the directory');
    assert.equal((await call(client, `/api/pros/${proId}`)).status, 200, 'a client with a booking still sees the profile');
    assert.equal((await call(lead, '/api/bookings', 'POST', { professionalId: proId, serviceId, startsAt: slot + 2 * HOUR })).json.error, 'not_bookable', 'no new bookings');
    // Existing obligations continue: the confirmed client can talk to the professional and back.
    assert.equal((await call(pro, `/api/threads/${thread.json.thread.id}/messages`, 'POST', { body: 'See you on the day, I will send the link.' })).status, 200);
    assert.equal((await call(client, `/api/threads/${thread.json.thread.id}/messages`, 'POST', { body: 'Thank you!' })).status, 200);
    assert.equal((await call(client, `/api/bookings/${bk.id}`)).json.booking.status, 'confirmed', 'the confirmed appointment is kept');
    // New leads wait for renewal.
    const blocked = await call(pro, `/api/threads/${leadThread.id}/messages`, 'POST', { body: 'Yes!' });
    assert.equal(blocked.json.error, 'membership_required');
    // Scheduler: the expiry notice is sent once.
    t.clock.setOffset(14 * DAY + HOUR);
    await runAllJobs(t.app.locals.deps);
    await runAllJobs(t.app.locals.deps);
    const notes = (await call(pro, '/api/notifications')).json.notifications.filter((n) => n.kind === 'membership_expired');
    assert.equal(notes.length, 1);
    t.clock.setOffset(0);
  });

  test('renewal reminders at 7, 3 and 1 days respect the preference; the expiry notice always comes', async () => {
    const pro = await applicant('Nia');
    await call(pro, '/api/pro/submit', 'POST', {});
    await approve(pro);
    const deps = t.app.locals.deps;
    const kinds = async () => (await call(pro, '/api/notifications')).json.notifications.filter((n) => n.kind === 'membership_reminder').map((n) => n.data.daysLeft);
    t.clock.setOffset(8 * DAY);
    await runAllJobs(deps);
    assert.deepEqual(await kinds(), [7]);
    t.clock.setOffset(11.5 * DAY);
    await runAllJobs(deps);
    assert.deepEqual((await kinds()).sort(), [3, 7]);
    await call(pro, '/api/pro/profile', 'PUT', { remindersEnabled: false });
    t.clock.setOffset(13.5 * DAY);
    await runAllJobs(deps);
    assert.deepEqual((await kinds()).sort(), [3, 7], 'optional reminders off');
    t.clock.setOffset(14 * DAY + HOUR);
    await runAllJobs(deps);
    assert.equal((await call(pro, '/api/notifications')).json.notifications.filter((n) => n.kind === 'membership_expired').length, 1, 'the expiry notice is essential');
    t.clock.setOffset(0);
  });

  test('admin overview counts only verified membership payments; health is reported', async () => {
    const o = await call(admin, '/api/admin/overview');
    assert.equal(o.status, 200);
    assert.ok(o.json.revenue.professionalAllTime.gross >= 7900);
    assert.ok(o.json.revenue.professionalAllTime.refunded >= 7900, 'refunds are shown, not hidden');
    assert.ok(o.json.professionals.byStatus.approved >= 1);
    assert.equal(typeof o.json.bookings, 'object');
    const h = await call(admin, '/api/admin/health');
    assert.equal(h.json.database, 'ok');
    assert.equal(h.json.payments, 'flitt-test');
    assert.equal((await call(await t.registered(), '/api/admin/overview')).status, 403);
  });

  test('deleting a client keeps the professional’s record as “Former client”', async () => {
    const pro = await applicant('Keti');
    await call(pro, '/api/pro/submit', 'POST', {});
    await approve(pro);
    await call(pro, '/api/pro/publish', 'POST', { published: true });
    const me = (await call(pro, '/api/pro/me')).json;
    const c = await t.registered();
    await call(c, '/api/client/profile', 'PUT', { displayName: 'Temporary' });
    const slot = (await t.api(`/api/pros/${me.profile.id}/slots?serviceId=${me.profile.services[0].id}&days=3`)).json.slots[1];
    const bk = (await call(c, '/api/bookings', 'POST', { professionalId: me.profile.id, serviceId: me.profile.services[0].id, startsAt: slot, note: 'private note' })).json.booking;
    const del = await call(c, '/api/account', 'DELETE');
    assert.equal(del.status, 200, JSON.stringify(del.json));
    const row = (await t.db.query('select client_account_id, client_display_name, client_note_enc, status from bookings where id = $1', [bk.id])).rows[0];
    assert.equal(row.client_account_id, null);
    assert.equal(row.client_display_name, 'Former client');
    assert.equal(row.client_note_enc, null);
    assert.equal(row.status, 'cancelled_by_client', 'future appointments are released');
  });

  // Runs last: it moves the shared clock forward by a year.
  test('nobody reviews their own application; verification expires after its validity', async () => {
    const self = await applicant('Tamar');
    await t.grantRole(self.accountId, 'admin');
    assert.equal((await call(self, '/api/pro/submit', 'POST', {})).status, 200);
    const id = (await call(self, '/api/pro/me')).json.profile.id;
    const own = await call(self, `/api/admin/pros/${id}/review`, 'POST', { action: 'approve' });
    assert.equal(own.status, 403);
    assert.equal(own.json.error, 'cannot_review_self');
    assert.equal((await approve(self)).status, 200, 'another admin can approve');

    t.clock.advance(366 * DAY);
    await runAllJobs(t.app.locals.deps);
    const p = (await t.db.query('select status, published from professional_profiles where id = $1', [id])).rows[0];
    assert.equal(p.status, 'expired');
    assert.equal(p.published, false, 'an expired profile leaves the directory');
    const n = await t.db.query("select count(*)::int as n from notifications where account_id = $1 and kind = 'pro_verification' and data->>'status' = 'expired'", [self.accountId]);
    assert.equal(n.rows[0].n, 1, 'the professional is told');
  });
});
