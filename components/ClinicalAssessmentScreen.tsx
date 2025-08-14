import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ClinicalAssessmentEngine, UserProfile } from '@/services/clinicalAssessment';
import { ClinicalQuestionsRU } from '@/services/clinical-questions-ru';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { BlurView } from 'expo-blur';

type AssessmentType = 'PHQ9' | 'GAD7' | 'DASS21' | 'BigFive' | 'BDI' | 'EmotionalIntelligence' | 'Resilience';

interface QuestionnaireProps {
  visible: boolean;
  onClose: () => void;
  assessmentType: AssessmentType;
  onComplete?: (result: any, aiAnalysis: any) => void;
}

export default function ClinicalAssessmentScreen({ visible, onClose, assessmentType, onComplete }: QuestionnaireProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<any>({});
  const [aiRecommendations, setAiRecommendations] = useState<string>('');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (visible) {
      const data = getAssessmentData(assessmentType);
      setAssessmentData(data);
      resetState();
    }
  }, [assessmentType, visible]);

  const resetState = () => {
    setIsStarted(false);
    setCurrentQuestion(0);
    setResponses({});
    setResult(null);
    setAiRecommendations('');
    setLoadingRecommendations(false);
  };

  const getAssessmentData = (type: AssessmentType) => {
    switch (type) {
      case 'PHQ9':
        return {
          title: 'PHQ-9: Шкала депрессии',
          description: 'Этот тест помогает оценить уровень депрессии за последние 2 недели и выявить симптомы, которые могут требовать внимания.',
          instructions: 'Как часто за последние 2 недели Вас беспокоили перечисленные ниже проблемы? Выберите наиболее подходящий вариант ответа для каждого вопроса.',
          questions: ClinicalQuestionsRU.PHQ9.questions,
          options: ClinicalQuestionsRU.PHQ9.options.map((label: string, value: number) => ({ value, label })),
          calculateScore: ClinicalAssessmentEngine.calculatePHQ9,
          color: '#5E60CE',
          icon: 'cloud-rain'
        };
      case 'GAD7':
        return {
          title: 'GAD-7: Шкала тревожности',
          description: 'Этот тест оценивает симптомы генерализованного тревожного расстройства за последние 2 недели и помогает определить интенсивность беспокойства.',
          instructions: 'Как часто за последние 2 недели Вас беспокоили следующие проблемы? Отметьте, насколько часто Вы испытывали каждый симптом.',
          questions: ClinicalQuestionsRU.GAD7.questions,
          options: ClinicalQuestionsRU.GAD7.options.map((label: string, value: number) => ({ value, label })),
          calculateScore: ClinicalAssessmentEngine.calculateGAD7,
          color: '#64DFDF',
          icon: 'brain'
        };
      case 'DASS21':
        return {
          title: 'DASS-21: Шкала депрессии, тревоги и стресса',
          description: 'Этот тест измеряет три связанных негативных эмоциональных состояния: депрессию, тревогу и стресс.',
          instructions: 'Пожалуйста, прочитайте каждое утверждение и выберите цифру (0, 1, 2 или 3), которая показывает, насколько это утверждение применимо к Вам за последнюю неделю.',
          questions: ClinicalQuestionsRU.DASS21.questions,
          options: ClinicalQuestionsRU.DASS21.options.map((label, value) => ({ value, label })),
          calculateScore: ClinicalAssessmentEngine.calculateDASS21,
          color: '#FB8500',
          icon: 'balance-scale'
        };
      case 'BigFive':
        return {
          title: 'Большая пятерка личностных черт',
          description: 'Этот тест оценивает пять основных измерений личности: открытость опыту, добросовестность, экстраверсию, доброжелательность и нейротизм.',
          instructions: 'Оцените, насколько точно каждое утверждение описывает Вас. Будьте честны - здесь нет правильных или неправильных ответов.',
          questions: ClinicalQuestionsRU.BigFive.questions,
          options: [
            { value: 1, label: 'Полностью не согласен' },
            { value: 2, label: 'Скорее не согласен' },
            { value: 3, label: 'Нейтрально' },
            { value: 4, label: 'Скорее согласен' },
            { value: 5, label: 'Полностью согласен' },
          ],
          calculateScore: ClinicalAssessmentEngine.calculateBigFive,
          color: '#06D6A0',
          icon: 'fingerprint'
        };
      case 'BDI':
        return {
          title: 'Шкала депрессии Бека (BDI-II)',
          description: 'Этот тест является одним из наиболее широко используемых инструментов для измерения тяжести депрессии.',
          instructions: 'В каждой группе утверждений внимательно прочитайте все варианты и выберите один, который лучше всего описывает Ваше состояние за последние две недели, включая сегодняшний день.',
          questions: ClinicalQuestionsRU.BDI.questions.map((q: any) => q.question),
          options: ClinicalQuestionsRU.BDI.questions[0].options.map((_: any, index: number) => ({ 
            value: index, 
            label: '...' // Actual options will be shown per question
          })),
          calculateScore: ClinicalAssessmentEngine.calculateBDI,
          color: '#EF476F',
          icon: 'heartbeat',
          specialFormat: true
        };
      case 'EmotionalIntelligence':
        return {
          title: 'Шкала эмоционального интеллекта',
          description: 'Этот тест оценивает вашу способность понимать, использовать и управлять своими эмоциями, а также распознавать эмоции других людей.',
          instructions: 'Оцените, насколько каждое утверждение соответствует Вашему обычному поведению и мыслям. Нет правильных или неправильных ответов.',
          questions: ClinicalQuestionsRU.EmotionalIntelligence.questions,
          options: [
            { value: 1, label: 'Совершенно не согласен' },
            { value: 2, label: 'Скорее не согласен' },
            { value: 3, label: 'Нейтрально' },
            { value: 4, label: 'Скорее согласен' },
            { value: 5, label: 'Полностью согласен' },
          ],
          calculateScore: ClinicalAssessmentEngine.calculateEmotionalIntelligence,
          color: '#9381FF',
          icon: 'smile'
        };
      case 'Resilience':
        return {
          title: 'Шкала психологической устойчивости',
          description: 'Этот тест измеряет вашу способность справляться с трудностями, адаптироваться к изменениям и восстанавливаться после стрессовых ситуаций.',
          instructions: 'Укажите, насколько вы согласны с каждым утверждением относительно вашей жизни за последний месяц.',
          questions: ClinicalQuestionsRU.Resilience.questions,
          options: [
            { value: 0, label: 'Совсем не верно' },
            { value: 1, label: 'Редко верно' },
            { value: 2, label: 'Иногда верно' },
            { value: 3, label: 'Часто верно' },
            { value: 4, label: 'Верно почти всегда' },
          ],
          calculateScore: ClinicalAssessmentEngine.calculateResilience,
          color: '#4CC9F0',
          icon: 'shield-alt'
        };
      default:
        return { title: 'Неизвестный тест', description: '', instructions: '', questions: [], options: [] };
    }
  };

  const handleResponse = (questionIndex: number, score: number, optionIndex: number) => {
    setSelectedOptionIndex(optionIndex);
    
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Update response
      setResponses((prev) => ({ ...prev, [`q${questionIndex + 1}`]: score }));
      
      // Automatically go to next question after a short delay
      setTimeout(() => {
        // Check if this is the last question - more explicit condition checking
        const totalQuestions = assessmentData.questions?.length || 0;
        const isLastQuestion = totalQuestions > 0 && questionIndex >= totalQuestions - 1;
          
        if (!isLastQuestion) {
          setCurrentQuestion((prev) => prev + 1);
          setSelectedOptionIndex(null);
          
          // Calculate new progress
          const newProgress = (totalQuestions > 1) ? 
            ((currentQuestion + 1) / (totalQuestions - 1)) : 0;
          setProgress(newProgress);
          
          // Fade in animation for next question
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          // We're at the last question, explicitly complete the assessment
          console.log(`Completing assessment for ${assessmentType}, question index: ${questionIndex}, total questions: ${totalQuestions}`);
          completeAssessment();
        }
      }, 500);
    });
  };

  const handleNext = () => {
    // If no option selected, prompt user
    if (selectedOptionIndex === null && assessmentData.questions && assessmentData.questions.length > 0 && currentQuestion < assessmentData.questions.length) {
      Alert.alert('Пожалуйста, выберите ответ', 'Необходимо выбрать один из вариантов для продолжения теста.');
      return;
    }
    
    // Check if this is the last question
    const isLastQuestion = assessmentData.questions && 
                          assessmentData.questions.length > 0 && 
                          currentQuestion >= assessmentData.questions.length - 1;
    
    if (!isLastQuestion) {
      // Animate transition to next question
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedOptionIndex(null);
        
        // Calculate new progress
        const newProgress = (assessmentData.questions && assessmentData.questions.length > 1) ? 
          ((currentQuestion + 1) / (assessmentData.questions.length - 1)) : 0;
        setProgress(newProgress);
        
        // Fade in animation for next question
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // We're at the last question, complete the assessment
      console.log(`handleNext: Completing assessment at last question for ${assessmentType}`);
      completeAssessment();
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestion((prev) => prev - 1);
        setSelectedOptionIndex(null);
        
        // Calculate new progress
        const newProgress = (assessmentData.questions && assessmentData.questions.length > 1) ? 
          ((currentQuestion - 1) / (assessmentData.questions.length - 1)) : 0;
        setProgress(Math.max(0, newProgress));
        
        // Fade in animation for previous question
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const completeAssessment = async () => {
    setLoading(true);
    
    console.log(`Starting completeAssessment for ${assessmentType} with ${Object.keys(responses).length} responses`);
    
    try {
      // Ensure we have all responses for Big Five test
      if (assessmentType === 'BigFive' && assessmentData.questions) {
        const totalQuestions = assessmentData.questions.length;
        console.log(`BigFive test: ${Object.keys(responses).length}/${totalQuestions} questions answered`);
      }
      
      // Calculate assessment score
      const assessment = assessmentData.calculateScore(responses);
      assessment.testDate = new Date().toISOString();
      assessment.testType = assessmentType;

      // Get existing profile data
      const existingProfileRaw = await AsyncStorage.getItem('userProfile');
      const existingProfile: UserProfile | undefined = existingProfileRaw ? JSON.parse(existingProfileRaw) : { 
        personalInfo: {},
        medicalInfo: {},
        wellnessInfo: {},
        assessmentHistory: { completedTests: [], totalTests: 0, completionPercentage: 0 }
      };

      // Generate AI analysis based on test results and user profile
      const aiAnalysis = await ClinicalAssessmentEngine.generateUserProfileAnalysis(assessmentType, assessment, existingProfile);

      // Update the completed tests list
      const completedTests = existingProfile?.assessmentHistory?.completedTests || [];
      if (!completedTests.includes(assessmentType)) {
        completedTests.push(assessmentType);
      }
      
      // Update user profile with test completion and time
      const updatedProfile = {
        ...existingProfile,
        assessmentHistory: {
          ...(existingProfile?.assessmentHistory || {}),
          lastTestDate: new Date().toISOString(),
          lastTestType: assessmentType,
          completedTests,
          totalTests: 7, // Total number of available tests
          completionPercentage: Math.round((completedTests.length / 7) * 100)
        },
        // Store the latest results for each test type
        latestAssessments: {
          ...(existingProfile?.latestAssessments || {}),
          [assessmentType]: {
            result: assessment,
            date: new Date().toISOString(),
            analysis: aiAnalysis
          }
        }
      };

      // Save updated profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));

      // Generate personalized recommendations based on test results
      const recommendations = await ClinicalAssessmentEngine.generateAIRecommendations(assessmentType, assessment);
      
      setResult(assessment);
      setAiRecommendations(recommendations);

      // Call completion callback if provided
      if (onComplete) onComplete(assessment, aiAnalysis);

      // Navigate to recommendations page with result data
      // Create a combined result object with all data needed
      const resultWithMetadata = {
        ...assessment,
        type: assessmentType,
        aiAnalysis,
        recommendations
      };
      
      // Use onComplete callback or navigation
      if (onComplete) {
        // Let the parent handle navigation
        onComplete(assessment, aiAnalysis);
      } else {
        // Direct navigation
        navigation.navigate('Recommendations', { 
          result: resultWithMetadata
        });
      }
    } catch (error) {
      console.error('Error completing assessment:', error);
      Alert.alert('Ошибка', 'Не удалось завершить тест. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={true}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.colors.background === '#000000' || theme.colors.background === '#121212' ? "light-content" : "dark-content"} />
        
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{assessmentData.title}</Text>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: `${theme.colors.border}50` }]} 
            onPress={onClose}
          >
            <FontAwesome5 name="times" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={assessmentData.color || theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Анализ результатов...
            </Text>
          </View>
        ) : (
          <>
            {!isStarted ? (
              <ScrollView contentContainerStyle={styles.introScrollContainer}>
                <View style={styles.introContainer}>
                  {assessmentData.icon && (
                    <View style={[styles.iconContainer, { backgroundColor: `${assessmentData.color}20` }]}>
                      <FontAwesome5 
                        name={assessmentData.icon} 
                        size={32} 
                        color={assessmentData.color || theme.colors.primary} 
                      />
                    </View>
                  )}
                  
                  <Text style={[styles.description, { color: theme.colors.text }]}>
                    {assessmentData.description}
                  </Text>
                  
                  <View style={[styles.instructionsCard, { backgroundColor: `${theme.colors.card}` }]}>
                    <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
                      Как проходить тест:
                    </Text>
                    <Text style={[styles.instructions, { color: theme.colors.text }]}>
                      {assessmentData.instructions}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <FontAwesome5 name="clock" size={16} color={assessmentData.color || theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                      Время прохождения: {(assessmentData.questions && assessmentData.questions.length) ? 
                        (assessmentData.questions.length < 10 ? '3-5 минут' : 
                         assessmentData.questions.length < 20 ? '5-10 минут' : '10-15 минут')
                        : '5-10 минут'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <FontAwesome5 name="question-circle" size={16} color={assessmentData.color || theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                      Количество вопросов: {assessmentData.questions && assessmentData.questions.length ? assessmentData.questions.length : 0}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <FontAwesome5 name="shield-alt" size={16} color={assessmentData.color || theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                      Все результаты конфиденциальны и сохраняются только на вашем устройстве.
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.startButton, { backgroundColor: assessmentData.color || theme.colors.primary }]}
                    onPress={() => setIsStarted(true)}
                  >
                    <Text style={styles.startButtonText}>Начать тест</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.testContainer}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${(assessmentData.questions && assessmentData.questions.length > 1) ? 
                          (currentQuestion / (assessmentData.questions.length - 1)) * 100 : 0}%`,
                          backgroundColor: assessmentData.color || theme.colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: theme.colors.text }]}>
                    {currentQuestion + 1} из {(assessmentData.questions && assessmentData.questions.length) ? assessmentData.questions.length : 0}
                  </Text>
                </View>
                
                <ScrollView contentContainerStyle={styles.content}>
                  <Animated.View 
                    style={[
                      styles.questionContainer,
                      { opacity: fadeAnim }
                    ]}
                  >
                    <Text style={[styles.questionNumber, { color: assessmentData.color || theme.colors.primary }]}>
                      Вопрос {currentQuestion + 1}
                    </Text>
                    
                    <Text style={[styles.questionText, { color: theme.colors.text }]}>
                      {assessmentData.questions[currentQuestion]}
                    </Text>
                    
                    {assessmentData.specialFormat && assessmentData.id === 'BDI' ? (
                      // Special formatting for BDI test with different options per question
                      ClinicalQuestionsRU.BDI.questions[currentQuestion].options.map((option: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionButton,
                            selectedOptionIndex === index && styles.optionButtonSelected,
                            { 
                              backgroundColor: selectedOptionIndex === index ? 
                                `${assessmentData.color}20` : theme.colors.card,
                              borderColor: selectedOptionIndex === index ? 
                                assessmentData.color : theme.colors.border
                            }
                          ]}
                          onPress={() => handleResponse(currentQuestion, index, index)}
                        >
                          <Text style={[
                            styles.optionText, 
                            selectedOptionIndex === index && styles.optionTextSelected,
                            { color: theme.colors.text }
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      // Standard options for most tests
                      assessmentData.options.map((option: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionButton,
                            selectedOptionIndex === index && styles.optionButtonSelected,
                            { 
                              backgroundColor: selectedOptionIndex === index ? 
                                `${assessmentData.color}20` : theme.colors.card,
                              borderColor: selectedOptionIndex === index ? 
                                assessmentData.color : theme.colors.border
                            }
                          ]}
                          onPress={() => handleResponse(currentQuestion, option.value, index)}
                        >
                          <Text style={[
                            styles.optionText, 
                            selectedOptionIndex === index && styles.optionTextSelected,
                            { color: theme.colors.text }
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </Animated.View>
                </ScrollView>
                
                <View style={styles.buttonsContainer}>
                  {currentQuestion > 0 && (
                    <TouchableOpacity 
                      style={[styles.navButton, styles.prevButton, { borderColor: theme.colors.border }]} 
                      onPress={handlePrevious}
                    >
                      <FontAwesome5 name="chevron-left" size={18} color={theme.colors.text} />
                      <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Назад</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(assessmentData.questions && assessmentData.questions.length > 0 && currentQuestion === assessmentData.questions.length - 1) && (
                    <TouchableOpacity 
                      style={[styles.navButton, styles.nextButton, { backgroundColor: assessmentData.color || theme.colors.primary }]} 
                      onPress={() => {
                        // Make sure the selected option is saved in responses before completing
                        if (selectedOptionIndex !== null) {
                          const score = assessmentData.options[selectedOptionIndex].value;
                          setResponses((prev) => ({ ...prev, [`q${currentQuestion + 1}`]: score }));
                        }
                        // Directly call completeAssessment
                        completeAssessment();
                      }}
                    >
                      <Text style={[styles.navButtonText, { color: '#fff' }]}>
                        Завершить
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  introScrollContainer: {
    flexGrow: 1,
  },
  introContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 30,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 15,
    color: '#777',
    lineHeight: 21,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  questionContainer: {
    padding: 20,
    paddingTop: 10,
    flex: 1,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionButtonSelected: {
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    minWidth: 100,
  },
  prevButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 10,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});
