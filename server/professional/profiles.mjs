// Professional applications, verification and public profiles.
//
// Verification is independent of payment: only an admin's review moves an
// application to 'approved', a paid membership never does, and only an
// approved, unexpired profile shows a verified badge. A profile is listed in
// the directory only while it is verified, published by the professional,
// has an active membership (trial or paid), at least one service and at
// least one confirmed service language. All of this is enforced here, in SQL.

import crypto from 'node:crypto';

import { audit } from '../audit.mjs';
import { newId } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';
import { normalizePhone } from '../notify/sms.mjs';
import { DOCUMENT_KINDS, isCountry, isTimezone, PAYMENT_METHODS, REVIEW_CHECKLIST, ruleFor, SERVICE_LANGUAGES, SPECIALIZATIONS } from './catalogs.mjs';

const DAY = 24 * 60 * 60 * 1000;
const PHOTO_MAX = 1.5 * 1024 * 1024;
const DOC_MAX = 10 * 1024 * 1024;
const DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class ProError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
const fail = (status, code, extra) => {
  throw new ProError(status, code, extra);
};

const EDITABLE_APPLICATION = new Set(['draft', 'more_info_required', 'expired']);
const LOCKED_REVIEW = new Set(['submitted', 'under_review']);

/** SQL condition for "listed in the directory" ($now, $graceCutoff are bound by the caller). */
export const DISCOVERABLE_SQL = (p, a, nowParam, graceParam) => `${p}.status = 'approved'
  and (${p}.verification_expires_at is null or ${p}.verification_expires_at > ${nowParam})
  and ${p}.published
  and ${a}.status = 'active'
  and coalesce(array_length(${p}.languages, 1), 0) > 0
  and ${p}.languages_confirmed_at is not null
  and exists (select 1 from professional_services s where s.professional_id = ${p}.id and s.active)
  and exists (select 1 from professional_memberships m where m.professional_id = ${p}.id and m.revoked_at is null and m.starts_at <= ${nowParam} and m.ends_at > ${graceParam})`;

export const isVerified = (row, now) => row.status === 'approved' && (!row.verification_expires_at || ms(row.verification_expires_at) > now);

const clean = (s, max) => (s === undefined || s === null ? null : String(s).trim().slice(0, max) || null);
const cleanList = (list, allowed, max = 20) => (Array.isArray(list) ? [...new Set(list.map(String).filter((x) => allowed.includes(x)))].slice(0, max) : undefined);

