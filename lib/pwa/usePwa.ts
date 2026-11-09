/**
 * The web app's state for screens, read the React way for values that live in
 * the browser: the pre-rendered page (and native) get the server value, the
 * browser its own, with no hydration mismatch and no effect juggling.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { installMode, InstallMode, isStandalone, onPwaChange, updateAvailable } from './pwa';

const never = () => () => {};

/** A downloaded new version is waiting for "Refresh". */
export const useUpdateAvailable = () => useSyncExternalStore(onPwaChange, updateAvailable, () => false);

/** How this browser can install BeHappy now ('installed' inside the installed app). */
export const useInstallMode = () => useSyncExternalStore(onPwaChange, installMode, (): InstallMode => 'unsupported');

/** BeHappy is open in a browser tab, not the installed app (always false on iOS/Android). */
export const useInBrowserTab = () => useSyncExternalStore(onPwaChange, () => Platform.OS === 'web' && !isStandalone(), () => false);

/** Any browser-only value that doesn't change while the page is open. */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(never, read, () => serverValue);
}
