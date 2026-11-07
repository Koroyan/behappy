/**
 * Admin center API helpers. Every call goes to /api/admin (or /api/moderation)
 * where the server checks the permission again; the app only hides what a
 * person can't use. Calls never fall back to a fresh anonymous account: a
 * revoked staff session must show as signed out, not silently continue.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { ApiError, apiFetch, apiJson, parseError } from '@/lib/api/client';

export type Query = Record<string, string | number | boolean | null | undefined>;

export const qs = (q?: Query) => {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

const base = (path: string) => (path.startsWith('/api/') ? path : `/api/admin${path}`);

export const adminGet = <T = any>(path: string, query?: Query) => apiJson<T>(`${base(path)}${qs(query)}`, { noRecover: true });
export const adminPost = <T = any>(path: string, body: unknown = {}) => apiJson<T>(base(path), { method: 'POST', body, noRecover: true });
export const adminPut = <T = any>(path: string, body: unknown = {}) => apiJson<T>(base(path), { method: 'PUT', body, noRecover: true });

/** Downloads a CSV export (web). Returns false where downloads aren't possible. */
export async function adminDownload(path: string, fileName: string, query?: Query) {
  const res = await apiFetch(`${base(path)}${qs(query)}`, { noRecover: true });
  if (!res.ok) await parseError(res);
  const text = await res.text();
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export const errorCode = (e: unknown) => (e instanceof ApiError ? e.code || `http_${e.status}` : 'network');

/**
 * Loads one admin resource. While it reloads (filters, ranges), the previous
 * data stays on screen (no skeleton flash); `stale` marks that moment.
 */
export function useAdminData<T = any>(path: string | null, query?: Query) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);
  const key = path ? `${path}${qs(query)}` : '';
  const load = useCallback(async () => {
    if (!path) return;
    const n = ++seq.current;
    setLoading(true);
    try {
      const d = await adminGet<T>(path, query);
      if (n === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current) setError(e);
    } finally {
      if (n === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, loading, stale: loading && data !== null, reload: load, setData };
}
