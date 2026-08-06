import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import SubscriptionService, { Plan, PlanId, PLANS } from '@/services/subscriptionService';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Dict = Record<string, string>;
const pick = (obj: Dict, lang: AppLanguage): string => obj[lang] ?? obj.en;

const T = {
  kicker: { en: 'BEHAPPY PREMIUM', ka: 'BEHAPPY PREMIUM', ru: 'BEHAPPY PREMIUM' } as Dict,
  launchBadge: { en: 'LAUNCH PRICE · -35%', ka: 'გაშვების ფასი · -35%', ru: 'ЦЕНА ЗАПУСКА · -35%' } as Dict,
  heroTitle: {
    en: 'Unlock everything\nin beHappy',
    ka: 'გახსენი ყველაფერი\nbeHappy-ში',
    ru: 'Открой всё\nв beHappy',
  } as Dict,
  heroSubtitle: {
    en: 'AI chat, the Art Therapy course and Card Therapy — one plan, real daily allowances, an early-user discount.',
    ka: 'AI ჩათი, არტ თერაპიის კურსი და ბარათების თერაპია — ერთი პაკეტი, რეალური დღიური ლიმიტები, ადრეული მომხმარებლის ფასდაკლება.',
    ru: 'AI-чат, курс арт-терапии и терапия картами — один план, реальные дневные лимиты, скидка для первых пользователей.',
  } as Dict,
  includedTitle: {
    en: 'What Premium gives you every day',
    ka: 'რას იძლევა Premium ყოველდღე',
    ru: 'Что даёт Premium каждый день',
  } as Dict,
  perks: {
    aiChat: {
      title: { en: 'AI Therapy Chat', ka: 'AI თერაპია ჩათი', ru: 'AI-чат терапии' },
      desc: {
        en: 'A generous daily allowance for real conversations with Dr. Pijilo',
        ka: 'გულუხვი დღიური ლიმიტი დოქტორ პიჯილოსთან საუბრისთვის',
        ru: 'Щедрый дневной лимит для настоящих разговоров с доктором Пиджило',
      },
    },
    art: {
      title: { en: 'Art Therapy course', ka: 'არტ თერაპიის კურსი', ru: 'Курс арт-терапии' },
      desc: {
        en: '1 new session a day — a guided, structured path, not a rush',
        ka: '1 ახალი სესია დღეში — სტრუქტურირებული გზა, ჩქარობის გარეშე',
        ru: '1 новая сессия в день — структурированный путь, без спешки',
      },
    },
    cards: {
      title: { en: 'Cards Therapy', ka: 'ბარათების თერაპია', ru: 'Терапия картами' },
      desc: {
        en: '1 card reading a day, Premium-only from day one',
        ka: '1 ბარათების სესია დღეში, ხელმისაწვდომია მხოლოდ Premium-ით',
        ru: '1 сессия с картами в день, доступно только с Premium',
      },
    },
  },
  journalNote: {
    en: 'Journal (1 entry/day) is always free — no Premium needed.',
    ka: 'ჟურნალი (1 ჩანაწერი/დღეში) ყოველთვის უფასოა — Premium არ სჭირდება.',
    ru: 'Дневник (1 запись/день) всегда бесплатен — Premium не нужен.',
  } as Dict,
  choosePlan: { en: 'Choose your plan', ka: 'აირჩიე პაკეტი', ru: 'Выбери план' } as Dict,
  perMonth: { en: '/mo', ka: '/თვე', ru: '/мес' } as Dict,
  billedAs: {
    en: (p: Plan) => `Billed ${p.price} ${p.currency} every ${p.months === 1 ? 'month' : `${p.months} months`}`,
    ka: (p: Plan) => `ჯამში ${p.price} ${p.currency} ${p.months === 1 ? 'ყოველთვიურად' : `${p.months} თვეში`}`,
    ru: (p: Plan) => `Списывается ${p.price} ${p.currency} раз в ${p.months === 1 ? 'месяц' : `${p.months} мес.`}`,
  } as unknown as Record<string, (p: Plan) => string>,
  planName: {
    monthly: { en: 'Monthly', ka: 'თვიური', ru: 'Месячный' },
    quarterly: { en: '3 Months', ka: '3 თვიანი', ru: '3 месяца' },
    yearly: { en: 'Yearly', ka: 'წლიური', ru: 'Годовой' },
  } as Record<PlanId, Dict>,
  badgePopular: { en: 'MOST POPULAR', ka: 'ყველაზე პოპულარული', ru: 'САМЫЙ ПОПУЛЯРНЫЙ' } as Dict,
  badgeBest: { en: 'BEST VALUE', ka: 'საუკეთესო ფასი', ru: 'ВЫГОДНЕЕ ВСЕГО' } as Dict,
  regularWas: { en: 'Regular', ka: 'რეგულარული', ru: 'Обычная цена' } as Dict,
  trustSecure: { en: 'Secure card payment', ka: 'დაცული გადახდა ბარათით', ru: 'Безопасная оплата картой' } as Dict,
  trustInstant: { en: 'Instant unlock', ka: 'დაუყოვნებლივი გახსნა', ru: 'Мгновенная активация' } as Dict,
  trustNoAutoRenew: {
    en: 'Fixed term, no surprise charges',
    ka: 'ფიქსირებული ვადა, დამატებითი ჩამოჭრები არ არის',
    ru: 'Фиксированный срок, без автосписаний',
  } as Dict,
  ctaPay: { en: 'Continue', ka: 'გაგრძელება', ru: 'Продолжить' } as Dict,
  alreadyPremiumTitle: {
    en: 'You’re Premium',
    ka: 'შენ გაქვს Premium',
    ru: 'У тебя есть Premium',
  } as Dict,
  alreadyPremiumUntil: {
    en: (d: string) => `Full access active until ${d}`,
    ka: (d: string) => `სრული წვდომა აქტიურია ${d}-მდე`,
    ru: (d: string) => `Полный доступ активен до ${d}`,
  } as unknown as Record<string, (d: string) => string>,
  continueToApp: { en: 'Continue to app', ka: 'გაგრძელება აპში', ru: 'Продолжить в приложение' } as Dict,
  footnote: {
    en: 'One-time payment per period via secure card checkout. No hidden recurring charges — renew manually whenever you like. Launch price available for a limited time; regular price applies after.',
    ka: 'ერთჯერადი გადახდა პერიოდზე, დაცული ბარათით გადახდის საშუალებით. ფარული განმეორებადი ჩამოჭრები არ არსებობს — განაახლე ხელით, როცა მოისურვებ. გაშვების ფასი მოქმედებს შეზღუდული დროით, შემდეგ ვრცელდება რეგულარული ფასი.',
    ru: 'Единоразовая оплата за период через безопасный чек-аут картой. Никаких скрытых автосписаний — продлевай вручную, когда захочешь. Цена запуска действует ограниченное время, затем — обычная цена.',
  } as Dict,
};

