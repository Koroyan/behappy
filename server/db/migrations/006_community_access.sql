-- BeHappy admin control center, part 1: community access control.
-- A room can be paused by staff: members keep reading, nobody can post or react.
alter table community_rooms add column is_paused boolean not null default false;
alter table community_rooms add column paused_at timestamptz;
alter table community_rooms add column paused_by text;
alter table community_rooms add column pause_reason text;
