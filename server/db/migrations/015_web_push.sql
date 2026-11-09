-- Web Push (installed BeHappy web app / browsers) next to Expo push (phones).
--
-- A browser subscription is a push_devices row with platform 'web': its token
-- is the push service endpoint (an https URL of a known push service) and the
-- two public keys the browser gave for encrypting messages to it. Messages are
-- end-to-end encrypted (RFC 8291) and signed with BeHappy's VAPID key.
--
-- chats: whether this device wants in-app notifications (community replies,
-- messages, appointments). A browser may be registered only for reminders.
alter table push_devices drop constraint if exists push_devices_platform_check;
alter table push_devices add constraint push_devices_platform_check check (platform in ('ios', 'android', 'web'));
alter table push_devices add column web_p256dh text;
alter table push_devices add column web_auth text;
alter table push_devices add column chats boolean not null default true;

-- Reminders for browsers. Phones schedule reminders themselves (local
-- notifications); a browser can't, so the app plans them exactly as on a phone
-- (lib/notifications/planner.ts, from data that stays on the device) and sends
-- only the result: when, the discreet lock-screen text and where a tap leads.
-- The server sends each one once, at its time; a new plan replaces what is
-- still pending. Gone with the device, the session or the account.
--   pending → sending → sent | pending (retry) | failed
--   pending → expired   (more than 2 hours late: a reminder is no use then)
create table push_reminders (
  token text not null references push_devices(token) on delete cascade,
  reminder_id text not null,
  account_id text not null references accounts(id) on delete cascade,
  kind text not null,
  due_at timestamptz not null,
  title text not null,
  body text not null,
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  primary key (token, reminder_id)
);
create index push_reminders_due_idx on push_reminders (due_at) where status = 'pending';
create index push_reminders_account_idx on push_reminders (account_id);

-- Keys the server makes for itself in development (the VAPID key pair when
-- WEB_PUSH_* is not set). Production sets its keys in the environment.
create table server_keys (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
