import ArtTherapyCompletedList from '@/components/ArtTherapyCompletedList';
import { useLanguage } from '@/contexts/LanguageContext';
import ArtTherapyProgramManager, { ART_THERAPY_SESSIONS } from '@/services/artTherapyProgram';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ArtTherapySessions() {
  const router = useRouter();
  const { language } = useLanguage();
  const [unlocked, setUnlocked] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const status: Record<number, boolean> = {};
        const done: Record<number, boolean> = {};
        const progress = await ArtTherapyProgramManager.getProgress();
        for (const s of ART_THERAPY_SESSIONS) {
          status[s.id] = await ArtTherapyProgramManager.isSessionUnlocked(s.id);
          const p = progress.get(s.id);
          done[s.id] = p?.completed === true;
        }
        setUnlocked(status);
        setCompleted(done);

        // Determine current (first unlocked but not completed)
        const firstCurrent = ART_THERAPY_SESSIONS.find(s => status[s.id] && !done[s.id]);
        setCurrentId(firstCurrent ? firstCurrent.id : null);

        // Load completion percent
        const pct = await ArtTherapyProgramManager.getCompletionPercentage();
        setPercent(pct);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startOrContinue = (id: number) => {
    router.push({ pathname: '/art-therapy-session', params: { sessionId: String(id) } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>{language === 'ka' ? 'იტვირთება...' : language === 'ru' ? 'Загрузка...' : 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>{language === 'ka' ? 'არტ თერაპია' : language === 'ru' ? 'Арт-терапия' : 'Art Therapy'}</Text>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            {language === 'ka' ? `${percent}% დასრულებულია` : language === 'ru' ? `${percent}% завершено` : `${percent}% Complete`}
          </Text>
        </View>
      </View>

      {(() => {
        const current = currentId ? ART_THERAPY_SESSIONS.find(s => s.id === currentId) : null;
        const hasNext = currentId ? ART_THERAPY_SESSIONS.some(s => s.id === currentId + 1) : false;

        return (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {current ? (
              <View style={styles.heroCard}>
                <LinearGradient colors={[current.color + '26', '#FFFFFF']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.heroBg} />
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroIconWrap, { borderColor: current.color }]}>
                    <Text style={styles.heroIcon}>{current.icon}</Text>
                  </View>
                  <View style={styles.heroMeta}>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {((current.title as any)[language] ?? current.title.en) as string}
                    </Text>
                    <Text style={styles.heroSub} numberOfLines={1}>
                      ~{current.estimatedDuration} {(language === 'ka' ? 'წუთი' : language === 'ru' ? 'мин' : 'min')} · {((current.theme as any)[language] ?? current.theme.en) as string}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroDesc}>
                  {((current.description as any)[language] ?? current.description.en) as string}
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: current.color }]} onPress={() => startOrContinue(current.id)}>
                  <Text style={styles.primaryText}>{language === 'ka' ? 'სესიის დაწყება' : language === 'ru' ? 'Начать сеанс' : 'Start Session'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{language === 'ka' ? 'ყველა სესია დასრულებულია' : language === 'ru' ? 'Все сеансы завершены' : 'All sessions completed'}</Text>
                <Text style={styles.emptyText}>{language === 'ka' ? 'შეგიძლია გადახედო ჩატებს და შეჯამებებს.' : language === 'ru' ? 'Вы можете просмотреть чаты и резюме сеансов.' : 'You can review chats and summaries.'}</Text>
              </View>
            )}

            {hasNext && (
              <View style={styles.lockedNotice}>
                <Text style={styles.lockedEmoji}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTitle}>{language === 'ka' ? 'შემდეგი სესია დაბლოკილია' : language === 'ru' ? 'Следующий сеанс заблокирован' : 'Next session locked'}</Text>
                  <Text style={styles.lockedText}>{language === 'ka' ? 'გაიხსნება ამ სესიის დასრულების შემდეგ.' : language === 'ru' ? 'Откроется после завершения текущего сеанса.' : 'Unlocks after you complete this session.'}</Text>
                </View>
              </View>
            )}

            {/* Program marketing hint */}
            <View style={styles.marketingCard}>
              <Text style={styles.marketingTitle}>
                {language === 'ka' ? 'ხელოვნების თერაპიის 15-ნაბიჯიანი კურსი' : language === 'ru' ? '15‑шаговый курс арт‑терапии' : 'A 15‑step Art Therapy course'}
              </Text>
              <Text style={styles.marketingText}>
                {language === 'ka'
                  ? 'სტრუქტურირებული, უსაფრთხო და პრაქტიკული სესია-ბაზირებული გზა თვითშემეცნებისთვის და ემოციური რეგულაციისთვის.'
                  : language === 'ru'
                    ? 'Структурированный, безопасный и практический путь на основе сеансов для самопознания и эмоциональной регуляции.'
                    : 'A structured, safe, session-based path for self-discovery and emotion regulation.'}
              </Text>
              <Text style={styles.marketingText}>
                {language === 'ka'
                  ? 'არ საჭიროებს მხატვრობის ცოდნას. შენი შედეგები პირადულია და ყოველთვის შეგიძლია გადაახედო.'
                  : language === 'ru'
                    ? 'Навыки рисования не нужны. Результаты остаются конфиденциальными, и вы всегда можете к ним вернуться.'
                    : 'No art skills required. Your results are private and always available to revisit.'}
              </Text>
            </View>

            {/* Completed sessions history */}
            <ArtTherapyCompletedList />
          </ScrollView>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 12, color: '#6B7280' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  progressPill: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  progressText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  listContent: { padding: 16 },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginRight: 12 },
  heroIcon: { fontSize: 28 },
  heroMeta: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  heroSub: { marginTop: 4, color: '#6B7280', fontWeight: '600' },
  heroDesc: { marginTop: 12, color: '#374151', lineHeight: 20 },
  primaryBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  lockedNotice: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12 },
  lockedEmoji: { fontSize: 20, marginRight: 10 },
  lockedTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  lockedText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  emptyText: { marginTop: 6, color: '#6B7280' },
  marketingCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginVertical: 14 },
  marketingTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  marketingText: { color: '#374151', lineHeight: 20, marginTop: 2 },
});
