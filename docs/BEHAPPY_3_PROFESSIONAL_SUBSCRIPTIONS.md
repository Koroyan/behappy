# BeHappy 3.0 professional membership

The business model for the professional side is **one flat membership**, not commission. Psychologists pay BeHappy for the tools; clients pay psychologists directly and BeHappy takes **0%** of sessions.

Code: `server/professional/membership.mjs`, `server/catalog.mjs` (`getProfessionalCatalog`), `server/payments.mjs` (fulfilment), `server/scheduler.mjs` (reminders), screens `app/pro/membership.tsx`, `app/pro/receipt/[orderId].tsx`, `app/checkout/result.tsx`.

## The product

| | |
|---|---|
| Product id | `professional_30d` |
| Price | **79 GEL** per pass (`PRO_PRICE_MINOR=7900`) |
| Length | **30 days** (`PRO_DURATION_DAYS`) — a pass, not a calendar month |
| Free trial | **14 days**, starting when verification is approved (`PRO_TRIAL_DAYS`) |
| Renewal | **Manual**. Prepaid; nothing renews or is charged automatically |
| Commission | 0% on sessions, always |
| Payment | Flitt, **TEST mode only** ([BEHAPPY_3_FLITT_TEST.md](BEHAPPY_3_FLITT_TEST.md)) |

The price comes from the server catalog; the app only displays it. The 79 GEL figure is a placeholder for the owner to confirm (see the owner actions in the security doc).

## Rules

- **Verification first.** Only approved professionals can buy a pass (`409 verification_required` otherwise). Paying never verifies anyone, never changes ranking (the directory order is a daily shuffle) and never affects reviews.
- **The trial starts on approval, once per person.** Waiting for review spends nothing. A trial is refused when any of these was already used for a trial: the account, the verified phone number, the contact email, or a licence/registration number (stored as HMAC-SHA-256 keys in `trial_grants`, never in clear). A refused trial is recorded, and the membership page says why: "A free trial was already used with these details…".
- **Paid periods come only from verified Flitt payments.** The payment fulfilment runs inside the payment transaction and creates the period. A renewal starts where the current period ends, so renewing early loses nothing. Passes cannot be bought more than about 330 days ahead.
- **A refund (reversal) revokes the period it paid for**, and the professional is notified.
- **Stop at the end of the period**: the professional can stop (and resume) at any time; nothing is refunded automatically; the profile stays listed until the end date.
- **Complimentary days**: an admin can add 1–365 days with a reason (support cases); audited (`membership.granted`).

## States (shown on the dashboard and the membership page)

| State | Meaning |
|---|---|
| `verification_pending` | Not approved yet; the trial will start on approval |
| `trial_active` | In the free trial |
| `active` | In a paid or complimentary period |
| `renewal_due` | The live period ends within 7 days |
| `cancelled` | Stops at the end of the current period |
| `grace` | Grace period after the end (0 days by default, `PRO_GRACE_DAYS`) |
| `not_started` | Approved but never had a period (for example, the trial was refused) |
| `expired` | Had a period, it ended |
| `payment_failed` | A recent payment attempt was declined |
| `suspended` · `rejected` · `verification_expired` | Follows the verification state |

## When a pass ends

- The profile **leaves the directory** and new bookings and new inquiries stop.
- **Confirmed appointments continue**, and messages about requested or confirmed bookings keep working (until 30 days after they end). Records stay.
- Renewing makes the profile listed again immediately (while verified and published).

## Reminders

The scheduler sends renewal reminders **7, 3 and 1 day** before the end (the professional can turn these off) and an **expiry notice on the last day, always**. Reminders are idempotent: a reminder computed twice is stored once.

## Receipts

Every paid order has a receipt (`GET /api/pro/membership/receipts/:orderId`): receipt number, seller, customer (legal name), product, period, amount, card mask, payment date, refund date if any, "0% commission", and the TEST notice. The web app can print it.

## API (`/api/pro/membership`, professional)

| Method and path | Purpose |
|---|---|
| `GET /api/pro/membership` | State, periods, product, reminders setting, orders |
| `POST /api/pro/membership/checkout` | Create a Flitt TEST order; returns the hosted checkout URL |
| `POST /api/pro/membership/cancel` · `/resume` | Stop at the end of the period / keep it |
| `GET /api/pro/membership/receipts/:orderId` | Receipt |
| `PUT /api/pro/profile` `{ remindersEnabled }` | Reminder preference |
| `POST /api/admin/pros/:id/membership/grant` | Admin: complimentary days |

## Tests

`server/test/professionals.test.mjs`: "approval starts the 14-day trial; verified + published + active membership = listed", "a paid pass never verifies anyone; unverified applicants cannot pay or be listed", "one free trial per person: the same phone or licence number cannot start another" (and the refused trial shows `not_started` with `trialRefused`), "membership checkout: 79 GEL / 30 days from the server catalog; approve, duplicate, refund", "renewal reminders at 7, 3 and 1 days respect the preference; the expiry notice always comes", "admin overview counts only verified membership payments". The browser journey paid a pass with the Flitt test card on localhost and through the tunnel (paid period stacked after the trial).
