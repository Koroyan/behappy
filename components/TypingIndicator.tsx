import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
// Minimalist styling to match AI chat bubble

interface TypingIndicatorProps {
  color?: string; // dot color
  size?: number;  // dot size
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  color = '#111827',
  size = 8 
}) => {
  // Shared values for each dot
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    // Staggered animation for natural typing effect
    dot1.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1, // infinite
      false
    );

    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );

    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, []);

  // Animated styles for each dot
  const animatedDot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const animatedDot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const animatedDot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View 
          style={[
            styles.dot, 
            { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
            animatedDot1Style
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
            animatedDot2Style
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
            animatedDot3Style
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 16,
    marginVertical: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
  },
  dot: {
    marginHorizontal: 3,
  },
});

export default TypingIndicator;
