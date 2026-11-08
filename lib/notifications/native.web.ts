/** Web build: phones only (see native.ts). The tab title shows the count instead. */
export function setupNotificationHandling(_currentPath: () => string) {}

export function onNotificationOpened(_open: (url: string) => void): () => void {
  return () => {};
}

export function setAppBadge(_n: number) {}
