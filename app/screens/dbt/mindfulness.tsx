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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface MindfulnessSkill {
  id: string;
  title: string;
  description: string;
  type: 'what' | 'how' | 'wise-mind';
  icon: string;
  color: string[];
  steps: string[];
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: number;
  instructions: string[];
}

interface PracticeSession {
  id: string;
  skillId: string;
  exerciseId?: string;
  duration: number;
  quality: number;
  insights: string;
  challenges: string;
  createdAt: string;
}

const MindfulnessScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'what' | 'how' | 'wise-mind'>('what');
  const [selectedSkill, setSelectedSkill] = useState<MindfulnessSkill | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceSession, setPracticeSession] = useState<Partial<PracticeSession>>({});
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const mindfulnessSkills: MindfulnessSkill[] = [
    // WHAT skills
    {
      id: 'observe',
      title: 'Наблюдать',
      description: 'Замечать без слов и суждений',
      type: 'what',
      icon: 'visibility',
      color: ['#43e97b', '#38f9d7'],
      steps: [
        'Заметьте свои пять чувств',
        'Наблюдайте за дыханием',
        'Замечайте мысли как облака',
        'Наблюдайте за эмоциями',
        'Не привязывайтесь к опыту'
      ],
      exercises: [
        {
          id: 'breath-observation',
          title: 'Наблюдение за дыханием',
          description: 'Простое наблюдение за естественным дыханием',
          duration: 5,
          instructions: [
            'Сядьте удобно и закройте глаза',
            'Заметьте свое естественное дыхание',
            'Наблюдайте за вдохом и выдохом',
            'Не пытайтесь изменить дыхание',
            'Просто наблюдайте'
          ]
        },
        {
          id: 'body-scan',
          title: 'Сканирование тела',
          description: 'Систематическое наблюдение за телесными ощущениями',
          duration: 10,
          instructions: [
            'Лягте удобно',
            'Начните с пальцев ног',
            'Медленно перемещайте внимание вверх',
            'Замечайте все ощущения',
            'Не пытайтесь изменить что-либо'
          ]
        }
      ]
    },
    {
      id: 'describe',
      title: 'Описывать',
      description: 'Называть то, что наблюдаете',
      type: 'what',
      icon: 'text-fields',
      color: ['#667eea', '#764ba2'],
      steps: [
        'Используйте только факты',
        'Избегайте интерпретаций',
        'Говорите что видите/чувствуете',
        'Не добавляйте мнения',
        'Будьте конкретны'
      ],
      exercises: [
        {
          id: 'emotion-labeling',
          title: 'Называние эмоций',
          description: 'Точное описание эмоциональных состояний',
          duration: 5,
          instructions: [
            'Заметьте эмоцию в теле',
            'Назовите ее одним словом',
            'Опишите физические ощущения',
            'Не судите эмоцию',
            'Примите ее присутствие'
          ]
        }
      ]
    },
    {
      id: 'participate',
      title: 'Участвовать',
      description: 'Полностью погружаться в деятельность',
      type: 'what',
      icon: 'sports-handball',
      color: ['#f093fb', '#f5576c'],
      steps: [
        'Войдите в деятельность полностью',
        'Забудьте о себе',
        'Станьте одним с деятельностью',
        'Не наблюдайте со стороны',
        'Позвольте себе раствориться'
      ],
      exercises: [
        {
          id: 'mindful-walking',
          title: 'Осознанная ходьба',
          description: 'Полное погружение в процесс ходьбы',
          duration: 10,
          instructions: [
            'Идите медленно',
            'Почувствуйте каждый шаг',
            'Заметьте движение мышц',
            'Станьте ходьбой',
            'Не думайте о цели'
          ]
        }
      ]
    },

    // HOW skills
    {
      id: 'non-judgmentally',
      title: 'Без суждений',
      description: 'Не оценивать как хорошо или плохо',
      type: 'how',
      icon: 'balance',
      color: ['#4facfe', '#00f2fe'],
      steps: [
        'Замечайте суждения',
        'Не боритесь с ними',
        'Возвращайтесь к фактам',
        'Принимайте как есть',
        'Отпускайте оценки'
      ],
      exercises: [
        {
          id: 'judgment-awareness',
          title: 'Осознание суждений',
          description: 'Замечание и отпускание оценочных мыслей',
          duration: 7,
          instructions: [
            'Замечайте суждения о себе',
            'Не боритесь с ними',
            'Мягко возвращайтесь к наблюдению',
            'Примите их как мысли',
            'Отпустите необходимость оценивать'
          ]
        }
      ]
    },
    {
      id: 'one-mindfully',
      title: 'Однонаправленно',
      description: 'Делать одну вещь в один момент',
      type: 'how',
      icon: 'center-focus-strong',
      color: ['#ff6b6b', '#ffa726'],
      steps: [
        'Сосредоточьтесь на одном',
        'Не многозадачность',
        'Когда ум блуждает, возвращайтесь',
        'Полностью здесь и сейчас',
        'Одна вещь за раз'
      ],
      exercises: [
        {
          id: 'single-task',
          title: 'Одна задача',
          description: 'Полное сосредоточение на одной деятельности',
          duration: 15,
          instructions: [
            'Выберите простую задачу',
            'Делайте только ее',
            'Замечайте отвлечения',
            'Мягко возвращайтесь',
            'Завершите полностью'
          ]
        }
      ]
    },
    {
      id: 'effectively',
      title: 'Эффективно',
      description: 'Делать то, что работает',
      type: 'how',
      icon: 'trending-up',
      color: ['#96CEB4', '#FFECD2'],
      steps: [
        'Сосредоточьтесь на целях',
        'Отпустите то, что правильно',
        'Делайте то, что работает',
        'Не боритесь с реальностью',
        'Действуйте мудро'
      ],
      exercises: [
        {
          id: 'goal-focus',
          title: 'Фокус на цели',
          description: 'Сосредоточение на том, что действительно важно',
          duration: 10,
          instructions: [
            'Определите свою цель',
            'Отпустите "правильность"',
            'Сосредоточьтесь на результате',
            'Делайте то, что работает',
            'Примите необходимые шаги'
          ]
        }
      ]
    },

    // Wise Mind
    {
      id: 'wise-mind',
      title: 'Мудрый разум',
      description: 'Интеграция мыслей и чувств',
      type: 'wise-mind',
      icon: 'psychology',
      color: ['#a8edea', '#fed6e3'],
      steps: [
        'Найдите место покоя',
        'Заметьте рациональный разум',
        'Заметьте эмоциональный разум',
        'Найдите точку баланса',
        'Действуйте из мудрости'
      ],
      exercises: [
        {
          id: 'wise-mind-meditation',
          title: 'Медитация мудрого разума',
          description: 'Поиск внутренней мудрости и баланса',
          duration: 15,
          instructions: [
            'Сядьте в тишине',
            'Заметьте свои мысли',
            'Заметьте свои чувства',
            'Найдите место тишины внутри',
            'Спросите совета у мудрого разума'
          ]
        },
        {
          id: 'stone-meditation',
          title: 'Медитация камня',
          description: 'Использование образа камня для центрирования',
          duration: 10,
          instructions: [
            'Представьте камень внутри',
            'Он находится в центре вашего существа',
            'Камень спокоен и мудр',
            'Позвольте ему дать вам совет',
            'Оставайтесь с этим чувством'
          ]
        }
      ]
    }
  ];

  const tabs = [
    { id: 'what', title: 'ЧТО навыки', icon: 'search' },
    { id: 'how', title: 'КАК навыки', icon: 'build' },
    { id: 'wise-mind', title: 'Мудрый разум', icon: 'psychology' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Время вышло!', 'Практика завершена');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('dbt_mindfulness_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = async (newSessions: PracticeSession[]) => {
    try {
      await AsyncStorage.setItem('dbt_mindfulness_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const startPractice = (skill: MindfulnessSkill, exercise?: Exercise) => {
    Haptics.selectionAsync();
    setSelectedSkill(skill);
    setPracticeSession({
      skillId: skill.id,
      exerciseId: exercise?.id,
      duration: exercise?.duration || 5,
      quality: 5,
      insights: '',
      challenges: '',
    });
    setTimer((exercise?.duration || 5) * 60);
    setShowPracticeModal(true);
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    Haptics.selectionAsync();
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    Haptics.selectionAsync();
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimer((practiceSession.duration || 5) * 60);
    Haptics.selectionAsync();
  };

  const savePracticeSession = async () => {
    if (!practiceSession.insights) {
      Alert.alert('Ошибка', 'Добавьте ваши инсайты');
      return;
    }

    const session: PracticeSession = {
      id: Date.now().toString(),
      skillId: practiceSession.skillId!,
      exerciseId: practiceSession.exerciseId,
      duration: practiceSession.duration!,
      quality: practiceSession.quality!,
      insights: practiceSession.insights!,
      challenges: practiceSession.challenges!,
      createdAt: new Date().toISOString(),
    };

    const newSessions = [...sessions, session];
    await saveSessions(newSessions);
    
    setShowPracticeModal(false);
    setPracticeSession({});
    setSelectedSkill(null);
    setTimer(0);
    setIsTimerRunning(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSkillsByType = (type: 'what' | 'how' | 'wise-mind') => {
    return mindfulnessSkills.filter(skill => skill.type === type);
  };

  const renderSkillCard = (skill: MindfulnessSkill) => {
    const practiceCount = sessions.filter(s => s.skillId === skill.id).length;
    const avgQuality = sessions.filter(s => s.skillId === skill.id).reduce((sum, s) => sum + s.quality, 0) / practiceCount || 0;
    
    return (
      <View key={skill.id} style={[styles.skillCard, { backgroundColor: theme.colors.surface }]}>
        <LinearGradient
          colors={skill.color as [string, string]}
          style={styles.skillHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name={skill.icon as any} size={32} color="white" />
          <Text style={styles.skillTitle}>{skill.title}</Text>
        </LinearGradient>
        
        <View style={styles.skillContent}>
          <Text style={[styles.skillDescription, { color: theme.colors.textSecondary }]}>
            {skill.description}
          </Text>
          
          <View style={styles.skillSteps}>
            <Text style={[styles.stepsTitle, { color: theme.colors.text }]}>Ключевые принципы:</Text>
            {skill.steps.map((step, index) => (
              <Text key={index} style={[styles.stepText, { color: theme.colors.textSecondary }]}>
                • {step}
              </Text>
            ))}
          </View>
          
          <View style={styles.skillStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="fitness-center" size={16} color={theme.colors.primary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {practiceCount} практик
              </Text>
            </View>
            
            {avgQuality > 0 && (
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {avgQuality.toFixed(1)}/10
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.exerciseButtons}>
            <TouchableOpacity
              style={[styles.practiceButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => startPractice(skill)}
            >
              <MaterialIcons name="play-arrow" size={20} color="white" />
              <Text style={styles.practiceButtonText}>Быстрая практика</Text>
            </TouchableOpacity>
            
            {skill.exercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseButton, { backgroundColor: theme.colors.background }]}
                onPress={() => startPractice(skill, exercise)}
              >
                <Text style={[styles.exerciseButtonText, { color: theme.colors.text }]}>
                  {exercise.title} ({exercise.duration} мин)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPracticeModal = () => {
    if (!selectedSkill) return null;
    
    const currentExercise = selectedSkill.exercises.find(e => e.id === practiceSession.exerciseId);
    
    return (
      <Modal visible={showPracticeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={() => setShowPracticeModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {currentExercise?.title || selectedSkill.title}
            </Text>
            <TouchableOpacity onPress={savePracticeSession}>
              <MaterialIcons name="save" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {currentExercise && (
              <View style={[styles.exerciseInstructions, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
                  Инструкции:
                </Text>
                {currentExercise.instructions.map((instruction, index) => (
                  <Text key={index} style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
              </View>
            )}
            
            <View style={[styles.timerContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.timerTitle, { color: theme.colors.text }]}>
                Таймер практики
              </Text>
              
              <Text style={[styles.timerDisplay, { color: theme.colors.primary }]}>
                {formatTime(timer)}
              </Text>
              
              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={[styles.timerButton, { backgroundColor: theme.colors.primary }]}
                  onPress={isTimerRunning ? stopTimer : startTimer}
                >
                  <MaterialIcons 
                    name={isTimerRunning ? 'pause' : 'play-arrow'} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.timerButton, { backgroundColor: theme.colors.border }]}
                  onPress={resetTimer}
                >
                  <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.reflectionForm, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                Рефлексия
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Качество практики: {practiceSession.quality}/10
                </Text>
                <View style={styles.qualityContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, { 
                        backgroundColor: (practiceSession.quality || 5) >= rating ? 
                          theme.colors.primary : theme.colors.border 
                      }]}
                      onPress={() => setPracticeSession({ ...practiceSession, quality: rating })}
                    >
                      <Text style={[styles.ratingText, { 
                        color: (practiceSession.quality || 5) >= rating ? 'white' : theme.colors.textSecondary 
                      }]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Инсайты и наблюдения *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Что вы заметили во время практики?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.insights}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, insights: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Вызовы и трудности
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="С какими трудностями вы столкнулись?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={practiceSession.challenges}
                  onChangeText={(text) => setPracticeSession({ ...practiceSession, challenges: text })}
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
          Осознанность
        </Text>
        <TouchableOpacity onPress={() => {}}>
          <MaterialIcons name="info" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, { 
              backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.background,
            }]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? 'white' : theme.colors.textSecondary} 
            />
            <Text style={[styles.tabText, { 
              color: activeTab === tab.id ? 'white' : theme.colors.textSecondary 
            }]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.skillsList}>
        {getSkillsByType(activeTab).map(renderSkillCard)}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabText: {
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
  skillTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
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
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  exerciseButtons: {
    gap: 8,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  practiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  exerciseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exerciseButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  exerciseInstructions: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timerContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  timerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionForm: {
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
  qualityContainer: {
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
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});

export default MindfulnessScreen;
