// In-app notifications. The server stores a kind and a small data object; the
// app renders and translates them, so every notification appears in the
// person's own language. ref_key makes each one idempotent (a reminder that is
// computed twice is stored once).

import { ms } from '../db/index.mjs';

export async function notify(q, accountId, kind, data = {}, refKey = '') {
  const r = await q.query(
    'insert into notifications (account_id, kind, data, ref_key) values ($1, $2, $3::jsonb, $4) on conflict (account_id, kind, ref_key) do nothing returning id',
    [accountId, kind, JSON.stringify(data), String(refKey || Date.now())]
  );
  return r.rows[0]?.id ?? null;
}

export const toNotification = (row) => ({ id: row.id, kind: row.kind, data: row.data || {}, createdAt: ms(row.created_at), readAt: ms(row.read_at) });

export async function listNotifications(q, accountId, { limit = 50, before } = {}) {
  const r = before
    ? await q.query('select * from notifications where account_id = $1 and id < $2 order by id desc limit $3', [accountId, Number(before), limit])
    : await q.query('select * from notifications where account_id = $1 order by id desc limit $2', [accountId, limit]);
  return r.rows.map(toNotification);
}

export async function unreadCount(q, accountId) {
  return (await q.query('select count(*)::int as n from notifications where account_id = $1 and read_at is null', [accountId])).rows[0].n;
}
