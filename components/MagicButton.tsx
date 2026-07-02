import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface MagicButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  colors?: string[];
  style?: any;
  textStyle?: any;
  emoji?: string;
}

const MagicButton: React.FC<MagicButtonProps> = ({
  title,
  onPress,
  disabled = false,
  colors = ['#667eea', '#764ba2'],
  style,
  textStyle,
  emoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [ripples, setRipples] = useState<any[]>([]);

  React.useEffect(() => {
    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    if (disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Ripple effect
    const newRipple = {
      id: Date.now(),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
    };

    setRipples(prev => [...prev, newRipple]);

    Animated.parallel([
      Animated.timing(newRipple.scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(newRipple.opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    });

    onPress();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.4)'],
  });

  return (
    <TouchableWithoutFeedback onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          styles.container,
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={disabled 
            ? ['#94A3B8', '#64748B'] as const
            : (colors.length >= 2 ? colors as any : ['#667eea', '#764ba2'] as const)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Glow overlay */}
          <Animated.View
            style={[
              styles.glowOverlay,
              { backgroundColor: glowColor },
            ]}
          />

          {/* Ripple effects */}
          {ripples.map((ripple) => (
            <Animated.View
              key={ripple.id}
              style={[
                styles.ripple,
                {
                  transform: [{ scale: ripple.scale }],
                  opacity: ripple.opacity,
                },
              ]}
            />
          ))}

          {/* Button content */}
          <View style={styles.content}>
            {emoji && <Text style={styles.emoji}>{emoji}</Text>}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </View>

          {/* Shine effect */}
          <View style={styles.shine} />
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'relative',
    borderRadius: 25,
    overflow: 'hidden',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    marginLeft: -100,
    marginTop: -100,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
});

export default MagicButton;