import React, { useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import {
    PanGestureHandler,
    PinchGestureHandler,
    State
} from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

interface Interactive3DCardProps {
  children: React.ReactNode;
  style?: any;
}

const Interactive3DCard: React.FC<Interactive3DCardProps> = ({ children, style }) => {
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const onPanGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Calculate tilt based on pan
      const { translationX, translationY } = event.nativeEvent;
      const maxTilt = 15;
      
      const tiltX = (translationY / 100) * maxTilt;
      const tiltY = -(translationX / 100) * maxTilt;

      Animated.parallel([
        Animated.timing(rotateX, {
          toValue: tiltX,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateY, {
          toValue: tiltY,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();

      // Reset after a delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(rotateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(rotateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }
  };

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanHandlerStateChange}
    >
      <Animated.View>
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchHandlerStateChange}
        >
          <Animated.View
            style={[
              style,
              {
                transform: [
                  { perspective: 1000 },
                  { rotateX: rotateX.interpolate({
                    inputRange: [-15, 15],
                    outputRange: ['-15deg', '15deg'],
                  }) },
                  { rotateY: rotateY.interpolate({
                    inputRange: [-15, 15],
                    outputRange: ['-15deg', '15deg'],
                  }) },
                  { scale },
                  { translateX },
                  { translateY },
                ],
              },
            ]}
          >
            {children}
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default Interactive3DCard;