-- BeHappy 3.0 core schema: accounts, sessions, payments, AI metering,
-- notifications and the audit log. Times are timestamptz (UTC). Money is in
-- minor units (tetri). Content of journals, Anulia conversations, art and
-- assessments is never stored here: it stays on the person's device.

create extension if not exists btree_gist;
create extension if not exists pg_trgm;
create extension if not exists citext;

create table meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- One row per person. Starts anonymous (device token + recovery code); may
-- later add a verified email and password ("registered") without changing id,
-- so nothing attached to the account is lost.
create table accounts (
  id text primary key,
  recovery_hash text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  email citext unique,
  email_verified_at timestamptz,
  password_hash text,
  password_changed_at timestamptz,
  roles text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'suspended')),
  failed_logins int not null default 0,
  locked_until timestamptz,
  constraint accounts_roles_known check (roles <@ array['moderator', 'admin']::text[])
);
create index accounts_recovery_idx on accounts (recovery_hash);

-- Bearer sessions. Only SHA-256 hashes of tokens are stored.
create table sessions (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  token_hash text not null unique,
  kind text not null default 'device' check (kind in ('device', 'password')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  user_agent text
);
create index sessions_account_idx on sessions (account_id);

-- One-time codes for email/phone verification and password reset (hashed).
create table verification_codes (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  purpose text not null check (purpose in ('verify_email', 'verify_phone', 'reset_password')),
  target text not null,
  code_hash text not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create index verification_codes_account_idx on verification_codes (account_id, purpose, created_at desc);

-- Payment orders (Flitt TEST). Kept for accounting after an account is
-- deleted, detached from it (account_id null, account_deleted true).
create table orders (
  id text primary key,
  account_id text references accounts(id) on delete set null,
  account_deleted boolean not null default false,
  professional_id text,
  product_id text not null,
  product_kind text not null,
  duration_days int,
  amount_minor int not null check (amount_minor > 0),
  currency text not null,
  mode text not null default 'test' check (mode = 'test'),
  status text not null check (status in ('created', 'processing', 'approved', 'declined', 'expired', 'reversed', 'partially_reversed', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  reversed_at timestamptz,
  reversal_amount int,
  return_url text,
  checkout_url text,
  payment_id text,
  masked_card text,
  flitt_status text,
  error_reason text,
  last_status_check_at timestamptz,
  last_response_code text,
  last_response_description text,
  attempt_declined boolean not null default false,
  history jsonb not null default '[]'
);
create index orders_account_idx on orders (account_id, created_at desc);
create index orders_status_idx on orders (status, created_at desc);

-- Each verified (order, payment, status) event is applied once.
create table payment_events (
  dedupe_key text primary key,
  order_id text not null,
  via text not null,
  note text,
  created_at timestamptz not null default now()
);

-- AI allowances (server-side quotas).
create table usage_counters (
  account_id text not null references accounts(id) on delete cascade,
  name text not null,
  period text not null,
  count int not null default 0,
  primary key (account_id, name, period)
);

create table ai_conversations (
  account_id text not null references accounts(id) on delete cascade,
  key text not null,
  count int not null default 0,
  grace int not null default 0,
  started_at timestamptz not null default now(),
  primary key (account_id, key)
);

create table art_session_usage (
  account_id text not null references accounts(id) on delete cascade,
  session_id int not null check (session_id between 1 and 43),
  count int not null default 0,
  started_at timestamptz not null default now(),
  primary key (account_id, session_id)
);

-- Which account created an OpenAI response chain (previous_response_id).
create table ai_response_owners (
  response_id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Token counts for cost reporting. No prompts, no replies, no content.
create table ai_usage (
  id bigint generated always as identity primary key,
  account_id text references accounts(id) on delete set null,
  feature text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_created_idx on ai_usage (created_at);

-- In-app notifications. `kind` + `data` are rendered (and translated) by the
-- app; ref_key makes reminders idempotent.
create table notifications (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  ref_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (account_id, kind, ref_key)
);
create index notifications_account_idx on notifications (account_id, created_at desc);

-- Who did what, for moderation, verification, refunds and role changes. No
-- foreign key: the record outlives the accounts it mentions.
create table audit_log (
  id bigint generated always as identity primary key,
  actor_account_id text,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_target_idx on audit_log (target_type, target_id, created_at desc);
create index audit_log_created_idx on audit_log (created_at desc);
