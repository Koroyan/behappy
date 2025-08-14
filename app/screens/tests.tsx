import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import ClinicalAssessmentScreen from '@/components/ClinicalAssessmentScreen';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';

type AssessmentType = 'PHQ9' | 'GAD7' | 'DASS21' | 'BigFive' | 'BDI' | 'EmotionalIntelligence' | 'Resilience';

interface TestCardProps {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  category: string;
  color: string;
  onPress: () => void;
  lastCompleted?: string | null;
  disabled?: boolean;
}

const TestCard: React.FC<TestCardProps> = ({
  name,
  description,
  duration,
  icon,
  category,
  color,
  onPress,
  lastCompleted,
  disabled,
}) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.testCard,
        { 
          borderLeftColor: color, 
          opacity: disabled ? 0.7 : 1,
          backgroundColor: lastCompleted ? `${color}10` : theme.colors.card 
        }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {lastCompleted && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Пройден</Text>
        </View>
      )}
      
      <View style={styles.testCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <View style={styles.testMeta}>
          <View style={styles.testCardTopRow}>
            <Text style={styles.testName}>{name}</Text>
            <View style={styles.durationContainer}>
              <FontAwesome5 name="clock" size={12} color={theme.colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.testDuration}>{duration}</Text>
            </View>
          </View>
          <Text style={styles.categoryTag}>{category}</Text>
        </View>
      </View>
      <Text style={styles.testDescription}>{description}</Text>
      
      {lastCompleted && (
        <View style={styles.lastCompletedContainer}>
          <FontAwesome5 name="calendar-check" size={12} color={theme.colors.text} style={{ marginRight: 6 }} />
          <Text style={styles.lastCompletedText}>
            Пройден: {new Date(lastCompleted).toLocaleDateString('ru-RU')}
          </Text>
        </View>
      )}
      
      {disabled && (
        <View style={styles.disabledOverlay}>
          <FontAwesome5 name="lock" size={14} color="#fff" />
          <Text style={styles.disabledText}>Доступно через 14 дней</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const TestsScreen = () => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AssessmentType | null>(null);
  const [testHistory, setTestHistory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('clinicalAssessments');
      const history = stored ? JSON.parse(stored) : {};
      setTestHistory(history);
      
      // Update user profile with test completion data
      await updateUserProfile(history);
    } catch (error) {
      console.error('Error loading test history:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю тестов');
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (history: Record<string, any[]>) => {
    try {
      const profileRaw = await AsyncStorage.getItem('userProfile');
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      
      // Calculate completed tests
      const completedTests = Object.keys(history).filter(testId => 
        history[testId] && history[testId].length > 0
      );
      
      const totalTests = tests.length;
      const completionPercentage = Math.round((completedTests.length / totalTests) * 100);
      
      const updatedProfile = {
        ...profile,
        assessmentHistory: {
          ...(profile.assessmentHistory || {}),
          completedTests,
          totalTests,
          completionPercentage,
          lastUpdated: new Date().toISOString()
        }
      };
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const canRetakeTest = (testId: string): boolean => {
    const history = testHistory[testId] || [];
    if (history.length === 0) return true;

    const lastTestDate = new Date(history[history.length - 1].testDate);
    const now = new Date();
    const daysDifference = Math.floor((now.getTime() - lastTestDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDifference >= 14;
  };

  const getLastCompletedDate = (testId: string): string | null => {
    const history = testHistory[testId] || [];
    if (history.length === 0) return null;
    return history[history.length - 1].testDate;
  };

  const getDaysUntilAvailable = (testId: string): number => {
    const history = testHistory[testId] || [];
    if (history.length === 0) return 0;

    const lastTestDate = new Date(history[history.length - 1].testDate);
    const now = new Date();
    const daysDifference = Math.floor((now.getTime() - lastTestDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - daysDifference);
  };

  const getDaysWord = (days: number): string => {
    if (days === 1) return 'день';
    if (days > 1 && days < 5) return 'дня';
    return 'дней';
  };

  const handleTestStart = (testId: string): void => {
    if (!canRetakeTest(testId)) {
      Alert.alert(
        'Тест недоступен',
        'Вы можете пройти этот тест только через 2 недели после последнего прохождения.',
      );
      return;
    }
    setSelectedTest(testId as AssessmentType);
    setShowAssessment(true);
  };

  const handleTestCompletion = async (result: any, aiAnalysis: any): Promise<void> => {
    try {
      const updatedHistory = { ...testHistory };
      if (!updatedHistory[selectedTest!]) {
        updatedHistory[selectedTest!] = [];
      }
      
      // Add the new test result with timestamp
      updatedHistory[selectedTest!].push({
        ...result,
        testDate: new Date().toISOString(),
        aiAnalysis,
        testType: selectedTest
      });
      
      await AsyncStorage.setItem('clinicalAssessments', JSON.stringify(updatedHistory));
      setTestHistory(updatedHistory);
      
      // Update user profile with new completion data
      await updateUserProfile(updatedHistory);
      
      // Navigate to recommendations page
      router.push({
        pathname: '/screens/recommendations',
        params: {
          assessmentType: selectedTest,
          result: JSON.stringify(result),
          aiAnalysis: JSON.stringify(aiAnalysis),
        },
      });
    } catch (error) {
      console.error('Error saving test results:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить результаты теста.');
    } finally {
      setShowAssessment(false);
    }
  };

  const tests = [
    { 
      id: 'PHQ9', 
      name: 'PHQ-9',
      description: 'Оценка депрессии и мониторинг изменений в психическом состоянии', 
      duration: '5 минут',
      icon: 'cloud-rain',
      category: 'Настроение',
      color: '#5E60CE'
    },
    { 
      id: 'GAD7', 
      name: 'GAD-7',
      description: 'Оценка уровня тревожности и выявление симптомов тревоги', 
      duration: '3 минуты',
      icon: 'brain',
      category: 'Тревога', 
      color: '#64DFDF'
    },
    { 
      id: 'DASS21', 
      name: 'DASS-21',
      description: 'Комплексная оценка депрессии, тревоги и стресса', 
      duration: '8 минут',
      icon: 'balance-scale',
      category: 'Комплексный', 
      color: '#FB8500'
    },
    { 
      id: 'BDI', 
      name: 'Шкала Бека',
      description: 'Подробная оценка депрессивных симптомов',
      duration: '10 минут', 
      icon: 'heartbeat',
      category: 'Настроение',
      color: '#EF476F'
    },
    { 
      id: 'BigFive', 
      name: 'Большая пятерка',
      description: 'Оценка основных черт личности и индивидуальных различий', 
      duration: '15 минут',
      icon: 'fingerprint',
      category: 'Личность',
      color: '#06D6A0'
    },
    { 
      id: 'EmotionalIntelligence', 
      name: 'Эмоциональный интеллект',
      description: 'Оценка способности распознавать эмоции и управлять ими', 
      duration: '7 минут',
      icon: 'smile',
      category: 'Эмоции',
      color: '#9381FF'
    },
    { 
      id: 'Resilience', 
      name: 'Шкала устойчивости',
      description: 'Оценка психологической стойкости и адаптивности', 
      duration: '6 минут',
      icon: 'shield-alt',
      category: 'Стрессоустойчивость',
      color: '#4CC9F0'
    }
  ];

  const testCategories = [
    { id: 'all', name: 'Все', icon: 'list', color: '#4361ee' },
    { id: 'mood', name: 'Настроение', icon: 'cloud-rain', color: '#5E60CE' },
    { id: 'anxiety', name: 'Тревога', icon: 'brain', color: '#64DFDF' },
    { id: 'personality', name: 'Личность', icon: 'fingerprint', color: '#06D6A0' }
  ];

  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTests = tests.filter(test => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'mood' && (test.category === 'Настроение')) return true;
    if (activeCategory === 'anxiety' && test.category === 'Тревога') return true;
    if (activeCategory === 'personality' && (test.category === 'Личность' || test.category === 'Эмоции')) return true;
    return false;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.colors.background === '#000000' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Психологические тесты</Text>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => router.push('/screens/test-history')}
        >
          <FontAwesome5 name="history" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Прогресс тестирования</Text>
          <Text style={styles.progressValue}>
            {Object.keys(testHistory).filter(key => testHistory[key] && testHistory[key].length > 0).length} / {tests.length}
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${(Object.keys(testHistory).filter(key => 
                  testHistory[key] && testHistory[key].length > 0).length / tests.length) * 100}%` 
              }
            ]} 
          />
        </View>
        
        {Object.keys(testHistory).length > 0 && (() => {
          let lastTestInfo = { type: '', date: new Date(0) };
          
          // Find the most recent test
          for (const type of Object.keys(testHistory)) {
            const testArray = testHistory[type];
            if (!testArray || testArray.length === 0) continue;
            
            const lastDate = new Date(testArray[testArray.length - 1].testDate);
            if (lastDate > lastTestInfo.date) {
              lastTestInfo = { type, date: lastDate };
            }
          }
          
          if (lastTestInfo.type) {
            const testName = tests.find(t => t.id === lastTestInfo.type)?.name || lastTestInfo.type;
            return (
              <Text style={styles.lastTestInfo}>
                Последний тест: {testName} ({lastTestInfo.date.toLocaleDateString('ru-RU')})
              </Text>
            );
          }
          return null;
        })()}
      </View>
      
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <FontAwesome5 name="info-circle" size={24} color="#fff" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Что дают тесты?</Text>
          <Text style={styles.infoDescription}>
            Психологические тесты помогают лучше понять себя, отслеживать свое эмоциональное состояние 
            и получать персонализированные рекомендации. Проходите тесты регулярно для большей эффективности.
          </Text>
        </View>
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContent}>
          {testCategories.map((category) => (
            <TouchableOpacity 
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.activeCategoryButton,
                { borderColor: activeCategory === category.id ? category.color : theme.colors.border }
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <FontAwesome5 
                name={category.icon} 
                size={12} 
                color={activeCategory === category.id ? '#fff' : category.color} 
                style={{marginRight: 4}} 
              />
              <Text 
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                  { color: activeCategory === category.id ? '#fff' : theme.colors.text }
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Загрузка тестов...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredTests.map((test) => (
            <TestCard
              key={test.id}
              id={test.id}
              name={test.name}
              description={test.description}
              duration={test.duration}
              icon={test.icon}
              category={test.category}
              color={test.color}
              onPress={() => handleTestStart(test.id as AssessmentType)}
              lastCompleted={getLastCompletedDate(test.id)}
              disabled={!canRetakeTest(test.id)}
            />
          ))}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {showAssessment && selectedTest && (
        <ClinicalAssessmentScreen
          visible={showAssessment}
          onClose={() => setShowAssessment(false)}
          assessmentType={selectedTest}
          onComplete={handleTestCompletion}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#4361ee',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 36,
  },
  filtersContainer: {
    paddingVertical: 8,
  },
  categoriesScrollContent: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 3,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCategoryButton: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
  },
  testCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  testCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testDuration: {
    fontSize: 12,
    color: '#777',
  },
  categoryTag: {
    fontSize: 12,
    color: '#777',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  testDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  lastCompletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastCompletedText: {
    fontSize: 12,
    color: '#777',
  },
  completedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  completedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4361ee',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4361ee',
    borderRadius: 4,
  },
  lastTestInfo: {
    fontSize: 12,
    color: '#666',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  disabledText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 50,
  }
});

export default TestsScreen;
