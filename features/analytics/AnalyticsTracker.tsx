import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { setAnalyticsState, startAnalytics, trackScreen } from '@/lib/analytics';
import { useAccount } from '@/lib/api/account';

/**
 * Counts which part of the app is open (never content). Off when the person
 * said no; "pending" (kept on this device, nothing sent) until they answer.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { me } = useAccount();
  const identity = me?.identity as { analytics?: boolean; analyticsChoice?: 'on' | 'off' | null } | undefined;
  const on = identity?.analytics;
  const choice = identity?.analyticsChoice;
  useEffect(() => startAnalytics(), []);
  useEffect(() => {
    if (on === undefined) return;
    setAnalyticsState(on ? 'on' : choice === undefined || choice === 'off' ? 'off' : 'pending');
  }, [on, choice]);
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);
  return null;
}
