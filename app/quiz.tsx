import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Dict = Record<string, string>;
const pick = (obj: Dict, lang: AppLanguage): string => obj[lang] ?? obj.en;

type FocusTag = 'anxiety' | 'burnout' | 'mood' | 'sleep' | 'relationships' | 'confidence';

interface QuizOption {
  id: string;
  label: Dict;
  tag: FocusTag;
  weight: number; // 0-100, contributes to the reflection score
}

interface QuizQuestion {
  id: string;
  question: Dict;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'feeling',
    question: {
      en: 'Which feels closest to you lately?',
      ka: 'ბოლო დღეებში რომელი გრძნობაა შენთან ყველაზე ახლოს?',
      ru: 'Что вам ближе всего в последнее время?',
    },
    options: [
      { id: 'anxious', label: { en: 'Anxious, on edge', ka: 'შფოთვა და მღელვარება', ru: 'Тревога, на нервах' }, tag: 'anxiety', weight: 75 },
      { id: 'drained', label: { en: 'Drained, burnt out', ka: 'დაცლილობა და გადაწვის შეგრძნება', ru: 'Опустошённость, выгорание' }, tag: 'burnout', weight: 70 },
      { id: 'sad', label: { en: 'Sad or low', ka: 'მოწყენილობა, სევდა', ru: 'Грусть, подавленность' }, tag: 'mood', weight: 65 },
      { id: 'fine', label: { en: 'Actually okay — just curious', ka: 'საერთოდ კარგად, უბრალოდ ცნობისმოყვარეა', ru: 'В целом неплохо — просто любопытно' }, tag: 'mood', weight: 15 },
    ],
  },
  {
    id: 'sleep',
    question: {
      en: 'How well have you been sleeping?',
      ka: 'რამდენად კარგად გძინავს ღამღამობით?',
      ru: 'Как вы спите по ночам?',
    },
    options: [
      { id: 'very-poor', label: { en: 'Very poorly, almost every night', ka: 'ძალიან ცუდად, თითქმის ყოველ ღამე', ru: 'Очень плохо, почти каждую ночь' }, tag: 'sleep', weight: 85 },
      { id: 'often', label: { en: 'I often struggle to fall asleep', ka: 'ხშირად მიჭირს დაძინება', ru: 'Часто трудно уснуть' }, tag: 'sleep', weight: 60 },
      { id: 'sometimes', label: { en: 'Sometimes', ka: 'ხანდახან', ru: 'Иногда' }, tag: 'sleep', weight: 35 },
      { id: 'fine', label: { en: 'I sleep just fine', ka: 'კარგად ვიძინებ', ru: 'Сплю нормально' }, tag: 'sleep', weight: 10 },
    ],
  },
  {
    id: 'bothering',
    question: {
      en: 'What weighs on you the most right now?',
      ka: 'რა გაწუხებს ყველაზე მეტად ამჟამად?',
      ru: 'Что беспокоит вас больше всего сейчас?',
    },
    options: [
      { id: 'anxiety', label: { en: 'Anxiety and racing thoughts', ka: 'შფოთვა და გაუთავებელი ფიქრები', ru: 'Тревога и навязчивые мысли' }, tag: 'anxiety', weight: 80 },
      { id: 'relationships', label: { en: 'Relationships with people close to me', ka: 'ურთიერთობები ახლობლებთან', ru: 'Отношения с близкими' }, tag: 'relationships', weight: 60 },
      { id: 'confidence', label: { en: 'Confidence and self-worth', ka: 'თავდაჯერებულობა და თვითშეფასება', ru: 'Уверенность и самооценка' }, tag: 'confidence', weight: 55 },
      { id: 'burnout', label: { en: 'Work overload and burnout', ka: 'სამუშაო დატვირთვა და გადაწვა', ru: 'Перегрузка и выгорание на работе' }, tag: 'burnout', weight: 75 },
    ],
  },
  {
    id: 'tried-before',
    question: {
      en: 'Have you tried therapy or self-help tools before?',
      ka: 'უცდიათ აქამდე თერაპია ან თვითდახმარების ხელსაწყოები?',
      ru: 'Пробовали ли вы раньше терапию или инструменты самопомощи?',
    },
    options: [
      { id: 'yes-helped', label: { en: 'Yes, and it helped', ka: 'დიახ, დამეხმარა', ru: 'Да, и это помогло' }, tag: 'mood', weight: 20 },
      { id: 'yes-not-enough', label: { en: 'Yes, but not enough', ka: 'დიახ, მაგრამ საკმარისად არა', ru: 'Да, но недостаточно' }, tag: 'mood', weight: 50 },
      { id: 'no-never', label: { en: 'No, never', ka: 'არა, არასდროს', ru: 'Нет, никогда' }, tag: 'mood', weight: 45 },
      { id: 'thinking', label: { en: 'Thinking about it right now', ka: 'ახლა სწორედ ამაზე ვფიქრობ', ru: 'Как раз сейчас об этом думаю' }, tag: 'mood', weight: 55 },
    ],
  },
  {
    id: 'energy',
    question: {
      en: 'What does your typical daily energy look like?',
      ka: 'როგორია შენი დღის ტიპური ენერგია?',
      ru: 'Какая у вас обычно энергия в течение дня?',
    },
    options: [
      { id: 'empty', label: { en: 'Running on empty', ka: 'ბოლომდე დაცლილი', ru: 'На нуле' }, tag: 'burnout', weight: 85 },
      { id: 'updown', label: { en: 'Up and down', ka: 'ხან კარგად, ხან ცუდად', ru: 'То взлёт, то падение' }, tag: 'mood', weight: 50 },
      { id: 'okay', label: { en: 'Mostly okay', ka: 'საშუალოდ ნორმალურად', ru: 'В целом нормально' }, tag: 'mood', weight: 25 },
      { id: 'energetic', label: { en: 'Energetic and active', ka: 'ენერგიული და აქტიური', ru: 'Энергичная и активная' }, tag: 'mood', weight: 10 },
    ],
  },
  {
    id: 'goal',
    question: {
      en: 'What would you like most right now?',
      ka: 'რისი მიღწევა გინდა ყველაზე მეტად ახლა?',
      ru: 'Чего вам хотелось бы больше всего сейчас?',
    },
    options: [
      { id: 'calm', label: { en: 'Calm, and less anxiety', ka: 'სიმშვიდე და შფოთვის შემცირება', ru: 'Спокойствие и меньше тревоги' }, tag: 'anxiety', weight: 70 },
      { id: 'understand', label: { en: 'Understand myself better', ka: 'საკუთარი თავის უკეთ გაცნობა', ru: 'Лучше понять себя' }, tag: 'confidence', weight: 55 },
      { id: 'relationships', label: { en: 'Better relationships', ka: 'ურთიერთობების გაუმჯობესება', ru: 'Улучшить отношения' }, tag: 'relationships', weight: 55 },
      { id: 'try', label: { en: 'Just try something new', ka: 'უბრალოდ ახალი რაღაცის ცდა', ru: 'Просто попробовать что-то новое' }, tag: 'mood', weight: 30 },
    ],
  },
];

