import type { AppLanguage } from '@/contexts/LanguageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: { pack: 'mc' | 'fa' | 'ion'; name: any };
  gradient: [string, string];
  route: string;
};

// Translations for header and feature labels
const t = {
  hello: {
    en: 'Hello', ka: 'გამარჯობა', ru: 'Привет', hy: 'Բարև', tr: 'Merhaba', az: 'Salam', es: 'Hola', de: 'Hallo', fr: 'Bonjour',
    pt: 'Olá', ar: 'مرحبا', id: 'Halo', ja: 'こんにちは', zh: '你好', it: 'Ciao', hi: 'नमस्ते', ko: '안녕하세요', uk: 'Привіт', pl: 'Cześć'
  },
  headerTitle: {
    en: "Let's do something good today",
    ka: 'გავაკეთოთ რაღაც კარგი დღეს',
    ru: 'Сделаем сегодня что-то хорошее',
    hy: 'Արի այսօր ինչ-որ լավ բան անենք',
    tr: 'Bugün güzel bir şey yapalım',
    az: 'Gəlin bugün yaxşı bir şey edək',
    es: 'Hagamos algo bueno hoy',
    de: 'Lass uns heute etwas Gutes tun',
    fr: 'Faisons quelque chose de bien aujourd’hui',
    pt: 'Vamos fazer algo bom hoje',
    ar: 'لنقم بشيء جيد اليوم',
    id: 'Mari lakukan sesuatu yang baik hari ini',
    ja: '今日は良いことをしましょう',
    zh: '让我们今天做点好事',
    it: 'Facciamo oggi qualcosa di buono',
    hi: 'आज कुछ अच्छा करें',
    ko: '오늘 좋은 것을 해봐요',
    uk: 'Зробімо сьогодні щось добре',
    pl: 'Zróbmy dziś coś dobrego'
  },
  headerSubtitle: {
    en: 'Choose a practice and start',
    ka: 'აირჩიე პრაქტიკა და დაიწყე',
    ru: 'Выбери практику и начни',
    hy: 'Ընտրիր պրակտիկան և սկսիր',
    tr: 'Bir pratik seç ve başla',
    az: 'Praktika seç və başla',
    es: 'Elige una práctica y empieza',
    de: 'Wähle eine Übung und starte',
    fr: 'Choisis une pratique et commence',
    pt: 'Escolha uma prática e comece',
    ar: 'اختر تمرينًا وابدأ',
    id: 'Pilih latihan dan mulai',
    ja: '練習を選んで始めましょう',
    zh: '选择一个练习并开始',
    it: 'Scegli una pratica e inizia',
    hi: 'एक अभ्यास चुनें और शुरू करें',
    ko: '연습을 선택하고 시작하세요',
    uk: 'Обери практику і почни',
    pl: 'Wybierz praktykę i zacznij'
  },
  spotlightTitle: {
    en: 'Your daily mental fitness',
    ka: 'შენი ყოველდღიური მენტალური ფორმა',
    ru: 'Твоя ежедневная ментальная форма',
    hy: 'Քո առօրյա մտավոր ֆիթնեսը',
    tr: 'Günlük zihinsel formun',
    az: 'Sənin gündəlik zehni forman',
    es: 'Tu forma mental diaria',
    de: 'Deine tägliche mentale Fitness',
    fr: 'Ta forme mentale quotidienne',
    pt: 'Seu condicionamento mental diário',
    ar: 'لياقتك الذهنية اليومية',
    id: 'Kebugaran mental harian Anda',
    ja: '毎日のメンタルフィットネス',
    zh: '你的日常心理健康',
    it: 'La tua forma mentale quotidiana',
    hi: 'आपकी दैनिक मानसिक फिटनेस',
    ko: '당신의 일일 마음 건강',
    uk: 'Твоя щоденна ментальна форма',
    pl: 'Twoja codzienna kondycja mentalna'
  },
  spotlightSubtitle: {
    en: 'Small steps, powerful change. Guided by AI and science‑based tools.',
    ka: 'პატარა ნაბიჯები, დიდი ცვლილება. AI და მეცნიერებაზე დაფუძნებული ინსტრუმენტები.',
    ru: 'Маленькие шаги — большие изменения. ИИ и научные инструменты.',
    hy: 'Փոքր քայլեր՝ մեծ փոփոխություն։ ԱԽ և գիտական գործիքներ։',
    tr: 'Küçük adımlar, büyük değişim. YZ ve bilim temelli araçlar.',
    az: 'Kiçik addımlar, böyük dəyişiklik. AI və elmə əsaslanan alətlər.',
    es: 'Pequeños pasos, gran cambio. IA y herramientas científicas.',
    de: 'Kleine Schritte, große Veränderung. KI und wissenschaftliche Tools.',
    fr: 'Petits pas, grand changement. IA et outils fondés sur la science.',
    pt: 'Pequenos passos, grande mudança. Guiado por IA e ferramentas baseadas em ciência.',
    ar: 'خطوات صغيرة، تغيير قوي. بإرشاد الذكاء الاصطناعي وأدوات قائمة على العلم.',
    id: 'Langkah kecil, perubahan besar. Dipandu oleh AI dan alat berbasis sains.',
    ja: '小さな一歩が大きな変化に。AIと科学的ツールがガイドします。',
    zh: '小步前进，大幅改变。由AI和科学工具引导。',
    it: 'Piccoli passi, grande cambiamento. Guidato da AI e strumenti scientifici.',
    hi: 'छोटे कदम, बड़ा बदलाव। AI और विज्ञान आधारित टूल्स द्वारा निर्देशित।',
    ko: '작은 걸음이 큰 변화를 만듭니다. AI와 과학 기반 도구가 안내합니다.',
    uk: 'Малі кроки — потужні зміни. Керовано ШІ та науковими інструментами.',
    pl: 'Małe kroki, wielka zmiana. Wspierane przez AI i narzędzia naukowe.'
  },
  badges: {
    secure: { en: 'Private & Secure', ka: 'პირადი და დაცული', ru: 'Приватно и безопасно', hy: 'Գաղտնի և անվտանգ', tr: 'Gizli ve güvenli', az: 'Məxfi və təhlükəsiz', es: 'Privado y seguro', de: 'Privat & sicher', fr: 'Privé et sécurisé', pt: 'Privado e seguro', ar: 'خاص وآمن', id: 'Pribadi & Aman', ja: 'プライベートで安全', zh: '私密且安全', it: 'Privato e sicuro', hi: 'निजी और सुरक्षित', ko: '개인 & 안전', uk: 'Приватно й безпечно', pl: 'Prywatne i bezpieczne' },
    anytime: { en: '24/7 Access', ka: '24/7 წვდომა', ru: 'Доступ 24/7', hy: 'Մատչելի 24/7', tr: '7/24 erişim', az: '24/7 giriş', es: 'Acceso 24/7', de: '24/7 Zugriff', fr: 'Accès 24/7', pt: 'Acesso 24/7', ar: 'وصول 24/7', id: 'Akses 24/7', ja: '24時間いつでも', zh: '全天候访问', it: 'Accesso 24/7', hi: '24/7 पहुँच', ko: '24/7 이용', uk: 'Доступ 24/7', pl: 'Dostęp 24/7' },
    science: { en: 'Science‑based', ka: 'მეცნიერზე დაფუძნებული', ru: 'Научно обосновано', hy: 'Գիտական հիմքով', tr: 'Bilim temelli', az: 'Elmə əsaslanan', es: 'Basado en ciencia', de: 'Wissenschaftlich fundiert', fr: 'Fondé sur la science', pt: 'Baseado em ciência', ar: 'قائم على العلم', id: 'Berbasis sains', ja: '科学的根拠に基づく', zh: '基于科学', it: 'Basato sulla scienza', hi: 'विज्ञान आधारित', ko: '과학 기반', uk: 'Науково обґрунтовано', pl: 'Oparte na nauce' }
  },
  features: {
    journal: {
      title: { en: 'Journal', ka: 'ჟურნალი', ru: 'Дневник', hy: 'Օրագիր', tr: 'Günlük', az: 'Jurnal', es: 'Diario', de: 'Tagebuch', fr: 'Journal', pt: 'Diário', ar: 'المفكرة', id: 'Jurnal', ja: 'ジャーナル', zh: '日记', it: 'Diario', hi: 'जर्नल', ko: '저널', uk: 'Щоденник', pl: 'Dziennik' },
      subtitle: { en: 'Write and express', ka: 'დაწერე და გამოხატე', ru: 'Пиши и выражай', hy: 'Գրի և արտահայտվիր', tr: 'Yaz ve ifade et', az: 'Yaz və ifadə et', es: 'Escribe y expresa', de: 'Schreib und drücke aus', fr: 'Écris et exprime', pt: 'Escreva e expresse', ar: 'اكتب وعبّر', id: 'Tulis dan ungkapkan', ja: '書いて表現する', zh: '写下来并表达', it: 'Scrivi ed esprimi', hi: 'लिखें और व्यक्त करें', ko: '쓰고 표현하기', uk: 'Пиши та виражайся', pl: 'Pisz i wyrażaj' },
    },
    art: {
      title: { en: 'Art Therapy', ka: 'არტ თერაპია', ru: 'Арт-терапия', hy: 'Արտ թերապիա', tr: 'Sanat terapisi', az: 'İncəsənət terapiyası', es: 'Arteterapia', de: 'Kunsttherapie', fr: 'Art-thérapie', pt: 'Arteterapia', ar: 'العلاج بالفن', id: 'Terapi Seni', ja: 'アートセラピー', zh: '艺术治疗', it: 'Arteterapia', hi: 'आर्ट थेरेपी', ko: '아트 테라피', uk: 'Арт-терапія', pl: 'Arteterapia' },
      subtitle: { en: 'Emotions in colors', ka: 'ემოციები ფერებში', ru: 'Эмоции в цветах', hy: 'Զգացմունքները գույներով', tr: 'Duygular renklerde', az: 'Hisslər rənglərdə', es: 'Emociones en colores', de: 'Emotionen in Farben', fr: 'Émotions en couleurs', pt: 'Emoções em cores', ar: 'المشاعر بالألوان', id: 'Emosi dalam warna', ja: '色で表す感情', zh: '用色彩表达情绪', it: 'Emozioni nei colori', hi: 'रंगों में भावनाएँ', ko: '색으로 감정 표현', uk: 'Емоції в кольорах', pl: 'Emocje w kolorach' },
    },
    cards: {
      title: { en: 'Cards Therapy', ka: 'ბარათების თერაპია', ru: 'Терапия картами', hy: 'Քարտերի թերապիա', tr: 'Kart terapisi', az: 'Kart terapiyası', es: 'Terapia con cartas', de: 'Kartentherapie', fr: 'Thérapie par cartes', pt: 'Terapia com cartas', ar: 'علاج البطاقات', id: 'Terapi Kartu', ja: 'カード療法', zh: '卡片疗法', it: 'Terapia con carte', hi: 'कार्ड थेरेपी', ko: '카드 테라피', uk: 'Терапія картками', pl: 'Terapia kartami' },
      subtitle: { en: 'Discover stories', ka: 'აღმოაჩინე ისტორიები', ru: 'Открой истории', hy: 'Բացահայտիր պատմությունները', tr: 'Hikayeleri keşfet', az: 'Hekayələri kəşf et', es: 'Descubre historias', de: 'Entdecke Geschichten', fr: 'Découvre des histoires', pt: 'Descubra histórias', ar: 'اكتشف القصص', id: 'Temukan kisah', ja: '物語を見つける', zh: '发现故事', it: 'Scopri storie', hi: 'कहानियाँ खोजें', ko: '이야기 발견', uk: 'Відкривай історії', pl: 'Odkrywaj historie' },
    },
    ai: {
      title: { en: 'AI Chat', ka: 'AI ჩათი', ru: 'AI Чат', hy: 'ԱԻ չաթ', tr: 'Yapay Zeka Sohbeti', az: 'AI çat', es: 'Chat de IA', de: 'KI-Chat', fr: 'Chat IA', pt: 'Bate‑papo de IA', ar: 'دردشة الذكاء الاصطناعي', id: 'Obrolan AI', ja: 'AIチャット', zh: 'AI 聊天', it: 'Chat AI', hi: 'AI चैट', ko: 'AI 채팅', uk: 'AI Чат', pl: 'Czat AI' },
      subtitle: { en: 'Smart support', ka: 'ჭკვიანი მხარდაჭერა', ru: 'Умная поддержка', hy: 'Խելացի աջակցություն', tr: 'Akıllı destek', az: 'Ağıllı dəstək', es: 'Apoyo inteligente', de: 'Intelligente Unterstützung', fr: 'Assistance intelligente', pt: 'Apoio inteligente', ar: 'دعم ذكي', id: 'Dukungan pintar', ja: 'スマートなサポート', zh: '智能支持', it: 'Supporto intelligente', hi: 'स्मार्ट सहायता', ko: '스마트 지원', uk: 'Розумна підтримка', pl: 'Inteligentne wsparcie' },
    },
    meditation: {
      title: { en: 'Meditation', ka: 'მედიტაცია', ru: 'Медитация', hy: 'Մեդիտացիա', tr: 'Meditasyon', az: 'Meditasiya', es: 'Meditación', de: 'Meditation', fr: 'Méditation', pt: 'Meditação', ar: 'تأمل', id: 'Meditasi', ja: '瞑想', zh: '冥想', it: 'Meditazione', hi: 'मेडिटेशन', ko: '명상', uk: 'Медитація', pl: 'Medytacja' },
      subtitle: { en: 'Calm practices', ka: 'მშვიდობის პრაქტიკა', ru: 'Спокойные практики', hy: 'Խաղաղ պրակտիկաներ', tr: 'Sakinleştirici pratikler', az: 'Sakitləşdirici təcrübələr', es: 'Prácticas de calma', de: 'Beruhigende Übungen', fr: 'Pratiques apaisantes', pt: 'Práticas calmantes', ar: 'ممارسات हادئة', id: 'Latihan menenangkan', ja: '落ち着く実践', zh: '平静练习', it: 'Pratiche di calma', hi: 'शांत अभ्यास', ko: '차분한 연습', uk: 'Практики спокою', pl: 'Praktyki spokoju' },
    },
    breathing: {
      title: { en: 'Breathing', ka: 'სუნთქვა', ru: 'Дыхание', hy: 'Շնչառություն', tr: 'Nefes', az: 'Nəфəs', es: 'Respiración', de: 'Atmung', fr: 'Respiration', pt: 'Respiração', ar: 'تنفس', id: 'Pernapasan', ja: '呼吸', zh: '呼吸', it: 'Respirazione', hi: 'श्वास', ko: '호흡', uk: 'Дихання', pl: 'Oddychanie' },
      subtitle: { en: 'Relax in seconds', ka: 'დამშვიდდი წამებში', ru: 'Расслабься за секунды', hy: 'Թուլացիր վայրկյաններում', tr: 'Saniyelerde rahatla', az: 'Saniyələrdə rahatla', es: 'Relájate en segundos', de: 'Entspanne in Sekunden', fr: 'Détends-toi en secondes', pt: 'Relaxe em segundos', ar: 'استرخِ في ثوانٍ', id: 'Rileks dalam hitungan detik', ja: '数秒でリラックス', zh: '数秒内放松', it: 'Rilassati in pochi secondi', hi: 'कुछ सेकंड में आराम', ko: '몇 초 만에 이완', uk: 'Розслабся за секунди', pl: 'Zrelaksuj się w kilka sekund' },
    },
  },
  cta: {
    startAI: {
      en: 'Start AI Session', ka: 'დაიწყე AI სესია', ru: 'Начать AI-сессию', hy: 'Սկսել AI սեանս', tr: 'Yapay Zeka seansı başlat', az: 'AI sessiyasına başla', es: 'Iniciar sesión de IA', de: 'KI‑Sitzung starten', fr: 'Démarrer une séance IA', pt: 'Iniciar sessão de IA', ar: 'بدء جلسة الذكاء الاصطناعي', id: 'Mulai sesi AI', ja: 'AIセッションを開始', zh: '开始AI会话', it: 'Avvia sessione AI', hi: 'AI सत्र शुरू करें', ko: 'AI 세션 시작', uk: 'Почати AI сесію', pl: 'Rozpocznij sesję AI'
    },
    openJournal: {
      en: 'Open Journal', ka: 'გახსენი ჟურნალი', ru: 'Открыть дневник', hy: 'Բացել օրագիրը', tr: 'Günlüğü aç', az: 'Jurnalı aç', es: 'Abrir diario', de: 'Tagebuch öffnen', fr: 'Ouvrir le journal', pt: 'Abrir diário', ar: 'افتح المفكرة', id: 'Buka jurnal', ja: 'ジャーナルを開く', zh: '打开日记', it: 'Apri diario', hi: 'जर्नल खोलें', ko: '저널 열기', uk: 'Відкрити щоденник', pl: 'Otwórz dziennik'
    },
    openNow: {
      en: 'Open now', ka: 'გახსენი ახლა', ru: 'Открыть сейчас', hy: 'Բացել հիմա', tr: 'Hemen aç', az: 'İndi aç', es: 'Abrir ahora', de: 'Jetzt öffnen', fr: 'Ouvrir maintenant', pt: 'Abrir agora', ar: 'افتح الآن', id: 'Buka sekarang', ja: '今すぐ開く', zh: '立即打开', it: 'Apri ora', hi: 'अब खोलें', ko: '지금 열기', uk: 'Відкрити зараз', pl: 'Otwórz teraz'
    }
  }
} as const;

