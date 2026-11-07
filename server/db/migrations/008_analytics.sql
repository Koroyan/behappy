-- BeHappy admin control center, part 3: first-party usage analytics.
-- Only allowlisted event names with enum or number properties (see
-- server/analytics/events.mjs): never journal text, conversations, assessment
-- answers or any free text. Deleting an account deletes its events.

alter table accounts add column analytics_opt_out boolean not null default false;

create table analytics_events (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  session_id text not null,
  name text not null,
  feature text,
  props jsonb not null default '{}',
  platform text check (platform in ('web', 'ios', 'android')),
  app_version text,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  dedupe_key text not null unique
);
create index analytics_events_time_idx on analytics_events (occurred_at);
create index analytics_events_account_idx on analytics_events (account_id, occurred_at);
create index analytics_events_name_idx on analytics_events (name, occurred_at);

-- Per person per day, kept after the raw events expire. features: seconds per feature.
create table analytics_daily (
  day date not null,
  account_id text not null references accounts(id) on delete cascade,
  active_seconds int not null default 0,
  sessions int not null default 0,
  events int not null default 0,
  actions int not null default 0,
  features jsonb not null default '{}',
  platform text,
  primary key (day, account_id)
);
create index analytics_daily_account_idx on analytics_daily (account_id, day);
