/**
 * Automatic encrypted backup (renders nothing): when backup is on and
 * automatic, it runs quietly when the app goes to the background or comes
 * back, at most every few hours (sooner after a failure). Offline or locked:
 * it simply waits for the next time. Off by default.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoBackupDue, syncNow } from '@/lib/backup/engine';

export function BackupBridge() {
  useEffect(() => {
    let busy = false;
    const maybe = async () => {
      if (busy) return;
      busy = true;
      try {
        if (await autoBackupDue()) await syncNow().catch(() => {});
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(maybe, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'active') maybe();
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, []);
  return null;
}
