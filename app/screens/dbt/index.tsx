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

interface DBTSessionResult {
  sessionId: string;
  moduleId: string;
  moduleName: string;
  timestamp: string;
  duration: number; // minutes
  skillCategory: 'distress-tolerance' | 'emotion-regulation' | 'mindfulness' | 'interpersonal-effectiveness';
  skillsPracticed: string[];
  exercisesCompleted: string[];
  difficultyLevel: number; // 1-5 scale
  moodBefore: number; // 1-10 scale
  moodAfter: number; // 1-10 scale
  stressLevelBefore: number; // 1-10 scale
  stressLevelAfter: number; // 1-10 scale
  techniquesUsed: string[];
  breakthroughs: string[];
  challenges: string[];
  homeworkCompleted: boolean;
  notes: string;
}

interface DBTProgress {
  completedModules: string[];
  currentModule: string;
  totalScore: number;
  skillsPracticed: number;
  exercisesCompleted: number;
  progressPercentage: number;
  recentSkills: string[];
  emotionalRegulation: number;
  distressTolerance: number;
  mindfulnessPractice: number;
  interpersonalSkills: number;
  totalSessions: number;
  averageMoodImprovement: number;
  averageStressReduction: number;
  consistencyScore: number;
  lastSessionDate: string;
  sessionHistory: DBTSessionResult[];
}

interface DBTModule {
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
  skillsCount: number;
}

interface AIInsight {
  type: 'warning' | 'suggestion' | 'encouragement' | 'tip' | 'skill-focus';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

const DBTScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [progress, setProgress] = useState<DBTProgress>({
    completedModules: [],
    currentModule: 'distress-tolerance',
    totalScore: 0,
    skillsPracticed: 0,
    exercisesCompleted: 0,
    progressPercentage: 0,
    recentSkills: [],
    emotionalRegulation: 0,
    distressTolerance: 0,
    mindfulnessPractice: 0,
    interpersonalSkills: 0,
    totalSessions: 0,
    averageMoodImprovement: 0,
    averageStressReduction: 0,
    consistencyScore: 0,
    lastSessionDate: '',
    sessionHistory: [],
  });

  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const modules: DBTModule[] = [
    {
      id: 'distress-tolerance',
      title: 'Устойчивость к стрессу',
      description: 'Навыки переживания кризисных ситуаций',
      duration: '60 мин',
      difficulty: 'Средний',
      icon: 'shield-half',
      color: ['#667eea', '#764ba2'],
      lessons: 8,
      completed: progress.completedModules.includes('distress-tolerance'),
      unlocked: true,
      skillsCount: 12,
    },
    {
      id: 'emotion-regulation',
      title: 'Регуляция эмоций',
      description: 'Понимание и управление эмоциями',
      duration: '70 мин',
      difficulty: 'Сложный',
      icon: 'favorite',
      color: ['#f093fb', '#f5576c'],
      lessons: 10,
      completed: progress.completedModules.includes('emotion-regulation'),
      unlocked: progress.completedModules.includes('distress-tolerance'),
      skillsCount: 15,
    },
    {
      id: 'interpersonal-effectiveness',
      title: 'Межличностная эффективность',
      description: 'Навыки общения и отношений',
      duration: '65 мин',
      difficulty: 'Средний',
      icon: 'people',
      color: ['#4facfe', '#00f2fe'],
      lessons: 9,
      completed: progress.completedModules.includes('interpersonal-effectiveness'),
      unlocked: progress.completedModules.includes('emotion-regulation'),
      skillsCount: 14,
    },
    {
      id: 'mindfulness',
      title: 'Осознанность',
      description: 'Развитие навыков присутствия в моменте',
      duration: '55 мин',
      difficulty: 'Легкий',
      icon: 'self-improvement',
      color: ['#43e97b', '#38f9d7'],
      lessons: 7,
      completed: progress.completedModules.includes('mindfulness'),
      unlocked: progress.completedModules.includes('interpersonal-effectiveness'),
      skillsCount: 10,
    },
    {
      id: 'wise-mind',
      title: 'Мудрый разум',
      description: 'Интеграция эмоций и логики',
      duration: '50 мин',
      difficulty: 'Сложный',
      icon: 'psychology',
      color: ['#a8edea', '#fed6e3'],
      lessons: 6,
      completed: progress.completedModules.includes('wise-mind'),
      unlocked: progress.completedModules.includes('mindfulness'),
      skillsCount: 8,
    },
    {
      id: 'dbt-integration',
      title: 'Интеграция навыков',
      description: 'Комплексное применение DBT навыков',
      duration: '80 мин',
      difficulty: 'Сложный',
      icon: 'integration-instructions',
      color: ['#96CEB4', '#FFECD2'],
      lessons: 12,
      completed: progress.completedModules.includes('dbt-integration'),
      unlocked: progress.completedModules.includes('wise-mind'),
      skillsCount: 20,
    },
  ];

