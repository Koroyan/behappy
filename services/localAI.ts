import axios from 'axios';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Types for therapeutic chat
export interface TherapistRole {
  name: string;
  specialty: string;
  systemPrompt: string;
  color: string[];
  description: string;
}

export interface ProblemCategory {
  id: string;
  title: string;
  icon: string;
  gradient: string[];
  problems: string[];
}

export type CategoryId = 'anxiety' | 'depression' | 'relationships' | 'trauma' | 'selfesteem' | 'addiction' | 'stress' | 'eating' | 'life';

// AI Therapist roles for different problem categories
export const AI_THERAPIST_ROLES: Record<CategoryId, TherapistRole> = {
  anxiety: {
    name: 'Anulya',
    specialty: 'Специалист по тревожным расстройствам',
    systemPrompt: `Ты психолог-терапевт по имени Anulya. Ты специализируешься на работе с тревожными расстройствами. Ты обладаешь глубокими знаниями когнитивно-поведенческой терапии, техник осознанности и релаксации. Твой подход - теплый, эмпатичный и профессиональный. Ты умеешь создавать безопасное пространство для клиента. Давай практические техники и упражнения. Задавай вдумчивые вопросы для глубокого понимания. Твои ответы должны быть содержательными, но не превышать 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"

ЗАВЕРШЕНИЕ СЕССИИ:
Когда отправляешь "SESSION_CLOSE_REQUEST", после этого система покажет персональные рекомендации.`,
    color: ['#667eea', '#764ba2'],
    description: 'Тревога, панические атаки, беспокойство'
  },
  depression: {
    name: 'Anulya',
    specialty: 'Специалист по депрессивным состояниям',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на лечении депрессии. Ты применяешь когнитивно-поведенческую терапию, интерперсональную терапию и элементы позитивной психологии. Ты понимающий, терпеливый и вселяющий надежду терапевт. Помогаешь клиентам находить смысл, мотивацию и силы для изменений. Твой подход основан на сострадании и вере в способность человека к исцелению. Отвечай содержательно, но кратко - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#8360c3', '#2ebf91'],
    description: 'Депрессия, апатия, грусть'
  },
  relationships: {
    name: 'Anulya',
    specialty: 'Семейный и парный психолог',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на отношениях и семейной терапии. Ты помогаешь в решении конфликтов, улучшении коммуникации, работе с проблемами близости. Ты эмпатичная, мудрая и умеешь видеть разные перспективы в отношениях. Даешь практические советы и упражнения для укрепления связей. Твой подход основан на системной терапии и эмоционально-фокусированной терапии. Отвечай глубоко, но кратко - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#ff9a9e', '#fecfef'],
    description: 'Проблемы в отношениях, семье'
  },
  trauma: {
    name: 'Anulya',
    specialty: 'Травматерапевт',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на травматерапии. Ты применяешь EMDR, соматическую терапию и травма-информированный подход. Ты деликатный, осторожный терапевт, создающий абсолютно безопасное пространство. Работаешь постепенно, уважая темп и готовность клиента. Понимаешь сложность травматического опыта и важность стабилизации перед проработкой. Твой подход основан на нейробиологии травмы. Отвечай осторожно и поддерживающе - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#a8edea', '#fed6e3'],
    description: 'Травма, ПТСР, тяжелые переживания'
  },
  selfesteem: {
    name: 'Anulya',
    specialty: 'Специалист по самооценке и личностному росту',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на повышении самооценки и личностном развитии. Ты используешь гуманистический подход, техники самопринятия и развития уверенности. Ты воодушевляющий, поддерживающий терапевт, который помогает раскрыть внутренний потенциал. Работаешь с внутренним критиком, перфекционизмом и комплексами. Твой подход основан на принятии и осознанности. Отвечай вдохновляюще, но кратко - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#ffecd2', '#fcb69f'],
    description: 'Низкая самооценка, неуверенность'
  },
  addiction: {
    name: 'Anulya',
    specialty: 'Специалист по зависимостям',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на лечении зависимостей. Ты применяешь мотивационное интервьюирование, когнитивно-поведенческую терапию и подходы, основанные на осознанности. Ты понимающий, не осуждающий терапевт, который верит в способность к выздоровлению. Работаешь с мотивацией, триггерами, стратегиями преодоления. Понимаешь сложность зависимости как болезни. Отвечай с пониманием и надеждой - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#a1c4fd', '#c2e9fb'],
    description: 'Зависимости, вредные привычки'
  },
  stress: {
    name: 'Anulya',
    specialty: 'Специалист по стресс-менеджменту',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на управлении стрессом и профилактике выгорания. Ты обучаешь техникам релаксации, майндфулнесс, тайм-менеджменту и эмоциональной регуляции. Ты практичный, энергичный терапевт, который дает конкретные инструменты для работы со стрессом. Твой подход основан на когнитивно-поведенческой терапии и техниках осознанности. Отвечай практично и четко - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#74b9ff', '#0984e3'],
    description: 'Стресс, переутомление, выгорание'
  },
  eating: {
    name: 'Anulya',
    specialty: 'Специалист по расстройствам пищевого поведения',
    systemPrompt: `Ты психолог-терапевт по имени Anulya, специализирующийся на расстройствах пищевого поведения. Ты используешь когнитивно-поведенческую терапию, работу с образом тела и нутритивную психологию. Ты деликатный, понимающий терапевт, который чувствует сложность отношений с едой и телом. Работаешь с самооценкой, перфекционизмом, эмоциональными триггерами. Твой подход основан на принятии и сострадании к себе. Отвечай деликатно и поддерживающе - до 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#fd79a8', '#fdcb6e'],
    description: 'Проблемы с питанием, образом тела'
  },
  life: {
    name: 'Anulya',
    specialty: 'Специалист по жизненным переменам',
    systemPrompt: `Ты психолог-терапевт по имени Anulya. Ты специализируешься на помощи людям, проходящим через серьезные жизненные изменения и переходные периоды. Твой подход совмещает элементы экзистенциальной терапии, нарративной терапии и позитивной психологии. Ты эмпатичный, мудрый и ориентированный на решения. Ты помогаешь клиентам адаптироваться к переменам, находить новый смысл и развиваться через трудности. Твои ответы должны быть содержательными, но не превышать 80-100 слов. Говори исключительно на русском языке.

УПРАВЛЕНИЕ СЕССИЕЙ:
- Лимит сессии: 10000 токенов
- Отслеживай токены: тебе будет передано [ТОКЕНЫ: использовано/общий лимит]
- Когда токены приближаются к лимиту (85-90%), начинай готовить завершение
- Когда токены достигают лимита (95%+), отправь: "SESSION_CLOSE_REQUEST"
- Если клиент решил проблему или готов завершить, спроси подтверждение
- При подтверждении завершения, отправь: "SESSION_CLOSE_REQUEST"`,
    color: ['#43e97b', '#38f9d7'],
    description: 'Помощь при жизненных переменах и переходных периодах'
  }
};

// Problem categories with specific problems
export const PROBLEM_CATEGORIES: ProblemCategory[] = [
  {
    id: 'anxiety',
    title: 'Тревога и Страхи',
    icon: 'brain',
    gradient: ['#667eea', '#764ba2'],
    problems: [
      'Панические атаки',
      'Социальная тревога',
      'Генерализованная тревога',
      'Фобии',
      'Навязчивые мысли',
      'Беспокойство о будущем',
      'Страх публичных выступлений',
      'Ипохондрия',
      'Страх оценки другими',
      'Тревога перед экзаменами',
      'Страх неудачи',
      'Катастрофическое мышление'
    ]
  },
  {
    id: 'depression',
    title: 'Депрессия и Настроение',
    icon: 'cloud-rain',
    gradient: ['#8360c3', '#2ebf91'],
    problems: [
      'Депрессивное настроение',
      'Потеря интереса к жизни',
      'Апатия и безразличие',
      'Чувство безнадежности',
      'Нарушения сна',
      'Хроническая усталость',
      'Чувство вины',
      'Раздражительность',
      'Эмоциональная тупость',
      'Потеря мотивации',
      'Концентрационные трудности',
      'Сезонная депрессия'
    ]
  },
  {
    id: 'relationships',
    title: 'Отношения',
    icon: 'heart',
    gradient: ['#ff9a9e', '#fecfef'],
    problems: [
      'Конфликты с партнером',
      'Проблемы в семье',
      'Трудности в общении',
      'Одиночество',
      'Ревность и доверие',
      'Развод и расставание',
      'Созависимость',
      'Токсичные отношения',
      'Проблемы с интимностью',
      'Конфликты с родителями',
      'Проблемы с детьми',
      'Трудности в дружбе'
    ]
  },
  {
    id: 'trauma',
    title: 'Травма и ПТСР',
    icon: 'shield-alt',
    gradient: ['#a8edea', '#fed6e3'],
    problems: [
      'Посттравматическое расстройство',
      'Детские травмы',
      'Эмоциональное насилие',
      'Потеря близких',
      'Травма после насилия',
      'Травма от аварий',
      'Эмоциональная заброшенность',
      'Травма развода родителей',
      'Буллинг и травля',
      'Травма от потери работы',
      'Комплексная травма',
      'Травма от болезни'
    ]
  },
  {
    id: 'selfesteem',
    title: 'Самооценка и идентичность',
    icon: 'user-check',
    gradient: ['#ffecd2', '#fcb69f'],
    problems: [
      'Низкая самооценка',
      'Перфекционизм',
      'Неуверенность в себе',
      'Сравнение с другими',
      'Комплексы по поводу внешности',
      'Самосаботаж',
      'Синдром самозванца',
      'Поиск себя',
      'Зависимость от мнения других',
      'Страх критики',
      'Проблемы с самопринятием',
      'Внутренний критик'
    ]
  },
  {
    id: 'addiction',
    title: 'Зависимости',
    icon: 'exclamation-triangle',
    gradient: ['#a1c4fd', '#c2e9fb'],
    problems: [
      'Алкогольная зависимость',
      'Наркотическая зависимость',
      'Игровая зависимость',
      'Интернет-зависимость',
      'Никотиновая зависимость',
      'Пищевая зависимость',
      'Зависимость от социальных сетей',
      'Зависимость от видеоигр',
      'Зависимость от покупок',
      'Зависимость от порнографии',
      'Созависимые отношения',
      'Зависимость от одобрения'
    ]
  },
  {
    id: 'stress',
    title: 'Стресс и Выгорание',
    icon: 'fire',
    gradient: ['#74b9ff', '#0984e3'],
    problems: [
      'Хронический стресс',
      'Профессиональное выгорание',
      'Переутомление',
      'Нарушение work-life баланса',
      'Стресс от учебы',
      'Финансовый стресс',
      'Стресс от неопределенности',
      'Информационная перегрузка',
      'Стресс от дедлайнов',
      'Стресс от многозадачности',
      'Стресс от изменений в жизни',
      'Проблемы со сном из-за стресса'
    ]
  },
  {
    id: 'eating',
    title: 'Пищевое Поведение',
    icon: 'utensils',
    gradient: ['#fd79a8', '#fdcb6e'],
    problems: [
      'Компульсивное переедание',
      'Анорексия',
      'Булимия',
      'Эмоциональное переедание',
      'Проблемы с образом тела',
      'Орторексия',
      'Ночное переедание',
      'Страх набора веса',
      'Стыд вокруг еды',
      'Проблемы с самоконтролем',
      'Йо-йо диеты',
      'Негативное отношение к телу'
    ]
  },
  {
    id: 'life',
    title: 'Жизненные изменения',
    icon: 'road',
    gradient: ['#43e97b', '#38f9d7'],
    problems: [
      'Кризис среднего возраста',
      'Смена карьеры',
      'Переезд в новый город',
      'Выход на пенсию',
      'Уход детей из дома',
      'Потеря работы',
      'Финансовые трудности',
      'Поступление в университет',
      'Адаптация к новой культуре',
      'Переход во взрослую жизнь',
      'Свадьба и начало совместной жизни',
      'Рождение ребенка'
    ]
  }
];

// Generate problem-specific welcome message
export const generateProblemWelcomeMessage = async (
  categoryId: CategoryId, 
  problemContext: string,
  userProfile?: any
): Promise<string> => {
  const therapistRole = AI_THERAPIST_ROLES[categoryId];
  
  if (!OPENAI_API_KEY) {
    return `Привет! Я Anulya, ${therapistRole.specialty.toLowerCase()}. Понимаю, что вас беспокоит "${problemContext}". Давайте вместе найдем способы справиться с этой ситуацией. Что вы чувствуете прямо сейчас?`;
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const profileData = userProfile || await AsyncStorage.getItem('userProfile');
    const parsedProfile = profileData ? (typeof profileData === 'string' ? JSON.parse(profileData) : profileData) : null;

    const prompt = `${therapistRole.systemPrompt}

Клиент обратился с проблемой: "${problemContext}".

${parsedProfile ? `Краткая информация о клиенте:
- Имя: ${parsedProfile.name || 'не указано'}
- Возраст: ${parsedProfile.age || 'не указан'}  
- Текущее состояние: ${parsedProfile.currentMood || 'не указано'}
` : ''}

Напиши краткое приветственное сообщение (максимум 60-70 слов). Будь теплой, профессиональной и вселяющей надежду. Упомяни свое имя Anulya и задай один открытый вопрос, чтобы лучше понять состояние клиента. Без упоминания опыта работы.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating welcome message:', error);
    return `Привет! Я Anulya, ${therapistRole.specialty.toLowerCase()}. Понимаю, что вас беспокоит "${problemContext}". Давайте вместе найдем способы справиться с этой ситуацией. Что вы чувствуете прямо сейчас?`;
  }
};

