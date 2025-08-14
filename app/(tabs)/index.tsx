import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  Image,
  StatusBar,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  isAvailable: boolean;
}

interface MoodEntry {
  id: string;
  emotion: string;
  intensity: number;
  timestamp: Date;
  note?: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: '1',
    title: 'ИИ Помощник',
    subtitle: 'Поговорить с психологом',
    icon: 'robot',
    color: '#6366F1',
    route: '/screens/ai-assistant',
    isAvailable: true
  },
  {
    id: '2',
    title: 'Дыхательные практики',
    subtitle: 'Снять стресс и напряжение',
    icon: 'leaf',
    color: '#10B981',
    route: '/screens/breathing',
    isAvailable: true
  },
  {
    id: '3',
    title: 'Медитация',
    subtitle: 'Найти внутренний покой',
    icon: 'meditation',
    color: '#8B5CF6',
    route: '/screens/meditation',
    isAvailable: true
  },
  {
    id: '4',
    title: 'Эмоциональный курс',
    subtitle: '20-дневное путешествие к себе',
    icon: 'school',
    color: '#F59E0B',
    route: '/screens/emotional-course',
    isAvailable: true
  },
  {
    id: '5',
    title: 'Трекер настроения',
    subtitle: 'Отслеживай эмоции',
    icon: 'chart-line',
    color: '#EF4444',
    route: '/screens/wellness-tracker',
    isAvailable: true
  },
  {
    id: '6',
    title: 'SOS Помощь',
    subtitle: 'Экстренная поддержка',
    icon: 'phone-alert',
    color: '#DC2626',
    route: '/screens/emergency',
    isAvailable: true
  }
];

