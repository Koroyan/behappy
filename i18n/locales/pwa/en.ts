/**
 * The installed web app (namespace `pwa`), English source: the update prompt,
 * installing BeHappy on a phone or computer, and why notifications may need
 * the Home Screen (iPhone/iPad) or the browser's permission.
 * Imported into each language's 3.0 file (../v3/<code>.ts) like `alerts`.
 * iOS / Android menu names are quoted the way those systems show them.
 */
export const pwaEn = {
  update: {
    title: 'A new version of BeHappy is ready',
    refresh: 'Refresh',
    later: 'Later',
  },
  install: {
    cardTitle: 'Install BeHappy',
    cardBody: 'Open it from your home screen, full screen like an app, with reminders and notifications.',
    install: 'Install',
    how: 'Show me how',
    notNow: 'Not now',
    intro: 'BeHappy works as an app straight from your browser: on your home screen, full screen, with notifications. No app store, nothing to download.',
    installed: 'BeHappy is installed on this device. Open it from your home screen.',
    iosTitle: 'iPhone and iPad',
    iosSteps: ['Open BeHappy in Safari.', 'Tap the Share button (the square with an arrow).', 'Choose “Add to Home Screen”.', 'Keep “Open as Web App” on, then tap “Add”.'],
    iosNote: 'iPhone and iPad have no install button for web apps, so these steps are the way. Notifications work in BeHappy opened from the Home Screen (iOS 16.4 or later).',
    androidTitle: 'Android',
    androidSteps: ['Open BeHappy in Chrome.', 'Tap the menu (⋮) at the top right.', 'Choose “Install app” or “Add to Home screen”.'],
    desktopTitle: 'Computer',
    desktopSteps: ['In Chrome or Edge, click the install icon at the right end of the address bar.', 'Or open the browser menu and choose “Install BeHappy”.'],
    settingsHint: 'Home screen, full screen, notifications',
  },
  push: {
    needsInstall: 'On iPhone and iPad, notifications and reminders work when BeHappy is added to the Home Screen.',
    howToInstall: 'How to add it',
    denied: 'Notifications for BeHappy are blocked in this browser. Allow them in the site settings (next to the address), then try again.',
    unsupported: 'This browser can’t receive notifications from websites. Everything still appears in BeHappy.',
    webDevice: 'Notifications on this device',
  },
  payment: {
    returnHint: 'If this page opened in a separate window, close it (Done) to go back to BeHappy. The app picks up the payment by itself.',
  },
  notify: {
    title: 'Know when someone writes to you',
    body: 'Turn on notifications for replies, messages and appointments. Every type and quiet hours can be changed in Settings.',
    enable: 'Turn on',
    later: 'Not now',
  },
  plan: {
    current: 'Your plan',
    daysLeft: 'Days left: {n}',
    extendNotice: 'You already have Plus until {date}. Paying again adds {days} days, so Plus lasts until {newDate}.',
    extend: 'Extend by {days} days',
    alreadyOwned: 'The art therapy program is already yours. There is nothing to pay.',
    paidJustNow: 'Your earlier payment went through: Plus is active until {date}.',
  },
};
