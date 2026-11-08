/**
 * Saved artwork (native): photos of paper drawings, kept in the app's
 * document directory so they survive cache cleanup. Index in AsyncStorage.
 * The web implementation lives in artworkStore.web.ts (IndexedDB).
 */
import * as FileSystem from 'expo-file-system/legacy';
// Static: a dynamic import() of a native module crashes Expo Go (see lib/media/images.ts).
import * as Sharing from 'expo-sharing';

import { publish, readJson, uid, writeJson } from '@/lib/storage/json';

export interface Artwork {
  id: string;
  sessionId: number;
  createdAt: number;
  /** file:// URI on native, object URL on web (resolved at read time). */
  uri: string;
  note?: string;
}

const INDEX_KEY = '@behappy_artworks_v1';
export const ARTWORK_TOPIC = 'artworks';
const DIR = `${FileSystem.documentDirectory}artworks/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

export async function saveArtwork(sessionId: number, dataUrl: string): Promise<Artwork> {
  await ensureDir();
  const id = uid('art');
  const path = `${DIR}${id}.jpg`;
  await FileSystem.writeAsStringAsync(path, dataUrl.replace(/^data:image\/\w+;base64,/, ''), { encoding: FileSystem.EncodingType.Base64 });
  const item: Artwork = { id, sessionId, createdAt: Date.now(), uri: path };
  const index = await readJson<Artwork[]>(INDEX_KEY, []);
  await writeJson(INDEX_KEY, [item, ...index]);
  publish(ARTWORK_TOPIC);
  return item;
}

export async function listArtworks(): Promise<Artwork[]> {
  const index = await readJson<Artwork[]>(INDEX_KEY, []);
  const present: Artwork[] = [];
  for (const a of index) {
    const info = await FileSystem.getInfoAsync(a.uri).catch(() => ({ exists: false }) as any);
    if (info.exists) present.push(a);
  }
  return present;
}

/** The saved image as a data URL (to show the first drawing to the AI again). */
export async function artworkDataUrl(idOrUri: string): Promise<string | null> {
  const item = (await readJson<Artwork[]>(INDEX_KEY, [])).find((a) => a.id === idOrUri || a.uri === idOrUri);
  if (!item) return null;
  try {
    return `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(item.uri, { encoding: FileSystem.EncodingType.Base64 })}`;
  } catch {
    return null;
  }
}

export async function deleteArtwork(id: string): Promise<void> {
  const index = await readJson<Artwork[]>(INDEX_KEY, []);
  const item = index.find((a) => a.id === id);
  if (item) await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => {});
  await writeJson(
    INDEX_KEY,
    index.filter((a) => a.id !== id)
  );
  publish(ARTWORK_TOPIC);
}

export async function clearArtworks(): Promise<void> {
  await FileSystem.deleteAsync(DIR, { idempotent: true }).catch(() => {});
  await writeJson(INDEX_KEY, []);
}

/** Native export: share sheet. */
export async function exportArtwork(item: Artwork): Promise<void> {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(item.uri, { mimeType: 'image/jpeg' });
}
