/**
 * Phone notifications for chats and messages (Expo push).
 *
 * This phone is registered with the BeHappy server under the current
 * session; signing out ends that session and with it the pushes (the server
 * checks the session on every send). The server decides what is worth a push
 * (server/notify/push.mjs): only unread things, nothing while the chat is
 * open, one summary for a burst, quiet hours, no message text.
 *
 * Needs an EAS project id (app.config.js → extra.eas.projectId, from the
 * EAS_PROJECT_ID environment variable) and, on Android, a development or
 * store build: Expo Go on Android no longer receives remote notifications.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiJson } from '@/lib/api/client';

import { askNotificationPermission, notificationsAllowed } from './reminders';

const KEY = '@behappy_push_v1';

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

const projectId = (): string | null => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || null;
};

export function pushAvailability(): PushAvailability {
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo-go-android';
  if (!projectId()) return 'not-configured';
  return 'ok';
}

interface PushState {
  enabled: boolean;
  token?: string;
}

export async function loadPushState(): Promise<PushState> {
  try {
    return { enabled: false, ...JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') };
  } catch {
    return { enabled: false };
  }
}

const savePushState = (s: PushState) => AsyncStorage.setItem(KEY, JSON.stringify(s));

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

async function register(language: string): Promise<void> {
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() as string });
  await apiJson('/api/push/devices', { method: 'POST', body: { token, platform: Platform.OS, language, tz: timeZone() } });
  await savePushState({ enabled: true, token });
}

/** Turned on by the person: asks for permission, then registers this phone. */
export async function enableThisPhone(language: string): Promise<'ok' | 'denied' | 'unavailable' | 'error'> {
  if (pushAvailability() !== 'ok') return 'unavailable';
  if ((await askNotificationPermission()) !== 'granted') return 'denied';
  try {
    await register(language);
    return 'ok';
  } catch {
    return 'error';
  }
}

/** On start and after signing in: keeps the registration current (language, time zone, token). Never asks. */
export async function refreshThisPhone(language: string): Promise<void> {
  const s = await loadPushState();
  if (!s.enabled || pushAvailability() !== 'ok' || !(await notificationsAllowed())) return;
  await register(language).catch(() => {});
}

export async function disableThisPhone(): Promise<void> {
  const s = await loadPushState();
  if (s.token) await apiJson('/api/push/devices', { method: 'DELETE', body: { token: s.token } }).catch(() => {});
  await savePushState({ enabled: false });
}

export const getPushPrefs = async () => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs')).prefs;
export const setPushPrefs = async (prefs: Partial<PushPrefs>) => (await apiJson<{ prefs: PushPrefs }>('/api/push/prefs', { method: 'PUT', body: { prefs } })).prefs;
