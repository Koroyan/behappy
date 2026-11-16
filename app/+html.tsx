/**
 * The HTML page around the web app (Expo Router static rendering; web only).
 *
 * Installable web app (PWA): the manifest, the icons, iOS's home-screen tags
 * and the theme colours. `viewport-fit=cover` lets the app draw under the
 * iPhone notch / Dynamic Island and home indicator; every screen already pads
 * itself with the safe-area insets (react-native-safe-area-context reads
 * env(safe-area-inset-*) on the web). Zoom stays allowed (accessibility).
 * The service worker is registered by features/pwa/PwaBridge after the app starts.
 *
 * headNodes / bodyNodes carry what Expo adds to every page (styles, the app's
 * scripts, the hydration flag): without them the page would never start.
 */
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const LIGHT_BG = '#F7F8F5';
const DARK_BG = '#111E1C';

// Before the app paints: the theme's background (no white flash in dark mode),
// no pull-to-refresh / rubber-band on the page itself (screens scroll inside).
const pageStyle = `
html, body { background-color: ${LIGHT_BG}; overscroll-behavior: none; }
@media (prefers-color-scheme: dark) { html, body { background-color: ${DARK_BG}; } }
`;

// Errors thrown by browser extensions (wallets, password managers…) injected
// into the page are not BeHappy's: without this, the development error overlay
// covered the whole app with them (e.g. a wallet that needs SubtleCrypto on a
// plain-http LAN address). Runs before the app, so it is the first listener;
// the app's own errors pass through unchanged.
const extensionErrorGuard = `
(function () {
  var fromExtension = function (s) { return String(s || '').indexOf('-extension:') !== -1; };
  window.addEventListener('error', function (e) {
    if (fromExtension(e.filename) || fromExtension(e.error && e.error.stack)) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    if (fromExtension(r && (r.stack || r.fileName))) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
})();
`;

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="BeHappy: reflection, creativity and calm. A private journal, art therapy, breathing, sounds and Bea, a gentle AI companion." />

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content={LIGHT_BG} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={DARK_BG} media="(prefers-color-scheme: dark)" />
        <meta name="application-name" content="BeHappy" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS / iPadOS home screen web app */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BeHappy" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: pageStyle }} />
        <script dangerouslySetInnerHTML={{ __html: extensionErrorGuard }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
