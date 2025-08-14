import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SessionManager, TherapySession, SessionSummary } from '@/services/sessionManager';
import { AI_THERAPIST_ROLES, PROBLEM_CATEGORIES } from '@/services/localAI';

const { width } = Dimensions.get('window');

export default function SessionHistoryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [activeSessions, setActiveSessions] = useState<TherapySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<TherapySession[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [active, completed, sessionSummary] = await Promise.all([
        SessionManager.getSessionsByStatus(true),
        SessionManager.getSessionsByStatus(false),
        SessionManager.getSessionSummary()
      ]);

      setActiveSessions(active);
      setCompletedSessions(completed);
      setSummary(sessionSummary);
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю сеансов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleResumeSession = async (session: TherapySession) => {
    try {
      await SessionManager.resumeSession(session.id);
      
      // Navigate to chat with session data
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          sessionId: session.id,
          therapistRole: JSON.stringify(session.therapistRole),
          problemContext: session.problemContext,
          categoryId: session.categoryId
        }
      });
    } catch (error) {
      console.error('Error resuming session:', error);
      Alert.alert('Ошибка', 'Не удалось возобновить сеанс');
    }
  };

  const handleDeleteSession = (session: TherapySession) => {
    Alert.alert(
      'Удалить сеанс',
      `Вы уверены, что хотите удалить сеанс с проблемой "${session.problemContext}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await SessionManager.deleteSession(session.id);
              loadSessions(); // Refresh the list
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Ошибка', 'Не удалось удалить сеанс');
            }
          }
        }
      ]
    );
  };

  const formatSessionInfo = (session: TherapySession): string => {
    return `${session.messageCount} сообщений`;
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = PROBLEM_CATEGORIES.find(cat => cat.id === categoryId);
    const therapist = AI_THERAPIST_ROLES[categoryId as keyof typeof AI_THERAPIST_ROLES];
    return { category, therapist };
  };

  const renderSessionCard = (session: TherapySession, isActive: boolean) => {
    const { category, therapist } = getCategoryInfo(session.categoryId);
    
    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.sessionCard, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
          borderColor: isActive ? theme.colors.primary : theme.colors.border,
          borderWidth: isActive ? 2 : 1,
        }]}
        onPress={() => isActive ? handleResumeSession(session) : null}
        activeOpacity={isActive ? 0.7 : 1}
      >
        <LinearGradient
          colors={(category?.gradient || ['#667eea', '#764ba2']) as any}
          style={styles.sessionHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.sessionHeaderContent}>
            <FontAwesome5 
              name={category?.icon || 'brain'} 
              size={20} 
              color="white" 
            />
            <Text style={styles.sessionCategoryTitle}>{category?.title}</Text>
            {isActive && (
              <View style={styles.activeIndicator}>
                <Text style={styles.activeText}>АКТИВНЫЙ</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.sessionContent}>
          <Text style={[styles.problemText, { color: theme.colors.text }]}>
            {session.problemContext}
          </Text>
          
          <View style={styles.sessionMeta}>
            <View style={styles.metaRow}>
              <FontAwesome5 name="user-md" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {therapist?.name || 'Anulya'}
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <FontAwesome5 name="comments" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {session.messageCount} сообщений
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <FontAwesome5 name="message" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatSessionInfo(session)}
              </Text>
            </View>
          </View>

          {isActive ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleResumeSession(session)}
            >
              <FontAwesome5 name="play" size={14} color="white" />
              <Text style={styles.actionButtonText}>Продолжить</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedActions}>
              <TouchableOpacity
                style={[styles.readButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => {
                  // Navigate to read-only chat view
                  router.push({
                    pathname: '/(tabs)/chat',
                    params: {
                      sessionId: session.id,
                      readOnly: 'true'
                    }
                  });
                }}
              >
                <FontAwesome5 name="eye" size={12} color={theme.colors.text} />
                <Text style={[styles.readButtonText, { color: theme.colors.text }]}>Читать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(session)}
              >
                <FontAwesome5 name="trash" size={12} color="#ff4757" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummaryCard = () => {
    if (!summary) return null;

    return (
      <LinearGradient
        colors={isDark ? ['#2c2c54', '#40407a'] : ['#f8f9fa', '#e9ecef']}
        style={styles.summaryCard}
      >
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
          Статистика сеансов
        </Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.colors.primary }]}>
              {summary.totalSessions}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Всего сеансов
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#10b981' }]}>
              {summary.activeSessions}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Активных
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#8b5cf6' }]}>
              {summary.completedSessions}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Завершенных
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#f59e0b' }]}>
              {summary.totalMessagesSent}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Всего сообщений
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Загрузка сеансов...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f8f9fa', '#e9ecef']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <FontAwesome5 
              name="arrow-left" 
              size={20} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              История сеансов
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Управление вашими сеансами с Anulya
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <FontAwesome5 
              name="sync-alt" 
              size={18} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        {renderSummaryCard()}

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Активные сеансы ({activeSessions.length})
            </Text>
            {activeSessions.map(session => renderSessionCard(session, true))}
          </View>
        )}

        {/* Completed Sessions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Завершенные сеансы ({completedSessions.length})
          </Text>
          {completedSessions.length > 0 ? (
            completedSessions.map(session => renderSessionCard(session, false))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <FontAwesome5 name="history" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                У вас пока нет завершенных сеансов
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sessionCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sessionHeader: {
    padding: 16,
  },
  sessionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionCategoryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  activeIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sessionContent: {
    padding: 16,
  },
  problemText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  sessionMeta: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  completedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  readButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
});
