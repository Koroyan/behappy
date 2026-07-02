import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  emoji: string;
}

const ParticleSystem: React.FC = () => {
  const particles = useRef<Particle[]>([]);
  
  useEffect(() => {
    const emojis = ['✨', '🎨', '🌟', '💫', '⭐', '🎭', '🎪', '🎨'];
    
    // Create particles
    for (let i = 0; i < 15; i++) {
      const particle: Particle = {
        id: i,
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      };
      particles.current.push(particle);
    }

    // Animate particles
    const animateParticles = () => {
      particles.current.forEach((particle, index) => {
        const delay = index * 200;
        
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: -100,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.y, {
              toValue: height + 100,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        ).start();
      });
    };

    animateParticles();
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((particle) => (
        <Animated.Text
          key={particle.id}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          {particle.emoji}
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    fontSize: 20,
  },
});

export default ParticleSystem;