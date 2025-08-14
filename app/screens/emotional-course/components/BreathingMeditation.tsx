import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface BreathingMeditationProps {
  onComplete: () => void;
  duration: number; // в минутах
}

export default function BreathingMeditation({ onComplete, duration = 5 }: BreathingMeditationProps) {
  const { isDark } = useTheme();
  const [isStarted, setIsStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [breathState, setBreathState] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  
  // Анимация дыхания
  const breathAnimation = new Animated.Value(1);
  
  useEffect(() => {
    if (isStarted && secondsLeft > 0) {
      const timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
      
      return () => clearInterval(timer);
    } else if (secondsLeft === 0 && isStarted) {
      handleComplete();
    }
  }, [isStarted, secondsLeft]);
  
  // Циклическая анимация дыхания
  useEffect(() => {
    if (!isStarted) return;
    
    let animation;
    
    switch (breathState) {
      case 'inhale':
        animation = Animated.timing(breathAnimation, {
          toValue: 1.5,
          duration: 4000,
          useNativeDriver: true
        });
        animation.start(() => {
          setBreathState('hold');
        });
        break;
        
      case 'hold':
        animation = Animated.timing(breathAnimation, {
          toValue: 1.5,
          duration: 2000,
          useNativeDriver: true
        });
        animation.start(() => {
          setBreathState('exhale');
        });
        break;
        
      case 'exhale':
        animation = Animated.timing(breathAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true
        });
        animation.start(() => {
          setBreathState('rest');
        });
        break;
        
      case 'rest':
        animation = Animated.timing(breathAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        });
        animation.start(() => {
          setBreathState('inhale');
        });
        break;
    }
    
    return () => animation?.stop();
  }, [breathState, isStarted]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getBreathText = () => {
    switch (breathState) {
      case 'inhale': return 'Вдох';
      case 'hold': return 'Задержка';
      case 'exhale': return 'Выдох';
      case 'rest': return 'Пауза';
    }
  };
  
  const handleStart = () => {
    setIsStarted(true);
    setBreathState('inhale');
  };
  
  const handlePause = () => {
    setIsStarted(false);
  };
  
  const handleComplete = () => {
    setIsStarted(false);
    onComplete();
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Дыхательная медитация
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Эта медитация поможет вам расслабиться и сосредоточиться на текущем моменте через осознанное дыхание.
      </Text>
      
      <View style={styles.meditationContainer}>
        <Animated.View
          style={[
            styles.breathCircle,
            { 
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              transform: [{ scale: breathAnimation }]
            }
          ]}
        >
          <Animated.View
            style={[
              styles.innerBreathCircle,
              { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)' }
            ]}
          >
            <FontAwesome5 name="wind" size={30} color="#6366F1" />
          </Animated.View>
        </Animated.View>
        
        <Text style={[styles.breathText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          {isStarted ? getBreathText() : 'Нажмите "Начать", когда будете готовы'}
        </Text>
        
        {isStarted && (
          <Text style={[styles.timeText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            {formatTime(secondsLeft)}
          </Text>
        )}
        
        <View style={styles.buttonContainer}>
          {!isStarted ? (
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStart}
            >
              <Text style={styles.buttonText}>Начать</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={handlePause}
            >
              <Text style={styles.buttonText}>Пауза</Text>
            </TouchableOpacity>
          )}
          
          {isStarted && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Text style={styles.buttonText}>Завершить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.instructions}>
        <Text style={[styles.instructionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Инструкции:
        </Text>
        <Text style={[styles.instructionText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          1. Сядьте в удобное положение со спиной прямо
        </Text>
        <Text style={[styles.instructionText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          2. Медленно вдохните через нос в течение 4 секунд
        </Text>
        <Text style={[styles.instructionText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          3. Задержите дыхание на 2 секунды
        </Text>
        <Text style={[styles.instructionText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          4. Медленно выдохните через рот в течение 4 секунд
        </Text>
        <Text style={[styles.instructionText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          5. Сделайте паузу на 1 секунду
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  meditationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  breathCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  innerBreathCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathText: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 30,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 26,
  },
});
