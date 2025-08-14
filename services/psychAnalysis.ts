import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoodEntry {
  date: string;
  mood: number;
  stress: number;
  anxiety: number;
  energy: number;
  sleep: number;
  notes?: string;
  timestamp: string;
}

export interface RiskFactors {
  severeDepressionRisk: boolean;
  suicidalIdeationRisk: boolean;
  anxietyDisorderRisk: boolean;
  bipolarRisk: boolean;
  sleepDisorderRisk: boolean;
  chronicStressRisk: boolean;
}

export interface AIAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactors;
  recommendations: string[];
  urgentActions: string[];
  trends: {
    moodTrend: 'improving' | 'stable' | 'declining';
    stressTrend: 'improving' | 'stable' | 'declining';
    anxietyTrend: 'improving' | 'stable' | 'declining';
    overallTrend: 'improving' | 'stable' | 'declining';
  };
  predictiveInsights: {
    nextWeekRisk: 'low' | 'medium' | 'high';
    interventionNeeded: boolean;
    specialistReferral: boolean;
  };
}

export class PsychologicalAnalysisEngine {
  static async analyzeMoodData(): Promise<AIAnalysis> {
    try {
      const data = await AsyncStorage.getItem('moodTrackingData');
      const moodData: MoodEntry[] = data ? JSON.parse(data) : [];
      
      if (moodData.length < 3) {
        return this.getDefaultAnalysis();
      }

      const recentData = moodData.slice(-14); // Last 2 weeks
      const riskFactors = this.assessRiskFactors(recentData);
      const trends = this.analyzeTrends(moodData);
      const riskLevel = this.calculateOverallRisk(riskFactors, trends);
      const recommendations = this.generateRecommendations(riskFactors, trends);
      const urgentActions = this.generateUrgentActions(riskFactors);
      const predictiveInsights = this.generatePredictiveInsights(recentData, trends);

      return {
        riskLevel,
        riskFactors,
        recommendations,
        urgentActions,
        trends,
        predictiveInsights,
      };
    } catch (error) {
      console.error('Error analyzing mood data:', error);
      return this.getDefaultAnalysis();
    }
  }

