/** `pwa` namespace: Deutsch (see ./en.ts). */
export const pwaDe: typeof import('./en').pwaEn = {
  update: {
    title: 'Eine neue Version von BeHappy ist bereit',
    refresh: 'Aktualisieren',
    later: 'Später',
  },
  install: {
    cardTitle: 'BeHappy installieren',
    cardBody: 'Öffne es vom Home-Bildschirm, im Vollbild wie eine App, mit Erinnerungen und Benachrichtigungen.',
    install: 'Installieren',
    how: 'Zeig mir, wie',
    notNow: 'Nicht jetzt',
    intro: 'BeHappy funktioniert direkt aus dem Browser wie eine App: auf dem Home-Bildschirm, im Vollbild, mit Benachrichtigungen. Ohne App Store, ohne Download.',
    installed: 'BeHappy ist auf diesem Gerät installiert. Öffne es vom Home-Bildschirm.',
    iosTitle: 'iPhone und iPad',
    iosSteps: ['Öffne BeHappy in Safari.', 'Tippe auf „Teilen“ (das Quadrat mit dem Pfeil).', 'Wähle „Zum Home-Bildschirm“.', 'Lass „Als Web-App öffnen“ eingeschaltet und tippe auf „Hinzufügen“.'],
    iosNote: 'iPhone und iPad haben keinen Installieren-Knopf für Web-Apps, deshalb geht es über diese Schritte. Benachrichtigungen funktionieren, wenn du BeHappy vom Home-Bildschirm öffnest (ab iOS 16.4).',
    androidTitle: 'Android',
    androidSteps: ['Öffne BeHappy in Chrome.', 'Tippe oben rechts auf das Menü (⋮).', 'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.'],
    desktopTitle: 'Computer',
    desktopSteps: ['Klicke in Chrome oder Edge auf das Installieren-Symbol am rechten Ende der Adressleiste.', 'Oder öffne das Browsermenü und wähle „BeHappy installieren“.'],
    settingsHint: 'Home-Bildschirm, Vollbild, Benachrichtigungen',
  },
  push: {
    needsInstall: 'Auf iPhone und iPad funktionieren Benachrichtigungen und Erinnerungen, wenn BeHappy zum Home-Bildschirm hinzugefügt ist.',
    howToInstall: 'So fügst du es hinzu',
    denied: 'Benachrichtigungen von BeHappy sind in diesem Browser blockiert. Erlaube sie in den Website-Einstellungen (neben der Adresse) und versuche es noch einmal.',
    unsupported: 'Dieser Browser kann keine Benachrichtigungen von Websites empfangen. Alles erscheint weiterhin in BeHappy.',
    webDevice: 'Benachrichtigungen auf diesem Gerät',
  },
  payment: {
    returnHint: 'Wenn sich diese Seite in einem eigenen Fenster geöffnet hat, schließe es („Fertig“), um zu BeHappy zurückzukehren. Die App erkennt die Zahlung von selbst.',
  },
  notify: {
    title: 'Erfahre, wenn dir jemand schreibt',
    body: 'Schalte Benachrichtigungen für Antworten, Nachrichten und Termine ein. Arten und Ruhezeiten änderst du in den Einstellungen.',
    enable: 'Einschalten',
    later: 'Nicht jetzt',
  },
  plan: {
    current: 'Dein Plan',
    daysLeft: 'Verbleibende Tage: {n}',
    extendNotice: 'Du hast Plus bereits bis {date}. Eine neue Zahlung fügt {days} Tage hinzu, dann gilt Plus bis {newDate}.',
    extend: 'Um {days} Tage verlängern',
    alreadyOwned: 'Das Kunsttherapie-Programm gehört dir schon. Es gibt nichts zu bezahlen.',
    paidJustNow: 'Deine vorherige Zahlung ist durchgegangen: Plus ist aktiv bis {date}.',
  },
};
