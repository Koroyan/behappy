import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtTherapyResponse } from './artTherapyService';

export interface ArtTherapySession {
  id: number;
  title: Record<string, string>;
  theme: Record<string, string>;
  description: Record<string, string>;
  drawingPrompt: Record<string, string>;
  icon: string;
  color: string;
  estimatedDuration: number;
  focusAreas: string[];
  module: number; // Module number (1-8)
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

// 43-Session Comprehensive Art Therapy Program
export const ART_THERAPY_SESSIONS: ArtTherapySession[] = [
  // ============================================
  // MODULE 1: INTRODUCTION & GETTING STARTED (5 sessions)
  // ============================================
  {
    id: 1,
    module: 1,
    title: {
      en: 'Hello, This Is Me',
      ka: 'გამარჯობა, ეს მე ვარ',
      ru: 'Здравствуйте, это я',
      hy: 'Բարև, սա ես եմ',
      tr: 'Merhaba, Bu Benim',
      az: 'Salam, Bu Mənəm',
      es: 'Hola, Este Soy Yo',
      de: 'Hallo, das bin ich',
      fr: 'Bonjour, c\'est moi',
      pt: 'Olá, Este Sou Eu',
      id: 'Halo, Ini Aku',
      it: 'Ciao, Questo Sono Io',
      ar: 'مرحباً، هذا أنا',
      hi: 'नमस्ते, यह मैं हूँ',
      zh: '你好，这就是我',
      ja: 'こんにちは、これが私です',
      ko: '안녕하세요, 이것이 저입니다',
      uk: 'Привіт, це я',
      pl: 'Cześć, to ja'
    },
    theme: {
      en: 'First Meeting',
      ka: 'პირველი შეხვედრა',
      ru: 'Первая встреча',
      hy: 'Առաջին հանդիպում',
      tr: 'İlk Buluşma',
      az: 'İlk Görüş',
      es: 'Primer Encuentro',
      de: 'Erstes Treffen',
      fr: 'Première rencontre',
      pt: 'Primeiro Encontro',
      id: 'Pertemuan Pertama',
      it: 'Primo Incontro',
      ar: 'اللقاء الأول',
      hi: 'पहली मुलाकात',
      zh: '初次见面',
      ja: '初対面',
      ko: '첫 만남',
      uk: 'Перша зустріч',
      pl: 'Pierwsze spotkanie'
    },
    description: {
      en: 'Draw your emotions right now in this moment. Use colors and shapes freely.',
      ka: 'დახატე შენი ემოციები ახლა ამ წუთში. გამოიყენე ფერები და ფორმები თავისუფლად.',
      ru: 'Нарисуйте свои эмоции прямо сейчас. Используйте цвета и формы свободно.',
      hy: 'Նկարեք ձեր զգացմունքները հենց հիմա: Օգտագործեք գույներն ու ձևերը ազատորեն:',
      tr: 'Şu an duygularını çiz. Renkleri ve şekilleri özgürce kullan.',
      az: 'İndi hisslərinizi çəkin. Rəngləri və formaları azad istifadə edin.',
      es: 'Dibuja tus emociones ahora mismo. Usa colores y formas libremente.',
      de: 'Zeichne deine Emotionen jetzt. Nutze Farben und Formen frei.',
      fr: 'Dessine tes émotions maintenant. Utilise librement les couleurs et les formes.',
      pt: 'Desenhe suas emoções agora. Use cores e formas livremente.',
      id: 'Gambar emosimu sekarang. Gunakan warna dan bentuk dengan bebas.',
      it: 'Disegna le tue emozioni adesso. Usa liberamente colori e forme.',
      ar: 'ارسم مشاعرك الآن. استخدم الألوان والأشكال بحرية.',
      hi: 'अभी अपनी भावनाओं को बनाएं। स्वतंत्र रूप से रंग और आकृतियों का उपयोग करें।',
      zh: '画出你现在的情绪。自由使用颜色和形状。',
      ja: '今の感情を描いてください。色と形を自由に使ってください。',
      ko: '지금 당신의 감정을 그려보세요. 색상과 모양을 자유롭게 사용하세요.',
      uk: 'Намалюйте свої емоції зараз. Використовуйте кольори та форми вільно.',
      pl: 'Narysuj swoje emocje teraz. Używaj kolorów i kształtów swobodnie.'
    },
    drawingPrompt: {
      en: 'Draw your emotions right now in this moment. Use any colors and shapes that feel right.',
      ka: 'დახატე შენი ემოციები ახლა ამ წუთში. გამოიყენე ნებისმიერი ფერი და ფორმა რაც სწორად გეჩვენება.',
      ru: 'Нарисуйте свои эмоции прямо сейчас. Используйте любые цвета и формы, которые кажутся правильными.',
      hy: 'Նկարեք ձեր զգացմունքները հենց հիմա: Օգտագործեք ցանկացած գույն և ձև, որը ճիշտ է թվում:',
      tr: 'Şu an duygularını çiz. Doğru hissettiren herhangi bir renk ve şekil kullan.',
      az: 'İndi hisslərinizi çəkin. Düzgün görünən istənilən rəng və forma istifadə edin.',
      es: 'Dibuja tus emociones en este momento. Usa cualquier color y forma que te parezca correcta.',
      de: 'Zeichne jetzt deine Gefühle. Benutze beliebige Farben und Formen, die sich richtig anfühlen.',
      fr: 'Dessine tes émotions maintenant. Utilise n\'importe quelle couleur et forme qui te semble juste.',
      pt: 'Desenhe suas emoções agora. Use quaisquer cores e formas que pareçam certas.',
      id: 'Gambar emosimu sekarang. Gunakan warna dan bentuk apa pun yang terasa tepat.',
      it: 'Disegna le tue emozioni adesso. Usa qualsiasi colore e forma che ti sembri giusto.',
      ar: 'ارسم مشاعرك الآن. استخدم أي ألوان وأشكال تبدو صحيحة.',
      hi: 'अभी अपनी भावनाओं को बनाएं। कोई भी रंग और आकृति उपयोग करें जो सही लगे।',
      zh: '画出你此刻的情绪。使用任何感觉合适的颜色和形状。',
      ja: '今の感情を描いてください。正しいと感じる色と形を使ってください。',
      ko: '지금 감정을 그려보세요. 올바르다고 느껴지는 색과 모양을 사용하세요.',
      uk: 'Намалюйте свої емоції зараз. Використовуйте будь-які кольори та форми, які здаються правильними.',
      pl: 'Narysuj swoje emocje teraz. Użyj dowolnych kolorów i kształtów, które wydają się właściwe.'
    },
    icon: '👋',
    color: '#6366F1',
    estimatedDuration: 30,
    focusAreas: ['introduction', 'trust-building', 'first-contact']
  },
  {
    id: 2,
    module: 1,
    title: {
      en: 'What I Expect From This Journey',
      ka: 'რას ველი ამ მოგზაურობისგან',
      ru: 'Чего я жду от этого путешествия',
      hy: 'Ինչ եմ ակնկալում այս ճանապարհից',
      tr: 'Bu Yolculuktan Ne Bekliyorum',
      az: 'Bu Səyahətdən Nə Gözləyirəm',
      es: 'Lo Que Espero De Este Viaje',
      de: 'Was ich von dieser Reise erwarte',
      fr: 'Ce que j\'attends de ce voyage',
      pt: 'O Que Espero Desta Jornada',
      id: 'Apa Yang Kuharapkan Dari Perjalanan Ini',
      it: 'Cosa Mi Aspetto Da Questo Viaggio',
      ar: 'ما أتوقعه من هذه الرحلة',
      hi: 'मैं इस यात्रा से क्या उम्मीद करता हूँ',
      zh: '我对这次旅程的期待',
      ja: 'この旅に期待すること',
      ko: '이 여정에서 기대하는 것',
      uk: 'Чого я очікую від цієї подорожі',
      pl: 'Czego oczekuję od tej podróży'
    },
    theme: {
      en: 'Expectations & Goals',
      ka: 'მოლოდინები და მიზნები',
      ru: 'Ожидания и цели',
      hy: 'Ակնկալություններ և նպատակներ',
      tr: 'Beklentiler ve Hedefler',
      az: 'Gözləntilər və Məqsədlər',
      es: 'Expectativas y Objetivos',
      de: 'Erwartungen und Ziele',
      fr: 'Attentes et objectifs',
      pt: 'Expectativas e Objetivos',
      id: 'Harapan & Tujuan',
      it: 'Aspettative e Obiettivi',
      ar: 'التوقعات والأهداف',
      hi: 'अपेक्षाएँ और लक्ष्य',
      zh: '期待与目标',
      ja: '期待と目標',
      ko: '기대와 목표',
      uk: 'Очікування та цілі',
      pl: 'Oczekiwania i cele'
    },
    description: {
      en: 'Draw a map or path showing where you are now and where you want to go by the end of therapy.',
      ka: 'დახატე რუკა ან გზა რომელიც გიჩვენებს სად ხარ ახლა და სად გინდა მიხვიდე თერაპიის ბოლოს.',
      ru: 'Нарисуйте карту или путь, показывающий, где вы сейчас и куда хотите прийти к концу терапии.',
      hy: 'Նկարեք քարտեզ կամ ուղի՝ ցույց տալով որտեղ եք հիմա և որտեղ ցանկանում եք հասնել թերապիայի վերջում:',
      tr: 'Şu an nerede olduğunu ve terapinin sonunda nereye varmak istediğini gösteren bir harita veya yol çiz.',
      az: 'İndi harada olduğunuzu və terapiyanın sonunda hara çatmaq istədiyinizi göstərən xəritə və ya yol çəkin.',
      es: 'Dibuja un mapa o camino que muestre dónde estás ahora y dónde quieres llegar al final de la terapia.',
      de: 'Zeichne eine Karte oder einen Weg, der zeigt, wo du jetzt bist und wo du am Ende der Therapie sein möchtest.',
      fr: 'Dessine une carte ou un chemin montrant où tu es maintenant et où tu veux aller à la fin de la thérapie.',
      pt: 'Desenhe um mapa ou caminho mostrando onde você está agora e onde quer chegar ao final da terapia.',
      id: 'Gambar peta atau jalan yang menunjukkan di mana kamu sekarang dan ke mana kamu ingin pergi di akhir terapi.',
      it: 'Disegna una mappa o un percorso che mostri dove sei ora e dove vuoi arrivare alla fine della terapia.',
      ar: 'ارسم خريطة أو طريقاً يوضح أين أنت الآن وأين تريد أن تصل في نهاية العلاج.',
      hi: 'एक नक्शा या रास्ता बनाएं जो दिखाए कि आप अभी कहाँ हैं और थेरेपी के अंत में कहाँ पहुंचना चाहते हैं।',
      zh: '画一张地图或路径，显示你现在在哪里以及治疗结束时你想去哪里。',
      ja: '今どこにいるか、そしてセラピーの終わりにどこに行きたいかを示す地図や道を描いてください。',
      ko: '지금 어디에 있고 치료가 끝날 때 어디에 가고 싶은지 보여주는 지도나 경로를 그려보세요.',
      uk: 'Намалюйте карту або шлях, що показує, де ви зараз і куди хочете прийти наприкінці терапії.',
      pl: 'Narysuj mapę lub ścieżkę pokazującą, gdzie jesteś teraz i gdzie chcesz być na końcu terapii.'
    },
    drawingPrompt: {
      en: 'Create a visual map or path. Mark where you are now with one symbol, and where you want to be with another.',
      ka: 'შექმენი ვიზუალური რუკა ან გზა. აღნიშნე სად ხარ ახლა ერთი სიმბოლოთი, და სად გინდა იყო მეორეთი.',
      ru: 'Создайте визуальную карту или путь. Отметьте, где вы сейчас, одним символом, а где хотите быть — другим.',
      hy: 'Ստեղծեք տեսողական քարտեզ կամ ուղի: Նշեք որտեղ եք հիմա մեկ խորհրդանիշով, իսկ որտեղ ցանկանում եք լինել՝ մեկ այլով:',
      tr: 'Görsel bir harita veya yol oluştur. Şu an nerede olduğunu bir sembolle, olmak istediğin yeri başka bir sembolle işaretle.',
      az: 'Vizual xəritə və ya yol yaradın. İndi harada olduğunuzu bir simvolla, olmaq istədiyiniz yeri başqa simvolla qeyd edin.',
      es: 'Crea un mapa visual o camino. Marca dónde estás ahora con un símbolo y dónde quieres estar con otro.',
      de: 'Erstelle eine visuelle Karte oder einen Weg. Markiere, wo du jetzt bist, mit einem Symbol und wo du sein möchtest mit einem anderen.',
      fr: 'Crée une carte visuelle ou un chemin. Marque où tu es maintenant avec un symbole et où tu veux être avec un autre.',
      pt: 'Crie um mapa visual ou caminho. Marque onde você está agora com um símbolo e onde quer estar com outro.',
      id: 'Buat peta visual atau jalan. Tandai di mana kamu sekarang dengan satu simbol, dan di mana kamu ingin berada dengan simbol lain.',
      it: 'Crea una mappa visiva o un percorso. Segna dove sei ora con un simbolo e dove vuoi essere con un altro.',
      ar: 'أنشئ خريطة بصرية أو طريقاً. ضع علامة على مكانك الحالي برمز واحد ومكانك المرغوب برمز آخر.',
      hi: 'एक दृश्य मानचित्र या रास्ता बनाएं। एक प्रतीक से चिह्नित करें कि आप अभी कहाँ हैं, और दूसरे प्रतीक से जहाँ होना चाहते हैं।',
      zh: '创建一个视觉地图或路径。用一个符号标记你现在的位置，用另一个符号标记你想去的地方。',
      ja: '視覚的な地図や道を作成します。今どこにいるかを1つのシンボルで、どこにいたいかを別のシンボルでマークしてください。',
      ko: '시각적 지도나 경로를 만드세요. 지금 어디에 있는지 한 기호로, 어디에 있고 싶은지 다른 기호로 표시하세요.',
      uk: 'Створіть візуальну карту або шлях. Позначте, де ви зараз, одним символом, а де хочете бути — іншим.',
      pl: 'Stwórz wizualną mapę lub ścieżkę. Zaznacz, gdzie jesteś teraz jednym symbolem, a gdzie chcesz być innym.'
    },
    icon: '🗺️',
    color: '#10B981',
    estimatedDuration: 30,
    focusAreas: ['goal-setting', 'motivation', 'direction']
  },
  {
    id: 3,
    module: 1,
    title: {
      en: 'Three Colors That Are Me',
      ka: 'სამი ფერი რომელიც მე ვარ',
      ru: 'Три цвета, которые я',
      hy: 'Երեք գույն որոնք ես եմ',
      tr: 'Beni Temsil Eden Üç Renk',
      az: 'Məni Təmsil Edən Üç Rəng',
      es: 'Tres Colores Que Soy Yo',
      de: 'Drei Farben, die ich bin',
      fr: 'Trois couleurs qui sont moi',
      pt: 'Três Cores Que Sou Eu',
      id: 'Tiga Warna Yang Mewakili Aku',
      it: 'Tre Colori Che Sono Io',
      ar: 'ثلاثة ألوان تمثلني',
      hi: 'तीन रंग जो मैं हूँ',
      zh: '代表我的三种颜色',
      ja: '私を表す3つの色',
      ko: '나를 나타내는 세 가지 색',
      uk: 'Три кольори, якими я є',
      pl: 'Trzy kolory, którymi jestem'
    },
    theme: {
      en: 'Color Identity',
      ka: 'ფერადი იდენტობა',
      ru: 'Цветовая идентичность',
      hy: 'Գույնային ինքնություն',
      tr: 'Renk Kimliği',
      az: 'Rəng Kimliyim',
      es: 'Identidad de Color',
      de: 'Farb-Identität',
      fr: 'Identité de couleur',
      pt: 'Identidade de Cor',
      id: 'Identitas Warna',
      it: 'Identità di Colore',
      ar: 'هوية اللون',
      hi: 'रंग पहचान',
      zh: '颜色身份',
      ja: '色のアイデンティティ',
      ko: '색상 정체성',
      uk: 'Колірна ідентичність',
      pl: 'Tożsamość kolorów'
    },
    description: {
      en: 'Choose 3 colors that represent you. Create an abstract drawing using only these colors.',
      ka: 'აირჩიე 3 ფერი რომელიც შენ გხასიათებს. შექმენი აბსტრაქტული ნახატი მხოლოდ ამ ფერებით.',
      ru: 'Выберите 3 цвета, которые вас представляют. Создайте абстрактный рисунок, используя только эти цвета.',
      hy: 'Ընտրեք 3 գույն որոնք ձեզ ներկայացնում են: Ստեղծեք վերացական նկար միայն այս գույներով:',
      tr: 'Seni temsil eden 3 renk seç. Sadece bu renkleri kullanarak soyut bir çizim yap.',
      az: 'Sizi təmsil edən 3 rəng seçin. Yalnız bu rənglərdən istifadə edərək abstrakt rəsm yaradın.',
      es: 'Elige 3 colores que te representen. Crea un dibujo abstracto usando solo estos colores.',
      de: 'Wähle 3 Farben, die dich repräsentieren. Erstelle eine abstrakte Zeichnung mit nur diesen Farben.',
      fr: 'Choisis 3 couleurs qui te représentent. Crée un dessin abstrait en utilisant seulement ces couleurs.',
      pt: 'Escolha 3 cores que representem você. Crie um desenho abstrato usando apenas essas cores.',
      id: 'Pilih 3 warna yang mewakilimu. Buat gambar abstrak hanya menggunakan warna-warna ini.',
      it: 'Scegli 3 colori che ti rappresentano. Crea un disegno astratto usando solo questi colori.',
      ar: 'اختر 3 ألوان تمثلك. أنشئ رسماً تجريدياً باستخدام هذه الألوان فقط.',
      hi: '3 रंग चुनें जो आपका प्रतिनिधित्व करते हैं। केवल इन रंगों का उपयोग करके एक अमूर्त चित्र बनाएं।',
      zh: '选择代表你的3种颜色。仅使用这些颜色创建抽象画。',
      ja: 'あなたを表す3つの色を選んでください。これらの色だけを使って抽象画を作成してください。',
      ko: '당신을 대표하는 3가지 색상을 선택하세요. 이 색상만 사용하여 추상화를 만드세요.',
      uk: 'Виберіть 3 кольори, які вас представляють. Створіть абстрактний малюнок, використовуючи лише ці кольори.',
      pl: 'Wybierz 3 kolory, które cię reprezentują. Stwórz abstrakcyjny rysunek używając tylko tych kolorów.'
    },
    drawingPrompt: {
      en: 'Pick 3 colors that feel like you. Use only these to create shapes, patterns, or abstract forms.',
      ka: 'აირჩიე 3 ფერი რომელიც შენზე მეტყველებს. გამოიყენე მხოლოდ ისინი ფორმების, ნიმუშების ან აბსტრაქტული ფიგურების შესაქმნელად.',
      ru: 'Выберите 3 цвета, которые ощущаются как вы. Используйте только их для создания форм, узоров или абстрактных фигур.',
      hy: 'Ընտրեք 3 գույն որոնք զգում եք որպես ինքներդ ձեզ: Օգտագործեք միայն դրանք՝ ձևեր, նախշեր կամ վերացական ձևեր ստեղծելու համար:',
      tr: 'Senin gibi hissettiren 3 renk seç. Sadece bunları şekiller, desenler veya soyut formlar oluşturmak için kullan.',
      az: 'Siz kimi hiss olunan 3 rəng seçin. Yalnız onlardan formalar, nümunələr və ya abstrakt fiqurlar yaratmaq üçün istifadə edin.',
      es: 'Elige 3 colores que se sientan como tú. Úsalos solo para crear formas, patrones o formas abstractas.',
      de: 'Wähle 3 Farben, die sich wie du anfühlen. Verwende nur diese, um Formen, Muster oder abstrakte Formen zu erstellen.',
      fr: 'Choisis 3 couleurs qui te ressemblent. Utilise-les uniquement pour créer des formes, des motifs ou des formes abstraites.',
      pt: 'Escolha 3 cores que pareçam com você. Use apenas elas para criar formas, padrões ou formas abstratas.',
      id: 'Pilih 3 warna yang terasa sepertimu. Gunakan hanya ini untuk membuat bentuk, pola, atau bentuk abstrak.',
      it: 'Scegli 3 colori che ti sembrano come te. Usali solo per creare forme, motivi o forme astratte.',
      ar: 'اختر 3 ألوان تشعر أنها مثلك. استخدمها فقط لإنشاء أشكال أو أنماط أو أشكال تجريدية.',
      hi: '3 रंग चुनें जो आप जैसा महसूस करते हैं। केवल इन्हें आकृतियाँ, पैटर्न, या अमूर्त रूप बनाने के लिए उपयोग करें।',
      zh: '选择3种感觉像你的颜色。仅使用这些颜色创建形状、图案或抽象形式。',
      ja: 'あなたのように感じる3つの色を選んでください。これらだけを使用して、形、パターン、または抽象的な形を作成してください。',
      ko: '당신처럼 느껴지는 3가지 색상을 선택하세요. 이것만 사용하여 모양, 패턴 또는 추상적 형태를 만드세요.',
      uk: 'Виберіть 3 кольори, які відчуваються як ви. Використовуйте лише їх для створення форм, візерунків або абстрактних форм.',
      pl: 'Wybierz 3 kolory, które czujesz jak ty. Użyj tylko ich do tworzenia kształtów, wzorów lub abstrakcyjnych form.'
    },
    icon: '🎨',
    color: '#F59E0B',
    estimatedDuration: 30,
    focusAreas: ['self-expression', 'color-psychology', 'simplicity']
  },
  {
    id: 4,
    module: 1,
    title: {
      en: 'Energy Of My Name',
      ka: 'ჩემი სახელის ენერგია',
      ru: 'Энергия моего имени',
      hy: 'Իմ անվան էներգիան',
      tr: 'Adımın Enerjisi',
      az: 'Adımın Enerjisi',
      es: 'Energía De Mi Nombre',
      de: 'Energie meines Namens',
      fr: 'L\'énergie de mon nom',
      pt: 'Energia Do Meu Nome',
      id: 'Energi Namaku',
      it: 'Energia Del Mio Nome',
      ar: 'طاقة اسمي',
      hi: 'मेरे नाम की ऊर्जा',
      zh: '我名字的能量',
      ja: '私の名前のエネルギー',
      ko: '내 이름의 에너지',
      uk: 'Енергія мого імені',
      pl: 'Energia mojego imienia'
    },
    theme: {
      en: 'Name & Identity',
      ka: 'სახელი და იდენტობა',
      ru: 'Имя и идентичность',
      hy: 'Անուն և ինքնություն',
      tr: 'İsim ve Kimlik',
      az: 'Ad və Kimlik',
      es: 'Nombre e Identidad',
      de: 'Name und Identität',
      fr: 'Nom et identité',
      pt: 'Nome e Identidade',
      id: 'Nama & Identitas',
      it: 'Nome e Identità',
      ar: 'الاسم والهوية',
      hi: 'नाम और पहचान',
      zh: '名字与身份',
      ja: '名前とアイデンティティ',
      ko: '이름과 정체성',
      uk: 'Ім\'я та ідентичність',
      pl: 'Imię i tożsamość'
    },
    description: {
      en: 'Write your name and draw around it what your name means to you.',
      ka: 'დაწერე შენი სახელი და გარშემო დახატე ის, რაც შენს სახელს ნიშნავს შენთვის.',
      ru: 'Напишите свое имя и нарисуйте вокруг него то, что оно для вас значит.',
      hy: 'Գրեք ձեր անունը և նկարեք շուրջը այն ինչ ձեր անունը նշանակում է ձեզ համար:',
      tr: 'Adını yaz ve etrafına senin için ne anlama geldiğini çiz.',
      az: 'Adınızı yazın və ətrafında sizin üçün nə demək olduğunu çəkin.',
      es: 'Escribe tu nombre y dibuja alrededor lo que significa para ti.',
      de: 'Schreibe deinen Namen und zeichne drum herum, was er für dich bedeutet.',
      fr: 'Écris ton nom et dessine autour ce qu\'il signifie pour toi.',
      pt: 'Escreva seu nome e desenhe em torno dele o que significa para você.',
      id: 'Tulis namamu dan gambar di sekelilingnya apa artinya bagimu.',
      it: 'Scrivi il tuo nome e disegna intorno cosa significa per te.',
      ar: 'اكتب اسمك وارسم حوله ما يعنيه لك.',
      hi: 'अपना नाम लिखें और उसके चारों ओर वह बनाएं जो आपके लिए इसका मतलब है।',
      zh: '写下你的名字，并在周围画出它对你的意义。',
      ja: 'あなたの名前を書き、その周りにあなたにとってそれが何を意味するかを描いてください。',
      ko: '이름을 쓰고 그 주위에 당신에게 그것이 무엇을 의미하는지 그려보세요.',
      uk: 'Напишіть своє ім\'я та намалюйте навколо нього те, що воно для вас означає.',
      pl: 'Napisz swoje imię i narysuj wokół niego to, co dla ciebie znaczy.'
    },
    drawingPrompt: {
      en: 'Write your name in the center. Around it, draw symbols, colors, or images that represent what your name means to you.',
      ka: 'დაწერე შენი სახელი ცენტრში. გარშემო დახატე სიმბოლოები, ფერები ან გამოსახულებები რომლებიც წარმოადგენენ რას ნიშნავს შენი სახელი შენთვის.',
      ru: 'Напишите свое имя в центре. Вокруг него нарисуйте символы, цвета или изображения, которые представляют, что ваше имя значит для вас.',
      hy: 'Գրեք ձեր անունը կենտրոնում: Շուրջը նկարեք խորհրդանիշներ, գույներ կամ պատկերներ որոնք ներկայացնում են թե ինչ է նշանակում ձեր անունը ձեզ համար:',
      tr: 'Adını merkeze yaz. Etrafına, adının senin için ne anlama geldiğini temsil eden semboller, renkler veya görseller çiz.',
      az: 'Adınızı mərkəzdə yazın. Ətrafında adınızın sizin üçün nə demək olduğunu təmsil edən simvollar, rənglər və ya təsvirlər çəkin.',
      es: 'Escribe tu nombre en el centro. Alrededor, dibuja símbolos, colores o imágenes que representen lo que tu nombre significa para ti.',
      de: 'Schreibe deinen Namen in die Mitte. Zeichne darum herum Symbole, Farben oder Bilder, die darstellen, was dein Name für dich bedeutet.',
      fr: 'Écris ton nom au centre. Autour, dessine des symboles, des couleurs ou des images qui représentent ce que ton nom signifie pour toi.',
      pt: 'Escreva seu nome no centro. Ao redor, desenhe símbolos, cores ou imagens que representem o que seu nome significa para você.',
      id: 'Tulis namamu di tengah. Di sekelilingnya, gambar simbol, warna, atau gambar yang mewakili apa arti namamu bagimu.',
      it: 'Scrivi il tuo nome al centro. Intorno, disegna simboli, colori o immagini che rappresentano cosa significa il tuo nome per te.',
      ar: 'اكتب اسمك في المركز. حوله، ارسم رموزاً أو ألواناً أو صوراً تمثل ما يعنيه اسمك لك.',
      hi: 'अपना नाम केंद्र में लिखें। इसके चारों ओर प्रतीक, रंग या चित्र बनाएं जो दर्शाते हैं कि आपका नाम आपके लिए क्या मायने रखता है।',
      zh: '在中心写下你的名字。在周围画出代表你名字对你意义的符号、颜色或图像。',
      ja: '中央にあなたの名前を書いてください。その周りに、あなたの名前があなたにとって何を意味するかを表すシンボル、色、または画像を描いてください。',
      ko: '중앙에 이름을 쓰세요. 주변에 당신의 이름이 당신에게 의미하는 것을 나타내는 기호, 색상 또는 이미지를 그리세요.',
      uk: 'Напишіть своє ім\'я в центрі. Навколо нього намалюйте символи, кольори або зображення, які представляють, що ваше ім\'я означає для вас.',
      pl: 'Napisz swoje imię w centrum. Wokół niego narysuj symbole, kolory lub obrazy, które reprezentują to, co twoje imię dla ciebie znaczy.'
    },
    icon: '✍️',
    color: '#8B5CF6',
    estimatedDuration: 30,
    focusAreas: ['identity', 'meaning', 'self-concept']
  },
  {
    id: 5,
    module: 1,
    title: {
      en: 'First Self-Portrait',
      ka: 'პირველი ავტოპორტრეტი',
      ru: 'Первый автопортрет',
      hy: 'Առաջին ինքնապատկեր',
      tr: 'İlk Otoportre',
      az: 'İlk Avtoportret',
      es: 'Primer Autorretrato',
      de: 'Erstes Selbstporträt',
      fr: 'Premier autoportrait',
      pt: 'Primeiro Autorretrato',
      id: 'Potret Diri Pertama',
      it: 'Primo Autoritratto',
      ar: 'أول صورة ذاتية',
      hi: 'पहला स्व-चित्र',
      zh: '第一幅自画像',
      ja: '最初の自画像',
      ko: '첫 번째 자화상',
      uk: 'Перший автопортрет',
      pl: 'Pierwszy autoportret'
    },
    theme: {
      en: 'Self-Image',
      ka: 'თვითგამოხატულება',
      ru: 'Самообраз',
      hy: 'Ինքնապատկեր',
      tr: 'Benlik İmgesi',
      az: 'Özünü Təsvir',
      es: 'Autoimagen',
      de: 'Selbstbild',
      fr: 'Image de soi',
      pt: 'Autoimagem',
      id: 'Citra Diri',
      it: 'Autoimmagine',
      ar: 'صورة الذات',
      hi: 'आत्म-छवि',
      zh: '自我形象',
      ja: '自己イメージ',
      ko: '자아상',
      uk: 'Самообраз',
      pl: 'Samoobraz'
    },
    description: {
      en: 'Draw yourself as you feel right now. It doesn\'t have to be realistic.',
      ka: 'დახატე საკუთარი თავი ისე, როგორც ახლა გრძნობ. არ უნდა იყოს რეალისტური.',
      ru: 'Нарисуйте себя таким, каким чувствуете себя сейчас. Не обязательно реалистично.',
      hy: 'Նկարեք ինքներդ ձեզ այնպես ինչպես զգում եք հիմա: Պարտադիր չէ իրատեսական լինել:',
      tr: 'Kendini şu an nasıl hissediyorsan öyle çiz. Gerçekçi olması gerekmiyor.',
      az: 'Özünüzü indi necə hiss edirsinizsə elə çəkin. Realistik olması lazım deyil.',
      es: 'Dibújate como te sientes ahora. No tiene que ser realista.',
      de: 'Zeichne dich so, wie du dich jetzt fühlst. Es muss nicht realistisch sein.',
      fr: 'Dessine-toi tel que tu te sens maintenant. Ça n\'a pas besoin d\'être réaliste.',
      pt: 'Desenhe-se como você se sente agora. Não precisa ser realista.',
      id: 'Gambar dirimu sebagaimana perasaanmu sekarang. Tidak harus realistis.',
      it: 'Disegnati così come ti senti ora. Non deve essere realistico.',
      ar: 'ارسم نفسك كما تشعر الآن. لا يجب أن يكون واقعياً.',
      hi: 'खुद को वैसा बनाएं जैसा आप अभी महसूस करते हैं। यह यथार्थवादी होना जरूरी नहीं है।',
      zh: '画出你现在的感觉。不必是写实的。',
      ja: '今感じているままの自分を描いてください。リアルである必要はありません。',
      ko: '지금 느끼는 그대로의 자신을 그려보세요. 사실적일 필요는 없습니다.',
      uk: 'Намалюйте себе так, як ви відчуваєте себе зараз. Це не обов\'язково має бути реалістичним.',
      pl: 'Narysuj siebie tak, jak się teraz czujesz. Nie musi być realistyczne.'
    },
    drawingPrompt: {
      en: 'Draw a portrait of yourself. Use any style - realistic, abstract, symbolic. Show how you feel today.',
      ka: 'დახატე საკუთარი თავის პორტრეტი. გამოიყენე ნებისმიერი სტილი - რეალისტური, აბსტრაქტული, სიმბოლური. გამოხატე როგორ გრძნობ თავს დღეს.',
      ru: 'Нарисуйте свой портрет. Используйте любой стиль - реалистичный, абстрактный, символический. Покажите, как вы себя чувствуете сегодня.',
      hy: 'Նկարեք ինքներդ ձեր դիմանկարը: Օգտագործեք ցանկացած ոճ՝ իրատեսական, վերացական, խորհրդանշական: Ցույց տվեք ինչպես եք զգում այսօր:',
      tr: 'Kendi portrenizi çizin. Herhangi bir stil kullanın - gerçekçi, soyut, sembolik. Bugün nasıl hissettiğinizi gösterin.',
      az: 'Öz portretinizi çəkin. İstənilən üslubdan istifadə edin - realistik, abstrakt, simvolik. Bu gün özünüzü necə hiss etdiyinizi göstərin.',
      es: 'Dibuja un retrato de ti mismo. Usa cualquier estilo: realista, abstracto, simbólico. Muestra cómo te sientes hoy.',
      de: 'Zeichne ein Porträt von dir selbst. Verwende einen beliebigen Stil - realistisch, abstrakt, symbolisch. Zeige, wie du dich heute fühlst.',
      fr: 'Dessine un portrait de toi-même. Utilise n\'importe quel style - réaliste, abstrait, symbolique. Montre comment tu te sens aujourd\'hui.',
      pt: 'Desenhe um retrato de si mesmo. Use qualquer estilo - realista, abstrato, simbólico. Mostre como você se sente hoje.',
      id: 'Gambar potret dirimu. Gunakan gaya apa pun - realistis, abstrak, simbolis. Tunjukkan bagaimana perasaanmu hari ini.',
      it: 'Disegna un ritratto di te stesso. Usa qualsiasi stile - realistico, astratto, simbolico. Mostra come ti senti oggi.',
      ar: 'ارسم صورة لنفسك. استخدم أي أسلوب - واقعي، تجريدي، رمزي. أظهر كيف تشعر اليوم.',
      hi: 'खुद का चित्र बनाएं। कोई भी शैली उपयोग करें - यथार्थवादी, अमूर्त, प्रतीकात्मक। दिखाएं कि आज आप कैसा महसूस करते हैं।',
      zh: '画一幅自己的肖像。使用任何风格 - 写实、抽象、象征性。展示你今天的感觉。',
      ja: '自分の肖像画を描いてください。どんなスタイルでも構いません - リアル、抽象、象徴的。今日の気分を表現してください。',
      ko: '자신의 초상화를 그려보세요. 어떤 스타일이든 사용하세요 - 사실적, 추상적, 상징적. 오늘 느끼는 기분을 보여주세요.',
      uk: 'Намалюйте свій портрет. Використовуйте будь-який стиль - реалістичний, абстрактний, символічний. Покажіть, як ви себе почуваєте сьогодні.',
      pl: 'Narysuj portret siebie. Użyj dowolnego stylu - realistycznego, abstrakcyjnego, symbolicznego. Pokaż, jak się dzisiaj czujesz.'
    },
    icon: '🪞',
    color: '#6366F1',
    estimatedDuration: 35,
    focusAreas: ['self-awareness', 'identity', 'baseline']
  },

  // ============================================
  // MODULE 2: INNER CHILD & CHILDHOOD TRAUMA (6 sessions)
  // ============================================
  {
    id: 6,
    module: 2,
    title: {
      en: 'Me At Age 5',
      ka: 'მე 5 წლის ასაკში',
      ru: 'Я в 5 лет',
      hy: 'Ես 5 տարեկան',
      tr: '5 Yaşındaki Ben',
      az: 'Mən 5 yaşında',
      es: 'Yo A Los 5 Años',
      de: 'Ich mit 5 Jahren',
      fr: 'Moi à 5 ans',
      pt: 'Eu Aos 5 Anos',
      id: 'Aku Saat Usia 5 Tahun',
      it: 'Io A 5 Anni',
      ar: 'أنا في سن الخامسة',
      hi: '5 साल की उम्र में मैं',
      zh: '5岁的我',
      ja: '5歳の私',
      ko: '5살의 나',
      uk: 'Я у 5 років',
      pl: 'Ja w wieku 5 lat'
    },
    theme: {
      en: 'Inner Child',
      ka: 'შინაგანი ბავშვი',
      ru: 'Внутренний ребенок',
      hy: 'Ներքին երեխա',
      tr: 'İçimdeki Çocuk',
      az: 'Daxili Uşaq',
      es: 'Niño Interior',
      de: 'Inneres Kind',
      fr: 'Enfant intérieur',
      pt: 'Criança Interior',
      id: 'Anak Batin',
      it: 'Bambino Interiore',
      ar: 'الطفل الداخلي',
      hi: 'आंतरिक बच्चा',
      zh: '内在小孩',
      ja: 'インナーチャイルド',
      ko: '내면의 아이',
      uk: 'Внутрішня дитина',
      pl: 'Wewnętrzne dziecko'
    },
    description: {
      en: 'Draw yourself at age 5-6. How did you look? What were you doing?',
      ka: 'დახატე შენი თავი 5-6 წლის ასაკში. როგორ გამოიყურებოდი? რას აკეთებდი?',
      ru: 'Нарисуйте себя в возрасте 5-6 лет. Как вы выглядели? Что делали?',
      hy: 'Նկարեք ինքներդ ձեզ 5-6 տարեկան: Ինչպե՞ս էիր երևում: Ի՞նչ էիր անում:',
      tr: '5-6 yaşındaki kendini çiz. Nasıl görünüyordun? Ne yapıyordun?',
      az: 'Özünüzü 5-6 yaşında çəkin. Necə görünürdünüz? Nə edirdiniz?',
      es: 'Dibújate a los 5-6 años. ¿Cómo te veías? ¿Qué hacías?',
      de: 'Zeichne dich mit 5-6 Jahren. Wie sahst du aus? Was hast du gemacht?',
      fr: 'Dessine-toi à l\'âge de 5-6 ans. À quoi ressemblais-tu ? Que faisais-tu ?',
      pt: 'Desenhe-se aos 5-6 anos. Como você era? O que estava fazendo?',
      id: 'Gambar dirimu saat usia 5-6 tahun. Seperti apa penampilanmu? Apa yang kamu lakukan?',
      it: 'Disegnati all\'età di 5-6 anni. Come apparivi? Cosa facevi?',
      ar: 'ارسم نفسك في سن 5-6 سنوات. كيف كنت تبدو؟ ماذا كنت تفعل؟',
      hi: 'खुद को 5-6 साल की उम्र में बनाएं। आप कैसे दिखते थे? आप क्या कर रहे थे?',
      zh: '画出5-6岁的自己。你看起来怎么样？你在做什么？',
      ja: '5-6歳の自分を描いてください。どのように見えましたか？何をしていましたか？',
      ko: '5-6세 때의 자신을 그려보세요. 어떻게 보였나요? 무엇을 하고 있었나요?',
      uk: 'Намалюйте себе у віці 5-6 років. Як ви виглядали? Що робили?',
      pl: 'Narysuj siebie w wieku 5-6 lat. Jak wyglądałeś? Co robiłeś?'
    },
    drawingPrompt: {
      en: 'Draw yourself as a 5-6 year old child. Show what you looked like, what you were wearing, what you were doing.',
      ka: 'დახატე შენი თავი 5-6 წლის ბავშვად. აჩვენე როგორ გამოიყურებოდი, რას ატარებდი, რას აკეთებდი.',
      ru: 'Нарисуйте себя 5-6-летним ребенком. Покажите, как вы выглядели, что носили, что делали.',
      hy: 'Նկարեք ինքներդ ձեզ 5-6 տարեկան երեխա: Ցույց տվեք ինչպես էիք երևում, ինչ էիք կրում, ինչ էիք անում:',
      tr: 'Kendini 5-6 yaşında bir çocuk olarak çiz. Nasıl göründüğünü, ne giydiğini, ne yaptığını göster.',
      az: 'Özünüzü 5-6 yaşlı uşaq kimi çəkin. Necə göründüyünüzü, nə geydiyinizi, nə etdiyinizi göstərin.',
      es: 'Dibújate como un niño de 5-6 años. Muestra cómo te veías, qué llevabas puesto, qué hacías.',
      de: 'Zeichne dich als 5-6-jähriges Kind. Zeige, wie du ausgesehen hast, was du getragen hast, was du getan hast.',
      fr: 'Dessine-toi en tant qu\'enfant de 5-6 ans. Montre à quoi tu ressemblais, ce que tu portais, ce que tu faisais.',
      pt: 'Desenhe-se como uma criança de 5-6 anos. Mostre como você era, o que vestia, o que fazia.',
      id: 'Gambar dirimu sebagai anak berusia 5-6 tahun. Tunjukkan seperti apa penampilanmu, apa yang kamu kenakan, apa yang kamu lakukan.',
      it: 'Disegnati come un bambino di 5-6 anni. Mostra come apparivi, cosa indossavi, cosa facevi.',
      ar: 'ارسم نفسك كطفل في سن 5-6 سنوات. أظهر كيف كنت تبدو، ماذا كنت ترتدي، ماذا كنت تفعل.',
      hi: 'खुद को 5-6 साल के बच्चे के रूप में बनाएं। दिखाएं कि आप कैसे दिखते थे, क्या पहनते थे, क्या करते थे।',
      zh: '画出5-6岁时的自己。展示你的样子、穿着以及在做什么。',
      ja: '5-6歳の子供として自分を描いてください。どのように見えたか、何を着ていたか、何をしていたかを示してください。',
      ko: '5-6세 어린이로서의 자신을 그려보세요. 어떻게 보였는지, 무엇을 입었는지, 무엇을 하고 있었는지 보여주세요.',
      uk: 'Намалюйте себе як 5-6-річну дитину. Покажіть, як ви виглядали, що носили, що робили.',
      pl: 'Narysuj siebie jako 5-6-letnie dziecko. Pokaż, jak wyglądałeś, co nosiłeś, co robiłeś.'
    },
    icon: '👶',
    color: '#F59E0B',
    estimatedDuration: 35,
    focusAreas: ['inner-child', 'childhood-memories', 'reconnection']
  },
  
  {
    id: 7,
    module: 2,
    title: {
      en: 'What That Child Needed',
      ka: 'რა სჭირდებოდა მაშინ ამ ბავშვს',
      ru: 'Что нужно было тому ребенку',
      hy: 'Ինչ էր պետք այդ երեխային',
      tr: 'O Çocuğun Neye İhtiyacı Vardı',
      az: 'O Uşağa Nə Lazım İdi',
      es: 'Lo Que Ese Niño Necesitaba',
      de: 'Was dieses Kind brauchte',
      fr: 'Ce dont cet enfant avait besoin',
      pt: 'O Que Aquela Criança Precisava',
      id: 'Apa Yang Dibutuhkan Anak Itu',
      it: 'Ciò Di Cui Quel Bambino Aveva Bisogno',
      ar: 'ما كان يحتاجه ذلك الطفل',
      hi: 'उस बच्चे को क्या चाहिए था',
      zh: '那个孩子需要什么',
      ja: 'その子供に必要だったもの',
      ko: '그 아이에게 필요했던 것',
      uk: 'Що потрібно було тій дитині',
      pl: 'Czego potrzebowało to dziecko'
    },
    theme: {
      en: 'Unmet Needs',
      ka: 'დაუკმაყოფილებელი საჭიროებები',
      ru: 'Неудовлетворенные потребности',
      hy: 'Չբավարարված կարիքներ',
      tr: 'Karşılanmamış İhtiyaçlar',
      az: 'Qarşılanmamış Ehtiyaclar',
      es: 'Necesidades No Satisfechas',
      de: 'Unerfüllte Bedürfnisse',
      fr: 'Besoins non satisfaits',
      pt: 'Necessidades Não Atendidas',
      id: 'Kebutuhan Yang Tidak Terpenuhi',
      it: 'Bisogni Insoddisfatti',
      ar: 'الاحتياجات غير الملباة',
      hi: 'अपूर्ण आवश्यकताएं',
      zh: '未满足的需求',
      ja: '満たされなかったニーズ',
      ko: '충족되지 않은 욕구',
      uk: 'Незадоволені потреби',
      pl: 'Niespełnione potrzeby'
    },
    description: {
      en: 'Draw what your inner child needed - love, safety, play, protection?',
      ka: 'დახატე რაც სჭირდებოდა შენს შინაგან ბავშვს - სიყვარული, უსაფრთხოება, თამაში, დაცვა?',
      ru: 'Нарисуйте, что нужно было вашему внутреннему ребенку - любовь, безопасность, игра, защита?',
      hy: 'Նկարեք ինչ էր պետք ձեր ներքին երեխային - սեր, անվտանգություն, խաղ, պաշտպանություն:',
      tr: 'İç çocuğunun neye ihtiyacı olduğunu çiz - sevgi, güvenlik, oyun, koruma?',
      az: 'Daxili uşağınıza nə lazım olduğunu çəkin - sevgi, təhlükəsizlik, oyun, qoruma?',
      es: 'Dibuja lo que tu niño interior necesitaba: ¿amor, seguridad, juego, protección?',
      de: 'Zeichne, was dein inneres Kind brauchte - Liebe, Sicherheit, Spiel, Schutz?',
      fr: 'Dessine ce dont ton enfant intérieur avait besoin - amour, sécurité, jeu, protection ?',
      pt: 'Desenhe o que sua criança interior precisava - amor, segurança, brincadeira, proteção?',
      id: 'Gambar apa yang dibutuhkan anak batinmu - cinta, keamanan, permainan, perlindungan?',
      it: 'Disegna ciò di cui il tuo bambino interiore aveva bisogno - amore, sicurezza, gioco, protezione?',
      ar: 'ارسم ما كان يحتاجه طفلك الداخلي - الحب، الأمان، اللعب، الحماية؟',
      hi: 'अपने आंतरिक बच्चे को क्या चाहिए था उसे बनाएं - प्यार, सुरक्षा, खेल, सुरक्षा?',
      zh: '画出你内在小孩需要的东西 - 爱、安全、玩耍、保护？',
      ja: 'あなたのインナーチャイルドが必要としていたものを描いてください - 愛、安全、遊び、保護？',
      ko: '내면의 아이가 필요했던 것을 그려보세요 - 사랑, 안전, 놀이, 보호?',
      uk: 'Намалюйте, що потрібно було вашій внутрішній дитині - любов, безпека, гра, захист?',
      pl: 'Narysuj to, czego potrzebowało twoje wewnętrzne dziecko - miłość, bezpieczeństwo, zabawa, ochrona?'
    },
    drawingPrompt: {
      en: 'Draw what you needed as a child but didn\'t receive. Love? Safety? Play? Protection? Express it visually.',
      ka: 'დახატე რაც გჭირდებოდა ბავშვობაში მაგრამ ვერ მიიღე. სიყვარული? უსაფრთხოება? თამაში? დაცვა? გამოხატე ვიზუალურად.',
      ru: 'Нарисуйте, что вам было нужно в детстве, но вы не получили. Любовь? Безопасность? Игра? Защита? Выразите это визуально.',
      hy: 'Նկարեք ինչ ձեզ պետք էր մանկության մեջ բայց չստացաք: Սեր: Անվտանգություն: Խաղ: Պաշտպանություն: Արտահայտեք այն տեսողականորեն:',
      tr: 'Çocukken ihtiyacın olan ama alamadığın şeyi çiz. Sevgi? Güvenlik? Oyun? Koruma? Görsel olarak ifade et.',
      az: 'Uşaq ikən lazım olan lakin almadığınız şeyi çəkin. Sevgi? Təhlükəsizlik? Oyun? Qoruma? Vizual olaraq ifadə edin.',
      es: 'Dibuja lo que necesitabas de niño pero no recibiste. ¿Amor? ¿Seguridad? ¿Juego? ¿Protección? Exprésalo visualmente.',
      de: 'Zeichne, was du als Kind brauchtest, aber nicht bekommen hast. Liebe? Sicherheit? Spiel? Schutz? Drücke es visuell aus.',
      fr: 'Dessine ce dont tu avais besoin enfant mais que tu n\'as pas reçu. Amour ? Sécurité ? Jeu ? Protection ? Exprime-le visuellement.',
      pt: 'Desenhe o que você precisava quando criança, mas não recebeu. Amor? Segurança? Brincadeira? Proteção? Expresse visualmente.',
      id: 'Gambar apa yang kamu butuhkan sebagai anak tetapi tidak kamu dapatkan. Cinta? Keamanan? Permainan? Perlindungan? Ungkapkan secara visual.',
      it: 'Disegna ciò di cui avevi bisogno da bambino ma che non hai ricevuto. Amore? Sicurezza? Gioco? Protezione? Esprimilo visivamente.',
      ar: 'ارسم ما كنت تحتاجه كطفل ولكن لم تحصل عليه. الحب؟ الأمان؟ اللعب؟ الحماية؟ عبر عنه بصرياً.',
      hi: 'जो आपको बच्चे के रूप में चाहिए था लेकिन नहीं मिला उसे बनाएं। प्यार? सुरक्षा? खेल? सुरक्षा? इसे दृश्यात्मक रूप से व्यक्त करें।',
      zh: '画出你童年时需要但没有得到的东西。爱？安全？玩耍？保护？用视觉方式表达。',
      ja: '子供の頃必要だったが得られなかったものを描いてください。愛？安全？遊び？保護？視覚的に表現してください。',
      ko: '어렸을 때 필요했지만 받지 못한 것을 그려보세요. 사랑? 안전? 놀이? 보호? 시각적으로 표현하세요.',
      uk: 'Намалюйте те, що вам було потрібно в дитинстві, але ви не отримали. Любов? Безпека? Гра? Захист? Виразіть це візуально.',
      pl: 'Narysuj to, czego potrzebowałeś jako dziecko, ale nie otrzymałeś. Miłość? Bezpieczeństwo? Zabawa? Ochrona? Wyraź to wizualnie.'
    },
    icon: '💝',
    color: '#EC4899',
    estimatedDuration: 35,
    focusAreas: ['unmet-needs', 'childhood-wounds', 'compassion']
  },

  {
    id: 8,
    module: 2,
    title: {
      en: 'Safe Place In Childhood',
      ka: 'უსაფრთხო ადგილი ბავშვობაში',
      ru: 'Безопасное место в детстве',
      hy: 'Անվտանգ տեղ մանկության մեջ',
      tr: 'Çocuklukta Güvenli Yer',
      az: 'Uşaqlıqda Təhlükəsiz Yer',
      es: 'Lugar Seguro En La Infancia',
      de: 'Sicherer Ort in der Kindheit',
      fr: 'Lieu sûr dans l\'enfance',
      pt: 'Lugar Seguro Na Infância',
      id: 'Tempat Aman Di Masa Kecil',
      it: 'Luogo Sicuro Nell\'Infanzia',
      ar: 'مكان آمن في الطفولة',
      hi: 'बचपन में सुरक्षित स्थान',
      zh: '童年时的安全之地',
      ja: '子供時代の安全な場所',
      ko: '어린 시절의 안전한 장소',
      uk: 'Безпечне місце в дитинстві',
      pl: 'Bezpieczne miejsce w dzieciństwie'
    },
    theme: {
      en: 'Childhood Safety',
      ka: 'ბავშვური უსაფრთხოება',
      ru: 'Детская безопасность',
      hy: 'Մանկական անվտանգություն',
      tr: 'Çocukluk Güvenliği',
      az: 'Uşaqlıq Təhlükəsizliyi',
      es: 'Seguridad Infantil',
      de: 'Kindheitssicherheit',
      fr: 'Sécurité de l\'enfance',
      pt: 'Segurança Na Infância',
      id: 'Keamanan Masa Kecil',
      it: 'Sicurezza Dell\'Infanzia',
      ar: 'أمان الطفولة',
      hi: 'बचपन की सुरक्षा',
      zh: '童年安全',
      ja: '子供時代の安全',
      ko: '어린 시절 안전',
      uk: 'Дитяча безпека',
      pl: 'Bezpieczeństwo dzieciństwa'
    },
    description: {
      en: 'Draw a place where you felt safe as a child. Home? Grandparents\' house? Nature?',
      ka: 'დახატე ადგილი სადაც ბავშვად უსაფრთხოდ გრძნობდი თავს. სახლი? ბებია-ბაბუასთან? ბუნება?',
      ru: 'Нарисуйте место, где вы чувствовали себя в безопасности в детстве. Дом? Дом бабушки? Природа?',
      hy: 'Նկարեք տեղ որտեղ զգում էիք ինքներդ ձեզ անվտանգ երեխայության մեջ: Տուն: Տատիկի տուն: Բնություն:',
      tr: 'Çocukken kendini güvende hissettiğin bir yer çiz. Ev? Büyükanne evi? Doğa?',
      az: 'Uşaq ikən özünüzü təhlükəsiz hiss etdiyiniz yeri çəkin. Ev? Nənə evi? Təbiət?',
      es: 'Dibuja un lugar donde te sentías seguro de niño. ¿Casa? ¿Casa de los abuelos? ¿Naturaleza?',
      de: 'Zeichne einen Ort, an dem du dich als Kind sicher gefühlt hast. Zuhause? Haus der Großeltern? Natur?',
      fr: 'Dessine un endroit où tu te sentais en sécurité enfant. Maison ? Maison des grands-parents ? Nature ?',
      pt: 'Desenhe um lugar onde você se sentia seguro quando criança. Casa? Casa dos avós? Natureza?',
      id: 'Gambar tempat di mana kamu merasa aman sebagai anak. Rumah? Rumah nenek? Alam?',
      it: 'Disegna un luogo dove ti sentivi al sicuro da bambino. Casa? Casa dei nonni? Natura?',
      ar: 'ارسم مكاناً شعرت فيه بالأمان كطفل. المنزل؟ بيت الجدة؟ الطبيعة؟',
      hi: 'एक ऐसी जगह बनाएं जहां आप बच्चे के रूप में सुरक्षित महसूस करते थे। घर? दादा-दादी का घर? प्रकृति?',
      zh: '画出你童年时感到安全的地方。家？祖父母家？大自然？',
      ja: '子供の頃安全だと感じた場所を描いてください。家？祖父母の家？自然？',
      ko: '어렸을 때 안전하다고 느꼈던 장소를 그려보세요. 집? 조부모님 집? 자연?',
      uk: 'Намалюйте місце, де ви відчували себе в безпеці в дитинстві. Дім? Дім бабусі? Природа?',
      pl: 'Narysuj miejsce, gdzie czułeś się bezpiecznie jako dziecko. Dom? Dom dziadków? Natura?'
    },
    drawingPrompt: {
      en: 'Draw your safe place from childhood. Who was there? What did it look like? What made it feel safe?',
      ka: 'დახატე შენი უსაფრთხო ადგილი ბავშვობიდან. ვინ იყო იქ? როგორ გამოიყურებოდა? რა აქცევდა უსაფრთხოდ?',
      ru: 'Нарисуйте свое безопасное место из детства. Кто там был? Как оно выглядело? Что делало его безопасным?',
      hy: 'Նկարեք ձեր անվտանգ տեղը մանկությունից: Ո՞վ էր այնտեղ: Ինչպե՞ս էր երևում: Ի՞նչն էր անվտանգ դարձնում:',
      tr: 'Çocukluğundaki güvenli yerini çiz. Orada kim vardı? Nasıl görünüyordu? Onu güvenli yapan neydi?',
      az: 'Uşaqlığınızdan təhlükəsiz yerinizi çəkin. Orada kim var idi? Necə görünürdü? Onu təhlükəsiz edən nə idi?',
      es: 'Dibuja tu lugar seguro de la infancia. ¿Quién estaba allí? ¿Cómo era? ¿Qué lo hacía sentir seguro?',
      de: 'Zeichne deinen sicheren Ort aus der Kindheit. Wer war dort? Wie sah er aus? Was machte ihn sicher?',
      fr: 'Dessine ton lieu sûr de l\'enfance. Qui était là ? À quoi ressemblait-il ? Qu\'est-ce qui le rendait sûr ?',
      pt: 'Desenhe seu lugar seguro da infância. Quem estava lá? Como era? O que o fazia sentir seguro?',
      id: 'Gambar tempat amanmu dari masa kecil. Siapa yang ada di sana? Seperti apa tampilannya? Apa yang membuatnya terasa aman?',
      it: 'Disegna il tuo luogo sicuro dell\'infanzia. Chi c\'era? Come appariva? Cosa lo rendeva sicuro?',
      ar: 'ارسم مكانك الآمن من الطفولة. من كان هناك؟ كيف كان يبدو؟ ما الذي جعله يبدو آمناً؟',
      hi: 'बचपन से अपनी सुरक्षित जगह बनाएं। वहां कौन था? यह कैसा दिखता था? इसे सुरक्षित क्या बनाता था?',
      zh: '画出你童年时的安全之地。谁在那里？它看起来怎么样？是什么让它感到安全？',
      ja: '子供時代の安全な場所を描いてください。誰がそこにいましたか？どのように見えましたか？何が安全にしましたか？',
      ko: '어린 시절의 안전한 장소를 그려보세요. 누가 있었나요? 어떻게 보였나요? 무엇이 안전하게 만들었나요?',
      uk: 'Намалюйте своє безпечне місце з дитинства. Хто там був? Як воно виглядало? Що робило його безпечним?',
      pl: 'Narysuj swoje bezpieczne miejsce z dzieciństwa. Kto tam był? Jak wyglądało? Co sprawiało, że było bezpieczne?'
    },
    icon: '🏡',
    color: '#10B981',
    estimatedDuration: 35,
    focusAreas: ['safety', 'resources', 'positive-memories']
  },

  {
    id: 9,
    module: 2,
    title: {
      en: 'Childhood Fear',
      ka: 'ბავშვობის შიში',
      ru: 'Детский страх',
      hy: 'Մանկական վախ',
      tr: 'Çocukluk Korkusu',
      az: 'Uşaqlıq Qorxusu',
      es: 'Miedo De La Infancia',
      de: 'Kindheitsangst',
      fr: 'Peur de l\'enfance',
      pt: 'Medo Da Infância',
      id: 'Ketakutan Masa Kecil',
      it: 'Paura Dell\'Infanzia',
      ar: 'خوف الطفولة',
      hi: 'बचपन का डर',
      zh: '童年恐惧',
      ja: '子供時代の恐怖',
      ko: '어린 시절의 두려움',
      uk: 'Дитячий страх',
      pl: 'Lęk z dzieciństwa'
    },
    theme: {
      en: 'Childhood Fears',
      ka: 'ბავშვური შიშები',
      ru: 'Детские страхи',
      hy: 'Մանկական վախեր',
      tr: 'Çocukluk Korkuları',
      az: 'Uşaqlıq Qorxuları',
      es: 'Miedos Infantiles',
      de: 'Kinderängste',
      fr: 'Peurs enfantines',
      pt: 'Medos Infantis',
      id: 'Ketakutan Anak-Anak',
      it: 'Paure Infantili',
      ar: 'مخاوف الطفولة',
      hi: 'बचपन के डर',
      zh: '童年恐惧',
      ja: '子供の恐怖',
      ko: '어린 시절 두려움',
      uk: 'Дитячі страхи',
      pl: 'Dziecięce lęki'
    },
    description: {
      en: 'Draw what you feared as a child. Monster? Darkness? Loneliness? Abandonment?',
      ka: 'დახატე რისიც გეშინოდა ბავშვობაში. მონსტრი? სიბნელე? მარტოობა? მიტოვება?',
      ru: 'Нарисуйте то, чего вы боялись в детстве. Монстр? Темнота? Одиночество? Покинутость?',
      hy: 'Նկարեք ինչից էիք վախենում երեխա: Հրեշ: Խավար: Միայնություն: Լքված լինել:',
      tr: 'Çocukken korktuğun şeyi çiz. Canavar? Karanlık? Yalnızlık? Terk edilme?',
      az: 'Uşaq ikən qorxduğunuz şeyi çəkin. Canavar? Qaranlıq? Tənhalıq? Tərk olunma?',
      es: 'Dibuja lo que temías de niño. ¿Monstruo? ¿Oscuridad? ¿Soledad? ¿Abandono?',
      de: 'Zeichne, wovor du als Kind Angst hattest. Monster? Dunkelheit? Einsamkeit? Verlassen werden?',
      fr: 'Dessine ce dont tu avais peur enfant. Monstre ? Obscurité ? Solitude ? Abandon ?',
      pt: 'Desenhe o que você temia quando criança. Monstro? Escuridão? Solidão? Abandono?',
      id: 'Gambar apa yang kamu takuti sebagai anak. Monster? Kegelapan? Kesepian? Ditinggalkan?',
      it: 'Disegna ciò di cui avevi paura da bambino. Mostro? Buio? Solitudine? Abbandono?',
      ar: 'ارسم ما كنت تخافه كطفل. وحش؟ ظلام؟ وحدة؟ هجر؟',
      hi: 'बच्चे के रूप में आप जिससे डरते थे उसे बनाएं। राक्षस? अंधेरा? अकेलापन? परित्याग?',
      zh: '画出你童年时害怕的东西。怪物？黑暗？孤独？被抛弃？',
      ja: '子供の頃恐れていたものを描いてください。モンスター？暗闇？孤独？見捨てられること？',
      ko: '어렸을 때 두려워했던 것을 그려보세요. 괴물? 어둠? 외로움? 버림받음?',
      uk: 'Намалюйте те, чого ви боялися в дитинстві. Монстр? Темрява? Самотність? Покинутість?',
      pl: 'Narysuj to, czego bałeś się jako dziecko. Potwór? Ciemność? Samotność? Porzucenie?'
    },
    drawingPrompt: {
      en: 'Draw your childhood fear. Give it a shape, color, size. Where did it live? How big was it?',
      ka: 'დახატე შენი ბავშვური შიში. მიეცი ფორმა, ფერი, ზომა. სად ცხოვრობდა? რამდენად დიდი იყო?',
      ru: 'Нарисуйте свой детский страх. Придайте ему форму, цвет, размер. Где он жил? Насколько большим был?',
      hy: 'Նկարեք ձեր մանկական վախը: Տվեք նրան ձև, գույն, չափ: Որտեղ էր ապրում: Որքան մեծ էր:',
      tr: 'Çocukluk korkunu çiz. Ona bir şekil, renk, boyut ver. Nerede yaşıyordu? Ne kadar büyüktü?',
      az: 'Uşaqlıq qorxunuzu çəkin. Ona forma, rəng, ölçü verin. Harada yaşayırdı? Nə qədər böyük idi?',
      es: 'Dibuja tu miedo infantil. Dale una forma, color, tamaño. ¿Dónde vivía? ¿Qué tan grande era?',
      de: 'Zeichne deine Kindheitsangst. Gib ihr eine Form, Farbe, Größe. Wo lebte sie? Wie groß war sie?',
      fr: 'Dessine ta peur d\'enfance. Donne-lui une forme, une couleur, une taille. Où vivait-elle ? Quelle était sa taille ?',
      pt: 'Desenhe seu medo infantil. Dê-lhe uma forma, cor, tamanho. Onde vivia? Quão grande era?',
      id: 'Gambar ketakutanmu di masa kecil. Beri bentuk, warna, ukuran. Di mana ia tinggal? Seberapa besar?',
      it: 'Disegna la tua paura infantile. Dalle una forma, colore, dimensione. Dove viveva? Quanto era grande?',
      ar: 'ارسم خوفك من الطفولة. امنحه شكلاً ولوناً وحجماً. أين كان يعيش؟ ما حجمه؟',
      hi: 'अपने बचपन के डर को बनाएं। इसे एक आकार, रंग, आकार दें। यह कहाँ रहता था? यह कितना बड़ा था?',
      zh: '画出你童年的恐惧。给它一个形状、颜色、大小。它住在哪里？它有多大？',
      ja: '子供時代の恐怖を描いてください。形、色、サイズを与えてください。どこに住んでいましたか？どのくらいの大きさでしたか？',
      ko: '어린 시절 두려움을 그려보세요. 모양, 색상, 크기를 부여하세요. 어디에 살았나요? 얼마나 컸나요?',
      uk: 'Намалюйте свій дитячий страх. Надайте йому форму, колір, розмір. Де він жив? Наскільки великим був?',
      pl: 'Narysuj swój dziecięcy lęk. Nadaj mu kształt, kolor, rozmiar. Gdzie mieszkał? Jak duży był?'
    },
    icon: '😱',
    color: '#DC2626',
    estimatedDuration: 35,
    focusAreas: ['childhood-trauma', 'fear', 'externalization']
  },

  {
    id: 10,
    module: 2,
    title: {
      en: 'Childhood Wound',
      ka: 'ბავშვური ჭრილობა',
      ru: 'Детская рана',
      hy: 'Մանկական վերք',
      tr: 'Çocukluk Yarası',
      az: 'Uşaqlıq Yarası',
      es: 'Herida De La Infancia',
      de: 'Kindheitswunde',
      fr: 'Blessure d\'enfance',
      pt: 'Ferida Da Infância',
      id: 'Luka Masa Kecil',
      it: 'Ferita Dell\'Infanzia',
      ar: 'جرح الطفولة',
      hi: 'बचपन का घाव',
      zh: '童年创伤',
      ja: '子供時代の傷',
      ko: '어린 시절 상처',
      uk: 'Дитяча рана',
      pl: 'Rana z dzieciństwa'
    },
    theme: {
      en: 'Childhood Trauma',
      ka: 'ბავშვური ტრავმა',
      ru: 'Детская травма',
      hy: 'Մանկական ուղեղային վնասվածք',
      tr: 'Çocukluk Travması',
      az: 'Uşaqlıq Travması',
      es: 'Trauma Infantil',
      de: 'Kindheitstrauma',
      fr: 'Traumatisme de l\'enfance',
      pt: 'Trauma Infantil',
      id: 'Trauma Masa Kecil',
      it: 'Trauma Dell\'Infanzia',
      ar: 'صدمة الطفولة',
      hi: 'बचपन का आघात',
      zh: '童年创伤',
      ja: '子供時代のトラウマ',
      ko: '어린 시절 트라우마',
      uk: 'Дитяча травма',
      pl: 'Trauma dzieciństwa'
    },
    description: {
      en: 'Draw a moment when you were hurt emotionally as a child. How does this pain look?',
      ka: 'დახატე მომენტი როდესაც გტკივა ემოციურად ბავშვობაში. როგორ გამოიყურება ეს ტკივილი?',
      ru: 'Нарисуйте момент, когда вам было больно эмоционально в детстве. Как выглядит эта боль?',
      hy: 'Նկարեք պահ երբ վնասվեցիք զգայականորեն մանկության մեջ: Ինչպե՞ս է նա երևում այս ցավը:',
      tr: 'Çocukken duygusal olarak incindiğin bir anı çiz. Bu acı nasıl görünüyor?',
      az: 'Uşaq ikən emosional olaraq incinmiş anı çəkin. Bu ağrı necə görünür?',
      es: 'Dibuja un momento en el que te lastimaron emocionalmente de niño. ¿Cómo se ve este dolor?',
      de: 'Zeichne einen Moment, in dem du als Kind emotional verletzt wurdest. Wie sieht dieser Schmerz aus?',
      fr: 'Dessine un moment où tu as été blessé émotionnellement enfant. À quoi ressemble cette douleur ?',
      pt: 'Desenhe um momento em que você foi ferido emocionalmente quando criança. Como essa dor se parece?',
      id: 'Gambar saat kamu terluka secara emosional sebagai anak. Seperti apa rasa sakit ini?',
      it: 'Disegna un momento in cui sei stato ferito emotivamente da bambino. Come appare questo dolore?',
      ar: 'ارسم لحظة عندما تأذيت عاطفياً كطفل. كيف يبدو هذا الألم؟',
      hi: 'उस पल को बनाएं जब आप बच्चे के रूप में भावनात्मक रूप से आहत हुए थे। यह दर्द कैसा दिखता है?',
      zh: '画出童年时情感受伤的时刻。这种痛苦看起来怎么样？',
      ja: '子供の頃感情的に傷ついた瞬間を描いてください。この痛みはどのように見えますか？',
      ko: '어렸을 때 감정적으로 상처받은 순간을 그려보세요. 이 고통은 어떻게 보이나요?',
      uk: 'Намалюйте момент, коли вам було боляче емоційно в дитинстві. Як виглядає цей біль?',
      pl: 'Narysuj moment, kiedy zostałeś zraniony emocjonalnie jako dziecko. Jak wygląda ten ból?'
    },
    drawingPrompt: {
      en: 'Draw a specific moment or general feeling of emotional pain from childhood. Use colors and symbols to express it.',
      ka: 'დახატე კონკრეტული მომენტი ან ზოგადი გრძნობა ემოციური ტკივილისა ბავშვობიდან. გამოიყენე ფერები და სიმბოლოები გამოსახატად.',
      ru: 'Нарисуйте конкретный момент или общее ощущение эмоциональной боли из детства. Используйте цвета и символы для выражения.',
      hy: 'Նկարեք հատուկ պահ կամ ընդհանուր զգացում զգայական ցավի մանկությունից: Օգտագործեք գույներ և խորհրդանիշներ արտահայտելու համար:',
      tr: 'Çocukluktan duygusal acının belirli bir anını veya genel hissini çiz. Bunu ifade etmek için renkler ve semboller kullan.',
      az: 'Uşaqlıqdan emosional ağrının xüsusi anını və ya ümumi hissini çəkin. İfadə etmək üçün rənglər və simvollardan istifadə edin.',
      es: 'Dibuja un momento específico o sentimiento general de dolor emocional de la infancia. Usa colores y símbolos para expresarlo.',
      de: 'Zeichne einen bestimmten Moment oder ein allgemeines Gefühl emotionaler Schmerzen aus der Kindheit. Verwende Farben und Symbole, um es auszudrücken.',
      fr: 'Dessine un moment spécifique ou un sentiment général de douleur émotionnelle de l\'enfance. Utilise des couleurs et des symboles pour l\'exprimer.',
      pt: 'Desenhe um momento específico ou sentimento geral de dor emocional da infância. Use cores e símbolos para expressá-lo.',
      id: 'Gambar momen spesifik atau perasaan umum dari rasa sakit emosional masa kecil. Gunakan warna dan simbol untuk mengekspresikannya.',
      it: 'Disegna un momento specifico o un sentimento generale di dolore emotivo dell\'infanzia. Usa colori e simboli per esprimerlo.',
      ar: 'ارسم لحظة محددة أو شعوراً عاماً بالألم العاطفي من الطفولة. استخدم الألوان والرموز للتعبير عنه.',
      hi: 'बचपन से भावनात्मक दर्द के किसी विशिष्ट क्षण या सामान्य भावना को बनाएं। इसे व्यक्त करने के लिए रंग और प्रतीकों का उपयोग करें।',
      zh: '画出童年时情感痛苦的具体时刻或一般感觉。使用颜色和符号来表达它。',
      ja: '子供時代の感情的な痛みの特定の瞬間または一般的な感覚を描いてください。色とシンボルを使用して表現してください。',
      ko: '어린 시절 정서적 고통의 특정 순간이나 일반적인 느낌을 그려보세요. 색상과 기호를 사용하여 표현하세요.',
      uk: 'Намалюйте конкретний момент або загальне відчуття емоційного болю з дитинства. Використовуйте кольори та символи для вираження.',
      pl: 'Narysuj konkretny moment lub ogólne uczucie emocjonalnego bólu z dzieciństwa. Użyj kolorów i symboli, aby to wyrazić.'
    },
    icon: '💔',
    color: '#991B1B',
    estimatedDuration: 40,
    focusAreas: ['trauma-processing', 'childhood-wounds', 'acknowledgment']
  },

  {
    id: 11,
    module: 2,
    title: {
      en: 'Healing Your Inner Child',
      ka: 'შენი შინაგანი ბავშვის განკურნება',
      ru: 'Исцеление вашего внутреннего ребенка',
      hy: 'Ձեր ներքին երեխայի բուժում',
      tr: 'İç Çocuğunu İyileştirmek',
      az: 'Daxili Uşağınızı Sağaltmaq',
      es: 'Sanando Tu Niño Interior',
      de: 'Heilung deines inneren Kindes',
      fr: 'Guérir ton enfant intérieur',
      pt: 'Curando Sua Criança Interior',
      id: 'Menyembuhkan Anak Batinmu',
      it: 'Guarire Il Tuo Bambino Interiore',
      ar: 'شفاء طفلك الداخلي',
      hi: 'अपने आंतरिक बच्चे को ठीक करना',
      zh: '治愈你的内在小孩',
      ja: 'インナーチャイルドを癒す',
      ko: '내면의 아이 치유하기',
      uk: 'Зцілення вашої внутрішньої дитини',
      pl: 'Leczenie twojego wewnętrznego dziecka'
    },
    theme: {
      en: 'Reparenting',
      ka: 'ხელახალი აღზრდა',
      ru: 'Перевоспитание',
      hy: 'Վերադասնցում',
      tr: 'Yeniden Ebeveynlik',
      az: 'Yenidən Valideynlik',
      es: 'Re-crianza',
      de: 'Neu-Erziehung',
      fr: 'Re-parentalité',
      pt: 'Re-criação',
      id: 'Pengasuhan Ulang',
      it: 'Ri-genitorialità',
      ar: 'إعادة الأبوة',
      hi: 'पुनः पालन-पोषण',
      zh: '重新养育',
      ja: '再養育',
      ko: '재양육',
      uk: 'Перевиховання',
      pl: 'Re-rodzicielstwo'
    },
    description: {
      en: 'Draw how you hug and protect your inner child now, as an adult.',
      ka: 'დახატე როგორ ეხვევი და იცავ შენს შინაგან ბავშვს ახლა, როგორც ზრდასრული.',
      ru: 'Нарисуйте, как вы обнимаете и защищаете своего внутреннего ребенка сейчас, будучи взрослым.',
      hy: 'Նկարեք ինչպես եք գրկում և պաշտպանում ձեր ներքին երեխային հիմա, որպես մեծահասակ:',
      tr: 'Şimdi bir yetişkin olarak iç çocuğunu nasıl kucakladığını ve koruduğunu çiz.',
      az: 'İndi böyük kimi daxili uşağınızı necə qucaqlayıb qoruduğunuzu çəkin.',
      es: 'Dibuja cómo abrazas y proteges a tu niño interior ahora, como adulto.',
      de: 'Zeichne, wie du dein inneres Kind jetzt als Erwachsener umarmst und schützt.',
      fr: 'Dessine comment tu embrasses et protèges ton enfant intérieur maintenant, en tant qu\'adulte.',
      pt: 'Desenhe como você abraça e protege sua criança interior agora, como adulto.',
      id: 'Gambar bagaimana kamu memeluk dan melindungi anak batinmu sekarang, sebagai orang dewasa.',
      it: 'Disegna come abbracci e proteggi il tuo bambino interiore ora, da adulto.',
      ar: 'ارسم كيف تحتضن وتحمي طفلك الداخلي الآن، كبالغ.',
      hi: 'अब एक वयस्क के रूप में अपने आंतरिक बच्चे को कैसे गले लगाते हैं और उसकी रक्षा करते हैं, उसे बनाएं।',
      zh: '画出你现在作为成年人如何拥抱和保护你的内在小孩。',
      ja: '今、大人としてあなたのインナーチャイルドをどのように抱きしめて守っているかを描いてください。',
      ko: '지금 성인으로서 내면의 아이를 어떻게 포옹하고 보호하는지 그려보세요.',
      uk: 'Намалюйте, як ви обіймаєте та захищаєте свою внутрішню дитину зараз, будучи дорослим.',
      pl: 'Narysuj, jak teraz jako dorosły obejmujesz i chronisz swoje wewnętrzne dziecko.'
    },
    drawingPrompt: {
      en: 'Draw adult you hugging, protecting, or comforting child you. Show the love and care you give your inner child now.',
      ka: 'დახატე ზრდასრული შენ რომელიც ეხვევი, იცავ ან ამშვიდებ ბავშვ შენ. აჩვენე სიყვარული და ზრუნვა რომელსაც აძლევ შენს შინაგან ბავშვს ახლა.',
      ru: 'Нарисуйте взрослого вас, обнимающего, защищающего или утешающего ребенка вас. Покажите любовь и заботу, которую вы даете своему внутреннему ребенку сейчас.',
      hy: 'Նկարեք մեծահասակ ձեզ որը գրկում, պաշտպանում կամ մխիթարում է երեխա ձեզ: Ցույց տվեք սերը և խնամքը որը տալիս եք ձեր ներքին երեխային հիմա:',
      tr: 'Yetişkin seni çocuk senin sarılırken, korurken veya teselli ederken çiz. İç çocuğuna şimdi verdiğin sevgi ve ilgiyi göster.',
      az: 'Böyük sizi uşaq sizi qucaqlayan, qoruyan və ya təsəlli verərkən çəkin. İndi daxili uşağınıza verdiyiniz sevgi və qayğını göstərin.',
      es: 'Dibuja al adulto tú abrazando, protegiendo o consolando al niño tú. Muestra el amor y cuidado que le das a tu niño interior ahora.',
      de: 'Zeichne den erwachsenen dich, der das Kind dich umarmt, schützt oder tröstet. Zeige die Liebe und Fürsorge, die du deinem inneren Kind jetzt gibst.',
      fr: 'Dessine l\'adulte toi qui câline, protège ou console l\'enfant toi. Montre l\'amour et les soins que tu donnes à ton enfant intérieur maintenant.',
      pt: 'Desenhe o adulto você abraçando, protegendo ou confortando a criança você. Mostre o amor e cuidado que você dá à sua criança interior agora.',
      id: 'Gambar dirimu yang dewasa memeluk, melindungi, atau menghibur dirimu yang anak-anak. Tunjukkan cinta dan perhatian yang kamu berikan kepada anak batinmu sekarang.',
      it: 'Disegna l\'adulto te che abbraccia, protegge o consola il bambino te. Mostra l\'amore e la cura che dai al tuo bambino interiore ora.',
      ar: 'ارسم البالغ أنت يحتضن أو يحمي أو يواسي الطفل أنت. أظهر الحب والرعاية التي تقدمها لطفلك الداخلي الآن.',
      hi: 'वयस्क आप को बनाएं जो बच्चे आप को गले लगा रहा है, सुरक्षा कर रहा है या सांत्वना दे रहा है। अपने आंतरिक बच्चे को अब जो प्यार और देखभाल देते हैं उसे दिखाएं।',
      zh: '画出成年的你拥抱、保护或安慰儿童的你。展示你现在给予内在小孩的爱和关怀。',
      ja: '大人のあなたが子供のあなたを抱きしめ、守り、または慰めている様子を描いてください。今あなたのインナーチャイルドに与えている愛とケアを示してください。',
      ko: '성인인 당신이 어린 당신을 포옹하거나 보호하거나 위로하는 모습을 그려보세요. 지금 내면의 아이에게 주는 사랑과 보살핌을 보여주세요.',
      uk: 'Намалюйте дорослого вас, який обіймає, захищає або втішає дитину вас. Покажіть любов і турботу, яку ви даєте своїй внутрішній дитині зараз.',
      pl: 'Narysuj dorosłego ciebie przytulającego, chroniącego lub pocieszającego dziecko ciebie. Pokaż miłość i troskę, którą dajesz swojemu wewnętrznemu dziecku teraz.'
    },
    icon: '🤗',
    color: '#10B981',
    estimatedDuration: 40,
    focusAreas: ['reparenting', 'self-compassion', 'healing']
  },

  // Continue with remaining 32 sessions...
  // Due to character limits, I'll create a separate part for the remaining sessions
];

class ArtTherapyProgramManager {
  private storageKey = '@behappy_art_therapy_progress';

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
      return new Map();
    }
  }

  async saveProgress(sessionId: number, progress: SessionProgress): Promise<void> {
    try {
      const currentProgress = await this.getProgress();
      currentProgress.set(sessionId, progress);

      const obj: Record<number, any> = {};
      currentProgress.forEach((value, key) => {
        const sanitized: any = {
          sessionId: value.sessionId,
          completed: !!value.completed,
          phase: value.phase,
          startedAt: value.startedAt ? (value.startedAt instanceof Date ? value.startedAt.toISOString() : value.startedAt) : undefined,
          completedAt: value.completedAt ? (value.completedAt instanceof Date ? value.completedAt.toISOString() : value.completedAt) : undefined,
          firstDrawingUri: value.firstDrawingUri,
          secondDrawingUri: value.secondDrawingUri,
          emotionalJourney: value.emotionalJourney,
          clinicalSummary: value.clinicalSummary,
          chatHistory: Array.isArray(value.chatHistory)
            ? value.chatHistory.map((m: any) => ({
                id: m?.id,
                role: m?.role,
                content: m?.content,
                timestamp: m?.timestamp
              }))
            : []
        };
        obj[key] = sanitized;
      });

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save art therapy progress:', error);
      throw error;
    }
  }

  getSessionById(id: number): ArtTherapySession | undefined {
    return ART_THERAPY_SESSIONS.find(s => s.id === id);
  }

  async isSessionUnlocked(sessionId: number): Promise<boolean> {
    if (sessionId === 1) return true;
    
    const progress = await this.getProgress();
    const previousSession = progress.get(sessionId - 1);
    
    return previousSession?.completed === true;
  }

  async getCompletedCount(): Promise<number> {
    const progress = await this.getProgress();
    let count = 0;
    progress.forEach(p => {
      if (p.completed) count++;
    });
    return count;
  }

  async getProgressPercentage(): Promise<number> {
    const completed = await this.getCompletedCount();
    return Math.round((completed / ART_THERAPY_SESSIONS.length) * 100);
  }
}

export default new ArtTherapyProgramManager();
