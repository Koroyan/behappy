import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import aiTherapyService from '../services/aiTherapyService';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

interface EmotionData {
  emotion: string;
  intensity: number;
  timestamp: Date;
}

interface EmotionTrackerProps {
  onComplete?: () => void;
  showCurrentSession?: boolean;
}

const EmotionTracker: React.FC<EmotionTrackerProps> = ({
  onComplete,
  showCurrentSession = false,
}) => {
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  const { width } = Dimensions.get('window');
  const chartWidth = width - 64;

  useEffect(() => {
    loadEmotionData();
  }, [selectedPeriod]);

  const loadEmotionData = async () => {
    try {
      setLoading(true);
      const data = await aiTherapyService.getEmotionHistory();
      
      // Filter data based on selected period
      const now = new Date();
      const filteredData = data.filter((item: any) => {
        const itemDate = new Date(item.timestamp);
        const diffTime = now.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        
        switch (selectedPeriod) {
          case 'day':
            return diffDays <= 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });

      setEmotionHistory(filteredData);
    } catch (error) {
      console.error('Failed to load emotion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (emotionHistory.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
        }],
      };
    }

    // Convert emotion data to chart format
    const labels = emotionHistory.slice(-7).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toLocaleDateString('en', { weekday: 'short' });
    });

    const data = emotionHistory.slice(-7).map(item => item.intensity);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(107, 115, 255, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(107, 115, 255, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    propsForLabels: {
      fontSize: 12,
      fill: TherapyColors.textSecondary,
    },
    propsForVerticalLabels: {
      fontSize: 10,
      fill: TherapyColors.textSecondary,
    },
    propsForBackgroundLines: {
      stroke: '#E1E8ED',
      strokeWidth: 1,
    },
  };

  const getEmotionColor = (emotion: string): string => {
    const emotionColors: { [key: string]: string } = {
      happy: TherapyColors.emotions.joy,
      sad: TherapyColors.emotions.sadness,
      angry: TherapyColors.emotions.anger,
      anxious: TherapyColors.emotions.anxious,
      fear: TherapyColors.emotions.fear,
      love: TherapyColors.emotions.love,
      calm: TherapyColors.emotions.calm,
      surprised: TherapyColors.emotions.surprise,
      neutral: TherapyColors.textSecondary,
      positive: TherapyColors.healing,
      concerned: TherapyColors.emotions.anxious,
    };
    
    return emotionColors[emotion.toLowerCase()] || TherapyColors.primary;
  };

  const getEmotionSummary = () => {
    if (emotionHistory.length === 0) return null;

    const emotionCounts: { [key: string]: number } = {};
    let totalIntensity = 0;

    emotionHistory.forEach(item => {
      emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
      totalIntensity += item.intensity;
    });

    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const averageIntensity = totalIntensity / emotionHistory.length;

    return {
      mostCommonEmotion,
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      totalEntries: emotionHistory.length,
    };
  };

  const getInsights = () => {
    const summary = getEmotionSummary();
    if (!summary) return [];

    const insights = [];

    if (summary.averageIntensity > 7) {
      insights.push('Your emotions have been quite intense recently. Consider practicing breathing exercises.');
    } else if (summary.averageIntensity < 3) {
      insights.push('Your emotional intensity has been relatively low. This could indicate calm or emotional numbness.');
    }

    if (summary.mostCommonEmotion === 'anxious') {
      insights.push('Anxiety appears to be a recurring theme. Mindfulness and grounding techniques might help.');
    } else if (summary.mostCommonEmotion === 'happy') {
      insights.push('You\'ve been experiencing mostly positive emotions. Keep doing what makes you feel good!');
    }

    if (summary.totalEntries > 10) {
      insights.push('Great job tracking your emotions consistently! This awareness is a powerful tool for healing.');
    }

    return insights;
  };

  const chartData = getChartData();
  const summary = getEmotionSummary();
  const insights = getInsights();

  if (loading) {
    return (
      <View style={therapyStyles.emotionTrackerContainer}>
        <Text style={therapyStyles.emotionTrackerTitle}>Loading Emotion Data...</Text>
      </View>
    );
  }

  if (emotionHistory.length === 0) {
    return (
      <View style={therapyStyles.emotionTrackerContainer}>
        <Text style={therapyStyles.emotionTrackerTitle}>Emotion Tracker</Text>
        <Text style={[therapyStyles.body, { textAlign: 'center', marginVertical: 20 }]}>
          No emotion data available yet. Keep chatting to build your emotional journey map!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={therapyStyles.emotionTrackerContainer}>
      <Text style={therapyStyles.emotionTrackerTitle}>Your Emotional Journey</Text>

      {/* Period selector */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        {['day', 'week', 'month'].map((period) => (
          <Text
            key={period}
            onPress={() => setSelectedPeriod(period as any)}
            style={[
              therapyStyles.techniqueBadgeText,
              {
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginHorizontal: 4,
                backgroundColor: selectedPeriod === period ? TherapyColors.primary : TherapyColors.background,
                color: selectedPeriod === period ? '#FFFFFF' : TherapyColors.primary,
                borderRadius: 16,
                textTransform: 'capitalize',
              },
            ]}
          >
            {period}
          </Text>
        ))}
      </View>

      {/* Emotion intensity chart */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        {chartData.datasets[0].data.length > 0 ? (
          <LineChart
            data={chartData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        ) : (
          <View style={{
            width: chartWidth,
            height: 200,
            backgroundColor: '#F8F9FA',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={therapyStyles.bodySecondary}>
              Not enough data to show chart
            </Text>
          </View>
        )}
      </View>

      {/* Summary statistics */}
      {summary && (
        <View style={therapyStyles.card}>
          <Text style={therapyStyles.subtitle}>Summary</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={therapyStyles.caption}>MOST COMMON</Text>
              <View style={[therapyStyles.techniqueBadge, {
                backgroundColor: getEmotionColor(summary.mostCommonEmotion),
              }]}>
                <Text style={[therapyStyles.techniqueBadgeText, { color: '#FFFFFF' }]}>
                  {summary.mostCommonEmotion}
                </Text>
              </View>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={therapyStyles.caption}>AVG INTENSITY</Text>
              <Text style={[therapyStyles.title, { fontSize: 20 }]}>
                {summary.averageIntensity}/10
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={therapyStyles.caption}>ENTRIES</Text>
              <Text style={[therapyStyles.title, { fontSize: 20 }]}>
                {summary.totalEntries}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent emotions */}
      <View style={therapyStyles.card}>
        <Text style={therapyStyles.subtitle}>Recent Emotions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
            {emotionHistory.slice(-8).map((item, index) => (
              <View key={index} style={{ alignItems: 'center', marginRight: 16 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: getEmotionColor(item.emotion),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18 }}>
                    {item.emotion === 'happy' ? '😊' : 
                     item.emotion === 'sad' ? '😢' :
                     item.emotion === 'angry' ? '😠' :
                     item.emotion === 'anxious' ? '😰' :
                     item.emotion === 'calm' ? '😌' : '😐'}
                  </Text>
                </View>
                <Text style={[therapyStyles.caption, { textAlign: 'center' }]}>
                  {item.emotion}
                </Text>
                <Text style={[therapyStyles.caption, { fontSize: 10 }]}>
                  {item.intensity}/10
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Insights */}
      {insights.length > 0 && (
        <View style={therapyStyles.card}>
          <Text style={therapyStyles.subtitle}>Insights</Text>
          {insights.map((insight, index) => (
            <Text key={index} style={[therapyStyles.body, { marginVertical: 4 }]}>
              • {insight}
            </Text>
          ))}
        </View>
      )}

      {onComplete && (
        <View style={{ marginTop: 20, marginBottom: 10 }}>
          <Text
            onPress={onComplete}
            style={[therapyStyles.primaryButton, { textAlign: 'center' }]}
          >
            <Text style={therapyStyles.primaryButtonText}>Continue Conversation</Text>
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default EmotionTracker;