const FOCUS_COPY: Record<FocusTag, { title: Dict; desc: Dict; icon: string; gradient: [string, string]; feature: Dict }> = {
  anxiety: {
    title: { en: 'Anxiety & racing thoughts', ka: 'შფოთვა და გაუთავებელი ფიქრები', ru: 'Тревога и навязчивые мысли' },
    desc: {
      en: 'Your answers point to a mind that rarely gets to rest.',
      ka: 'შენი პასუხები მიუთითებს გონებაზე, რომელსაც იშვიათად ეძლევა დასვენება.',
      ru: 'Ваши ответы указывают на ум, который редко получает отдых.',
    },
    icon: 'brain',
    gradient: ['#6366F1', '#8B5CF6'],
    feature: {
      en: '24/7 AI Chat with grounding techniques, whenever anxiety spikes',
      ka: '24/7 AI ჩათი დამამშვიდებელი ტექნიკებით, როცა შფოთვა მატულობს',
      ru: 'AI-чат 24/7 с техниками заземления — когда тревога усиливается',
    },
  },
  burnout: {
    title: { en: 'Burnout & overload', ka: 'გადაწვა და გადატვირთვა', ru: 'Выгорание и перегрузка' },
    desc: {
      en: 'It sounds like you’ve been running on empty for a while.',
      ka: 'როგორც ჩანს, დიდი ხანია ბოლომდე დაცლილი ხარ.',
      ru: 'Похоже, вы уже давно работаете на пределе.',
    },
    icon: 'battery-quarter',
    gradient: ['#F59E0B', '#EF4444'],
    feature: {
      en: 'A structured Art Therapy course, paced at 1 session a day — no rush',
      ka: 'სტრუქტურირებული არტ თერაპიის კურსი, დღეში 1 სესიით — ჩქარობის გარეშე',
      ru: 'Структурированный курс арт-терапии — 1 сессия в день, без спешки',
    },
  },
  mood: {
    title: { en: 'Low mood & heaviness', ka: 'დაბალი განწყობა და სიმძიმე', ru: 'Сниженное настроение и тяжесть' },
    desc: {
      en: 'A gentle, creative outlet could help more than pushing through alone.',
      ka: 'რბილმა, შემოქმედებითმა გამოხატვამ შეიძლება მეტი დაგეხმაროს, ვიდრე მარტო გამკლავებამ.',
      ru: 'Мягкий творческий выход может помочь больше, чем попытки справиться в одиночку.',
    },
    icon: 'palette',
    gradient: ['#EC4899', '#8B5CF6'],
    feature: {
      en: 'Art Therapy — express what’s hard to put into words, one drawing at a time',
      ka: 'არტ თერაპია — გამოხატე ის, რისი თქმაც სიტყვებით რთულია, ერთი ნახატით ერთდროულად',
      ru: 'Арт-терапия — выразите то, что трудно облечь в слова, один рисунок за раз',
    },
  },
  sleep: {
    title: { en: 'Restless nights', ka: 'მშფოთვარე ღამეები', ru: 'Беспокойные ночи' },
    desc: {
      en: 'Poor sleep quietly makes everything else harder.',
      ka: 'ცუდი ძილი ჩუმად ართულებს ყველაფერს დანარჩენს.',
      ru: 'Плохой сон незаметно усложняет всё остальное.',
    },
    icon: 'moon',
    gradient: ['#60A5FA', '#3B82F6'],
    feature: {
      en: 'Guided breathing and calming AI conversations before bed',
      ka: 'სუნთქვის ვარჯიშები და დამამშვიდებელი AI საუბრები ძილის წინ',
      ru: 'Дыхательные практики и успокаивающие AI-беседы перед сном',
    },
  },
  relationships: {
    title: { en: 'Relationships & connection', ka: 'ურთიერთობები და კავშირი', ru: 'Отношения и связь' },
    desc: {
      en: 'A lot of what troubles us shows up between us and other people.',
      ka: 'ის, რაც გვაწუხებს, ხშირად სწორედ ურთიერთობებში ვლინდება.',
      ru: 'Многое из того, что нас беспокоит, проявляется именно в отношениях.',
    },
    icon: 'clone',
    gradient: ['#22D3EE', '#06B6D4'],
    feature: {
      en: 'Card Therapy — a gentle, story-based way into what’s really going on',
      ka: 'ბარათების თერაპია — რბილი, ისტორიაზე დაფუძნებული გზა იმის გასაგებად, რაც ნამდვილად ხდება',
      ru: 'Терапия картами — мягкий способ через истории понять, что происходит на самом деле',
    },
  },
  confidence: {
    title: { en: 'Confidence & self-worth', ka: 'თავდაჯერებულობა და თვითშეფასება', ru: 'Уверенность и самооценка' },
    desc: {
      en: 'Understanding yourself better is often the first real step.',
      ka: 'საკუთარი თავის უკეთ გაცნობა ხშირად პირველი ნამდვილი ნაბიჯია.',
      ru: 'Лучше понять себя — часто первый настоящий шаг.',
    },
    icon: 'star',
    gradient: ['#34D399', '#10B981'],
    feature: {
      en: 'Card Therapy and AI Chat, both built to help you understand your own patterns',
      ka: 'ბარათების თერაპია და AI ჩათი — ორივე შენი შაბლონების გასაგებად',
      ru: 'Терапия картами и AI-чат — оба помогают понять собственные паттерны',
    },
  },
};

