# Admin control center: test results

Branch `feature/behappy-admin-control-center`, 7 November 2026, Windows 11, Node 24, Chrome (Playwright, headless). Dev stack: API on 8787 with `--dev-tools`, Expo web on 8082, proxy on 8081.

## Summary

| Check | Command | Result |
|---|---|---|
| Unit and integration tests | `npm test` | **103 / 103 pass** (88 before this branch) |
| Types | `npx tsc --noEmit` | 0 errors |
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Translations | `npm run qa:i18n` | All used keys exist; **19 languages × 1,611 user-facing strings, 100%**; admin center (820 strings) complete in English and Georgian; placeholders match |
| Admin center in browsers | `npm run qa:admin` | **25 / 25 steps** |
| Professional journey with a Flitt TEST payment | `npm run qa:pro -- --pay` | **17 / 17 steps** (the last step now checks the new admin center) |
| Responsive sweep | 21 admin and support pages × 5 widths (320, 375, 768, 1024, 1440) | **105 / 105**: no horizontal overflow, no page errors |
| Members-only rooms | browser check | Non-member sees "Only members can read this room"; join opens history and composer; leave closes it; API refuses history to non-members |
| Usage tracker | browser check | Sessions, screen views and time per feature sent; staff screens not counted; only enum/number fields |

## `npm test` (103)

| Suite | File | Tests |
|---|---|---|
| API: payments, AI proxy, quotas, metrics, Flitt | `server/test/server.test.mjs` | 22 |
| Platform: database, passwords, accounts, sign-in, deletion, owner bootstrap and staff roles | `server/test/platform.test.mjs` | 13 |
| Community, incl. **room access control** (anonymous, no profile, non-member over HTTP and socket, cross-room, after leaving, suspension scopes, paused room, socket closed on sign-out) | `server/test/community.test.mjs` | 16 |
| Professionals, incl. **country policies** (source required, another reviewer, review reference, applies to applications, retire), **document outcomes**, **renew/end verification**, **cancellation by BeHappy** notifies both, **protected data** (off by default, purpose, approver ≠ requester, expiry, logged views) | `server/test/professionals.test.mjs` | 15 |
| Admin: **two-step codes** (setup needs confirmation, encrypted secret, replay refused, new sessions enter a code), **settings** (owner-only, reasons, validation, no lockout, announcement), **staff suspension**, **security events** without secrets; **analytics** (allowlist, dedupe, rollups, small groups hidden, opt-out deletes, export confirmed and logged, platform switch); **authorization matrix** (7 roles + member × 23 endpoints, anonymous, device token), **accounts** (masking, no private content, suspension, reset email without codes, complimentary Plus without fake orders, sessions, deletion), **community and safety**, **support**, **AI switches**, **finance labelled TEST**, **search by permission** | `server/test/admin.test.mjs` | 12 |
| Scoring, dates, right-to-left text, journal reflections, risk language, Latin Georgian, secret scan | `lib/…`, `i18n/…`, `features/…`, `scripts/qa/secrets.test.mjs` | 25 |

## Admin journey (`scripts/qa/admin-journey.mjs`)

1. Owner opens the admin center: sidebar, KPI tiles, TEST badge
2. Date range and analytics
3. Users: search, detail without private content, complimentary Plus after a password confirmation (Plus active, no payment record)
4. Support: the request is readable and the reply reaches the person
5. Safety: the automatic urgent report is a case; take it, close with an outcome
6. Country policy: a draft needs another reviewer
7–18. Professionals, appointments, rooms, moderation, AI, finance, security, staff, audit, system, protected data, my security
19. Finance says TEST and not income
20. Settings: an announcement reaches Today (then switched off)
21. Audit log lists the grant
22. Analyst on a phone: menu sheet, only permitted sections (no account lists)
23. Georgian, dark mode
24. Arabic (right to left), admin text in English
25. No page errors

## Issues found and fixed during testing

| Found by | Issue | Fix |
|---|---|---|
| Brief / audit | Room history, search, pinned message and the live stream were readable by anyone who knew a room id | Membership required over HTTP and Socket.IO; sockets leave on leave/archive; sessions re-checked; posting no longer joins implicitly |
| Test | A transaction wrote a security event through the main connection and hung (PGlite has one connection) | Events written after the transaction |
| Test | An owner could require two-step codes for everyone without having them, locking themselves out | Refused until the owner's own codes are on (`enable_mfa_first`) |
| Test | After 3 hours the staff confirmation had expired before the protected-data approval did | Correct behaviour; the test confirms again and then checks the approval expiry |
| Browser | Overview counted 0 safety cases while an urgent report was open | Dashboard opens cases before counting |
| Browser | KPI tiles said "new vs previous period" with no earlier data | "No earlier data to compare" |
| Browser | Long Georgian menu labels were cut off | Two lines allowed |
| Browser | Chart y-axis money labels were cut off ("0.00 GEL" instead of "2,000.00 GEL") | Axis width measured from the labels; wider tooltips; KPI values scale instead of truncating |
| Secret scan | Admin strings named the bootstrap variable | Label no longer names it |
| Journey | The professional journey looked for the old admin home page | Updated to the new overview, directory and finance pages |

## Not covered yet

- iOS and Android runtime of the admin center (it is a web-first staff tool; native bundles were not rebuilt for this branch).
- Load tests of analytics ingestion and the dashboard on a large production database (queries are indexed; PGlite was used here).
- Real email delivery of password-reset emails sent by staff (dev outbox only).
- A screen-reader audit of the charts (each chart has a table view and labels).
- Native-speaker and legal review of the Georgian admin wording.
