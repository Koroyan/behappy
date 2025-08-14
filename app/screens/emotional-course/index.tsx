import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Dimensions,
  Animated,
  ImageBackground,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import EmotionalCourseService from '@/services/emotionalCourseService';
import * as Haptics from 'expo-haptics';

// Интерфейс для прогресса пользователя
interface UserProgress {
  completedDays: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  totalExercises: number;
  completedExercises: number;
  startDate: string;
  lastActiveDate: string;
  skillLevels: {
    awareness: number; // 1-5
    regulation: number; // 1-5
    empathy: number; // 1-5
    motivation: number; // 1-5
  };
}

// Компонент для отдельной функции курса
const FeatureItem = ({ 
  icon, 
  title, 
  description, 
  isDark,
  delay = 0 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  isDark: boolean;
  delay?: number;
}) => {
  const [animValue] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.featureItem, 
        { 
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })
          }]
        }
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: isDark ? '#6366F1' : '#EEF2FF' }]}>
        <MaterialCommunityIcons 
          name={icon as any} 
          size={28} 
          color={isDark ? '#FFFFFF' : '#6366F1'} 
        />
      </View>
      <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        {title}
      </Text>
      <Text style={[styles.featureDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        {description}
      </Text>
    </Animated.View>
  );
};

// Компонент карточки достижения
const AchievementCard = ({ 
  title, 
  description, 
  icon, 
  color, 
  isDark,
  unlocked = false 
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  isDark: boolean;
  unlocked?: boolean;
}) => (
  <View style={[
    styles.achievementCard, 
    { 
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      opacity: unlocked ? 1 : 0.5
    }
  ]}>
    <LinearGradient
      colors={unlocked ? [color + '20', color + '10'] : ['#9CA3AF20', '#9CA3AF10']}
      style={styles.achievementIconBackground}
    >
      <FontAwesome5 
        name={icon} 
        size={24} 
        color={unlocked ? color : '#9CA3AF'} 
      />
    </LinearGradient>
    <Text style={[
      styles.achievementTitle, 
      { color: isDark ? '#FFFFFF' : '#111827' }
    ]}>
      {title}
    </Text>
    <Text style={[
      styles.achievementDescription, 
      { color: isDark ? '#CBD5E1' : '#4B5563' }
    ]}>
      {description}
    </Text>
    {unlocked && (
      <View style={[styles.unlockedBadge, { backgroundColor: color }]}>
        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        <Text style={styles.unlockedText}>Получено</Text>
      </View>
    )}
  </View>
);

// Компонент статистики
const StatCard = ({ 
  label, 
  value, 
  icon, 
  color, 
  isDark 
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  isDark: boolean;
}) => (
  <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
      {value}
    </Text>
    <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
      {label}
    </Text>
  </View>
);

