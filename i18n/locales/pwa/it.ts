/** `pwa` namespace: Italiano (see ./en.ts). */
export const pwaIt: typeof import('./en').pwaEn = {
  update: {
    title: 'È pronta una nuova versione di BeHappy',
    refresh: 'Aggiorna',
    later: 'Più tardi',
  },
  install: {
    cardTitle: 'Installa BeHappy',
    cardBody: 'Aprila dalla schermata Home, a schermo intero come un’app, con promemoria e notifiche.',
    install: 'Installa',
    how: 'Mostrami come',
    notNow: 'Non ora',
    intro: 'BeHappy funziona come un’app direttamente dal browser: sulla schermata Home, a schermo intero, con notifiche. Senza app store né download.',
    installed: 'BeHappy è installata su questo dispositivo. Aprila dalla schermata Home.',
    iosTitle: 'iPhone e iPad',
    iosSteps: ['Apri BeHappy in Safari.', 'Tocca il pulsante Condividi (il quadrato con la freccia).', 'Scegli «Aggiungi alla schermata Home».', 'Lascia attivo «Apri come app web» e tocca «Aggiungi».'],
    iosNote: 'iPhone e iPad non hanno un pulsante per installare le app web, quindi si fa con questi passaggi. Le notifiche funzionano aprendo BeHappy dalla schermata Home (iOS 16.4 o successivo).',
    androidTitle: 'Android',
    androidSteps: ['Apri BeHappy in Chrome.', 'Tocca il menu (⋮) in alto a destra.', 'Scegli «Installa app» o «Aggiungi a schermata Home».'],
    desktopTitle: 'Computer',
    desktopSteps: ['In Chrome o Edge, fai clic sull’icona di installazione alla fine della barra degli indirizzi.', 'Oppure apri il menu del browser e scegli «Installa BeHappy».'],
    settingsHint: 'Schermata Home, schermo intero, notifiche',
  },
  push: {
    needsInstall: 'Su iPhone e iPad notifiche e promemoria funzionano quando BeHappy è aggiunta alla schermata Home.',
    howToInstall: 'Come aggiungerla',
    denied: 'Le notifiche di BeHappy sono bloccate in questo browser. Consentile nelle impostazioni del sito (accanto all’indirizzo) e riprova.',
    unsupported: 'Questo browser non può ricevere notifiche dai siti web. Tutto appare comunque in BeHappy.',
    webDevice: 'Notifiche su questo dispositivo',
  },
  payment: {
    returnHint: 'Se questa pagina si è aperta in una finestra a parte, chiudila («Fine») per tornare a BeHappy. L’app rileva il pagamento da sola.',
  },
  notify: {
    title: 'Sappi quando qualcuno ti scrive',
    body: 'Attiva le notifiche per risposte, messaggi e appuntamenti. Tipi e ore di silenzio si cambiano nelle Impostazioni.',
    enable: 'Attiva',
    later: 'Non ora',
  },
  plan: {
    current: 'Il tuo piano',
    daysLeft: 'Giorni rimasti: {n}',
    extendNotice: 'Hai già Plus fino al {date}. Un nuovo pagamento aggiunge {days} giorni: Plus durerà fino al {newDate}.',
    extend: 'Estendi di {days} giorni',
    alreadyOwned: 'Il programma di arteterapia è già tuo. Non c’è nulla da pagare.',
    paidJustNow: 'Il tuo pagamento precedente è andato a buon fine: Plus è attivo fino al {date}.',
  },
};
