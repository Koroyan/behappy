import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PsychologicalAnalysisEngine, AIAnalysis } from '@/services/psychAnalysis';

const { width } = Dimensions.get('window');

interface ProfessionalDashboardProps {
  visible: boolean;
  onClose: () => void;
  patientId?: string;
}

export default function ProfessionalDashboard({ 
  visible, 
  onClose, 
  patientId = 'current' 
}: ProfessionalDashboardProps) {
  const { theme, isDark } = useTheme();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (visible) {
      authenticateAndLoadData();
    }
  }, [visible]);

  const authenticateAndLoadData = async () => {
    // Simple authentication check - in real app this would be proper auth
    Alert.alert(
      'Профессиональный доступ',
      'Введите код доступа специалиста',
      [
        {
          text: 'Отмена',
          onPress: onClose,
          style: 'cancel',
        },
        {
          text: 'Войти',
          onPress: async () => {
            // In real app, verify credentials here
            setAuthenticated(true);
            await loadFullAnalysis();
          },
        },
      ]
    );
  };

  const loadFullAnalysis = async () => {
    setLoading(true);
    try {
      const aiAnalysisResult = await PsychologicalAnalysisEngine.analyzeMoodData();
      setAiAnalysis(aiAnalysisResult);
    } catch (error) {
      console.error('Error loading professional analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#DC143C';
      case 'high': return '#FF3B30';
      case 'medium': return '#FFA500';
      default: return '#4BB543';
    }
  };

  const getRiskText = (level: string) => {
    switch (level) {
      case 'critical': return 'КРИТИЧЕСКИЙ РИСК';
      case 'high': return 'Высокий риск';
      case 'medium': return 'Средний риск';
      default: return 'Низкий риск';
    }
  };

  const renderCriticalAlerts = () => {
    if (!aiAnalysis) return null;

    const criticalFactors = [];
    if (aiAnalysis.riskFactors.suicidalIdeationRisk) {
      criticalFactors.push('🚨 РИСК СУИЦИДАЛЬНЫХ МЫСЛЕЙ');
    }
    if (aiAnalysis.riskFactors.severeDepressionRisk) {
      criticalFactors.push('⚠️ Тяжелая депрессия');
    }

    if (criticalFactors.length === 0) return null;

    return (
      <View style={[styles.criticalCard, { backgroundColor: '#DC143C10', borderColor: '#DC143C' }]}>
        <View style={styles.criticalHeader}>
          <FontAwesome5 name="exclamation-triangle" size={20} color="#DC143C" />
          <Text style={[styles.criticalTitle, { color: '#DC143C' }]}>
            КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ
          </Text>
        </View>
        
        {criticalFactors.map((factor, index) => (
          <Text key={index} style={[styles.criticalText, { color: '#DC143C' }]}>
            {factor}
          </Text>
        ))}
        
        <Text style={[styles.recommendationText, { color: '#DC143C', fontWeight: 'bold' }]}>
          ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ВМЕШАТЕЛЬСТВО
        </Text>
      </View>
    );
  };

  const renderDetailedRiskFactors = () => {
    if (!aiAnalysis) return null;

    return (
      <View style={[styles.riskCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.riskHeader}>
          <FontAwesome5 name="shield-alt" size={20} color={theme.colors.accent} />
          <Text style={[styles.riskTitle, { color: theme.colors.text }]}>
            Детальная оценка рисков
          </Text>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor(aiAnalysis.riskLevel) }]}>
            <Text style={styles.riskBadgeText}>{getRiskText(aiAnalysis.riskLevel)}</Text>
          </View>
        </View>

        <View style={styles.riskFactorsGrid}>
          {Object.entries(aiAnalysis.riskFactors).map(([key, value]) => {
            if (!value) return null;
            
            const factorInfo = {
              severeDepressionRisk: { 
                label: 'Тяжелая депрессия', 
                icon: 'sad-tear', 
                color: '#DC143C',
                severity: 'critical'
              },
              suicidalIdeationRisk: { 
                label: 'Суицидальные мысли', 
                icon: 'skull-crossbones', 
                color: '#8B0000',
                severity: 'critical'
              },
              anxietyDisorderRisk: { 
                label: 'Тревожное расстройство', 
                icon: 'exclamation-triangle', 
                color: '#FF3B30',
                severity: 'high'
              },
              bipolarRisk: { 
                label: 'Биполярные тенденции', 
                icon: 'chart-line', 
                color: '#9B59B6',
                severity: 'medium'
              },
              sleepDisorderRisk: { 
                label: 'Нарушения сна', 
                icon: 'bed', 
                color: '#3498DB',
                severity: 'medium'
              },
              chronicStressRisk: { 
                label: 'Хронический стресс', 
                icon: 'fire', 
                color: '#E67E22',
                severity: 'medium'
              },
            };

            const info = factorInfo[key as keyof typeof factorInfo];
            if (!info) return null;

            return (
              <View 
                key={key} 
                style={[
                  styles.riskFactorItem, 
                  { 
                    borderLeftColor: info.color,
                    backgroundColor: info.severity === 'critical' ? `${info.color}10` : 'transparent'
                  }
                ]}
              >
                <FontAwesome5 name={info.icon} size={16} color={info.color} />
                <Text style={[styles.riskFactorText, { color: theme.colors.text }]}>
                  {info.label}
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: info.color }]}>
                  <Text style={styles.severityText}>
                    {info.severity === 'critical' ? 'КРИТ.' : 
                     info.severity === 'high' ? 'ВЫС.' : 'СРЕД.'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderProfessionalRecommendations = () => {
    if (!aiAnalysis) return null;

    const professionalActions = [
      ...aiAnalysis.urgentActions,
      ...(aiAnalysis.predictiveInsights.interventionNeeded ? ['Требуется активное вмешательство'] : []),
      ...(aiAnalysis.predictiveInsights.specialistReferral ? ['Направление к узкому специалисту'] : []),
    ];

    return (
      <View style={[styles.recommendationsCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.recommendationsHeader}>
          <FontAwesome5 name="user-md" size={20} color={theme.colors.accent} />
          <Text style={[styles.recommendationsTitle, { color: theme.colors.text }]}>
            Профессиональные рекомендации
          </Text>
        </View>

        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
          Терапевтические вмешательства:
        </Text>
        {aiAnalysis.recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <FontAwesome5 name="stethoscope" size={12} color="#2196F3" />
            <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>
              {rec}
            </Text>
          </View>
        ))}

        {professionalActions.length > 0 && (
          <>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>
              Срочные действия:
            </Text>
            {professionalActions.map((action, index) => (
              <View key={index} style={styles.urgentRecommendationItem}>
                <FontAwesome5 name="exclamation" size={12} color="#FF3B30" />
                <Text style={[styles.urgentRecommendationText, { color: '#FF3B30' }]}>
                  {action}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderTrendAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <View style={[styles.trendsCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.trendsHeader}>
          <FontAwesome5 name="chart-line" size={20} color={theme.colors.accent} />
          <Text style={[styles.trendsTitle, { color: theme.colors.text }]}>
            Клинический анализ трендов
          </Text>
        </View>

        <View style={styles.trendsGrid}>
          {Object.entries(aiAnalysis.trends).map(([key, trend]) => {
            const trendInfo = {
              moodTrend: { label: 'Настроение', icon: 'smile' },
              stressTrend: { label: 'Стресс', icon: 'exclamation-triangle' },
              anxietyTrend: { label: 'Тревожность', icon: 'heart' },
              overallTrend: { label: 'Общее состояние', icon: 'chart-bar' },
            };

            const info = trendInfo[key as keyof typeof trendInfo];
            if (!info) return null;

            const trendColor = trend === 'improving' ? '#4BB543' : 
                             trend === 'declining' ? '#FF3B30' : '#FFA500';

            return (
              <View key={key} style={styles.trendItem}>
                <FontAwesome5 name={info.icon} size={16} color={trendColor} />
                <Text style={[styles.trendLabel, { color: theme.colors.textSecondary }]}>
                  {info.label}
                </Text>
                <Text style={[styles.trendValue, { color: trendColor }]}>
                  {trend === 'improving' ? 'Улучшение' : 
                   trend === 'declining' ? 'Ухудшение' : 'Стабильно'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPredictiveAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <View style={[styles.predictiveCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.predictiveHeader}>
          <FontAwesome5 name="crystal-ball" size={20} color={theme.colors.accent} />
          <Text style={[styles.predictiveTitle, { color: theme.colors.text }]}>
            Прогностический анализ
          </Text>
        </View>

        <View style={styles.predictiveContent}>
          <View style={styles.predictiveMetric}>
            <Text style={[styles.predictiveLabel, { color: theme.colors.textSecondary }]}>
              Прогноз риска (следующая неделя):
            </Text>
            <Text style={[
              styles.predictiveValue, 
              { color: getRiskColor(aiAnalysis.predictiveInsights.nextWeekRisk) }
            ]}>
              {aiAnalysis.predictiveInsights.nextWeekRisk.toUpperCase()}
            </Text>
          </View>

          <View style={styles.interventionIndicators}>
            <View style={[
              styles.interventionItem,
              { 
                backgroundColor: aiAnalysis.predictiveInsights.interventionNeeded ? '#FFA50020' : '#4BB54320',
                borderColor: aiAnalysis.predictiveInsights.interventionNeeded ? '#FFA500' : '#4BB543'
              }
            ]}>
              <FontAwesome5 
                name={aiAnalysis.predictiveInsights.interventionNeeded ? "exclamation-triangle" : "check-circle"} 
                size={16} 
                color={aiAnalysis.predictiveInsights.interventionNeeded ? '#FFA500' : '#4BB543'} 
              />
              <Text style={[
                styles.interventionText, 
                { color: theme.colors.textSecondary }
              ]}>
                Вмешательство {aiAnalysis.predictiveInsights.interventionNeeded ? 'ТРЕБУЕТСЯ' : 'не требуется'}
              </Text>
            </View>

            <View style={[
              styles.interventionItem,
              { 
                backgroundColor: aiAnalysis.predictiveInsights.specialistReferral ? '#2196F320' : '#4BB54320',
                borderColor: aiAnalysis.predictiveInsights.specialistReferral ? '#2196F3' : '#4BB543'
              }
            ]}>
              <FontAwesome5 
                name={aiAnalysis.predictiveInsights.specialistReferral ? "user-md" : "check-circle"} 
                size={16} 
                color={aiAnalysis.predictiveInsights.specialistReferral ? '#2196F3' : '#4BB543'} 
              />
              <Text style={[
                styles.interventionText, 
                { color: theme.colors.textSecondary }
              ]}>
                Специалист {aiAnalysis.predictiveInsights.specialistReferral ? 'РЕКОМЕНДУЕТСЯ' : 'не требуется'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  const styles = StyleSheet.create({
    authContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    authText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    criticalCard: {
      padding: 16,
      borderRadius: 12,
      marginVertical: 16,
      borderWidth: 2,
    },
    criticalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    criticalTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    criticalText: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    riskCard: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    riskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    riskTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    riskBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    riskBadgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    riskFactorsGrid: {
      gap: 8,
    },
    riskFactorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderLeftWidth: 4,
      borderRadius: 8,
    },
    riskFactorText: {
      fontSize: 14,
      marginLeft: 12,
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    severityText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    recommendationsCard: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    recommendationsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    recommendationsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    sectionSubtitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    recommendationText: {
      fontSize: 13,
      lineHeight: 18,
      marginLeft: 8,
      flex: 1,
    },
    urgentRecommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      backgroundColor: '#FF3B3010',
      padding: 8,
      borderRadius: 6,
    },
    urgentRecommendationText: {
      fontSize: 13,
      lineHeight: 18,
      marginLeft: 8,
      flex: 1,
      fontWeight: '500',
    },
    trendsCard: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    trendsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    trendsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    trendsGrid: {
      gap: 12,
    },
    trendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
    },
    trendLabel: {
      fontSize: 14,
      marginLeft: 12,
      flex: 1,
    },
    trendValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    predictiveCard: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    predictiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    predictiveTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    predictiveContent: {
      gap: 16,
    },
    predictiveMetric: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
    },
    predictiveLabel: {
      fontSize: 14,
    },
    predictiveValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    interventionIndicators: {
      gap: 8,
    },
    interventionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    interventionText: {
      fontSize: 14,
      marginLeft: 12,
      fontWeight: '500',
    },
  });

  if (!authenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профессиональная панель</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome5 name="times" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderCriticalAlerts()}
        {renderDetailedRiskFactors()}
        {renderTrendAnalysis()}
        {renderProfessionalRecommendations()}
        {renderPredictiveAnalysis()}
      </ScrollView>
    </SafeAreaView>
  );
}
