import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { setAnalyticsEnabled, startAnalytics, trackScreen } from '@/lib/analytics';
import { useAccount } from '@/lib/api/account';

/** Counts which part of the app is open (never content); off when the person opted out. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { me } = useAccount();
  const on = (me?.identity as { analytics?: boolean } | undefined)?.analytics;
  useEffect(() => startAnalytics(), []);
  useEffect(() => {
    if (on !== undefined) setAnalyticsEnabled(on);
  }, [on]);
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);
  return null;
}
