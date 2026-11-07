// Support requests: people write to the BeHappy team from the app (Profile ›
// Help and support) and follow the conversation there; staff answer in the
// admin center. Subjects and messages are encrypted at rest. A request in the
// "safety" category also opens a safety case, and the app shows emergency
// resources right away (support is not an emergency service).

import express from 'express';

import { primaryRole } from '../admin/permissions.mjs';
import { safetyFor } from '../admin/safety.mjs';
import { handle, StaffError, staffFor } from '../admin/staff.mjs';
import { maskEmail } from '../admin/users.mjs';
import { audit } from '../audit.mjs';
import { newId, requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { notify } from '../notify/notifications.mjs';

export const SUPPORT_CATEGORIES = ['account', 'payment', 'professional', 'community', 'privacy', 'deletion', 'bug', 'safety', 'other'];
const STATUSES = ['open', 'waiting_on_staff', 'waiting_on_user', 'resolved', 'closed'];
const MINUTE = 60 * 1000;
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

class Window {
  constructor(max, ms) {
    this.max = max;
    this.ms = ms;
    this.map = new Map();
  }
  allow(key, now) {
    const list = (this.map.get(key) || []).filter((t) => now - t < this.ms);
    if (list.length >= this.max) return false;
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

export function createSupport(deps) {
  const { db, clock } = deps;
  const crypto = deps.crypto;
  const newTickets = new Window(5, 24 * 60 * MINUTE);
  const newMessages = new Window(30, 60 * MINUTE);

  const seal = (text) => crypto.encrypt('messages', text);
  const open = (c, iv, tag) => crypto.decryptText('messages', { ciphertext: c, iv, tag });
  const text = (v, min, max, code) => {
    const s = String(v || '').replace(/\r\n/g, '\n').trim();
    if (s.length < min) fail(400, code);
    if (s.length > max) fail(400, 'too_long');
    return s;
  };

  const ticketDto = (t) => ({
    id: t.id,
    category: t.category,
    subject: open(t.subject_ciphertext, t.subject_iv, t.subject_tag),
    status: t.status,
    priority: t.priority,
    createdAt: ms(t.created_at),
    updatedAt: ms(t.updated_at),
    closedAt: ms(t.closed_at),
  });

  async function messagesOf(ticketId, forStaff) {
    const r = await db.query('select id, author_kind, author_id, body_ciphertext, body_iv, body_tag, created_at from support_messages where ticket_id = $1 order by id', [ticketId]);
    return r.rows.map((m) => ({ id: Number(m.id), from: m.author_kind, ...(forStaff ? { authorId: m.author_id } : {}), body: open(m.body_ciphertext, m.body_iv, m.body_tag), at: ms(m.created_at) }));
  }

  async function addMessage(q, ticketId, kind, authorId, body) {
    const enc = seal(body);
    await q.query('insert into support_messages (ticket_id, author_kind, author_id, body_ciphertext, body_iv, body_tag, created_at) values ($1, $2, $3, $4, $5, $6, $7)', [ticketId, kind, authorId, enc.ciphertext, enc.iv, enc.tag, ts(clock.now())]);
  }

  // ---------- The person's side ----------
  async function create(account, { category, subject, body }) {
    if (!SUPPORT_CATEGORIES.includes(category)) fail(400, 'bad_category');
    const s = text(subject, 3, 120, 'subject_required');
    const b = text(body, 10, 4000, 'body_required');
    const now = clock.now();
    if (!newTickets.allow(account.id, now)) fail(429, 'slow_down');
    const id = newId('tkt');
    const enc = seal(s);
    await db.tx(async (t) => {
      await t.query('insert into support_tickets (id, account_id, category, subject_ciphertext, subject_iv, subject_tag, status, priority, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)', [
        id,
        account.id,
        category,
        enc.ciphertext,
        enc.iv,
        enc.tag,
        'waiting_on_staff',
        category === 'safety' ? 3 : category === 'deletion' || category === 'privacy' ? 2 : 1,
        ts(now),
      ]);
      await addMessage(t, id, 'user', account.id, b);
      if (category === 'safety') await safetyFor(deps).openFromSupport(t, { accountId: account.id, ticketId: id });
    });
    return { ticket: await mine(account, id) };
  }

  async function mine(account, id) {
    const r = await db.query('select * from support_tickets where id = $1 and account_id = $2', [id, account.id]);
    if (!r.rows[0]) fail(404, 'not_found');
    return { ...ticketDto(r.rows[0]), messages: await messagesOf(id, false) };
  }

  async function listMine(account) {
    const r = await db.query('select * from support_tickets where account_id = $1 order by updated_at desc limit 50', [account.id]);
    return { tickets: r.rows.map(ticketDto) };
  }

  async function reply(account, id, body) {
    const b = text(body, 1, 4000, 'body_required');
    if (!newMessages.allow(account.id, clock.now())) fail(429, 'slow_down');
    await db.tx(async (t) => {
      const r = await t.query('select status from support_tickets where id = $1 and account_id = $2 for update', [id, account.id]);
      if (!r.rows[0]) fail(404, 'not_found');
      if (r.rows[0].status === 'closed') fail(409, 'closed');
      await addMessage(t, id, 'user', account.id, b);
      await t.query("update support_tickets set status = 'waiting_on_staff', updated_at = $2 where id = $1", [id, ts(clock.now())]);
    });
    return { ticket: await mine(account, id) };
  }

  async function closeMine(account, id) {
    const r = await db.query("update support_tickets set status = 'closed', closed_at = $3, updated_at = $3 where id = $1 and account_id = $2 and status <> 'closed' returning id", [id, account.id, ts(clock.now())]);
    if (!r.rowCount) fail(404, 'not_found');
    return { ok: true };
  }

  // ---------- Staff side ----------
  async function staffList(viewer, query) {
    const params = [];
    const where = [];
    if (query.status === 'active') where.push("t.status in ('open', 'waiting_on_staff', 'waiting_on_user')");
    else if (STATUSES.includes(query.status)) {
      params.push(query.status);
      where.push(`t.status = $${params.length}`);
    }
    if (SUPPORT_CATEGORIES.includes(query.category)) {
      params.push(query.category);
      where.push(`t.category = $${params.length}`);
    }
    if (query.assigned === 'me') {
      params.push(viewer.id);
      where.push(`t.assigned_to = $${params.length}`);
    }
    const r = await db.query(
      `select t.*, a.email as assignee_email from support_tickets t left join accounts a on a.id = t.assigned_to
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by case t.status when 'waiting_on_staff' then 0 when 'open' then 1 when 'waiting_on_user' then 2 else 3 end, t.priority desc, t.updated_at asc limit 300`,
      params
    );
    const counts = await db.query('select status, count(*)::int as n from support_tickets group by status');
    return {
      tickets: r.rows.map((t) => ({ ...ticketDto(t), accountId: t.account_id, assignedTo: t.assigned_to ? { id: t.assigned_to, email: t.assignee_email } : null })),
      counts: Object.fromEntries(counts.rows.map((c) => [c.status, c.n])),
    };
  }

  async function staffGet(viewer, id) {
    const r = await db.query('select t.*, a.email, a.email_verified_at, a.password_hash is not null as has_password, a.status as account_status from support_tickets t left join accounts a on a.id = t.account_id where t.id = $1', [id]);
    const t = r.rows[0];
    if (!t) fail(404, 'not_found');
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'support.ticket_viewed', targetType: 'support_ticket', targetId: id });
    return {
      ticket: { ...ticketDto(t), accountId: t.account_id, assignedTo: t.assigned_to },
      account: t.account_id ? { id: t.account_id, email: maskEmail(t.email), registered: Boolean(t.email_verified_at && t.has_password), status: t.account_status } : null,
      messages: await messagesOf(id, true),
    };
  }

  async function staffReply(viewer, id, body) {
    const b = text(body, 2, 4000, 'body_required');
    const accountId = await db.tx(async (t) => {
      const r = await t.query('select account_id, status from support_tickets where id = $1 for update', [id]);
      const row = r.rows[0];
      if (!row) fail(404, 'not_found');
      await addMessage(t, id, 'staff', viewer.id, b);
      await t.query("update support_tickets set status = 'waiting_on_user', assigned_to = coalesce(assigned_to, $2), closed_at = null, updated_at = $3 where id = $1", [id, viewer.id, ts(clock.now())]);
      await audit(t, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'support.replied', targetType: 'support_ticket', targetId: id });
      if (row.account_id) await notify(t, row.account_id, 'support_reply', { ticketId: id }, `support:${id}:${clock.now()}`);
      return row.account_id;
    });
    if (accountId) deps.realtime?.toUser(accountId, 'notification:new', {});
    return staffGet(viewer, id);
  }

  async function staffAssign(viewer, id, assigneeId) {
    const target = assigneeId || viewer.id;
    const r = await db.query('update support_tickets set assigned_to = $2, updated_at = $3 where id = $1 returning id', [id, target, ts(clock.now())]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'support.assigned', targetType: 'support_ticket', targetId: id, metadata: { assignee: target } });
    return { ok: true };
  }

  async function staffStatus(viewer, id, status) {
    if (!['open', 'resolved', 'closed'].includes(status)) fail(400, 'bad_status');
    const r = await db.query('update support_tickets set status = $2, closed_at = case when $2 in (\'resolved\', \'closed\') then $3::timestamptz else null end, updated_at = $3 where id = $1 returning id', [id, status, ts(clock.now())]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: `support.${status}`, targetType: 'support_ticket', targetId: id });
    return { ok: true };
  }

  return { create, mine, listMine, reply, closeMine, staffList, staffGet, staffReply, staffAssign, staffStatus };
}

