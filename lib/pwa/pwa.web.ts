/**
 * The installed web app (PWA): service worker, updates, installation and
 * messages from the service worker. Web only (pwa.ts is the native no-op).
 *
 *  - registerServiceWorker(): once, after the app starts. The production build
 *    registers /sw.js (caching + notifications); the development server
 *    registers /sw.js?mode=dev (notifications only, no caching).
 *  - Updates: a new version installs in the background and waits; the app
 *    shows "Refresh" (UpdateBanner) and applyUpdate() switches and reloads.
 *    Checked when the app returns to the screen (at most every 30 minutes).
 *  - Installation: Android / desktop Chrome and Edge offer their own install
 *    dialog (beforeinstallprompt), kept here until the person taps "Install".
 *    iOS has no such dialog: the app shows how to add it from the Share menu.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DEV = process.env.NODE_ENV !== 'production';
const UPDATE_EVERY = 30 * 60 * 1000;
const DISMISS_KEY = '@behappy_install_dismissed_v1';
const VISITS_KEY = '@behappy_visits_v1';

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
let updateReady = false;
let registration: ServiceWorkerRegistration | null = null;
let registering: Promise<ServiceWorkerRegistration | null> | null = null;
let reloading = false;
let lastCheck = 0;

const hasWindow = typeof window !== 'undefined';

// Captured as early as possible: the browser fires it once, maybe before React mounts.
if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

/** Subscribe to changes (install prompt available, update ready). */
export function onPwaChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStandalone(): boolean {
  if (!hasWindow) return false;
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** iPhone, iPod or iPad (iPadOS says "Macintosh" but has touch). */
export function isIOS(): boolean {
  if (!hasWindow) return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

export function isAndroid(): boolean {
  return hasWindow && /Android/i.test(navigator.userAgent || '');
}

/** How this browser can install BeHappy right now. */
export function installMode(): InstallMode {
  if (!hasWindow) return 'unsupported';
  if (installedNow || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  // Chrome/Edge/Samsung Internet without a prompt yet (or after "not now"), Firefox on Android: browser menu.
  if (isAndroid() || /Chrome|Edg\//.test(navigator.userAgent || '')) return 'manual';
  return 'unsupported';
}

/** Shows the browser's own install dialog (Android / desktop Chrome, Edge). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  deferred = null;
  emit();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    if (choice.outcome === 'accepted') installedNow = true;
    emit();
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

// ---------- Not asking too often ----------

let visits: Promise<number> | null = null;

/** How many times BeHappy was opened in this browser, this one included (counted once per load). */
export function countVisit(): Promise<number> {
  if (!visits) {
    visits = (async () => {
      try {
        const n = Number((await AsyncStorage.getItem(VISITS_KEY)) || '0') + 1;
        await AsyncStorage.setItem(VISITS_KEY, String(n));
        return n;
      } catch {
        return 1;
      }
    })();
  }
  return visits;
}

/** "Not now": hidden for 30 days; after the second time, only Settings offers it. */
export async function dismissInstall(): Promise<void> {
  try {
    const prev = JSON.parse((await AsyncStorage.getItem(DISMISS_KEY)) || '{}') as { count?: number };
    await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify({ at: Date.now(), count: (prev.count || 0) + 1 }));
  } catch {
    // private mode: asked again next time, still at most once per visit
  }
}

export async function installSuggestionAllowed(): Promise<boolean> {
  try {
    const d = JSON.parse((await AsyncStorage.getItem(DISMISS_KEY)) || '{}') as { at?: number; count?: number };
    if ((d.count || 0) >= 2) return false;
    return !d.at || Date.now() - d.at > 30 * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

// ---------- Service worker ----------

export function serviceWorkerSupported(): boolean {
  return hasWindow && 'serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost');
}

function watch(reg: ServiceWorkerRegistration) {
  const waitingNow = () => {
    if (reg.waiting && navigator.serviceWorker.controller && !updateReady) {
      updateReady = true;
      emit();
    }
  };
  waitingNow();
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') waitingNow();
    });
  });
}

/** Registers the service worker once; resolves to the registration (null where unsupported). */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registering) return registering;
  if (!serviceWorkerSupported()) return Promise.resolve(null);
  registering = navigator.serviceWorker
    .register(DEV ? '/sw.js?mode=dev' : '/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((reg) => {
      registration = reg;
      watch(reg);
      lastCheck = Date.now();
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Only after the person asked for the new version (not on the very first install).
        if (reloading) window.location.reload();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - lastCheck > UPDATE_EVERY) {
          lastCheck = Date.now();
          reg.update().catch(() => {});
        }
      });
      return reg;
    })
    .catch(() => null);
  return registering;
}

/** The active registration, waiting up to `ms` for it (null if there is none). */
export async function readyRegistration(ms = 10000): Promise<ServiceWorkerRegistration | null> {
  if (!(await registerServiceWorker())) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export const updateAvailable = () => updateReady;

/** Switches to the waiting version and reloads (the person tapped "Refresh"). */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  reloading = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  // If the switch doesn't happen (an old worker ignoring the message), reload anyway.
  setTimeout(() => window.location.reload(), 4000);
}

/** Messages from the service worker ("open this screen", "subscribe again"). */
export function onServiceWorkerMessage(type: string, handler: (data: Record<string, unknown>) => void): () => void {
  if (!serviceWorkerSupported()) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.data && e.data.type === type) handler(e.data);
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
