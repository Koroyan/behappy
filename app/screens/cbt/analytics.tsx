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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface MoodEntry {
  date: string;
  mood: number;
  activities: string[];
  factors: string[];
  notes: string;
}

interface ThoughtRecord {
  id: string;
  date: string;
  situation: string;
  emotion: string;
  intensity: number;
  thoughts: string[];
  distortions: string[];
  reframes: string[];
  newIntensity: number;
}

interface BehavioralExperiment {
  id: string;
  date: string;
  belief: string;
  experiment: string;
  outcome: string;
  newBelief: string;
  confidence: number;
}

interface AnalyticsData {
  moodEntries: MoodEntry[];
  thoughtRecords: ThoughtRecord[];
  behavioralExperiments: BehavioralExperiment[];
  exercisesCompleted: number;
  streakDays: number;
  averageMood: number;
  moodTrend: 'improving' | 'stable' | 'declining';
  topDistortions: string[];
  mostHelpfulTechniques: string[];
}

const CBTAnalytics = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    moodEntries: [],
    thoughtRecords: [],
    behavioralExperiments: [],
    exercisesCompleted: 0,
    streakDays: 0,
    averageMood: 0,
    moodTrend: 'stable',
    topDistortions: [],
    mostHelpfulTechniques: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load all data
      const [moodData, thoughtData, behaviorData, exerciseData] = await Promise.all([
        AsyncStorage.getItem('mood_entries'),
        AsyncStorage.getItem('thought_records'),
        AsyncStorage.getItem('behavioral_experiments'),
        AsyncStorage.getItem('exercises_completed'),
      ]);

      const moodEntries = moodData ? JSON.parse(moodData) : [];
      const thoughtRecords = thoughtData ? JSON.parse(thoughtData) : [];
      const behavioralExperiments = behaviorData ? JSON.parse(behaviorData) : [];
      const exercisesCompleted = exerciseData ? parseInt(exerciseData) : 0;

      // Calculate analytics
      const filteredMoodEntries = filterDataByPeriod(moodEntries);
      const filteredThoughtRecords = filterDataByPeriod(thoughtRecords);
      const filteredBehavioralExperiments = filterDataByPeriod(behavioralExperiments);

      const averageMood = calculateAverageMood(filteredMoodEntries);
      const moodTrend = calculateMoodTrend(filteredMoodEntries);
      const topDistortions = calculateTopDistortions(filteredThoughtRecords);
      const streakDays = calculateStreakDays(moodEntries);
      const mostHelpfulTechniques = calculateMostHelpfulTechniques(filteredThoughtRecords);

      setAnalytics({
        moodEntries: filteredMoodEntries,
        thoughtRecords: filteredThoughtRecords,
        behavioralExperiments: filteredBehavioralExperiments,
        exercisesCompleted,
        streakDays,
        averageMood,
        moodTrend,
        topDistortions,
        mostHelpfulTechniques,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные аналитики');
    } finally {
      setLoading(false);
    }
  };

  const filterDataByPeriod = (data: any[]) => {
    const now = new Date();
    const periodDays = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };

  const calculateAverageMood = (entries: MoodEntry[]) => {
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, entry) => acc + entry.mood, 0);
    return Math.round((sum / entries.length) * 10) / 10;
  };

  const calculateMoodTrend = (entries: MoodEntry[]): 'improving' | 'stable' | 'declining' => {
    if (entries.length < 2) return 'stable';
    
    const sortedEntries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
    const secondHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
    
    const firstHalfAvg = calculateAverageMood(firstHalf);
    const secondHalfAvg = calculateAverageMood(secondHalf);
    
    const difference = secondHalfAvg - firstHalfAvg;
    
    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  };

  const calculateTopDistortions = (records: ThoughtRecord[]) => {
    const distortionCount: { [key: string]: number } = {};
    
    records.forEach(record => {
      record.distortions.forEach(distortion => {
        distortionCount[distortion] = (distortionCount[distortion] || 0) + 1;
      });
    });
    
    return Object.entries(distortionCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([distortion]) => distortion);
  };

  const calculateStreakDays = (entries: MoodEntry[]) => {
    if (entries.length === 0) return 0;
    
    const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateMostHelpfulTechniques = (records: ThoughtRecord[]) => {
    const techniqueEffectiveness: { [key: string]: { total: number; count: number } } = {};
    
    records.forEach(record => {
      const improvement = record.intensity - record.newIntensity;
      record.reframes.forEach(reframe => {
        if (!techniqueEffectiveness[reframe]) {
          techniqueEffectiveness[reframe] = { total: 0, count: 0 };
        }
        techniqueEffectiveness[reframe].total += improvement;
        techniqueEffectiveness[reframe].count++;
      });
    });
    
    return Object.entries(techniqueEffectiveness)
      .map(([technique, data]) => ({
        technique,
        effectiveness: data.total / data.count,
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5)
      .map(item => item.technique);
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: [string, string]) => (
    <LinearGradient
      colors={color}
      style={styles.statCard}
    >
      <MaterialIcons name={icon as any} size={24} color="white" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  );

  const renderMoodChart = () => {
    const last7Days = analytics.moodEntries.slice(-7);
    const maxMood = Math.max(...last7Days.map(entry => entry.mood), 5);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Динамика настроения</Text>
        <View style={styles.chart}>
          {last7Days.map((entry, index) => (
            <View key={index} style={styles.chartBar}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (entry.mood / maxMood) * 100,
                    backgroundColor: entry.mood >= 7 ? '#4CAF50' : entry.mood >= 4 ? '#FF9800' : '#f44336',
                  },
                ]}
              />
              <Text style={[styles.chartLabel, { color: theme.colors.text }]}>
                {new Date(entry.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTopDistortions = () => (
    <View style={styles.insightsContainer}>
      <Text style={[styles.insightsTitle, { color: theme.colors.text }]}>Частые искажения</Text>
      {analytics.topDistortions.slice(0, 3).map((distortion, index) => (
        <View key={index} style={styles.insightItem}>
          <View style={styles.insightIcon}>
            <MaterialIcons name="psychology" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.insightText, { color: theme.colors.text }]}>{distortion}</Text>
        </View>
      ))}
    </View>
  );

  const renderMostHelpfulTechniques = () => (
    <View style={styles.insightsContainer}>
      <Text style={[styles.insightsTitle, { color: theme.colors.text }]}>Эффективные техники</Text>
      {analytics.mostHelpfulTechniques.slice(0, 3).map((technique, index) => (
        <View key={index} style={styles.insightItem}>
          <View style={styles.insightIcon}>
            <MaterialIcons name="lightbulb" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.insightText, { color: theme.colors.text }]}>{technique}</Text>
        </View>
      ))}
    </View>
  );

  const getMoodTrendIcon = () => {
    switch (analytics.moodTrend) {
      case 'improving':
        return { name: 'trending-up', color: '#4CAF50' };
      case 'declining':
        return { name: 'trending-down', color: '#f44336' };
      default:
        return { name: 'trending-flat', color: '#FF9800' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Аналитика КПТ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPeriod(period);
              }}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
            >
              <Text style={[
                styles.periodButtonText,
                { color: selectedPeriod === period ? 'white' : theme.colors.text },
              ]}>
                {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Квартал'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard('Средний балл', analytics.averageMood.toFixed(1), 'mood', ['#667eea', '#764ba2'])}
          {renderStatCard('Серия дней', analytics.streakDays, 'local-fire-department', ['#f093fb', '#f5576c'])}
          {renderStatCard('Записи мыслей', analytics.thoughtRecords.length, 'psychology', ['#4facfe', '#00f2fe'])}
          {renderStatCard('Эксперименты', analytics.behavioralExperiments.length, 'science', ['#43e97b', '#38f9d7'])}
        </View>

        {/* Mood Trend */}
        <View style={[styles.trendContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.trendHeader}>
            <Text style={[styles.trendTitle, { color: theme.colors.text }]}>Тенденция настроения</Text>
            <MaterialIcons 
              name={getMoodTrendIcon().name as any} 
              size={24} 
              color={getMoodTrendIcon().color} 
            />
          </View>
          <Text style={[styles.trendDescription, { color: theme.colors.textSecondary }]}>
            {analytics.moodTrend === 'improving' && 'Ваше настроение улучшается! Продолжайте в том же духе.'}
            {analytics.moodTrend === 'declining' && 'Настроение снижается. Рекомендуем больше практиковать техники КПТ.'}
            {analytics.moodTrend === 'stable' && 'Настроение стабильное. Хорошая работа по поддержанию эмоционального баланса.'}
          </Text>
        </View>

        {/* Mood Chart */}
        {analytics.moodEntries.length > 0 && renderMoodChart()}

        {/* Insights */}
        <View style={styles.insightsRow}>
          {analytics.topDistortions.length > 0 && renderTopDistortions()}
          {analytics.mostHelpfulTechniques.length > 0 && renderMostHelpfulTechniques()}
        </View>

        {/* Recommendations */}
        <View style={[styles.recommendationsContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.recommendationsTitle, { color: theme.colors.text }]}>Рекомендации</Text>
          {analytics.averageMood < 5 && (
            <View style={styles.recommendationItem}>
              <MaterialIcons name="lightbulb" size={20} color={theme.colors.primary} />
              <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                Попробуйте увеличить частоту записей мыслей для лучшего понимания паттернов.
              </Text>
            </View>
          )}
          {analytics.streakDays < 7 && (
            <View style={styles.recommendationItem}>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
              <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                Старайтесь делать записи каждый день для формирования полезной привычки.
              </Text>
            </View>
          )}
          {analytics.behavioralExperiments.length === 0 && (
            <View style={styles.recommendationItem}>
              <MaterialIcons name="science" size={20} color={theme.colors.primary} />
              <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                Попробуйте поведенческие эксперименты для проверки негативных убеждений.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    margin: 10,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  trendContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 10,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  insightsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  insightsContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    marginRight: 12,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
  },
  recommendationsContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default CBTAnalytics;
