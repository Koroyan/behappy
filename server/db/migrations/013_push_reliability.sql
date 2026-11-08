-- Phone notifications: one delivery record per notification and phone.
--
-- notifications.pushed_at now means "turned into deliveries" (or settled
-- without any: no phone, already read, too old). Each delivery is:
--   pending → sending → sent         accepted by Expo (ticket_id), not yet "on the phone"
--                     → pending      a temporary error: retried with backoff
--                     → failed       a permanent error, or 5 attempts
--                     → invalid_token  the phone uninstalled / turned BeHappy off
--   pending → skipped                read meanwhile, category off, chat open, phone gone
--   pending → expired                older than 14 hours
-- receipt_status records what Expo later reports about handing it to Apple /
-- Google ("ok" or "error"); that is the closest a server gets to "delivered".
-- The in-app notification itself never depends on any of this.
create table push_deliveries (
  id bigint generated always as identity primary key,
  notification_id bigint not null references notifications(id) on delete cascade,
  account_id text not null references accounts(id) on delete cascade,
  token text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'skipped', 'failed', 'expired', 'invalid_token')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  ticket_id text,
  receipt_status text,
  receipt_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (notification_id, token)
);
create index push_deliveries_due_idx on push_deliveries (next_attempt_at) where status = 'pending';
create index push_deliveries_sending_idx on push_deliveries (claimed_at) where status = 'sending';
create index push_deliveries_receipts_idx on push_deliveries (sent_at) where status = 'sent' and receipt_status is null;
create index push_deliveries_created_idx on push_deliveries (created_at);

-- Once a minute at most per phone (was in memory, lost on restart).
alter table push_devices add column last_push_at timestamptz;
