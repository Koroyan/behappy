import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { TherapyColors } from '../styles/therapyStyles';

interface ConversationLockProps {
  onUnlock: () => void;
}

const LOCK_ENABLED_KEY = 'conversation_lock_enabled';

const ConversationLock: React.FC<ConversationLockProps> = ({ onUnlock }) => {
  const [biometricType, setBiometricType] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setBiometricType('PIN');
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setBiometricType('PIN');
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Biometric check error:', error);
      setBiometricType('PIN');
    }
  };

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your therapy conversations',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        onUnlock();
      } else {
        Alert.alert(
          'Authentication Failed',
          'Please try again or use your device PIN.',
          [{ text: 'Try Again', onPress: handleAuthenticate }]
        );
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert(
        'Error',
        'Authentication failed. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getBiometricIcon = (): 'scan' | 'finger-print' | 'eye' | 'lock-closed' => {
    if (biometricType.includes('Face')) return 'scan';
    if (biometricType.includes('Fingerprint')) return 'finger-print';
    if (biometricType.includes('Iris')) return 'eye';
    return 'lock-closed';
  };

  return (
    <LinearGradient
      colors={['#F5F8FA', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[TherapyColors.primary, TherapyColors.healing]}
            style={styles.iconGradient}
          >
            <Ionicons name={getBiometricIcon()} size={64} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>Protected Space</Text>
        <Text style={styles.subtitle}>
          Your therapy conversations are private and secure
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={20} color={TherapyColors.healing} />
            <Text style={styles.featureText}>End-to-end encrypted</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="lock-closed" size={20} color={TherapyColors.healing} />
            <Text style={styles.featureText}>Biometric protection</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="eye-off" size={20} color={TherapyColors.healing} />
            <Text style={styles.featureText}>Your privacy guaranteed</Text>
          </View>
        </View>

        {/* Unlock Button */}
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
        >
          <LinearGradient
            colors={[TherapyColors.primary, TherapyColors.healing]}
            style={styles.buttonGradient}
          >
            <Ionicons 
              name={isAuthenticating ? "hourglass" : getBiometricIcon()} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.unlockButtonText}>
              {isAuthenticating ? 'Authenticating...' : `Unlock with ${biometricType}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          This adds an extra layer of security to protect your sensitive therapeutic conversations.
        </Text>

        {/* Emergency Access */}
        <TouchableOpacity style={styles.emergencyButton}>
          <Text style={styles.emergencyButtonText}>
            Need help? Contact support
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export async function enableConversationLock(): Promise<void> {
  await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'true');
}

export async function disableConversationLock(): Promise<void> {
  await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'false');
}

export async function isConversationLockEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 15,
    color: '#2D3748',
    marginLeft: 12,
    fontWeight: '500',
  },
  unlockButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  unlockButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emergencyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emergencyButtonText: {
    fontSize: 14,
    color: TherapyColors.primary,
    fontWeight: '600',
  },
});

export default ConversationLock;
