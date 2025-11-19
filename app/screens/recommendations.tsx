import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ClinicalAssessmentEngine } from '@/services/clinicalAssessment';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Translations
const translations = {
  en: {
    title: 'Recommendations',
    backButton: 'Back',
    loading: 'Loading recommendations...',
    error: 'Error',
    errorLoading: 'Failed to load recommendations',
    noResults: 'No results found',
    tryAgain: 'Try Again',
    viewHistory: 'View History',
    score: 'Score',
    severity: 'Severity',
    recommendations: 'AI Recommendations',
  },
  ka: {
    title: 'რეკომენდაციები',
    backButton: 'უკან',
    loading: 'რეკომენდაციების ჩატვირთვა...',
    error: 'შეცდომა',
    errorLoading: 'რეკომენდაციების ჩატვირთვა ვერ მოხერხდა',
    noResults: 'შედეგები ვერ მოიძებნა',
    tryAgain: 'ხელახლა ცდა',
    viewHistory: 'ისტორიის ნახვა',
    score: 'ქულა',
    severity: 'სიმძიმე',
    recommendations: 'AI რეკომენდაციები',
  },
  ru: {
    title: 'Рекомендации',
    backButton: 'Назад',
    loading: 'Загрузка рекомендаций...',
    error: 'Ошибка',
    errorLoading: 'Не удалось загрузить рекомендации',
    noResults: 'Результаты не найдены',
    tryAgain: 'Попробовать снова',
    viewHistory: 'Посмотреть историю',
    score: 'Баллы',
    severity: 'Тяжесть',
    recommendations: 'AI рекомендации',
  }
};

const isDark = (theme: any) => theme.colors.background === '#000000' || theme.colors.background === '#1a1a1a';

export default function RecommendationsScreen() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  
  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      console.log('Loading recommendations, params:', params);
      
      // Get test result from params or latest assessment
      const assessmentType = params.assessmentType as string;
      const resultData = params.result ? JSON.parse(params.result as string) : null;
      
      if (resultData) {
        console.log('Found result data in params');
        setTestResult(resultData);
        
        // Generate AI recommendations if not already present
        if (resultData.aiRecommendations) {
          console.log('Using existing AI recommendations from result');
          setRecommendations(resultData.aiRecommendations);
        } else {
          console.log('Generating new AI recommendations');
          const aiRecommendations = await ClinicalAssessmentEngine.generateAIRecommendations(
            assessmentType, 
            resultData
          );
          setRecommendations(aiRecommendations);
          
          // Save the recommendations back to storage for future use
          try {
            const stored = await AsyncStorage.getItem('clinicalAssessments');
            if (stored) {
              const assessments = JSON.parse(stored);
              if (assessments[assessmentType]) {
                // Find the test and update it
                const testIndex = assessments[assessmentType].findIndex(
                  (test: any) => test.testDate === resultData.testDate
                );
                
                if (testIndex !== -1) {
                  assessments[assessmentType][testIndex].aiRecommendations = aiRecommendations;
                  await AsyncStorage.setItem('clinicalAssessments', JSON.stringify(assessments));
                  console.log('Saved AI recommendations back to storage');
                }
              }
            }
          } catch (storageError) {
            console.error('Error updating recommendations in storage:', storageError);
          }
        }
      } else {
        console.log('No result data in params, loading from storage');
        // Load latest assessment from storage
        const stored = await AsyncStorage.getItem('clinicalAssessments');
        if (stored) {
          const assessments = JSON.parse(stored);
          const latestAssessment = assessments[assessmentType]?.slice(-1)[0];
          if (latestAssessment) {
            console.log('Found latest assessment:', latestAssessment);
            setTestResult(latestAssessment);
            if (latestAssessment.aiRecommendations) {
              setRecommendations(latestAssessment.aiRecommendations);
            } else {
              console.log('Generating new AI recommendations for latest assessment');
              const aiRecommendations = await ClinicalAssessmentEngine.generateAIRecommendations(
                assessmentType, 
                latestAssessment
              );
              setRecommendations(aiRecommendations);
              
              // Save back to storage
              assessments[assessmentType][assessments[assessmentType].length - 1].aiRecommendations = aiRecommendations;
              await AsyncStorage.setItem('clinicalAssessments', JSON.stringify(assessments));
            }
          } else {
            console.log('No assessments found for type:', assessmentType);
            setRecommendations(t.noResults);
          }
        } else {
          console.log('No clinical assessments found in storage');
          setRecommendations(t.noResults);
        }
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations(t.errorLoading);
      Alert.alert(t.error, t.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const getTestTitle = (type: string) => {
    switch (type) {
      case 'PHQ9': return 'PHQ-9: Оценка депрессии';
      case 'GAD7': return 'GAD-7: Оценка тревожности';
      case 'DASS21': return 'DASS-21: Депрессия, тревога, стресс';
      case 'BigFive': return 'Большая пятерка личности';
      case 'BDI': return 'Шкала депрессии Бека';
      default: return 'Психологический тест';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'minimal':
      case 'low':
        return '#4CAF50';
      case 'mild':
      case 'medium':
        return '#FF9800';
      case 'moderate':
        return '#FF5722';
      case 'moderately_severe':
      case 'severe':
      case 'high':
        return '#F44336';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'minimal': return 'Минимальный уровень';
      case 'mild': return 'Легкий уровень';
      case 'moderate': return 'Умеренный уровень';
      case 'moderately_severe': return 'Умеренно-тяжелый уровень';
      case 'severe': return 'Тяжелый уровень';
      case 'low': return 'Низкий уровень';
      case 'medium': return 'Средний уровень';
      case 'high': return 'Высокий уровень';
      default: return severity || 'Не определено';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      marginRight: 16,
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    resultCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    testTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    scoreText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    severityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    severityText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    dateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    recommendationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    recommendationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    recommendationText: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 20,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    secondaryButton: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    historyButton: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.title}</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>
            {t.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {testResult && (
          <View style={styles.resultCard}>
            <Text style={styles.testTitle}>
              {getTestTitle(params.assessmentType as string)}
            </Text>
            
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>
                {t.score}: {testResult.totalScore || testResult.score || 'N/A'}
              </Text>
              
              {testResult.severity && (
                <View style={[
                  styles.severityBadge, 
                  { backgroundColor: getSeverityColor(testResult.severity) }
                ]}>
                  <Text style={styles.severityText}>
                    {getSeverityText(testResult.severity)}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.dateText}>
              {new Date(testResult.testDate || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>🤖 {t.recommendations}</Text>

          {Array.isArray(recommendations) ? (
            recommendations.map((rec: string, i: number) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text style={styles.recommendationText}>{`${i + 1}. ${rec}`}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.recommendationText}>{recommendations || t.loading}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => router.push('/screens/test-history')}
          >
            <FontAwesome5 name="history" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>{t.viewHistory}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="redo" size={18} color={theme.colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>{t.tryAgain}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
