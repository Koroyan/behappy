import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Animated,
  Dimensions,
  ImageBackground,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { CourseDay } from '@/services/emotionalCourseService';
import EmotionalCourseService from '@/services/emotionalCourseService';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

interface CourseStats {
  totalDays: number;
  completedDays: number;
  currentStreak: number;
  totalMinutes: number;
}

// Компонент красивой статистики
const StatsHeader = ({ 
  stats, 
  progress, 
  isDark 
}: { 
  stats: CourseStats; 
  progress: number; 
  isDark: boolean; 
}) => {
  const [progressAnim] = useState(new Animated.Value(0));
  const [bounceAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Bounce effect для статистики
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress]);

  return (
    <Animated.View 
      style={[
        styles.statsContainer,
        { transform: [{ scale: bounceAnim }] }
      ]}
    >
      <LinearGradient
        colors={isDark ? 
          ['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)'] : 
          ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']
        }
        style={styles.statsCard}
      >
        {/* Заголовок */}
        <View style={styles.statsHeader}>
          <Text style={[styles.statsTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            🧠 Твой прогресс
          </Text>
          <Text style={[styles.statsSubtitle, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            Развитие эмоционального интеллекта
          </Text>
        </View>

        {/* Круглый прогресс бар */}
        <View style={styles.progressRingContainer}>
          <View style={styles.progressRing}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [{
                    rotate: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                },
              ]}
            />
            <View style={styles.progressInner}>
              <Text style={[styles.progressPercent, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {Math.round(progress * 100)}%
              </Text>
              <Text style={[styles.progressLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                завершено
              </Text>
            </View>
          </View>
        </View>

        {/* Статистические карточки */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}>
            <MaterialCommunityIcons name="calendar-check" size={20} color="#10B981" />
            <Text style={[styles.statNumber, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {stats.completedDays}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              дней пройдено
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}>
            <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
            <Text style={[styles.statNumber, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              серия дней
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#6366F1" />
            <Text style={[styles.statNumber, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {stats.totalMinutes}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              минут практик
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Компонент анимированной карточки дня
const DayCard = ({ 
  item, 
  index, 
  onPress, 
  isDark 
}: { 
  item: CourseDay; 
  index: number; 
  onPress: (day: CourseDay) => void; 
  isDark: boolean; 
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [glowAnim] = useState(new Animated.Value(0));

  const isLocked = !item.isDayUnlocked || false;
  const isCompleted = item.completed;
  const completedExercises = item.completed ? item.exercises.length : 0;
  const totalExercises = item.exercises.length;
  const exerciseProgress = totalExercises > 0 ? (completedExercises / totalExercises) : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [index, isCompleted]);

  const handlePress = () => {
    if (isLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        '🔒 День заблокирован',
        'Завершите предыдущий день, чтобы разблокировать этот.',
        [{ text: 'Понятно' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(item);
  };

  const getDayStatusIcon = () => {
    if (isCompleted) return 'check-circle';
    if (isLocked) return 'lock';
    if (completedExercises > 0) return 'clock-outline';
    return 'play-circle-outline';
  };

  const getDayStatusColor = () => {
    if (isCompleted) return '#10B981';
    if (isLocked) return '#9CA3AF';
    if (completedExercises > 0) return '#F59E0B';
    return '#6366F1';
  };

  return (
    <Animated.View
      style={[
        styles.dayCardContainer,
        {
          opacity: scaleAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.dayCard,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            opacity: isLocked ? 0.6 : 1,
          },
        ]}
      >
        {/* Фоновый градиент для завершенных дней */}
        {isCompleted && (
          <Animated.View
            style={[
              styles.completedGlow,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 0.3],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        )}

        {/* Заголовок дня */}
        <View style={styles.dayHeader}>
          <View style={styles.dayTitleContainer}>
            <Text style={[styles.dayEmoji, { opacity: isLocked ? 0.5 : 1 }]}>
              {item.emoji}
            </Text>
            <View style={styles.dayTitleText}>
              <Text style={[styles.dayTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {item.title}
              </Text>
              <Text style={[styles.dayNumber, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                День {item.id}
              </Text>
            </View>
          </View>

          <View style={[styles.dayStatus, { backgroundColor: getDayStatusColor() + '20' }]}>
            <Ionicons
              name={getDayStatusIcon() as any}
              size={20}
              color={getDayStatusColor()}
            />
          </View>
        </View>

        {/* Описание */}
        <Text style={[styles.dayDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          {item.description}
        </Text>

        {/* Прогресс упражнений */}
        <View style={styles.exerciseProgress}>
          <View style={styles.exerciseProgressInfo}>
            <Text style={[styles.exerciseProgressText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Упражнений: {completedExercises}/{totalExercises}
            </Text>
            <Text style={[styles.exerciseProgressPercent, { color: getDayStatusColor() }]}>
              {Math.round(exerciseProgress * 100)}%
            </Text>
          </View>
          
          <View style={[styles.exerciseProgressBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <Animated.View
              style={[
                styles.exerciseProgressFill,
                {
                  backgroundColor: getDayStatusColor(),
                  width: `${exerciseProgress * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Время занятий */}
        <View style={styles.dayFooter}>
          <View style={styles.dayTime}>
            <Ionicons name="time-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.dayTimeText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              ~{item.exercises.reduce((sum, ex) => sum + ex.duration, 0)} мин
            </Text>
          </View>

          {!isLocked && (
            <View style={styles.dayAction}>
              <Text style={[styles.dayActionText, { color: getDayStatusColor() }]}>
                {isCompleted ? 'Повторить' : completedExercises > 0 ? 'Продолжить' : 'Начать'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={getDayStatusColor()} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function EmotionalCourseDays() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [days, setDays] = useState<CourseDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<CourseStats>({
    totalDays: 0,
    completedDays: 0,
    currentStreak: 0,
    totalMinutes: 0,
  });
  const [progress, setProgress] = useState<number>(0);
  const [headerAnim] = useState(new Animated.Value(0));

  // Анимация заголовка
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Загрузка данных
  const loadDays = useCallback(async () => {
    try {
      const courseService = EmotionalCourseService.getInstance();
      const courseDays = courseService.getAllDays();
      setDays(courseDays);
      
      // Вычисляем статистику
      const completedCount = courseDays.filter((day: any) => day.completed).length;
      const totalMinutes = courseDays.reduce((sum: number, day: any) => 
        sum + day.exercises.reduce((exSum: number, ex: any) => exSum + 15, 0), 0
      );
      
      // Вычисляем серию
      let currentStreak = 0;
      for (let i = courseDays.length - 1; i >= 0; i--) {
        if (courseDays[i].completed) {
          currentStreak++;
        } else {
          break;
        }
      }

      const newStats = {
        totalDays: courseDays.length,
        completedDays: completedCount,
        currentStreak,
        totalMinutes,
      };

      setStats(newStats);
      setProgress(courseDays.length > 0 ? completedCount / courseDays.length : 0);
      
    } catch (error) {
      console.error('Error loading course days:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные курса. Попробуйте еще раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Загрузка при монтировании и возвращении на экран
  useEffect(() => {
    loadDays();
  }, [loadDays]);

  useFocusEffect(
    useCallback(() => {
      loadDays();
    }, [loadDays])
  );

  // Обновление по swipe
  const handleRefresh = () => {
    setRefreshing(true);
    loadDays();
  };

  // Обработчик нажатия на день
  const handleDayPress = (day: CourseDay) => {
    router.push({
      pathname: '/screens/emotional-course/day-details',
      params: { id: day.id }
    } as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop' }}
          style={styles.backgroundImage}
          imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
        >
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={[styles.loadingText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
                Загружаем твой курс...
              </Text>
            </View>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop' }}
        style={styles.backgroundImage}
        imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
      >
        {/* Заголовок */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }]
            }
          ]}
        >
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            Эмоциональный Интеллект
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            21 день трансформации
          </Text>
        </Animated.View>

        <FlatList
          data={days}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <DayCard
              item={item}
              index={index}
              onPress={handleDayPress}
              isDark={isDark}
            />
          )}
          ListHeaderComponent={
            <StatsHeader stats={stats} progress={progress} isDark={isDark} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? '#FFFFFF' : '#6366F1'}
              title="Обновление..."
              titleColor={isDark ? '#FFFFFF' : '#6366F1'}
            />
          }
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Статистика
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  statsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  progressRingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#6366F1',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Список дней
  listContainer: {
    paddingBottom: 40,
  },
  dayCardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  dayCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  completedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  dayTitleText: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  exerciseProgress: {
    marginBottom: 16,
  },
  exerciseProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseProgressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  exerciseProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayTimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Загрузка
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