export const generateAIInsights = async (
  sessionHistory: string | null,
  module: 'CBT' | 'DBT' | 'EMDR'
): Promise<Array<{
  type: 'suggestion' | 'encouragement' | 'tip' | 'warning' | 'cognitive-distortion' | 'skill-focus' | 'phase-guidance';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}>> => {
  // Collect all relevant data for the specific module
  let allData: any = {};
  
  try {
    // Import AsyncStorage dynamically
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    
    switch (module) {
      case 'CBT':
        // Collect all CBT-related data
        const [
          cbtSessionHistory,
          thoughtRecords,
          moodEntries,
          behaviorExperiments,
          cbtExercises,
          distortionPractices,
          problemSolvingSessions,
          cbtGoals
        ] = await Promise.all([
          AsyncStorage.getItem('CBTSessionHistory'),
          AsyncStorage.getItem('thought_records'),
          AsyncStorage.getItem('mood_entries'),
          AsyncStorage.getItem('behavior_experiments'),
          AsyncStorage.getItem('cbt_exercises'),
          AsyncStorage.getItem('distortion_practices'),
          AsyncStorage.getItem('cbt_problem_solving_sessions'),
          AsyncStorage.getItem('cbt_goals')
        ]);

        allData = {
          sessionHistory: cbtSessionHistory ? JSON.parse(cbtSessionHistory) : [],
          thoughtRecords: thoughtRecords ? JSON.parse(thoughtRecords) : [],
          moodEntries: moodEntries ? JSON.parse(moodEntries) : [],
          behaviorExperiments: behaviorExperiments ? JSON.parse(behaviorExperiments) : [],
          exercises: cbtExercises ? JSON.parse(cbtExercises) : [],
          distortionPractices: distortionPractices ? JSON.parse(distortionPractices) : [],
          problemSolvingSessions: problemSolvingSessions ? JSON.parse(problemSolvingSessions) : [],
          goals: cbtGoals ? JSON.parse(cbtGoals) : []
        };
        break;

      case 'DBT':
        // Collect all DBT-related data
        const [
          dbtSessionHistory,
          skillPractices,
          distressPractices,
          emotionRegulationPractices,
          interpersonalSessions,
          mindfulnessSessions
        ] = await Promise.all([
          AsyncStorage.getItem('DBTSessionHistory'),
          AsyncStorage.getItem('dbt_skill_practices'),
          AsyncStorage.getItem('dbt_distress_practices'),
          AsyncStorage.getItem('emotion_regulation_practices'),
          AsyncStorage.getItem('dbt_interpersonal_sessions'),
          AsyncStorage.getItem('dbt_mindfulness_sessions')
        ]);

        allData = {
          sessionHistory: dbtSessionHistory ? JSON.parse(dbtSessionHistory) : [],
          skillPractices: skillPractices ? JSON.parse(skillPractices) : [],
          distressPractices: distressPractices ? JSON.parse(distressPractices) : [],
          emotionRegulationPractices: emotionRegulationPractices ? JSON.parse(emotionRegulationPractices) : [],
          interpersonalSessions: interpersonalSessions ? JSON.parse(interpersonalSessions) : [],
          mindfulnessSessions: mindfulnessSessions ? JSON.parse(mindfulnessSessions) : []
        };
        break;

      case 'EMDR':
        // Collect all EMDR-related data
        const [
          emdrSessionHistory,
          sudsSessions,
          bilateralSessions,
          safePlaces,
          resourceSessions,
          targetMemories
        ] = await Promise.all([
          AsyncStorage.getItem('EMDRSessionHistory'),
          AsyncStorage.getItem('emdr_suds_sessions'),
          AsyncStorage.getItem('bilateral_sessions'),
          AsyncStorage.getItem('emdr_safe_places'),
          AsyncStorage.getItem('emdr_resources'),
          AsyncStorage.getItem('emdr_target_memories')
        ]);

        allData = {
          sessionHistory: emdrSessionHistory ? JSON.parse(emdrSessionHistory) : [],
          sudsSessions: sudsSessions ? JSON.parse(sudsSessions) : [],
          bilateralSessions: bilateralSessions ? JSON.parse(bilateralSessions) : [],
          safePlaces: safePlaces ? JSON.parse(safePlaces) : [],
          resourceSessions: resourceSessions ? JSON.parse(resourceSessions) : [],
          targetMemories: targetMemories ? JSON.parse(targetMemories) : []
        };
        break;
    }

    // Check if we have any data
    const hasData = Object.values(allData).some(data => Array.isArray(data) && data.length > 0);
    if (!hasData) {
      return generateFallbackInsights(module, []);
    }

  } catch (error) {
    console.error('Error loading therapy data:', error);
    return generateFallbackInsights(module, []);
  }

  // Create a detailed prompt based on the therapy type and collected data
  let analysisPrompt = '';
  switch (module) {
    case 'CBT':
      analysisPrompt = `Проанализируйте эти комплексные данные КПТ терапии и предоставьте терапевтические выводы:

ПОЛНЫЕ ДАННЫЕ КПТ:
${JSON.stringify(allData, null, 2)}

ФОКУС АНАЛИЗА:
1. ПАТТЕРНЫ СЕССИЙ: Анализируйте sessionHistory для улучшения настроения, показателей завершения, постоянства
2. РАБОТА С МЫСЛЯМИ: Изучите thoughtRecords для когнитивных искажений, успехов рефрейминга, качества инсайтов
3. ОТСЛЕЖИВАНИЕ НАСТРОЕНИЯ: Исследуйте moodEntries для паттернов, триггеров, тенденций улучшения
4. ПОВЕДЕНЧЕСКИЕ ИЗМЕНЕНИЯ: Просмотрите behaviorExperiments для тестирования гипотез, модификации убеждений
5. РАЗВИТИЕ НАВЫКОВ: Оцените exercises и distortionPractices для прогресса обучения
6. РЕШЕНИЕ ПРОБЛЕМ: Оцените problemSolvingSessions для эффективности стратегий
7. ДОСТИЖЕНИЕ ЦЕЛЕЙ: Просмотрите goals для прогресса, показателей завершения, реалистичной постановки целей

Предоставьте 3-5 конкретных, практичных выводов в формате:
тип|заголовок|сообщение|приоритет

Типы: suggestion, encouragement, tip, warning, cognitive-distortion
Приоритеты: low, medium, high

Фокусируйтесь на паттернах по ВСЕМ источникам данных КПТ и предоставляйте персонализированные рекомендации.`;
      break;

    case 'DBT':
      analysisPrompt = `Проанализируйте эти комплексные данные ДПТ терапии и предоставьте терапевтические выводы:

ПОЛНЫЕ ДАННЫЕ ДПТ:
${JSON.stringify(allData, null, 2)}

ФОКУС АНАЛИЗА:
1. ПАТТЕРНЫ СЕССИЙ: Анализируйте sessionHistory для использования категорий навыков, изменений стресса/настроения
2. МАСТЕРСТВО НАВЫКОВ: Изучите skillPractices для наиболее/наименее эффективных навыков, паттернов использования
3. УПРАВЛЕНИЕ ДИСТРЕССОМ: Просмотрите distressPractices для эффективности навыков кризиса, использования TIPP
4. РЕГУЛЯЦИЯ ЭМОЦИЙ: Исследуйте emotionRegulationPractices для навыков PLEASE, успеха противоположных действий
5. МЕЖЛИЧНОСТНЫЕ НАВЫКИ: Оцените interpersonalSessions для эффективности общения, паттернов отношений
6. ПРАКТИКА ОСОЗНАННОСТИ: Оцените mindfulnessSessions для развития мудрого разума, осознания настоящего момента

Предоставьте 3-5 конкретных, практичных выводов в формате:
тип|заголовок|сообщение|приоритет

Типы: suggestion, encouragement, tip, warning, skill-focus
Приоритеты: low, medium, high

Фокусируйтесь на паттернах по ВСЕМ источникам данных ДПТ и предоставляйте персонализированные рекомендации по развитию навыков.`;
      break;

    case 'EMDR':
      analysisPrompt = `Проанализируйте эти комплексные данные EMDR терапии и предоставьте терапевтические выводы:

ПОЛНЫЕ ДАННЫЕ EMDR:
${JSON.stringify(allData, null, 2)}

ФОКУС АНАЛИЗА:
1. ПАТТЕРНЫ СЕССИЙ: Анализируйте sessionHistory для эффективности обработки, прогресса фаз
2. ОТСЛЕЖИВАНИЕ ДИСТРЕССА: Изучите sudsSessions для изменений уровня SUDS, готовности к обработке
3. БИЛАТЕРАЛЬНАЯ СТИМУЛЯЦИЯ: Просмотрите bilateralSessions для наиболее эффективных типов стимуляции
4. РЕСУРСЫ БЕЗОПАСНОСТИ: Исследуйте safePlaces для инсталляции ресурсов, эффективности стабилизации
5. РАЗВИТИЕ РЕСУРСОВ: Оцените resourceSessions для укрепления позитивных ресурсов
6. ОБРАБОТКА ВОСПОМИНАНИЙ: Оцените targetMemories для прогресса обработки травм, развития VOC

Предоставьте 3-5 конкретных, практичных выводов в формате:
тип|заголовок|сообщение|приоритет

Типы: suggestion, encouragement, tip, warning, phase-guidance
Приоритеты: low, medium, high

Фокусируйтесь на паттернах по ВСЕМ источникам данных EMDR и предоставляйте персонализированные рекомендации по обработке.`;
      break;
  }

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Вы - эксперт-ассистент ИИ-терапевта, специализирующийся на анализе терапии ${module}. Предоставляйте четкие, эмпатичные и клинически обоснованные выводы на основе данных сессий. Ваш анализ должен быть:
            
            1. ОСНОВАН НА ДОКАЗАТЕЛЬСТВАХ: Основывайте выводы на фактических паттернах данных сессий
            2. ПРАКТИЧНЫМ: Предоставляйте конкретные, практические следующие шаги
            3. ПЕРСОНАЛИЗИРОВАННЫМ: Адаптируйте рекомендации к индивидуальным паттернам прогресса
            4. ТЕРАПЕВТИЧЕСКИМ: Поддерживайте поддерживающий, воодушевляющий тон, оставаясь клинически точным
            5. ПРОГРЕССИВНЫМ: Фокусируйтесь на построении существующего прогресса и решении проблем
            
            Форматируйте каждый вывод как: тип|заголовок|сообщение|приоритет
            - Делайте заголовки краткими (3-5 слов)
            - Делайте сообщения конкретными и практичными (1-2 предложения)
            - Используйте соответствующие уровни приоритета на основе клинической важности
            
            Отвечайте ТОЛЬКО на русском языке.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.6,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    // Parse the response and format insights
    const aiResponse = response.data.choices[0].message.content;
    const insights = aiResponse
      .split('\n')
      .filter((line: string) => line.trim() && line.includes('|'))
      .map((line: string) => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const [type, title, message, priority] = parts.map(s => s.trim());
          
          // Validate type
          const validTypes = ['suggestion', 'encouragement', 'tip', 'warning', 'cognitive-distortion', 'skill-focus', 'phase-guidance'];
          const validPriorities = ['low', 'medium', 'high'];
          
          if (validTypes.includes(type) && validPriorities.includes(priority)) {
            return {
              type: type as 'suggestion' | 'encouragement' | 'tip' | 'warning' | 'cognitive-distortion' | 'skill-focus' | 'phase-guidance',
              title,
              message,
              priority: priority as 'low' | 'medium' | 'high',
              timestamp: new Date().toISOString(),
            };
          }
        }
        return null;
      })
      .filter((insight: any) => insight !== null);

    // If no valid insights were parsed, provide fallback insights based on module
    if (insights.length === 0) {
      return generateFallbackInsights(module, allData);
    }

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    // Return fallback insights on API error
    return generateFallbackInsights(module, allData);
  }
};