  private static assessRiskFactors(data: MoodEntry[]): RiskFactors {
    const avgMood = data.reduce((sum, entry) => sum + entry.mood, 0) / data.length;
    const avgStress = data.reduce((sum, entry) => sum + entry.stress, 0) / data.length;
    const avgAnxiety = data.reduce((sum, entry) => sum + entry.anxiety, 0) / data.length;
    const avgSleep = data.reduce((sum, entry) => sum + entry.sleep, 0) / data.length;
    const avgEnergy = data.reduce((sum, entry) => sum + entry.energy, 0) / data.length;

    // Count consecutive bad days
    let consecutiveBadDays = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].mood <= 3) {
        consecutiveBadDays++;
      } else {
        break;
      }
    }

    // Check for mood volatility (potential bipolar indicator)
    const moodVariance = this.calculateVariance(data.map(d => d.mood));
    const highVolatility = moodVariance > 6;

    return {
      severeDepressionRisk: avgMood <= 3 || consecutiveBadDays >= 7,
      suicidalIdeationRisk: avgMood <= 2 && avgStress >= 8 && consecutiveBadDays >= 5,
      anxietyDisorderRisk: avgAnxiety >= 7 && avgStress >= 7,
      bipolarRisk: highVolatility && moodVariance > 8,
      sleepDisorderRisk: avgSleep <= 3,
      chronicStressRisk: avgStress >= 8 && data.filter(d => d.stress >= 8).length >= data.length * 0.7,
    };
  }

  private static analyzeTrends(data: MoodEntry[]): AIAnalysis['trends'] {
    if (data.length < 7) {
      return {
        moodTrend: 'stable',
        stressTrend: 'stable',
        anxietyTrend: 'stable',
        overallTrend: 'stable',
      };
    }

    const recentWeek = data.slice(-7);
    const previousWeek = data.slice(-14, -7);

    const getTrend = (recent: number[], previous: number[]): 'improving' | 'stable' | 'declining' => {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      const diff = recentAvg - previousAvg;

      if (Math.abs(diff) < 0.5) return 'stable';
      return diff > 0 ? 'improving' : 'declining';
    };

    const moodTrend = getTrend(
      recentWeek.map(d => d.mood),
      previousWeek.map(d => d.mood)
    );

    const stressTrend = getTrend(
      previousWeek.map(d => d.stress), // Inverted for stress (lower is better)
      recentWeek.map(d => d.stress)
    );

    const anxietyTrend = getTrend(
      previousWeek.map(d => d.anxiety), // Inverted for anxiety (lower is better)
      recentWeek.map(d => d.anxiety)
    );

    // Overall trend calculation
    const trendScores = {
      improving: 0,
      stable: 0,
      declining: 0,
    };

    [moodTrend, stressTrend, anxietyTrend].forEach(trend => {
      trendScores[trend]++;
    });

    const overallTrend = Object.keys(trendScores).reduce((a, b) =>
      trendScores[a as keyof typeof trendScores] > trendScores[b as keyof typeof trendScores] ? a : b
    ) as 'improving' | 'stable' | 'declining';

    return {
      moodTrend,
      stressTrend,
      anxietyTrend,
      overallTrend,
    };
  }

  private static calculateOverallRisk(
    riskFactors: RiskFactors,
    trends: AIAnalysis['trends']
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // High-priority risk factors
    if (riskFactors.suicidalIdeationRisk) riskScore += 10;
    if (riskFactors.severeDepressionRisk) riskScore += 6;
    if (riskFactors.bipolarRisk) riskScore += 4;
    if (riskFactors.anxietyDisorderRisk) riskScore += 3;
    if (riskFactors.chronicStressRisk) riskScore += 3;
    if (riskFactors.sleepDisorderRisk) riskScore += 2;

    // Trend modifiers
    if (trends.overallTrend === 'declining') riskScore += 2;
    if (trends.overallTrend === 'improving') riskScore -= 1;

    if (riskScore >= 10) return 'critical';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  private static generateRecommendations(
    riskFactors: RiskFactors,
    trends: AIAnalysis['trends']
  ): string[] {
    const recommendations: string[] = [];

    if (riskFactors.severeDepressionRisk) {
      recommendations.push('Рассмотрите консультацию с психиатром или психотерапевтом');
      recommendations.push('Попробуйте когнитивно-поведенческую терапию (КПТ)');
    }

    if (riskFactors.anxietyDisorderRisk) {
      recommendations.push('Практикуйте техники релаксации и дыхательные упражнения');
      recommendations.push('Рассмотрите терапию управления тревогой');
    }

    if (riskFactors.chronicStressRisk) {
      recommendations.push('Изучите техники управления стрессом');
      recommendations.push('Улучшите баланс работы и личной жизни');
    }

    if (riskFactors.sleepDisorderRisk) {
      recommendations.push('Улучшите гигиену сна: регулярный режим, темная комната');
      recommendations.push('Ограничьте экранное время перед сном');
    }

    if (riskFactors.bipolarRisk) {
      recommendations.push('Обратитесь к специалисту для оценки биполярного расстройства');
      recommendations.push('Ведите подробный дневник настроения');
    }

    if (trends.overallTrend === 'declining') {
      recommendations.push('Увеличьте социальную поддержку и общение');
      recommendations.push('Добавьте физические упражнения в ежедневную рутину');
    }

    if (recommendations.length === 0) {
      recommendations.push('Продолжайте поддерживать текущие здоровые привычки');
      recommendations.push('Рассмотрите профилактические практики mindfulness');
    }

    return recommendations;
  }

  private static generateUrgentActions(riskFactors: RiskFactors): string[] {
    const urgentActions: string[] = [];

    if (riskFactors.suicidalIdeationRisk) {
      urgentActions.push('НЕМЕДЛЕННО обратитесь к специалисту или на горячую линию');
      urgentActions.push('Обратитесь в службу экстренной психологической помощи');
      urgentActions.push('Не оставайтесь одни, обратитесь к близким');
    }

    if (riskFactors.severeDepressionRisk && !riskFactors.suicidalIdeationRisk) {
      urgentActions.push('Запишитесь на консультацию к специалисту в течение недели');
      urgentActions.push('Активируйте сеть поддержки - семья, друзья');
    }

    return urgentActions;
  }

  private static generatePredictiveInsights(
    recentData: MoodEntry[],
    trends: AIAnalysis['trends']
  ): AIAnalysis['predictiveInsights'] {
    const avgRecentMood = recentData.reduce((sum, d) => sum + d.mood, 0) / recentData.length;
    const avgRecentStress = recentData.reduce((sum, d) => sum + d.stress, 0) / recentData.length;

    let nextWeekRisk: 'low' | 'medium' | 'high' = 'low';

    if (trends.overallTrend === 'declining' && avgRecentMood <= 4) {
      nextWeekRisk = 'high';
    } else if (trends.overallTrend === 'declining' || avgRecentStress >= 7) {
      nextWeekRisk = 'medium';
    }

    const interventionNeeded = nextWeekRisk === 'high' || avgRecentMood <= 3;
    const specialistReferral = avgRecentMood <= 3 || avgRecentStress >= 8;

    return {
      nextWeekRisk,
      interventionNeeded,
      specialistReferral,
    };
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private static getDefaultAnalysis(): AIAnalysis {
    return {
      riskLevel: 'low',
      riskFactors: {
        severeDepressionRisk: false,
        suicidalIdeationRisk: false,
        anxietyDisorderRisk: false,
        bipolarRisk: false,
        sleepDisorderRisk: false,
        chronicStressRisk: false,
      },
      recommendations: [
        'Начните регулярно отслеживать свое настроение',
        'Практикуйте техники mindfulness',
      ],
      urgentActions: [],
      trends: {
        moodTrend: 'stable',
        stressTrend: 'stable',
        anxietyTrend: 'stable',
        overallTrend: 'stable',
      },
      predictiveInsights: {
        nextWeekRisk: 'low',
        interventionNeeded: false,
        specialistReferral: false,
      },
    };
  }
}
