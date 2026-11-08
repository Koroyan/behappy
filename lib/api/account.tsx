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
  art: { startedToday: number; newSessionsPerDay: number; freeSessionIds: number[]; startedIds?: number[]; resetAt?: number | null };
}

export interface Identity {
  registered: boolean;
  email: string | null;
  emailVerified: boolean;
  roles: StaffRole[];
  /** What the staff tools allow for these roles (the server checks every request again). */
  staffPermissions?: string[];
  sessionKind: 'device' | 'password';
  status: 'active' | 'suspended';
  emailAvailable: boolean;
  /** Development servers only: the fixed test code (never set in production). */
  testCode?: string | null;
}

export interface Me {
  accountId: string;
  createdAt: number;
  entitlements: Entitlements;
  usage: UsageSummary;
  payments: { provider: 'flitt'; mode: 'test' };
  ai: { available: boolean };
  identity?: Identity;
  notifications?: { unread: number };
  /** Sections contributed by 3.0 feature modules (community, professional). */
  [section: string]: unknown;
}

export const ANONYMOUS_IDENTITY: Identity = { registered: false, email: null, emailVerified: false, roles: [], sessionKind: 'device', status: 'active', emailAvailable: true };

/** Who is signed in on this device (server-confirmed; anonymous until the first answer). */
export function useIdentity(): Identity {
  const { me } = useAccount();
  return (me?.identity as Identity | undefined) ?? ANONYMOUS_IDENTITY;
}

export type StaffRole = 'owner' | 'admin' | 'verifier' | 'moderator' | 'finance' | 'support' | 'analyst';
export const STAFF_ROLES: StaffRole[] = ['owner', 'admin', 'verifier', 'moderator', 'finance', 'support', 'analyst'];

/** Has any staff role (the staff screens then ask for a password sign-in if needed). */
export const hasStaffRole = (id: Identity) => id.roles.some((r) => STAFF_ROLES.includes(r));

/** The staff role grants this permission (whatever the session kind). */
export const staffMay = (id: Identity, permission: string) => (id.staffPermissions || []).includes(permission);

/** Staff tools need the permission and a password session (enforced on the server too). */
export const canStaff = (id: Identity, permission: string) => staffMay(id, permission) && id.sessionKind === 'password' && id.registered;

/** Older check by role; the owner counts as every role. */
export const isStaffIdentity = (id: Identity, role: 'moderator' | 'admin') => (id.roles.includes(role) || id.roles.includes('owner')) && id.sessionKind === 'password' && id.registered;

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

/** GET /api/unread: just the badge numbers, cheap enough to ask often. */
export interface UnreadCounts {
  notifications: number;
  community: { rooms: number; messages: number; byRoom: Record<string, number> };
  messages: number;
}

interface AccountContextValue {
  me: Me | null;
  entitlements: Entitlements;
  loading: boolean;
  offline: boolean;
  refresh: () => Promise<Me | null>;
  /** Updates only the unread badges (notifications, community, private messages). */
  refreshUnread: () => Promise<void>;
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

  const refreshUnread = useCallback(async () => {
    try {
      const u = await apiJson<UnreadCounts>('/api/unread');
      setMe((m) =>
        m
          ? {
              ...m,
              notifications: { unread: u.notifications },
              community: m.community ? { ...(m.community as object), unreadRooms: u.community.rooms, unreadMessages: u.community.messages, unreadByRoom: u.community.byRoom } : m.community,
              client: m.client ? { ...(m.client as object), unreadMessages: u.messages } : m.client,
            }
          : m
      );
    } catch {
      // offline: the badges keep their last value
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
    () => ({ me, entitlements: me?.entitlements ?? FREE_ENTITLEMENTS, loading, offline, refresh, refreshUnread, account }),
    [me, loading, offline, refresh, refreshUnread, account]
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}

/** Unread numbers for badges, from the last server answer. */
export function useUnread() {
  const { me } = useAccount();
  const community = me?.community as { unreadRooms?: number; unreadMessages?: number; unreadByRoom?: Record<string, number> } | null | undefined;
  const client = me?.client as { unreadMessages?: number } | null | undefined;
  const notifications = me?.notifications?.unread || 0;
  const messages = client?.unreadMessages || 0;
  // Older servers sent only the number of rooms; fall back to it.
  const communityMessages = community?.unreadMessages ?? community?.unreadRooms ?? 0;
  return {
    notifications,
    messages,
    communityMessages,
    communityRooms: community?.unreadRooms || 0,
    byRoom: community?.unreadByRoom || {},
    /** The app icon number: notifications and private messages (as on the server). */
    badge: notifications + messages,
  };
}

/** "99+" for big numbers. */
export const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

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
