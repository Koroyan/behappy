// Platform settings and switches. Defaults live here; changes are stored in
// platform_settings, validated, audited, and need settings.manage plus a
// fresh confirmation. A few switches are for the owner only.

import { audit } from '../audit.mjs';
import { ms, ts } from '../db/index.mjs';

const AI_FEATURES = ['anulia', 'journal', 'cards', 'art', 'community'];
const LANGS = ['en', 'ka'];

const bool = (v) => (typeof v === 'boolean' ? v : undefined);
const intIn = (lo, hi) => (v) => (Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);
const numOrNull = (lo, hi) => (v) => (v === null ? null : typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 100) / 100 : undefined);
const text = (max) => (v) => (typeof v === 'string' && v.trim().length <= max ? v.trim() : undefined);

export const SETTINGS = {
  'staff.mfaRequired': {
    default: false,
    ownerOnly: true,
    validate: bool,
    description: 'Every staff member must use two-step sign-in codes',
  },
  'staff.stepUpMinutes': {
    default: 15,
    ownerOnly: true,
    validate: intIn(5, 60),
    description: 'How long a confirmation (password and code) stays valid for sensitive actions',
  },
  'ai.features': {
    default: Object.fromEntries(AI_FEATURES.map((f) => [f, true])),
    validate: (v) => {
      if (!v || typeof v !== 'object') return undefined;
      const out = {};
      for (const f of AI_FEATURES) {
        if (typeof v[f] !== 'boolean') return undefined;
        out[f] = v[f];
      }
      return out;
    },
    description: 'Switch each AI feature on or off (safety resources never depend on AI)',
  },
  'ai.dailyBudgetUsd': {
    default: null,
    validate: numOrNull(1, 100000),
    description: 'Pause AI features for the rest of the day (UTC) when the estimated spend reaches this amount',
  },
  'ai.featureBudgetsUsd': {
    default: {},
    validate: (v) => {
      if (v === null) return {};
      if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
      const out = {};
      for (const [k, x] of Object.entries(v)) {
        if (!['anulia', 'art', 'cards', 'journal', 'summary', 'motivation', 'transcribe', 'speech', 'reflection', 'community'].includes(k)) return undefined;
        if (x === null) continue;
        const n = Number(x);
        if (!(n >= 0.5 && n <= 100000)) return undefined;
        out[k] = n;
      }
      return out;
    },
    description: 'Per-feature daily AI budget in USD (UTC day): that feature pauses when its spend would pass it',
  },
  'ai.pricing': {
    default: { inputPerMillion: null, outputPerMillion: null },
    validate: (v) => {
      const f = numOrNull(0, 1000);
      if (!v || typeof v !== 'object') return undefined;
      const i = f(v.inputPerMillion ?? null);
      const o = f(v.outputPerMillion ?? null);
      return i === undefined || o === undefined ? undefined : { inputPerMillion: i, outputPerMillion: o };
    },
    description: 'Model prices in USD per million tokens, for cost estimates',
  },
  'analytics.enabled': {
    default: true,
    validate: bool,
    description: 'Collect first-party usage analytics (people can still opt out in their privacy settings)',
  },
  'analytics.retentionDays': {
    default: 395,
    validate: intIn(30, 760),
    description: 'Delete raw analytics events after this many days (daily totals are kept)',
  },
  // docs/ETHICS.md: no streaks. This lets the owner allow an opt-in "classic
  // streak" view in My Steps (gentle consistency stays the default for everyone).
  'features.classicStreak': {
    default: false,
    ownerOnly: true,
    validate: bool,
    description: 'Allow people to opt in to a classic streak count in My Steps (off: gentle "5 of 7" consistency only)',
  },
  'features.sensitiveAccess': {
    default: false,
    ownerOnly: true,
    validate: bool,
    description: 'Allow governed, time-limited access requests to protected data (off by default)',
  },
  announcement: {
    default: { active: false, tone: 'info', title: { en: '', ka: '' }, body: { en: '', ka: '' }, until: null },
    validate: (v) => {
      if (!v || typeof v !== 'object' || typeof v.active !== 'boolean' || !['info', 'warning'].includes(v.tone)) return undefined;
      const title = {};
      const body = {};
      for (const l of LANGS) {
        const t = text(80)(v.title?.[l] ?? '');
        const b = text(400)(v.body?.[l] ?? '');
        if (t === undefined || b === undefined) return undefined;
        title[l] = t;
        body[l] = b;
      }
      if (v.active && !title.en) return undefined;
      const until = v.until === null || v.until === undefined ? null : Number.isFinite(Number(v.until)) ? Number(v.until) : undefined;
      if (until === undefined) return undefined;
      return { active: v.active, tone: v.tone, title, body, until };
    },
    description: 'A short notice on the Today screen for everyone',
  },
};

