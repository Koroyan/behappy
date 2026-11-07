# Admin permissions

Source of truth: `server/admin/permissions.mjs`. The server checks the permission on every request; the app hides what a role can't use.

## Who counts as staff

A staff member needs all of these at once:

- one of the roles below in `accounts.roles`,
- a **password session** (a device token, even of a staff account, opens nothing: `password_session_required`),
- an active account and staff access that is not suspended (`staff_suspended`),
- the two-step code for this session when two-step codes are on, or set up when an owner requires them (`mfa_code_required`, `mfa_setup_required`).

## Roles

| Role | Meant for |
|---|---|
| **owner** | Everything, including staff roles and approving protected-data requests |
| **admin** | Day-to-day operations; cannot manage staff or approve protected-data requests |
| **verifier** | Professional applications and documents; drafts country policies |
| **moderator** | Community reports, appeals, safety cases |
| **finance** | Payments, memberships, TEST refunds, finance dashboard |
| **support** | Support requests, account help (contact details masked) |
| **analyst** | Aggregated analytics only |

A person may hold several roles; permissions add up.

## Permissions by role

| Permission | owner | admin | verifier | moderator | finance | support | analyst |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| analytics.view | ✓ | ✓ | | | ✓ | | ✓ |
| analytics.export* | ✓ | ✓ | | | | | ✓ |
| users.view | ✓ | ✓ | | | | ✓ | |
| users.contact | ✓ | ✓ | | | | | |
| users.manage | ✓ | ✓ | | | | | |
| users.sessions | ✓ | ✓ | | | | ✓ | |
| users.entitlements* | ✓ | ✓ | | | | | |
| users.export* | ✓ | ✓ | | | | | |
| users.deletion* | ✓ | ✓ | | | | ✓ | |
| professionals.view | ✓ | ✓ | ✓ | | | | |
| professionals.verify | ✓ | ✓ | ✓ | | | | |
| professionals.documents* | ✓ | ✓ | ✓ | | | | |
| professionals.manage | ✓ | ✓ | | | | | |
| policies.edit | ✓ | ✓ | ✓ | | | | |
| policies.approve* | ✓ | ✓ | | | | | |
| memberships.view | ✓ | ✓ | | | ✓ | ✓ | |
| memberships.manage | ✓ | ✓ | | | ✓ | | |
| payments.refund* | ✓ | ✓ | | | ✓ | | |
| appointments.view | ✓ | ✓ | | | | ✓ | |
| appointments.manage | ✓ | ✓ | | | | | |
| community.view | ✓ | ✓ | | ✓ | | | ✓ |
| community.manage | ✓ | ✓ | | | | | |
| moderation.act | ✓ | ✓ | | ✓ | | | |
| moderation.appeals | ✓ | ✓ | | ✓ | | | |
| moderation.context | ✓ | ✓ | | ✓ | | | |
| safety.view | ✓ | ✓ | | ✓ | | | |
| safety.manage | ✓ | ✓ | | ✓ | | | |
| ai.view | ✓ | ✓ | | | | | ✓ |
| ai.manage | ✓ | ✓ | | | | | |
| finance.view | ✓ | ✓ | | | ✓ | | ✓ |
| support.view | ✓ | ✓ | | | | ✓ | |
| support.respond | ✓ | ✓ | | | | ✓ | |
| security.view | ✓ | ✓ | | | | | |
| security.manage* | ✓ | ✓ | | | | | |
| staff.view | ✓ | ✓ | | | | | |
| staff.manage* | ✓ | | | | | | |
| settings.view | ✓ | ✓ | | | | | |
| settings.manage* | ✓ | ✓ | | | | | |
| audit.view | ✓ | ✓ | | | | | |
| system.view | ✓ | ✓ | | | | | ✓ |
| sensitive.request* | ✓ | ✓ | | | | | |
| sensitive.approve* | ✓ | | | | | | |

\* **Step-up:** the action also needs a fresh confirmation (password, plus the two-step code when on) within `staff.stepUpMinutes` (default 15). AI settings (`/api/admin/ai/settings/*`) need one too.

There is no permission that opens journals, Anulia conversations, assessments, safety plans or a "read all messages" view. `sensitive.*` opens one item at a time under the rules in [Privacy](BEHAPPY_ADMIN_PRIVACY.md).

## Rules the server enforces beyond permissions

| Rule | Error |
|---|---|
| Nobody changes their own roles or staff access | `cannot_change_own_roles` |
| The last active owner can't be removed or suspended | `last_owner` |
| Nobody acts on their own account in Users | `not_on_yourself` |
| Staff accounts can't be deleted from Users | `staff_account` |
| Nobody reviews their own professional application or documents | `cannot_review_self` |
| A country policy is activated by someone other than its author | `cannot_approve_own_draft` |
| A protected-data request is decided by someone other than the requester | `cannot_approve_own_request` |
| A moderation appeal is decided by a different moderator | `own_decision` |
| Owner-only settings (`staff.mfaRequired`, `staff.stepUpMinutes`, `features.sensitiveAccess`) | `owner_only` |
| Requiring two-step codes for everyone needs your own codes on first | `enable_mfa_first` |
| Actions that change something need a reason | `reason_required` |

## Giving roles

- **First owner:** `npm run admin:grant -- you@example.org owner` on the server (uses `ADMIN_TOKEN` from `server/.env`; audited as `owner_token`). Unset `ADMIN_TOKEN` afterwards if you don't need the script.
- **Everyone else:** an owner adds them in **Staff and access** (registered BeHappy account: verified email and password), with a reason and a fresh confirmation.
- The person must sign in with email and password to use staff tools.

The authorization matrix test (`server/test/admin.test.mjs`) calls 23 staff endpoints as every role, plus anonymous and device-token requests, and compares the result with this table.
