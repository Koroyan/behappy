import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtTherapyResponse } from './artTherapyService';

export interface ArtTherapySession {
  id: number;
  title: Record<string, string>;
  theme: Record<string, string>;
  description: Record<string, string>;
  drawingPrompt: Record<string, string>;
  icon: string; // emoji or icon name
  color: string;
  estimatedDuration: number; // in minutes
  focusAreas: string[];
}

export interface SessionProgress {
  sessionId: number;
  completed: boolean;
  phase: 0 | 1 | 2;
  startedAt?: Date;
  completedAt?: Date;
  firstDrawingUri?: string;
  secondDrawingUri?: string;
  chatHistory: any[];
  clinicalSummary?: ArtTherapyResponse;
  emotionalJourney?: string[];
}

// 15 Carefully Designed Art Therapy Sessions
export const ART_THERAPY_SESSIONS: ArtTherapySession[] = [
  {
    id: 1,
    title: {
      en: 'Self-Portrait: Who Am I?',
      ka: 'ავტოპორტრეტი: ვინ ვარ მე?',
      ru: 'Автопортрет: Кто я?',
      hy: 'Ինքնապատկեր: Ո՞վ եմ ես',
      tr: 'Otoportre: Ben Kimim?',
      az: 'Avtoportret: Mən kiməm?',
      de: 'Selbstporträt: Wer bin ich?',
      fr: 'Autoportrait : Qui suis‑je ?',
      pt: 'Autorretrato: Quem sou eu?',
      id: 'Potret Diri: Siapa Aku?',
      it: 'Autoritratto: Chi sono?',
      ar: 'صورة ذاتية: من أنا؟',
      hi: 'स्व-चित्र: मैं कौन हूँ?',
      zh: '自画像：我是谁？',
      ja: '自画像：私は誰？',
      ko: '자화상: 나는 누구인가?',
      uk: 'Автопортрет: Хто я?',
      pl: 'Autoportret: Kim jestem?'
    },
    theme: {
      en: 'Self-Exploration',
      ka: 'თვითშემეცნება',
      ru: 'Самопознание',
      hy: 'Ինքնաճանաչում',
      tr: 'Kendini Keşfetme',
      az: 'Özünü kəşf',
      es: 'Autoexploración',
      de: 'Selbsterkundung',
      fr: 'Exploration de soi',
      pt: 'Autoexploração',
      id: 'Penjelajahan Diri',
      it: 'Autoesplorazione',
      ar: 'استكشاف الذات',
      hi: 'आत्म-अन्वेषण',
      zh: '自我探索',
      ja: '自己探求',
      ko: '자기 탐색',
      uk: 'Самодослідження',
      pl: 'Autoeksploracja'
    },
    description: {
      en: 'Begin your journey by expressing how you see yourself right now. No artistic skill needed—just honesty.',
      ka: 'დაიწყე შენი მოგზაურობა იმით, რომ გამოხატო როგორ ხედავ საკუთარ თავს ახლა. არ არის საჭირო ხელოვნური უნარი—მხოლოდ გულწრფელობა.',
      ru: 'Начните свой путь с выражения того, как вы видите себя сейчас. Не нужны художественные навыки—только честность.',
      hy: 'Սկսեք ձեր ճանապարհը՝ արտահայտելով, թե ինչպես եք տեսնում ինքներդ ձեզ հիմա: Արվեստի հմտություններ պետք չեն՝ միայն ազնվություն:',
      tr: 'Yolculuğuna, şu anda kendini nasıl gördüğünü ifade ederek başla. Sanatsal beceri gerekmez—yalnızca dürüstlük.',
      az: 'Səyahətinə indi özünü necə gördüyünü ifadə etməklə başla. Bədii bacarıq lazım deyil—yalnız səmimiyyət.',
      es: 'Comienza tu viaje expresando cómo te ves en este momento. No necesitas habilidades artísticas; solo honestidad.',
      de: 'Beginne deine Reise, indem du ausdrückst, wie du dich im Moment siehst. Keine künstlerischen Fähigkeiten nötig – nur Ehrlichkeit.',
      fr: 'Commence ton voyage en exprimant comment tu te vois en ce moment. Aucune compétence artistique requise — seulement de l’honnêteté.',
      pt: 'Comece sua jornada expressando como você se vê agora. Nenhuma habilidade artística necessária — apenas honestidade.',
      id: 'Mulai perjalananmu dengan mengekspresikan bagaimana kamu melihat dirimu saat ini. Tak perlu keahlian seni—cukup kejujuran.',
      it: 'Inizia il tuo viaggio esprimendo come ti vedi in questo momento. Nessuna abilità artistica richiesta—solo onestà.',
      ar: 'ابدأ رحلتك بالتعبير عن كيف ترى نفسك الآن. لا حاجة لمهارات فنية—فقط الصدق.',
      hi: 'अपनी यात्रा की शुरुआत इस बात को व्यक्त करके करें कि आप अभी खुद को कैसे देखते हैं। किसी कलात्मक कौशल की आवश्यकता नहीं—बस ईमानदारी।',
      zh: '以表达此刻的自我认知开启你的旅程。无需任何艺术技巧——只需诚实。',
      ja: '今の自分をどう見ているかを表現するところから旅を始めましょう。芸術的なスキルは不要—必要なのは正直さだけ。',
      ko: '지금의 자신을 어떻게 보는지 표현하며 여정을 시작해 보세요. 예술적 기술은 필요 없어요—중요한 건 솔직함입니다.',
      uk: 'Почніть свою подорож, висловивши, як ви бачите себе зараз. Жодних художніх навичок не потрібно — лише щирість.',
      pl: 'Rozpocznij swoją podróż, wyrażając, jak widzisz siebie teraz. Nie są potrzebne umiejętności artystyczne — wystarczy szczerość.'
    },
    drawingPrompt: {
      en: 'Draw yourself as you feel right now. Use colors, shapes, or symbols that represent your current state.',
      ka: 'დახატე საკუთარი თავი ისე, როგორც ახლა გრძნობ. გამოიყენე ფერები, ფორმები ან სიმბოლოები, რომლებიც წარმოადგენენ შენს ამჟამინდელ მდგომარეობას.',
      ru: 'Нарисуйте себя таким, каким чувствуете себя сейчас. Используйте цвета, формы или символы, представляющие ваше текущее состояние.',
      hy: 'Նկարեք ինքներդ ձեզ այնպես, ինչպես զգում եք հիմա: Օգտագործեք գույներ, ձևեր կամ խորհրդանիշներ, որոնք ներկայացնում են ձեր ներկա վիճակը:',
      tr: 'Şu anda nasıl hissediyorsan kendini öyle çiz. Mevcut halini temsil eden renkler, şekiller veya semboller kullan.',
      az: 'Özünü indi necə hiss edirsənsə elə çək. Cari vəziyyətini əks etdirən rənglər, formalar və ya simvollar istifadə et.',
      es: 'Dibújate como te sientes ahora mismo. Usa colores, formas o símbolos que representen tu estado actual.',
      de: 'Zeichne dich so, wie du dich gerade fühlst. Verwende Farben, Formen oder Symbole, die deinen aktuellen Zustand darstellen.',
      fr: 'Dessine-toi tel que tu te sens maintenant. Utilise des couleurs, des formes ou des symboles représentant ton état actuel.',
      pt: 'Desenhe a si mesmo como você se sente agora. Use cores, formas ou símbolos que representem seu estado atual.',
      id: 'Gambarlah dirimu sebagaimana perasaanmu saat ini. Gunakan warna, bentuk, atau simbol yang mewakili keadaanmu saat ini.',
      it: 'Disegnati così come ti senti in questo momento. Usa colori, forme o simboli che rappresentino il tuo stato attuale.',
      ar: 'ارسم نفسك كما تشعر الآن. استخدم ألوانًا أو أشكالًا أو رموزًا تعبّر عن حالتك الحالية.',
      hi: 'अपने आप को वैसा ही बनाएं जैसा आप अभी महसूस करते हैं। अपने वर्तमान हालात को दर्शाने वाले रंग, आकार या प्रतीक का उपयोग करें।',
      zh: '按你此刻的感受画出自己。使用能代表你当前状态的颜色、形状或符号。',
      ja: '今の気持ちのままの自分を描いてください。現在の状態を表す色、形、またはシンボルを使いましょう。',
      ko: '지금 느끼는 그대로의 자신을 그려 보세요. 현재 상태를 나타내는 색, 모양 또는 심볼을 사용하세요.',
      uk: 'Намалюйте себе так, як ви відчуваєте себе зараз. Використовуйте кольори, форми чи символи, що відображають ваш теперішній стан.',
      pl: 'Narysuj siebie tak, jak się teraz czujesz. Użyj kolorów, kształtów lub symboli, które oddają twój obecny stan.'
    },
    icon: '🪞',
    color: '#6366F1',
    estimatedDuration: 30,
    focusAreas: ['self-awareness', 'identity', 'present-moment']
  },
  {
    id: 2,
    title: {
      en: 'The Safe Place',
      ka: 'უსაფრთხო ადგილი',
      ru: 'Безопасное место',
      hy: 'Անվտանգ տեղ',
      tr: 'Güvenli Yer',
      az: 'Təhlükəsiz Məkan',
      es: 'El Lugar Seguro',
      de: 'Der sichere Ort',
      fr: 'Le Lieu Sûr',
      pt: 'O Lugar Seguro',
      id: 'Tempat Aman',
      it: 'Il Luogo Sicuro',
      ar: 'المكان الآمن',
      hi: 'सुरक्षित स्थान',
      zh: '安全之地',
      ja: '安全な場所',
      ko: '안전한 장소',
      uk: 'Безпечне місце',
      pl: 'Bezpieczne miejsce'
    },
    theme: {
      en: 'Safety & Grounding',
      ka: 'უსაფრთხოება და დამიწება',
      ru: 'Безопасность и заземление',
      hy: 'Անվտանգություն և հողակցում',
      tr: 'Güvenlik ve Topraklanma',
      az: 'Təhlükəsizlik və Yerə Bağlanma',
      es: 'Seguridad y Enraizamiento',
      de: 'Sicherheit & Erdung',
      fr: 'Sécurité et Ancrage',
      pt: 'Segurança e Enraizamento',
      id: 'Keamanan & Pembumian',
      it: 'Sicurezza e Radicamento',
      ar: 'الأمان والتأريض',
      hi: 'सुरक्षा और ग्राउंडिंग',
      zh: '安全与扎根',
      ja: '安心とグラウンディング',
      ko: '안전과 그라운딩',
      uk: 'Безпека та заземлення',
      pl: 'Bezpieczeństwo i ugruntowanie'
    },
    description: {
      en: 'Create a visual sanctuary—a place where you feel completely safe and at peace.',
      ka: 'შექმენი ვიზუალური თავშესაფარი—ადგილი, სადაც სრულიად უსაფრთხოდ და მშვიდად გრძნობ თავს.',
      ru: 'Создайте визуальное убежище—место, где вы чувствуете себя полностью в безопасности и покое.',
      hy: 'Ստեղծեք տեսողական ապաստան՝ տեղ, որտեղ դուք զգում եք ձեզ լիովին անվտանգ և հանգիստ:',
      tr: 'Görsel bir sığınak oluştur—tamamen güvende ve huzurlu hissettiğin bir yer.',
      az: 'Vizual sığınacaq yaradın—tam təhlükəsiz və sakit hiss etdiyiniz bir yer.',
      es: 'Crea un santuario visual: un lugar donde te sientas completamente seguro y en paz.',
      de: 'Erschaffe ein visuelles Refugium – einen Ort, an dem du dich völlig sicher und friedlich fühlst.',
      fr: 'Crée un sanctuaire visuel—un lieu où tu te sens totalement en sécurité et en paix.',
      pt: 'Crie um santuário visual—um lugar onde você se sinta totalmente seguro e em paz.',
      id: 'Ciptakan tempat perlindungan visual—ruang di mana kamu merasa sepenuhnya aman dan damai.',
      it: 'Crea un santuario visivo—un luogo dove ti senti completamente al sicuro e in pace.',
      ar: 'أنشئ ملاذًا بصريًا—مكانًا تشعر فيه بالأمان التام والسلام.',
      hi: 'एक दृश्य आश्रय बनाएं—एक जगह जहाँ आप पूरी तरह सुरक्षित और शांत महसूस करें।',
      zh: '创造一个视觉避风港——一个让你感到完全安全与平和的地方。',
      ja: '視覚的な聖域を作りましょう―完全に安全で安らげる場所です。',
      ko: '시각적인 안식처를 만들어 보세요—완전히 안전하고 평화로운 곳.',
      uk: 'Створіть візуальне святилище — місце, де ви відчуваєте себе цілком у безпеці та спокої.',
      pl: 'Stwórz wizualne schronienie—miejsce, w którym czujesz się całkowicie bezpiecznie i spokojnie.'
    },
    drawingPrompt: {
      en: 'Draw a place (real or imaginary) where you feel completely safe. What does it look like? Who or what is there?',
      ka: 'დახატე ადგილი (რეალური ან წარმოსახვითი), სადაც სრულიად უსაფრთხოდ გრძნობ თავს. როგორ გამოიყურება? ვინ ან რა არის იქ?',
      ru: 'Нарисуйте место (реальное или воображаемое), где вы чувствуете себя полностью в безопасности. Как оно выглядит? Кто или что там?',
      hy: 'Նկարեք տեղ (իրական կամ երևակայական), որտեղ զգում եք ձեզ լիովին անվտանգ: Ինչպե՞ս է այն տեսնվում: Ո՞վ կամ ի՞նչ կա այնտեղ:',
      tr: 'Kendini tamamen güvende hissettiğin bir yeri (gerçek ya da hayali) çiz. Nasıl görünüyor? Kim ya da ne var?',
      az: 'Özünü tam təhlükəsiz hiss etdiyin yeri (real və ya xəyali) çək. Necə görünür? Kim və ya nə var orada?',
      es: 'Dibuja un lugar (real o imaginario) donde te sientas completamente seguro. ¿Cómo es? ¿Quién o qué está allí?',
      de: 'Zeichne einen Ort (real oder imaginär), an dem du dich völlig sicher fühlst. Wie sieht er aus? Wer oder was ist dort?',
      fr: 'Dessine un lieu (réel ou imaginaire) où tu te sens totalement en sécurité. À quoi ressemble-t-il ? Qui ou quoi s’y trouve ?',
      pt: 'Desenhe um lugar (real ou imaginário) onde você se sinta totalmente seguro. Como é? Quem ou o que está lá?',
      id: 'Gambarkan tempat (nyata atau imajiner) di mana kamu merasa sepenuhnya aman. Seperti apa? Siapa atau apa yang ada di sana?',
      it: 'Disegna un luogo (reale o immaginario) dove ti senti completamente al sicuro. Com’è? Chi o cosa c’è?',
      ar: 'ارسم مكانًا (حقيقيًا أو خياليًا) تشعر فيه بالأمان التام. كيف يبدو؟ من أو ماذا يوجد هناك؟',
      hi: 'एक स्थान (वास्तविक या कल्पित) बनाएं जहाँ आप पूरी तरह सुरक्षित महसूस करते हैं। वह कैसा दिखता है? वहाँ कौन या क्या है?',
      zh: '画一个让你感到完全安全的地方（真实或想象）。它是什么样子？那里有什么或是谁？',
      ja: '完全に安心できる場所（現実または空想）を描いてください。どんな景色？誰や何がありますか？',
      ko: '완전히 안전하다고 느끼는 장소(현실 또는 상상)을 그려 보세요. 어떻게 생겼나요? 누가 또는 무엇이 있나요?',
      uk: 'Намалюйте місце (реальне чи уявне), де ви відчуваєте себе повністю в безпеці. Як воно виглядає? Хто чи що там?',
      pl: 'Narysuj miejsce (realne lub wyobrażone), w którym czujesz się całkowicie bezpiecznie. Jak wygląda? Kto lub co tam jest?'
    },
    icon: '🏡',
    color: '#10B981',
    estimatedDuration: 35,
    focusAreas: ['safety', 'grounding', 'resource-building']
  },
  {
    id: 3,
    title: {
      en: 'Emotions as Weather',
      ka: 'ემოციები როგორც ამინდი',
      ru: 'Эмоции как погода',
      hy: 'Զգացմունքներ որպես եղանակ',
      tr: 'Duygular Hava Durumu Gibi',
      az: 'Hisslər Hava Kimi',
      es: 'Emociones como el Clima',
      de: 'Emotionen wie Wetter',
      fr: 'Les émotions comme la météo',
      pt: 'Emoções como o Clima',
      id: 'Emosi sebagai Cuaca',
      it: 'Emozioni come Meteo',
      ar: 'المشاعر مثل الطقس',
      hi: 'मौसम की तरह भावनाएँ',
      zh: '情绪如天气',
      ja: '天気のような感情',
      ko: '날씨 같은 감정',
      uk: 'Емоції як погода',
      pl: 'Emocje jak pogoda'
    },
    theme: {
      en: 'Emotional Awareness',
      ka: 'ემოციური ცნობიერება',
      ru: 'Эмоциональное осознание',
      hy: 'Հուզական իրազեկվածություն',
      tr: 'Duygusal Farkındalık',
      az: 'Emosional Fərqindəlik',
      es: 'Conciencia Emocional',
      de: 'Emotionale Wahrnehmung',
      fr: 'Conscience émotionnelle',
      pt: 'Consciência Emocional',
      id: 'Kesadaran Emosional',
      it: 'Consapevolezza Emotiva',
      ar: 'الوعي العاطفي',
      hi: 'भावनात्मक जागरूकता',
      zh: '情绪觉察',
      ja: '感情の気づき',
      ko: '감정 인식',
      uk: 'Емоційна усвідомленість',
      pl: 'Świadomość emocjonalna'
    },
    description: {
      en: 'Explore the changing landscape of your emotions by representing them as weather patterns.',
      ka: 'შეისწავლე შენი ემოციების ცვალებადი ლანდშაფტი მათი ამინდის შაბლონებად წარმოდგენით.',
      ru: 'Исследуйте меняющийся ландшафт ваших эмоций, представив их в виде погодных паттернов.',
      hy: 'Ուսումնասիրեք ձեր զգացմունքների փոփոխվող լանդշафտը՝ ներկայացնելով դրանք եղանակային օրինաչափությունների տեսքով:',
      tr: 'Duygularının değişen manzarasını hava durumu metaforlarıyla keşfet.',
      az: 'Hisslərinin dəyişən mənzərəsini hava nümunələri kimi təsvir edərək araşdır.',
      es: 'Explora el paisaje cambiante de tus emociones representándolas como patrones climáticos.',
      de: 'Erforsche die wechselnde Landschaft deiner Gefühle, indem du sie als Wetter darstellst.',
      fr: 'Explore le paysage changeant de tes émotions en les représentant comme des phénomènes météo.',
      pt: 'Explore a paisagem mutável das suas emoções representando-as como padrões de clima.',
      id: 'Jelajahi lanskap berubah dari emosimu dengan menggambarkannya sebagai pola cuaca.',
      it: 'Esplora il paesaggio mutevole delle tue emozioni rappresentandole come condizioni meteo.',
      ar: 'استكشف المشهد المتغير لمشاعرك عبر تصويرها كأنماط طقس.',
      hi: 'अपनी भावनाओं के बदलते परिदृश्य को मौसम के पैटर्न के रूप में दर्शाकर खोजें।',
      zh: '将你的情绪比作天气模式，探索其不断变化的景观。',
      ja: '感情の変化する景色を天気になぞらえて探求しましょう。',
      ko: '감정을 날씨 패턴으로 표현하며 그 변화하는 풍경을 탐색하세요.',
      uk: 'Досліджуйте мінливий ландшафт своїх емоцій, представляючи їх як погодні явища.',
      pl: 'Poznaj zmienny krajobraz swoich emocji, przedstawiając je jako wzorce pogodowe.'
    },
    drawingPrompt: {
      en: 'If your current emotions were weather, what would they be? Rain, sunshine, storm, fog? Draw your emotional weather.',
      ka: 'თუ შენი ამჟამინდელი ემოციები ამინდი იქნებოდა, რა იქნებოდა? წვიმა, მზე, ქარიშხალი, ნისლი? დახატე შენი ემოციური ამინდი.',
      ru: 'Если бы ваши текущие эмоции были погодой, какими бы они были? Дождь, солнце, буря, туман? Нарисуйте вашу эмоциональную погоду.',
      hy: 'Եթե ձեր ներկա զգացմունքները եղանակ լինեին, ինչպիսի՞ն կլինեին: Անձրև, արևոտ, փոթորիկ, մառախուղ: Նկարեք ձեր հուզական եղանակը:',
      tr: 'Şu anki duyguların hava olsaydı ne olurdu? Yağmur, güneş, fırtına, sis? Duygusal havanı çiz.',
      az: 'Hazırkı hisslərin hava olsa nə olardı? Yağış, günəş, fırtına, duman? Emosional havanı çək.',
      es: 'Si tus emociones fueran clima, ¿qué serían? ¿Lluvia, sol, tormenta, niebla? Dibuja tu clima emocional.',
      de: 'Wenn deine Emotionen Wetter wären – was wären sie? Regen, Sonne, Sturm, Nebel? Zeichne dein emotionales Wetter.',
      fr: 'Si tes émotions étaient une météo, que seraient-elles ? Pluie, soleil, tempête, brouillard ? Dessine ta météo émotionnelle.',
      pt: 'Se suas emoções fossem clima, o que seriam? Chuva, sol, tempestade, neblina? Desenhe seu clima emocional.',
      id: 'Jika emosimu adalah cuaca, apakah itu? Hujan, cerah, badai, kabut? Gambar cuaca emosimu.',
      it: 'Se le tue emozioni fossero meteo, cosa sarebbero? Pioggia, sole, tempesta, nebbia? Disegna il tuo meteo emotivo.',
      ar: 'لو كانت مشاعرك الحالية طقسًا، ماذا ستكون؟ مطر، شمس، عاصفة، ضباب؟ ارسم طقس مشاعرك.',
      hi: 'यदि आपकी वर्तमान भावनाएँ मौसम होतीं तो वे क्या होतीं? बारिश, धूप, तूफ़ान, धुंध? अपना भावनात्मक मौसम बनाएं.',
      zh: '如果你当前的情绪是天气，它会是什么？雨、晴、风暴、雾？画出你的情绪天气。',
      ja: '今の感情が天気だったら何ですか？雨、晴れ、嵐、霧？あなたの感情の天気を描いて。',
      ko: '현재 감정을 날씨로 표현하면 무엇일까요? 비, 햇빛, 폭풍, 안개? 당신의 감정 날씨를 그려보세요.',
      uk: 'Якби ваші емоції були погодою, якою б вона була? Дощ, сонце, буря, туман? Намалюйте свою емоційну погоду.',
      pl: 'Gdyby twoje emocje były pogodą, czym by były? Deszcz, słońce, burza, mgła? Narysuj swoją emocjonalną pogodę.'
    },
    icon: '🌦️',
    color: '#3B82F6',
    estimatedDuration: 30,
    focusAreas: ['emotion-regulation', 'metaphor', 'acceptance']
  },
  {
    id: 4,
    title: {
      en: 'The Mask I Wear',
      ka: 'ნიღაბი, რომელსაც ვატარებ',
      ru: 'Маска, которую я ношу',
      hy: 'Դիմակը, որը կրում եմ',
      tr: 'Taktığım Maske',
      az: 'Taxdığım Maska',
      es: 'La Máscara que Llevo',
      de: 'Die Maske, die ich trage',
      fr: 'Le masque que je porte',
      pt: 'A Máscara que Eu Uso',
      id: 'Topeng yang Kupakai',
      it: 'La Maschera che Indosso',
      ar: 'القناع الذي أرتديه',
      hi: 'वह मुखौटा जो मैं पहनता हूँ',
      zh: '我戴的面具',
      ja: '私がかぶる仮面',
      ko: '내가 쓰는 가면',
      uk: 'Маска, яку я ношу',
      pl: 'Maska, którą noszę'
    },
    theme: {
      en: 'Authenticity vs. Social Facade',
      ka: 'ავთენტურობა vs სოციალური ფასადი',
      ru: 'Аутентичность vs. социальный фасад',
      hy: 'Իսկություն ընդդեմ սոցիալական ցուցադրության',
      tr: 'Özgünlük vs. Sosyal Maske',
      az: 'Həqiqilik vs. Sosial Maskalar',
      es: 'Autenticidad vs. Fachada Social',
      de: 'Authentizität vs. soziale Fassade',
      fr: 'Authenticité vs. façade sociale',
      pt: 'Autenticidade vs. Fachada Social',
      id: 'Keaslian vs. Topeng Sosial',
      it: 'Autenticità vs. Facciata Sociale',
      ar: 'الأصالة مقابل الواجهة الاجتماعية',
      hi: 'प्रामाणिकता बनाम सामाजिक मुखौटा',
      zh: '真实 vs. 社交伪装',
      ja: '本物の自分 vs. 社会的仮面',
      ko: '진정성 vs. 사회적 가면',
      uk: 'Автентичність vs. соціальна маска',
      pl: 'Autentyczność vs. Społeczna Fasada'
    },
    description: {
      en: 'Explore the difference between your public self and private self through the metaphor of masks.',
      ka: 'შეისწავლე განსხვავება შენს საჯარო და პირად თავს შორის ნიღბების მეტაფორის საშუალებით.',
      ru: 'Исследуйте разницу между вашим публичным и частным я через метафору масок.',
      hy: 'Ուսումնասիրեք ձեր հրապարակային և անձնական ես-ի միջև տարբերությունը դիմակների փոխաբերության միջոցով:',
      tr: 'Kamusal benliğin ile özel benliğin arasındaki farkı maske metaforuyla keşfet.',
      az: 'İctimai və şəxsi "mən" arasındakı fərqi maska metaforu ilə araşdır.',
      es: 'Explora la diferencia entre tu yo público y tu yo privado mediante la metáfora de las máscaras.',
      de: 'Erkunde den Unterschied zwischen deinem öffentlichen und privaten Selbst anhand der Metapher der Masken.',
      fr: 'Explore la différence entre ton moi public et ton moi privé via la métaphore des masques.',
      pt: 'Explore a diferença entre seu eu público e privado usando a metáfora das máscaras.',
      id: 'Jelajahi perbedaan antara diri publik dan diri pribadimu lewat metafora topeng.',
      it: 'Esplora la differenza tra il tuo sé pubblico e quello privato attraverso la metafora delle maschere.',
      ar: 'استكشف الفرق بين ذاتك العلنية وذاتك الخاصة عبر استعارة الأقنعة.',
      hi: 'अपनी सार्वजनिक और निजी पहचान के अंतर को मुखौटे की रूपक से खोजें।',
      zh: '通过面具的隐喻探索你的公共自我与私人自我之间的差异。',
      ja: '公の自分と内なる自分の違いを仮面のメタファーで探求しましょう。',
      ko: '공적 자아와 사적 자아의 차이를 가면의 은유로 탐색하세요.',
      uk: 'Дослідіть різницю між вашим публічним і приватним я через метафору масок.',
      pl: 'Zbadaj różnicę między publicznym a prywatnym „ja” poprzez metaforę masek.'
    },
    drawingPrompt: {
      en: 'Draw the mask you show to the world. What does it hide? What does it protect?',
      ka: 'დახატე ნიღაბი, რომელსაც სამყაროს უჩვენებ. რას მალავს? რას იცავს?',
      ru: 'Нарисуйте маску, которую показываете миру. Что она скрывает? Что защищает?',
      hy: 'Նկարեք դիմակը, որը ցույց եք տալիս աշխարհին: Ի՞նչ է այն թաքցնում: Ի՞նչ է պաշտպանում:',
      tr: 'Dünyaya gösterdiğin maskeyi çiz. Ne saklıyor? Neyi koruyor?',
      az: 'Dünyaya göstərdiyin maskanı çək. Nəyi gizlədir? Nədən qoruyur?',
      es: 'Dibuja la máscara que muestras al mundo. ¿Qué oculta? ¿Qué protege?',
      de: 'Zeichne die Maske, die du der Welt zeigst. Was verbirgt sie? Was schützt sie?',
      fr: 'Dessine le masque que tu montres au monde. Que cache-t-il ? Que protège-t-il ?',
      pt: 'Desenhe a máscara que você mostra ao mundo. O que ela esconde? O que protege?',
      id: 'Gambar topeng yang kamu tunjukkan ke dunia. Apa yang disembunyikannya? Apa yang dilindunginya?',
      it: 'Disegna la maschera che mostri al mondo. Cosa nasconde? Cosa protegge?',
      ar: 'ارسم القناع الذي تظهره للعالم. ماذا يخفي؟ ماذا يحمي؟',
      hi: 'दुनिया को दिखाया जाने वाला मुखौटा बनाएं। यह क्या छुपाता है? क्या बचाता है?',
      zh: '画出你展示给世界的面具。它隐藏了什么？它保护什么？',
      ja: '世界に見せている仮面を描いてください。何を隠し、何を守っていますか？',
      ko: '세상에 보여주는 가면을 그려보세요. 무엇을 숨기고 보호하나요?',
      uk: 'Намалюйте маску, яку показуєте світу. Що вона приховує? Що захищає?',
      pl: 'Narysuj maskę, którą pokazujesz światu. Co ukrywa? Co chroni?'
    },
    icon: '🎭',
    color: '#8B5CF6',
    estimatedDuration: 35,
    focusAreas: ['authenticity', 'social-anxiety', 'self-expression']
  },
  {
    id: 5,
    title: {
      en: 'Family Tree of Emotions',
      ka: 'ემოციების გენეალოგიური ხე',
      ru: 'Семейное древо эмоций',
      hy: 'Զգացմունքների ընտանեկան ծառ',
      tr: 'Duyguların Aile Ağacı',
      az: 'Emosiyaların Ailə Ağacı',
      es: 'Árbol Familiar de Emociones',
      de: 'Stammbaum der Emotionen',
      fr: 'Arbre familial des émotions',
      pt: 'Árvore Familiar das Emoções',
      id: 'Pohon Keluarga Emosi',
      it: 'Albero Familiare delle Emozioni',
      ar: 'شجرة العائلة للمشاعر',
      hi: 'भावनाओं का पारिवारिक वृक्ष',
      zh: '情绪家族树',
      ja: '感情の家系図',
      ko: '감정의 가계도',
      uk: 'Сімейне дерево емоцій',
      pl: 'Rodzinne drzewo emocji'
    },
    theme: {
      en: 'Intergenerational Patterns',
      ka: 'თაობათაშორისი შაბლონები',
      ru: 'Межпоколенческие паттерны',
      hy: 'Միջսերնդային օրինաչափություններ',
      tr: 'Nesiller Arası Kalıplar',
      az: 'Nəsillərarası Nümunələr',
      es: 'Patrones Intergeneracionales',
      de: 'Generationsübergreifende Muster',
      fr: 'Schémas intergénérationnels',
      pt: 'Padrões Intergeracionais',
      id: 'Pola Antargenerasi',
      it: 'Schemi Intergenerazionali',
      ar: 'أنماط بين الأجيال',
      hi: 'अंतर-पीढ़ी संबंधी पैटर्न',
      zh: '代际模式',
      ja: '世代間のパターン',
      ko: '세대 간 패턴',
      uk: 'Міжпоколінські шаблони',
      pl: 'Międzypokoleniowe wzorce'
    },
    description: {
      en: 'Explore how emotions and patterns flow through your family lineage.',
      ka: 'შეისწავლე როგორ გადის ემოციები და შაბლონები შენი ოჯახის თაობებში.',
      ru: 'Исследуйте, как эмоции и паттерны передаются через вашу семейную линию.',
      hy: 'Ուսումնասիրեք, թե ինչպես են զգացմունքներն ու օրինաչափությունները հոսում ձեր ընտանիքի տոհմի միջոցով:',
      tr: 'Duyguların ve kalıpların aile soyunda nasıl aktığını keşfet.',
      az: 'Hisslərin və nümunələrin ailə nəslinizdə necə axdığını araşdır.',
      es: 'Explora cómo fluyen las emociones y patrones en tu linaje familiar.',
      de: 'Erforsche, wie Emotionen und Muster durch deine Familienlinie fließen.',
      fr: 'Explore comment émotions et schémas traversent ta lignée familiale.',
      pt: 'Explore como emoções e padrões fluem pela sua linhagem familiar.',
      id: 'Jelajahi bagaimana emosi dan pola mengalir melalui garis keluarga.',
      it: 'Esplora come emozioni e schemi scorrono nella tua linea familiare.',
      ar: 'استكشف كيف تنتقل المشاعر والأنماط عبر سلالة عائلتك.',
      hi: 'जांचें कि भावनाएँ और पैटर्न आपके पारिवारिक वंश में कैसे प्रवाहित होते हैं।',
      zh: '探索情绪和模式如何在你的家族中传递。',
      ja: '感情やパターンが家系を通じてどう流れているか探りましょう。',
      ko: '감정과 패턴이 가족 계보를 통해 어떻게 흐르는지 탐색하세요.',
      uk: 'Дослідіть, як емоції та патерни проходять через ваш рід.',
      pl: 'Zbadaj, jak emocje i wzorce przepływają przez twoją rodzinę.'
    },
    drawingPrompt: {
      en: 'Draw a tree representing your family. Use colors and symbols to show emotional patterns passed down.',
      ka: 'დახატე ხე, რომელიც წარმოადგენს შენს ოჯახს. გამოიყენე ფერები და სიმბოლოები ემოციური შაბლონების საჩვენებლად.',
      ru: 'Нарисуйте дерево, представляющее вашу семью. Используйте цвета и символы для отображения эмоциональных паттернов.',
      hy: 'Նկարեք ծառ, որը ներկայացնում է ձեր ընտանիքը: Օգտագործեք գույներ և խորհրդանիշներ՝ ցույց տալու հուզական օրինաչափությունները:',
      tr: 'Aileni temsil eden bir ağaç çiz. Aktarılan duygusal kalıpları göstermek için renkler ve semboller kullan.',
      az: 'Ailəni təmsil edən bir ağac çək. Nəsildən-nəsilə keçən emosional nümunələri göstərmək üçün rənglər və simvollar istifadə et.',
      es: 'Dibuja un árbol que represente a tu familia. Usa colores y símbolos para mostrar patrones emocionales heredados.',
      de: 'Zeichne einen Baum, der deine Familie darstellt. Nutze Farben und Symbole für überlieferte emotionale Muster.',
      fr: 'Dessine un arbre représentant ta famille. Utilise couleurs et symboles pour montrer les schémas émotionnels transmis.',
      pt: 'Desenhe uma árvore que represente sua família. Use cores e símbolos para mostrar padrões emocionais transmitidos.',
      id: 'Gambar pohon yang mewakili keluargamu. Gunakan warna & simbol untuk menunjukkan pola emosional yang diwariskan.',
      it: 'Disegna un albero che rappresenti la tua famiglia. Usa colori e simboli per mostrare schemi emotivi tramandati.',
      ar: 'ارسم شجرة تمثل عائلتك. استخدم ألوانًا ورموزًا لإظهار الأنماط العاطفية المتوارثة.',
      hi: 'अपनी परिवार का प्रतिनिधित्व करता हुआ एक पेड़ बनाएं। रंग और प्रतीकों से भावनात्मक पैटर्न दिखाएँ।',
      zh: '画一棵代表你家庭的树。用颜色和符号展示代际情绪模式。',
      ja: '家族を表す木を描いてください。受け継がれた感情パターンを色や記号で示しましょう。',
      ko: '가족을 나타내는 나무를 그려보세요. 전해지는 감정 패턴을 색과 기호로 표현하세요.',
      uk: 'Намалюйте дерево, що представляє вашу сім’ю. Використовуйте кольори й символи для емоційних патернів.',
      pl: 'Narysuj drzewo reprezentujące twoją rodzinę. Użyj kolorów i symboli, by pokazać emocjonalne wzorce.'
    },
    icon: '🌳',
    color: '#059669',
    estimatedDuration: 40,
    focusAreas: ['family-dynamics', 'intergenerational-trauma', 'heritage']
  },
  {
    id: 6,
    title: {
      en: 'The Shadow Self',
      ka: 'ჩრდილოვანი თავი',
      ru: 'Теневое Я',
      hy: 'Ստվերային ես'
    },
    theme: {
      en: 'Shadow Work (Jungian)',
      ka: 'ჩრდილის მუშაობა (იუნგიანური)',
      ru: 'Работа с тенью (Юнгианская)',
      hy: 'Ստվերի աշխատանք (Յունգյան)'
    },
    description: {
      en: 'Face the parts of yourself you usually hide or deny. This is deep psychological work.',
      ka: 'შეეჯიბრე შენი იმ ნაწილებს, რომლებსაც ჩვეულებრივ მალავ ან უარყოფ. ეს არის ღრმა ფსიქოლოგიური მუშაობა.',
      ru: 'Встретьтесь с частями себя, которые обычно скрываете или отрицаете. Это глубокая психологическая работа.',
      hy: 'Դիմակայեք ձեր այն մասերին, որոնք սովորաբար թաքցնում կամ ժխտում եք: Սա խորը հոգեբանական աշխատանք է:'
    },
    drawingPrompt: {
      en: 'Draw the part of yourself you try to hide from others. What does your shadow look like?',
      ka: 'დახატე შენი ის ნაწილი, რომელსაც სხვებისგან ცდილობ დამალო. როგორ გამოიყურება შენი ჩრდილი?',
      ru: 'Нарисуйте ту часть себя, которую пытаетесь скрыть от других. Как выглядит ваша тень?',
      hy: 'Նկարեք ձեր այն մասը, որը փորձում եք թաքցնել ուրիշներից: Ինչպիսի՞ն է ձեր ստվերը:'
    },
    icon: '🌑',
    color: '#1F2937',
    estimatedDuration: 45,
    focusAreas: ['shadow-work', 'integration', 'self-acceptance']
  },
  {
    id: 7,
    title: {
      en: 'Body Map of Feelings',
      ka: 'გრძნობების სხეულის რუკა',
      ru: 'Карта чувств тела',
      hy: 'Զգացումների մարմնի քարտեզ'
    },
    theme: {
      en: 'Somatic Awareness',
      ka: 'სომატური ცნობიერება',
      ru: 'Соматическое осознание',
      hy: 'Մարմնական իրազեկություն'
    },
    description: {
      en: 'Connect with your body and discover where emotions physically live within you.',
      ka: 'დაუკავშირდი შენს სხეულს და აღმოაჩინე სად ცხოვრობენ ემოციები ფიზიკურად შენში.',
      ru: 'Соединитесь со своим телом и откройте, где физически живут эмоции внутри вас.',
      hy: 'Կապվեք ձեր մարմնի հետ և բացահայտեք, թե որտեղ են զգացմունքները ֆիզիկապես ապրում ձեր մեջ:'
    },
    drawingPrompt: {
      en: 'Draw an outline of your body and color where you feel different emotions. Where does anxiety live? Where is joy?',
      ka: 'დახატე შენი სხეულის კონტური და შეღებე სადაც სხვადასხვა ემოციებს გრძნობ. სად ცხოვრობს შფოთვა? სად არის სიხარული?',
      ru: 'Нарисуйте контур своего тела и раскрасьте, где чувствуете разные эмоции. Где живет тревога? Где радость?',
      hy: 'Նկարեք ձեր մարմնի ուրվագիծը և գունավորեք, որտեղ զգում եք տարբեր զգացմունքներ: Որտե՞ղ է ապրում անհանգստությունը: Որտե՞ղ է ուրախությունը:'
    },
    icon: '🧘',
    color: '#EC4899',
    estimatedDuration: 35,
    focusAreas: ['somatic-awareness', 'embodiment', 'mind-body-connection']
  },
  {
    id: 8,
    title: {
      en: 'The Inner Child',
      ka: 'შინაგანი ბავშვი',
      ru: 'Внутренний ребенок',
      hy: 'Ներքին երեխա'
    },
    theme: {
      en: 'Inner Child Healing',
      ka: 'შინაგანი ბავშვის განკურნება',
      ru: 'Исцеление внутреннего ребенка',
      hy: 'Ներքին երեխայի բուժում'
    },
    description: {
      en: 'Connect with your younger self and offer the compassion they may not have received.',
      ka: 'დაუკავშირდი შენს უმცროს თავს და შესთავაზე თანაგრძნობა, რომელიც შეიძლება არ მიუღია.',
      ru: 'Соединитесь со своим младшим я и предложите сострадание, которого он мог не получить.',
      hy: 'Կապվեք ձեր երիտասարդ ես-ի հետ և առաջարկեք գթություն, որը նրանք չէին ստացել:'
    },
    drawingPrompt: {
      en: 'Draw yourself as a child. What does this child need? What would you say to them now?',
      ka: 'დახატე საკუთარი თავი ბავშვობაში. რა სჭირდება ამ ბავშვს? რას ეტყოდი მას ახლა?',
      ru: 'Нарисуйте себя ребенком. Что нужно этому ребенку? Что бы вы сказали ему сейчас?',
      hy: 'Նկարեք ինքներդ ձեզ որպես երեխա: Ի՞նչ է պետք այս երեխային: Ի՞նչ կասեիք նրան հիմա:'
    },
    icon: '👶',
    color: '#F59E0B',
    estimatedDuration: 40,
    focusAreas: ['inner-child', 'self-compassion', 'reparenting']
  },
  {
    id: 9,
    title: {
      en: 'The Journey So Far',
      ka: 'მოგზაურობა დღემდე',
      ru: 'Путь до сих пор',
      hy: 'Ճանապարհը մինչ այժմ'
    },
    theme: {
      en: 'Life Review',
      ka: 'ცხოვრების მიმოხილვა',
      ru: 'Обзор жизни',
      hy: 'Կյանքի վերանայում'
    },
    description: {
      en: 'Create a visual timeline of your life journey, honoring both struggles and triumphs.',
      ka: 'შექმენი შენი ცხოვრების მოგზაურობის ვიზუალური ქრონოლოგია, პატივით სცემდი როგორც ბრძოლებს, ისე გამარჯვებებს.',
      ru: 'Создайте визуальную хронологию вашего жизненного пути, почитая и борьбу, и триумфы.',
      hy: 'Ստեղծեք ձեր կյանքի ճանապարհի տեսողական ժամանակացույց՝ պատվելով և պայքարները, և հաղթանակները:'
    },
    drawingPrompt: {
      en: 'Draw a path, road, or river representing your life journey. Mark significant moments with symbols.',
      ka: 'დახატე ბილიკი, გზა ან მდინარე, რომელიც წარმოადგენს შენი ცხოვრების მოგზაურობას. აღნიშნე მნიშვნელოვანი მომენტები სიმბოლოებით.',
      ru: 'Нарисуйте тропу, дорогу или реку, представляющую ваш жизненный путь. Отметьте значимые моменты символами.',
      hy: 'Նկարեք արահետ, ճանապարհ կամ գետ, որը ներկայացնում է ձեր կյանքի ճանապարհը: Նշեք կարևոր պահերը խորհրդանիշներով:'
    },
    icon: '🛤️',
    color: '#14B8A6',
    estimatedDuration: 45,
    focusAreas: ['life-review', 'meaning-making', 'resilience']
  },
  {
    id: 10,
    title: {
      en: 'Dialogues with Parts',
      ka: 'დიალოგები ნაწილებთან',
      ru: 'Диалоги с частями',
      hy: 'Երկխոսություններ մասերի հետ'
    },
    theme: {
      en: 'Internal Family Systems',
      ka: 'შინაგანი ოჯახური სისტემები',
      ru: 'Внутренние семейные системы',
      hy: 'Ներքին ընտանեկան համակարգեր'
    },
    description: {
      en: 'Visualize the different parts of yourself in conversation—the critic, the protector, the wounded one.',
      ka: 'ვიზუალიზაცია გაუკეთე შენი სხვადასხვა ნაწილების საუბარს—კრიტიკოსს, დამცველს, დაჭრილს.',
      ru: 'Визуализируйте разные части себя в разговоре—критик, защитник, раненый.',
      hy: 'Տեսողականացրեք ձեր տարբեր մասերը զրույցում՝ քննադատը, պաշտպանը, վիրավորվածը:'
    },
    drawingPrompt: {
      en: 'Draw 2-3 different parts of yourself as separate characters. What are they saying to each other?',
      ka: 'დახატე შენი 2-3 სხვადასხვა ნაწილი როგორც ცალკეული პერსონაჟები. რას ეუბნებიან ერთმანეთს?',
      ru: 'Нарисуйте 2-3 разные части себя как отдельных персонажей. Что они говорят друг другу?',
      hy: 'Նկարեք ձեր 2-3 տարբեր մասերը որպես առանձին կերպարներ: Ի՞նչ են նրանք ասում միմյանց:'
    },
    icon: '🗣️',
    color: '#A855F7',
    estimatedDuration: 40,
    focusAreas: ['parts-work', 'internal-dialogue', 'self-understanding']
  },
  {
    id: 11,
    title: {
      en: 'Cultural Roots',
      ka: 'კულტურული ფესვები',
      ru: 'Культурные корни',
      hy: 'Մշակութային արմատներ'
    },
    theme: {
      en: 'Cultural Identity',
      ka: 'კულტურული იდენტობა',
      ru: 'Культурная идентичность',
      hy: 'Մշակութային ինքնություն'
    },
    description: {
      en: 'Honor your cultural heritage and explore how it shapes who you are today.',
      ka: 'პატივი სცე შენს კულტურულ მემკვიდრეობას და შეისწავლე როგორ აყალიბებს ის შენ დღეს.',
      ru: 'Почтите свое культурное наследие и исследуйте, как оно формирует вас сегодня.',
      hy: 'Պատվեք ձեր մշակութային ժառանգությանը և ուսումնասիրեք, թե ինչպես է այն ձևավորում ձեզ այսօր:'
    },
    drawingPrompt: {
      en: 'Draw symbols, colors, or images from your cultural background. What traditions do you carry?',
      ka: 'დახატე სიმბოლოები, ფერები ან გამოსახულებები შენი კულტურული წარმოშობიდან. რა ტრადიციებს ატარებ?',
      ru: 'Нарисуйте символы, цвета или образы из вашего культурного происхождения. Какие традиции вы несете?',
      hy: 'Նկարեք խորհրդանիշներ, գույներ կամ պատկերներ ձեր մշակութային ծագումից: Ի՞նչ ավանդույթներ եք կրում:'
    },
    icon: '🏛️',
    color: '#DC2626',
    estimatedDuration: 35,
    focusAreas: ['cultural-identity', 'heritage', 'belonging']
  },
  {
    id: 12,
    title: {
      en: 'Grief & Loss',
      ka: 'გლოვა და დანაკარგი',
      ru: 'Горе и потеря',
      hy: 'Սուգ և կորուստ'
    },
    theme: {
      en: 'Processing Loss',
      ka: 'დანაკარგის დამუშავება',
      ru: 'Обработка потери',
      hy: 'Կորստի մշակում'
    },
    description: {
      en: 'Honor what has been lost and give visual form to your grief.',
      ka: 'პატივი სცე დაკარგულს და მიეცი ვიზუალური ფორმა შენს გლოვას.',
      ru: 'Почтите то, что было потеряно, и придайте визуальную форму вашему горю.',
      hy: 'Պատվեք կորցրածին և տվեք տեսողական ձև ձեր սգին:'
    },
    drawingPrompt: {
      en: 'Draw something or someone you have lost. Use colors and shapes to express your grief.',
      ka: 'დახატე რაიმე ან ვინმე, ვინც დაკარგე. გამოიყენე ფერები და ფორმები შენი გლოვის გამოსახატად.',
      ru: 'Нарисуйте что-то или кого-то, кого вы потеряли. Используйте цвета и формы для выражения горя.',
      hy: 'Նկարեք ինչ-որ բան կամ ինչ-որ մեկին, որին կորցրել եք: Օգտագործեք գույներ և ձևեր՝ արտահայտելու ձեր սուգը:'
    },
    icon: '🕊️',
    color: '#6B7280',
    estimatedDuration: 45,
    focusAreas: ['grief', 'loss', 'mourning']
  },
  {
    id: 13,
    title: {
      en: 'Transformation',
      ka: 'ტრანსფორმაცია',
      ru: 'Трансформация',
      hy: 'Փոխակերպում'
    },
    theme: {
      en: 'Growth & Change',
      ka: 'ზრდა და ცვლილება',
      ru: 'Рост и изменение',
      hy: 'Աճ և փոփոխություն'
    },
    description: {
      en: 'Visualize the transformation you are undergoing or wish to undergo.',
      ka: 'ვიზუალიზაცია გაუკეთე ტრანსფორმაციას, რომელსაც გადიხდი ან გსურს გადახდე.',
      ru: 'Визуализируйте трансформацию, которую вы претерпеваете или хотите претерпеть.',
      hy: 'Տեսողականացրեք փոխակերպումը, որը դուք ենթարկվում եք կամ ցանկանում եք ենթարկվել:'
    },
    drawingPrompt: {
      en: 'Draw a symbol of transformation (butterfly, phoenix, snake shedding skin). What are you becoming?',
      ka: 'დახატე ტრანსფორმაციის სიმბოლო (პეპელა, ფენიქსი, გველი რომელიც ტყავს იცვლის). რად ხდები?',
      ru: 'Нарисуйте символ трансформации (бабочка, феникс, змея, сбрасывающая кожу). Кем вы становитесь?',
      hy: 'Նկարեք փոխակերպման խորհրդանիշ (թիթեռնիկ, փյունիկ, օձ, որը թափում է մաշկը): Ի՞նչ եք դառնում:'
    },
    icon: '🦋',
    color: '#7C3AED',
    estimatedDuration: 40,
    focusAreas: ['transformation', 'growth', 'new-identity']
  },
  {
    id: 14,
    title: {
      en: 'Boundaries & Protection',
      ka: 'საზღვრები და დაცვა',
      ru: 'Границы и защита',
      hy: 'Սահմաններ և պաշտպանություն'
    },
    theme: {
      en: 'Setting Healthy Boundaries',
      ka: 'ჯანსაღი საზღვრების დადგენა',
      ru: 'Установление здоровых границ',
      hy: 'Առողջ սահմանների սահմանում'
    },
    description: {
      en: 'Explore what boundaries you need and how to protect your energy and well-being.',
      ka: 'შეისწავლე რა საზღვრები გჭირდება და როგორ დაიცვა შენი ენერგია და კეთილდღეობა.',
      ru: 'Исследуйте, какие границы вам нужны и как защитить свою энергию и благополучие.',
      hy: 'Ուսումնասիրեք, թե ինչ սահմաններ եք կարիք ունենում և ինչպես պաշտպանել ձեր էներգիան և բարեկեցությունը:'
    },
    drawingPrompt: {
      en: 'Draw a boundary around yourself. What stays in? What stays out? How strong is your boundary?',
      ka: 'დახატე საზღვარი შენს გარშემო. რა რჩება შიგნით? რა რჩება გარეთ? რამდენად ძლიერია შენი საზღვარი?',
      ru: 'Нарисуйте границу вокруг себя. Что остается внутри? Что остается снаружи? Насколько крепка ваша граница?',
      hy: 'Նկարեք սահման ձեր շուրջը: Ի՞նչ է մնում ներսում: Ի՞նչ է մնում դրսում: Որքա՞ն ամուր է ձեր սահմանը:'
    },
    icon: '🛡️',
    color: '#0891B2',
    estimatedDuration: 35,
    focusAreas: ['boundaries', 'self-protection', 'assertiveness']
  },
  {
    id: 15,
    title: {
      en: 'The Future Self',
      ka: 'მომავალი თავი',
      ru: 'Будущее Я',
      hy: 'Ապագա ես'
    },
    theme: {
      en: 'Vision & Hope',
      ka: 'ხედვა და იმედი',
      ru: 'Видение и надежда',
      hy: 'Տեսլական և հույս'
    },
    description: {
      en: 'Complete your journey by imagining and drawing the person you are becoming.',
      ka: 'დაასრულე შენი მოგზაურობა იმის წარმოდგენით და დახატვით, თუ რა ადამიანი ხდები.',
      ru: 'Завершите свой путь, представив и нарисовав человека, которым вы становитесь.',
      hy: 'Ավարտեք ձեր ճանապարհը՝ պատկերացնելով և նկարելով այն մարդուն, ում դառնում եք:'
    },
    drawingPrompt: {
      en: 'Draw your future self—who you want to become. What qualities do they have? How do they feel?',
      ka: 'დახატე შენი მომავალი თავი—ვინ გინდა გახდე. რა თვისებები აქვს? როგორ გრძნობს თავს?',
      ru: 'Нарисуйте ваше будущее я—кем вы хотите стать. Какие качества у них? Как они себя чувствуют?',
      hy: 'Նկարեք ձեր ապագա ես-ը՝ ով ցանկանում եք դառնալ: Ի՞նչ հատկություններ ունեն նրանք: Ինչպե՞ս են զգում իրենց:'
    },
    icon: '✨',
    color: '#F59E0B',
    estimatedDuration: 40,
    focusAreas: ['future-self', 'hope', 'vision', 'integration']
  }
];

