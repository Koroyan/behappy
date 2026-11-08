-- Phone notifications (Expo push) for in-app notifications.
--
-- A notification row is still the source of truth; `pushed_at` records that
-- the push step has handled it (sent, merged into a summary, or skipped
-- because it was already read or the person was looking at that chat).
alter table notifications add column pushed_at timestamptz;
-- Everything that existed before phones could be notified stays in the app only.
update notifications set pushed_at = coalesce(read_at, created_at) where pushed_at is null;
create index notifications_unpushed_idx on notifications (created_at) where pushed_at is null;

-- One row per phone. Tied to the session that registered it: signing out (or
-- a revoked or expired session) stops pushes to that phone without any extra
-- step, and deleting the account removes the rows.
create table push_devices (
  token text primary key,
  account_id text not null references accounts(id) on delete cascade,
  session_id text references sessions(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  language text not null default 'en',
  tz text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_devices_account_idx on push_devices (account_id);

-- What a person wants on their phone (categories, names in previews, quiet hours).
create table notification_prefs (
  account_id text primary key references accounts(id) on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