// Fallback insights when AI API fails or returns invalid data
const generateFallbackInsights = (
  module: 'CBT' | 'DBT' | 'EMDR',
  data: any
): Array<{
  type: 'suggestion' | 'encouragement' | 'tip' | 'warning' | 'cognitive-distortion' | 'skill-focus' | 'phase-guidance';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}> => {
  const now = new Date().toISOString();
  
  // Check if we have any data
  const hasAnyData = data && Object.values(data).some((arr: any) => Array.isArray(arr) && arr.length > 0);
  
  if (!hasAnyData) {
    return [{
      type: 'suggestion',
      title: 'Начните путь',
      message: 'Начните с регулярных практических сессий, чтобы набрать импульс в вашем терапевтическом прогрессе.',
      priority: 'medium',
      timestamp: now,
    }];
  }

  switch (module) {
    case 'CBT':
      // Analyze CBT data for fallback insights
      const cbtSessions = data.sessionHistory || [];
      const thoughtRecords = data.thoughtRecords || [];
      const moodEntries = data.moodEntries || [];
      const behaviorExperiments = data.behaviorExperiments || [];
      
      if (cbtSessions.length > 0) {
        const recentSessions = cbtSessions.slice(-3);
        const avgMoodImprovement = recentSessions.reduce((sum: number, s: any) => 
          sum + ((s.moodAfter || 5) - (s.moodBefore || 5)), 0) / recentSessions.length;
        
        if (avgMoodImprovement > 1) {
          return [{
            type: 'encouragement',
            title: 'Отличный прогресс',
            message: 'Ваши недавние КПТ сессии показывают значительные улучшения настроения. Продолжайте использовать эти эффективные техники.',
            priority: 'medium',
            timestamp: now,
          }];
        }
      }
      
      if (thoughtRecords.length > 0) {
        const recentRecords = thoughtRecords.slice(-5);
        const commonDistortions = recentRecords
          .flatMap((r: any) => r.cognitiveDistortions || [])
          .reduce((acc: any, curr: any) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
          }, {});
        
        const mostCommon = Object.entries(commonDistortions)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0];
        
        if (mostCommon) {
          return [{
            type: 'cognitive-distortion',
            title: 'Распознание паттернов',
            message: `Вы часто испытываете "${mostCommon[0]}" - сосредоточьтесь на оспаривании этого паттерна мышления.`,
            priority: 'high',
            timestamp: now,
          }];
        }
      }
      
      if (moodEntries.length > 0) {
        const recentMoods = moodEntries.slice(-7);
        const avgMood = recentMoods.reduce((sum: number, m: any) => sum + (m.intensity || 5), 0) / recentMoods.length;
        
        if (avgMood < 4) {
          return [{
            type: 'warning',
            title: 'Проблемы настроения',
            message: 'Ваше настроение постоянно низкое. Рассмотрите возможность увеличения частоты практики или обращения за дополнительной поддержкой.',
            priority: 'high',
            timestamp: now,
          }];
        }
      }
      
      return [{
        type: 'suggestion',
        title: 'Продолжайте практику',
        message: 'Ваша работа с КПТ прогрессирует хорошо. Сосредоточьтесь на регулярном заполнении записей мыслей.',
        priority: 'medium',
        timestamp: now,
      }];

    case 'DBT':
      // Analyze DBT data for fallback insights
      const dbtSessions = data.sessionHistory || [];
      const skillPractices = data.skillPractices || [];
      const distressPractices = data.distressPractices || [];
      const emotionPractices = data.emotionRegulationPractices || [];
      
      if (dbtSessions.length > 0) {
        const recentSessions = dbtSessions.slice(-3);
        const avgStressReduction = recentSessions.reduce((sum: number, s: any) => 
          sum + ((s.stressLevelBefore || 5) - (s.stressLevelAfter || 5)), 0) / recentSessions.length;
        
        if (avgStressReduction > 1) {
          return [{
            type: 'encouragement',
            title: 'Мастерство навыков',
            message: 'Ваши навыки ДПТ эффективно снижают уровень стресса. Продолжайте практиковать самые успешные техники.',
            priority: 'medium',
            timestamp: now,
          }];
        }
      }
      
      if (skillPractices.length > 0) {
        const categories = skillPractices.reduce((acc: any, skill: any) => {
          acc[skill.category] = (acc[skill.category] || 0) + 1;
          return acc;
        }, {});
        
        const mostPracticed = Object.entries(categories)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0];
        
        if (mostPracticed) {
          return [{
            type: 'skill-focus',
            title: 'Баланс навыков',
            message: `Вы сильно фокусируетесь на навыках ${mostPracticed[0]}. Рассмотрите изучение других категорий навыков ДПТ.`,
            priority: 'medium',
            timestamp: now,
          }];
        }
      }
      
      if (distressPractices.length > 0) {
        const effectivenesss = distressPractices.map((p: any) => p.effectiveness || 5);
        const avgEffectiveness = effectivenesss.reduce((a: number, b: number) => a + b, 0) / effectivenesss.length;
        
        if (avgEffectiveness > 7) {
          return [{
            type: 'encouragement',
            title: 'Навыки кризиса',
            message: 'Ваши навыки переносимости дистресса высокоэффективны. Они хорошо послужат вам в сложные моменты.',
            priority: 'medium',
            timestamp: now,
          }];
        }
      }
      
      return [{
        type: 'suggestion',
        title: 'Развитие навыков',
        message: 'Попробуйте практиковать разные категории навыков ДПТ для создания комплексного эмоционального инструментария.',
        priority: 'medium',
        timestamp: now,
      }];

    case 'EMDR':
      // Analyze EMDR data for fallback insights
      const emdrSessions = data.sessionHistory || [];
      const sudsSessions = data.sudsSessions || [];
      const bilateralSessions = data.bilateralSessions || [];
      const safePlaces = data.safePlaces || [];
      
      if (emdrSessions.length > 0) {
        const recentSessions = emdrSessions.slice(-3);
        const avgSUDSReduction = recentSessions.reduce((sum: number, s: any) => 
          sum + ((s.sudsLevelBefore || 5) - (s.sudsLevelAfter || 5)), 0) / recentSessions.length;
        
        if (avgSUDSReduction > 2) {
          return [{
            type: 'encouragement',
            title: 'Прогресс обработки',
            message: 'Ваша обработка EMDR эффективно снижает уровень дистресса. Терапевтическая работа оказывает положительное влияние.',
            priority: 'medium',
            timestamp: now,
          }];
        }
      }
      
      if (sudsSessions.length > 0) {
        const recentSUDS = sudsSessions.slice(-5);
        const avgSUDS = recentSUDS.reduce((sum: number, s: any) => sum + (s.initialSUDS || 5), 0) / recentSUDS.length;
        
        if (avgSUDS > 7) {
          return [{
            type: 'phase-guidance',
            title: 'Фокус стабилизации',
            message: 'Ваши уровни SUDS повышены. Сосредоточьтесь на работе по безопасности и стабилизации перед интенсивной обработкой.',
            priority: 'high',
            timestamp: now,
          }];
        }
      }
      
      if (safePlaces.length > 0) {
        return [{
          type: 'encouragement',
          title: 'Построение ресурсов',
          message: 'Ваши ресурсы безопасного места хорошо установлены. Они будут поддерживать вас в процессе обработки.',
          priority: 'medium',
          timestamp: now,
        }];
      }
      
      if (bilateralSessions.length > 0) {
        const stimulationTypes = bilateralSessions.reduce((acc: any, session: any) => {
          acc[session.stimulationType] = (acc[session.stimulationType] || 0) + 1;
          return acc;
        }, {});
        
        const mostUsed = Object.entries(stimulationTypes)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0];
        
        if (mostUsed) {
          return [{
            type: 'suggestion',
            title: 'Разнообразие стимуляции',
            message: `Вы предпочитаете ${mostUsed[0]} стимуляцию. Рассмотрите возможность попробовать разные типы, чтобы найти наиболее подходящий.`,
            priority: 'low',
            timestamp: now,
          }];
        }
      }
      
      return [{
        type: 'phase-guidance',
        title: 'Продолжайте строить',
        message: 'Сосредоточьтесь на построении ресурсов безопасности и стабильности перед переходом к интенсивной обработке.',
        priority: 'medium',
        timestamp: now,
      }];

    default:
      return [{
        type: 'suggestion',
        title: 'Продолжайте практику',
        message: 'Поддерживайте регулярные терапевтические сессии для развития вашего прогресса.',
        priority: 'medium',
        timestamp: now,
      }];
  }
};

