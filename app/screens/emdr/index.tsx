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

interface EMDRSessionResult {
  sessionId: string;
  moduleId: string;
  moduleName: string;
  timestamp: string;
  duration: number; // minutes
  phase: 'preparation' | 'assessment' | 'desensitization' | 'installation' | 'body-scan' | 'closure' | 'reevaluation';
  sudsLevelBefore: number; // 0-10 scale
  sudsLevelAfter: number; // 0-10 scale
  vocLevelBefore: number; // 1-7 scale (validity of cognition)
  vocLevelAfter: number; // 1-7 scale
  targetMemory: string;
  negativeBeliefs: string[];
  positiveBeliefs: string[];
  bodyTensionAreas: string[];
  bilateralStimulationType: 'eye-movement' | 'tapping' | 'audio' | 'tactile';
  stimulationSessions: number;
  resourcesUsed: string[];
  breakthroughs: string[];
  challenges: string[];
  safetyRating: number; // 1-10 scale
  stabilityRating: number; // 1-10 scale
  notes: string;
}

interface EMDRProgress {
  completedSessions: string[];
  currentPhase: string;
  totalScore: number;
  processedMemories: number;
  resourcesInstalled: number;
  progressPercentage: number;
  sudsLevels: number[];
  recentSessions: string[];
  traumaProcessingScore: number;
  resourceInstallationScore: number;
  bilateralStimulationUsage: number;
  safetyAndStability: number;
  totalSessions: number;
  averageSudsImprovement: number;
  averageVocImprovement: number;
  lastSessionDate: string;
  sessionHistory: EMDRSessionResult[];
}

interface EMDRModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  phase: 'preparation' | 'processing' | 'integration';
  icon: string;
  color: string[];
  sessions: number;
  completed: boolean;
  unlocked: boolean;
  difficulty: 'Легкий' | 'Средний' | 'Сложный';
}

