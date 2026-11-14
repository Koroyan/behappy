# Notifications: architecture and reliability

Code: `server/notify/` (push.mjs, pushText.mjs, routes.mjs, notifications.mjs),
`lib/notifications/` (app), migrations `011_push_notifications.sql`,
`013_push_reliability.sql`. Tests: `server/test/push.test.mjs` (17),
`lib/notifications/planner.test.mjs` (9).

## Pieces

| Piece | Where | Notes |
|---|---|---|
| In-app notifications | `notifications` table, `/notifications` screen | The source of truth; never depends on push |
| Phone push (chats, messages, appointments, account) | Expo push service | Per-category switches, discreet by default |
| Gentle reminders (journal, art, cards) | Local notifications on the phone | Planned from on-device data only |
| Live unread counts | `/api/unread`, Socket.IO events | Tab bar, avatar, sidebar, lists, app icon, browser tab |
| Browser notifications | Web, while a tab is open in the background | Opt-in, same discreet text |

## Push delivery (fixed in this release)

Before: `notifications.pushed_at` was set **before** Expo answered, so a network
error or a 5xx lost the push; quiet hours used the time zone of the person's
first phone only.

Now each notification becomes **one delivery per phone** (`push_deliveries`):

```
pending → sending → sent (Expo accepted: ticket id) → receipt ok / error (Apple/Google)
                  → pending (temporary error: network, 5xx, 429, MessageRateExceeded) with backoff 30 s, 1, 2, 4 … min
                  → failed (permanent error, or 5 attempts)
                  → invalid_token (DeviceNotRegistered: the phone is forgotten)
pending → skipped (read meanwhile, category off, chat open, phone gone or reassigned)
pending → expired (older than 14 hours)
```

- **Durable and safe with several servers:** claims run in a transaction with
  `FOR UPDATE SKIP LOCKED`; a delivery left in `sending` by a crashed worker is
  taken back after 5 minutes; `(notification_id, token)` is unique. A crash
  between Expo's answer and the database update can still repeat one push
  (at-least-once); everything else is exactly once.
- **Sent ≠ delivered:** `sent` means Expo accepted it (a ticket). About 15
  minutes later the server reads Expo's receipts (`receipt_status`): whether
  Apple/Google accepted it. Nothing tells a server that a person saw it.
- **Quiet hours per phone:** each phone is checked on its own clock (its time
  zone at registration). Tbilisi 16:00 and New York 07:00 → only the Tbilisi
  phone is pushed now; New York's waits until 08:00 its time and then gets one
  summary of what is still unread.
- **At most one push a minute per phone** (`push_devices.last_push_at`, survives restarts).
- Records are deleted after 30 days.

## What a push says (privacy)

- Default ("Show who wrote and where" on): the room's name in the phone's
  language as the title and who wrote as the text ("Panic attacks — New
  message from Nino", "Sleep — Bea mentioned you"); a professional's name for
  a private message. Turned off: "BeHappy — You have a new message" / "New
  notifications: 3". **Message text is never pushed.** Room names come from
  the app's translations (`node scripts/i18n/push-topic-names.mjs` →
  `server/notify/topicNames.mjs`).
- Web: one notification per room on the screen (tag `behappy-room-<room>`); a
  newer one replaces that room's last. Apple refuses a Web Push `Topic` whose
  length is 4n+1 (400 BadWebPushTopic), so `webTopic()` turns such names into
  a fixed 32-character digest.
- Nothing about moods, journals, assessments or art appears on a lock screen;
  reminders use neutral wording (`i18n/locales/alerts`).
- Phones are tied to the session that registered them: signing out, a revoked
  or expired session stops pushes immediately.

## Reminders (unchanged rules, verified)

At most one per activity per day and two a day in total, three hours apart,
never in quiet hours, nothing for what is already done today, smart timing from
the person's own habits, easing off after silence (daily → every other day →
weekly → stop after three weeks), no streaks or guilt. Planned again on app
start, return to the app, new entries and language change; time-zone and
daylight-saving changes are handled by planning in local time on each run.

## Badge counts

App icon = unread notifications + unread private messages (same on server and
app). Community tab = unread community messages; avatar = notifications +
private messages. Reading a room or a conversation also marks its notifications
read on every device (`unread:changed`), so nothing is counted twice. Counts are
refreshed on live events, socket reconnect, return to the app and every 90 s.

## Tests (17 push + 9 planner)

Who and where, never message content · plain text with it off · read in the
room or reading it now → no push · "Every message" bursts · quiet hours summary
· categories off · signing out · live badges · DeviceNotRegistered ·
**temporary failure retried with backoff, never lost in the app** · **5 attempts
then failed; a final error at once** · **Tbilisi awake / New York asleep** ·
**receipts** · **crashed claim taken back; two workers never send twice**.

## Not verifiable here

Real delivery to an iPhone needs `EAS_PROJECT_ID` (Expo account, `npx eas init`);
it was not tested on a device. Android Expo Go cannot receive remote push since
SDK 53 (a development build can).