  const quickActions = [
    {
      id: 'distress-tolerance-skills',
      title: 'Навыки переживания кризиса',
      description: 'TIPP, STOP, Radical Acceptance',
      icon: 'shield',
      color: ['#667eea', '#764ba2'],
      action: () => router.push('/screens/dbt/distress-tolerance' as any),
    },
    {
      id: 'emotion-regulation-skills',
      title: 'Регуляция эмоций',
      description: 'PLEASE, Opposite Action, Mastery',
      icon: 'favorite',
      color: ['#f093fb', '#f5576c'],
      action: () => router.push('/screens/dbt/emotion-regulation' as any),
    },
    {
      id: 'interpersonal-skills',
      title: 'Межличностные навыки',
      description: 'DEAR MAN, GIVE, FAST',
      icon: 'people',
      color: ['#4facfe', '#00f2fe'],
      action: () => router.push('/screens/dbt/interpersonal-effectiveness' as any),
    },
    {
      id: 'mindfulness-skills',
      title: 'Осознанность',
      description: 'WHAT, HOW, Wise Mind',
      icon: 'self-improvement',
      color: ['#43e97b', '#38f9d7'],
      action: () => router.push('/screens/dbt/mindfulness' as any),
    },
    {
      id: 'skills-tracker',
      title: 'Трекер навыков',
      description: 'Отслеживание практики навыков',
      icon: 'track-changes',
      color: ['#ff6b6b', '#ffa726'],
      action: () => router.push('/screens/dbt/skills-tracker' as any),
    },
    {
      id: 'dbt-analytics',
      title: 'Аналитика DBT',
      description: 'Прогресс и статистика',
      icon: 'analytics',
      color: ['#84fab0', '#8fd3f4'],
      action: () => router.push('/screens/dbt/analytics' as any),
    },
    {
      id: 'ai-insights',
      title: 'ИИ Анализ навыков',
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
      const savedProgress = await AsyncStorage.getItem('dbt_progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        
        // Ensure sessionHistory is loaded
        if (!parsedProgress.sessionHistory) {
          parsedProgress.sessionHistory = [];
        }
        
        // Load session results if not in progress
        if (parsedProgress.sessionHistory.length === 0) {
          const sessionResults = await AsyncStorage.getItem('dbt_session_results');
          if (sessionResults) {
            parsedProgress.sessionHistory = JSON.parse(sessionResults);
          }
        }
        
        setProgress(parsedProgress);
        
        // Generate AI insights based on progress
        if (parsedProgress.sessionHistory.length > 0 || parsedProgress.skillsPracticed > 0) {
          analyzeSessionData();
        }
      }
    } catch (error) {
      console.error('Error loading DBT progress:', error);
    }
  };

  const loadAIInsights = async () => {
    try {
      const savedInsights = await AsyncStorage.getItem('dbt_ai_insights');
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
      const insights = await generateAIInsights(null, 'DBT');
      setAiInsights(insights);
      await AsyncStorage.setItem('dbt_ai_insights', JSON.stringify(insights));
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
        case 'skill-focus': return 'psychology';
        default: return 'info';
      }
    };

