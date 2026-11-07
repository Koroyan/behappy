# Admin: professionals, verification, memberships and appointments

Complements [BEHAPPY_3_VERIFICATION.md](BEHAPPY_3_VERIFICATION.md) and [BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md](BEHAPPY_3_PROFESSIONAL_SUBSCRIPTIONS.md).

**Verification is never granted because of a payment.** A paid or trial membership only keeps an already verified profile listed.

## Applications (verification desk)

`/admin/applications` (professionals.view; decisions need professionals.verify). The existing 3.0 desk now sits inside the admin center: start review, request more information, approve, reject, suspend, reinstate, with the checklist and verified qualifications. Nobody reviews their own application (`cannot_review_self`).

## Directory

`/admin/professionals`: every profile with verification status, membership state, directory listing, place, verification expiry, bookings in 30 days. A row opens a panel with:

- **Documents** with a review outcome each: accepted, unclear or rejected (unclear and rejected need a note the professional will see). Opening a document needs `professionals.documents` and a fresh confirmation; each view is logged (`verification_document.viewed`).
- **Renew verification** (`professionals.manage`): extends `verification_expires_at` by `PRO_VERIFICATION_VALID_DAYS` (default 365) for an approved profile; needs a reason and a **review reference** (where the licence or registration was checked again). The professional is notified.
- **End verification now**: approved → expired, unpublished, notified.
- **Membership periods** (`memberships.view`): trial, paid (TEST) and staff-given periods. Trial and staff-given periods can be revoked with a reason (`memberships.manage`); paid periods are corrected only through a TEST refund in Finance.
- **Stop / resume** a membership for a professional (`/api/admin/professionals/:id/membership/stop|resume`), with a reason; the professional gets a notification.

## Country policies

`/admin/policies`. Which documents a country requires before someone may offer psychological services there must come from the law, not from us.

- **Default rule** (no reviewed policy): identity document and degree required; licence or registration checked where an official register exists. Profiles show "not reviewed for this country".
- **Draft** (`policies.edit`): country, identity / degree / licence requirements, official register (https), notes, and a **legal source** (law, regulation or regulator guidance, with a date). Required.
- **Activate** (`policies.approve` + step-up): only someone other than the author, with a **review reference** (who reviewed it and when). The previous active policy for that country is retired. Active policies change what applications from that country must include (`ruleFor`), immediately on this server and on every scheduler run elsewhere.
- **Withdraw** a draft or **retire** an active policy (back to the default), each with a reason.

Every step is in the audit log (`policy.drafted`, `policy.activated`, `policy.withdrawn`, `policy.retired`). **Don't invent licensing laws:** keep a policy as a draft until counsel has confirmed it.

## Appointments

`/admin/appointments` (appointments.view): search by booking id, professional or client name; filter by status. The detail shows times, service, price (paid to the professional directly; BeHappy takes 0%), the history of status changes and staff actions. **The client's note and private messages are never shown** — only whether a note exists.

**Cancel for BeHappy** (`appointments.manage`): only active, future bookings; reason of at least 10 characters; optional messages to each side. Status becomes `cancelled_by_admin` ("Cancelled by BeHappy" in all 19 languages), and **both people are notified** (`booking_cancelled_by_admin`) and see it live. A confirmed appointment is never changed silently.

## Finance

`/admin/finance` (finance.view). Flitt **TEST mode**: every figure is a sandbox transaction, labelled "not real money and not business income".

- Net, paid, refunded, number of payments and checkout completion, each against the previous period
- Payments per day by product (professional membership, Plus, art program)
- Membership states, renewals and memberships that ended without renewal
- Complimentary Plus days and membership days given by staff — counted separately, never revenue
- Latest payments, with **Refund** (`payments.refund` + step-up, reason) through Flitt's TEST reversal API

Complimentary Plus (`users.entitlements` + step-up, on an account page) creates an `entitlement_grants` row that stacks like a purchase in the entitlement calculation but creates no order and no payment record.

## Endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/pros`, `/api/admin/pros/:id` | professionals.view |
| POST | `/api/admin/pros/:id/review` | professionals.verify |
| GET | `/api/admin/pros/:id/documents/:docId` | professionals.documents + step-up |
| POST | `/api/admin/pros/:id/membership/grant` | memberships.manage |
| GET | `/api/admin/professionals` | professionals.view |
| GET | `/api/admin/professionals/:id/documents` | professionals.view |
| POST | `/api/admin/professionals/:id/documents/:docId/review` | professionals.verify |
| POST | `/api/admin/professionals/:id/verification/renew\|expire` | professionals.manage |
| GET | `/api/admin/professionals/:id/memberships` | memberships.view |
| POST | `/api/admin/professionals/:id/membership/stop\|resume` | memberships.manage |
| POST | `/api/admin/professionals/:id/membership/:membershipId/revoke` | memberships.manage |
| GET/POST | `/api/admin/policies` | professionals.view / policies.edit |
| POST | `/api/admin/policies/:id/activate\|retire` | policies.approve + step-up |
| POST | `/api/admin/policies/:id/withdraw` | policies.edit |
| GET | `/api/admin/appointments`, `/api/admin/appointments/:id` | appointments.view |
| POST | `/api/admin/appointments/:id/cancel` | appointments.manage |
| GET | `/api/admin/finance`, `/api/admin/memberships`, `/api/admin/payments` | finance.view / memberships.view |
| POST | `/api/admin/orders/:orderId/refund` | payments.refund + step-up |