export function createProfiles({ db, config, clock = { now: () => Date.now() }, crypto: fieldCrypto, sms, hooks = {} }) {
  const graceMs = () => (config.professional?.graceDays || 0) * DAY;

  async function load(q, { accountId, id } = {}, { forUpdate = false } = {}) {
    const r = await q.query(`select * from professional_profiles where ${accountId ? 'account_id' : 'id'} = $1${forUpdate ? ' for update' : ''}`, [accountId || id]);
    return r.rows[0] || null;
  }

  async function requireOwn(q, account, opts) {
    const row = await load(q, { accountId: account.id }, opts);
    if (!row) fail(404, 'no_application');
    return row;
  }

  async function event(q, pro, { from, to, actor, actorKind, message = null, internalNote = null, checklist = {} }) {
    await q.query('insert into verification_events (professional_id, from_status, to_status, actor_account_id, actor_kind, message, internal_note, checklist, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)', [
      pro.id,
      from,
      to,
      actor || null,
      actorKind,
      message,
      internalNote,
      JSON.stringify(checklist || {}),
      ts(clock.now()),
    ]);
  }

  async function children(q, id) {
    const [quals, docs, services, rules, exceptions, events] = await Promise.all([
      q.query('select * from professional_qualifications where professional_id = $1 order by id', [id]),
      q.query('select id, kind, file_name, mime, size_bytes, uploaded_at from verification_documents where professional_id = $1 order by uploaded_at', [id]),
      q.query('select * from professional_services where professional_id = $1 order by created_at', [id]),
      q.query('select weekday, start_minute, end_minute from availability_rules where professional_id = $1 order by weekday, start_minute', [id]),
      q.query('select day::text as day, note from availability_exceptions where professional_id = $1 order by day', [id]),
      q.query('select * from verification_events where professional_id = $1 order by created_at desc limit 50', [id]),
    ]);
    return { quals: quals.rows, docs: docs.rows, services: services.rows, rules: rules.rows, exceptions: exceptions.rows, events: events.rows };
  }

  const qualDto = (r, includeNumber) => ({ id: r.id, kind: r.kind, title: r.title, institution: r.institution, number: includeNumber ? r.number : undefined, country: r.country, year: r.year, validUntil: r.valid_until ? String(r.valid_until).slice(0, 10) : null, verified: r.verified });
  const serviceDto = (s) => ({ id: s.id, title: s.title, mode: s.mode, minutes: s.minutes, priceMinor: s.price_minor, currency: s.currency, active: s.active });
  const photoUrl = (p) => (p.photo_updated_at ? `/api/pros/${p.id}/photo?v=${ms(p.photo_updated_at)}` : null);

  /** What the professional sees about their own application and profile. */
  function privateDto(p, c, now) {
    return {
      id: p.id,
      status: p.status,
      verified: isVerified(p, now),
      verifiedAt: ms(p.verified_at),
      verificationExpiresAt: ms(p.verification_expires_at),
      submittedAt: ms(p.submitted_at),
      legalName: p.legal_name,
      publicName: p.public_name,
      country: p.country,
      city: p.city,
      contactEmail: p.contact_email,
      phone: p.phone_e164,
      phoneVerified: Boolean(p.phone_verified_at && p.phone_e164),
      bio: p.bio,
      photoUrl: photoUrl(p),
      languages: p.languages,
      languagesConfirmed: Boolean(p.languages_confirmed_at),
      specializations: p.specializations,
      practiceAreas: p.practice_areas,
      experienceYears: p.experience_years,
      offersOnline: p.offers_online,
      offersInPerson: p.offers_in_person,
      inPersonAddress: p.in_person_address,
      timezone: p.timezone,
      paymentArrangement: p.payment_arrangement,
      paymentMethods: p.payment_methods,
      cancellationPolicy: p.cancellation_policy,
      cancellationNoticeHours: p.cancellation_notice_hours,
      bookingNoticeHours: p.booking_notice_hours,
      bufferMinutes: p.buffer_minutes,
      autoConfirm: p.auto_confirm,
      published: p.published,
      remindersEnabled: p.reminders_enabled,
      membershipCancelledAt: ms(p.membership_cancelled_at),
      qualifications: c.quals.map((q) => qualDto(q, true)),
      documents: c.docs.map((d) => ({ id: d.id, kind: d.kind, fileName: d.file_name, mime: d.mime, size: d.size_bytes, uploadedAt: ms(d.uploaded_at) })),
      services: c.services.map(serviceDto),
      availability: { rules: c.rules.map((r) => ({ weekday: r.weekday, startMinute: r.start_minute, endMinute: r.end_minute })), daysOff: c.exceptions.map((e) => e.day) },
      events: c.events.map((e) => ({ id: e.id, from: e.from_status, to: e.to_status, actorKind: e.actor_kind, message: e.message, createdAt: ms(e.created_at) })),
      rule: ruleFor(p.country),
      missing: missingItems(p, c),
      editable: EDITABLE_APPLICATION.has(p.status) || p.status === 'approved',
    };
  }

  /** What anyone may see in the directory. Never contact details or legal name. */
  function publicDto(p, c, now, { includeAddress = false } = {}) {
    const active = c.services.filter((s) => s.active);
    return {
      id: p.id,
      publicName: p.public_name,
      photoUrl: photoUrl(p),
      country: p.country,
      city: p.city,
      bio: p.bio,
      languages: p.languages,
      specializations: p.specializations,
      practiceAreas: p.practice_areas,
      experienceYears: p.experience_years,
      offersOnline: p.offers_online,
      offersInPerson: p.offers_in_person,
      timezone: p.timezone,
      verified: isVerified(p, now),
      verifiedAt: ms(p.verified_at),
      verificationExpiresAt: ms(p.verification_expires_at),
      qualifications: c.quals.filter((q) => q.verified).map((q) => qualDto(q, false)),
      services: active.map(serviceDto),
      priceFromMinor: active.length ? Math.min(...active.map((s) => s.price_minor)) : null,
      currency: active[0]?.currency || 'GEL',
      paymentArrangement: p.payment_arrangement,
      paymentMethods: p.payment_methods,
      cancellationPolicy: p.cancellation_policy,
      cancellationNoticeHours: p.cancellation_notice_hours,
      inPersonAddress: includeAddress ? p.in_person_address : null,
    };
  }

  function missingItems(p, c) {
    const rule = ruleFor(p.country);
    const missing = [];
    if (!p.legal_name) missing.push('legal_name');
    if (!p.public_name) missing.push('public_name');
    if (!isCountry(p.country)) missing.push('country');
    if (!p.city) missing.push('city');
    if (!p.contact_email) missing.push('contact_email');
    if (!p.phone_verified_at || !p.phone_e164) missing.push('phone_verified');
    if (!p.bio || p.bio.length < 80) missing.push('bio');
    if (!p.languages?.length || !p.languages_confirmed_at) missing.push('languages_confirmed');
    if (!p.specializations?.length) missing.push('specializations');
    if (p.experience_years === null || p.experience_years === undefined) missing.push('experience_years');
    if (!c.quals.some((q) => q.kind === 'degree')) missing.push('degree');
    if (rule.licenseRequired && !c.quals.some((q) => q.kind === 'license' || q.kind === 'registration')) missing.push('license');
    if (rule.identityDocument && !c.docs.some((d) => d.kind === 'identity')) missing.push('identity_document');
    if (rule.degreeDocument && !c.docs.some((d) => d.kind === 'degree')) missing.push('degree_document');
    if (rule.licenseRequired && !c.docs.some((d) => d.kind === 'license')) missing.push('license_document');
    if (!c.services.some((s) => s.active)) missing.push('service');
    if (!p.payment_arrangement) missing.push('payment_arrangement');
    if (!p.cancellation_policy) missing.push('cancellation_policy');
    if (!p.offers_online && !p.offers_in_person) missing.push('mode');
    return missing;
  }

  async function mine(account) {
    const p = await load(db, { accountId: account.id });
    if (!p) return null;
    return privateDto(p, await children(db, p.id), clock.now());
  }

  async function start(account) {
    if (!account.registered) fail(403, 'registration_required');
    const existing = await load(db, { accountId: account.id });
    if (existing) return mine(account);
    const id = newId('pro');
    await db.query('insert into professional_profiles (id, account_id, contact_email, created_at, updated_at) values ($1, $2, $3, $4, $4)', [id, account.id, account.email, ts(clock.now())]);
    return mine(account);
  }

  /** Updates application/profile fields. Identity and qualifications lock once submitted. */
  async function update(account, body = {}) {
    const now = clock.now();
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (LOCKED_REVIEW.has(p.status)) fail(409, 'locked_during_review');
      if (['rejected', 'suspended'].includes(p.status)) fail(409, 'not_editable');
      const identityEditable = EDITABLE_APPLICATION.has(p.status);
      const set = {};
      const put = (col, value) => {
        if (value !== undefined) set[col] = value;
      };
      if (identityEditable) {
        put('legal_name', body.legalName !== undefined ? clean(body.legalName, 120) : undefined);
        put('country', body.country !== undefined ? (isCountry(String(body.country).toUpperCase()) ? String(body.country).toUpperCase() : fail(400, 'bad_country')) : undefined);
        put('contact_email', body.contactEmail !== undefined ? clean(body.contactEmail, 254) : undefined);
      } else if (body.legalName !== undefined || body.country !== undefined) {
        fail(409, 'locked_after_approval');
      }
      put('public_name', body.publicName !== undefined ? clean(body.publicName, 80) : undefined);
      put('city', body.city !== undefined ? clean(body.city, 80) : undefined);
      put('bio', body.bio !== undefined ? clean(body.bio, 3000) : undefined);
      put('practice_areas', body.practiceAreas !== undefined ? clean(body.practiceAreas, 1000) : undefined);
      if (body.experienceYears !== undefined) {
        const n = Number(body.experienceYears);
        put('experience_years', Number.isInteger(n) && n >= 0 && n <= 70 ? n : fail(400, 'bad_experience'));
      }
      const langs = cleanList(body.languages, SERVICE_LANGUAGES, 19);
      if (langs !== undefined) {
        put('languages', langs);
        // Service languages must be confirmed explicitly every time they change.
        put('languages_confirmed_at', body.confirmLanguages === true && langs.length ? ts(now) : null);
      } else if (body.confirmLanguages === true && p.languages?.length) {
        put('languages_confirmed_at', ts(now));
      }
      put('specializations', cleanList(body.specializations, SPECIALIZATIONS, 10));
      if (body.offersOnline !== undefined) put('offers_online', Boolean(body.offersOnline));
      if (body.offersInPerson !== undefined) put('offers_in_person', Boolean(body.offersInPerson));
      put('in_person_address', body.inPersonAddress !== undefined ? clean(body.inPersonAddress, 300) : undefined);
      if (body.timezone !== undefined) put('timezone', isTimezone(body.timezone) ? String(body.timezone) : fail(400, 'bad_timezone'));
      put('payment_arrangement', body.paymentArrangement !== undefined ? clean(body.paymentArrangement, 600) : undefined);
      put('payment_methods', cleanList(body.paymentMethods, PAYMENT_METHODS, 4));
      put('cancellation_policy', body.cancellationPolicy !== undefined ? clean(body.cancellationPolicy, 800) : undefined);
      for (const [key, col, max] of [
        ['cancellationNoticeHours', 'cancellation_notice_hours', 336],
        ['bookingNoticeHours', 'booking_notice_hours', 336],
        ['bufferMinutes', 'buffer_minutes', 120],
      ]) {
        if (body[key] !== undefined) {
          const n = Number(body[key]);
          put(col, Number.isInteger(n) && n >= 0 && n <= max ? n : fail(400, `bad_${col}`));
        }
      }
      if (body.autoConfirm !== undefined) put('auto_confirm', Boolean(body.autoConfirm));
      if (body.remindersEnabled !== undefined) put('reminders_enabled', Boolean(body.remindersEnabled));
      const cols = Object.keys(set);
      if (!cols.length) return;
      const assignments = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
      await t.query(`update professional_profiles set ${assignments}, updated_at = $${cols.length + 2} where id = $1`, [p.id, ...cols.map((c) => set[c]), ts(now)]);
    });
    return mine(account);
  }

  async function setQualifications(account, list) {
    if (!Array.isArray(list) || list.length > 12) fail(400, 'bad_qualifications');
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (!EDITABLE_APPLICATION.has(p.status)) fail(409, p.status === 'approved' ? 'locked_after_approval' : 'locked_during_review');
      await t.query('delete from professional_qualifications where professional_id = $1', [p.id]);
      for (const q of list) {
        const kind = ['degree', 'license', 'registration', 'certification'].includes(q?.kind) ? q.kind : fail(400, 'bad_qualification_kind');
        const title = clean(q.title, 160) || fail(400, 'qualification_title_required');
        const year = q.year === undefined || q.year === null || q.year === '' ? null : Number(q.year);
        if (year !== null && !(Number.isInteger(year) && year >= 1950 && year <= 2100)) fail(400, 'bad_year');
        await t.query('insert into professional_qualifications (professional_id, kind, title, institution, number, country, year, valid_until) values ($1, $2, $3, $4, $5, $6, $7, $8)', [
          p.id,
          kind,
          title,
          clean(q.institution, 160),
          clean(q.number, 80),
          q.country && isCountry(String(q.country).toUpperCase()) ? String(q.country).toUpperCase() : null,
          year,
          q.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(String(q.validUntil)) ? String(q.validUntil) : null,
        ]);
      }
    });
    return mine(account);
  }

  async function setServices(account, list) {
    if (!Array.isArray(list) || list.length > 8) fail(400, 'bad_services');
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (LOCKED_REVIEW.has(p.status) || ['rejected', 'suspended'].includes(p.status)) fail(409, 'not_editable');
      const keep = new Set();
      for (const s of list) {
        const mode = ['online', 'in_person'].includes(s?.mode) ? s.mode : fail(400, 'bad_mode');
        const minutes = Number(s.minutes);
        if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240) fail(400, 'bad_minutes');
        const price = Number(s.priceMinor);
        if (!Number.isInteger(price) || price < 0 || price > 10000000) fail(400, 'bad_price');
        const title = clean(s.title, 80);
        if (!title || title.length < 2) fail(400, 'service_title_required');
        if (s.id) {
          const r = await t.query('update professional_services set title = $3, mode = $4, minutes = $5, price_minor = $6, active = $7 where id = $1 and professional_id = $2', [s.id, p.id, title, mode, minutes, price, s.active !== false]);
          if (!r.rowCount) fail(404, 'service_not_found');
          keep.add(s.id);
        } else {
          const id = newId('svc');
          await t.query('insert into professional_services (id, professional_id, title, mode, minutes, price_minor, currency, active) values ($1, $2, $3, $4, $5, $6, $7, true)', [id, p.id, title, mode, minutes, price, 'GEL']);
          keep.add(id);
        }
      }
      // Services that disappear are deactivated (bookings keep their record).
      await t.query('update professional_services set active = false where professional_id = $1 and not (id = any($2::text[]))', [p.id, [...keep]]);
    });
    return mine(account);
  }

  async function setAvailability(account, { rules, daysOff }) {
    if (!Array.isArray(rules) || rules.length > 50) fail(400, 'bad_rules');
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (['rejected', 'suspended'].includes(p.status)) fail(409, 'not_editable');
      await t.query('delete from availability_rules where professional_id = $1', [p.id]);
      for (const r of rules) {
        const w = Number(r.weekday);
        const s = Number(r.startMinute);
        const e = Number(r.endMinute);
        if (!(w >= 1 && w <= 7 && Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e <= 1440 && e > s)) fail(400, 'bad_rule');
        await t.query('insert into availability_rules (professional_id, weekday, start_minute, end_minute) values ($1, $2, $3, $4)', [p.id, w, s, e]);
      }
      if (Array.isArray(daysOff)) {
        await t.query('delete from availability_exceptions where professional_id = $1', [p.id]);
        for (const d of daysOff.slice(0, 120)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) fail(400, 'bad_day');
          await t.query('insert into availability_exceptions (professional_id, day) values ($1, $2) on conflict do nothing', [p.id, String(d)]);
        }
      }
    });
    return mine(account);
  }

  async function setPhoto(account, { dataBase64, mime }) {
    if (!PHOTO_MIMES.has(mime)) fail(400, 'bad_photo_type');
    const bytes = Buffer.from(String(dataBase64 || '').replace(/^data:[^,]+,/, ''), 'base64');
    if (!bytes.length || bytes.length > PHOTO_MAX) fail(413, 'photo_too_large');
    const p = await requireOwn(db, account);
    await db.query('update professional_profiles set photo = $2, photo_mime = $3, photo_updated_at = $4 where id = $1', [p.id, bytes, mime, ts(clock.now())]);
    return mine(account);
  }

  async function addDocument(account, { kind, fileName, mime, dataBase64 }) {
    if (!DOCUMENT_KINDS.includes(kind)) fail(400, 'bad_document_kind');
    if (!DOC_MIMES.has(mime)) fail(400, 'bad_document_type');
    const bytes = Buffer.from(String(dataBase64 || '').replace(/^data:[^,]+,/, ''), 'base64');
    if (!bytes.length || bytes.length > DOC_MAX) fail(413, 'document_too_large');
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (!EDITABLE_APPLICATION.has(p.status)) fail(409, 'locked_during_review');
      const count = await t.query('select count(*)::int as n from verification_documents where professional_id = $1', [p.id]);
      if (count.rows[0].n >= 12) fail(409, 'too_many_documents');
      const enc = fieldCrypto.encrypt('documents', bytes);
      await t.query('insert into verification_documents (id, professional_id, kind, file_name, mime, size_bytes, sha256, ciphertext, iv, tag, uploaded_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [
        newId('doc'),
        p.id,
        kind,
        clean(fileName, 120) || `${kind}.bin`,
        mime,
        bytes.length,
        crypto.createHash('sha256').update(bytes).digest('hex'),
        enc.ciphertext,
        enc.iv,
        enc.tag,
        ts(clock.now()),
      ]);
    });
    return mine(account);
  }

  async function removeDocument(account, docId) {
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (!EDITABLE_APPLICATION.has(p.status)) fail(409, 'locked_during_review');
      const r = await t.query('delete from verification_documents where id = $1 and professional_id = $2', [docId, p.id]);
      if (!r.rowCount) fail(404, 'not_found');
    });
    return mine(account);
  }

  async function startPhone(account, phone) {
    const e164 = normalizePhone(phone);
    if (!e164) fail(400, 'bad_phone');
    const p = await requireOwn(db, account);
    if (!EDITABLE_APPLICATION.has(p.status) && p.status !== 'approved') fail(409, 'locked_during_review');
    await db.tx(async (t) => {
      await t.query('update professional_profiles set phone_e164 = $2, phone_verified_at = null where id = $1', [p.id, e164]);
      await sms.start(t, { accountId: account.id, phone: e164, now: clock.now() });
    });
    return { ok: true, phone: e164 };
  }

  async function verifyPhone(account, code) {
    const now = clock.now();
    const result = await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (!p.phone_e164) return { ok: false, error: 'no_phone' };
      const checked = await sms.check(t, { accountId: account.id, phone: p.phone_e164, code, now });
      if (!checked.ok) return checked;
      await t.query('update professional_profiles set phone_verified_at = $2 where id = $1', [p.id, ts(now)]);
      return { ok: true };
    });
    if (!result.ok) fail(400, result.error || 'code_wrong');
    return mine(account);
  }

  async function submit(account) {
    const now = clock.now();
    await db.tx(async (t) => {
      const p = await requireOwn(t, account, { forUpdate: true });
      if (!EDITABLE_APPLICATION.has(p.status)) fail(409, 'not_submittable');
      const missing = missingItems(p, await children(t, p.id));
      if (missing.length) fail(400, 'incomplete', { missing });
      await t.query("update professional_profiles set status = 'submitted', submitted_at = $2, updated_at = $2 where id = $1", [p.id, ts(now)]);
      await event(t, p, { from: p.status, to: 'submitted', actor: account.id, actorKind: 'professional' });
      await audit(t, { actorId: account.id, actorRole: 'professional', action: 'professional.submitted', targetType: 'professional', targetId: p.id });
    });
    return mine(account);
  }

  async function setPublished(account, published) {
    const p = await requireOwn(db, account);
    if (published && !isVerified(p, clock.now())) fail(409, 'not_verified');
    await db.query('update professional_profiles set published = $2, updated_at = $3 where id = $1', [p.id, Boolean(published), ts(clock.now())]);
    return mine(account);
  }

  // ---------- Admin review ----------
  const ACTIONS = {
    start_review: { from: ['submitted'], to: 'under_review' },
    request_info: { from: ['submitted', 'under_review', 'expired'], to: 'more_info_required', message: true },
    approve: { from: ['submitted', 'under_review', 'expired'], to: 'approved' },
    reject: { from: ['submitted', 'under_review', 'more_info_required'], to: 'rejected', message: true },
    suspend: { from: ['approved'], to: 'suspended', message: true },
    reinstate: { from: ['suspended'], to: 'approved' },
  };

  async function review(admin, proId, { action, message, internalNote, checklist = {}, verifiedQualificationIds }) {
    const rule = ACTIONS[action];
    if (!rule) fail(400, 'bad_action');
    if (rule.message && (!message || String(message).trim().length < 5)) fail(400, 'message_required');
    const now = clock.now();
    const result = await db.tx(async (t) => {
      const p = await load(t, { id: proId }, { forUpdate: true });
      if (!p) fail(404, 'not_found');
      if (!rule.from.includes(p.status)) fail(409, 'bad_transition', { status: p.status });
      if (p.account_id === admin.id) fail(403, 'cannot_review_self');
      const sets = ['status = $2', 'updated_at = $3'];
      const params = [p.id, rule.to, ts(now)];
      if (action === 'approve') {
        const c = await children(t, p.id);
        const missing = missingItems(p, c);
        if (missing.length) fail(400, 'incomplete', { missing });
        params.push(ts(now), ts(now + (config.professional?.verificationValidDays || 365) * DAY));
        sets.push(`verified_at = $${params.length - 1}`, `verification_expires_at = $${params.length}`);
        const ids = Array.isArray(verifiedQualificationIds) ? verifiedQualificationIds.map(Number) : c.quals.map((q) => q.id);
        await t.query('update professional_qualifications set verified = (id = any($2::bigint[])), verified_by = $3, verified_at = $4 where professional_id = $1', [p.id, ids, admin.id, ts(now)]);
      }
      if (action === 'suspend') sets.push('published = false');
      await t.query(`update professional_profiles set ${sets.join(', ')} where id = $1`, params);
      const safeChecklist = Object.fromEntries(Object.entries(checklist || {}).filter(([k]) => REVIEW_CHECKLIST.includes(k)).map(([k, v]) => [k, Boolean(v)]));
      await event(t, p, { from: p.status, to: rule.to, actor: admin.id, actorKind: 'admin', message: message ? String(message).slice(0, 1500) : null, internalNote: internalNote ? String(internalNote).slice(0, 1500) : null, checklist: safeChecklist });
      await audit(t, { actorId: admin.id, actorRole: 'admin', action: `professional.${action}`, targetType: 'professional', targetId: p.id, metadata: { from: p.status, to: rule.to } });
      await notify(t, p.account_id, 'pro_verification', { status: rule.to, message: message ? String(message).slice(0, 300) : null }, `verification:${p.id}:${now}`);
      let trial = null;
      if (action === 'approve' && hooks.onApproved) trial = await hooks.onApproved(t, { ...p, status: 'approved' }, now);
      return { status: rule.to, trial };
    });
    return result;
  }

  async function adminList({ status }) {
    const statuses = status ? [status] : ['submitted', 'under_review', 'more_info_required'];
    const r = await db.query(
      `select p.id, p.status, p.public_name, p.legal_name, p.country, p.city, p.submitted_at, p.updated_at, p.verification_expires_at,
         (select count(*)::int from verification_documents d where d.professional_id = p.id) as documents
       from professional_profiles p where p.status = any($1::text[]) order by p.submitted_at asc nulls last, p.created_at asc limit 200`,
      [statuses]
    );
    return r.rows.map((p) => ({ id: p.id, status: p.status, publicName: p.public_name, legalName: p.legal_name, country: p.country, city: p.city, submittedAt: ms(p.submitted_at), updatedAt: ms(p.updated_at), verificationExpiresAt: ms(p.verification_expires_at), documents: p.documents }));
  }

  async function adminGet(proId) {
    const p = await load(db, { id: proId });
    if (!p) fail(404, 'not_found');
    const c = await children(db, p.id);
    const dto = privateDto(p, c, clock.now());
    dto.events = c.events.map((e) => ({ id: e.id, from: e.from_status, to: e.to_status, actorKind: e.actor_kind, message: e.message, internalNote: e.internal_note, checklist: e.checklist, createdAt: ms(e.created_at) }));
    dto.checklistItems = REVIEW_CHECKLIST;
    return dto;
  }

  async function adminDocument(admin, proId, docId) {
    const r = await db.query('select * from verification_documents where id = $1 and professional_id = $2', [docId, proId]);
    const d = r.rows[0];
    if (!d) fail(404, 'not_found');
    const bytes = fieldCrypto.decrypt('documents', { ciphertext: d.ciphertext, iv: d.iv, tag: d.tag });
    await audit(db, { actorId: admin.id, actorRole: 'admin', action: 'verification_document.viewed', targetType: 'professional', targetId: proId, metadata: { documentId: docId, kind: d.kind } });
    return { bytes, mime: d.mime, fileName: d.file_name };
  }

  // ---------- Directory ----------
  async function search(filters = {}, now = clock.now()) {
    const params = [ts(now), ts(now - graceMs())];
    const where = [DISCOVERABLE_SQL('p', 'a', '$1', '$2')];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replaceAll('?', `$${params.length}`));
    };
    if (filters.language && SERVICE_LANGUAGES.includes(filters.language)) add('? = any(p.languages)', filters.language);
    if (filters.specialization && SPECIALIZATIONS.includes(filters.specialization)) add('? = any(p.specializations)', filters.specialization);
    if (filters.country && isCountry(String(filters.country).toUpperCase())) add('p.country = ?', String(filters.country).toUpperCase());
    if (filters.city) add("p.city ilike ? escape '\\'", `%${String(filters.city).slice(0, 60).replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    if (filters.mode === 'online' || filters.mode === 'in_person') add("exists (select 1 from professional_services s where s.professional_id = p.id and s.active and s.mode = ?)", filters.mode);
    if (Number(filters.maxPrice) > 0) add('exists (select 1 from professional_services s where s.professional_id = p.id and s.active and s.price_minor <= ?)', Math.round(Number(filters.maxPrice)));
    if (filters.q) add("(p.public_name ilike ? escape '\\' or p.practice_areas ilike ? escape '\\')", `%${String(filters.q).slice(0, 60).replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    // A fair, daily-changing order: no paid ranking, no favourites.
    params.push(new Date(now).toISOString().slice(0, 10));
    const r = await db.query(
      `select p.* from professional_profiles p join accounts a on a.id = p.account_id
       where ${where.join(' and ')}
       order by md5(p.id || $${params.length}) limit 60`,
      params
    );
    const out = [];
    for (const p of r.rows) out.push(publicDto(p, await children(db, p.id), now));
    return out;
  }

  async function isDiscoverable(q, proId, now = clock.now()) {
    const r = await q.query(`select 1 from professional_profiles p join accounts a on a.id = p.account_id where p.id = $3 and ${DISCOVERABLE_SQL('p', 'a', '$1', '$2')}`, [ts(now), ts(now - graceMs()), proId]);
    return r.rowCount > 0;
  }

  /** Public profile. Not listed → 404, except for the owner, admins and clients with a booking. */
  async function publicProfile(viewer, proId) {
    const now = clock.now();
    const p = await load(db, { id: proId });
    if (!p) fail(404, 'not_found');
    const discoverable = await isDiscoverable(db, p.id, now);
    let relationship = false;
    let confirmed = false;
    if (viewer) {
      const b = await db.query("select bool_or(status = 'confirmed') as confirmed, count(*)::int as n from bookings where professional_id = $1 and client_account_id = $2", [p.id, viewer.id]);
      relationship = b.rows[0].n > 0;
      confirmed = Boolean(b.rows[0].confirmed);
    }
    const own = viewer && viewer.id === p.account_id;
    const admin = viewer?.roles?.includes('admin');
    if (!discoverable && !own && !admin && !relationship) fail(404, 'not_found');
    if (discoverable && viewer && !own) await bumpStat(db, p.id, 'views', now, viewer.id);
    return { ...publicDto(p, await children(db, p.id), now, { includeAddress: confirmed || own }), listed: discoverable };
  }

  const seenViews = new Set();
  async function bumpStat(q, proId, column, now, viewerId) {
    const day = new Date(now).toISOString().slice(0, 10);
    if (column === 'views') {
      const key = `${viewerId}:${proId}:${day}`;
      if (seenViews.has(key)) return;
      seenViews.add(key);
      if (seenViews.size > 50000) seenViews.clear();
    }
    await q.query(`insert into professional_profile_stats (professional_id, day, ${column}) values ($1, $2, 1) on conflict (professional_id, day) do update set ${column} = professional_profile_stats.${column} + 1`, [proId, day]);
  }

  async function photo(viewer, proId) {
    const p = await load(db, { id: proId });
    if (!p?.photo) fail(404, 'not_found');
    const allowed = (await isDiscoverable(db, p.id)) || (viewer && (viewer.id === p.account_id || viewer.roles?.includes('admin')));
    if (!allowed) {
      const b = viewer ? await db.query('select 1 from bookings where professional_id = $1 and client_account_id = $2 limit 1', [p.id, viewer.id]) : { rowCount: 0 };
      if (!b.rowCount) fail(404, 'not_found');
    }
    return { bytes: Buffer.from(p.photo), mime: p.photo_mime };
  }

  async function stats(account, days = 30) {
    const p = await requireOwn(db, account);
    const since = new Date(clock.now() - days * DAY).toISOString().slice(0, 10);
    const r = await db.query('select coalesce(sum(views), 0)::int as views, coalesce(sum(booking_requests), 0)::int as requests, coalesce(sum(inquiries), 0)::int as inquiries from professional_profile_stats where professional_id = $1 and day >= $2', [p.id, since]);
    return { days, ...r.rows[0] };
  }

  return {
    load,
    mine,
    start,
    update,
    setQualifications,
    setServices,
    setAvailability,
    setPhoto,
    addDocument,
    removeDocument,
    startPhone,
    verifyPhone,
    submit,
    setPublished,
    review,
    adminList,
    adminGet,
    adminDocument,
    search,
    isDiscoverable,
    publicProfile,
    photo,
    stats,
    bumpStat,
    publicDto,
    children,
    missingItems,
  };
}