class ArtTherapyProgramManager {
  private storageKey = '@behappy_art_therapy_progress';

  /**
   * Get user's progress across all sessions
   */
  async getProgress(): Promise<Map<number, SessionProgress>> {
    try {
      const json = await AsyncStorage.getItem(this.storageKey);
      if (!json) {
        return new Map();
      }

      const data = JSON.parse(json);
      const progressMap = new Map<number, SessionProgress>();

      for (const [key, value] of Object.entries(data)) {
        progressMap.set(Number(key), value as SessionProgress);
      }

      return progressMap;
    } catch (error) {
      console.error('Failed to load art therapy progress:', error);
      // Return empty map instead of throwing
      return new Map();
    }
  }

  /**
   * Save session progress
   */
  async saveProgress(sessionId: number, progress: SessionProgress): Promise<void> {
    try {
      const currentProgress = await this.getProgress();
      currentProgress.set(sessionId, progress);

      const obj: Record<number, SessionProgress> = {};
      currentProgress.forEach((value, key) => {
        obj[key] = value;
      });

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save art therapy progress:', error);
      throw error;
    }
  }

  /**
   * Check if a session is unlocked (Duolingo-style)
   */
  async isSessionUnlocked(sessionId: number): Promise<boolean> {
    try {
      // First session is always unlocked
      if (sessionId === 1) {
        return true;
      }

      const progress = await this.getProgress();
      const previousSession = progress.get(sessionId - 1);

      // Unlock if previous session is completed
      return previousSession?.completed === true;
    } catch (error) {
      console.error('Failed to check session unlock status:', error);
      // Return true for first session, false for others in case of error
      return sessionId === 1;
    }
  }

