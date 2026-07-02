import AsyncStorage from '@react-native-async-storage/async-storage';

// Типы данных для курса
export interface CourseDay {
  id: number;
  title: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  isCompleted: boolean;
  isLocked: boolean;
  exercises: CourseExercise[];
}

export interface CourseExercise {
  id: number;
  title: string;
  description: string;
  type: 'meditation' | 'journaling' | 'reflection' | 'breathing' | 'bodywork' | 'vocal' | 'reframing' | 'practice';
  duration: number; // в минутах
  isCompleted: boolean;
}

export interface UserProgress {
  currentDay: number;
  completedDays: number[];
  lastActivityDate?: string;
  notes: { [key: string]: string };
  currentStreak: number; // Текущая серия последовательных дней
  lastStreakDate?: string; // Дата последнего дня в серии
}

// 20-дневный курс эмоционального интеллекта
export const emotionalCourseDays: CourseDay[] = [
  {
    id: 1,
    title: "День 1: Эмоциональное пробуждение",
    description: "Первые шаги в мир эмоционального самопознания. Учимся замечать и называть эмоции.",
    emoji: "🌅",
    systemPrompt: "Вы профессиональный психолог-практик, специалист по эмоциональному интеллекту. Ваша задача - мягко ввести пользователя в мир эмоций. Говорите на русском языке, будьте теплыми и поддерживающими. Помогите пользователю назвать 3 конкретные эмоции, которые он испытал сегодня, и найти их триггеры.",
    isCompleted: false,
    isLocked: false,
    exercises: [
      {
        id: 101,
        title: "Эмоциональный дневник",
        description: "Запишите 3 эмоции, которые вы испытали сегодня",
        type: "journaling",
        duration: 10,
        isCompleted: false,
      },
      {
        id: 102,
        title: "Дыхание осознанности",
        description: "5-минутная практика осознанного дыхания",
        type: "breathing",
        duration: 5,
        isCompleted: false,
      }
    ]
  },
  {
    id: 2,
    title: "День 2: Тело говорит",
    description: "Изучаем язык тела - как эмоции проявляются в физических ощущениях.",
    emoji: "🧘",
    systemPrompt: "Вы соматический терапевт с 15-летним опытом. Ваша специализация - помочь людям почувствовать связь между эмоциями и телом. Проведите пользователя через body scan, помогите найти где 'живут' разные эмоции в теле.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 201,
        title: "Сканирование тела",
        description: "Найдите где в теле живут ваши эмоции",
        type: "bodywork",
        duration: 15,
        isCompleted: false,
      },
      {
        id: 202,
        title: "Карта эмоций тела",
        description: "Нарисуйте карту ваших эмоциональных ощущений",
        type: "reflection",
        duration: 10,
        isCompleted: false,
      }
    ]
  },
  {
    id: 3,
    title: "День 3: Принятие без борьбы",
    description: "Учимся принимать эмоции такими, какие они есть, без попыток их изменить.",
    emoji: "🤝",
    systemPrompt: "Вы мастер медитации mindfulness и специалист по принятию эмоций. Ваша роль - научить пользователя наблюдать за эмоциями без сопротивления. Используйте метафоры погоды и волн.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 301,
        title: "Медитация принятия",
        description: "Практика наблюдения за эмоциями без оценки",
        type: "meditation",
        duration: 12,
        isCompleted: false,
      },
      {
        id: 302,
        title: "Письмо к трудной эмоции",
        description: "Напишите письмо эмоции, которую обычно избегаете",
        type: "journaling",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 4,
    title: "День 4: Диалог с эмоциями",
    description: "Эмоции как внутренние советники. Учимся с ними разговаривать.",
    emoji: "💬",
    systemPrompt: "Вы специалист по внутренним семейным системам (IFS). Помогите пользователю установить диалог с разными эмоциональными частями личности. Каждая эмоция - это внутренний персонаж с важным сообщением.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 401,
        title: "Разговор с гневом",
        description: "Поговорите со своим гневом как с отдельной личностью",
        type: "reflection",
        duration: 20,
        isCompleted: false,
      },
      {
        id: 402,
        title: "Совет от страха",
        description: "Выясните, что пытается сказать ваш страх",
        type: "journaling",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 5,
    title: "День 5: Внутренний ребенок",
    description: "Исцеление детских эмоциональных травм и установление связи с внутренним ребенком.",
    emoji: "👶",
    systemPrompt: "Вы травма-информированный терапевт, специалист по работе с внутренним ребенком. Создайте безопасное пространство для исследования детских эмоций. Будьте очень мягкими и поддерживающими.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 501,
        title: "Встреча с внутренним ребенком",
        description: "Визуализация встречи с собой в детстве",
        type: "meditation",
        duration: 18,
        isCompleted: false,
      },
      {
        id: 502,
        title: "Письмо маленькому себе",
        description: "Напишите поддерживающее письмо себе в детстве",
        type: "journaling",
        duration: 20,
        isCompleted: false,
      }
    ]
  },
  {
    id: 6,
    title: "День 6: Эмоциональная регуляция",
    description: "Практические инструменты для управления интенсивными эмоциями.",
    emoji: "⚖️",
    systemPrompt: "Вы эксперт по DBT (диалектическая поведенческая терапия) и эмоциональной регуляции. Обучите пользователя конкретным техникам: TIPP, 5-4-3-2-1, квадратное дыхание.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 601,
        title: "Техника TIPP",
        description: "Изучите технику быстрого снятия стресса",
        type: "practice",
        duration: 10,
        isCompleted: false,
      },
      {
        id: 602,
        title: "5-4-3-2-1 заземление",
        description: "Практика возвращения в настоящий момент",
        type: "practice",
        duration: 8,
        isCompleted: false,
      }
    ]
  },
  {
    id: 7,
    title: "День 7: Недельная интеграция",
    description: "Подведение итогов первой недели. Закрепление навыков.",
    emoji: "🎯",
    systemPrompt: "Вы мудрый наставник, помогающий интегрировать полученные знания. Проведите рефлексию недели, выделите ключевые инсайты пользователя.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 701,
        title: "Недельная рефлексия",
        description: "Анализ прогресса и открытий недели",
        type: "reflection",
        duration: 25,
        isCompleted: false,
      }
    ]
  },
  {
    id: 8,
    title: "День 8: Эмоциональный интеллект в отношениях",
    description: "Как наши эмоции влияют на отношения с другими людьми.",
    emoji: "👥",
    systemPrompt: "Вы специалист по межличностным отношениям и эмоциональному интеллекту. Помогите пользователю понять, как их эмоции влияют на отношения.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 801,
        title: "Эмоциональное зеркало",
        description: "Как ваши эмоции отражаются на близких",
        type: "reflection",
        duration: 15,
        isCompleted: false,
      },
      {
        id: 802,
        title: "Практика эмпатии",
        description: "Упражнение на понимание эмоций другого",
        type: "practice",
        duration: 10,
        isCompleted: false,
      }
    ]
  },
  {
    id: 9,
    title: "День 9: Работа с тревогой",
    description: "Глубокое изучение тревоги - ее функций, проявлений и способов работы с ней.",
    emoji: "🌪️",
    systemPrompt: "Вы специалист по тревожным расстройствам с опытом когнитивно-поведенческой терапии. Помогите пользователю понять природу тревоги и освоить техники ее регуляции.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 901,
        title: "Анатомия тревоги",
        description: "Изучите как тревога проявляется в вашем теле и мыслях",
        type: "reflection",
        duration: 18,
        isCompleted: false,
      },
      {
        id: 902,
        title: "Дыхание против тревоги",
        description: "Специальная дыхательная техника для тревоги",
        type: "breathing",
        duration: 12,
        isCompleted: false,
      }
    ]
  },
  {
    id: 10,
    title: "День 10: Трансформация гнева",
    description: "Гнев как сила для изменений. Учимся использовать энергию гнева конструктивно.",
    emoji: "🔥",
    systemPrompt: "Вы эксперт по работе с гневом. Помогите пользователю понять, что гнев - это не враг, а энергия для защиты границ и изменений.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1001,
        title: "Сообщение гнева",
        description: "Выясните, что пытается сказать ваш гнев",
        type: "reflection",
        duration: 15,
        isCompleted: false,
      },
      {
        id: 1002,
        title: "Физическая разрядка",
        description: "Безопасные способы выпустить энергию гнева",
        type: "practice",
        duration: 10,
        isCompleted: false,
      }
    ]
  },
  {
    id: 11,
    title: "День 11: Грусть как учитель",
    description: "Исследование грусти, ее целительных свойств и роли в эмоциональном развитии.",
    emoji: "🌧️",
    systemPrompt: "Вы специалист по работе с потерями и грустью. Помогите пользователю увидеть в грусти учителя и целителя, а не врага.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1101,
        title: "Ритуал прощания",
        description: "Создайте ритуал для отпускания того, что больше не служит",
        type: "reflection",
        duration: 20,
        isCompleted: false,
      },
      {
        id: 1102,
        title: "Слезы как очищение",
        description: "Медитация принятия грусти и слез",
        type: "meditation",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 12,
    title: "День 12: Радость и благодарность",
    description: "Культивирование позитивных эмоций. Практики благодарности и радости.",
    emoji: "☀️",
    systemPrompt: "Вы специалист по позитивной психологии. Научите пользователя не только управлять трудными эмоциями, но и культивировать радость и благодарность.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1201,
        title: "Дневник благодарности",
        description: "Найдите 5 вещей, за которые вы благодарны сегодня",
        type: "journaling",
        duration: 10,
        isCompleted: false,
      },
      {
        id: 1202,
        title: "Медитация радости",
        description: "Практика культивирования радости в теле",
        type: "meditation",
        duration: 12,
        isCompleted: false,
      }
    ]
  },
  {
    id: 13,
    title: "День 13: Эмоциональные границы",
    description: "Как защитить свое эмоциональное пространство и установить здоровые границы.",
    emoji: "🛡️",
    systemPrompt: "Вы эксперт по здоровым границам в отношениях. Помогите пользователю понять, как эмоции связаны с границами и как их защищать.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1301,
        title: "Карта ваших границ",
        description: "Определите, где ваши границы слабы или нарушены",
        type: "reflection",
        duration: 18,
        isCompleted: false,
      },
      {
        id: 1302,
        title: "Практика 'НЕТ'",
        description: "Упражнение на установление границ",
        type: "practice",
        duration: 10,
        isCompleted: false,
      }
    ]
  },
  {
    id: 14,
    title: "День 14: Интеграция второй недели",
    description: "Осмысление прогресса. Закрепление навыков эмоциональной регуляции.",
    emoji: "🎪",
    systemPrompt: "Вы мудрый интегративный терапевт. Помогите пользователю увидеть их прогресс и интегрировать все изученные техники в целостную систему.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1401,
        title: "Ваша эмоциональная система",
        description: "Создайте карту ваших эмоциональных паттернов",
        type: "reflection",
        duration: 25,
        isCompleted: false,
      }
    ]
  },
  {
    id: 15,
    title: "День 15: Эмоции и творчество",
    description: "Как эмоции питают творчество и как творчество исцеляет эмоции.",
    emoji: "🎨",
    systemPrompt: "Вы арт-терапевт с глубоким пониманием связи эмоций и творчества. Помогите пользователю выразить эмоции через творчество.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1501,
        title: "Эмоциональная живопись",
        description: "Выразите ваши эмоции через цвет и форму",
        type: "practice",
        duration: 20,
        isCompleted: false,
      },
      {
        id: 1502,
        title: "Письмо от имени эмоции",
        description: "Напишите рассказ от лица вашей эмоции",
        type: "journaling",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 16,
    title: "День 16: Эмоциональная мудрость предков",
    description: "Изучение эмоциональных паттернов семьи. Исцеление родовых травм.",
    emoji: "🌳",
    systemPrompt: "Вы специалист по семейным системам и трансгенерационной терапии. Помогите пользователю понять эмоциональное наследие своей семьи.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1601,
        title: "Эмоциональное древо семьи",
        description: "Исследуйте эмоциональные паттерны в вашей семье",
        type: "reflection",
        duration: 25,
        isCompleted: false,
      },
      {
        id: 1602,
        title: "Исцеление родовой боли",
        description: "Ритуал освобождения от семейных эмоциональных травм",
        type: "meditation",
        duration: 18,
        isCompleted: false,
      }
    ]
  },
  {
    id: 17,
    title: "День 17: Эмоциональное лидерство",
    description: "Как использовать эмоциональный интеллект для влияния и лидерства.",
    emoji: "👑",
    systemPrompt: "Вы коуч по эмоциональному лидерству. Покажите пользователю, как эмоциональная зрелость делает из человека лидера.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1701,
        title: "Ваш стиль эмоционального лидерства",
        description: "Определите, как вы влияете на эмоции других",
        type: "reflection",
        duration: 20,
        isCompleted: false,
      },
      {
        id: 1702,
        title: "Практика эмоционального влияния",
        description: "Техники позитивного влияния через эмоции",
        type: "practice",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 18,
    title: "День 18: Эмоции и жизненная цель",
    description: "Как эмоции указывают на нашу истинную цель и призвание.",
    emoji: "🎯",
    systemPrompt: "Вы экзистенциальный терапевт и коуч по поиску смысла. Помогите пользователю понять, как эмоции связаны с их жизненной целью.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1801,
        title: "Эмоциональный компас",
        description: "Используйте эмоции как навигатор к вашей цели",
        type: "reflection",
        duration: 22,
        isCompleted: false,
      },
      {
        id: 1802,
        title: "Видение эмоционально зрелого будущего",
        description: "Создайте образ себя с развитым эмоциональным интеллектом",
        type: "meditation",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 19,
    title: "День 19: Эмоциональное наследие",
    description: "Как передать эмоциональную мудрость следующим поколениям.",
    emoji: "🌱",
    systemPrompt: "Вы мудрый учитель эмоциональной зрелости. Помогите пользователю осознать их роль в передаче эмоциональной мудрости другим.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 1901,
        title: "Письмо будущим поколениям",
        description: "Напишите письмо о эмоциональной мудрости для будущих поколений",
        type: "journaling",
        duration: 25,
        isCompleted: false,
      },
      {
        id: 1902,
        title: "Практика эмоционального наставничества",
        description: "Как вы можете помочь другим в их эмоциональном развитии",
        type: "reflection",
        duration: 15,
        isCompleted: false,
      }
    ]
  },
  {
    id: 20,
    title: "День 20: Мастерство эмоционального интеллекта",
    description: "Итоговая интеграция. Празднование трансформации. Планы на будущее.",
    emoji: "🏆",
    systemPrompt: "Вы мастер-терапевт, празднующий завершение глубокого путешествия пользователя. Помогите им осознать всю глубину их трансформации и создать план дальнейшего развития.",
    isCompleted: false,
    isLocked: true,
    exercises: [
      {
        id: 2001,
        title: "Манифест вашего эмоционального мастерства",
        description: "Создайте декларацию вашей эмоциональной зрелости",
        type: "reflection",
        duration: 30,
        isCompleted: false,
      },
      {
        id: 2002,
        title: "Ритуал завершения и нового начала",
        description: "Церемония празднования вашего роста",
        type: "meditation",
        duration: 20,
        isCompleted: false,
      }
    ]
  }
];