export default function SubscriptionPage() {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = params.returnTo || '/(tabs)';

  const [loading, setLoading] = useState(true);
  const [premiumActive, setPremiumActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('quarterly');
  const [processing, setProcessing] = useState(false);

  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    (async () => {
      const active = await SubscriptionService.isPremiumActive();
      setPremiumActive(active);
      setExpiresAt(active ? await SubscriptionService.getExpiresAt() : null);
      setLoading(false);
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    })();
  }, []);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  const bgGradient = isDark
    ? (['#1a1a2e', '#16213e', '#0f3460'] as const)
    : (['#667eea', '#764ba2', '#f093fb'] as const);

  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)';
  const textPrimary = '#FFFFFF';
  const textSecondary = isDark ? 'rgba(229,231,235,0.85)' : 'rgba(255,255,255,0.9)';
  const gold = '#FBBF24';

  const fmt = (n: number) => n.toFixed(n % 1 === 0 ? 0 : 2);

  const selectPlan = async (id: PlanId) => {
    await Haptics.selectionAsync().catch(() => {});
    setSelectedPlan(id);
  };

  const goPurchase = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/purchase',
      params: {
        product: plan.id,
        amount: String(plan.price),
        currency: plan.currency,
        returnTo: String(returnTo),
      },
    } as any);
  };

  const continueToApp = () => router.replace(returnTo as any);

  if (loading) {
    return (
      <LinearGradient colors={bgGradient} style={styles.flex}>
        <SafeAreaView style={[styles.flex, styles.center]}>
          <ActivityIndicator size="large" color="#fff" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={bgGradient} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={continueToApp} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            {/* Hero */}
            <View style={styles.heroWrap}>
              <View style={[styles.crownCircle, { borderColor: 'rgba(251,191,36,0.5)' }]}>
                <MaterialCommunityIcons name="crown" size={34} color={gold} />
              </View>
              <Text style={[styles.kicker, { color: gold }]}>{pick(T.kicker, language)}</Text>
              {!premiumActive && (
                <View style={styles.launchBadge}>
                  <Ionicons name="flash" size={12} color="#111827" />
                  <Text style={styles.launchBadgeText}>{pick(T.launchBadge, language)}</Text>
                </View>
              )}
              <Text style={[styles.heroTitle, { color: textPrimary }]}>{pick(T.heroTitle, language)}</Text>
              <Text style={[styles.heroSubtitle, { color: textSecondary }]}>{pick(T.heroSubtitle, language)}</Text>
            </View>

            {premiumActive ? (
              <View style={[styles.premiumStatusCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.premiumStatusIconWrap}>
                  <Ionicons name="checkmark-circle" size={28} color="#34D399" />
                </View>
                <Text style={[styles.premiumStatusTitle, { color: textPrimary }]}>{pick(T.alreadyPremiumTitle, language)}</Text>
                {expiresAt && (
                  <Text style={[styles.premiumStatusSub, { color: textSecondary }]}>
                    {(T.alreadyPremiumUntil as any)[language]
                      ? (T.alreadyPremiumUntil as any)[language](new Date(expiresAt).toLocaleDateString())
                      : (T.alreadyPremiumUntil as any).en(new Date(expiresAt).toLocaleDateString())}
                  </Text>
                )}
                <TouchableOpacity onPress={continueToApp} activeOpacity={0.9} style={styles.primaryBtnWrap}>
                  <LinearGradient colors={['#34D399', '#10B981']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.primaryBtnText}>{pick(T.continueToApp, language)}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#062b21" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* What's included — real daily allowances, not vague "unlimited" */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>{pick(T.includedTitle, language)}</Text>
              <View style={{ gap: 10 }}>
                {([
                  { key: 'aiChat', pack: 'fa', name: 'brain', gradient: ['#6366F1', '#8B5CF6'] as [string, string] },
                  { key: 'art', pack: 'fa', name: 'palette', gradient: ['#EC4899', '#8B5CF6'] as [string, string] },
                  { key: 'cards', pack: 'fa', name: 'clone', gradient: ['#22D3EE', '#06B6D4'] as [string, string] },
                ] as const).map((perk) => (
                  <View key={perk.key} style={[styles.perkRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <LinearGradient colors={perk.gradient} style={styles.perkIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <FontAwesome5 name={perk.name} size={16} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.perkTitle, { color: textPrimary }]}>{pick(T.perks[perk.key].title, language)}</Text>
                      <Text style={[styles.perkDesc, { color: textSecondary }]}>{pick(T.perks[perk.key].desc, language)}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                  </View>
                ))}
              </View>
              <Text style={[styles.journalNote, { color: textSecondary }]}>
                <Ionicons name="book-outline" size={12} color={textSecondary as string} /> {pick(T.journalNote, language)}
              </Text>
            </View>

            {/* Plans */}
            {!premiumActive && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>{pick(T.choosePlan, language)}</Text>
                <View style={{ gap: 12 }}>
                  {PLANS.map((p) => {
                    const selected = p.id === selectedPlan;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        activeOpacity={0.9}
                        onPress={() => selectPlan(p.id)}
                        style={[
                          styles.planCard,
                          {
                            backgroundColor: selected ? 'rgba(251,191,36,0.14)' : cardBg,
                            borderColor: selected ? gold : cardBorder,
                            borderWidth: selected ? 2 : 1,
                          },
                        ]}
                      >
                        {p.badge && (
                          <View style={[styles.planBadge, { backgroundColor: p.badge === 'popular' ? '#8B5CF6' : gold }]}>
                            <Text style={[styles.planBadgeText, { color: p.badge === 'popular' ? '#fff' : '#111827' }]}>
                              {pick(p.badge === 'popular' ? T.badgePopular : T.badgeBest, language)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.planRow}>
                          <View style={[styles.radio, { borderColor: selected ? gold : 'rgba(255,255,255,0.5)' }]}>
                            {selected && <View style={[styles.radioDot, { backgroundColor: gold }]} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.planName, { color: textPrimary }]}>{pick(T.planName[p.id], language)}</Text>
                            <Text style={[styles.planSub, { color: textSecondary }]}>
                              {(T.billedAs as any)[language] ? (T.billedAs as any)[language](p) : (T.billedAs as any).en(p)}
                            </Text>
                          </View>
                          <View style={styles.planPriceWrap}>
                            <Text style={[styles.planRegularPrice, { color: textSecondary }]}>
                              {fmt(p.regularPricePerMonth)} {p.currency}
                            </Text>
                            <Text style={[styles.planPrice, { color: textPrimary }]}>
                              {fmt(p.pricePerMonth)} {p.currency}
                              <Text style={styles.planPriceUnit}>{pick(T.perMonth, language)}</Text>
                            </Text>
                            <Text style={[styles.planSave, { color: '#34D399' }]}>-{p.discountPercent}%</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Trust badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <FontAwesome5 name="shield-alt" size={13} color={gold} />
                <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustSecure, language)}</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="flash" size={15} color={gold} />
                <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustInstant, language)}</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="calendar-outline" size={14} color={gold} />
                <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustNoAutoRenew, language)}</Text>
              </View>
            </View>

            {!premiumActive && (
              <Text style={[styles.footnote, { color: textSecondary }]}>{pick(T.footnote, language)}</Text>
            )}
          </Animated.View>
        </ScrollView>

        {/* Sticky CTA */}
        {!premiumActive && (
          <View style={[styles.stickyBar, { backgroundColor: isDark ? 'rgba(15,20,35,0.92)' : 'rgba(30,20,60,0.85)', borderTopColor: cardBorder }]}>
            <TouchableOpacity onPress={goPurchase} activeOpacity={0.9} disabled={processing}>
              <LinearGradient colors={['#FBBF24', '#F59E0B']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.ctaBtnText}>
                  {pick(T.ctaPay, language)} · {plan.price} {plan.currency}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#111827" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  heroWrap: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  crownCircle: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1.5, marginBottom: 14,
  },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  launchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FBBF24',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
  },
  launchBadgeText: { color: '#111827', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 33 },
  heroSubtitle: { fontSize: 14.5, textAlign: 'center', lineHeight: 21, marginTop: 12, paddingHorizontal: 8 },
  premiumStatusCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 24,
  },
  premiumStatusIconWrap: { marginBottom: 8 },
  premiumStatusTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  premiumStatusSub: { fontSize: 13, marginBottom: 16, textAlign: 'center' },
  primaryBtnWrap: { width: '100%' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14,
  },
  primaryBtnText: { color: '#062b21', fontWeight: '800', fontSize: 15 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  perkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  perkIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { fontSize: 14, fontWeight: '800' },
  perkDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  journalNote: { fontSize: 11.5, marginTop: 10, textAlign: 'center', opacity: 0.9 },
  planCard: { borderRadius: 18, padding: 16, position: 'relative', overflow: 'hidden' },
  planBadge: {
    position: 'absolute', top: 0, right: 16, paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
  planBadgeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  planName: { fontSize: 15.5, fontWeight: '800' },
  planSub: { fontSize: 12, marginTop: 2 },
  planPriceWrap: { alignItems: 'flex-end' },
  planRegularPrice: { fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through', opacity: 0.8 },
  planPrice: { fontSize: 16, fontWeight: '800' },
  planPriceUnit: { fontSize: 11, fontWeight: '600' },
  planSave: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11.5, fontWeight: '600' },
  footnote: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 12, opacity: 0.9 },
  stickyBar: { padding: 16, borderTopWidth: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16,
  },
  ctaBtnText: { color: '#111827', fontWeight: '800', fontSize: 16 },
});
