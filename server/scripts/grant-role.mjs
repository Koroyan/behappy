// Grant or revoke a staff role through the running API, using the owner's
// ADMIN_TOKEN from server/.env (the token is read here and never printed).
//   npm run admin:grant -- someone@example.org admin
//   npm run admin:grant -- someone@example.org moderator --revoke
// The account must be registered (verified email) first.
import { config } from '../config.mjs';

const [email, role = 'admin'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const revoke = process.argv.includes('--revoke');
if (!email || !['admin', 'moderator'].includes(role)) {
  console.error('Usage: npm run admin:grant -- <email> <admin|moderator> [--revoke]');
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
