import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAIInsights } from '../../../services/localAI';

const { width } = Dimensions.get('window');

interface CBTSessionResult {
  sessionId: string;
  moduleId: string;
  moduleName: string;
  timestamp: string;
  duration: number; // minutes
  completion: number; // percentage 0-100
  thoughtRecordsCreated: number;
  behaviorExperimentsCompleted: number;
  moodBefore: number; // 1-10 scale
  moodAfter: number; // 1-10 scale
  difficultyRating: number; // 1-5 scale
  keyInsights: string[];
  cognitiveDistortions: string[];
  copingStrategies: string[];
  homeworkCompleted: boolean;
  notes: string;
}

interface CBTProgress {
  completedModules: string[];
  currentModule: string;
  totalScore: number;
  thoughtRecords: number;
  behavioralExperiments: number;
  progressPercentage: number;
  recentActivities: string[];
  weeklyGoals: string[];
  challenges: string[];
  totalSessions: number;
  averageMoodImprovement: number;
  consistencyScore: number; // 0-100
  lastSessionDate: string;
  sessionHistory: CBTSessionResult[];
}

interface CBTModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Легкий' | 'Средний' | 'Сложный';
  icon: string;
  color: string[];
  lessons: number;
  completed: boolean;
  unlocked: boolean;
}

interface AIAnalysis {
  type: 'progress' | 'recommendation' | 'pattern' | 'warning' | 'achievement';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  data?: {
    trendDirection?: 'improving' | 'declining' | 'stable';
    confidence?: number; // 0-100
    suggestedActions?: string[];
    nextSteps?: string[];
  };
}

