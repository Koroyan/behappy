# BeHappy

A well-being platform with three parts:

- **Personal well-being** — a private journal, Anulia (an AI well-being companion), art therapy on paper, reflection cards, breathing, meditation, grounding, self-check questionnaires and a safety plan.
- **Community** — real-time peer-support rooms on 13 topics in 19 languages, with Anulia on request and human moderation.
- **Notifications** — gentle reminders on the phone for the journal, art therapy and reflection cards (smart timing from the person's own habits, never at night, easing off after a break, no streaks); phone notifications for replies, mentions, followed rooms and private messages (only what is still unread, quiet while the chat is open, one summary per burst, quiet hours, never message text); live unread counts on the tabs, the avatar and the app icon.
- **Professionals** — a directory of verified psychologists: booking on their own hours, private messages, a professional workspace, and a flat monthly membership with **0% commission** on sessions.
- **Admin control center** (`/admin`) — overview and analytics, accounts, support, verification and country policies, appointments, rooms, moderation and safety cases, AI usage and controls, finance (TEST), security, staff roles and settings. Every staff action is checked by permission on the server and recorded; private content stays out of reach.

BeHappy is not medical care, therapy or a crisis service. Safety resources are free and never behind a paywall. See [docs/ETHICS.md](docs/ETHICS.md).

## Stack

- **App**: Expo SDK 58, React Native 0.88, React 19.3, expo-router 58 (iOS, Android, web) — validation in [docs/BEHAPPY_EXPO_58_QA.md](docs/BEHAPPY_EXPO_58_QA.md)
- **API server**: Node 24 + Express 5 (`server/`), PostgreSQL (PGlite for development and tests), Socket.IO for live rooms and messages
- **Accounts**: anonymous device accounts; registration with email code and password for the community and professional features; seven staff roles (owner, admin, verifier, moderator, finance, support, analyst) with named permissions, step-up confirmation and optional two-step codes
- **AI**: OpenAI Responses API, called only from the server with server-owned instructions (`server/prompts/`, see [docs/prompts](docs/prompts/README.md)). Art reflection: GPT-6.1 Sol with medium reasoning, every reply checked before the person sees it (image comparison, the person's own words, the three-phase state, summaries) — [reliability](docs/BEHAPPY_ART_THERAPY_RELIABILITY.md), [model evaluation](docs/BEHAPPY_AI_MODEL_EVALUATION.md), [image comparison](docs/BEHAPPY_IMAGE_COMPARISON.md). Anulia, cards and community: gpt-5.4-mini.
- **Payments**: Flitt, **TEST mode only** (Plus, the art program, the professional membership)
- **Languages**: 19 interface languages, all complete (1,690 strings each), right-to-left for Arabic; the admin center in English and Georgian

## Quick start (development)

Requirements: Node 24, npm, and an OpenAI API key for the AI features.

```bash
npm install
cp server/.env.example server/.env    # set OPENAI_API_KEY and ADMIN_TOKEN
npm run server:local                  # API on :8787 with dev tools (test code 123456)
npm run web:local                     # Expo web on :8082
npm run web:proxy                     # proxy on :8081 → open http://localhost:8081
```

The proxy serves the app and forwards `/api` and `/socket.io` to the API, so one origin works locally and through a tunnel (point the tunnel at 8081 and add its origin to `APP_PUBLIC_URLS` in `server/.env`). Dev tools answer only on the machine itself.

Leave the root `.env` without API keys. Do not start Expo with `CI=1`: it disables file watching. Native: `npm run ios` / `npm run android`.

Staff: register your account in the app, then `npm run admin:grant -- you@example.org owner` once on the server; after that, owners give roles in the admin center (Staff and access). Staff tools need a password sign-in. See [Admin operations](docs/BEHAPPY_ADMIN_OPERATIONS.md).

Production: `deploy/docker-compose.yml` (PostgreSQL, API, Caddy with automatic HTTPS). The server refuses to start in production without a database URL, https URLs and encryption keys — see [docs/BEHAPPY_3_SECURITY.md](docs/BEHAPPY_3_SECURITY.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run server:local` / `server:dev` | API with dev tools / restart on changes |
| `npm run web:local` · `npm run web:proxy` | Expo web on 8082 · proxy on 8081 |
| `npm test` | 156 tests: payments, AI proxy, AI cost and budget, quotas, accounts, community access, moderation, professionals, bookings, membership, staff security, analytics, the admin authorization matrix, phone notifications and delivery reliability, art reflection checks (three phases, image comparison, negation, summaries), scoring, text helpers, secret scan |
| `npm run typecheck` · `npm run lint` | TypeScript · ESLint |
| `npm run qa:i18n` | Every used key exists; coverage, placeholders and lists per language |
| `npm run qa:pro` | Browser journey: apply → verify → trial → publish → book → confirm → message → membership checkout (`--pay` pays with the Flitt test card, `--app` targets a tunnel) |
| `npm run qa:admin` | Admin center in browsers: owner on desktop, analyst on a phone, Georgian in dark mode, Arabic right to left |
| `npm run qa:payments` | A real browser payment in the Flitt sandbox |
| `npm run qa:journeys` · `qa:desktop` | 2.0 user journeys (live AI and the Flitt sandbox) |
| `npm run qa:scroll` · `qa:shots` | Scroll and bar checks; screenshots |
| `npm run admin:grant` | Set up the first owner (or grant/revoke a role) with the server's ADMIN_TOKEN |
| `npm run build:web` | Static web build in `dist/` (not committed) |
| `node scripts/qa/art-model-eval.mjs` | Live art-reflection model evaluation with synthetic conversations and drawings (costs OpenAI tokens) |

## Project layout

```
app/          routes: tabs (Today, Community, Anulia, Specialists, Profile), community, specialists,
              appointments, messages, pro (workspace), admin, moderation, journal, art, cards, …
features/     feature UI and logic (shell, chat, community, pro, account, anulia, journal, …)
design/       design system: tokens, typography, components
lib/          API clients (lib/api), real time, storage, media, assessment scoring
i18n/         translations: 2.0 catalogs and 3.0 namespaces (i18n/locales/v3)
server/       API: core, community/, professional/, admin/, db/ (migrations), prompts/, tests
deploy/       production compose file and Caddyfile
scripts/      dev proxy, QA scripts
docs/         architecture, features, security, design, test results
```

## Documentation

Admin control center:
[Architecture](docs/BEHAPPY_ADMIN_ARCHITECTURE.md) ·
[Permissions](docs/BEHAPPY_ADMIN_PERMISSIONS.md) ·
[Analytics](docs/BEHAPPY_ADMIN_ANALYTICS.md) ·
[Professionals](docs/BEHAPPY_ADMIN_PROFESSIONALS.md) ·
[Community](docs/BEHAPPY_ADMIN_COMMUNITY.md) ·
[Moderation and support](docs/BEHAPPY_ADMIN_MODERATION.md) ·
[Security](docs/BEHAPPY_ADMIN_SECURITY.md) ·
[Privacy](docs/BEHAPPY_ADMIN_PRIVACY.md) ·
[Operations](docs/BEHAPPY_ADMIN_OPERATIONS.md) ·
[Test results](docs/BEHAPPY_ADMIN_TEST_RESULTS.md)

BeHappy 3.0:
[Architecture](docs/BEHAPPY_3_ARCHITECTURE.md) ·
[Community](docs/BEHAPPY_3_COMMUNITY.md) ·
[Moderation](docs/BEHAPPY_3_MODERATION.md) ·
[Professionals](docs/BEHAPPY_3_PROFESSIONALS.md) ·
[Verification](docs/BEHAPPY_3_VERIFICATION.md) ·
[Booking](docs/BEHAPPY_3_BOOKING.md) ·
[Professional membership](docs/BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md) ·
[Flitt TEST](docs/BEHAPPY_3_FLITT_TEST.md) ·
[Security and privacy](docs/BEHAPPY_3_SECURITY.md) — read the owner actions first ·
[Design system](docs/BEHAPPY_3_DESIGN_SYSTEM.md) ·
[Test results](docs/BEHAPPY_3_TEST_RESULTS.md)

From 2.0: [Redesign summary](docs/BEHAPPY_REDESIGN_SUMMARY.md) · [Audit](docs/BEHAPPY_AUDIT.md) · [Design system](docs/BEHAPPY_DESIGN_SYSTEM.md) · [Security review](docs/BEHAPPY_SECURITY_REVIEW.md) · [Pricing strategy](docs/BEHAPPY_PRICING_STRATEGY.md) · [Flitt test setup](docs/BEHAPPY_FLITT_TEST_SETUP.md) · [AI instructions](docs/prompts/README.md)

Intelligence and stability (November 2026): [Release readiness](docs/BEHAPPY_RELEASE_READINESS.md) — read the blockers first · [Art reflection reliability](docs/BEHAPPY_ART_THERAPY_RELIABILITY.md) · [AI model evaluation](docs/BEHAPPY_AI_MODEL_EVALUATION.md) · [Image comparison](docs/BEHAPPY_IMAGE_COMPARISON.md) · [Notifications](docs/BEHAPPY_NOTIFICATIONS_RELIABILITY.md) · [Expo SDK 58 QA](docs/BEHAPPY_EXPO_58_QA.md)
