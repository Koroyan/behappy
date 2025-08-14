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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface InterpersonalSkill {
  id: string;
  name: string;
  acronym: string;
  description: string;
  steps: string[];
  category: 'getting' | 'maintaining' | 'ending';
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  color: string[];
  practiced: boolean;
}

interface PracticeSession {
  id: string;
  skillId: string;
  situation: string;
  goal: string;
  approach: string;
  outcome: string;
  effectiveness: number;
  notes: string;
  createdAt: string;
}

const InterpersonalEffectivenessScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<'getting' | 'maintaining' | 'ending'>('getting');
  const [selectedSkill, setSelectedSkill] = useState<InterpersonalSkill | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceSession, setPracticeSession] = useState<Partial<PracticeSession>>({});
  const [sessions, setSessions] = useState<PracticeSession[]>([]);

  const interpersonalSkills: InterpersonalSkill[] = [
    // Getting what you want
    {
      id: 'dear-man',
      name: 'DEAR MAN',
      acronym: 'DEAR MAN',
      description: 'Техника для просьб и получения желаемого',
      steps: [
        'Describe - Опишите ситуацию фактами',
        'Express - Выразите свои чувства',
        'Assert - Четко заявите о своих потребностях',
        'Reinforce - Подкрепите выгодами',
        'Mindful - Будьте осознанными',
        'Appear confident - Выглядите уверенно',
        'Negotiate - Будьте готовы к переговорам'
      ],
      category: 'getting',
      difficulty: 'medium',
      icon: 'record-voice-over',
      color: ['#4facfe', '#00f2fe'],
      practiced: false,
    },
    {
      id: 'broken-record',
      name: 'Заезженная пластинка',
      acronym: 'RECORD',
      description: 'Повторение просьбы без оправданий',
      steps: [
        'Repeat - Повторяйте свою просьбу',
        'Explain briefly - Кратко объясняйте',
        'Calmly - Сохраняйте спокойствие',
        'Offer alternatives - Предлагайте альтернативы',
        'Redirect - Перенаправляйте беседу',
        'Don\'t justify - Не оправдывайтесь'
      ],
      category: 'getting',
      difficulty: 'easy',
      icon: 'repeat',
      color: ['#667eea', '#764ba2'],
      practiced: false,
    },
    
    // Maintaining relationships
    {
      id: 'give',
      name: 'GIVE',
      acronym: 'GIVE',
      description: 'Поддержание отношений во время конфликта',
      steps: [
        'Gentle - Будьте мягкими',
        'Interested - Проявляйте интерес',
        'Validate - Подтверждайте чувства',
        'Easy manner - Легкая манера общения'
      ],
      category: 'maintaining',
      difficulty: 'medium',
      icon: 'favorite',
      color: ['#f093fb', '#f5576c'],
      practiced: false,
    },
    {
      id: 'validation',
      name: 'Валидация',
      acronym: 'VALID',
      description: 'Подтверждение чувств и опыта другого',
      steps: [
        'Value - Цените точку зрения',
        'Acknowledge - Признавайте чувства',
        'Listen - Активно слушайте',
        'Inquire - Задавайте вопросы',
        'Don\'t assume - Не предполагайте'
      ],
      category: 'maintaining',
      difficulty: 'easy',
      icon: 'thumb-up',
      color: ['#43e97b', '#38f9d7'],
      practiced: false,
    },
    
    // Ending interactions
    {
      id: 'fast',
      name: 'FAST',
      acronym: 'FAST',
      description: 'Сохранение самоуважения',
      steps: [
        'Fair - Будьте справедливыми',
        'Apologies - Не извиняйтесь без причины',
        'Stick to values - Придерживайтесь ценностей',
        'Truthful - Будьте честными'
      ],
      category: 'ending',
      difficulty: 'medium',
      icon: 'speed',
      color: ['#ff6b6b', '#ffa726'],
      practiced: false,
    },
    {
      id: 'saying-no',
      name: 'Умение сказать НЕТ',
      acronym: 'NO',
      description: 'Эффективный отказ без чувства вины',
      steps: [
        'Name the request - Назовите просьбу',
        'Options - Рассмотрите варианты',
        'Decline firmly - Откажитесь твердо',
        'Offer alternatives - Предложите альтернативы'
      ],
      category: 'ending',
      difficulty: 'hard',
      icon: 'cancel',
      color: ['#a8edea', '#fed6e3'],
      practiced: false,
    },
    {
      id: 'conflict-resolution',
      name: 'Разрешение конфликтов',
      acronym: 'SOLVE',
      description: 'Конструктивное решение споров',
      steps: [
        'Stop - Остановитесь и подумайте',
        'Observe - Наблюдайте за ситуацией',
        'Listen - Слушайте другую сторону',
        'Validate - Подтверждайте чувства',
        'Engage - Включайтесь в решение'
      ],
      category: 'ending',
      difficulty: 'hard',
      icon: 'handshake',
      color: ['#96CEB4', '#FFECD2'],
      practiced: false,
    },
  ];

  const categories = [
    { id: 'getting', title: 'Получение желаемого', icon: 'trending-up' },
    { id: 'maintaining', title: 'Поддержание отношений', icon: 'favorite' },
    { id: 'ending', title: 'Завершение взаимодействий', icon: 'exit-to-app' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('dbt_interpersonal_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = async (newSessions: PracticeSession[]) => {
    try {
      await AsyncStorage.setItem('dbt_interpersonal_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const startPractice = (skill: InterpersonalSkill) => {
    Haptics.selectionAsync();
    setSelectedSkill(skill);
    setPracticeSession({
      skillId: skill.id,
      situation: '',
      goal: '',
      approach: '',
      outcome: '',
      effectiveness: 5,
      notes: '',
    });
    setShowPracticeModal(true);
  };

  const savePracticeSession = async () => {
    if (!practiceSession.situation || !practiceSession.goal) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    const session: PracticeSession = {
      id: Date.now().toString(),
      skillId: practiceSession.skillId!,
      situation: practiceSession.situation!,
      goal: practiceSession.goal!,
      approach: practiceSession.approach!,
      outcome: practiceSession.outcome!,
      effectiveness: practiceSession.effectiveness!,
      notes: practiceSession.notes!,
      createdAt: new Date().toISOString(),
    };

    const newSessions = [...sessions, session];
    await saveSessions(newSessions);
    
    setShowPracticeModal(false);
    setPracticeSession({});
    setSelectedSkill(null);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getSkillsByCategory = (category: 'getting' | 'maintaining' | 'ending') => {
    return interpersonalSkills.filter(skill => skill.category === category);
  };

  const getSkillPracticeCount = (skillId: string) => {
    return sessions.filter(session => session.skillId === skillId).length;
  };

  const getAverageEffectiveness = (skillId: string) => {
    const skillSessions = sessions.filter(session => session.skillId === skillId);
    if (skillSessions.length === 0) return 0;
    
    const totalEffectiveness = skillSessions.reduce((sum, session) => sum + session.effectiveness, 0);
    return Math.round(totalEffectiveness / skillSessions.length);
  };

  const renderSkillCard = (skill: InterpersonalSkill) => {
    const practiceCount = getSkillPracticeCount(skill.id);
    const avgEffectiveness = getAverageEffectiveness(skill.id);
    
    return (
      <TouchableOpacity
        key={skill.id}
        style={[styles.skillCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => startPractice(skill)}
      >
        <LinearGradient
          colors={skill.color as [string, string]}
          style={styles.skillHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name={skill.icon as any} size={32} color="white" />
          <View style={styles.skillTitleContainer}>
            <Text style={styles.skillAcronym}>{skill.acronym}</Text>
            <Text style={styles.skillName}>{skill.name}</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.skillContent}>
          <Text style={[styles.skillDescription, { color: theme.colors.textSecondary }]}>
            {skill.description}
          </Text>
          
          <View style={styles.skillSteps}>
            {skill.steps.slice(0, 3).map((step, index) => (
              <Text key={index} style={[styles.stepText, { color: theme.colors.text }]}>
                • {step}
              </Text>
            ))}
            {skill.steps.length > 3 && (
              <Text style={[styles.moreSteps, { color: theme.colors.primary }]}>
                +{skill.steps.length - 3} больше шагов
              </Text>
            )}
          </View>
          
          <View style={styles.skillStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="fitness-center" size={16} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {practiceCount} практик
              </Text>
            </View>
            
            {avgEffectiveness > 0 && (
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {avgEffectiveness}/10
                </Text>
              </View>
            )}
            
            <View style={[styles.difficultyBadge, { 
              backgroundColor: skill.difficulty === 'easy' ? '#4ECDC4' : 
                               skill.difficulty === 'medium' ? '#ff6b6b' : '#f093fb' 
            }]}>
              <Text style={styles.difficultyText}>
                {skill.difficulty === 'easy' ? 'Легкий' : 
                 skill.difficulty === 'medium' ? 'Средний' : 'Сложный'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPracticeModal = () => {
    if (!selectedSkill) return null;
    
    return (
      <Modal visible={showPracticeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={() => setShowPracticeModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Практика: {selectedSkill.name}
            </Text>
            <TouchableOpacity onPress={savePracticeSession}>
              <MaterialIcons name="save" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={[styles.skillStepsContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.stepsTitle, { color: theme.colors.text }]}>
                Шаги {selectedSkill.acronym}:
              </Text>
              {selectedSkill.steps.map((step, index) => (
                <Text key={index} style={[styles.stepDetailText, { color: theme.colors.textSecondary }]}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>
            
            <View style={[styles.practiceForm, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                Практическое применение
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Ситуация *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Опишите ситуацию, в которой применяли навык"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.situation}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, situation: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Цель *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Что вы хотели достичь?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.goal}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, goal: text })}
                  multiline
                  numberOfLines={2}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Подход
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Как вы применили навык?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.approach}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, approach: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Результат
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Каков был результат?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.outcome}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, outcome: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Эффективность: {practiceSession.effectiveness}/10
                </Text>
                <View style={styles.effectivenessContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, { 
                        backgroundColor: (practiceSession.effectiveness || 5) >= rating ? 
                          theme.colors.primary : theme.colors.border 
                      }]}
                      onPress={() => setPracticeSession({ ...practiceSession, effectiveness: rating })}
                    >
                      <Text style={[styles.ratingText, { 
                        color: (practiceSession.effectiveness || 5) >= rating ? 'white' : theme.colors.textSecondary 
                      }]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Дополнительные заметки
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Что бы вы сделали по-другому?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.notes}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, notes: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Межличностная эффективность
        </Text>
        <TouchableOpacity onPress={() => {}}>
          <MaterialIcons name="info" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.categoryTabs}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryTab, { 
              backgroundColor: activeCategory === category.id ? theme.colors.primary : theme.colors.background,
            }]}
            onPress={() => setActiveCategory(category.id as any)}
          >
            <MaterialIcons 
              name={category.icon as any} 
              size={20} 
              color={activeCategory === category.id ? 'white' : theme.colors.textSecondary} 
            />
            <Text style={[styles.categoryTabText, { 
              color: activeCategory === category.id ? 'white' : theme.colors.textSecondary 
            }]}>
              {category.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.skillsList}>
        {getSkillsByCategory(activeCategory).map(renderSkillCard)}
      </ScrollView>
      
      {renderPracticeModal()}
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
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skillCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  skillTitleContainer: {
    marginLeft: 16,
  },
  skillAcronym: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  skillName: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  skillContent: {
    padding: 20,
  },
  skillDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  skillSteps: {
    marginBottom: 16,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  moreSteps: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skillStepsContainer: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepDetailText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  practiceForm: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  effectivenessContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InterpersonalEffectivenessScreen;
