// Standardized Clinical Assessment Tools
// სტანდარტიზებული კლინიკური შეფასების ინსტრუმენტები
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PHQ9Assessment {
  questions: {
    q1_anhedonia: 0 | 1 | 2 | 3; // სიამოვნების დაკარგვა
    q2_depressed_mood: 0 | 1 | 2 | 3; // მუდმივი უხასიათობა
    q3_sleep_problems: 0 | 1 | 2 | 3; // ძილის პრობლემები
    q4_fatigue: 0 | 1 | 2 | 3; // დაღლილობა
    q5_appetite: 0 | 1 | 2 | 3; // მადის შეცვლა
    q6_worthlessness: 0 | 1 | 2 | 3; // უღირსობის განცდა
    q7_concentration: 0 | 1 | 2 | 3; // კონცენტრაციის პრობლემები
    q8_psychomotor: 0 | 1 | 2 | 3; // მოძრაობის ცვლილება
    q9_suicidal: 0 | 1 | 2 | 3; // სუიციდალური ფიქრები
  };
  totalScore: number; // 0-27
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  recommendedAction: string;
  testDate: string;
}

export interface BDIAssessment {
  questions: {
    q1_sadness: 0 | 1 | 2 | 3;
    q2_pessimism: 0 | 1 | 2 | 3;
    q3_failure: 0 | 1 | 2 | 3;
    q4_loss_of_pleasure: 0 | 1 | 2 | 3;
    q5_guilt: 0 | 1 | 2 | 3;
    q6_punishment: 0 | 1 | 2 | 3;
    q7_self_dislike: 0 | 1 | 2 | 3;
    q8_self_criticalness: 0 | 1 | 2 | 3;
    q9_suicidal_thoughts: 0 | 1 | 2 | 3;
    q10_crying: 0 | 1 | 2 | 3;
    q11_agitation: 0 | 1 | 2 | 3;
    q12_loss_of_interest: 0 | 1 | 2 | 3;
    q13_indecisiveness: 0 | 1 | 2 | 3;
    q14_worthlessness: 0 | 1 | 2 | 3;
    q15_loss_of_energy: 0 | 1 | 2 | 3;
    q16_sleep_changes: 0 | 1 | 2 | 3;
    q17_irritability: 0 | 1 | 2 | 3;
    q18_appetite_changes: 0 | 1 | 2 | 3;
    q19_concentration: 0 | 1 | 2 | 3;
    q20_tiredness: 0 | 1 | 2 | 3;
    q21_loss_of_libido: 0 | 1 | 2 | 3;
  };
  totalScore: number; // 0-63
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  recommendedAction: string;
  testDate: string;
}

export interface GAD7Assessment {
  questions: {
    q1_nervous: 0 | 1 | 2 | 3;
    q2_uncontrollable_worry: 0 | 1 | 2 | 3;
    q3_too_much_worry: 0 | 1 | 2 | 3;
    q4_trouble_relaxing: 0 | 1 | 2 | 3;
    q5_restless: 0 | 1 | 2 | 3;
    q6_easily_annoyed: 0 | 1 | 2 | 3;
    q7_afraid_something_awful: 0 | 1 | 2 | 3;
  };
  totalScore: number; // 0-21
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  recommendedAction: string;
  testDate: string;
}

export interface DASS21Assessment {
  depression: {
    q3_dysphoria: 0 | 1 | 2 | 3;
    q5_anhedonia: 0 | 1 | 2 | 3;
    q10_inertia: 0 | 1 | 2 | 3;
    q13_sadness: 0 | 1 | 2 | 3;
    q16_discouraged: 0 | 1 | 2 | 3;
    q17_worthless: 0 | 1 | 2 | 3;
    q21_meaningless: 0 | 1 | 2 | 3;
    subscaleScore: number; // 0-21
  };
  anxiety: {
    q2_autonomic_arousal: 0 | 1 | 2 | 3;
    q4_situational_anxiety: 0 | 1 | 2 | 3;
    q7_trembling: 0 | 1 | 2 | 3;
    q9_situational_anxiety2: 0 | 1 | 2 | 3;
    q15_panic: 0 | 1 | 2 | 3;
    q19_cardiac_symptoms: 0 | 1 | 2 | 3;
    q20_scared: 0 | 1 | 2 | 3;
    subscaleScore: number; // 0-21
  };
  stress: {
    q1_upset: 0 | 1 | 2 | 3;
    q6_overreact: 0 | 1 | 2 | 3;
    q8_tension: 0 | 1 | 2 | 3;
    q11_agitated: 0 | 1 | 2 | 3;
    q12_relax_difficulty: 0 | 1 | 2 | 3;
    q14_impatient: 0 | 1 | 2 | 3;
    q18_touchy: 0 | 1 | 2 | 3;
    subscaleScore: number; // 0-21
  };
  testDate: string;
}

export interface BigFivePersonality {
  openness: {
    imagination: number; // 1-5
    artistic_interests: number;
    emotionality: number;
    adventurousness: number;
    intellect: number;
    liberalism: number;
    score: number; // საშუალო
  };
  conscientiousness: {
    self_efficacy: number;
    orderliness: number;
    dutifulness: number;
    achievement_striving: number;
    self_discipline: number;
    cautiousness: number;
    score: number;
  };
  extraversion: {
    friendliness: number;
    gregariousness: number;
    assertiveness: number;
    activity_level: number;
    excitement_seeking: number;
    cheerfulness: number;
    score: number;
  };
  agreeableness: {
    trust: number;
    morality: number;
    altruism: number;
    cooperation: number;
    modesty: number;
    sympathy: number;
    score: number;
  };
  neuroticism: {
    anxiety: number;
    anger: number;
    depression: number;
    self_consciousness: number;
    immoderation: number;
    vulnerability: number;
    score: number;
  };
  testDate: string;
}

export interface TherapyRecommendation {
  type: 'CBT' | 'DBT' | 'EMDR' | 'MBSR' | 'ACT' | 'Lifestyle' | 'Mindfulness';
  priority: 'low' | 'medium' | 'high';
  description: string;
  sessions: number;
  timeframe: string;
  modules: string[];
}

// Additional Assessment Tools for Comprehensive User Profiling

export interface EmotionalIntelligenceScale {
  questions: {
    q1_self_awareness: 1 | 2 | 3 | 4 | 5; // Самосознание
    q2_self_regulation: 1 | 2 | 3 | 4 | 5; // Саморегуляция
    q3_motivation: 1 | 2 | 3 | 4 | 5; // Мотивация
    q4_empathy: 1 | 2 | 3 | 4 | 5; // Эмпатия
    q5_social_skills: 1 | 2 | 3 | 4 | 5; // Социальные навыки
    q6_emotion_recognition: 1 | 2 | 3 | 4 | 5; // Распознавание эмоций
    q7_stress_management: 1 | 2 | 3 | 4 | 5; // Управление стрессом
    q8_adaptability: 1 | 2 | 3 | 4 | 5; // Адаптивობა
  };
  totalScore: number; // 8-40
  level: 'developing' | 'moderate' | 'high' | 'exceptional';
  testDate: string;
}

export interface ResilienceScale {
  questions: {
    q1_adapt_change: 1 | 2 | 3 | 4 | 5; // Адаптация к ცვლილებები
    q2_bounce_back: 1 | 2 | 3 | 4 | 5; // Способность восстанавливаться
    q3_handle_stress: 1 | 2 | 3 | 4 | 5; // Управление стрессом
    q4_optimistic: 1 | 2 | 3 | 4 | 5; // Оптимизм
    q5_problem_solving: 1 | 2 | 3 | 4 | 5; // Решение პრობლემები
    q6_support_network: 1 | 2 | 3 | 4 | 5; // Социальная поддержка
    q7_self_confidence: 1 | 2 | 3 | 4 | 5; // Уверенность в себе
    q8_emotional_control: 1 | 2 | 3 | 4 | 5; // Эмоциональный კონტროლი
  };
  totalScore: number; // 8-40
  level: 'low' | 'moderate' | 'high' | 'very_high';
  testDate: string;
}

export interface LifeSatisfactionScale {
  questions: {
    q1_life_conditions: 1 | 2 | 3 | 4 | 5; // Условия жизни
    q2_satisfied_life: 1 | 2 | 3 | 4 | 5; // Удовлетворенность жизнью
    q3_important_things: 1 | 2 | 3 | 4 | 5; // Достижение важных вещей
    q4_change_nothing: 1 | 2 | 3 | 4 | 5; // Не хотел бы менять
    q5_ideal_life: 1 | 2 | 3 | 4 | 5; // Близость к идеалу
  };
  totalScore: number; // 5-25
  level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  testDate: string;
}

export interface SelfEsteemScale {
  questions: {
    q1_good_qualities: 1 | 2 | 3 | 4; // Хорошие качества
    q2_failure: 1 | 2 | 3 | 4; // Неудачник (обратный)
    q3_do_things_well: 1 | 2 | 3 | 4; // Умею делать вещи კარგად
    q4_not_much_proud: 1 | 2 | 3 | 4; // Нечем гордиться (обратный)
    q5_positive_attitude: 1 | 2 | 3 | 4; // Позитивное отношение к себе
    q6_satisfied_self: 1 | 2 | 3 | 4; // Удовлетворენ საკუთარ თავზე
    q7_more_respect: 1 | 2 | 3 | 4; // ბრწყინვალე თვისებები
    q8_useless: 1 | 2 | 3 | 4; // Чувствую себя бесполезным (обратный)
    q9_good_person: 1 | 2 | 3 | 4; // Хороший человек
    q10_worth_person: 1 | 2 | 3 | 4; // Достойный ადამიანი
  };
  totalScore: number; // 10-40
  level: 'low' | 'moderate' | 'high' | 'very_high';
  testDate: string;
}