  /**
   * Get completion percentage
   */
  async getCompletionPercentage(): Promise<number> {
    try {
      const progress = await this.getProgress();
      const completedCount = Array.from(progress.values()).filter(p => p.completed).length;
      return Math.round((completedCount / ART_THERAPY_SESSIONS.length) * 100);
    } catch (error) {
      console.error('Failed to get completion percentage:', error);
      return 0;
    }
  }

  /**
   * Start a new session
   */
  async startSession(sessionId: number): Promise<SessionProgress> {
    const progress: SessionProgress = {
      sessionId,
      completed: false,
      phase: 0,
      startedAt: new Date(),
      chatHistory: []
    };

    await this.saveProgress(sessionId, progress);
    return progress;
  }

  /**
   * Complete a session
   */
  async completeSession(
    sessionId: number,
    clinicalSummary: ArtTherapyResponse,
    chatHistory: any[]
  ): Promise<void> {
    const progress = await this.getProgress();
    const sessionProgress = progress.get(sessionId);

    if (!sessionProgress) {
      throw new Error('Session not found');
    }

    sessionProgress.completed = true;
    sessionProgress.completedAt = new Date();
    sessionProgress.clinicalSummary = clinicalSummary;
    sessionProgress.chatHistory = chatHistory;

    await this.saveProgress(sessionId, sessionProgress);
  }

  /**
   * Reset all progress (for testing or restart)
   */
  async resetProgress(): Promise<void> {
    await AsyncStorage.removeItem(this.storageKey);
  }
}

export default new ArtTherapyProgramManager();