interface AIInsight {
  type: 'warning' | 'suggestion' | 'encouragement' | 'tip' | 'phase-guidance';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

const EMDRScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [progress, setProgress] = useState<EMDRProgress>({
    completedSessions: [],
    currentPhase: 'preparation',
    totalScore: 0,
    processedMemories: 0,
    resourcesInstalled: 0,
    progressPercentage: 0,
    sudsLevels: [],
    recentSessions: [],
    traumaProcessingScore: 0,
    resourceInstallationScore: 0,
    bilateralStimulationUsage: 0,
    safetyAndStability: 0,
    totalSessions: 0,
    averageSudsImprovement: 0,
    averageVocImprovement: 0,
    lastSessionDate: '',
    sessionHistory: [],
  });

  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const modules: EMDRModule[] = [
    {
      id: 'preparation',
      title: 'Подготовка',
      description: 'Стабилизация и развитие ресурсов',
      duration: '60-90 мин',
      phase: 'preparation',
      icon: 'foundation',
      color: ['#667eea', '#764ba2'],
      sessions: 4,
      completed: progress.completedSessions.includes('preparation'),
      unlocked: true,
      difficulty: 'Легкий',
    },
    {
      id: 'safe-place',
      title: 'Безопасное место',
      description: 'Создание внутреннего ресурса безопасности',
      duration: '45-60 мин',
      phase: 'preparation',
      icon: 'home',
      color: ['#4ECDC4', '#44A08D'],
      sessions: 3,
      completed: progress.completedSessions.includes('safe-place'),
      unlocked: progress.completedSessions.includes('preparation'),
      difficulty: 'Легкий',
    },
    {
      id: 'resource-installation',
      title: 'Инсталляция ресурсов',
      description: 'Укрепление позитивных качеств',
      duration: '45-75 мин',
      phase: 'preparation',
      icon: 'build-circle',
      color: ['#f093fb', '#f5576c'],
      sessions: 5,
      completed: progress.completedSessions.includes('resource-installation'),
      unlocked: progress.completedSessions.includes('safe-place'),
      difficulty: 'Средний',
    },
    {
      id: 'assessment',
      title: 'Оценка',
      description: 'Идентификация целевых воспоминаний',
      duration: '60-90 мин',
      phase: 'processing',
      icon: 'assessment',
      color: ['#4facfe', '#00f2fe'],
      sessions: 2,
      completed: progress.completedSessions.includes('assessment'),
      unlocked: progress.completedSessions.includes('resource-installation'),
      difficulty: 'Средний',
    },
    {
      id: 'desensitization',
      title: 'Десенсибилизация',
      description: 'Снижение эмоционального заряда',
      duration: '60-120 мин',
      phase: 'processing',
      icon: 'timeline',
      color: ['#43e97b', '#38f9d7'],
      sessions: 6,
      completed: progress.completedSessions.includes('desensitization'),
      unlocked: progress.completedSessions.includes('assessment'),
      difficulty: 'Сложный',
    },
    {
      id: 'installation',
      title: 'Инсталляция',
      description: 'Укрепление позитивных убеждений',
      duration: '45-75 мин',
      phase: 'processing',
      icon: 'psychology',
      color: ['#a8edea', '#fed6e3'],
      sessions: 4,
      completed: progress.completedSessions.includes('installation'),
      unlocked: progress.completedSessions.includes('desensitization'),
      difficulty: 'Средний',
    },
    {
      id: 'body-scan',
      title: 'Сканирование тела',
      description: 'Проверка телесных ощущений',
      duration: '30-45 мин',
      phase: 'processing',
      icon: 'accessibility',
      color: ['#96CEB4', '#FFECD2'],
      sessions: 3,
      completed: progress.completedSessions.includes('body-scan'),
      unlocked: progress.completedSessions.includes('installation'),
      difficulty: 'Легкий',
    },
    {
      id: 'closure',
      title: 'Закрытие',
      description: 'Завершение сессии и стабилизация',
      duration: '30-45 мин',
      phase: 'integration',
      icon: 'check-circle',
      color: ['#ff6b6b', '#ffa726'],
      sessions: 2,
      completed: progress.completedSessions.includes('closure'),
      unlocked: progress.completedSessions.includes('body-scan'),
      difficulty: 'Легкий',
    },
    {
      id: 'reevaluation',
      title: 'Переоценка',
      description: 'Проверка результатов терапии',
      duration: '45-60 мин',
      phase: 'integration',
      icon: 'refresh',
      color: ['#84fab0', '#8fd3f4'],
      sessions: 3,
      completed: progress.completedSessions.includes('reevaluation'),
      unlocked: progress.completedSessions.includes('closure'),
      difficulty: 'Средний',
    },
  ];

  const quickActions = [
    {
      id: 'bilateral-stimulation',
      title: 'Билатеральная стимуляция',
      description: 'Упражнения для обработки травм',
      icon: 'swap-horizontal',
      color: ['#667eea', '#764ba2'],
      action: () => router.push('/screens/emdr/bilateral-stimulation' as any),
    },
    {
      id: 'safe-place-exercise',
      title: 'Безопасное место',
      description: 'Создание внутреннего ресурса',
      icon: 'home',
      color: ['#4ECDC4', '#44A08D'],
      action: () => router.push('/screens/emdr/safe-place' as any),
    },
    {
      id: 'suds-tracker',
      title: 'SUDS трекер',
      description: 'Отслеживание уровня дистресса',
      icon: 'trending-down',
      color: ['#f093fb', '#f5576c'],
      action: () => router.push('/screens/emdr/suds-tracker' as any),
    },
    {
      id: 'resource-installation',
      title: 'Инсталляция ресурсов',
      description: 'Укрепление позитивных качеств',
      icon: 'build-circle',
      color: ['#4facfe', '#00f2fe'],
      action: () => router.push('/screens/emdr/resource-installation' as any),
    },
    {
      id: 'memory-processing',
      title: 'Обработка воспоминаний',
      description: 'Протокол EMDR для травм',
      icon: 'psychology',
      color: ['#43e97b', '#38f9d7'],
      action: () => router.push('/screens/emdr/memory-processing' as any),
    },
    {
      id: 'emdr-analytics',
      title: 'Аналитика EMDR',
      description: 'Прогресс и статистика',
      icon: 'analytics',
      color: ['#84fab0', '#8fd3f4'],
      action: () => router.push('/screens/emdr/analytics' as any),
    },
    {
      id: 'ai-analysis',
      title: 'ИИ Анализ EMDR',
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
      const savedProgress = await AsyncStorage.getItem('emdr_progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        setProgress(parsedProgress);
        
        // Generate AI insights based on progress
        if (parsedProgress.processedMemories > 0 || parsedProgress.resourcesInstalled > 0) {
          analyzeSessionData();
        }
      }
    } catch (error) {
      console.error('Error loading EMDR progress:', error);
    }
  };

