# Admin analytics

First-party usage statistics, built to answer "which parts of BeHappy are used, and how much" without collecting what anyone writes, says or answers. No third-party trackers.

## What the app sends

`lib/analytics/index.ts` sends batches to `POST /api/events`. The server keeps an event only if it matches the allowlist in `server/analytics/index.mjs`; anything else is dropped:

| Event | Fields |
|---|---|
| `session_start` | `kind`: `cold` or `resume` |
| `screen_view` | the part of the app (`feature`), nothing else |
| `engagement` | `feature`, `seconds` (1–300) |
| `action` | `feature`, `kind` from a fixed list (e.g. journal `entry_saved`, community `room_joined`, specialists `booking_requested`, assessments `assessment_completed`) |
| `error` | `kind`: `network`, `server` or `render` |

- Every field is an enum or a bounded number. **No free text is accepted**, so journal text, conversations, assessment answers and scores cannot be stored. Example: an assessment completion is recorded, never the result.
- Features are derived from the route (`featureForPath`); staff screens (`/admin`, `/moderation`) are never counted.
- Time counts only while the app is visible and in use (web: stops after 2 minutes without input; native: while in the foreground).
- Sessions end after 30 minutes of inactivity. Events wait in an on-device queue when offline (at most 300). The tracker never creates an account just to send statistics.
- Each event has a random id; a repeated id is stored once (`dedupe_key`), so retries never double-count.

## Choice and retention

- **Profile › Privacy › Usage statistics.** Off stops collection on the device and the server, and deletes the events and daily totals kept for that account. The server also refuses events from accounts that opted out.
- **Settings › Usage statistics** (admin): stops collection for everyone.
- Raw events are deleted after `analytics.retentionDays` (default 395 days). Per-day totals per person (`analytics_daily`: seconds, sessions, actions, seconds per feature) are kept up to 760 days. Deleting an account deletes its events and totals.
- Days are UTC.

## What staff see

`analytics.view` (owner, admin, finance, analyst):

- Active people today / 7 days / 30 days, stickiness (today ÷ 30 days)
- Active people, time in the app per active day, sessions per active day, new accounts and registrations, each compared with the previous period of the same length
- Active people and minutes per day (charts with table views)
- Time and actions by part of the app
- People by platform
- Weekly retention cohorts (share of each first week's people who came back in later weeks)

**Small groups are hidden:** any figure about fewer than `ANALYTICS_MIN_COHORT` people (default 5) shows as "hidden" (features, actions, platforms, cohorts, room member counts).

**Export** (`analytics.export`, step-up): a CSV of daily totals (day, active people, minutes, sessions, new accounts) with no account ids; logged as `analytics.exported`.

**One person's use** appears only on that person's account page (`users.view`): active days, minutes, sessions and top features over 30 days — or "switched off" if they opted out. No event lists, no content.

## KPI overview

`GET /api/admin/dashboard?from&to` combines server records (accounts, registrations, community messages, booking requests, submitted applications, AI requests), queues waiting for a person, and — by permission — engagement (`analytics.view`) and TEST revenue (`finance.view`). Every KPI shows the change against the previous period; with no earlier data it says so instead of showing a percentage.

## Endpoints

| Method | Path | Permission |
|---|---|---|
| POST | `/api/events` | any account |
| GET/PUT | `/api/account/privacy` | the account itself |
| GET | `/api/admin/analytics/overview` | analytics.view |
| GET | `/api/admin/analytics/features` | analytics.view |
| GET | `/api/admin/analytics/retention` | analytics.view |
| GET | `/api/admin/analytics/export` | analytics.export + step-up |
| GET | `/api/admin/dashboard` | dashboard.view |

## Limits

- Rate limit: 400 events per account per 10 minutes; at most 50 per batch; events older than 7 days or more than 5 minutes in the future are dropped.
- These are product statistics, not clinical data, and must not be used to draw conclusions about anyone's health.
