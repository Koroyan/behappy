/**
 * Web Push in the browser / installed web app (imported only by the *.web.ts
 * notification modules).
 *
 * One push subscription per browser, used for two things the person turns on
 * separately: chats (community replies, messages, appointments) and gentle
 * reminders. The subscription is registered with the BeHappy server under the
 * current session (signing out ends it); the server knows which of the two it
 * is for. Permission is asked only when the person turns one of them on.
 *
 * iPhone and iPad: Web Push works only in BeHappy added to the Home Screen
 * (iOS 16.4 or later), not in a Safari tab ("needs-install").
 */
import { apiJson } from '@/lib/api/client';
import { isIOS, isStandalone, readyRegistration } from '@/lib/pwa/pwa';

const KEY = '@behappy_webpush_v1';

export type WebPushSupport = 'ok' | 'needs-install' | 'denied' | 'unsupported';
export type WebPushResult = 'ok' | 'denied' | 'unavailable' | 'needs-install' | 'error';

interface WebPushState {
  endpoint?: string;
  chats: boolean;
  reminders: boolean;
}

export function webPushSupport(): WebPushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!capable) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

export function loadWebPushState(): WebPushState {
  try {
    return { chats: false, reminders: false, ...JSON.parse(window.localStorage.getItem(KEY) || '{}') };
  } catch {
    return { chats: false, reminders: false };
  }
}

function saveState(s: WebPushState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private mode: the switches show off next time
  }
}

/** The app's language (what the person chose), for the server's notification wording. */
export function appLanguage(): string {
  try {
    return window.localStorage.getItem('@behappy_language') || (navigator.language || 'en').slice(0, 2);
  } catch {
    return 'en';
  }
}

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

const b64urlToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

class Denied extends Error {}

/** This browser's subscription for BeHappy's current server key (asks for permission only if `ask`). */
async function subscription(ask: boolean): Promise<PushSubscription | null> {
  if (webPushSupport() === 'needs-install' || webPushSupport() === 'unsupported') return null;
  if (Notification.permission !== 'granted') {
    if (!ask) return null;
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Denied();
  }
  const reg = await readyRegistration();
  if (!reg) return null;
  const { publicKey } = await apiJson<{ publicKey: string }>('/api/push/web-key');
  const key = b64urlToBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // The server's key changed (a new deployment with new keys): the old subscription is useless.
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
    await sub.unsubscribe().catch(() => false);
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  return sub;
}

async function register(sub: PushSubscription, state: WebPushState, language: string) {
  const json = sub.toJSON();
  await apiJson('/api/push/devices', {
    method: 'POST',
    body: { token: sub.endpoint, platform: 'web', keys: json.keys, chats: state.chats, language, tz: timeZone() },
  });
  saveState({ ...state, endpoint: sub.endpoint });
}

/** Turned on by the person (a tap): asks for permission if needed, subscribes, registers. */
export async function enableWebPush(kind: 'chats' | 'reminders', language: string): Promise<WebPushResult> {
  const support = webPushSupport();
  if (support === 'needs-install') return 'needs-install';
  if (support === 'unsupported') return 'unavailable';
  if (support === 'denied') return 'denied';
  try {
    const sub = await subscription(true);
    if (!sub) return 'unavailable';
    await register(sub, { ...loadWebPushState(), [kind]: true }, language);
    return 'ok';
  } catch (e) {
    return e instanceof Denied ? 'denied' : 'error';
  }
}

/** Turned off: the server stops; with neither chats nor reminders left, the subscription goes. */
export async function disableWebPush(kind: 'chats' | 'reminders', language: string): Promise<void> {
  const state = { ...loadWebPushState(), [kind]: false };
  saveState(state);
  if (kind === 'reminders' && state.endpoint) await apiJson('/api/push/reminders', { method: 'PUT', body: { token: state.endpoint, reminders: [] } }).catch(() => {});
  if (state.chats || state.reminders) {
    const sub = await subscription(false).catch(() => null);
    if (sub) await register(sub, state, language).catch(() => {});
    return;
  }
  if (state.endpoint) await apiJson('/api/push/devices', { method: 'DELETE', body: { token: state.endpoint } }).catch(() => {});
  const reg = await readyRegistration(3000);
  const sub = await reg?.pushManager.getSubscription().catch(() => null);
  await sub?.unsubscribe().catch(() => false);
  saveState({ chats: false, reminders: false });
}

/**
 * On start, after signing in, on a language or time-zone change: keeps the
 * registration current (and follows a subscription the browser replaced). Never asks.
 */
export async function refreshWebPush(language: string): Promise<boolean> {
  const state = loadWebPushState();
  if (!state.chats && !state.reminders) return false;
  if (webPushSupport() !== 'ok' || Notification.permission !== 'granted') return false;
  const sub = await subscription(false).catch(() => null);
  if (!sub) return false;
  await register(sub, state, language);
  return true;
}

export interface WebReminder {
  id: string;
  kind: string;
  at: number;
  title: string;
  body: string;
  url: string;
}

/** Sends this browser's reminder plan; the server sends each at its time. */
export async function uploadReminders(list: WebReminder[], language: string): Promise<boolean> {
  let state = loadWebPushState();
  if (!state.reminders) return false;
  if (!state.endpoint && !(await refreshWebPush(language))) return false;
  state = loadWebPushState();
  const send = () => apiJson('/api/push/reminders', { method: 'PUT', body: { token: state.endpoint, reminders: list } });
  try {
    await send();
  } catch {
    // The server forgot this browser (signed in elsewhere, subscription renewed): register again once.
    if (!(await refreshWebPush(language).catch(() => false))) return false;
    state = loadWebPushState();
    await send();
  }
  return true;
}
