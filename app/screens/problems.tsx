import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  AI_THERAPIST_ROLES, 
  PROBLEM_CATEGORIES, 
  CategoryId, 
  TherapistRole, 
  ProblemCategory 
} from '@/services/localAI';
import { SessionManager, TherapySession } from '@/services/sessionManager';

const { width, height } = Dimensions.get('window');

export default function ProblemsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ProblemCategory | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const [activeSessions, setActiveSessions] = useState<TherapySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    loadActiveSessions();
    
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Reload sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadActiveSessions();
    }, [])
  );

  const loadActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessions = await SessionManager.getSessionsByStatus(true);
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error loading active sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCategoryPress = (category: ProblemCategory) => {
    // Always go directly to problem selection - no more dialogs
    setSelectedCategory(category);
    setShowProblems(true);
  };

  const resumeSession = async (session: TherapySession) => {
    try {
      await SessionManager.resumeSession(session.id);
      
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
    }
  };

  const handleProblemSelect = (problem: string, categoryId: CategoryId) => {
    // Check if there's already an active session for this specific problem
    const existingProblemSession = activeSessions.find(session => 
      session.categoryId === categoryId && session.problemContext === problem
    );
    
    if (existingProblemSession) {
      // Resume the existing session for this specific problem
      resumeSession(existingProblemSession);
      return;
    }
    
    // Create a new session for this problem
    const therapistRole = AI_THERAPIST_ROLES[categoryId];
    
    // Navigate to chat with therapist role and problem context
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        therapistRole: JSON.stringify(therapistRole),
        problemContext: problem,
        categoryId: categoryId
      }
    });
    
    setShowProblems(false);
  };

  const renderCategoryCard = (category: ProblemCategory, index: number) => {
    const categorySessions = activeSessions.filter(session => session.categoryId === category.id);
    const hasActiveSession = categorySessions.length > 0;
    
    return (
      <Animated.View
        key={category.id}
        style={[
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.categoryCard, { 
            marginTop: index % 2 === 1 ? 20 : 0,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
            shadowColor: isDark ? '#ffffff' : '#000000',
            shadowOpacity: isDark ? 0.1 : 0.25,
            elevation: isDark ? 4 : 8,
            borderWidth: hasActiveSession ? 2 : 0,
            borderColor: hasActiveSession ? theme.colors.primary : 'transparent',
          }]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.8}
        >
          {/* Active session indicator */}
          {hasActiveSession && (
            <View style={[styles.activeSessionBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.activeSessionCount}>{categorySessions.length}</Text>
            </View>
          )}
          
          <LinearGradient
            colors={category.gradient as any}
            style={styles.categoryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.categoryIcon}>
              <FontAwesome5 
                name={category.icon} 
                size={28} 
                color="white" 
              />
            </View>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.problemsPreview}>
              {category.problems.slice(0, 2).map((problem: string, idx: number) => (
                <Text key={idx} style={styles.problemPreview}>
                  • {problem}
                </Text>
              ))}
              {category.problems.length > 2 && (
                <Text style={styles.moreProblems}>
                  +{category.problems.length - 2} еще...
                </Text>
              )}
            </View>
            <View style={styles.categoryFooter}>
              <Text style={styles.categoryAction}>Начать терапию</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
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
              🌟 Терапевт Anulya
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Персональная терапия для вашего благополучия
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => router.push('/screens/session-history')}
            activeOpacity={0.7}
          >
            <FontAwesome5 
              name="history" 
              size={18} 
              color={theme.colors.text} 
            />
            {activeSessions.length > 0 && (
              <View style={[styles.historyBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.historyBadgeText}>{activeSessions.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#667eea', '#764ba2'] : ['#667eea', '#764ba2']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Начните свой путь к 
                {'\n'}психологическому здоровью
              </Text>
              <Text style={styles.heroSubtitle}>
                Выберите область, которая беспокоит вас больше всего, и получите персонализированную поддержку от AI-терапевта
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.statItem}>
                  <FontAwesome5 name="users" size={16} color="white" />
                  <Text style={styles.statText}>10k+ клиентов</Text>
                </View>
                <View style={styles.statItem}>
                  <FontAwesome5 name="heart" size={16} color="white" />
                  <Text style={styles.statText}>98% эффективность</Text>
                </View>
                <View style={styles.statItem}>
                  <FontAwesome5 name="clock" size={16} color="white" />
                  <Text style={styles.statText}>24/7 поддержка</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Выберите проблему
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Нажмите на категорию, которая лучше всего описывает вашу ситуацию
          </Text>
        </View>

        <View style={styles.categoriesGrid}>
          {PROBLEM_CATEGORIES.map((category, index) => renderCategoryCard(category, index))}
        </View>

        {/* Benefits Section */}
        <Animated.View 
          style={[
            styles.benefitsSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.benefitsTitle, { color: theme.colors.text }]}>
            Почему выбирают нас
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <FontAwesome5 name="shield-alt" size={20} color={theme.colors.primary} />
              <Text style={[styles.benefitText, { color: theme.colors.text }]}>
                Полная конфиденциальность
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <FontAwesome5 name="brain" size={20} color={theme.colors.primary} />
              <Text style={[styles.benefitText, { color: theme.colors.text }]}>
                Научно обоснованные методики
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <FontAwesome5 name="mobile-alt" size={20} color={theme.colors.primary} />
              <Text style={[styles.benefitText, { color: theme.colors.text }]}>
                Доступно в любое время
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Problems Modal */}
      <Modal
        visible={showProblems}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProblems(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedCategory?.title}
            </Text>
            <TouchableOpacity
              onPress={() => setShowProblems(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.therapistInfo}>
              <LinearGradient
                colors={(selectedCategory?.gradient || ['#667eea', '#764ba2']) as any}
                style={styles.therapistCard}
              >
                <FontAwesome5 name="user-md" size={32} color="white" />
                <Text style={styles.therapistName}>
                  {selectedCategory?.id ? AI_THERAPIST_ROLES[selectedCategory.id as CategoryId]?.name : ''}
                </Text>
                <Text style={styles.therapistSpecialty}>
                  {selectedCategory?.id ? AI_THERAPIST_ROLES[selectedCategory.id as CategoryId]?.specialty : ''}
                </Text>
                <Text style={styles.therapistDescription}>
                  {selectedCategory?.id ? AI_THERAPIST_ROLES[selectedCategory.id as CategoryId]?.description : ''}
                </Text>
              </LinearGradient>
            </View>

            <Text style={[styles.problemsListTitle, { color: theme.colors.text }]}>
              Выберите конкретную проблему:
            </Text>
            
            {selectedCategory?.problems.map((problem, index) => {
              const hasActiveSession = activeSessions.some(session => 
                session.categoryId === selectedCategory.id && session.problemContext === problem
              );
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.problemItem, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderColor: hasActiveSession ? theme.colors.primary : theme.colors.border,
                    borderWidth: hasActiveSession ? 2 : 1,
                  }]}
                  onPress={() => handleProblemSelect(problem, selectedCategory.id as CategoryId)}
                >
                  <View style={styles.problemContent}>
                    <Text style={[styles.problemText, { color: theme.colors.text }]}>
                      {hasActiveSession ? '🔄 ' : ''}{problem}
                    </Text>
                    {hasActiveSession ? (
                      <View style={styles.activeProblemBadge}>
                        <Text style={styles.activeProblemText}>Активно</Text>
                      </View>
                    ) : (
                      <MaterialIcons 
                        name="arrow-forward-ios" 
                        size={16} 
                        color={theme.colors.textSecondary} 
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  historyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: (width - 50) / 2,
    height: 220,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  categoryGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryIcon: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  problemsPreview: {
    flex: 1,
    justifyContent: 'center',
  },
  problemPreview: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 2,
  },
  moreProblems: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  categoryAction: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  benefitsSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
  },
  activeSessionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  activeSessionCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  therapistInfo: {
    marginBottom: 30,
  },
  therapistCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  therapistName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  therapistSpecialty: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  therapistDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  problemsListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  problemItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  problemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  problemText: {
    fontSize: 16,
    flex: 1,
  },
  activeProblemBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeProblemText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  // Session Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionDialogContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sessionDialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  sessionDialogSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  sessionsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  sessionItem: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  sessionProblem: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  completeButton: {
    padding: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionInfo: {
    fontSize: 14,
    marginBottom: 10,
  },
  resumeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  newSessionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  newSessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