const INSPIRING_QUOTES = [
  {
    text: "Эмоции - это не проблемы, которые нужно решить. Это переживания, которые нужно прочувствовать.",
    author: "Глеб Попов"
  },
  {
    text: "Между стимулом и реакцией есть пространство. В этом пространстве - наша сила выбирать свой ответ.",
    author: "Виктор Франкл"
  },
  {
    text: "Не то, что с тобой происходит, определяет твою жизнь, а то, как ты на это реагируешь.",
    author: "Эпиктет"
  },
  {
    text: "Самое важное открытие моего поколения: люди могут изменить свою жизнь, изменив свое отношение к ней.",
    author: "Уильям Джеймс"
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [currentQuote, setCurrentQuote] = useState(0);
  const [userProgress, setUserProgress] = useState({
    currentStreak: 0,
    completedDays: 0,
    totalDays: 20,
    todayMood: null as string | null
  });
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);

  // Анимации при загрузке
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Смена цитат каждые 10 секунд
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % INSPIRING_QUOTES.length);
    }, 10000);

    return () => clearInterval(quoteInterval);
  }, []);

  // Загрузка пользовательских данных
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // TODO: Implement course service integration
      setUserProgress({
        currentStreak: 3, // Mock data
        completedDays: 5,
        totalDays: 20,
        todayMood: null
      });

      // TODO: Load recent moods
      setRecentMoods([]);

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleQuickAction = async (action: QuickActionItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (action.isAvailable) {
      router.push(action.route as any);
    } else {
      // TODO: Show coming soon message
    }
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро! ☀️";
    if (hour < 17) return "Добрый день! 🌤️";
    return "Добрый вечер! 🌙";
  };

  const formatStreak = (days: number) => {
    if (days === 0) return "Начни свой путь";
    if (days === 1) return "1 день подряд";
    if (days < 5) return `${days} дня подряд`;
    return `${days} дней подряд`;
  };

  const QuickActionCard = ({ item }: { item: QuickActionItem }) => (
    <TouchableOpacity
      style={[
        styles.quickActionCard,
        { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
      ]}
      onPress={() => handleQuickAction(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[item.color + '20', item.color + '10']}
        style={styles.quickActionIconContainer}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={item.color}
        />
      </LinearGradient>
      
      <Text style={[
        styles.quickActionTitle,
        { color: isDark ? '#FFFFFF' : '#111827' }
      ]}>
        {item.title}
      </Text>
      
      <Text style={[
        styles.quickActionSubtitle,
        { color: isDark ? '#9CA3AF' : '#6B7280' }
      ]}>
        {item.subtitle}
      </Text>
    </TouchableOpacity>
  );

  const ProgressCard = () => {
    const progressPercentage = userProgress.totalDays > 0 
      ? (userProgress.completedDays / userProgress.totalDays) * 100 
      : 0;

    return (
      <View style={[
        styles.progressCard,
        { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
      ]}>
        <LinearGradient
          colors={isDark ? ['#6366F1', '#8B5CF6'] : ['#6366F1', '#8B5CF6']}
          style={styles.progressHeader}
        >
          <View style={styles.progressHeaderContent}>
            <Text style={styles.progressTitle}>Твой прогресс</Text>
            <Text style={styles.progressSubtitle}>Эмоциональный интеллект</Text>
          </View>
          <View style={styles.progressIconContainer}>
            <FontAwesome5 name="brain" size={24} color="#FFFFFF" />
          </View>
        </LinearGradient>

        <View style={styles.progressContent}>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={[
                styles.progressStatNumber,
                { color: isDark ? '#FFFFFF' : '#111827' }
              ]}>
                {userProgress.completedDays}
              </Text>
              <Text style={[
                styles.progressStatLabel,
                { color: isDark ? '#9CA3AF' : '#6B7280' }
              ]}>
                из {userProgress.totalDays} дней
              </Text>
            </View>

            <View style={styles.progressStat}>
              <Text style={[
                styles.progressStatNumber,
                { color: isDark ? '#FFFFFF' : '#111827' }
              ]}>
                {Math.round(progressPercentage)}%
              </Text>
              <Text style={[
                styles.progressStatLabel,
                { color: isDark ? '#9CA3AF' : '#6B7280' }
              ]}>
                завершено
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[
              styles.progressBarBackground,
              { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
            ]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: '#6366F1'
                  }
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/screens/emotional-course' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                {userProgress.completedDays === 0 ? 'Начать курс' : 'Продолжить'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const QuoteCard = () => (
    <View style={[
      styles.quoteCard,
      { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
    ]}>
      <View style={styles.quoteIconContainer}>
        <FontAwesome5 name="quote-left" size={20} color="#8B5CF6" />
      </View>
      
      <Text style={[
        styles.quoteText,
        { color: isDark ? '#E5E7EB' : '#374151' }
      ]}>
        {INSPIRING_QUOTES[currentQuote].text}
      </Text>
      
      <Text style={[
        styles.quoteAuthor,
        { color: isDark ? '#9CA3AF' : '#6B7280' }
      ]}>
        — {INSPIRING_QUOTES[currentQuote].author}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDark ? '#111827' : '#F9FAFB' }
    ]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[
              styles.greeting,
              { color: isDark ? '#FFFFFF' : '#111827' }
            ]}>
              {getCurrentGreeting()}
            </Text>
            <Text style={[
              styles.welcomeText,
              { color: isDark ? '#9CA3AF' : '#6B7280' }
            ]}>
              Как дела с эмоциями сегодня?
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.profileButton,
              { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
            ]}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Ionicons
              name="person"
              size={24}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>

        {/* Streak Card */}
        {userProgress.currentStreak > 0 && (
          <View style={[
            styles.streakCard,
            { backgroundColor: isDark ? '#065F46' : '#ECFDF5' }
          ]}>
            <View style={styles.streakContent}>
              <View style={styles.streakIcon}>
                <FontAwesome5 name="fire" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={[
                  styles.streakTitle,
                  { color: isDark ? '#D1FAE5' : '#065F46' }
                ]}>
                  🔥 {formatStreak(userProgress.currentStreak)}
                </Text>
                <Text style={[
                  styles.streakSubtitle,
                  { color: isDark ? '#A7F3D0' : '#047857' }
                ]}>
                  Продолжай в том же духе!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Progress Card */}
        <ProgressCard />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? '#FFFFFF' : '#111827' }
          ]}>
            Быстрые действия
          </Text>
          
          <FlatList
            data={QUICK_ACTIONS}
            renderItem={({ item }) => <QuickActionCard item={item} />}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.quickActionsRow}
            contentContainerStyle={styles.quickActionsContainer}
          />
        </View>

        {/* Inspirational Quote */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? '#FFFFFF' : '#111827' }
          ]}>
            Вдохновение дня
          </Text>
          <QuoteCard />
        </View>

        {/* Mood Check-in */}
        <View style={styles.section}>
          <View style={[
            styles.moodCheckCard,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
          ]}>
            <View style={styles.moodCheckHeader}>
              <FontAwesome5 name="smile" size={24} color="#F59E0B" />
              <Text style={[
                styles.moodCheckTitle,
                { color: isDark ? '#FFFFFF' : '#111827' }
              ]}>
                Как твое настроение?
              </Text>
            </View>
            
            <Text style={[
              styles.moodCheckSubtitle,
              { color: isDark ? '#9CA3AF' : '#6B7280' }
            ]}>
              Отметь свое эмоциональное состояние прямо сейчас
            </Text>

            <TouchableOpacity
              style={styles.moodCheckButton}
              onPress={() => router.push('/screens/wellness-tracker' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.moodCheckButtonGradient}
              >
                <Text style={styles.moodCheckButtonText}>Оценить настроение</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 80 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '400',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    marginRight: 12,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  streakSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressHeaderContent: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '400',
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContent: {
    padding: 20,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  continueButton: {
    marginTop: 4,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 0.48,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
  },
  quoteCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quoteIconContainer: {
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  moodCheckCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  moodCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodCheckTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  moodCheckSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
    lineHeight: 20,
  },
  moodCheckButton: {
    marginTop: 4,
  },
  moodCheckButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  moodCheckButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});
