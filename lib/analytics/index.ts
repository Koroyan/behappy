/**
 * First-party usage statistics (no third-party trackers).
 *
 * Records only: app sessions, which part of the app is open and for how long
 * (counted while the app is visible and in use), and a fixed list of actions
 * such as "journal entry saved". Never what anyone writes, says or answers:
 * the server accepts only allowlisted event names with enum or number fields.
 * Staff screens are not counted. Events wait in a small on-device queue when
 * offline. People can switch this off in Profile › Privacy; the server also
 * refuses events from accounts that opted out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { apiFetch, getStoredAccount } from '@/lib/api/client';

export type Feature =
  | 'today' | 'journal' | 'anulia' | 'art' | 'cards' | 'breathing' | 'meditation' | 'grounding' | 'assessments' | 'insights' | 'goals' | 'explore'
  | 'safety' | 'community' | 'specialists' | 'appointments' | 'messages' | 'pro' | 'membership' | 'notifications' | 'profile' | 'account' | 'onboarding' | 'quiz' | 'about' | 'other';

interface QueuedEvent {
  id: string;
  name: 'session_start' | 'screen_view' | 'engagement' | 'action' | 'error';
  feature?: Feature | null;
  props?: Record<string, string | number>;
  at: number;
  session: string;
}

const QUEUE_KEY = '@behappy_analytics_queue_v1';
const MAX_QUEUE = 300;
const SESSION_GAP_MS = 30 * 60 * 1000;
const IDLE_AFTER_MS = 2 * 60 * 1000;
const FLUSH_EVERY_MS = 60 * 1000;

const ROUTES: [string, Feature][] = [
  ['/journal', 'journal'],
  ['/anulia', 'anulia'],
  ['/art', 'art'],
  ['/cards', 'cards'],
  ['/breathing', 'breathing'],
  ['/meditation', 'meditation'],
  ['/grounding', 'grounding'],
  ['/assessments', 'assessments'],
  ['/insights', 'insights'],
  ['/goals', 'goals'],
  ['/explore', 'explore'],
  ['/safety', 'safety'],
  ['/community', 'community'],
  ['/specialists', 'specialists'],
  ['/appointments', 'appointments'],
  ['/messages', 'messages'],
  ['/pro', 'pro'],
  ['/pricing', 'membership'],
  ['/purchases', 'membership'],
  ['/checkout', 'membership'],
  ['/notifications', 'notifications'],
  ['/profile', 'profile'],
  ['/account', 'account'],
  ['/onboarding', 'onboarding'],
  ['/quiz', 'quiz'],
  ['/about', 'about'],
];

/** The part of the app a route belongs to; null for staff screens (never counted). */
export function featureForPath(path: string): Feature | null {
  const p = path || '/';
  if (p.startsWith('/admin') || p.startsWith('/moderation')) return null;
  if (p === '/' || p === '/index') return 'today';
  for (const [prefix, f] of ROUTES) if (p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(`${prefix}-`)) return f;
  return 'other';
}

const rand = () => Math.random().toString(36).slice(2, 10);
const newId = () => `${Date.now().toString(36)}${rand()}`;

let enabled = true;
let loaded = false;
let queue: QueuedEvent[] = [];
let sessionId = '';
let lastActivity = 0;
let firstSession = true;
let current: { feature: Feature | null; since: number | null } = { feature: null, since: null };
let visible = true;
let lastInput = Date.now();
let flushing = false;
let started = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const saved = raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
    if (Array.isArray(saved)) queue = [...saved, ...queue].slice(-MAX_QUEUE);
  } catch {
    // a damaged queue is simply dropped
  }
}

function persist() {
  AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))).catch(() => {});
}

function push(e: Omit<QueuedEvent, 'id' | 'session' | 'at'> & { at?: number }) {
  if (!enabled) return;
  const at = e.at ?? Date.now();
  ensureSession(at);
  queue.push({ ...e, id: newId(), session: sessionId, at });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
}

function ensureSession(now: number) {
  if (!sessionId || now - lastActivity > SESSION_GAP_MS) {
    sessionId = `s${newId()}`;
    lastActivity = now;
    const kind = firstSession ? 'cold' : 'resume';
    firstSession = false;
    queue.push({ id: newId(), name: 'session_start', props: { kind }, at: now, session: sessionId });
  }
  lastActivity = now;
}

const idle = (now: number) => Platform.OS === 'web' && now - lastInput > IDLE_AFTER_MS;