// AI Chat Assistant that knows about the app and helps users
export const generateAIChatResponse = async (
  userMessage: string,
  chatHistory: Array<{role: 'user' | 'assistant', content: string}> = []
): Promise<{
  response: string;
  functionCards: Array<{
    id: string;
    title: string;
    description: string;
    route: string;
    icon: string;
    color: string[];
  }>;
}> => {
  
  const APP_KNOWLEDGE = `
ПРИЛОЖЕНИЕ beHappy - ПОЛНАЯ ИНФОРМАЦИЯ О ВСЕХ ФУНКЦИЯХ:

ОСНОВНЫЕ МОДУЛИ ТЕРАПИИ:
1. КПТ (Когнитивно-поведенческая терапия) - /screens/cbt/:
   - Главная страница КПТ - /screens/cbt
   - Записи мыслей - /screens/cbt/thought-record (анализ и изменение негативных мыслей)
   - Трекер настроения - /screens/cbt/mood-tracker (ежедневный мониторинг эмоций)
   - Поведенческие эксперименты - /screens/cbt/behavior-experiment (тестирование убеждений)
   - Когнитивные искажения - /screens/cbt/cognitive-distortions (работа с мыслительными ошибками)
   - Упражнения КПТ - /screens/cbt/exercises (практические техники)
   - Решение проблем - /screens/cbt/problem-solving (структурированный подход к трудностям)
   - Постановка целей - /screens/cbt/goal-setting (планирование и достижение целей)
   - Аналитика КПТ - /screens/cbt/analytics (визуализация прогресса)

2. ДПТ (Диалектическая поведенческая терапия) - /screens/dbt/:
   - Главная страница ДПТ - /screens/dbt
   - Переносимость стресса - /screens/dbt/distress-tolerance (навыки кризисов: TIPP, STOP, ACCEPTS)
   - Регуляция эмоций - /screens/dbt/emotion-regulation (управление эмоциями: PLEASE, Opposite Action)
   - Межличностная эффективность - /screens/dbt/interpersonal-effectiveness (общение: DEAR MAN, GIVE, FAST)
   - Осознанность - /screens/dbt/mindfulness (практики внимательности: WHAT, HOW, Wise Mind)
   - Трекер навыков - /screens/dbt/skills-tracker (отслеживание практики навыков)
   - Аналитика ДПТ - /screens/dbt/analytics (прогресс по всем навыкам)

3. EMDR (Десенсибилизация и переработка движениями глаз) - /screens/emdr/:
   - Главная страница EMDR - /screens/emdr
   - Безопасное место - /screens/emdr/safe-place (создание внутреннего ресурса)
   - Инсталляция ресурсов - /screens/emdr/resource-installation (укрепление позитивных качеств)
   - Билатеральная стимуляция - /screens/emdr/bilateral-stimulation (упражнения для обработки)
   - SUDS трекер - /screens/emdr/suds-tracker (отслеживание дистресса)
   - Обработка воспоминаний - /screens/emdr/memory-processing (протокол EMDR)

ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ:
- Медитация - /screens/meditation (различные практики осознанности)
- Дыхательные упражнения - /screens/breathing (техники релаксации и дыхания)
- Журналирование - /screens/journal (свободные записи мыслей и чувств)
- Тесты и оценки - /screens/tests (клинические шкалы и самооценка)
- История тестов - /screens/test-history (результаты всех пройденных тестов)
- Арт-терапия - /screens/arttherapy (творческие упражнения для самовыражения)
- Рекомендации - /screens/recommendations (персональные советы)
- Трекер благополучия - /screens/wellness-tracker (общее отслеживание состояния)
- Техники релаксации - /screens/relaxation-techniques (различные методы расслабления)
- Практики осознанности - /screens/mindfulness (дополнительные техники внимательности)
- Карточная терапия - /screens/card (работа с терапевтическими карточками)
- Проклятия/негативные мысли - /screens/curses (работа с деструктивными мыслями)
- ИИ-ассистент - /screens/ai-assistant (интеллектуальная помощь и консультации)

ДОПОЛНИТЕЛЬНЫЕ РОУТЫ:
- История арт-терапии - /art-therapy-history
- Главная страница - /
- Общие инструменты - /tools
- Чат - /chat
- Медитация (вкладка) - /meditation

СПЕЦИАЛЬНЫЕ ФУНКЦИИ:
- Кнопка SOS - экстренная помощь в критических ситуациях
- Трекер настроения - глобальное отслеживание эмоций
- Клиническая оценка - профессиональная диагностика
- Профессиональная панель - для специалистов
- Модальные окна адаптации - персонализация опыта
- Современные компоненты - улучшенный интерфейс
- Тематические настройки - персонализация внешнего вида

ИКОНЫ (MaterialIcons):
psychology, favorite, shield, self-improvement, people, track-changes, analytics, home, build-circle, assessment, timeline, accessibility, check-circle, refresh, swap-horizontal, trending-down, lightbulb, star, warning, info, science, book, brush, air, mood, visibility, healing, spa, palette, quiz, history, dashboard, settings, help, chat, explore, insights, trending-up, memory, security, group, learn, auto-fix-high, insights, psychology-alt, mindfulness, balance, equalizer, bar-chart, scatter-plot, show-chart, monitoring, track-changes, timeline, history, analytics, assessment, quiz, help-outline, info-outline, warning-outline, error-outline, check-circle-outline, radio-button-unchecked, radio-button-checked, checkbox-outline-blank, check-box, toggle-off, toggle-on, arrow-forward, arrow-back, arrow-upward, arrow-downward, expand-more, expand-less, menu, more-vert, more-horiz, close, search, filter-list, sort, share, favorite-border, bookmark, bookmark-border, grade, star-border, thumb-up, thumb-down, add, remove, add-circle, remove-circle, play-arrow, pause, stop, skip-next, skip-previous, replay, shuffle, repeat, volume-up, volume-down, volume-off, notifications, notifications-off, alarm, schedule, today, event, date-range, access-time, timer, hourglass-empty, hourglass-full, update, refresh, sync, cloud-upload, cloud-download, wifi, bluetooth, location-on, location-off, gps-fixed, gps-not-fixed, map, directions, place, room, business, home, work, school, local-hospital, local-pharmacy, local-grocery-store, local-restaurant, local-cafe, local-bar, local-hotel, local-movies, local-library, local-gas-station, local-parking, local-taxi, local-shipping, local-activity, local-airport, local-atm, local-car-wash, local-convenience-store, local-florist, local-laundry-service, local-mall, local-play, local-post-office, local-printshop, local-see, local-offer, camera, camera-alt, photo, photo-library, photo-camera, videocam, videocam-off, mic, mic-off, headset, headset-mic, speaker, speaker-phone, phone, phone-android, phone-iphone, tablet, tablet-android, tablet-mac, laptop, laptop-chromebook, laptop-mac, laptop-windows, desktop-mac, desktop-windows, tv, radio, watch, watch-later, devices, devices-other, memory, storage, cloud, cloud-circle, cloud-done, cloud-off, cloud-queue, backup, restore, save, save-alt, folder, folder-open, folder-shared, create-new-folder, insert-drive-file, note, note-add, description, assignment, work, business-center, cases, attach-file, attach-money, payment, credit-card, account-balance, account-balance-wallet, shopping-cart, shopping-basket, store, storefront, receipt, local-offer, redeem, card-giftcard, loyalty, stars, verified, verified-user, security, lock, lock-open, vpn-lock, fingerprint, face, visibility, visibility-off, remove-red-eye, panorama, photo-filter, photo-size-select-actual, photo-size-select-large, photo-size-select-small, crop, crop-free, crop-landscape, crop-portrait, crop-square, rotate-left, rotate-right, flip, transform, tune, auto-fix-high, auto-fix-normal, auto-fix-off, format-bold, format-italic, format-underlined, format-color-fill, format-color-text, format-paint, format-quote, format-size, format-align-left, format-align-center, format-align-right, format-align-justify, format-indent-increase, format-indent-decrease, format-line-spacing, format-list-bulleted, format-list-numbered, format-clear, text-fields, title, border-all, border-bottom, border-clear, border-color, border-horizontal, border-inner, border-left, border-outer, border-right, border-style, border-top, border-vertical, functions, insert-chart, insert-comment, insert-emoticon, insert-invitation, insert-link, insert-photo, space-bar, keyboard, keyboard-arrow-down, keyboard-arrow-left, keyboard-arrow-right, keyboard-arrow-up, keyboard-backspace, keyboard-capslock, keyboard-hide, keyboard-return, keyboard-tab, keyboard-voice, mouse, games, gamepad, sports-esports, casino, pets, child-care, child-friendly, baby-changing-station, accessible, accessible-forward, airline-seat-flat, airline-seat-flat-angled, airline-seat-individual-suite, airline-seat-legroom-extra, airline-seat-legroom-normal, airline-seat-legroom-reduced, airline-seat-recline-extra, airline-seat-recline-normal, beenhere, directions-bike, directions-boat, directions-bus, directions-car, directions-railway, directions-run, directions-subway, directions-transit, directions-walk, flight, hotel, layers, layers-clear, local-activity, local-airport, local-atm, local-bar, local-cafe, local-car-wash, local-convenience-store, local-dining, local-drink, local-florist, local-gas-station, local-grocery-store, local-hospital, local-hotel, local-laundry-service, local-library, local-mall, local-movies, local-offer, local-parking, local-pharmacy, local-phone, local-pizza, local-play, local-post-office, local-printshop, local-restaurant, local-see, local-shipping, local-taxi, location-city, location-disabled, location-off, location-on, location-searching, map, my-location, navigation, near-me, person-pin, person-pin-circle, pin-drop, place, rate-review, restaurant-menu, satellite, streetview, subway, terrain, traffic, train, tram, transfer-within-a-station, transit-enterexit, trip-origin, zoom-in, zoom-out`;

  try {
    const conversationHistory = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Вы - ИИ-ассистент приложения beHappy, специализированный психолог-помощник. Вы ИДЕАЛЬНО знаете приложение и помогаете пользователям.

${APP_KNOWLEDGE}

ВАШИ РОЛИ:
1. ЭКСПЕРТ ПО ПРИЛОЖЕНИЮ - Отвечайте на вопросы о функциях, объясняйте как что работает
2. ПСИХОЛОГ-КОНСУЛЬТАНТ - Давайте профессиональные советы по ментальному здоровью
3. НАВИГАТОР - Направляйте к нужным функциям приложения
4. МОТИВАТОР - Поддерживайте и вдохновляйте пользователей

ПРАВИЛА ОТВЕТОВ:
- Отвечайте ТОЛЬКО на русском языке
- Будьте эмпатичными, поддерживающими, профессиональными
- Давайте конкретные, практичные советы
- ВСЕГДА предлагайте 1-3 соответствующие функции приложения в виде карточек
- Если пользователь спрашивает о функции - объясните ее и предложите карточку
- Если психологический вопрос - отвечайте как квалифицированный психолог И предложите релевантные функции
- Используйте принципы КПТ, ДПТ, EMDR в советах
- Адаптируйте ответы под конкретную ситуацию пользователя
- В КАЖДОМ ответе старайтесь предложить функции приложения, которые помогут пользователю

ФОРМАТ ОТВЕТА:
Основной ответ (как психолог и эксперт приложения)
[CARDS:функция1|функция2|функция3] - ОБЯЗАТЕЛЬНО добавляйте карточки функций

ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ КАРТОЧЕК:
- Для тревоги: [CARDS:cbt-main|breathing|meditation]
- Для депрессии: [CARDS:mood-tracker|thought-records|dbt-main]
- Для травм: [CARDS:emdr-main|safe-place|bilateral-stimulation]
- Для начинающих: [CARDS:tests|cbt-main|meditation]
- Для самоанализа: [CARDS:journal|art-therapy|ai-analysis-cbt]

ДОСТУПНЫЕ КАРТОЧКИ ФУНКЦИЙ:
cbt-main, dbt-main, emdr-main, thought-records, mood-tracker, behavior-experiments, 
cognitive-distortions, cbt-exercises, problem-solving, goal-setting, cbt-analytics,
distress-tolerance, emotion-regulation, interpersonal-skills, mindfulness, skills-tracker, dbt-analytics,
bilateral-stimulation, safe-place, resource-installation, suds-tracker, memory-processing,
meditation, breathing, journal, tests, test-history, art-therapy, recommendations, 
wellness-tracker, relaxation-techniques, mindfulness-extra, card-therapy, curses, ai-assistant,
ai-analysis-cbt, ai-analysis-dbt, ai-analysis-emdr

ВАЖНО: В каждом ответе ОБЯЗАТЕЛЬНО предлагайте 1-3 карточки функций, которые помогут пользователю решить его проблему или узнать больше о теме. Это поможет пользователю легко перейти к нужному разделу приложения.

Будьте профессиональным психологом и экспертом приложения одновременно!`
          },
          ...conversationHistory,
          {
            role: 'user',
            content: userMessage + "\n\nОБЯЗАТЕЛЬНО добавьте в конец ответа [CARDS:функция1|функция2|функция3] с соответствующими функциями для помощи пользователю."
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    // Extract main response and cards
    let mainResponse = aiResponse;
    let suggestedCards: string[] = [];
    
    // Try to find cards in the response
    const cardsMatch = aiResponse.match(/\[CARDS:(.*?)\]/i);
    if (cardsMatch) {
      mainResponse = aiResponse.replace(/\[CARDS:.*?\]/i, '').trim();
      suggestedCards = cardsMatch[1].split('|').map((card: string) => card.trim()).filter((card: string) => card);
    }

    // If no cards found, suggest some default ones based on keywords
    if (suggestedCards.length === 0) {
      const lowerResponse = aiResponse.toLowerCase();
      
      // CBT related keywords
      if (lowerResponse.includes('кпт') || lowerResponse.includes('мысли') || lowerResponse.includes('когнитивн')) {
        suggestedCards.push('cbt-main');
      }
      if (lowerResponse.includes('записи мыслей') || lowerResponse.includes('негативные мысли')) {
        suggestedCards.push('thought-records');
      }
      if (lowerResponse.includes('искажени') || lowerResponse.includes('ошибк')) {
        suggestedCards.push('cognitive-distortions');
      }
      if (lowerResponse.includes('эксперимент') || lowerResponse.includes('поведенческ')) {
        suggestedCards.push('behavior-experiments');
      }
      if (lowerResponse.includes('проблем') || lowerResponse.includes('решени')) {
        suggestedCards.push('goal-setting');
      }
      
      // DBT related keywords
      if (lowerResponse.includes('дпт') || lowerResponse.includes('эмоци') || lowerResponse.includes('диалектич')) {
        suggestedCards.push('dbt-main');
      }
      if (lowerResponse.includes('стресс') || lowerResponse.includes('кризис') || lowerResponse.includes('переносимость')) {
        suggestedCards.push('distress-tolerance');
      }
      if (lowerResponse.includes('регуляц') || lowerResponse.includes('управлени')) {
        suggestedCards.push('emotion-regulation');
      }
      if (lowerResponse.includes('общени') || lowerResponse.includes('межличност') || lowerResponse.includes('отношени')) {
        suggestedCards.push('interpersonal-skills');
      }
      if (lowerResponse.includes('осознан') || lowerResponse.includes('внимательн') || lowerResponse.includes('мудр')) {
        suggestedCards.push('mindfulness');
      }
      if (lowerResponse.includes('навык') || lowerResponse.includes('практик')) {
        suggestedCards.push('skills-tracker');
      }
      
      // EMDR related keywords
      if (lowerResponse.includes('emdr') || lowerResponse.includes('травм') || lowerResponse.includes('птср')) {
        suggestedCards.push('emdr-main');
      }
      if (lowerResponse.includes('безопасн') || lowerResponse.includes('ресурс')) {
        suggestedCards.push('safe-place');
      }
      if (lowerResponse.includes('билатерал') || lowerResponse.includes('стимуляц')) {
        suggestedCards.push('bilateral-stimulation');
      }
      if (lowerResponse.includes('suds') || lowerResponse.includes('дистресс')) {
        suggestedCards.push('suds-tracker');
      }
      if (lowerResponse.includes('воспоминан') || lowerResponse.includes('обработк')) {
        suggestedCards.push('memory-processing');
      }
      
      // General wellness keywords
      if (lowerResponse.includes('медитац') || lowerResponse.includes('расслаб')) {
        suggestedCards.push('meditation');
      }
      if (lowerResponse.includes('дыхан') || lowerResponse.includes('успокои')) {
        suggestedCards.push('breathing');
      }
      if (lowerResponse.includes('настрое') || lowerResponse.includes('депресс') || lowerResponse.includes('грусти')) {
        suggestedCards.push('mood-tracker');
      }
      if (lowerResponse.includes('тревог') || lowerResponse.includes('страх') || lowerResponse.includes('беспокой')) {
        suggestedCards.push('distress-tolerance');
      }
      if (lowerResponse.includes('дневник') || lowerResponse.includes('запис') || lowerResponse.includes('журнал')) {
        suggestedCards.push('journal');
      }
      if (lowerResponse.includes('тест') || lowerResponse.includes('оценк') || lowerResponse.includes('диагност')) {
        suggestedCards.push('tests');
      }
      if (lowerResponse.includes('история') || lowerResponse.includes('результат')) {
        suggestedCards.push('test-history');
      }
      if (lowerResponse.includes('творчест') || lowerResponse.includes('арт') || lowerResponse.includes('рисован')) {
        suggestedCards.push('art-therapy');
      }
      if (lowerResponse.includes('рекомендац') || lowerResponse.includes('совет')) {
        suggestedCards.push('recommendations');
      }
      if (lowerResponse.includes('благополуч') || lowerResponse.includes('общее состоян')) {
        suggestedCards.push('wellness-tracker');
      }
      if (lowerResponse.includes('релаксац') || lowerResponse.includes('расслаблен')) {
        suggestedCards.push('relaxation-techniques');
      }
      if (lowerResponse.includes('карточк') || lowerResponse.includes('карт')) {
        suggestedCards.push('card-therapy');
      }
      if (lowerResponse.includes('негатив') || lowerResponse.includes('проклят') || lowerResponse.includes('деструктив')) {
        suggestedCards.push('curses');
      }
      if (lowerResponse.includes('начать') || lowerResponse.includes('начинаю') || lowerResponse.includes('новичок')) {
        suggestedCards.push('tests', 'cbt-main');
      }
      if (lowerResponse.includes('аналитик') || lowerResponse.includes('прогресс') || lowerResponse.includes('статистик')) {
        suggestedCards.push('cbt-analytics', 'dbt-analytics');
      }
      
      // Remove duplicates and ensure we have at least 1-3 cards
      suggestedCards = [...new Set(suggestedCards)];
      if (suggestedCards.length === 0) {
        suggestedCards = ['cbt-main', 'meditation', 'tests'];
      }
      
      // Limit to maximum 3 cards
      suggestedCards = suggestedCards.slice(0, 3);
    }

    // Generate function cards based on suggestions
    const functionCards = suggestedCards.map(cardId => {
      switch (cardId) {
        case 'cbt-main':
          return {
            id: 'cbt-main',
            title: 'КПТ Терапия',
            description: 'Когнитивно-поведенческая терапия для работы с мыслями',
            route: '/screens/cbt',
            icon: 'psychology',
            color: ['#667eea', '#764ba2']
          };
        case 'dbt-main':
          return {
            id: 'dbt-main', 
            title: 'ДПТ Навыки',
            description: 'Диалектическая поведенческая терапия для эмоций',
            route: '/screens/dbt',
            icon: 'favorite',
            color: ['#f093fb', '#f5576c']
          };
        case 'emdr-main':
          return {
            id: 'emdr-main',
            title: 'EMDR Терапия', 
            description: 'Обработка травм и стабилизация',
            route: '/screens/emdr',
            icon: 'swap-horizontal',
            color: ['#4facfe', '#00f2fe']
          };
        case 'thought-records':
          return {
            id: 'thought-records',
            title: 'Записи мыслей',
            description: 'Анализ и изменение негативных мыслей',
            route: '/screens/cbt/thought-record',
            icon: 'lightbulb',
            color: ['#43e97b', '#38f9d7']
          };
        case 'mood-tracker':
          return {
            id: 'mood-tracker',
            title: 'Трекер настроения',
            description: 'Отслеживание эмоционального состояния',
            route: '/screens/cbt/mood-tracker',
            icon: 'favorite',
            color: ['#ff6b6b', '#ffa726']
          };
        case 'behavior-experiments':
          return {
            id: 'behavior-experiments',
            title: 'Поведенческие эксперименты',
            description: 'Тестирование убеждений через действия',
            route: '/screens/cbt/behavior-experiment',
            icon: 'science',
            color: ['#96CEB4', '#FFECD2']
          };
        case 'cognitive-distortions':
          return {
            id: 'cognitive-distortions',
            title: 'Когнитивные искажения',
            description: 'Работа с мыслительными ошибками',
            route: '/screens/cbt/cognitive-distortions',
            icon: 'lightbulb',
            color: ['#667eea', '#764ba2']
          };
        case 'cbt-exercises':
          return {
            id: 'cbt-exercises',
            title: 'Упражнения КПТ',
            description: 'Практические техники КПТ',
            route: '/screens/cbt/exercises',
            icon: 'fitness-center',
            color: ['#43e97b', '#38f9d7']
          };
        case 'problem-solving':
          return {
            id: 'problem-solving',
            title: 'Решение проблем',
            description: 'Структурированный подход к трудностям',
            route: '/screens/cbt/problem-solving',
            icon: 'puzzle',
            color: ['#f093fb', '#f5576c']
          };
        case 'goal-setting':
          return {
            id: 'goal-setting',
            title: 'Постановка целей',
            description: 'Планирование и достижение целей',
            route: '/screens/cbt/goal-setting',
            icon: 'flag',
            color: ['#4facfe', '#00f2fe']
          };
        case 'cbt-analytics':
          return {
            id: 'cbt-analytics',
            title: 'Аналитика КПТ',
            description: 'Визуализация прогресса в КПТ',
            route: '/screens/cbt/analytics',
            icon: 'analytics',
            color: ['#667eea', '#764ba2']
          };
        case 'distress-tolerance':
          return {
            id: 'distress-tolerance',
            title: 'Переносимость стресса',
            description: 'Навыки переживания кризисных ситуаций',
            route: '/screens/dbt/distress-tolerance',
            icon: 'shield',
            color: ['#667eea', '#764ba2']
          };
        case 'emotion-regulation':
          return {
            id: 'emotion-regulation',
            title: 'Регуляция эмоций',
            description: 'Понимание и управление эмоциями',
            route: '/screens/dbt/emotion-regulation',
            icon: 'favorite',
            color: ['#f093fb', '#f5576c']
          };
        case 'interpersonal-skills':
          return {
            id: 'interpersonal-skills',
            title: 'Межличностные навыки',
            description: 'Эффективное общение и отношения',
            route: '/screens/dbt/interpersonal-effectiveness',
            icon: 'people',
            color: ['#4facfe', '#00f2fe']
          };
        case 'mindfulness':
          return {
            id: 'mindfulness',
            title: 'Осознанность',
            description: 'Практики внимательности и присутствия',
            route: '/screens/dbt/mindfulness',
            icon: 'self-improvement',
            color: ['#43e97b', '#38f9d7']
          };
        case 'skills-tracker':
          return {
            id: 'skills-tracker',
            title: 'Трекер навыков',
            description: 'Отслеживание практики навыков ДПТ',
            route: '/screens/dbt/skills-tracker',
            icon: 'track-changes',
            color: ['#84fab0', '#8fd3f4']
          };
        case 'dbt-analytics':
          return {
            id: 'dbt-analytics',
            title: 'Аналитика ДПТ',
            description: 'Прогресс по всем навыкам ДПТ',
            route: '/screens/dbt/analytics',
            icon: 'analytics',
            color: ['#f093fb', '#f5576c']
          };
        case 'bilateral-stimulation':
          return {
            id: 'bilateral-stimulation',
            title: 'Билатеральная стимуляция',
            description: 'Упражнения для обработки травм',
            route: '/screens/emdr/bilateral-stimulation',
            icon: 'swap-horizontal',
            color: ['#667eea', '#764ba2']
          };
        case 'safe-place':
          return {
            id: 'safe-place',
            title: 'Безопасное место',
            description: 'Создание внутреннего ресурса безопасности',
            route: '/screens/emdr/safe-place',
            icon: 'home',
            color: ['#4ECDC4', '#44A08D']
          };
        case 'resource-installation':
          return {
            id: 'resource-installation',
            title: 'Инсталляция ресурсов',
            description: 'Укрепление позитивных качеств и ресурсов',
            route: '/screens/emdr/resource-installation',
            icon: 'build-circle',
            color: ['#667eea', '#764ba2']
          };
        case 'memory-processing':
          return {
            id: 'memory-processing',
            title: 'Обработка воспоминаний',
            description: 'Протокол EMDR для травматических воспоминаний',
            route: '/screens/emdr/memory-processing',
            icon: 'memory',
            color: ['#4facfe', '#00f2fe']
          };
        case 'suds-tracker':
          return {
            id: 'suds-tracker',
            title: 'SUDS трекер',
            description: 'Отслеживание уровня дистресса',
            route: '/screens/emdr/suds-tracker',
            icon: 'trending-down',
            color: ['#f093fb', '#f5576c']
          };
        case 'meditation':
          return {
            id: 'meditation',
            title: 'Медитация',
            description: 'Практики осознанности и релаксации',
            route: '/screens/meditation',
            icon: 'self-improvement',
            color: ['#84fab0', '#8fd3f4']
          };
        case 'breathing':
          return {
            id: 'breathing',
            title: 'Дыхательные упражнения',
            description: 'Техники дыхания для релаксации',
            route: '/screens/breathing',
            icon: 'air',
            color: ['#a8edea', '#fed6e3']
          };
        case 'journal':
          return {
            id: 'journal',
            title: 'Журналирование',
            description: 'Свободные записи мыслей и чувств',
            route: '/screens/journal',
            icon: 'book',
            color: ['#ff9a9e', '#fecfef']
          };
        case 'tests':
          return {
            id: 'tests',
            title: 'Тесты и оценки',
            description: 'Клинические шкалы и самооценка',
            route: '/screens/tests',
            icon: 'assessment',
            color: ['#ffecd2', '#fcb69f']
          };
        case 'art-therapy':
          return {
            id: 'art-therapy',
            title: 'Арт-терапия',
            description: 'Творческие упражнения для самовыражения',
            route: '/screens/arttherapy',
            icon: 'brush',
            color: ['#667eea', '#764ba2']
          };
        case 'test-history':
          return {
            id: 'test-history',
            title: 'История тестов',
            description: 'Результаты всех пройденных тестов',
            route: '/screens/test-history',
            icon: 'history',
            color: ['#84fab0', '#8fd3f4']
          };
        case 'recommendations':
          return {
            id: 'recommendations',
            title: 'Рекомендации',
            description: 'Персональные советы и рекомендации',
            route: '/screens/recommendations',
            icon: 'recommend',
            color: ['#43e97b', '#38f9d7']
          };
        case 'wellness-tracker':
          return {
            id: 'wellness-tracker',
            title: 'Трекер благополучия',
            description: 'Общее отслеживание состояния',
            route: '/screens/wellness-tracker',
            icon: 'favorite',
            color: ['#ff6b6b', '#ffa726']
          };
        case 'relaxation-techniques':
          return {
            id: 'relaxation-techniques',
            title: 'Техники релаксации',
            description: 'Различные методы расслабления',
            route: '/screens/relaxation-techniques',
            icon: 'spa',
            color: ['#a8edea', '#fed6e3']
          };
        case 'mindfulness-extra':
          return {
            id: 'mindfulness-extra',
            title: 'Практики осознанности',
            description: 'Дополнительные техники внимательности',
            route: '/screens/mindfulness',
            icon: 'self-improvement',
            color: ['#84fab0', '#8fd3f4']
          };
        case 'card-therapy':
          return {
            id: 'card-therapy',
            title: 'Карточная терапия',
            description: 'Работа с терапевтическими карточками',
            route: '/screens/card',
            icon: 'style',
            color: ['#f093fb', '#f5576c']
          };
        case 'curses':
          return {
            id: 'curses',
            title: 'Работа с негативом',
            description: 'Работа с деструктивными мыслями',
            route: '/screens/curses',
            icon: 'warning',
            color: ['#667eea', '#764ba2']
          };
        case 'ai-assistant':
          return {
            id: 'ai-assistant',
            title: 'ИИ-ассистент',
            description: 'Интеллектуальная помощь и консультации',
            route: '/screens/ai-assistant',
            icon: 'psychology',
            color: ['#4facfe', '#00f2fe']
          };
        case 'ai-analysis-cbt':
          return {
            id: 'ai-analysis-cbt',
            title: 'ИИ анализ КПТ',
            description: 'Персональные рекомендации по КПТ',
            route: '/screens/cbt',
            icon: 'psychology',
            color: ['#667eea', '#764ba2']
          };
        case 'ai-analysis-dbt':
          return {
            id: 'ai-analysis-dbt',
            title: 'ИИ анализ ДПТ',
            description: 'Персональные рекомендации по ДПТ',
            route: '/screens/dbt',
            icon: 'psychology',
            color: ['#f093fb', '#f5576c']
          };
        case 'ai-analysis-emdr':
          return {
            id: 'ai-analysis-emdr',
            title: 'ИИ анализ EMDR',
            description: 'Персональные рекомендации по EMDR',
            route: '/screens/emdr',
            icon: 'psychology',
            color: ['#4facfe', '#00f2fe']
          };
        default:
          return null;
      }
    }).filter(card => card !== null);

    return {
      response: mainResponse,
      functionCards: functionCards
    };

  } catch (error) {
    console.error('Error generating AI chat response:', error);
    
    // Fallback response with function cards
    return {
      response: 'Извините, у меня возникли технические трудности. Я здесь, чтобы помочь вам с приложением beHappy и ответить на ваши вопросы о ментальном здоровье. Пожалуйста, попробуйте задать ваш вопрос еще раз.',
      functionCards: [
        {
          id: 'cbt-main',
          title: 'КПТ Терапия',
          description: 'Когнитивно-поведенческая терапия для работы с мыслями',
          route: '/screens/cbti',
          icon: 'psychology',
          color: ['#667eea', '#764ba2']
        },
        {
          id: 'meditation',
          title: 'Медитация',
          description: 'Практики осознанности и релаксации',
          route: '/screens/meditation',
          icon: 'self-improvement',
          color: ['#84fab0', '#8fd3f4']
        },
        {
          id: 'tests',
          title: 'Тесты и оценки',
          description: 'Клинические шкалы и самооценка',
          route: '/screens/tests',
          icon: 'assessment',
          color: ['#ffecd2', '#fcb69f']
        }
      ]
    };
  }
};

// Therapeutic Chat System with Multiple Contexts
export interface TherapeuticMessage {
  id: string;
  text: string;
  isUser: boolean;
  cardImages?: {
    positiveId?: number;
    negativeId?: number;
    emotionId?: number;
    resourceId?: number;
    innerChildId?: number;
    narrativeId?: number;
  };
}

export interface TherapeuticChatParams {
  context?: 'mood_cards' | 'emotion_card' | 'resource_card' | 'inner_child_card' | 'narrative_card';
  positive_card_id?: number;
  negative_card_id?: number;
  cardId?: number;
  therapistRole?: string;
  problemContext?: string;
  categoryId?: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

// Base system prompt for all therapeutic contexts
const getBaseSystemPrompt = (profileData?: string | null): string => `
Вы - выдающийся клинический психолог и психотерапевт с более чем 25-летним стажем, имеющий научную степень и международное признание. Вы — эксперт в области интегративной терапии, сочетающий методы когнитивно-поведенческой терапии (КПТ), психоанализа, схема-терапии, экзистенциальной психологии, нарративной терапии и методов работы с телом. Вы имеете колоссальный опыт работы с широким спектром психологических состояний от повседневных жизненных трудностей до сложных психологических травм и кризисов.

ВАЖНО: ОБЩАЙТЕСЬ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ! Используйте эмпатичную, поддерживающую, но профессиональную лексику. Отвечайте так, чтобы клиент чувствовал себя понятым, принятым и в безопасности.

ОСНОВНАЯ РОЛЬ ТЕРАПЕВТА:
- Создавайте глубинное терапевтическое пространство безусловного принятия и понимания
- Воплощайте принцип "присутствия в моменте" — полной концентрации на переживаниях клиента
- Проявляйте истинную эмпатию, способность видеть мир глазами клиента без оценивания
- Развивайте терапевтический альянс через подлинное взаимодействие и доверие
- Находите баланс между принятием клиента "здесь и сейчас" и стимулированием позитивных изменений
- Мастерски распознавайте невысказанные эмоции и потребности клиента
- Бережно сопровождайте клиента в исследовании травматического опыта
- Помогайте интегрировать полученные инсайты в повседневную жизнь

ПЕРЕДОВЫЕ ТЕРАПЕВТИЧЕСКИЕ ТЕХНИКИ:
- Майевтический диалог: "Что, по-вашему, может означать эта эмоциональная реакция?"
- Глубинное отражение: "Слушая вас, я чувствую, что под этой злостью скрывается глубокая боль и чувство беспомощности..."
- Техника "Пустого стула": "Представьте, что здесь сидит та часть вас, которая боится перемен. Что бы вы хотели ей сказать?"
- Парадоксальная интенция: "Что произойдет, если на минуту вы позволите себе полностью принять это чувство, а не бороться с ним?"
- Работа с внутренними субличностями: "Какая часть вашей личности сейчас больше всего нуждается в понимании?"
- Метафоры и аналогии: "Это напоминает мне ситуацию, когда вы стоите на пороге неизвестной комнаты..."
- Соматическое осознавание: "Обратите внимание, как меняется ваше дыхание, когда вы говорите об этом..."
- Техника прогрессивной экспозиции: "Давайте постепенно приблизимся к этой сложной теме, двигаясь небольшими шагами"

СТРУКТУРА ТЕРАПЕВТИЧЕСКОЙ КОММУНИКАЦИИ:
- Практикуйте активное слушание наивысшего уровня, улавливая не только слова, но и эмоциональные оттенки
- Оставляйте терапевтические паузы для глубинной рефлексии и проживания эмоций
- Элегантно переплетайте поддержку с мягкими конфронтациями для стимулирования роста
- Используйте концепцию "зоны ближайшего развития" — предлагайте идеи чуть выше текущего уровня осознанности клиента
- Создавайте когнитивные мосты между различными аспектами опыта клиента
- Применяйте циклическую модель терапии: исследование → осознание → принятие → интеграция → действие
- Отслеживайте микровыражения и невербальные сигналы, отражающие глубинные процессы

${profileData ? `
ДАННЫЕ О КЛИЕНТЕ:
${profileData}

ОСОБЫЕ СТРАТЕГИЧЕСКИЕ РЕКОМЕНДАЦИИ:
1. Виртуозно адаптируйте терапевтический подход с учетом всех аспектов личности клиента (возрастных особенностей, когнитивного стиля, темперамента, культурного бэкграунда)
2. Мастерски интегрируйте данные психодиагностики при выборе терапевтических стратегий, но делайте это незаметно для клиента
3. Деликатно фокусируйтесь на выявленных проблемных зонах, не раскрывая диагностических данных напрямую
4. Создавайте эффект "глубинного понимания" через естественное включение знаний о клиенте в терапевтический диалог
5. Творчески используйте интересы клиента как "якоря" для терапевтических метафор и мостов к новым инсайтам
6. Мастерски связывайте психологическую работу с жизненными целями и ценностями клиента для повышения мотивации
7. Виртуозно подстраивайте языковые паттерны и стиль общения под репрезентативную систему и когнитивные особенности клиента
8. Используйте принцип "ресурсного фрейминга" — помогайте клиенту переосмыслить проблемы как возможности для роста
9. Активируйте механизмы нейропластичности через целенаправленную работу с убеждениями и паттернами мышления
` : ''}

УНИКАЛЬНЫЙ ТЕРАПЕВТИЧЕСКИЙ СТИЛЬ:
- Обладайте подлинной аутентичностью и профессиональной уверенностью в общении
- Сочетайте интеллектуальную глубину с эмоциональной доступностью
- Используйте гибкий, адаптивный язык, соответствующий когнитивному стилю клиента
- Демонстрируйте исключительную способность к точным терапевтическим интервенциям
- Создавайте мультисенсорный опыт через искусно подобранные метафоры и образы
- Проявляйте уникальное терапевтическое присутствие — качество внимания "здесь и сейчас"
- Поддерживайте оптимальный эмоциональный тон — тёплый, но глубокий и вдумчивый
- Демонстрируйте терапевтическую гибкость: умение переключаться между директивным и недирективным подходами

ЭТИЧЕСКИЙ ФУНДАМЕНТ:
Соблюдайте высочайшие стандарты конфиденциальности и профессиональной этики. Создавайте пространство безоговорочной безопасности, где клиент чувствует, что любые его мысли и чувства будут приняты без осуждения.

ВАЖНОЕ ТЕХНИЧЕСКОЕ ТРЕБОВАНИЕ ДЛЯ РАБОТЫ С ИЗОБРАЖЕНИЯМИ:
НЕ УПОМИНАЙТЕ напрямую, что вы видите изображения или карты. Клиент уже знает, что выбрал карты для сессии. Вместо этого:

1. ИСПОЛЬЗУЙТЕ визуальную информацию из изображений для формулирования более точных и глубоких терапевтических вопросов
2. ЗАДАВАЙТЕ вопросы о элементах, которые вы видите на картах, НЕ ГОВОРЯ что вы их видите: "Что для вас означают эти цвета/формы/объекты?"
3. НАПРАВЛЯЙТЕ беседу на основе визуальных элементов карт для более эффективной терапии
4. ВСЕГДА отвечайте ТОЛЬКО на русском языке, независимо от языка пользователя

Помните: ваша задача - использовать визуальную информацию для более эффективной терапии, а не сообщать клиенту о том, что вы что-то видите.

ЦЕЛОСТНОЕ ТЕРАПЕВТИЧЕСКОЕ ВИДЕНИЕ:
Рассматривайте клиента как уникальную целостную личность, а не набор симптомов. Видите потенциал клиента за пределами его текущих трудностей. Помогайте интегрировать разрозненные аспекты опыта в единую, осмысленную картину. Соединяйте работу с эмоциями, мыслями, телесными ощущениями и поведением. Способствуйте не только облегчению страдания, но и глубинной трансформации и обретению экзистенциального смысла.`;

// Context-specific prompt additions
const getContextPrompt = (params: TherapeuticChatParams): string => {
  const { context, positive_card_id, negative_card_id, cardId } = params;

  switch (context) {
    case 'mood_cards':
      const positiveCardId = positive_card_id ? ` (карточка #${positive_card_id})` : '';
      const negativeCardId = negative_card_id ? ` (карточка #${negative_card_id})` : '';
      
      return `\n\nКОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: ПРОФЕССИОНАЛЬНАЯ АРТ-ТЕРАПИЯ С КАРТАМИ ЭМОЦИЙ

Клиент выбрал две карты для психологического исследования: позитивную карту${positiveCardId} и негативную карту${negativeCardId}. Эти карты находятся перед вами в диалоге, и вы можете их видеть.

ТЕОРЕТИЧЕСКАЯ ОСНОВА АРТ-ТЕРАПИИ С КАРТАМИ:
Терапевтическая работа с картами эмоций основана на юнгианском подходе к визуальным образам как проекциям внутреннего мира и бессознательных процессов. Карты функционируют как мощные проективные стимулы, активирующие ассоциативные процессы и позволяющие выявить подавленные эмоции, скрытые конфликты и неосознаваемые паттерны.

ЦЕЛИ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ С КАРТАМИ:
1. Создать безопасное пространство для глубинного эмоционального исследования
2. Помочь клиенту идентифицировать, дифференцировать и вербализировать сложные эмоциональные состояния
3. Исследовать и интегрировать полярные эмоции, представленные позитивной и негативной картами
4. Способствовать психологической трансформации через символическую работу с образами
5. Развить навыки эмоциональной осознанности и саморегуляции
6. Обнаружить ресурсные состояния даже в негативных эмоциональных переживаниях
7. Способствовать разрешению внутренних конфликтов и эмоциональных блоков

ВАЖНЫЕ ПРИНЦИПЫ РАБОТЫ С КАРТАМИ ЭМОЦИЙ:
- НЕ упоминайте напрямую, что видите изображения - используйте визуальную информацию для формулирования более точных вопросов
- Помогайте клиенту исследовать эмоции через выбранные карты без прямого упоминания визуальных элементов
- Фокусируйтесь на эмоциональном опыте клиента, а не на описании изображений`;

    case 'emotion_card':
      const emotionCardId = cardId ? ` (карта #${cardId})` : '';
      
      return `\n\nКОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: ПРОФЕССИОНАЛЬНАЯ ТЕРАПИЯ С ЭМОЦИОНАЛЬНОЙ КАРТОЙ

Клиент выбрал эмоциональную карту${emotionCardId}. Эта карта отражает его текущее эмоциональное состояние или переживание, которое он хочет исследовать.

ТЕОРЕТИЧЕСКАЯ ОСНОВА РАБОТЫ С ЕДИНИЧНОЙ ЭМОЦИОНАЛЬНОЙ КАРТОЙ:
Терапевтическая работа с одной эмоциональной картой основана на гештальт-подходе и принципах эмоционально-фокусированной терапии (EFT). Карта служит "эмоциональным якорем", позволяющим клиенту глубоко погрузиться в исследование конкретного чувства или состояния.

ЦЕЛИ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ С ЭМОЦИОНАЛЬНОЙ КАРТОЙ:
1. Создать безопасное пространство для полного принятия и исследования выбранной эмоции
2. Помочь клиенту углубить понимание этой конкретной эмоции и ее роли в его жизни
3. Исследовать телесные ощущения, связанные с этой эмоцией
4. Выявить триггеры и контексты, вызывающие эту эмоцию
5. Развить навыки здорового выражения и регуляции этой эмоции
6. Найти послание или потребность, которую несет эта эмоция
7. Интегрировать эмоциональный опыт в целостное понимание себя

ВАЖНЫЕ ПРИНЦИПЫ РАБОТЫ:
- Не пытайтесь "исправить" или убрать эмоцию - помогите ее принять и понять
- Используйте эмпатическое отражение и валидацию
- Будьте особенно внимательны к телесным проявлениям эмоций
- Помогите клиенту найти собственные ресурсы для работы с эмоцией
- НЕ упоминайте, что видите изображения - используйте визуальную информацию для более точных вопросов`;

    case 'resource_card':
      const resourceCardId = cardId ? ` (карта #${cardId})` : '';
      
      return `\n\nКОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: ПРОФЕССИОНАЛЬНАЯ ТЕРАПИЯ С КАРТОЙ РЕСУРСОВ

Клиент выбрал карту ресурсов${resourceCardId}. Эта карта отражает внутреннюю силу и потенциал, который клиент хочет исследовать и активизировать в своей жизни.

ТЕОРЕТИЧЕСКАЯ ОСНОВА РАБОТЫ С КАРТОЙ РЕСУРСОВ:
Терапевтическая работа с картами ресурсов основана на позитивной психологии, ресурсно-ориентированной терапии и принципах нарративной терапии. Карта служит "мостом" к внутренним силам клиента, помогая обнаружить и активизировать скрытые ресурсы.

ЦЕЛИ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ С КАРТОЙ РЕСУРСОВ:
1. Помочь клиенту обнаружить и осознать свои внутренние ресурсы и силы
2. Активизировать положительные аспекты личности и потенциал для роста
3. Исследовать, как этот ресурс уже проявлялся в жизни клиента
4. Найти способы усиления и развития этого ресурса
5. Создать стратегии применения ресурса в сложных жизненных ситуациях
6. Укрепить веру клиента в собственные возможности и способности
7. Интегрировать ресурс в повседневную жизнь для достижения целей

ВАЖНЫЕ ПРИНЦИПЫ РАБОТЫ С РЕСУРСАМИ:
- Фокусируйтесь на силах, а не на недостатках клиента
- Используйте язык возможностей и потенциала
- Помогайте клиенту увидеть себя как источник решений
- Поддерживайте веру клиента в собственные способности
- Исследуйте ресурс через конкретные примеры и истории
- НЕ упоминайте, что видите изображения - используйте визуальную информацию для более точных вопросов`;

    case 'inner_child_card':
      const innerChildCardId = cardId ? ` (карта #${cardId})` : '';
      
      return `\n\nКОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: ПРОФЕССИОНАЛЬНАЯ ТЕРАПИЯ ВНУТРЕННЕГО РЕБЕНКА

Клиент выбрал карту внутреннего ребенка${innerChildCardId}. Эта карта отражает связь с детской частью личности, ранними воспоминаниями, травмами детства или необходимостью исцеления внутреннего ребенка.

ТЕОРЕТИЧЕСКАЯ ОСНОВА РАБОТЫ С ВНУТРЕННИМ РЕБЕНКОМ:
Терапия внутреннего ребенка основана на психодинамической теории, транзактном анализе Эрика Берна и подходах Джона Брэдшоу. Концепция внутреннего ребенка признает, что в каждом взрослом живет детская часть личности, которая несет эмоциональные воспоминания, потребности и раны детства.

ЦЕЛИ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ С КАРТОЙ ВНУТРЕННЕГО РЕБЕНКА:
1. Установить безопасный контакт с внутренним ребенком клиента
2. Исследовать детские воспоминания, потребности и переживания
3. Выявить и проработать детские травмы и болезненные паттерны
4. Восстановить способность к игре, радости и спонтанности
5. Помочь "взрослому Я" стать заботливым родителем для внутреннего ребенка
6. Интегрировать детскую энергию и творчество в взрослую жизнь
7. Исцелить отношения с реальными родителями через работу с внутренними образами

ВАЖНЫЕ ПРИНЦИПЫ РАБОТЫ С ВНУТРЕННИМ РЕБЕНКОМ:
- Используйте особенно мягкий, заботливый и принимающий тон
- Будьте готовы к сильным эмоциональным реакциям
- Никогда не осуждайте детские потребности или реакции
- Помогайте различать прошлое и настоящее
- Поощряйте самосострадание и принятие
- Работайте в темпе клиента, не форсируйте процесс
- НЕ упоминайте, что видите изображения - используйте визуальную информацию для создания более глубокого терапевтического контакта`;

    case 'narrative_card':
      const narrativeCardId = cardId ? ` (карта #${cardId})` : '';
      
      return `\n\nКОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: ПРОФЕССИОНАЛЬНАЯ НАРРАТИВНАЯ ТЕРАПИЯ

Клиент выбрал карту нарративной терапии${narrativeCardId}. Эта карта отражает готовность исследовать и переписать истории своей жизни, работать с личной идентичностью и создавать предпочтительные жизненные нарративы.

ТЕОРЕТИЧЕСКАЯ ОСНОВА НАРРАТИВНОЙ ТЕРАПИИ:
Нарративная терапия, разработанная Майклом Уайтом и Дэвидом Эпстоном, основана на постмодернистском понимании того, что люди создают смысл своей жизни через истории, которые они рассказывают о себе. Основной принцип: "Человек не есть проблема - проблема есть проблема".

ЦЕЛИ НАРРАТИВНОЙ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ:
1. Экстернализировать проблему - отделить проблему от личности клиента
2. Деконструировать доминирующие проблемные истории
3. Обнаружить "уникальные результаты" - исключения из проблемной истории
4. Исследовать предпочтительные истории и альтернативные описания идентичности
5. Связать клиента с его ценностями, намерениями и мечтами
6. Создать "густое описание" предпочтительной истории
7. Найти аудиторию-свидетелей для новых историй

ВАЖНЫЕ ПРИНЦИПЫ НАРРАТИВНОЙ РАБОТЫ:
- Занимайте позицию любопытства и "незнания" - клиент эксперт своей жизни
- Используйте язык, который разделяет человека и проблему
- Фокусируйтесь на способностях, навыках и ресурсах, а не на недостатках
- Исследуйте культурные и социальные контексты, влияющие на проблему
- Поощряйте множественные описания идентичности
- Относитесь к историям клиента с глубоким уважением
- НЕ упоминайте, что видите изображения - используйте визуальную информацию для более точного понимания жизненных историй клиента`;

    default:
      return '';
  }
};

// Specialized therapist role handler
const getSpecializedTherapistPrompt = (params: TherapeuticChatParams): string => {
  const { therapistRole, problemContext, categoryId } = params;
  
  if (therapistRole && problemContext) {
    try {
      const role = JSON.parse(therapistRole);
      return role.systemPrompt + `

КОНТЕКСТ ТЕКУЩЕЙ СЕССИИ: Клиент обратился с проблемой "${problemContext}". 

Начните сессию с тепло, профессионального приветствия, представившись как ${role.name}, ${role.specialty}. Затем мягко поинтересуйтесь, что привело клиента именно к этой проблеме, и что он хотел бы исследовать или изменить в своей жизни. Создайте атмосферу безопасности и поддержки.

Используйте свою специализацию в области "${categoryId}" для максимально эффективной помощи клиенту.`;
    } catch (error) {
      console.error('Error parsing therapist role:', error);
      return '';
    }
  }
  
  return '';
};

// Load user profile data for personalization
const loadUserProfileData = async (): Promise<string | null> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    
    const [
      userProfileRaw,
      cbtSessionsRaw,
      dbtSessionsRaw,
      emdrSessionsRaw,
      problemsSessionsRaw,
      chatSessionsRaw,
      meditationSessionsRaw,
      wellnessDataRaw,
      moodDataRaw,
      journalEntriesRaw,
      assessmentHistoryRaw
    ] = await Promise.all([
      AsyncStorage.getItem('userProfile'),
      AsyncStorage.getItem('CBTSessionHistory'),
      AsyncStorage.getItem('DBTSessionHistory'),
      AsyncStorage.getItem('EMDRSessionHistory'),
      AsyncStorage.getItem('problemsSessionHistory'),
      AsyncStorage.getItem('chatSessionHistory'),
      AsyncStorage.getItem('meditationSessionHistory'),
      AsyncStorage.getItem('wellnessData'),
      AsyncStorage.getItem('moodData'),
      AsyncStorage.getItem('journalEntries'),
      AsyncStorage.getItem('assessmentHistory')
    ]);

    const userProfile = userProfileRaw ? JSON.parse(userProfileRaw) : null;
    const cbtSessions = cbtSessionsRaw ? JSON.parse(cbtSessionsRaw) : [];
    const dbtSessions = dbtSessionsRaw ? JSON.parse(dbtSessionsRaw) : [];
    const emdrSessions = emdrSessionsRaw ? JSON.parse(emdrSessionsRaw) : [];
    const problemsSessions = problemsSessionsRaw ? JSON.parse(problemsSessionsRaw) : [];
    const chatSessions = chatSessionsRaw ? JSON.parse(chatSessionsRaw) : [];
    const meditationSessions = meditationSessionsRaw ? JSON.parse(meditationSessionsRaw) : [];
    const wellnessData = wellnessDataRaw ? JSON.parse(wellnessDataRaw) : [];
    const moodData = moodDataRaw ? JSON.parse(moodDataRaw) : [];
    const journalEntries = journalEntriesRaw ? JSON.parse(journalEntriesRaw) : [];
    const assessmentHistory = assessmentHistoryRaw ? JSON.parse(assessmentHistoryRaw) : null;

    if (!userProfile && !cbtSessions.length && !dbtSessions.length && !emdrSessions.length) {
      return null;
    }

    let profileSummary = '';

    // Personal information
    if (userProfile?.personalInfo) {
      const info = userProfile.personalInfo;
      profileSummary += `ПЕРСОНАЛЬНАЯ ИНФОРМАЦИЯ:\n`;
      if (info.name) profileSummary += `- Имя: ${info.name}\n`;
      if (info.age) profileSummary += `- Возраст: ${info.age} лет\n`;
      if (info.occupation) profileSummary += `- Профессия: ${info.occupation}\n`;
      if (info.interests && info.interests.length > 0) {
        profileSummary += `- Интересы: ${info.interests.join(', ')}\n`;
      }
      if (info.goals && info.goals.length > 0) {
        profileSummary += `- Жизненные цели: ${info.goals.join(', ')}\n`;
      }
      profileSummary += '\n';
    }

    // Assessment results
    if (assessmentHistory) {
      profileSummary += `РЕЗУЛЬТАТЫ ПСИХОЛОГИЧЕСКИХ ТЕСТОВ:\n`;
      if (assessmentHistory.completedTests && assessmentHistory.completedTests.length > 0) {
        assessmentHistory.completedTests.forEach((test: any) => {
          profileSummary += `- ${test.testType}: ${test.result.interpretation || test.result.level || 'Пройден'}\n`;
          if (test.result.scores) {
            Object.entries(test.result.scores).forEach(([key, value]) => {
              profileSummary += `  ${key}: ${value}\n`;
            });
          }
        });
      }
      profileSummary += '\n';
    }

    // Session history summaries
    if (cbtSessions.length > 0) {
      profileSummary += `ИСТОРИЯ КПТ СЕССИЙ (${cbtSessions.length} сессий):\n`;
      const recentCBT = cbtSessions.slice(-3);
      recentCBT.forEach((session: any, index: number) => {
        profileSummary += `- Сессия ${cbtSessions.length - recentCBT.length + index + 1}: ${session.date} - ${session.focus || 'Работа с мыслями и поведением'}\n`;
      });
      profileSummary += '\n';
    }

    if (dbtSessions.length > 0) {
      profileSummary += `ИСТОРИЯ ДБТ СЕССИЙ (${dbtSessions.length} сессий):\n`;
      const recentDBT = dbtSessions.slice(-3);
      recentDBT.forEach((session: any, index: number) => {
        profileSummary += `- Сессия ${dbtSessions.length - recentDBT.length + index + 1}: ${session.date} - ${session.focus || 'Работа с эмоциями и навыками'}\n`;
      });
      profileSummary += '\n';
    }

    if (emdrSessions.length > 0) {
      profileSummary += `ИСТОРИЯ EMDR СЕССИЙ (${emdrSessions.length} сессий):\n`;
      const recentEMDR = emdrSessions.slice(-3);
      recentEMDR.forEach((session: any, index: number) => {
        profileSummary += `- Сессия ${emdrSessions.length - recentEMDR.length + index + 1}: ${session.date} - ${session.focus || 'Работа с травмами'}\n`;
      });
      profileSummary += '\n';
    }

    // Recent activity
    if (moodData.length > 0) {
      const recentMoods = moodData.slice(-5);
      profileSummary += `НЕДАВНИЕ ЗАПИСИ НАСТРОЕНИЯ:\n`;
      recentMoods.forEach((mood: any) => {
        profileSummary += `- ${mood.date}: ${mood.level}/10 (${mood.note || 'без заметок'})\n`;
      });
      profileSummary += '\n';
    }

    if (journalEntries.length > 0) {
      const recentEntries = journalEntries.slice(-3);
      profileSummary += `НЕДАВНИЕ ЗАПИСИ В ДНЕВНИКЕ:\n`;
      recentEntries.forEach((entry: any) => {
        const preview = entry.content ? entry.content.substring(0, 100) + '...' : 'Пустая запись';
        profileSummary += `- ${entry.date}: ${preview}\n`;
      });
      profileSummary += '\n';
    }

    return profileSummary;

  } catch (error) {
    console.error('Error loading user profile data:', error);
    return null;
  }
};

