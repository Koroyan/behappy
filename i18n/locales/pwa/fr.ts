/** `pwa` namespace: Français (see ./en.ts). */
export const pwaFr: typeof import('./en').pwaEn = {
  update: {
    title: 'Une nouvelle version de BeHappy est prête',
    refresh: 'Actualiser',
    later: 'Plus tard',
  },
  install: {
    cardTitle: 'Installer BeHappy',
    cardBody: 'Ouvrez-la depuis votre écran d’accueil, en plein écran comme une app, avec rappels et notifications.',
    install: 'Installer',
    how: 'Me montrer comment',
    notNow: 'Pas maintenant',
    intro: 'BeHappy fonctionne comme une app directement depuis le navigateur : sur votre écran d’accueil, en plein écran, avec des notifications. Sans magasin d’applications ni téléchargement.',
    installed: 'BeHappy est installée sur cet appareil. Ouvrez-la depuis votre écran d’accueil.',
    iosTitle: 'iPhone et iPad',
    iosSteps: ['Ouvrez BeHappy dans Safari.', 'Touchez le bouton Partager (le carré avec une flèche).', 'Choisissez « Sur l’écran d’accueil ».', 'Laissez « Ouvrir en tant qu’app web » activé, puis touchez « Ajouter ».'],
    iosNote: 'L’iPhone et l’iPad n’ont pas de bouton d’installation pour les apps web : ces étapes sont la marche à suivre. Les notifications fonctionnent quand BeHappy est ouverte depuis l’écran d’accueil (iOS 16.4 ou ultérieur).',
    androidTitle: 'Android',
    androidSteps: ['Ouvrez BeHappy dans Chrome.', 'Touchez le menu (⋮) en haut à droite.', 'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».'],
    desktopTitle: 'Ordinateur',
    desktopSteps: ['Dans Chrome ou Edge, cliquez sur l’icône d’installation au bout de la barre d’adresse.', 'Ou ouvrez le menu du navigateur et choisissez « Installer BeHappy ».'],
    settingsHint: 'Écran d’accueil, plein écran, notifications',
  },
  push: {
    needsInstall: 'Sur iPhone et iPad, les notifications et les rappels fonctionnent quand BeHappy est ajoutée à l’écran d’accueil.',
    howToInstall: 'Comment l’ajouter',
    denied: 'Les notifications de BeHappy sont bloquées dans ce navigateur. Autorisez-les dans les paramètres du site (à côté de l’adresse), puis réessayez.',
    unsupported: 'Ce navigateur ne peut pas recevoir de notifications des sites web. Tout apparaît toujours dans BeHappy.',
    webDevice: 'Notifications sur cet appareil',
  },
  payment: {
    returnHint: 'Si cette page s’est ouverte dans une fenêtre à part, fermez-la (« OK ») pour revenir à BeHappy. L’app voit le paiement d’elle-même.',
  },
  notify: {
    title: 'Sachez quand quelqu’un vous écrit',
    body: 'Activez les notifications pour les réponses, les messages et les rendez-vous. Les types et les heures calmes se règlent dans les Réglages.',
    enable: 'Activer',
    later: 'Pas maintenant',
  },
  plan: {
    current: 'Votre formule',
    daysLeft: 'Jours restants : {n}',
    extendNotice: 'Vous avez déjà Plus jusqu’au {date}. Payer à nouveau ajoute {days} jours : Plus durera jusqu’au {newDate}.',
    extend: 'Prolonger de {days} jours',
    alreadyOwned: 'Le programme d’art-thérapie est déjà à vous. Il n’y a rien à payer.',
    paidJustNow: 'Votre paiement précédent est passé : Plus est actif jusqu’au {date}.',
  },
};
