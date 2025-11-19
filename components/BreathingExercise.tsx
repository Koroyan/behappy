import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

interface BreathingExerciseProps {
  onComplete?: (data: { cycles: number; totalTime: number }) => void;
  duration?: number; // Total duration in seconds
  pattern?: [number, number, number]; // [inhale, hold, exhale] in seconds
}

const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  onComplete,
  duration = 300, // 5 minutes default
  pattern = [4, 2, 6], // 4-2-6 pattern
}) => {
  const [currentPhase, setCurrentPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale'>('ready');
  const [currentCount, setCurrentCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;
  const countdownRef = useRef<any>(null);
  const phaseRef = useRef<any>(null);

  const { width } = Dimensions.get('window');
  const circleSize = Math.min(width * 0.6, 240);

  const [inhaleTime, holdTime, exhaleTime] = pattern;
  const cycleTime = inhaleTime + holdTime + exhaleTime;
  const MAX_CYCLES = 10; // Auto-complete after 10 cycles

  const startExercise = () => {
    setIsActive(true);
    setCurrentPhase('inhale');
    setCurrentCount(inhaleTime);
    setCompletedCycles(0);
    setTotalTime(0);
    setIsPaused(false);
    startBreathingCycle();
  };

  const pauseExercise = () => {
    setIsPaused(true);
    setIsActive(false);
    stopBreathingCycle();
  };

  const resumeExercise = () => {
    setIsPaused(false);
    setIsActive(true);
    startBreathingCycle();
  };

  const stopExercise = () => {
    // Send completion data to AI before stopping
    if (completedCycles > 0) {
      onComplete?.({ cycles: completedCycles, totalTime });
    }
    
    setIsActive(false);
    setIsPaused(false);
    setCurrentPhase('ready');
    setCompletedCycles(0);
    setTotalTime(0);
    stopBreathingCycle();
  };

  useEffect(() => {
    if (isActive && !isPaused) {
      startBreathingCycle();
    } else {
      stopBreathingCycle();
    }

    return () => {
      stopBreathingCycle();
    };
  }, [isActive, isPaused]);

  // Remove auto-start - let user control when to begin
  useEffect(() => {
    return () => {
      stopBreathingCycle();
    };
  }, []);

  // Auto-complete when reaching MAX_CYCLES
  useEffect(() => {
    if (completedCycles >= MAX_CYCLES && isActive) {
      console.log(`🎉 Completed ${MAX_CYCLES} cycles - finishing exercise`);
      setTimeout(() => {
        stopExercise();
      }, 2000); // Give 2 seconds to see the completion
    }
  }, [completedCycles, isActive]);

  const startBreathingCycle = () => {
    setCurrentPhase('inhale');
    setCurrentCount(inhaleTime);
    animatePhase('inhale', inhaleTime);
  };

  const stopBreathingCycle = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (phaseRef.current) {
      clearTimeout(phaseRef.current);
      phaseRef.current = null;
    }
  };

  const animatePhase = (phase: 'inhale' | 'hold' | 'exhale', duration: number) => {
    if (!isActive || isPaused) return;
    
    setCurrentPhase(phase);
    setCurrentCount(duration);

    // Animate the circle based on the phase
    const targetScale = phase === 'inhale' ? 1.2 : phase === 'hold' ? 1.2 : 0.7;
    const targetOpacity = phase === 'inhale' ? 0.9 : phase === 'hold' ? 1.0 : 0.5;

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: targetScale,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: targetOpacity,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Countdown timer
    let count = duration;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCurrentCount(count);
      
      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        
        // Move to next phase
        if (phase === 'inhale') {
          phaseRef.current = setTimeout(() => animatePhase('hold', holdTime), 100);
        } else if (phase === 'hold') {
          phaseRef.current = setTimeout(() => animatePhase('exhale', exhaleTime), 100);
        } else if (phase === 'exhale') {
          // Complete one full cycle - increment counter
          setCompletedCycles(prev => {
            const newCount = prev + 1;
            console.log(`✅ Cycle ${newCount} completed`);
            
            // Auto-complete after MAX_CYCLES
            if (newCount >= MAX_CYCLES) {
              console.log(`🎉 Reached ${MAX_CYCLES} cycles - auto-completing`);
              setTimeout(() => {
                stopBreathingCycle();
                setIsActive(false);
                setIsPaused(false);
                // Trigger completion with final data
                onComplete?.({ cycles: newCount, totalTime: totalTime + cycleTime });
              }, 1000);
            }
            
            return newCount;
          });
          
          setTotalTime(prev => prev + cycleTime);
          
          // Continue to next cycle if still active and under MAX_CYCLES
          if (isActive && !isPaused && completedCycles + 1 < MAX_CYCLES) {
            phaseRef.current = setTimeout(() => animatePhase('inhale', inhaleTime), 1000);
          }
        }
      }
    }, 1000);
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'Inhale';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Exhale';
      default:
        return 'Breathe';
    }
  };

  const getPhaseInstructions = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'Breathe in slowly through your nose';
      case 'hold':
        return 'Hold your breath gently';
      case 'exhale':
        return 'Breathe out slowly through your mouth';
      default:
        return 'Follow the breathing pattern';
    }
  };

  const getGradientColors = (): [string, string] => {
    switch (currentPhase) {
      case 'inhale':
        return TherapyColors.gradients.ocean as [string, string];
      case 'hold':
        return TherapyColors.gradients.calm as [string, string];
      case 'exhale':
        return TherapyColors.gradients.healing as [string, string];
      default:
        return TherapyColors.gradients.calm as [string, string];
    }
  };

  return (
    <View style={therapyStyles.interactiveContainer}>
      <Text style={therapyStyles.subtitle}>🫁 Mindful Breathing</Text>
      <Text style={therapyStyles.bodySecondary}>
        {currentPhase === 'ready' 
          ? 'A guided breathing exercise to help you find calm and presence.'
          : `Cycle ${completedCycles + 1} of ${MAX_CYCLES} • Auto-completes at ${MAX_CYCLES} cycles`
        }
      </Text>
      
      {/* Control Buttons */}
      {currentPhase === 'ready' && (
        <View style={{ marginVertical: 20 }}>
          <TouchableOpacity
            onPress={startExercise}
            style={[therapyStyles.primaryButton, { marginBottom: 12 }]}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={therapyStyles.primaryButtonText}>Begin Breathing Exercise</Text>
          </TouchableOpacity>
          
          <Text style={[therapyStyles.bodySecondary, { textAlign: 'center', fontSize: 12 }]}>
            Pattern: {inhaleTime}s inhale • {holdTime}s hold • {exhaleTime}s exhale
          </Text>
        </View>
      )}

      {/* Active Controls */}
      {currentPhase !== 'ready' && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          marginVertical: 16,
          gap: 12,
        }}>
          <TouchableOpacity
            onPress={isPaused ? resumeExercise : pauseExercise}
            style={[therapyStyles.secondaryButton, { flex: 1, maxWidth: 120 }]}
          >
            <Ionicons 
              name={isPaused ? "play" : "pause"} 
              size={16} 
              color={TherapyColors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={stopExercise}
            style={[therapyStyles.secondaryButton, { flex: 1, maxWidth: 120 }]}
          >
            <Ionicons name="stop" size={16} color={TherapyColors.primary} />
          </TouchableOpacity>
        </View>
      )}
      
      {currentPhase !== 'ready' && (
        <View style={therapyStyles.breathingContainer}>
        <Animated.View
          style={[
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
            therapyStyles.breathingCircle,
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: circleSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[therapyStyles.breathingText, { fontSize: 24, marginBottom: 8 }]}>
              {getPhaseText()}
            </Text>
            <Text style={[therapyStyles.breathingText, { fontSize: 48, fontWeight: '300' }]}>
              {currentCount}
            </Text>
          </LinearGradient>
        </Animated.View>

        <Text style={therapyStyles.breathingInstructions}>
          {getPhaseInstructions()}
        </Text>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={[therapyStyles.body, { color: TherapyColors.primary, fontWeight: '600' }]}>
            Progress: {completedCycles} / {MAX_CYCLES}
          </Text>
          {completedCycles >= MAX_CYCLES && (
            <Text style={[therapyStyles.body, { color: TherapyColors.healing, marginTop: 8, fontWeight: '600' }]}>
              🎉 Complete!
            </Text>
          )}
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 20,
          paddingHorizontal: 20,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>INHALE</Text>
            <Text style={therapyStyles.bodySecondary}>{inhaleTime}s</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>HOLD</Text>
            <Text style={therapyStyles.bodySecondary}>{holdTime}s</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>EXHALE</Text>
            <Text style={therapyStyles.bodySecondary}>{exhaleTime}s</Text>
          </View>
        </View>

          {/* Progress Message - Shows cycles completed */}
          {completedCycles > 0 && !isActive && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={[therapyStyles.body, { color: TherapyColors.healing, textAlign: 'center' }]}>
                {completedCycles >= MAX_CYCLES 
                  ? `🎉 Excellent! You completed all ${MAX_CYCLES} breathing cycles!`
                  : `✨ Great work! You've completed ${completedCycles} breathing cycle${completedCycles > 1 ? 's' : ''}.`
                }
              </Text>
              <Text style={[therapyStyles.bodySecondary, { textAlign: 'center', marginTop: 8 }]}>
                {completedCycles >= MAX_CYCLES
                  ? 'You reached your goal. The AI will provide personalized feedback.'
                  : 'Take your time. You can continue or finish when you feel ready.'
                }
              </Text>
              {completedCycles < MAX_CYCLES && (
                <TouchableOpacity
                  onPress={() => onComplete?.({ cycles: completedCycles, totalTime })}
                  style={[therapyStyles.primaryButton, { marginTop: 12 }]}
                >
                  <Text style={therapyStyles.primaryButtonText}>I'm Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default BreathingExercise;