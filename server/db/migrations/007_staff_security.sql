-- BeHappy admin control center, part 2: staff roles, step-up, two-step codes,
-- security events and platform settings.

-- Staff roles. Permissions per role live in server/admin/permissions.mjs.
alter table accounts drop constraint accounts_roles_known;
alter table accounts add constraint accounts_roles_known
  check (roles <@ array['owner', 'admin', 'verifier', 'moderator', 'finance', 'support', 'analyst']::text[]);

-- Staff access can be suspended without removing the roles.
alter table accounts add column staff_suspended_at timestamptz;
alter table accounts add column staff_suspended_by text;
alter table accounts add column staff_suspension_reason text;

-- Step-up: when this session last re-confirmed the password (and code), for
-- sensitive staff actions. mfa_at: when this session entered a two-step code.
alter table sessions add column step_up_at timestamptz;
alter table sessions add column mfa_at timestamptz;

-- Two-step sign-in codes (TOTP) for staff. The shared secret is encrypted;
-- last_used_step stops a code from being used twice.
create table staff_mfa (
  account_id text primary key references accounts(id) on delete cascade,
  secret_ciphertext bytea not null,
  secret_iv bytea not null,
  secret_tag bytea not null,
  enabled_at timestamptz,
  last_used_step bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Security events: failed and successful sign-ins, lockouts, step-ups, role
-- changes, rate limits. Never passwords, tokens or codes. IPs are stored only
-- as keyed hashes.
create table auth_events (
  id bigint generated always as identity primary key,
  account_id text,
  kind text not null,
  ip_hash text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index auth_events_created_idx on auth_events (created_at desc);
create index auth_events_account_idx on auth_events (account_id, created_at desc);
create index auth_events_kind_idx on auth_events (kind, created_at desc);

-- Platform settings and switches (defaults in server/admin/settings.mjs).
create table platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
