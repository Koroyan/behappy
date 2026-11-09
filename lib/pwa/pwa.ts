/**
 * Native build of pwa.web.ts: the iOS / Android apps are installed from the
 * stores and update through them, so everything here is a no-op. Same exports.
 */
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual' | 'unsupported';

export const onPwaChange = (_listener: () => void): (() => void) => () => {};
export const isStandalone = () => true;
export const isIOS = () => false;
export const isAndroid = () => false;
export const installMode = (): InstallMode => 'installed';
export const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => 'unavailable';
export const countVisit = async () => 0;
export const dismissInstall = async () => {};
export const installSuggestionAllowed = async () => false;
export const serviceWorkerSupported = () => false;
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => null;
export const readyRegistration = async (_ms?: number): Promise<ServiceWorkerRegistration | null> => null;
export const updateAvailable = () => false;
export const applyUpdate = () => {};
export const onServiceWorkerMessage = (_type: string, _handler: (data: Record<string, unknown>) => void): (() => void) => () => {};
