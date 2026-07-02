import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate,
  useDerivedValue,
  withRepeat
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ModernTheme, ModernEmojis, ModernPatterns } from '@/constants/ModernTheme';

const { width, height } = Dimensions.get('window');

// Glassmorphism Card Component
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  intensity?: number;
  gradient?: string[];
  glowEffect?: boolean;
}

export function GlassCard({ 
  children, 
  style, 
  onPress, 
  intensity = 80,
  gradient,
  glowEffect = false 
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  
  useEffect(() => {
    if (glowEffect) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [glowEffect]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glowEffect ? interpolate(glow.value, [0, 1], [0.1, 0.4]) : 0.1,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1);
    }
  };

  const cardContent = (
    <Animated.View style={[styles.glassCard, style, animatedStyle]}>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} />
      {children}
    </Animated.View>
  );

  if (gradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient as any}
          style={[styles.glassCard, style]}
          start={ModernPatterns.gradientAngles.diagonal}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={animatedStyle}>
            {children}
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

// Modern Floating Action Button
interface FloatingButtonProps {
  icon: string;
  onPress: () => void;
  gradient?: string[];
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function FloatingButton({ 
  icon, 
  onPress, 
  gradient = ModernTheme.colors.primaryGradient,
  size = 'md',
  pulse = false 
}: FloatingButtonProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    if (pulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [pulse]);

  const sizeMap = {
    sm: 48,
    md: 56,
    lg: 64
  };

  const iconSizeMap = {
    sm: 20,
    md: 24,
    lg: 28
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pulseScale.value }
    ]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={gradient as any}
          style={[
            styles.floatingButton,
            {
              width: sizeMap[size],
              height: sizeMap[size],
              borderRadius: sizeMap[size] / 2,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.floatingIcon, { fontSize: iconSizeMap[size] }]}>
            {icon}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Holographic Progress Indicator
interface HolographicProgressProps {
  progress: number; // 0-100
  size?: number;
  thickness?: number;
  gradient?: string[];
}

export function HolographicProgress({ 
  progress, 
  size = 100, 
  thickness = 8,
  gradient = ModernTheme.colors.holographic 
}: HolographicProgressProps) {
  const animatedProgress = useSharedValue(0);
  
  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      animatedProgress.value,
      [0, 100],
      [0, 360],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ rotate: `${rotation}deg` }]
    };
  });

  return (
    <View style={[styles.progressContainer, { width: size, height: size }]}>
      <View 
        style={[
          styles.progressTrack, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: thickness 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.progressIndicator,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: thickness 
          },
          animatedStyle
        ]}
      >
        <LinearGradient
          colors={gradient as any}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <View style={[styles.progressCenter, { width: size - thickness * 2, height: size - thickness * 2 }]}>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

// Mood Particle System
interface MoodParticleSystemProps {
  mood: 'happy' | 'calm' | 'energetic' | 'peaceful';
  intensity?: number;
}

export function MoodParticleSystem({ mood, intensity = 1 }: MoodParticleSystemProps) {
  const particles = Array.from({ length: Math.floor(10 * intensity) }, (_, i) => i);
  
  const getMoodConfig = (moodType: string) => {
    switch (moodType) {
      case 'happy':
        return { color: ModernTheme.colors.energyOrange, emoji: '✨' };
      case 'calm':
        return { color: ModernTheme.colors.calmBlue, emoji: '💙' };
      case 'energetic':
        return { color: ModernTheme.colors.energyOrange, emoji: '⚡' };
      case 'peaceful':
        return { color: ModernTheme.colors.growthGreen, emoji: '🌿' };
      default:
        return { color: ModernTheme.colors.primaryGradient, emoji: '✨' };
    }
  };

  const config = getMoodConfig(mood);

  return (
    <View style={styles.particleContainer}>
      {particles.map((particle) => (
        <MoodParticle 
          key={particle} 
          emoji={config.emoji} 
          gradient={config.color}
          delay={particle * 200}
        />
      ))}
    </View>
  );
}

// Individual particle component
interface MoodParticleProps {
  emoji: string;
  gradient: string[];
  delay: number;
}

function MoodParticle({ emoji, gradient, delay }: MoodParticleProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    const animate = () => {
      translateY.value = 0;
      opacity.value = 0;
      
      setTimeout(() => {
        translateY.value = withTiming(-height * 0.8, { duration: 4000 });
        opacity.value = withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(1, { duration: 3000 }),
          withTiming(0, { duration: 500 })
        );
      }, delay);
    };
    
    animate();
    const interval = setInterval(animate, 5000 + delay);
    return () => clearInterval(interval);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.particle, 
        animatedStyle,
        { 
          left: Math.random() * width,
          top: height,
        }
      ]}
    >
      <Text style={styles.particleEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

// Advanced Typography Component
interface ModernTextProps {
  children: React.ReactNode;
  variant?: keyof typeof ModernTheme.typography;
  color?: string;
  gradient?: string[];
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  animated?: boolean;
}

export function ModernText({ 
  children, 
  variant = 'body1', 
  color = ModernTheme.colors.textPrimary,
  gradient,
  align = 'left',
  style,
  animated = false
}: ModernTextProps) {
  const animatedScale = useSharedValue(animated ? 0 : 1);
  
  useEffect(() => {
    if (animated) {
      animatedScale.value = withSpring(1, { damping: 15 });
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }]
  }));

  const textStyles = [
    ModernTheme.typography[variant],
    { color },
    { textAlign: align },
    style
  ] as any;

  if (gradient) {
    return (
      <Animated.View style={animated ? animatedStyle : undefined}>
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientText}
        >
          <Text style={textStyles}>{children}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.Text style={[textStyles, animated ? animatedStyle : undefined]}>
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: ModernTheme.radius.xl,
    padding: ModernTheme.spacing.lg,
    backgroundColor: ModernTheme.colors.glass.primary,
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.secondary,
    overflow: 'hidden',
    ...ModernTheme.shadows.md,
  },
  
  floatingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    ...ModernTheme.shadows.lg,
  },
  
  floatingIcon: {
    color: 'white',
  },
  
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  progressTrack: {
    position: 'absolute',
    borderColor: ModernTheme.colors.glass.primary,
  },
  
  progressIndicator: {
    position: 'absolute',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: '#667eea',
  },
  
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 999,
  },
  
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: ModernTheme.colors.textPrimary,
  },
  
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  
  particle: {
    position: 'absolute',
  },
  
  particleEmoji: {
    fontSize: 20,
  },
  
  gradientText: {
    borderRadius: ModernTheme.radius.sm,
  },
});
