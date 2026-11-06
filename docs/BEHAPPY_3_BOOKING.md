# BeHappy 3.0 booking

Clients request or book sessions with verified psychologists on the professional's own hours and rules. **BeHappy never collects session payments and takes no commission**: the booking records how the client pays the professional directly, and its payment status is always `not_collected_by_behappy`.

Code: `server/professional/booking.mjs`, `server/professional/time.mjs` (time zones and slots), screens `app/specialists/[id]/book.tsx`, `app/appointments/`, `app/pro/bookings.tsx`.

## What the professional sets up

- **Session types**: name, online or in person, length in minutes, price (GEL). Several types are possible; inactive ones stay in history.
- **Weekly hours** per weekday (start–end), and **days off**.
- **Time zone** (IANA name, e.g. `Asia/Tbilisi`). Clients see times in their own zone; the profile names the professional's zone.
- **Rules**: minimum notice for new bookings (hours), break between sessions (minutes), free-cancellation notice (hours), a written cancellation policy, how clients pay, and whether bookings are **confirmed automatically**.

## Free times

`GET /api/pros/:id/slots?serviceId=&from=&days=` returns start times for up to 28 days ahead (14 by default). Slots are laid out from the start of each weekly window in steps of *session length + break*, in the professional's time zone (daylight-saving changes handled), skipping days off, times inside the booking notice, and anything overlapping an active booking.

## Booking

1. The client chooses a session type and a time, enters **the name this professional should see** (stored per client, reused), and an optional short note. The note is **encrypted** and readable only by the two of them; the app suggests keeping health details for the session.
2. The server re-checks that the professional is listed and the slot is free, and inserts the booking. A PostgreSQL **exclusion constraint** on `(professional_id, time range)` for active bookings makes double booking impossible even under concurrent requests; the loser gets `409 slot_unavailable` and picks another time.
3. Status starts as `confirmed` when the professional auto-confirms, otherwise `requested`.

Limits: at most 3 open requests per client with the same professional and 10 in total (`429 too_many_requests`). Nobody can book themselves.

## Statuses (kept separate from attendance and payment)

| Field | Values |
|---|---|
| `status` | `requested` → `confirmed` · `declined` · `cancelled_by_client` · `cancelled_by_professional` · `expired` |
| `attendance` | `unknown` → `attended` · `client_no_show` (marked by the professional after the start time) |
| `paymentStatus` | always `not_collected_by_behappy` |
| `lateCancellation` | `true` when a confirmed booking is cancelled inside the free-cancellation notice |

Who can do what:

| Action | Who | When |
|---|---|---|
| Confirm / decline | Professional | A request that hasn't started |
| Cancel | Either side | A requested or confirmed booking that hasn't started; inside the notice it is recorded as a late cancellation (BeHappy charges nothing) |
| Reschedule ("Choose another time") | Client | One transaction: the new time is booked and the old one is released (`cancelled_by_client`, reason "rescheduled"); if the new time is taken, nothing changes. The new booking needs confirmation unless the professional auto-confirms |
| Mark attended / no-show | Professional | After the start time of a confirmed booking |

## Automatic jobs (scheduler)

- Requests expire when nobody answered within 48 hours or the start is less than an hour away (`expired`; the client is notified).
- A reminder goes to both sides once, within 24 hours before a confirmed session.

## Notifications

`booking_requested` / `booking_confirmed_auto` (to the professional), `booking_confirmed`, `booking_declined`, `booking_expired` (to the client), `booking_cancelled` (to the other side, with the late flag), `booking_reminder` (both). Each opens the right screen: the professional's Bookings or the client's appointment.

## Messages and addresses

Every booking opens (or reuses) a private conversation between the two. Messages about a requested or confirmed booking keep working even when the professional's membership has ended. The in-person address is shown only on confirmed in-person appointments.

## API

| Method and path | Who | Purpose |
|---|---|---|
| `GET /api/pros/:id/slots` | anyone | Free times |
| `GET/PUT /api/client/profile` | client | Name shown to professionals |
| `POST /api/bookings` · `GET /api/bookings` · `GET /api/bookings/:id` | client | Book, list, detail |
| `POST /api/bookings/:id/cancel` · `/reschedule` | client | Cancel (optional reason), move |
| `GET /api/pro/bookings?scope=requests|upcoming|past` | professional | Lists |
| `POST /api/pro/bookings/:id/confirm` · `/decline` · `/cancel` · `/attendance` | professional | Decisions and attendance |

Tests: `server/test/professionals.test.mjs` — "bookings: real slots only, no double booking, statuses kept apart, no commission", plus the browser journey (`npm run qa:pro`): a client requests a time, the professional confirms, both message each other live.
