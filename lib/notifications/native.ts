/**
 * The phone side of notifications (iOS/Android). The web build uses
 * native.web.ts instead, so expo-notifications is never loaded in a browser.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { LogBox, Platform } from 'react-native';

// Expo Go prints this on every start. Its limits are handled (push.ts offers
// phone push only where it works), so it is kept out of the on-screen LogBox;
// Metro's console still shows it.
LogBox.ignoreLogs(['`expo-notifications` functionality is not fully supported in Expo Go']);

let started = false;

/**
 * Foreground behaviour: a push about the chat already on screen is not shown
 * again; reminders don't interrupt someone who is already in the app (they
 * still go to the notification list).
 */
export function setupNotificationHandling(currentPath: () => string) {
  if (started) return;
  started = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = (n.request.content.data || {}) as { url?: string; kind?: string };
      const here = typeof data.url === 'string' && data.url.split('?')[0] === currentPath();
      const show = !here && data.kind !== 'reminder';
      return { shouldShowBanner: show, shouldShowList: !here, shouldPlaySound: show, shouldSetBadge: true };
    },
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('messages', { name: 'Messages', importance: AndroidImportance.HIGH }).catch(() => {});
    Notifications.setNotificationChannelAsync('updates', { name: 'Updates', importance: AndroidImportance.DEFAULT }).catch(() => {});
    Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: AndroidImportance.DEFAULT }).catch(() => {});
  }
}

const handled = new Set<string>();

/** Calls `open(url)` when a notification is tapped, including the one that started the app. */
export function onNotificationOpened(open: (url: string) => void): () => void {
  const handle = (resp: Notifications.NotificationResponse | null) => {
    if (!resp) return;
    const id = resp.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    const url = (resp.notification.request.content.data as { url?: unknown })?.url;
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) open(url);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

/** The number on the app icon. */
export function setAppBadge(n: number) {
  Notifications.setBadgeCountAsync(Math.max(0, n)).catch(() => {});
}