    const getInsightColor = (type: string) => {
      switch (type) {
        case 'suggestion': return '#4ECDC4';
        case 'encouragement': return '#ff6b6b';
        case 'tip': return '#667eea';
        case 'warning': return '#ffa726';
        case 'skill-focus': return '#43e97b';
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
        {item.skillCategory && (
          <View style={[styles.skillCategoryBadge, { backgroundColor: getInsightColor(item.type) + '15' }]}>
            <Text style={[styles.skillCategoryText, { color: getInsightColor(item.type) }]}>
              {item.skillCategory}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const saveProgress = async (newProgress: DBTProgress) => {
    try {
      await AsyncStorage.setItem('dbt_progress', JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving DBT progress:', error);
    }
  };

  const saveSessionResult = async (sessionResult: DBTSessionResult) => {
    try {
      // Save individual session result
      const existingSessions = await AsyncStorage.getItem('dbt_session_results');
      const sessionResults = existingSessions ? JSON.parse(existingSessions) : [];
      sessionResults.push(sessionResult);
      await AsyncStorage.setItem('dbt_session_results', JSON.stringify(sessionResults));
      
      // Update progress
      const newProgress = {
        ...progress,
        sessionHistory: [...progress.sessionHistory, sessionResult],
        totalSessions: progress.totalSessions + 1,
        lastSessionDate: sessionResult.timestamp,
        skillsPracticed: progress.skillsPracticed + sessionResult.skillsPracticed.length,
        exercisesCompleted: progress.exercisesCompleted + sessionResult.exercisesCompleted.length,
        averageMoodImprovement: calculateAverageMoodImprovement([...progress.sessionHistory, sessionResult]),
        averageStressReduction: calculateAverageStressReduction([...progress.sessionHistory, sessionResult]),
        consistencyScore: calculateConsistencyScore([...progress.sessionHistory, sessionResult]),
      };
      
      // Update skill-specific progress
      switch (sessionResult.skillCategory) {
        case 'distress-tolerance':
          newProgress.distressTolerance = Math.min(10, newProgress.distressTolerance + 0.5);
          break;
        case 'emotion-regulation':
          newProgress.emotionalRegulation = Math.min(10, newProgress.emotionalRegulation + 0.5);
          break;
        case 'mindfulness':
          newProgress.mindfulnessPractice = Math.min(10, newProgress.mindfulnessPractice + 0.5);
          break;
        case 'interpersonal-effectiveness':
          newProgress.interpersonalSkills = Math.min(10, newProgress.interpersonalSkills + 0.5);
          break;
      }
      
      // Update progress percentage
      newProgress.progressPercentage = Math.min(100, (newProgress.totalSessions / 50) * 100);
      
      // Update recent skills
      newProgress.recentSkills = [
        ...sessionResult.skillsPracticed,
        ...newProgress.recentSkills
      ].slice(0, 10);
      
      // Update total score
      newProgress.totalScore = calculateTotalScore(newProgress);
      
      await saveProgress(newProgress);
      
      // Trigger AI analysis for insights
      analyzeSessionData();
      
    } catch (error) {
      console.error('Error saving DBT session result:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить результат сессии');
    }
  };

  const saveDBTSessionResult = async (result: DBTSessionResult) => {
    try {
      // Save the new session result
      const existingData = await AsyncStorage.getItem('DBTSessionHistory');
      const sessionHistory = existingData ? JSON.parse(existingData) : [];
      sessionHistory.push(result);
      await AsyncStorage.setItem('DBTSessionHistory', JSON.stringify(sessionHistory));

      // Update progress metrics
      const updatedProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        completedModules: progress.completedModules.includes(result.moduleId)
          ? progress.completedModules
          : [...progress.completedModules, result.moduleId],
        skillsProgress: analyzeSkillsProgress(sessionHistory),
        mostUsedSkills: analyzeMostUsedSkills(sessionHistory),
        averageStressReduction: calculateAverageStressReduction(sessionHistory),
        effectiveStrategies: analyzeEffectiveStrategies(sessionHistory),
        lastSessionDate: result.timestamp
      };

      await AsyncStorage.setItem('dbt_progress', JSON.stringify(updatedProgress));
      setProgress(updatedProgress);

      // Generate and filter AI insights
      const allInsights = await generateAIInsights(null, 'DBT');
      const filteredInsights: AIInsight[] = allInsights
        .filter(insight => 
          ['warning', 'suggestion', 'encouragement', 'tip', 'skill-focus'].includes(insight.type)
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
      await AsyncStorage.setItem('dbt_ai_insights', JSON.stringify(filteredInsights));

      // Show high-priority insights immediately
      const highPriorityInsights = filteredInsights.filter(i => i.priority === 'high');
      if (highPriorityInsights.length > 0) {
        setShowAIInsights(true);
      }

    } catch (error) {
      console.error('Error saving DBT session result:', error);
    }
  };

  // Helper functions for analyzing session data
  const analyzeSkillsProgress = (sessions: DBTSessionResult[]) => {
    const categories = ['distress-tolerance', 'emotion-regulation', 'mindfulness', 'interpersonal-effectiveness'];
    return categories.reduce((acc, category) => {
      const categorySessions = sessions.filter(s => s.skillCategory === category);
      acc[category] = {
        totalPracticed: categorySessions.length,
        averageEffectiveness: categorySessions.length > 0
          ? categorySessions.reduce((sum, s) => sum + (s.moodAfter - s.moodBefore), 0) / categorySessions.length
          : 0
      };
      return acc;
    }, {} as Record<string, { totalPracticed: number; averageEffectiveness: number }>);
  };

  const analyzeMostUsedSkills = (sessions: DBTSessionResult[]) => {
    const allSkills = sessions.flatMap(s => s.skillsPracticed);
    return Object.entries(
      allSkills.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));
  };

  const calculateAverageStressReduction = (sessions: DBTSessionResult[]) => {
    if (sessions.length === 0) return 0;
    const reductions = sessions.map(s => s.stressLevelBefore - s.stressLevelAfter);
    return reductions.reduce((a, b) => a + b, 0) / sessions.length;
  };

  const analyzeEffectiveStrategies = (sessions: DBTSessionResult[]) => {
    return sessions
      .filter(s => s.stressLevelAfter - s.stressLevelBefore < -2) // Significant stress reduction
      .flatMap(s => s.techniquesUsed)
      .reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  };

  const handleModulePress = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.unlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/screens/dbt/module/${moduleId}` as any);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Легкий': return '#4ECDC4';
      case 'Средний': return '#667eea';
      case 'Сложный': return '#ff6b6b';
      default: return '#4ECDC4';
    }
  };

  const renderModuleCard = ({ item }: { item: DBTModule }) => (
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
          {item.completed && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            </View>
          )}
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
                <MaterialIcons name="psychology" size={16} color={item.unlocked ? "white" : "#888888"} />
                <Text style={[
                  styles.statText,
                  { color: item.unlocked ? "white" : "#888888" }
                ]}>
                  {item.skillsCount} навыков
                </Text>
              </View>
            </View>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: item.unlocked ? getDifficultyColor(item.difficulty) : "#888888" }
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

  const completedModulesCount = progress.completedModules.length;
  const totalModules = modules.length;
  const overallProgress = (completedModulesCount / totalModules) * 100;

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
          Диалектическая поведенческая терапия
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
                  Ваш прогресс
                </Text>
                <Text style={[styles.progressSubtitle, { color: theme.colors.textSecondary }]}>
                  {completedModulesCount} из {totalModules} модулей завершено
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
                  {progress.skillsPracticed}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Навыков практиковано
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {progress.exercisesCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Упражнений выполнено
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {progress.totalScore}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Общий балл
                </Text>
              </View>
            </View>
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

        {/* DBT Modules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Модули DBT
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
            colors={['rgba(67, 233, 123, 0.1)', 'rgba(56, 249, 215, 0.1)']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <MaterialIcons name="info" size={24} color="#43e97b" />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                О DBT
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Диалектическая поведенческая терапия (DBT) - это эффективный подход, 
              который помогает людям управлять интенсивными эмоциями, улучшать 
              отношения и развивать навыки преодоления стресса.
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Четыре основных навыка DBT: устойчивость к стрессу, регуляция эмоций, 
              межличностная эффективность и осознанность.
            </Text>
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
                ИИ Анализ навыков
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  // AI Insights styles
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  skillCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  skillCategoryText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  skillCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  skillCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsList: {
    flex: 1,
  },

});

export default DBTScreen;
