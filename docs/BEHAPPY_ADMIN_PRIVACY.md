# Admin privacy

What BeHappy staff can and cannot see, and why.

## Never available to staff

| Data | Where it lives |
|---|---|
| Journal entries and reflections | On the person's device |
| Anulia conversations | On the device; the server keeps only response ids for 31 days (no text) |
| Self-checks (questionnaire answers and scores) | On the device |
| Safety plans | On the device |
| Art therapy drawings | On the device (sent to the AI only with consent, not stored by the server) |

Because these never reach the server, no role, permission, request or export can open them. The admin center says so on every account page.

## Available only through a governed request

**Private messages** between a client and a professional, and **booking notes**, are encrypted at rest. Staff can open one item only through **Protected data** (`/admin/protected`):

1. Off by default. Only an owner can enable `features.sensitiveAccess` (for example when a formal legal request arrives).
2. A request names **one item** (one conversation or one booking's note), a **purpose** (at least 30 characters), a **lawful basis** (legal obligation, vital interests, the person's own request, legitimate interest) and a **ticket or case reference**. Needs `sensitive.request` and a fresh confirmation.
3. **Someone else** with `sensitive.approve` (owner by default) approves or refuses with a note; never the requester.
4. Approval lasts at most **24 hours** (4 by default in the admin center). Only the requester can open the item, and every view is logged (`sensitive.viewed`). Anyone involved can close it early.

There is no "read all messages" permission and no undocumented way around this. A reported private message reaches moderators only through the reporter's own report (3.0 behaviour, unchanged).

## Visible to staff, with limits

| Data | Who | Limits |
|---|---|---|
| Email addresses | users.view | Masked (`n***@example.org`) unless users.contact |
| Account basics, plan, payment counts | users.view | No card data (Flitt holds it; BeHappy stores only a masked card from the TEST provider) |
| Usage over 30 days | users.view | Totals per feature; nothing if the person opted out |
| Community name, rooms joined, message and report counts | users.view | Counts, not messages |
| Reported community messages | moderators | The snapshot in the report, and up to 5 messages around it (logged) |
| Safety cases | safety staff | The reported text, operational notes (encrypted); no diagnoses or labels |
| Support requests | support staff | The person's own words, encrypted at rest; views logged |
| Verification documents | verifiers, admins | Fresh confirmation, every view logged |
| Appointment records | appointments.view | Times, service, status, history; never the note or messages |
| Aggregated analytics | analytics.view | Groups under 5 hidden |

## Analytics

Only allowlisted events with enum or number fields; no free text, no content, no assessment answers or scores; staff screens not counted; people can opt out (which deletes what was kept); raw events expire. See [Analytics](BEHAPPY_ADMIN_ANALYTICS.md). Analytics are never sent to third parties and never used for marketing audiences.

## AI

The AI dashboard records counts, tokens, outcome and timing only — never prompts or replies. Sending anything to the AI provider still needs the person's consent in the app (2.0 behaviour, unchanged).

## No profiling

- Community statistics are per room and topic. Room participation is not used to infer anything about a person.
- Nothing in the admin center classifies people as healthy, unhealthy, at risk or not; safety cases record actions and outcomes.

## Exports

| Export | Contents | Rules |
|---|---|---|
| Accounts CSV | id, registered, status, staff yes/no, created, last seen; email only with users.contact | users.export + step-up; logged |
| Usage CSV | daily totals only | analytics.export + step-up; logged |

No export contains journals, conversations, assessments, messages, notes, tokens or passwords.

## Deletion

- People delete their own account in the app (Profile › Delete data), as in 3.0.
- Staff can delete an account only with `users.deletion`, a reason (at least 10 characters, e.g. the request reference), a fresh confirmation and the **person's email typed in full**; never a staff account. It runs the same deletion as the person's own (community, professional, bookings, messages, analytics, support requests); payment records stay for accounting, detached. The audit log keeps only a hash of the account id.

## Retention summary

| Data | Kept |
|---|---|
| Raw analytics events | `analytics.retentionDays` (395) |
| Daily usage totals | 760 days, or until the account is deleted |
| Security events | 400 days |
| Resolved report snapshots | 180 days (3.0) |
| Audit log | Indefinitely (no content, only who did what to which record) |

**Before launch:** have the privacy notice, the lawful bases and the Georgian legal wording reviewed by counsel.
