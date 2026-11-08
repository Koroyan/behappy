/**
 * Mounted once at the root (app/_layout.tsx). Renders nothing; it connects
 * notifications to the rest of the app:
 *
 *  - Tapping a notification opens the place it is about (also from a cold start).
 *  - In the foreground, a push about the chat that is already on screen is not
 *    shown again, and reminders don't interrupt someone already in the app.
 *  - Reminders are planned again when the app opens or returns, when something
 *    is recorded (journal, cards, art, check-ins) and when the language changes.
 *  - The phone's push registration follows sign-in, language and time zone.
 *  - Unread badges stay live: one connection for the whole app, counts asked
 *    again on new activity, on return to the app and every 90 seconds.
 *  - The app icon shows unread notifications and messages; a browser tab shows
 *    the count in its title and, if allowed, a discreet browser notification.
 */
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useT } from '@/i18n';
import { useAccount, useIdentity, useUnread } from '@/lib/api/account';
import { getSocket, onEvent, onStatus } from '@/lib/realtime/socket';
import { CARDS_TOPIC } from '@/features/cards/storage';
import { ART_TOPIC } from '@/lib/storage/activity';
import { CHECKIN_TOPIC } from '@/lib/storage/checkins';
import { JOURNAL_TOPIC } from '@/lib/storage/journal';
import { subscribe } from '@/lib/storage/json';

import { onNotificationOpened, setAppBadge, setupNotificationHandling } from './native';
import { refreshThisPhone } from './push';
import { remindersSupported, rescheduleReminders } from './reminders';
import { useReminderCopy } from './useReminderCopy';
import { showWebNotification } from './web';

const native = Platform.OS === 'ios' || Platform.OS === 'android';
let currentPath = '/';
setupNotificationHandling(() => currentPath);

export function NotificationsBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useT();
  const { refreshUnread, account } = useAccount();
  const identity = useIdentity();
  const unread = useUnread();
  const lastPlan = useRef(0);

  useEffect(() => {
    currentPath = pathname;
  }, [pathname]);

  // ---------- Opening a notification ----------
  useEffect(() => onNotificationOpened((url) => setTimeout(() => router.push(url as never), 0)), [router]);

  // ---------- Gentle reminders ----------
  const copy = useReminderCopy();

  const plan = useCallback(
    (force = false) => {
      if (!remindersSupported) return;
      const now = Date.now();
      if (!force && now - lastPlan.current < 60 * 1000) return;
      lastPlan.current = now;
      rescheduleReminders(copy).catch(() => {});
    },
    [copy]
  );

  useEffect(() => {
    if (!remindersSupported) return;
    plan(true);
    const later = () => setTimeout(() => plan(true), 500);
    const offs = [JOURNAL_TOPIC, CARDS_TOPIC, ART_TOPIC, CHECKIN_TOPIC].map((topic) => subscribe(topic, later));
    const app = AppState.addEventListener('change', (s) => s === 'active' && plan());
    return () => {
      offs.forEach((off) => off());
      app.remove();
    };
  }, [plan, language]);

  // ---------- This phone's push registration ----------
  useEffect(() => {
    if (!native || !identity.registered) return;
    refreshThisPhone(language).catch(() => {});
  }, [identity.registered, account?.accountId, language]);

  // ---------- Live unread badges ----------
  useEffect(() => {
    if (!identity.registered) return;
    getSocket().catch(() => {});
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refreshUnread();
      }, 700);
    };
    const offs = [
      onEvent('notification:new', () => {
        soon();
        showWebNotification('BeHappy', t('alerts.web.newActivity'), () => router.push('/notifications'));
      }),
      onEvent('thread:message', soon),
      onEvent('room:activity', soon),
      onEvent('unread:changed', soon),
      onStatus((s) => s === 'online' && soon()),
    ];
    const app = AppState.addEventListener('change', (s) => s === 'active' && soon());
    const every = setInterval(() => AppState.currentState === 'active' && refreshUnread(), 90 * 1000);
    return () => {
      offs.forEach((off) => off());
      app.remove();
      clearInterval(every);
      if (timer) clearTimeout(timer);
    };
  }, [identity.registered, account?.accountId, refreshUnread, router, t]);

  // ---------- App icon / tab title ----------
  useEffect(() => {
    if (native) {
      setAppBadge(identity.registered ? unread.badge : 0);
      return;
    }
    if (typeof document === 'undefined') return;
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '') || 'BeHappy';
    const n = identity.registered ? unread.badge + unread.communityMessages : 0;
    document.title = n ? `(${n > 99 ? '99+' : n}) ${base}` : base;
  }, [identity.registered, unread.badge, unread.communityMessages, pathname]);

  return null;
}
