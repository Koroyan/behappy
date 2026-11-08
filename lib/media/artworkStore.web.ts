/**
 * Saved artwork (web): image blobs in IndexedDB — localStorage's ~5 MB cap
 * is far too small for photos. Same API as artworkStore.ts (native).
 */
import { publish, uid } from '@/lib/storage/json';

export interface Artwork {
  id: string;
  sessionId: number;
  createdAt: number;
  uri: string;
  note?: string;
}

export const ARTWORK_TOPIC = 'artworks';
const DB = 'behappy';
const STORE = 'artworks';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

const urlCache = new Map<string, string>();

export async function saveArtwork(sessionId: number, dataUrl: string): Promise<Artwork> {
  const blob = await (await fetch(dataUrl)).blob();
  const id = uid('art');
  const createdAt = Date.now();
  await tx('readwrite', (s) => s.put({ id, sessionId, createdAt, blob }));
  publish(ARTWORK_TOPIC);
  const uri = URL.createObjectURL(blob);
  urlCache.set(id, uri);
  return { id, sessionId, createdAt, uri };
}

export async function listArtworks(): Promise<Artwork[]> {
  try {
    const rows = await tx<any[]>('readonly', (s) => s.getAll());
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => {
        let uri = urlCache.get(r.id);
        if (!uri) {
          uri = URL.createObjectURL(r.blob);
          urlCache.set(r.id, uri);
        }
        return { id: r.id, sessionId: r.sessionId, createdAt: r.createdAt, uri };
      });
  } catch {
    return [];
  }
}

/** The saved image as a data URL (to show the first drawing to the AI again). */
export async function artworkDataUrl(id: string): Promise<string | null> {
  try {
    const row = await tx<any>('readonly', (s) => s.get(id));
    if (!row?.blob) return null;
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(row.blob);
    });
  } catch {
    return null;
  }
}

export async function deleteArtwork(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  const uri = urlCache.get(id);
  if (uri) URL.revokeObjectURL(uri);
  urlCache.delete(id);
  publish(ARTWORK_TOPIC);
}

export async function clearArtworks(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear());
  } catch {
    // nothing stored
  }
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
}

/** Web export: download the image. */
export async function exportArtwork(item: Artwork): Promise<void> {
  const a = document.createElement('a');
  a.href = item.uri;
  a.download = `behappy-session-${item.sessionId}-${new Date(item.createdAt).toISOString().slice(0, 10)}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
