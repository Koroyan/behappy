/** `pwa` namespace: Polski (see ./en.ts). */
export const pwaPl: typeof import('./en').pwaEn = {
  update: {
    title: 'Nowa wersja BeHappy jest gotowa',
    refresh: 'Odśwież',
    later: 'Później',
  },
  install: {
    cardTitle: 'Zainstaluj BeHappy',
    cardBody: 'Otwieraj z ekranu początkowego, na pełnym ekranie jak aplikację, z przypomnieniami i powiadomieniami.',
    install: 'Zainstaluj',
    how: 'Pokaż jak',
    notNow: 'Nie teraz',
    intro: 'BeHappy działa jak aplikacja prosto z przeglądarki: na ekranie początkowym, na pełnym ekranie, z powiadomieniami. Bez sklepu z aplikacjami i pobierania.',
    installed: 'BeHappy jest zainstalowane na tym urządzeniu. Otwieraj je z ekranu początkowego.',
    iosTitle: 'iPhone i iPad',
    iosSteps: ['Otwórz BeHappy w Safari.', 'Stuknij przycisk Udostępnij (kwadrat ze strzałką).', 'Wybierz „Do ekranu początkowego”.', 'Zostaw włączone „Otwórz jako aplikację internetową” i stuknij „Dodaj”.'],
    iosNote: 'iPhone i iPad nie mają przycisku instalacji aplikacji internetowych, dlatego służą do tego te kroki. Powiadomienia działają w BeHappy otwartym z ekranu początkowego (iOS 16.4 lub nowszy).',
    androidTitle: 'Android',
    androidSteps: ['Otwórz BeHappy w Chrome.', 'Stuknij menu (⋮) w prawym górnym rogu.', 'Wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.'],
    desktopTitle: 'Komputer',
    desktopSteps: ['W Chrome lub Edge kliknij ikonę instalacji na końcu paska adresu.', 'Albo otwórz menu przeglądarki i wybierz „Zainstaluj BeHappy”.'],
    settingsHint: 'Ekran początkowy, pełny ekran, powiadomienia',
  },
  push: {
    needsInstall: 'Na iPhonie i iPadzie powiadomienia i przypomnienia działają, gdy BeHappy jest dodane do ekranu początkowego.',
    howToInstall: 'Jak dodać',
    denied: 'Powiadomienia BeHappy są zablokowane w tej przeglądarce. Zezwól na nie w ustawieniach witryny (obok adresu) i spróbuj ponownie.',
    unsupported: 'Ta przeglądarka nie odbiera powiadomień ze stron. Wszystko nadal widać w BeHappy.',
    webDevice: 'Powiadomienia na tym urządzeniu',
  },
};
