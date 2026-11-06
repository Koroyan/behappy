# BeHappy 3.0 security and privacy

Reviewed: branch `behappy-3.0`, November 2026. Extends [BEHAPPY_SECURITY_REVIEW.md](BEHAPPY_SECURITY_REVIEW.md) (2.0) to accounts, community rooms, the professional marketplace and the admin tools.

## Owner actions first (cannot be done in code)

1. **Revoke the OpenAI key that 1.x shipped to clients.** It is in git history on `main` and `gh-pages` and in the old public web bundle. Revoke it at platform.openai.com and keep the new key only in `server/.env` (`OPENAI_API_KEY`). Then **delete `EXPO_PUBLIC_API_KEY` from the project-root `.env`**; the server warns about it at every start. (The 3.0 app does not read it: the native bundles were checked and contain neither this value nor the server key.)
2. **Set a monthly budget and alerts** on the OpenAI project.
3. **Email and SMS providers** before real users: Resend (`MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM`) and Twilio (`SMS_DRIVER=twilio`, `TWILIO_*`). Until then registration codes and phone codes only work on a development server.
4. **Never run a public server with `--dev-tools`.** Dev tools accept the fixed test code `123456` for every email and phone and show it on screen, so anyone could register any address. The current ngrok tunnel to a dev server is for the owner's own testing only; do not invite real people to it, and stop it when testing ends.
5. **Production keys**: `DATABASE_URL`; https `PUBLIC_API_URL` and `APP_PUBLIC_URLS`; `DOCUMENT_ENCRYPTION_KEY`, `MESSAGE_ENCRYPTION_KEY`, `IDENTIFIER_HMAC_KEY` (base64, 32 bytes each, kept in a secret store and backed up — losing them makes documents and messages unreadable); `ADMIN_TOKEN`; `TRUST_PROXY=1` behind Caddy. The server refuses to start in production without the first group.
6. **Legal review** before launch: the professional rules per country (`COUNTRY_RULES` is intentionally empty), terms of service and privacy policy, Georgia's Law on Personal Data Protection (and GDPR for EU users), the handling of health-related data in rooms and messages, consumer rules for prepaid passes, and the professional membership terms.
7. **Prices and payments**: confirm the 79 GEL professional price and the Plus prices; Flitt stays in TEST until you authorize live payments (see [BEHAPPY_3_FLITT_TEST.md](BEHAPPY_3_FLITT_TEST.md)).
8. **Native-speaker review** of the 18 non-English translations of the new screens.

## Threat model (3.0 additions)

| Actor | Goal | Main controls |
|---|---|---|
| Fake professional | Appear qualified, reach vulnerable people | Document and register checks by an admin, checklist, phone verification, listing only while verified; community names can't carry professional titles; "Verified" explained everywhere |
| Harasser in a room | Hurt or expose members | Reports, holds for contact details, blocks and mutes, suspensions, rate limits, moderators see snapshots |
| Curious professional | Learn more about a client | Sees only the name the client chose and the booking note; never journals, Anulia, community identity or email |
| Payment fraudster | Membership or Plus without paying | Server-side verification of signature, merchant, amount, currency; idempotent transitions; fulfilment inside the payment transaction |
| Trial abuser | Endless free trials | One trial per account, verified phone, contact email and licence number (HMAC keys) |
| Insider (staff) | Abuse powers | Staff need role + password session; everything audited; nobody reviews their own application; the moderator who suspended cannot decide the appeal; admin dashboard shows aggregates only |
| Scraper / spammer | Harvest or flood | Per-IP and per-account rate limits on accounts, logins, codes, resets, messages and reports |

## Accounts and sessions

- Anonymous device accounts first; registration adds an email (6-digit code, valid 15 minutes, limited attempts) and a password (10+ characters, common and email-containing passwords refused) hashed with **scrypt** (N=2¹⁵, r=8, p=1, random salt).
- Limits (configurable): 20 new accounts per hour per IP, login attempts per 15 minutes per IP with a temporary lock, codes per hour per account, password resets per hour per IP.
- Changing or resetting the password signs out every other device. The account screen lists signed-in devices and can sign one out.
- Staff tools require the role **and** a password session; checked by the server on every call.
- Account deletion (`DELETE /api/account`) runs in one transaction with feature hooks: community messages are emptied ("Former member"); a client's bookings keep the professional's record as "Former client" with the name and note cleared, and future bookings are released; a professional's profile, documents, services and threads are deleted; payment orders stay, detached, for accounting.

## Data protection

| Data | Where | Protection |
|---|---|---|
| Journal, Anulia history, questionnaires | On the device | Never sent to professionals or analytics; AI calls only with the user's consent, through the server |
| Verification documents | Database | AES-256-GCM; admins only; every view audited; `no-store` |
| Private messages, booking notes | Database | AES-256-GCM; the two participants; staff see a message only as a report snapshot |
| Trial keys, lookup identifiers | Database | HMAC-SHA-256, never stored in clear |
| Community messages | Database | Visible to the room by design (said in the guidelines); held messages only to the author |
| AI usage | Database | Token counts per feature and model, never text |
| Admin dashboard | – | Aggregates from verified records; no journals, conversations, notes or messages |

## Secrets

- The app contains no API keys. Server secrets live only in the git-ignored `server/.env`, which is loaded first so a stale OS variable cannot win. There is no fallback to the root `.env` key.
- Commits are scanned for keys before any push (`scripts/qa/secrets.test.mjs` runs in `npm test`).
- `ADMIN_TOKEN` is compared in constant time; `npm run admin:grant` reads it from `server/.env` and never prints it.

## Network

- CORS allows only `APP_PUBLIC_URLS` (plus `CORS_ORIGINS`). Socket.IO authenticates in the handshake with the bearer token and filters every event per recipient.
- Caddy terminates TLS (automatic certificates), sets HSTS, `nosniff` and `no-referrer`, and passes WebSockets through.
- Dev tools (`/api/dev/*`: outbox, fixed codes, clock) exist only when the server starts with `--dev-tools`, never in production, and answer only to loopback requests — through a tunnel they return 403.

## Production blockers (summary)

Configured by the owner: real email and SMS providers, production database and keys, HTTPS deployment, OpenAI key rotation and budget, legal review of country rules and terms, final prices, native-speaker translation review. Out of scope until authorized: live Flitt payments.

Tests: `npm test` (88 tests) includes authentication limits, staff checks, payment tampering, encryption at rest, deletion hooks, the review and appeal rules, and the secret scan.
