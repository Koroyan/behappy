import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function GeneralScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const pick = (obj: Record<string, string>): string => obj[language] ?? obj.en;

  const t = {
    appName: 'BeHappy',
    heroSubtitle: {
      en: 'Your personal mental health companion',
      ru: 'Ваш персональный помощник в заботе о психическом здоровье',
      ka: 'შენი პირადი ფსიქიკური ჯანმრთელობის თანამგზავრი',
      hy: 'Ձեր անձնական հոգեկան առողջության ուղեկիցը',
      tr: 'Kişisel ruh sağlığı arkadaşınız',
      az: 'Şəxsi psixi sağlamlıq yoldaşınız',
      es: 'Tu compañero personal de salud mental',
      de: 'Dein persönlicher Begleiter für mentale Gesundheit',
      fr: 'Votre compagnon personnel en santé mentale',
      pt: 'Seu companheiro pessoal de saúde mental',
      ar: 'رفيقك الشخصي للصحة النفسية',
      id: 'Pendamping kesehatan mental pribadi Anda',
      it: 'Il tuo compagno personale per la salute mentale',
      ja: 'あなた専用のメンタルヘルスコンパニオン',
      zh: '您的个人心理健康伙伴',
      hi: 'आपका व्यक्तिगत मानसिक स्वास्थ्य साथी',
      ko: '당신의 개인 정신 건강 동반자',
      uk: 'Ваш особистий помічник у піклуванні про психічне здоров\'я',
      pl: 'Twój osobisty towarzysz zdrowia psychicznego'
    },
    quickAccess: {
      en: 'Quick Access',
      ru: 'Быстрый доступ',
      ka: 'სწრაფი წვდომა',
      hy: 'Արագ մուտք',
      tr: 'Hızlı Erişim',
      az: 'Sürətli giriş',
      es: 'Acceso rápido',
      de: 'Schnellzugriff',
      fr: 'Accès rapide',
      pt: 'Acesso rápido',
      ar: 'الوصول السريع',
      id: 'Akses Cepat',
      it: 'Accesso rapido',
      ja: 'クイックアクセス',
      zh: '快速访问',
      hi: 'त्वरित पहुँच',
      ko: '빠른 접근',
      uk: 'Швидкий доступ',
      pl: 'Szybki dostęp'
    },
    settings: {
      en: 'Settings',
      ru: 'Настройки',
      ka: 'პარამეტრები',
      hy: 'Կարգավորումներ',
      tr: 'Ayarlar',
      az: 'Tənzimləmələr',
      es: 'Ajustes',
      de: 'Einstellungen',
      fr: 'Paramètres',
      pt: 'Configurações',
      ar: 'الإعدادات',
      id: 'Pengaturan',
      it: 'Impostazioni',
      ja: '設定',
      zh: '设置',
      hi: 'सेटिंग्स',
      ko: '설정',
      uk: 'Налаштування',
      pl: 'Ustawienia'
    },
    language: {
      en: 'Language',
      ru: 'Язык',
      ka: 'ენა',
      hy: 'Լեզու',
      tr: 'Dil',
      az: 'Dil',
      es: 'Idioma',
      de: 'Sprache',
      fr: 'Langue',
      pt: 'Idioma',
      ar: 'اللغة',
      id: 'Bahasa',
      it: 'Lingua',
      ja: '言語',
      zh: '语言',
      hi: 'भाषा',
      ko: '언어',
      uk: 'Мова',
      pl: 'Język'
    },
    selectLanguage: {
      en: 'Select your preferred language',
      ru: 'Выберите предпочтительный язык',
      ka: 'აირჩიე სასურველი ენა',
      hy: 'Ընտրեք ձեր նախընտրած լեզուն',
      tr: 'Tercih ettiğiniz dili seçin',
      az: 'Üstün tutduğunuz dili seçin',
      es: 'Selecciona tu idioma preferido',
      de: 'Wähle deine bevorzugte Sprache',
      fr: 'Sélectionnez votre langue préférée',
      pt: 'Selecione seu idioma preferido',
      ar: 'حدد لغتك المفضلة',
      id: 'Pilih bahasa pilihan Anda',
      it: 'Seleziona la tua lingua preferita',
      ja: '優先言語を選択してください',
      zh: '选择您的首选语言',
      hi: 'अपनी पसंदीदा भाषा चुनें',
      ko: '선호하는 언어를 선택하세요',
      uk: 'Оберіть бажану мову',
      pl: 'Wybierz preferowany język'
    },
    artTherapy: {
      en: 'Art Therapy',
      ru: 'Арт-терапия',
      ka: 'არტ თერაპია',
      hy: 'Արվեստի թերապիա',
      tr: 'Sanat terapisi',
      az: 'İncəsənət terapiyası',
      es: 'Arteterapia',
      de: 'Kunsttherapie',
      fr: 'Art-thérapie',
      pt: 'Arteterapia',
      ar: 'العلاج بالفن',
      id: 'Terapi Seni',
      it: 'Arteterapia',
      ja: 'アートセラピー',
      zh: '艺术治疗',
      hi: 'आर्ट थेरेपी',
      ko: '아트 테라피',
      uk: 'Арт-терапія',
      pl: 'Terapia sztuką'
    },
    artDesc: {
      en: 'Express through creativity',
      ru: 'Выражайте себя через творчество',
      ka: 'გამოხატე შენი თავი შემოქმედებით',
      hy: 'Արտահայտեք ձեր էությունը ստեղծագործության միջոցով',
      tr: 'Yaratıcılıkla kendinizi ifade edin',
      az: 'Yaradıcılıq vasitəsilə özünüzü ifadə edin',
      es: 'Exprésate a través de la creatividad',
      de: 'Drücke dich kreativ aus',
      fr: 'Exprimez-vous par la créativité',
      pt: 'Expresse-se através da criatividade',
      ar: 'عبر عن نفسك من خلال الإبداع',
      id: 'Ekspresikan melalui kreativitas',
      it: 'Esprimi te stesso attraverso la creatività',
      ja: '創造性を通じて表現する',
      zh: '通过创造力表达自己',
      hi: 'रचनात्मकता के माध्यम से अभिव्यक्त करें',
      ko: '창의성으로 표현하세요',
      uk: 'Виражайте себе через творчість',
      pl: 'Wyrażaj siebie przez kreatywność'
    },
    cardTherapy: {
      en: 'Card Therapy',
      ru: 'Терапия карточками',
      ka: 'ბარათების თერაპია',
      hy: 'Քարտերով թերապիա',
      tr: 'Kart terapisi',
      az: 'Kart terapiyası',
      es: 'Terapia con cartas',
      de: 'Kartentherapie',
      fr: 'Thérapie par cartes',
      pt: 'Terapia com cartas',
      ar: 'علاج البطاقات',
      id: 'Terapi Kartu',
      it: 'Terapia con carte',
      ja: 'カード療法',
      zh: '卡片疗法',
      hi: 'कार्ड थेरेपी',
      ko: '카드 테라피',
      uk: 'Терапія картками',
      pl: 'Terapia kartami'
    },
    cardDesc: {
      en: 'Discover insights with cards',
      ru: 'Открывайте инсайты с помощью карт',
      ka: 'აღმოაჩინე შეხედულებები ბარათებით',
      hy: 'Բացահայտեք պատկերացումներ քարտերով',
      tr: 'Kartlarla içgörüler keşfedin',
      az: 'Kartlarla fikirlər kəşf edin',
      es: 'Descubre perspectivas con cartas',
      de: 'Entdecke Einsichten mit Karten',
      fr: 'Découvrez des perspectives avec des cartes',
      pt: 'Descubra insights com cartas',
      ar: 'اكتشف رؤى باستخدام البطاقات',
      id: 'Temukan wawasan dengan kartu',
      it: 'Scopri intuizioni con le carte',
      ja: 'カードで洞察を発見',
      zh: '用卡片发现见解',
      hi: 'कार्ड के साथ अंतर्दृष्टि खोजें',
      ko: '카드로 통찰력을 발견하세요',
      uk: 'Відкрийте інсайти за допомогою карт',
      pl: 'Odkryj spostrzeżenia za pomocą kart'
    },
    aiAssistant: {
      en: 'AI Assistant',
      ru: 'ИИ-ассистент',
      ka: 'AI ასისტენტი',
      hy: 'ԱԻ օգնական',
      tr: 'YZ Asistan',
      az: 'Sİ Assistent',
      es: 'Asistente IA',
      de: 'KI-Assistent',
      fr: 'Assistant IA',
      pt: 'Assistente IA',
      ar: 'مساعد الذكاء الاصطناعي',
      id: 'Asisten AI',
      it: 'Assistente IA',
      ja: 'AIアシスタント',
      zh: 'AI 助手',
      hi: 'एआई सहायक',
      ko: 'AI 어시스턴트',
      uk: 'AI-асистент',
      pl: 'Asystent AI'
    },
    aiDesc: {
      en: 'Chat with support anytime',
      ru: 'Общайтесь с поддержкой в любое время',
      ka: 'ისაუბრე მხარდაჭერასთან ნებისმიერ დროს',
      hy: 'Զրուցեք աջակցության հետ ցանկացած ժամանակ',
      tr: 'İstediğiniz zaman destekle sohbet edin',
      az: 'İstənilən vaxt dəstəklə söhbət edin',
      es: 'Chatea con soporte en cualquier momento',
      de: 'Chatte jederzeit mit Support',
      fr: 'Discutez avec le support à tout moment',
      pt: 'Converse com o suporte a qualquer momento',
      ar: 'تحدث مع الدعم في أي وقت',
      id: 'Ngobrol dengan dukungan kapan saja',
      it: 'Chatta con il supporto in qualsiasi momento',
      ja: 'いつでもサポートとチャット',
      zh: '随时与支持聊天',
      hi: 'किसी भी समय समर्थन के साथ चैट करें',
      ko: '언제든지 지원팀과 채팅하세요',
      uk: 'Спілкуйтеся з підтримкою в будь-який час',
      pl: 'Czatuj ze wsparciem w dowolnym momencie'
    },
    darkMode: {
      en: 'Dark Mode',
      ru: 'Темная тема',
      ka: 'ბნელი თემა',
      hy: 'Մուգ թեմա',
      tr: 'Karanlık tema',
      az: 'Tünd mövzu',
      es: 'Tema oscuro',
      de: 'Dunkles Thema',
      fr: 'Thème sombre',
      pt: 'Tema escuro',
      ar: 'الوضع الداكن',
      id: 'Mode gelap',
      it: 'Tema scuro',
      ja: 'ダークテーマ',
      zh: '深色主题',
      hi: 'डार्क मोड',
      ko: '다크 모드',
      uk: 'Темна тема',
      pl: 'Tryb ciemny'
    },
    notifications: {
      en: 'Notifications',
      ru: 'Уведомления',
      ka: 'შეტყობინებები',
      hy: 'Ծանուցումներ',
      tr: 'Bildirimler',
      az: 'Bildirişlər',
      es: 'Notificaciones',
      de: 'Benachrichtigungen',
      fr: 'Notifications',
      pt: 'Notificações',
      ar: 'الإشعارات',
      id: 'Notifikasi',
      it: 'Notifiche',
      ja: '通知',
      zh: '通知',
      hi: 'सूचनाएँ',
      ko: '알림',
      uk: 'Сповіщення',
      pl: 'Powiadomienia'
    },
    notificationsDesc: {
      en: 'Daily reminders and updates',
      ru: 'Ежедневные напоминания и обновления',
      ka: 'ყოველდღიური შეხსენებები და განახლებები',
      hy: 'Առօրյա հիշեցումներ և թարմացումներ',
      tr: 'Günlük hatırlatmalar ve güncellemeler',
      az: 'Gündəlik xatırlatmalar və yeniləmələr',
      es: 'Recordatorios y actualizaciones diarias',
      de: 'Tägliche Erinnerungen und Updates',
      fr: 'Rappels et mises à jour quotidiens',
      pt: 'Lembretes e atualizações diários',
      ar: 'تذكيرات وتحديثات يومية',
      id: 'Pengingat dan pembaruan harian',
      it: 'Promemoria e aggiornamenti giornalieri',
      ja: '毎日のリマインダーと更新',
      zh: '每日提醒和更新',
      hi: 'दैनिक रिमाइंडर और अपडेट',
      ko: '일일 알림 및 업데이트',
      uk: 'Щоденні нагадування та оновлення',
      pl: 'Codzienne przypomnienia i aktualizacje'
    }
  };

  const features = [
    {
      id: 'art',
      title: pick(t.artTherapy),
      subtitle: pick(t.artDesc),
      icon: 'palette',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#667eea', '#764ba2'] as const,
      route: '/art-therapy-safe',
    },
    {
      id: 'cards',
      title: pick(t.cardTherapy),
      subtitle: pick(t.cardDesc),
      icon: 'cards',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#f093fb', '#f5576c'] as const,
      route: '/screens/cards',
    },
    {
      id: 'chat',
      title: pick(t.aiAssistant),
      subtitle: pick(t.aiDesc),
      icon: 'robot',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#4facfe', '#00f2fe'] as const,
      route: '/screens/ai-assistant',
    },
  ];

  const languageNames: Record<AppLanguage, string> = {
    en: 'English',
    ka: 'ქართული',
    ru: 'Русский',
    hy: 'Հայերեն',
    tr: 'Türkçe',
    az: 'Azərbaycan',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    pt: 'Português',
    ar: 'العربية',
    id: 'Indonesia',
    it: 'Italiano',
    ja: '日本語',
    zh: '中文',
    hi: 'हिन्दी',
    ko: '한국어',
    uk: 'Українська',
    pl: 'Polski'
  };

  const allLanguages: AppLanguage[] = [
    'en', 'ka', 'ru', 'hy', 'tr', 'az', 'es', 'de', 'fr', 'pt', 'id', 'it', 'ar', 'hi', 'zh', 'ja', 'ko', 'uk', 'pl'
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#e0e7ff', '#f0f4ff']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.appName, { color: theme.colors.primary }]}>{t.appName}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {pick(t.heroSubtitle)}
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{pick(t.quickAccess)}</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => router.push(feature.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={feature.gradient}
                  style={styles.featureGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureIconContainer}>
                    <MaterialCommunityIcons name={feature.icon as any} size={32} color="#fff" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                  <View style={styles.featureArrow}>
                    <FontAwesome5 name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{pick(t.settings)}</Text>
          
          {/* Dark Mode */}
          <View style={[styles.settingCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? '#1e3a8a' : '#3b82f6' }]}>
                <FontAwesome5 name={isDark ? 'moon' : 'sun'} size={18} color="#fff" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{pick(t.darkMode)}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Notifications */}
          <View style={[styles.settingCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: '#f59e0b' }]}>
                <FontAwesome5 name="bell" size={18} color="#fff" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{pick(t.notifications)}</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  {pick(t.notificationsDesc)}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <View style={styles.languageHeader}>
            <FontAwesome5 name="globe" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0, marginLeft: 8 }]}>
              {pick(t.language)}
            </Text>
          </View>
          <Text style={[styles.languageHint, { color: theme.colors.textSecondary }]}>
            {pick(t.selectLanguage)}
          </Text>
          
          <View style={styles.languageGrid}>
            {allLanguages.map((lng) => {
              const isActive = language === lng;
              return (
                <TouchableOpacity
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  style={[
                    styles.languageChip,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.card,
                      borderColor: isActive ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      { color: isActive ? '#ffffff' : theme.colors.text },
                    ]}
                  >
                    {languageNames[lng]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    gap: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featureGradient: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  featureSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  featureArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  languageChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
