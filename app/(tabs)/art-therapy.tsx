import ArtTherapyScreen from '@/components/ArtTherapyScreen';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PurchaseService from '@/services/purchase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Error boundary component for art therapy screen
class ArtTherapyErrorBoundary extends React.Component<
  { children: React.ReactNode; isDark: boolean; themeColors: any },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; isDark: boolean; themeColors: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Art Therapy Screen Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { isDark, themeColors } = this.props;
      return (
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
          style={styles.errorContainer}
        >
          <View style={[styles.errorCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)' }]}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorIcon}>🎨</Text>
            </View>
            <Text style={[styles.errorTitle, { color: themeColors.text }]}>Art Therapy</Text>
            <Text style={[styles.errorMessage, { color: themeColors.textSecondary }]}>
              Something magical went wrong. Let's restart this creative journey!
            </Text>
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Restoring creativity...</Text>
            </View>
          </View>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
  },
  errorCard: {
    borderRadius: 24,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  // Purchase gate styles - now using theme colors dynamically
  lockCard: {
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  payBtn: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  }
});

export default function ArtTherapyPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState<boolean>(false);

  const pick = (obj: Record<string, string>, lang: AppLanguage) => obj[lang] ?? obj.en;

  const t = {
    unlockTitle: {
      en: 'Unlock Art Therapy',
      ka: 'ხელოვნების თერაპიის გახსნა',
      ru: 'Открыть арт‑терапию',
      hy: 'Բացել արվեստաբուժությունը',
      tr: 'Sanat Terapisini Aç',
      az: 'İncəsənət terapiyasını aç',
      es: 'Desbloquear Arteterapia',
      de: 'Kunsttherapie freischalten',
      fr: 'Débloquer l’art‑thérapie',
      pt: 'Desbloquear Arteterapia',
      id: 'Buka Terapi Seni',
      it: 'Sblocca l’arteterapia',
      ar: 'افتح العلاج بالفن',
      hi: 'आर्ट थेरेपी अनलॉक करें',
      zh: '解锁艺术治疗',
      ja: 'アートセラピーを解放',
      ko: '아트 테라피 잠금 해제',
      uk: 'Відкрити арт‑терапію',
      pl: 'Odblokuj arteterapię'
    },
    unlockText: {
      en: 'Pay 50 ₾ to continue the session. You’ll keep access on this device.',
      ka: 'გადაიხადეთ 50 ₾ სესიის გასაგრძელებლად. წვდომა შენარჩუნდება ამ მოწყობილობაზე.',
      ru: 'Оплатите 50 ₾, чтобы продолжить сессию. Доступ сохранится на этом устройстве.',
      hy: 'Վճարեք 50 ₾՝ սեանսը շարունակելու համար։ Մուտքը կմնա այս սարքում։',
      tr: 'Seansı sürdürmek için 50 ₾ ödeyin. Bu cihazda erişiminiz korunur.',
      az: 'Seansı davam etdirmək üçün 50 ₾ ödəyin. Bu cihazda giriş saxlanılacaq.',
      es: 'Paga 50 ₾ para continuar la sesión. Mantendrás el acceso en este dispositivo.',
      de: 'Zahlen Sie 50 ₾, um die Sitzung fortzusetzen. Der Zugriff bleibt auf diesem Gerät.',
      fr: 'Payez 50 ₾ pour poursuivre la séance. Vous conserverez l’accès sur cet appareil.',
      pt: 'Pague 50 ₾ para continuar a sessão. Você manterá o acesso neste dispositivo.',
      id: 'Bayar 50 ₾ untuk melanjutkan sesi. Akses akan tetap di perangkat ini.',
      it: 'Paga 50 ₾ per continuare la sessione. Mantieni l’accesso su questo dispositivo.',
      ar: 'ادفع 50 ₾ لمتابعة الجلسة. سيبقى الوصول على هذا الجهاز.',
      hi: 'सत्र जारी रखने के लिए 50 ₾ का भुगतान करें। इस डिवाइस पर आपकी पहुंच बनी रहेगी।',
      zh: '支付 50 ₾ 继续会话。您将在此设备上保留访问权限。',
      ja: 'セッションを続行するには 50 ₾ をお支払いください。このデバイスでアクセスが維持されます。',
      ko: '세션을 계속하려면 50 ₾를 결제하세요. 이 기기에서 액세스가 유지됩니다.',
      uk: 'Сплатіть 50 ₾, щоб продовжити сесію. Доступ збережеться на цьому пристрої.',
      pl: 'Zapłać 50 ₾, aby kontynuować sesję. Dostęp zostanie zachowany na tym urządzeniu.'
    },
    unlockBtn: {
      en: 'Unlock for 50 ₾',
      ka: 'გახსნა 50 ₾-ად',
      ru: 'Открыть за 50 ₾',
      hy: 'Բացել 50 ₾-ով',
      tr: '50 ₾ karşılığında aç',
      az: '50 ₾ ilə aç',
      es: 'Desbloquear por 50 ₾',
      de: 'Für 50 ₾ freischalten',
      fr: 'Débloquer pour 50 ₾',
      pt: 'Desbloquear por 50 ₾',
      id: 'Buka seharga 50 ₾',
      it: 'Sblocca per 50 ₾',
      ar: 'افتح مقابل 50 ₾',
      hi: '50 ₾ में अनलॉक करें',
      zh: '50 ₾ 解锁',
      ja: '50 ₾ で解放',
      ko: '50 ₾로 잠금 해제',
      uk: 'Відкрити за 50 ₾',
      pl: 'Odblokuj za 50 ₾'
    }
  } as const;

  useEffect(() => {
    (async () => {
      const ok = await PurchaseService.isUnlocked('art-therapy');
      setUnlocked(ok);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <LinearGradient colors={isDark ? ["#1a1a2e", "#16213e", "#0f3460"] : ["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.lockCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.lockTitle, { color: theme.colors.text }]}>{pick(t.unlockTitle as any, language)}</Text>
          <Text style={[styles.lockText, { color: theme.colors.textSecondary }]}>{pick(t.unlockText as any, language)}</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/purchase', params: { product: 'art-therapy', amount: '50', currency: 'GEL', returnTo: '/art-therapy' } })}
            style={[styles.payBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.9}
          >
            <Text style={styles.payBtnText}>{pick(t.unlockBtn as any, language)}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <ArtTherapyErrorBoundary isDark={isDark} themeColors={theme.colors}>
      <ArtTherapyScreen />
    </ArtTherapyErrorBoundary>
  );
}
