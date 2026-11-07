// Staff roles and permissions. Every staff endpoint names the permission it
// needs, and the server checks it on every request (the app only hides what a
// person can't use). There is deliberately no "read everything" permission:
// journals, Anulia conversations, assessments, safety plans, private messages
// and session notes are not reachable through any staff permission. Protected
// data is opened only through the governed access-request workflow
// (sensitive.request + an approval by someone else, time-limited, logged),
// which is switched off by default.

export const STAFF_ROLES = ['owner', 'admin', 'verifier', 'moderator', 'finance', 'support', 'analyst'];

/** Highest role first: used to label who did something in the audit log. */
const RANK = ['owner', 'admin', 'verifier', 'moderator', 'finance', 'support', 'analyst'];

export const PERMISSIONS = {
  // Overview and analytics: aggregates only, never individual health data.
  'dashboard.view': 'See the overview: counts and trends, no personal data',
  'analytics.view': 'See aggregated product analytics',
  'analytics.export': 'Export aggregated analytics',
  // Accounts.
  'users.view': 'Find accounts and see account basics (contact details masked)',
  'users.contact': 'See full email addresses',
  'users.manage': 'Suspend, reinstate and restrict accounts',
  'users.sessions': 'Sign an account out everywhere; send a password-reset email',
  'users.entitlements': 'Give complimentary Plus days and correct entitlements',
  'users.export': 'Export the account list (no health data)',
  'users.deletion': 'Handle deletion and data requests',
  // Professionals and verification.
  'professionals.view': 'See professionals and applications',
  'professionals.verify': 'Review applications and decide',
  'professionals.documents': 'Open verification documents (every view is logged)',
  'professionals.manage': 'Suspend, reinstate, expire or renew a verification',
  'policies.edit': 'Draft country verification policies',
  'policies.approve': 'Activate a reviewed country policy drafted by someone else',
  // Memberships and payments (Flitt TEST mode).
  'memberships.view': 'See professional memberships and payments',
  'memberships.manage': 'Grant days, correct, stop or resume memberships',
  'payments.refund': 'Refund a TEST payment',
  // Appointments.
  'appointments.view': 'See appointment records (never notes or messages)',
  'appointments.manage': 'Cancel an appointment for BeHappy (both people are told why)',
  // Community.
  'community.view': 'See rooms and community statistics',
  'community.manage': 'Pause, archive and describe rooms; post official notices',
  'moderation.act': 'Handle reports, remove messages, suspend members',
  'moderation.appeals': 'Decide review requests',
  'moderation.context': 'Open the few messages around a report (logged)',
  'safety.view': 'See the safety queue',
  'safety.manage': 'Take, escalate and close safety cases',
  // AI.
  'ai.view': 'See AI usage, errors and estimated cost',
  'ai.manage': 'Change AI budgets, limits, switches and prompt versions',
  // Finance.
  'finance.view': 'See the finance dashboard (TEST mode)',
  // Support.
  'support.view': 'See support requests',
  'support.respond': 'Answer support requests',
  // Security and platform.
  'security.view': 'See sign-in and security events',
  'security.manage': 'Unlock accounts and end staff sessions',
  'staff.view': 'See the staff list',
  'staff.manage': 'Give and remove staff roles',
  'settings.view': 'See platform settings and switches',
  'settings.manage': 'Change platform settings, switches and announcements',
  'audit.view': 'Read the audit log',
  'system.view': 'See system health and translation coverage',
  'sensitive.request': 'Ask for time-limited access to protected data (needs someone else’s approval)',
  'sensitive.approve': 'Approve or refuse such a request (never your own)',
};

const ALL = Object.keys(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  owner: ALL,
  admin: ALL.filter((p) => !['staff.manage', 'sensitive.approve'].includes(p)),
  verifier: ['dashboard.view', 'professionals.view', 'professionals.verify', 'professionals.documents', 'policies.edit'],
  moderator: ['dashboard.view', 'community.view', 'moderation.act', 'moderation.appeals', 'moderation.context', 'safety.view', 'safety.manage'],
  finance: ['dashboard.view', 'analytics.view', 'finance.view', 'memberships.view', 'memberships.manage', 'payments.refund'],
  support: ['dashboard.view', 'users.view', 'users.sessions', 'users.deletion', 'support.view', 'support.respond', 'appointments.view', 'memberships.view'],
  analyst: ['dashboard.view', 'analytics.view', 'analytics.export', 'community.view', 'ai.view', 'finance.view', 'system.view'],
};

/**
 * Actions that need a fresh confirmation (password, and the sign-in code when
 * two-step sign-in is on) within the last few minutes, even for a signed-in
 * staff member: money, roles, exports, protected documents, settings.
 */
export const STEP_UP_PERMISSIONS = new Set([
  'payments.refund',
  'staff.manage',
  'users.export',
  'users.entitlements',
  'users.deletion',
  'analytics.export',
  'professionals.documents',
  'policies.approve',
  'settings.manage',
  'security.manage',
  'sensitive.request',
  'sensitive.approve',
]);

for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
  for (const p of perms) if (!PERMISSIONS[p]) throw new Error(`Unknown permission ${p} in role ${role}`);
}

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

export function permissionsFor(roles = []) {
  const out = new Set();
  for (const r of roles || []) for (const p of ROLE_PERMISSIONS[r] || []) out.add(p);
  return out;
}

export function primaryRole(roles = []) {
  return RANK.find((r) => (roles || []).includes(r)) || null;
}

export const hasStaffRole = (account) => Boolean(account?.roles?.some(isStaffRole));

/**
 * Whether this signed-in account may use a permission right now: a staff
 * role that grants it, a password session (not a copied device token), a
 * registered account, and staff access not suspended.
 */
export function can(account, permission) {
  if (!account?.registered || account.sessionKind !== 'password' || account.status !== 'active') return false;
  if (account.staffSuspendedAt) return false;
  return permissionsFor(account.roles).has(permission);
}
