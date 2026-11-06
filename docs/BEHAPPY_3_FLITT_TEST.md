# BeHappy 3.0 and Flitt (TEST mode only)

BeHappy takes payments through Flitt and is **locked to Flitt's test environment**. No real money can move, and no real charges will be processed until the owner explicitly authorizes going live. The 2.0 setup guide still applies: [BEHAPPY_FLITT_TEST_SETUP.md](BEHAPPY_FLITT_TEST_SETUP.md). This page covers what 3.0 adds.

## What is sold

| Product | Kind | Price | Unlocks |
|---|---|---|---|
| `plus_30` · `plus_90` · `plus_365` | `plus` | 51 · 142 · 519 GEL in the default `current` catalog (`BEHAPPY_CATALOG=proposal` switches to the pricing-strategy proposal); TEST values, not final | BeHappy Plus for 30, 90 or 365 days |
| `art_program` | `art` | 50 GEL, one-time | The full art therapy program |
| `professional_30d` | `professional` | 79 GEL / 30 days | A membership period for a **verified** professional ([details](BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md)) |

Safety resources and the community are never sold.

## The lock

`assertTestModeOnly()` in `server/config.mjs` refuses to start the server when `FLITT_MODE` is anything other than `test`, or when the merchant is not Flitt's public test merchant `1549901` (a Flitt-issued sandbox merchant needs `FLITT_ALLOW_CUSTOM_TEST_MERCHANT=true`). Every order is stored with `mode: 'test'`, and every payment screen, receipt and admin figure is labelled TEST.

## How a payment is trusted

The app never decides that a payment succeeded. A URL flag, a `success=true` parameter, a message from the browser, a button, a redirect or a local flag never grant anything.

1. The app asks the server for a checkout (`POST /api/payments/checkout`, or `POST /api/pro/membership/checkout` for professionals). The server creates the order with the amount and currency **from its own catalog**, signs the request (SHA-1 over the sorted parameters with the secret, as Flitt documents) and returns Flitt's hosted checkout URL.
2. The browser goes to Flitt; the person pays with a test card.
3. Flitt reports the result to the server in up to three ways: the browser returns through `/api/payments/flitt/return`, Flitt posts to `/api/payments/flitt/callback`, and the server can ask Flitt for the order status. For each, the server checks the **signature, merchant, order id, amount and currency** before applying the result.
4. `applyFlittUpdate` moves the order through allowed transitions only, in a transaction, idempotently: a duplicate or replayed callback cannot apply twice. Fulfilment (Plus, the art program, or a professional membership period) runs inside that same transaction. A reversal revokes what the payment granted.
5. The result screen (`/checkout/result`) polls the server for the order and shows only what the server verified.

## Tunnels and several origins

Flitt's return and callback URLs are built from the request's origin when it is one of `APP_PUBLIC_URLS` (`requestApiBase()` honours `X-Forwarded-Host` from the dev proxy or Caddy). So a checkout started through `https://<tunnel>` returns through the tunnel, and one started on `http://localhost:8081` returns to localhost. Unknown origins fall back to `PUBLIC_API_URL`.

## Test cards

| Card | Result |
|---|---|
| `4444 5555 1111 6666` | Approved, no 3-D Secure |
| `4444 1111 5555 6666` | Declined, no 3-D Secure |

Any future expiry date (for example `12/30`) and any CVV (for example `123`). On narrow phones Flitt first shows a list of methods; choose **Card**.

## Automated checks

| Command | What it does |
|---|---|
| `npm test` | Signature, tampering, wrong amount/currency/merchant, duplicate callbacks, reversals, entitlement and membership fulfilment |
| `npm run qa:payments -- --card approve` (or `decline`) | A real browser pays a Plus pass in the Flitt sandbox |
| `npm run qa:pro -- --pay` | The professional journey ends with a real Flitt TEST payment for `professional_30d`; passes on localhost and through the tunnel |

## Before any live payment (not done, needs the owner)

1. Written authorization from the owner to process real charges.
2. A live Flitt merchant contract, live keys stored only in the server environment, and removal of the test lock in a reviewed change.
3. Final prices (the 79 GEL professional price is a placeholder), VAT and invoicing rules, refund policy and terms of sale reviewed by a lawyer.
4. A live end-to-end test with a small real amount, then a refund.
