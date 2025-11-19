import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { TherapyColors } from '../styles/therapyStyles';

interface TherapeuticAnimationProps {
  type: 'breathing' | 'heart' | 'lotus' | 'waves' | 'gentle_pulse';
  size?: number;
  color?: string;
}

const TherapeuticAnimation: React.FC<TherapeuticAnimationProps> = ({
  type,
  size = 60,
  color = TherapyColors.healing,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    switch (type) {
      case 'breathing':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
        break;
        
      case 'heart':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 800, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        );
        break;
        
      case 'lotus':
        rotation.value = withRepeat(
          withTiming(360, { duration: 20000, easing: Easing.linear }),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 3000 }),
            withTiming(0.6, { duration: 3000 })
          ),
          -1,
          true
        );
        break;
        
      case 'waves':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
        break;
        
      case 'gentle_pulse':
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        break;
    }
  }, [type]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
  }));

  const getEmoji = () => {
    switch (type) {
      case 'breathing': return '🫁';
      case 'heart': return '💚';
      case 'lotus': return '🪷';
      case 'waves': return '🌊';
      case 'gentle_pulse': return '✨';
      default: return '💫';
    }
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', margin: 8 }}>
      <Animated.View style={[animatedStyle]}>
        <LinearGradient
          colors={[color + '40', color + '80', color]}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.4 }}>
            {getEmoji()}
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export default TherapeuticAnimation;