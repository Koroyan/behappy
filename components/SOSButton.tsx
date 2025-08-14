import React, { useEffect } from 'react';
import { TouchableOpacity, Text, Alert, Linking, StyleSheet, View, Platform, Vibration, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface SOSButtonProps {
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'floating' | 'inline' | 'bottom-tab';
}

const emergencyContacts = [
  { name: 'Экстренная помощь', number: '112', description: 'Скорая помощь, полиция, МЧС' },
  { name: 'Психологическая помощь', number: '116123', description: 'Круглосуточная горячая линия' },
  { name: 'Кризисный центр', number: '116111', description: 'Помощь в кризисных ситуациях' },
];

export default function SOSButton({ style, size = 'medium', variant = 'inline' }: SOSButtonProps) {
  const { theme, isDark } = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const stateAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSOSPress = async () => {
    // Press animation
    Animated.sequence([
      Animated.timing(stateAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(stateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Strong haptic feedback
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Vibration.vibrate([0, 100, 100, 100, 300]);
      }
      
      showEmergencyContacts();
    } catch (error) {
      console.log('Haptics error:', error);
    }
  };

  const showEmergencyContacts = () => {
    Alert.alert(
      '🆘 Экстренная помощь',
      'Выберите службу:',
      [
        ...emergencyContacts.map(contact => ({
          text: `${contact.name} (${contact.number})\n${contact.description}`,
          onPress: () => {
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Vibration.vibrate(100);
            }
            Linking.openURL(`tel:${contact.number}`).catch(err => 
              Alert.alert('Ошибка', 'Не удалось совершить звонок')
            );
          },
        })),
        { text: 'Отмена', style: 'cancel' },
      ]
    );
  };

  const buttonSize = {
    small: { width: 40, height: 40, fontSize: 12, iconSize: 16 },
    medium: { width: 56, height: 56, fontSize: 14, iconSize: 24 },
    large: { width: 72, height: 72, fontSize: 16, iconSize: 32 },
  }[size];

  const variantStyle = {
    floating: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      borderRadius: buttonSize.width / 2,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    inline: {
      borderRadius: buttonSize.width / 2,
    },
    'bottom-tab': {
      width: 70,
      height: 70,
      bottom: 20,
      borderRadius: 35,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
  }[variant];

  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        variantStyle,
        {
          transform: [
            { scale: Animated.multiply(pulseAnim, stateAnim) }
          ]
        },
        style
      ]}
    >
      <TouchableOpacity
        onPress={handleSOSPress}
        activeOpacity={0.8}
        style={styles.button}
      >
        <LinearGradient
          colors={['#ff4646', '#ff0000']}
          style={[styles.gradient, { width: buttonSize.width, height: buttonSize.height }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome5 
            name="phone" 
            size={buttonSize.iconSize} 
            color="#ffffff" 
            style={styles.icon} 
          />
          {variant === 'bottom-tab' && (
            <Text style={styles.buttonText}>SOS</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  icon: {
    textAlign: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
