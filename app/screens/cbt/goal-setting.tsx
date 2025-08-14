import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'professional' | 'health' | 'relationships' | 'learning' | 'financial';
  priority: 'high' | 'medium' | 'low';
  isSpecific: boolean;
  isMeasurable: boolean;
  isAchievable: boolean;
  isRelevant: boolean;
  isTimeBound: boolean;
  targetDate: string;
  milestones: Milestone[];
  progress: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

const GoalSettingScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal' as Goal['category'],
    priority: 'medium' as Goal['priority'],
    targetDate: '',
    milestones: [] as Milestone[],
  });

  const categories = [
    { id: 'personal', title: 'Личные', icon: 'person', color: '#4ECDC4' },
    { id: 'professional', title: 'Карьера', icon: 'work', color: '#667eea' },
    { id: 'health', title: 'Здоровье', icon: 'fitness-center', color: '#f093fb' },
    { id: 'relationships', title: 'Отношения', icon: 'favorite', color: '#43e97b' },
    { id: 'learning', title: 'Обучение', icon: 'school', color: '#ff6b6b' },
    { id: 'financial', title: 'Финансы', icon: 'account-balance', color: '#96CEB4' },
  ];

  const priorities = [
    { id: 'high', title: 'Высокий', color: '#f093fb' },
    { id: 'medium', title: 'Средний', color: '#667eea' },
    { id: 'low', title: 'Низкий', color: '#4ECDC4' },
  ];

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await AsyncStorage.getItem('cbt_goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const saveGoals = async (newGoals: Goal[]) => {
    try {
      await AsyncStorage.setItem('cbt_goals', JSON.stringify(newGoals));
      setGoals(newGoals);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const createGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Ошибка', 'Введите название цели');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      priority: newGoal.priority,
      isSpecific: newGoal.title.length > 10,
      isMeasurable: newGoal.description.includes('измерить') || newGoal.description.includes('количество'),
      isAchievable: true,
      isRelevant: true,
      isTimeBound: newGoal.targetDate !== '',
      targetDate: newGoal.targetDate,
      milestones: newGoal.milestones,
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updatedGoals = [...goals, goal];
    await saveGoals(updatedGoals);
    
    setNewGoal({
      title: '',
      description: '',
      category: 'personal',
      priority: 'medium',
      targetDate: '',
      milestones: [],
    });
    
    setShowCreateGoal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateGoalProgress = async (goalId: string, progress: number) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedGoal = { ...goal, progress };
        if (progress === 100 && goal.status === 'active') {
          updatedGoal.status = 'completed';
          updatedGoal.completedAt = new Date().toISOString();
        }
        return updatedGoal;
      }
      return goal;
    });
    
    await saveGoals(updatedGoals);
  };

  const toggleGoalStatus = async (goalId: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const newStatus: Goal['status'] = goal.status === 'active' ? 'paused' : 'active';
        return { ...goal, status: newStatus };
      }
      return goal;
    });
    
    await saveGoals(updatedGoals);
  };

  const deleteGoal = async (goalId: string) => {
    Alert.alert(
      'Удалить цель',
      'Вы уверены, что хотите удалить эту цель?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const updatedGoals = goals.filter(goal => goal.id !== goalId);
            await saveGoals(updatedGoals);
          },
        },
      ]
    );
  };

  const addMilestone = () => {
    const milestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      targetDate: '',
      completed: false,
    };
    
    setNewGoal({
      ...newGoal,
      milestones: [...newGoal.milestones, milestone],
    });
  };

  const updateMilestone = (milestoneId: string, field: string, value: string) => {
    const updatedMilestones = newGoal.milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        return { ...milestone, [field]: value };
      }
      return milestone;
    });
    
    setNewGoal({
      ...newGoal,
      milestones: updatedMilestones,
    });
  };

  const removeMilestone = (milestoneId: string) => {
    setNewGoal({
      ...newGoal,
      milestones: newGoal.milestones.filter(m => m.id !== milestoneId),
    });
  };

  const getSmartScore = (goal: Goal) => {
    let score = 0;
    if (goal.isSpecific) score += 20;
    if (goal.isMeasurable) score += 20;
    if (goal.isAchievable) score += 20;
    if (goal.isRelevant) score += 20;
    if (goal.isTimeBound) score += 20;
    return score;
  };

  const getFilteredGoals = () => {
    switch (activeFilter) {
      case 'active':
        return goals.filter(goal => goal.status === 'active');
      case 'completed':
        return goals.filter(goal => goal.status === 'completed');
      default:
        return goals;
    }
  };

  const renderGoalCard = (goal: Goal) => {
    const category = categories.find(cat => cat.id === goal.category);
    const smartScore = getSmartScore(goal);
    
    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => setCurrentGoal(goal)}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <MaterialIcons 
              name={category?.icon as any} 
              size={24} 
              color={category?.color} 
            />
            <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
              {goal.title}
            </Text>
          </View>
          <View style={styles.goalActions}>
            <TouchableOpacity
              onPress={() => toggleGoalStatus(goal.id)}
              style={[styles.statusButton, { 
                backgroundColor: goal.status === 'active' ? '#4ECDC4' : '#ff6b6b' 
              }]}
            >
              <MaterialIcons 
                name={goal.status === 'active' ? 'pause' : 'play-arrow'} 
                size={16} 
                color="white" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteGoal(goal.id)}
              style={[styles.deleteButton, { backgroundColor: '#ff6b6b' }]}
            >
              <MaterialIcons name="delete" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={[styles.goalDescription, { color: theme.colors.textSecondary }]}>
          {goal.description}
        </Text>
        
        <View style={styles.goalMeta}>
          <View style={[styles.priorityBadge, { 
            backgroundColor: priorities.find(p => p.id === goal.priority)?.color + '20' 
          }]}>
            <Text style={[styles.priorityText, { 
              color: priorities.find(p => p.id === goal.priority)?.color 
            }]}>
              {priorities.find(p => p.id === goal.priority)?.title}
            </Text>
          </View>
          <Text style={[styles.targetDate, { color: theme.colors.textSecondary }]}>
            {goal.targetDate ? `До ${new Date(goal.targetDate).toLocaleDateString()}` : 'Без срока'}
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
              Прогресс
            </Text>
            <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>
              {goal.progress}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={[styles.progressFill, { width: `${goal.progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
        
        <View style={styles.smartContainer}>
          <Text style={[styles.smartLabel, { color: theme.colors.textSecondary }]}>
            SMART Score:
          </Text>
          <View style={[styles.smartScore, { 
            backgroundColor: smartScore >= 80 ? '#4ECDC4' : smartScore >= 60 ? '#ff6b6b' : '#f093fb' 
          }]}>
            <Text style={styles.smartScoreText}>{smartScore}/100</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateGoalForm = () => {
    return (
      <ScrollView style={styles.createForm}>
        <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
            Основная информация
          </Text>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }]}
            placeholder="Название цели"
            placeholderTextColor={theme.colors.textSecondary}
            value={newGoal.title}
            onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
          />
          
          <TextInput
            style={[styles.textArea, { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }]}
            placeholder="Описание цели"
            placeholderTextColor={theme.colors.textSecondary}
            value={newGoal.description}
            onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.categoryContainer}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              Категория
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryItem, { 
                    backgroundColor: newGoal.category === category.id ? category.color : theme.colors.background,
                  }]}
                  onPress={() => setNewGoal({ ...newGoal, category: category.id as Goal['category'] })}
                >
                  <MaterialIcons 
                    name={category.icon as any} 
                    size={20} 
                    color={newGoal.category === category.id ? 'white' : category.color} 
                  />
                  <Text style={[styles.categoryText, { 
                    color: newGoal.category === category.id ? 'white' : theme.colors.text 
                  }]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.priorityContainer}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              Приоритет
            </Text>
            <View style={styles.priorityOptions}>
              {priorities.map(priority => (
                <TouchableOpacity
                  key={priority.id}
                  style={[styles.priorityOption, { 
                    backgroundColor: newGoal.priority === priority.id ? priority.color : theme.colors.background,
                    borderColor: priority.color,
                  }]}
                  onPress={() => setNewGoal({ ...newGoal, priority: priority.id as Goal['priority'] })}
                >
                  <Text style={[styles.priorityOptionText, { 
                    color: newGoal.priority === priority.id ? 'white' : priority.color 
                  }]}>
                    {priority.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }]}
            placeholder="Целевая дата (YYYY-MM-DD)"
            placeholderTextColor={theme.colors.textSecondary}
            value={newGoal.targetDate}
            onChangeText={(text) => setNewGoal({ ...newGoal, targetDate: text })}
          />
        </View>
        
        <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.milestonesHeader}>
            <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
              Этапы достижения
            </Text>
            <TouchableOpacity
              onPress={addMilestone}
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            >
              <MaterialIcons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          {newGoal.milestones.map((milestone, index) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={styles.milestoneHeader}>
                <Text style={[styles.milestoneNumber, { color: theme.colors.primary }]}>
                  Этап {index + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => removeMilestone(milestone.id)}
                  style={styles.removeMilestoneButton}
                >
                  <MaterialIcons name="close" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.milestoneInput, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Название этапа"
                placeholderTextColor={theme.colors.textSecondary}
                value={milestone.title}
                onChangeText={(text) => updateMilestone(milestone.id, 'title', text)}
              />
              
              <TextInput
                style={[styles.milestoneInput, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Описание этапа"
                placeholderTextColor={theme.colors.textSecondary}
                value={milestone.description}
                onChangeText={(text) => updateMilestone(milestone.id, 'description', text)}
              />
              
              <TextInput
                style={[styles.milestoneInput, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Срок выполнения (YYYY-MM-DD)"
                placeholderTextColor={theme.colors.textSecondary}
                value={milestone.targetDate}
                onChangeText={(text) => updateMilestone(milestone.id, 'targetDate', text)}
              />
            </View>
          ))}
        </View>
        
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
            onPress={() => setShowCreateGoal(false)}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
              Отмена
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={createGoal}
          >
            <Text style={styles.saveButtonText}>Создать цель</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if (showCreateGoal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => setShowCreateGoal(false)}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Новая цель
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        {renderCreateGoalForm()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Постановка целей
        </Text>
        <TouchableOpacity onPress={() => setShowCreateGoal(true)}>
          <MaterialIcons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        {(['all', 'active', 'completed'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, { 
              backgroundColor: activeFilter === filter ? theme.colors.primary : theme.colors.background,
            }]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterButtonText, { 
              color: activeFilter === filter ? 'white' : theme.colors.text 
            }]}>
              {filter === 'all' ? 'Все' : filter === 'active' ? 'Активные' : 'Завершенные'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.goalsList}>
        {getFilteredGoals().map(renderGoalCard)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetDate: {
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  smartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smartLabel: {
    fontSize: 12,
  },
  smartScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smartScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  createForm: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  priorityContainer: {
    marginBottom: 16,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeMilestoneButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default GoalSettingScreen;
