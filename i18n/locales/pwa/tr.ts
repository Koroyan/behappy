/** `pwa` namespace: Türkçe (see ./en.ts). */
export const pwaTr: typeof import('./en').pwaEn = {
  update: {
    title: 'BeHappy’nin yeni sürümü hazır',
    refresh: 'Yenile',
    later: 'Sonra',
  },
  install: {
    cardTitle: 'BeHappy’yi yükleyin',
    cardBody: 'Ana ekrandan, tam ekran bir uygulama gibi açın; hatırlatmalar ve bildirimlerle.',
    install: 'Yükle',
    how: 'Nasıl olduğunu göster',
    notNow: 'Şimdi değil',
    intro: 'BeHappy doğrudan tarayıcıdan bir uygulama gibi çalışır: ana ekranda, tam ekran, bildirimlerle. Uygulama mağazası ya da indirme gerekmez.',
    installed: 'BeHappy bu cihazda yüklü. Ana ekrandan açabilirsiniz.',
    iosTitle: 'iPhone ve iPad',
    iosSteps: ['BeHappy’yi Safari’de açın.', 'Paylaş düğmesine dokunun (oklu kare).', '“Ana Ekrana Ekle”yi seçin.', '“Web Uygulaması Olarak Aç” açık kalsın, sonra “Ekle”ye dokunun.'],
    iosNote: 'iPhone ve iPad’de web uygulamaları için yükleme düğmesi yoktur; yol bu adımlardır. Bildirimler, BeHappy ana ekrandan açıldığında çalışır (iOS 16.4 veya üstü).',
    androidTitle: 'Android',
    androidSteps: ['BeHappy’yi Chrome’da açın.', 'Sağ üstteki menüye (⋮) dokunun.', '“Uygulamayı yükle” ya da “Ana ekrana ekle”yi seçin.'],
    desktopTitle: 'Bilgisayar',
    desktopSteps: ['Chrome veya Edge’de adres çubuğunun sağ ucundaki yükleme simgesine tıklayın.', 'Ya da tarayıcı menüsünü açıp “BeHappy’yi yükle”yi seçin.'],
    settingsHint: 'Ana ekran, tam ekran, bildirimler',
  },
  push: {
    needsInstall: 'iPhone ve iPad’de bildirimler ve hatırlatmalar, BeHappy ana ekrana eklendiğinde çalışır.',
    howToInstall: 'Nasıl eklenir',
    denied: 'BeHappy bildirimleri bu tarayıcıda engellenmiş. Site ayarlarından (adresin yanında) izin verip tekrar deneyin.',
    unsupported: 'Bu tarayıcı sitelerden bildirim alamıyor. Her şey yine BeHappy’de görünür.',
    webDevice: 'Bu cihazda bildirimler',
  },
  payment: {
    returnHint: 'Bu sayfa ayrı bir pencerede açıldıysa, BeHappy’ye dönmek için kapatın (“Bitti”). Uygulama ödemeyi kendisi görür.',
  },
  notify: {
    title: 'Biri size yazdığında haberiniz olsun',
    body: 'Yanıtlar, mesajlar ve randevular için bildirimleri açın. Türler ve sessiz saatler Ayarlar’dan değiştirilir.',
    enable: 'Aç',
    later: 'Şimdi değil',
  },
  plan: {
    current: 'Planınız',
    daysLeft: 'Kalan gün: {n}',
    extendNotice: '{date} tarihine kadar Plus’ınız zaten var. Yeniden ödemek {days} gün ekler; Plus {newDate} tarihine kadar sürer.',
    extend: '{days} gün uzat',
    alreadyOwned: 'Sanat terapisi programı zaten sizin. Ödenecek bir şey yok.',
    paidJustNow: 'Önceki ödemeniz gerçekleşti: Plus {date} tarihine kadar etkin.',
  },
};