export function createSettings({ db, clock }) {
  let cache = null;
  let cachedAt = 0;

  async function load() {
    if (cache && clock.now() - cachedAt < 5000) return cache;
    const r = await db.query('select key, value, updated_at, updated_by from platform_settings');
    const stored = new Map(r.rows.map((x) => [x.key, x]));
    const out = {};
    for (const [key, def] of Object.entries(SETTINGS)) {
      const row = stored.get(key);
      out[key] = { value: row ? row.value : def.default, isDefault: !row, updatedAt: row ? ms(row.updated_at) : null, updatedBy: row?.updated_by || null };
    }
    cache = out;
    cachedAt = clock.now();
    return out;
  }

  async function get(key) {
    return (await load())[key]?.value;
  }

  async function list() {
    const all = await load();
    return Object.entries(SETTINGS).map(([key, def]) => ({ key, description: def.description, ownerOnly: Boolean(def.ownerOnly), default: def.default, ...all[key] }));
  }

  async function set(actor, key, value, reason) {
    const def = SETTINGS[key];
    if (!def) throw Object.assign(new Error('unknown_setting'), { status: 404, code: 'unknown_setting' });
    if (def.ownerOnly && !actor.roles.includes('owner')) throw Object.assign(new Error('owner_only'), { status: 403, code: 'owner_only' });
    const clean = def.validate(value);
    if (clean === undefined) throw Object.assign(new Error('bad_value'), { status: 400, code: 'bad_value' });
    const why = String(reason || '').trim();
    if (why.length < 3) throw Object.assign(new Error('reason_required'), { status: 400, code: 'reason_required' });
    if (key === 'staff.mfaRequired' && clean === true) {
      // Requiring codes for everyone while not using them yourself would lock you out.
      const own = await db.query('select enabled_at from staff_mfa where account_id = $1', [actor.id]);
      if (!own.rows[0]?.enabled_at) throw Object.assign(new Error('enable_mfa_first'), { status: 409, code: 'enable_mfa_first' });
    }
    const before = await get(key);
    const now = clock.now();
    await db.tx(async (t) => {
      await t.query(
        'insert into platform_settings (key, value, updated_at, updated_by) values ($1, $2::jsonb, $3, $4) on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by',
        [key, JSON.stringify(clean), ts(now), actor.id]
      );
      await audit(t, { actorId: actor.id, actorRole: actor.primaryRole || 'admin', action: 'settings.changed', targetType: 'setting', targetId: key, metadata: { before, after: clean, reason: why.slice(0, 300) } });
    });
    cache = null;
    return { key, value: clean };
  }

  /** What the app may know: the announcement and which AI features are on. */
  async function publicView(now = clock.now()) {
    const all = await load();
    const a = all.announcement.value;
    const showing = a.active && (!a.until || a.until > now);
    return { announcement: showing ? { tone: a.tone, title: a.title, body: a.body } : null, ai: { features: all['ai.features'].value }, features: { classicStreak: all['features.classicStreak'].value === true } };
  }

  return { load, get, list, set, publicView, invalidate: () => (cache = null) };
}

export function settingsFor(deps) {
  deps.settings ||= createSettings({ db: deps.db, clock: deps.clock });
  return deps.settings;
}
