import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Recommendation {
  title: string;
  description: string;
  category: string;
  icon: string;
  actionSteps: string[];
  expectedResult: string;
}

interface ChatRecommendationsProps {
  recommendations: {
    recommendations: Recommendation[];
    completionMessage?: string;
    sessionSummary?: string;
    therapistName?: string;
  };
}

export const ChatRecommendations: React.FC<ChatRecommendationsProps> = ({
  recommendations: data
}) => {
  const { theme, isDark } = useTheme();
  const recommendations = data.recommendations || [];

  const getCategoryColor = (category: string): [string, string] => {
    switch (category.toLowerCase()) {
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
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 20,
      padding: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    completionMessage: {
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    recommendationCard: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    recommendationHeader: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    recommendationTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
      flex: 1,
    },
    categoryBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    categoryText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    recommendationContent: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
      padding: 16,
    },
    description: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    stepsSection: {
      marginBottom: 16,
    },
    stepsTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    step: {
      fontSize: 13,
      color: theme.colors.text,
      marginBottom: 4,
      paddingLeft: 8,
    },
    resultSection: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      padding: 12,
      borderRadius: 8,
    },
    resultTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    resultText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    summarySection: {
      marginTop: 20,
      padding: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    summaryText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      textAlign: 'center',
    },
    footer: {
      marginTop: 20,
      alignItems: 'center',
    },
    therapistName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 8,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <FontAwesome5 name="star" size={24} color="white" />
        </View>
        <Text style={styles.headerTitle}>
          ✨ Персональные рекомендации
        </Text>
        <Text style={styles.completionMessage}>
          {data.completionMessage || 'Персональные рекомендации на основе нашей беседы:'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        🎯 Ваш план действий
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationCard}>
            <LinearGradient
              colors={getCategoryColor(recommendation.category)}
              style={styles.recommendationHeader}
            >
              <View style={styles.iconContainer}>
                <FontAwesome5 
                  name={recommendation.icon || 'lightbulb'} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={styles.recommendationTitle}>
                {recommendation.title}
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {recommendation.category}
                </Text>
              </View>
            </LinearGradient>
            
            <View style={styles.recommendationContent}>
              <Text style={styles.description}>
                {recommendation.description}
              </Text>
              
              <View style={styles.stepsSection}>
                <Text style={styles.stepsTitle}>
                  ⭐ Как применить:
                </Text>
                {recommendation.actionSteps.map((step, stepIndex) => (
                  <Text key={stepIndex} style={styles.step}>
                    {stepIndex + 1}. {step}
                  </Text>
                ))}
              </View>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>
                  🎯 Ожидаемый результат:
                </Text>
                <Text style={styles.resultText}>
                  {recommendation.expectedResult}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>
          💭 Итог сессии
        </Text>
        <Text style={styles.summaryText}>
          {data.sessionSummary || 'Благодарю за открытость в нашей беседе. Помните, что изменения требуют времени и практики.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.therapistName}>
          {data.therapistName || 'Ваш AI-помощник'} 💚
        </Text>
        <Text style={styles.footerText}>
          🌟 Помните: изменения требуют времени и терпения.{'\n'}
          Будьте добры к себе в процессе роста.
        </Text>
      </View>
    </View>
  );
};