// Section titles
const sectionText = {
  featuresTitle: {
    en: 'Explore your tools',
    ka: 'აღმოაჩინე შენი ინსტრუმენტები',
    ru: 'Исследуй свои инструменты',
    hy: 'Բացահայտիր քո գործիքները',
    tr: 'Araçlarını keşfet',
    az: 'Alətlərini kəşf et',
    es: 'Explora tus herramientas',
    de: 'Entdecke deine Tools',
    fr: 'Explore tes outils',
    pt: 'Explore suas ferramentas',
    ar: 'استكشف أدواتك',
    id: 'Jelajahi alat Anda',
    ja: 'ツールを探索する',
    zh: '探索你的工具',
    it: 'Esplora i tuoi strumenti',
    hi: 'अपने साधनों को खोजें',
    ko: '도구를 탐색하세요',
    uk: 'Досліджуй свої інструменти',
    pl: 'Odkryj swoje narzędzia'
  },
  featuresSubtitle: {
    en: 'Choose what fits your mood today',
    ka: 'აირჩიე რაც შეესაბამება შენს განწყობას დღეს',
    ru: 'Выбери то, что подходит твоему настроению сегодня',
    hy: 'Ընտրիր ըստ այսօրվա տրամադրությանդ',
    tr: 'Bugünkü ruh haline göre seç',
    az: 'Bugünkü əhvalına uyğun seç',
    es: 'Elige según tu estado de ánimo de hoy',
    de: 'Wähle passend zu deiner heutigen Stimmung',
    fr: 'Choisis selon ton humeur du jour',
    pt: 'Escolha conforme seu humor de hoje',
    ar: 'اختر ما يناسب مزاجك اليوم',
    id: 'Pilih sesuai suasana hati Anda hari ini',
    ja: '今日の気分に合うものを選ぶ',
    zh: '选择符合你今天心情的练习',
    it: 'Scegli ciò che si adatta al tuo umore di oggi',
    hi: 'आज के मूड के अनुसार चुनें',
    ko: '오늘 기분에 맞게 선택하세요',
    uk: 'Обери те, що відповідає твоєму настрою сьогодні',
    pl: 'Wybierz to, co pasuje do Twojego dzisiejszego nastroju'
  },
  featuredTitle: {
    en: 'Core experiences',
    ka: 'ძირითადი გამოცდილებები',
    ru: 'Ключевые практики',
    hy: 'Հիմնական փորձառություններ',
    tr: 'Temel deneyimler',
    az: 'Əsas təcrübələr',
    es: 'Experiencias clave',
    de: 'Kern-Erlebnisse',
    fr: 'Expériences clés',
    pt: 'Experiências principais',
    ar: 'تجارب أساسية',
    id: 'Pengalaman inti',
    ja: 'コア体験',
    zh: '核心体验',
    it: 'Esperienze fondamentali',
    hi: 'मुख्य अनुभव',
    ko: '핵심 경험',
    uk: 'Основні досвіди',
    pl: 'Podstawowe doświadczenia'
  },
  featuredSubtitle: {
    en: 'Start with our most loved modules',
    ka: 'დაიწყე ყველაზე პოპულარულ მოდულებით',
    ru: 'Начни с самых любимых модулей',
    hy: 'Սկսիր ամենասիրելի մոդուլներից',
    tr: 'En sevilen modüllerimizle başla',
    az: 'Ən sevilən modullardan başla',
    es: 'Empieza por los módulos más queridos',
    de: 'Starte mit den beliebtesten Modulen',
    fr: 'Commence par les modules préférés',
    pt: 'Comece pelos módulos mais queridos',
    ar: 'ابدأ بأكثر الوحدات المحبوبة',
    id: 'Mulai dari modul yang paling disukai',
    ja: '人気のモジュールから始めましょう',
    zh: '从最受欢迎的模块开始',
    it: 'Inizia dai moduli più amati',
    hi: 'सबसे पसंदीदा मॉड्यूल से शुरू करें',
    ko: '가장 사랑받는 모듈부터 시작하세요',
    uk: 'Почни з найулюбленіших модулів',
    pl: 'Zacznij od najbardziej lubianych modułów'
  },
  moreToolsTitle: {
    en: 'More tools',
    ka: 'სხვა ინსტრუმენტები',
    ru: 'Другие инструменты',
    hy: 'Այլ գործիքներ',
    tr: 'Diğer araçlar',
    az: 'Digər alətlər',
    es: 'Más herramientas',
    de: 'Weitere Tools',
    fr: 'Autres outils',
    pt: 'Mais ferramentas',
    ar: 'مزيد من الأدوات',
    id: 'Lebih banyak alat',
    ja: 'その他のツール',
    zh: '更多工具',
    it: 'Altri strumenti',
    hi: 'और साधन',
    ko: '더 많은 도구',
    uk: 'Більше інструментів',
    pl: 'Więcej narzędzi'
  }
} as const;

