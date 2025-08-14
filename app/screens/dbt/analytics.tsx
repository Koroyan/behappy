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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalPractices: number;
  totalDuration: number;
  averageEffectiveness: number;
  averageDifficulty: number;
  mostUsedSkills: Array<{ skill: string; count: number; category: string }>;
  categoryProgress: Array<{ category: string; practices: number; effectiveness: number }>;
  weeklyTrends: Array<{ week: string; practices: number; effectiveness: number }>;
  monthlyStats: Array<{ month: string; practices: number; totalMinutes: number }>;
  skillEffectiveness: Array<{ skill: string; effectiveness: number; uses: number }>;
  recentActivity: Array<{ date: string; practices: number; avgEffectiveness: number }>;
}

interface TimeFilter {
  id: string;
  name: string;
  days: number;
}

const DBTAnalyticsScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('30');
  const [loading, setLoading] = useState(true);

  const timeFilters: TimeFilter[] = [
    { id: '7', name: '7 дней', days: 7 },
    { id: '30', name: '30 дней', days: 30 },
    { id: '90', name: '90 дней', days: 90 },
    { id: 'all', name: 'Все время', days: 0 },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedFilter]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const savedPractices = await AsyncStorage.getItem('dbt_skill_practices');
      if (savedPractices) {
        const practices = JSON.parse(savedPractices);
        const analyticsData = calculateAnalytics(practices);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (practices: any[]): AnalyticsData => {
    const filterDays = timeFilters.find(f => f.id === selectedFilter)?.days || 0;
    const cutoffDate = filterDays > 0 ? new Date(Date.now() - filterDays * 24 * 60 * 60 * 1000) : new Date(0);
    
    const filteredPractices = practices.filter(p => new Date(p.date) >= cutoffDate);

    // Basic stats
    const totalPractices = filteredPractices.length;
    const totalDuration = filteredPractices.reduce((sum, p) => sum + p.duration, 0);
    const averageEffectiveness = totalPractices > 0 
      ? filteredPractices.reduce((sum, p) => sum + p.effectiveness, 0) / totalPractices
      : 0;
    const averageDifficulty = totalPractices > 0
      ? filteredPractices.reduce((sum, p) => sum + p.difficulty, 0) / totalPractices
      : 0;

    // Most used skills
    const skillCounts = filteredPractices.reduce((acc, p) => {
      acc[p.skillName] = (acc[p.skillName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill,
        count: count as number,
        category: filteredPractices.find(p => p.skillName === skill)?.category || '',
      }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10);

    // Category progress
    const categoryStats = filteredPractices.reduce((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = { practices: 0, totalEffectiveness: 0 };
      }
      acc[p.category].practices += 1;
      acc[p.category].totalEffectiveness += p.effectiveness;
      return acc;
    }, {} as Record<string, { practices: number; totalEffectiveness: number }>);

    const categoryProgress = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      practices: (stats as any).practices,
      effectiveness: (stats as any).practices > 0 ? (stats as any).totalEffectiveness / (stats as any).practices : 0,
    }));

    // Weekly trends (last 8 weeks)
    const weeklyTrends = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - ((i - 1) * 7));

      const weekPractices = filteredPractices.filter(p => {
        const date = new Date(p.date);
        return date >= weekStart && date < weekEnd;
      });

      const weekEffectiveness = weekPractices.length > 0
        ? weekPractices.reduce((sum, p) => sum + p.effectiveness, 0) / weekPractices.length
        : 0;

      weeklyTrends.push({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        practices: weekPractices.length,
        effectiveness: weekEffectiveness,
      });
    }

    // Monthly stats (last 6 months)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() - i + 1);
      monthEnd.setDate(0);

      const monthPractices = filteredPractices.filter(p => {
        const date = new Date(p.date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      
      monthlyStats.push({
        month: monthNames[monthStart.getMonth()],
        practices: monthPractices.length,
        totalMinutes: monthPractices.reduce((sum, p) => sum + p.duration, 0),
      });
    }

    // Skill effectiveness
    const skillEffectiveness = mostUsedSkills.map(skill => {
      const skillPractices = filteredPractices.filter(p => p.skillName === skill.skill);
      const avgEffectiveness = skillPractices.reduce((sum, p) => sum + p.effectiveness, 0) / skillPractices.length;
      
      return {
        skill: skill.skill,
        effectiveness: avgEffectiveness,
        uses: skill.count as number,
      };
    }).sort((a, b) => b.effectiveness - a.effectiveness);

    // Recent activity (last 14 days)
    const recentActivity = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayPractices = filteredPractices.filter(p => {
        const practiceDate = new Date(p.date);
        return practiceDate >= date && practiceDate <= dayEnd;
      });

      const avgEffectiveness = dayPractices.length > 0
        ? dayPractices.reduce((sum, p) => sum + p.effectiveness, 0) / dayPractices.length
        : 0;

      recentActivity.push({
        date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        practices: dayPractices.length,
        avgEffectiveness,
      });
    }

    return {
      totalPractices,
      totalDuration,
      averageEffectiveness: Math.round(averageEffectiveness * 10) / 10,
      averageDifficulty: Math.round(averageDifficulty * 10) / 10,
      mostUsedSkills,
      categoryProgress,
      weeklyTrends,
      monthlyStats,
      skillEffectiveness,
      recentActivity,
    };
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'distress-tolerance': '#667eea',
      'emotion-regulation': '#f093fb',
      'interpersonal-effectiveness': '#4facfe',
      'mindfulness': '#43e97b',
    };
    return colors[category as keyof typeof colors] || '#4ECDC4';
  };

  const getCategoryName = (category: string) => {
    const names = {
      'distress-tolerance': 'Устойчивость к стрессу',
      'emotion-regulation': 'Регуляция эмоций',
      'interpersonal-effectiveness': 'Межличностная эффективность',
      'mindfulness': 'Осознанность',
    };
    return names[category as keyof typeof names] || category;
  };

  const renderTimeFilter = ({ item }: { item: TimeFilter }) => (
    <TouchableOpacity
      style={[
        styles.timeFilter,
        selectedFilter === item.id && styles.timeFilterActive,
      ]}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Text style={[
        styles.timeFilterText,
        { color: selectedFilter === item.id ? '#ffffff' : theme.colors.text }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMostUsedSkill = ({ item }: { item: { skill: string; count: number; category: string } }) => (
    <View style={[styles.skillItem, { backgroundColor: theme.colors.card }]}>
      <View style={styles.skillInfo}>
        <Text style={[styles.skillName, { color: theme.colors.text }]}>
          {item.skill}
        </Text>
        <Text style={[styles.skillCategory, { color: theme.colors.textSecondary }]}>
          {getCategoryName(item.category)}
        </Text>
      </View>
      <View style={styles.skillStats}>
        <Text style={[styles.skillCount, { color: getCategoryColor(item.category) }]}>
          {item.count}
        </Text>
        <Text style={[styles.skillCountLabel, { color: theme.colors.textSecondary }]}>
          раз
        </Text>
      </View>
    </View>
  );

  const renderCategoryProgress = ({ item }: { item: { category: string; practices: number; effectiveness: number } }) => (
    <View style={[styles.categoryCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.categoryHeader}>
        <Text style={[styles.categoryName, { color: theme.colors.text }]}>
          {getCategoryName(item.category)}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryBadgeText}>{item.practices}</Text>
        </View>
      </View>
      <View style={styles.categoryStats}>
        <View style={styles.effectivenessContainer}>
          <Text style={[styles.effectivenessLabel, { color: theme.colors.textSecondary }]}>
            Эффективность
          </Text>
          <View style={styles.effectivenessBar}>
            <View 
              style={[
                styles.effectivenessFill,
                { 
                  width: `${(item.effectiveness / 10) * 100}%`,
                  backgroundColor: getCategoryColor(item.category)
                }
              ]}
            />
          </View>
          <Text style={[styles.effectivenessValue, { color: theme.colors.text }]}>
            {item.effectiveness.toFixed(1)}/10
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRecentActivity = ({ item }: { item: { date: string; practices: number; avgEffectiveness: number } }) => (
    <View style={styles.activityDay}>
      <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
        {item.date}
      </Text>
      <View style={styles.activityBar}>
        <View 
          style={[
            styles.activityFill,
            { 
              height: `${Math.max(10, (item.practices / 5) * 100)}%`,
              backgroundColor: item.practices > 0 ? '#4ECDC4' : '#e0e0e0'
            }
          ]}
        />
      </View>
      <Text style={[styles.activityCount, { color: theme.colors.text }]}>
        {item.practices}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Загрузка аналитики...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8f9fa', '#e9ecef']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Аналитика DBT
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Filters */}
        <View style={styles.filtersContainer}>
          <FlatList
            data={timeFilters}
            renderItem={renderTimeFilter}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          />
        </View>

        {analytics && (
          <>
            {/* Overview Stats */}
            <View style={[styles.overviewContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Обзор
              </Text>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <MaterialIcons name="fitness-center" size={24} color="#4ECDC4" />
                  <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
                    {analytics.totalPractices}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
                    Практик
                  </Text>
                </View>
                <View style={styles.overviewCard}>
                  <MaterialIcons name="timer" size={24} color="#667eea" />
                  <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
                    {analytics.totalDuration}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
                    Минут
                  </Text>
                </View>
                <View style={styles.overviewCard}>
                  <MaterialIcons name="thumb-up" size={24} color="#f093fb" />
                  <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
                    {analytics.averageEffectiveness}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
                    Эффективность
                  </Text>
                </View>
                <View style={styles.overviewCard}>
                  <MaterialIcons name="trending-up" size={24} color="#43e97b" />
                  <Text style={[styles.overviewValue, { color: theme.colors.text }]}>
                    {analytics.averageDifficulty}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
                    Сложность
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Активность за 14 дней
              </Text>
              <FlatList
                data={analytics.recentActivity}
                renderItem={renderRecentActivity}
                keyExtractor={item => item.date}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityList}
              />
            </View>

            {/* Category Progress */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Прогресс по категориям
              </Text>
              <FlatList
                data={analytics.categoryProgress}
                renderItem={renderCategoryProgress}
                keyExtractor={item => item.category}
                scrollEnabled={false}
                contentContainerStyle={styles.categoryList}
              />
            </View>

            {/* Most Used Skills */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Самые используемые навыки
              </Text>
              <FlatList
                data={analytics.mostUsedSkills.slice(0, 5)}
                renderItem={renderMostUsedSkill}
                keyExtractor={item => item.skill}
                scrollEnabled={false}
                contentContainerStyle={styles.skillsList}
              />
            </View>

            {/* Monthly Stats */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Статистика по месяцам
              </Text>
              <View style={styles.monthlyChart}>
                {analytics.monthlyStats.map((month, index) => (
                  <View key={index} style={styles.monthlyColumn}>
                    <View style={styles.monthlyBar}>
                      <View 
                        style={[
                          styles.monthlyFill,
                          { 
                            height: `${Math.max(10, (month.practices / 20) * 100)}%`,
                            backgroundColor: '#4ECDC4'
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.monthlyLabel, { color: theme.colors.textSecondary }]}>
                      {month.month}
                    </Text>
                    <Text style={[styles.monthlyValue, { color: theme.colors.text }]}>
                      {month.practices}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!analytics && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <MaterialIcons name="analytics" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              Нет данных для анализа
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Начните практиковать навыки DBT, чтобы увидеть статистику
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 15,
  },
  filtersContainer: {
    marginVertical: 20,
  },
  filtersList: {
    paddingHorizontal: 5,
  },
  timeFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  timeFilterActive: {
    backgroundColor: '#4ECDC4',
  },
  timeFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  overviewContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  activityList: {
    paddingHorizontal: 10,
  },
  activityDay: {
    alignItems: 'center',
    marginHorizontal: 5,
    minWidth: 35,
  },
  activityDate: {
    fontSize: 10,
    marginBottom: 8,
  },
  activityBar: {
    height: 60,
    width: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  activityFill: {
    borderRadius: 10,
    minHeight: 4,
  },
  activityCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryList: {
    paddingBottom: 10,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryStats: {
    marginTop: 8,
  },
  effectivenessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  effectivenessLabel: {
    fontSize: 12,
    minWidth: 80,
  },
  effectivenessBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  effectivenessFill: {
    height: '100%',
    borderRadius: 4,
  },
  effectivenessValue: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  skillsList: {
    paddingBottom: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  skillCategory: {
    fontSize: 12,
  },
  skillStats: {
    alignItems: 'center',
  },
  skillCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  skillCountLabel: {
    fontSize: 10,
  },
  monthlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 10,
  },
  monthlyColumn: {
    alignItems: 'center',
    flex: 1,
  },
  monthlyBar: {
    height: 80,
    width: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  monthlyFill: {
    borderRadius: 10,
    minHeight: 4,
  },
  monthlyLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  monthlyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DBTAnalyticsScreen;
