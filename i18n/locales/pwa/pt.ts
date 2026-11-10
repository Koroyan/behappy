/** `pwa` namespace: Português (see ./en.ts). */
export const pwaPt: typeof import('./en').pwaEn = {
  update: {
    title: 'Uma nova versão do BeHappy está pronta',
    refresh: 'Atualizar',
    later: 'Mais tarde',
  },
  install: {
    cardTitle: 'Instale o BeHappy',
    cardBody: 'Abra pela tela de início, em tela cheia como um app, com lembretes e notificações.',
    install: 'Instalar',
    how: 'Mostrar como',
    notNow: 'Agora não',
    intro: 'O BeHappy funciona como um app direto do navegador: na tela de início, em tela cheia, com notificações. Sem loja de apps nem downloads.',
    installed: 'O BeHappy está instalado neste aparelho. Abra pela tela de início.',
    iosTitle: 'iPhone e iPad',
    iosSteps: ['Abra o BeHappy no Safari.', 'Toque no botão Compartilhar (o quadrado com uma seta).', 'Escolha “Adicionar à Tela de Início”.', 'Deixe “Abrir como App Web” ativado e toque em “Adicionar”.'],
    iosNote: 'iPhone e iPad não têm botão de instalação para apps web, então o caminho são estes passos. As notificações funcionam com o BeHappy aberto pela Tela de Início (iOS 16.4 ou posterior).',
    androidTitle: 'Android',
    androidSteps: ['Abra o BeHappy no Chrome.', 'Toque no menu (⋮) no canto superior direito.', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.'],
    desktopTitle: 'Computador',
    desktopSteps: ['No Chrome ou no Edge, clique no ícone de instalar no fim da barra de endereço.', 'Ou abra o menu do navegador e escolha “Instalar BeHappy”.'],
    settingsHint: 'Tela de início, tela cheia, notificações',
  },
  push: {
    needsInstall: 'No iPhone e no iPad, notificações e lembretes funcionam quando o BeHappy está na Tela de Início.',
    howToInstall: 'Como adicionar',
    denied: 'As notificações do BeHappy estão bloqueadas neste navegador. Permita-as nas configurações do site (ao lado do endereço) e tente de novo.',
    unsupported: 'Este navegador não recebe notificações de sites. Tudo continua aparecendo no BeHappy.',
    webDevice: 'Notificações neste aparelho',
  },
  payment: {
    returnHint: 'Se esta página abriu numa janela separada, feche-a (“OK”) para voltar ao BeHappy. O app percebe o pagamento sozinho.',
  },
  notify: {
    title: 'Saiba quando alguém escrever para você',
    body: 'Ative as notificações de respostas, mensagens e consultas. Os tipos e o horário de silêncio mudam nas Configurações.',
    enable: 'Ativar',
    later: 'Agora não',
  },
  plan: {
    current: 'Seu plano',
    daysLeft: 'Dias restantes: {n}',
    extendNotice: 'Você já tem Plus até {date}. Pagar de novo adiciona {days} dias: o Plus vai até {newDate}.',
    extend: 'Estender por {days} dias',
    alreadyOwned: 'O programa de arteterapia já é seu. Não há nada a pagar.',
    paidJustNow: 'Seu pagamento anterior foi aprovado: o Plus está ativo até {date}.',
  },
};
