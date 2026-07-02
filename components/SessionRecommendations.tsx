import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'практика' | 'упражнение' | 'техника' | 'привычка' | 'ресурс';
  icon: string;
  gradient: string[];
}

interface SessionRecommendationsProps {
  recommendations: Recommendation[];
  sessionSummary: string;
  therapistName: string;
  completionMessage: string;
}

const { width } = Dimensions.get('window');

export const SessionRecommendations: React.FC<SessionRecommendationsProps> = ({
  recommendations,
  sessionSummary,
  therapistName,
  completionMessage,
}) => {
  const { theme, isDark } = useTheme();

  const getCategoryColor = (category: string): string[] => {
    switch (category) {
      case 'практика':
        return ['#667eea', '#764ba2'];
      case 'упражнение':
        return ['#f093fb', '#f5576c'];
      case 'техника':
        return ['#4facfe', '#00f2fe'];
      case 'привычка':
        return ['#43e97b', '#38f9d7'];
      case 'ресурс':
        return ['#fa709a', '#fee140'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    headerIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    completionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    completionText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    recommendationCard: {
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardContent: {
      padding: 20,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardCategory: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 8,
    },
    cardDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    footerText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <FontAwesome5 name="check-circle" size={24} color="#ffffff" />
        </View>
        <Text style={styles.headerTitle}>Сессия завершена</Text>
        <Text style={styles.headerSubtitle}>с {therapistName}</Text>
      </View>

      {/* Completion Message */}
      <View style={styles.completionCard}>
        <Text style={styles.completionText}>{completionMessage}</Text>
      </View>

      {/* Session Summary */}
      {sessionSummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>🎯 Итоги сессии</Text>
          <Text style={styles.summaryText}>{sessionSummary}</Text>
        </View>
      )}

      {/* Recommendations */}
      <Text style={styles.sectionTitle}>💡 Персональные рекомендации</Text>
      
      {recommendations.map((recommendation) => (
        <View key={recommendation.id} style={styles.recommendationCard}>
          <LinearGradient
            colors={recommendation.gradient as [string, string, ...string[]]}
            style={styles.cardContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <FontAwesome5 name={recommendation.icon} size={16} color="#ffffff" />
              </View>
              <Text style={styles.cardCategory}>{recommendation.category}</Text>
            </View>
            <Text style={styles.cardTitle}>{recommendation.title}</Text>
            <Text style={styles.cardDescription}>{recommendation.description}</Text>
          </LinearGradient>
        </View>
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Берегите себя и помните: вы справитесь! 💙
        </Text>
      </View>
    </ScrollView>
  );
};
