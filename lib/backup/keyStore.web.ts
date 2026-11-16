/**
 * Web: the backup's data key in local storage (browsers have no secure store;
 * the person's other data on this device is stored the same way). Never sent
 * anywhere, never in exports or analytics.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@behappy_backup_key_v1';

export interface StoredKey {
  accountId: string;
  keyId: string;
  /** The data key, hex. */
  dek: string;
}

export async function loadDataKey(): Promise<StoredKey | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredKey) : null;
  } catch {
    return null;
  }
}

export async function saveDataKey(k: StoredKey): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(k));
}

export async function forgetDataKey(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
