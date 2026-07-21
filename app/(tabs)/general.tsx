import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardProgress, emptyDashboardProgress, getDashboardProgress } from '@/services/activityAggregator';
import PurchaseService from '@/services/purchase';
import { getUserProfile, UserProfile } from '@/services/userProfileService';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function GeneralScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [artTherapyUnlocked, setArtTherapyUnlocked] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [dashboardProgress, setDashboardProgress] = useState<DashboardProgress>(emptyDashboardProgress);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const pick = (obj: Record<string, string>): string => obj[language] ?? obj.en;

  // Re-check whenever the screen regains focus, so editing the profile and coming
  // back updates this panel immediately.
  useFocusEffect(
    useCallback(() => {
      getUserProfile().then(setProfile);
    }, [])
  );

  useEffect(() => {
    let mounted = true;

    PurchaseService.isUnlocked('art-therapy')
      .then((unlocked) => {
        if (mounted) setArtTherapyUnlocked(unlocked);
      })
      .catch(() => {
        if (mounted) setArtTherapyUnlocked(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    getDashboardProgress().then((progress) => {
      if (mounted) setDashboardProgress(progress);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const t = {
    appName: 'BeHappy',
    heroSubtitle: {
      en: 'Your personal mental health companion',
      ru: 'Ваш персональный помощник в заботе о психическом здоровье',
      ka: 'შენი პირადი ფსიქიკური ჯანმრთელობის თანამგზავრი',
      hy: 'Ձեր անձնական հոգեկան առողջության ուղեկիցը',
      tr: 'Kişisel ruh sağlığı arkadaşınız',
      az: 'Şəxsi psixi sağlamlıq yoldaşınız',
      es: 'Tu compañero personal de salud mental',
      de: 'Dein persönlicher Begleiter für mentale Gesundheit',
      fr: 'Votre compagnon personnel en santé mentale',
      pt: 'Seu companheiro pessoal de saúde mental',
      ar: 'رفيقك الشخصي للصحة النفسية',
      id: 'Pendamping kesehatan mental pribadi Anda',
      it: 'Il tuo compagno personale per la salute mentale',
      ja: 'あなた専用のメンタルヘルスコンパニオン',
      zh: '您的个人心理健康伙伴',
      hi: 'आपका व्यक्तिगत मानसिक स्वास्थ्य साथी',
      ko: '당신의 개인 정신 건강 동반자',
      uk: 'Ваш особистий помічник у піклуванні про психічне здоров\'я',
      pl: 'Twój osobisty towarzysz zdrowia psychicznego'
    },
    quickAccess: {
      en: 'Quick Access',
      ru: 'Быстрый доступ',
      ka: 'სწრაფი წვდომა',
      hy: 'Արագ մուտք',
      tr: 'Hızlı Erişim',
      az: 'Sürətli giriş',
      es: 'Acceso rápido',
      de: 'Schnellzugriff',
      fr: 'Accès rapide',
      pt: 'Acesso rápido',
      ar: 'الوصول السريع',
      id: 'Akses Cepat',
      it: 'Accesso rapido',
      ja: 'クイックアクセス',
      zh: '快速访问',
      hi: 'त्वरित पहुँच',
      ko: '빠른 접근',
      uk: 'Швидкий доступ',
      pl: 'Szybki dostęp'
    },
    settings: {
      en: 'Settings',
      ru: 'Настройки',
      ka: 'პარამეტრები',
      hy: 'Կարգավորումներ',
      tr: 'Ayarlar',
      az: 'Tənzimləmələr',
      es: 'Ajustes',
      de: 'Einstellungen',
      fr: 'Paramètres',
      pt: 'Configurações',
      ar: 'الإعدادات',
      id: 'Pengaturan',
      it: 'Impostazioni',
      ja: '設定',
      zh: '设置',
      hi: 'सेटिंग्स',
      ko: '설정',
      uk: 'Налаштування',
      pl: 'Ustawienia'
    },
    language: {
      en: 'Language',
      ru: 'Язык',
      ka: 'ენა',
      hy: 'Լեզու',
      tr: 'Dil',
      az: 'Dil',
      es: 'Idioma',
      de: 'Sprache',
      fr: 'Langue',
      pt: 'Idioma',
      ar: 'اللغة',
      id: 'Bahasa',
      it: 'Lingua',
      ja: '言語',
      zh: '语言',
      hi: 'भाषा',
      ko: '언어',
      uk: 'Мова',
      pl: 'Język'
    },
    selectLanguage: {
      en: 'Select your preferred language',
      ru: 'Выберите предпочтительный язык',
      ka: 'აირჩიე სასურველი ენა',
      hy: 'Ընտրեք ձեր նախընտրած լեզուն',
      tr: 'Tercih ettiğiniz dili seçin',
      az: 'Üstün tutduğunuz dili seçin',
      es: 'Selecciona tu idioma preferido',
      de: 'Wähle deine bevorzugte Sprache',
      fr: 'Sélectionnez votre langue préférée',
      pt: 'Selecione seu idioma preferido',
      ar: 'حدد لغتك المفضلة',
      id: 'Pilih bahasa pilihan Anda',
      it: 'Seleziona la tua lingua preferita',
      ja: '優先言語を選択してください',
      zh: '选择您的首选语言',
      hi: 'अपनी पसंदीदा भाषा चुनें',
      ko: '선호하는 언어를 선택하세요',
      uk: 'Оберіть бажану мову',
      pl: 'Wybierz preferowany język'
    },
    artTherapy: {
      en: 'Art Therapy',
      ru: 'Арт-терапия',
      ka: 'არტ თერაპია',
      hy: 'Արվեստի թերապիա',
      tr: 'Sanat terapisi',
      az: 'İncəsənət terapiyası',
      es: 'Arteterapia',
      de: 'Kunsttherapie',
      fr: 'Art-thérapie',
      pt: 'Arteterapia',
      ar: 'العلاج بالفن',
      id: 'Terapi Seni',
      it: 'Arteterapia',
      ja: 'アートセラピー',
      zh: '艺术治疗',
      hi: 'आर्ट थेरेपी',
      ko: '아트 테라피',
      uk: 'Арт-терапія',
      pl: 'Terapia sztuką'
    },
    artDesc: {
      en: 'Express through creativity',
      ru: 'Выражайте себя через творчество',
      ka: 'გამოხატე შენი თავი შემოქმედებით',
      hy: 'Արտահայտեք ձեր էությունը ստեղծագործության միջոցով',
      tr: 'Yaratıcılıkla kendinizi ifade edin',
      az: 'Yaradıcılıq vasitəsilə özünüzü ifadə edin',
      es: 'Exprésate a través de la creatividad',
      de: 'Drücke dich kreativ aus',
      fr: 'Exprimez-vous par la créativité',
      pt: 'Expresse-se através da criatividade',
      ar: 'عبر عن نفسك من خلال الإبداع',
      id: 'Ekspresikan melalui kreativitas',
      it: 'Esprimi te stesso attraverso la creatività',
      ja: '創造性を通じて表現する',
      zh: '通过创造力表达自己',
      hi: 'रचनात्मकता के माध्यम से अभिव्यक्त करें',
      ko: '창의성으로 표현하세요',
      uk: 'Виражайте себе через творчість',
      pl: 'Wyrażaj siebie przez kreatywność'
    },
    cardTherapy: {
      en: 'Card Therapy',
      ru: 'Терапия карточками',
      ka: 'ბარათების თერაპია',
      hy: 'Քարտերով թերապիա',
      tr: 'Kart terapisi',
      az: 'Kart terapiyası',
      es: 'Terapia con cartas',
      de: 'Kartentherapie',
      fr: 'Thérapie par cartes',
      pt: 'Terapia com cartas',
      ar: 'علاج البطاقات',
      id: 'Terapi Kartu',
      it: 'Terapia con carte',
      ja: 'カード療法',
      zh: '卡片疗法',
      hi: 'कार्ड थेरेपी',
      ko: '카드 테라피',
      uk: 'Терапія картками',
      pl: 'Terapia kartami'
    },
    cardDesc: {
      en: 'Discover insights with cards',
      ru: 'Открывайте инсайты с помощью карт',
      ka: 'აღმოაჩინე შეხედულებები ბარათებით',
      hy: 'Բացահայտեք պատկերացումներ քարտերով',
      tr: 'Kartlarla içgörüler keşfedin',
      az: 'Kartlarla fikirlər kəşf edin',
      es: 'Descubre perspectivas con cartas',
      de: 'Entdecke Einsichten mit Karten',
      fr: 'Découvrez des perspectives avec des cartes',
      pt: 'Descubra insights com cartas',
      ar: 'اكتشف رؤى باستخدام البطاقات',
      id: 'Temukan wawasan dengan kartu',
      it: 'Scopri intuizioni con le carte',
      ja: 'カードで洞察を発見',
      zh: '用卡片发现见解',
      hi: 'कार्ड के साथ अंतर्दृष्टि खोजें',
      ko: '카드로 통찰력을 발견하세요',
      uk: 'Відкрийте інсайти за допомогою карт',
      pl: 'Odkryj spostrzeżenia za pomocą kart'
    },
    aiAssistant: {
      en: 'AI Assistant',
      ru: 'ИИ-ассистент',
      ka: 'AI ასისტენტი',
      hy: 'ԱԻ օգնական',
      tr: 'YZ Asistan',
      az: 'Sİ Assistent',
      es: 'Asistente IA',
      de: 'KI-Assistent',
      fr: 'Assistant IA',
      pt: 'Assistente IA',
      ar: 'مساعد الذكاء الاصطناعي',
      id: 'Asisten AI',
      it: 'Assistente IA',
      ja: 'AIアシスタント',
      zh: 'AI 助手',
      hi: 'एआई सहायक',
      ko: 'AI 어시스턴트',
      uk: 'AI-асистент',
      pl: 'Asystent AI'
    },
    aiDesc: {
      en: 'Chat with support anytime',
      ru: 'Общайтесь с поддержкой в любое время',
      ka: 'ისაუბრე მხარდაჭერასთან ნებისმიერ დროს',
      hy: 'Զրուցեք աջակցության հետ ցանկացած ժամանակ',
      tr: 'İstediğiniz zaman destekle sohbet edin',
      az: 'İstənilən vaxt dəstəklə söhbət edin',
      es: 'Chatea con soporte en cualquier momento',
      de: 'Chatte jederzeit mit Support',
      fr: 'Discutez avec le support à tout moment',
      pt: 'Converse com o suporte a qualquer momento',
      ar: 'تحدث مع الدعم في أي وقت',
      id: 'Ngobrol dengan dukungan kapan saja',
      it: 'Chatta con il supporto in qualsiasi momento',
      ja: 'いつでもサポートとチャット',
      zh: '随时与支持聊天',
      hi: 'किसी भी समय समर्थन के साथ चैट करें',
      ko: '언제든지 지원팀과 채팅하세요',
      uk: 'Спілкуйтеся з підтримкою в будь-який час',
      pl: 'Czatuj ze wsparciem w dowolnym momencie'
    },
    darkMode: {
      en: 'Dark Mode',
      ru: 'Темная тема',
      ka: 'ბნელი თემა',
      hy: 'Մուգ թեմա',
      tr: 'Karanlık tema',
      az: 'Tünd mövzu',
      es: 'Tema oscuro',
      de: 'Dunkles Thema',
      fr: 'Thème sombre',
      pt: 'Tema escuro',
      ar: 'الوضع الداكن',
      id: 'Mode gelap',
      it: 'Tema scuro',
      ja: 'ダークテーマ',
      zh: '深色主题',
      hi: 'डार्क मोड',
      ko: '다크 모드',
      uk: 'Темна тема',
      pl: 'Tryb ciemny'
    },
    themeDark: {
      en: 'Dark', ru: 'Тёмная', ka: 'მუქი', hy: 'Մուգ', tr: 'Koyu', az: 'Tünd', es: 'Oscuro', de: 'Dunkel',
      fr: 'Sombre', pt: 'Escuro', ar: 'داكن', id: 'Gelap', it: 'Scuro', ja: 'ダーク', zh: '深色', hi: 'डार्क',
      ko: '다크', uk: 'Темна', pl: 'Ciemny'
    },
    themeLight: {
      en: 'Light', ru: 'Светлая', ka: 'ღია', hy: 'Բաց', tr: 'Açık', az: 'Açıq', es: 'Claro', de: 'Hell',
      fr: 'Clair', pt: 'Claro', ar: 'فاتح', id: 'Terang', it: 'Chiaro', ja: 'ライト', zh: '浅色', hi: 'लाइट',
      ko: '라이트', uk: 'Світла', pl: 'Jasny'
    }
  };

  const features = [
    {
      id: 'art',
      title: pick(t.artTherapy),
      subtitle: pick(t.artDesc),
      icon: 'palette',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#667eea', '#764ba2'] as const,
      route: '/art-therapy',
    },
    {
      id: 'cards',
      title: pick(t.cardTherapy),
      subtitle: pick(t.cardDesc),
      icon: 'cards',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#f093fb', '#f5576c'] as const,
      route: '/screens/cards',
    },
    {
      id: 'chat',
      title: pick(t.aiAssistant),
      subtitle: pick(t.aiDesc),
      icon: 'robot',
      iconLib: 'MaterialCommunityIcons',
      gradient: ['#4facfe', '#00f2fe'] as const,
      route: '/screens/ai-assistant',
    },
  ];

  const languageNames: Record<AppLanguage, string> = {
    en: 'English',
    ka: 'ქართული',
    ru: 'Русский',
    hy: 'Հայերեն',
    tr: 'Türkçe',
    az: 'Azərbaycan',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    pt: 'Português',
    ar: 'العربية',
    id: 'Indonesia',
    it: 'Italiano',
    ja: '日本語',
    zh: '中文',
    hi: 'हिन्दी',
    ko: '한국어',
    uk: 'Українська',
    pl: 'Polski'
  };

  const allLanguages: AppLanguage[] = [
    'en', 'ka', 'ru', 'hy', 'tr', 'az', 'es', 'de', 'fr', 'pt', 'id', 'it', 'ar', 'hi', 'zh', 'ja', 'ko', 'uk', 'pl'
  ];

  const profileCopy = {
    profileTitle: {
      en: 'Your profile', ru: 'Ваш профиль', ka: 'შენი პროფილი', hy: 'Ձեր պրոֆիլը', tr: 'Profiliniz', az: 'Sizin profiliniz',
      es: 'Tu perfil', de: 'Dein Profil', fr: 'Votre profil', pt: 'Seu perfil', ar: 'ملفك الشخصي', id: 'Profil Anda',
      it: 'Il tuo profilo', ja: 'あなたのプロフィール', zh: '您的个人资料', hi: 'आपकी प्रोफ़ाइल', ko: '내 프로필', uk: 'Ваш профіль', pl: 'Twój profil'
    },
    profileSubtitle: {
      en: 'Mental health journey dashboard', ru: 'Панель вашего пути заботы о себе', ka: 'შენი მენტალური გზის პანელი',
      hy: 'Ձեր հոգեկան առողջության ուղու վահանակը', tr: 'Ruh sağlığı yolculuğu panosu', az: 'Psixi sağlamlıq yolu paneli',
      es: 'Panel de tu camino de salud mental', de: 'Übersicht deiner mentalen Gesundheitsreise',
      fr: 'Tableau de bord de votre parcours de santé mentale', pt: 'Painel da sua jornada de saúde mental',
      ar: 'لوحة رحلة صحتك النفسية', id: 'Dasbor perjalanan kesehatan mental Anda', it: 'Pannello del tuo percorso di salute mentale',
      ja: 'メンタルヘルスの旅のダッシュボード', zh: '心理健康之旅仪表盘', hi: 'मानसिक स्वास्थ्य यात्रा डैशबोर्ड', ko: '정신 건강 여정 대시보드',
      uk: 'Панель вашого шляху турботи про себе', pl: 'Panel Twojej podróży zdrowia psychicznego'
    },
    streakLabel: {
      en: 'day streak', ru: 'дней подряд', ka: 'დღე ზედიზედ', hy: 'օր անընդմեջ', tr: 'gün seri', az: 'gün ardıcıl',
      es: 'días seguidos', de: 'Tage in Folge', fr: 'jours consécutifs', pt: 'dias seguidos', ar: 'أيام متتالية',
      id: 'hari berturut-turut', it: 'giorni consecutivi', ja: '日連続', zh: '天连续', hi: 'दिन लगातार', ko: '일 연속',
      uk: 'днів поспіль', pl: 'dni z rzędu'
    },
    journeyTitle: {
      en: 'Journey & progress', ru: 'Путь и прогресс', ka: 'გზა და პროგრესი', hy: 'Ուղի և առաջընթաց', tr: 'Yolculuk ve ilerleme',
      az: 'Yol və irəliləyiş', es: 'Camino y progreso', de: 'Weg & Fortschritt', fr: 'Parcours et progrès',
      pt: 'Jornada e progresso', ar: 'الرحلة والتقدم', id: 'Perjalanan & kemajuan', it: 'Percorso e progressi',
      ja: '歩みと進捗', zh: '历程与进展', hi: 'यात्रा और प्रगति', ko: '여정과 진행 상황', uk: 'Шлях і прогрес', pl: 'Podróż i postępy'
    },
    settingsDataTitle: {
      en: 'Settings & data', ru: 'Настройки и данные', ka: 'პარამეტრები და მონაცემები', hy: 'Կարգավորումներ և տվյալներ',
      tr: 'Ayarlar ve veriler', az: 'Tənzimləmələr və məlumatlar', es: 'Ajustes y datos', de: 'Einstellungen & Daten',
      fr: 'Paramètres et données', pt: 'Configurações e dados', ar: 'الإعدادات والبيانات', id: 'Pengaturan & data',
      it: 'Impostazioni e dati', ja: '設定とデータ', zh: '设置与数据', hi: 'सेटिंग्स और डेटा', ko: '설정 및 데이터',
      uk: 'Налаштування та дані', pl: 'Ustawienia i dane'
    },
    todayMood: {
      en: 'Calm check-in', ru: 'Спокойный чек-ин', ka: 'მშვიდი შემოწმება', hy: 'Հանգիստ ինքնաստուգում', tr: 'Sakin durum kontrolü',
      az: 'Sakit vəziyyət yoxlaması', es: 'Chequeo tranquilo', de: 'Ruhiger Check-in', fr: 'Bilan calme',
      pt: 'Check-in tranquilo', ar: 'تسجيل هادئ', id: 'Pemeriksaan tenang', it: 'Check-in tranquillo',
      ja: '穏やかなチェックイン', zh: '平静自查', hi: 'शांत चेक-इन', ko: '차분한 체크인', uk: 'Спокійний чек-ін', pl: 'Spokojny check-in'
    },
    todayMoodDesc: {
      en: 'Take one minute to notice how you feel before choosing a practice.',
      ru: 'Выделите минуту, чтобы заметить свое состояние перед практикой.',
      ka: 'პრაქტიკამდე ერთი წუთით დააკვირდი, როგორ ხარ.',
      hy: 'Մեկ րոպե տրամադրեք՝ նկատելու ձեր զգացողությունները, նախքան պրակտիկա ընտրելը։',
      tr: 'Bir pratik seçmeden önce bir dakikanızı ayırıp kendinizi nasıl hissettiğinizi fark edin.',
      az: 'Təcrübə seçməzdən əvvəl özünüzü necə hiss etdiyinizi bir dəqiqəliyə hiss edin.',
      es: 'Tómate un minuto para notar cómo te sientes antes de elegir una práctica.',
      de: 'Nimm dir eine Minute Zeit, um zu bemerken, wie du dich fühlst, bevor du eine Übung wählst.',
      fr: 'Prenez une minute pour remarquer ce que vous ressentez avant de choisir une pratique.',
      pt: 'Reserve um minuto para notar como você se sente antes de escolher uma prática.',
      ar: 'خذ دقيقة واحدة لملاحظة شعورك قبل اختيار تمرين.',
      id: 'Luangkan satu menit untuk menyadari perasaan Anda sebelum memilih latihan.',
      it: 'Prenditi un minuto per notare come ti senti prima di scegliere una pratica.',
      ja: '練習を選ぶ前に、1分だけ自分の気持ちに気づいてみましょう。',
      zh: '在选择练习之前，花一分钟留意一下自己的感受。',
      hi: 'अभ्यास चुनने से पहले एक मिनट लेकर देखें कि आप कैसा महसूस कर रहे हैं।',
      ko: '연습을 선택하기 전에 1분 동안 지금 기분이 어떤지 살펴보세요.',
      uk: 'Приділіть хвилину, щоб помітити свій стан перед вибором практики.',
      pl: 'Poświęć minutę, aby zauważyć, jak się czujesz, zanim wybierzesz praktykę.'
    },
    checkIn: {
      en: 'Check in', ru: 'Отметить состояние', ka: 'შემოწმება', hy: 'Ինքնաստուգում', tr: 'Durumu kontrol et',
      az: 'Vəziyyəti qeyd et', es: 'Registrar estado', de: 'Check-in', fr: 'Faire le point', pt: 'Registrar estado',
      ar: 'تسجيل الحالة', id: 'Periksa keadaan', it: 'Check-in', ja: 'チェックイン', zh: '签到', hi: 'चेक इन करें',
      ko: '체크인', uk: 'Відмітити стан', pl: 'Zaznacz stan'
    },
    accessTitle: {
      en: 'Access', ru: 'Доступ', ka: 'წვდომა', hy: 'Հասանելիություն', tr: 'Erişim', az: 'Giriş', es: 'Acceso',
      de: 'Zugriff', fr: 'Accès', pt: 'Acesso', ar: 'الوصول', id: 'Akses', it: 'Accesso', ja: 'アクセス',
      zh: '访问权限', hi: 'पहुँच', ko: '접근', uk: 'Доступ', pl: 'Dostęp'
    },
    personalInfoTitle: {
      en: 'Personal info', ru: 'Личные данные', ka: 'პირადი ინფორმაცია', hy: 'Անձնական տվյալներ', tr: 'Kişisel bilgiler',
      az: 'Şəxsi məlumat', es: 'Información personal', de: 'Persönliche Angaben', fr: 'Informations personnelles',
      pt: 'Informações pessoais', id: 'Info pribadi', it: 'Informazioni personali', ar: 'المعلومات الشخصية',
      hi: 'व्यक्तिगत जानकारी', zh: '个人信息', ja: '個人情報', ko: '개인 정보', uk: 'Особиста інформація', pl: 'Dane osobowe'
    },
    personalInfoDesc: {
      en: 'Helps your AI companion address you personally', ru: 'Помогает AI-компаньону обращаться к вам лично',
      ka: 'ეხმარება AI თანამგზავრს პირადულად მოგმართოს', hy: 'Օգնում է AI ուղեկցին անձամբ դիմել ձեզ',
      tr: 'AI arkadaşınızın size kişisel hitap etmesine yardımcı olur', az: 'AI yoldaşınızın sizə şəxsi müraciət etməsinə kömək edir',
      es: 'Ayuda a tu compañero de IA a dirigirse a ti personalmente', de: 'Hilft deinem KI-Begleiter, dich persönlich anzusprechen',
      fr: 'Aide votre compagnon IA à s\'adresser à vous personnellement', pt: 'Ajuda seu companheiro de IA a se dirigir a você pessoalmente',
      id: 'Membantu pendamping AI menyapa Anda secara pribadi', it: 'Aiuta il tuo compagno IA a rivolgersi a te personalmente',
      ar: 'يساعد رفيقك الذكي على مخاطبتك شخصياً', hi: 'AI साथी को आपको व्यक्तिगत रूप से संबोधित करने में मदद करता है',
      zh: '帮助 AI 伙伴亲切地称呼你', ja: 'AIコンパニオンがあなたに個人的に呼びかけるのに役立ちます', ko: 'AI 동반자가 당신을 개인적으로 부를 수 있도록 도와줍니다',
      uk: 'Допомагає AI-супутнику звертатися до вас особисто', pl: 'Pomaga towarzyszowi AI zwracać się do Ciebie osobiście'
    },
    editProfile: {
      en: 'Edit', ru: 'Изменить', ka: 'რედაქტირება', hy: 'Խմբագրել', tr: 'Düzenle', az: 'Redaktə et', es: 'Editar',
      de: 'Bearbeiten', fr: 'Modifier', pt: 'Editar', id: 'Edit', it: 'Modifica', ar: 'تعديل', hi: 'संपादित करें',
      zh: '编辑', ja: '編集', ko: '편집', uk: 'Редагувати', pl: 'Edytuj'
    },
    addProfile: {
      en: 'Add your info', ru: 'Добавить данные', ka: 'ინფორმაციის დამატება', hy: 'Ավելացնել տվյալներ', tr: 'Bilgi ekle',
      az: 'Məlumat əlavə et', es: 'Añadir información', de: 'Angaben hinzufügen', fr: 'Ajouter des informations',
      pt: 'Adicionar informações', id: 'Tambahkan info', it: 'Aggiungi informazioni', ar: 'إضافة معلومات',
      hi: 'जानकारी जोड़ें', zh: '添加信息', ja: '情報を追加', ko: '정보 추가', uk: 'Додати дані', pl: 'Dodaj dane'
    },
    unlocked: {
      en: 'Art Therapy unlocked', ru: 'Арт-терапия открыта', ka: 'არტ თერაპია გახსნილია', hy: 'Արվեստի թերապիան բացված է',
      tr: 'Sanat terapisi açık', az: 'İncəsənət terapiyası açıqdır', es: 'Arteterapia desbloqueada', de: 'Kunsttherapie freigeschaltet',
      fr: 'Art-thérapie débloquée', pt: 'Arteterapia desbloqueada', ar: 'تم فتح العلاج بالفن', id: 'Terapi Seni terbuka',
      it: 'Arteterapia sbloccata', ja: 'アートセラピーが解放されました', zh: '艺术治疗已解锁', hi: 'आर्ट थेरेपी अनलॉक हो गई',
      ko: '아트 테라피 잠금 해제됨', uk: 'Арт-терапію відкрито', pl: 'Arteterapia odblokowana'
    },
    locked: {
      en: 'Art Therapy locked', ru: 'Арт-терапия закрыта', ka: 'არტ თერაპია დახურულია', hy: 'Արվեստի թերապիան փակված է',
      tr: 'Sanat terapisi kilitli', az: 'İncəsənət terapiyası kilidlidir', es: 'Arteterapia bloqueada', de: 'Kunsttherapie gesperrt',
      fr: 'Art-thérapie verrouillée', pt: 'Arteterapia bloqueada', ar: 'العلاج بالفن مقفل', id: 'Terapi Seni terkunci',
      it: 'Arteterapia bloccata', ja: 'アートセラピーはロックされています', zh: '艺术治疗已锁定', hi: 'आर्ट थेरेपी लॉक है',
      ko: '아트 테라피 잠김', uk: 'Арт-терапію заблоковано', pl: 'Arteterapia zablokowana'
    },
    openShort: {
      en: 'Open', ru: 'Открыта', ka: 'ღიაა', hy: 'Բաց է', tr: 'Açık', az: 'Açıqdır', es: 'Abierta', de: 'Offen',
      fr: 'Ouvert', pt: 'Aberta', ar: 'مفتوح', id: 'Terbuka', it: 'Aperta', ja: '開放', zh: '已开放', hi: 'खुला',
      ko: '열림', uk: 'Відкрито', pl: 'Otwarte'
    },
    lockedShort: {
      en: 'Locked', ru: 'Закрыта', ka: 'დახურულია', hy: 'Փակ է', tr: 'Kilitli', az: 'Kilidlidir', es: 'Bloqueada',
      de: 'Gesperrt', fr: 'Verrouillé', pt: 'Bloqueada', ar: 'مقفل', id: 'Terkunci', it: 'Bloccata', ja: 'ロック中',
      zh: '已锁定', hi: 'लॉक', ko: '잠김', uk: 'Заблоковано', pl: 'Zablokowane'
    },
    accessDesc: {
      en: 'Manage your paid module status and restore access when needed.',
      ru: 'Управляйте доступом к платному модулю и восстановлением.',
      ka: 'მართე ფასიანი მოდულის სტატუსი და საჭიროებისას აღდგენა.',
      hy: 'Կառավարեք ձեր վճարովի մոդուլի կարգավիճակը և վերականգնեք հասանելիությունը անհրաժեշտության դեպքում։',
      tr: 'Ücretli modül durumunuzu yönetin ve gerektiğinde erişimi geri yükleyin.',
      az: 'Ödənişli modul statusunuzu idarə edin və lazım olduqda girişi bərpa edin.',
      es: 'Gestiona el estado de tu módulo pago y restaura el acceso cuando lo necesites.',
      de: 'Verwalte den Status deines kostenpflichtigen Moduls und stelle den Zugriff bei Bedarf wieder her.',
      fr: 'Gérez l\'état de votre module payant et restaurez l\'accès si nécessaire.',
      pt: 'Gerencie o status do seu módulo pago e restaure o acesso quando necessário.',
      ar: 'أدر حالة وحدتك المدفوعة واستعد الوصول عند الحاجة.',
      id: 'Kelola status modul berbayar Anda dan pulihkan akses saat diperlukan.',
      it: 'Gestisci lo stato del tuo modulo a pagamento e ripristina l\'accesso quando necessario.',
      ja: '有料モジュールの状態を管理し、必要に応じてアクセスを復元してください。',
      zh: '管理您的付费模块状态，并在需要时恢复访问权限。',
      hi: 'अपने भुगतान वाले मॉड्यूल की स्थिति प्रबंधित करें और आवश्यकता पड़ने पर पहुँच बहाल करें।',
      ko: '유료 모듈 상태를 관리하고 필요할 때 접근 권한을 복원하세요.',
      uk: 'Керуйте статусом платного модуля та відновлюйте доступ за потреби.',
      pl: 'Zarządzaj statusem płatnego modułu i przywracaj dostęp w razie potrzeby.'
    },
    manageAccess: {
      en: 'Manage access', ru: 'Управлять доступом', ka: 'წვდომის მართვა', hy: 'Կառավարել հասանելիությունը',
      tr: 'Erişimi yönet', az: 'Girişi idarə et', es: 'Gestionar acceso', de: 'Zugriff verwalten', fr: 'Gérer l\'accès',
      pt: 'Gerenciar acesso', ar: 'إدارة الوصول', id: 'Kelola akses', it: 'Gestisci accesso', ja: 'アクセスを管理',
      zh: '管理访问权限', hi: 'पहुँच प्रबंधित करें', ko: '접근 관리', uk: 'Керувати доступом', pl: 'Zarządzaj dostępem'
    },
    restore: {
      en: 'Restore', ru: 'Восстановить', ka: 'აღდგენა', hy: 'Վերականգնել', tr: 'Geri yükle', az: 'Bərpa et',
      es: 'Restaurar', de: 'Wiederherstellen', fr: 'Restaurer', pt: 'Restaurar', ar: 'استعادة', id: 'Pulihkan',
      it: 'Ripristina', ja: '復元', zh: '恢复', hi: 'पुनर्स्थापित करें', ko: '복원', uk: 'Відновити', pl: 'Przywróć'
    },
  };

  const formatStreak = () => `${dashboardProgress.streakDays} ${pick(profileCopy.streakLabel)}`;
  const artValue = dashboardProgress.artStarted > 0
    ? `${dashboardProgress.artCompleted}/${dashboardProgress.artStarted}`
    : (artTherapyUnlocked ? pick(profileCopy.openShort) : pick(profileCopy.lockedShort));

  const progressCards = [
    {
      value: String(dashboardProgress.aiSessions),
      label: {
        en: 'AI sessions', ru: 'AI сессии', ka: 'AI სესიები', hy: 'ԱԻ սեանսներ', tr: 'YZ seansları', az: 'Sİ sessiyaları',
        es: 'Sesiones IA', de: 'KI-Sitzungen', fr: 'Séances IA', pt: 'Sessões IA', ar: 'جلسات الذكاء الاصطناعي',
        id: 'Sesi AI', it: 'Sessioni IA', ja: 'AIセッション', zh: 'AI 会话', hi: 'AI सत्र', ko: 'AI 세션', uk: 'AI сесії', pl: 'Sesje AI'
      },
      icon: 'brain', color: '#2563EB'
    },
    {
      value: artValue,
      label: {
        en: 'Art therapy', ru: 'Арт-терапия', ka: 'არტ თერაპია', hy: 'Արվեստի թերապիա', tr: 'Sanat terapisi',
        az: 'İncəsənət terapiyası', es: 'Arteterapia', de: 'Kunsttherapie', fr: 'Art-thérapie', pt: 'Arteterapia',
        ar: 'العلاج بالفن', id: 'Terapi Seni', it: 'Arteterapia', ja: 'アートセラピー', zh: '艺术治疗', hi: 'आर्ट थेरेपी',
        ko: '아트 테라피', uk: 'Арт-терапія', pl: 'Arteterapia'
      },
      icon: 'palette', color: '#DB2777'
    },
    {
      value: String(dashboardProgress.cardSessions),
      label: {
        en: 'Cards', ru: 'Карты', ka: 'ბარათები', hy: 'Քարտեր', tr: 'Kartlar', az: 'Kartlar', es: 'Cartas',
        de: 'Karten', fr: 'Cartes', pt: 'Cartas', ar: 'البطاقات', id: 'Kartu', it: 'Carte', ja: 'カード',
        zh: '卡片', hi: 'कार्ड', ko: '카드', uk: 'Картки', pl: 'Karty'
      },
      icon: 'clone', color: '#0891B2'
    },
    {
      value: String(dashboardProgress.journalNotes),
      label: {
        en: 'Journal notes', ru: 'Записи', ka: 'ჩანაწერები', hy: 'Օրագրի գրառումներ', tr: 'Günlük notları',
        az: 'Gündəlik qeydləri', es: 'Notas del diario', de: 'Tagebuchnotizen', fr: 'Notes de journal',
        pt: 'Notas do diário', ar: 'ملاحظات المفكرة', id: 'Catatan jurnal', it: 'Note del diario', ja: '日記メモ',
        zh: '日记笔记', hi: 'जर्नल नोट्स', ko: '저널 메모', uk: 'Записи щоденника', pl: 'Notatki dziennika'
      },
      icon: 'book-open', color: '#059669'
    },
    {
      value: `${dashboardProgress.breathingMinutes}m`,
      label: {
        en: 'Breathing', ru: 'Дыхание', ka: 'სუნთქვა', hy: 'Շնչառություն', tr: 'Nefes', az: 'Nəfəs', es: 'Respiración',
        de: 'Atmung', fr: 'Respiration', pt: 'Respiração', ar: 'التنفس', id: 'Pernapasan', it: 'Respirazione',
        ja: '呼吸', zh: '呼吸', hi: 'श्वास', ko: '호흡', uk: 'Дихання', pl: 'Oddychanie'
      },
      icon: 'wind', color: '#D97706'
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <LinearGradient
          colors={isDark ? ['#111827', '#1F2937'] : ['#F8FAFC', '#E0F2FE']}
          style={[styles.profileHeader, { borderColor: theme.colors.border }]}
        >
          <View style={styles.profileTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>BH</Text>
            </View>
            <View style={styles.profileIdentity}>
              <Text style={[styles.profileEyebrow, { color: theme.colors.textMuted }]}>{t.appName}</Text>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>{pick(profileCopy.profileTitle)}</Text>
              <Text style={[styles.profileSubtitle, { color: theme.colors.textSecondary }]}>
                {pick(profileCopy.profileSubtitle)}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
              <FontAwesome5 name="language" size={13} color={theme.colors.primary} />
              <Text style={[styles.statusPillText, { color: theme.colors.text }]}>{languageNames[language]}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
              <FontAwesome5 name="fire" size={13} color="#F97316" />
              <Text style={[styles.statusPillText, { color: theme.colors.text }]}>{formatStreak()}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={[styles.hubPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.connectedRow}
              onPress={() => router.push('/screens/profile-setup?mode=edit' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.connectedIcon, { backgroundColor: '#7C3AED' }]}>
                <FontAwesome5 name="id-card" size={16} color="#fff" />
              </View>
              <View style={styles.connectedTextBlock}>
                <Text style={[styles.connectedTitle, { color: theme.colors.text }]}>
                  {profile ? profile.name : pick(profileCopy.personalInfoTitle)}
                </Text>
                <Text style={[styles.connectedSubtitle, { color: theme.colors.textSecondary }]}>
                  {profile ? `${profile.age} • ${pick(profileCopy.personalInfoTitle)}` : pick(profileCopy.personalInfoDesc)}
                </Text>
              </View>
              <Text style={[styles.editProfileLink, { color: theme.colors.accent }]}>
                {profile ? pick(profileCopy.editProfile) : pick(profileCopy.addProfile)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.hubPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.panelHeaderRow}>
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{pick(profileCopy.journeyTitle)}</Text>
              <TouchableOpacity
                style={styles.panelAction}
                onPress={() => router.push('/screens/journal' as any)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="pen" size={11} color="#FFFFFF" />
                <Text style={styles.panelActionText}>{pick(profileCopy.checkIn)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.todayCompactRow}>
              <View style={[styles.todayIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#DBEAFE' }]}> 
                <MaterialCommunityIcons name="weather-sunset" size={24} color="#2563EB" />
              </View>
              <View style={styles.todayTextBlock}>
                <Text style={[styles.todayTitle, { color: theme.colors.text }]}>{pick(profileCopy.todayMood)}</Text>
                <Text style={[styles.todayDesc, { color: theme.colors.textSecondary }]}>{pick(profileCopy.todayMoodDesc)}</Text>
              </View>
            </View>

            <View style={[styles.panelDivider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.metricsRow}>
              {progressCards.map((card) => (
                <View key={card.icon} style={[styles.metricItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: theme.colors.border }]}> 
                  <View style={[styles.metricIcon, { backgroundColor: `${card.color}1A` }]}> 
                    <FontAwesome5 name={card.icon as any} size={14} color={card.color} />
                  </View>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]} numberOfLines={1}>{card.value}</Text>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{pick(card.label)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.panelDivider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.quickRows}>
              {features.map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={styles.quickRow}
                  onPress={() => router.push(feature.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quickIcon, { backgroundColor: feature.gradient[0] }]}> 
                    <MaterialCommunityIcons name={feature.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={styles.quickTextBlock}>
                    <Text style={[styles.quickTitle, { color: theme.colors.text }]}>{feature.title}</Text>
                    <Text style={[styles.quickSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{feature.subtitle}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={12} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.hubPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{pick(profileCopy.settingsDataTitle)}</Text>

            <View style={styles.connectedRow}>
              <View style={[styles.connectedIcon, { backgroundColor: isDark ? '#1e3a8a' : '#3b82f6' }]}> 
                <FontAwesome5 name={isDark ? 'moon' : 'sun'} size={16} color="#fff" />
              </View>
              <View style={styles.connectedTextBlock}>
                <Text style={[styles.connectedTitle, { color: theme.colors.text }]}>{pick(t.darkMode)}</Text>
                <Text style={[styles.connectedSubtitle, { color: theme.colors.textSecondary }]}>{isDark ? pick(t.themeDark) : pick(t.themeLight)}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.panelDivider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity style={styles.connectedRowTop} onPress={() => setLanguagePickerOpen((open) => !open)} activeOpacity={0.75}>
              <View style={[styles.connectedIcon, { backgroundColor: '#0F766E' }]}> 
                <FontAwesome5 name="globe" size={16} color="#fff" />
              </View>
              <View style={styles.connectedTextBlock}>
                <Text style={[styles.connectedTitle, { color: theme.colors.text }]}>{pick(t.language)}</Text>
                <Text style={[styles.connectedSubtitle, { color: theme.colors.textSecondary }]}>{languageNames[language]}</Text>
              </View>
              <FontAwesome5 name={languagePickerOpen ? 'chevron-up' : 'chevron-down'} size={12} color={theme.colors.textMuted} />
            </TouchableOpacity>
            {languagePickerOpen && (
              <View style={styles.languageGridCompact}>
                {allLanguages.map((lng) => {
                  const isActive = language === lng;
                  return (
                    <TouchableOpacity
                      key={lng}
                      onPress={() => {
                        void setLanguage(lng);
                        setLanguagePickerOpen(false);
                      }}
                      style={[
                        styles.languageChipCompact,
                        {
                          backgroundColor: isActive ? theme.colors.accent : (isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC'),
                          borderColor: isActive ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageChipText, { color: isActive ? '#ffffff' : theme.colors.text }]}> 
                        {languageNames[lng]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.hubPanel, { backgroundColor: theme.colors.card, borderColor: artTherapyUnlocked ? '#10B981' : theme.colors.border }]}>
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{pick(profileCopy.accessTitle)}</Text>

            <View style={styles.accessTopRow}>
              <View style={[styles.accessIcon, { backgroundColor: artTherapyUnlocked ? '#D1FAE5' : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6') }]}> 
                <FontAwesome5 name={artTherapyUnlocked ? 'unlock' : 'lock'} size={18} color={artTherapyUnlocked ? '#059669' : theme.colors.textSecondary} />
              </View>
              <View style={styles.accessTextBlock}>
                <Text style={[styles.accessTitle, { color: theme.colors.text }]}> 
                  {artTherapyUnlocked ? pick(profileCopy.unlocked) : pick(profileCopy.locked)}
                </Text>
                <Text style={[styles.accessDesc, { color: theme.colors.textSecondary }]}>{pick(profileCopy.accessDesc)}</Text>
              </View>
            </View>
            <View style={styles.accessActions}>
              <TouchableOpacity
                style={[styles.accessPrimaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/purchase?product=art-therapy' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.accessPrimaryText}>{pick(profileCopy.manageAccess)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accessSecondaryButton, { borderColor: theme.colors.border }]}
                onPress={async () => setArtTherapyUnlocked(await PurchaseService.isUnlocked('art-therapy'))}
                activeOpacity={0.8}
              >
                <Text style={[styles.accessSecondaryText, { color: theme.colors.text }]}>{pick(profileCopy.restore)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  profileIdentity: {
    flex: 1,
  },
  profileEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  profileSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  hubPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  panelAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  panelActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  todayCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 104,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  quickRows: {
    gap: 4,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickTextBlock: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  quickSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  connectedRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connectedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectedTextBlock: {
    flex: 1,
  },
  connectedTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  connectedSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  editProfileLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  languageGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  languageChipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  todayIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayTextBlock: {
    flex: 1,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  todayDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  languageChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accessTopRow: {
    flexDirection: 'row',
  },
  accessIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accessTextBlock: {
    flex: 1,
  },
  accessTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  accessDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  accessActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  accessPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  accessPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  accessSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  accessSecondaryText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
