import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TherapyColors } from '../styles/therapyStyles';

interface EmotionDataPoint {
  date: string;
  emotion: string;
  intensity: number;
  timestamp: Date;
}

interface ProgressTrackingProps {
  onClose?: () => void;
}

const ProgressTracking: React.FC<ProgressTrackingProps> = ({ onClose }) => {
  const [emotionHistory, setEmotionHistory] = useState<EmotionDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmotionHistory();
  }, []);

  const loadEmotionHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('emotion_history');
      if (data) {
        const history: EmotionDataPoint[] = JSON.parse(data);
        setEmotionHistory(history);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load emotion history:', error);
      setLoading(false);
    }
  };

  const filterDataByTimeRange = (data: EmotionDataPoint[]) => {
    const now = new Date();
    const filtered = data.filter(item => {
      const itemDate = new Date(item.timestamp);
      const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (timeRange === 'week') return daysDiff <= 7;
      if (timeRange === 'month') return daysDiff <= 30;
      return true;
    });
    return filtered;
  };

  const getEmotionTrend = () => {
    const filtered = filterDataByTimeRange(emotionHistory);
    
    // Group by day
    const dailyData: { [key: string]: { total: number; count: number } } = {};
    
    filtered.forEach(item => {
      const day = new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      if (!dailyData[day]) {
        dailyData[day] = { total: 0, count: 0 };
      }
      
      dailyData[day].total += item.intensity;
      dailyData[day].count++;
    });

    const labels = Object.keys(dailyData).slice(-7); // Last 7 data points
    const data = labels.map(day => dailyData[day].total / dailyData[day].count);

    return { labels, data };
  };

  const getEmotionDistribution = () => {
    const filtered = filterDataByTimeRange(emotionHistory);
    const distribution: { [key: string]: number } = {};

    filtered.forEach(item => {
      distribution[item.emotion] = (distribution[item.emotion] || 0) + 1;
    });

    return distribution;
  };

  const getEmotionColor = (emotion: string): string => {
    const colors: { [key: string]: string } = {
      anxious: '#FF8A65',
      sad: '#BA68C8',
      angry: '#FF7043',
      positive: '#66BB6A',
      calm: '#4FC3F7',
      neutral: '#90A4AE',
    };
    return colors[emotion.toLowerCase()] || '#90A4AE';
  };

  const calculateProgress = () => {
    const filtered = filterDataByTimeRange(emotionHistory);
    
    if (filtered.length === 0) return { improvement: 0, message: 'Start tracking to see progress' };

    // Compare first half vs second half of data
    const midpoint = Math.floor(filtered.length / 2);
    const firstHalf = filtered.slice(0, midpoint);
    const secondHalf = filtered.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, item) => sum + item.intensity, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, item) => sum + item.intensity, 0) / secondHalf.length;

    const improvement = ((avgFirst - avgSecond) / avgFirst) * 100;

    let message = '';
    if (improvement > 20) message = '🎉 Excellent progress! Your emotional wellness is improving.';
    else if (improvement > 10) message = '💪 Good progress! Keep up the great work.';
    else if (improvement > 0) message = '✨ Small improvements are still progress!';
    else if (improvement > -10) message = '🌊 Emotions fluctuate. This is normal.';
    else message = '💙 Consider reaching out for additional support.';

    return { improvement, message };
  };

  const trend = getEmotionTrend();
  const distribution = getEmotionDistribution();
  const progress = calculateProgress();

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#F5F8FA',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(113, 128, 150, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: TherapyColors.primary,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if (emotionHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={80} color="#CBD5E0" />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptyText}>
          Start having therapy sessions to see your emotional progress over time.
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Progress Tracking</Text>
          <Text style={styles.subtitle}>Your emotional wellness journey</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#718096" />
          </TouchableOpacity>
        )}
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'all' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('all')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'all' && styles.timeRangeTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Summary */}
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Overall Progress</Text>
        <Text style={styles.progressPercentage}>
          {progress.improvement > 0 ? '+' : ''}{progress.improvement.toFixed(1)}%
        </Text>
        <Text style={styles.progressMessage}>{progress.message}</Text>
      </View>

      {/* Emotion Trend Chart */}
      {trend.data.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Emotional Intensity Over Time</Text>
          <Text style={styles.cardSubtitle}>Lower intensity = Better regulation</Text>
          <LineChart
            data={{
              labels: trend.labels,
              datasets: [{ data: trend.data }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>
      )}

      {/* Emotion Distribution */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Emotion Distribution</Text>
        <Text style={styles.cardSubtitle}>What you've been feeling most</Text>
        
        {Object.entries(distribution).map(([emotion, count]) => {
          const percentage = (count / emotionHistory.length) * 100;
          return (
            <View key={emotion} style={styles.distributionRow}>
              <View style={styles.emotionLabelContainer}>
                <View
                  style={[
                    styles.emotionColorDot,
                    { backgroundColor: getEmotionColor(emotion) },
                  ]}
                />
                <Text style={styles.emotionLabel}>{emotion}</Text>
              </View>
              <View style={styles.distributionBarContainer}>
                <View
                  style={[
                    styles.distributionBar,
                    {
                      width: `${percentage}%`,
                      backgroundColor: getEmotionColor(emotion),
                    },
                  ]}
                />
              </View>
              <Text style={styles.distributionPercentage}>{percentage.toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>

      {/* Insights */}
      <View style={styles.insightsCard}>
        <View style={styles.insightHeader}>
          <Ionicons name="bulb" size={20} color={TherapyColors.support} />
          <Text style={styles.cardTitle}>Key Insights</Text>
        </View>
        
        <View style={styles.insightRow}>
          <Text style={styles.insightBullet}>•</Text>
          <Text style={styles.insightText}>
            You've tracked {emotionHistory.length} emotional check-ins
          </Text>
        </View>
        
        {Object.keys(distribution).length > 0 && (
          <View style={styles.insightRow}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Most common emotion: {Object.keys(distribution).sort((a, b) => distribution[b] - distribution[a])[0]}
            </Text>
          </View>
        )}
        
        {progress.improvement > 0 && (
          <View style={styles.insightRow}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>
              Your emotional intensity has decreased by {progress.improvement.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeRangeButtonActive: {
    backgroundColor: TherapyColors.primary,
    borderColor: TherapyColors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  progressCard: {
    backgroundColor: TherapyColors.healing,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  progressPercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  progressMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emotionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  emotionColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  emotionLabel: {
    fontSize: 13,
    color: '#1A202C',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  distributionBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 12,
  },
  distributionPercentage: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  insightBullet: {
    fontSize: 18,
    color: TherapyColors.support,
    marginRight: 8,
    fontWeight: '700',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: TherapyColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40,
  },
});

export default ProgressTracking;