export default function EmotionalCourseLanding() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [userProgress, setUserProgress] = useState<UserProgress>({
    completedDays: 0,
    totalDays: 20,
    currentStreak: 0,
    longestStreak: 0,
    totalExercises: 0,
    completedExercises: 0,
    startDate: new Date().toISOString(),
    lastActiveDate: new Date().toISOString(),
    skillLevels: {
      awareness: 1,
      regulation: 1,
      empathy: 1,
      motivation: 1
    }
  });
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [days, setDays] = useState<any[]>([]);
  const windowWidth = Dimensions.get('window').width;

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
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      )
    ]).start();
  }, []);

  // Загрузка прогресса пользователя
  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    try {
      const courseService = EmotionalCourseService.getInstance();
      const allDays = courseService.getAllDays();
      setDays(allDays);

      // Подсчитываем прогресс
      const completedDays = allDays.filter((day: any) => day.completed).length;
      const totalExercises = allDays.reduce((sum: number, day: any) => sum + day.exercises.length, 0);
      const completedExercises = allDays.reduce((sum: number, day: any) => 
        sum + (day.completed ? day.exercises.length : 0), 0
      );

      // Подсчитываем текущую серию
      let currentStreak = 0;
      const today = new Date();
      for (let i = allDays.length - 1; i >= 0; i--) {
        const day = allDays[i];
        if (day.completed) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Обновляем состояние прогресса
      setUserProgress(prev => ({
        ...prev,
        completedDays,
        totalDays: allDays.length,
        currentStreak,
        totalExercises,
        completedExercises,
        skillLevels: calculateSkillLevels(completedDays, completedExercises)
      }));

    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const calculateSkillLevels = (completedDays: number, completedExercises: number) => {
    const baseLevel = 1;
    const daysBonus = Math.floor(completedDays / 5);
    const exercisesBonus = Math.floor(completedExercises / 10);
    
    return {
      awareness: Math.min(5, baseLevel + daysBonus),
      regulation: Math.min(5, baseLevel + Math.floor(daysBonus * 0.8)),
      empathy: Math.min(5, baseLevel + Math.floor(daysBonus * 0.6)),
      motivation: Math.min(5, baseLevel + Math.floor(exercisesBonus / 2))
    };
  };

  const handleStartJourney = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (userProgress.completedDays === 0) {
      Alert.alert(
        '🌟 Добро пожаловать!',
        'Ты начинаешь увлекательное путешествие в мир эмоционального интеллекта. Готов к первому дню?',
        [
          { text: 'Я готов!', onPress: () => router.push('/screens/emotional-course/day-details?id=1') }
        ]
      );
    } else {
      // Найти следующий незавершенный день
      const nextDay = days.find((day: any) => !day.completed);
      if (nextDay) {
        router.push(`/screens/emotional-course/day-details?id=${nextDay.id}`);
      } else {
        Alert.alert(
          '🎉 Поздравляем!',
          'Ты завершил весь курс! Можешь продолжить изучать любой из дней для закрепления.',
          [{ text: 'ОК' }]
        );
      }
    }
  };

  const progressPercentage = userProgress.totalDays > 0 
    ? (userProgress.completedDays / userProgress.totalDays) * 100 
    : 0;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
      <Animated.ScrollView 
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={isDark ? ['#1F2937', '#111827'] : ['#EEF2FF', '#F8FAFC']}
          style={styles.heroSection}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop' }}
            style={styles.heroBackground}
            imageStyle={{ opacity: 0.1, borderRadius: 20 }}
          >
            <View style={styles.heroContent}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.heroIcon}
                >
                  <MaterialCommunityIcons name="brain" size={40} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={[styles.heroTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Эмоциональный{'\n'}Интеллект
              </Text>
              
              <Text style={[styles.heroSubtitle, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
                Научись понимать и управлять своими эмоциями с помощью персонального AI-наставника
              </Text>

              {/* Progress Ring */}
              <View style={styles.progressContainer}>
                <View style={styles.progressRing}>
                  <Text style={[styles.progressPercent, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    {Math.round(progressPercentage)}%
                  </Text>
                  <Text style={[styles.progressLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    завершено
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.startButton} onPress={handleStartJourney}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {userProgress.completedDays === 0 ? '🚀 Начать путешествие' : '📚 Продолжить курс'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </LinearGradient>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            📊 Твоя статистика
          </Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              label="Дней завершено"
              value={userProgress.completedDays}
              icon="calendar-outline"
              color="#10B981"
              isDark={isDark}
            />
            <StatCard
              label="Текущая серия"
              value={`${userProgress.currentStreak} 🔥`}
              icon="flame-outline"
              color="#F59E0B"
              isDark={isDark}
            />
            <StatCard
              label="Упражнений"
              value={userProgress.completedExercises}
              icon="fitness-outline"
              color="#6366F1"
              isDark={isDark}
            />
            <StatCard
              label="Навыки развиты"
              value={`${Object.values(userProgress.skillLevels).reduce((a, b) => a + b, 0)}/20`}
              icon="trophy-outline"
              color="#EC4899"
              isDark={isDark}
            />
          </View>
        </View>

        {/* Skill Levels */}
        <View style={styles.skillsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            🧠 Развитие навыков
          </Text>
          
          <View style={styles.skillsList}>
            {[
              { key: 'awareness', label: 'Осознанность', icon: 'eye-outline', color: '#10B981' },
              { key: 'regulation', label: 'Саморегуляция', icon: 'settings-outline', color: '#6366F1' },
              { key: 'empathy', label: 'Эмпатия', icon: 'heart-outline', color: '#EC4899' },
              { key: 'motivation', label: 'Мотивация', icon: 'rocket-outline', color: '#F59E0B' }
            ].map((skill, index) => (
              <View key={skill.key} style={[styles.skillItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                <View style={[styles.skillIcon, { backgroundColor: skill.color + '20' }]}>
                  <Ionicons name={skill.icon as any} size={20} color={skill.color} />
                </View>
                <View style={styles.skillInfo}>
                  <Text style={[styles.skillLabel, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    {skill.label}
                  </Text>
                  <View style={styles.skillLevelContainer}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.skillDot,
                          {
                            backgroundColor: level <= userProgress.skillLevels[skill.key as keyof typeof userProgress.skillLevels]
                              ? skill.color
                              : isDark ? '#374151' : '#E5E7EB'
                          }
                        ]}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.skillLevel, { color: skill.color }]}>
                  {userProgress.skillLevels[skill.key as keyof typeof userProgress.skillLevels]}/5
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            ✨ Что тебя ждет
          </Text>
          
          <View style={styles.featuresGrid}>
            <FeatureItem
              icon="robot-outline"
              title="AI-наставник"
              description="Персональный помощник, который адаптируется под твой стиль обучения"
              isDark={isDark}
              delay={100}
            />
            <FeatureItem
              icon="meditation"
              title="Практики"
              description="Медитации, дыхательные упражнения и техники осознанности"
              isDark={isDark}
              delay={200}
            />
            <FeatureItem
              icon="chart-line"
              title="Прогресс"
              description="Отслеживание развития навыков и личной статистики"
              isDark={isDark}
              delay={300}
            />
            <FeatureItem
              icon="notebook-outline"
              title="Дневник"
              description="Записывай инсайты и отслеживай эмоциональные паттерны"
              isDark={isDark}
              delay={400}
            />
            <FeatureItem
              icon="school-outline"
              title="Научный подход"
              description="Методы, основанные на исследованиях в области психологии"
              isDark={isDark}
              delay={500}
            />
            <FeatureItem
              icon="heart-multiple-outline"
              title="Поддержка"
              description="Постоянное сопровождение на пути эмоционального развития"
              isDark={isDark}
              delay={600}
            />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            🏆 Достижения
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            <AchievementCard
              title="Первый шаг"
              description="Завершить первый день курса"
              icon="baby"
              color="#10B981"
              isDark={isDark}
              unlocked={userProgress.completedDays >= 1}
            />
            <AchievementCard
              title="Неделя силы"
              description="7 дней подряд"
              icon="fire"
              color="#F59E0B"
              isDark={isDark}
              unlocked={userProgress.currentStreak >= 7}
            />
            <AchievementCard
              title="Мастер практик"
              description="Выполнить 50 упражнений"
              icon="trophy"
              color="#6366F1"
              isDark={isDark}
              unlocked={userProgress.completedExercises >= 50}
            />
            <AchievementCard
              title="Эмоциональный гуру"
              description="Завершить весь курс"
              icon="crown"
              color="#EC4899"
              isDark={isDark}
              unlocked={userProgress.completedDays >= userProgress.totalDays}
            />
          </ScrollView>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#111827'] : ['#F3F4F6', '#FFFFFF']}
            style={styles.ctaCard}
          >
            <Text style={[styles.ctaTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Готов изменить свою жизнь?
            </Text>
            <Text style={[styles.ctaDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Эмоциональный интеллект — это ключ к успеху в личных отношениях, карьере и общем благополучии.
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={handleStartJourney}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.ctaButtonGradient}
              >
                <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFFFFF" />
                <Text style={styles.ctaButtonText}>
                  {userProgress.completedDays === 0 ? 'Начать сейчас' : 'Продолжить'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    padding: 20,
    paddingTop: 40,
  },
  heroBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 320,
  },
  heroContent: {
    alignItems: 'center',
    padding: 30,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
  },
  startButton: {
    width: '100%',
    maxWidth: 280,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsSection: {
    paddingVertical: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  skillsSection: {
    paddingVertical: 30,
  },
  skillsList: {
    paddingHorizontal: 20,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  skillIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  skillInfo: {
    flex: 1,
  },
  skillLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  skillLevelContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  skillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    paddingVertical: 30,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  featureItem: {
    width: (width - 56) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  achievementsSection: {
    paddingVertical: 30,
  },
  achievementsScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  achievementCard: {
    width: 180,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementIconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  ctaCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  ctaButton: {
    width: '100%',
    maxWidth: 200,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
