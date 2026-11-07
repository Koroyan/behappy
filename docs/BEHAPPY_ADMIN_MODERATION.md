# Admin: moderation, safety cases and support

Complements [BEHAPPY_3_MODERATION.md](BEHAPPY_3_MODERATION.md). Decisions on reports and appeals are still made in the **moderation desk** (`/moderation`); the admin center adds statistics, context, safety cases and support.

## Moderation statistics

`/admin/moderation` (moderation.act), for the chosen period:

- Open and urgent reports now, and the oldest open one
- Reports per day (member and automatic), reports by reason
- Resolved reports, dismissed, typical time to resolve (median) and the 90th percentile
- Actions taken by type; review requests (waiting, decision kept, decision changed)
- Workload: actions per moderator (numbered, for balancing shifts, not ranking people)

## Report context

`GET /api/admin/moderation/reports/:id/context` (moderation.context): up to five messages before and five after **one** reported message, from the same room, with the statuses moderators already see. Every view is logged (`moderation.context_viewed`). There is no way to browse rooms or anyone's message history from the admin center.

## Safety cases

`/admin/safety` (safety.view; actions need safety.manage).

**Where cases come from:** every urgent report (priority 3: possible risk to the writer, or violence), from a member or from the automatic check on posting, and every support request in the "safety" category. Cases are opened when the queue is opened, on the dashboard and on every scheduler run (idempotent).

**What happens for the person at risk does not wait for staff:** the app shows emergency resources immediately and automatically. The safety queue is follow-up during **staffed hours**; BeHappy does not promise round-the-clock human intervention, and the admin center says so.

**Working a case:** take it (assigns you, status "in progress"), add notes, escalate (with a note on what happened and who it goes to), close with an outcome, or reopen. Outcomes are operational only: resources shared, referred to emergency services, no risk found, duplicate, other (with a note). **No diagnoses or labels about anyone's mental health are recorded.** Notes are encrypted at rest (AES-256-GCM, `MESSAGE_ENCRYPTION_KEY`) and every view of a case is logged.

## Support requests

People write from **Profile › Help and support** (`/support`): a topic (account and sign-in, payments, for professionals, community, privacy, delete my data, something isn't working, safety, something else), a subject and a message. They follow replies in the app and get a notification when the team answers. The "safety" topic shows emergency resources right away and opens a safety case; "delete my data" points to self-service deletion too. All of this is in 19 languages.

Staff (`/admin/support`, support.view; replies need support.respond) see the queue by status and topic, open a request (view logged), reply, assign to themselves, mark resolved, close or reopen. Contact details are masked unless the viewer has `users.contact`.

**Subjects and messages are encrypted at rest.** Limits: 5 new requests per account per day, 30 messages per hour.

## Endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/moderation/stats` | moderation.act |
| GET | `/api/admin/moderation/reports/:id/context` | moderation.context |
| GET | `/api/admin/safety/incidents`, `/:id` | safety.view |
| POST | `/api/admin/safety/incidents/:id/assign\|notes\|escalate\|resolve\|reopen` | safety.manage |
| GET/POST | `/api/support/tickets`, `/:id`, `/:id/messages`, `/:id/close` | the person (own requests only) |
| GET | `/api/admin/support/tickets`, `/:id` | support.view |
| POST | `/api/admin/support/tickets/:id/reply\|assign\|status` | support.respond |
| everything under `/api/moderation/*` | the desk | moderation.act / moderation.appeals |
