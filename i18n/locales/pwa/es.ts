/** `pwa` namespace: Español (see ./en.ts). */
export const pwaEs: typeof import('./en').pwaEn = {
  update: {
    title: 'Hay una nueva versión de BeHappy',
    refresh: 'Actualizar',
    later: 'Más tarde',
  },
  install: {
    cardTitle: 'Instala BeHappy',
    cardBody: 'Ábrela desde tu pantalla de inicio, a pantalla completa como una app, con recordatorios y notificaciones.',
    install: 'Instalar',
    how: 'Muéstrame cómo',
    notNow: 'Ahora no',
    intro: 'BeHappy funciona como una app directamente desde el navegador: en tu pantalla de inicio, a pantalla completa, con notificaciones. Sin tienda de apps ni descargas.',
    installed: 'BeHappy está instalada en este dispositivo. Ábrela desde tu pantalla de inicio.',
    iosTitle: 'iPhone y iPad',
    iosSteps: ['Abre BeHappy en Safari.', 'Toca el botón Compartir (el cuadrado con una flecha).', 'Elige «Añadir a pantalla de inicio».', 'Deja activado «Abrir como app web» y toca «Añadir».'],
    iosNote: 'El iPhone y el iPad no tienen un botón para instalar apps web, así que estos pasos son el camino. Las notificaciones funcionan al abrir BeHappy desde la pantalla de inicio (iOS 16.4 o posterior).',
    androidTitle: 'Android',
    androidSteps: ['Abre BeHappy en Chrome.', 'Toca el menú (⋮) arriba a la derecha.', 'Elige «Instalar app» o «Añadir a pantalla de inicio».'],
    desktopTitle: 'Ordenador',
    desktopSteps: ['En Chrome o Edge, haz clic en el icono de instalar al final de la barra de direcciones.', 'O abre el menú del navegador y elige «Instalar BeHappy».'],
    settingsHint: 'Pantalla de inicio, pantalla completa, notificaciones',
  },
  push: {
    needsInstall: 'En iPhone y iPad, las notificaciones y los recordatorios funcionan cuando BeHappy está en la pantalla de inicio.',
    howToInstall: 'Cómo añadirla',
    denied: 'Las notificaciones de BeHappy están bloqueadas en este navegador. Permítelas en la configuración del sitio (junto a la dirección) y vuelve a intentarlo.',
    unsupported: 'Este navegador no puede recibir notificaciones de sitios web. Todo sigue apareciendo en BeHappy.',
    webDevice: 'Notificaciones en este dispositivo',
  },
  payment: {
    returnHint: 'Si esta página se abrió en una ventana aparte, ciérrala («OK») para volver a BeHappy. La app detecta el pago por sí sola.',
  },
  notify: {
    title: 'Entérate cuando alguien te escriba',
    body: 'Activa las notificaciones de respuestas, mensajes y citas. Los tipos y las horas de silencio se cambian en Ajustes.',
    enable: 'Activar',
    later: 'Ahora no',
  },
  plan: {
    current: 'Tu plan',
    daysLeft: 'Días restantes: {n}',
    extendNotice: 'Ya tienes Plus hasta el {date}. Pagar de nuevo añade {days} días: Plus durará hasta el {newDate}.',
    extend: 'Ampliar {days} días',
    alreadyOwned: 'El programa de arteterapia ya es tuyo. No hay nada que pagar.',
    paidJustNow: 'Tu pago anterior se completó: Plus está activo hasta el {date}.',
  },
};
