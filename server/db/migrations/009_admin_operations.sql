-- BeHappy admin control center, part 4: operations.

-- AI dashboard: outcome and latency per call (never content).
alter table ai_usage add column status text not null default 'ok' check (status in ('ok', 'error', 'refused'));
alter table ai_usage add column latency_ms int;
alter table ai_usage add column error_code text;

-- Versions of the server-owned AI instructions this deployment has run
-- (content hash; the reviewed text ships with the code and changes only
-- through code review and a deploy).
create table prompt_versions (
  prompt_key text not null,
  content_hash text not null,
  set_version text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (prompt_key, content_hash)
);

-- Complimentary Plus days from staff: not payments, never counted as revenue.
create table entitlement_grants (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('plus')),
  days int not null check (days between 1 and 366),
  starts_at timestamptz not null,
  reason text not null,
  granted_by text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text,
  revoke_reason text
);
create index entitlement_grants_account_idx on entitlement_grants (account_id);

-- Who suspended an account and why (accounts.status already exists).
alter table accounts add column suspended_at timestamptz;
alter table accounts add column suspended_by text;
alter table accounts add column suspension_reason text;

-- Country verification policies: drafted with a source, reviewed and
-- activated by someone else with a review reference. One active per country.
create table country_policies (
  id bigint generated always as identity primary key,
  country text not null check (country ~ '^[A-Z]{2}$'),
  version int not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired', 'withdrawn')),
  identity_document boolean not null default true,
  degree_document boolean not null default true,
  license_required boolean not null default false,
  registry_url text,
  notes text,
  source_reference text not null,
  drafted_by text not null,
  drafted_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  review_reference text,
  retired_at timestamptz,
  unique (country, version)
);
create unique index country_policies_one_active on country_policies (country) where status = 'active';

-- Review outcome per verification document.
alter table verification_documents add column review_outcome text check (review_outcome in ('accepted', 'rejected', 'unclear'));
alter table verification_documents add column reviewed_by text;
alter table verification_documents add column reviewed_at timestamptz;
alter table verification_documents add column review_note text;

-- BeHappy may cancel an appointment (both people are told why).
alter table bookings drop constraint bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('requested', 'confirmed', 'declined', 'cancelled_by_client', 'cancelled_by_professional', 'cancelled_by_admin', 'expired'));
alter table booking_events drop constraint booking_events_actor_kind_check;
alter table booking_events add constraint booking_events_actor_kind_check check (actor_kind in ('client', 'professional', 'system', 'admin'));

-- Community: staff-written room descriptions; moderator languages.
alter table community_rooms add column description jsonb not null default '{}';
create table moderator_languages (
  account_id text not null references accounts(id) on delete cascade,
  language text not null,
  primary key (account_id, language)
);

-- Safety cases, opened from urgent reports. Staff notes are encrypted.
create table safety_incidents (
  id bigint generated always as identity primary key,
  report_id bigint unique references reports(id) on delete set null,
  source text not null check (source in ('report', 'automatic', 'support')),
  room_id text,
  subject_account_id text references accounts(id) on delete set null,
  priority int not null default 3,
  status text not null default 'open' check (status in ('open', 'in_progress', 'escalated', 'resolved')),
  assigned_to text,
  resolution text check (resolution in ('resources_shared', 'no_risk_found', 'referred_to_emergency', 'duplicate', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index safety_incidents_status_idx on safety_incidents (status, created_at);
create table safety_incident_notes (
  id bigint generated always as identity primary key,
  incident_id bigint not null references safety_incidents(id) on delete cascade,
  author_id text,
  kind text not null default 'note' check (kind in ('note', 'assigned', 'escalated', 'resolved', 'reopened')),
  body_ciphertext bytea,
  body_iv bytea,
  body_tag bytea,
  created_at timestamptz not null default now()
);
create index safety_incident_notes_idx on safety_incident_notes (incident_id, id);

-- Governed, time-limited access to protected data. Off unless the owner
-- enables features.sensitiveAccess; approver must differ from requester.
create table sensitive_access_requests (
  id bigint generated always as identity primary key,
  requester_id text not null,
  subject_account_id text references accounts(id) on delete set null,
  category text not null check (category in ('private_messages', 'booking_notes')),
  resource_id text not null,
  purpose text not null,
  lawful_basis text not null check (lawful_basis in ('legal_obligation', 'vital_interests', 'user_request', 'legitimate_interest')),
  ticket_ref text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'denied', 'revoked', 'expired')),
  decided_by text,
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz,
  views int not null default 0,
  created_at timestamptz not null default now()
);

-- Support requests from people using the app. Subjects and messages are encrypted.
create table support_tickets (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  category text not null check (category in ('account', 'payment', 'professional', 'community', 'privacy', 'deletion', 'bug', 'safety', 'other')),
  subject_ciphertext bytea not null,
  subject_iv bytea not null,
  subject_tag bytea not null,
  status text not null default 'open' check (status in ('open', 'waiting_on_staff', 'waiting_on_user', 'resolved', 'closed')),
  priority int not null default 1,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index support_tickets_status_idx on support_tickets (status, updated_at desc);
create index support_tickets_account_idx on support_tickets (account_id, created_at desc);
create table support_messages (
  id bigint generated always as identity primary key,
  ticket_id text not null references support_tickets(id) on delete cascade,
  author_kind text not null check (author_kind in ('user', 'staff', 'system')),
  author_id text,
  body_ciphertext bytea not null,
  body_iv bytea not null,
  body_tag bytea not null,
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on support_messages (ticket_id, id);
