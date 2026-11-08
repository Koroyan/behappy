/**
 * "Export my data" and "Delete all my data" (Profile › Privacy & data).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
// Static: a dynamic import() of a native module crashes Expo Go (see lib/media/images.ts).
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { resetAnalytics } from '@/lib/analytics';
import { deleteServerAccount, forgetAccountOnThisDevice } from '@/lib/api/account';
import { clearArtworks } from '@/lib/media/artworkStore';

// Never exported: credentials and caches that are not the user's content.
const EXCLUDE = new Set(['@behappy_account_v1', '@behappy_me_cache_v1']);

export async function collectAllData(): Promise<Record<string, unknown>> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => !EXCLUDE.has(k) && !k.startsWith('cached_prompt_instructions'));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, unknown> = {};
  for (const [k, v] of pairs) {
    if (v === null) continue;
    try {
      data[k] = JSON.parse(v);
    } catch {
      data[k] = v;
    }
  }
  return { exportedAt: new Date().toISOString(), app: 'BeHappy 2.0', data };
}

export async function exportAllData(): Promise<void> {
  const payload = JSON.stringify(await collectAllData(), null, 2);
  const name = `behappy-data-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const path = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(path, payload);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'application/json' });
}

/**
 * Deletes the server account first, then everything on this device. If the
 * server step fails it throws (AccountDeletionError) and nothing is deleted,
 * so the person can try again; otherwise the account would be orphaned with
 * no way left to delete it. `localOnly` is the explicit "delete on this device
 * only" choice offered when the server can't be reached from here.
 */
export async function deleteAllData({ localOnly = false }: { localOnly?: boolean } = {}): Promise<void> {
  if (localOnly) await forgetAccountOnThisDevice();
  else await deleteServerAccount();
  // Unsent usage events live in memory too; drop them before clearing storage.
  await resetAnalytics();
  await clearArtworks();
  await AsyncStorage.clear();
}
