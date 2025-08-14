import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestHistory {
  testType: string;
  results: any[];
}

export default function TestHistoryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('clinicalAssessments');
      if (stored) {
        const assessments = JSON.parse(stored);
        const history: TestHistory[] = [];
        
        Object.keys(assessments).forEach(testType => {
          if (assessments[testType] && assessments[testType].length > 0) {
            history.push({
              testType,
              results: assessments[testType].sort((a: any, b: any) => 
                new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
              )
            });
          }
        });
        
        setTestHistory(history);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю тестов');
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
      default: return type;
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
      case 'minimal': return 'Минимальный';
      case 'mild': return 'Легкий';
      case 'moderate': return 'Умеренный';
      case 'moderately_severe': return 'Умеренно-тяжелый';
      case 'severe': return 'Тяжелый';
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      default: return severity || 'Н/Д';
    }
  };

  const viewResult = (testType: string, result: any) => {
    router.push({
      pathname: '/screens/recommendations',
      params: {
        assessmentType: testType,
        result: JSON.stringify(result)
      }
    });
  };

  const deleteResult = async (testType: string, resultIndex: number) => {
    Alert.alert(
      'Удалить результат',
      'Вы уверены, что хотите удалить этот результат теста?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('clinicalAssessments');
              if (stored) {
                const assessments = JSON.parse(stored);
                if (assessments[testType]) {
                  assessments[testType].splice(resultIndex, 1);
                  if (assessments[testType].length === 0) {
                    delete assessments[testType];
                  }
                  await AsyncStorage.setItem('clinicalAssessments', JSON.stringify(assessments));
                  loadTestHistory();
                }
              }
            } catch (error) {
              console.error('Error deleting result:', error);
              Alert.alert('Ошибка', 'Не удалось удалить результат');
            }
          }
        }
      ]
    );
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
    testSection: {
      marginBottom: 24,
    },
    testSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    resultCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    resultDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    resultActions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },
    resultContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    scoreText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '600',
    },
    severityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
    },
    severityText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    emptyStateButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    emptyStateButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>История тестов</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Загружаем историю тестов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (testHistory.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>История тестов</Text>
        </View>
        
        <View style={styles.emptyState}>
          <FontAwesome5 
            name="clipboard-list" 
            size={64} 
            color={theme.colors.textSecondary} 
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateTitle}>Нет пройденных тестов</Text>
          <Text style={styles.emptyStateText}>
            Пройдите психологические тесты, чтобы отслеживать свое состояние и получать персональные рекомендации.
          </Text>
          
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => router.push('screens/tests')}
          >
            <Text style={styles.emptyStateButtonText}>Пройти тесты</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>История тестов</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {testHistory.map((test, testIndex) => (
          <View key={test.testType} style={styles.testSection}>
            <Text style={styles.testSectionTitle}>
              {getTestTitle(test.testType)}
            </Text>
            
            {test.results.map((result, resultIndex) => (
              <View 
                key={`${test.testType}-${resultIndex}-${result.testDate || Date.now()}`} 
                style={styles.resultCard}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultDate}>
                    {new Date(result.testDate || Date.now()).toLocaleDateString('ru-RU')}
                  </Text>
                  
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => viewResult(test.testType, result)}
                    >
                      <FontAwesome5 name="eye" size={16} color={theme.colors.accent} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteResult(test.testType, resultIndex)}
                    >
                      <FontAwesome5 name="trash" size={16} color={theme.colors.error || "#FF0000"} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.resultContent}>
                  <Text style={styles.scoreText}>
                    Результат: {result.totalScore || result.score || 'Н/Д'} баллов
                  </Text>
                  
                  {result.severity && (
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(result.severity) }
                    ]}>
                      <Text style={styles.severityText}>
                        {getSeverityText(result.severity)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
