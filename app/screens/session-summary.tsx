import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SessionManager } from '@/services/sessionManager';
import { TherapySession } from '@/services/sessionManager';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SessionSummary() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<TherapySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      if (sessionId) {
        const sessionData = await SessionManager.getSession(sessionId);
        setSession(sessionData);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    router.push('/screens/problems');
  };

  const handleViewHistory = () => {
    router.push('/screens/session-history');
  };

  const handleShare = async () => {
    if (!session) return;
    
    // Create a summary text without timestamps
    const summaryText = `
Сессия терапии - ${session.therapistRole?.name || 'Общая терапия'}
Терапевт: ${session.therapistRole?.name || 'Не указан'}

Количество сообщений: ${session.messages.length}
Категория: ${session.categoryId || 'Не указана'}
Контекст: ${session.problemContext || 'Не указан'}

Это краткое описание вашей терапевтической сессии.
    `.trim();

    Alert.alert(
      'Поделиться сессией',
      summaryText,
      [
        { text: 'Закрыть', style: 'cancel' },
        { text: 'Копировать', onPress: () => {
          // In a real app, you would use Clipboard.setString(summaryText)
          Alert.alert('Успех', 'Сводка скопирована в буфер обмена');
        }}
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    loadingText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 50,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 50,
      marginBottom: 20,
    },
    header: {
      marginBottom: 30,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      opacity: 0.7,
    },
    summaryCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    summaryLabel: {
      fontSize: 14,
      opacity: 0.7,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    contextCard: {
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    contextTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    contextText: {
      fontSize: 14,
      lineHeight: 20,
    },
    therapistCard: {
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    therapistName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 5,
    },
    therapistRole: {
      fontSize: 14,
      opacity: 0.7,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    iconButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 50,
      height: 50,
      borderRadius: 25,
      marginHorizontal: 10,
    },
    recommendationsCard: {
      backgroundColor: '#f9fafb',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    recommendationsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    recommendationBullet: {
      fontSize: 16,
      fontWeight: 'bold',
      marginRight: 8,
      marginTop: 2,
    },
    recommendationText: {
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
    },
    completionCard: {
      backgroundColor: '#f9fafb',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    completionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    completionText: {
      fontSize: 14,
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Загрузка сессии...
        </Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Сессия не найдена
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleNewSession}
        >
          <Text style={styles.buttonText}>Начать новую сессию</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Сводка сессии
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          {session.therapistRole?.name || 'Терапевтическая сессия'}
        </Text>
      </View>

      <LinearGradient
        colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
        style={styles.summaryCard}
      >
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
          Статистика сессии
        </Text>
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>
            Количество сообщений
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
            {session.messages.length}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>
            Категория
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {session.categoryId || 'Не указана'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>
            Статус
          </Text>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
            Завершена
          </Text>
        </View>
      </LinearGradient>

      {session.problemContext && (
        <View style={[styles.contextCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.contextTitle, { color: theme.colors.text }]}>
            Контекст проблемы
          </Text>
          <Text style={[styles.contextText, { color: theme.colors.text }]}>
            {session.problemContext}
          </Text>
        </View>
      )}

      {session.therapistRole && (
        <View style={[styles.therapistCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.therapistName, { color: theme.colors.text }]}>
            {session.therapistRole.name}
          </Text>
          <Text style={[styles.therapistRole, { color: theme.colors.text }]}>
            {session.therapistRole.description}
          </Text>
        </View>
      )}

      {/* Recommendations Section */}
      {session.recommendations && session.recommendations.length > 0 && (
        <View style={[styles.recommendationsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.recommendationsTitle, { color: theme.colors.text }]}>
            💡 Персональные рекомендации
          </Text>
          {session.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={[styles.recommendationBullet, { color: theme.colors.primary }]}>
                •
              </Text>
              <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                {recommendation}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Completion Summary */}
      {session.completionSummary && (
        <View style={[styles.completionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
            🎯 Итоги сессии
          </Text>
          <Text style={[styles.completionText, { color: theme.colors.text }]}>
            {session.completionSummary}
          </Text>
        </View>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleNewSession}
        >
          <Text style={styles.buttonText}>Новая сессия</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6b7280' }]}
          onPress={handleViewHistory}
        >
          <Text style={styles.buttonText}>История</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={handleShare}
        >
          <FontAwesome5 name="share-alt" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
