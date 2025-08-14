import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const breathingPatterns = [
  {
    id: '4-7-8',
    name: 'Техника 4-7-8',
    description: 'Вдох 4, задержка 7, выдох 8',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
    benefits: ['Снижение стресса', 'Улучшение сна', 'Уменьшение тревоги'],
    color: ['#4ECDC4', '#2BAE9F'],
  },
  {
    id: 'box',
    name: 'Квадратное дыхание',
    description: 'Вдох 4, задержка 4, выдох 4, пауза 4',
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 4,
    cycles: 4,
    benefits: ['Концентрация', 'Баланс', 'Спокойствие'],
    color: ['#6C5CE7', '#4834d4'],
  },
  {
    id: 'calm',
    name: 'Успокаивающее дыхание',
    description: 'Вдох 4, выдох 8',
    inhale: 4,
    exhale: 8,
    cycles: 6,
    benefits: ['Расслабление', 'Спокойствие', 'Снятие напряжения'],
    color: ['#FF9F43', '#F39C12'],
  },
];

const MESSAGES = {
  phase: {
    inhale: 'Вдох',
    hold: 'Задержка',
    exhale: 'Выдох',
    pause: 'Пауза',
  },
  complete: {
    title: 'Отлично!',
    message: 'Вы завершили упражнение',
    button: 'Начать заново',
  },
  header: {
    title: 'Дыхательные техники',
    back: 'Назад',
  },
};

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'completed';

type PhaseInfo = {
  text: string;
  color: string;
};

type Phases = {
  [key in Phase]: PhaseInfo;
};

const phases: Phases = {
  ready: { text: 'Нажмите чтобы начать', color: '#A8A8A8' },
  inhale: { text: 'Вдох', color: '#4ECDC4' },
  hold: { text: 'Задержка', color: '#FFE66D' },
  exhale: { text: 'Выдох', color: '#FF6B6B' },
  pause: { text: 'Пауза', color: '#A8E6CF' },
  completed: { text: 'Завершено!', color: '#4BB543' },
};

export default function BreathingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [selectedPattern, setSelectedPattern] = useState(breathingPatterns[0]);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('ready');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startBreathing = () => {
    setIsActive(true);
    setCurrentCycle(0);
    setCurrentPhase('inhale');
    setTimeLeft(selectedPattern.inhale);
    animateCircle(selectedPattern.inhale, 1.5);
  };

  const stopBreathing = () => {
    setIsActive(false);
    setCurrentPhase('ready');
    setCurrentCycle(0);
    setTimeLeft(0);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const animateCircle = (duration: number, scale: number) => {
    Animated.timing(scaleAnim, {
      toValue: scale,
      duration: duration * 1000,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isActive && timeLeft === 0) {
      // Move to next phase
      switch (currentPhase) {
        case 'inhale':
          if (selectedPattern.hold > 0) {
            setCurrentPhase('hold');
            setTimeLeft(selectedPattern.hold);
            animateCircle(selectedPattern.hold, 1.5);
          } else {
            setCurrentPhase('exhale');
            setTimeLeft(selectedPattern.exhale);
            animateCircle(selectedPattern.exhale, 1);
          }
          break;
        case 'hold':
          setCurrentPhase('exhale');
          setTimeLeft(selectedPattern.exhale);
          animateCircle(selectedPattern.exhale, 1);
          break;
        case 'exhale':
          if (selectedPattern.pause && selectedPattern.pause > 0) {
            setCurrentPhase('pause');
            setTimeLeft(selectedPattern.pause);
            animateCircle(selectedPattern.pause, 1);
          } else {
            // Next cycle
            const nextCycle = currentCycle + 1;
            if (nextCycle < selectedPattern.cycles) {
              setCurrentCycle(nextCycle);
              setCurrentPhase('inhale');
              setTimeLeft(selectedPattern.inhale);
              animateCircle(selectedPattern.inhale, 1.5);
            } else {
              setCurrentPhase('completed');
              setIsActive(false);
              setTimeout(() => {
                setCurrentPhase('ready');
              }, 3000);
            }
          }
          break;
        case 'pause':
          // Next cycle
          const nextCycle = currentCycle + 1;
          if (nextCycle < selectedPattern.cycles) {
            setCurrentCycle(nextCycle);
            setCurrentPhase('inhale');
            setTimeLeft(selectedPattern.inhale);
            animateCircle(selectedPattern.inhale, 1.5);
          } else {
            setCurrentPhase('completed');
            setIsActive(false);
            setTimeout(() => {
              setCurrentPhase('ready');
            }, 3000);
          }
          break;
      }
    }
  }, [timeLeft, isActive, currentPhase, currentCycle, selectedPattern]);

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{MESSAGES.header.title}</Text>
        <View style={styles.placeholder} />
      </View>

      {!isActive && currentPhase === 'ready' ? (
        <View style={styles.patternContainer}>
          <Text style={styles.sectionTitle}>Выберите технику дыхания</Text>
          <View style={styles.patternGrid}>
            {breathingPatterns.map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                style={[
                  styles.patternCard,
                  selectedPattern.id === pattern.id && styles.selectedPattern
                ]}
                onPress={() => setSelectedPattern(pattern)}
              >
                <Text style={styles.patternName}>{pattern.name}</Text>
                <Text style={styles.patternDescription}>{pattern.description}</Text>
                <View style={styles.benefitsList}>
                  {pattern.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <FontAwesome5 name="check-circle" size={12} color={theme.colors.success} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={startBreathing}
          >
            <Text style={styles.controlButtonText}>Начать</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              {
                transform: [{ scale: scaleAnim }],
                borderColor: phases[currentPhase].color,
              },
            ]}
          >
            <Text style={[styles.phaseText, { color: phases[currentPhase].color }]}>
              {phases[currentPhase].text}
            </Text>
            {timeLeft > 0 && (
              <Text style={[styles.timeText, { color: phases[currentPhase].color }]}>
                {timeLeft}
              </Text>
            )}
          </Animated.View>
          
          {currentPhase !== 'completed' && (
            <Text style={styles.cycleText}>
              Цикл {currentCycle + 1} / {selectedPattern.cycles}
            </Text>
          )}
          
          {isActive && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopBreathing}
            >
              <Text style={styles.controlButtonText}>Остановить</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  patternContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  patternCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.md,
  },
  selectedPattern: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  patternDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  phaseText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
  },
  cycleText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  controlButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 32,
    marginBottom: 16,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
