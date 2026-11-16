/**
 * Where this device keeps the backup's data key: the iOS keychain / Android
 * keystore (expo-secure-store). Browsers have no secure store, so the web app
 * keeps it in local storage, like the rest of the person's data there (see
 * keyStore.web.ts). Never sent anywhere, never in exports or analytics.
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'behappy_backup_key_v1';

export interface StoredKey {
  accountId: string;
  keyId: string;
  /** The data key, hex. */
  dek: string;
}

export async function loadDataKey(): Promise<StoredKey | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as StoredKey) : null;
  } catch {
    return null;
  }
}

export async function saveDataKey(k: StoredKey): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(k));
}

export async function forgetDataKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