  const loadAIInsights = async () => {
    try {
      const savedInsights = await AsyncStorage.getItem('emdr_ai_insights');
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
      const insights = await generateAIInsights(null, 'EMDR');
      setAiInsights(insights);
      await AsyncStorage.setItem('emdr_ai_insights', JSON.stringify(insights));
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
        case 'phase-guidance': return 'timeline';
        default: return 'info';
      }
    };

    const getInsightColor = (type: string) => {
      switch (type) {
        case 'suggestion': return '#4ECDC4';
        case 'encouragement': return '#ff6b6b';
        case 'tip': return '#667eea';
        case 'warning': return '#ffa726';
        case 'phase-guidance': return '#43e97b';
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
        <View style={styles.insightFooter}>
        </View>
      </View>
    );
  };

  const saveProgress = async (newProgress: EMDRProgress) => {
    try {
      await AsyncStorage.setItem('emdr_progress', JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving EMDR progress:', error);
    }
  };

  // Session result saving function
  const saveSessionResult = async (sessionResult: EMDRSessionResult) => {
    try {
      const updatedProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        sessionHistory: [...progress.sessionHistory, sessionResult],
        lastSessionDate: sessionResult.timestamp,
        sudsLevels: [...progress.sudsLevels, sessionResult.sudsLevelAfter],
        averageSudsImprovement: progress.sessionHistory.length > 0 
          ? (progress.sessionHistory.reduce((sum, session) => sum + (session.sudsLevelBefore - session.sudsLevelAfter), 0) + (sessionResult.sudsLevelBefore - sessionResult.sudsLevelAfter)) / (progress.sessionHistory.length + 1)
          : sessionResult.sudsLevelBefore - sessionResult.sudsLevelAfter,
        averageVocImprovement: progress.sessionHistory.length > 0
          ? (progress.sessionHistory.reduce((sum, session) => sum + (session.vocLevelAfter - session.vocLevelBefore), 0) + (sessionResult.vocLevelAfter - sessionResult.vocLevelBefore)) / (progress.sessionHistory.length + 1)
          : sessionResult.vocLevelAfter - sessionResult.vocLevelBefore,
        progressPercentage: Math.min(100, ((progress.totalSessions + 1) / 20) * 100), // Assuming 20 sessions for completion
      };

      await saveProgress(updatedProgress);
      
      // Auto-generate AI insights after session
      setTimeout(() => {
        analyzeSessionData();
      }, 1000);
    } catch (error) {
      console.error('Error saving session result:', error);
    }
  };

  const saveEMDRSessionResult = async (result: EMDRSessionResult) => {
    try {
      // Save the new session result
      const existingData = await AsyncStorage.getItem('EMDRSessionHistory');
      const sessionHistory = existingData ? JSON.parse(existingData) : [];
      sessionHistory.push(result);
      await AsyncStorage.setItem('EMDRSessionHistory', JSON.stringify(sessionHistory));

      // Update progress metrics
      const updatedProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        completedSessions: [...progress.completedSessions, result.sessionId],
        processedMemories: calculateProcessedMemories(sessionHistory),
        sudsLevels: [...progress.sudsLevels, result.sudsLevelAfter],
        averageSudsImprovement: calculateAverageSudsImprovement(sessionHistory),
        averageVocImprovement: calculateAverageVocImprovement(sessionHistory),
        bilateralStimulationUsage: calculateStimulationUsage(sessionHistory),
        safetyAndStability: calculateSafetyAndStability(sessionHistory),
        lastSessionDate: result.timestamp,
        sessionHistory: sessionHistory
      };

      await AsyncStorage.setItem('emdr_progress', JSON.stringify(updatedProgress));
      setProgress(updatedProgress);

      // Generate and filter AI insights
      const allInsights = await generateAIInsights(null, 'EMDR');
      const filteredInsights: AIInsight[] = allInsights
        .filter(insight => 
          ['warning', 'suggestion', 'encouragement', 'tip', 'phase-guidance'].includes(insight.type)
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
      await AsyncStorage.setItem('emdr_ai_insights', JSON.stringify(filteredInsights));

      // Show high-priority insights immediately
      const highPriorityInsights = filteredInsights.filter(i => i.priority === 'high');
      if (highPriorityInsights.length > 0) {
        setShowAIInsights(true);
      }

    } catch (error) {
      console.error('Error saving EMDR session result:', error);
    }
  };

