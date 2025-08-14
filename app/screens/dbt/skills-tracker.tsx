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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface SkillPractice {
  id: string;
  skillName: string;
  category: string;
  date: string;
  duration: number;
  effectiveness: number;
  notes: string;
  situation: string;
  difficulty: number;
}

interface SkillCategory {
  id: string;
  name: string;
  color: string[];
  icon: string;
  skills: string[];
}

const DBTSkillsTrackerScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [practices, setPractices] = useState<SkillPractice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    skillName: '',
    category: 'distress-tolerance',
    duration: 10,
    effectiveness: 5,
    notes: '',
    situation: '',
    difficulty: 3,
  });

  const skillCategories: SkillCategory[] = [
    {
      id: 'distress-tolerance',
      name: 'Устойчивость к стрессу',
      color: ['#667eea', '#764ba2'],
      icon: 'shield-half',
      skills: [
        'TIPP',
        'STOP',
        'Radical Acceptance',
        'Distraction',
        'Self-Soothing',
        'Improve the Moment',
        'Pros and Cons',
        'TIP Temperature',
        'Intense Exercise',
        'Paced Breathing',
        'Progressive Muscle Relaxation',
      ],
    },
    {
      id: 'emotion-regulation',
      name: 'Регуляция эмоций',
      color: ['#f093fb', '#f5576c'],
      icon: 'favorite',
      skills: [
        'PLEASE',
        'ABC PLEASE',
        'Opposite Action',
        'Mastery Activities',
        'Emotional Labeling',
        'Emotion Surfing',
        'Wise Mind',
        'Mindful Attention',
        'Emotional Granularity',
        'TIPP for Emotions',
        'Building Positive Emotions',
        'Cope Ahead',
        'Problem Solving',
        'Emotional Fact vs Fiction',
        'Emotional Effectiveness',
      ],
    },
    {
      id: 'interpersonal-effectiveness',
      name: 'Межличностная эффективность',
      color: ['#4facfe', '#00f2fe'],
      icon: 'people',
      skills: [
        'DEAR MAN',
        'GIVE',
        'FAST',
        'Interpersonal Values',
        'Relationship Priorities',
        'Validation',
        'Ending Relationships',
        'Walking the Middle Path',
        'Dialectical Thinking',
        'Conflict Resolution',
        'Boundary Setting',
        'Assertiveness',
        'Empathy Building',
        'Active Listening',
      ],
    },
    {
      id: 'mindfulness',
      name: 'Осознанность',
      color: ['#43e97b', '#38f9d7'],
      icon: 'self-improvement',
      skills: [
        'WHAT Skills',
        'HOW Skills',
        'Wise Mind',
        'Observe',
        'Describe',
        'Participate',
        'Non-judgmentally',
        'One-mindfully',
        'Effectively',
        'Mindful Breathing',
      ],
    },
  ];

  useEffect(() => {
    loadPractices();
  }, []);

  const loadPractices = async () => {
    try {
      const savedPractices = await AsyncStorage.getItem('dbt_skill_practices');
      if (savedPractices) {
        setPractices(JSON.parse(savedPractices));
      }
    } catch (error) {
      console.error('Error loading skill practices:', error);
    }
  };

  const savePractices = async (newPractices: SkillPractice[]) => {
    try {
      await AsyncStorage.setItem('dbt_skill_practices', JSON.stringify(newPractices));
      setPractices(newPractices);
    } catch (error) {
      console.error('Error saving skill practices:', error);
    }
  };

  const handleAddPractice = () => {
    if (!formData.skillName.trim()) {
      Alert.alert('Ошибка', 'Выберите навык для отслеживания');
      return;
    }

    const newPractice: SkillPractice = {
      id: Date.now().toString(),
      skillName: formData.skillName,
      category: formData.category,
      date: new Date().toISOString(),
      duration: formData.duration,
      effectiveness: formData.effectiveness,
      notes: formData.notes,
      situation: formData.situation,
      difficulty: formData.difficulty,
    };

    const newPractices = [newPractice, ...practices];
    savePractices(newPractices);
    
    setFormData({
      skillName: '',
      category: 'distress-tolerance',
      duration: 10,
      effectiveness: 5,
      notes: '',
      situation: '',
      difficulty: 3,
    });
    setShowAddForm(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeletePractice = (id: string) => {
    Alert.alert(
      'Удалить запись',
      'Вы уверены, что хотите удалить эту запись о практике?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const newPractices = practices.filter(p => p.id !== id);
            savePractices(newPractices);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const filteredPractices = selectedCategory === 'all' 
    ? practices 
    : practices.filter(p => p.category === selectedCategory);

  const getWeeklyStats = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const weeklyPractices = practices.filter(p => new Date(p.date) >= lastWeek);
    const totalDuration = weeklyPractices.reduce((sum, p) => sum + p.duration, 0);
    const avgEffectiveness = weeklyPractices.length > 0 
      ? weeklyPractices.reduce((sum, p) => sum + p.effectiveness, 0) / weeklyPractices.length
      : 0;
    
    return {
      count: weeklyPractices.length,
      totalDuration,
      avgEffectiveness: Math.round(avgEffectiveness * 10) / 10,
    };
  };

  const weeklyStats = getWeeklyStats();

  const renderCategoryFilter = ({ item }: { item: SkillCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryFilter,
        selectedCategory === item.id && styles.categoryFilterActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <LinearGradient
        colors={selectedCategory === item.id ? (item.color as any) : (['#e0e0e0', '#f0f0f0'] as any)}
        style={styles.categoryFilterGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons 
          name={item.icon as any} 
          size={18} 
          color={selectedCategory === item.id ? '#ffffff' : '#666666'} 
        />
        <Text style={[
          styles.categoryFilterText,
          { color: selectedCategory === item.id ? '#ffffff' : '#666666' }
        ]}>
          {item.name}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderPracticeItem = ({ item }: { item: SkillPractice }) => {
    const category = skillCategories.find(c => c.id === item.category);
    const date = new Date(item.date);
    
    return (
      <View style={[styles.practiceItem, { backgroundColor: theme.colors.card }]}>
        <View style={styles.practiceHeader}>
          <View style={styles.practiceInfo}>
            <Text style={[styles.practiceSkill, { color: theme.colors.text }]}>
              {item.skillName}
            </Text>
            <Text style={[styles.practiceCategory, { color: theme.colors.textSecondary }]}>
              {category?.name} • {date.toLocaleDateString('ru-RU')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePractice(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.practiceStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={16} color="#4ECDC4" />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.duration} мин
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="thumb-up" size={16} color="#667eea" />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.effectiveness}/10
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={16} color="#f093fb" />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.difficulty}/5
            </Text>
          </View>
        </View>
        
        {item.situation && (
          <Text style={[styles.practiceNotes, { color: theme.colors.textSecondary }]}>
            Ситуация: {item.situation}
          </Text>
        )}
        
        {item.notes && (
          <Text style={[styles.practiceNotes, { color: theme.colors.textSecondary }]}>
            Заметки: {item.notes}
          </Text>
        )}
      </View>
    );
  };

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
            Трекер навыков DBT
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Stats */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
            Статистика за неделю
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#4ECDC4' }]}>
                {weeklyStats.count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Практик
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#667eea' }]}>
                {weeklyStats.totalDuration}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Минут
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#f093fb' }]}>
                {weeklyStats.avgEffectiveness}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Эффективность
              </Text>
            </View>
          </View>
        </View>

        {/* Category Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.categoryFilter,
              selectedCategory === 'all' && styles.categoryFilterActive,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <View style={[
              styles.categoryFilterGradient,
              { backgroundColor: selectedCategory === 'all' ? '#4ECDC4' : '#e0e0e0' }
            ]}>
              <MaterialIcons 
                name="all-inclusive" 
                size={18} 
                color={selectedCategory === 'all' ? '#ffffff' : '#666666'} 
              />
              <Text style={[
                styles.categoryFilterText,
                { color: selectedCategory === 'all' ? '#ffffff' : '#666666' }
              ]}>
                Все
              </Text>
            </View>
          </TouchableOpacity>
          
          <FlatList
            data={skillCategories}
            renderItem={renderCategoryFilter}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryList}
          />
        </View>

        {/* Practice History */}
        <View style={styles.historyContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            История практик ({filteredPractices.length})
          </Text>
          
          {filteredPractices.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <MaterialIcons name="history" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Пока нет записей о практике
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddForm(true)}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.emptyStateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Добавить первую практику
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredPractices}
              renderItem={renderPracticeItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.practicesList}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Practice Modal */}
      {showAddForm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Добавить практику
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Category Selection */}
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Категория навыка
              </Text>
              <View style={styles.categoryGrid}>
                {skillCategories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      formData.category === category.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: category.id, skillName: '' })}
                  >
                    <MaterialIcons 
                      name={category.icon as any} 
                      size={20} 
                      color={formData.category === category.id ? '#ffffff' : '#666666'} 
                    />
                    <Text style={[
                      styles.categoryOptionText,
                      { color: formData.category === category.id ? '#ffffff' : '#666666' }
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Skill Selection */}
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Навык
              </Text>
              <View style={styles.skillGrid}>
                {skillCategories
                  .find(c => c.id === formData.category)
                  ?.skills.map(skill => (
                    <TouchableOpacity
                      key={skill}
                      style={[
                        styles.skillOption,
                        formData.skillName === skill && styles.skillOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, skillName: skill })}
                    >
                      <Text style={[
                        styles.skillOptionText,
                        { color: formData.skillName === skill ? '#ffffff' : theme.colors.text }
                      ]}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              {/* Duration */}
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Продолжительность: {formData.duration} мин
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setFormData({ ...formData, duration: Math.max(1, formData.duration - 5) })}
                >
                  <MaterialIcons name="remove" size={20} color="#666666" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(formData.duration / 120) * 100}%` }]} />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setFormData({ ...formData, duration: Math.min(120, formData.duration + 5) })}
                >
                  <MaterialIcons name="add" size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Effectiveness */}
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Эффективность: {formData.effectiveness}/10
              </Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      formData.effectiveness >= rating && styles.ratingButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, effectiveness: rating })}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      { color: formData.effectiveness >= rating ? '#ffffff' : '#666666' }
                    ]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Difficulty */}
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Сложность ситуации: {formData.difficulty}/5
              </Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map(difficulty => (
                  <TouchableOpacity
                    key={difficulty}
                    style={[
                      styles.ratingButton,
                      formData.difficulty >= difficulty && styles.ratingButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, difficulty: difficulty })}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      { color: formData.difficulty >= difficulty ? '#ffffff' : '#666666' }
                    ]}>
                      {difficulty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddPractice}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalButtonText}>Добавить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsGrid: {
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
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  filtersContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  categoryList: {
    marginLeft: 10,
  },
  categoryFilter: {
    marginRight: 10,
    marginBottom: 10,
  },
  categoryFilterActive: {
    elevation: 2,
  },
  categoryFilterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  historyContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
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
    marginBottom: 20,
  },
  emptyStateButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  practicesList: {
    paddingBottom: 20,
  },
  practiceItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceSkill: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  practiceCategory: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  practiceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  practiceNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
    minWidth: 120,
  },
  categoryOptionActive: {
    backgroundColor: '#4ECDC4',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  skillOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  skillOptionActive: {
    backgroundColor: '#4ECDC4',
  },
  skillOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 15,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  ratingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  ratingButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default DBTSkillsTrackerScreen;