const T = {
  introKicker: { en: 'A 2-MINUTE CHECK-IN', ka: '2-წუთიანი თვითშემოწმება', ru: '2-МИНУТНЫЙ ЧЕК-ИН' } as Dict,
  introTitle: {
    en: 'How are you\nreally doing?',
    ka: 'როგორ ხარ\nსინამდვილეში?',
    ru: 'Как вы\nна самом деле?',
  } as Dict,
  introSubtitle: {
    en: 'Answer a few honest questions and get a personalized starting point — free, private, takes about 2 minutes.',
    ka: 'უპასუხე რამდენიმე გულწრფელ კითხვას და მიიღე პერსონალური საწყისი წერტილი — უფასოდ, პირადულად, დაახლოებით 2 წუთში.',
    ru: 'Ответьте на несколько честных вопросов и получите персональную отправную точку — бесплатно, конфиденциально, около 2 минут.',
  } as Dict,
  introStart: { en: 'Start the check-in', ka: 'დაწყება', ru: 'Начать' } as Dict,
  introFootnote: {
    en: 'Not a clinical diagnosis. If you’re in crisis, please contact a licensed professional or local emergency line.',
    ka: 'ეს არ არის კლინიკური დიაგნოზი. კრიზისის შემთხვევაში მიმართე სპეციალისტს ან საგანგებო სამსახურს.',
    ru: 'Это не клинический диагноз. В кризисной ситуации обратитесь к специалисту или на горячую линию.',
  } as Dict,
  questionOf: {
    en: (i: number, n: number) => `Question ${i} of ${n}`,
    ka: (i: number, n: number) => `კითხვა ${i} / ${n}`,
    ru: (i: number, n: number) => `Вопрос ${i} из ${n}`,
  } as unknown as Record<string, (i: number, n: number) => string>,
  analyzingTitle: {
    en: 'Reading your answers…',
    ka: 'ვამუშავებთ შენს პასუხებს…',
    ru: 'Обрабатываем ваши ответы…',
  } as Dict,
  emailKicker: { en: 'YOUR RESULTS ARE READY', ka: 'შენი შედეგები მზადაა', ru: 'ВАШ РЕЗУЛЬТАТ ГОТОВ' } as Dict,
  emailTitle: {
    en: 'Where should we\nsend your plan?',
    ka: 'სად გამოგიგზავნოთ\nშენი გეგმა?',
    ru: 'Куда отправить\nваш план?',
  } as Dict,
  emailSubtitle: {
    en: 'Enter your email to unlock your full results and a personalized starting point.',
    ka: 'შეიყვანე ელფოსტა, რომ ნახო შენი სრული შედეგები და პერსონალური საწყისი წერტილი.',
    ru: 'Введите email, чтобы увидеть полный результат и персональный план.',
  } as Dict,
  emailPlaceholder: { en: 'you@email.com', ka: 'you@email.com', ru: 'you@email.com' } as Dict,
  emailInvalid: { en: 'Please enter a valid email', ka: 'გთხოვ შეიყვანე სწორი ელფოსტა', ru: 'Введите корректный email' } as Dict,
  emailContinue: { en: 'Show my results', ka: 'შედეგების ნახვა', ru: 'Показать результат' } as Dict,
  emailSkip: { en: 'Maybe later — just start free', ka: 'ალბათ მოგვიანებით — დაწყება უფასოდ', ru: 'Может позже — начать бесплатно' } as Dict,
  emailPrivacy: {
    en: 'We’ll only use this to send your plan. No spam.',
    ka: 'გამოვიყენებთ მხოლოდ შენი გეგმის გასაგზავნად. სპამი არ იქნება.',
    ru: 'Используем только для отправки вашего плана. Без спама.',
  } as Dict,
  resultsKicker: { en: 'YOUR STARTING POINT', ka: 'შენი საწყისი წერტილი', ru: 'ВАША ОТПРАВНАЯ ТОЧКА' } as Dict,
  scoreLabel: { en: 'Current pressure level', ka: 'ამჟამინდელი დატვირთვის დონე', ru: 'Текущий уровень нагрузки' } as Dict,
  scoreZoneLow: { en: 'Balanced', ka: 'დაბალანსებული', ru: 'Сбалансировано' } as Dict,
  scoreZoneMid: { en: 'Under some pressure', ka: 'გარკვეული წნეხის ქვეშ', ru: 'Под некоторым давлением' } as Dict,
  scoreZoneHigh: { en: 'Significant strain', ka: 'მნიშვნელოვანი დაძაბულობა', ru: 'Значительное напряжение' } as Dict,
  focusAreaLabel: { en: 'Your main focus area', ka: 'შენი ძირითადი ფოკუსის სფერო', ru: 'Ваша основная зона фокуса' } as Dict,
  recommendedTitle: { en: 'Built for exactly this', ka: 'ზუსტად ამისთვისაა შექმნილი', ru: 'Создано именно для этого' } as Dict,
  otherToolsTitle: { en: 'Plus everything else in beHappy', ka: 'პლუს ყველაფერი დანარჩენი beHappy-ში', ru: 'А также всё остальное в beHappy' } as Dict,
  otherTools: {
    ai: { en: 'AI Therapy Chat', ka: 'AI თერაპია ჩათი', ru: 'AI-чат терапии' },
    art: { en: 'Art Therapy course', ka: 'არტ თერაპიის კურსი', ru: 'Курс арт-терапии' },
    cards: { en: 'Card Therapy', ka: 'ბარათების თერაპია', ru: 'Терапия картами' },
    journal: { en: 'Daily Journal', ka: 'ყოველდღიური ჟურნალი', ru: 'Ежедневный дневник' },
  } as Record<string, Dict>,
  freeCta: { en: 'Start my first session — free', ka: 'დავიწყო პირველი სესია — უფასოდ', ru: 'Начать первую сессию — бесплатно' } as Dict,
  freeCtaSub: {
    en: 'No card needed. Unlock Premium any time after.',
    ka: 'ბარათი არ სჭირდება. Premium ნებისმიერ დროს შეგიძლია გახსნა.',
    ru: 'Карта не нужна. Premium можно открыть в любой момент позже.',
  } as Dict,
  premiumCta: { en: 'See Premium plans instead', ka: 'ან ნახე Premium პაკეტები', ru: 'Или смотреть тарифы Premium' } as Dict,
  trustEvidence: { en: 'Evidence-based methods', ka: 'მეცნიერულად დადასტურებული მეთოდები', ru: 'Научно обоснованные методы' } as Dict,
  trustPrivate: { en: 'Private & confidential', ka: 'პირადი და კონფიდენციალური', ru: 'Приватно и конфиденциально' } as Dict,
  trustAnytime: { en: 'Available 24/7', ka: 'ხელმისაწვდომია 24/7', ru: 'Доступно 24/7' } as Dict,
};

