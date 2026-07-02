import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TherapyTheme } from '@/constants/Theme';

interface TherapyCardProps {
  children: React.ReactNode;
  gradient?: string[];
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
}

export function TherapyCard({ 
  children, 
  gradient, 
  style, 
  onPress, 
  disabled = false,
  elevation = 'md' 
}: TherapyCardProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(0.98);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(1);
    }
  };

  const cardContent = (
    <Animated.View 
      style={[
        styles.card,
        TherapyTheme.shadows[elevation],
        style,
        animatedStyle
      ]}
    >
      {children}
    </Animated.View>
  );

  if (gradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient as any}
          style={[styles.card, style]}
          start={{ x: 0, y: 0 }}
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
        disabled={disabled}
        activeOpacity={1}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

interface TherapyButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  gradient?: string[];
  style?: ViewStyle;
}

export function TherapyButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  gradient,
  style
}: TherapyButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1);
    }
  };

  const buttonStyles = [
    styles.button,
    size === 'sm' ? styles.buttonSm : size === 'lg' ? styles.buttonLg : styles.buttonMd,
    variant === 'primary' ? styles.buttonPrimary : 
    variant === 'secondary' ? styles.buttonSecondary :
    variant === 'outline' ? styles.buttonOutline : styles.buttonGhost,
    disabled && styles.buttonDisabled,
    style
  ];

  const textStyles = [
    styles.buttonText,
    size === 'sm' ? styles.buttonTextSm : size === 'lg' ? styles.buttonTextLg : styles.buttonTextMd,
    variant === 'primary' ? styles.buttonTextPrimary : 
    variant === 'secondary' ? styles.buttonTextSecondary :
    variant === 'outline' ? styles.buttonTextOutline : styles.buttonTextGhost,
    disabled && styles.buttonTextDisabled
  ];

  const buttonContent = (
    <Animated.View style={[styles.buttonContent, animatedStyle]}>
      {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
      <Text style={textStyles}>{loading ? 'იტვირთება...' : title}</Text>
    </Animated.View>
  );

  if (gradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient as any}
          style={buttonStyles}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {buttonContent}
    </TouchableOpacity>
  );
}

interface TherapyTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'button';
  color?: 'primary' | 'secondary' | 'muted' | 'inverse';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
}

export function TherapyText({ 
  children, 
  variant = 'body1', 
  color = 'primary',
  align = 'left',
  style 
}: TherapyTextProps) {
  const getTextColor = () => {
    switch (color) {
      case 'primary': return TherapyTheme.colors.textPrimary;
      case 'secondary': return TherapyTheme.colors.textSecondary;
      case 'muted': return TherapyTheme.colors.textMuted;
      case 'inverse': return TherapyTheme.colors.textInverse;
      default: return TherapyTheme.colors.textPrimary;
    }
  };

  const textStyles = [
    TherapyTheme.typography[variant],
    { color: getTextColor() },
    { textAlign: align },
    style
  ] as any;

  return <Text style={textStyles}>{children}</Text>;
}

interface MoodIndicatorProps {
  mood: number; // 1-10
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function MoodIndicator({ mood, size = 'md', showLabel = true }: MoodIndicatorProps) {
  const getMoodColor = (moodValue: number) => {
    if (moodValue <= 3) return TherapyTheme.colors.error;
    if (moodValue <= 5) return TherapyTheme.colors.warning;
    if (moodValue <= 7) return TherapyTheme.colors.accent;
    return TherapyTheme.colors.success;
  };

  const getMoodEmoji = (moodValue: number) => {
    if (moodValue <= 2) return '😢';
    if (moodValue <= 4) return '😕';
    if (moodValue <= 6) return '😐';
    if (moodValue <= 8) return '🙂';
    return '😊';
  };

  const getMoodLabel = (moodValue: number) => {
    if (moodValue <= 2) return 'მძიმე';
    if (moodValue <= 4) return 'დაბალი';
    if (moodValue <= 6) return 'ნეიტრალური';
    if (moodValue <= 8) return 'კარგი';
    return 'შესანიშნავი';
  };

  const sizeMap = {
    sm: { emoji: 20, text: 12, container: 60 },
    md: { emoji: 24, text: 14, container: 80 },
    lg: { emoji: 32, text: 16, container: 100 }
  };

  return (
    <View style={[styles.moodIndicator, { width: sizeMap[size].container }]}>
      <View 
        style={[
          styles.moodCircle, 
          { 
            backgroundColor: getMoodColor(mood),
            width: sizeMap[size].container,
            height: sizeMap[size].container,
          }
        ]}
      >
        <Text style={{ fontSize: sizeMap[size].emoji }}>{getMoodEmoji(mood)}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.moodLabel, { fontSize: sizeMap[size].text }]}>
          {getMoodLabel(mood)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: TherapyTheme.colors.surface,
    borderRadius: TherapyTheme.radius.lg,
    padding: TherapyTheme.spacing.lg,
  },
  
  button: {
    borderRadius: TherapyTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  buttonSm: {
    paddingHorizontal: TherapyTheme.spacing.md,
    paddingVertical: TherapyTheme.spacing.sm,
    minHeight: 36,
  },
  
  buttonMd: {
    paddingHorizontal: TherapyTheme.spacing.lg,
    paddingVertical: TherapyTheme.spacing.md,
    minHeight: 48,
  },
  
  buttonLg: {
    paddingHorizontal: TherapyTheme.spacing.xl,
    paddingVertical: TherapyTheme.spacing.lg,
    minHeight: 56,
  },
  
  buttonPrimary: {
    backgroundColor: TherapyTheme.colors.primary,
  },
  
  buttonSecondary: {
    backgroundColor: TherapyTheme.colors.secondary,
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: TherapyTheme.colors.primary,
  },
  
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  
  buttonDisabled: {
    backgroundColor: TherapyTheme.colors.border,
  },
  
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonIcon: {
    marginRight: TherapyTheme.spacing.sm,
    fontSize: 20,
  },
  
  buttonText: {
    fontWeight: '600',
  },
  
  buttonTextSm: {
    fontSize: 14,
  },
  
  buttonTextMd: {
    fontSize: 16,
  },
  
  buttonTextLg: {
    fontSize: 18,
  },
  
  buttonTextPrimary: {
    color: TherapyTheme.colors.textInverse,
  },
  
  buttonTextSecondary: {
    color: TherapyTheme.colors.textInverse,
  },
  
  buttonTextOutline: {
    color: TherapyTheme.colors.primary,
  },
  
  buttonTextGhost: {
    color: TherapyTheme.colors.primary,
  },
  
  buttonTextDisabled: {
    color: TherapyTheme.colors.textMuted,
  },
  
  moodIndicator: {
    alignItems: 'center',
  },
  
  moodCircle: {
    borderRadius: TherapyTheme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TherapyTheme.spacing.xs,
  },
  
  moodLabel: {
    color: TherapyTheme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