// Cache for user progress
let progressCache: UserProgress | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

class EmotionalCourseService {
  // Получение прогресса пользователя с кэшированием
  static async getCachedUserProgress(): Promise<UserProgress> {
    const now = Date.now();
    
    // Return cache if valid
    if (progressCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return progressCache;
    }
    
    // Load fresh data
    try {
      const progress = await AsyncStorage.getItem('emotionalCourseProgress');
      if (progress) {
        progressCache = JSON.parse(progress);
      } else {
        progressCache = {
          currentDay: 1,
          completedDays: [],
          currentStreak: 0,
          notes: {}
        };
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      progressCache = {
        currentDay: 1,
        completedDays: [],
        currentStreak: 0,
        notes: {}
      };
    }
    
    cacheTimestamp = now;
    return progressCache!;
  }

  // Сохранение прогресса
  static async saveUserProgress(progress: UserProgress): Promise<void> {
    try {
      await AsyncStorage.setItem('emotionalCourseProgress', JSON.stringify(progress));
      progressCache = progress;
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  // Получение всех дней курса
  static async getAllDays(): Promise<CourseDay[]> {
    const progress = await this.getCachedUserProgress();
    return emotionalCourseDays.map(day => ({
      ...day,
      isCompleted: progress.completedDays.includes(day.id),
      isLocked: day.id > 1 && !progress.completedDays.includes(day.id - 1) && day.id !== progress.currentDay
    }));
  }

  // Получение конкретного дня
  static async getDay(dayId: number): Promise<CourseDay | null> {
    const days = await this.getAllDays();
    return days.find(day => day.id === dayId) || null;
  }

  // Завершение дня
  static async completeDay(dayId: number): Promise<void> {
    const progress = await this.getCachedUserProgress();
    
    if (!progress.completedDays.includes(dayId)) {
      progress.completedDays.push(dayId);
      
      // Update streak
      const today = new Date().toDateString();
      if (progress.lastStreakDate === today) {
        // Already counted today
      } else if (progress.lastStreakDate === new Date(Date.now() - 86400000).toDateString()) {
        // Yesterday
        progress.currentStreak += 1;
      } else {
        // Reset streak
        progress.currentStreak = 1;
      }
      
      progress.lastStreakDate = today;
      progress.lastActivityDate = new Date().toISOString();
      
      // Unlock next day
      if (dayId < 20) {
        progress.currentDay = Math.max(progress.currentDay, dayId + 1);
      }
      
      await this.saveUserProgress(progress);
    }
  }

  // Завершение упражнения
  static async completeExercise(dayId: number, exerciseId: number): Promise<void> {
    // This would need implementation in the day data structure
    // For now, we'll just mark it as completed in memory
    console.log(`Exercise ${exerciseId} completed for day ${dayId}`);
  }

  // Добавление заметки
  static async addNote(dayId: number, note: string): Promise<void> {
    const progress = await this.getCachedUserProgress();
    progress.notes[dayId.toString()] = note;
    await this.saveUserProgress(progress);
  }

  // Получение заметки
  static async getNote(dayId: number): Promise<string> {
    const progress = await this.getCachedUserProgress();
    return progress.notes[dayId.toString()] || '';
  }

  // Сброс прогресса (для отладки)
  static async resetProgress(): Promise<void> {
    await AsyncStorage.removeItem('emotionalCourseProgress');
    progressCache = null;
    cacheTimestamp = 0;
  }

  // Получение статистики
  static async getStats(): Promise<{
    totalDays: number;
    completedDays: number;
    currentStreak: number;
    completionRate: number;
  }> {
    const progress = await this.getCachedUserProgress();
    return {
      totalDays: 20,
      completedDays: progress.completedDays.length,
      currentStreak: progress.currentStreak,
      completionRate: (progress.completedDays.length / 20) * 100
    };
  }
}

export default EmotionalCourseService;
