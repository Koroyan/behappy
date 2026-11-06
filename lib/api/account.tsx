import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, apiJson, ensureAccount, getStoredAccount, NetworkError, onAccountChange, replaceAccount, StoredAccount } from './client';

export interface Entitlements {
  plus: { active: boolean; expiresAt: number | null };
  artProgram: { active: boolean; owned: boolean; grantedAt: number | null };
  cards: { active: boolean };
  tier: 'free' | 'plus';
}

export interface UsageSummary {
  tier: 'free' | 'plus';
  anulia: { used: number; limit: number; period: 'day' | 'month'; resetAt: number | null };
  journal: { used: number; limit: number; period: string };
  cards: { started: number; limit: number; period: string };
  art: { startedToday: number; newSessionsPerDay: number; freeSessionIds: number[] };
}

export interface Me {
  accountId: string;
  createdAt: number;
  entitlements: Entitlements;
  usage: UsageSummary;
  payments: { provider: 'flitt'; mode: 'test' };
  ai: { available: boolean };
}

export const FREE_ENTITLEMENTS: Entitlements = {
  plus: { active: false, expiresAt: null },
  artProgram: { active: false, owned: false, grantedAt: null },
  cards: { active: false },
  tier: 'free',
};

// Last server-confirmed entitlements, cached only to render instantly while
// offline. It never grants anything by itself: every paid AI call is checked
// again on the server.
const CACHE_KEY = '@behappy_me_cache_v1';

interface AccountContextValue {
  me: Me | null;
  entitlements: Entitlements;
  loading: boolean;
  offline: boolean;
  refresh: () => Promise<Me | null>;
  account: StoredAccount | null;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [account, setAccount] = useState<StoredAccount | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureAccount();
      const data = await apiJson<Me>('/api/account/me');
      setMe(data);
      setOffline(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      return data;
    } catch {
      setOffline(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) setMe(JSON.parse(raw));
      } catch {
        // ignore
      }
      setAccount(await getStoredAccount());
      refresh();
    })();
    return onAccountChange((a) => {
      setAccount(a);
      refresh();
    });
  }, [refresh]);

  const value = useMemo<AccountContextValue>(
    () => ({ me, entitlements: me?.entitlements ?? FREE_ENTITLEMENTS, loading, offline, refresh, account }),
    [me, loading, offline, refresh, account]
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}

export async function restoreWithCode(recoveryCode: string): Promise<boolean> {
  const res = await apiJson<{ accountId: string; token: string }>('/api/account/restore', {
    method: 'POST',
    body: { recoveryCode },
    anonymous: true,
  }).catch(() => null);
  if (!res) return false;
  await replaceAccount({ accountId: res.accountId, token: res.token, recoveryCode: recoveryCode.toUpperCase(), createdAt: Date.now() });
  return true;
}

/**
 * Why the server account could not be deleted. Nothing is deleted in that
 * case, so the person can retry; deleting only the data on this device is a
 * separate, explicit choice (see deleteAllData).
 */
export class AccountDeletionError extends Error {
  reason: 'offline' | 'not_signed_in' | 'server';
  constructor(reason: 'offline' | 'not_signed_in' | 'server') {
    super(`Account deletion failed: ${reason}`);
    this.name = 'AccountDeletionError';
    this.reason = reason;
  }
}

/** Deletes this device's account on the server. Throws AccountDeletionError instead of failing silently. */
export async function deleteServerAccount(): Promise<void> {
  const stored = await getStoredAccount();
  if (stored) {
    let res: Response;
    try {
      res = await apiFetch('/api/account', { method: 'DELETE', noRecover: true });
    } catch (e) {
      throw new AccountDeletionError(e instanceof NetworkError ? 'offline' : 'server');
    }
    // The server doesn't know this device's sign-in (for example the account
    // was restored on another device, which replaces the old token).
    if (res.status === 401) throw new AccountDeletionError('not_signed_in');
    if (!res.ok) throw new AccountDeletionError('server');
  }
  await forgetAccountOnThisDevice();
}

/** Removes the stored sign-in and cached entitlements from this device only. */
export async function forgetAccountOnThisDevice(): Promise<void> {
  await replaceAccount(null);
  await AsyncStorage.removeItem(CACHE_KEY);
}
