# BeHappy 3.0 verification of professionals

Before anyone appears in the directory, a BeHappy administrator checks their identity and qualifications. Verification is separate from payment: **paying never verifies anyone**, and a membership never changes a verification decision.

Code: `server/professional/profiles.mjs` (application, `missingItems`, `ACTIONS`, `review`), `server/professional/catalogs.mjs` (country rules, checklist), `server/scheduler.mjs` (expiry), screens `app/pro/apply.tsx`, `app/admin/applications/`.

## States

| State | Meaning | Who moves it |
|---|---|---|
| `draft` | Being filled in, not sent | Applicant |
| `submitted` | Sent, waiting for a reviewer | Applicant (`POST /api/pro/submit`) |
| `under_review` | A reviewer is checking | Admin: start review |
| `more_info_required` | The reviewer asked for changes (with a message) | Admin |
| `approved` | Verified; may be listed when published and the membership is live | Admin |
| `rejected` | Not approved (with a message) | Admin |
| `suspended` | Hidden from the directory (with a message) | Admin |
| `expired` | Verification older than its validity; needs a new review | Scheduler |

Transitions allowed by the server (`ACTIONS`):

| Action | From | To | Message required |
|---|---|---|---|
| start_review | submitted | under_review | – |
| request_info | submitted, under_review, expired | more_info_required | yes |
| approve | submitted, under_review, expired | approved | – |
| reject | submitted, under_review, more_info_required | rejected | yes |
| suspend | approved | suspended | yes |
| reinstate | suspended | approved | – |

Anything else answers `409 bad_transition`. Nobody can review their own application (`403 cannot_review_self`). Approval is refused while required items are missing (`400 incomplete`).

## What an application must contain

The server computes the missing list (`missingItems`), shown to the applicant before sending and to the reviewer:

legal name · name shown to clients · country (2-letter code) · city · contact email · **confirmed mobile phone** (SMS code) · bio of 80+ characters · session languages **confirmed by the applicant** · focus areas · years of experience · a degree · identity document · degree document · at least one session type · how clients pay · cancellation policy · online or in-person format. Where a country rule requires it: a licence or registration and its document.

### Country rules

`COUNTRY_RULES` is deliberately empty until a lawyer confirms what each market requires before someone may offer psychological services and advertise them. Until then the **default rule** applies: identity document and degree required; licence or registration checked wherever an official register exists. This is listed as an owner action in the security doc.

## Documents

- Photos or PDFs (JPEG, PNG, WebP, HEIC, PDF), up to 10 MB each, uploaded during the application.
- Stored **encrypted** (AES-256-GCM) in the database; never served publicly.
- Only admins can open them (`GET /api/admin/pros/:id/documents/:docId`, sent with `Cache-Control: no-store`); each opening is audited.
- Editing is locked while an application is under review. After approval the legal name, country and qualifications are locked (changes go through support); the public parts of the profile stay editable.

## The review desk

`/admin/applications` lists applications by state (default: waiting for review). An application shows identity and contact (private), qualifications with a tick per checked qualification, documents, practice details, sessions and policies, the missing list, the verification record and the membership state.

The **checklist** recorded with each decision: identity matches the documents · degree checked · licence checked in the official register (where one exists) · service languages plausible · profile text appropriate (no guarantees or misleading claims) · no concerns.

On **approve** the server, in one transaction: sets `verified_at` and `verification_expires_at` (365 days, `PRO_VERIFICATION_VALID_DAYS`); marks the ticked qualifications as verified (only those are shown publicly); records the event, checklist and audit entry; notifies the applicant; and tries to start the free trial (once per person, see the subscriptions doc).

Every decision stores the message to the applicant and an optional internal note (admins only), and notifies the applicant (`pro_verification`).

## Expiry

The scheduler moves approved profiles whose verification has passed its validity to `expired` and notifies them. The profile leaves the directory; confirmed appointments and their messages continue. The professional updates documents and sends them for a new review.

## Tests

`server/test/professionals.test.mjs` covers: the missing list and the lock during review; encrypted documents that only admins can open, with every view audited (`verification_document.viewed`); request info → resubmit → approve, final rejection and staff-only access; approval starting the trial and the listing rule (verified + published + live membership); that a paid pass never verifies anyone (unverified applicants cannot pay or be listed); that nobody can review their own application (another admin can); and that after its validity the scheduler expires the verification, unpublishes the profile and notifies the professional.

The browser journey (`npm run qa:pro`) drives application → start review → checklist → approve through the real screens.