  // Helper functions for analyzing session data
  const calculateProcessedMemories = (sessions: EMDRSessionResult[]) => {
    return new Set(sessions.map(s => s.targetMemory)).size;
  };

  const calculateAverageSudsImprovement = (sessions: EMDRSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const improvements = sessions.map(s => s.sudsLevelBefore - s.sudsLevelAfter);
    return improvements.reduce((a, b) => a + b, 0) / sessions.length;
  };

  const calculateAverageVocImprovement = (sessions: EMDRSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const improvements = sessions.map(s => s.vocLevelAfter - s.vocLevelBefore);
    return improvements.reduce((a, b) => a + b, 0) / sessions.length;
  };

  const calculateStimulationUsage = (sessions: EMDRSessionResult[]) => {
    const usage = sessions.reduce((acc, session) => {
      acc[session.bilateralStimulationType] = (acc[session.bilateralStimulationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [type, count]) => {
        acc[type] = (count / sessions.length) * 100;
        return acc;
      }, {} as Record<string, number>);
  };

  const calculateSafetyAndStability = (sessions: EMDRSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const ratings = sessions.map(s => (s.safetyRating + s.stabilityRating) / 2);
    return ratings.reduce((a, b) => a + b, 0) / sessions.length;
  };

  const handleModulePress = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.unlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Show warning for processing phases
      if (module.phase === 'processing' && moduleId === 'desensitization') {
        Alert.alert(
          'Предупреждение',
          'Эта фаза может быть эмоционально сложной. Убедитесь, что вы в безопасном месте и имеете поддержку.',
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Продолжить', onPress: () => router.push(`/screens/emdr/module/${moduleId}` as any) }
          ]
        );
      } else {
        router.push(`/screens/emdr/module/${moduleId}` as any);
      }
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'preparation': return '#4ECDC4';
      case 'processing': return '#ff6b6b';
      case 'integration': return '#43e97b';
      default: return '#667eea';
    }
  };

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case 'preparation': return 'Подготовка';
      case 'processing': return 'Обработка';
      case 'integration': return 'Интеграция';
      default: return 'Неизвестная фаза';
    }
  };

  const renderModuleCard = ({ item }: { item: EMDRModule }) => (
    <TouchableOpacity
      style={[
        styles.moduleCard,
        { backgroundColor: theme.colors.card },
        !item.unlocked && styles.moduleCardDisabled,
      ]}
      onPress={() => handleModulePress(item.id)}
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
            color={item.unlocked ? "white" : "#888888"} 
          />
          <View style={styles.moduleHeaderRight}>
            <View style={[
              styles.phaseBadge,
              { backgroundColor: item.unlocked ? getPhaseColor(item.phase) : "#888888" }
            ]}>
              <Text style={[
                styles.phaseText,
                { color: item.unlocked ? "white" : "#aaaaaa" }
              ]}>
                {getPhaseTitle(item.phase)}
              </Text>
            </View>
            {item.completed && (
              <View style={styles.completedBadge}>
                <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              </View>
            )}
          </View>
        </View>
        <View style={styles.moduleContent}>
          <Text style={[
            styles.moduleTitle,
            { color: item.unlocked ? "white" : "#888888" }
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.moduleDescription,
            { color: item.unlocked ? "rgba(255,255,255,0.8)" : "#aaaaaa" }
          ]}>
            {item.description}
          </Text>
          <View style={styles.moduleFooter}>
            <View style={styles.moduleStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="schedule" size={16} color={item.unlocked ? "white" : "#888888"} />
                <Text style={[
                  styles.statText,
                  { color: item.unlocked ? "white" : "#888888" }
                ]}>
                  {item.duration}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="layers" size={16} color={item.unlocked ? "white" : "#888888"} />
                <Text style={[
                  styles.statText,
                  { color: item.unlocked ? "white" : "#888888" }
                ]}>
                  {item.sessions} сессий
                </Text>
              </View>
            </View>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: item.unlocked ? (item.difficulty === 'Легкий' ? '#4ECDC4' : item.difficulty === 'Средний' ? '#667eea' : '#ff6b6b') : "#888888" }
            ]}>
              <Text style={[
                styles.difficultyText,
                { color: item.unlocked ? "white" : "#aaaaaa" }
              ]}>
                {item.difficulty}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderQuickAction = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.action();
      }}
    >
      <LinearGradient
        colors={item.color}
        style={styles.quickActionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons name={item.icon} size={28} color="#fff" />
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>{item.title}</Text>
          <Text style={styles.quickActionDescription}>{item.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </TouchableOpacity>
  );

  const completedSessions = progress.completedSessions.length;
  const totalSessions = modules.reduce((sum, module) => sum + module.sessions, 0);
  const overallProgress = (completedSessions / totalSessions) * 100;

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
          EMDR Терапия
        </Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.progressGradient}
          >
            <View style={styles.progressHeader}>
              <View>
                <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                  Прогресс терапии
                </Text>
                <Text style={[styles.progressSubtitle, { color: theme.colors.textSecondary }]}>
                  Фаза: {getPhaseTitle(progress.currentPhase)}
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={[styles.progressPercentage, { color: theme.colors.text }]}>
                  {Math.round(overallProgress)}%
                </Text>
              </View>
            </View>
            <View style={styles.progressStats}>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {progress.processedMemories}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Обработано воспоминаний
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {progress.resourcesInstalled}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Установлено ресурсов
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {progress.sudsLevels.length > 0 ? Math.round(progress.sudsLevels.reduce((a, b) => a + b, 0) / progress.sudsLevels.length) : 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Средний SUDS
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Warning Card */}
        <View style={[styles.warningCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['rgba(255, 107, 107, 0.1)', 'rgba(255, 167, 38, 0.1)']}
            style={styles.warningGradient}
          >
            <View style={styles.warningHeader}>
              <MaterialIcons name="warning" size={24} color="#ff6b6b" />
              <Text style={[styles.warningTitle, { color: theme.colors.text }]}>
                Важная информация
              </Text>
            </View>
            <Text style={[styles.warningText, { color: theme.colors.text }]}>
              EMDR терапия может вызвать сильные эмоции. Используйте эти упражнения в безопасном месте. 
              При серьезных травмах рекомендуется работа с сертифицированным EMDR-терапевтом.
            </Text>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Быстрые действия
          </Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* EMDR Modules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Модули EMDR
          </Text>
          <FlatList
            data={modules}
            renderItem={renderModuleCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['rgba(78, 236, 196, 0.1)', 'rgba(68, 160, 141, 0.1)']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <MaterialIcons name="info" size={24} color="#4ECDC4" />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                О EMDR терапии
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              EMDR (Десенсибилизация и переработка движениями глаз) - это научно обоснованная 
              психотерапия для лечения травм и ПТСР. Метод помогает мозгу естественным образом 
              обрабатывать травматические воспоминания.
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Восемь фаз EMDR: подготовка, оценка, десенсибилизация, инсталляция, 
              сканирование тела, закрытие, переоценка и работа с ресурсами.
            </Text>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* AI Analysis Modal */}
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
                ИИ Анализ EMDR
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
                keyExtractor={(item) => item.timestamp}
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  infoButton: {
    padding: 8,
  },
  progressCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#667eea',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  warningCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  warningGradient: {
    padding: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  quickActionCard: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: 'white',
  },
  quickActionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  moduleCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moduleCardDisabled: {
    opacity: 0.7,
  },
  moduleGradient: {
    padding: 20,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  completedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 4,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleStats: {
    flexDirection: 'row',
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
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
  insightCard: {
    marginBottom: 16,
    borderRadius: 15,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});

export default EMDRScreen;

// Export for use in other EMDR components
export { EMDRSessionResult, EMDRProgress };
