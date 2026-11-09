/**
 * Web build of native.ts. Tapping a Web Push notification focuses BeHappy and
 * the service worker asks the open window to show that screen; a closed app is
 * opened on it directly (public/sw.js). The installed app shows the unread
 * count on its icon where the system allows it (Badging API).
 */
import { onServiceWorkerMessage } from '@/lib/pwa/pwa';

export function setupNotificationHandling(_currentPath: () => string) {}

const safePath = (url: unknown) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/');

export function onNotificationOpened(open: (url: string) => void): () => void {
  return onServiceWorkerMessage('behappy:open', (data) => open(safePath(data.url)));
}

export function setAppBadge(n: number) {
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (n > 0) nav.setAppBadge?.(n).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  } catch {
    // not supported here
  }
}
