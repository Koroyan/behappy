import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface TokenProgressIndicatorProps {
  tokensUsed: number;
  maxTokens: number;
  messagesCount: number;
  isCompact?: boolean; // For header display
}

export const TokenProgressIndicator: React.FC<TokenProgressIndicatorProps> = ({
  tokensUsed,
  maxTokens,
  messagesCount,
  isCompact = false
}) => {
  const { theme, isDark } = useTheme();
  const percentage = Math.min(100, (tokensUsed / maxTokens) * 100);
  
  const getProgressColor = () => {
    if (percentage >= 90) return ['#FF6B6B', '#E74C3C'];
    if (percentage >= 70) return ['#F39C12', '#E67E22'];
    if (percentage >= 50) return ['#3498DB', '#2980B9'];
    return ['#2ECC71', '#27AE60'];
  };

  const getProgressIcon = () => {
    if (percentage >= 90) return 'exclamation-triangle';
    if (percentage >= 70) return 'clock';
    if (percentage >= 50) return 'chart-bar';
    return 'check-circle';
  };

  if (isCompact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.compactContent}>
          <FontAwesome5 
            name={getProgressIcon()} 
            size={12} 
            color={theme.colors.text} 
          />
          <Text style={[styles.compactText, { color: theme.colors.text }]}>
            {percentage.toFixed(0)}%
          </Text>
          <View style={[styles.compactProgressTrack, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
            <LinearGradient
              colors={getProgressColor() as any}
              style={[styles.compactProgressBar, { width: `${percentage}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <FontAwesome5 
          name={getProgressIcon()} 
          size={16} 
          color={theme.colors.text} 
        />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Прогресс сессии
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
          <LinearGradient
            colors={getProgressColor() as any}
            style={[styles.progressBar, { width: `${percentage}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        
        <View style={styles.progressText}>
          <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
            {tokensUsed.toLocaleString()} / {maxTokens.toLocaleString()} токенов
          </Text>
          <Text style={[styles.progressPercentage, { color: theme.colors.text }]}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <FontAwesome5 name="comment" size={12} color={theme.colors.text} />
          <Text style={[styles.detailText, { color: theme.colors.text }]}>
            {messagesCount} сообщений
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <FontAwesome5 name="battery-half" size={12} color={theme.colors.text} />
          <Text style={[styles.detailText, { color: theme.colors.text }]}>
            {(maxTokens - tokensUsed).toLocaleString()} осталось
          </Text>
        </View>
      </View>
      
      {percentage >= 90 && (
        <View style={styles.warningContainer}>
          <FontAwesome5 name="exclamation-triangle" size={14} color="#E74C3C" />
          <Text style={[styles.warningText, { color: '#E74C3C' }]}>
            Сессия подходит к концу!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Compact styles for header
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 6,
  },
  compactProgressTrack: {
    height: 4,
    width: 30,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
