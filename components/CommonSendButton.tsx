import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

interface CommonSendButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  size?: number;
}

export default function CommonSendButton({ 
  onPress, 
  disabled = false, 
  loading = false,
  icon = 'paper-plane',
  size = 18
}: CommonSendButtonProps) {
  const { theme, isDark } = useTheme();

  const buttonColor = disabled 
    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
    : (isDark ? '#3b82f6' : '#000000');

  const iconColor = disabled
    ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')
    : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[styles.sendButton, { backgroundColor: buttonColor }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <FontAwesome5 name={icon} size={size} color={iconColor} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