export function mountSupport(app, deps) {
  const s = createSupport(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  const user = express.Router();
  user.use(json, auth);
  user.get('/tickets', handle((req) => s.listMine(req.account)));
  user.post('/tickets', handle(async (req, res) => {
    const out = await s.create(req.account, req.body || {});
    res.status(201);
    return out;
  }));
  user.get('/tickets/:id', handle(async (req) => ({ ticket: await s.mine(req.account, req.params.id) })));
  user.post('/tickets/:id/messages', handle((req) => s.reply(req.account, req.params.id, req.body?.body)));
  user.post('/tickets/:id/close', handle((req) => s.closeMine(req.account, req.params.id)));
  app.use('/api/support', user);

  const staff = staffFor(deps);
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/support/tickets', ...can('support.view'), handle((req) => s.staffList(req.account, req.query)));
  r.get('/support/tickets/:id', ...can('support.view'), handle((req) => s.staffGet(req.account, req.params.id)));
  r.post('/support/tickets/:id/reply', ...can('support.respond'), handle((req) => s.staffReply(req.account, req.params.id, req.body?.body)));
  r.post('/support/tickets/:id/assign', ...can('support.respond'), handle((req) => s.staffAssign(req.account, req.params.id, req.body?.assigneeId)));
  r.post('/support/tickets/:id/status', ...can('support.respond'), handle((req) => s.staffStatus(req.account, req.params.id, String(req.body?.status || ''))));
  app.use('/api/admin', r);
}
