import CommonHeader from '@/components/CommonHeader';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { sendMessageToGPT } from '@/services/gptApi';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  aiResponse?: string;
  mood?: number;
  timestamp: number;
}

interface LocalizedText { [key: string]: string }
interface JournalPrompt {
  title: LocalizedText;
  description: LocalizedText;
  prompt: LocalizedText;
  icon: string;
  gradient: [string, string];
}

const promptsLocalized: JournalPrompt[] = [
  {
    title: {
      en: 'Day reflection', ka: 'დღის გაანალიზება', ru: 'Рефлексия дня', hy: 'Օրվա անդրադարձ', tr: 'Günün yansıması', az: 'Günün refleksiyası', es: 'Reflexión del día', de: 'Tagesreflexion', fr: 'Réflexion du jour', pt: 'Reflexão do dia', id: 'Refleksi Hari Ini', it: 'Riflessione del giorno', ar: 'تأمل اليوم', hi: 'दिन की मनन', zh: '当日反思', ja: '一日の振り返り', ko: '오늘 돌아보기', uk: 'Рефлексія дня', pl: 'Refleksja dnia'
    },
    description: {
      en: 'What was important today?', ka: 'რა იყო მნიშვნელოვანი დღეს?', ru: 'Что произошло сегодня важного?', hy: 'Ի՞նչ էր կարևոր այսօր', tr: 'Bugün ne önemliydi?', az: 'Bu gün nə vacib idi?', es: '¿Qué fue importante hoy?', de: 'Was war heute wichtig?', fr: 'Qu’est‑ce qui a été important aujourd’hui ?', pt: 'O que foi importante hoje?', id: 'Apa yang penting hari ini?', it: 'Cosa è stato importante oggi?', ar: 'ما كان مهماً اليوم؟', hi: 'आज क्या महत्वपूर्ण था?', zh: '今天什么很重要？', ja: '今日重要だったことは？', ko: '오늘 무엇이 중요했나요?', uk: 'Що було сьогодні важливим?', pl: 'Co było dziś ważne?'
    },
    prompt: {
      en: 'Share the most important event of your day. How did it affect your mood?', ka: 'გააზიარე დღისა ყველაზე მნიშვნელოვანი მოვლენა. როგორ იმოქმედა შენს განწყობაზე?', ru: 'Расскажите о самом важном событии сегодняшнего дня. Как это повлияло на ваше настроение?', hy: 'Կիսվեք օրվա ամենակարևոր իրադարձությամբ։ Ինչպե՞ս ազդեց ձեր տրամադրության վրա։', tr: 'Günün en önemli olayını paylaş. Ruh halini nasıl etkiledi?', az: 'Günün ən vacib hadisəsini paylaş. Əhvalına necə təsir etdi?', es: 'Comparte el evento más importante de tu día. ¿Cómo afectó tu estado de ánimo?', de: 'Teile das wichtigste Ereignis deines Tages. Wie beeinflusste es deine Stimmung?', fr: 'Partage l’événement le plus important de ta journée. Quel impact sur ton humeur ?', pt: 'Compartilhe o evento mais importante do seu dia. Como afetou seu humor?', id: 'Bagikan kejadian paling penting hari ini. Bagaimana pengaruhnya pada suasana hati?', it: 'Condividi l’evento più importante della tua giornata. Come ha influenzato il tuo umore?', ar: 'شارك أهم حدث في يومك. كيف أثّر على مزاجك؟', hi: 'अपने दिन की सबसे महत्वपूर्ण घटना साझा करें। इसने आपके मूड को कैसे प्रभावित किया?', zh: '分享你今天最重要的事情。它如何影响了你的心情？', ja: '今日一番大切だった出来事を共有し、その出来事が気分にどう影響したか書いてください。', ko: '오늘 가장 중요한 일을 적어보세요. 그것이 기분에 어떤 영향을 주었나요?', uk: 'Поділіться найважливішою подією дня. Як вона вплинула на ваш настрій?', pl: 'Podziel się najważniejszym wydarzeniem dnia. Jak wpłynęło na twój nastrój?'
    },
    icon: 'sun',
    gradient: ['#FFA726', '#FF7043'],
  },
  {
    title: {
      en: 'Gratitude', ka: 'დღის მადლიერება', ru: 'Благодарность', hy: 'Շնորհակալություն', tr: 'Şükran', az: 'Minnətdarlıq', es: 'Gratitud', de: 'Dankbarkeit', fr: 'Gratitude', pt: 'Gratidão', id: 'Rasa Syukur', it: 'Gratitudine', ar: 'امتنان', hi: 'कृतज्ञता', zh: '感恩', ja: '感謝', ko: '감사', uk: 'Вдячність', pl: 'Wdzięczność'
    },
    description: {
      en: 'What are you grateful for?', ka: 'რისთვის ხარ მადლიერი?', ru: 'За что вы благодарны?', hy: 'Ինչի՞ համար եք շնորհակալ', tr: 'Neler için minnettarsın?', az: 'Nəyə minnətdarsan?', es: '¿Por qué estás agradecido?', de: 'Wofür bist du dankbar?', fr: 'Pour quoi es‑tu reconnaissant ?', pt: 'Pelo que você é grato?', id: 'Untuk apa kamu bersyukur?', it: 'Per cosa sei grato?', ar: 'لِمَ أنت ممتن؟', hi: 'आप किस बात के लिए आभारी हैं?', zh: '你对什么心怀感激？', ja: '何に感謝していますか？', ko: '무엇에 감사하나요?', uk: 'За що ви вдячні?', pl: 'Za co jesteś wdzięczny?'
    },
    prompt: {
      en: 'List 3 things you are grateful for today. Why do they matter to you?', ka: 'ჩაწერე 3 რამ, რისთვისაც დღეს მადლიერი ხარ. რატომ არიან ისინი მნიშვნელოვანი?', ru: 'Перечислите 3 вещи, за которые вы благодарны сегодня. Почему они важны для вас?', hy: 'Գրեք 3 բան, որոնց համար այսօր շնորհակալ եք։ Ինչու՞ են դրանք կարևոր ձեզ համար։', tr: 'Bugün minnettar olduğun 3 şeyi yaz. Neden önemli?', az: 'Bu gün minnətdar olduğun 3 şeyi yaz. Niyə vacibdir?', es: 'Escribe 3 cosas por las que estás agradecido hoy. ¿Por qué importan para ti?', de: 'Notiere 3 Dinge, für die du heute dankbar bist. Warum sind sie wichtig?', fr: 'Note 3 choses dont tu es reconnaissant aujourd’hui. Pourquoi comptent‑elles ?', pt: 'Liste 3 coisas pelas quais é grato hoje. Por que importam?', id: 'Sebutkan 3 hal yang kamu syukuri hari ini. Mengapa penting?', it: 'Elenca 3 cose per cui sei grato oggi. Perché contano per te?', ar: 'اذكر 3 أمور تشعر بالامتنان لها اليوم. لماذا تهمك؟', hi: 'आज की 3 चीजें लिखें जिनके लिए आप आभारी हैं। वे क्यों मायने रखती हैं?', zh: '写下今天让你感恩的三件事。它们为何重要？', ja: '今日感謝している3つのことを書き、その理由を書いてください。', ko: '오늘 감사한 3가지를 적고 왜 중요한지 써보세요.', uk: 'Запишіть 3 речі, за які ви вдячні сьогодні. Чому вони важливі?', pl: 'Wypisz 3 rzeczy, za które dziś jesteś wdzięczny. Dlaczego są ważne?'
    },
    icon: 'heart',
    gradient: ['#EC407A', '#E91E63'],
  },
  {
    title: {
      en: 'Emotions', ka: 'ემოციები', ru: 'Эмоции', hy: 'Էմոցիաներ', tr: 'Duygular', az: 'Emosiyalar', es: 'Emociones', de: 'Emotionen', fr: 'Émotions', pt: 'Emoções', id: 'Emosi', it: 'Emozioni', ar: 'مشاعر', hi: 'भावनाएँ', zh: '情绪', ja: '感情', ko: '감정', uk: 'Емоції', pl: 'Emocje'
    },
    description: {
      en: 'What emotions do you feel?', ka: 'რას გრძნობ ახლა?', ru: 'Какие эмоции вы испытываете?', hy: 'Ի՞նչ եք զգում հիմա', tr: 'Ne hissediyorsun?', az: 'Nə hiss edirsən?', es: '¿Qué emociones sientes?', de: 'Welche Gefühle empfindest du?', fr: 'Quelles émotions ressens‑tu ?', pt: 'Que emoções você sente?', id: 'Apa yang kamu rasakan?', it: 'Che emozioni provi?', ar: 'ما المشاعر التي تشعر بها؟', hi: 'आप कौन-सी भावनाएँ महसूस कर रहे हैं?', zh: '你现在有什么情绪？', ja: '今どんな気持ち？', ko: '어떤 감정을 느끼나요?', uk: 'Які емоції ви відчуваєте?', pl: 'Jakie emocje odczuwasz?'
    },
    prompt: {
      en: 'Describe your current emotions. What caused them? How would you like to feel?', ka: 'აღწერე შენი ამჟამინდელი ემოციები. რამ გამოიწვია ისინი? როგორ გინდა გრძნობდე თავს?', ru: 'Опишите свои текущие эмоции. Что их вызвало? Как бы вы хотели себя чувствовать?', hy: 'Նկարագրեք ձեր ներկայիս զգացմունքները։ Ինչպե՞ս են առաջացել։ Ինչպե՞ս կցանկանայիք զգալ:', tr: 'Şu anki duygularını tarif et. Ne tetikledi? Nasıl hissetmek isterdin?', az: 'İndiki emosiyalarını təsvir et. Nə səbəb oldu? Necə hiss etmək istərdin?', es: 'Describe tus emociones actuales. ¿Qué las causó? ¿Cómo te gustaría sentirte?', de: 'Beschreibe deine jetzigen Gefühle. Was hat sie ausgelöst? Wie möchtest du dich fühlen?', fr: 'Décris tes émotions actuelles. Qu’est‑ce qui les a causées ? Comment voudrais‑tu te sentir ?', pt: 'Descreva suas emoções atuais. O que as causou? Como gostaria de se sentir?', id: 'Jelaskan emosi kamu saat ini. Apa penyebabnya? Ingin merasa bagaimana?', it: 'Descrivi le emozioni attuali. Cosa le ha causate? Come vorresti sentirti?', ar: 'صف مشاعرك الحالية. ما السبب؟ كيف تود أن تشعر؟', hi: 'अपनी वर्तमान भावनाएँ वर्णित करें। इन्हें किसने उत्पन्न किया? आप कैसा महसूस करना चाहते हैं?', zh: '描述你现在的情绪。是什么引发的？你希望如何感受？', ja: '今の感情を説明し、それを引き起こした要因と理想の感情を書いてください。', ko: '현재 감정을 설명하고 원인과 원하는 감정을 적어보세요.', uk: 'Опишіть свої теперішні емоції. Що їх викликало? Як хотіли б почуватися?', pl: 'Opisz swoje obecne emocje. Co je spowodowało? Jak chciałbyś się czuć?'
    },
    icon: 'smile',
    gradient: ['#42A5F5', '#1E88E5'],
  },
  {
    title: {
      en: 'Goals and dreams', ka: 'მიზნები და ოცნებები', ru: 'Цели и мечты', hy: 'Նպատակներ և երազանքներ', tr: 'Hedefler ve hayaller', az: 'Məqsədlər və arzular', es: 'Metas y sueños', de: 'Ziele und Träume', fr: 'Objectifs et rêves', pt: 'Metas e sonhos', id: 'Tujuan & Mimpi', it: 'Obiettivi e sogni', ar: 'أهداف وأحلام', hi: 'लक्ष्य और सपने', zh: '目标与梦想', ja: '目標と夢', ko: '목표와 꿈', uk: 'Цілі та мрії', pl: 'Cele i marzenia'
    },
    description: {
      en: 'What do you dream about?', ka: 'რის შესახებ ოცნებობ?', ru: 'О чем вы мечтаете?', hy: 'Ինչի՞ մասին եք երազում', tr: 'Ne hayal ediyorsun?', az: 'Nə arzulayırsan?', es: '¿Con qué sueñas?', de: 'Wovon träumst du?', fr: 'De quoi rêves‑tu ?', pt: 'Com o que você sonha?', id: 'Apa yang kamu impikan?', it: 'A cosa sogni?', ar: 'بماذا تحلم؟', hi: 'आप क्या सपने देखते हैं?', zh: '你梦想什么？', ja: '何を夢見ていますか？', ko: '무엇을 꿈꾸나요?', uk: 'Про що мрієте?', pl: 'O czym marzysz?'
    },
    prompt: {
      en: 'Share your dreams or goals. What small step can you take today?', ka: 'გააზიარე შენი მიზნები ან ოცნებები. რა პატარა ნაბიჯს გადადგამ დღეს?', ru: 'Поделитесь своими мечтами или целями. Какой шаг можете сделать сегодня к их достижению?', hy: 'Կիսվեք ձեր նպատակներով կամ երազանքներով։ Ինչ փոքր քայլ կարող եք անել այսօր:', tr: 'Hedef veya hayallerini paylaş. Bugün atabileceğin küçük adım ne?', az: 'Məqsəd və ya arzularını paylaş. Bu gün atacağın kiçik addım nədir?', es: 'Comparte tus sueños o metas. ¿Qué pequeño paso puedes dar hoy?', de: 'Teile deine Ziele oder Träume. Welchen kleinen Schritt kannst du heute tun?', fr: 'Partage tes objectifs ou rêves. Quel petit pas peux‑tu faire aujourd’hui ?', pt: 'Compartilhe seus objetivos ou sonhos. Que pequeno passo pode dar hoje?', id: 'Bagikan tujuan atau mimpi. Langkah kecil apa bisa kamu ambil hari ini?', it: 'Condividi obiettivi o sogni. Quale piccolo passo puoi fare oggi?', ar: 'شارك أحلامك أو أهدافك. ما الخطوة الصغيرة التي يمكنك اتخاذها اليوم؟', hi: 'अपने लक्ष्य या सपने साझा करें। आज आप कौन-सा छोटा कदम उठा सकते हैं?', zh: '分享你的目标或梦想。今天可以迈出什么小步？', ja: 'あなたの夢や目標を書き、今日できる小さな一歩を考えてください。', ko: '당신의 목표나 꿈을 적고 오늘 할 수 있는 작은 한 걸음을 써보세요.', uk: 'Поділіться цілями чи мріями. Який малий крок можете зробити сьогодні?', pl: 'Podziel się celami lub marzeniami. Jaki mały krok możesz podjąć dziś?'
    },
    icon: 'star',
    gradient: ['#AB47BC', '#8E24AA'],
  },
  {
    title: {
      en: 'Challenges', ka: 'გამოწვევები', ru: 'Проблемы', hy: 'Մարտահրավերներ', tr: 'Zorluklar', az: 'Çətinliklər', es: 'Desafíos', de: 'Herausforderungen', fr: 'Défis', pt: 'Desafios', id: 'Tantangan', it: 'Sfide', ar: 'تحديات', hi: 'चुनौतियाँ', zh: '挑战', ja: '課題', ko: '도전', uk: 'Виклики', pl: 'Wyzwania'
    },
    description: {
      en: 'What worries you?', ka: 'რა გაწუხებს?', ru: 'Что вас беспокоит?', hy: 'Ի՞նչ է մտահոգում ձեզ', tr: 'Seni ne endişelendiriyor?', az: 'Səni nə narahat edir?', es: '¿Qué te preocupa?', de: 'Was beschäftigt dich?', fr: 'Qu’est‑ce qui t’inquiète ?', pt: 'O que te preocupa?', id: 'Apa yang membuatmu cemas?', it: 'Cosa ti preoccupa?', ar: 'ما الذي يقلقك؟', hi: 'आपको क्या चिंतित करता है?', zh: '你在担心什么？', ja: '何が不安ですか？', ko: '무엇이 걱정되나요?', uk: 'Що вас турбує?', pl: 'Co cię martwi?'
    },
    prompt: {
      en: 'Describe what bothers you. What solutions do you see? What might help?', ka: 'აღწერე რა გაწუხებს. რა გადაწყვეტის გზებს ხედავ? რა შეიძლება დაგეხმაროს?', ru: 'Опишите то, что вас беспокоит. Какие варианты решения видите? Что поможет справиться?', hy: 'Նկարագրեք այն, što ձեզ անհանգստացնում է։ Ինչ լուծումներ եք տեսնում։ Ինչ կարող է օգնել?', tr: 'Seni rahatsız eden şeyi tarif et. Ne çözüm yolları görüyorsun? Ne yardımcı olabilir?', az: 'Səni narahat edən şeyi təsvir et. Hansı həll yollarını görürsən? Nə kömək edə bilər?', es: 'Describe lo que te molesta. ¿Qué soluciones ves? ¿Qué podría ayudarte?', de: 'Beschreibe, was dich belastet. Welche Lösungen siehst du? Was könnte helfen?', fr: 'Décris ce qui te dérange. Quelles solutions vois‑tu ? Qu’est‑ce qui pourrait aider ?', pt: 'Descreva o que te incomoda. Que soluções vê? O que pode ajudar?', id: 'Jelaskan yang mengganggumu. Solusi apa terlihat? Apa yang bisa membantu?', it: 'Descrivi ciò che ti disturba. Quali soluzioni vedi? Cosa potrebbe aiutare?', ar: 'صف ما يزعجك. ما الحلول التي تراها؟ ما الذي قد يساعد؟', hi: 'जिस बात से आप परेशान हैं उसे लिखें। आप कौन से समाधान देखते हैं? क्या मदद कर सकता है?', zh: '描述困扰你的事情。你看到哪些解决方案？什么可能帮到你？', ja: '悩んでいることを書き、考えられる解決策と役立ちそうなことを挙げてください。', ko: '당신을 괴롭히는 것을 적고 가능한 해결책과 도움 될 것을 써보세요.', uk: 'Опишіть, що вас турбує. Які рішення бачите? Що може допомогти?', pl: 'Opisz co cię niepokoi. Jakie rozwiązania widzisz? Co może pomóc?'
    },
    icon: 'lightbulb',
    gradient: ['#66BB6A', '#43A047'],
  },
  {
    title: {
      en: 'Free writing', ka: 'თავისუფალი წერა', ru: 'Свободная запись', hy: 'Ազատ գրություն', tr: 'Özgür yazı', az: 'Sərbəst yazı', es: 'Escritura libre', de: 'Freies Schreiben', fr: 'Écriture libre', pt: 'Escrita livre', id: 'Menulis bebas', it: 'Scrittura libera', ar: 'كتابة حرة', hi: 'मुक्त लेखन', zh: '自由书写', ja: '自由記述', ko: '자유 글쓰기', uk: 'Вільне письмо', pl: 'Swobodne pisanie'
    },
    description: {
      en: 'Write what’s on your mind', ka: 'დაწერე რაც თავში გაკავია', ru: 'Напишите то, что на душе', hy: 'Գրեք այն, ինչ մտքում է', tr: 'Aklından geçenleri yaz', az: 'Ağlından keçəni yaz', es: 'Escribe lo que tengas en mente', de: 'Schreibe, was dir durch den Kopf geht', fr: 'Écris ce qui te vient à l’esprit', pt: 'Escreva o que vier à mente', id: 'Tulis apa pun di pikiranmu', it: 'Scrivi ciò che ti passa per la mente', ar: 'اكتب ما يدور في ذهنك', hi: 'जो मन में है लिखें', zh: '写下脑海中的任何内容', ja: '頭に浮かぶことを書いてください', ko: '마음에 떠오르는 것을 적으세요', uk: 'Напишіть те, що у вас на думці', pl: 'Napisz co masz na myśli'
    },
    prompt: {
      en: 'Write anything that comes to mind. No topic or structure needed.', ka: 'დაწერე ყველაფერი რაც მოგდის თავში. თემა საჭირო არაა.', ru: 'Напишите все, что приходит в голову. Не ограничивайте себя темой или структурой.', hy: 'Գրեք ամեն ինչ, що գալիս է մտքիդ։ Թեմա կամ կառուցվածք պետք չկա։', tr: 'Aklına gelen her şeyi yaz. Konu ya da yapı şart değil.', az: 'Ağlına gələn hər şeyi yaz. Mövzu və struktur lazım deyil.', es: 'Escribe cualquier cosa que venga a tu mente. Sin tema ni estructura.', de: 'Schreibe alles, was dir einfällt. Kein Thema oder Aufbau nötig.', fr: 'Écris tout ce qui te vient. Pas de thème ou structure nécessaire.', pt: 'Escreva qualquer coisa que vier. Sem tema ou estrutura.', id: 'Tulis apa pun yang terlintas. Tak perlu topik atau struktur.', it: 'Scrivi qualsiasi cosa ti venga in mente. Nessun tema o struttura.', ar: 'اكتب أي شيء يخطر ببالك. لا حاجة لموضوع أو بنية.', hi: 'जो भी मन में आए लिखें। किसी विषय या संरचना की जरूरत नहीं.', zh: '写任何想到的内容。无需主题或结构。', ja: '思いついたことを自由に書きましょう。テーマや構成は不要です。', ko: '떠오르는 무엇이든 쓰세요. 주제나 구조는 필요 없습니다.', uk: 'Пишіть усе, що спадає на думку. Тема чи структура не потрібні.', pl: 'Napisz wszystko co przyjdzie do głowy. Bez tematu i struktury.'
    },
    icon: 'feather-alt',
    gradient: ['#26C6DA', '#00ACC1'],
  },
];

