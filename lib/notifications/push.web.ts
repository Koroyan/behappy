/**
 * Web build of push.ts: chats and messages by Web Push (webPush.ts) in the
 * installed web app and in browsers that support it. Same exports, so shared
 * screens work everywhere. Where Web Push isn't available the settings fall
 * back to notifications while BeHappy is open in a background tab (web.ts).
 */
import { apiJson } from '@/lib/api/client';

import { appLanguage, disableWebPush, enableWebPush, loadWebPushState, refreshWebPush, webPushSupport } from './webPush';

/** 'web' = only tab notifications here; 'needs-install' = iPhone/iPad: add BeHappy to the Home Screen first. */
export type PushAvailability = 'ok' | 'web' | 'expo-go-android' | 'not-configured' | 'needs-install';

export interface PushPrefs {
  community: boolean;
  messages: boolean;
  appointments: boolean;
  account: boolean;
  previews: boolean;
  quiet: boolean;
  quietFrom: number;
  quietTo: number;
}

/** Call after mounting (it depends on the browser). */
export const pushAvailability = (): PushAvailability => {
  const s = webPushSupport();
  return s === 'ok' || s === 'denied' ? 'ok' : s === 'needs-install' ? 'needs-install' : 'web';
};

export async function loadPushState(): Promise<{ enabled: boolean; token?: string }> {
  const s = loadWebPushState();
  return { enabled: s.chats, token: s.endpoint };
}

export async function enableThisPhone(language: string): Promise<'ok' | 'denied' | 'unavailable' | 'error'> {
  const r = await enableWebPush('chats', language);
  return r === 'needs-install' ? 'unavailable' : r;
}

export async function refreshThisPhone(language: string): Promise<void> {
  await refreshWebPush(language).catch(() => false);
}

export async function disableThisPhone(): Promise<void> {
  await disableWebPush('chats', appLanguage());
}

export const getPushPrefs = async () => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs')).prefs;
export const setPushPrefs = async (prefs: Partial<PushPrefs>) => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs', { method: 'PUT', body: { prefs } })).prefs;
