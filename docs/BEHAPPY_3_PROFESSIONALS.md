# BeHappy 3.0 professionals

A directory of verified psychologists that people can find in their language, book directly and message privately. BeHappy checks credentials; it does not provide therapy itself, does not take session payments and takes **no commission**. Professionals pay a flat membership for the tools (see [BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md](BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md)).

Code: `server/professional/` (`profiles.mjs`, `booking.mjs`, `messaging.mjs`, `membership.mjs`, `routes.mjs`, `catalogs.mjs`) and the screens `app/(tabs)/specialists.tsx`, `app/specialists/`, `app/appointments/`, `app/messages/`, `app/pro/`, `app/admin/applications/`.

## For people looking for help

**Find a psychologist** (Specialists tab):

- Filters: language (19 session languages), focus area (19 areas, from anxiety to life transitions), format (online / in person), maximum price, city, and free-text search over name and approach.
- **Fair order**: results are shuffled once a day per professional (`md5(id || date)`), so nobody can buy the top place. Membership, payments and ratings never change the order.
- Each card shows the photo or initials, the "Verified" badge, city, years of experience, focus areas and the lowest session price.

**A public profile** shows: name shown to clients, photo, bio, approach, focus areas, languages, formats, time zone, *checked* qualifications (only those an admin ticked), session types with length and price, how clients pay, cancellation policy and notice, and what "Verified" means (a document check, not a promise of results; renewed every year; cannot be bought). The in-person address is shown only to clients with a confirmed booking. Legal name, phone, contact email and documents are never public.

A profile is **listed** only while all of these hold (`DISCOVERABLE_SQL`): verification approved and not expired; published by the professional; account active; at least one session language, confirmed by the professional; at least one active session type; and a live membership period (trial, paid or complimentary).

## For psychologists

1. **Apply** (Profile → For psychologists, or Specialists → "Are you a psychologist?"). A registered account is needed.
2. **Fill in the profile** in six steps: identity and confirmed mobile phone; qualifications and documents; practice (bio of 80+ characters, languages with confirmation, focus areas, experience, formats, time zone, photo); sessions and policies (prices, how clients pay, cancellation rules, booking notice, breaks, auto-confirm); weekly hours; review. The review step lists anything still missing.
3. **Verification** by the BeHappy team ([BEHAPPY_3_VERIFICATION.md](BEHAPPY_3_VERIFICATION.md)). Payment plays no part in it.
4. On approval the **free trial** starts (once per person); then **publish** the profile.

**The workspace** (`/pro`) shows verification and membership status with reasons why the profile is or isn't listed, today's and upcoming appointments, booking requests, client messages, and simple 30-day statistics (profile views, booking requests, new conversations). BeHappy does not track income; clients pay the professional directly.

## Private messages

- A client can start a conversation with a listed professional ("Send a message") or from an appointment.
- Messages are stored encrypted (AES-256-GCM). They are visible to the two people only; BeHappy staff see a message only if one of them reports it.
- Who can write:
  - The client: while the professional is listed, or whenever they have a booking with that professional.
  - The professional: about any booking that is requested or confirmed (up to 30 days after it ends) — always; new inquiries only while their membership is active ("membership_required"). A suspended professional cannot write.
- New messages arrive live (`thread:message`) and as notifications.

## Privacy boundaries

- A psychologist sees only the **name the client chose for them** and the optional booking note. Never the client's community name, journal, Anulia conversations, questionnaires or email.
- Booking notes are encrypted and readable only by the two parties.
- When a client deletes their account, the professional's records keep the appointment history as "Former client"; messages can no longer be sent.
- Admins see aggregated numbers and the verification file, not conversations or booking notes.

## Honesty rules (in the product copy)

- No promises of clients, income or results anywhere.
- "Verified" is explained wherever it appears.
- BeHappy never presents itself as the provider of therapy, and every directory screen links to "Get help now".

## API

| Method and path | Who | Purpose |
|---|---|---|
| `GET /api/pros` · `GET /api/pros/catalog` · `GET /api/pros/:id` · `GET /api/pros/:id/slots` | anyone | Directory search, vocabularies and price, public profile, free slots |
| `GET/PUT /api/client/profile` | client | The name shown to professionals |
| `POST/GET /api/bookings` · `GET /api/bookings/:id` · `POST …/cancel` · `…/reschedule` | client | See [BEHAPPY_3_BOOKING.md](BEHAPPY_3_BOOKING.md) |
| `GET/POST /api/threads` · `GET /api/threads/:id` · `POST …/messages` · `…/messages/:mid/report` | both | Private messages |
| `GET /api/pro/me` · `POST /api/pro/application` · `PUT /api/pro/profile` · `…/qualifications` · `…/services` · `…/availability` · `…/photo` · `POST/DELETE /api/pro/documents` · `POST /api/pro/phone` · `…/phone/verify` · `POST /api/pro/submit` · `…/publish` | professional | Application and profile |
| `GET /api/pro/bookings` · `POST /api/pro/bookings/:id/:action` | professional | Confirm, decline, cancel, mark attendance |
| `/api/pro/membership…` | professional | See the subscriptions doc |
| `/api/admin/pros…` | admin | See the verification doc |

Tests: `server/test/professionals.test.mjs` (12 tests) and the browser journey `npm run qa:pro` (see [BEHAPPY_3_TEST_RESULTS.md](BEHAPPY_3_TEST_RESULTS.md)).
