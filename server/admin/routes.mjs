// The admin control center API (/api/admin). Every route names the
// permission it needs (admin/permissions.mjs) and the staff guard checks it
// on every request. Aggregates are computed from verified records: revenue
// counts approved Flitt TEST orders minus reversals, never bookings (BeHappy
// doesn't collect session fees). No journal, conversation, assessment,
// booking note or private message content is available here.

import express from 'express';

import { costOf, overridePrice } from '../aiPricing.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { schemaVersion } from '../db/migrate.mjs';
import { toOrder } from '../orders.mjs';
import { publicOrder } from '../payments.mjs';
import { professionalsFor } from '../professional/index.mjs';
import { settingsFor } from './settings.mjs';
import { handle, staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const STARTED = Date.now();

export function mountAdmin(app, deps) {
  const { db, config, clock } = deps;
  const staff = staffFor(deps);
  const can = staff.guard;
  const r = express.Router();
  r.use(express.json({ limit: '64kb' }), requireAccount(db, { clock }));

  // ---------- Platform settings and switches ----------
  const settings = settingsFor(deps);
  r.get('/settings', can('settings.view'), handle(async () => ({ settings: await settings.list() })));
  r.put('/settings/:key', can('settings.manage'), handle((req) => settings.set(req.account, req.params.key, req.body?.value, req.body?.reason)));

  r.get('/overview', can('dashboard.view'), async (_req, res) => {
    const now = clock.now();
    const pro = professionalsFor(deps);
    const q = (sql, params = []) => db.query(sql, params).then((x) => x.rows);
    const [accounts] = await q(
      "select count(*)::int as total, count(*) filter (where email_verified_at is not null and password_hash is not null)::int as registered, count(*) filter (where created_at > $1)::int as new30d from accounts",
      [ts(now - 30 * DAY)]
    );
    const proStatus = Object.fromEntries((await q('select status, count(*)::int as n from professional_profiles group by status')).map((x) => [x.status, x.n]));
    const approved = await q("select * from professional_profiles where status = 'approved'");
    const membershipStates = {};
    let listed = 0;
    for (const p of approved) {
      const s = await pro.membership.state(db, p, now);
      membershipStates[s.state] = (membershipStates[s.state] || 0) + 1;
      if (await pro.profiles.isDiscoverable(db, p.id, now)) listed += 1;
    }
    const revenue = async (kinds, since) =>
      (
        await q(
          `select count(*) filter (where status = 'approved')::int as paid,
             coalesce(sum(amount_minor) filter (where status = 'approved'), 0)::int as gross,
             coalesce(sum(coalesce(reversal_amount, amount_minor)) filter (where status in ('reversed', 'partially_reversed')), 0)::int as refunded
           from orders where product_kind = any($1::text[]) and ($2::timestamptz is null or created_at > $2)`,
          [kinds, since ? ts(since) : null]
        )
      )[0];
    const bookings = Object.fromEntries((await q('select status, count(*)::int as n from bookings group by status')).map((x) => [x.status, x.n]));
    const [community] = await q(
      `select (select count(distinct room_id)::int from community_messages where created_at > $1) as active_rooms,
              (select count(*)::int from community_messages where created_at > $1 and author_kind = 'member') as messages7d,
              (select count(*)::int from community_messages where created_at > $1 and author_kind = 'anulia') as anulia7d,
              (select count(*)::int from reports where status in ('open', 'in_review')) as open_reports,
              (select count(*)::int from reports where status in ('open', 'in_review') and priority >= 3) as urgent_reports,
              (select count(*)::int from appeals where status = 'open') as open_appeals`,
      [ts(now - 7 * DAY)]
    );
    const ai = await q('select feature, model, count(*)::int as calls, coalesce(sum(input_tokens), 0)::int as input, coalesce(sum(output_tokens), 0)::int as output from ai_usage where created_at > $1 group by feature, model order by feature', [ts(now - 30 * DAY)]);
    const override = overridePrice(null);
    res.json({
      generatedAt: now,
      mode: 'test',
      accounts,
      professionals: { byStatus: proStatus, listed, membershipStates },
      revenue: {
        currency: 'GEL',
        note: 'Flitt TEST payments only. Professional revenue is membership fees; BeHappy takes 0% of sessions.',
        professionalAllTime: await revenue(['professional']),
        professional30d: await revenue(['professional'], now - 30 * DAY),
        consumerAllTime: await revenue(['plus', 'art']),
        consumer30d: await revenue(['plus', 'art'], now - 30 * DAY),
      },
      bookings,
      community,
      ai: {
        last30d: ai,
        pricing: override ? { ...override, currency: 'USD' } : null,
        // Each model at its list price (server/aiPricing.mjs) unless one price is set for all.
        estimatedCostUsd: costOf(ai, override),
      },
    });
  });

  r.get('/memberships', can('memberships.view'), async (req, res) => {
    const pro = professionalsFor(deps);
    const rows = await db.query("select * from professional_profiles where status in ('approved', 'expired', 'suspended') order by public_name limit 500");
    const out = [];
    for (const p of rows.rows) {
      const s = await pro.membership.state(db, p);
      if (req.query.state && s.state !== req.query.state) continue;
      out.push({ id: p.id, publicName: p.public_name, status: p.status, state: s.state, endsAt: s.endsAt, trialUsed: s.trialUsed, listed: await pro.profiles.isDiscoverable(db, p.id) });
    }
    res.json({ memberships: out });
  });

  r.get('/payments', can('memberships.view'), async (req, res) => {
    const kind = ['professional', 'plus', 'art'].includes(String(req.query.kind)) ? [String(req.query.kind)] : ['professional', 'plus', 'art'];
    const rows = await db.query('select o.*, p.public_name from orders o left join professional_profiles p on p.id = o.professional_id where o.product_kind = any($1::text[]) order by o.created_at desc limit 200', [kind]);
    res.json({ payments: rows.rows.map((o) => ({ ...publicOrder(toOrder(o)), professionalName: o.public_name || null })) });
  });

  r.get('/health', can('system.view'), async (_req, res) => {
    let database = 'ok';
    try {
      await db.query('select 1');
    } catch {
      database = 'error';
    }
    res.json({
      database,
      driver: db.kind,
      schema: await schemaVersion(db).catch(() => null),
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      node: process.version,
      realtimeConnections: deps.realtime?.connections?.() ?? null,
      scheduler: deps.lastSchedulerRun ? { lastRunAt: deps.lastSchedulerRun.at, ...deps.lastSchedulerRun } : null,
      email: deps.mailer?.available ?? false,
      sms: professionalsFor(deps).sms.available,
      ai: Boolean(config.openai.apiKey),
      payments: 'flitt-test',
      devTools: Boolean(config.devTools),
    });
  });

  r.get('/audit', can('audit.view'), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const before = Number(req.query.before) > 0 ? Number(req.query.before) : null;
    const action = req.query.action ? `${String(req.query.action).slice(0, 60)}%` : null;
    const target = req.query.target ? String(req.query.target).slice(0, 80) : null;
    const actor = req.query.actor ? String(req.query.actor).slice(0, 80) : null;
    const rows = await db.query(
      `select l.id, l.actor_account_id, l.actor_role, l.action, l.target_type, l.target_id, l.metadata, l.created_at, a.email as actor_email
       from audit_log l left join accounts a on a.id = l.actor_account_id
       where ($2::bigint is null or l.id < $2) and ($3::text is null or l.action like $3) and ($4::text is null or l.target_id = $4) and ($5::text is null or l.actor_account_id = $5)
       order by l.id desc limit $1`,
      [limit, before, action, target, actor]
    );
    res.json({
      entries: rows.rows.map((e) => ({
        id: Number(e.id),
        actorId: e.actor_account_id,
        actorEmail: e.actor_email || null,
        actorRole: e.actor_role,
        action: e.action,
        targetType: e.target_type,
        targetId: e.target_id,
        metadata: e.metadata,
        createdAt: ms(e.created_at),
      })),
    });
  });

  app.use('/api/admin', r);
}
