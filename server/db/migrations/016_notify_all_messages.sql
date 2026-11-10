-- Community: a room someone joined tells them about new messages by default
-- ("Every message"), not only replies and @mentions. Still one notification per
-- unread burst per room (service.mjs), still never from someone blocked or
-- muted, and "Mentions only" / "Nothing" remain one tap away in the room.
-- Before launch nobody had chosen "Mentions only" on purpose (it was the only
-- default), so existing memberships follow the new default.
alter table room_memberships alter column notify set default 'all';
update room_memberships set notify = 'all' where notify = 'mentions';
