# BeHappy 3.0 architecture

Branch `behappy-3.0`, November 2026. BeHappy 3.0 grows the 2.0 self-care app into a platform with three parts:

| Pillar | What it is | Where it lives |
|---|---|---|
| Personal well-being | Everything from 2.0: journal, Anulia, art therapy on paper, reflection cards, exercises, questionnaires, safety resources | `app/(tabs)/index.tsx`, `app/journal`, `app/anulia`, `app/art`, `app/cards`, … |
| Community | Real-time topic rooms, 13 topics × 19 languages, with Anulia on request and human moderation | `server/community/`, `app/community/`, `app/moderation/` |
| Professionals | A directory of verified psychologists, bookings, private messages, a professional workspace and a monthly professional membership (0% commission) | `server/professional/`, `app/specialists/`, `app/appointments/`, `app/messages/`, `app/pro/`, `app/admin/` |

Safety resources ("Get help now") stay free and outside every paywall.

## Components

```
Phone / browser ──HTTPS──► Caddy (TLS, WebSocket pass-through)
                                 │
                                 ▼
                     Node 24 + Express 5 API (server/)
                     ├─ REST: /api/…
                     ├─ Socket.IO: /socket.io (rooms, live messages)
                     ├─ Scheduler (bookings, reminders, expiry)
                     │
                     ├─► PostgreSQL 16 (production) / PGlite (development, tests)
                     ├─► OpenAI (server-owned prompts; key only on the server)
                     ├─► Flitt (TEST mode only)
                     ├─► Resend (email)  ─ optional until configured
                     └─► Twilio (SMS)    ─ optional until configured
```

The app is Expo SDK 54 / React Native 0.81 / expo-router 6 and runs on iOS, Android and the web from one code base.

## Server

`server/index.mjs` opens the database, runs migrations, builds the app with `createApp()` (`server/app.mjs`) and starts the feature services. Feature modules are listed in `server/features.mjs`:

| Module | Mounts | Responsibility |
|---|---|---|
| core (`app.mjs`) | `/api/account`, `/api/auth`, `/api/notifications`, `/api/ai`, `/api/payments`, `/api/admin/roles`, `/api/dev` | Accounts and identity, AI proxy and quotas, Flitt checkout and verification, notifications, dev tools |
| `community/` | `/api/community`, `/api/moderation`, Socket.IO | Rooms, members, messages, reactions, Anulia in rooms, reports, suspensions, appeals |
| `professional/` | `/api/pros`, `/api/bookings`, `/api/threads`, `/api/client`, `/api/pro`, `/api/admin/pros` | Profiles and verification, directory, bookings, private messages, membership |
| `admin/` | `/api/admin` | Aggregated dashboard: accounts, professionals, TEST revenue, bookings, community, AI usage, health, audit log |
| `scheduler.mjs` | – | Every 5 minutes (`SCHEDULER_INTERVAL_SECONDS`): expire stale booking requests, 24-hour reminders, membership reminders and expiry notices, verification expiry |

Every feature module receives the same `deps` object (`db`, `config`, `clock`, `mailer`, `flitt`, `realtime`), so tests can swap the clock, the mailer and the payment client.

### Data

- **PostgreSQL** in production (`DATABASE_URL`). **PGlite** (Postgres in WebAssembly) for development and tests, stored in `.server-data/pg` or in memory. Extensions: `btree_gist`, `pg_trgm`, `citext`.
- Migrations in `server/db/migrations/` run in order at start-up and are recorded in `schema_migrations`:
  `001_core` (accounts, sessions, codes, orders, entitlements, notifications, audit), `002_community`, `003_community_member_ref`, `004_professionals`, `005_professional_memberships`.
- Money and state changes run in transactions; rows that two requests could change together are locked with `FOR UPDATE`. Double bookings are impossible at the database level: an exclusion constraint on `(professional_id, tstzrange)` for active bookings.
- 2.0 JSON stores are imported once on first start (`server/db/import-json.mjs`).

### Identity

1. Every install gets an anonymous device account (`POST /api/account`), so the personal features work without registration.
2. Community rooms, bookings and the professional tools need a **registered** account: an email confirmed with a 6-digit code and a password (scrypt). Registering keeps the same account id, so purchases and quotas stay.
3. Roles: `moderator`, `admin`. Staff tools also require a password session (not a device session). Roles are granted with `npm run admin:grant -- <email> <role>` (uses `ADMIN_TOKEN`, never printed).

