import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Animated, 
  Dimensions, 
  Text, 
  TouchableOpacity,
  ImageBackground 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CourseExercise } from '@/services/emotionalCourseService';
import EmotionalCourseService from '@/services/emotionalCourseService';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Импортируем все компоненты упражнений
import EmotionNamingExercise from './EmotionNamingExercise';
import BreathingMeditation from './BreathingMeditation';
import BodyScanExercise from './BodyScanExercise';
import EmotionAcceptanceExercise from './EmotionAcceptanceExercise';
import EmotionDialogueExercise from './EmotionDialogueExercise';
import InnerChildExercise from './InnerChildExercise';
import EmotionalJournalExercise from './EmotionalJournalExercise';
import WeeklyReflectionExercise from './WeeklyReflectionExercise';

interface ExerciseScreenProps {
  dayId: number;
  exercise: CourseExercise;
  onComplete: () => void;
}

// Компонент анимированного прогресса
const ExerciseProgress = ({ 
  currentStep, 
  totalSteps, 
  isDark 
}: { 
  currentStep: number; 
  totalSteps: number; 
  isDark: boolean; 
}) => {
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / totalSteps,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>
      <Text style={[styles.progressText, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
        Шаг {currentStep} из {totalSteps}
      </Text>
    </View>
  );
};

// Компонент мотивационного сообщения
const MotivationMessage = ({ 
  exerciseType, 
  isDark 
}: { 
  exerciseType: string; 
  isDark: boolean; 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getMotivationMessage = (type: string) => {
    const messages = {
      breathing: ['🌬️ Дыши глубоко и спокойно', 'Каждый вдох приносит умиротворение'],
      'emotion-naming': ['🎭 Познай свои эмоции', 'Понимание - первый шаг к мастерству'],
      'body-scan': ['🧘‍♀️ Слушай свое тело', 'Твое тело - мудрый наставник'],
      'emotion-acceptance': ['💝 Прими себя полностью', 'Принятие - это сила'],
      meditation: ['🧘 Найди внутренний покой', 'Тишина ума - источник мудрости'],
      journal: ['📝 Записывай свои инсайты', 'Каждая мысль ценна'],
      reflection: ['🤔 Размышляй глубоко', 'Рефлексия - путь к росту']
    };

    const typeMessages = messages[type as keyof typeof messages] || ['✨ Ты делаешь отличную работу!', 'Продолжай в том же духе'];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  return (
    <Animated.View style={[styles.motivationContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={isDark ? ['#1F2937', '#111827'] : ['#EEF2FF', '#DBEAFE']}
        style={styles.motivationCard}
      >
        <Text style={[styles.motivationText, { color: isDark ? '#F3F4F6' : '#1F2937' }]}>
          {getMotivationMessage(exerciseType)}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

// Компонент анимации завершения
const CompletionAnimation = ({ 
  visible, 
  onHide, 
  isDark 
}: { 
  visible: boolean; 
  onHide: () => void; 
  isDark: boolean; 
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(onHide);
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.completionOverlay}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.9)', 'rgba(139, 92, 246, 0.9)']}
        style={styles.completionBackground}
      >
        <Animated.View 
          style={[
            styles.completionContent,
            { 
              transform: [
                { scale: scaleAnim },
                { rotate: spin }
              ] 
            }
          ]}
        >
          <MaterialCommunityIcons name="check-circle" size={80} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.Text 
          style={[
            styles.completionText,
            { 
              opacity: scaleAnim,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          Отлично! 🎉
        </Animated.Text>
        
        <Animated.Text 
          style={[
            styles.completionSubtext,
            { 
              opacity: scaleAnim,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          Упражнение завершено
        </Animated.Text>
      </LinearGradient>
    </View>
  );
};

export default function ExerciseScreen({ dayId, exercise, onComplete }: ExerciseScreenProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(5); // Базовое количество шагов
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Универсальный обработчик завершения с анимацией
  const handleExerciseComplete = async (data?: any) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (data) {
        await EmotionalCourseService.saveExerciseData(dayId, exercise.id, data);
      }
      await EmotionalCourseService.completeExercise(dayId, exercise.id);
      
      // Показываем анимацию завершения
      setShowCompletion(true);
    } catch (error) {
      console.error('Error completing exercise:', error);
      Alert.alert("Ошибка", "Не удалось сохранить результаты упражнения.");
    }
  };

  // Обработчики для конкретных типов упражнений
  const handleEmotionNamingComplete = (emotions: { name: string; trigger: string; intensity: number }[]) => {
    handleExerciseComplete({ emotions });
  };

  const handleBreathingComplete = () => {
    handleExerciseComplete();
  };

  const handleBodyScanComplete = (bodyAreas: string[]) => {
    handleExerciseComplete({ bodyAreas });
  };

  const handleEmotionAcceptanceComplete = (data: any) => {
    handleExerciseComplete(data);
  };

  const handleDialogueComplete = (data: any) => {
    handleExerciseComplete(data);
  };

  const handleInnerChildComplete = (data: any) => {
    handleExerciseComplete(data);
  };

  const handleJournalComplete = (data: any) => {
    handleExerciseComplete(data);
  };

  const handleReflectionComplete = (data: any) => {
    handleExerciseComplete(data);
  };

  // Обработка завершения анимации
  const handleCompletionAnimationFinish = () => {
    setShowCompletion(false);
    onComplete();
  };

  // Рендеринг соответствующего компонента упражнения
  const renderExercise = () => {
    switch (exercise.type) {
      case 'meditation':
        return (
          <BreathingMeditation
            onComplete={handleBreathingComplete}
            duration={exercise.duration}
          />
        );
      case 'breathing':
        return (
          <BreathingMeditation
            onComplete={handleBreathingComplete}
            duration={exercise.duration}
          />
        );
      case 'bodywork':
        return (
          <BodyScanExercise
            onComplete={handleBodyScanComplete}
          />
        );
      case 'reflection':
        return (
          <WeeklyReflectionExercise
            onComplete={handleReflectionComplete}
          />
        );
      case 'journaling':
        return (
          <EmotionalJournalExercise
            onComplete={handleJournalComplete}
          />
        );
      case 'practice':
        return (
          <EmotionAcceptanceExercise
            onComplete={handleEmotionAcceptanceComplete}
          />
        );
      case 'vocal':
        return (
          <EmotionDialogueExercise
            onComplete={handleDialogueComplete}
          />
        );
      case 'reframing':
        return (
          <InnerChildExercise
            onComplete={handleInnerChildComplete}
          />
        );
      default:
        return (
          <View style={styles.defaultExercise}>
            <LinearGradient
              colors={isDark ? ['#1F2937', '#111827'] : ['#F3F4F6', '#FFFFFF']}
              style={styles.defaultCard}
            >
              <MaterialCommunityIcons 
                name="puzzle" 
                size={48} 
                color={isDark ? '#6366F1' : '#8B5CF6'} 
              />
              <Text style={[styles.defaultTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {exercise.title}
              </Text>
              <Text style={[styles.defaultText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
                {exercise.description}
              </Text>
              <TouchableOpacity 
                style={styles.defaultButton}
                onPress={() => handleExerciseComplete()}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.defaultButtonGradient}
                >
                  <Text style={styles.defaultButtonText}>Завершить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        );
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? '#111827' : '#F8FAFC',
          opacity: fadeAnim 
        }
      ]}
    >
      {/* Фоновое изображение */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=600&fit=crop' }}
        style={styles.backgroundImage}
        imageStyle={{ opacity: isDark ? 0.05 : 0.03 }}
      >
        {/* Прогресс бар */}
        <ExerciseProgress 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
          isDark={isDark} 
        />

        {/* Мотивационное сообщение */}
        <MotivationMessage 
          exerciseType={exercise.type} 
          isDark={isDark} 
        />

        {/* Основной контент упражнения */}
        <View style={styles.exerciseContent}>
          {renderExercise()}
        </View>

        {/* Анимация завершения */}
        <CompletionAnimation
          visible={showCompletion}
          onHide={handleCompletionAnimationFinish}
          isDark={isDark}
        />
      </ImageBackground>
    </Animated.View>
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  motivationContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  motivationCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  exerciseContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  defaultExercise: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  defaultCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 300,
    justifyContent: 'center',
  },
  defaultTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  defaultText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  defaultButton: {
    marginTop: 20,
  },
  defaultButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  defaultButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionBackground: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  completionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
});
