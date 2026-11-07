/**
 * Email + password for BeHappy accounts (server: server/identity.mjs).
 *
 * Creating an account upgrades the account this device already uses (same
 * id), so nothing is lost. Signing in to a different account replaces this
 * device's sign-in; private notes stay on the device either way.
 */
import { trackAction } from '@/lib/analytics';

import { ApiError, apiJson, getStoredAccount, replaceAccount } from './client';

export interface DeviceSession {
  id: string;
  kind: 'device' | 'password';
  createdAt: number;
  lastUsedAt: number;
  device: string | null;
  current: boolean;
}

/** Server error code → i18n key under account.errors (falls back to "generic"). */
export const AUTH_ERRORS = new Set([
  'bad_email',
  'password_too_short',
  'password_too_long',
  'password_too_simple',
  'password_too_common',
  'password_contains_email',
  'email_in_use',
  'already_registered',
  'code_wrong',
  'code_expired',
  'code_missing',
  'code_attempts_exceeded',
  'invalid_credentials',
  'account_locked',
  'account_suspended',
  'rate_limited',
  'email_unavailable',
  'nothing_to_verify',
]);

export function authErrorKey(e: unknown): string {
  const code = e instanceof ApiError ? e.code : undefined;
  return `account.errors.${code && AUTH_ERRORS.has(code) ? code : 'generic'}`;
}

export async function startRegistration(email: string, password: string, lang: string) {
  return apiJson<{ ok: true; email: string }>('/api/auth/register', { method: 'POST', body: { email, password, lang } });
}

export async function resendCode(lang: string) {
  return apiJson('/api/auth/resend', { method: 'POST', body: { lang } });
}

export async function verifyEmail(code: string) {
  const res = await apiJson<{ ok: true; email: string }>('/api/auth/verify-email', { method: 'POST', body: { code } });
  // The device token keeps working; the account is now registered.
  trackAction('account', 'registered');
  return res;
}

async function adopt(res: { accountId: string; token: string }) {
  await replaceAccount({ accountId: res.accountId, token: res.token, createdAt: Date.now(), kind: 'password' });
}

export async function signIn(email: string, password: string) {
  const res = await apiJson<{ accountId: string; token: string }>('/api/auth/login', { method: 'POST', body: { email, password }, anonymous: true });
  await adopt(res);
  trackAction('account', 'signed_in');
  return res;
}

/** Signs this device out and starts a fresh anonymous account (local notes stay). */
export async function signOut() {
  try {
    await apiJson('/api/auth/logout', { method: 'POST', body: {}, noRecover: true });
  } catch {
    // Already signed out on the server, or offline: the device forgets the token either way.
  }
  await replaceAccount(null);
}

export async function forgotPassword(email: string, lang: string) {
  return apiJson('/api/auth/password/forgot', { method: 'POST', body: { email, lang }, anonymous: true });
}

export async function resetPassword(email: string, code: string, password: string) {
  const res = await apiJson<{ accountId: string; token: string }>('/api/auth/password/reset', { method: 'POST', body: { email, code, password }, anonymous: true });
  await adopt(res);
  return res;
}

export async function changePassword(current: string, password: string) {
  return apiJson('/api/auth/password/change', { method: 'POST', body: { current, password } });
}

export async function listSessions() {
  return (await apiJson<{ sessions: DeviceSession[] }>('/api/auth/sessions')).sessions;
}

export async function revokeSession(id: string) {
  return apiJson(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function isPasswordSession() {
  return (await getStoredAccount())?.kind === 'password';
}
