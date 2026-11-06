/**
 * BeHappy API client.
 *
 * The app talks only to the BeHappy server (server/), never to OpenAI or
 * Flitt directly, and never holds a secret key. Each install gets an
 * anonymous account; its bearer token identifies the install to the server,
 * which owns entitlements and usage limits.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCOUNT_KEY = '@behappy_account_v1';

function defaultBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:8787`;
  }
  return 'http://localhost:8787';
}

export const API_BASE_URL = defaultBaseUrl();

export interface StoredAccount {
  accountId: string;
  token: string;
  recoveryCode?: string;
  createdAt: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;
  constructor(status: number, code: string | undefined, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** 402 from the server: an allowance was used up. Carries reason + reset time. */
export class QuotaError extends ApiError {
  reason: string;
  resetAt: number | null;
  tier: 'free' | 'plus';
  feature: string;
  constructor(data: any) {
    super(402, 'quota_exceeded', 'Allowance reached', data);
    this.name = 'QuotaError';
    this.reason = data?.reason ?? 'limit';
    this.resetAt = data?.resetAt ?? null;
    this.tier = data?.tier ?? 'free';
    this.feature = data?.feature ?? '';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network unavailable') {
    super(message);
    this.name = 'NetworkError';
  }
}

let cached: StoredAccount | null = null;
let inflight: Promise<StoredAccount> | null = null;
const listeners = new Set<(a: StoredAccount | null) => void>();

export function onAccountChange(fn: (a: StoredAccount | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function saveAccount(account: StoredAccount | null) {
  cached = account;
  if (account) await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  else await AsyncStorage.removeItem(ACCOUNT_KEY);
  listeners.forEach((fn) => fn(account));
}

export async function getStoredAccount(): Promise<StoredAccount | null> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    cached = raw ? (JSON.parse(raw) as StoredAccount) : null;
  } catch {
    cached = null;
  }
  return cached;
}

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new NetworkError();
  }
}

/** Returns the install's anonymous account, creating it on first use. */
export async function ensureAccount(): Promise<StoredAccount> {
  const existing = await getStoredAccount();
  if (existing) return existing;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await rawFetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new ApiError(res.status, 'account_create_failed', 'Could not create account');
    const json = await res.json();
    const account: StoredAccount = { accountId: json.accountId, token: json.token, recoveryCode: json.recoveryCode, createdAt: Date.now() };
    await saveAccount(account);
    return account;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function replaceAccount(account: StoredAccount | null) {
  await saveAccount(account);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth (catalog, health). */
  anonymous?: boolean;
  /**
   * Don't replace an unknown token with a fresh account and retry. Required for
   * anything that must act on *this* account (deleting it): a silent retry
   * would act on a brand-new empty account instead and report success.
   */
  noRecover?: boolean;
}

async function parseError(res: Response): Promise<never> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 402 && data?.error === 'quota_exceeded') throw new QuotaError(data);
  throw new ApiError(res.status, data?.error, data?.message || `Request failed (${res.status})`, data);
}

export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let account: StoredAccount | null = null;
  if (!options.anonymous) {
    account = await ensureAccount();
    headers.Authorization = `Bearer ${account.token}`;
  }
  const init: RequestInit = {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };
  let res = await rawFetch(path, init);
  // The server no longer knows this token (e.g. its data was reset): start a
  // fresh anonymous account once. Purchases can be restored with the code.
  if (res.status === 401 && account && !options.noRecover) {
    await saveAccount(null);
    const fresh = await ensureAccount();
    headers.Authorization = `Bearer ${fresh.token}`;
    res = await rawFetch(path, init);
  }
  return res;
}

export async function apiJson<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

export { parseError };