export interface MindfulnessScale {
  questions: {
    q1_aware_feelings: 1 | 2 | 3 | 4 | 5; // Осознанность გრძნობების
    q2_present_moment: 1 | 2 | 3 | 4 | 5; // მომენტში ყოფნა
    q3_observe_thoughts: 1 | 2 | 3 | 4 | 5; // აზრების დაკვირვება
    q4_body_awareness: 1 | 2 | 3 | 4 | 5; // სხეულის ცნობიერება
    q5_non_judgment: 1 | 2 | 3 | 4 | 5; // არაპარტიული დამოკიდებულება
    q6_emotional_acceptance: 1 | 2 | 3 | 4 | 5; // ემოციების მიღება
    q7_mindful_breathing: 1 | 2 | 3 | 4 | 5; // ყურადღებიანი სუნთქვა
    q8_mental_clarity: 1 | 2 | 3 | 4 | 5; // გონების სიწმინდე
  };
  totalScore: number; // 8-40
  level: 'low' | 'moderate' | 'high' | 'very_high';
  testDate: string;
}

export interface CopingStrategiesScale {
  problemFocused: {
    planning: 1 | 2 | 3 | 4; // Планирование
    active_coping: 1 | 2 | 3 | 4; // Активное совლანდება
    seeking_support: 1 | 2 | 3 | 4; // Поиск მხარდაჭერა
    positive_reframing: 1 | 2 | 3 | 4; // Позитивное переосмысление
    score: number;
  };
  emotionFocused: {
    acceptance: 1 | 2 | 3 | 4; // Принятие
    emotional_expression: 1 | 2 | 3 | 4; // Эмоциональное выражение
    relaxation: 1 | 2 | 3 | 4; // რელაქსაცია
    spiritual_coping: 1 | 2 | 3 | 4; // Духовное совლანდება
    score: number;
  };
  avoidantCoping: {
    denial: 1 | 2 | 3 | 4; // Отрицание
    distraction: 1 | 2 | 3 | 4; // Отвლიკება
    substance_use: 1 | 2 | 3 | 4; // Употребление веществ
    behavioral_disengagement: 1 | 2 | 3 | 4; // Поведенческое избегание
    score: number;
  };
  testDate: string;
}

export interface ValuesInActionScale {
  values: {
    creativity: 1 | 2 | 3 | 4 | 5; // Креативность
    curiosity: 1 | 2 | 3 | 4 | 5; // Любознательность
    judgment: 1 | 2 | 3 | 4 | 5; // Рассудительность
    love_of_learning: 1 | 2 | 3 | 4 | 5; // Любовь к учению
    perspective: 1 | 2 | 3 | 4 | 5; // მჭვრეტელობა
    bravery: 1 | 2 | 3 | 4 | 5; // მამაცობა
    perseverance: 1 | 2 | 3 | 4 | 5; // გამძლეობა
    honesty: 1 | 2 | 3 | 4 | 5; // სიმართლე
    zest: 1 | 2 | 3 | 4 | 5; // სიცოცხლის სიყვარული
    love: 1 | 2 | 3 | 4 | 5; // სიყვარული
    kindness: 1 | 2 | 3 | 4 | 5; // კეთილგანწყობა
    social_intelligence: 1 | 2 | 3 | 4 | 5; // სოციალური ინტელექტი
    teamwork: 1 | 2 | 3 | 4 | 5; // გუნდური მუშაობა
    fairness: 1 | 2 | 3 | 4 | 5; // სამართლიანობა
    leadership: 1 | 2 | 3 | 4 | 5; // ლიდერობა
    forgiveness: 1 | 2 | 3 | 4 | 5; // პატიება
    humility: 1 | 2 | 3 | 4 | 5; // თავმდაბლობა
    prudence: 1 | 2 | 3 | 4 | 5; // სიფრთხილე
    self_regulation: 1 | 2 | 3 | 4 | 5; // თვითკონტროლი
    appreciation: 1 | 2 | 3 | 4 | 5; // მადლიერება
    hope: 1 | 2 | 3 | 4 | 5; // იმედი
    humor: 1 | 2 | 3 | 4 | 5; // ხუმრობა
    spirituality: 1 | 2 | 3 | 4 | 5; // სულიერება
  };
  topStrengths: string[]; // Тოპ 5 ძლიერ მხარეებზე
  testDate: string;
}

export interface AttachmentStyleScale {
  secure: {
    comfort_closeness: 1 | 2 | 3 | 4 | 5; // Комфорт близости
    trust_others: 1 | 2 | 3 | 4 | 5; // Доверие другим
    emotional_support: 1 | 2 | 3 | 4 | 5; // Эмоциональная поддержка
    score: number;
  };
  anxious: {
    fear_abandonment: 1 | 2 | 3 | 4 | 5; // Страх покинутости
    need_reassurance: 1 | 2 | 3 | 4 | 5; // Потребность в подтверждении
    relationship_anxiety: 1 | 2 | 3 | 4 | 5; // Тревога в отношениях
    score: number;
  };
  avoidant: {
    independence: 1 | 2 | 3 | 4 | 5; // Независимость
    discomfort_closeness: 1 | 2 | 3 | 4 | 5; // დისკომფორტი ახლოს
    self_reliance: 1 | 2 | 3 | 4 | 5; // Самостоятельность
    score: number;
  };
  dominantStyle: 'secure' | 'anxious' | 'avoidant' | 'disorganized';
  testDate: string;
}