/** Turns the time spent on the current part of the app into engagement events. */
function accrue(now = Date.now()) {
  if (!current.feature || current.since === null) return;
  if (!visible) {
    current.since = null;
    return;
  }
  // Time after the last input on the web counts only up to the idle limit.
  const end = idle(now) ? Math.max(current.since, lastInput + IDLE_AFTER_MS) : now;
  let seconds = Math.floor((end - current.since) / 1000);
  current.since = idle(now) ? null : now;
  while (seconds >= 1) {
    const chunk = Math.min(seconds, 300);
    push({ name: 'engagement', feature: current.feature, props: { seconds: chunk }, at: end });
    seconds -= chunk;
  }
}

export async function flushAnalytics() {
  if (flushing || !enabled) return;
  flushing = true;
  try {
    await load();
    // Never create an account just to send statistics.
    if (!queue.length || !(await getStoredAccount())) return;
    while (queue.length && enabled) {
      const batch = queue.slice(0, 50);
      const res = await apiFetch('/api/events', {
        method: 'POST',
        body: { events: batch, platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web', appVersion: Constants.expoConfig?.version ?? '' },
        noRecover: true,
      });
      if (res.status === 429 || res.status >= 500) return;
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { disabled?: string } | null;
        if (data?.disabled) {
          queue = [];
          persist();
          if (data.disabled === 'opted_out') enabled = false;
          return;
        }
      }
      // Accepted, or refused as invalid: either way these won't be sent again.
      queue = queue.slice(batch.length);
      persist();
    }
  } catch {
    // offline: the queue waits for the next try
  } finally {
    flushing = false;
  }
}

/** Call on every route change. */
export function trackScreen(path: string) {
  const now = Date.now();
  const feature = featureForPath(path);
  accrue(now);
  current = { feature, since: feature && visible ? now : null };
  if (feature) push({ name: 'screen_view', feature, at: now });
}

/** A meaningful action from the fixed list (see server/analytics/index.mjs ACTIONS). */
export function trackAction(feature: Feature, kind: string) {
  push({ name: 'action', feature, props: { kind } });
}

/** Server-confirmed choice (Profile › Privacy). Off clears the local queue. */
export function setAnalyticsEnabled(on: boolean) {
  if (enabled === on) return;
  enabled = on;
  if (!on) {
    accrue();
    queue = [];
    persist();
  }
}

/**
 * "Delete everything": forget unsent events and the current session, so
 * nothing from before the deletion is stored again or sent under the new
 * anonymous account.
 */
export async function resetAnalytics() {
  queue = [];
  loaded = true;
  sessionId = '';
  lastActivity = 0;
  firstSession = true;
  current = { feature: null, since: null };
  await AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
}

/** Starts timers and visibility listeners once (root layout). */
export function startAnalytics() {
  if (started) return () => {};
  started = true;
  load();
  const markInput = () => {
    const now = Date.now();
    if (idle(now) && visible && current.feature) current.since = now;
    lastInput = now;
  };
  const setVisible = (v: boolean) => {
    const now = Date.now();
    if (v === visible) return;
    if (!v) {
      accrue(now);
      visible = false;
      flushAnalytics();
    } else {
      visible = true;
      lastInput = now;
      if (current.feature) current.since = now;
      ensureSession(now);
    }
  };
  const timer = setInterval(() => {
    accrue();
    flushAnalytics();
  }, FLUSH_EVERY_MS);
  const appState = AppState.addEventListener('change', (s) => setVisible(s === 'active'));
  let removeWeb = () => {};
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    document.addEventListener('visibilitychange', onVis);
    for (const e of events) window.addEventListener(e, markInput, { passive: true, capture: true });
    const onHide = () => {
      accrue();
      persist();
    };
    window.addEventListener('pagehide', onHide);
    removeWeb = () => {
      document.removeEventListener('visibilitychange', onVis);
      for (const e of events) window.removeEventListener(e, markInput, { capture: true } as any);
      window.removeEventListener('pagehide', onHide);
    };
  }
  return () => {
    clearInterval(timer);
    appState.remove();
    removeWeb();
    started = false;
  };
}

/** For Profile › Privacy: switches statistics on or off on the server. */
export async function saveAnalyticsChoice(on: boolean) {
  const res = await apiFetch('/api/account/privacy', { method: 'PUT', body: { analytics: on } });
  if (!res.ok) throw new Error(`privacy ${res.status}`);
  setAnalyticsEnabled(on);
  return on;
}