### Real time

Socket.IO 4 on the same port. The client authenticates in the handshake with its bearer token. Each connection joins `user:<id>` and the rooms it opens (`room:<id>`). Events: `message:new`, `message:update`, `room:update`, `anulia:thinking`, `anulia:unavailable`, `safety:notice`, `notification:new`, `account:suspended`, `thread:message`. On reconnect the client sends `room:sync` with its last message id and receives what it missed. Messages are filtered per recipient (blocks, mutes, held messages).

### AI

All AI calls go through the server (`server/ai.mjs`). Instructions are server-owned files in `server/prompts/` (Anulia, art therapy, cards, community); clients cannot send a prompt id or a model. The model defaults to `gpt-5.4-mini`. Quotas per feature and plan live in `server/quota.mjs`; Anulia in community rooms has its own quota (`community`) and room and global caps. `ai_usage` stores token counts only, never text.

### Payments

`server/payments.mjs` creates Flitt TEST orders and applies verified results. Products register a fulfilment (`registerFulfillment(kind, { approve, reverse })`): Plus and the art program grant entitlements; `professional` creates or revokes membership periods inside the payment transaction. See [BEHAPPY_3_FLITT_TEST.md](BEHAPPY_3_FLITT_TEST.md).

### Encryption

`server/crypto.mjs`: AES-256-GCM for verification documents, private messages and booking notes; HMAC-SHA-256 for trial-abuse keys and lookup identifiers. Development keys are generated into `DATA_DIR/dev-keys.json`; production refuses to start without real keys.

## App

- **Routes** (expo-router, `app/`): five tabs on phones — Today, Community, Anulia, Specialists, Profile. Journal moved to `app/journal/` and is reachable from Today, the sidebar and the Profile menu.
- **API modules** (`lib/api/`): `client.ts` (base URL, tokens, tunnel header), `account.tsx`, `auth.ts`, `community.ts`, `moderation.ts`, `pros.ts`, `notifications.ts`, `payments.ts`, `ai.ts`. `lib/realtime/socket.ts` wraps Socket.IO.
- **Navigation model** (`features/shell/Sidebar.tsx`): one list of sections drives the desktop sidebar, the tablet rail and the phone Profile menu (`MoreMenu.tsx`), so every screen is reachable on every size.
- **Translations**: 2.0 catalogs in `i18n/locales/`, 3.0 namespaces in `i18n/locales/v3/<code>.ts`, merged per language. All 19 languages are complete.

## Development topology

| Port | Process | Command |
|---|---|---|
| 8787 | API (`--dev-tools`: fixed test code 123456, dev outbox, movable clock) | `npm run server:local` |
| 8082 | Expo web dev server | `npm run web:local` |
| 8081 | Proxy: `/api` and `/socket.io` → 8787, everything else → 8082 | `npm run web:proxy` |

Open the app at `http://localhost:8081`. The app uses its own origin as the API base on the web, so the same build works through a tunnel (for example ngrok → 8081): add the tunnel origin to `APP_PUBLIC_URLS` in `server/.env`. Dev tools answer only to loopback requests; through a tunnel they return 403.

## Production

`deploy/docker-compose.yml` runs PostgreSQL 16, the API and Caddy (automatic HTTPS, HSTS, WebSocket pass-through). `server/config.mjs → productionProblems()` blocks a production start without `DATABASE_URL`, https `PUBLIC_API_URL` and `APP_PUBLIC_URLS`, and the three encryption keys, and warns when email, SMS, `TRUST_PROXY` or the OpenAI key are missing. Flitt refuses any mode other than TEST.

Related: [Community](BEHAPPY_3_COMMUNITY.md) · [Moderation](BEHAPPY_3_MODERATION.md) · [Professionals](BEHAPPY_3_PROFESSIONALS.md) · [Verification](BEHAPPY_3_VERIFICATION.md) · [Booking](BEHAPPY_3_BOOKING.md) · [Professional subscriptions](BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md) · [Flitt TEST](BEHAPPY_3_FLITT_TEST.md) · [Security](BEHAPPY_3_SECURITY.md) · [Design system](BEHAPPY_3_DESIGN_SYSTEM.md) · [Test results](BEHAPPY_3_TEST_RESULTS.md)
