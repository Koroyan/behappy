import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Local calendar day key (YYYY-MM-DD) — the user's day, not UTC's. */
export function dayKey(value: number | string | Date = Date.now()): string {
  const d = value instanceof Date ? value : new Date(value);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/** Tiny pub/sub so screens refresh when another screen changes shared data. */
export function subscribe(topic: string, fn: Listener) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic)!.add(fn);
  return () => {
    listeners.get(topic)?.delete(fn);
  };
}

export function publish(topic: string) {
  listeners.get(topic)?.forEach((fn) => fn());
}
