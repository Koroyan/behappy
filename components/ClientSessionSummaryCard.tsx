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

// Client-safe version - minimal clinical details
export interface ClientSessionSummary {
  sessionDate: Date;
  duration: number; // minutes
  mainFeelings: string[]; // Simplified emotions
  practiceActivities: string[]; // Simplified homework/techniques
  encouragement: string; // Positive message
  personalGrowth?: string; // Optional growth note
}

interface ClientSessionSummaryCardProps {
  summary: ClientSessionSummary;
  onClose?: () => void;
  onSave?: () => void;
}

const ClientSessionSummaryCard: React.FC<ClientSessionSummaryCardProps> = ({
  summary,
  onClose,
  onSave,
}) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#E8F5E9', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={32} color="#66BB6A" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Your Session</Text>
              <Text style={styles.subtitle}>{formatDate(summary.sessionDate)}</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#718096" />
            </TouchableOpacity>
          )}
        </View>

        {/* Session Time */}
        <View style={styles.timeCard}>
          <Ionicons name="time" size={24} color={TherapyColors.healing} />
          <View style={styles.timeContent}>
            <Text style={styles.timeLabel}>Session Duration</Text>
            <Text style={styles.timeValue}>{formatDuration(summary.duration)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Main Feelings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="happy-outline" size={22} color={TherapyColors.support} />
            <Text style={styles.sectionTitle}>What We Explored Today</Text>
          </View>
          <View style={styles.feelingsContainer}>
            {summary.mainFeelings.map((feeling, index) => (
              <View key={index} style={styles.feelingChip}>
                <Text style={styles.feelingEmoji}>💭</Text>
                <Text style={styles.feelingText}>{feeling}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal Growth Note */}
        {summary.personalGrowth && (
          <View style={styles.growthCard}>
            <View style={styles.growthHeader}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.growthTitle}>Your Growth</Text>
            </View>
            <Text style={styles.growthText}>{summary.personalGrowth}</Text>
          </View>
        )}

        {/* Practice Activities */}
        {summary.practiceActivities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness-outline" size={22} color={TherapyColors.primary} />
              <Text style={styles.sectionTitle}>Things to Try</Text>
            </View>
            <Text style={styles.practiceIntro}>
              Here are some activities that might help you feel better:
            </Text>
            {summary.practiceActivities.map((activity, index) => (
              <View key={index} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={TherapyColors.healing} />
                </View>
                <Text style={styles.activityText}>{activity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Encouragement Message */}
        <LinearGradient
          colors={['#66BB6A', '#4CAF50']}
          style={styles.encouragementCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-circle" size={32} color="#FFFFFF" />
          <Text style={styles.encouragementText}>{summary.encouragement}</Text>
        </LinearGradient>

        {/* Reminder Note */}
        <View style={styles.reminderBox}>
          <Ionicons name="information-circle-outline" size={20} color="#5E8396" />
          <Text style={styles.reminderText}>
            Remember: Progress takes time. Be kind to yourself. 💚
          </Text>
        </View>

        {/* Save Button */}
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save This Summary</Text>
          </TouchableOpacity>
        )}

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>
          This is a personal summary for your reflection. 
          Your detailed session notes are kept private and secure.
        </Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
  },
  closeButton: {
    padding: 4,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  timeContent: {
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginLeft: 8,
  },
  feelingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  feelingEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  feelingText: {
    fontSize: 15,
    color: '#F57C00',
    fontWeight: '600',
  },
  growthCard: {
    backgroundColor: '#FFF3E0',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  growthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginLeft: 8,
  },
  growthText: {
    fontSize: 15,
    color: '#5D4037',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  practiceIntro: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  activityIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  activityText: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 21,
  },
  encouragementCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  encouragementText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 10,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TherapyColors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  privacyNote: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default ClientSessionSummaryCard;