interface AIInsight {
  type: 'warning' | 'suggestion' | 'encouragement' | 'tip' | 'cognitive-distortion';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

const CBTScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  // Helper functions
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Легкий': return '#4ECDC4';
      case 'Средний': return '#667eea';
      case 'Сложный': return '#ff6b6b';
      default: return '#4ECDC4';
    }
  };

  // Helper function to calculate consistency score
  const calculateConsistencyScore = (sessions: CBTSessionResult[]) => {
    if (sessions.length < 2) return 0;
    
    const last7Days = sessions.filter(session => {
      const sessionDate = new Date(session.timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });
    
    return Math.min(100, (last7Days.length / 7) * 100);
  };

  const [progress, setProgress] = useState<CBTProgress>({
    completedModules: [],
    currentModule: 'introduction',
    totalScore: 0,
    thoughtRecords: 0,
    behavioralExperiments: 0,
    progressPercentage: 0,
    recentActivities: [],
    weeklyGoals: [],
    challenges: [],
    totalSessions: 0,
    averageMoodImprovement: 0,
    consistencyScore: 0,
    lastSessionDate: '',
    sessionHistory: [],
  });

  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const modules: CBTModule[] = [
    {
      id: 'introduction',
      title: 'Введение в КПТ',
      description: 'Изучите основы когнитивно-поведенческой терапии',
      duration: '20 мин',
      difficulty: 'Легкий',
      icon: 'psychology',
      color: ['#4ECDC4', '#44A08D'],
      lessons: 3,
      completed: progress.completedModules.includes('introduction'),
      unlocked: true,
    },
    {
      id: 'thought-patterns',
      title: 'Мыслительные паттерны',
      description: 'Распознавание негативных мыслительных схем',
      duration: '30 мин',
      difficulty: 'Легкий',
      icon: 'lightbulb',
      color: ['#667eea', '#764ba2'],
      lessons: 4,
      completed: progress.completedModules.includes('thought-patterns'),
      unlocked: progress.completedModules.includes('introduction'),
    },
    {
      id: 'cognitive-distortions',
      title: 'Когнитивные искажения',
      description: 'Выявление и изменение искаженных мыслей',
      duration: '40 мин',
      difficulty: 'Средний',
      icon: 'visibility',
      color: ['#f093fb', '#f5576c'],
      lessons: 5,
      completed: progress.completedModules.includes('cognitive-distortions'),
      unlocked: progress.completedModules.includes('thought-patterns'),
    },
    {
      id: 'thought-records',
      title: 'Записи мыслей',
      description: 'Структурированное отслеживание мыслей и эмоций',
      duration: '35 мин',
      difficulty: 'Средний',
      icon: 'edit-note',
      color: ['#a8edea', '#fed6e3'],
      lessons: 4,
      completed: progress.completedModules.includes('thought-records'),
      unlocked: progress.completedModules.includes('cognitive-distortions'),
    },
    {
      id: 'behavioral-experiments',
      title: 'Поведенческие эксперименты',
      description: 'Проверка мыслей через действия',
      duration: '45 мин',
      difficulty: 'Сложный',
      icon: 'science',
      color: ['#ff6b6b', '#ffa726'],
      lessons: 6,
      completed: progress.completedModules.includes('behavioral-experiments'),
      unlocked: progress.completedModules.includes('thought-records'),
    },
    {
      id: 'problem-solving',
      title: 'Решение проблем',
      description: 'Структурированный подход к решению жизненных проблем',
      duration: '40 мин',
      difficulty: 'Средний',
      icon: 'build',
      color: ['#96CEB4', '#FFECD2'],
      lessons: 5,
      completed: progress.completedModules.includes('problem-solving'),
      unlocked: progress.completedModules.includes('behavioral-experiments'),
    },
    {
      id: 'goal-setting',
      title: 'Постановка целей',
      description: 'SMART цели и планирование достижений',
      duration: '30 мин',
      difficulty: 'Средний',
      icon: 'flag',
      color: ['#84fab0', '#8fd3f4'],
      lessons: 4,
      completed: progress.completedModules.includes('goal-setting'),
      unlocked: progress.completedModules.includes('problem-solving'),
    },
    {
      id: 'relapse-prevention',
      title: 'Предотвращение рецидива',
      description: 'Стратегии поддержания прогресса',
      duration: '50 мин',
      difficulty: 'Сложный',
      icon: 'shield',
      color: ['#fa709a', '#fee140'],
      lessons: 6,
      completed: progress.completedModules.includes('relapse-prevention'),
      unlocked: progress.completedModules.includes('goal-setting'),
    },
  ];

  const quickActions = [
    {
      id: 'thought-record',
      title: 'Запись мыслей',
      description: 'Зафиксируйте свои мысли и эмоции',
      icon: 'edit-note',
      color: ['#667eea', '#764ba2'],
      action: () => router.push('/screens/cbt/thought-record' as any),
    },
    {
      id: 'mood-tracker',
      title: 'Трекер настроения',
      description: 'Отследите изменения настроения',
      icon: 'mood',
      color: ['#4ECDC4', '#44A08D'],
      action: () => router.push('/screens/cbt/mood-tracker' as any),
    },
    {
      id: 'behavior-experiment',
      title: 'Поведенческий эксперимент',
      description: 'Проверьте свои убеждения',
      icon: 'science',
      color: ['#f093fb', '#f5576c'],
      action: () => router.push('/screens/cbt/behavior-experiment' as any),
    },
    {
      id: 'cognitive-distortions',
      title: 'Когнитивные искажения',
      description: 'Изучите типы искажений мышления',
      icon: 'visibility',
      color: ['#ff6b6b', '#ffa726'],
      action: () => router.push('/screens/cbt/cognitive-distortions' as any),
    },
    {
      id: 'problem-solving',
      title: 'Решение проблем',
      description: 'Структурированный подход к проблемам',
      icon: 'build',
      color: ['#96CEB4', '#FFECD2'],
      action: () => router.push('/screens/cbt/problem-solving' as any),
    },
    {
      id: 'goal-setting',
      title: 'Постановка целей',
      description: 'SMART цели и планирование',
      icon: 'flag',
      color: ['#84fab0', '#8fd3f4'],
      action: () => router.push('/screens/cbt/goal-setting' as any),
    },
    {
      id: 'exercise-library',
      title: 'Библиотека упражнений',
      description: 'Практические упражнения КПТ',
      icon: 'fitness-center',
      color: ['#43e97b', '#38f9d7'],
      action: () => router.push('/screens/cbt/exercises' as any),
    },
    {
      id: 'analytics',
      title: 'Аналитика',
      description: 'Просмотр прогресса и статистики',
      icon: 'analytics',
      color: ['#a8edea', '#fed6e3'],
      action: () => router.push('/screens/cbt/analytics' as any),
    },
    {
      id: 'ai-insights',
      title: 'ИИ Анализ',
      description: 'Получите персональные рекомендации',
      icon: 'psychology',
      color: ['#667eea', '#764ba2'],
      action: () => {
        setIsLoadingAI(true);
        setShowAIInsights(true);
        analyzeSessionData();
      },
    },
  ];

  useEffect(() => {
    loadProgress();
    loadAIInsights();
  }, []);

  const loadProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('cbt_progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        setProgress(parsedProgress);
        
        // Generate AI insights based on progress
        if (parsedProgress.thoughtRecords > 0 || parsedProgress.behavioralExperiments > 0) {
          analyzeSessionData();
        }
      }
    } catch (error) {
      console.error('Error loading CBT progress:', error);
    }
  };

  const loadAIInsights = async () => {
    try {
      const savedInsights = await AsyncStorage.getItem('cbt_ai_insights');
      if (savedInsights) {
        setAiInsights(JSON.parse(savedInsights));
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
    }
  };

  const analyzeSessionData = async () => {
    try {
      setIsLoadingAI(true);
      const insights = await generateAIInsights(null, 'CBT');
      setAiInsights(insights);
      await AsyncStorage.setItem('cbt_ai_insights', JSON.stringify(insights));
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const renderAIInsight = ({ item }: { item: AIInsight }) => {
    const getInsightIcon = (type: string) => {
      switch (type) {
        case 'suggestion': return 'lightbulb';
        case 'encouragement': return 'favorite';
        case 'tip': return 'star';
        case 'warning': return 'warning';
        default: return 'info';
      }
    };

    const getInsightColor = (type: string) => {
      switch (type) {
        case 'suggestion': return '#4ECDC4';
        case 'encouragement': return '#ff6b6b';
        case 'tip': return '#667eea';
        case 'warning': return '#ffa726';
        default: return '#4ECDC4';
      }
    };

    return (
      <View style={[styles.insightCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIconContainer, { backgroundColor: getInsightColor(item.type) + '20' }]}>
            <MaterialIcons 
              name={getInsightIcon(item.type)} 
              size={24} 
              color={getInsightColor(item.type)} 
            />
          </View>
          <View style={styles.insightHeaderContent}>
            <Text style={[styles.insightTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: getInsightColor(item.type) + '20' }]}>
              <Text style={[styles.priorityText, { color: getInsightColor(item.type) }]}>
                {item.priority}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.insightMessage, { color: theme.colors.textSecondary }]}>
          {item.message}
        </Text>
      </View>
    );
  };

  const saveProgress = async (newProgress: CBTProgress) => {
    try {
      await AsyncStorage.setItem('cbt_progress', JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving CBT progress:', error);
    }
  };

  // Session result saving function
  const saveSessionResult = async (sessionResult: CBTSessionResult) => {
    try {
      const moodImprovement = sessionResult.moodAfter - sessionResult.moodBefore;
      const updatedProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        sessionHistory: [...progress.sessionHistory, sessionResult],
        lastSessionDate: sessionResult.timestamp,
        thoughtRecords: progress.thoughtRecords + sessionResult.thoughtRecordsCreated,
        behavioralExperiments: progress.behavioralExperiments + sessionResult.behaviorExperimentsCompleted,
        averageMoodImprovement: progress.sessionHistory.length > 0 
          ? (progress.sessionHistory.reduce((sum, session) => sum + (session.moodAfter - session.moodBefore), 0) + moodImprovement) / (progress.sessionHistory.length + 1)
          : moodImprovement,
        progressPercentage: Math.min(100, ((progress.totalSessions + 1) / 15) * 100), // Assuming 15 sessions for completion
        consistencyScore: calculateConsistencyScore([...progress.sessionHistory, sessionResult]),
        recentActivities: [...progress.recentActivities, sessionResult.moduleName].slice(-5),
      };

      await saveProgress(updatedProgress);
      
      // Auto-generate AI analysis after session
      setTimeout(() => {
        analyzeSessionData();
      }, 1000);
    } catch (error) {
      console.error('Error saving session result:', error);
    }
  };

  const saveCBTSessionResult = async (result: CBTSessionResult) => {
    try {
      const existingData = await AsyncStorage.getItem('CBTSessionHistory');
      const sessionHistory = existingData ? JSON.parse(existingData) : [];
      sessionHistory.push(result);
      await AsyncStorage.setItem('CBTSessionHistory', JSON.stringify(sessionHistory));

      const updatedProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        completedModules: progress.completedModules.includes(result.moduleId) 
          ? progress.completedModules 
          : [...progress.completedModules, result.moduleId],
        averageMoodImprovement: calculateAverageMoodImprovement(sessionHistory),
        mostCommonDistortions: analyzeCognitiveDistortions(sessionHistory),
        effectiveCopingStrategies: analyzeEffectiveStrategies(sessionHistory),
        homeworkCompletionRate: calculateHomeworkCompletionRate(sessionHistory),
        lastSessionDate: result.timestamp
      };

      await AsyncStorage.setItem('cbt_progress', JSON.stringify(updatedProgress));
      setProgress(updatedProgress);

      // Generate and filter AI insights
      const allInsights = await generateAIInsights(null, 'CBT');
      const filteredInsights: AIInsight[] = allInsights
        .filter(insight => 
          ['warning', 'suggestion', 'encouragement', 'tip', 'cognitive-distortion'].includes(insight.type)
        )
        .map(insight => ({
          type: insight.type as AIInsight['type'],
          title: insight.title,
          message: insight.message,
          priority: insight.priority,
          timestamp: insight.timestamp,
        }))
        .sort((a, b) => {
          const priorityMap = { high: 3, medium: 2, low: 1 };
          return priorityMap[b.priority] - priorityMap[a.priority];
        });

      setAiInsights(filteredInsights);
      await AsyncStorage.setItem('cbt_ai_insights', JSON.stringify(filteredInsights));

      // Show high-priority insights immediately
      const highPriorityInsights = filteredInsights.filter(i => i.priority === 'high');
      if (highPriorityInsights.length > 0) {
        setShowAIInsights(true);
      }

    } catch (error) {
      console.error('Error saving CBT session result:', error);
    }
  };

  // Helper functions for analyzing session data
  const calculateAverageMoodImprovement = (sessions: CBTSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const improvements = sessions.map(s => s.moodAfter - s.moodBefore);
    return improvements.reduce((a, b) => a + b, 0) / sessions.length;
  };

  const analyzeCognitiveDistortions = (sessions: CBTSessionResult[]) => {
    const distortions = sessions.flatMap(s => s.cognitiveDistortions);
    return Object.entries(
      distortions.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([distortion]) => distortion);
  };

  const analyzeEffectiveStrategies = (sessions: CBTSessionResult[]) => {
    return sessions
      .filter(s => s.moodAfter - s.moodBefore > 2) // Significant improvement
      .flatMap(s => s.copingStrategies)
      .reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  };

  const calculateHomeworkCompletionRate = (sessions: CBTSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const completedCount = sessions.filter(s => s.homeworkCompleted).length;
    return (completedCount / sessions.length) * 100;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Когнитивно-поведенческая терапия
        </Text>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowAIInsights(true)}
        >
          <MaterialIcons name="psychology" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* AI Insights Preview */}
        {aiInsights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                ИИ Рекомендации
              </Text>
              <TouchableOpacity onPress={() => setShowAIInsights(true)}>
                <Text style={[styles.seeAllButton, { color: theme.colors.primary }]}>
                  Все
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={aiInsights.slice(0, 2)}
              renderItem={renderAIInsight}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsContainer}
            />
          </View>
        )}

        {/* Progress Overview */}
        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={isDark ? ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'] : ['rgba(78, 205, 196, 0.1)', 'rgba(68, 160, 141, 0.1)']}
            style={styles.progressGradient}
          >
            <View style={styles.progressHeader}>
              <View style={styles.progressIcon}>
                <MaterialIcons name="psychology" size={32} color="#4ECDC4" />
              </View>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                  Ваш прогресс в КПТ
                </Text>
                <Text style={[styles.progressSubtitle, { color: theme.colors.textSecondary }]}>
                  {progress.completedModules.length} из {modules.length} модулей завершено
                </Text>
              </View>
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {progress.thoughtRecords}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Записей мыслей
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {progress.behavioralExperiments}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Экспериментов
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {Math.round(progress.progressPercentage)}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Прогресс
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}
          >
            Быстрые действия
          </Text>
          <FlatList
            data={quickActions}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.action();
                }}
              >
                <LinearGradient
                  colors={item.color as [string, string]}
                  style={styles.quickActionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name={item.icon as any} size={28} color="#fff" />
                  <View style={styles.quickActionContent}>
                    <Text style={styles.quickActionTitle}>{item.title}</Text>
                    <Text style={styles.quickActionDescription}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* CBT Modules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}
          >
            Модули КПТ
          </Text>
          <FlatList
            data={modules}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.moduleCard,
                  { backgroundColor: theme.colors.card },
                  !item.unlocked && styles.moduleCardDisabled,
                ]}
                onPress={() => {
                  if (item.unlocked) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/screens/cbt/module/${item.id}` as any);
                  }
                }}
                disabled={!item.unlocked}
              >
                <LinearGradient
                  colors={item.unlocked ? (item.color as any) : (['#cccccc', '#aaaaaa'] as any)}
                  style={styles.moduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.moduleHeader}>
                    <MaterialIcons 
                      name={item.icon as any} 
                      size={32} 
                      color={item.unlocked ? '#fff' : 'rgba(255,255,255,0.5)'} 
                    />
                    <View style={styles.moduleStatus}>
                      {item.completed && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                        </View>
                      )}
                      {!item.unlocked && (
                        <View style={styles.lockedBadge}>
                          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.7)" />
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.moduleContent}>
                    <Text style={[
                      styles.moduleTitle,
                      { color: item.unlocked ? '#fff' : 'rgba(255,255,255,0.7)' }
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={[
                      styles.moduleDescription,
                      { color: item.unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }
                    ]}>
                      {item.description}
                    </Text>
                    
                    <View style={styles.moduleMetrics}>
                      <View style={styles.metricItem}>
                        <MaterialIcons name="schedule" size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.metricText}>{item.duration}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <MaterialIcons name="school" size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.metricText}>{item.lessons} уроков</Text>
                      </View>
                      <View style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(item.difficulty) + '30' }
                      ]}>
                        <Text style={[
                          styles.difficultyText,
                          { color: getDifficultyColor(item.difficulty) }
                        ]}>
                          {item.difficulty}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* AI Tips Section */}
        <View style={[styles.tipsCard, { backgroundColor: theme.colors.card }]}
        >
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.tipsGradient}
          >
            <View style={styles.tipsHeader}>
              <MaterialIcons name="psychology" size={24} color="#667eea" />
              <Text style={[styles.tipsTitle, { color: theme.colors.text }]}
              >
                ИИ Совет дня
              </Text>
            </View>
            <Text style={[styles.tipsText, { color: theme.colors.text }]}>
              Попробуйте вести записи мыслей регулярно. Это поможет вам лучше понять 
              связь между вашими мыслями, эмоциями и поведением.
            </Text>
            <TouchableOpacity 
              style={styles.generateTipButton}
              onPress={analyzeSessionData}
              disabled={isLoadingAI}
            >
              {isLoadingAI ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={[styles.generateTipText, { color: theme.colors.primary }]}>
                  Получить персональный совет
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* AI Insights Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAIInsights}
        onRequestClose={() => setShowAIInsights(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAIInsights(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                ИИ Анализ CBT
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAIInsights(false)}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {isLoadingAI ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                  Анализируем ваш прогресс...
                </Text>
              </View>
            ) : aiInsights.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="psychology" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Нет данных для анализа
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                  Попробуйте пройти несколько сессий, чтобы получить персональные рекомендации
                </Text>
              </View>
            ) : (
              <FlatList
                data={aiInsights}
                renderItem={renderAIInsight}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                style={styles.insightsList}
                contentContainerStyle={styles.insightsContainer}
              />
            )}
            
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
              onPress={analyzeSessionData}
              disabled={isLoadingAI}
            >
              {isLoadingAI ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={20} color="white" />
                  <Text style={styles.refreshButtonText}>Обновить анализ</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  infoButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  progressCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  progressGradient: {
    padding: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressIcon: {
    marginRight: 16,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightsContainer: {
    paddingHorizontal: 16,
  },
  quickActionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quickActionContent: {
    flex: 1,
    marginLeft: 16,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  moduleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  moduleCardDisabled: {
    opacity: 0.6,
  },
  moduleGradient: {
    padding: 20,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  lockedBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  moduleContent: {
    gap: 12,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  moduleMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipsCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipsGradient: {
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // AI Analysis Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  insightsList: {
    flex: 1,
  },
  insightsContainer: {
    paddingBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  generateTipButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  generateTipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default CBTScreen;
