# Flitt payments: test-mode setup

BeHappy takes payments through [Flitt](https://flitt.com/) and is **locked to Flitt's test environment**. No real money can move. `assertTestModeOnly()` in `server/config.mjs` stops the server from starting with anything other than the public test merchant, unless a developer explicitly sets `FLITT_ALLOW_CUSTOM_TEST_MERCHANT=true` for a sandbox merchant Flitt issued to them.

## Run it locally

1. Copy `server/.env.example` to `server/.env` and set `OPENAI_API_KEY` and a random `ADMIN_TOKEN`. Leave the Flitt values at their test defaults.
2. Start the API: `npm run server:dev` (port 8787).
3. Start the app: `npx expo start --web --port 8081` (do not set `CI=1`, which turns off reloading).
4. Open http://localhost:8081/pricing, choose a plan, then **Continue** and **Go to secure payment**.
5. On Flitt's page, pay with a test card.

| Test card | Result |
|---|---|
| `4444 5555 1111 6666` | Approved (no 3-D Secure) |
| `4444 1111 5555 6666` | Declined (no 3-D Secure) |

Any future expiry date and any CVV work. The checkout screen shows a "Test payment" notice and the test card number.

## Test configuration

| Variable | Default | Meaning |
|---|---|---|
| `FLITT_MODE` | `test` | Anything else is refused |
| `FLITT_MERCHANT_ID` | `1549901` | Flitt's public test merchant |
| `FLITT_SECRET_KEY` | `test` | The test merchant's signing secret (server only) |
| `PUBLIC_API_URL` | `http://localhost:8787` | Base for Flitt's server callback |
| `APP_PUBLIC_URLS` | `http://localhost:8081` | Where the person returns after paying |
| `BEHAPPY_CATALOG` | `current` | `proposal` switches to the proposed prices |

## How a payment is confirmed

1. The app calls `POST /api/payments/checkout` with a product ID. The server creates the order with the amount from its own catalog and asks Flitt for a checkout URL. The client never sends a price.
2. The person pays on Flitt's page, which BeHappy never sees inside.
3. Flitt sends a signed **server callback** to `/api/payments/flitt/callback`, and redirects the person to `/api/payments/flitt/return`.
4. The server applies an update only if the signature, merchant ID, amount and currency all check out, and the status change is allowed. An unsigned return is never trusted. The server asks Flitt for the order status itself.
5. The app's result screen polls `GET /api/payments/orders/:id` and shows what the server decided: confirmed, declined, expired, still pending, or needs checking.
6. Plus or the art program is unlocked only by approved orders on the account. `GET /api/account/me` returns the entitlements.

**Local callbacks.** Flitt cannot reach `localhost`, so step 3's callback does not arrive in local development. The return redirect plus the server's own status check confirm the payment instead, so local testing still works end to end. On a public HTTPS server, both paths run.

**Declines.** After a decline Flitt keeps the order in `processing` so the payer can retry on its page. The server records Flitt's response code and shows "Payment didn't go through" without granting anything.

## Refunds (test)

```
curl -X POST http://localhost:8787/api/admin/orders/ORDER_ID/refund \
  -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{}"
```

The server asks Flitt to reverse the order and confirms the reversal. When the order becomes `reversed`, the entitlement disappears.

## Automated checks

| Command | What it does |
|---|---|
| `npm run test:server` | 20 tests with a fake Flitt: signatures (including the docs example), forged, tampered and replayed callbacks, grants happening once, unsigned returns, refunds |
| `npm run qa:payments -- --card approve` | Real browser against the Flitt sandbox: pays with the approved card and checks that Plus becomes active |
| `npm run qa:payments -- --card decline` | Same with the declined card: checks that nothing is granted |

Last live sandbox run (Nov 2026): approve PASS (51 GEL, Plus active for 30 days, card shown masked), decline PASS, refund PASS.

## Before taking real payments

Not done, and it needs the owner:

1. A signed merchant agreement with Flitt and a TBC business account. Flitt requires one.
2. A public HTTPS API (`PUBLIC_API_URL`), so server callbacks arrive.
3. The live merchant ID and secret in the server environment only, never in the app.
4. Removing the test lock in `server/config.mjs`. This should be a deliberate, reviewed change.
5. A database instead of the JSON file store, backups, and alerts on orders stuck in `error`.
6. Terms of sale, refund policy and receipts that meet Georgian consumer law, plus VAT registration if required.
