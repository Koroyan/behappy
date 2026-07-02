import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TherapyColors } from '../styles/therapyStyles';

export interface SessionSummary {
  sessionId: string;
  sessionDate: Date;
  duration: number; // minutes
  messageCount: number;
  themes: string[];
  emotionalPatterns: {
    emotion: string;
    frequency: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  techniques: {
    method: string;
    count: number;
  }[];
  keyInsights: string[];
  homework: string[];
  progressScore: number; // 0-100
  nextSteps: string;
}

interface SessionSummaryCardProps {
  summary: SessionSummary;
  onClose?: () => void;
  onExport?: () => void;
}

const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({
  summary,
  onClose,
  onExport,
}) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const getProgressColor = (score: number): string => {
    if (score >= 75) return '#66BB6A'; // Green - excellent
    if (score >= 50) return '#FFB74D'; // Orange - good
    if (score >= 25) return '#FF8A65'; // Light red - needs attention
    return '#E57373'; // Red - concerning
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining'): 'trending-up' | 'trending-down' | 'remove' => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining'): string => {
    switch (trend) {
      case 'improving': return '#66BB6A';
      case 'declining': return '#E57373';
      default: return '#FFB74D';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#F5F8FA', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Session Summary</Text>
            <Text style={styles.subtitle}>
              {summary.sessionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#718096" />
            </TouchableOpacity>
          )}
        </View>

        {/* Session Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color={TherapyColors.primary} />
            <Text style={styles.statValue}>{formatDuration(summary.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="chatbubbles-outline" size={24} color={TherapyColors.healing} />
            <Text style={styles.statValue}>{summary.messageCount}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="bulb-outline" size={24} color={TherapyColors.support} />
            <Text style={styles.statValue}>{summary.keyInsights.length}</Text>
            <Text style={styles.statLabel}>Insights</Text>
          </View>
        </View>

        {/* Progress Score */}
        <View style={styles.progressSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color={TherapyColors.primary} />
            <Text style={styles.sectionTitle}>Session Progress</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${summary.progressScore}%`,
                    backgroundColor: getProgressColor(summary.progressScore),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: getProgressColor(summary.progressScore) }]}>
              {summary.progressScore}% Therapeutic Engagement
            </Text>
          </View>
        </View>

        {/* Main Themes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color={TherapyColors.primary} />
            <Text style={styles.sectionTitle}>Main Themes Discussed</Text>
          </View>
          <View style={styles.chipContainer}>
            {summary.themes.map((theme, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{theme}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Emotional Patterns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={20} color={TherapyColors.primary} />
            <Text style={styles.sectionTitle}>Emotional Patterns</Text>
          </View>
          {summary.emotionalPatterns.map((pattern, index) => (
            <View key={index} style={styles.emotionRow}>
              <View style={styles.emotionInfo}>
                <Text style={styles.emotionName}>{pattern.emotion}</Text>
                <Text style={styles.emotionFrequency}>
                  Mentioned {pattern.frequency} {pattern.frequency === 1 ? 'time' : 'times'}
                </Text>
              </View>
              <View style={[styles.trendBadge, { backgroundColor: getTrendColor(pattern.trend) + '20' }]}>
                <Ionicons 
                  name={getTrendIcon(pattern.trend)} 
                  size={16} 
                  color={getTrendColor(pattern.trend)} 
                />
                <Text style={[styles.trendText, { color: getTrendColor(pattern.trend) }]}>
                  {pattern.trend}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Techniques Used */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color={TherapyColors.primary} />
            <Text style={styles.sectionTitle}>Therapeutic Techniques</Text>
          </View>
          {summary.techniques.map((technique, index) => (
            <View key={index} style={styles.techniqueRow}>
              <Text style={styles.techniqueName}>{technique.method}</Text>
              <View style={styles.techniqueBadge}>
                <Text style={styles.techniqueCount}>{technique.count}x</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Key Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color={TherapyColors.primary} />
            <Text style={styles.sectionTitle}>Key Insights</Text>
          </View>
          {summary.keyInsights.map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Homework */}
        {summary.homework.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard" size={20} color={TherapyColors.support} />
              <Text style={styles.sectionTitle}>Homework & Practice</Text>
            </View>
            {summary.homework.map((task, index) => (
              <View key={index} style={styles.homeworkRow}>
                <Ionicons name="checkbox-outline" size={20} color={TherapyColors.support} />
                <Text style={styles.homeworkText}>{task}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Next Steps */}
        <View style={[styles.section, styles.nextStepsSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Next Steps</Text>
          </View>
          <Text style={styles.nextStepsText}>{summary.nextSteps}</Text>
        </View>

        {/* Export Button */}
        {onExport && (
          <TouchableOpacity style={styles.exportButton} onPress={onExport}>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export Summary as PDF</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  closeButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: TherapyColors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    color: TherapyColors.primary,
    fontWeight: '600',
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  emotionInfo: {
    flex: 1,
  },
  emotionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    textTransform: 'capitalize',
  },
  emotionFrequency: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  techniqueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  techniqueName: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: '500',
  },
  techniqueBadge: {
    backgroundColor: TherapyColors.healing + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  techniqueCount: {
    fontSize: 12,
    color: TherapyColors.healing,
    fontWeight: '700',
  },
  insightRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  bullet: {
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
  homeworkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  homeworkText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
    lineHeight: 20,
  },
  nextStepsSection: {
    backgroundColor: TherapyColors.healing,
  },
  nextStepsText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TherapyColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default SessionSummaryCard;