// AI-Generated User Profile System
export interface UserProfile {
  personalInfo: {
    name?: string;
    age?: number;
    gender?: string;
    occupation?: string;
    location?: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    interests?: string;
    goals?: string;
    maritalStatus?: string;
    children?: string;
    education?: string;
    income?: string;
    housing?: string;
    smoking?: string;
    alcohol?: string;
    exercise?: string;
    sleep?: string;
    chronicDiseases?: string;
    medications?: string;
    previousTherapy?: string;
    familyHistory?: string;
  };
  psychologicalProfile: {
    personalityTraits: string[];
    emotionalPatterns: string[];
    strengthsAndResources: string[];
    growthAreas: string[];
    copingStrategies: string[];
    communicationStyle: string;
    motivationalFactors: string[];
    stressIndicators: string[];
  };
  assessmentHistory: {
    completedTests: string[];
    totalTests: number;
    completionPercentage: number;
    lastTestDate: string;
    lastTestType?: string;
    progressNotes: string[];
  };
  latestAssessments?: {
    [testType: string]: {
      result: any;
      date: string;
      analysis: any;
    }
  };
  aiInsights: {
    overallWellness: string;
    keyRecommendations: string[];
    personalizationNotes: string[];
    nextSteps: string[];
    riskFactors: string[];
    protectiveFactors: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysisResult {
  userProfileUpdate: Partial<UserProfile>;
  testSpecificInsights: {
    testType: string;
    keyFindings: string[];
    personalizedRecommendations: string[];
    progressIndicators: string[];
  };
  contextualAnalysis: string;
  storageRecommendation: string;
}

export class ClinicalAssessmentEngine {
  
  // PHQ-9 Depression Assessment
  static calculatePHQ9(responses: PHQ9Assessment['questions']): PHQ9Assessment {
    const totalScore = Object.values(responses).reduce((sum: number, score) => sum + score, 0);
    
    let severity: PHQ9Assessment['severity'];
    let recommendedAction: string;
    
    if (totalScore <= 4) {
      severity = 'minimal';
      recommendedAction = 'Поддерживайте კარგია самочувствие и продолжайте заботиться о себе.';
    } else if (totalScore <= 9) {
      severity = 'mild';
      recommendedAction = 'Рекомендуется уделить внимание своему эмоциональному состоянию.';
    } else if (totalScore <= 14) {
      severity = 'moderate';
      recommendedAction = 'Полезно будет изучить техники самопомощи და მხარდაჭერის.';
    } else if (totalScore <= 19) {
      severity = 'moderately_severe';
      recommendedAction = 'Важно заботиться о своем მენტალურ ჯანმრთელობაზე და найти поддержку.';
    } else {
      severity = 'severe';
      recommendedAction = 'Рекомендуется обратить особое внимание на свое благополучие.';
    }
    
    return {
      questions: responses,
      totalScore,
      severity,
      recommendedAction,
      testDate: new Date().toISOString()
    };
  }

  // Beck Depression Inventory (BDI-II)
  static calculateBDI(responses: BDIAssessment['questions']): BDIAssessment {
    const totalScore = Object.values(responses).reduce((sum: number, score) => sum + score, 0);
    
    let severity: BDIAssessment['severity'];
    let recommendedAction: string;
    
    if (totalScore <= 13) {
      severity = 'minimal';
      recommendedAction = 'Отличное ემოციური კეთილდღეობა. Поддерживайте здоровый образ жизни.';
    } else if (totalScore <= 19) {
      severity = 'mild';
      recommendedAction = 'Обратите внимание на техники поддержания კარგი განწყობა.';
    } else if (totalScore <= 28) {
      severity = 'moderate';
      recommendedAction = 'Полезно изучить способы улучшения ემოციური კეთილდღეობა.';
    } else {
      severity = 'severe';
      recommendedAction = 'Важно уделить особое внимание заботе о себе и поиску поддержки.';
    }
    
    return {
      questions: responses,
      totalScore,
      severity,
      recommendedAction,
      testDate: new Date().toISOString()
    };
  }
  
  // GAD-7 Anxiety Assessment
  static calculateGAD7(responses: GAD7Assessment['questions']): GAD7Assessment {
    const totalScore = Object.values(responses).reduce((sum: number, score) => sum + score, 0);
    
    let severity: GAD7Assessment['severity'];
    let recommendedAction: string;
    
    if (totalScore <= 4) {
      severity = 'minimal';
      recommendedAction = 'Отличное управление тревожностью. Продолжайте заботиться о себе.';
    } else if (totalScore <= 9) {
      severity = 'mild';
      recommendedAction = 'Полезно изучить техники რელაქსაცია და управления стрессом.';
    } else if (totalScore <= 14) {
      severity = 'moderate';
      recommendedAction = 'Рекомендуется освоить методы снижения тревожности.';
    } else {
      severity = 'severe';
      recommendedAction = 'Важно найти эффективные способы управления тревожностью.';
    }
    
    return {
      questions: responses,
      totalScore,
      severity,
      recommendedAction,
      testDate: new Date().toISOString()
    };
  }
  
  // DASS-21 Comprehensive Assessment
  static calculateDASS21(responses: Record<string, number>): DASS21Assessment {
    
    // Depression subscale (items 3,5,10,13,16,17,21)
    const depressionItems = [3, 5, 10, 13, 16, 17, 21];
    const depressionScore = depressionItems.reduce((sum, item) => sum + (responses[`q${item}`] || 0), 0) * 2;
    
    // Anxiety subscale (items 2,4,7,9,15,19,20)
    const anxietyItems = [2, 4, 7, 9, 15, 19, 20];
    const anxietyScore = anxietyItems.reduce((sum, item) => sum + (responses[`q${item}`] || 0), 0) * 2;
    
    // Stress subscale (items 1,6,8,11,12,14,18)
    const stressItems = [1, 6, 8, 11, 12, 14, 18];
    const stressScore = stressItems.reduce((sum, item) => sum + (responses[`q${item}`] || 0), 0) * 2;
    
    return {
      depression: {
        q3_dysphoria: (responses.q3 || 0) as 0 | 1 | 2 | 3,
        q5_anhedonia: (responses.q5 || 0) as 0 | 1 | 2 | 3,
        q10_inertia: (responses.q10 || 0) as 0 | 1 | 2 | 3,
        q13_sadness: (responses.q13 || 0) as 0 | 1 | 2 | 3,
        q16_discouraged: (responses.q16 || 0) as 0 | 1 | 2 | 3,
        q17_worthless: (responses.q17 || 0) as 0 | 1 | 2 | 3,
        q21_meaningless: (responses.q21 || 0) as 0 | 1 | 2 | 3,
        subscaleScore: depressionScore
      },
      anxiety: {
        q2_autonomic_arousal: (responses.q2 || 0) as 0 | 1 | 2 | 3,
        q4_situational_anxiety: (responses.q4 || 0) as 0 | 1 | 2 | 3,
        q7_trembling: (responses.q7 || 0) as 0 | 1 | 2 | 3,
        q9_situational_anxiety2: (responses.q9 || 0) as 0 | 1 | 2 | 3,
        q15_panic: (responses.q15 || 0) as 0 | 1 | 2 | 3,
        q19_cardiac_symptoms: (responses.q19 || 0) as 0 | 1 | 2 | 3,
        q20_scared: (responses.q20 || 0) as 0 | 1 | 2 | 3,
        subscaleScore: anxietyScore
      },
      stress: {
        q1_upset: (responses.q1 || 0) as 0 | 1 | 2 | 3,
        q6_overreact: (responses.q6 || 0) as 0 | 1 | 2 | 3,
        q8_tension: (responses.q8 || 0) as 0 | 1 | 2 | 3,
        q11_agitated: (responses.q11 || 0) as 0 | 1 | 2 | 3,
        q12_relax_difficulty: (responses.q12 || 0) as 0 | 1 | 2 | 3,
        q14_impatient: (responses.q14 || 0) as 0 | 1 | 2 | 3,
        q18_touchy: (responses.q18 || 0) as 0 | 1 | 2 | 3,
        subscaleScore: stressScore
      },
      testDate: new Date().toISOString()
    };
  }
  
  // Big Five Personality Assessment
  static calculateBigFive(responses: any): BigFivePersonality {
    // This would normally involve more complex scoring algorithms
    // For demo purposes, simplified calculation
    
    const calculateDomainScore = (domain: any) => {
      const values = Object.values(domain) as number[];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    };
    
    return {
      openness: {
        ...responses.openness,
        score: calculateDomainScore(responses.openness)
      },
      conscientiousness: {
        ...responses.conscientiousness,
        score: calculateDomainScore(responses.conscientiousness)
      },
      extraversion: {
        ...responses.extraversion,
        score: calculateDomainScore(responses.extraversion)
      },
      agreeableness: {
        ...responses.agreeableness,
        score: calculateDomainScore(responses.agreeableness)
      },
      neuroticism: {
        ...responses.neuroticism,
        score: calculateDomainScore(responses.neuroticism)
      },
      testDate: new Date().toISOString()
    };
  }
  
  // Integrated Clinical Analysis - Positive focus only
  static generateTherapyRecommendations(assessments: {
    phq9?: PHQ9Assessment;
    gad7?: GAD7Assessment;
    dass21?: DASS21Assessment;
    bigFive?: BigFivePersonality;
  }): TherapyRecommendation[] {
    
    const recommendations: TherapyRecommendation[] = [];
    
    // PHQ-9 based recommendations - focus on positive interventions
    if (assessments.phq9) {
      recommendations.push({
        type: 'CBT',
        priority: 'medium',
        description: 'Когнитивно-поведенческая терапия для улучшения настроения и мышления',
        sessions: 12,
        timeframe: '3 месяца',
        modules: ['positive_thinking', 'behavioral_activation', 'mood_tracking']
      });
    }
    
    // GAD-7 based recommendations - stress management focus
    if (assessments.gad7) {
      recommendations.push({
        type: 'MBSR',
        priority: 'medium',
        description: 'Практики осознанности и релаксации для душевного спокойствия',
        sessions: 8,
        timeframe: '8 недель',
        modules: ['mindful_breathing', 'body_scan', 'stress_reduction']
      });
    }
    
    // DASS-21 based recommendations - holistic approach
    if (assessments.dass21) {
      recommendations.push({
        type: 'Lifestyle',
        priority: 'medium',
        description: 'Программа улучшения качества жизни и эмоционального благополучия',
        sessions: 6,
        timeframe: '6 недель',
        modules: ['exercise_routine', 'sleep_hygiene', 'nutrition_wellness']
      });
    }
    
    // Big Five based recommendations - personal development
    if (assessments.bigFive) {
      recommendations.push({
        type: 'ACT',
        priority: 'medium',
        description: 'Терапия принятия и развития личных ценностей',
        sessions: 10,
        timeframe: '2.5 месяца',
        modules: ['values_clarification', 'goal_setting', 'mindfulness']
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  // Calculate general wellness and strengths assessment
  static calculateWellnessProfile(assessments: {
    phq9?: PHQ9Assessment;
    gad7?: GAD7Assessment;
    dass21?: DASS21Assessment;
  }): { wellnessLevel: 'excellent' | 'good' | 'moderate' | 'needs_attention'; strengths: string[]; growthAreas: string[] } {
    
    const strengths: string[] = [];
    const growthAreas: string[] = [];
    let wellnessScore = 0;
    
    // PHQ-9 contribution
    if (assessments.phq9) {
      const { severity } = assessments.phq9;
      
      if (severity === 'minimal') {
        wellnessScore += 3;
        strengths.push('Отличное ემოციური კეთილდღეობა');
      } else if (severity === 'mild') {
        wellnessScore += 2;
        strengths.push('Хорошее თვითშეფასება');
      } else if (severity === 'moderate') {
        wellnessScore += 1;
        growthAreas.push('Укрепление ემოციური კეთილდღეობა');
      } else {
        growthAreas.push('Развитие навыков поддержания настроения');
      }
    }
    
    // GAD-7 contribution
    if (assessments.gad7) {
      const { severity } = assessments.gad7;
      
      if (severity === 'minimal') {
        wellnessScore += 3;
        strengths.push('Отличное управление стрессом');
      } else if (severity === 'mild') {
        wellnessScore += 2;
        strengths.push('Хорошие навыки რელაქსაცია');
      } else if (severity === 'moderate') {
        wellnessScore += 1;
        growthAreas.push('Развитие техник управления тревожностью');
      } else {
        growthAreas.push('Освоение методов снижения стресса');
      }
    }
    
    // DASS-21 contribution
    if (assessments.dass21) {
      const { depression, anxiety, stress } = assessments.dass21;
      
      if (depression.subscaleScore <= 9) strengths.push('Стабильное настроение');
      if (anxiety.subscaleScore <= 7) strengths.push('Хорошее управление беспокойством');
      if (stress.subscaleScore <= 14) strengths.push('Эффективное преодоление стресса');
      
      if (depression.subscaleScore > 14) growthAreas.push('Поддержание позитивного настроения');
      if (anxiety.subscaleScore > 14) growthAreas.push('Развитие спокойствия');
      if (stress.subscaleScore > 18) growthAreas.push('Улучшение управления нагрузкой');
    }
    
    // Determine wellness level
    let wellnessLevel: 'excellent' | 'good' | 'moderate' | 'needs_attention';
    
    if (wellnessScore >= 5) {
      wellnessLevel = 'excellent';
    } else if (wellnessScore >= 3) {
      wellnessLevel = 'good';
    } else if (wellnessScore >= 1) {
      wellnessLevel = 'moderate';
    } else {
      wellnessLevel = 'needs_attention';
    }
    
    return { wellnessLevel, strengths, growthAreas };
  }

  // User Profile Management
  private static readonly PROFILE_STORAGE_KEY = 'userPsychologicalProfile';

  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await AsyncStorage.getItem(this.PROFILE_STORAGE_KEY);
      if (profileData) {
        return JSON.parse(profileData);
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      profile.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  static async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      let profile = await this.getUserProfile();
      
      if (!profile) {
        // Create new profile
        profile = {
          personalInfo: {},
          psychologicalProfile: {
            personalityTraits: [],
            emotionalPatterns: [],
            strengthsAndResources: [],
            growthAreas: [],
            copingStrategies: [],
            communicationStyle: '',
            motivationalFactors: [],
            stressIndicators: []
          },
          assessmentHistory: {
            completedTests: [],
            totalTests: 0,
            completionPercentage: 0,
            lastTestDate: new Date().toISOString(),
            progressNotes: []
          },
          latestAssessments: {},
          aiInsights: {
            overallWellness: '',
            keyRecommendations: [],
            personalizationNotes: [],
            nextSteps: [],
            riskFactors: [],
            protectiveFactors: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Deep merge updates
      if (updates.psychologicalProfile) {
        profile.psychologicalProfile = {
          ...profile.psychologicalProfile,
          ...updates.psychologicalProfile
        };
      }

      if (updates.aiInsights) {
        profile.aiInsights = {
          ...profile.aiInsights,
          ...updates.aiInsights
        };
      }

      if (updates.assessmentHistory) {
        profile.assessmentHistory = {
          ...profile.assessmentHistory,
          ...updates.assessmentHistory
        };
      }

      if (updates.latestAssessments) {
        profile.latestAssessments = {
          ...profile.latestAssessments,
          ...updates.latestAssessments
        };
      }

      await this.saveUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update user profile with test results
  static async updateProfileWithTestResults(assessmentType: string, results: any, recommendations: string): Promise<void> {
    try {
      const currentDate = new Date().toISOString();
      
      // Prepare profile updates
      const profileUpdates: Partial<UserProfile> = {
        latestAssessments: {
          [assessmentType]: {
            result: results,
            date: currentDate,
            analysis: recommendations
          }
        },
        assessmentHistory: {
          completedTests: [],
          totalTests: 0,
          completionPercentage: 0,
          lastTestDate: currentDate,
          lastTestType: assessmentType,
          progressNotes: []
        }
      };

      // Get current profile to merge
      const currentProfile = await this.getUserProfile();
      if (currentProfile) {
        // Merge completed tests
        const completedTests = currentProfile.assessmentHistory?.completedTests || [];
        if (!completedTests.includes(assessmentType)) {
          completedTests.push(assessmentType);
        }
        
        profileUpdates.assessmentHistory = {
          ...currentProfile.assessmentHistory,
          completedTests,
          totalTests: completedTests.length,
          completionPercentage: (completedTests.length / 7) * 100, // 7 total tests
          lastTestDate: currentDate,
          lastTestType: assessmentType,
          progressNotes: currentProfile.assessmentHistory?.progressNotes || []
        };

        // Merge latest assessments
        profileUpdates.latestAssessments = {
          ...currentProfile.latestAssessments,
          [assessmentType]: {
            result: results,
            date: currentDate,
            analysis: recommendations
          }
        };
      }

      await this.updateUserProfile(profileUpdates);
      
      // Generate comprehensive profile analysis with AI
      try {
        const currentProfile = await this.getUserProfile();
        const aiAnalysis = await this.generateUserProfileAnalysis(
          assessmentType, 
          results, 
          currentProfile || undefined
        );
        
        // Update profile with AI insights
        if (aiAnalysis && aiAnalysis.userProfileUpdate) {
          await this.updateUserProfile(aiAnalysis.userProfileUpdate);
        }
      } catch (aiError) {
        console.error('Error generating AI profile analysis:', aiError);
        // Continue even if AI analysis fails
      }
    } catch (error) {
      console.error('Error updating profile with test results:', error);
    }
  }

  // Format AI recommendations from JSON to readable text
  static formatAIRecommendations(rawRecommendations: string): string {
    try {
      // Try to extract JSON from markdown code block if present
      let jsonText = rawRecommendations.trim();
      
      // Remove markdown code blocks
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      // Try to parse JSON
      const recommendations = JSON.parse(jsonText);
      
      // Format as readable text
      let formatted = '✨ Спасибо за прохождение теста!\n\n';
      
      // Validation
      if (recommendations.validation) {
        formatted += `💭 ${recommendations.validation}\n\n`;
      }
      
      // Recommendations
      if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        formatted += '📋 Персональные рекомендации:\n\n';
        
        recommendations.recommendations.forEach((rec: any, index: number) => {
          formatted += `${rec.emoji || '•'} ${rec.title || `Рекомендация ${index + 1}`}\n`;
          formatted += `${rec.description}\n\n`;
        });
      }
      
      // Next steps
      if (recommendations.next_steps) {
        formatted += `🎯 Следующие шаги:\n${recommendations.next_steps}\n\n`;
      }
      
      // Closing message
      if (recommendations.closing_message) {
        formatted += `💪 ${recommendations.closing_message}`;
      }
      
      return formatted;
      
    } catch (error) {
      console.error('Error parsing AI recommendations JSON:', error);
      // Return original text if parsing fails
      return `Спасибо за прохождение теста! Вот персональные рекомендации на основе ваших ответов:\n\n${rawRecommendations}`;
    }
  }

  // Generate AI-powered clinical recommendations using OpenAI API with user context
  static async generateAIRecommendations(assessmentType: string, results: any): Promise<string> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      
      if (!apiKey) {
        return 'Извините, сервис რეკომენდაციები временно недоступენ. Обратитесь к специалисту для получения персональной консультации.';
      }

      // Load existing user profile for context
      const userProfile = await this.getUserProfile();
      
      // Create enriched prompt with user context
      const analysisPrompt = this.createEnrichedAnalysisPrompt(assessmentType, results, userProfile);
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: {
            id: 'pmpt_6914d26efccc8190ac8650eb60da46110b64c04ad0fe3b77',
            version: '1'
          },
          input: [
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          text: {
            format: {
              type: 'text'
            }
          },
          reasoning: {},
          max_output_tokens: 2048,
          store: true,
          include: ['web_search_call.action.sources']
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      // Parse response based on OpenAI Responses API structure
      let aiRecommendations = 'Не удалось сгенерировать рекомендации.';
      
      // OpenAI Responses API structure: data.output[0].content[0].text
      if (data.output && Array.isArray(data.output) && data.output.length > 0) {
        const outputItem = data.output[0];
        
        if (outputItem.content && Array.isArray(outputItem.content) && outputItem.content.length > 0) {
          const contentItem = outputItem.content[0];
          
          if (contentItem.type === 'output_text' && contentItem.text) {
            aiRecommendations = contentItem.text;
          }
        }
      } else if (typeof data.output === 'string') {
        // Fallback: if output is a direct string
        aiRecommendations = data.output;
      } else if (data.text) {
        // Fallback: if text is at root level
        aiRecommendations = data.text;
      } else if (data.content) {
        // Fallback: if content is at root level
        aiRecommendations = data.content;
      }
      
      // Parse and format JSON recommendations if present
      const formattedRecommendations = this.formatAIRecommendations(aiRecommendations);
      
      // Update user profile with test results and insights
      await this.updateProfileWithTestResults(assessmentType, results, formattedRecommendations);
      
      return formattedRecommendations;
      
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return 'Произошла ошибка при генერации рекомендаций. Пожалуйста, попробуйте позже или обратитесь к специалисту.';
    }
  }

  // Create analysis prompt based on test type and results
  static createAnalysisPrompt(assessmentType: string, results: any): string {
    let prompt = '';

    switch (assessmentType) {
      case 'PHQ9':
        prompt = this.createPHQ9AnalysisPrompt(results);
        break;
      case 'GAD7':
        prompt = this.createGAD7AnalysisPrompt(results);
        break;
      case 'DASS21':
        prompt = this.createDASS21AnalysisPrompt(results);
        break;
      case 'BDI':
        prompt = this.createBDIAnalysisPrompt(results);
        break;
      case 'BigFive':
        prompt = this.createBigFiveAnalysisPrompt(results);
        break;
      default:
        prompt = 'Проанализируйте общее психологическое состояние და დайте მხარდაჭერის რეკომენდაციები.';
    }

    return prompt;
  }

  // Create enriched analysis prompt with user profile context
  static createEnrichedAnalysisPrompt(assessmentType: string, results: any, userProfile: UserProfile | null): string {
    // Get basic test analysis
    const basePrompt = this.createAnalysisPrompt(assessmentType, results);
    
    if (!userProfile) {
      return basePrompt;
    }

    // Add user context
    let contextInfo = '\n\n=== КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ ===\n';
    
    // Previous tests and patterns
    if (userProfile.assessmentHistory && userProfile.assessmentHistory.completedTests.length > 0) {
      contextInfo += `\nПройденные тесты: ${userProfile.assessmentHistory.completedTests.join(', ')}`;
      contextInfo += `\nВсего тестов: ${userProfile.assessmentHistory.totalTests}`;
      contextInfo += `\nПоследний тест: ${userProfile.assessmentHistory.lastTestType || 'N/A'}`;
    }

    // Psychological profile
    if (userProfile.psychologicalProfile) {
      const profile = userProfile.psychologicalProfile;
      
      if (profile.personalityTraits && profile.personalityTraits.length > 0) {
        contextInfo += `\n\nЛичностные черты: ${profile.personalityTraits.join(', ')}`;
      }
      
      if (profile.emotionalPatterns && profile.emotionalPatterns.length > 0) {
        contextInfo += `\nЭмоциональные паттерны: ${profile.emotionalPatterns.join(', ')}`;
      }
      
      if (profile.strengthsAndResources && profile.strengthsAndResources.length > 0) {
        contextInfo += `\nСильные стороны: ${profile.strengthsAndResources.join(', ')}`;
      }
      
      if (profile.copingStrategies && profile.copingStrategies.length > 0) {
        contextInfo += `\nУспешные стратегии преодоления: ${profile.copingStrategies.join(', ')}`;
      }
    }

    // Previous AI insights
    if (userProfile.aiInsights) {
      const insights = userProfile.aiInsights;
      
      if (insights.overallWellness) {
        contextInfo += `\n\nОбщее благополучие: ${insights.overallWellness}`;
      }
      
      if (insights.protectiveFactors && insights.protectiveFactors.length > 0) {
        contextInfo += `\nЗащитные факторы: ${insights.protectiveFactors.join(', ')}`;
      }
    }

    // Latest assessments for comparison
    if (userProfile.latestAssessments && Object.keys(userProfile.latestAssessments).length > 0) {
      contextInfo += '\n\n=== ПРЕДЫДУЩИЕ РЕЗУЛЬТАТЫ ===';
      Object.entries(userProfile.latestAssessments).forEach(([testType, data]) => {
        if (data.result && data.result.totalScore !== undefined) {
          contextInfo += `\n${testType}: ${data.result.totalScore} (${data.date})`;
        }
      });
    }

    contextInfo += '\n\n=== ИНСТРУКЦИЯ ===';
    contextInfo += '\nИСПОЛЬЗУЙТЕ весь контекст выше для создания ПЕРСОНАЛИЗИРОВАННЫХ рекомендаций:';
    contextInfo += '\n- Ссылайтесь на предыдущие результаты и прогресс';
    contextInfo += '\n- Учитывайте известные личностные черты и предпочтения';
    contextInfo += '\n- Опирайтесь на успешные стратегии из прошлого';
    contextInfo += '\n- Отмечайте улучшения или изменения с прошлого раза';
    contextInfo += '\n- Адаптируйте рекомендации под уникальный профиль пользователя';

    return basePrompt + contextInfo;
  }

  // Create detailed analysis prompts for each test type
  static createPHQ9AnalysisPrompt(results: any): string {
    const questions = results.questions || {};
    const totalScore = results.totalScore || 0;
    const severity = results.severity || 'minimal';

    let specificIssues = [];
    let userStrengths = [];
    
    if (questions.q3_sleep_problems >= 2) specificIssues.push('проблемы со сном');
    else if (questions.q3_sleep_problems <= 1) userStrengths.push('хорошее качество сна');
    
    if (questions.q4_fatigue >= 2) specificIssues.push('повышенная утомляемость');
    else if (questions.q4_fatigue <= 1) userStrengths.push('хороший уровень энергии');
    
    if (questions.q5_appetite >= 2) specificIssues.push('изменения аппетита');
    else if (questions.q5_appetite <= 1) userStrengths.push('стабильный аппетит');
    
    if (questions.q7_concentration >= 2) specificIssues.push('трудности концентрации');
    else if (questions.q7_concentration <= 1) userStrengths.push('хорошая კონცენტრაცია');
    
    if (questions.q1_anhedonia >= 1) specificIssues.push('სიხარულის დაკარგვა');
    else userStrengths.push('სიხარულის შენარჩუნება');
    
    if (questions.q2_depressed_mood >= 1) specificIssues.push('დეპრესიული განწყობა');
    else userStrengths.push('სტაბილური განწყობა');

    return `ПРОФИЛИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ - PHQ-9:
- Общий балл: ${totalScore}/27 (${severity})
- Сильные стороны: ${userStrengths.length > 0 ? userStrengths.join(', ') : 'общая стабильность'}
- Области внимания: ${specificIssues.length > 0 ? specificIssues.join(', ') : 'отличные показатели'}

ЗАПОМНИТЕ О ПОЛЬЗОВАТЕЛЕ:
- Предпочтительные методы поддержки настроения
- Эффективные стратегии самопомощи
- Время суток с лучшим самочувствием
- Триггеры плохого настроения
- Поддерживающие ფაქტორები

Создайте 3-4 короткие, პოზიტიური რეკომენდაციები, которые помогут укрепить ძლიერ მხარეები და რბილად გაუმჯობესოს პრობლემური სფეროები.`;
  }

  static createGAD7AnalysisPrompt(results: any): string {
    const questions = results.questions || {};
    const totalScore = results.totalScore || 0;
    const severity = results.severity || 'minimal';

    let specificIssues = [];
    if (questions.q1_nervous >= 2) specificIssues.push('ნერვიულობა და შფოთვა');
    if (questions.q2_uncontrollable_worry >= 2) specificIssues.push('უკონტროლო შეშფოთება');
    if (questions.q4_trouble_relaxing >= 2) specificIssues.push('მოსვენების სირთულეები');
    if (questions.q5_restless >= 2) specificIssues.push('შფოთვა');
    if (questions.q7_afraid_something_awful >= 2) specificIssues.push('შიში');

    return `Результаты теста GAD-7 на тревожность:
- Общий балл: ${totalScore}/21 (${severity})
- Основные проблемные области: ${specificIssues.length > 0 ? specificIssues.join(', ') : 'შფოთვა ნორმაში'}

Создайте 3-4 короткие, პოზიტიური რეკომენდაციები для управления тревожностью და სტრესით. Включите პრაქტიკული ტექნიკა რელაქსაციის и самопомощი.`;
  }

  static createDASS21AnalysisPrompt(results: any): string {
    const depression = results.depression?.subscaleScore || 0;
    const anxiety = results.anxiety?.subscaleScore || 0;
    const stress = results.stress?.subscaleScore || 0;

    let areas = [];
    if (depression >= 10) areas.push(`დეპრესიული სიმპტომები (${depression}/42)`);
    if (anxiety >= 8) areas.push(`შფოთვა (${anxiety}/42)`);
    if (stress >= 15) areas.push(`სტრესი (${stress}/42)`);

    return `Результаты теста DASS-21:
- Депрессия: ${depression}/42
- Тревожность: ${anxiety}/42  
- Стресс: ${stress}/42
- Области для внимания: ${areas.length > 0 ? areas.join(', ') : 'все показатели в норме'}

Создайте 3-4 короткие, პოზიტიური რეკომენდაციები для улучшения ემოციური მდგომარეობა в გამოვლენილ სფეროებში.`;
  }

  static createBDIAnalysisPrompt(results: any): string {
    const totalScore = results.totalScore || 0;
    const severity = results.severity || 'minimal';

    return `Результаты теста депрессии Бека (BDI):
- Общий балл: ${totalScore}/63 (${severity})
- Уровень депрессивных симптомов: ${severity}

Создайте 3-4 короткие, პოზიტიური რეკომენდაციები для поддержания хорошего настроения და преодоления დეპრესიული სიმპტომები. Фокусируйтесь на активности, которые приносят радость и смысл.`;
  }

  static createBigFiveAnalysisPrompt(results: any): string {
    const openness = results.openness?.score?.toFixed(1) || 'N/A';
    const conscientiousness = results.conscientiousness?.score?.toFixed(1) || 'N/A';
    const extraversion = results.extraversion?.score?.toFixed(1) || 'N/A';
    const agreeableness = results.agreeableness?.score?.toFixed(1) || 'N/A';
    const neuroticism = results.neuroticism?.score?.toFixed(1) || 'N/A';

    let personalityInsights = [];
    if (results.neuroticism?.score >= 4) personalityInsights.push('высокий нейротизм - важно работать со стрессом');
    if (results.conscientiousness?.score <= 2.5) personalityInsights.push('низкая самоорганизация - помогут техники планирования');
    if (results.openness?.score >= 4) personalityInsights.push('высокая открытость - развивайте творческие способности');
    if (results.extraversion?.score <= 2.5) personalityInsights.push('ინტროვერტობა - მნიშვნელოვანია ხარისხიანი კომუნიკაცია');
    if (results.agreeableness?.score >= 4) personalityInsights.push('высокая доброжелательность - учитесь говорить "нет"');

    return `Результаты теста Большой Пятерки:
- Открытость: ${openness}/5
- Добросовестность: ${conscientiousness}/5
- Экстраверсия: ${extraversion}/5
- Доброжелательность: ${agreeableness}/5
- Нейротизм: ${neuroticism}/5

Личностные особенности: ${personalityInsights.length > 0 ? personalityInsights.join(', ') : 'сбалансированный личностный профиль'}

Создайте 3-4 короткие, პოზიტიური რეკომენდაციები для личностного განვითარების на основе этого профиля. Помогите использовать сильные стороны და развით области роста.`;
  }

  // Calculate Emotional Intelligence Scale
  static calculateEmotionalIntelligence(responses: Record<string, number>): EmotionalIntelligenceScale {
    const totalScore = Object.values(responses).reduce((sum: number, score) => sum + score, 0);
    
    let level: EmotionalIntelligenceScale['level'];
    if (totalScore <= 20) level = 'developing';
    else if (totalScore <= 28) level = 'moderate';
    else if (totalScore <= 35) level = 'high';
    else level = 'exceptional';
    
    return {
      questions: {
        q1_self_awareness: responses.q1 as 1 | 2 | 3 | 4 | 5,
        q2_self_regulation: responses.q2 as 1 | 2 | 3 | 4 | 5,
        q3_motivation: responses.q3 as 1 | 2 | 3 | 4 | 5,
        q4_empathy: responses.q4 as 1 | 2 | 3 | 4 | 5,
        q5_social_skills: responses.q5 as 1 | 2 | 3 | 4 | 5,
        q6_emotion_recognition: responses.q6 as 1 | 2 | 3 | 4 | 5,
        q7_stress_management: responses.q7 as 1 | 2 | 3 | 4 | 5,
        q8_adaptability: responses.q8 as 1 | 2 | 3 | 4 | 5,
      },
      totalScore,
      level,
      testDate: new Date().toISOString()
    };
  }

  // Calculate Resilience Scale
  static calculateResilience(responses: Record<string, number>): ResilienceScale {
    const totalScore = Object.values(responses).reduce((sum: number, score) => sum + score, 0);
    
    let level: ResilienceScale['level'];
    if (totalScore <= 20) level = 'low';
    else if (totalScore <= 28) level = 'moderate';
    else if (totalScore <= 35) level = 'high';
    else level = 'very_high';
    
    return {
      questions: {
        q1_adapt_change: responses.q1 as 1 | 2 | 3 | 4 | 5,
        q2_bounce_back: responses.q2 as 1 | 2 | 3 | 4 | 5,
        q3_handle_stress: responses.q3 as 1 | 2 | 3 | 4 | 5,
        q4_optimistic: responses.q4 as 1 | 2 | 3 | 4 | 5,
        q5_problem_solving: responses.q5 as 1 | 2 | 3 | 4 | 5,
        q6_support_network: responses.q6 as 1 | 2 | 3 | 4 | 5,
        q7_self_confidence: responses.q7 as 1 | 2 | 3 | 4 | 5,
        q8_emotional_control: responses.q8 as 1 | 2 | 3 | 4 | 5,
      },
      totalScore,
      level,
      testDate: new Date().toISOString()
    };
  }

  // AI-powered user analysis and profile generation
  static async generateUserProfileAnalysis(assessmentType: string, results: any, existingProfile?: UserProfile): Promise<AIAnalysisResult> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('API key not available');
      }

      const analysisPrompt = this.createProfileAnalysisPrompt(assessmentType, results, existingProfile);
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: {
            id: 'pmpt_6914d26efccc8190ac8650eb60da46110b64c04ad0fe3b77',
            version: '1'
          },
          input: [
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          text: {
            format: {
              type: 'text'
            }
          },
          reasoning: {},
          max_output_tokens: 2048,
          store: true,
          include: ['web_search_call.action.sources']
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Profile API Response:', JSON.stringify(data, null, 2));
      
      // Parse response based on OpenAI Responses API structure
      let aiResponse = '{}';
      
      // OpenAI Responses API structure: data.output[0].content[0].text
      if (data.output && Array.isArray(data.output) && data.output.length > 0) {
        const outputItem = data.output[0];
        
        if (outputItem.content && Array.isArray(outputItem.content) && outputItem.content.length > 0) {
          const contentItem = outputItem.content[0];
          
          if (contentItem.type === 'output_text' && contentItem.text) {
            aiResponse = contentItem.text;
          }
        }
      } else if (typeof data.output === 'string') {
        // Fallback: if output is a direct string
        aiResponse = data.output;
      } else if (data.text) {
        // Fallback: if text is at root level
        aiResponse = data.text;
      } else if (data.content) {
        // Fallback: if content is at root level
        aiResponse = data.content;
      }
      
      // Parse AI response
      let analysisData;
      try {
        analysisData = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        // Fallback analysis
        analysisData = this.createFallbackAnalysis(assessmentType, results);
      }

      // Create profile update
      const profileUpdate: Partial<UserProfile> = {
        psychologicalProfile: {
          personalityTraits: analysisData.personalityTraits || [],
          emotionalPatterns: analysisData.emotionalPatterns || [],
          strengthsAndResources: analysisData.strengthsAndResources || [],
          growthAreas: analysisData.growthAreas || [],
          copingStrategies: analysisData.copingStrategies || [],
          communicationStyle: analysisData.communicationStyle || '',
          motivationalFactors: analysisData.motivationalFactors || [],
          stressIndicators: analysisData.stressIndicators || [],
        },
        aiInsights: {
          overallWellness: analysisData.overallWellness || '',
          keyRecommendations: analysisData.keyRecommendations || [],
          personalizationNotes: analysisData.personalizationNotes || [],
          nextSteps: analysisData.nextSteps || [],
          riskFactors: analysisData.riskFactors || [],
          protectiveFactors: analysisData.protectiveFactors || [],
        },
        updatedAt: new Date().toISOString()
      };

      const aiAnalysisResult: AIAnalysisResult = {
        userProfileUpdate: profileUpdate,
        testSpecificInsights: {
          testType: assessmentType,
          keyFindings: analysisData.testSpecificInsights || [],
          personalizedRecommendations: analysisData.keyRecommendations || [],
          progressIndicators: analysisData.progressIndicators || [],
        },
        contextualAnalysis: analysisData.contextualAnalysis || '',
        storageRecommendation: `Сохранить анализ теста ${assessmentType} с обновлением профиля пользователя`
      };

      return aiAnalysisResult;
      
    } catch (error) {
      console.error('Error generating user profile analysis:', error);
      return this.createFallbackAnalysis(assessmentType, results);
    }
  }

  // Create fallback analysis if AI fails
  static createFallbackAnalysis(assessmentType: string, results: any): AIAnalysisResult {
    return {
      userProfileUpdate: {
        psychologicalProfile: {
          personalityTraits: ['Требуется дополнительный анализ'],
          emotionalPatterns: ['Требуется дополнительный анализ'],
          strengthsAndResources: ['Прохождение психологических тестов'],
          growthAreas: ['Требуется дополнительный анализ'],
          copingStrategies: ['Требуется дополнительный анализ'],
          communicationStyle: 'Требуется дополнительный анализ',
          motivationalFactors: ['Забота о психическом здоровье'],
          stressIndicators: ['Требуется дополнительный анализ'],
        },
        aiInsights: {
          overallWellness: 'Данные анализируются',
          keyRecommendations: ['Продолжите прохождение тестов для более точного анализа'],
          personalizationNotes: ['Требуется больше данных для персонализации'],
          nextSteps: ['Пройти дополнительные тесты'],
          riskFactors: [],
          protectiveFactors: ['Активная работа над самопознанием'],
        },
        updatedAt: new Date().toISOString()
      },
      testSpecificInsights: {
        testType: assessmentType,
        keyFindings: [`Результаты теста ${assessmentType} сохранены`],
        personalizedRecommendations: ['Продолжайте работу над собой'],
        progressIndicators: ['Тест пройден успешно'],
      },
      contextualAnalysis: 'Базовый анализ без AI обработки',
      storageRecommendation: `Базовое сохранение теста ${assessmentType}`
    };
  }

  // Create analysis prompt for AI profile generation
  static createProfileAnalysisPrompt(assessmentType: string, results: any, existingProfile?: UserProfile): string {
    let prompt = `=== ПСИХОЛОГИЧЕСКИЙ АНАЛИЗ И ПРОФИЛИРОВАНИЕ ===\n\n`;
    prompt += `Тест: ${assessmentType}\n\n`;
    
    // Add test results with detailed breakdown
    if (assessmentType === 'PHQ9') {
      prompt += `РЕЗУЛЬТАТЫ PHQ-9 (Депрессия):
- Общий балл: ${results.totalScore}/27
- Уровень: ${results.severity}
- Ответы: ${JSON.stringify(results.questions, null, 2)}\n\n`;
      
      prompt += `ЗАДАЧА: На основе ответов определите:
- Эмоциональные паттерны (какие эмоции доминируют)
- Сильные стороны (что хорошо работает)
- Области для развития (что нуждается в поддержке)
- Копинг-стратегии (как человек справляется)
- Индикаторы стресса (на что реагирует)`;
      
    } else if (assessmentType === 'GAD7') {
      prompt += `РЕЗУЛЬТАТЫ GAD-7 (Тревожность):
- Общий балл: ${results.totalScore}/21
- Уровень: ${results.severity}
- Ответы: ${JSON.stringify(results.questions, null, 2)}\n\n`;
      
      prompt += `ЗАДАЧА: Определите:
- Паттерны тревожности
- Триггеры беспокойства
- Защитные факторы
- Стиль коммуникации (как тревожность влияет на общение)
- Мотивационные факторы`;
      
    } else if (assessmentType === 'BigFive') {
      prompt += `РЕЗУЛЬТАТЫ BIG FIVE (Личность):
- Открытость: ${results.openness?.score || 'N/A'}/5
- Добросовестность: ${results.conscientiousness?.score || 'N/A'}/5
- Экстраверсия: ${results.extraversion?.score || 'N/A'}/5
- Доброжелательность: ${results.agreeableness?.score || 'N/A'}/5
- Нейротизм: ${results.neuroticism?.score || 'N/A'}/5\n\n`;
      
      prompt += `ЗАДАЧА: Определите:
- Ключевые личностные черты (3-5 главных)
- Стиль коммуникации
- Предпочтительные копинг-стратегии
- Мотивационные факторы
- Сильные стороны личности`;
      
    } else if (assessmentType === 'DASS21') {
      prompt += `РЕЗУЛЬТАТЫ DASS-21:
- Депрессия: ${results.depression?.score || 'N/A'}
- Тревожность: ${results.anxiety?.score || 'N/A'}
- Стресс: ${results.stress?.score || 'N/A'}
- Ответы: ${JSON.stringify(results.questions, null, 2)}\n\n`;
      
      prompt += `ЗАДАЧА: Комплексный анализ эмоционального состояния`;
    }
    
    // Add existing profile context if available
    if (existingProfile?.psychologicalProfile) {
      prompt += `\n\n=== СУЩЕСТВУЮЩИЙ ПРОФИЛЬ ===\n`;
      const prof = existingProfile.psychologicalProfile;
      
      if (prof.personalityTraits?.length > 0) {
        prompt += `Личностные черты: ${prof.personalityTraits.join(', ')}\n`;
      }
      if (prof.emotionalPatterns?.length > 0) {
        prompt += `Эмоциональные паттерны: ${prof.emotionalPatterns.join(', ')}\n`;
      }
      if (prof.strengthsAndResources?.length > 0) {
        prompt += `Сильные стороны: ${prof.strengthsAndResources.join(', ')}\n`;
      }
      if (prof.growthAreas?.length > 0) {
        prompt += `Области роста: ${prof.growthAreas.join(', ')}\n`;
      }
      if (prof.copingStrategies?.length > 0) {
        prompt += `Копинг-стратегии: ${prof.copingStrategies.join(', ')}\n`;
      }
      if (prof.communicationStyle) {
        prompt += `Стиль коммуникации: ${prof.communicationStyle}\n`;
      }
      
      prompt += `\nИНСТРУКЦИЯ: ДОПОЛНИТЕ и ОБОГАТИТЕ существующий профиль новыми инсайтами из текущего теста.`;
    } else {
      prompt += `\n\nИНСТРУКЦИЯ: Создайте НОВЫЙ психологический профиль на основе результатов теста.`;
    }
    
    prompt += `\n\n=== ФОРМАТ ОТВЕТА (строго JSON) ===
{
  "personalityTraits": ["черта1", "черта2", "черта3"],
  "emotionalPatterns": ["паттерн1", "паттерн2"],
  "strengthsAndResources": ["сила1", "сила2", "сила3"],
  "growthAreas": ["область1", "область2"],
  "copingStrategies": ["стратегия1", "стратегия2"],
  "communicationStyle": "описание стиля",
  "motivationalFactors": ["фактор1", "фактор2"],
  "stressIndicators": ["индикатор1", "индикатор2"],
  "overallWellness": "общая оценка",
  "keyRecommendations": ["рекомендация1", "рекомендация2"],
  "personalizationNotes": ["заметка1", "заметка2"],
  "nextSteps": ["шаг1", "шаг2"],
  "riskFactors": ["фактор1"],
  "protectiveFactors": ["фактор1", "фактор2"],
  "testSpecificInsights": ["инсайт1", "инсайт2"],
  "progressIndicators": ["показатель1"],
  "contextualAnalysis": "детальный анализ"
}

ВАЖНО: 
- Каждое поле должно быть ЗАПОЛНЕНО конкретными данными из теста
- НЕ используйте общие фразы, будьте СПЕЦИФИЧНЫ
- Базируйтесь ТОЛЬКО на данных теста
- Отвечайте ТОЛЬКО валидным JSON`;
    
    return prompt;
  }
}

// Clinical assessment questions in Russian for localization
export const ClinicalQuestions = {
  PHQ9: {
    title: 'PHQ-9 - შკალა დეპრესიის',
    description: 'За последние 2 недели, как часто Вас беспокоили следующие проблемы? Этот тест поможет оценить степень დეპრესიული სიმპტომები.',
    instructions: 'Внимательно прочитайте каждый вопрос და აირჩიეთ პასუხი, რომელიც საუკეთესოდ აღწერს, თუ რამდენად ხშირად გაწუხებთ აღნიშნული პრობლემა ბოლო ორი კვირის განმავლობაში.',
    options: ['Никогда (0 дней)', 'Несколько дней (1-6 дней)', 'Более половины дней (7-11 дней)', 'Почти каждый день (12-14 дней)'],
    purpose: 'PHQ-9 — это клинически валидированный инструмент для სკრინინგი დეპრესიის, ფართოდ გამოყენებული ექიმების და ფსიქოლოგების მიერ.',
    scoring: 'Баллы: 0-4 (минимальная), 5-9 (легкая), 10-14 (умერებული), 15-19 (უმეტესად-ძალიან მძიმე), 20-27 (ძალიან მძიმე დეპრესია)',
    questions: [
      'Снижение интереса или удовольствия от деятельности',
      'Подавленное настроение, депрессия или безнадежность',
      'Трудности засыпания, беспокойный сон или слишком долгий сон',
      'Усталость или упадок сил',
      'Снижение или повышение аппетита',
      'Плохое мнение о себе или чувство, что Вы неудачник, или что Вы подвели себя или свою семью',
      'Трудности концентрации внимания на чтении, просмотре телевизора или других задачах',
      'Заметно медленные движения или речь, или наоборот, беспокойство и непрерывная суетливость',
      'Мысли о том, что лучше было бы умереть или причинить себе вред каким-либо способом'
    ]
  },
  GAD7: {
    title: 'GAD-7 - Шкала генерализованного тревожного расстройства',
    description: 'За последние 2 недели, как часто Вас беспокоили следующие проблемы? Этот тест оценивает уровень тревожности.',
    instructions: 'Выберите ответ, который наиболее точно отражает частоту Ваших переживаний за последние две недели.',
    options: ['Никогда', 'Несколько дней', 'Более половины дней', 'Почти каждый день'],
    purpose: 'GAD-7 — валидированный инструмент для диагностики генерализованного тревожного расстройства.',
    scoring: 'Баллы: 0-4 (минимальная), 5-9 (легкая), 10-14 (умеренная), 15-21 (тяжелая тревожность)',
    questions: [
      'Нервозность, тревога или напряжение',
      'Неспособность контролировать беспокойство',
      'Чрезмерное беспокойство по различным поводам',
      'Трудности с расслаблением',
      'Выраженная усталость или слабость',
      'Раздражительность или агрессивность',
      'Страх, что может произойти что-то ужасное'
    ]
  },
  BDI: {
    title: 'Шкала депрессии Бека (BDI-II)',
    description: 'Выберите для каждого вопроса тот ответ, который лучше всего описывает Ваше состояние за последнюю неделю, включая сегодняшний день.',
    instructions: 'Внимательно прочитайте все варианты ответов в каждой группе, затем выберите ОДИН ответ из каждой группы, который лучше всего описывает Ваши чувства.',
    purpose: 'BDI-II — один из наиболее широко используемых психометрических тестов для измерения тяжести депрессии.',
    scoring: 'Баллы: 0-13 (минимальная), 14-19 (легкая), 20-28 (умеренная), 29-63 (тяжелая депрессия)',
    questions: [
      {
        question: '1. Печаль',
        options: [
          'Я не чувствую печали',
          'Я чувствую печаль большую часть времени',
          'Мне все время грустно',
          'Я настолько печален и несчастен, что не могу этого выносить'
        ]
      },
      {
        question: '2. Пессимизм',
        options: [
          'Я не чувствую разочарования в своем будущем',
          'Я чувствую себя более разочарованным в своем будущем, чем обычно',
          'Я не ожидаю, что дела у меня пойдут на лад',
          'Я чувствую, что мое будущее безнадежно и будет только хуже'
        ]
      },
      {
        question: '3. Чувство неудачи',
        options: [
          'Я не чувствую себя неудачником',
          'Я чувствую, что терпел неудачи больше, чем обычный человек',
          'Когда я оглядываюсь на свою жизнь, я вижу множество неудач',
          'Я чувствую, что как личность я — полная неудача'
        ]
      },
      {
        question: '4. Потеря удовольствия',
        options: [
          'Я получаю столько же удовольствия от вещей, как и раньше',
          'Я не наслаждаюсь вещами так, как раньше',
          'Я получаю очень мало удовольствия от вещей, которые раньше доставляли мне удовольствие',
          'Я не могу получить удовольствия от чего бы то ни было'
        ]
      },
      {
        question: '5. Чувство вины',
        options: [
          'Я не чувствую особой вины',
          'Я чувствую вину за многие вещи, которые сделал или должен был сделать',
          'Большую часть времени я чувствую сильную вину',
          'Я чувствую вину все время'
        ]
      },
      {
        question: '6. Чувство наказания',
        options: [
          'Я не чувствую, что меня наказывают',
          'Я чувствую, что могу быть наказан',
          'Я ожидаю быть наказанным',
          'Я чувствую, что меня наказывают'
        ]
      },
      {
        question: '7. Неприязнь к себе',
        options: [
          'Я отношусь к себе так же, как и всегда',
          'Я потерял уверенность в себе',
          'Я разочарован в себе',
          'Я не люблю себя'
        ]
      },
      {
        question: '8. Самокритика',
        options: [
          'Я не критикую и не виню себя больше, чем обычно',
          'Я более критичен к себе, чем обычно',
          'Я критикую себя за все свои недостатки',
          'Я виню себя во всем плохом, что происходит'
        ]
      },
      {
        question: '9. Суицидальные мысли или желания',
        options: [
          'У меня нет мыслей о причинении себе вреда',
          'У меня есть мысли о причинении себе вреда, но я не буду их осуществлять',
          'Я хотел бы покончить с собой',
          'Я бы убил себя, если бы представилась возможность'
        ]
      },
      {
        question: '10. Плач',
        options: [
          'Я плачу не больше, чем обычно',
          'Я плачу больше, чем раньше',
          'Я плачу по любому поводу',
          'Раньше я мог плакать, но теперь не могу, даже когда хочу'
        ]
      },
      {
        question: '11. Возбуждение',
        options: [
          'Я не более беспокоен или напряжен, чем обычно',
          'Я чувствую себя более беспокойным или напряженным, чем обычно',
          'Я настолько беспокоен или возбужден, что трудно оставаться на месте',
          'Я იმდენად беспოენ ან возбუდენ, რომ უნდა ვიმოძრაო ან რაღაც გავაკეთო'
        ]
      },
      {
        question: '12. Потеря интереса',
        options: [
          'Я не потерял интереса к другим людям или საქმიანობას',
          'Я ნაკლებად ვარ დაინტერესებული სხვა ადამიანებით ან Dingen',
          'Я потерял большую ნაწილს моего ინტერესის სხვა ადამიანების ან Dingen',
          'Мне трудно заинтересоваться რამით'
        ]
      },
      {
        question: '13. Нерешительность',
        options: [
          'Я принимаю решения так же хорошо, как и всегда',
          'Я откладываю принятие решений чаще, чем раньше',
          'У меня больше трудностей в принятии решений, чем раньше',
          'Я больше не могу принимать решения'
        ]
      },
      {
        question: '14. Чувство собственной бесполезности',
        options: [
          'Я не чувствую, что выгляжу хуже, чем раньше',
          'Я беспокоюсь, რომ выгляდი ძველად ან შეუმჩნეველი',
          'Я чувствую, что в моей внешности происходят მუდმივი ცვლილებები, которые делают меня непривлекательным',
          'Я считаю, что выгляжу уродливо'
        ]
      },
      {
        question: '15. Потеря энергии',
        options: [
          'Я могу работать так же хорошо, как и раньше',
          'Мне нужно приложить дополнительные усилия, чтобы что-то начать',
          'Я должен заставлять себя ძალიან ძლიერ, რათა რაღაც გავაკეთო',
          'Я вообще не могу выполнять никакую работу'
        ]
      },
      {
        question: '16. Изменения режима сна',
        options: [
          'Я сплю ისე კარგად, როგორც ყოველთვის',
          'Я не სძინავს ისე კარგად, როგორც ყოველთვის',
          'Я просыпаюсь на 1-2 часа раньше ჩვეულებრივი და с трудом засыპаю ისევ',
          'Я просыпаюсь на несколько часов раньше обычного и не могу заснуть снова'
        ]
      },
      {
        question: '17. Раздражительность',
        options: [
          'Я не უფრო გაღიზიანებული ვარ, ვიდრე ჩვეულებრივ',
          'Я უფრო გაღიზიანებული ვარ, ვიდრე ჩვეულებრივ',
          'Я ბევრად უფრო გაღიზიანებული ვარ, ვიდრე ჩვეულებრივ',
          'Я раздражителен все время'
        ]
      },
      {
        question: '18. Изменения аппетита',
        options: [
          'Мой аппეტიტი არ არის ცუდი, როგორც ჩვეულებრივ',
          'Мой аппეტიტი არ არის ისე კარგი, როგორც ადრე',
          'მ мой аппეტიტ намного хуже ახლა',
          'У меня вообще нет аппетита'
        ]
      },
      {
        question: '19. Концентрация',
        options: [
          'Я могу კონცენტრироваться ისე კარგად, როგორც ყოველთვის',
          'Я не могу კონცენტრироваться ისე კარგად, როგორც ჩვეულებრივ',
          'Мне трудно долго კონცენტრироваться на чем-либо',
          'Я обнаруживаю, რომ ვერ ვკონცენტრირდები არაფერზე'
        ]
      },
      {
        question: '20. Усталость или утомляемость',
        options: [
          'Я не более усталый или утомленный, чем обычно',
          'Я устаю или утомляюсь легче, чем обычно',
          'Я слишком усталый или утомленный, чтобы делать многие вещи, которые раньше делал',
          'Я слишком устალый ან утомленный, чтобы делать უმეტესობა вещей, которые раньше делал'
        ]
      },
      {
        question: '21. Потеря интереса к сексу',
        options: [
          'Я не заметил никаких недавних изменений в моем интересе к sexo',
          'Я менее заинтересован в сексе, чем раньше',
          'Я гораздо ნაკლებად დაინტერესებული ვარ სექსით ახლა',
          'Я полностью потерял интерес к сексу'
        ]
      }
    ]
  },
  DASS21: {
    title: 'DASS-21 - შკალა დეპრესიის, тревოგისა და სტრესის',
    description: 'გთხოვთ, წაიკითხოთ თითოეული განცხადება და აირჩიოთ რიცხვი, რომელიც მიუთითებს, თუ რამდენად ეხებოდა ეს განცხადება თქვენ გასულ კვირაში.',
    instructions: 'არ არსებობს სწორი ან არასწორი პასუხები. არ დახარჯოთ ზედმეტი დრო ნებისმიერი განცხადების განხილვაზე.',
    purpose: 'DASS-21 ზომავს სამი დაკავშირებული უარყოფითი ემოციური მდგომარეობა: დეპრესია, შფოთვა და სტრესი.',
    scoring: 'შეაფასებს ცალკე დეპრესიის, შფოთვისა და სტრესის სქემით 0-42 ქულას თითოეული სუბსკალისთვის.',
    options: ['Совсем не относится ко мне', 'Иногда относится ко мне', 'Часто относится ко мне', 'Почти всегда относится ко мне'],
    questions: [
      'Мне было трудно успокоиться',
      'Я осознавал сухость во рту',
      'Казалось, я вообще не мог испытывать позитивные чувства',
      'У меня были проблемы с дыханием (например, учащенное дыхание, одышка без физической нагрузки)',
      'Мне было трудно взяться за дело',
      'Я склонен остро реагировать на ситуации',
      'У меня была дрожь (например, в руках)',
      'Я чувствовал, что трачу много нервной энергии',
      'Я беспокоился о ситуациях, в которых мог бы запаниковать და გამოფენილიყო გიჟური სინათლე',
      'Я чувствовал, რომ მომავალი არაფერს ნიშნავს',
      'Я обнаруживал, что становлюсь возбужденным',
      'Мне было трудно расслабиться',
      'Я чувствовал подавленობა და печаль',
      'Я был нетерпელივით к любому, რაც მაჭიანურებდა ჩემს საქმეში',
      'У меня было чувство близости обморока',
      'Я чувствовал, что потерял интерес practically ко всему',
      'Я чувствовал, რომ არ ვარგივარ როგორც პიროვნება',
      'Я был საკმაოდ მგრძნობიარე',
      'Я осознавал работу своего сердца без физической нагрузки (например, ощущение учащенного сердцебиения, пропуска ударов)',
      'Я чувствовал страх без всякой причины',
      'Я чувствовал, რომ ცხოვრება არ აქვს მნიშვნელობა'
    ]
  },
  BigFive: {
    title: 'Большая Пятерка - ტესტი პიროვნების',
    description: 'შეაფასეთ, რამდენად ზუსტად გაწვდით თითოეული განცხადება თქვენზე. იყავით მაქსიმალურად გულწრფელები თქვენს პასუხებში.',
    instructions: 'წაიკითხეთ თითოეული განცხადება და გადაწყვიტეთ, რამდენად კარგად აღწერს თქვენი პიროვნება. აირჩიეთ პასუხი 5-ბალნე სქემით.',
    purpose: 'დიდი ხუთეული - სამეცნიერო საფუძვლიანი პიროვნების მოდელი, რომელიც ზომავს ხუთ ძირითად თვისებას: ღიაობა, კეთილსინდისიერება, ექსტრავერსია, კეთილგანწყობა და ნეიროტიზმი.',
    scoring: 'ყოველი თვისება შეფასებულია 1-დან 5 ბალამდე. შედეგები აჩვენებს თქვენს პიროვნულ პროფილს ხუთი ზომით.',
    options: [
      'სრულად არ ვეთანხმები', 
      'შესაძლოა არ ვეთანხმები', 
      'ნეიტრალურად/გართულებით ვპასუხობ', 
      'შესაძლოა ვეთანხმები', 
      'სრულად ვეთანხმები'
    ],
    questions: [
      // Открытость опыту (Openness) - вопросы 1-6
      'Я имею богатое воображение и часто фантазирую',
      'Я интересуюсь искусством, музыкой, литературой',
      'Я глубоко განიცდი ემოციები და გრძნობები',
      'Я люблю冒険 и новые впечатления',
      'Я люблю размышлять об აბსტრაქტულ იდეებზე',
      'Я имею ლიბერალური პოლიტიკური взгляდები',
      
      // Добросовестность (Conscientiousness) - вопросы 7-12
      'Я всегда тщательно готовлюсь к важным делам',
      'Я люблю порядок და ორგანიზებულობა',
      'Я всегда выполняю свои обязательства и обещания',
      'Я стремлюсь к достижению высоких результатов',
      'Я обладаю მაღალი თვითდისციპლინა',
      'Я осторожен და ვზომავ გადაწყვეტილებების მიღებაში',
      
      // Экстраверсия (Extraversion) - вопросы 13-18
      'Я дружелюбен и легко схожусь с людьми',
      'Я люблю быть в центре внимания и в больших компаниях',
      'Я умею настоять на своем и отстоять свою точку зрения',
      'Я очень активен и энергичен',
      'Я ищу острых ощущений и სტიმულაციის',
      'Я жизნერადостენ და ოპტიმისტურია',
      
      // Доброжелательность (Agreeableness) - вопросы 19-24  
      'Я легко доверяю людям и верю в их добрые намерения',
      'Я честен и искренен в отношениях с людьми',
      'Я всегда готов помочь другим людям',
      'Я легко და კომპრომისზე მიდგომით ვიქცევი და избегаю конфликтების',
      'Я სკრომენ და არ ვარ მიდრეკილი ქედმაღლობისკენ',
      'Я сочувствую другим и сопереживаю их проблемам',
      
      // Нейротизм (Neuroticism) - вопросы 25-30
      'Я часто волнуюсь и беспокоюсь о будущем',
      'Я легко раздражаюсь и выхожу из себя',
      'Я часто грущу и испытываю печаль',
      'Я стесняюсь და ვგრძნობ უხერხულობას საზოგადოებაში',
      'Я бываю არათანაბარი в еде, покупках или развлечениях',
      'Я легко впадаю в стресс и плохо справляюсь с давлением'
    ]
  },
  EmotionalIntelligence: {
    title: 'ემოციური ინტელექტი',
    description: 'შეაფასეთ თქვენი შესაძლებლობები ემოციური ინტელექტის სფეროში. ეს ტესტი დაგეხმარებათ გაიგოთ, რამდენად კარგად აღიქვამთ და მართავთ ემოციებს.',
    instructions: 'შეაფასეთ თითოეული განცხადება 1-დან 5-მდე სკალაზე, სადაც 1 - სრულიად არ ვეთანხმები, ხოლო 5 - სრულად ვეთანხმები.',
    options: [
      'სრულად არ ვეთანხმები',
      'შესაძლოა არ ვეთანხმები', 
      'ნეიტრალურად',
      'შესაძლოა ვეთანხმები',
      'სრულად ვეთანხმები'
    ],
    purpose: 'ემოციური ინტელექტი თამაშობს გასაღები როლს პიროვნულ ეფექტურობაში და ურთიერთობების ხარისხში.',
    scoring: 'ბალები: 8-20 (განვითარება), 21-28 (უმერებული), 29-35 (მაღალი), 36-40 (გამორჩეული)',
    questions: [
      'Я хорошо понимаю свои эмоции и их причины',
      'Я умею контролировать свои эмоциональные реакции',
      'Я мотивирован достигать целей, несмотря на препятствия',
      'Я легко понимаю чувства და ემოციები других людей',
      'Я эффективно взаимодействую с людьми в различных სიტუაციებში',
      'Я სწრაფად распознаю ემოციები по выражению лица და ტონის ხმაზე',
      'Я хорошо справляюсь со стрессом და არ ვაძლევ მას გავლენას სხვებზე',
      'Я легко ადაპტირდები ცვლილებებს და ახალ სიტუაციებში'
    ]
  },
  Resilience: {
    title: 'გამძლეობის შკალა',
    description: 'შეაფასეთ თქვენი შესაძლებლობები გაუმკლავდეთ სირთულეებს და აღდგეთ სტრესული სიტუაციების შემდეგ.',
    instructions: 'იფიქრე იმაზე, როგორ რეაგირებთ ჩვეულებრივ რთულ ცხოვრების სიტუაციებზე და შეაფასეთ თითოეული განცხადება.',
    options: [
      'სრულად არ ვეთანხმები',
      'შესაძლოა არ ვეთანხმები', 
      'ნეიტრალურად',
      'შესაძლოა ვეთანხმები',
      'სრულად ვეთანხმები'
    ],
    purpose: 'გამძლეობა ეხმარება преодолевать трудности და расти благодаря жизненному опыту.',
    scoring: 'Баллы: 8-20 (низкая), 21-28 (უმერებული), 29-35 (высокая), 36-40 (очень высокая)',
    questions: [
      'Я легко приспосაბლივარ к ცვლილებები в жизни',
      'После неудач я быстро восстанавливаюсь და ვმუშაობ შემდეგი ნაბიჯების გადადგმაზე',
      'Я хорошо справляюсь со стрессовыми სიტუაციями',
      'Я сохраняю оптимизм даже в трудные времена',
      'Я умею находить решения в сложных ситуациях',
      'У меня есть надежная сеть поддержки (друзья, семья)',
      'Я уверен в своих способностях преодолевать препятствия',
      'Я контролирую свои эмоциональные реакции в стрессе'
    ]
  }
};
