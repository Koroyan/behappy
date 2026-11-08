/**
 * Web build of push.ts: a browser tab uses browser notifications (web.ts)
 * instead of phone push. Same exports, so shared screens work everywhere.
 */
import { apiJson } from '@/lib/api/client';

export type PushAvailability = 'ok' | 'web' | 'expo-go-android' | 'not-configured';

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

export const pushAvailability = (): PushAvailability => 'web';

export async function loadPushState(): Promise<{ enabled: boolean; token?: string }> {
  return { enabled: false };
}

export async function enableThisPhone(_language: string): Promise<'ok' | 'denied' | 'unavailable' | 'error'> {
  return 'unavailable';
}

export async function refreshThisPhone(_language: string): Promise<void> {}

export async function disableThisPhone(): Promise<void> {}

export const getPushPrefs = async () => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs')).prefs;
export const setPushPrefs = async (prefs: Partial<PushPrefs>) => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs', { method: 'PUT', body: { prefs } })).prefs;
