import ArtTherapyScreen from '@/components/ArtTherapyScreen';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PurchaseService from '@/services/purchase';
import SubscriptionService from '@/services/subscriptionService';
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
      en: 'Unlock beHappy Premium',
      ka: 'გახსენი beHappy Premium',
      ru: 'Открой beHappy Premium',
    },
    unlockText: {
      en: 'You’ve used your free session. Get unlimited access to Art Therapy and every other tool with a Premium plan.',
      ka: 'უფასო სესია უკვე გამოყენებულია. მიიღე შეუზღუდავი წვდომა არტ თერაპიასა და ყველა სხვა ხელსაწყოზე Premium პაკეტით.',
      ru: 'Бесплатная сессия уже использована. Получи безлимитный доступ к арт-терапии и другим инструментам с Premium.',
    },
    unlockBtn: {
      en: 'See Premium plans',
      ka: 'ნახე Premium პაკეტები',
      ru: 'Смотреть тарифы Premium',
    }
  } as const;

  useEffect(() => {
    (async () => {
      // Legacy one-off unlock stays honored for anyone who already paid the old way.
      const legacyUnlocked = await PurchaseService.isUnlocked('art-therapy');
      if (legacyUnlocked) {
        setUnlocked(true);
        setLoading(false);
        return;
      }

      // Whether they can open the course at all: the free first session hasn't been
      // used yet, or they're Premium (even if today's single session is already spent —
      // they should still see their progress, not a hard paywall; the per-session gate
      // inside ArtTherapyScreen enforces the daily cap when they try to start a new one).
      const freeUsed = await SubscriptionService.hasUsedArtTherapyFreeSession();
      const premiumActive = await SubscriptionService.isPremiumActive();
      setUnlocked(!freeUsed || premiumActive);
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
            onPress={() => router.push({ pathname: '/subscription', params: { returnTo: '/art-therapy' } })}
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
