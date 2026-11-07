// Grant or revoke a staff role through the running API, using the owner's
// ADMIN_TOKEN from server/.env (the token is read here and never printed).
// This is how the first owner is set up; after that, owners manage staff in
// the admin control center (Staff and access).
//   npm run admin:grant -- someone@example.org owner
//   npm run admin:grant -- someone@example.org verifier
//   npm run admin:grant -- someone@example.org moderator --revoke
// Roles: owner, admin, verifier, moderator, finance, support, analyst.
// The account must be registered (verified email and password) first.
import { STAFF_ROLES } from '../admin/permissions.mjs';
import { config } from '../config.mjs';

const [email, role = 'admin'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const revoke = process.argv.includes('--revoke');
if (!email || !STAFF_ROLES.includes(role)) {
  console.error(`Usage: npm run admin:grant -- <email> <${STAFF_ROLES.join('|')}> [--revoke]`);
  process.exit(2);
}
if (!config.adminToken) {
  console.error('ADMIN_TOKEN is not set in server/.env.');
  process.exit(2);
}
const base = process.env.API_URL || `http://localhost:${config.port}`;
const res = await fetch(`${base}/api/admin/roles`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-token': config.adminToken },
  body: JSON.stringify({ email, role, grant: !revoke }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Failed (${res.status}): ${body.message || body.error || 'unknown error'}`);
  process.exit(1);
}
console.log(`${revoke ? 'Revoked' : 'Granted'} ${role} for ${email}. Staff tools need a password sign-in.`);
