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
  /** "password" after signing in with email + password; otherwise a device session. */
  kind?: 'device' | 'password';
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

/**
 * Where the sign-in token lives. On iOS/Android it goes to the system
 * keychain/keystore (expo-secure-store); browsers have no secure store, so web
 * keeps it in local storage. 2.0 kept it in AsyncStorage on every platform: a
 * token found there is moved to the secure store on first read.
 */
const SECURE_KEY = 'behappy_account_v1';
const secureStore = Platform.OS === 'web' ? null : (require('expo-secure-store') as typeof import('expo-secure-store'));

async function readRaw(): Promise<string | null> {
  if (!secureStore) return AsyncStorage.getItem(ACCOUNT_KEY);
  const secure = await secureStore.getItemAsync(SECURE_KEY);
  if (secure) return secure;
  const legacy = await AsyncStorage.getItem(ACCOUNT_KEY);
  if (legacy) {
    await secureStore.setItemAsync(SECURE_KEY, legacy);
    await AsyncStorage.removeItem(ACCOUNT_KEY);
  }
  return legacy;
}

async function writeRaw(value: string | null) {
  if (!secureStore) {
    if (value) await AsyncStorage.setItem(ACCOUNT_KEY, value);
    else await AsyncStorage.removeItem(ACCOUNT_KEY);
    return;
  }
  if (value) await secureStore.setItemAsync(SECURE_KEY, value);
  else await secureStore.deleteItemAsync(SECURE_KEY);
  await AsyncStorage.removeItem(ACCOUNT_KEY);
}

async function saveAccount(account: StoredAccount | null) {
  cached = account;
  await writeRaw(account ? JSON.stringify(account) : null);
  listeners.forEach((fn) => fn(account));
}

export async function getStoredAccount(): Promise<StoredAccount | null> {
  if (cached) return cached;
  try {
    const raw = await readRaw();
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
  // The server no longer knows this token (e.g. its data was reset, or the
  // password was reset on another device): start a fresh anonymous account
  // once. A signed-out password session is remembered so the app can say so.
  if (res.status === 401 && account && !options.noRecover) {
    if (account.kind === 'password') signOutNotice = 'session_ended';
    await saveAccount(null);
    const fresh = await ensureAccount();
    headers.Authorization = `Bearer ${fresh.token}`;
    res = await rawFetch(path, init);
  }
  return res;
}

let signOutNotice: 'session_ended' | null = null;
/** Returns (once) why the app was signed out of a password session, if it was. */
export function consumeSignOutNotice() {
  const n = signOutNotice;
  signOutNotice = null;
  return n;
}

export async function apiJson<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

export { parseError };
