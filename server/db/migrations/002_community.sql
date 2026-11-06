-- BeHappy Community: topic rooms per language, pseudonymous peer support,
-- moderation. A community profile (pseudonym) is separate from the account's
-- email, professional profile and bookings; nothing links them publicly.

create table community_topics (
  id text primary key,
  sort int not null,
  icon text not null,
  is_active boolean not null default true
);

-- One room per topic per app language ("panic:ka", "panic:en", ...).
create table community_rooms (
  id text primary key,
  topic_id text not null references community_topics(id),
  language text not null,
  pinned_message_id bigint,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (topic_id, language)
);
create index community_rooms_language_idx on community_rooms (language);

create table community_profiles (
  account_id text primary key references accounts(id) on delete cascade,
  pseudonym citext not null unique,
  avatar_seed int not null default 0,
  guidelines_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_pseudonym_length check (char_length(pseudonym) between 3 and 24)
);

create table room_memberships (
  room_id text not null references community_rooms(id) on delete cascade,
  account_id text not null references accounts(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_message_id bigint not null default 0,
  notify text not null default 'mentions' check (notify in ('all', 'mentions', 'none')),
  primary key (room_id, account_id)
);
create index room_memberships_account_idx on room_memberships (account_id);

-- author_pseudonym is a display snapshot; after an account is deleted its
-- messages are emptied and shown as "Former member".
create table community_messages (
  id bigint generated always as identity primary key,
  room_id text not null references community_rooms(id) on delete cascade,
  author_account_id text references accounts(id) on delete set null,
  author_kind text not null check (author_kind in ('member', 'anulia', 'system')),
  author_pseudonym text,
  body text not null,
  reply_to_id bigint references community_messages(id) on delete set null,
  asks_anulia boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'held', 'removed', 'deleted')),
  removal_reason text,
  removed_by text,
  created_at timestamptz not null default now(),
  client_nonce text,
  flags jsonb not null default '{}',
  constraint community_message_length check (char_length(body) <= 2000),
  unique (author_account_id, client_nonce)
);
create index community_messages_room_idx on community_messages (room_id, id desc);
create index community_messages_author_idx on community_messages (author_account_id, created_at desc);
create index community_messages_trgm on community_messages using gin (body gin_trgm_ops);

alter table community_rooms add constraint community_rooms_pinned_fk foreign key (pinned_message_id) references community_messages(id) on delete set null;

create table message_reactions (
  message_id bigint not null references community_messages(id) on delete cascade,
  account_id text not null references accounts(id) on delete cascade,
  reaction text not null check (reaction in ('support', 'hug', 'strength', 'thanks', 'same')),
  created_at timestamptz not null default now(),
  primary key (message_id, account_id, reaction)
);

create table user_blocks (
  blocker_id text not null references accounts(id) on delete cascade,
  blocked_id text not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table user_mutes (
  muter_id text not null references accounts(id) on delete cascade,
  muted_id text not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

-- Reports from members (and from the automatic safety check, reporter_kind
-- 'system'). The snapshot keeps what was reported even if it is later removed.
create table reports (
  id bigint generated always as identity primary key,
  reporter_account_id text references accounts(id) on delete set null,
  reporter_kind text not null default 'member' check (reporter_kind in ('member', 'system')),
  target_type text not null check (target_type in ('message', 'member', 'professional', 'pro_message')),
  target_id text not null,
  target_account_id text references accounts(id) on delete set null,
  room_id text,
  reason text not null check (reason in ('harassment', 'hate', 'self_harm_risk', 'spam', 'misinformation', 'impersonation', 'sexual', 'privacy', 'violence', 'other')),
  details text,
  snapshot jsonb not null default '{}',
  priority int not null default 0,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  resolution text,
  resolution_note text
);
create index reports_queue_idx on reports (status, priority desc, created_at);
create unique index reports_once_idx on reports (reporter_account_id, target_type, target_id) where reporter_account_id is not null and status in ('open', 'in_review');

-- Every moderation decision, by a person or the system: the audit history.
create table moderation_actions (
  id bigint generated always as identity primary key,
  actor_account_id text,
  actor_kind text not null default 'moderator' check (actor_kind in ('moderator', 'admin', 'system')),
  action text not null,
  target_account_id text,
  target_message_id bigint,
  report_id bigint,
  room_id text,
  reason text,
  note text,
  duration_hours int,
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on moderation_actions (target_account_id, created_at desc);
create index moderation_actions_created_idx on moderation_actions (created_at desc);

create table suspensions (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  scope text not null default 'community' check (scope in ('community', 'platform')),
  kind text not null check (kind in ('temporary', 'permanent')),
  reason text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by text,
  lifted_at timestamptz,
  lifted_by text,
  created_at timestamptz not null default now(),
  check ((kind = 'permanent' and ends_at is null) or (kind = 'temporary' and ends_at is not null))
);
create index suspensions_account_idx on suspensions (account_id, starts_at desc);

create table appeals (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  suspension_id bigint references suspensions(id) on delete set null,
  action_id bigint references moderation_actions(id) on delete set null,
  body text not null check (char_length(body) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'upheld', 'overturned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decision_note text
);
create index appeals_status_idx on appeals (status, created_at);
create unique index appeals_once_idx on appeals (account_id, suspension_id) where status = 'open';