const FEATURES: Feature[] = [
  { id: 'journal', title: '', subtitle: '', icon: { pack: 'fa', name: 'book' }, gradient: ['#FF8A65', '#FF7043'], route: '/screens/journal' },
  { id: 'art', title: '', subtitle: '', icon: { pack: 'fa', name: 'palette' }, gradient: ['#EC4899', '#8B5CF6'], route: '/art-therapy' },
  { id: 'cards', title: '', subtitle: '', icon: { pack: 'fa', name: 'clone' }, gradient: ['#22D3EE', '#06B6D4'], route: '/screens/cards' },
  { id: 'ai', title: '', subtitle: '', icon: { pack: 'fa', name: 'brain' }, gradient: ['#6366F1', '#8B5CF6'], route: '/(tabs)/ai-therapy-chat' },
  { id: 'meditation', title: '', subtitle: '', icon: { pack: 'mc', name: 'meditation' }, gradient: ['#34D399', '#10B981'], route: '/screens/meditation' },
  { id: 'breathing', title: '', subtitle: '', icon: { pack: 'fa', name: 'wind' }, gradient: ['#60A5FA', '#3B82F6'], route: '/screens/breathing' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { language } = useLanguage();

  // Safe translation picker with English fallback when a key is missing
  const pick = (obj: Record<string, string>, lang: AppLanguage): string => {
    return obj[lang] ?? obj.en;
  };

  // Simple entrance animation
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fade, translate]);

  const onPress = async (route: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route as any);
  };

  const renderIcon = (icon: Feature['icon'], color: string, size = 24) => {
    if (icon.pack === 'mc') return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
    if (icon.pack === 'ion') return <Ionicons name={icon.name} size={size} color={color} />;
    return <FontAwesome5 name={icon.name} size={size} color={color} />;
  };

  // Featured IDs in the desired order
  const FEATURED_IDS: Array<keyof typeof t.features> = ['art', 'cards', 'ai'];
  const featuredItems = FEATURED_IDS.map((id) => {
    const meta = FEATURES.find((f) => f.id === id)!;
    return {
      ...meta,
      title: pick(t.features[id].title as any, language),
      subtitle: pick(t.features[id].subtitle as any, language),
    } as Feature;
  });
  const otherItems = FEATURES.filter((f) => !FEATURED_IDS.includes(f.id as any)).map((item) => {
    const id = item.id as keyof typeof t.features;
    return {
      ...item,
      title: pick(t.features[id].title as any, language),
      subtitle: pick(t.features[id].subtitle as any, language),
    } as Feature;
  });

  const Header = () => (
    <LinearGradient
      colors={isDark ? ['#0B1020', '#131A2A'] : ['#EEF2FF', '#E0E7FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTopRow}>
        <Text style={[styles.hello, { color: isDark ? '#FFFFFF' : '#111827' }]}>{pick(t.hello as any, language)} 👋</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/general' as any)}
          style={[styles.profileBtn, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>
    <Text style={[styles.headerTitle, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>{pick(t.headerTitle as any, language)}</Text>
    <Text style={[styles.headerSubtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>{pick(t.headerSubtitle as any, language)}</Text>

      {/* Marketing CTAs */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          onPress={() => onPress('/(tabs)/ai-therapy-chat')}
          activeOpacity={0.9}
          style={styles.ctaPrimary}
        >
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaPrimaryBg}>
            <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaPrimaryText}>{pick(t.cta.startAI as any, language)}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onPress('/screens/journal')}
          activeOpacity={0.9}
          style={styles.ctaSecondary}
        >
          <Text style={styles.ctaSecondaryText}>{pick(t.cta.openJournal as any, language)}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const FeatureCard = ({ item }: { item: Feature }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => onPress(item.route)}>
      <LinearGradient colors={item.gradient} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardIconWrap}>{renderIcon(item.icon, '#FFFFFF', 22)}</View>
          <View style={styles.cardChevron}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const FeaturedCard = ({ item }: { item: Feature }) => (
    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={() => onPress(item.route)}>
      <LinearGradient colors={item.gradient} style={styles.featuredGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.featuredTagRow}>
          <View style={styles.featuredTagChip}>
            <Ionicons name="star" size={12} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.featuredTagText}>{pick({
              en: 'Popular', es: 'Popular', pt: 'Popular', fr: 'Populaire', de: 'Beliebt', ru: 'Популярно', ar: 'شائع', id: 'Populer', ja: '人気', tr: 'Popüler', zh: '热门',
              ka: 'პოპულარული', az: 'Populyar', hy: 'Հանրաճանաչ', it: 'Popolare', hi: 'लोकप्रिय', ko: '인기', uk: 'Популярне', pl: 'Popularne'
            } as any, language)}</Text>
          </View>
          <View style={styles.cardChevron}>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <View style={styles.featuredIconWrap}>{renderIcon(item.icon, '#FFFFFF', 26)}</View>
          <Text style={styles.featuredTitle}>{item.title}</Text>
          <Text style={styles.featuredSubtitle}>{item.subtitle}</Text>
          <View style={styles.featuredBtn}>
            <Text style={styles.featuredBtnText}>{pick(t.cta.openNow as any, language)}</Text>
            <Ionicons name="arrow-forward" size={14} color="#111827" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0B0F1A' : '#F9FAFB' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header />
      <Animated.ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: translate }] }}>
        {/* Spotlight banner */}
        <View style={styles.spotlightWrapper}>
          <LinearGradient colors={isDark ? ['#111827', '#0B1020'] : ['#E0E7FF', '#EEF2FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.spotlightCard}>
            <View style={styles.spotlightLeft}>
              <Text style={[styles.spotlightTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>{pick(t.spotlightTitle as any, language)}</Text>
              <Text style={[styles.spotlightSubtitle, { color: isDark ? '#CBD5E1' : '#334155' }]}>{pick(t.spotlightSubtitle as any, language)}</Text>
              <TouchableOpacity onPress={() => onPress('/(tabs)/ai-therapy-chat')} activeOpacity={0.9}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.spotlightBtn}>
                  <FontAwesome5 name="brain" size={14} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.spotlightBtnText}>{pick(t.cta.startAI as any, language)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.spotlightRight}>
              <View style={styles.blobOne} />
              <View style={styles.blobTwo} />
            </View>
          </LinearGradient>
        </View>

    {/* Trust badges */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }]}>
            <FontAwesome5 name="shield-alt" size={12} color={isDark ? '#A78BFA' : '#6D28D9'} />
            <Text style={[styles.badgeText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{pick(t.badges.secure as any, language)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }]}>
            <FontAwesome5 name="clock" size={12} color={isDark ? '#A78BFA' : '#6D28D9'} />
            <Text style={[styles.badgeText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{pick(t.badges.anytime as any, language)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }]}>
            <FontAwesome5 name="flask" size={12} color={isDark ? '#A78BFA' : '#6D28D9'} />
            <Text style={[styles.badgeText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{pick(t.badges.science as any, language)}</Text>
          </View>
        </View>

        {/* Featured section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>{pick(sectionText.featuredTitle as any, language)}</Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>{pick(sectionText.featuredSubtitle as any, language)}</Text>
        </View>
        <View style={styles.featuredListWrap}>
          <FlatList
            data={featuredItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <FeaturedCard item={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>{pick(sectionText.featuresTitle as any, language)}</Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>{pick(sectionText.featuresSubtitle as any, language)}</Text>
        </View>

        <View style={styles.grid}>
          <FlatList
            data={otherItems}
            numColumns={2}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <FeatureCard item={item} />}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
            scrollEnabled={false}
          />
        </View>
        <View style={styles.bottomHint}>
          <Ionicons name="lock-closed" size={14} color={isDark ? '#A78BFA' : '#6D28D9'} />
          <Text style={[styles.hintText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>We never share your data. Your journey stays yours.</Text>
        </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  ctaPrimary: { flex: 1 },
  ctaPrimaryBg: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaPrimaryText: { color: '#fff', fontWeight: '800' },
  ctaSecondary: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  ctaSecondaryText: { color: '#FFFFFF', fontWeight: '800' },
  // Spotlight
  spotlightWrapper: { paddingHorizontal: 16, paddingTop: 16 },
  spotlightCard: {
    borderRadius: 20,
    padding: 16,
    minHeight: 140,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  spotlightLeft: { flex: 1, paddingRight: 8 },
  spotlightRight: { width: 90, alignItems: 'center', justifyContent: 'center' },
  spotlightTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  spotlightSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  spotlightBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start'
  },
  spotlightBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  blobOne: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99,102,241,0.25)',
    right: 0,
    top: 10,
  },
  blobTwo: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(139,92,246,0.25)',
    right: 20,
    bottom: 10,
  },
  // Badges
  badgesRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 6,
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  grid: {
    paddingTop: 16,
  },
  card: {
    flex: 1,
  },
  cardGradient: {
    minHeight: 140,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'column',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrap: {
    flex: 0,
    marginTop: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  cardChevron: { marginLeft: 8 },
  // Featured styles
  featuredListWrap: {
    marginTop: 10,
  },
  featuredCard: {
    width: 260,
  },
  featuredGradient: {
    borderRadius: 18,
    padding: 16,
    minHeight: 170,
  },
  featuredTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    marginTop: 6,
  },
  featuredBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  hintText: {
    fontSize: 12,
  },
});