// Convert image to base64
const getImageAsBase64 = async (imageUri: any): Promise<string | null> => {
  try {
    const FileSystem = (await import('expo-file-system')).default;
    const Asset = (await import('expo-asset')).Asset;

    let localUri = imageUri;

    if (typeof imageUri === 'number') {
      const asset = Asset.fromModule(imageUri);
      await asset.downloadAsync();
      localUri = asset.localUri;
    }

    if (localUri && typeof localUri === 'string') {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }

    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

// Prepare messages with images for OpenAI API
const prepareMessagesWithImages = async (
  messages: TherapeuticMessage[],
  userMessage: TherapeuticMessage,
  systemPrompt: string,
  cards?: any,
  emotionCards?: any,
  resourceCards?: any,
  innerChildCards?: any,
  narrativeCards?: any
): Promise<any[]> => {
  const allMessages = [...messages, userMessage];
  const apiMessages = [];
  let imagesAlreadyAdded = false;
  
  // Add system message
  apiMessages.push({ role: 'system', content: systemPrompt });
  
  // Check if this is the first user message after a card selection session
  const shouldAddImagesThisTime = messages.length === 1 && 
                                 !messages[0].isUser && 
                                 messages[0].cardImages &&
                                 (messages[0].cardImages.emotionId || 
                                  messages[0].cardImages.resourceId || 
                                  messages[0].cardImages.innerChildId ||
                                  messages[0].cardImages.narrativeId ||
                                  messages[0].cardImages.positiveId);
  
  // Process each message
  for (const msg of allMessages) {
    if (!msg.isUser && msg.cardImages && shouldAddImagesThisTime && !imagesAlreadyAdded) {
      // This is the first AI message with cards - add assistant response first
      apiMessages.push({
        role: 'assistant',
        content: msg.text
      });
      
      // Then add images as a user message for the first interaction only
      const imageContents = [];
      
      // Add various card images based on what's available
      if (msg.cardImages.emotionId && emotionCards) {
        const emotionCard = emotionCards.find((card: any) => card.id === msg.cardImages!.emotionId);
        if (emotionCard) {
          const base64 = await getImageAsBase64(emotionCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      if (msg.cardImages.resourceId && resourceCards) {
        const resourceCard = resourceCards.find((card: any) => card.id === msg.cardImages!.resourceId);
        if (resourceCard) {
          const base64 = await getImageAsBase64(resourceCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      if (msg.cardImages.innerChildId && innerChildCards) {
        const innerChildCard = innerChildCards.find((card: any) => card.id === msg.cardImages!.innerChildId);
        if (innerChildCard) {
          const base64 = await getImageAsBase64(innerChildCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      if (msg.cardImages.narrativeId && narrativeCards) {
        const narrativeCard = narrativeCards.find((card: any) => card.id === msg.cardImages!.narrativeId);
        if (narrativeCard) {
          const base64 = await getImageAsBase64(narrativeCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      if (msg.cardImages.positiveId && cards) {
        const positiveCard = cards.find((card: any) => card.id === msg.cardImages!.positiveId);
        if (positiveCard) {
          const base64 = await getImageAsBase64(positiveCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      if (msg.cardImages.negativeId && cards) {
        const negativeCard = cards.find((card: any) => card.id === msg.cardImages!.negativeId);
        if (negativeCard) {
          const base64 = await getImageAsBase64(negativeCard.uri);
          if (base64) {
            imageContents.push({
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` }
            });
          }
        }
      }
      
      // Add images as a separate message only if we have successfully loaded real images
      if (imageContents.length > 0) {
        console.log(`✅ Successfully loaded ${imageContents.length} real card images - sending to AI`);
        
        const messageWithImages = {
          role: 'user',
          content: [
            {
              type: "text",
              text: "Эти изображения карт были выбраны для нашей терапевтической сессии. Пожалуйста, проанализируйте их и учтите в своем ответе."
            },
            ...imageContents
          ]
        };
        
        apiMessages.push(messageWithImages);
        imagesAlreadyAdded = true;
      }
    } else {
      // Regular message without images, or subsequent messages
      apiMessages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      });
    }
  }
  
  return apiMessages;
};

// Save session data
const saveSessionData = async (userMessage: TherapeuticMessage, aiMessage: TherapeuticMessage) => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    
    const existingData = await AsyncStorage.getItem('chatSessionHistory');
    const sessions = existingData ? JSON.parse(existingData) : [];
    
    const sessionData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      userMessage: userMessage.text,
      aiResponse: aiMessage.text,
      timestamp: new Date().toISOString(),
      cardImages: userMessage.cardImages || aiMessage.cardImages
    };
    
    sessions.push(sessionData);
    
    // Keep only last 50 sessions to prevent storage bloat
    if (sessions.length > 50) {
      sessions.splice(0, sessions.length - 50);
    }
    
    await AsyncStorage.setItem('chatSessionHistory', JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving session data:', error);
  }
};

// Main therapeutic chat function
export const generateTherapeuticChatResponse = async (
  userMessage: TherapeuticMessage,
  messages: TherapeuticMessage[],
  params: TherapeuticChatParams,
  cards?: any,
  emotionCards?: any,
  resourceCards?: any,
  innerChildCards?: any,
  narrativeCards?: any,
  tokenUsage?: { tokensUsed: number; maxTokens: number }
): Promise<TherapeuticMessage> => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('API ключ не настроен');
    }

    // Load user profile data for personalization
    const profileData = await loadUserProfileData();
    
    // Build system prompt
    let systemPrompt = getBaseSystemPrompt(profileData);
    
    // Add token awareness to system prompt
    if (tokenUsage) {
      const remainingTokens = tokenUsage.maxTokens - tokenUsage.tokensUsed;
      const tokenPercentage = (tokenUsage.tokensUsed / tokenUsage.maxTokens) * 100;
      
      systemPrompt += `\n\n[ТОКЕНЫ: ${tokenUsage.tokensUsed}/${tokenUsage.maxTokens}]
СТАТУС СЕССИИ:
- Использовано: ${tokenPercentage.toFixed(1)}%
- Остается: ${remainingTokens} токенов

ПРАВИЛА ЗАВЕРШЕНИЯ:
- При 85-90% использования: готовь к завершению
- При 95%+ использования: отправь "SESSION_CLOSE_REQUEST"
- При запросе завершения от клиента: спроси подтверждение, затем "SESSION_CLOSE_REQUEST"`;
    }
    
    // Add specialized therapist prompt if needed
    const specializedPrompt = getSpecializedTherapistPrompt(params);
    if (specializedPrompt) {
      systemPrompt = specializedPrompt;
    } else {
      // Add context-specific prompt
      const contextPrompt = getContextPrompt(params);
      systemPrompt += contextPrompt;
    }
    
    // Prepare messages for API
    const messagesForAPI = await prepareMessagesWithImages(
      messages,
      userMessage,
      systemPrompt,
      cards,
      emotionCards,
      resourceCards,
      innerChildCards,
      narrativeCards
    );
    
    console.log('🚀 Sending request to OpenAI...');
    
    const requestBody = {
      model: 'gpt-4o',
      messages: messagesForAPI,
      max_tokens: 800,
      temperature: 0.8,
    };
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI API Response received');
    
    const aiText = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ.';
    
    const aiMessage: TherapeuticMessage = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      isUser: false,
    };
    
    // Save session data
    await saveSessionData(userMessage, aiMessage);
    
    return aiMessage;

  } catch (error: any) {
    console.error('Therapeutic chat error:', error);
    throw error;
  }
};

// Initialize chat with welcome message based on context
export const initializeTherapeuticChat = async (
  params: TherapeuticChatParams,
  cards?: any,
  emotionCards?: any,
  resourceCards?: any,
  innerChildCards?: any,
  narrativeCards?: any
): Promise<TherapeuticMessage> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    
    // Load user profile for personalization
    const userProfileRaw = await AsyncStorage.getItem('userProfile');
    const userProfile = userProfileRaw ? JSON.parse(userProfileRaw) : null;
    
    const userName = userProfile?.personalInfo?.name || '';
    const hasCompletedTests = userProfile?.assessmentHistory?.completedTests?.length > 0;
    
    let welcomeMessage = '';
    const context = params?.context;
    
    // Create personalized welcome based on context
    if (context === 'mood_cards' && params?.positive_card_id && params?.negative_card_id) {
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Я вижу, что вы выбрали карты для работы с эмоциями. Позитивная карта #${params.positive_card_id} и негативная карта #${params.negative_card_id} будут нашими проводниками в этой терапевтической сессии.\n\nДавайте создадим безопасное пространство для исследования ваших эмоций. Что привело вас к выбору именно этих карт? Какие чувства или переживания вы хотели бы исследовать сегодня?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
        cardImages: {
          positiveId: params.positive_card_id,
          negativeId: params.negative_card_id
        }
      };
    } else if (context === 'emotion_card' && params?.cardId) {
      const emotionCard = emotionCards?.find((card: any) => card.id === params.cardId);
      const emotionName = emotionCard?.name || 'эмоцию';
      
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Вы выбрали карту "${emotionName}" для нашей терапевтической работы. Это прекрасный выбор для глубокого исследования ваших эмоциональных переживаний.\n\nВ безопасном пространстве нашей сессии мы сможем полностью исследовать эту эмоцию. Расскажите, что сейчас происходит в вашей жизни? Что привело вас к желанию работать именно с этой эмоцией?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
        cardImages: {
          emotionId: params.cardId
        }
      };
    } else if (context === 'resource_card' && params?.cardId) {
      const resourceCard = resourceCards?.find((card: any) => card.id === params.cardId);
      const resourceName = resourceCard?.name || 'ресурс';
      
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Какой замечательный выбор - карта "${resourceName}"! Работа с внутренними ресурсами - это путь к обнаружению ваших скрытых сил и возможностей.\n\nДавайте вместе исследуем этот ресурс. Что вас привлекло в этой карте? Возможно, вы уже чувствуете связь с этим качеством в себе?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
        cardImages: {
          resourceId: params.cardId
        }
      };
    } else if (context === 'inner_child_card' && params?.cardId) {
      const innerChildCard = innerChildCards?.find((card: any) => card.id === params.cardId);
      const cardName = innerChildCard?.name || 'внутреннего ребенка';
      
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Вы выбрали очень важную карту - "${cardName}". Работа с внутренним ребенком требует особой заботы и нежности.\n\nДавайте создадим максимально безопасное пространство для этой встречи. Что вас привело к желанию соединиться со своим внутренним ребенком? Возможно, есть что-то, что ваша детская часть хочет вам сказать?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
        cardImages: {
          innerChildId: params.cardId
        }
      };
    } else if (context === 'narrative_card' && params?.cardId) {
      const narrativeCard = narrativeCards?.find((card: any) => card.id === params.cardId);
      const cardName = narrativeCard?.name || 'нарративной терапии';
      
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Вы выбрали карту "${cardName}" - это путь к переосмыслению и переписыванию историй вашей жизни.\n\nВ нарративной терапии мы исследуем, как вы рассказываете историю своей жизни, и помогаем найти новые, более предпочтительные версии этих историй. Какую историю вашей жизни вы хотели бы исследовать сегодня?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
        cardImages: {
          narrativeId: params.cardId
        }
      };
    } else {
      // Standard welcome message
      welcomeMessage = `${userName ? `Здравствуйте, ${userName}! ` : 'Здравствуйте! '}Добро пожаловать на персонализированную терапевтическую сессию.`;
      
      if (hasCompletedTests) {
        welcomeMessage += ` Я учитываю результаты ваших психологических тестов для более эффективной работы.`;
      }
      
      welcomeMessage += `\n\nЯ здесь, чтобы создать безопасное пространство для нашего разговора. Что привело вас сегодня ко мне? О чем вы хотели бы поговорить?`;
      
      return {
        id: '1',
        text: welcomeMessage,
        isUser: false,
      };
    }
  } catch (error) {
    console.error('Error initializing therapeutic chat:', error);
    return {
      id: '1',
      text: 'Здравствуйте! Как я могу вам помочь сегодня?',
      isUser: false,
    };
  }
};

// Function to generate AI-powered session completion message
export const generateSessionCompletionMessage = async (
  messages: TherapeuticMessage[],
  therapistRole: TherapistRole,
  problemContext: string,
  tokensUsed: number
): Promise<string> => {
  try {
    const conversationSummary = messages
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.isUser ? 'User' : 'Therapist'}: ${msg.text}`)
      .join('\n');

    const systemPrompt = `Ты психолог-терапевт Anulya (${therapistRole.specialty}). Ты завершаешь терапевтическую сессию по проблеме "${problemContext}". 
    
    Контекст последних сообщений:
    ${conversationSummary}
    
    Создай КРАСИВОЕ завершение сессии в специальном формате:
    
    🎯 **ЗАВЕРШЕНИЕ СЕССИИ**
    
    [Краткий инсайт о проделанной работе]
    
    💡 **ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ:**
    • [Конкретная рекомендация 1]
    • [Конкретная рекомендация 2] 
    • [Конкретная рекомендация 3]
    
    🌟 **ПОДДЕРЖКА**
    [Теплые слова поддержки и мотивации]
    
    ✨ **До встречи!**
    [Финальное послание]
    
    Пиши в стиле ${therapistRole.name}, тепло и профессионально, максимум 200 слов на русском языке.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Создай красивое завершение сессии.' }
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || 
      `🎯 **ЗАВЕРШЕНИЕ СЕССИИ**\n\nБлагодарю вас за открытость и доверие в нашей работе сегодня. Вы проделали важную работу.\n\n💡 **ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ:**\n• Практикуйте дыхательные упражнения ежедневно\n• Ведите дневник своих эмоций\n• Уделяйте время для отдыха\n\n🌟 **ПОДДЕРЖКА**\nПомните: каждый шаг к самопознанию - это шаг к исцелению. Вы на правильном пути.\n\n✨ **До встречи!**\nБерегите себя и помните - я всегда готова помочь вам в вашем путешествии к благополучию.`;

  } catch (error) {
    console.error('Error generating session completion:', error);
    return `🎯 **ЗАВЕРШЕНИЕ СЕССИИ**\n\nБлагодарю вас за открытость и доверие в нашей работе сегодня. Вы проделали важную работу.\n\n💡 **ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ:**\n• Практикуйте дыхательные упражнения ежедневно\n• Ведите дневник своих эмоций\n• Уделяйте время для отдыха\n\n🌟 **ПОДДЕРЖКА**\nПомните: каждый шаг к самопознанию - это шаг к исцелению. Вы на правильном пути.\n\n✨ **До встречи!**\nБерегите себя и помните - я всегда готова помочь вам в вашем путешествии к благополучию.`;
  }
};

// Function to generate structured session recommendations
export const generateStructuredSessionRecommendations = async (
  messages: TherapeuticMessage[],
  therapistRole: TherapistRole,
  problemContext: string
): Promise<{
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: 'практика' | 'упражнение' | 'техника' | 'привычка' | 'ресурс';
    icon: string;
    gradient: string[];
    actionSteps: string[];
    expectedResult: string;
  }>;
  completionMessage: string;
  sessionSummary: string;
}> => {
  try {
    const conversationSummary = messages
      .slice(-10)
      .map(msg => `${msg.isUser ? 'Клиент' : 'Anulya'}: ${msg.text}`)
      .join('\n');

    const systemPrompt = `Ты психолог-терапевт Anulya. На основе проведенной сессии создай JSON с итогами и рекомендациями.

Диалог сессии:
${conversationSummary}

Контекст проблемы: ${problemContext}
Специализация: ${therapistRole.specialty}

Создай структурированный JSON ответ с рекомендациями. Обязательно включи actionSteps (массив конкретных шагов) и expectedResult для каждой рекомендации.

Верни JSON:
{
  "sessionSummary": "краткий итог сессии",
  "completionMessage": "теплое завершающее сообщение",
  "recommendations": [
    {
      "title": "Название рекомендации",
      "description": "Подробное описание (50-70 слов)",
      "category": "практика|упражнение|техника|привычка|ресурс",
      "icon": "FontAwesome5 иконка",
      "actionSteps": ["Шаг 1", "Шаг 2", "Шаг 3"],
      "expectedResult": "Ожидаемый результат от применения"
    }
  ]
}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Создай структурированные рекомендации.' }
        ],
        max_tokens: 800,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) throw new Error('No content received');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const data = JSON.parse(jsonMatch[0]);
    
    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
    ];

    const processedRecommendations = data.recommendations.map((rec: any, index: number) => ({
      id: `rec-${Date.now()}-${index}`,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      icon: rec.icon,
      gradient: gradients[index % gradients.length],
      actionSteps: rec.actionSteps || ['Следуйте инструкциям', 'Практикуйте регулярно', 'Отслеживайте прогресс'],
      expectedResult: rec.expectedResult || 'Улучшение общего самочувствия и эмоционального состояния',
    }));

    return {
      recommendations: processedRecommendations,
      completionMessage: data.completionMessage,
      sessionSummary: data.sessionSummary,
    };

  } catch (error) {
    console.error('Error generating structured recommendations:', error);
    return {
      recommendations: [
        {
          id: `rec-${Date.now()}-1`,
          title: 'Дыхательная практика',
          description: 'Выполняйте упражнение 4-7-8: вдох на 4 счета, задержка на 7, выдох на 8. Повторите 3-4 раза утром и вечером для снижения уровня стресса.',
          category: 'практика',
          icon: 'leaf',
          gradient: ['#667eea', '#764ba2'],
          actionSteps: ['Сядьте удобно и закройте глаза', 'Сделайте глубокий вдох через нос на 4 счета', 'Задержите дыхание на 7 счетов', 'Медленно выдохните через рот на 8 счетов'],
          expectedResult: 'Снижение уровня стресса и тревоги, улучшение сна и общего самочувствия'
        },
        {
          id: `rec-${Date.now()}-2`,
          title: 'Дневник эмоций',
          description: 'Каждый вечер записывайте 3 эмоции, которые испытали за день, и события, которые их вызвали. Это поможет лучше понимать свои реакции.',
          category: 'привычка',
          icon: 'heart',
          gradient: ['#43e97b', '#38f9d7'],
          actionSteps: ['Выберите удобное время вечером', 'Запишите 3 основные эмоции дня', 'Опишите события, которые их вызвали', 'Проанализируйте свои реакции'],
          expectedResult: 'Лучшее понимание своих эмоциональных реакций и паттернов поведения'
        },
        {
          id: `rec-${Date.now()}-3`,
          title: 'Техника заземления',
          description: 'При тревоге используйте правило 5-4-3-2-1: назовите 5 вещей, которые видите, 4 - которые слышите, 3 - которые чувствуете, 2 - которые нюхаете, 1 - которую пробуете.',
          category: 'техника',
          icon: 'anchor',
          gradient: ['#4facfe', '#00f2fe'],
          actionSteps: ['Остановитесь и сделайте глубокий вдох', 'Назовите 5 вещей, которые видите', 'Назовите 4 звука, которые слышите', 'Назовите 3 текстуры, которые чувствуете', 'Назовите 2 запаха и 1 вкус'],
          expectedResult: 'Быстрое снижение тревоги и возвращение к настоящему моменту'
        },
      ],
      completionMessage: 'Спасибо за вашу открытость и доверие в нашей работе сегодня. Вы проделали важную работу над собой, и я горжусь вашими усилиями. Помните: каждый шаг к самопознанию - это шаг к исцелению.',
      sessionSummary: 'В ходе сессии мы обсудили ваши основные переживания и выработали стратегии для работы с ними.',
    };
  }
};
