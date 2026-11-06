-- An opaque public handle for each community member. Clients block, mute
-- and report members by this ref, so account ids never reach other members.
alter table community_profiles add column ref text;
update community_profiles set ref = 'm_' || substr(md5(random()::text || account_id), 1, 16) where ref is null;
alter table community_profiles alter column ref set not null;
create unique index community_profiles_ref_idx on community_profiles (ref);
