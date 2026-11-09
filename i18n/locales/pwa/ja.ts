/** `pwa` namespace: 日本語 (see ./en.ts). */
export const pwaJa: typeof import('./en').pwaEn = {
  update: {
    title: 'BeHappy の新しいバージョンがあります',
    refresh: '更新',
    later: 'あとで',
  },
  install: {
    cardTitle: 'BeHappy をインストール',
    cardBody: 'ホーム画面から、アプリのように全画面で開けます。リマインダーと通知つき。',
    install: 'インストール',
    how: '方法を見る',
    notNow: '今はしない',
    intro: 'BeHappy はブラウザからそのままアプリのように使えます。ホーム画面に置けて、全画面で、通知も届きます。App Store もダウンロードも不要です。',
    installed: 'BeHappy はこのデバイスにインストール済みです。ホーム画面から開いてください。',
    iosTitle: 'iPhone と iPad',
    iosSteps: ['Safari で BeHappy を開きます。', '共有ボタン（矢印のついた四角）をタップします。', '「ホーム画面に追加」を選びます。', '「Webアプリとして開く」をオンのままにして「追加」をタップします。'],
    iosNote: 'iPhone と iPad には Web アプリのインストールボタンがないため、この手順で追加します。通知は、ホーム画面から開いた BeHappy で届きます（iOS 16.4 以降）。',
    androidTitle: 'Android',
    androidSteps: ['Chrome で BeHappy を開きます。', '右上のメニュー（⋮）をタップします。', '「アプリをインストール」または「ホーム画面に追加」を選びます。'],
    desktopTitle: 'パソコン',
    desktopSteps: ['Chrome または Edge で、アドレスバー右端のインストールアイコンをクリックします。', 'またはブラウザのメニューから「BeHappy をインストール」を選びます。'],
    settingsHint: 'ホーム画面・全画面・通知',
  },
  push: {
    needsInstall: 'iPhone と iPad では、BeHappy をホーム画面に追加すると通知とリマインダーが届きます。',
    howToInstall: '追加の方法',
    denied: 'このブラウザで BeHappy の通知がブロックされています。サイトの設定（アドレスの横）で許可してから、もう一度お試しください。',
    unsupported: 'このブラウザはサイトからの通知を受け取れません。内容はすべて BeHappy の中で見られます。',
    webDevice: 'このデバイスへの通知',
  },
};
