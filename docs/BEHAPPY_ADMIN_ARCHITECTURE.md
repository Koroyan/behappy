# BeHappy admin control center: architecture

Branch `feature/behappy-admin-control-center`, built on `behappy-3.0`. The admin center is part of the same Expo app (route `/admin`) and the same API server; there is no separate admin service and no separate database.

## Principles

1. **The server decides.** Every staff endpoint names one permission and checks it on every request (`server/admin/staff.mjs`, `guard(permission)`). The app only hides what a role can't use.
2. **Aggregates, not people.** Dashboards show counts, totals and trends. Groups smaller than `ANALYTICS_MIN_COHORT` (default 5) people are hidden.
3. **No private content.** Journals, Anulia conversations, self-checks and safety plans live on people's devices; nothing in the admin center can read them. Private messages and booking notes are reachable only through the governed protected-data workflow (off by default). See [Privacy](BEHAPPY_ADMIN_PRIVACY.md).
4. **Reasons and records.** Every staff action that changes something asks for a reason and writes to `audit_log`. Security events go to `auth_events`.
5. **TEST mode.** Flitt stays in TEST mode; finance figures are labelled as sandbox transactions, not income.

## Request path

```
App (/admin/*)                                   API (/api/admin/*, /api/moderation/*)
──────────────                                   ─────────────────────────────────────
AdminProvider  ── GET /api/admin/me ──────────►  staff.base: staff role, password session,
  roles, permissions, step-up, two-step             active account, staff access not suspended
AdminShell     (gates, sidebar, search, range)
page           ── GET /api/admin/<area> ──────►  requireAccount → staff.guard(permission)
  act(fn)      ◄─ 403 step_up_required ───────     ├─ permission from the role(s)
  → password (+ code) → POST /api/admin/step-up    ├─ two-step code if on / required
  → retry once                                     └─ fresh confirmation for sensitive permissions
  ask(reason)  ── POST with { reason } ───────►  module → audit_log (+ auth_events)
```

## Server modules

| File | Area |
|---|---|
| `server/admin/permissions.mjs` | Roles, permissions, step-up list, `can()` |
| `server/admin/staff.mjs` | Guard, step-up, two-step codes (TOTP), staff management, security events |
| `server/admin/totp.mjs` | RFC 6238 codes (30-second steps, 6 digits) |
| `server/admin/settings.mjs` | Platform settings with defaults, validation, owner-only keys, audit |
| `server/admin/routes.mjs` | Overview (legacy), memberships, payments, health, audit log, settings |
| `server/admin/insights.mjs` | KPI dashboard, global search, finance, AI usage and controls, security center |
| `server/admin/users.mjs` | Accounts: list, detail, suspend, restrict posting, sessions, reset email, complimentary Plus, deletion, export |
| `server/admin/professionals.mjs` | Directory, document outcomes, renew/end verification, membership corrections, country policies |
| `server/admin/appointments.mjs` | Appointment search, history, cancellation by BeHappy |
| `server/admin/community.mjs` | Rooms, topics, moderator languages, room and moderation statistics, report context |
| `server/admin/safety.mjs` | Safety cases from urgent reports and safety support requests |
| `server/admin/sensitive.mjs` | Governed protected-data requests |
| `server/support/index.mjs` | Support requests (people and staff) |
| `server/analytics/index.mjs` | First-party usage events, daily rollups, staff analytics |

Mounted from `server/features.mjs`. The staff router (`/me`, step-up, two-step codes, staff management) is mounted by the core app (`server/app.mjs`) because role changes depend on it.

## App modules

| Path | Purpose |
|---|---|
| `app/admin/_layout.tsx` | `AdminProvider` + `AdminShell` around every admin page |
| `features/admin/AdminProvider.tsx` | `/me`, permissions, date range, `act()` (confirmation prompt and retry), `ask()` (reason or typed confirmation) |
| `features/admin/AdminShell.tsx` | Gates, dark sidebar (menu sheet on phones), search, range, TEST badge |
| `features/admin/nav.ts` | Sections and items with their permissions |
| `features/admin/ui.tsx` | Page frame, panels, KPI tiles, responsive tables, pills, error states |
| `features/admin/charts.tsx` | Trend, stacked columns, ranked bars, cohort table (react-native-svg) |
| `features/admin/theme.ts` | Admin palette (light and dark) and the validated chart palette |
| `app/admin/*.tsx` | Pages (overview, analytics, users, support, applications, professionals, policies, appointments, community, moderation, safety, ai, finance, security, staff, settings, protected, audit, system, me) |
| `app/support/*` | Help and support for everyone (Profile › Help and support) |
| `lib/analytics/index.ts` | The app's usage tracker |

The main app shell hides its own sidebar on `/admin` routes (`features/shell/AppShell.tsx`); the admin center has its own navigation and a "Back to the app" link.

## Database (migrations)

| Migration | Adds |
|---|---|
| `006_community_access.sql` | `community_rooms.is_paused` (+ who, when, why) |
| `007_staff_security.sql` | Seven staff roles; `accounts.staff_suspended_*`; `sessions.step_up_at`, `sessions.mfa_at`; `staff_mfa`; `auth_events`; `platform_settings` |
| `008_analytics.sql` | `accounts.analytics_opt_out`; `analytics_events`; `analytics_daily` |
| `009_admin_operations.sql` | `ai_usage` status/latency/error; `prompt_versions`; `entitlement_grants`; account suspension details; `country_policies`; document review outcomes; `cancelled_by_admin` booking status and `admin` booking actor; room descriptions; `moderator_languages`; `safety_incidents` + notes; `sensitive_access_requests`; `support_tickets` + messages |

Migrations run automatically at start (`server/db/migrate.mjs`), each in its own transaction, recorded in `schema_migrations`. None of them deletes or rewrites existing data.

## Real time

Socket.IO connections re-check their session at least once a minute and are closed at once when a session is revoked (sign-out, password reset or change, staff "sign out everywhere", account deletion or suspension). See [Community](BEHAPPY_ADMIN_COMMUNITY.md) for room access.

## Scheduler

Every `SCHEDULER_INTERVAL_SECONDS` (default 300): existing booking and membership jobs, plus opening safety cases for urgent reports, reloading active country policies, deleting raw analytics events after `analytics.retentionDays`, daily totals after 760 days and security events after 400 days.

## Related documents

[Permissions](BEHAPPY_ADMIN_PERMISSIONS.md) · [Analytics](BEHAPPY_ADMIN_ANALYTICS.md) · [Professionals](BEHAPPY_ADMIN_PROFESSIONALS.md) · [Community](BEHAPPY_ADMIN_COMMUNITY.md) · [Moderation](BEHAPPY_ADMIN_MODERATION.md) · [Security](BEHAPPY_ADMIN_SECURITY.md) · [Privacy](BEHAPPY_ADMIN_PRIVACY.md) · [Operations](BEHAPPY_ADMIN_OPERATIONS.md) · [Test results](BEHAPPY_ADMIN_TEST_RESULTS.md)
