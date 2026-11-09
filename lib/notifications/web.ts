/**
 * Browser notifications while BeHappy is open in a background tab (desktop).
 * Only when the person turned them on and the browser allows them; the text
 * is the same discreet line as on phones, never what anyone wrote.
 */
import { Platform } from 'react-native';

const KEY = '@behappy_web_notify_v1';

export const webNotifySupported = () => Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;

/** Chats already come by Web Push to this browser (webPush.ts): no second, in-tab notification. */
const webPushChats = () => {
  try {
    return JSON.parse(window.localStorage.getItem('@behappy_webpush_v1') || '{}').chats === true;
  } catch {
    return false;
  }
};

export function webNotifyEnabled(): boolean {
  if (!webNotifySupported() || webPushChats()) return false;
  try {
    return window.localStorage.getItem(KEY) === '1' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export const webNotifyBlocked = () => webNotifySupported() && Notification.permission === 'denied';

export async function setWebNotify(on: boolean): Promise<boolean> {
  if (!webNotifySupported()) return false;
  if (on && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
    if (p !== 'granted') on = false;
  }
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // private mode: nothing to remember
  }
  return on;
}

/** Shows one notification if the tab is hidden; clicking focuses the tab and opens `url`. */
export function showWebNotification(title: string, body: string, onClick?: () => void) {
  if (!webNotifyEnabled() || typeof document === 'undefined' || document.visibilityState === 'visible') return;
  try {
    const n = new Notification(title, { body, tag: 'behappy', icon: '/favicon.ico' });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    // some browsers only allow notifications from a service worker
  }
}