// Safely extract plain text from various AI response shapes
function extractAIText(response: any): string {
  if (!response) return '';
  if (typeof response === 'string') return response;
  try {
    // OpenAI Chat Completions (new SDK): choices[0].message.content
    const chatMsg = response?.choices?.[0]?.message?.content;
    if (typeof chatMsg === 'string' && chatMsg.trim()) return chatMsg.trim();

    // Legacy/text completion: choices[0].text
    const text = response?.choices?.[0]?.text;
    if (typeof text === 'string' && text.trim()) return text.trim();

    // Some SDKs return { content: '...' }
    const content = response?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();

    // As a last resort, stringify a concise subset to avoid rendering objects
    return JSON.stringify(response);
  } catch {
    return '';
  }
}

export default function JournalScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);
  const [entryText, setEntryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState<number>(3);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadEntries();
  }, []);

  // Safe translation picker with English fallback
  const pick = (obj: Record<string, string>, lang: AppLanguage): string => obj[lang] ?? obj.en;

  // Translations
  const t = useMemo(() => ({
    headerTitle: { en: 'Smart Journal', ka: 'ჭკვიანი ჟურნალი', ru: 'Умный дневник', hy: 'Խելացի օրագիր', tr: 'Akıllı Günlük', az: 'Ağıllı gündəlik', es: 'Diario inteligente', de: 'Smartes Tagebuch', fr: 'Journal intelligent', pt: 'Diário inteligente', id: 'Jurnal Pintar', it: 'Diario smart', ar: 'مفكرة ذكية', hi: 'स्मार्ट जर्नल', zh: '智能日记', ja: 'スマートジャーナル', ko: '스마트 저널', uk: 'Розумний щоденник', pl: 'Inteligentny dziennik' },
    welcomeTitle: { en: 'Welcome to your smart journal! 📝', ka: 'კეთილი იყოს შენი ჭკვიანი დღის წიგნი! 📝', ru: 'Добро пожаловать в ваш умный дневник! 📝', hy: 'Բարի գալուստ ձեր խելացի օրագիր! 📝', tr: 'Akıllı günlüğüne hoş geldin! 📝', az: 'Ağıllı gündəliyinə xoş gəldin! 📝', es: '¡Bienvenido a tu diario inteligente! 📝', de: 'Willkommen in deinem smarten Tagebuch! 📝', fr: 'Bienvenue dans ton journal intelligent ! 📝', pt: 'Bem-vindo ao seu diário inteligente! 📝', id: 'Selamat datang di jurnal pintarmu! 📝', it: 'Benvenuto nel tuo diario smart! 📝', ar: 'مرحبًا بمفكرتك الذكية! 📝', hi: 'आपके स्मार्ट जर्नल में स्वागत है! 📝', zh: '欢迎来到你的智能日记！📝', ja: 'スマートジャーナルへようこそ！📝', ko: '스마트 저널에 오신 것을 환영합니다! 📝', uk: 'Ласкаво просимо до вашого розумного щоденника! 📝', pl: 'Witaj w swoim inteligentnym dzienniku! 📝' },
    welcomeText: { en: 'Write with gentle AI support. Capture thoughts, get wise suggestions, and track your mood.', ka: 'წერე ნაზ AI მხარდაჭერით. ჩაიწერე აზრები, მიიღე ბრძნული რჩევები და აკონტროლე განწყობა.', ru: 'Ведите дневник с поддержкой ИИ. Записывайте мысли, получайте мудрые советы и отслеживайте состояние.', hy: 'Գրեք նրբորեն ԻԱ աջակցությամբ։ Նշեք մտքերը, ստացեք խելացի առաջարկներ և հետևեք ձեր տրամադրությանը։', tr: 'Nazik yapay zeka desteğiyle yaz. Düşüncelerini yakala, bilge öneriler al ve ruh halini takip et.', az: 'Zərif süni intellekt dəstəyi ilə yaz. Fikirləri qeyd et, müdrik tövsiyələr al və əhvalını izlə.', es: 'Escribe con apoyo suave de IA. Captura pensamientos, recibe sugerencias sabias y sigue tu ánimo.', de: 'Schreibe mit sanfter KI-Unterstützung. Halte Gedanken fest, erhalte kluge Impulse und verfolge deine Stimmung.', fr: 'Écris avec un soutien IA bienveillant. Capture tes pensées, reçois des conseils avisés et suis ton humeur.', pt: 'Escreva com apoio gentil de IA. Registre pensamentos, receba sugestões sábias e acompanhe seu humor.', id: 'Menulis dengan dukungan AI lembut. Tangkap pikiran, dapatkan saran bijak & lacak suasana hati.', it: 'Scrivi con un supporto AI gentile. Cattura pensieri, ricevi consigli saggi e traccia il tuo umore.', ar: 'اكتب بدعم لطيف من الذكاء الاصطناعي. دوّن أفكارك، احصل على اقتراحات حكيمة وتابع مزاجك.', hi: 'सौम्य एआई सहायता के साथ लिखें। विचार लिखें, समझदार सुझाव पाएं और मूड ट्रैक करें.', zh: '在温和的 AI 支持下写作。记录想法，获取智慧建议并追踪心情。', ja: '穏やかなAIサポートと共に書きましょう。思考を記録し、賢い提案を受け取り、気分を追跡。', ko: '부드러운 AI 지원과 함께 쓰세요. 생각을 기록하고 현명한 제안을 받고 기분을 추적하세요.', uk: 'Пишіть із делікатною підтримкою ШІ. Фіксуйте думки, отримуйте мудрі поради й відстежуйте настрій.', pl: 'Pisz z łagodnym wsparciem AI. Zapisuj myśli, otrzymuj mądre sugestie i śledź nastrój.' },
    quickWrite: { en: 'Quick note', ka: 'სწრაფი ჩანაწერი', ru: 'Быстрая запись', hy: 'Արագ նշում', tr: 'Hızlı not', az: 'Sürətli qeyd', es: 'Nota rápida', de: 'Schnelle Notiz', fr: 'Note rapide', pt: 'Nota rápida', id: 'Catatan cepat', it: 'Nota rapida', ar: 'ملاحظة سريعة', hi: 'त्वरित नोट', zh: '快速记录', ja: 'クイックノート', ko: '빠른 메모', uk: 'Швидка нотатка', pl: 'Szybka notatka' },
    promptsTitle: { en: 'Reflection prompts', ka: 'რეფლექსიის თემები', ru: 'Темы для размышлений', hy: 'Անդրադարձի հուշումներ', tr: 'Yansıma başlıkları', az: 'Refleksiya mövzuları', es: 'Prompts de reflexión', de: 'Reflexionsanregungen', fr: 'Invitations à la réflexion', pt: 'Promptes de reflexão', id: 'Prom refleksi', it: 'Spunti di riflessione', ar: 'مواضيع للتأمل', hi: 'चिंतन संकेत', zh: '反思提示', ja: '振り返りプロンプト', ko: '되돌아보기 프롬프트', uk: 'Підказки для рефлексії', pl: 'Pytania do refleksji' },
    entriesTitle: { en: 'Your entries', ka: 'შენი ჩანაწერები', ru: 'Ваши записи', hy: 'Ձեր գրառումները', tr: 'Kayıtların', az: 'Qeydlərin', es: 'Tus entradas', de: 'Deine Einträge', fr: 'Tes entrées', pt: 'Suas entradas', id: 'Entri kamu', it: 'Le tue note', ar: 'مدخلاتك', hi: 'आपकी प्रविष्टियाँ', zh: '你的日记', ja: 'あなたの記録', ko: '당신의 기록', uk: 'Ваші записи', pl: 'Twoje wpisy' },
    emptyTitle: { en: 'No entries yet', ka: 'ჯერ არ არის ჩანაწერები', ru: 'Пока нет записей', hy: 'Դեռ գրառումներ չկան', tr: 'Henüz kayıt yok', az: 'Hələ qeyd yoxdur', es: 'Aún no hay entradas', de: 'Noch keine Einträge', fr: 'Pas encore d’entrées', pt: 'Ainda sem entradas', id: 'Belum ada entri', it: 'Ancora nessuna nota', ar: 'لا توجد مدخلات بعد', hi: 'अभी कोई प्रविष्टि नहीं', zh: '还没有记录', ja: 'まだ記録がありません', ko: '아직 기록이 없습니다', uk: 'Ще немає записів', pl: 'Brak wpisów' },
    emptyText: { en: 'Start journaling by choosing a prompt above or making a quick note', ka: 'დაიწყე დღიური ზემოთა თემის არჩევით ან სწრაფი ჩანაწერით', ru: 'Начните вести дневник, выбрав тему выше или сделав быструю запись', hy: 'Սկսեք օրագիրը ընտրելով վերևի հուշումը կամ կատարելով արագ նշում', tr: 'Yukarıdan bir başlık seçerek veya hızlı not alarak başla', az: 'Yuxarıdakı mövzunu seçərək və ya sürətli qeydlə başla', es: 'Empieza el diario eligiendo un prompt o haciendo una nota rápida', de: 'Beginne mit dem Tagebuch, indem du oben eine Anregung wählst oder eine schnelle Notiz machst', fr: 'Commence ton journal en choisissant un prompt ou une note rapide', pt: 'Comece escolhendo um prompt ou fazendo uma nota rápida', id: 'Mulai dengan memilih prompt atau catatan cepat', it: 'Inizia scegliendo uno spunto o facendo una nota rapida', ar: 'ابدأ يومياتك باختيار موضوع أو ملاحظة سريعة', hi: 'ऊपर से एक संकेत चुनकर या जल्दी नोट लिखकर शुरू करें', zh: '通过选择上方的提示或快速记录来开始日记', ja: '上のプロンプトを選ぶかクイックノートで始めましょう', ko: '위 프롬프트를 선택하거나 빠른 메모로 시작하세요', uk: 'Почніть щоденник, обравши підказку чи зробивши швидку нотатку', pl: 'Zacznij wybierając pytanie lub dodając szybką notatkę' },
    moodQuestion: { en: 'How are you feeling?', ka: 'როგორ ხარ?', ru: 'Как вы себя чувствуете?', hy: 'Ինչպե՞ս եք զգում', tr: 'Nasıl hissediyorsun?', az: 'Necə hiss edirsən?', es: '¿Cómo te sientes?', de: 'Wie fühlst du dich?', fr: 'Comment te sens‑tu ?', pt: 'Como você está se sentindo?', id: 'Bagaimana perasaanmu?', it: 'Come ti senti?', ar: 'كيف تشعر؟', hi: 'आप कैसा महसूस कर रहे हैं?', zh: '你感觉如何？', ja: '今の気分は？', ko: '기분이 어때요?', uk: 'Як ви почуваєтесь?', pl: 'Jak się czujesz?' },
    moodLabels: [
      { en: 'Bad', ka: 'ცუდი', ru: 'Плохо', hy: 'Վատ', tr: 'Kötü', az: 'Pis', es: 'Mal', de: 'Schlecht', fr: 'Mal', pt: 'Mal', id: 'Buruk', it: 'Male', ar: 'سيئ', hi: 'बुरा', zh: '糟糕', ja: '悪い', ko: '나쁨', uk: 'Погано', pl: 'Źle' },
      { en: 'Sad', ka: 'მოუწესრიგებელი', ru: 'Грустно', hy: 'Տխուր', tr: 'Üzgün', az: 'Kədərli', es: 'Triste', de: 'Traurig', fr: 'Triste', pt: 'Triste', id: 'Sedih', it: 'Triste', ar: 'حزين', hi: 'उदास', zh: '难过', ja: '悲しい', ko: '슬픔', uk: 'Сумно', pl: 'Smutno' },
      { en: 'Okay', ka: 'ნორმალური', ru: 'Нормально', hy: 'Նորմալ', tr: 'İdare eder', az: 'Normal', es: 'Normal', de: 'Okay', fr: 'Moyen', pt: 'Ok', id: 'Biasa', it: 'Così così', ar: 'مقبول', hi: 'ठीक', zh: '还好', ja: 'まあまあ', ko: '괜찮음', uk: 'Нормально', pl: 'W porządku' },
      { en: 'Good', ka: 'კარგი', ru: 'Хорошо', hy: 'Լավ', tr: 'İyi', az: 'Yaxşı', es: 'Bien', de: 'Gut', fr: 'Bien', pt: 'Bem', id: 'Baik', it: 'Bene', ar: 'جيد', hi: 'अच्छा', zh: '好', ja: '良い', ko: '좋음', uk: 'Добре', pl: 'Dobrze' },
      { en: 'Great', ka: 'შესანიშნავი', ru: 'Отлично', hy: 'Հրաշալի', tr: 'Harika', az: 'Əla', es: 'Genial', de: 'Super', fr: 'Génial', pt: 'Ótimo', id: 'Hebat', it: 'Ottimo', ar: 'رائع', hi: 'बहुत बढ़िया', zh: '棒极了', ja: '最高', ko: '아주 좋음', uk: 'Чудово', pl: 'Świetnie' },
    ],
    cancel: { en: 'Cancel', ka: 'გაუქმება', ru: 'Отмена', hy: 'Չեղարկել', tr: 'İptal', az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar', id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj' },
    save: { en: 'Save', ka: 'შენახვა', ru: 'Сохранить', hy: 'Պահել', tr: 'Kaydet', az: 'Yadda saxla', es: 'Guardar', de: 'Speichern', fr: 'Enregistrer', pt: 'Salvar', id: 'Simpan', it: 'Salva', ar: 'حفظ', hi: 'सहेजें', zh: '保存', ja: '保存', ko: '저장', uk: 'Зберегти', pl: 'Zapisz' },
    saving: { en: 'Saving...', ka: 'ინახება...', ru: 'Сохранение...', hy: 'Պահվում է...', tr: 'Kaydediliyor...', az: 'Yadda saxlanılır...', es: 'Guardando...', de: 'Speichert...', fr: 'Enregistrement...', pt: 'Salvando...', id: 'Menyimpan...', it: 'Salvataggio...', ar: 'جارٍ الحفظ...', hi: 'सहेजा जा रहा...', zh: '正在保存…', ja: '保存中…', ko: '저장 중...', uk: 'Збереження...', pl: 'Zapisywanie...' },
    startWritingPlaceholder: { en: 'Start writing...', ka: 'დაიწყე წერა...', ru: 'Начните писать...', hy: 'Սկսեք գրել...', tr: 'Yazmaya başla...', az: 'Yazmağa başla...', es: 'Empieza a escribir...', de: 'Beginne zu schreiben...', fr: 'Commence à écrire...', pt: 'Comece a escrever...', id: 'Mulai menulis...', it: 'Inizia a scrivere...', ar: 'ابدأ الكتابة...', hi: 'लिखना शुरू करें...', zh: '开始写吧…', ja: '書き始めてください…', ko: '작성 시작...', uk: 'Почніть писати...', pl: 'Zacznij pisać...' },
    aiResponseLabel: { en: '💡 Smart support', ka: '💡 ჭკვიანი მხარდაჭერა', ru: '💡 Умная поддержка', hy: '💡 Խելացի աջակցություն', tr: '💡 Akıllı destek', az: '💡 Ağıllı dəstək', es: '💡 Apoyo inteligente', de: '💡 Smarte Unterstützung', fr: '💡 Aide intelligente', pt: '💡 Suporte inteligente', id: '💡 Dukungan pintar', it: '💡 Supporto smart', ar: '💡 دعم ذكي', hi: '💡 स्मार्ट सहायता', zh: '💡 智能支持', ja: '💡 スマート支援', ko: '💡 스마트 지원', uk: '💡 Розумна підтримка', pl: '💡 Inteligentne wsparcie' },
    alertWriteTitle: { en: 'Attention', ka: 'ყურადღება', ru: 'Внимание', hy: 'Ուշադրություն', tr: 'Dikkat', az: 'Diqqət', es: 'Atención', de: 'Achtung', fr: 'Attention', pt: 'Atenção', id: 'Perhatian', it: 'Attenzione', ar: 'تنبيه', hi: 'ध्यान दें', zh: '注意', ja: '注意', ko: '주의', uk: 'Увага', pl: 'Uwaga' },
    alertWriteText: { en: 'Please write something in the journal', ka: 'გთხოვ დაწერე რამე ჟურნალში', ru: 'Пожалуйста, напишите что-нибудь в дневнике', hy: 'Խնդրում ենք գրել ինչ‑որ բան օրագրում', tr: 'Lütfen günlükte bir şey yaz', az: 'Zəhmət olmasa gündəliyə nəsə yazın', es: 'Escribe algo en el diario', de: 'Bitte schreibe etwas ins Tagebuch', fr: 'Merci d’écrire quelque chose dans le journal', pt: 'Escreva algo no diário', id: 'Tulis sesuatu di jurnal', it: 'Scrivi qualcosa nel diario', ar: 'اكتب شيئًا في المفكرة', hi: 'कृपया जर्नल में कुछ लिखें', zh: '请在日记中写点内容', ja: '日記に何か書いてください', ko: '일기에 무언가를 작성하세요', uk: 'Напишіть щось у щоденнику', pl: 'Napisz coś w dzienniku' },
    alertSavedTitle: { en: 'Success', ka: 'წარმატება', ru: 'Успешно', hy: 'Հաջողություն', tr: 'Başarılı', az: 'Uğur', es: 'Éxito', de: 'Erfolg', fr: 'Succès', pt: 'Sucesso', id: 'Berhasil', it: 'Successo', ar: 'نجاح', hi: 'सफलता', zh: '成功', ja: '成功', ko: '성공', uk: 'Успіх', pl: 'Sukces' },
    alertSavedText: { en: 'Entry saved to journal', ka: 'ჩანაწერი შენახულია', ru: 'Запись сохранена в дневник', hy: 'Գրառումը պահպանվեց', tr: 'Kayıt günlüğe kaydedildi', az: 'Qeyd gündəliyə yazıldı', es: 'Entrada guardada en el diario', de: 'Eintrag gespeichert', fr: 'Entrée enregistrée', pt: 'Entrada salva no diário', id: 'Entri disimpan', it: 'Nota salvata', ar: 'تم حفظ المدخل', hi: 'प्रविष्टि सहेजी गई', zh: '条目已保存', ja: '記録を保存しました', ko: '기록 저장됨', uk: 'Запис збережено', pl: 'Wpis zapisany' },
    alertErrorTitle: { en: 'Error', ka: 'შეცდომა', ru: 'Ошибка', hy: 'Սխալ', tr: 'Hata', az: 'Xəta', es: 'Error', de: 'Fehler', fr: 'Erreur', pt: 'Erro', id: 'Kesalahan', it: 'Errore', ar: 'خطأ', hi: 'त्रुटि', zh: '错误', ja: 'エラー', ko: '오류', uk: 'Помилка', pl: 'Błąd' },
    alertErrorText: { en: 'Failed to save entry', ka: 'შენახვა ვერ მოხერხდა', ru: 'Не удалось сохранить запись', hy: 'Չհաջողվեց պահել գրառումը', tr: 'Kayıt kaydedilemedi', az: 'Qeyd yadda saxlanmadı', es: 'Error al guardar la entrada', de: 'Eintrag konnte nicht gespeichert werden', fr: 'Échec de l’enregistrement', pt: 'Falha ao salvar entrada', id: 'Gagal menyimpan entri', it: 'Impossibile salvare la nota', ar: 'فشل حفظ المدخل', hi: 'प्रविष्टि सहेजने में विफल', zh: '保存失败', ja: '保存に失敗しました', ko: '저장 실패', uk: 'Не вдалося зберегти запис', pl: 'Nie udało się zapisać wpisu' },
    deleteTitle: { en: 'Delete entry', ka: 'ჩანაწერის წაშლა', ru: 'Удаление записи', hy: 'Ջնջել գրառումը', tr: 'Kaydı sil', az: 'Qeydi sil', es: 'Eliminar entrada', de: 'Eintrag löschen', fr: 'Supprimer l’entrée', pt: 'Excluir entrada', id: 'Hapus entri', it: 'Elimina nota', ar: 'حذف المدخل', hi: 'प्रविष्टि हटाएँ', zh: '删除条目', ja: '記録を削除', ko: '기록 삭제', uk: 'Видалити запис', pl: 'Usuń wpis' },
    deleteMessage: { en: 'Are you sure you want to delete this entry?', ka: 'დარწმუნებული ხარ რომ გინდა წაშლა?', ru: 'Вы уверены, что хотите удалить эту запись?', hy: 'Վստա՞հ եք, որ ցանկանում եք ջնջել գրառումը։', tr: 'Bu kaydı silmek istediğine emin misin?', az: 'Bu qeydi silmək istədiyinizə əminsiniz?', es: '¿Seguro que quieres eliminar esta entrada?', de: 'Möchtest du diesen Eintrag wirklich löschen?', fr: 'Voulez‑vous vraiment supprimer cette entrée ?', pt: 'Tem certeza que deseja excluir esta entrada?', id: 'Yakin ingin menghapus entri ini?', it: 'Sei sicuro di voler eliminare questa nota?', ar: 'هل أنت متأكد أنك تريد حذف هذا المدخل؟', hi: 'क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं?', zh: '确定要删除此条目吗？', ja: 'この記録を削除してもよいですか？', ko: '이 기록을 삭제하시겠습니까?', uk: 'Ви впевнені, що хочете видалити цей запис?', pl: 'Czy na pewno chcesz usunąć ten wpis?' },
  }), [language]);

  const journalPrompts: JournalPrompt[] = promptsLocalized;

  const languageNames: Record<AppLanguage, string> = {
    en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German', fr: 'French', pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish'
  };

  const localeByLanguage: Record<AppLanguage, string> = {
    en: 'en-US', ka: 'ka-GE', ru: 'ru-RU', hy: 'hy-AM', tr: 'tr-TR', az: 'az-AZ', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', pt: 'pt-PT', id: 'id-ID', it: 'it-IT', ar: 'ar', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', uk: 'uk-UA', pl: 'pl-PL'
  };

  const loadEntries = async () => {
    try {
      const savedEntries = await AsyncStorage.getItem('journal_entries');
      if (savedEntries) {
        const parsed: any[] = JSON.parse(savedEntries);
        // Normalize any legacy entries where aiResponse was stored as an object
        const normalized = parsed.map((e: any) => ({
          ...e,
          aiResponse: e?.aiResponse ? extractAIText(e.aiResponse) : undefined,
        }));
        setEntries(normalized as JournalEntry[]);
        // Persist normalized structure to avoid future crashes
        await AsyncStorage.setItem('journal_entries', JSON.stringify(normalized));
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    }
  };

  const saveEntry = async () => {
    if (entryText.trim().length === 0) {
      Alert.alert(pick(t.alertWriteTitle as any, language), pick(t.alertWriteText as any, language));
      return;
    }

    setIsLoading(true);

    try {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(localeByLanguage[language] || 'en-US'),
        content: entryText,
        mood,
        timestamp: Date.now(),
      };

      // Build AI prompt and request a reply in the selected language
      const topic = currentPrompt ? pick(currentPrompt.title as any, language) : undefined;
      const aiPrompt = currentPrompt
        ? `The user wrote in their journal on the topic "${topic}": "${entryText}". Provide a short, supportive and wise response in ${languageNames[language]}. Be empathetic and constructive.`
        : `The user wrote in their journal: "${entryText}". Provide a short, supportive response in ${languageNames[language]} that helps reflect and move forward.`;

      const aiRawResponse = await sendMessageToGPT([
        { role: 'user', content: aiPrompt }
      ]);
      const aiText = extractAIText(aiRawResponse);
      newEntry.aiResponse = aiText;

      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      await AsyncStorage.setItem('journal_entries', JSON.stringify(updatedEntries));

      setEntryText('');
      setIsWriting(false);
      setCurrentPrompt(null);
      setMood(3);

      Alert.alert(pick(t.alertSavedTitle as any, language), pick(t.alertSavedText as any, language));
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      Alert.alert(pick(t.alertErrorTitle as any, language), pick(t.alertErrorText as any, language));
    } finally {
      setIsLoading(false);
    }
  };

  const startWriting = (prompt?: JournalPrompt) => {
    setCurrentPrompt(prompt || null);
    setIsWriting(true);
    // Do not pre-fill the editor; show the prompt as a hint (placeholder) instead
    if (prompt) {
      setEntryText('');
    }
  };

  const cancelWriting = () => {
    setIsWriting(false);
    setCurrentPrompt(null);
    setEntryText('');
    setMood(3);
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert(
      pick(t.deleteTitle as any, language),
      pick(t.deleteMessage as any, language),
      [
        { text: pick(t.cancel as any, language), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            setEntries(updatedEntries);
            await AsyncStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
          },
        },
      ]
    );
  };

  const moodEmojis = ['😔', '😕', '😐', '😊', '😁'];
  const moodLabels = t.moodLabels.map((lbl) => pick(lbl as any, language));

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
    },
    backButton: {
      marginRight: 16,
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
    },
    welcomeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    welcomeText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    promptsContainer: {
      marginBottom: 24,
    },
    promptGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    promptCard: {
      width: (screenWidth - 48) / 2,
      height: 120,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
    },
    promptGradient: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    promptIcon: {
      alignSelf: 'flex-start',
    },
    promptTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    promptDescription: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    quickWriteButton: {
      backgroundColor: isDark ? '#3b82f6' : '#000000',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    quickWriteText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    entriesContainer: {
      marginTop: 8,
    },
    entryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    entryDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    entryMood: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moodEmoji: {
      fontSize: 16,
      marginRight: 4,
    },
    moodText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    entryContent: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: 12,
    },
    aiResponseContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    aiResponseLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    aiResponse: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    deleteButton: {
      marginLeft: 8,
      padding: 4,
    },
    // Writing mode styles
    writingContainer: {
      flex: 1,
      padding: 16,
    },
    promptInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    promptInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    promptInfoText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    moodSelector: {
      marginBottom: 16,
    },
    moodLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    moodOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    moodOption: {
      alignItems: 'center',
      padding: 8,
      borderRadius: 12,
      minWidth: 60,
    },
    moodOptionActive: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    moodOptionEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    moodOptionText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    moodOptionTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 200,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: isDark ? '#3b82f6' : '#000000',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    emptyState: {
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
    },
  });

  if (isWriting) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        <CommonHeader 
          title={currentPrompt ? pick(currentPrompt.title as any, language) : pick({ en: 'Free writing', ka: 'თავისუფალი წერა', ru: 'Свободная запись' } as any, language)}
          onBack={cancelWriting}
        />

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.writingContainer}>
            {currentPrompt && (
              <View style={styles.promptInfo}>
                <Text style={styles.promptInfoTitle}>{pick(currentPrompt.title as any, language)}</Text>
                <Text style={styles.promptInfoText}>{pick(currentPrompt.description as any, language)}</Text>
              </View>
            )}

            <View style={styles.moodSelector}>
              <Text style={styles.moodLabel}>{pick(t.moodQuestion as any, language)}</Text>
              <View style={styles.moodOptions}>
                {moodEmojis.map((emoji, index) => {
                  const active = mood === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.moodOption,
                        active && styles.moodOptionActive,
                      ]}
                      onPress={() => setMood(index)}
                    >
                      <Text style={styles.moodOptionEmoji}>{emoji}</Text>
                      <Text style={[
                        styles.moodOptionText,
                        active && styles.moodOptionTextActive,
                      ]}>{moodLabels[index]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder={currentPrompt ? pick(currentPrompt.prompt as any, language) : pick(t.startWritingPlaceholder as any, language)}
              placeholderTextColor={theme.colors.textSecondary}
              value={entryText}
              onChangeText={setEntryText}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelWriting}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{pick(t.cancel as any, language)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveEntry}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.loadingText}>{pick(t.saving as any, language)}</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, styles.saveButtonText]}>{pick(t.save as any, language)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <CommonHeader 
        title={pick(t.headerTitle as any, language)}
        subtitle={pick({ 
          ka: 'თქვენი აზრები და გრძნობები', 
          en: 'Your thoughts and feelings', 
          ru: 'Ваши мысли и чувства',
          hy: 'Ձեր մտքերը և զգացմունքները',
          tr: 'Düşünceleriniz ve duygularınız',
          az: 'Düşüncələriniz və hissləriniz',
          es: 'Tus pensamientos y sentimientos',
          de: 'Ihre Gedanken und Gefühle',
          fr: 'Vos pensées et sentiments',
          pt: 'Seus pensamentos e sentimentos',
          id: 'Pikiran dan perasaan Anda',
          it: 'I tuoi pensieri e sentimenti',
          ar: 'أفكارك ومشاعرك',
          hi: 'आपके विचार और भावनाएं',
          zh: '您的想法和感受',
          ja: 'あなたの思考と感情',
          ko: '당신의 생각과 감정',
          uk: 'Ваші думки та почуття',
          pl: 'Twoje myśli i uczucia'
        } as any, language)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>{pick(t.welcomeTitle as any, language)}</Text>
          <Text style={styles.welcomeText}>{pick(t.welcomeText as any, language)}</Text>
        </View>

        <TouchableOpacity style={styles.quickWriteButton} onPress={() => startWriting()}>
          <FontAwesome5 name="edit" size={18} color="#FFFFFF" />
          <Text style={styles.quickWriteText}>{pick(t.quickWrite as any, language)}</Text>
        </TouchableOpacity>

        <View style={styles.promptsContainer}>
          <Text style={styles.sectionTitle}>{pick(t.promptsTitle as any, language)}</Text>
          <View style={styles.promptGrid}>
            {journalPrompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptCard}
                onPress={() => startWriting(prompt)}
              >
                <LinearGradient
                  colors={prompt.gradient}
                  style={styles.promptGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FontAwesome5 
                    name={prompt.icon} 
                    size={20} 
                    color="#FFFFFF" 
                    style={styles.promptIcon} 
                  />
                  <View>
                    <Text style={styles.promptTitle}>{pick(prompt.title as any, language)}</Text>
                    <Text style={styles.promptDescription}>{pick(prompt.description as any, language)}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>{pick(t.entriesTitle as any, language)}</Text>
          
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 
                name="book-open" 
                size={48} 
                color={theme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateTitle}>{pick(t.emptyTitle as any, language)}</Text>
              <Text style={styles.emptyStateText}>{pick(t.emptyText as any, language)}</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {entry.mood !== undefined && (
                      <View style={styles.entryMood}>
                        <Text style={styles.moodEmoji}>{moodEmojis[entry.mood]}</Text>
                        <Text style={styles.moodText}>{moodLabels[entry.mood]}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteEntry(entry.id)}
                    >
                      <FontAwesome5 name="trash" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.entryContent}>{entry.content}</Text>
                
                {entry.aiResponse && (
                  <View style={styles.aiResponseContainer}>
                    <Text style={styles.aiResponseLabel}>{pick(t.aiResponseLabel as any, language)}</Text>
                    <Text style={styles.aiResponse}>{extractAIText(entry.aiResponse)}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