type Phase = 'intro' | 'quiz' | 'analyzing' | 'email' | 'results';

export default function QuizPage() {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizOption>>({});
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const runFade = () => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const bgGradient = isDark
    ? (['#1a1a2e', '#16213e', '#0f3460'] as const)
    : (['#667eea', '#764ba2', '#f093fb'] as const);
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)';
  const textPrimary = '#FFFFFF';
  const textSecondary = isDark ? 'rgba(229,231,235,0.85)' : 'rgba(255,255,255,0.9)';
  const gold = '#FBBF24';

  const { score, focusTag } = useMemo(() => {
    const picked = Object.values(answers);
    if (picked.length === 0) return { score: 0, focusTag: 'mood' as FocusTag };
    const avg = picked.reduce((sum, o) => sum + o.weight, 0) / picked.length;
    const tally: Partial<Record<FocusTag, number>> = {};
    for (const o of picked) tally[o.tag] = (tally[o.tag] || 0) + o.weight;
    const top = (Object.entries(tally) as [FocusTag, number][]).sort((a, b) => b[1] - a[1])[0];
    return { score: Math.round(avg), focusTag: top ? top[0] : ('mood' as FocusTag) };
  }, [answers]);

  const scoreZone = score >= 67 ? 'high' : score >= 34 ? 'mid' : 'low';
  const scoreZoneLabel = scoreZone === 'high' ? T.scoreZoneHigh : scoreZone === 'mid' ? T.scoreZoneMid : T.scoreZoneLow;
  const scoreZoneColor = scoreZone === 'high' ? '#F87171' : scoreZone === 'mid' ? '#FBBF24' : '#34D399';
  const focus = FOCUS_COPY[focusTag];

  const startQuiz = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setQIndex(0);
    setPhase('quiz');
    runFade();
  };

  const selectOption = async (question: QuizQuestion, option: QuizOption) => {
    await Haptics.selectionAsync().catch(() => {});
    const next = { ...answers, [question.id]: option };
    setAnswers(next);
    setTimeout(() => {
      if (qIndex + 1 < QUESTIONS.length) {
        setQIndex(qIndex + 1);
        runFade();
      } else {
        setPhase('analyzing');
        runFade();
        setTimeout(() => {
          setPhase('email');
          runFade();
        }, 1800);
      }
    }, 220);
  };

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const submitLead = async () => {
    Keyboard.dismiss();
    if (!isValidEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('quiz:leadEmail', email.trim());
      await AsyncStorage.setItem('quiz:leadAnswers', JSON.stringify(
        Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.id]))
      ));
      // Best-effort external capture — wire EXPO_PUBLIC_LEAD_WEBHOOK_URL to a real
      // endpoint (Formspree / a sheet webhook / your own function) to actually collect
      // leads outside this device. Silently no-ops until that's configured.
      const webhook = process.env.EXPO_PUBLIC_LEAD_WEBHOOK_URL;
      if (webhook) {
        fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), focusTag, score, source: 'quiz' }),
        }).catch(() => {});
      }
    } catch {}
    setSubmitting(false);
    setPhase('results');
    runFade();
  };

  const skipEmail = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    goFreeSession();
  };

  const goFreeSession = () => router.replace('/art-therapy' as any);
  const goPremium = () => router.push({ pathname: '/subscription', params: { returnTo: '/art-therapy' } } as any);
  const goApp = () => router.replace('/(tabs)' as any);

  const totalQ = QUESTIONS.length;
  const progressPct = phase === 'quiz' ? ((qIndex + (answers[QUESTIONS[qIndex]?.id] ? 1 : 0)) / totalQ) * 100 : 0;

  return (
    <LinearGradient colors={bgGradient} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {phase === 'quiz' && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: gold }]} />
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={goApp} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fade }}>
            {phase === 'intro' && (
              <View style={styles.heroWrap}>
                <View style={[styles.iconCircle, { borderColor: 'rgba(251,191,36,0.5)' }]}>
                  <MaterialCommunityIcons name="head-heart-outline" size={34} color={gold} />
                </View>
                <Text style={[styles.kicker, { color: gold }]}>{pick(T.introKicker, language)}</Text>
                <Text style={[styles.heroTitle, { color: textPrimary }]}>{pick(T.introTitle, language)}</Text>
                <Text style={[styles.heroSubtitle, { color: textSecondary }]}>{pick(T.introSubtitle, language)}</Text>

                <TouchableOpacity onPress={startQuiz} activeOpacity={0.9} style={styles.primaryBtnWrap}>
                  <LinearGradient colors={['#FBBF24', '#F59E0B']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.primaryBtnTextDark}>{pick(T.introStart, language)}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#111827" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.trustRow}>
                  <View style={styles.trustItem}>
                    <FontAwesome5 name="flask" size={12} color={gold} />
                    <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustEvidence, language)}</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Ionicons name="lock-closed" size={13} color={gold} />
                    <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustPrivate, language)}</Text>
                  </View>
                </View>

                <Text style={[styles.footnote, { color: textSecondary }]}>{pick(T.introFootnote, language)}</Text>
              </View>
            )}

            {phase === 'quiz' && QUESTIONS[qIndex] && (
              <View style={styles.quizWrap}>
                <Text style={[styles.questionCounter, { color: gold }]}>
                  {(T.questionOf as any)[language] ? (T.questionOf as any)[language](qIndex + 1, totalQ) : (T.questionOf as any).en(qIndex + 1, totalQ)}
                </Text>
                <Text style={[styles.questionText, { color: textPrimary }]}>{pick(QUESTIONS[qIndex].question, language)}</Text>
                <View style={{ gap: 12, marginTop: 24 }}>
                  {QUESTIONS[qIndex].options.map((opt) => {
                    const selected = answers[QUESTIONS[qIndex].id]?.id === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.85}
                        onPress={() => selectOption(QUESTIONS[qIndex], opt)}
                        style={[
                          styles.optionCard,
                          { backgroundColor: selected ? 'rgba(251,191,36,0.16)' : cardBg, borderColor: selected ? gold : cardBorder, borderWidth: selected ? 2 : 1 },
                        ]}
                      >
                        <Text style={[styles.optionText, { color: textPrimary }]}>{pick(opt.label, language)}</Text>
                        <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={selected ? gold : textSecondary as string} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {phase === 'analyzing' && (
              <View style={[styles.heroWrap, { marginTop: 80 }]}>
                <ActivityIndicator size="large" color={gold} />
                <Text style={[styles.analyzingText, { color: textPrimary }]}>{pick(T.analyzingTitle, language)}</Text>
              </View>
            )}

            {phase === 'email' && (
              <View style={styles.heroWrap}>
                <View style={[styles.iconCircle, { borderColor: 'rgba(251,191,36,0.5)' }]}>
                  <Ionicons name="mail-open-outline" size={30} color={gold} />
                </View>
                <Text style={[styles.kicker, { color: gold }]}>{pick(T.emailKicker, language)}</Text>
                <Text style={[styles.heroTitle, { color: textPrimary }]}>{pick(T.emailTitle, language)}</Text>
                <Text style={[styles.heroSubtitle, { color: textSecondary }]}>{pick(T.emailSubtitle, language)}</Text>

                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(false); }}
                  placeholder={pick(T.emailPlaceholder, language)}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.emailInput, { borderColor: emailError ? '#F87171' : cardBorder, backgroundColor: cardBg, color: textPrimary }]}
                />
                {emailError && <Text style={styles.emailErrorText}>{pick(T.emailInvalid, language)}</Text>}

                <TouchableOpacity onPress={submitLead} activeOpacity={0.9} disabled={submitting} style={styles.primaryBtnWrap}>
                  <LinearGradient colors={['#FBBF24', '#F59E0B']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {submitting ? <ActivityIndicator color="#111827" /> : (
                      <>
                        <Text style={styles.primaryBtnTextDark}>{pick(T.emailContinue, language)}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#111827" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={skipEmail} activeOpacity={0.7} style={{ marginTop: 6 }}>
                  <Text style={[styles.skipLink, { color: textSecondary }]}>{pick(T.emailSkip, language)}</Text>
                </TouchableOpacity>

                <Text style={[styles.footnote, { color: textSecondary }]}>{pick(T.emailPrivacy, language)}</Text>
              </View>
            )}

            {phase === 'results' && (
              <View>
                <View style={styles.heroWrap}>
                  <Text style={[styles.kicker, { color: gold }]}>{pick(T.resultsKicker, language)}</Text>
                  <Text style={[styles.heroTitle, { color: textPrimary, fontSize: 24 }]}>{pick(focus.title, language)}</Text>
                  <Text style={[styles.heroSubtitle, { color: textSecondary }]}>{pick(focus.desc, language)}</Text>
                </View>

                {/* Score gauge */}
                <View style={[styles.gaugeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <Text style={[styles.gaugeLabel, { color: textSecondary }]}>{pick(T.scoreLabel, language)}</Text>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${Math.max(6, score)}%`, backgroundColor: scoreZoneColor }]} />
                  </View>
                  <Text style={[styles.gaugeZone, { color: scoreZoneColor }]}>{pick(scoreZoneLabel, language)}</Text>
                </View>

                {/* Recommended feature */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>{pick(T.recommendedTitle, language)}</Text>
                  <View style={[styles.perkRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <LinearGradient colors={focus.gradient} style={styles.perkIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <FontAwesome5 name={focus.icon as any} size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.perkDesc, { color: textPrimary, flex: 1 }]}>{pick(focus.feature, language)}</Text>
                  </View>
                </View>

                {/* Everything else */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>{pick(T.otherToolsTitle, language)}</Text>
                  <View style={styles.chipsWrap}>
                    {(['ai', 'art', 'cards', 'journal'] as const).map((k) => (
                      <View key={k} style={[styles.chip, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                        <Text style={[styles.chipText, { color: textPrimary }]}>{pick(T.otherTools[k], language)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.trustRow}>
                  <View style={styles.trustItem}>
                    <FontAwesome5 name="flask" size={12} color={gold} />
                    <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustEvidence, language)}</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Ionicons name="lock-closed" size={13} color={gold} />
                    <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustPrivate, language)}</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Ionicons name="flash" size={14} color={gold} />
                    <Text style={[styles.trustText, { color: textSecondary }]}>{pick(T.trustAnytime, language)}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={goFreeSession} activeOpacity={0.9} style={styles.primaryBtnWrap}>
                  <LinearGradient colors={['#FBBF24', '#F59E0B']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.primaryBtnTextDark}>{pick(T.freeCta, language)}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#111827" />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={[styles.footnote, { color: textSecondary }]}>{pick(T.freeCtaSub, language)}</Text>

                <TouchableOpacity onPress={goPremium} activeOpacity={0.7} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={[styles.skipLink, { color: textSecondary }]}>{pick(T.premiumCta, language)}</Text>
                </TouchableOpacity>

                <Text style={[styles.footnote, { color: textSecondary, marginTop: 20 }]}>{pick(T.introFootnote, language)}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  heroWrap: { alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1.5, marginBottom: 14,
  },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, textAlign: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 33 },
  heroSubtitle: { fontSize: 14.5, textAlign: 'center', lineHeight: 21, marginTop: 12, paddingHorizontal: 8, marginBottom: 20 },
  primaryBtnWrap: { width: '100%', marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16,
  },
  primaryBtnTextDark: { color: '#111827', fontWeight: '800', fontSize: 16 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 20, marginBottom: 8 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11.5, fontWeight: '600' },
  footnote: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 12, opacity: 0.85, marginTop: 12 },
  quizWrap: { paddingTop: 8 },
  questionCounter: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  questionText: { fontSize: 22, fontWeight: '800', lineHeight: 29 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16,
  },
  optionText: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  analyzingText: { fontSize: 16, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  emailInput: {
    width: '100%', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, marginTop: 4,
  },
  emailErrorText: { color: '#F87171', fontSize: 12, marginTop: 6, alignSelf: 'flex-start', fontWeight: '600' },
  skipLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  gaugeCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginTop: 8, marginBottom: 20 },
  gaugeLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
  gaugeTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugeZone: { fontSize: 15, fontWeight: '800', marginTop: 10 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  perkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  perkIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  perkDesc: { fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
});
