# Admin operations: setup, roles and day-to-day use

## Setup

1. Deploy as in [README](../README.md) (`deploy/docker-compose.yml` for production). Migrations `006`–`009` apply automatically at start; they add tables and columns and change no existing data.
2. Production needs, besides the 3.0 settings: `DATABASE_URL`, https `PUBLIC_API_URL` / `APP_PUBLIC_URLS`, and three base64 32-byte keys `DOCUMENT_ENCRYPTION_KEY`, `MESSAGE_ENCRYPTION_KEY`, `IDENTIFIER_HMAC_KEY` (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). The server refuses to start without them.
3. Register your own BeHappy account in the app (email and password).
4. On the server: `npm run admin:grant -- you@example.org owner` (needs `ADMIN_TOKEN` in `server/.env`; the value is read there and never printed).
5. Sign out and sign in again with email and password; open `/admin`.
6. In **My security**, turn on two-step codes. Then, if you want, require them for all staff in **Settings**.
7. Add your team in **Staff and access** (they register first). Give each the narrowest role that fits.
8. Optionally unset `ADMIN_TOKEN` (it is only for bootstrapping owners).

## Environment variables (new or newly relevant)

| Variable | Default | Purpose |
|---|---|---|
| `ANALYTICS_MIN_COHORT` | 5 | Smallest group shown in aggregates |
| `AI_PRICE_INPUT_PER_MTOK`, `AI_PRICE_OUTPUT_PER_MTOK` | — | Fallback model prices (USD per million tokens) for cost estimates; the AI page can set them too |
| `SCHEDULER_INTERVAL_SECONDS` | 300 | Background jobs |
| `PRO_VERIFICATION_VALID_DAYS` | 365 | Length of a verification and of a renewal |
| `ADMIN_TOKEN` | — | Bootstrap the first owner (server only) |
| `DOCUMENT_ENCRYPTION_KEY`, `MESSAGE_ENCRYPTION_KEY`, `IDENTIFIER_HMAC_KEY` | dev keys | Required in production |

## Platform settings (admin center › Settings)

| Key | Default | Who | Notes |
|---|---|---|---|
| `analytics.enabled` | on | settings.manage | Usage statistics for everyone |
| `analytics.retentionDays` | 395 | settings.manage | 30–760 |
| `staff.mfaRequired` | off | owner | Needs your own codes first |
| `staff.stepUpMinutes` | 15 | owner | 5–60 |
| `features.sensitiveAccess` | off | owner | Protected-data requests |
| `announcement` | off | settings.manage | Today notice, English and Georgian (others see English) |
| `ai.features` | all on | ai.manage (AI page) | Per-feature switches |
| `ai.dailyBudgetUsd` | none | ai.manage | Pauses AI for the rest of the day (UTC) at the estimated spend |
| `ai.pricing` | none | ai.manage | For cost estimates |

Every change needs a reason and a fresh confirmation and is written to the audit log (`settings.changed`, with before and after).

## Daily routine (suggested)

1. **Overview**: what waits for a person (applications, open and urgent reports, review requests, safety cases, support requests).
2. **Safety cases** first, then the **moderation desk** (urgent reports at the top).
3. **Support** requests waiting for us.
4. **Applications** to review; check documents and registers; write review references.
5. Weekly: Analytics, AI cost, Finance (TEST), Security (failed sign-ins, staff without codes), Audit log spot-check.

## Incident playbooks

| Situation | Do |
|---|---|
| A staff laptop or phone is lost | Staff and access › that person › Sign out everywhere; Reset two-step codes; suspend staff access until resolved |
| An account is attacking others | Users › Suspend (reason); Sign out everywhere |
| A room turns hostile | Rooms › Pause (reason) and post an official notice; work the reports in the desk |
| A professional is under investigation | Applications › Suspend; cancel their upcoming appointments for BeHappy (both people are told) |
| AI costs spike | AI › lower the daily budget or switch the feature off (safety resources don't depend on AI) |
| A formal legal request for a conversation or note | Owner enables Protected data; someone requests one item with purpose, basis and case number; another person approves; switch the setting off again afterwards |
| Someone asks to delete their data and can't sign in | Confirm identity outside the app; Users › Delete account (reason with the request reference; type their email) |

## Language

The admin center is complete in **English and Georgian**; other interface languages show it in English. Everything people see in the app (including Help and support, statuses and notifications added here) is in all 19 languages. Legal and professional terms in Georgian should be reviewed by a native-speaking lawyer before launch.

## QA commands

| Command | What |
|---|---|
| `npm test` | 103 tests (includes the admin authorization matrix) |
| `npm run qa:admin` | Admin center in real browsers (owner desktop, analyst phone, Georgian dark, Arabic RTL) |
| `npm run qa:pro -- --pay` | Professional journey with a Flitt TEST payment, ending in the admin center |
| `npm run qa:i18n` | Keys, coverage, placeholders |
