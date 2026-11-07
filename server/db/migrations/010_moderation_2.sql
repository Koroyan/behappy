-- Moderation 2.0 and stronger protected-data requests.

-- Internal notes on a report (staff only, encrypted at rest).
create table moderation_report_notes (
  id bigint generated always as identity primary key,
  report_id bigint not null references reports(id) on delete cascade,
  author_id text,
  body_ciphertext bytea not null,
  body_iv bytea not null,
  body_tag bytea not null,
  created_at timestamptz not null default now()
);
create index moderation_report_notes_report_idx on moderation_report_notes (report_id, id);

-- Assignment time and "second review": the moderator who asked for it can't settle the report.
alter table reports add column assigned_at timestamptz;
alter table reports add column second_review_requested_at timestamptz;
alter table reports add column second_review_requested_by text;
alter table reports add column second_review_reason text;

-- Queue and member-history lookups.
create index reports_assigned_idx on reports (assigned_to, status);
create index reports_target_account_idx on reports (target_account_id, created_at desc);
create index reports_target_idx on reports (target_type, target_id);
create index moderation_actions_report_idx on moderation_actions (report_id);
create index appeals_account_idx on appeals (account_id, created_at desc);

-- Legal requests recorded by an owner before any protected-data request can cite them.
create table legal_cases (
  id bigint generated always as identity primary key,
  reference text not null,
  authority text not null,
  received_at timestamptz not null,
  subject_account_id text references accounts(id) on delete set null,
  evidence_reference text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  recorded_by text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- A request now cites a case that exists and covers the person concerned.
alter table sensitive_access_requests add column case_type text check (case_type in ('support_ticket', 'safety_case', 'legal_case'));
alter table sensitive_access_requests add column case_id text;
alter table sensitive_access_requests add column evidence_reference text;
create index sensitive_requests_requester_idx on sensitive_access_requests (requester_id, created_at desc);
