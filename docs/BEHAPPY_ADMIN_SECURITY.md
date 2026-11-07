# Admin security

Complements [BEHAPPY_3_SECURITY.md](BEHAPPY_3_SECURITY.md). **Owner actions are still pending there** — above all: revoke the OpenAI key that was exposed in 1.x (it is in the public history of `main`/`gh-pages`; never reuse it) and remove `EXPO_PUBLIC_API_KEY` from the project-root `.env`.

## Staff sign-in

- Staff tools need a **password session**. A device token copied from a phone opens nothing.
- **Fresh confirmation (step-up)** for sensitive actions: refunds, roles, exports, identity documents, settings, protected data, complimentary days, deletions, unlocking accounts, AI settings. The person re-enters the password (and the two-step code when on); it lasts `staff.stepUpMinutes` (default 15) for that session only. 6 attempts per 15 minutes.
- **Two-step codes (TOTP)**: any staff member can turn them on in **My security** (authenticator apps; RFC 6238, SHA-1, 30-second steps, 6 digits, ±1 step for clock drift). The secret is shown once, stored encrypted (`MESSAGE_ENCRYPTION_KEY`), and a code can't be used twice. With codes on, every new session enters a code before any staff tool opens.
- An owner can **require codes for all staff** (Settings). The server refuses to turn this on until the owner's own codes are on, so nobody locks themselves out. Staff without codes can then reach only My security until they enrol.
- Lost phone: an owner resets that person's codes in Staff and access (signs them out everywhere).

## Staff management

- Only **owners** change roles, suspend or reinstate staff access, and reset codes; never for themselves; the last active owner stays.
- Every change needs a reason and a confirmation, and is written to the audit log and security events.
- **Staff suspension** stops staff tools at once while the person's normal account keeps working.
- `ADMIN_TOKEN` (server only, in `server/.env`) exists to set up the **first owner** with `npm run admin:grant`. It can only change roles, read the old metrics endpoint and request TEST refunds; every use is audited as `owner_token`. Unset it when you no longer need it; the security center shows whether it is set.

## No backdoors

- No impersonation ("log in as"), no way for staff to see or set a password: they can only send the normal reset email to the person's verified address, and the code goes only there.
- No universal read permission. Protected data follows [Privacy](BEHAPPY_ADMIN_PRIVACY.md).
- No password, token, recovery code, two-step secret or password hash is returned by any admin endpoint. Exports contain no tokens.

## Security center

`/admin/security` (security.view):

- **Configuration checks**: production blockers and warnings (the same as the server's start-up checks), whether the leaked root key is still in `.env`, development tools, encryption keys configured, the bootstrap token, email delivery, payments (TEST) — as on/off values, never secret values.
- **Locked accounts** (after 5 failed sign-ins, for 15 minutes) with **Unlock** (security.manage + step-up, reason).
- **Failed sign-ins and confirmations per day**, accounts with the most failures in 24 hours, staff counts by role, suspended staff and staff without two-step codes.
- **Recent events**: signed in, sign-in failed, locked, tried while locked, rate-limited, password reset or changed, confirmations, two-step codes on/off/accepted/refused, roles given or removed, signed out everywhere. IP addresses are stored only as keyed hashes (HMAC with `IDENTIFIER_HMAC_KEY`); passwords and codes never.

Security events are kept for 400 days.

## Sessions and live connections

- Revoking sessions closes the person's open Socket.IO connections at once; every socket also re-checks its session at least once a minute.
- Staff can end all sessions of an account (`users.sessions`) or of a staff member (`security.manage`).

## Data at rest

| Data | Protection |
|---|---|
| Verification documents | AES-256-GCM, `DOCUMENT_ENCRYPTION_KEY` |
| Private messages, booking notes, support subjects and messages, safety-case notes, two-step secrets | AES-256-GCM, `MESSAGE_ENCRYPTION_KEY` |
| IP addresses in security events, one-trial-per-person keys | HMAC-SHA-256, `IDENTIFIER_HMAC_KEY` |
| Session tokens, recovery codes | SHA-256 hashes only |
| Passwords | scrypt |

In production the server refuses to start without the three keys (see Operations).

## Payments

Flitt stays in **TEST mode** (`assertTestModeOnly()`); entitlements come only from server-verified Flitt callbacks or status checks, never from a redirect, a URL flag or a button. Complimentary days from staff are separate records and are never shown as payments or revenue.
