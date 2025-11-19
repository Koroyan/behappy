import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'toggle' | 'action' | 'info';
  value?: boolean;
  color: string;
}

export default function GeneralScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Safe translation picker with English fallback
  const pick = (obj: Record<string, string>): string => obj[language] ?? obj.en;

  // Localized strings
  const t = {
    heroTitle: {
      en: 'Your wellbeing, in focus',
      ru: 'Ваше благополучие — в фокусе',
      ka: 'შენი კეთილდღეობა — ფოკუსში',
      es: 'Tu bienestar, en foco',
      de: 'Dein Wohlbefinden im Fokus',
      fr: 'Votre bien‑être au centre',
      pt: 'Seu bem‑estar em foco',
      ar: 'رفاهيتك في بؤرة الاهتمام',
      id: 'Kesejahteraan Anda, menjadi fokus',
      ja: 'あなたのウェルビーイングにフォーカス',
      zh: '关注你的身心健康',
      tr: 'İyiliğiniz odakta',
      it: 'Il tuo benessere al centro',
      hi: 'आपका कल्याण केंद्र में',
      uk: 'Ваше благополуччя — у фокусі',
      pl: 'Twoje samopoczucie w centrum'
    },
    heroSubtitle: {
      en: 'Pick a direction and start now',
      ru: 'Выберите направление и начните прямо сейчас',
      ka: 'აირჩიე მიმართულება და დაიწყე ახლა',
      es: 'Elige un rumbo y empieza ahora',
      de: 'Wähle eine Richtung und starte jetzt',
      fr: 'Choisissez une voie et commencez maintenant',
      pt: 'Escolha um caminho e comece agora',
      ar: 'اختر اتجاهًا وابدأ الآن',
      id: 'Pilih arah dan mulai sekarang',
      ja: '方向を選んで今すぐ始めよう',
      zh: '选择方向，立即开始',
      tr: 'Bir yön seç ve şimdi başla',
      it: 'Scegli una direzione e inizia ora',
      hi: 'दिशा चुनें और अभी शुरू करें',
      uk: 'Обирайте напрям і починайте вже зараз',
      pl: 'Wybierz kierunek i zacznij teraz'
    },
    settings: {
      en: 'Settings', ru: 'Настройки', ka: 'პარამეტრები', es: 'Ajustes', de: 'Einstellungen', fr: 'Paramètres', pt: 'Configurações', ar: 'الإعدادات', id: 'Pengaturan', ja: '設定', zh: '设置', tr: 'Ayarlar', it: 'Impostazioni', hi: 'सेटिंग्स', uk: 'Налаштування', pl: 'Ustawienia'
    },
    interfaceLanguage: {
      en: 'Interface language', ru: 'Язык интерфейса', ka: 'ინტერფეისის ენა', es: 'Idioma de la interfaz', de: 'Sprache der Oberfläche', fr: "Langue de l'interface", pt: 'Idioma da interface', ar: 'لغة الواجهة', id: 'Bahasa antarmuka', ja: 'インターフェースの言語', zh: '界面语言', tr: 'Arayüz dili', it: "Lingua dell'interfaccia", hi: 'इंटरफेस भाषा', uk: 'Мова інтерфейсу', pl: 'Język interfejsu'
    },
    langHint: {
      en: 'Pick your preferred language — it applies across the app',
      ru: 'Выберите удобный язык — настройка применяется ко всему приложению',
      ka: 'აირჩიე სასურველი ენა — მოქმედებს მთელ აპში',
      es: 'Elige tu idioma preferido: se aplica a toda la app',
      de: 'Wähle deine bevorzugte Sprache – gilt in der ganzen App',
      fr: 'Choisissez votre langue — appliquée dans toute l’app',
      pt: 'Escolha o idioma preferido — vale para todo o app',
      ar: 'اختر لغتك المفضلة — تُطبَّق على التطبيق كاملًا',
      id: 'Pilih bahasa pilihan Anda — berlaku di seluruh aplikasi',
      ja: 'お好みの言語を選択 — アプリ全体に反映されます',
      zh: '选择偏好语言——应用全局生效',
      tr: 'Tercih edilen dili seç — tüm uygulamada geçerli',
      it: 'Scegli la lingua preferita — si applica all’intera app',
      hi: 'अपनी पसंदीदा भाषा चुनें — पूरी ऐप में लागू',
      uk: 'Оберіть мову — діє в усій апці',
      pl: 'Wybierz preferowany język — dotyczy całej aplikacji'
    },
    featureTitles: {
      art: {
        en: 'Art Therapy', ru: 'Арт-терапия', ka: 'არტ თერაპია', es: 'Arteterapia', de: 'Kunsttherapie', fr: 'Art‑thérapie', pt: 'Arteterapia', ar: 'العلاج بالفن', id: 'Terapi Seni', ja: 'アートセラピー', zh: '艺术治疗', tr: 'Sanat terapisi', it: 'Arteterapia', hi: 'आर्ट थेरेपी', uk: 'Арт‑терапія', pl: 'Terapia sztuką'
      },
      cards: {
        en: 'Cards Therapy', ru: 'Терапия карточками', ka: 'ბარათების თერაპია', es: 'Terapia con cartas', de: 'Kartentherapie', fr: 'Thérapie par cartes', pt: 'Terapia com cartas', ar: 'علاج البطاقات', id: 'Terapi Kartu', ja: 'カード療法', zh: '卡片疗法', tr: 'Kart terapisi', it: 'Terapia con carte', hi: 'कार्ड थेरेपी', uk: 'Терапія картками', pl: 'Terapia kartami'
      },
      chat: {
        en: 'AI Assistant', ru: 'ИИ‑ассистент', ka: 'AI ასისტენტი', es: 'Asistente IA', de: 'KI‑Assistent', fr: 'Assistant IA', pt: 'Assistente IA', ar: 'مساعد الذكاء الاصطناعي', id: 'Asisten AI', ja: 'AIアシスタント', zh: 'AI 助手', tr: 'YZ Asistan', it: 'Assistente IA', hi: 'एआई सहायक', uk: 'AI‑асистент', pl: 'Asystent AI'
      }
    },
    featureSubtitles: {
      art: {
        en: 'Creative practices for emotions', ru: 'Творческие практики для эмоций', ka: 'ემოციებისთვის შემოქმედებითი პრაქტიკები', es: 'Prácticas creativas para las emociones', de: 'Kreative Übungen für Emotionen', fr: 'Pratiques créatives pour les émotions', pt: 'Práticas criativas para emoções', ar: 'ممارسات إبداعية للمشاعر', id: 'Praktik kreatif untuk emosi', ja: '感情のための創造的な実践', zh: '情绪创作练习', tr: 'Duygular için yaratıcı pratikler', it: 'Pratiche creative per le emozioni', hi: 'भावनाओं के लिए रचनात्मक अभ्यास', uk: 'Творчі практики для емоцій', pl: 'Kreatywne praktyki dla emocji'
      },
      cards: {
        en: 'Gentle cognitive insights', ru: 'Мягкие когнитивные инсайты', ka: 'რბილი კოგნიტიური ხედვები', es: 'Ideas cognitivas suaves', de: 'Sanfte kognitive Einsichten', fr: 'Aperçus cognitifs doux', pt: 'Percepções cognitivas suaves', ar: 'رؤى معرفية لطيفة', id: 'Wawasan kognitif lembut', ja: 'やさしい認知の気づき', zh: '温和的认知洞察', tr: 'Nazik bilişsel içgörüler', it: 'Intuizioni cognitive delicate', hi: 'सौम्य संज्ञानात्मक अंतर्दृष्टि', uk: 'М’які когнітивні інсайти', pl: 'Łagodne wglądy poznawcze'
      },
      chat: {
        en: 'Personal therapeutic chat', ru: 'Личный терапевтический чат', ka: 'პირადი თერაპიული ჩატი', es: 'Chat terapéutico personal', de: 'Persönlicher Therapie‑Chat', fr: 'Chat thérapeutique personnel', pt: 'Bate‑papo terapêutico pessoal', ar: 'دردشة علاجية شخصية', id: 'Obrolan terapeutik pribadi', ja: '個人的なセラピー チャット', zh: '个性化治疗聊天', tr: 'Kişisel terapötik sohbet', it: 'Chat terapeutica personale', hi: 'व्यक्तिगत चिकित्सीय चैट', uk: 'Особистий терапевтичний чат', pl: 'Osobisty czat terapeutyczny'
      }
    },
    darkMode: {
      title: { en: 'Dark mode', ru: 'Темная тема', ka: 'ბნელი თემა', es: 'Tema oscuro', de: 'Dunkles Thema', fr: 'Thème sombre', pt: 'Tema escuro', ar: 'الوضع الداكن', id: 'Mode gelap', ja: 'ダークテーマ', zh: '深色主题', tr: 'Karanlık tema', it: 'Tema scuro', hi: 'डार्क मोड', uk: 'Темна тема', pl: 'Tryb ciemny' },
      subtitle: { en: 'Toggle appearance', ru: 'Переключить тему', ka: 'გარეგნობის გადართვა', es: 'Cambiar apariencia', de: 'Darstellung umschalten', fr: 
        "Changer l’apparence", pt: 'Alternar aparência', ar: 'تبديل المظهر', id: 'Ubah tampilan', ja: '外観を切り替え', zh: '切换外观', tr: 'Görünümü değiştir', it: 'Cambia aspetto', hi: 'रूप बदलें', uk: 'Змінити вигляд', pl: 'Przełącz wygląd' }
    },
    notifications: {
      title: { en: 'Notifications', ru: 'Уведомления', ka: 'შეტყობინებები', es: 'Notificaciones', de: 'Benachrichtigungen', fr: 'Notifications', pt: 'Notificações', ar: 'الإشعارات', id: 'Notifikasi', ja: '通知', zh: '通知', tr: 'Bildirimler', it: 'Notifiche', hi: 'सूचनाएँ', uk: 'Сповіщення', pl: 'Powiadomienia' },
      subtitle: { en: 'Reminders and updates', ru: 'Напоминания и обновления', ka: 'შეხსენებები და განახლებები', es: 'Recordatorios y actualizaciones', de: 'Erinnerungen und Updates', fr: 'Rappels et mises à jour', pt: 'Lembretes e atualizações', ar: 'تذكيرات وتحديثات', id: 'Pengingat dan pembaruan', ja: 'リマインダーと更新', zh: '提醒和更新', tr: 'Hatırlatmalar ve güncellemeler', it: 'Promemoria e aggiornamenti', hi: 'रिमाइंडर और अपडेट', uk: 'Нагадування та оновлення', pl: 'Przypomnienia i aktualizacje' }
    }
  } as const;

  // Feature cards for core experiences (localized)
  const features = [
    {
      id: 'art',
      title: pick(t.featureTitles.art),
      subtitle: pick(t.featureSubtitles.art),
      icon: 'paint-brush',
      gradient: ['#60A5FA', '#8B5CF6'],
      route: '/art-therapy-safe',
    },
    {
      id: 'cards',
      title: pick(t.featureTitles.cards),
      subtitle: pick(t.featureSubtitles.cards),
      icon: 'th-large',
      gradient: ['#34D399', '#10B981'],
      route: '/screens/cards',
    },
    {
      id: 'chat',
      title: pick(t.featureTitles.chat),
      subtitle: pick(t.featureSubtitles.chat),
      icon: 'comments',
      gradient: ['#F59E0B', '#F97316'],
      route: '/screens/ai-assistant',
    },
  ] as const;

  const settingsItems: SettingsItem[] = [
    {
      id: 'darkMode',
      title: pick(t.darkMode.title),
      subtitle: pick(t.darkMode.subtitle),
      icon: isDark ? 'sun' : 'moon',
      type: 'toggle',
      value: isDark,
      color: '#4A4A4A',
    },
    {
      id: 'notifications',
      title: pick(t.notifications.title),
      subtitle: pick(t.notifications.subtitle),
      icon: 'bell',
      type: 'toggle',
      value: notificationsEnabled,
      color: '#FF6B6B',
    },
  ];

  const handleSettingPress = (item: SettingsItem) => {
    switch (item.id) {
      case 'darkMode':
        toggleTheme();
        break;
      case 'notifications':
        setNotificationsEnabled(!notificationsEnabled);
        break;
      default:
        break;
    }
  };

  const styles = createStyles(theme);

  const renderSettingItem = (item: SettingsItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => handleSettingPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: item.color }]}>
          <FontAwesome5 name={item.icon as any} size={20} color="white" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.type === 'toggle' ? (
          <Switch
            value={!!item.value}
            onValueChange={() => handleSettingPress(item)}
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor="#ffffff"
          />
        ) : (
          <FontAwesome5 name="chevron-right" size={14} color={theme.colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      {/* Hero */}
      <LinearGradient
        colors={isDark ? ['#0B1020', '#0F172A'] : ['#E0E7FF', '#EEF2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>BeHappy</Text>
          <Text style={styles.heroTitle}>{pick(t.heroTitle)}</Text>
          <Text style={styles.heroSubtitle}>{pick(t.heroSubtitle)}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Featured shortcuts */}
        <View style={styles.featuresSection}>
          {features.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => router.push(f.route as any)}
              activeOpacity={0.9}
              style={styles.featureCard}
            >
              <LinearGradient colors={f.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureGradient}>
                <View style={styles.featureHeader}>
                  <View style={styles.featureIconWrap}>
                    <FontAwesome5 name={f.icon as any} size={18} color="#fff" />
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color="#fff" />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{pick(t.settings)}</Text>
          {settingsItems.map(renderSettingItem)}
        </View>

        {/* Language & Region */}
        <View style={styles.languageSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.sm }}>
            <FontAwesome5 name="globe" size={18} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>{pick(t.interfaceLanguage)}</Text>
          </View>
          <View style={styles.langChipsRow}>
            {([
              'en','ka','ru','hy','tr','az','es','de','fr','pt','id','it','ar','hi','zh','ja','ko','uk','pl'
            ] as AppLanguage[]).map((lng) => {
              const active = language === lng;
              return (
                <TouchableOpacity
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  activeOpacity={0.8}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                      borderColor: active ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '700' }}>{lng.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.langHint}>{pick(t.langHint)}</Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  heroContent: {
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.text,
  },
  heroSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scrollContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  featuresSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  featureCard: {
    borderRadius: theme.borderRadius.lg || 16,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  featureGradient: {
    padding: theme.spacing.lg,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255,255,255,0.9)',
  },
  settingsSection: {
    marginBottom: theme.spacing.lg,
  },
  languageSection: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  langChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  langChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
  },
  langHint: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  settingRight: {
    marginLeft: theme.spacing.sm,
  },
});
