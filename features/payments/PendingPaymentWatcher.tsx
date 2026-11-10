/**
 * After a checkout, the app has to notice the payment even when the person
 * doesn't come back through the return page. That happens on iPhone: an
 * installed web app opens Flitt (another site) in a browser sheet, the return
 * lands in that sheet, and closing it shows the app exactly where it was.
 *
 * So, while an order started here is open (PENDING_ORDER_KEY), the app asks
 * the server about it whenever it comes back to the screen (and every few
 * seconds while it is on screen). Once the server has verified the payment
 * with Flitt, the result screen opens: it shows the outcome and refreshes
 * Plus. Declines don't move anyone (Flitt shows them, Purchases lists them);
 * an order that ends unpaid is simply forgotten. The app never decides by itself that
 * something was paid: it only shows what the server confirmed.
 * Mounted once at the root, on every platform.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { FINAL_ORDER_STATUSES, getOrder, PENDING_ORDER_KEY } from '@/lib/api/payments';

const EVERY_MS = 5000;
const MIN_GAP_MS = 1500;
// Timed checks only while a payment is plausibly happening; later, only on coming back to the app.
const ACTIVE_WINDOW_MS = 20 * 60 * 1000;

export function PendingPaymentWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  const last = useRef(0);
  const busy = useRef(false);
  const hasPending = useRef(true);
  const seen = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  const check = useCallback(async () => {
    // The result screen does its own checking. The checkout screen is included on purpose:
    // on iPhone the installed app stays on it, under Flitt's sheet, while the person pays.
    if (busy.current || path.current.startsWith('/checkout/result') || Date.now() - last.current < MIN_GAP_MS) return;
    busy.current = true;
    last.current = Date.now();
    try {
      const id = await AsyncStorage.getItem(PENDING_ORDER_KEY);
      hasPending.current = Boolean(id);
      if (!id) return;
      if (seen.current?.id !== id) seen.current = { id, at: Date.now() };
      const { order } = await getOrder(id);
      if (order.status === 'approved') {
        router.push(`/checkout/result?orderId=${encodeURIComponent(id)}` as never);
      } else if (FINAL_ORDER_STATUSES.includes(order.status)) {
        // Declined, expired or refunded: nothing to show here (Flitt showed a decline, and it is in
        // Purchases). A declined card alone is not final: Flitt keeps the order open for another
        // card, so the watch goes on and a successful second try is still noticed.
        await AsyncStorage.removeItem(PENDING_ORDER_KEY);
        hasPending.current = false;
      }
    } catch (e) {
      // Not this account's order (signed out, another account): nothing to wait for.
      if (e instanceof ApiError && e.status === 404) {
        await AsyncStorage.removeItem(PENDING_ORDER_KEY).catch(() => {});
        hasPending.current = false;
      }
      // Offline or the server busy: try again on the next occasion.
    } finally {
      busy.current = false;
    }
  }, [router]);

  useEffect(() => {
    check();
    const app = AppState.addEventListener('change', (s) => s === 'active' && check());
    const offs: (() => void)[] = [() => app.remove()];
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisible = () => document.visibilityState === 'visible' && check();
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);
      window.addEventListener('pageshow', onVisible);
      offs.push(() => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
        window.removeEventListener('pageshow', onVisible);
      });
    }
    // While an order is open and the app is on screen: a light check every few seconds.
    const timer = setInterval(() => {
      const visible = Platform.OS === 'web' ? typeof document !== 'undefined' && document.visibilityState === 'visible' : AppState.currentState === 'active';
      const recent = !seen.current || Date.now() - seen.current.at < ACTIVE_WINDOW_MS;
      if (hasPending.current && visible && recent) check();
    }, EVERY_MS);
    return () => {
      offs.forEach((off) => off());
      clearInterval(timer);
    };
  }, [check]);

  return null;
}
