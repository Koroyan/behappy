import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const RainbowPath: React.FC = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createRainbowAnimation = () => {
      const pathAnimation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        })
      );

      const opacityAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );

      pathAnimation.start();
      opacityAnimation.start();
    };

    createRainbowAnimation();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: height * 0.3,
        left: -50,
        width: 100,
        height: 8,
        transform: [
          { translateX },
          { rotate },
        ],
        opacity,
        zIndex: 1,
      }}
    >
      <LinearGradient
        colors={[
          '#FF0000', // წითელი
          '#FF7F00', // ნარინჯისფერი
          '#FFFF00', // ყვითელი
          '#00FF00', // მწვანე
          '#0000FF', // ლურჯი
          '#4B0082', // ინდიგო
          '#9400D3', // იასამნისფერი
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flex: 1,
          borderRadius: 4,
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 5,
        }}
      />
    </Animated.View>
  );
};