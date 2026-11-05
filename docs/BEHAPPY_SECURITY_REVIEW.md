# BeHappy 2.0 security and privacy review

Reviewed: branch `behappy-2.0`, November 2026. Covers the app (`app/`, `features/`, `lib/`) and the API server (`server/`).

## Owner actions first

These cannot be fixed in code. They need the account owner.

1. **Rotate the OpenAI key that 1.x shipped to every client.** It is in the public web bundle on GitHub Pages and in git history. Revoke it at platform.openai.com. Put the new key only in `server/.env` as `OPENAI_API_KEY`.
2. **Remove the old key everywhere else.** It is in the project-root `.env` (`EXPO_PUBLIC_API_KEY`) and was found in a Windows user environment variable `OPENAI_API_KEY`. The server warns at start-up when it falls back to the root `.env`.
3. **Take down or rebuild the GitHub Pages site.** The old `dist/` bundle contains the key. Git history also does. Rotation makes it useless, and purging history (`git filter-repo` plus force-push) is optional.
4. **Set a monthly budget and alerts** on the OpenAI project. This is the strongest protection against runaway cost.

## Threat model

| Actor | Goal | Main controls |
|---|---|---|
| Curious or hostile user | Free Plus, free AI, someone else's data | Server-side entitlements, per-account quotas, bearer tokens, no shared data |
| Payment fraudster | Unlock without paying, replay or alter callbacks | Signature, merchant, amount and currency checks; idempotent transitions; server-side status checks |
| Cost abuser | Use the AI proxy as free OpenAI access | Feature and prompt allowlists, field allowlist, server-chosen model, quotas, rate limits, global daily cap |
| Script injected into the web app | Read tokens or journal entries | No third-party scripts, React text escaping; CSP recommended at hosting |
| Operator mistake | Leaking secrets, going live by accident | Secrets only in git-ignored `server/.env`; Flitt locked to test mode |

## Secrets

- The client contains no API keys. The only `EXPO_PUBLIC_*` variables the app reads are `EXPO_PUBLIC_API_URL` and the optional `EXPO_PUBLIC_LEAD_WEBHOOK_URL`.
- `server/config.mjs` loads `server/.env` with `override: true`, so a stale key in the OS environment cannot win silently.
- Docs that contained the key were redacted. `dist/` is no longer tracked. `.env*` and `server/data`/`.server-data` are git-ignored.
- `ADMIN_TOKEN` (refunds, metrics) is compared in constant time.

## Accounts

- Anonymous accounts: a 32-byte random bearer token plus a recovery code. Only SHA-256 hashes are stored. Token checks use `timingSafeEqual`.
- Rate limits per IP: 20 account creations per hour, 10 restore attempts per 15 minutes.
- `DELETE /api/account` removes the account and its usage. Payment records stay for accounting, detached from the account.
- `trust proxy` defaults to loopback only. Set `TRUST_PROXY=1` behind one hosting load balancer. Trusting a forged `X-Forwarded-For` would let clients dodge the per-IP limits.

## AI proxy (`server/ai.mjs`)

- Every request names a feature (`X-BeHappy-Feature`). Each feature may only use its own hosted prompt ID.
- Only allowlisted body fields pass. The server sets the model and caps `max_output_tokens` at 2048.
- `previous_response_id` must belong to the calling account; otherwise the response is 409. This stops one user continuing another user's conversation.
- 40 requests per minute per account; a global daily cap (`AI_GLOBAL_DAILY_REQUEST_CAP`, default 5000).
- Quotas per feature and tier are in `server/quota.mjs`. Text-to-speech input is at most 2,000 characters; audio uploads at most 15 MB.
- The model has no tools. Its output is shown as text and only drives one UI signal, a crisis banner. Prompt injection can change what Anulia says, but it cannot take actions or reach other users' data.

## Payments (`server/payments.mjs`, `server/flitt.mjs`)

- Access comes only from orders that Flitt approved. Never from URL parameters, `postMessage`, local flags or the fact that a redirect happened.
- Callbacks and returns must carry a valid Flitt signature (SHA-1 over sorted values with the secret, which is Flitt's scheme). The merchant ID must match. Amount and currency must match the order for approved, processing and reversed updates; a mismatch marks the order `error`.
- Status changes follow an allowed-transition table and are deduplicated, so a replayed callback changes nothing.
- An unsigned return URL never approves. The server asks Flitt for the order status directly instead.
- `assertTestModeOnly()` refuses to start unless Flitt is in test mode with the test merchant.
- Refunds go through `POST /api/admin/orders/:id/refund` with `ADMIN_TOKEN`. A reversal removes the entitlement.
- A declined card leaves the order open at Flitt, so the purchases list re-checks the newest open orders with Flitt and shows the attempt as declined. Nothing is granted.
- Every Flitt API call has a timeout (15 s; status checks 8 s), so a hanging connection cannot stall checkout, the result screen or the purchases list.
- 21 server tests cover forged, tampered and replayed callbacks, a grant happening only once, unsigned returns, declined attempts, refunds, AI validation, chain ownership and quotas.

## Privacy

- Local first. Journal, check-ins, conversations, art photos and assessment results stay on the device: AsyncStorage (localStorage on web), SQLite and IndexedDB.
- The server stores accounts (hashed secrets), orders, usage counters and which response IDs belong to which account. It stores no messages, journal text or assessment answers.
- AI features stay off until the person agrees on a consent screen that names the provider. Journal entries go to the AI only when the person taps "Ask Anulia to reflect". Profile details go only if personalisation is on.
- Export (a full JSON file) and delete-everything are in Profile › Privacy.
- No third-party analytics or tracking SDKs. The owner gets aggregate counts from `GET /api/admin/metrics` (admin token): accounts, activity, orders by status, usage per feature. It returns no IDs and no content.

## Dependencies

`npm audit` after cleanup reports 27 advisories: 0 critical, 6 high, all in Expo and Metro build tooling (`brace-expansion`, `decode-uri-component`, `image-size`, `postcss`, `query-string`, the `expo-router` chain). None run in the API server. They clear with the next Expo SDK upgrade. `expo-av` is deprecated and must be replaced by `expo-audio` before SDK 55.

## Before production

| Priority | Item |
|---|---|
| Must | Rotate the leaked key (above). HTTPS for app and API. Strong `ADMIN_TOKEN`. Exact `APP_PUBLIC_URLS`. |
| Must | Replace the JSON file store with a database before running more than one server instance. Back up the data directory until then. |
| Must | Live payments only with a signed Flitt contract and a public HTTPS callback URL. Keep the test lock until then. |
| Should | Content-Security-Policy and HSTS at the web host. No third-party scripts on the app origin, because tokens live in localStorage on web. |
| Should | Abuse controls beyond per-IP limits, such as App Attest or Play Integrity on native, or a global daily budget for free usage. |
| Should | Alerting on OpenAI spend and on payment orders stuck in `error`. |
