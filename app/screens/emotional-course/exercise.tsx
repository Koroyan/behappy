import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Animated,
  Dimensions,
  ImageBackground
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { CourseDay, CourseExercise } from '@/services/emotionalCourseService';
import EmotionalCourseService from '@/services/emotionalCourseService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ExerciseScreen from './components/ExerciseScreen';
import * as Haptics from 'expo-haptics';

// Компонент загрузки с анимацией
const AnimatedLoader = ({ isDark }: { isDark: boolean }) => {
  const [spinAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <LinearGradient
        colors={isDark ? ['#1F2937', '#111827'] : ['#EEF2FF', '#DBEAFE']}
        style={styles.loadingCard}
      >
        <Animated.View
          style={[
            styles.loadingIconContainer,
            { transform: [{ rotate: spin }, { scale: pulseAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.loadingIcon}
          >
            <MaterialCommunityIcons name="brain" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        
        <Text style={[styles.loadingTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Подготавливаем упражнение
        </Text>
        
        <Text style={[styles.loadingText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Настраиваем персональный опыт обучения...
        </Text>
        
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.loadingDot,
                {
                  backgroundColor: isDark ? '#6366F1' : '#8B5CF6',
                  transform: [
                    {
                      translateY: pulseAnim.interpolate({
                        inputRange: [1, 1.2],
                        outputRange: [0, -5],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

// Компонент ошибки с красивым дизайном
const ErrorDisplay = ({ 
  message, 
  onRetry, 
  onGoBack, 
  isDark 
}: { 
  message: string; 
  onRetry?: () => void;
  onGoBack: () => void; 
  isDark: boolean; 
}) => {
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.errorContainer}>
      <LinearGradient
        colors={isDark ? ['#1F2937', '#111827'] : ['#FEF2F2', '#FECACA']}
        style={styles.errorCard}
      >
        <Animated.View
          style={[
            styles.errorIconContainer,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={48} 
            color={isDark ? '#F87171' : '#EF4444'} 
          />
        </Animated.View>
        
        <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Упс! Что-то пошло не так
        </Text>
        
        <Text style={[styles.errorMessage, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          {message}
        </Text>
        
        <View style={styles.errorButtons}>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.retryButtonGradient}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Text style={[styles.backButtonText, { color: isDark ? '#6366F1' : '#8B5CF6' }]}>
              Вернуться назад
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { dayId, exerciseId } = useLocalSearchParams();
  
  const dayIdNum = typeof dayId === 'string' ? parseInt(dayId, 10) : 1;
  const exerciseIdNum = typeof exerciseId === 'string' ? parseInt(exerciseId, 10) : 0;
  
  const [day, setDay] = useState<CourseDay | null>(null);
  const [exercise, setExercise] = useState<CourseExercise | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [headerAnim] = useState(new Animated.Value(0));

  // Анимация появления заголовка
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [dayIdNum, exerciseIdNum]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dayData = await EmotionalCourseService.getDay(dayIdNum);
      
      if (dayData) {
        setDay(dayData);
        
        const exerciseData = dayData.exercises.find(ex => ex.id === exerciseIdNum);
        
        if (exerciseData) {
          setExercise(exerciseData);
        } else {
          setError("Упражнение не найдено. Проверьте правильность выбранного упражнения.");
        }
      } else {
        setError("День курса не найден. Возможно, он еще не разблокирован.");
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError("Произошла ошибка при загрузке данных. Проверьте подключение к интернету.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleExerciseComplete = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Обновляем локальные данные после завершения упражнения
      const updatedDay = await EmotionalCourseService.getDay(dayIdNum);
      
      if (updatedDay) {
        setDay(updatedDay);
        
        // Если день завершен, разблокируем следующий день
        if (updatedDay.isCompleted) {
          const nextDayId = dayIdNum + 1;
          await EmotionalCourseService.unlockDay(nextDayId);
          
          Alert.alert(
            '🎉 Поздравляем!',
            `День ${dayIdNum} завершен! Следующий день разблокирован.`,
            [{ text: 'Отлично!', onPress: () => router.back() }]
          );
        } else {
          // Возвращаемся к деталям дня
          router.back();
        }
      }
      
    } catch (error) {
      console.error('Error after exercise completion:', error);
      Alert.alert(
        'Упражнение завершено!',
        'Данные сохранены локально.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Состояние загрузки
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop' }}
          style={styles.backgroundImage}
          imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
        >
          <AnimatedLoader isDark={isDark} />
        </ImageBackground>
      </SafeAreaView>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop' }}
          style={styles.backgroundImage}
          imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
        >
          <ErrorDisplay
            message={error}
            onRetry={loadData}
            onGoBack={handleGoBack}
            isDark={isDark}
          />
        </ImageBackground>
      </SafeAreaView>
    );
  }

  // Если данные не найдены
  if (!day || !exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop' }}
          style={styles.backgroundImage}
          imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
        >
          <ErrorDisplay
            message="Данные не найдены. Попробуйте перезагрузить страницу."
            onRetry={loadData}
            onGoBack={handleGoBack}
            isDark={isDark}
          />
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
      {/* Шапка с анимацией */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
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
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isDark ? ['#374151', '#1F2937'] : ['#F3F4F6', '#E5E7EB']}
            style={styles.backButtonGradient}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDark ? '#FFFFFF' : '#111827'} 
            />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.exerciseTitleContainer}>
            <Text style={[styles.exerciseTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {exercise.title}
            </Text>
            
            {/* Индикатор типа упражнения */}
            <View style={[styles.exerciseTypeTag, { backgroundColor: isDark ? '#6366F1' : '#EEF2FF' }]}>
              <MaterialCommunityIcons 
                name={getExerciseIcon(exercise.type)} 
                size={14} 
                color={isDark ? '#FFFFFF' : '#6366F1'} 
              />
              <Text style={[styles.exerciseTypeText, { color: isDark ? '#FFFFFF' : '#6366F1' }]}>
                {getExerciseTypeName(exercise.type)}
              </Text>
            </View>
          </View>
          
          <View style={styles.exerciseDetails}>
            <View style={styles.exerciseDetailItem}>
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={isDark ? '#9CA3AF' : '#6B7280'} 
              />
              <Text style={[styles.exerciseTime, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
                {exercise.duration} мин
              </Text>
            </View>
            
            <View style={styles.exerciseDetailItem}>
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={isDark ? '#9CA3AF' : '#6B7280'} 
              />
              <Text style={[styles.exerciseDayInfo, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
                День {day.id}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Содержимое упражнения */}
      <View style={styles.exerciseContainer}>
        <ExerciseScreen 
          dayId={dayIdNum} 
          exercise={exercise} 
          onComplete={handleExerciseComplete} 
        />
      </View>
    </SafeAreaView>
  );
}

// Вспомогательные функции
const getExerciseIcon = (type: string): any => {
  const icons: { [key: string]: any } = {
    meditation: 'meditation',
    breathing: 'lungs',
    bodywork: 'human',
    reflection: 'head-lightbulb',
    journaling: 'notebook',
    practice: 'dumbbell',
    vocal: 'microphone',
    reframing: 'brain'
  };
  return icons[type] || 'puzzle';
};

const getExerciseTypeName = (type: string) => {
  const names: { [key: string]: string } = {
    meditation: 'Медитация',
    breathing: 'Дыхание',
    bodywork: 'Работа с телом',
    reflection: 'Рефлексия',
    journaling: 'Дневник',
    practice: 'Практика',
    vocal: 'Голос',
    reframing: 'Рефрейминг'
  };
  return names[type] || 'Упражнение';
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonContainer: {
    marginRight: 12,
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  exerciseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
    flex: 1,
  },
  exerciseTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseTime: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  exerciseDayInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  exerciseContainer: {
    flex: 1,
  },
  
  // Стили для загрузки
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    minWidth: width * 0.8,
  },
  loadingIconContainer: {
    marginBottom: 24,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Стили для ошибки
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    minWidth: width * 0.8,
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  errorButtons: {
    width: '100%',
    gap: 16,
  },
  retryButton: {
    width: '100%',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
