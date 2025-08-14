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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface ProblemSolvingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  content: string;
}

interface ProblemSolvingSession {
  id: string;
  problem: string;
  goal: string;
  steps: ProblemSolvingStep[];
  solutions: string[];
  selectedSolution: string;
  actionPlan: string;
  outcome: string;
  createdAt: string;
  completedAt?: string;
}

const ProblemSolvingScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [sessions, setSessions] = useState<ProblemSolvingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ProblemSolvingSession | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const problemSolvingSteps = [
    {
      id: 'problem-identification',
      title: 'Определение проблемы',
      description: 'Четко сформулируйте проблему',
      icon: 'search',
      completed: false,
      content: '',
    },
    {
      id: 'goal-setting',
      title: 'Постановка цели',
      description: 'Определите желаемый результат',
      icon: 'flag',
      completed: false,
      content: '',
    },
    {
      id: 'brainstorming',
      title: 'Генерация решений',
      description: 'Придумайте все возможные решения',
      icon: 'lightbulb',
      completed: false,
      content: '',
    },
    {
      id: 'evaluation',
      title: 'Оценка решений',
      description: 'Проанализируйте плюсы и минусы',
      icon: 'balance',
      completed: false,
      content: '',
    },
    {
      id: 'selection',
      title: 'Выбор решения',
      description: 'Выберите наилучшее решение',
      icon: 'check-circle',
      completed: false,
      content: '',
    },
    {
      id: 'action-plan',
      title: 'План действий',
      description: 'Составьте конкретный план',
      icon: 'assignment',
      completed: false,
      content: '',
    },
    {
      id: 'implementation',
      title: 'Реализация',
      description: 'Выполните план',
      icon: 'play-arrow',
      completed: false,
      content: '',
    },
    {
      id: 'evaluation-outcome',
      title: 'Оценка результата',
      description: 'Оцените эффективность решения',
      icon: 'assessment',
      completed: false,
      content: '',
    },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('cbt_problem_solving_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = async (newSessions: ProblemSolvingSession[]) => {
    try {
      await AsyncStorage.setItem('cbt_problem_solving_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const startNewSession = () => {
    Haptics.selectionAsync();
    const newSession: ProblemSolvingSession = {
      id: Date.now().toString(),
      problem: '',
      goal: '',
      steps: problemSolvingSteps,
      solutions: [],
      selectedSolution: '',
      actionPlan: '',
      outcome: '',
      createdAt: new Date().toISOString(),
    };
    setCurrentSession(newSession);
    setCurrentStep(0);
    setShowHistory(false);
  };

  const updateCurrentStep = (content: string) => {
    if (!currentSession) return;
    
    const updatedSteps = [...currentSession.steps];
    updatedSteps[currentStep].content = content;
    updatedSteps[currentStep].completed = content.trim() !== '';
    
    setCurrentSession({
      ...currentSession,
      steps: updatedSteps,
    });
  };

  const nextStep = () => {
    if (currentStep < problemSolvingSteps.length - 1) {
      Haptics.selectionAsync();
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      Haptics.selectionAsync();
      setCurrentStep(currentStep - 1);
    }
  };

  const saveSession = async () => {
    if (!currentSession) return;
    
    try {
      const completedSession = {
        ...currentSession,
        completedAt: new Date().toISOString(),
      };
      
      const newSessions = [...sessions, completedSession];
      await saveSessions(newSessions);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Успех', 'Сессия решения проблем сохранена');
      setCurrentSession(null);
      setShowHistory(true);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить сессию');
    }
  };

  const renderStepContent = () => {
    if (!currentSession) return null;
    
    const step = currentSession.steps[currentStep];
    
    return (
      <View style={[styles.stepContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.stepHeader}>
          <MaterialIcons name={step.icon as any} size={28} color={theme.colors.primary} />
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{step.title}</Text>
        </View>
        
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
          {step.description}
        </Text>
        
        <TextInput
          style={[styles.stepInput, { 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder={getPlaceholder(step.id)}
          placeholderTextColor={theme.colors.textSecondary}
          value={step.content}
          onChangeText={updateCurrentStep}
          multiline
          numberOfLines={6}
        />
        
        {step.id === 'brainstorming' && (
          <View style={styles.brainstormingTips}>
            <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>Советы:</Text>
            <Text style={[styles.tipsText, { color: theme.colors.textSecondary }]}>
              • Записывайте все идеи, даже кажущиеся абсурдными{'\n'}
              • Не критикуйте идеи на этом этапе{'\n'}
              • Стремитесь к количеству, не к качеству{'\n'}
              • Комбинируйте идеи для создания новых решений
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getPlaceholder = (stepId: string) => {
    switch (stepId) {
      case 'problem-identification':
        return 'Опишите проблему максимально конкретно...';
      case 'goal-setting':
        return 'Что вы хотите достичь?';
      case 'brainstorming':
        return 'Перечислите все возможные решения...';
      case 'evaluation':
        return 'Оцените каждое решение: плюсы и минусы...';
      case 'selection':
        return 'Выберите лучшее решение и объясните почему...';
      case 'action-plan':
        return 'Составьте пошаговый план действий...';
      case 'implementation':
        return 'Опишите, как вы будете выполнять план...';
      case 'evaluation-outcome':
        return 'Оцените результат и что можно улучшить...';
      default:
        return 'Введите ваш ответ...';
    }
  };

  const renderProgressBar = () => {
    if (!currentSession) return null;
    
    const progress = (currentStep + 1) / problemSolvingSteps.length;
    
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <LinearGradient
            colors={['#4ECDC4', '#44A08D']}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
          Шаг {currentStep + 1} из {problemSolvingSteps.length}
        </Text>
      </View>
    );
  };

  const renderHistory = () => {
    return (
      <ScrollView style={styles.historyContainer}>
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[styles.historyItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              setCurrentSession(session);
              setShowHistory(false);
            }}
          >
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {session.problem || 'Проблема не указана'}
              </Text>
              <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                {new Date(session.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.historyGoal, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              Цель: {session.goal || 'Не указана'}
            </Text>
            <View style={styles.historyStatus}>
              <MaterialIcons 
                name={session.completedAt ? 'check-circle' : 'radio-button-unchecked'} 
                size={16} 
                color={session.completedAt ? '#4ECDC4' : theme.colors.textSecondary} 
              />
              <Text style={[styles.historyStatusText, { color: theme.colors.textSecondary }]}>
                {session.completedAt ? 'Завершена' : 'В процессе'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (showHistory) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            История решений
          </Text>
          <TouchableOpacity onPress={startNewSession}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {renderHistory()}
      </SafeAreaView>
    );
  }

  if (!currentSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Решение проблем
          </Text>
          <TouchableOpacity onPress={() => setShowHistory(true)}>
            <MaterialIcons name="history" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.welcomeContainer}>
          <LinearGradient
            colors={['#96CEB4', '#FFECD2']}
            style={styles.welcomeCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="build" size={64} color="white" />
            <Text style={styles.welcomeTitle}>Структурированное решение проблем</Text>
            <Text style={styles.welcomeDescription}>
              Пошаговый подход к решению жизненных проблем с использованием техник КПТ
            </Text>
          </LinearGradient>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
            onPress={startNewSession}
          >
            <Text style={styles.startButtonText}>Начать новую сессию</Text>
          </TouchableOpacity>
        </View>
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
          Решение проблем
        </Text>
        <TouchableOpacity onPress={saveSession}>
          <MaterialIcons name="save" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {renderProgressBar()}
      
      <ScrollView style={styles.content}>
        {renderStepContent()}
      </ScrollView>
      
      <View style={[styles.navigationButtons, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.navButton, { 
            backgroundColor: currentStep > 0 ? theme.colors.primary : theme.colors.border,
            opacity: currentStep > 0 ? 1 : 0.5,
          }]}
          onPress={prevStep}
          disabled={currentStep === 0}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
          <Text style={styles.navButtonText}>Назад</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, { 
            backgroundColor: currentStep < problemSolvingSteps.length - 1 ? theme.colors.primary : '#4ECDC4',
          }]}
          onPress={currentStep < problemSolvingSteps.length - 1 ? nextStep : saveSession}
        >
          <Text style={styles.navButtonText}>
            {currentStep < problemSolvingSteps.length - 1 ? 'Далее' : 'Сохранить'}
          </Text>
          <MaterialIcons 
            name={currentStep < problemSolvingSteps.length - 1 ? 'arrow-forward' : 'save'} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
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
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
    maxWidth: 300,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.9,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  stepInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  brainstormingTips: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  historyDate: {
    fontSize: 12,
  },
  historyGoal: {
    fontSize: 14,
    marginBottom: 8,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStatusText: {
    fontSize: 12,
    marginLeft: 6,
  },
});

export default ProblemSolvingScreen;
