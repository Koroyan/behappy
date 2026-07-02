import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  visible?: boolean;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({
  suggestions,
  onSelect,
  visible = true,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible && suggestions.length > 0) {
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(20, { duration: 200 });
    }
  }, [visible, suggestions.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || suggestions.length === 0) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💭</Text>
        <Text style={styles.headerText}>Suggested responses</Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <ChipButton
            key={index}
            text={suggestion}
            onPress={() => onSelect(suggestion)}
            delay={index * 50}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

interface ChipButtonProps {
  text: string;
  onPress: () => void;
  delay: number;
}

const ChipButton: React.FC<ChipButtonProps> = ({ text, onPress, delay }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 300 });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedChipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedChipStyle}>
      <TouchableOpacity
        style={styles.chip}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.chipText} numberOfLines={2}>
          {text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#81C784',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#2D3748',
    fontWeight: '500',
  },
});

export default QuickReplies;
