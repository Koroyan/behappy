-- Phone and web notifications say who wrote and in which room by default
-- ("Panic attacks: New message from Nino"), never what was written. "Show who
-- wrote and where" stays one tap away for anyone who wants plain "New message".
-- Saving any notification setting used to store the old default (off) too, so
-- before launch nobody can be told apart as having chosen it: everyone follows
-- the new default.
update notification_prefs set prefs = jsonb_set(prefs, '{previews}', 'true'::jsonb) where prefs->>'previews' = 'false';
