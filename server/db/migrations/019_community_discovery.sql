-- Community discovery: scheduled discussions led by real people.
--
-- A discussion belongs to one room (topic + language) and is hosted by a
-- moderator, facilitator or verified professional: a person, never the AI.
-- Staff create and cancel them (permission community.manage); members can say
-- they are interested, which only reminds them shortly before the start. Who
-- is interested is never shown to anyone; the count only from 3 people up.

create table community_events (
  id bigint generated always as identity primary key,
  room_id text not null references community_rooms(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  host_account_id text references accounts(id) on delete set null,
  host_name text not null check (char_length(host_name) between 2 and 60),
  host_role text not null check (host_role in ('moderator', 'facilitator', 'professional')),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by text references accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  reminded_at timestamptz,
  check (ends_at > starts_at)
);
create index community_events_start_idx on community_events (starts_at) where status = 'scheduled';
create index community_events_room_idx on community_events (room_id, starts_at);

create table community_event_interest (
  event_id bigint not null references community_events(id) on delete cascade,
  account_id text not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, account_id)
);
create index community_event_interest_account_idx on community_event_interest (account_id);
