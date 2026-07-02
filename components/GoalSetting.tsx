import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { TherapyColors } from '../styles/therapyStyles';

export interface TherapeuticGoal {
  id: string;
  title: string;
  description: string;
  category: 'anxiety' | 'depression' | 'relationships' | 'self-esteem' | 'trauma' | 'other';
  targetDate: Date;
  milestones: Milestone[];
  progress: number; // 0-100
  createdAt: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface Milestone {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
}

interface GoalSettingProps {
  onClose?: () => void;
  onGoalCreated?: (goal: TherapeuticGoal) => void;
}

const GOALS_STORAGE_KEY = 'therapeutic_goals';

const GoalSetting: React.FC<GoalSettingProps> = ({ onClose, onGoalCreated }) => {
  const [goals, setGoals] = useState<TherapeuticGoal[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'anxiety' as TherapeuticGoal['category'],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (data) {
        const parsedGoals: TherapeuticGoal[] = JSON.parse(data);
        setGoals(parsedGoals);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load goals:', error);
      setLoading(false);
    }
  };

  const saveGoals = async (updatedGoals: TherapeuticGoal[]) => {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  const createGoal = () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a goal title.');
      return;
    }

    const goal: TherapeuticGoal = {
      id: `goal_${Date.now()}`,
      title: newGoal.title.trim(),
      description: newGoal.description.trim(),
      category: newGoal.category,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      milestones: getDefaultMilestones(newGoal.category),
      progress: 0,
      createdAt: new Date(),
      status: 'active',
    };

    const updatedGoals = [...goals, goal];
    saveGoals(updatedGoals);
    
    setNewGoal({ title: '', description: '', category: 'anxiety' });
    setIsCreating(false);
    
    onGoalCreated?.(goal);
  };

  const getDefaultMilestones = (category: TherapeuticGoal['category']): Milestone[] => {
    const templates: Record<TherapeuticGoal['category'], string[]> = {
      anxiety: [
        'Practice breathing exercises daily',
        'Identify anxiety triggers',
        'Use grounding techniques in stressful situations',
        'Notice reduction in physical symptoms'
      ],
      depression: [
        'Engage in one enjoyable activity daily',
        'Establish regular sleep schedule',
        'Connect with one supportive person weekly',
        'Notice improved energy and motivation'
      ],
      relationships: [
        'Practice active listening',
        'Set healthy boundaries',
        'Express needs clearly',
        'Build trust and connection'
      ],
      'self-esteem': [
        'Challenge negative self-talk',
        'Celebrate small achievements',
        'Practice self-compassion',
        'Recognize personal strengths'
      ],
      trauma: [
        'Learn grounding techniques',
        'Process trauma safely with support',
        'Build emotional regulation skills',
        'Develop sense of safety'
      ],
      other: [
        'Define specific steps',
        'Practice new skills',
        'Track progress',
        'Celebrate achievements'
      ]
    };

    return templates[category].map((text, index) => ({
      id: `milestone_${Date.now()}_${index}`,
      text,
      completed: false
    }));
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedMilestones = goal.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              completed: !m.completed,
              completedAt: !m.completed ? new Date() : undefined
            };
          }
          return m;
        });

        const progress = (updatedMilestones.filter(m => m.completed).length / updatedMilestones.length) * 100;
        
        return {
          ...goal,
          milestones: updatedMilestones,
          progress,
          status: progress === 100 ? 'completed' as const : goal.status
        };
      }
      return goal;
    });

    saveGoals(updatedGoals);
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedGoals = goals.filter(g => g.id !== goalId);
            saveGoals(updatedGoals);
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: TherapeuticGoal['category']): string => {
    const icons: Record<TherapeuticGoal['category'], string> = {
      anxiety: 'partly-sunny',
      depression: 'rainy',
      relationships: 'people',
      'self-esteem': 'heart',
      trauma: 'medical',
      other: 'star'
    };
    return icons[category];
  };

  const getCategoryColor = (category: TherapeuticGoal['category']): string => {
    const colors: Record<TherapeuticGoal['category'], string> = {
      anxiety: '#4FC3F7',
      depression: '#BA68C8',
      relationships: '#FF8A65',
      'self-esteem': '#FFB74D',
      trauma: '#E57373',
      other: '#90A4AE'
    };
    return colors[category];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  if (isCreating) {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create New Goal</Text>
          <TouchableOpacity onPress={() => setIsCreating(false)}>
            <Ionicons name="close" size={24} color="#718096" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Goal Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Manage anxiety better"
            value={newGoal.title}
            onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
            maxLength={100}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What do you want to achieve?"
            value={newGoal.description}
            onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {(['anxiety', 'depression', 'relationships', 'self-esteem', 'trauma', 'other'] as TherapeuticGoal['category'][]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  newGoal.category === cat && { backgroundColor: getCategoryColor(cat) + '30', borderColor: getCategoryColor(cat) }
                ]}
                onPress={() => setNewGoal({ ...newGoal, category: cat })}
              >
                <Ionicons name={getCategoryIcon(cat) as any} size={20} color={getCategoryColor(cat)} />
                <Text style={[styles.categoryText, { color: getCategoryColor(cat) }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.createButton} onPress={createGoal}>
            <Text style={styles.createButtonText}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Therapeutic Goals</Text>
          <Text style={styles.subtitle}>Track your progress towards wellness</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#718096" />
          </TouchableOpacity>
        )}
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="flag-outline" size={80} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No Goals Yet</Text>
          <Text style={styles.emptyText}>
            Set therapeutic goals to guide your wellness journey
          </Text>
        </View>
      ) : (
        <View style={styles.goalsContainer}>
          {goals.map(goal => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(goal.category) + '20' }]}>
                  <Ionicons name={getCategoryIcon(goal.category) as any} size={16} color={getCategoryColor(goal.category)} />
                  <Text style={[styles.categoryBadgeText, { color: getCategoryColor(goal.category) }]}>
                    {goal.category}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Ionicons name="trash-outline" size={20} color="#E53E3E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.goalTitle}>{goal.title}</Text>
              {goal.description && (
                <Text style={styles.goalDescription}>{goal.description}</Text>
              )}

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${goal.progress}%`,
                        backgroundColor: getCategoryColor(goal.category)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{goal.progress.toFixed(0)}%</Text>
              </View>

              <Text style={styles.milestonesTitle}>Milestones:</Text>
              {goal.milestones.map(milestone => (
                <TouchableOpacity
                  key={milestone.id}
                  style={styles.milestoneRow}
                  onPress={() => toggleMilestone(goal.id, milestone.id)}
                >
                  <Ionicons
                    name={milestone.completed ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={milestone.completed ? getCategoryColor(goal.category) : '#CBD5E0'}
                  />
                  <Text style={[
                    styles.milestoneText,
                    milestone.completed && styles.milestoneTextCompleted
                  ]}>
                    {milestone.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreating(true)}
      >
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Goal</Text>
      </TouchableOpacity>

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
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
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
  goalsContainer: {
    paddingHorizontal: 20,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    width: 40,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  milestoneText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 12,
  },
  milestoneTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TherapyColors.healing,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: TherapyColors.healing,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40,
  },
});

export default GoalSetting;
