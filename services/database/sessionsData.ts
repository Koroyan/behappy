/**
 * Art Therapy Sessions Data - All 43 Sessions with 19 Languages
 * 
 * Structure:
 * - Module 1: Introduction & Getting Started (Sessions 1-5)
 * - Module 2: Inner Child & Childhood Trauma (Sessions 6-11)
 * - Module 3: Emotional World (Sessions 12-17)
 * - Module 4: Family & Roots (Sessions 18-23)
 * - Module 5: Body & Somatic Awareness (Sessions 24-28)
 * - Module 6: Shadow, Trauma & Healing (Sessions 29-33)
 * - Module 7: Transformation & Growth (Sessions 34-38)
 * - Module 8: Future & Closure (Sessions 39-43)
 * 
 * Languages: en, ka, ru, hy, tr, az, es, de, fr, pt, id, it, ar, hi, zh, ja, ko, uk, pl
 */

export interface SessionData {
  id: number;
  module: number;
  icon: string;
  color: string;
  estimatedDuration: number;
  focusAreas: string[];
  translations: {
    [langCode: string]: {
      title: string;
      theme: string;
      description: string;
      drawingPrompt: string;
    };
  };
}

export const ALL_SESSIONS: SessionData[] = [
  // ==========================================
  // MODULE 1: INTRODUCTION & GETTING STARTED
  // ==========================================
  {
    id: 1,
    module: 1,
    icon: '👋',
    color: '#6366F1',
    estimatedDuration: 30,
    focusAreas: ['introduction', 'trust-building', 'first-contact'],
    translations: {
      en: {
        title: 'Hello, This Is Me',
        theme: 'First Meeting',
        description: 'Draw your emotions right now in this moment. Use colors and shapes freely.',
        drawingPrompt: 'Draw your emotions right now in this moment. Use any colors and shapes that feel right.'
      },
      ka: {
        title: 'გამარჯობა, ეს მე ვარ',
        theme: 'პირველი შეხვედრა',
        description: 'დახატე შენი ემოციები ახლა ამ წუთში. გამოიყენე ფერები და ფორმები თავისუფლად.',
        drawingPrompt: 'დახატე შენი ემოციები ახლა ამ წუთში. გამოიყენე ნებისმიერი ფერი და ფორმა რაც სწორად გეჩვენება.'
      },
      ru: {
        title: 'Здравствуйте, это я',
        theme: 'Первая встреча',
        description: 'Нарисуйте свои эмоции прямо сейчас. Используйте цвета и формы свободно.',
        drawingPrompt: 'Нарисуйте свои эмоции прямо сейчас. Используйте любые цвета и формы, которые кажутся правильными.'
      },
      hy: {
        title: 'Բարև, սա ես եմ',
        theme: 'Առաջին հանդիպում',
        description: 'Նկարեք ձեր զգացմունքները հենց հիմա: Օգտագործեք գույներն ու ձևերը ազատորեն:',
        drawingPrompt: 'Նկարեք ձեր զգացմունքները հենց հիմա: Օգտագործեք գույներն ու ձևերը ազատորեն:'
      },
      tr: {
        title: 'Merhaba, Bu Benim',
        theme: 'İlk Buluşma',
        description: 'Şu an duygularını çiz. Renkleri ve şekilleri özgürce kullan.',
        drawingPrompt: 'Şu an duygularını çiz. Doğru hissettiren herhangi bir renk ve şekil kullan.'
      },
      az: {
        title: 'Salam, Bu Mənəm',
        theme: 'İlk Görüş',
        description: 'İndi hisslərinizi çəkin. Rəngləri və formaları azad istifadə edin.',
        drawingPrompt: 'İndi hisslərinizi çəkin. Düzgün görünən istənilən rəng və forma istifadə edin.'
      },
      es: {
        title: 'Hola, Este Soy Yo',
        theme: 'Primer Encuentro',
        description: 'Dibuja tus emociones ahora mismo. Usa colores y formas libremente.',
        drawingPrompt: 'Dibuja tus emociones en este momento. Usa cualquier color y forma que te parezca correcta.'
      },
      de: {
        title: 'Hallo, das bin ich',
        theme: 'Erstes Treffen',
        description: 'Zeichne deine Emotionen jetzt. Nutze Farben und Formen frei.',
        drawingPrompt: 'Zeichne jetzt deine Gefühle. Benutze beliebige Farben und Formen, die sich richtig anfühlen.'
      },
      fr: {
        title: 'Bonjour, c\'est moi',
        theme: 'Première rencontre',
        description: 'Dessine tes émotions maintenant. Utilise librement les couleurs et les formes.',
        drawingPrompt: 'Dessine tes émotions maintenant. Utilise n\'importe quelle couleur et forme qui te semble juste.'
      },
      pt: {
        title: 'Olá, Este Sou Eu',
        theme: 'Primeiro Encontro',
        description: 'Desenhe suas emoções agora. Use cores e formas livremente.',
        drawingPrompt: 'Desenhe suas emoções agora. Use quaisquer cores e formas que pareçam certas.'
      },
      id: {
        title: 'Halo, Ini Aku',
        theme: 'Pertemuan Pertama',
        description: 'Gambar emosimu sekarang. Gunakan warna dan bentuk dengan bebas.',
        drawingPrompt: 'Gambar emosimu sekarang. Gunakan warna dan bentuk apa pun yang terasa tepat.'
      },
      it: {
        title: 'Ciao, Questo Sono Io',
        theme: 'Primo Incontro',
        description: 'Disegna le tue emozioni adesso. Usa liberamente colori e forme.',
        drawingPrompt: 'Disegna le tue emozioni adesso. Usa qualsiasi colore e forma che ti sembri giusto.'
      },
      ar: {
        title: 'مرحباً، هذا أنا',
        theme: 'اللقاء الأول',
        description: 'ارسم مشاعرك الآن. استخدم الألوان والأشكال بحرية.',
        drawingPrompt: 'ارسم مشاعرك الآن. استخدم أي ألوان وأشكال تبدو صحيحة.'
      },
      hi: {
        title: 'नमस्ते, यह मैं हूँ',
        theme: 'पहली मुलाकात',
        description: 'अभी अपनी भावनाओं को बनाएं। स्वतंत्र रूप से रंग और आकृतियों का उपयोग करें।',
        drawingPrompt: 'अभी अपनी भावनाओं को बनाएं। कोई भी रंग और आकृति उपयोग करें जो सही लगे।'
      },
      zh: {
        title: '你好，这就是我',
        theme: '初次见面',
        description: '画出你现在的情绪。自由使用颜色和形状。',
        drawingPrompt: '画出你此刻的情绪。使用任何感觉合适的颜色和形状。'
      },
      ja: {
        title: 'こんにちは、これが私です',
        theme: '初対面',
        description: '今の感情を描いてください。色と形を自由に使ってください。',
        drawingPrompt: '今の感情を描いてください。正しいと感じる色と形を使ってください。'
      },
      ko: {
        title: '안녕하세요, 이것이 저입니다',
        theme: '첫 만남',
        description: '지금 당신의 감정을 그려보세요. 색상과 모양을 자유롭게 사용하세요.',
        drawingPrompt: '지금 감정을 그려보세요. 올바르다고 느껴지는 색과 모양을 사용하세요.'
      },
      uk: {
        title: 'Привіт, це я',
        theme: 'Перша зустріч',
        description: 'Намалюйте свої емоції зараз. Використовуйте кольори та форми вільно.',
        drawingPrompt: 'Намалюйте свої емоції зараз. Використовуйте будь-які кольори та форми, які здаються правильними.'
      },
      pl: {
        title: 'Cześć, to ja',
        theme: 'Pierwsze spotkanie',
        description: 'Narysuj swoje emocje teraz. Używaj kolorów i kształtów swobodnie.',
        drawingPrompt: 'Narysuj swoje emocje teraz. Użyj dowolnych kolorów i kształtów, które wydają się właściwe.'
      }
    }
  },

  {
    id: 2,
    module: 1,
    icon: '🗺️',
    color: '#10B981',
    estimatedDuration: 30,
    focusAreas: ['goal-setting', 'motivation', 'direction'],
    translations: {
      en: {
        title: 'What I Expect From This Journey',
        theme: 'Expectations & Goals',
        description: 'Draw a map or path showing where you are now and where you want to go by the end of therapy.',
        drawingPrompt: 'Create a visual map or path. Mark where you are now with one symbol, and where you want to be with another.'
      },
      ka: {
        title: 'რას ველი ამ მოგზაურობისგან',
        theme: 'მოლოდინები და მიზნები',
        description: 'დახატე რუკა ან გზა რომელიც გიჩვენებს სად ხარ ახლა და სად გინდა მიხვიდე თერაპიის ბოლოს.',
        drawingPrompt: 'შექმენი ვიზუალური რუკა ან გზა. აღნიშნე სად ხარ ახლა ერთი სიმბოლოთი, და სად გინდა იყო მეორეთი.'
      },
      ru: {
        title: 'Чего я жду от этого путешествия',
        theme: 'Ожидания и цели',
        description: 'Нарисуйте карту или путь, показывающий, где вы сейчас и куда хотите прийти к концу терапии.',
        drawingPrompt: 'Создайте визуальную карту или путь. Отметьте, где вы сейчас, одним символом, а где хотите быть — другим.'
      },
      hy: {
        title: 'Ինչ եմ ակնկալում այս ճանապարհից',
        theme: 'Ակնկալություններ և նպատակներ',
        description: 'Նկարեք քարտեզ կամ ուղի՝ ցույց տալով որտեղ եք հիմա և որտեղ ցանկանում եք հասնել թերապիայի վերջում:',
        drawingPrompt: 'Ստեղծեք տեսողական քարտեզ կամ ուղի: Նշեք որտեղ եք հիմա մեկ խորհրդանիշով, իսկ որտեղ ցանկանում եք լինել՝ մեկ այլով:'
      },
      tr: {
        title: 'Bu Yolculuktan Ne Bekliyorum',
        theme: 'Beklentiler ve Hedefler',
        description: 'Şu an nerede olduğunu ve terapinin sonunda nereye varmak istediğini gösteren bir harita veya yol çiz.',
        drawingPrompt: 'Görsel bir harita veya yol oluştur. Şu an nerede olduğunu bir sembolle, olmak istediğin yeri başka bir sembolle işaretle.'
      },
      az: {
        title: 'Bu Səyahətdən Nə Gözləyirəm',
        theme: 'Gözləntilər və Məqsədlər',
        description: 'İndi harada olduğunuzu və terapiyanın sonunda hara çatmaq istədiyinizi göstərən xəritə və ya yol çəkin.',
        drawingPrompt: 'Vizual xəritə və ya yol yaradın. İndi harada olduğunuzu bir simvolla, olmaq istədiyiniz yeri başqa simvolla qeyd edin.'
      },
      es: {
        title: 'Lo Que Espero De Este Viaje',
        theme: 'Expectativas y Objetivos',
        description: 'Dibuja un mapa o camino que muestre dónde estás ahora y dónde quieres llegar al final de la terapia.',
        drawingPrompt: 'Crea un mapa visual o camino. Marca dónde estás ahora con un símbolo y dónde quieres estar con otro.'
      },
      de: {
        title: 'Was ich von dieser Reise erwarte',
        theme: 'Erwartungen und Ziele',
        description: 'Zeichne eine Karte oder einen Weg, der zeigt, wo du jetzt bist und wo du am Ende der Therapie sein möchtest.',
        drawingPrompt: 'Erstelle eine visuelle Karte oder einen Weg. Markiere, wo du jetzt bist, mit einem Symbol und wo du sein möchtest mit einem anderen.'
      },
      fr: {
        title: 'Ce que j\'attends de ce voyage',
        theme: 'Attentes et objectifs',
        description: 'Dessine une carte ou un chemin montrant où tu es maintenant et où tu veux aller à la fin de la thérapie.',
        drawingPrompt: 'Crée une carte visuelle ou un chemin. Marque où tu es maintenant avec un symbole et où tu veux être avec un autre.'
      },
      pt: {
        title: 'O Que Espero Desta Jornada',
        theme: 'Expectativas e Objetivos',
        description: 'Desenhe um mapa ou caminho mostrando onde você está agora e onde quer chegar ao final da terapia.',
        drawingPrompt: 'Crie um mapa visual ou caminho. Marque onde você está agora com um símbolo e onde quer estar com outro.'
      },
      id: {
        title: 'Apa Yang Kuharapkan Dari Perjalanan Ini',
        theme: 'Harapan & Tujuan',
        description: 'Gambar peta atau jalan yang menunjukkan di mana kamu sekarang dan ke mana kamu ingin pergi di akhir terapi.',
        drawingPrompt: 'Buat peta visual atau jalan. Tandai di mana kamu sekarang dengan satu simbol, dan di mana kamu ingin berada dengan simbol lain.'
      },
      it: {
        title: 'Cosa Mi Aspetto Da Questo Viaggio',
        theme: 'Aspettative e Obiettivi',
        description: 'Disegna una mappa o un percorso che mostri dove sei ora e dove vuoi arrivare alla fine della terapia.',
        drawingPrompt: 'Crea una mappa visiva o un percorso. Segna dove sei ora con un simbolo e dove vuoi essere con un altro.'
      },
      ar: {
        title: 'ما أتوقعه من هذه الرحلة',
        theme: 'التوقعات والأهداف',
        description: 'ارسم خريطة أو طريقاً يوضح أين أنت الآن وأين تريد أن تصل في نهاية العلاج.',
        drawingPrompt: 'أنشئ خريطة بصرية أو طريقاً. ضع علامة على مكانك الحالي برمز واحد ومكانك المرغوب برمز آخر.'
      },
      hi: {
        title: 'मैं इस यात्रा से क्या उम्मीद करता हूँ',
        theme: 'अपेक्षाएँ और लक्ष्य',
        description: 'एक नक्शा या रास्ता बनाएं जो दिखाए कि आप अभी कहाँ हैं और थेरेपी के अंत में कहाँ पहुंचना चाहते हैं।',
        drawingPrompt: 'एक दृश्य मानचित्र या रास्ता बनाएं। एक प्रतीक से चिह्नित करें कि आप अभी कहाँ हैं, और दूसरे प्रतीक से जहाँ होना चाहते हैं।'
      },
      zh: {
        title: '我对这次旅程的期待',
        theme: '期待与目标',
        description: '画一张地图或路径，显示你现在在哪里以及治疗结束时你想去哪里。',
        drawingPrompt: '创建一个视觉地图或路径。用一个符号标记你现在的位置，用另一个符号标记你想去的地方。'
      },
      ja: {
        title: 'この旅に期待すること',
        theme: '期待と目標',
        description: '今どこにいるか、そしてセラピーの終わりにどこに行きたいかを示す地図や道を描いてください。',
        drawingPrompt: '視覚的な地図や道を作成します。今どこにいるかを1つのシンボルで、どこにいたいかを別のシンボルでマークしてください。'
      },
      ko: {
        title: '이 여정에서 기대하는 것',
        theme: '기대와 목표',
        description: '지금 어디에 있고 치료가 끝날 때 어디에 가고 싶은지 보여주는 지도나 경로를 그려보세요.',
        drawingPrompt: '시각적 지도나 경로를 만드세요. 지금 어디에 있는지 한 기호로, 어디에 있고 싶은지 다른 기호로 표시하세요.'
      },
      uk: {
        title: 'Чого я очікую від цієї подорожі',
        theme: 'Очікування та цілі',
        description: 'Намалюйте карту або шлях, що показує, де ви зараз і куди хочете прийти наприкінці терапії.',
        drawingPrompt: 'Створіть візуальну карту або шлях. Позначте, де ви зараз, одним символом, а де хочете бути — іншим.'
      },
      pl: {
        title: 'Czego oczekuję od tej podróży',
        theme: 'Oczekiwania i cele',
        description: 'Narysuj mapę lub ścieżkę pokazującą, gdzie jesteś teraz i gdzie chcesz być na końcu terapii.',
        drawingPrompt: 'Stwórz wizualną mapę lub ścieżkę. Zaznacz, gdzie jesteś teraz jednym symbolem, a gdzie chcesz być innym.'
      }
    }
  },

  {
    id: 3,
    module: 1,
    icon: '🎨',
    color: '#F59E0B',
    estimatedDuration: 30,
    focusAreas: ['self-expression', 'identity', 'color-psychology'],
    translations: {
      en: {
        title: 'Three Colors That Are Me',
        theme: 'Self-Expression Through Color',
        description: 'Choose three colors that represent different parts of you. Use only these colors to create something.',
        drawingPrompt: 'Choose three colors that feel like you. Create an image using only these three colors.'
      },
      ka: {
        title: 'სამი ფერი რომელიც მე ვარ',
        theme: 'თვითგამოხატვა ფერით',
        description: 'აირჩიე სამი ფერი რომელიც წარმოადგენს შენი პიროვნების სხვადასხვა ნაწილს. გამოიყენე მხოლოდ ეს ფერები.',
        drawingPrompt: 'აირჩიე სამი ფერი რომელიც შენ გგავს. შექმენი სურათი მხოლოდ ამ სამი ფერით.'
      },
      ru: {
        title: 'Три цвета, которые я',
        theme: 'Самовыражение через цвет',
        description: 'Выберите три цвета, представляющие разные части вас. Используйте только эти цвета.',
        drawingPrompt: 'Выберите три цвета, которые ощущаются как вы. Создайте изображение, используя только эти три цвета.'
      },
      hy: {
        title: 'Երեք գույն որ ես եմ',
        theme: 'Ինքնարտահայտում գույնով',
        description: 'Ընտրեք երեք գույն՝ ներկայացնելով ձեր տարբեր կողմերը: Օգտագործեք միայն այս գույները:',
        drawingPrompt: 'Ընտրեք երեք գույն որ զգում եք որ դուք եք: Ստեղծեք պատկեր միայն այս երեք գույներով:'
      },
      tr: {
        title: 'Beni Temsil Eden Üç Renk',
        theme: 'Renkle Kendini İfade',
        description: 'Senin farklı yönlerini temsil eden üç renk seç. Sadece bu renkleri kullan.',
        drawingPrompt: 'Sen gibi hissettiren üç renk seç. Sadece bu üç rengi kullanarak bir görsel oluştur.'
      },
      az: {
        title: 'Məni Təmsil Edən Üç Rəng',
        theme: 'Rənglə Özünü İfadə',
        description: 'Sizin müxtəlif tərəflərinizi təmsil edən üç rəng seçin. Yalnız bu rəngləri istifadə edin.',
        drawingPrompt: 'Sizin kimi hiss olunan üç rəng seçin. Yalnız bu üç rəngdən istifadə edərək təsvir yaradın.'
      },
      es: {
        title: 'Tres Colores Que Soy Yo',
        theme: 'Autoexpresión A Través Del Color',
        description: 'Elige tres colores que representen diferentes partes de ti. Usa solo estos colores.',
        drawingPrompt: 'Elige tres colores que sientas como tú. Crea una imagen usando solo estos tres colores.'
      },
      de: {
        title: 'Drei Farben Die Ich Bin',
        theme: 'Selbstausdruck Durch Farbe',
        description: 'Wähle drei Farben, die verschiedene Teile von dir repräsentieren. Verwende nur diese Farben.',
        drawingPrompt: 'Wähle drei Farben, die sich wie du anfühlen. Erstelle ein Bild nur mit diesen drei Farben.'
      },
      fr: {
        title: 'Trois Couleurs Qui Me Représentent',
        theme: 'Expression De Soi Par La Couleur',
        description: 'Choisis trois couleurs représentant différentes parties de toi. Utilise uniquement ces couleurs.',
        drawingPrompt: 'Choisis trois couleurs qui te ressemblent. Crée une image en utilisant uniquement ces trois couleurs.'
      },
      pt: {
        title: 'Três Cores Que Sou Eu',
        theme: 'Autoexpressão Através Da Cor',
        description: 'Escolha três cores que representam diferentes partes de você. Use apenas essas cores.',
        drawingPrompt: 'Escolha três cores que se sentem como você. Crie uma imagem usando apenas essas três cores.'
      },
      id: {
        title: 'Tiga Warna Yang Adalah Aku',
        theme: 'Ekspresi Diri Melalui Warna',
        description: 'Pilih tiga warna yang mewakili berbagai bagian dari dirimu. Gunakan hanya warna-warna ini.',
        drawingPrompt: 'Pilih tiga warna yang terasa seperti dirimu. Buat gambar hanya menggunakan tiga warna ini.'
      },
      it: {
        title: 'Tre Colori Che Sono Io',
        theme: 'Autoespressione Attraverso Il Colore',
        description: 'Scegli tre colori che rappresentano diverse parti di te. Usa solo questi colori.',
        drawingPrompt: 'Scegli tre colori che ti sembrano come te. Crea un\'immagine usando solo questi tre colori.'
      },
      ar: {
        title: 'ثلاثة ألوان هي أنا',
        theme: 'التعبير عن الذات من خلال اللون',
        description: 'اختر ثلاثة ألوان تمثل أجزاء مختلفة منك. استخدم هذه الألوان فقط.',
        drawingPrompt: 'اختر ثلاثة ألوان تشعر أنها مثلك. أنشئ صورة باستخدام هذه الألوان الثلاثة فقط.'
      },
      hi: {
        title: 'तीन रंग जो मैं हूँ',
        theme: 'रंग के माध्यम से आत्म-अभिव्यक्ति',
        description: 'तीन रंग चुनें जो आपके विभिन्न हिस्सों का प्रतिनिधित्व करते हैं। केवल इन रंगों का उपयोग करें।',
        drawingPrompt: 'तीन रंग चुनें जो आपकी तरह महसूस होते हैं। केवल इन तीन रंगों का उपयोग करके एक छवि बनाएं।'
      },
      zh: {
        title: '代表我的三种颜色',
        theme: '通过颜色自我表达',
        description: '选择代表你不同部分的三种颜色。只使用这些颜色。',
        drawingPrompt: '选择三种感觉像你的颜色。只使用这三种颜色创建图像。'
      },
      ja: {
        title: '私を表す三つの色',
        theme: '色による自己表現',
        description: 'あなたの異なる部分を表す三つの色を選んでください。これらの色だけを使ってください。',
        drawingPrompt: 'あなたらしい三つの色を選んでください。この三つの色だけで画像を作成してください。'
      },
      ko: {
        title: '나를 나타내는 세 가지 색',
        theme: '색을 통한 자기 표현',
        description: '당신의 다른 부분을 나타내는 세 가지 색을 선택하세요. 이 색만 사용하세요.',
        drawingPrompt: '당신처럼 느껴지는 세 가지 색을 선택하세요. 이 세 가지 색만 사용하여 이미지를 만드세요.'
      },
      uk: {
        title: 'Три кольори, які я',
        theme: 'Самовираження через колір',
        description: 'Виберіть три кольори, що представляють різні частини вас. Використовуйте тільки ці кольори.',
        drawingPrompt: 'Виберіть три кольори, які відчуваються як ви. Створіть зображення, використовуючи лише ці три кольори.'
      },
      pl: {
        title: 'Trzy Kolory Które Są Mną',
        theme: 'Wyrażanie Siebie Przez Kolor',
        description: 'Wybierz trzy kolory reprezentujące różne części ciebie. Użyj tylko tych kolorów.',
        drawingPrompt: 'Wybierz trzy kolory, które czujesz jak ty. Stwórz obraz używając tylko tych trzech kolorów.'
      }
    }
  },

  {
    id: 4,
    module: 1,
    icon: '✨',
    color: '#8B5CF6',
    estimatedDuration: 35,
    focusAreas: ['identity', 'self-worth', 'personal-power'],
    translations: {
      en: {
        title: 'Energy Of My Name',
        theme: 'Personal Identity',
        description: 'Write your name in any style. Decorate it, color it, make it express how you feel about yourself.',
        drawingPrompt: 'Write your name in the center. Surround it with colors, symbols, or patterns that represent your energy.'
      },
      ka: {
        title: 'ჩემი სახელის ენერგია',
        theme: 'პიროვნული იდენტობა',
        description: 'დაწერე შენი სახელი ნებისმიერი სტილით. გაარჩევი, გააფერადე, გამოხატე როგორ გრძნობ თავს.',
        drawingPrompt: 'დაწერე შენი სახელი ცენტრში. შემოხაზე ფერებით, სიმბოლოებით ან ნიმუშებით რომლებიც შენს ენერგიას წარმოადგენს.'
      },
      ru: {
        title: 'Энергия моего имени',
        theme: 'Личная идентичность',
        description: 'Напишите свое имя в любом стиле. Украсьте, раскрасьте, выразите, как вы себя чувствуете.',
        drawingPrompt: 'Напишите свое имя в центре. Окружите его цветами, символами или узорами, представляющими вашу энергию.'
      },
      hy: {
        title: 'Իմ անվան էներգիան',
        theme: 'Անձնական ինքնություն',
        description: 'Գրեք ձեր անունը ցանկացած ոճով: Զարդարեք, գունավորեք, արտահայտեք թե ինչպես եք զգում ձեզ:',
        drawingPrompt: 'Գրեք ձեր անունը կենտրոնում: Շրջապատեք գույներով, խորհրդանիշներով կամ նմուշներով որ ներկայացնում են ձեր էներգիան:'
      },
      tr: {
        title: 'Adımın Enerjisi',
        theme: 'Kişisel Kimlik',
        description: 'Adını istediğin stilde yaz. Süsle, renklendir, kendin hakkında nasıl hissettiğini ifade et.',
        drawingPrompt: 'Adını ortaya yaz. Enerjini temsil eden renkler, semboller veya desenlerle çevrele.'
      },
      az: {
        title: 'Adımın Enerjisi',
        theme: 'Şəxsi Kimlik',
        description: 'Adınızı istənilən üslubda yazın. Bəzəyin, rəngləyin, özünüz haqqında necə hiss etdiyinizi ifadə edin.',
        drawingPrompt: 'Adınızı mərkəzdə yazın. Enercinizi təmsil edən rənglər, simvollar və ya naxışlarla əhatə edin.'
      },
      es: {
        title: 'Energía De Mi Nombre',
        theme: 'Identidad Personal',
        description: 'Escribe tu nombre en cualquier estilo. Decóralo, coloréalo, haz que exprese cómo te sientes contigo mismo.',
        drawingPrompt: 'Escribe tu nombre en el centro. Rodéalo con colores, símbolos o patrones que representen tu energía.'
      },
      de: {
        title: 'Energie Meines Namens',
        theme: 'Persönliche Identität',
        description: 'Schreibe deinen Namen in beliebigem Stil. Dekoriere, färbe, drücke aus, wie du dich fühlst.',
        drawingPrompt: 'Schreibe deinen Namen in die Mitte. Umgebe ihn mit Farben, Symbolen oder Mustern, die deine Energie darstellen.'
      },
      fr: {
        title: 'Énergie De Mon Nom',
        theme: 'Identité Personnelle',
        description: 'Écris ton nom dans n\'importe quel style. Décore-le, colore-le, fais-le exprimer ce que tu ressens.',
        drawingPrompt: 'Écris ton nom au centre. Entoure-le de couleurs, symboles ou motifs qui représentent ton énergie.'
      },
      pt: {
        title: 'Energia Do Meu Nome',
        theme: 'Identidade Pessoal',
        description: 'Escreva seu nome em qualquer estilo. Decore, colora, faça expressar como você se sente.',
        drawingPrompt: 'Escreva seu nome no centro. Cerque-o com cores, símbolos ou padrões que representam sua energia.'
      },
      id: {
        title: 'Energi Namaku',
        theme: 'Identitas Pribadi',
        description: 'Tulis namamu dalam gaya apa pun. Hiasi, warnai, buat mengekspresikan perasaanmu tentang dirimu.',
        drawingPrompt: 'Tulis namamu di tengah. Kelilingi dengan warna, simbol, atau pola yang mewakili energimu.'
      },
      it: {
        title: 'Energia Del Mio Nome',
        theme: 'Identità Personale',
        description: 'Scrivi il tuo nome in qualsiasi stile. Decoralo, coloralo, fallo esprimere come ti senti.',
        drawingPrompt: 'Scrivi il tuo nome al centro. Circondalo con colori, simboli o motivi che rappresentano la tua energia.'
      },
      ar: {
        title: 'طاقة اسمي',
        theme: 'الهوية الشخصية',
        description: 'اكتب اسمك بأي أسلوب. زينه، لونه، اجعله يعبر عن شعورك تجاه نفسك.',
        drawingPrompt: 'اكتب اسمك في المركز. أحطه بالألوان أو الرموز أو الأنماط التي تمثل طاقتك.'
      },
      hi: {
        title: 'मेरे नाम की ऊर्जा',
        theme: 'व्यक्तिगत पहचान',
        description: 'अपना नाम किसी भी शैली में लिखें। इसे सजाएं, रंग दें, इसे व्यक्त करें कि आप अपने बारे में कैसा महसूस करते हैं।',
        drawingPrompt: 'अपना नाम केंद्र में लिखें। इसे रंगों, प्रतीकों या पैटर्न से घेरें जो आपकी ऊर्जा का प्रतिनिधित्व करते हैं।'
      },
      zh: {
        title: '我名字的能量',
        theme: '个人身份',
        description: '用任何风格写下你的名字。装饰它，给它上色，让它表达你对自己的感受。',
        drawingPrompt: '在中心写下你的名字。用代表你能量的颜色、符号或图案围绕它。'
      },
      ja: {
        title: '私の名前のエネルギー',
        theme: '個人的アイデンティティ',
        description: '任意のスタイルで自分の名前を書いてください。装飾し、色を付け、自分についてどう感じているかを表現してください。',
        drawingPrompt: '中央に名前を書いてください。あなたのエネルギーを表す色、シンボル、パターンで囲んでください。'
      },
      ko: {
        title: '내 이름의 에너지',
        theme: '개인 정체성',
        description: '어떤 스타일로든 이름을 쓰세요. 장식하고, 색칠하고, 자신에 대한 느낌을 표현하세요.',
        drawingPrompt: '중앙에 이름을 쓰세요. 당신의 에너지를 나타내는 색상, 기호 또는 패턴으로 둘러싸세요.'
      },
      uk: {
        title: 'Енергія мого імені',
        theme: 'Особиста ідентичність',
        description: 'Напишіть своє ім\'я в будь-якому стилі. Прикрасьте, розфарбуйте, виразіть, як ви себе почуваєте.',
        drawingPrompt: 'Напишіть своє ім\'я в центрі. Оточіть його кольорами, символами або візерунками, що представляють вашу енергію.'
      },
      pl: {
        title: 'Energia Mojego Imienia',
        theme: 'Tożsamość Osobista',
        description: 'Napisz swoje imię w dowolnym stylu. Udekoruj, pokoloruj, spraw by wyrażało jak się czujesz.',
        drawingPrompt: 'Napisz swoje imię w środku. Otocz kolorami, symbolami lub wzorami reprezentującymi twoją energię.'
      }
    }
  },

  {
    id: 5,
    module: 1,
    icon: '🪞',
    color: '#EC4899',
    estimatedDuration: 40,
    focusAreas: ['self-perception', 'identity', 'self-awareness'],
    translations: {
      en: {
        title: 'First Self-Portrait',
        theme: 'How I See Myself',
        description: 'Draw yourself as you see yourself right now. Not how others see you, but how YOU see yourself.',
        drawingPrompt: 'Create a self-portrait. It can be realistic, abstract, symbolic - whatever feels right to express how you see yourself now.'
      },
      ka: {
        title: 'პირველი ავტოპორტრეტი',
        theme: 'როგორ ვხედავ ჩემს თავს',
        description: 'დახატე შენი თავი როგორც ხედავ ახლა. არა როგორც სხვები გხედავენ, არამედ როგორც შენ ხედავ თავს.',
        drawingPrompt: 'შექმენი ავტოპორტრეტი. შეიძლება იყოს რეალისტური, აბსტრაქტული, სიმბოლური - რაც სწორად გეჩვენება გამოხატოს როგორ ხედავ თავს ახლა.'
      },
      ru: {
        title: 'Первый автопортрет',
        theme: 'Как я вижу себя',
        description: 'Нарисуйте себя таким, каким видите себя сейчас. Не таким, каким вас видят другие, а каким ВЫ видите себя.',
        drawingPrompt: 'Создайте автопортрет. Он может быть реалистичным, абстрактным, символическим - что угодно, что правильно выражает, как вы видите себя сейчас.'
      },
      hy: {
        title: 'Առաջին ինքնանկարը',
        theme: 'Ինչպես եմ տեսնում ինձ',
        description: 'Նկարեք ինքներդ ձեզ այնպես ինչպես տեսնում եք հիմա: Ոչ թե ինչպես ուրիշները տեսնում են, այլ ինչպես ԴՈւք տեսնում եք ձեզ:',
        drawingPrompt: 'Ստեղծեք ինքնանկար: Կարող է լինել ռեալիստական, աբստրակտ, խորհրդանշական - ինչ էլ որ ճիշտ է զգում արտահայտելու ինչպես եք տեսնում ձեզ հիմա:'
      },
      tr: {
        title: 'İlk Otoportre',
        theme: 'Kendimi Nasıl Görüyorum',
        description: 'Kendini şu an nasıl gördüğünü çiz. Başkalarının seni nasıl gördüğünü değil, SEN kendini nasıl görüyorsun.',
        drawingPrompt: 'Bir otoportre oluştur. Gerçekçi, soyut, sembolik olabilir - kendini şu an nasıl gördüğünü ifade etmek için doğru hissettiren her şey.'
      },
      az: {
        title: 'İlk Avtoportret',
        theme: 'Özümü Necə Görürəm',
        description: 'Özünüzü indi necə gördüyünüzü çəkin. Başqalarının sizi necə gördüyünü yox, SİZ özünüzü necə görürsünüz.',
        drawingPrompt: 'Avtoportret yaradın. Realist, abstrakt, simvolik ola bilər - indi özünüzü necə gördüyünüzü ifadə etmək üçün düzgün hiss olunan hər şey.'
      },
      es: {
        title: 'Primer Autorretrato',
        theme: 'Cómo Me Veo A Mí Mismo',
        description: 'Dibújate como te ves ahora. No como te ven otros, sino como TÚ te ves.',
        drawingPrompt: 'Crea un autorretrato. Puede ser realista, abstracto, simbólico - lo que sea que se sienta correcto para expresar cómo te ves ahora.'
      },
      de: {
        title: 'Erstes Selbstporträt',
        theme: 'Wie Ich Mich Sehe',
        description: 'Zeichne dich selbst so, wie du dich jetzt siehst. Nicht wie andere dich sehen, sondern wie DU dich siehst.',
        drawingPrompt: 'Erstelle ein Selbstporträt. Es kann realistisch, abstrakt, symbolisch sein - was auch immer sich richtig anfühlt, um auszudrücken, wie du dich jetzt siehst.'
      },
      fr: {
        title: 'Premier Autoportrait',
        theme: 'Comment Je Me Vois',
        description: 'Dessine-toi comme tu te vois maintenant. Pas comme les autres te voient, mais comme TOI tu te vois.',
        drawingPrompt: 'Crée un autoportrait. Il peut être réaliste, abstrait, symbolique - tout ce qui semble juste pour exprimer comment tu te vois maintenant.'
      },
      pt: {
        title: 'Primeiro Autorretrato',
        theme: 'Como Me Vejo',
        description: 'Desenhe-se como você se vê agora. Não como outros te veem, mas como VOCÊ se vê.',
        drawingPrompt: 'Crie um autorretrato. Pode ser realista, abstrato, simbólico - o que parecer certo para expressar como você se vê agora.'
      },
      id: {
        title: 'Potret Diri Pertama',
        theme: 'Bagaimana Aku Melihat Diriku',
        description: 'Gambar dirimu seperti yang kamu lihat sekarang. Bukan bagaimana orang lain melihatmu, tapi bagaimana KAMU melihat dirimu.',
        drawingPrompt: 'Buat potret diri. Bisa realistis, abstrak, simbolis - apa pun yang terasa tepat untuk mengekspresikan bagaimana kamu melihat dirimu sekarang.'
      },
      it: {
        title: 'Primo Autoritratto',
        theme: 'Come Mi Vedo',
        description: 'Disegnati come ti vedi ora. Non come ti vedono gli altri, ma come TU ti vedi.',
        drawingPrompt: 'Crea un autoritratto. Può essere realistico, astratto, simbolico - qualsiasi cosa sembri giusta per esprimere come ti vedi ora.'
      },
      ar: {
        title: 'الصورة الذاتية الأولى',
        theme: 'كيف أرى نفسي',
        description: 'ارسم نفسك كما تراها الآن. ليس كما يراك الآخرون، بل كما ترى نفسك أنت.',
        drawingPrompt: 'أنشئ صورة ذاتية. يمكن أن تكون واقعية، مجردة، رمزية - أي شيء يبدو صحيحًا للتعبير عن كيف ترى نفسك الآن.'
      },
      hi: {
        title: 'पहली आत्म-चित्र',
        theme: 'मैं खुद को कैसे देखता हूँ',
        description: 'अपने आप को वैसे बनाएं जैसे आप अभी देखते हैं। जैसे दूसरे देखते हैं वैसे नहीं, बल्कि आप खुद को कैसे देखते हैं।',
        drawingPrompt: 'एक आत्म-चित्र बनाएं। यह यथार्थवादी, अमूर्त, प्रतीकात्मक हो सकता है - जो कुछ भी व्यक्त करने के लिए सही लगे कि आप अभी खुद को कैसे देखते हैं।'
      },
      zh: {
        title: '第一幅自画像',
        theme: '我如何看待自己',
        description: '画出你现在看到的自己。不是别人怎么看你，而是你如何看待自己。',
        drawingPrompt: '创作一幅自画像。可以是写实的、抽象的、象征性的——任何感觉能正确表达你现在如何看待自己的方式。'
      },
      ja: {
        title: '最初の自画像',
        theme: '自分をどう見ているか',
        description: '今の自分をどう見ているか描いてください。他人があなたを見ているようにではなく、あなた自身がどう見ているか。',
        drawingPrompt: '自画像を作成してください。リアル、抽象、象徴的など、今の自分をどう見ているかを表現するのに正しいと感じるもの何でも。'
      },
      ko: {
        title: '첫 번째 자화상',
        theme: '내가 나를 보는 방법',
        description: '지금 자신을 어떻게 보는지 그려보세요. 다른 사람들이 당신을 어떻게 보는지가 아니라, 당신이 자신을 어떻게 보는지.',
        drawingPrompt: '자화상을 만드세요. 사실적, 추상적, 상징적일 수 있습니다 - 지금 자신을 어떻게 보는지 표현하는 데 옳다고 느껴지는 것이면 무엇이든.'
      },
      uk: {
        title: 'Перший автопортрет',
        theme: 'Як я бачу себе',
        description: 'Намалюйте себе таким, яким бачите себе зараз. Не таким, яким вас бачать інші, а яким ВИ бачите себе.',
        drawingPrompt: 'Створіть автопортрет. Він може бути реалістичним, абстрактним, символічним - що завгодно, що правильно виражає, як ви бачите себе зараз.'
      },
      pl: {
        title: 'Pierwszy Autoportret',
        theme: 'Jak Widzę Siebie',
        description: 'Narysuj siebie takim, jakim widzisz się teraz. Nie takim, jakim widzą cię inni, ale jak TY widzisz siebie.',
        drawingPrompt: 'Stwórz autoportret. Może być realistyczny, abstrakcyjny, symboliczny - cokolwiek czujesz że jest właściwe, aby wyrazić jak widzisz siebie teraz.'
      }
    }
  },

  // ==========================================
  // MODULE 2: INNER CHILD & CHILDHOOD TRAUMA
  // ==========================================
  {
    id: 6,
    module: 2,
    icon: '👶',
    color: '#F59E0B',
    estimatedDuration: 45,
    focusAreas: ['inner-child', 'childhood-memories', 'regression'],
    translations: {
      en: {
        title: 'Me At Age 5',
        theme: 'Inner Child Connection',
        description: 'Draw yourself when you were 5 years old. What did you look like? What did you love to do?',
        drawingPrompt: 'Draw yourself as a 5-year-old child. Include what you loved, what made you happy at that age.'
      },
      ka: {
        title: 'მე 5 წლის ასაკში',
        theme: 'შიდა ბავშვთან კავშირი',
        description: 'დახატე შენი თავი როდესაც 5 წლის იყავი. როგორ გამოიყურებოდი? რას უყვარდი?',
        drawingPrompt: 'დახატე შენი თავი 5 წლის ბავშვად. ჩართე რაც გიყვარდა, რაც გახარებდა იმ ასაკში.'
      },
      ru: {
        title: 'Я в 5 лет',
        theme: 'Связь с внутренним ребенком',
        description: 'Нарисуйте себя в 5 лет. Как вы выглядели? Что любили делать?',
        drawingPrompt: 'Нарисуйте себя пятилетним ребенком. Включите то, что вы любили, что делало вас счастливым в том возрасте.'
      },
      hy: {
        title: 'Ես 5 տարեկանում',
        theme: 'Ներքին երեխայի հետ կապ',
        description: 'Նկարեք ձեզ երբ 5 տարեկան էիք: Ինչպիսի էիք: Ինչ էիք սիրում անել:',
        drawingPrompt: 'Նկարեք ձեզ որպես 5 տարեկան երեխա: Ներառեք ինչ էիք սիրում, ինչը ձեզ երջանիկ էր դարձնում այդ տարիքում:'
      },
      tr: {
        title: '5 Yaşındaki Ben',
        theme: 'İç Çocukla Bağlantı',
        description: '5 yaşındayken kendini çiz. Nasıl görünüyordun? Ne yapmayı seviyordun?',
        drawingPrompt: 'Kendini 5 yaşında bir çocuk olarak çiz. O yaşta neyi sevdiğini, seni mutlu eden şeyi dahil et.'
      },
      az: {
        title: '5 Yaşımda Mən',
        theme: 'Daxili Uşaqla Əlaqə',
        description: '5 yaşında olduğunuz zaman özünüzü çəkin. Necə görünürdünüz? Nə etməyi sevirdiniz?',
        drawingPrompt: 'Özünüzü 5 yaşlı uşaq kimi çəkin. O yaşda nəyi sevdiyinizi, sizi xoşbəxt edən şeyi daxil edin.'
      },
      es: {
        title: 'Yo A Los 5 Años',
        theme: 'Conexión Con El Niño Interior',
        description: 'Dibújate cuando tenías 5 años. ¿Cómo eras? ¿Qué te gustaba hacer?',
        drawingPrompt: 'Dibújate como un niño de 5 años. Incluye lo que amabas, lo que te hacía feliz a esa edad.'
      },
      de: {
        title: 'Ich Mit 5 Jahren',
        theme: 'Verbindung Zum Inneren Kind',
        description: 'Zeichne dich mit 5 Jahren. Wie sahst du aus? Was hast du gerne gemacht?',
        drawingPrompt: 'Zeichne dich als 5-jähriges Kind. Füge hinzu, was du liebtest, was dich in diesem Alter glücklich machte.'
      },
      fr: {
        title: 'Moi À 5 Ans',
        theme: 'Connexion Avec L\'enfant Intérieur',
        description: 'Dessine-toi à 5 ans. À quoi ressemblais-tu? Qu\'aimais-tu faire?',
        drawingPrompt: 'Dessine-toi comme un enfant de 5 ans. Inclus ce que tu aimais, ce qui te rendait heureux à cet âge.'
      },
      pt: {
        title: 'Eu Aos 5 Anos',
        theme: 'Conexão Com A Criança Interior',
        description: 'Desenhe-se quando tinha 5 anos. Como você era? O que amava fazer?',
        drawingPrompt: 'Desenhe-se como uma criança de 5 anos. Inclua o que você amava, o que te fazia feliz naquela idade.'
      },
      id: {
        title: 'Aku Di Usia 5 Tahun',
        theme: 'Koneksi Anak Batin',
        description: 'Gambar dirimu saat berusia 5 tahun. Seperti apa penampilanmu? Apa yang kamu suka lakukan?',
        drawingPrompt: 'Gambar dirimu sebagai anak berusia 5 tahun. Sertakan apa yang kamu cintai, apa yang membuatmu bahagia di usia itu.'
      },
      it: {
        title: 'Io A 5 Anni',
        theme: 'Connessione Con Il Bambino Interiore',
        description: 'Disegnati quando avevi 5 anni. Come eri? Cosa amavi fare?',
        drawingPrompt: 'Disegnati come un bambino di 5 anni. Includi ciò che amavi, ciò che ti rendeva felice a quell\'età.'
      },
      ar: {
        title: 'أنا في سن الخامسة',
        theme: 'الاتصال بالطفل الداخلي',
        description: 'ارسم نفسك عندما كنت في الخامسة من عمرك. كيف كنت تبدو؟ ماذا كنت تحب أن تفعل؟',
        drawingPrompt: 'ارسم نفسك كطفل في الخامسة من عمره. قم بتضمين ما كنت تحبه، ما جعلك سعيدًا في ذلك العمر.'
      },
      hi: {
        title: 'मैं 5 साल की उम्र में',
        theme: 'आंतरिक बच्चे से संबंध',
        description: 'अपने आप को 5 साल की उम्र में बनाएं। आप कैसे दिखते थे? आपको क्या करना पसंद था?',
        drawingPrompt: '5 साल के बच्चे के रूप में अपने आप को बनाएं। उस उम्र में आप क्या प्यार करते थे, क्या आपको खुश करता था, शामिल करें।'
      },
      zh: {
        title: '5岁的我',
        theme: '与内在小孩的连接',
        description: '画出5岁时的你。你长什么样？喜欢做什么？',
        drawingPrompt: '画出5岁的自己。包括你喜欢的东西，那个年龄让你快乐的事情。'
      },
      ja: {
        title: '5歳の私',
        theme: '内なる子どもとのつながり',
        description: '5歳の時の自分を描いてください。どんな見た目でしたか？何をするのが好きでしたか？',
        drawingPrompt: '5歳の子どもとして自分を描いてください。その年齢で愛していたもの、幸せにしてくれたものを含めてください。'
      },
      ko: {
        title: '5살 때의 나',
        theme: '내면 아이와의 연결',
        description: '5살 때의 자신을 그려보세요. 어떻게 생겼나요? 무엇을 하길 좋아했나요?',
        drawingPrompt: '5살 어린이로서 자신을 그려보세요. 그 나이에 사랑했던 것, 행복하게 만든 것을 포함하세요.'
      },
      uk: {
        title: 'Я у 5 років',
        theme: 'Зв\'язок з внутрішньою дитиною',
        description: 'Намалюйте себе в 5 років. Як ви виглядали? Що любили робити?',
        drawingPrompt: 'Намалюйте себе п\'ятирічною дитиною. Включіть те, що ви любили, що робило вас щасливим у тому віці.'
      },
      pl: {
        title: 'Ja W Wieku 5 Lat',
        theme: 'Połączenie Z Wewnętrznym Dzieckiem',
        description: 'Narysuj siebie w wieku 5 lat. Jak wyglądałeś? Co lubiłeś robić?',
        drawingPrompt: 'Narysuj siebie jako 5-letnie dziecko. Uwzględnij to, co kochałeś, co czyniło cię szczęśliwym w tym wieku.'
      }
    }
  },

  {
    id: 7,
    module: 2,
    icon: '🤗',
    color: '#14B8A6',
    estimatedDuration: 40,
    focusAreas: ['inner-child', 'needs', 'emotional-healing'],
    translations: {
      en: {
        title: 'What That Child Needed',
        theme: 'Unmet Childhood Needs',
        description: 'Think about what you needed as a child but didn\'t receive. Draw it.',
        drawingPrompt: 'Draw what your inner child needed. It could be love, safety, attention, play, understanding - whatever you needed most.'
      },
      ka: {
        title: 'რა სჭირდებოდა იმ ბავშვს',
        theme: 'დაუკმაყოფილებელი ბავშვობის საჭიროებები',
        description: 'იფიქრე რა გჭირდებოდა ბავშვობაში მაგრამ არ მიგიღია. დახატე ეს.',
        drawingPrompt: 'დახატე რა სჭირდებოდა შენს შიდა ბავშვს. შეიძლება იყოს სიყვარული, უსაფრთხოება, ყურადღება, თამაში, გაგება - რაც ყველაზე მეტად გჭირდებოდა.'
      },
      ru: {
        title: 'Что нужно было тому ребенку',
        theme: 'Неудовлетворенные детские потребности',
        description: 'Подумайте, что вам было нужно в детстве, но вы не получили. Нарисуйте это.',
        drawingPrompt: 'Нарисуйте то, что нужно было вашему внутреннему ребенку. Это может быть любовь, безопасность, внимание, игра, понимание - все, что вам было нужно больше всего.'
      },
      hy: {
        title: 'Ինչ էր պետք այդ երեխային',
        theme: 'Չբավարարված մանկության կարիքներ',
        description: 'Մտածեք ինչ էր ձեզ պետք երեխայի համար բայց չստացաք: Նկարեք այն:',
        drawingPrompt: 'Նկարեք ինչ էր պետք ձեր ներքին երեխային: Կարող է լինել սեր, անվտանգություն, ուշադրություն, խաղ, հասկացողություն - ինչ էլ որ ամենաշատն էր պետք:'
      },
      tr: {
        title: 'O Çocuğun İhtiyacı Olan',
        theme: 'Karşılanmamış Çocukluk İhtiyaçları',
        description: 'Çocukken neye ihtiyacın olduğunu ama alamadığını düşün. Bunu çiz.',
        drawingPrompt: 'İç çocuğunun neye ihtiyacı olduğunu çiz. Sevgi, güvenlik, ilgi, oyun, anlayış olabilir - en çok neye ihtiyacın vardıysa.'
      },
      az: {
        title: 'O Uşağın Ehtiyacı Olan',
        theme: 'Qarşılanmamış Uşaqlıq Ehtiyacları',
        description: 'Uşaq olarkən nəyə ehtiyacınız olduğunu amma almadığınızı düşünün. Onu çəkin.',
        drawingPrompt: 'Daxili uşağınızın nəyə ehtiyacı olduğunu çəkin. Sevgi, təhlükəsizlik, diqqət, oyun, anlayış ola bilər - ən çox nəyə ehtiyacınız varsa.'
      },
      es: {
        title: 'Lo Que Ese Niño Necesitaba',
        theme: 'Necesidades Infantiles No Satisfechas',
        description: 'Piensa en lo que necesitabas de niño pero no recibiste. Dibújalo.',
        drawingPrompt: 'Dibuja lo que tu niño interior necesitaba. Podría ser amor, seguridad, atención, juego, comprensión - lo que más necesitabas.'
      },
      de: {
        title: 'Was Das Kind Brauchte',
        theme: 'Unerfüllte Kindheitsbedürfnisse',
        description: 'Denke darüber nach, was du als Kind gebraucht hast, aber nicht bekommen hast. Zeichne es.',
        drawingPrompt: 'Zeichne, was dein inneres Kind brauchte. Es könnte Liebe, Sicherheit, Aufmerksamkeit, Spiel, Verständnis sein - was du am meisten brauchtest.'
      },
      fr: {
        title: 'Ce Dont Cet Enfant Avait Besoin',
        theme: 'Besoins D\'enfance Non Satisfaits',
        description: 'Pense à ce dont tu avais besoin enfant mais que tu n\'as pas reçu. Dessine-le.',
        drawingPrompt: 'Dessine ce dont ton enfant intérieur avait besoin. Cela pourrait être de l\'amour, de la sécurité, de l\'attention, du jeu, de la compréhension - ce dont tu avais le plus besoin.'
      },
      pt: {
        title: 'O Que Aquela Criança Precisava',
        theme: 'Necessidades Infantis Não Atendidas',
        description: 'Pense no que você precisava quando criança mas não recebeu. Desenhe isso.',
        drawingPrompt: 'Desenhe o que sua criança interior precisava. Poderia ser amor, segurança, atenção, brincadeira, compreensão - o que você mais precisava.'
      },
      id: {
        title: 'Apa Yang Dibutuhkan Anak Itu',
        theme: 'Kebutuhan Masa Kecil Yang Tidak Terpenuhi',
        description: 'Pikirkan apa yang kamu butuhkan saat kecil tetapi tidak kamu dapatkan. Gambar itu.',
        drawingPrompt: 'Gambar apa yang dibutuhkan anak batinmu. Bisa jadi cinta, keamanan, perhatian, bermain, pengertian - apa pun yang paling kamu butuhkan.'
      },
      it: {
        title: 'Ciò Di Cui Quel Bambino Aveva Bisogno',
        theme: 'Bisogni Infantili Insoddisfatti',
        description: 'Pensa a ciò di cui avevi bisogno da bambino ma non hai ricevuto. Disegnalo.',
        drawingPrompt: 'Disegna ciò di cui il tuo bambino interiore aveva bisogno. Potrebbe essere amore, sicurezza, attenzione, gioco, comprensione - ciò di cui avevi più bisogno.'
      },
      ar: {
        title: 'ما احتاجه ذلك الطفل',
        theme: 'احتياجات الطفولة غير الملباة',
        description: 'فكر في ما كنت تحتاجه كطفل لكن لم تحصل عليه. ارسمه.',
        drawingPrompt: 'ارسم ما احتاجه طفلك الداخلي. يمكن أن يكون الحب، الأمان، الاهتمام، اللعب، الفهم - أي شيء كنت في أمس الحاجة إليه.'
      },
      hi: {
        title: 'उस बच्चे को क्या चाहिए था',
        theme: 'अपूर्ण बचपन की जरूरतें',
        description: 'सोचें कि बच्चे के रूप में आपको क्या चाहिए था लेकिन नहीं मिला। इसे बनाएं।',
        drawingPrompt: 'बनाएं कि आपके आंतरिक बच्चे को क्या चाहिए था। यह प्यार, सुरक्षा, ध्यान, खेल, समझ हो सकती है - जो भी आपको सबसे ज्यादा चाहिए था।'
      },
      zh: {
        title: '那个孩子需要什么',
        theme: '未满足的童年需求',
        description: '想想你小时候需要但没有得到的东西。画出来。',
        drawingPrompt: '画出你内在小孩需要的东西。可能是爱、安全、关注、玩耍、理解——你最需要的任何东西。'
      },
      ja: {
        title: 'その子どもが必要としていたもの',
        theme: '満たされなかった子ども時代のニーズ',
        description: '子どもの頃に必要だったけれど受け取れなかったものについて考えてください。それを描いてください。',
        drawingPrompt: '内なる子どもが必要としていたものを描いてください。愛、安全、注目、遊び、理解など、最も必要としていたもの。'
      },
      ko: {
        title: '그 아이가 필요했던 것',
        theme: '충족되지 않은 어린 시절의 욕구',
        description: '어렸을 때 필요했지만 받지 못한 것에 대해 생각해보세요. 그것을 그려보세요.',
        drawingPrompt: '내면 아이가 필요했던 것을 그려보세요. 사랑, 안전, 관심, 놀이, 이해일 수 있습니다 - 가장 필요했던 것이면 무엇이든.'
      },
      uk: {
        title: 'Що було потрібно тій дитині',
        theme: 'Незадоволені дитячі потреби',
        description: 'Подумайте, що вам було потрібно в дитинстві, але ви не отримали. Намалюйте це.',
        drawingPrompt: 'Намалюйте те, що було потрібно вашій внутрішній дитині. Це може бути любов, безпека, увага, гра, розуміння - все, що вам було потрібно найбільше.'
      },
      pl: {
        title: 'Czego To Dziecko Potrzebowało',
        theme: 'Niezaspokojone Potrzeby Dzieciństwa',
        description: 'Pomyśl o tym, czego potrzebowałeś jako dziecko, ale nie otrzymałeś. Narysuj to.',
        drawingPrompt: 'Narysuj to, czego potrzebowało twoje wewnętrzne dziecko. Może to być miłość, bezpieczeństwo, uwaga, zabawa, zrozumienie - cokolwiek było ci najbardziej potrzebne.'
      }
    }
  },

  {
    id: 8,
    module: 2,
    icon: '🏰',
    color: '#3B82F6',
    estimatedDuration: 35,
    focusAreas: ['inner-child', 'safety', 'sanctuary'],
    translations: {
      en: {
        title: 'Safe Place In Childhood',
        theme: 'Childhood Sanctuary',
        description: 'Was there a place where you felt completely safe as a child? Draw it. If there wasn\'t one, draw what it would have looked like.',
        drawingPrompt: 'Draw a place from childhood where you felt (or wished you felt) completely safe and protected.'
      },
      ka: {
        title: 'უსაფრთხო ადგილი ბავშვობაში',
        theme: 'ბავშვობის თავშესაფარი',
        description: 'იყო ადგილი სადაც სრულიად უსაფრთხოდ გრძნობდი თავს ბავშვობაში? დახატე. თუ არ იყო, დახატე როგორი იქნებოდა.',
        drawingPrompt: 'დახატე ადგილი ბავშვობიდან სადაც გრძნობდი (ან ისურვებდი რომ გრძნობდი) სრულიად უსაფრთხოდ და დაცულად.'
      },
      ru: {
        title: 'Безопасное место в детстве',
        theme: 'Детское убежище',
        description: 'Было ли место, где вы чувствовали себя в полной безопасности в детстве? Нарисуйте его. Если не было, нарисуйте, как оно могло бы выглядеть.',
        drawingPrompt: 'Нарисуйте место из детства, где вы чувствовали (или хотели бы чувствовать) себя в полной безопасности и защищенности.'
      },
      hy: {
        title: 'Անվտանգ վայր մանկության մեջ',
        theme: 'Մանկության ապաստան',
        description: 'Կա՞ր այնպիսի վայր որտեղ լիովին անվտանգ էիք զգում մանկության մեջ: Նկարեք այն: Եթե չկար, նկարեք ինչպիսին կլիներ:',
        drawingPrompt: 'Նկարեք մանկությունից վայր որտեղ զգում էիք (կամ կցանկանայիք զգալ) լիովին անվտանգ և պաշտպանված:'
      },
      tr: {
        title: 'Çocuklukta Güvenli Yer',
        theme: 'Çocukluk Sığınağı',
        description: 'Çocukken kendini tamamen güvende hissettiğin bir yer var mıydı? Çiz. Yoksa, nasıl olurdu çiz.',
        drawingPrompt: 'Çocukluktan kendini (veya hissetmeyi dilediğin) tamamen güvende ve korunaklı hissettiğin bir yer çiz.'
      },
      az: {
        title: 'Uşaqlıqda Təhlükəsiz Yer',
        theme: 'Uşaqlıq Sığınacağı',
        description: 'Uşaq olarkən özünüzü tamamilə təhlükəsiz hiss etdiyiniz yer var idimi? Çəkin. Yox idisə, necə olardı çəkin.',
        drawingPrompt: 'Uşaqlıqdan özünüzü (və ya hiss etməyi arzuladığınız) tamamilə təhlükəsiz və qorunan hiss etdiyiniz yeri çəkin.'
      },
      es: {
        title: 'Lugar Seguro En La Infancia',
        theme: 'Santuario De La Infancia',
        description: '¿Había un lugar donde te sentías completamente seguro de niño? Dibújalo. Si no lo había, dibuja cómo habría sido.',
        drawingPrompt: 'Dibuja un lugar de la infancia donde te sentiste (o deseaste sentirte) completamente seguro y protegido.'
      },
      de: {
        title: 'Sicherer Ort In Der Kindheit',
        theme: 'Kindheitsrefugium',
        description: 'Gab es einen Ort, an dem du dich als Kind völlig sicher gefühlt hast? Zeichne ihn. Wenn nicht, zeichne wie er ausgesehen hätte.',
        drawingPrompt: 'Zeichne einen Ort aus der Kindheit, an dem du dich (oder gewünscht hättest dich zu fühlen) völlig sicher und geschützt gefühlt hast.'
      },
      fr: {
        title: 'Lieu Sûr Dans L\'enfance',
        theme: 'Sanctuaire D\'enfance',
        description: 'Y avait-il un endroit où tu te sentais complètement en sécurité enfant? Dessine-le. S\'il n\'y en avait pas, dessine à quoi il aurait ressemblé.',
        drawingPrompt: 'Dessine un lieu de l\'enfance où tu te sentais (ou aurais souhaité te sentir) complètement en sécurité et protégé.'
      },
      pt: {
        title: 'Lugar Seguro Na Infância',
        theme: 'Santuário Da Infância',
        description: 'Havia um lugar onde você se sentia completamente seguro quando criança? Desenhe-o. Se não havia, desenhe como seria.',
        drawingPrompt: 'Desenhe um lugar da infância onde você se sentiu (ou desejou se sentir) completamente seguro e protegido.'
      },
      id: {
        title: 'Tempat Aman Di Masa Kecil',
        theme: 'Tempat Perlindungan Masa Kecil',
        description: 'Apakah ada tempat di mana kamu merasa benar-benar aman saat kecil? Gambar itu. Jika tidak ada, gambar seperti apa seharusnya.',
        drawingPrompt: 'Gambar tempat dari masa kecil di mana kamu merasa (atau berharap merasa) benar-benar aman dan terlindungi.'
      },
      it: {
        title: 'Luogo Sicuro Nell\'infanzia',
        theme: 'Santuario Dell\'infanzia',
        description: 'C\'era un posto dove ti sentivi completamente al sicuro da bambino? Disegnalo. Se non c\'era, disegna come sarebbe stato.',
        drawingPrompt: 'Disegna un luogo dell\'infanzia dove ti sei sentito (o avresti voluto sentirti) completamente al sicuro e protetto.'
      },
      ar: {
        title: 'مكان آمن في الطفولة',
        theme: 'ملاذ الطفولة',
        description: 'هل كان هناك مكان شعرت فيه بالأمان التام كطفل؟ ارسمه. إذا لم يكن هناك، ارسم كيف كان سيبدو.',
        drawingPrompt: 'ارسم مكانًا من الطفولة حيث شعرت (أو تمنيت أن تشعر) بالأمان والحماية التامة.'
      },
      hi: {
        title: 'बचपन में सुरक्षित स्थान',
        theme: 'बचपन की शरणस्थली',
        description: 'क्या कोई ऐसी जगह थी जहाँ आप बच्चे के रूप में पूरी तरह से सुरक्षित महसूस करते थे? इसे बनाएं। यदि नहीं था, तो यह कैसा होता इसे बनाएं।',
        drawingPrompt: 'बचपन से एक ऐसी जगह बनाएं जहाँ आपने महसूस किया (या महसूस करना चाहते थे) पूरी तरह से सुरक्षित और संरक्षित।'
      },
      zh: {
        title: '童年的安全之地',
        theme: '童年的庇护所',
        description: '小时候有没有一个让你感到完全安全的地方？画出来。如果没有，画出它本该是什么样子。',
        drawingPrompt: '画出童年时你感到（或希望感到）完全安全和受保护的地方。'
      },
      ja: {
        title: '子ども時代の安全な場所',
        theme: '子ども時代の聖域',
        description: '子どもの頃、完全に安全だと感じた場所はありましたか？それを描いてください。なかった場合は、どのような場所だったかを描いてください。',
        drawingPrompt: '子ども時代に完全に安全で守られていると感じた（または感じたかった）場所を描いてください。'
      },
      ko: {
        title: '어린 시절의 안전한 장소',
        theme: '어린 시절의 성역',
        description: '어렸을 때 완전히 안전하다고 느낀 장소가 있었나요? 그려보세요. 없었다면, 어떤 모습이었을지 그려보세요.',
        drawingPrompt: '어린 시절에 완전히 안전하고 보호받는다고 느꼈던 (또는 느끼고 싶었던) 장소를 그려보세요.'
      },
      uk: {
        title: 'Безпечне місце в дитинстві',
        theme: 'Дитяче притулок',
        description: 'Чи було місце, де ви почувалися в повній безпеці в дитинстві? Намалюйте його. Якщо не було, намалюйте, як воно могло б виглядати.',
        drawingPrompt: 'Намалюйте місце з дитинства, де ви почувалися (або хотіли б почуватися) у повній безпеці та захищеності.'
      },
      pl: {
        title: 'Bezpieczne Miejsce W Dzieciństwie',
        theme: 'Dziecięce Schronienie',
        description: 'Czy było miejsce, gdzie czułeś się całkowicie bezpiecznie jako dziecko? Narysuj je. Jeśli nie było, narysuj jak by wyglądało.',
        drawingPrompt: 'Narysuj miejsce z dzieciństwa, gdzie czułeś się (lub chciałeś się czuć) całkowicie bezpiecznie i chroniony.'
      }
    }
  },

  {
    id: 9,
    module: 2,
    icon: '😰',
    color: '#7C3AED',
    estimatedDuration: 45,
    focusAreas: ['inner-child', 'fear', 'trauma-processing'],
    translations: {
      en: {
        title: 'Childhood Fear',
        theme: 'Confronting Early Fears',
        description: 'What scared you most as a child? Give that fear a shape, color, form. Externalize it.',
        drawingPrompt: 'Draw the thing that scared you most in childhood. Give it visual form - it can be symbolic or literal.'
      },
      ka: {
        title: 'ბავშვობის შიში',
        theme: 'ადრეული შიშების დაძლევა',
        description: 'რა აშინებდა ყველაზე მეტად ბავშვობაში? მიეცი იმ შიშს ფორმა, ფერი, სახე. გამოიტანე გარედან.',
        drawingPrompt: 'დახატე რაც ბავშვობაში ყველაზე მეტად გაშინებდა. მიეცი ვიზუალური ფორმა - შეიძლება იყოს სიმბოლური ან პირდაპირი.'
      },
      ru: {
        title: 'Детский страх',
        theme: 'Противостояние ранним страхам',
        description: 'Что пугало вас больше всего в детстве? Придайте этому страху форму, цвет, вид. Экстернализируйте его.',
        drawingPrompt: 'Нарисуйте то, что пугало вас больше всего в детстве. Придайте этому визуальную форму - это может быть символическим или буквальным.'
      },
      hy: {
        title: 'Մանկական վախ',
        theme: 'Վաղ վախերի հաղթահարում',
        description: 'Ի՞նչն էր ձեզ ամենաշատ վախեցնում մանկության մեջ: Տվեք այդ վախին ձև, գույն, տեսք: Արտաքինացրեք այն:',
        drawingPrompt: 'Նկարեք ինչն էր ձեզ ամենաշատ վախեցնում մանկության մեջ: Տվեք տեսողական ձև - կարող է լինել խորհրդանշական կամ բառացի:'
      },
      tr: {
        title: 'Çocukluk Korkusu',
        theme: 'Erken Korkularla Yüzleşme',
        description: 'Çocukken seni en çok ne korkutuyordu? O korkuya bir şekil, renk, form ver. Dışsallaştır.',
        drawingPrompt: 'Çocukluğunda seni en çok korkutan şeyi çiz. Görsel bir form ver - sembolik veya gerçek olabilir.'
      },
      az: {
        title: 'Uşaqlıq Qorxusu',
        theme: 'Erkən Qorxularla Üzləşmə',
        description: 'Uşaq olarkən sizi ən çox nə qorxudurdu? O qorxuya şəkil, rəng, forma verin. Xaricləşdirin.',
        drawingPrompt: 'Uşaqlıqda sizi ən çox qorxudan şeyi çəkin. Vizual forma verin - simvolik və ya həqiqi ola bilər.'
      },
      es: {
        title: 'Miedo De La Infancia',
        theme: 'Confrontando Miedos Tempranos',
        description: '¿Qué te asustaba más de niño? Dale a ese miedo una forma, color, aspecto. Externalízalo.',
        drawingPrompt: 'Dibuja lo que más te asustaba en la infancia. Dale forma visual - puede ser simbólico o literal.'
      },
      de: {
        title: 'Kindheitsangst',
        theme: 'Frühe Ängste Konfrontieren',
        description: 'Was hat dich als Kind am meisten erschreckt? Gib dieser Angst eine Form, Farbe, Gestalt. Externalisiere sie.',
        drawingPrompt: 'Zeichne das, was dich in der Kindheit am meisten erschreckt hat. Gib ihm visuelle Form - es kann symbolisch oder wörtlich sein.'
      },
      fr: {
        title: 'Peur D\'enfance',
        theme: 'Affronter Les Peurs Précoces',
        description: 'Qu\'est-ce qui te faisait le plus peur enfant? Donne à cette peur une forme, une couleur, une apparence. Externalise-la.',
        drawingPrompt: 'Dessine ce qui te faisait le plus peur dans l\'enfance. Donne-lui une forme visuelle - elle peut être symbolique ou littérale.'
      },
      pt: {
        title: 'Medo Da Infância',
        theme: 'Confrontando Medos Precoces',
        description: 'O que mais te assustava quando criança? Dê a esse medo uma forma, cor, aspecto. Externalize-o.',
        drawingPrompt: 'Desenhe o que mais te assustava na infância. Dê-lhe forma visual - pode ser simbólico ou literal.'
      },
      id: {
        title: 'Ketakutan Masa Kecil',
        theme: 'Menghadapi Ketakutan Awal',
        description: 'Apa yang paling membuatmu takut saat kecil? Beri ketakutan itu bentuk, warna, rupa. Eksternalisasikan.',
        drawingPrompt: 'Gambar hal yang paling membuatmu takut di masa kecil. Beri bentuk visual - bisa simbolis atau literal.'
      },
      it: {
        title: 'Paura Dell\'infanzia',
        theme: 'Affrontare Le Paure Precoci',
        description: 'Cosa ti spaventava di più da bambino? Dai a quella paura una forma, colore, aspetto. Esternalizzala.',
        drawingPrompt: 'Disegna ciò che ti spaventava di più nell\'infanzia. Dalle forma visiva - può essere simbolica o letterale.'
      },
      ar: {
        title: 'خوف الطفولة',
        theme: 'مواجهة المخاوف المبكرة',
        description: 'ما الذي أخافك أكثر كطفل؟ أعط ذلك الخوف شكلاً ولوناً ومظهراً. اجعله خارجياً.',
        drawingPrompt: 'ارسم الشيء الذي أخافك أكثر في الطفولة. أعطه شكلاً بصرياً - يمكن أن يكون رمزياً أو حرفياً.'
      },
      hi: {
        title: 'बचपन का डर',
        theme: 'प्रारंभिक भय का सामना करना',
        description: 'बच्चे के रूप में आपको सबसे ज्यादा क्या डराता था? उस डर को एक आकार, रंग, रूप दें। इसे बाहरी बनाएं।',
        drawingPrompt: 'बचपन में आपको सबसे ज्यादा डराने वाली चीज़ बनाएं। इसे दृश्य रूप दें - यह प्रतीकात्मक या शाब्दिक हो सकता है।'
      },
      zh: {
        title: '童年的恐惧',
        theme: '面对早期恐惧',
        description: '小时候什么最让你害怕？给那个恐惧一个形状、颜色、形式。将它外化。',
        drawingPrompt: '画出童年时最让你害怕的东西。给它视觉形式——可以是象征性的或字面的。'
      },
      ja: {
        title: '子ども時代の恐怖',
        theme: '初期の恐怖に立ち向かう',
        description: '子どもの頃、最も怖かったものは何ですか？その恐怖に形、色、姿を与えてください。それを外在化してください。',
        drawingPrompt: '子ども時代に最も怖かったものを描いてください。視覚的な形を与えてください - 象徴的または文字通りでも構いません。'
      },
      ko: {
        title: '어린 시절의 두려움',
        theme: '초기 두려움에 맞서기',
        description: '어렸을 때 가장 두려웠던 것은 무엇인가요? 그 두려움에 모양, 색, 형태를 주세요. 외부화하세요.',
        drawingPrompt: '어린 시절 가장 두려웠던 것을 그려보세요. 시각적 형태를 주세요 - 상징적이거나 문자 그대로일 수 있습니다.'
      },
      uk: {
        title: 'Дитячий страх',
        theme: 'Протистояння раннім страхам',
        description: 'Що лякало вас найбільше в дитинстві? Надайте цьому страху форму, колір, вигляд. Екстерналізуйте його.',
        drawingPrompt: 'Намалюйте те, що лякало вас найбільше в дитинстві. Надайте цьому візуальну форму - це може бути символічним або буквальним.'
      },
      pl: {
        title: 'Dziecięcy Strach',
        theme: 'Konfrontacja Z Wczesnymi Lękami',
        description: 'Co cię najbardziej przerażało jako dziecko? Nadaj temu strachowi kształt, kolor, formę. Zewnętrznicz go.',
        drawingPrompt: 'Narysuj to, co najbardziej cię przerażało w dzieciństwie. Nadaj mu wizualną formę - może być symboliczna lub literalna.'
      }
    }
  },

  {
    id: 10,
    module: 2,
    icon: '💔',
    color: '#EF4444',
    estimatedDuration: 50,
    focusAreas: ['inner-child', 'trauma', 'emotional-wounds'],
    translations: {
      en: {
        title: 'Childhood Wound',
        theme: 'Early Emotional Injury',
        description: 'What hurt you deeply as a child? A moment, a pattern, a relationship? Draw this wound.',
        drawingPrompt: 'Visualize an emotional wound from childhood. It doesn\'t have to be literal - express it symbolically.'
      },
      ka: {
        title: 'ბავშვობის ჭრილობა',
        theme: 'ადრეული ემოციური ტრავმა',
        description: 'რამ გტკინა ღრმად ბავშვობაში? მომენტმა, ნიმუშმა, ურთიერთობამ? დახატე ეს ჭრილობა.',
        drawingPrompt: 'ვიზუალიზაცია გააკეთე ემოციურ ჭრილობას ბავშვობიდან. არ არის საჭირო იყოს პირდაპირი - გამოხატე სიმბოლურად.'
      },
      ru: {
        title: 'Детская рана',
        theme: 'Ранняя эмоциональная травма',
        description: 'Что причинило вам глубокую боль в детстве? Момент, паттерн, отношения? Нарисуйте эту рану.',
        drawingPrompt: 'Визуализируйте эмоциональную рану из детства. Она не обязательно должна быть буквальной - выразите ее символически.'
      },
      hy: {
        title: 'Մանկության վերք',
        theme: 'Վաղ հուզական վնասվածք',
        description: 'Ի՞նչն էր ձեզ խորն ցավեցնում մանկության մեջ: Պահ, նախշ, հարաբերություն: Նկարեք այս վերքը:',
        drawingPrompt: 'Վիզուալացրեք հուզական վերք մանկությունից: Պետք չէ լինի բառացի - արտահայտեք խորհրդանշական:'
      },
      tr: {
        title: 'Çocukluk Yarası',
        theme: 'Erken Duygusal Yaralanma',
        description: 'Çocukken seni derinden ne incitti? Bir an, bir kalıp, bir ilişki? Bu yarayı çiz.',
        drawingPrompt: 'Çocukluktan bir duygusal yarayı görselleştir. Gerçek olması gerekmiyor - sembolik olarak ifade et.'
      },
      az: {
        title: 'Uşaqlıq Yarası',
        theme: 'Erkən Emosional Zədə',
        description: 'Uşaq olarkən sizi dərindən nə incitdi? Bir an, nümunə, münasibət? Bu yaranı çəkin.',
        drawingPrompt: 'Uşaqlıqdan emosional yaranı vizuallaşdırın. Həqiqi olması lazım deyil - simvolik ifadə edin.'
      },
      es: {
        title: 'Herida De La Infancia',
        theme: 'Lesión Emocional Temprana',
        description: '¿Qué te hirió profundamente de niño? ¿Un momento, un patrón, una relación? Dibuja esta herida.',
        drawingPrompt: 'Visualiza una herida emocional de la infancia. No tiene que ser literal - exprésala simbólicamente.'
      },
      de: {
        title: 'Kindheitswunde',
        theme: 'Frühe Emotionale Verletzung',
        description: 'Was hat dich als Kind tief verletzt? Ein Moment, ein Muster, eine Beziehung? Zeichne diese Wunde.',
        drawingPrompt: 'Visualisiere eine emotionale Wunde aus der Kindheit. Sie muss nicht wörtlich sein - drücke sie symbolisch aus.'
      },
      fr: {
        title: 'Blessure D\'enfance',
        theme: 'Blessure Émotionnelle Précoce',
        description: 'Qu\'est-ce qui t\'a profondément blessé enfant? Un moment, un schéma, une relation? Dessine cette blessure.',
        drawingPrompt: 'Visualise une blessure émotionnelle de l\'enfance. Elle n\'a pas besoin d\'être littérale - exprime-la symboliquement.'
      },
      pt: {
        title: 'Ferida Da Infância',
        theme: 'Lesão Emocional Precoce',
        description: 'O que te feriu profundamente quando criança? Um momento, um padrão, um relacionamento? Desenhe esta ferida.',
        drawingPrompt: 'Visualize uma ferida emocional da infância. Não precisa ser literal - expresse simbolicamente.'
      },
      id: {
        title: 'Luka Masa Kecil',
        theme: 'Cedera Emosional Awal',
        description: 'Apa yang menyakitimu secara mendalam saat kecil? Sebuah momen, pola, hubungan? Gambar luka ini.',
        drawingPrompt: 'Visualisasikan luka emosional dari masa kecil. Tidak harus literal - ekspresikan secara simbolis.'
      },
      it: {
        title: 'Ferita Dell\'infanzia',
        theme: 'Lesione Emotiva Precoce',
        description: 'Cosa ti ha ferito profondamente da bambino? Un momento, un pattern, una relazione? Disegna questa ferita.',
        drawingPrompt: 'Visualizza una ferita emotiva dell\'infanzia. Non deve essere letterale - esprimila simbolicamente.'
      },
      ar: {
        title: 'جرح الطفولة',
        theme: 'الإصابة العاطفية المبكرة',
        description: 'ما الذي آلمك بعمق كطفل؟ لحظة، نمط، علاقة؟ ارسم هذا الجرح.',
        drawingPrompt: 'تصور جرحًا عاطفيًا من الطفولة. لا يجب أن يكون حرفيًا - عبر عنه رمزيًا.'
      },
      hi: {
        title: 'बचपन का घाव',
        theme: 'प्रारंभिक भावनात्मक चोट',
        description: 'बच्चे के रूप में आपको किस चीज़ ने गहराई से चोट पहुंचाई? एक पल, एक पैटर्न, एक रिश्ता? इस घाव को बनाएं।',
        drawingPrompt: 'बचपन से एक भावनात्मक घाव की कल्पना करें। यह शाब्दिक होना जरूरी नहीं - इसे प्रतीकात्मक रूप से व्यक्त करें।'
      },
      zh: {
        title: '童年的创伤',
        theme: '早期情感伤害',
        description: '小时候什么深深伤害了你？一个时刻、一个模式、一段关系？画出这个伤口。',
        drawingPrompt: '将童年的情感创伤可视化。不必是字面的——用象征性的方式表达。'
      },
      ja: {
        title: '子ども時代の傷',
        theme: '初期の感情的傷害',
        description: '子どもの頃、何があなたを深く傷つけましたか？瞬間、パターン、関係？この傷を描いてください。',
        drawingPrompt: '子ども時代の感情的な傷を視覚化してください。文字通りである必要はありません - 象徴的に表現してください。'
      },
      ko: {
        title: '어린 시절의 상처',
        theme: '초기 정서적 부상',
        description: '어렸을 때 무엇이 깊이 상처를 주었나요? 순간, 패턴, 관계? 이 상처를 그려보세요.',
        drawingPrompt: '어린 시절의 정서적 상처를 시각화하세요. 문자 그대로일 필요는 없습니다 - 상징적으로 표현하세요.'
      },
      uk: {
        title: 'Дитяча рана',
        theme: 'Рання емоційна травма',
        description: 'Що завдало вам глибокого болю в дитинстві? Момент, патерн, стосунки? Намалюйте цю рану.',
        drawingPrompt: 'Візуалізуйте емоційну рану з дитинства. Вона не обов\'язково повинна бути буквальною - виразіть її символічно.'
      },
      pl: {
        title: 'Dziecięca Rana',
        theme: 'Wczesne Emocjonalne Zranienie',
        description: 'Co cię głęboko zraniło jako dziecko? Moment, wzorzec, relacja? Narysuj tę ranę.',
        drawingPrompt: 'Zwizualizuj emocjonalną ranę z dzieciństwa. Nie musi być dosłowna - wyraź ją symbolicznie.'
      }
    }
  },

  {
    id: 11,
    module: 2,
    icon: '🌟',
    color: '#10B981',
    estimatedDuration: 50,
    focusAreas: ['inner-child', 'healing', 'self-compassion'],
    translations: {
      en: {
        title: 'Healing Your Inner Child',
        theme: 'Inner Child Integration',
        description: 'Draw yourself now giving the 5-year-old you what they needed. What would you say or give to that child?',
        drawingPrompt: 'Draw adult you meeting child you. Show how you would comfort, protect, or heal that child.'
      },
      ka: {
        title: 'შენი შიდა ბავშვის განკურნება',
        theme: 'შიდა ბავშვის ინტეგრაცია',
        description: 'დახატე შენი თავი ახლა რომ აძლევ 5 წლის შენს თავს რაც სჭირდებოდა. რას შეუტყოდი ან მისცემდი იმ ბავშვს?',
        drawingPrompt: 'დახატე ზრდასრული შენ რომ ხვდები ბავშვ შენს. აჩვენე როგორ დაამშვიდებდი, დაიცავდი ან განკურნავდი იმ ბავშვს.'
      },
      ru: {
        title: 'Исцеление вашего внутреннего ребенка',
        theme: 'Интеграция внутреннего ребенка',
        description: 'Нарисуйте себя сейчас, дающего пятилетнему вам то, что ему было нужно. Что бы вы сказали или дали тому ребенку?',
        drawingPrompt: 'Нарисуйте взрослого вас, встречающего ребенка вас. Покажите, как бы вы утешали, защищали или исцеляли того ребенка.'
      },
      hy: {
        title: 'Ձեր ներքին երեխայի բուժում',
        theme: 'Ներքին երեխայի ինտեգրում',
        description: 'Նկարեք ձեզ հիմա որ տալիս եք 5 տարեկան ձեզ ինչ էր պետք: Ի՞նչ կասեիք կամ տայիք այդ երեխային:',
        drawingPrompt: 'Նկարեք մեծահասակ ձեզ հանդիպում երեխա ձեզ: Ցույց տվեք ինչպես կհանգստացնեիք, պաշտպանեիք կամ բուժեիք այդ երեխային:'
      },
      tr: {
        title: 'İç Çocuğunu İyileştirme',
        theme: 'İç Çocuk Entegrasyonu',
        description: 'Şimdi 5 yaşındaki sana ihtiyacı olanı verirken kendini çiz. O çocuğa ne söyler veya verirdin?',
        drawingPrompt: 'Yetişkin sen ile çocuk senin buluşmasını çiz. O çocuğu nasıl teselli eder, korur veya iyileştirirdin göster.'
      },
      az: {
        title: 'Daxili Uşağınızı Sağaltmaq',
        theme: 'Daxili Uşaq İnteqrasiyası',
        description: 'İndi 5 yaşlı özünüzə lazım olanı verərkən özünüzü çəkin. O uşağa nə deyər və ya verərdiniz?',
        drawingPrompt: 'Böyük sizi uşaq sizinlə görüşərkən çəkin. O uşağı necə təsəlli edər, qoruyard və ya sağaldardiniz göstərin.'
      },
      es: {
        title: 'Sanando A Tu Niño Interior',
        theme: 'Integración Del Niño Interior',
        description: 'Dibújate ahora dándole al tú de 5 años lo que necesitaba. ¿Qué le dirías o darías a ese niño?',
        drawingPrompt: 'Dibuja al tú adulto encontrándose con el tú niño. Muestra cómo consolarías, protegerías o sanarías a ese niño.'
      },
      de: {
        title: 'Dein Inneres Kind Heilen',
        theme: 'Integration Des Inneren Kindes',
        description: 'Zeichne dich jetzt, wie du dem 5-jährigen du gibst, was es brauchte. Was würdest du diesem Kind sagen oder geben?',
        drawingPrompt: 'Zeichne erwachsenen dich, der kindlichem dich begegnet. Zeige, wie du dieses Kind trösten, beschützen oder heilen würdest.'
      },
      fr: {
        title: 'Guérir Ton Enfant Intérieur',
        theme: 'Intégration De L\'enfant Intérieur',
        description: 'Dessine-toi maintenant donnant au toi de 5 ans ce dont il avait besoin. Que dirais-tu ou donnerais-tu à cet enfant?',
        drawingPrompt: 'Dessine toi adulte rencontrant toi enfant. Montre comment tu consolerais, protégerais ou guérirais cet enfant.'
      },
      pt: {
        title: 'Curando Sua Criança Interior',
        theme: 'Integração Da Criança Interior',
        description: 'Desenhe-se agora dando ao você de 5 anos o que precisava. O que você diria ou daria àquela criança?',
        drawingPrompt: 'Desenhe você adulto encontrando você criança. Mostre como você confortaria, protegeria ou curaria aquela criança.'
      },
      id: {
        title: 'Menyembuhkan Anak Batinmu',
        theme: 'Integrasi Anak Batin',
        description: 'Gambar dirimu sekarang memberi dirimu yang berusia 5 tahun apa yang mereka butuhkan. Apa yang akan kamu katakan atau berikan pada anak itu?',
        drawingPrompt: 'Gambar dirimu yang dewasa bertemu dirimu yang anak-anak. Tunjukkan bagaimana kamu akan menghibur, melindungi, atau menyembuhkan anak itu.'
      },
      it: {
        title: 'Guarire Il Tuo Bambino Interiore',
        theme: 'Integrazione Del Bambino Interiore',
        description: 'Disegnati ora mentre dai al te di 5 anni ciò di cui aveva bisogno. Cosa diresti o daresti a quel bambino?',
        drawingPrompt: 'Disegna te adulto che incontra te bambino. Mostra come consoleresti, proteggeresti o guariresti quel bambino.'
      },
      ar: {
        title: 'شفاء طفلك الداخلي',
        theme: 'تكامل الطفل الداخلي',
        description: 'ارسم نفسك الآن وأنت تعطي نفسك في الخامسة ما احتاجه. ماذا كنت ستقول أو تعطي لذلك الطفل؟',
        drawingPrompt: 'ارسم نفسك البالغ وهو يلتقي بنفسك الطفل. أظهر كيف كنت ستواسي أو تحمي أو تشفي ذلك الطفل.'
      },
      hi: {
        title: 'अपने आंतरिक बच्चे को ठीक करना',
        theme: 'आंतरिक बच्चे का एकीकरण',
        description: 'अब अपने आप को 5 साल के आपको जो चाहिए था वह देते हुए बनाएं। आप उस बच्चे को क्या कहेंगे या देंगे?',
        drawingPrompt: 'वयस्क आप को बच्चे आप से मिलते हुए बनाएं। दिखाएं कि आप उस बच्चे को कैसे सांत्वना, सुरक्षा या चंगा करेंगे।'
      },
      zh: {
        title: '治愈你的内在小孩',
        theme: '内在小孩整合',
        description: '画出现在的你给5岁的你他们需要的东西。你会对那个孩子说什么或给什么？',
        drawingPrompt: '画出成年的你遇见儿童的你。展示你会如何安慰、保护或治愈那个孩子。'
      },
      ja: {
        title: 'あなたの内なる子どもを癒す',
        theme: '内なる子どもの統合',
        description: '5歳のあなたに必要なものを与えている今のあなたを描いてください。その子に何を言ったり与えたりしますか？',
        drawingPrompt: '大人のあなたが子どものあなたに会っている様子を描いてください。その子をどう慰め、守り、癒すかを示してください。'
      },
      ko: {
        title: '내면 아이 치유하기',
        theme: '내면 아이 통합',
        description: '지금 5살 때의 자신에게 필요했던 것을 주는 자신을 그려보세요. 그 아이에게 무엇을 말하거나 줄 건가요?',
        drawingPrompt: '어른인 당신이 어린 당신을 만나는 모습을 그려보세요. 그 아이를 어떻게 위로하고, 보호하고, 치유할지 보여주세요.'
      },
      uk: {
        title: 'Зцілення вашої внутрішньої дитини',
        theme: 'Інтеграція внутрішньої дитини',
        description: 'Намалюйте себе зараз, який дає п\'ятирічному вам те, що йому було потрібно. Що б ви сказали або дали тій дитині?',
        drawingPrompt: 'Намалюйте дорослого вас, який зустрічає дитину вас. Покажіть, як би ви втішали, захищали або зцілювали ту дитину.'
      },
      pl: {
        title: 'Uzdrawianie Twojego Wewnętrznego Dziecka',
        theme: 'Integracja Wewnętrznego Dziecka',
        description: 'Narysuj siebie teraz dającego 5-letniemu tobie to, czego potrzebował. Co byś powiedział lub dał temu dziecku?',
        drawingPrompt: 'Narysuj dorosłego ciebie spotykającego dziecko ciebie. Pokaż jak byś pocieszał, chronił lub leczył to dziecko.'
      }
    }
  },

  // ==========================================
  // MODULE 3: EMOTIONAL WORLD
  // ==========================================
  {
    id: 12,
    module: 3,
    icon: '🌦️',
    color: '#60A5FA',
    estimatedDuration: 35,
    focusAreas: ['emotions', 'awareness', 'present-moment'],
    translations: {
      en: {
        title: 'Emotional Weather Right Now',
        theme: 'Current Emotional State',
        description: 'If your emotions right now were weather, what would they be? Sunny, stormy, foggy, calm?',
        drawingPrompt: 'Draw your emotional weather right now. Use weather metaphors - clouds, rain, sun, storms, fog, etc.'
      },
      ka: {
        title: 'ემოციური ამინდი ახლა',
        theme: 'მიმდინარე ემოციური მდგომარეობა',
        description: 'თუ შენი ემოციები ახლა ამინდი იქნებოდა, როგორი იქნებოდა? მზიანი, ქარიშხლიანი, ნისლიანი, მშვიდი?',
        drawingPrompt: 'დახატე შენი ემოციური ამინდი ახლა. გამოიყენე ამინდის მეტაფორები - ღრუბლები, წვიმა, მზე, ქარიშხლები, ნისლი და ა.შ.'
      },
      ru: {
        title: 'Эмоциональная погода прямо сейчас',
        theme: 'Текущее эмоциональное состояние',
        description: 'Если бы ваши эмоции сейчас были погодой, какой бы она была? Солнечной, штормовой, туманной, спокойной?',
        drawingPrompt: 'Нарисуйте свою эмоциональную погоду сейчас. Используйте метафоры погоды - облака, дождь, солнце, штормы, туман и т.д.'
      },
      hy: {
        title: 'Հուզական եղանակը հենց հիմա',
        theme: 'Ընթացիկ հուզական վիճակ',
        description: 'Եթե ձեր հուզումները հիմա եղանակ լինեին, ինչպիսի կլիներ: Արևոտ, փոթորկոտ, մառախլավոր, հանգիստ:',
        drawingPrompt: 'Նկարեք ձեր հուզական եղանակը հիմա: Օգտագործեք եղանակի մետաֆորաներ - ամպեր, անձրև, արև, փոթորիկներ, մառախուղ և այլն:'
      },
      tr: {
        title: 'Şu Anki Duygusal Hava Durumu',
        theme: 'Mevcut Duygusal Durum',
        description: 'Şu anki duygularım hava durumu olsaydı ne olurdu? Güneşli, fırtınalı, sisli, sakin?',
        drawingPrompt: 'Şu anki duygusal hava durumunu çiz. Hava metaforları kullan - bulutlar, yağmur, güneş, fırtınalar, sis vb.'
      },
      az: {
        title: 'Hazırkı Emosional Hava',
        theme: 'Cari Emosional Vəziyyət',
        description: 'Əgər indiki hissləriniz hava olsaydı, necə olardı? Günəşli, fırtınalı, dumanlı, sakit?',
        drawingPrompt: 'İndiki emosional havanızı çəkin. Hava metaforalarından istifadə edin - buludlar, yağış, günəş, fırtınalar, duman və s.'
      },
      es: {
        title: 'Clima Emocional Ahora Mismo',
        theme: 'Estado Emocional Actual',
        description: 'Si tus emociones ahora fueran clima, ¿cómo serían? ¿Soleado, tormentoso, nublado, calmo?',
        drawingPrompt: 'Dibuja tu clima emocional ahora. Usa metáforas climáticas - nubes, lluvia, sol, tormentas, niebla, etc.'
      },
      de: {
        title: 'Emotionales Wetter Gerade Jetzt',
        theme: 'Aktueller Emotionaler Zustand',
        description: 'Wenn deine Emotionen jetzt Wetter wären, was wären sie? Sonnig, stürmisch, neblig, ruhig?',
        drawingPrompt: 'Zeichne dein emotionales Wetter jetzt. Verwende Wettermetaphern - Wolken, Regen, Sonne, Stürme, Nebel usw.'
      },
      fr: {
        title: 'Météo Émotionnelle Maintenant',
        theme: 'État Émotionnel Actuel',
        description: 'Si tes émotions maintenant étaient la météo, que seraient-elles? Ensoleillé, orageux, brumeux, calme?',
        drawingPrompt: 'Dessine ta météo émotionnelle maintenant. Utilise des métaphores météorologiques - nuages, pluie, soleil, tempêtes, brouillard, etc.'
      },
      pt: {
        title: 'Clima Emocional Agora',
        theme: 'Estado Emocional Atual',
        description: 'Se suas emoções agora fossem clima, como seriam? Ensolarado, tempestuoso, nebuloso, calmo?',
        drawingPrompt: 'Desenhe seu clima emocional agora. Use metáforas climáticas - nuvens, chuva, sol, tempestades, neblina, etc.'
      },
      id: {
        title: 'Cuaca Emosional Saat Ini',
        theme: 'Keadaan Emosional Saat Ini',
        description: 'Jika emosimu sekarang adalah cuaca, seperti apa? Cerah, badai, berkabut, tenang?',
        drawingPrompt: 'Gambar cuaca emosionalmu sekarang. Gunakan metafora cuaca - awan, hujan, matahari, badai, kabut, dll.'
      },
      it: {
        title: 'Meteo Emotivo Adesso',
        theme: 'Stato Emotivo Attuale',
        description: 'Se le tue emozioni ora fossero il meteo, cosa sarebbero? Soleggiato, tempestoso, nebbioso, calmo?',
        drawingPrompt: 'Disegna il tuo meteo emotivo adesso. Usa metafore meteorologiche - nuvole, pioggia, sole, tempeste, nebbia, ecc.'
      },
      ar: {
        title: 'الطقس العاطفي الآن',
        theme: 'الحالة العاطفية الحالية',
        description: 'إذا كانت مشاعرك الآن طقساً، ماذا ستكون؟ مشمس، عاصف، ضبابي، هادئ؟',
        drawingPrompt: 'ارسم طقسك العاطفي الآن. استخدم استعارات الطقس - غيوم، مطر، شمس، عواصف، ضباب، إلخ.'
      },
      hi: {
        title: 'अभी भावनात्मक मौसम',
        theme: 'वर्तमान भावनात्मक स्थिति',
        description: 'यदि आपकी भावनाएं अभी मौसम होतीं, तो वे कैसी होतीं? धूप, तूफानी, धुंधली, शांत?',
        drawingPrompt: 'अपना भावनात्मक मौसम अभी बनाएं। मौसम के रूपकों का उपयोग करें - बादल, बारिश, सूरज, तूफान, कोहरा, आदि।'
      },
      zh: {
        title: '此刻的情绪天气',
        theme: '当前情绪状态',
        description: '如果你现在的情绪是天气，会是什么样？晴朗、暴风雨、雾蒙蒙、平静？',
        drawingPrompt: '画出你现在的情绪天气。使用天气隐喻——云、雨、太阳、风暴、雾等。'
      },
      ja: {
        title: '今の感情の天気',
        theme: '現在の感情状態',
        description: '今のあなたの感情が天気だったら、どんな天気ですか？晴れ、嵐、霧、穏やか？',
        drawingPrompt: '今の感情の天気を描いてください。天気のメタファーを使ってください - 雲、雨、太陽、嵐、霧など。'
      },
      ko: {
        title: '지금 감정의 날씨',
        theme: '현재 감정 상태',
        description: '지금 당신의 감정이 날씨라면 어떤 날씨일까요? 맑음, 폭풍, 안개, 고요?',
        drawingPrompt: '지금 감정의 날씨를 그려보세요. 날씨 은유를 사용하세요 - 구름, 비, 태양, 폭풍, 안개 등.'
      },
      uk: {
        title: 'Емоційна погода зараз',
        theme: 'Поточний емоційний стан',
        description: 'Якби ваші емоції зараз були погодою, якою б вона була? Сонячною, штормовою, туманною, спокійною?',
        drawingPrompt: 'Намалюйте свою емоційну погоду зараз. Використовуйте метафори погоди - хмари, дощ, сонце, шторми, туман тощо.'
      },
      pl: {
        title: 'Emocjonalna Pogoda Teraz',
        theme: 'Aktualny Stan Emocjonalny',
        description: 'Gdyby twoje emocje teraz były pogodą, jaka by była? Słoneczna, burzowa, mglistа, spokojna?',
        drawingPrompt: 'Narysuj swoją emocjonalną pogodę teraz. Użyj metafor pogodowych - chmury, deszcz, słońce, burze, mgła itp.'
      }
    }
  },

  {
    id: 13,
    module: 3,
    icon: '🔥',
    color: '#DC2626',
    estimatedDuration: 45,
    focusAreas: ['emotions', 'anger', 'expression'],
    translations: {
      en: {
        title: 'Anger',
        theme: 'Exploring Rage',
        description: 'Draw your anger. What does it look like? What color, shape, energy does it have?',
        drawingPrompt: 'Give anger a visual form. Let yourself express it fully on paper - it\'s safe here.'
      },
      ka: {
        title: 'გაბრაზება',
        theme: 'რისხვის გამოკვლევა',
        description: 'დახატე შენი გაბრაზება. როგორ გამოიყურება? რა ფერი, ფორმა, ენერგია აქვს?',
        drawingPrompt: 'მიეცი გაბრაზებას ვიზუალური ფორმა. ნება დაუშვი სრულად გამოხატო ქაღალდზე - აქ უსაფრთხოა.'
      },
      ru: {
        title: 'Гнев',
        theme: 'Исследование ярости',
        description: 'Нарисуйте свой гнев. Как он выглядит? Какой у него цвет, форма, энергия?',
        drawingPrompt: 'Придайте гневу визуальную форму. Позвольте себе полностью выразить его на бумаге - здесь это безопасно.'
      },
      hy: {
        title: 'Բարկություն',
        theme: 'Զայրույթի ուսումնասիրություն',
        description: 'Նկարեք ձեր բարկությունը: Ինչպիսին է այն: Ինչ գույն, ձև, էներգիա ունի:',
        drawingPrompt: 'Տվեք բարկությանը տեսողական ձև: Թույլ տվեք ինքներդ ձեզ լիովին արտահայտել թղթի վրա - այստեղ անվտանգ է:'
      },
      tr: {
        title: 'Öfke',
        theme: 'Hiddetin Keşfi',
        description: 'Öfkeni çiz. Nasıl görünüyor? Hangi renk, şekil, enerji var?',
        drawingPrompt: 'Öfkeye görsel bir form ver. Kağıt üzerinde tam olarak ifade etmene izin ver - burada güvendesin.'
      },
      az: {
        title: 'Qəzəb',
        theme: 'Qəzəbin Tədqiqi',
        description: 'Qəzəbinizi çəkin. Necə görünür? Hansı rəng, forma, enerji var?',
        drawingPrompt: 'Qəzəbə vizual forma verin. Kağız üzərində tam ifadə etməyə icazə verin - burada təhlükəsizdir.'
      },
      es: {
        title: 'Ira',
        theme: 'Explorando La Rabia',
        description: 'Dibuja tu ira. ¿Cómo se ve? ¿Qué color, forma, energía tiene?',
        drawingPrompt: 'Dale a la ira una forma visual. Permítete expresarla completamente en papel - aquí es seguro.'
      },
      de: {
        title: 'Wut',
        theme: 'Zorn Erforschen',
        description: 'Zeichne deine Wut. Wie sieht sie aus? Welche Farbe, Form, Energie hat sie?',
        drawingPrompt: 'Gib der Wut eine visuelle Form. Erlaube dir, sie vollständig auf Papier auszudrücken - hier ist es sicher.'
      },
      fr: {
        title: 'Colère',
        theme: 'Explorer La Rage',
        description: 'Dessine ta colère. À quoi ressemble-t-elle? Quelle couleur, forme, énergie a-t-elle?',
        drawingPrompt: 'Donne à la colère une forme visuelle. Permets-toi de l\'exprimer pleinement sur papier - c\'est sûr ici.'
      },
      pt: {
        title: 'Raiva',
        theme: 'Explorando A Fúria',
        description: 'Desenhe sua raiva. Como ela se parece? Que cor, forma, energia tem?',
        drawingPrompt: 'Dê à raiva uma forma visual. Permita-se expressá-la completamente no papel - aqui é seguro.'
      },
      id: {
        title: 'Kemarahan',
        theme: 'Menjelajahi Amarah',
        description: 'Gambar kemarahanmu. Seperti apa bentuknya? Warna, bentuk, energi apa yang dimilikinya?',
        drawingPrompt: 'Beri kemarahan bentuk visual. Biarkan dirimu mengekspresikannya sepenuhnya di kertas - di sini aman.'
      },
      it: {
        title: 'Rabbia',
        theme: 'Esplorare L\'ira',
        description: 'Disegna la tua rabbia. Come appare? Che colore, forma, energia ha?',
        drawingPrompt: 'Dai alla rabbia una forma visiva. Permettiti di esprimerla completamente su carta - qui è sicuro.'
      },
      ar: {
        title: 'الغضب',
        theme: 'استكشاف الغضب',
        description: 'ارسم غضبك. كيف يبدو؟ ما لونه وشكله وطاقته؟',
        drawingPrompt: 'أعط الغضب شكلاً بصرياً. اسمح لنفسك بالتعبير عنه بالكامل على الورق - إنه آمن هنا.'
      },
      hi: {
        title: 'क्रोध',
        theme: 'क्रोध की खोज',
        description: 'अपने क्रोध को बनाएं। यह कैसा दिखता है? इसका रंग, आकार, ऊर्जा क्या है?',
        drawingPrompt: 'क्रोध को एक दृश्य रूप दें। अपने आप को कागज पर पूरी तरह से व्यक्त करने दें - यहां सुरक्षित है।'
      },
      zh: {
        title: '愤怒',
        theme: '探索愤怒',
        description: '画出你的愤怒。它看起来是什么样的？有什么颜色、形状、能量？',
        drawingPrompt: '给愤怒一个视觉形式。让自己在纸上充分表达——这里是安全的。'
      },
      ja: {
        title: '怒り',
        theme: '怒りを探る',
        description: 'あなたの怒りを描いてください。それはどのように見えますか？どんな色、形、エネルギーを持っていますか？',
        drawingPrompt: '怒りに視覚的な形を与えてください。紙の上で完全に表現することを自分に許してください - ここは安全です。'
      },
      ko: {
        title: '분노',
        theme: '분노 탐구',
        description: '당신의 분노를 그려보세요. 어떻게 보이나요? 어떤 색, 형태, 에너지를 가지고 있나요?',
        drawingPrompt: '분노에 시각적 형태를 주세요. 종이 위에 완전히 표현하도록 허용하세요 - 여기는 안전합니다.'
      },
      uk: {
        title: 'Гнів',
        theme: 'Дослідження люті',
        description: 'Намалюйте свій гнів. Як він виглядає? Який у нього колір, форма, енергія?',
        drawingPrompt: 'Надайте гніву візуальну форму. Дозвольте собі повністю виразити його на папері - тут це безпечно.'
      },
      pl: {
        title: 'Gniew',
        theme: 'Eksplorowanie Wściekłości',
        description: 'Narysuj swój gniew. Jak wygląda? Jaki ma kolor, kształt, energię?',
        drawingPrompt: 'Nadaj gniewowi wizualną formę. Pozwól sobie wyrazić go w pełni na papierze - tutaj jest bezpiecznie.'
      }
    }
  },

  {
    id: 14,
    module: 3,
    icon: '😢',
    color: '#3B82F6',
    estimatedDuration: 45,
    focusAreas: ['emotions', 'sadness', 'grief'],
    translations: {
      en: {
        title: 'Sadness',
        theme: 'Honoring Sorrow',
        description: 'Draw your sadness. Where do you feel it in your body? What does it need from you?',
        drawingPrompt: 'Give sadness visual form. It can be tears, heaviness, color, or abstract shapes.'
      },
      ka: {
        title: 'სიმწარე',
        theme: 'მწუხარების პატივისცემა',
        description: 'დახატე შენი სიმწარე. სად გრძნობ მას სხეულში? რა სჭირდება შენგან?',
        drawingPrompt: 'მიეცი სიმწარეს ვიზუალური ფორმა. შეიძლება იყოს ცრემლები, სიმძიმე, ფერი ან აბსტრაქტული ფორმები.'
      },
      ru: {
        title: 'Печаль',
        theme: 'Почитание скорби',
        description: 'Нарисуйте свою печаль. Где вы чувствуете ее в теле? Что ей нужно от вас?',
        drawingPrompt: 'Придайте печали визуальную форму. Это могут быть слезы, тяжесть, цвет или абстрактные формы.'
      },
      hy: {
        title: 'Տխրություն',
        theme: 'Վշտի հարգում',
        description: 'Նկարեք ձեր տխրությունը: Որտեղ եք զգում այն ​​մարմնում: Ինչ է պետք ձեզնից:',
        drawingPrompt: 'Տվեք տխրությանը տեսողական ձև: Կարող են լինել արտասուքներ, ծանրություն, գույն կամ աբստրակտ ձևեր:'
      },
      tr: {
        title: 'Üzüntü',
        theme: 'Hüznü Onurlandırma',
        description: 'Üzüntünü çiz. Onu vücudunda nerede hissediyorsun? Senden ne istiyor?',
        drawingPrompt: 'Üzüntüye görsel form ver. Gözyaşları, ağırlık, renk veya soyut şekiller olabilir.'
      },
      az: {
        title: 'Kədər',
        theme: 'Kədərə Hörmət',
        description: 'Kədərinizi çəkin. Onu bədəninizdə harada hiss edirsiniz? Sizdən nəyə ehtiyacı var?',
        drawingPrompt: 'Kədərə vizual forma verin. Göz yaşları, ağırlıq, rəng və ya abstrakt formalar ola bilər.'
      },
      es: {
        title: 'Tristeza',
        theme: 'Honrando El Dolor',
        description: 'Dibuja tu tristeza. ¿Dónde la sientes en tu cuerpo? ¿Qué necesita de ti?',
        drawingPrompt: 'Dale a la tristeza forma visual. Pueden ser lágrimas, pesadez, color o formas abstractas.'
      },
      de: {
        title: 'Traurigkeit',
        theme: 'Trauer Ehren',
        description: 'Zeichne deine Traurigkeit. Wo fühlst du sie in deinem Körper? Was braucht sie von dir?',
        drawingPrompt: 'Gib der Traurigkeit eine visuelle Form. Es können Tränen, Schwere, Farbe oder abstrakte Formen sein.'
      },
      fr: {
        title: 'Tristesse',
        theme: 'Honorer Le Chagrin',
        description: 'Dessine ta tristesse. Où la ressens-tu dans ton corps? De quoi a-t-elle besoin de toi?',
        drawingPrompt: 'Donne à la tristesse une forme visuelle. Ce peuvent être des larmes, de la lourdeur, de la couleur ou des formes abstraites.'
      },
      pt: {
        title: 'Tristeza',
        theme: 'Honrando A Dor',
        description: 'Desenhe sua tristeza. Onde você a sente em seu corpo? Do que ela precisa de você?',
        drawingPrompt: 'Dê à tristeza forma visual. Podem ser lágrimas, peso, cor ou formas abstratas.'
      },
      id: {
        title: 'Kesedihan',
        theme: 'Menghormati Dukacita',
        description: 'Gambar kesedihanmu. Di mana kamu merasakannya di tubuhmu? Apa yang dibutuhkannya darimu?',
        drawingPrompt: 'Beri kesedihan bentuk visual. Bisa berupa air mata, beban, warna, atau bentuk abstrak.'
      },
      it: {
        title: 'Tristezza',
        theme: 'Onorare Il Dolore',
        description: 'Disegna la tua tristezza. Dove la senti nel tuo corpo? Di cosa ha bisogno da te?',
        drawingPrompt: 'Dai alla tristezza una forma visiva. Possono essere lacrime, pesantezza, colore o forme astratte.'
      },
      ar: {
        title: 'الحزن',
        theme: 'تكريم الأسى',
        description: 'ارسم حزنك. أين تشعر به في جسمك؟ ماذا يحتاج منك؟',
        drawingPrompt: 'أعط الحزن شكلاً بصرياً. يمكن أن تكون دموعاً أو ثقلاً أو لوناً أو أشكالاً مجردة.'
      },
      hi: {
        title: 'उदासी',
        theme: 'दुःख का सम्मान',
        description: 'अपनी उदासी को बनाएं। आप इसे अपने शरीर में कहाँ महसूस करते हैं? इसे आपसे क्या चाहिए?',
        drawingPrompt: 'उदासी को दृश्य रूप दें। यह आँसू, भारीपन, रंग, या अमूर्त आकार हो सकता है।'
      },
      zh: {
        title: '悲伤',
        theme: '尊重悲伤',
        description: '画出你的悲伤。你在身体哪里感受到它？它需要你什么？',
        drawingPrompt: '给悲伤一个视觉形式。可以是眼泪、沉重、颜色或抽象形状。'
      },
      ja: {
        title: '悲しみ',
        theme: '悲しみを尊重する',
        description: 'あなたの悲しみを描いてください。体のどこでそれを感じますか？それはあなたに何が必要ですか？',
        drawingPrompt: '悲しみに視覚的な形を与えてください。涙、重さ、色、または抽象的な形にすることができます。'
      },
      ko: {
        title: '슬픔',
        theme: '슬픔 존중하기',
        description: '당신의 슬픔을 그려보세요. 몸 어디에서 느끼나요? 당신에게서 무엇을 필요로 하나요?',
        drawingPrompt: '슬픔에 시각적 형태를 주세요. 눈물, 무거움, 색상 또는 추상적인 형태일 수 있습니다.'
      },
      uk: {
        title: 'Сум',
        theme: 'Шанування горя',
        description: 'Намалюйте свій сум. Де ви відчуваєте його в тілі? Що йому потрібно від вас?',
        drawingPrompt: 'Надайте суму візуальну форму. Це можуть бути сльози, важкість, колір або абстрактні форми.'
      },
      pl: {
        title: 'Smutek',
        theme: 'Honorowanie Smutku',
        description: 'Narysuj swój smutek. Gdzie go czujesz w swoim ciele? Czego potrzebuje od ciebie?',
        drawingPrompt: 'Nadaj smutkowi wizualną formę. Mogą to być łzy, ciężar, kolor lub abstrakcyjne kształty.'
      }
    }
  },

  {
    id: 15,
    module: 3,
    icon: '😊',
    color: '#FCD34D',
    estimatedDuration: 35,
    focusAreas: ['emotions', 'joy', 'positive-emotions'],
    translations: {
      en: {
        title: 'Joy',
        theme: 'Celebrating Happiness',
        description: 'Draw your joy. When do you feel it? What does it look like when it fills you?',
        drawingPrompt: 'Create a visual expression of joy. Use bright colors, movement, light - whatever joy feels like to you.'
      },
      ka: {
        title: 'სიხარული',
        theme: 'ბედნიერების აღნიშვნა',
        description: 'დახატე შენი სიხარული. როდის გრძნობ მას? როგორ გამოიყურება როცა გავსებს შენ?',
        drawingPrompt: 'შექმენი სიხარულის ვიზუალური გამოხატვა. გამოიყენე ნათელი ფერები, მოძრაობა, სინათლე - რაც არის სიხარული შენთვის.'
      },
      ru: {
        title: 'Радость',
        theme: 'Празднование счастья',
        description: 'Нарисуйте свою радость. Когда вы ее чувствуете? Как она выглядит, когда наполняет вас?',
        drawingPrompt: 'Создайте визуальное выражение радости. Используйте яркие цвета, движение, свет - все, что радость для вас.'
      },
      hy: {
        title: 'Ուրախություն',
        theme: 'Երջանկության տոնակատարում',
        description: 'Նկարեք ձեր ուրախությունը: Երբ եք զգում այն: Ինչպես է երևում երբ լցնում է ձեզ:',
        drawingPrompt: 'Ստեղծեք ուրախության տեսողական արտահայտություն: Օգտագործեք վառ գույներ, շարժում, լույս - ինչ էլ որ ուրախություն է ձեզ համար:'
      },
      tr: {
        title: 'Neşe',
        theme: 'Mutluluğu Kutlama',
        description: 'Neşeni çiz. Ne zaman hissediyorsun? Seni doldurduğunda nasıl görünüyor?',
        drawingPrompt: 'Neşenin görsel bir ifadesini oluştur. Parlak renkler, hareket, ışık kullan - neşe senin için ne demekse.'
      },
      az: {
        title: 'Sevinc',
        theme: 'Xoşbəxtliyi Qeyd Etmək',
        description: 'Sevincinizi çəkin. Onu nə vaxt hiss edirsiniz? Sizi doldurduğu zaman necə görünür?',
        drawingPrompt: 'Sevincin vizual ifadəsini yaradın. Parlaq rənglər, hərəkət, işıq istifadə edin - sevinc sizin üçün nə deməkdirsə.'
      },
      es: {
        title: 'Alegría',
        theme: 'Celebrando La Felicidad',
        description: 'Dibuja tu alegría. ¿Cuándo la sientes? ¿Cómo se ve cuando te llena?',
        drawingPrompt: 'Crea una expresión visual de alegría. Usa colores brillantes, movimiento, luz - lo que sea que la alegría signifique para ti.'
      },
      de: {
        title: 'Freude',
        theme: 'Glück Feiern',
        description: 'Zeichne deine Freude. Wann fühlst du sie? Wie sieht sie aus, wenn sie dich erfüllt?',
        drawingPrompt: 'Erstelle einen visuellen Ausdruck von Freude. Verwende helle Farben, Bewegung, Licht - was auch immer Freude für dich bedeutet.'
      },
      fr: {
        title: 'Joie',
        theme: 'Célébrer Le Bonheur',
        description: 'Dessine ta joie. Quand la ressens-tu? À quoi ressemble-t-elle quand elle te remplit?',
        drawingPrompt: 'Crée une expression visuelle de la joie. Utilise des couleurs vives, du mouvement, de la lumière - tout ce que la joie représente pour toi.'
      },
      pt: {
        title: 'Alegria',
        theme: 'Celebrando A Felicidade',
        description: 'Desenhe sua alegria. Quando você a sente? Como ela se parece quando te preenche?',
        drawingPrompt: 'Crie uma expressão visual de alegria. Use cores brilhantes, movimento, luz - o que a alegria significa para você.'
      },
      id: {
        title: 'Kegembiraan',
        theme: 'Merayakan Kebahagiaan',
        description: 'Gambar kegembiraanmu. Kapan kamu merasakannya? Seperti apa ketika mengisi dirimu?',
        drawingPrompt: 'Buat ekspresi visual kegembiraan. Gunakan warna cerah, gerakan, cahaya - apa pun yang kegembiraan rasakan bagimu.'
      },
      it: {
        title: 'Gioia',
        theme: 'Celebrare La Felicità',
        description: 'Disegna la tua gioia. Quando la provi? Come appare quando ti riempie?',
        drawingPrompt: 'Crea un\'espressione visiva della gioia. Usa colori vivaci, movimento, luce - qualunque cosa la gioia significhi per te.'
      },
      ar: {
        title: 'الفرح',
        theme: 'الاحتفال بالسعادة',
        description: 'ارسم فرحك. متى تشعر به؟ كيف يبدو عندما يملأك؟',
        drawingPrompt: 'أنشئ تعبيراً بصرياً عن الفرح. استخدم ألواناً زاهية، حركة، ضوء - أي شيء يعنيه الفرح بالنسبة لك.'
      },
      hi: {
        title: 'खुशी',
        theme: 'खुशी का जश्न',
        description: 'अपनी खुशी को बनाएं। आप इसे कब महसूस करते हैं? जब यह आपको भर देती है तो कैसी दिखती है?',
        drawingPrompt: 'खुशी की एक दृश्य अभिव्यक्ति बनाएं। चमकीले रंग, आंदोलन, प्रकाश का उपयोग करें - जो भी खुशी आपके लिए हो।'
      },
      zh: {
        title: '快乐',
        theme: '庆祝幸福',
        description: '画出你的快乐。你什么时候感受到它？当它充满你时是什么样子？',
        drawingPrompt: '创造快乐的视觉表达。使用明亮的颜色、运动、光——快乐对你意味着什么。'
      },
      ja: {
        title: '喜び',
        theme: '幸せを祝う',
        description: 'あなたの喜びを描いてください。いつそれを感じますか？それがあなたを満たすときはどのように見えますか？',
        drawingPrompt: '喜びの視覚的表現を作成してください。明るい色、動き、光を使ってください - 喜びがあなたにとって何であれ。'
      },
      ko: {
        title: '기쁨',
        theme: '행복 축하하기',
        description: '당신의 기쁨을 그려보세요. 언제 느끼나요? 당신을 채울 때 어떻게 보이나요?',
        drawingPrompt: '기쁨의 시각적 표현을 만드세요. 밝은 색상, 움직임, 빛을 사용하세요 - 기쁨이 당신에게 어떤 의미이든.'
      },
      uk: {
        title: 'Радість',
        theme: 'Святкування щастя',
        description: 'Намалюйте свою радість. Коли ви її відчуваєте? Як вона виглядає, коли наповнює вас?',
        drawingPrompt: 'Створіть візуальний вираз радості. Використовуйте яскраві кольори, рух, світло - все, що радість для вас.'
      },
      pl: {
        title: 'Radość',
        theme: 'Świętowanie Szczęścia',
        description: 'Narysuj swoją radość. Kiedy ją czujesz? Jak wygląda, gdy cię wypełnia?',
        drawingPrompt: 'Stwórz wizualną ekspresję radości. Użyj jasnych kolorów, ruchu, światła - czymkolwiek radość jest dla ciebie.'
      }
    }
  },

  {
    id: 16,
    module: 3,
    icon: '😨',
    color: '#8B5CF6',
    estimatedDuration: 45,
    focusAreas: ['emotions', 'fear', 'anxiety'],
    translations: {
      en: {
        title: 'Fear',
        theme: 'Facing What Scares Us',
        description: 'Draw your fear as it is now in your adult life. What are you afraid of?',
        drawingPrompt: 'Give your current fear visual form. Make it visible so you can see it clearly.'
      },
      ka: {
        title: 'შიში',
        theme: 'რაც გვაშინებს მასთან დაპირისპირება',
        description: 'დახატე შენი შიში როგორც არის ახლა შენს ზრდასრულ ცხოვრებაში. რისი გეშინია?',
        drawingPrompt: 'მიეცი შენს ამჟამინდელ შიშს ვიზუალური ფორმა. გახადე ხილული რომ აშკარად დაინახო.'
      },
      ru: {
        title: 'Страх',
        theme: 'Лицом к тому, что нас пугает',
        description: 'Нарисуйте свой страх таким, какой он сейчас в вашей взрослой жизни. Чего вы боитесь?',
        drawingPrompt: 'Придайте вашему текущему страху визуальную форму. Сделайте его видимым, чтобы вы могли ясно его увидеть.'
      },
      hy: {
        title: 'Վախ',
        theme: 'Ինչի վախենալ մեզ',
        description: 'Նկարեք ձեր վախը ինչպես է հիմա ձեր չափահաս կյանքում: Ինչի՞ց եք վախենում:',
        drawingPrompt: 'Տվեք ձեր ընթացիկ վախին տեսողական ձև: Դարձրեք տեսանելի որպեսզի հստակ տեսնեք:'
      },
      tr: {
        title: 'Korku',
        theme: 'Bizi Korkutan Şeyle Yüzleşme',
        description: 'Korkunu şu an yetişkin hayatında olduğu gibi çiz. Neden korkuyorsun?',
        drawingPrompt: 'Mevcut korkuna görsel bir form ver. Açıkça görebilmen için görünür hale getir.'
      },
      az: {
        title: 'Qorxu',
        theme: 'Bizi Qorxudan Şeyə Üz Tutmaq',
        description: 'Qorxunuzu indi böyük həyatınızda olduğu kimi çəkin. Nədən qorxursunuz?',
        drawingPrompt: 'Cari qorxunuza vizual forma verin. Aydın görə bilməniz üçün görünən edin.'
      },
      es: {
        title: 'Miedo',
        theme: 'Enfrentando Lo Que Nos Asusta',
        description: 'Dibuja tu miedo como es ahora en tu vida adulta. ¿De qué tienes miedo?',
        drawingPrompt: 'Dale a tu miedo actual forma visual. Hazlo visible para que puedas verlo claramente.'
      },
      de: {
        title: 'Angst',
        theme: 'Was Uns Erschreckt Begegnen',
        description: 'Zeichne deine Angst so, wie sie jetzt in deinem erwachsenen Leben ist. Wovor hast du Angst?',
        drawingPrompt: 'Gib deiner aktuellen Angst eine visuelle Form. Mache sie sichtbar, damit du sie klar sehen kannst.'
      },
      fr: {
        title: 'Peur',
        theme: 'Affronter Ce Qui Nous Fait Peur',
        description: 'Dessine ta peur telle qu\'elle est maintenant dans ta vie d\'adulte. De quoi as-tu peur?',
        drawingPrompt: 'Donne à ta peur actuelle une forme visuelle. Rends-la visible pour que tu puisses la voir clairement.'
      },
      pt: {
        title: 'Medo',
        theme: 'Enfrentando O Que Nos Assusta',
        description: 'Desenhe seu medo como ele é agora em sua vida adulta. Do que você tem medo?',
        drawingPrompt: 'Dê ao seu medo atual forma visual. Torne-o visível para que você possa vê-lo claramente.'
      },
      id: {
        title: 'Ketakutan',
        theme: 'Menghadapi Apa Yang Menakuti Kita',
        description: 'Gambar ketakutanmu seperti sekarang dalam kehidupan dewasamu. Apa yang kamu takutkan?',
        drawingPrompt: 'Beri ketakutanmu saat ini bentuk visual. Buatlah terlihat agar kamu bisa melihatnya dengan jelas.'
      },
      it: {
        title: 'Paura',
        theme: 'Affrontare Ciò Che Ci Spaventa',
        description: 'Disegna la tua paura com\'è ora nella tua vita adulta. Di cosa hai paura?',
        drawingPrompt: 'Dai alla tua paura attuale una forma visiva. Rendila visibile in modo da poterla vedere chiaramente.'
      },
      ar: {
        title: 'الخوف',
        theme: 'مواجهة ما يخيفنا',
        description: 'ارسم خوفك كما هو الآن في حياتك البالغة. مما تخاف؟',
        drawingPrompt: 'أعط خوفك الحالي شكلاً بصرياً. اجعله مرئياً حتى تتمكن من رؤيته بوضوح.'
      },
      hi: {
        title: 'डर',
        theme: 'जो हमें डराता है उसका सामना करना',
        description: 'अपने डर को वैसे बनाएं जैसे यह अब आपके वयस्क जीवन में है। आपको किस बात का डर है?',
        drawingPrompt: 'अपने वर्तमान डर को दृश्य रूप दें। इसे दृश्यमान बनाएं ताकि आप इसे स्पष्ट रूप से देख सकें।'
      },
      zh: {
        title: '恐惧',
        theme: '面对让我们害怕的东西',
        description: '画出你现在成年生活中的恐惧。你害怕什么？',
        drawingPrompt: '给你当前的恐惧一个视觉形式。让它可见，这样你就能清楚地看到它。'
      },
      ja: {
        title: '恐れ',
        theme: '私たちを怖がらせるものに向き合う',
        description: '今のあなたの大人の人生での恐れを描いてください。何を恐れていますか？',
        drawingPrompt: '現在の恐れに視覚的な形を与えてください。はっきりと見えるように可視化してください。'
      },
      ko: {
        title: '두려움',
        theme: '우리를 겁나게 하는 것에 맞서기',
        description: '지금 성인 생활에서의 두려움을 그려보세요. 무엇이 두렵나요?',
        drawingPrompt: '현재 두려움에 시각적 형태를 주세요. 명확히 볼 수 있도록 보이게 만드세요.'
      },
      uk: {
        title: 'Страх',
        theme: 'Обличчям до того, що нас лякає',
        description: 'Намалюйте свій страх таким, яким він зараз у вашому дорослому житті. Чого ви боїтеся?',
        drawingPrompt: 'Надайте вашому поточному страху візуальну форму. Зробіть його видимим, щоб ви могли ясно його побачити.'
      },
      pl: {
        title: 'Strach',
        theme: 'Stawienie Czoła Temu Co Nas Przeraża',
        description: 'Narysuj swój strach taki, jaki jest teraz w twoim dorosłym życiu. Czego się boisz?',
        drawingPrompt: 'Nadaj swojemu obecnemu strachowi wizualną formę. Uczyń go widocznym, abyś mógł go wyraźnie zobaczyć.'
      }
    }
  },

  {
    id: 17,
    module: 3,
    icon: '🎨',
    color: '#EC4899',
    estimatedDuration: 50,
    focusAreas: ['emotions', 'integration', 'wholeness'],
    translations: {
      en: {
        title: 'All My Emotions Together',
        theme: 'Emotional Integration',
        description: 'Draw all your emotions coexisting. How do they interact? Can they all have space?',
        drawingPrompt: 'Create a composition showing all your emotions at once. Let them coexist, overlap, interact.'
      },
      ka: {
        title: 'ჩემი ყველა ემოცია ერთად',
        theme: 'ემოციური ინტეგრაცია',
        description: 'დახატე შენი ყველა ემოცია როგორც თანაარსებობენ. როგორ ურთიერთობენ? შეუძლიათ ყველას იყოს სივრცე?',
        drawingPrompt: 'შექმენი კომპოზიცია რომელიც აჩვენებს შენს ყველა ემოციას ერთდროულად. ნება დაუშვი თანაარსებობენ, გადაფარონ, ურთიერთობონ.'
      },
      ru: {
        title: 'Все мои эмоции вместе',
        theme: 'Эмоциональная интеграция',
        description: 'Нарисуйте все ваши эмоции сосуществующими. Как они взаимодействуют? Может ли у всех быть место?',
        drawingPrompt: 'Создайте композицию, показывающую все ваши эмоции сразу. Позвольте им сосуществовать, пересекаться, взаимодействовать.'
      },
      hy: {
        title: 'Իմ բոլոր հուզումները միասին',
        theme: 'Հուզական ինտեգրում',
        description: 'Նկարեք ձեր բոլոր հուզումները համակեցող: Ինչպե՞ս են փոխգործակցում: Կարո՞ղ են բոլորը տարածություն ունենալ:',
        drawingPrompt: 'Ստեղծեք կոմպոզիցիա որ ցույց է տալիս ձեր բոլոր հուզումները միանգամից: Թույլ տվեք համակեցել, խաչվել, փոխգործակցել:'
      },
      tr: {
        title: 'Tüm Duygularım Bir Arada',
        theme: 'Duygusal Bütünleşme',
        description: 'Tüm duygularının bir arada var olduğunu çiz. Nasıl etkileşime giriyorlar? Hepsine yer var mı?',
        drawingPrompt: 'Tüm duygularını bir kerede gösteren bir kompozisyon oluştur. Bir arada var olmalarına, örtüşmelerine, etkileşime girmelerine izin ver.'
      },
      az: {
        title: 'Mənim Bütün Hisslərim Birlikdə',
        theme: 'Emosional İnteqrasiya',
        description: 'Bütün hisslərinizin birlikdə mövcud olduğunu çəkin. Necə qarşılıqlı təsir göstərirlər? Hamısına yer varmı?',
        drawingPrompt: 'Bütün hisslərinizi eyni vaxtda göstərən kompozisiya yaradın. Birlikdə mövcud olmalarına, kəsişməsinə, qarşılıqlı təsir göstərməsinə icazə verin.'
      },
      es: {
        title: 'Todas Mis Emociones Juntas',
        theme: 'Integración Emocional',
        description: 'Dibuja todas tus emociones coexistiendo. ¿Cómo interactúan? ¿Pueden todas tener espacio?',
        drawingPrompt: 'Crea una composición mostrando todas tus emociones a la vez. Déjalas coexistir, superponerse, interactuar.'
      },
      de: {
        title: 'Alle Meine Emotionen Zusammen',
        theme: 'Emotionale Integration',
        description: 'Zeichne alle deine Emotionen koexistierend. Wie interagieren sie? Können alle Raum haben?',
        drawingPrompt: 'Erstelle eine Komposition, die alle deine Emotionen auf einmal zeigt. Lass sie koexistieren, sich überlappen, interagieren.'
      },
      fr: {
        title: 'Toutes Mes Émotions Ensemble',
        theme: 'Intégration Émotionnelle',
        description: 'Dessine toutes tes émotions coexistant. Comment interagissent-elles? Peuvent-elles toutes avoir de l\'espace?',
        drawingPrompt: 'Crée une composition montrant toutes tes émotions à la fois. Laisse-les coexister, se chevaucher, interagir.'
      },
      pt: {
        title: 'Todas As Minhas Emoções Juntas',
        theme: 'Integração Emocional',
        description: 'Desenhe todas as suas emoções coexistindo. Como elas interagem? Todas podem ter espaço?',
        drawingPrompt: 'Crie uma composição mostrando todas as suas emoções de uma vez. Deixe-as coexistir, sobrepor-se, interagir.'
      },
      id: {
        title: 'Semua Emosiku Bersama',
        theme: 'Integrasi Emosional',
        description: 'Gambar semua emosimu yang hidup berdampingan. Bagaimana mereka berinteraksi? Bisakah semuanya memiliki ruang?',
        drawingPrompt: 'Buat komposisi yang menunjukkan semua emosimu sekaligus. Biarkan mereka hidup berdampingan, tumpang tindih, berinteraksi.'
      },
      it: {
        title: 'Tutte Le Mie Emozioni Insieme',
        theme: 'Integrazione Emotiva',
        description: 'Disegna tutte le tue emozioni che coesistono. Come interagiscono? Possono tutte avere spazio?',
        drawingPrompt: 'Crea una composizione che mostri tutte le tue emozioni contemporaneamente. Lasciale coesistere, sovrapporsi, interagire.'
      },
      ar: {
        title: 'كل مشاعري معاً',
        theme: 'التكامل العاطفي',
        description: 'ارسم كل مشاعرك المتعايشة. كيف تتفاعل؟ هل يمكن لها جميعاً أن يكون لها مساحة؟',
        drawingPrompt: 'أنشئ تكويناً يظهر كل مشاعرك في آن واحد. دعها تتعايش، تتداخل، تتفاعل.'
      },
      hi: {
        title: 'मेरी सभी भावनाएं एक साथ',
        theme: 'भावनात्मक एकीकरण',
        description: 'अपनी सभी भावनाओं को सह-अस्तित्व में बनाएं। वे कैसे इंटरैक्ट करती हैं? क्या सभी को जगह मिल सकती है?',
        drawingPrompt: 'एक रचना बनाएं जो एक साथ आपकी सभी भावनाओं को दिखाती है। उन्हें सह-अस्तित्व, ओवरलैप, इंटरैक्ट करने दें।'
      },
      zh: {
        title: '我所有的情绪在一起',
        theme: '情绪整合',
        description: '画出你所有情绪共存的样子。它们如何互动？它们都能有空间吗？',
        drawingPrompt: '创作一个展示你所有情绪的作品。让它们共存、重叠、互动。'
      },
      ja: {
        title: '私のすべての感情が一緒に',
        theme: '感情の統合',
        description: 'あなたのすべての感情が共存している様子を描いてください。どのように相互作用していますか？すべてに場所がありますか？',
        drawingPrompt: 'すべての感情を一度に示す構成を作成してください。共存し、重なり合い、相互作用させてください。'
      },
      ko: {
        title: '나의 모든 감정이 함께',
        theme: '감정 통합',
        description: '모든 감정이 공존하는 모습을 그려보세요. 어떻게 상호작용하나요? 모두 공간을 가질 수 있나요?',
        drawingPrompt: '모든 감정을 한 번에 보여주는 구성을 만드세요. 공존하고, 겹치고, 상호작용하도록 하세요.'
      },
      uk: {
        title: 'Всі мої емоції разом',
        theme: 'Емоційна інтеграція',
        description: 'Намалюйте всі ваші емоції співіснуючими. Як вони взаємодіють? Чи може у всіх бути місце?',
        drawingPrompt: 'Створіть композицію, що показує всі ваші емоції водночас. Дозвольте їм співіснувати, перетинатися, взаємодіяти.'
      },
      pl: {
        title: 'Wszystkie Moje Emocje Razem',
        theme: 'Integracja Emocjonalna',
        description: 'Narysuj wszystkie swoje emocje współistniejące. Jak wzajemnie oddziałują? Czy wszystkie mogą mieć przestrzeń?',
        drawingPrompt: 'Stwórz kompozycję pokazującą wszystkie twoje emocje naraz. Pozwól im współistnieć, nakładać się, wchodzić w interakcje.'
      }
    }
  },

  // ==========================================
  // MODULE 4: FAMILY & ROOTS
  // ==========================================
  {
    id: 18,
    module: 4,
    icon: '🌳',
    color: '#059669',
    estimatedDuration: 45,
    focusAreas: ['family', 'roots', 'ancestry'],
    translations: {
      en: {
        title: 'My Family Tree',
        theme: 'Roots And Ancestry',
        description: 'Draw your family tree, but not just names - use colors, symbols, energy to show what each person means to you.',
        drawingPrompt: 'Create a visual family tree. Use size, color, distance, symbols to show relationships and dynamics.'
      },
      ka: {
        title: 'ჩემი ოჯახური ხე',
        theme: 'ფესვები და წინაპრები',
        description: 'დახატე შენი ოჯახური ხე, მაგრამ არა უბრალოდ სახელები - გამოიყენე ფერები, სიმბოლოები, ენერგია რომ აჩვენო რას ნიშნავს თითოეული ადამიანი შენთვის.',
        drawingPrompt: 'შექმენი ვიზუალური ოჯახური ხე. გამოიყენე ზომა, ფერი, მანძილი, სიმბოლოები რომ აჩვენო ურთიერთობები და დინამიკა.'
      },
      ru: {
        title: 'Мое семейное древо',
        theme: 'Корни и предки',
        description: 'Нарисуйте свое семейное древо, но не просто имена - используйте цвета, символы, энергию, чтобы показать, что означает каждый человек для вас.',
        drawingPrompt: 'Создайте визуальное семейное древо. Используйте размер, цвет, расстояние, символы, чтобы показать отношения и динамику.'
      },
      hy: {
        title: 'Իմ ընտանեկան ծառը',
        theme: 'Արմատներ և նախնիներ',
        description: 'Նկարեք ձեր ընտանեկան ծառը, բայց ոչ միայն անունները - օգտագործեք գույներ, խորհրդանիշներ, էներգիա ցույց տալու համար ինչ նշանակություն ունի յուրաքանչյուր մարդ ձեզ համար:',
        drawingPrompt: 'Ստեղծեք տեսողական ընտանեկան ծառ: Օգտագործեք չափ, գույն, հեռավորություն, խորհրդանիշներ հարաբերություններն ու դինամիկան ցույց տալու համար:'
      },
      tr: {
        title: 'Aile Ağacım',
        theme: 'Kökler Ve Atalar',
        description: 'Aile ağacını çiz, ama sadece isimler değil - her kişinin senin için ne anlama geldiğini göstermek için renkler, semboller, enerji kullan.',
        drawingPrompt: 'Görsel bir aile ağacı oluştur. İlişkileri ve dinamikleri göstermek için boyut, renk, mesafe, semboller kullan.'
      },
      az: {
        title: 'Mənim Ailə Ağacım',
        theme: 'Köklər Və Əcdadlar',
        description: 'Ailə ağacınızı çəkin, amma sadəcə adlar deyil - hər bir insanın sizin üçün nə demək olduğunu göstərmək üçün rənglər, simvollar, enerji istifadə edin.',
        drawingPrompt: 'Vizual ailə ağacı yaradın. Münasibətləri və dinamikanı göstərmək üçün ölçü, rəng, məsafə, simvollardan istifadə edin.'
      },
      es: {
        title: 'Mi Árbol Genealógico',
        theme: 'Raíces Y Ancestros',
        description: 'Dibuja tu árbol genealógico, pero no solo nombres - usa colores, símbolos, energía para mostrar lo que significa cada persona para ti.',
        drawingPrompt: 'Crea un árbol genealógico visual. Usa tamaño, color, distancia, símbolos para mostrar relaciones y dinámicas.'
      },
      de: {
        title: 'Mein Stammbaum',
        theme: 'Wurzeln Und Vorfahren',
        description: 'Zeichne deinen Stammbaum, aber nicht nur Namen - verwende Farben, Symbole, Energie, um zu zeigen, was jede Person für dich bedeutet.',
        drawingPrompt: 'Erstelle einen visuellen Stammbaum. Verwende Größe, Farbe, Abstand, Symbole, um Beziehungen und Dynamik zu zeigen.'
      },
      fr: {
        title: 'Mon Arbre Généalogique',
        theme: 'Racines Et Ancêtres',
        description: 'Dessine ton arbre généalogique, mais pas seulement des noms - utilise des couleurs, des symboles, de l\'énergie pour montrer ce que chaque personne signifie pour toi.',
        drawingPrompt: 'Crée un arbre généalogique visuel. Utilise la taille, la couleur, la distance, les symboles pour montrer les relations et la dynamique.'
      },
      pt: {
        title: 'Minha Árvore Genealógica',
        theme: 'Raízes E Ancestrais',
        description: 'Desenhe sua árvore genealógica, mas não apenas nomes - use cores, símbolos, energia para mostrar o que cada pessoa significa para você.',
        drawingPrompt: 'Crie uma árvore genealógica visual. Use tamanho, cor, distância, símbolos para mostrar relacionamentos e dinâmicas.'
      },
      id: {
        title: 'Pohon Keluargaku',
        theme: 'Akar Dan Leluhur',
        description: 'Gambar pohon keluargamu, tapi bukan hanya nama - gunakan warna, simbol, energi untuk menunjukkan apa arti setiap orang bagimu.',
        drawingPrompt: 'Buat pohon keluarga visual. Gunakan ukuran, warna, jarak, simbol untuk menunjukkan hubungan dan dinamika.'
      },
      it: {
        title: 'Il Mio Albero Genealogico',
        theme: 'Radici E Antenati',
        description: 'Disegna il tuo albero genealogico, ma non solo nomi - usa colori, simboli, energia per mostrare cosa significa ogni persona per te.',
        drawingPrompt: 'Crea un albero genealogico visivo. Usa dimensione, colore, distanza, simboli per mostrare relazioni e dinamiche.'
      },
      ar: {
        title: 'شجرة عائلتي',
        theme: 'الجذور والأسلاف',
        description: 'ارسم شجرة عائلتك، لكن ليس فقط الأسماء - استخدم الألوان والرموز والطاقة لإظهار ما يعنيه كل شخص بالنسبة لك.',
        drawingPrompt: 'أنشئ شجرة عائلة بصرية. استخدم الحجم واللون والمسافة والرموز لإظهار العلاقات والديناميكيات.'
      },
      hi: {
        title: 'मेरा पारिवारिक वृक्ष',
        theme: 'जड़ें और पूर्वज',
        description: 'अपना पारिवारिक वृक्ष बनाएं, लेकिन केवल नाम नहीं - रंग, प्रतीक, ऊर्जा का उपयोग करें यह दिखाने के लिए कि प्रत्येक व्यक्ति आपके लिए क्या मायने रखता है।',
        drawingPrompt: 'एक दृश्य पारिवारिक वृक्ष बनाएं। संबंधों और गतिशीलता को दिखाने के लिए आकार, रंग, दूरी, प्रतीकों का उपयोग करें।'
      },
      zh: {
        title: '我的家族树',
        theme: '根与祖先',
        description: '画出你的家族树，但不仅仅是名字——用颜色、符号、能量来展示每个人对你的意义。',
        drawingPrompt: '创建一个视觉家族树。使用大小、颜色、距离、符号来展示关系和动态。'
      },
      ja: {
        title: '私の家族の木',
        theme: 'ルーツと祖先',
        description: 'あなたの家族の木を描いてください。ただし名前だけでなく - 色、シンボル、エネルギーを使って、各人があなたにとって何を意味するかを示してください。',
        drawingPrompt: '視覚的な家族の木を作成してください。サイズ、色、距離、シンボルを使って関係性とダイナミクスを示してください。'
      },
      ko: {
        title: '나의 가계도',
        theme: '뿌리와 조상',
        description: '가계도를 그리되, 이름만이 아니라 - 색상, 기호, 에너지를 사용하여 각 사람이 당신에게 무엇을 의미하는지 보여주세요.',
        drawingPrompt: '시각적 가계도를 만드세요. 관계와 역학을 보여주기 위해 크기, 색상, 거리, 기호를 사용하세요.'
      },
      uk: {
        title: 'Моє сімейне дерево',
        theme: 'Коріння та предки',
        description: 'Намалюйте своє сімейне дерево, але не просто імена - використовуйте кольори, символи, енергію, щоб показати, що означає кожна людина для вас.',
        drawingPrompt: 'Створіть візуальне сімейне дерево. Використовуйте розмір, колір, відстань, символи, щоб показати відносини та динаміку.'
      },
      pl: {
        title: 'Moje Drzewo Genealogiczne',
        theme: 'Korzenie I Przodkowie',
        description: 'Narysuj swoje drzewo genealogiczne, ale nie tylko imiona - użyj kolorów, symboli, energii, aby pokazać, co każda osoba znaczy dla ciebie.',
        drawingPrompt: 'Stwórz wizualne drzewo genealogiczne. Użyj rozmiaru, koloru, odległości, symboli, aby pokazać relacje i dynamikę.'
      }
    }
  },

  {
    id: 19,
    module: 4,
    icon: '👩',
    color: '#F472B6',
    estimatedDuration: 50,
    focusAreas: ['family', 'mother', 'relationships'],
    translations: {
      en: {
        title: 'Relationship With Mother',
        theme: 'Maternal Bond',
        description: 'Draw your relationship with your mother (or mother figure). Not her portrait, but the relationship itself.',
        drawingPrompt: 'Visualize the bond with your mother. What does it feel like? What color, shape, distance?'
      },
      ka: {
        title: 'ურთიერთობა დედასთან',
        theme: 'დედის ბმა',
        description: 'დახატე შენი ურთიერთობა შენს დედასთან (ან დედის ფიგურასთან). არა მისი პორტრეტი, არამედ თავად ურთიერთობა.',
        drawingPrompt: 'ვიზუალიზაცია გააკეთე დედასთან ბმას. როგორ გრძნობს? რა ფერი, ფორმა, მანძილი?'
      },
      ru: {
        title: 'Отношения с матерью',
        theme: 'Материнская связь',
        description: 'Нарисуйте ваши отношения с матерью (или материнской фигурой). Не её портрет, а сами отношения.',
        drawingPrompt: 'Визуализируйте связь с вашей матерью. Каково это? Какой цвет, форма, расстояние?'
      },
      hy: {
        title: 'Մորս հետ հարաբերությունները',
        theme: 'Մայրական կապ',
        description: 'Նկարեք ձեր հարաբերությունները ձեր մոր հետ (կամ մոր դերը խաղացող անձի): Ոչ նրա դիմանկարը, այլ հարաբերությունները:',
        drawingPrompt: 'Վիզուալացրեք կապը ձեր մոր հետ: Ինչպիսի՞ն է: Ինչ գույն, ձև, հեռավորություն:'
      },
      tr: {
        title: 'Anne İle İlişki',
        theme: 'Anne Bağı',
        description: 'Annenle (veya anne figürüyle) ilişkini çiz. Onun portresi değil, ilişkinin kendisi.',
        drawingPrompt: 'Annenle bağını görselleştir. Nasıl hissettiriyor? Hangi renk, şekil, mesafe?'
      },
      az: {
        title: 'Ana İlə Münasibət',
        theme: 'Ana Bağı',
        description: 'Ananızla (və ya ana rolu oynayan şəxslə) münasibətinizi çəkin. Onun portreti deyil, münasibətin özü.',
        drawingPrompt: 'Ananızla bağınızı vizuallaşdırın. Necə hiss olunur? Hansı rəng, forma, məsafə?'
      },
      es: {
        title: 'Relación Con La Madre',
        theme: 'Vínculo Materno',
        description: 'Dibuja tu relación con tu madre (o figura materna). No su retrato, sino la relación misma.',
        drawingPrompt: 'Visualiza el vínculo con tu madre. ¿Cómo se siente? ¿Qué color, forma, distancia?'
      },
      de: {
        title: 'Beziehung Zur Mutter',
        theme: 'Mütterliche Bindung',
        description: 'Zeichne deine Beziehung zu deiner Mutter (oder Mutterfigur). Nicht ihr Porträt, sondern die Beziehung selbst.',
        drawingPrompt: 'Visualisiere die Bindung zu deiner Mutter. Wie fühlt es sich an? Welche Farbe, Form, Entfernung?'
      },
      fr: {
        title: 'Relation Avec La Mère',
        theme: 'Lien Maternel',
        description: 'Dessine ta relation avec ta mère (ou figure maternelle). Pas son portrait, mais la relation elle-même.',
        drawingPrompt: 'Visualise le lien avec ta mère. Comment ça se sent? Quelle couleur, forme, distance?'
      },
      pt: {
        title: 'Relacionamento Com A Mãe',
        theme: 'Vínculo Materno',
        description: 'Desenhe seu relacionamento com sua mãe (ou figura materna). Não o retrato dela, mas o próprio relacionamento.',
        drawingPrompt: 'Visualize o vínculo com sua mãe. Como se sente? Qual cor, forma, distância?'
      },
      id: {
        title: 'Hubungan Dengan Ibu',
        theme: 'Ikatan Ibu',
        description: 'Gambar hubunganmu dengan ibumu (atau figur ibu). Bukan potretnya, tapi hubungannya sendiri.',
        drawingPrompt: 'Visualisasikan ikatan dengan ibumu. Bagaimana rasanya? Warna, bentuk, jarak apa?'
      },
      it: {
        title: 'Relazione Con La Madre',
        theme: 'Legame Materno',
        description: 'Disegna la tua relazione con tua madre (o figura materna). Non il suo ritratto, ma la relazione stessa.',
        drawingPrompt: 'Visualizza il legame con tua madre. Come ci si sente? Che colore, forma, distanza?'
      },
      ar: {
        title: 'العلاقة مع الأم',
        theme: 'الرابط الأمومي',
        description: 'ارسم علاقتك مع أمك (أو شخصية الأم). ليس صورتها، بل العلاقة نفسها.',
        drawingPrompt: 'تصور الرابطة مع أمك. كيف تشعر بها؟ ما اللون والشكل والمسافة؟'
      },
      hi: {
        title: 'माँ के साथ संबंध',
        theme: 'मातृ बंधन',
        description: 'अपनी माँ (या मातृ व्यक्ति) के साथ अपने संबंध को बनाएं। उनका चित्र नहीं, बल्कि संबंध ही।',
        drawingPrompt: 'अपनी माँ के साथ बंधन की कल्पना करें। यह कैसा लगता है? क्या रंग, आकार, दूरी?'
      },
      zh: {
        title: '与母亲的关系',
        theme: '母子纽带',
        description: '画出你与母亲（或母亲般的人物）的关系。不是她的肖像，而是关系本身。',
        drawingPrompt: '将与母亲的纽带可视化。感觉如何？什么颜色、形状、距离？'
      },
      ja: {
        title: '母との関係',
        theme: '母子の絆',
        description: 'あなたの母親（または母親的な人物）との関係を描いてください。彼女の肖像画ではなく、関係そのものです。',
        drawingPrompt: '母親との絆を視覚化してください。どのように感じますか？どんな色、形、距離？'
      },
      ko: {
        title: '어머니와의 관계',
        theme: '모자 유대',
        description: '어머니(또는 어머니 같은 인물)와의 관계를 그려보세요. 그녀의 초상화가 아니라 관계 자체를.',
        drawingPrompt: '어머니와의 유대를 시각화하세요. 어떻게 느껴지나요? 어떤 색, 형태, 거리?'
      },
      uk: {
        title: 'Стосунки з матір\'ю',
        theme: 'Материнський зв\'язок',
        description: 'Намалюйте ваші стосунки з матір\'ю (або материнською фігурою). Не її портрет, а самі стосунки.',
        drawingPrompt: 'Візуалізуйте зв\'язок з вашою матір\'ю. Яке це відчуття? Який колір, форма, відстань?'
      },
      pl: {
        title: 'Relacja Z Matką',
        theme: 'Więź Macierzyńska',
        description: 'Narysuj swoją relację z matką (lub postacią matki). Nie jej portret, ale samą relację.',
        drawingPrompt: 'Zwizualizuj więź z matką. Jak to się czuje? Jaki kolor, kształt, odległość?'
      }
    }
  },

  {
    id: 20,
    module: 4,
    icon: '👨',
    color: '#3B82F6',
    estimatedDuration: 50,
    focusAreas: ['family', 'father', 'relationships'],
    translations: {
      en: {
        title: 'Relationship With Father',
        theme: 'Paternal Bond',
        description: 'Draw your relationship with your father (or father figure). What does this connection look like?',
        drawingPrompt: 'Visualize the bond with your father. Is it strong, distant, complicated? Show it visually.'
      },
      ka: {
        title: 'ურთიერთობა მამასთან',
        theme: 'მამის ბმა',
        description: 'დახატე შენი ურთიერთობა შენს მამასთან (ან მამის ფიგურასთან). როგორ გამოიყურება ეს კავშირი?',
        drawingPrompt: 'ვიზუალიზაცია გააკეთე მამასთან ბმას. ძლიერია, დაშორებული, რთული? აჩვენე ვიზუალურად.'
      },
      ru: {
        title: 'Отношения с отцом',
        theme: 'Отцовская связь',
        description: 'Нарисуйте ваши отношения с отцом (или отцовской фигурой). Как выглядит эта связь?',
        drawingPrompt: 'Визуализируйте связь с вашим отцом. Она сильная, дистанцированная, сложная? Покажите визуально.'
      },
      hy: {
        title: 'Հորս հետ հարաբերությունները',
        theme: 'Հայրական կապ',
        description: 'Նկարեք ձեր հարաբերությունները ձեր հոր հետ (կամ հոր դերը խաղացող անձի): Ինչպիսի՞ն է այս կապը:',
        drawingPrompt: 'Վիզուալացրեք կապը ձեր հոր հետ: Ուժեղ է, հեռավոր, բարդ: Ցույց տվեք տեսողականորեն:'
      },
      tr: {
        title: 'Baba İle İlişki',
        theme: 'Baba Bağı',
        description: 'Babanla (veya baba figürüyle) ilişkini çiz. Bu bağlantı nasıl görünüyor?',
        drawingPrompt: 'Babanla bağını görselleştir. Güçlü mü, uzak mı, karmaşık mı? Görsel olarak göster.'
      },
      az: {
        title: 'Ata İlə Münasibət',
        theme: 'Ata Bağı',
        description: 'Atanızla (və ya ata rolu oynayan şəxslə) münasibətinizi çəkin. Bu əlaqə necə görünür?',
        drawingPrompt: 'Atanızla bağınızı vizuallaşdırın. Güclü, uzaq, mürəkkəb? Vizual olaraq göstərin.'
      },
      es: {
        title: 'Relación Con El Padre',
        theme: 'Vínculo Paterno',
        description: 'Dibuja tu relación con tu padre (o figura paterna). ¿Cómo se ve esta conexión?',
        drawingPrompt: 'Visualiza el vínculo con tu padre. ¿Es fuerte, distante, complicado? Muéstralo visualmente.'
      },
      de: {
        title: 'Beziehung Zum Vater',
        theme: 'Väterliche Bindung',
        description: 'Zeichne deine Beziehung zu deinem Vater (oder Vaterfigur). Wie sieht diese Verbindung aus?',
        drawingPrompt: 'Visualisiere die Bindung zu deinem Vater. Ist sie stark, distanziert, kompliziert? Zeige es visuell.'
      },
      fr: {
        title: 'Relation Avec Le Père',
        theme: 'Lien Paternel',
        description: 'Dessine ta relation avec ton père (ou figure paternelle). À quoi ressemble cette connexion?',
        drawingPrompt: 'Visualise le lien avec ton père. Est-il fort, distant, compliqué? Montre-le visuellement.'
      },
      pt: {
        title: 'Relacionamento Com O Pai',
        theme: 'Vínculo Paterno',
        description: 'Desenhe seu relacionamento com seu pai (ou figura paterna). Como é essa conexão?',
        drawingPrompt: 'Visualize o vínculo com seu pai. É forte, distante, complicado? Mostre visualmente.'
      },
      id: {
        title: 'Hubungan Dengan Ayah',
        theme: 'Ikatan Ayah',
        description: 'Gambar hubunganmu dengan ayahmu (atau figur ayah). Seperti apa koneksi ini?',
        drawingPrompt: 'Visualisasikan ikatan dengan ayahmu. Apakah kuat, jauh, rumit? Tunjukkan secara visual.'
      },
      it: {
        title: 'Relazione Con Il Padre',
        theme: 'Legame Paterno',
        description: 'Disegna la tua relazione con tuo padre (o figura paterna). Come appare questa connessione?',
        drawingPrompt: 'Visualizza il legame con tuo padre. È forte, distante, complicato? Mostralo visualmente.'
      },
      ar: {
        title: 'العلاقة مع الأب',
        theme: 'الرابط الأبوي',
        description: 'ارسم علاقتك مع والدك (أو شخصية الأب). كيف يبدو هذا الاتصال؟',
        drawingPrompt: 'تصور الرابطة مع والدك. هل هي قوية، بعيدة، معقدة؟ أظهرها بصرياً.'
      },
      hi: {
        title: 'पिता के साथ संबंध',
        theme: 'पैतृक बंधन',
        description: 'अपने पिता (या पैतृक व्यक्ति) के साथ अपने संबंध को बनाएं। यह कनेक्शन कैसा दिखता है?',
        drawingPrompt: 'अपने पिता के साथ बंधन की कल्पना करें। क्या यह मजबूत, दूर, जटिल है? इसे दृश्य रूप से दिखाएं।'
      },
      zh: {
        title: '与父亲的关系',
        theme: '父子纽带',
        description: '画出你与父亲（或父亲般的人物）的关系。这种联系看起来如何？',
        drawingPrompt: '将与父亲的纽带可视化。是强烈、疏远还是复杂？用视觉展示。'
      },
      ja: {
        title: '父との関係',
        theme: '父子の絆',
        description: 'あなたの父親（または父親的な人物）との関係を描いてください。この繋がりはどのように見えますか？',
        drawingPrompt: '父親との絆を視覚化してください。それは強いですか、遠いですか、複雑ですか？視覚的に示してください。'
      },
      ko: {
        title: '아버지와의 관계',
        theme: '부자 유대',
        description: '아버지(또는 아버지 같은 인물)와의 관계를 그려보세요. 이 연결은 어떻게 보이나요?',
        drawingPrompt: '아버지와의 유대를 시각화하세요. 강한가요, 먼가요, 복잡한가요? 시각적으로 보여주세요.'
      },
      uk: {
        title: 'Стосунки з батьком',
        theme: 'Батьківський зв\'язок',
        description: 'Намалюйте ваші стосунки з батьком (або батьківською фігурою). Як виглядає цей зв\'язок?',
        drawingPrompt: 'Візуалізуйте зв\'язок з вашим батьком. Він сильний, дистанційований, складний? Покажіть візуально.'
      },
      pl: {
        title: 'Relacja Z Ojcem',
        theme: 'Więź Ojcowska',
        description: 'Narysuj swoją relację z ojcem (lub postacią ojca). Jak wygląda to połączenie?',
        drawingPrompt: 'Zwizualizuj więź z ojcem. Czy jest silna, dystansowa, skomplikowana? Pokaż to wizualnie.'
      }
    }
  },

  {
    id: 21,
    module: 4,
    icon: '👥',
    color: '#F59E0B',
    estimatedDuration: 45,
    focusAreas: ['family', 'siblings', 'relationships'],
    translations: {
      en: {
        title: 'Sibling Dynamics',
        theme: 'Brothers And Sisters',
        description: 'If you have siblings, draw your relationship with them. If you don\'t, draw what it feels like to be an only child.',
        drawingPrompt: 'Show the dynamics between you and your siblings (or your experience as an only child).'
      },
      ka: {
        title: 'ძმა-დების დინამიკა',
        theme: 'ძმები და დები',
        description: 'თუ გაქვს ძმები ან დები, დახატე შენი ურთიერთობა მათთან. თუ არ გაქვს, დახატე როგორია იყო ერთადერთი შვილი.',
        drawingPrompt: 'აჩვენე დინამიკა შენსა და შენს ძმებ-დებს შორის (ან შენი გამოცდილება როგორც ერთადერთი შვილის).'
      },
      ru: {
        title: 'Динамика братьев и сестер',
        theme: 'Братья и сестры',
        description: 'Если у вас есть братья или сестры, нарисуйте ваши отношения с ними. Если нет, нарисуйте, каково быть единственным ребенком.',
        drawingPrompt: 'Покажите динамику между вами и вашими братьями/сестрами (или ваш опыт как единственного ребенка).'
      },
      hy: {
        title: 'Եղբայր-քույրների դինամիկա',
        theme: 'Եղբայրներ և քույրեր',
        description: 'Եթե ունեք եղբայրներ կամ քույրեր, նկարեք ձեր հարաբերությունները նրանց հետ: Եթե չունեք, նկարեք ինչպիսին է լինել միակ երեխա:',
        drawingPrompt: 'Ցույց տվեք դինամիկան ձեր և ձեր եղբայր-քույրների միջև (կամ ձեր փորձը որպես միակ երեխայի):'
      },
      tr: {
        title: 'Kardeş Dinamikleri',
        theme: 'Erkek Ve Kız Kardeşler',
        description: 'Kardeşlerin varsa, onlarla ilişkini çiz. Yoksa, tek çocuk olmanın nasıl bir şey olduğunu çiz.',
        drawingPrompt: 'Sen ve kardeşlerin arasındaki dinamiği göster (veya tek çocuk olarak deneyimini).'
      },
      az: {
        title: 'Qardaş-Bacı Dinamikası',
        theme: 'Qardaşlar Və Bacılar',
        description: 'Əgər qardaşlarınız və ya bacılarınız varsa, onlarla münasibətinizi çəkin. Yoxdursa, tək uşaq olmağın necə olduğunu çəkin.',
        drawingPrompt: 'Siz və qardaş-bacılarınız arasında dinamikanı göstərin (və ya tək uşaq kimi təcrübənizi).'
      },
      es: {
        title: 'Dinámica Entre Hermanos',
        theme: 'Hermanos Y Hermanas',
        description: 'Si tienes hermanos, dibuja tu relación con ellos. Si no, dibuja cómo se siente ser hijo único.',
        drawingPrompt: 'Muestra la dinámica entre tú y tus hermanos (o tu experiencia como hijo único).'
      },
      de: {
        title: 'Geschwisterdynamik',
        theme: 'Brüder Und Schwestern',
        description: 'Wenn du Geschwister hast, zeichne deine Beziehung zu ihnen. Wenn nicht, zeichne, wie es ist, Einzelkind zu sein.',
        drawingPrompt: 'Zeige die Dynamik zwischen dir und deinen Geschwistern (oder deine Erfahrung als Einzelkind).'
      },
      fr: {
        title: 'Dynamique Fraternelle',
        theme: 'Frères Et Sœurs',
        description: 'Si tu as des frères et sœurs, dessine ta relation avec eux. Sinon, dessine ce que c\'est d\'être enfant unique.',
        drawingPrompt: 'Montre la dynamique entre toi et tes frères/sœurs (ou ton expérience en tant qu\'enfant unique).'
      },
      pt: {
        title: 'Dinâmica Entre Irmãos',
        theme: 'Irmãos E Irmãs',
        description: 'Se você tem irmãos, desenhe seu relacionamento com eles. Se não, desenhe como é ser filho único.',
        drawingPrompt: 'Mostre a dinâmica entre você e seus irmãos (ou sua experiência como filho único).'
      },
      id: {
        title: 'Dinamika Saudara',
        theme: 'Kakak Dan Adik',
        description: 'Jika kamu punya saudara, gambar hubunganmu dengan mereka. Jika tidak, gambar bagaimana rasanya menjadi anak tunggal.',
        drawingPrompt: 'Tunjukkan dinamika antara kamu dan saudaramu (atau pengalamanmu sebagai anak tunggal).'
      },
      it: {
        title: 'Dinamiche Tra Fratelli',
        theme: 'Fratelli E Sorelle',
        description: 'Se hai fratelli o sorelle, disegna la tua relazione con loro. Se non ne hai, disegna com\'è essere figlio unico.',
        drawingPrompt: 'Mostra le dinamiche tra te e i tuoi fratelli/sorelle (o la tua esperienza come figlio unico).'
      },
      ar: {
        title: 'ديناميكيات الأشقاء',
        theme: 'الإخوة والأخوات',
        description: 'إذا كان لديك أشقاء، ارسم علاقتك معهم. إذا لم يكن لديك، ارسم كيف يكون أن تكون طفلاً وحيداً.',
        drawingPrompt: 'أظهر الديناميكيات بينك وبين أشقائك (أو تجربتك كطفل وحيد).'
      },
      hi: {
        title: 'भाई-बहन की गतिशीलता',
        theme: 'भाई और बहनें',
        description: 'यदि आपके भाई-बहन हैं, तो उनके साथ अपने संबंध को बनाएं। यदि नहीं, तो एकमात्र बच्चा होने का एहसास बनाएं।',
        drawingPrompt: 'आप और आपके भाई-बहनों के बीच की गतिशीलता दिखाएं (या एकमात्र बच्चे के रूप में आपका अनुभव)।'
      },
      zh: {
        title: '兄弟姐妹动态',
        theme: '兄弟姐妹',
        description: '如果你有兄弟姐妹，画出你与他们的关系。如果没有，画出作为独生子女的感觉。',
        drawingPrompt: '展示你和你的兄弟姐妹之间的动态（或作为独生子女的经历）。'
      },
      ja: {
        title: 'きょうだいのダイナミクス',
        theme: '兄弟姉妹',
        description: 'きょうだいがいる場合は、彼らとの関係を描いてください。いない場合は、一人っ子であることがどのようなものかを描いてください。',
        drawingPrompt: 'あなたときょうだいの間のダイナミクスを示してください（または一人っ子としての経験）。'
      },
      ko: {
        title: '형제자매 역학',
        theme: '형제와 자매',
        description: '형제자매가 있다면 그들과의 관계를 그려보세요. 없다면 외동으로 사는 것이 어떤 느낌인지 그려보세요.',
        drawingPrompt: '당신과 형제자매 사이의 역학을 보여주세요 (또는 외동으로서의 경험).'
      },
      uk: {
        title: 'Динаміка братів і сестер',
        theme: 'Брати і сестри',
        description: 'Якщо у вас є брати або сестри, намалюйте ваші стосунки з ними. Якщо немає, намалюйте, каково бути єдиною дитиною.',
        drawingPrompt: 'Покажіть динаміку між вами та вашими братами/сестрами (або ваш досвід як єдиної дитини).'
      },
      pl: {
        title: 'Dynamika Rodzeństwa',
        theme: 'Bracia I Siostry',
        description: 'Jeśli masz rodzeństwo, narysuj swoją relację z nimi. Jeśli nie, narysuj jak to jest być jedynakiem.',
        drawingPrompt: 'Pokaż dynamikę między tobą a twoim rodzeństwem (lub twoje doświadczenie jako jedynaka).'
      }
    }
  },

  {
    id: 22,
    module: 4,
    icon: '🏠',
    color: '#EF4444',
    estimatedDuration: 45,
    focusAreas: ['family', 'home', 'belonging'],
    translations: {
      en: {
        title: 'Home - Place Or Feeling',
        theme: 'Sense Of Belonging',
        description: 'Draw what "home" means to you. Is it a place, a person, a feeling? Where do you truly belong?',
        drawingPrompt: 'Create a visual representation of "home" as you feel it - not necessarily a building.'
      },
      ka: {
        title: 'სახლი - ადგილი თუ გრძნობა',
        theme: 'კუთვნილების შეგრძნება',
        description: 'დახატე რას ნიშნავს "სახლი" შენთვის. ადგილია, ადამიანი, გრძნობა? სად ეკუთვნი ნამდვილად?',
        drawingPrompt: 'შექმენი "სახლის" ვიზუალური წარმოდგენა როგორც გრძნობ - არაუცილებლად შენობა.'
      },
      ru: {
        title: 'Дом - место или чувство',
        theme: 'Чувство принадлежности',
        description: 'Нарисуйте, что означает для вас "дом". Это место, человек, чувство? Где вы действительно принадлежите?',
        drawingPrompt: 'Создайте визуальное представление "дома" как вы его чувствуете - не обязательно здание.'
      },
      hy: {
        title: 'Տուն - Վայր թե Զգացում',
        theme: 'Պատկանելության զգացում',
        description: 'Նկարեք ինչ է նշանակում "տուն" ձեզ համար: Դա վայր է, մարդ, զգացում: Որտե՞ղ եք իրականում պատկանում:',
        drawingPrompt: 'Ստեղծեք "տան" տեսողական ներկայացում ինչպես զգում եք - անպայման շենք չէ:'
      },
      tr: {
        title: 'Ev - Yer Mi Duygu Mu',
        theme: 'Aidiyet Duygusu',
        description: '"Ev"in senin için ne anlama geldiğini çiz. Bir yer mi, bir insan mı, bir duygu mu? Gerçekten nereye aitsin?',
        drawingPrompt: '"Ev"in görsel bir temsilini oluştur - hissettiğin gibi, mutlaka bir bina olmak zorunda değil.'
      },
      az: {
        title: 'Ev - Yer Yoxsa Hiss',
        theme: 'Mənsubiyyət Hissi',
        description: '"Ev"in sizin üçün nə demək olduğunu çəkin. Yer, insan, hiss: Həqiqətən haraya aidsiniz:',
        drawingPrompt: '"Ev"in vizual təsvirini yaradın - hiss etdiyiniz kimi, mütləq bina olması lazım deyil.'
      },
      es: {
        title: 'Hogar - Lugar O Sentimiento',
        theme: 'Sentido De Pertenencia',
        description: 'Dibuja qué significa "hogar" para ti. ¿Es un lugar, una persona, un sentimiento? ¿Dónde perteneces realmente?',
        drawingPrompt: 'Crea una representación visual de "hogar" como lo sientes - no necesariamente un edificio.'
      },
      de: {
        title: 'Zuhause - Ort Oder Gefühl',
        theme: 'Zugehörigkeitsgefühl',
        description: 'Zeichne, was "Zuhause" für dich bedeutet. Ist es ein Ort, eine Person, ein Gefühl? Wo gehörst du wirklich hin?',
        drawingPrompt: 'Erstelle eine visuelle Darstellung von "Zuhause" wie du es fühlst - nicht unbedingt ein Gebäude.'
      },
      fr: {
        title: 'Maison - Lieu Ou Sentiment',
        theme: 'Sentiment D\'appartenance',
        description: 'Dessine ce que "maison" signifie pour toi. Est-ce un lieu, une personne, un sentiment? Où appartiens-tu vraiment?',
        drawingPrompt: 'Crée une représentation visuelle de "maison" comme tu le ressens - pas nécessairement un bâtiment.'
      },
      pt: {
        title: 'Lar - Lugar Ou Sentimento',
        theme: 'Senso De Pertencimento',
        description: 'Desenhe o que "lar" significa para você. É um lugar, uma pessoa, um sentimento? Onde você realmente pertence?',
        drawingPrompt: 'Crie uma representação visual de "lar" como você sente - não necessariamente um edifício.'
      },
      id: {
        title: 'Rumah - Tempat Atau Perasaan',
        theme: 'Rasa Memiliki',
        description: 'Gambar apa arti "rumah" bagimu. Apakah itu tempat, orang, perasaan? Di mana kamu benar-benar memiliki?',
        drawingPrompt: 'Buat representasi visual "rumah" seperti yang kamu rasakan - tidak harus bangunan.'
      },
      it: {
        title: 'Casa - Luogo O Sentimento',
        theme: 'Senso Di Appartenenza',
        description: 'Disegna cosa significa "casa" per te. È un luogo, una persona, un sentimento? Dove appartieni veramente?',
        drawingPrompt: 'Crea una rappresentazione visiva di "casa" come la senti - non necessariamente un edificio.'
      },
      ar: {
        title: 'المنزل - مكان أم شعور',
        theme: 'الشعور بالانتماء',
        description: 'ارسم ما يعنيه "المنزل" بالنسبة لك. هل هو مكان، شخص، شعور؟ أين تنتمي حقاً؟',
        drawingPrompt: 'أنشئ تمثيلاً بصرياً "للمنزل" كما تشعر به - ليس بالضرورة مبنى.'
      },
      hi: {
        title: 'घर - स्थान या भावना',
        theme: 'संबंधित होने की भावना',
        description: '"घर" आपके लिए क्या मायने रखता है बनाएं। क्या यह जगह, व्यक्ति, भावना है? आप वास्तव में कहाँ संबंधित हैं?',
        drawingPrompt: '"घर" का एक दृश्य प्रतिनिधित्व बनाएं जैसा आप महसूस करते हैं - जरूरी नहीं कि इमारत हो।'
      },
      zh: {
        title: '家——地方还是感觉',
        theme: '归属感',
        description: '画出"家"对你意味着什么。是一个地方、一个人还是一种感觉？你真正属于哪里？',
        drawingPrompt: '创造"家"的视觉表现，按你的感受——不一定是建筑。'
      },
      ja: {
        title: '家 - 場所か感情か',
        theme: '帰属意識',
        description: '「家」があなたにとって何を意味するか描いてください。それは場所ですか、人ですか、感情ですか？あなたは本当にどこに属していますか？',
        drawingPrompt: '「家」の視覚的表現を作成してください - あなたが感じるように、必ずしも建物である必要はありません。'
      },
      ko: {
        title: '집 - 장소인가 감정인가',
        theme: '소속감',
        description: '"집"이 당신에게 무엇을 의미하는지 그려보세요. 장소인가요, 사람인가요, 감정인가요? 정말 어디에 속해 있나요?',
        drawingPrompt: '느끼는 대로 "집"의 시각적 표현을 만드세요 - 반드시 건물일 필요는 없습니다.'
      },
      uk: {
        title: 'Дім - місце чи почуття',
        theme: 'Почуття належності',
        description: 'Намалюйте, що означає для вас "дім". Це місце, людина, почуття? Де ви дійсно належите?',
        drawingPrompt: 'Створіть візуальне представлення "дому" як ви його відчуваєте - не обов\'язково будівля.'
      },
      pl: {
        title: 'Dom - Miejsce Czy Uczucie',
        theme: 'Poczucie Przynależności',
        description: 'Narysuj co oznacza dla ciebie "dom". Czy to miejsce, osoba, uczucie? Gdzie naprawdę należysz?',
        drawingPrompt: 'Stwórz wizualną reprezentację "domu" jak go czujesz - niekoniecznie budynek.'
      }
    }
  },

  {
    id: 23,
    module: 4,
    icon: '🎭',
    color: '#A855F7',
    estimatedDuration: 50,
    focusAreas: ['family', 'roles', 'identity'],
    translations: {
      en: {
        title: 'My Role In The Family',
        theme: 'Family Roles',
        description: 'What role did you play in your family? The peacemaker, the rebel, the caretaker, the invisible one?',
        drawingPrompt: 'Draw your role in the family system. Show it symbolically - not necessarily realistic.'
      },
      ka: {
        title: 'ჩემი როლი ოჯახში',
        theme: 'ოჯახური როლები',
        description: 'რა როლს ასრულებდი შენს ოჯახში? მშვიდობის მომტანი, ამბოხებული, მზრუნველი, უხილავი?',
        drawingPrompt: 'დახატე შენი როლი ოჯახურ სისტემაში. აჩვენე სიმბოლურად - არაუცილებლად რეალისტურად.'
      },
      ru: {
        title: 'Моя роль в семье',
        theme: 'Семейные роли',
        description: 'Какую роль вы играли в своей семье? Миротворец, бунтарь, опекун, невидимка?',
        drawingPrompt: 'Нарисуйте свою роль в семейной системе. Покажите символически - не обязательно реалистично.'
      },
      hy: {
        title: 'Իմ դերը ընտանիքում',
        theme: 'Ընտանեկան դերեր',
        description: 'Ի՞նչ դեր էիք խաղում ձեր ընտանիքում: Խաղաղարար, ապստամբ, խնամող, անտեսանելի:',
        drawingPrompt: 'Նկարեք ձեր դերը ընտանեկան համակարգում: Ցույց տվեք խորհրդանշական - անպայման ռեալիստական չէ:'
      },
      tr: {
        title: 'Ailedeki Rolüm',
        theme: 'Aile Rolleri',
        description: 'Ailende hangi rolü oynadın? Barış yapıcı, asi, bakıcı, görünmez olan?',
        drawingPrompt: 'Aile sistemindeki rolünü çiz. Sembolik olarak göster - mutlaka gerçekçi olmak zorunda değil.'
      },
      az: {
        title: 'Ailədə Mənim Rolum',
        theme: 'Ailə Rolları',
        description: 'Ailənizde hansı rolu oynadınız? Sülh bərqərar edən, üsyankar, baxıcı, görünməz olan?',
        drawingPrompt: 'Ailə sistemində rolunuzu çəkin. Simvolik olaraq göstərin - mütləq realist olmaq lazım deyil.'
      },
      es: {
        title: 'Mi Rol En La Familia',
        theme: 'Roles Familiares',
        description: '¿Qué rol jugaste en tu familia? ¿El pacificador, el rebelde, el cuidador, el invisible?',
        drawingPrompt: 'Dibuja tu rol en el sistema familiar. Muéstralo simbólicamente - no necesariamente realista.'
      },
      de: {
        title: 'Meine Rolle In Der Familie',
        theme: 'Familienrollen',
        description: 'Welche Rolle hast du in deiner Familie gespielt? Der Friedensstifter, der Rebell, der Betreuer, der Unsichtbare?',
        drawingPrompt: 'Zeichne deine Rolle im Familiensystem. Zeige es symbolisch - nicht unbedingt realistisch.'
      },
      fr: {
        title: 'Mon Rôle Dans La Famille',
        theme: 'Rôles Familiaux',
        description: 'Quel rôle as-tu joué dans ta famille? Le pacificateur, le rebelle, le soignant, l\'invisible?',
        drawingPrompt: 'Dessine ton rôle dans le système familial. Montre-le symboliquement - pas nécessairement réaliste.'
      },
      pt: {
        title: 'Meu Papel Na Família',
        theme: 'Papéis Familiares',
        description: 'Que papel você desempenhou em sua família? O pacificador, o rebelde, o cuidador, o invisível?',
        drawingPrompt: 'Desenhe seu papel no sistema familiar. Mostre simbolicamente - não necessariamente realista.'
      },
      id: {
        title: 'Peranku Dalam Keluarga',
        theme: 'Peran Keluarga',
        description: 'Peran apa yang kamu mainkan dalam keluargamu? Pembawa damai, pemberontak, pengasuh, yang tak terlihat?',
        drawingPrompt: 'Gambar peranmu dalam sistem keluarga. Tunjukkan secara simbolis - tidak harus realistis.'
      },
      it: {
        title: 'Il Mio Ruolo In Famiglia',
        theme: 'Ruoli Familiari',
        description: 'Che ruolo hai giocato nella tua famiglia? Il paciere, il ribelle, il caregiver, l\'invisibile?',
        drawingPrompt: 'Disegna il tuo ruolo nel sistema familiare. Mostralo simbolicamente - non necessariamente realistico.'
      },
      ar: {
        title: 'دوري في العائلة',
        theme: 'أدوار الأسرة',
        description: 'ما الدور الذي لعبته في عائلتك؟ صانع السلام، المتمرد، الراعي، الشخص غير المرئي؟',
        drawingPrompt: 'ارسم دورك في نظام الأسرة. أظهره رمزياً - ليس بالضرورة واقعياً.'
      },
      hi: {
        title: 'परिवार में मेरी भूमिका',
        theme: 'पारिवारिक भूमिकाएं',
        description: 'आपने अपने परिवार में कौन सी भूमिका निभाई? शांतिदूत, विद्रोही, देखभालकर्ता, अदृश्य?',
        drawingPrompt: 'पारिवारिक प्रणाली में अपनी भूमिका बनाएं। इसे प्रतीकात्मक रूप से दिखाएं - जरूरी नहीं यथार्थवादी।'
      },
      zh: {
        title: '我在家庭中的角色',
        theme: '家庭角色',
        description: '你在家庭中扮演什么角色？和平使者、叛逆者、照顾者、隐形人？',
        drawingPrompt: '画出你在家庭系统中的角色。象征性地展示——不一定要写实。'
      },
      ja: {
        title: '家族における私の役割',
        theme: '家族の役割',
        description: 'あなたは家族でどんな役割を果たしましたか？平和維持者、反抗者、世話役、見えない存在？',
        drawingPrompt: '家族システムにおけるあなたの役割を描いてください。象徴的に示してください - 必ずしもリアルである必要はありません。'
      },
      ko: {
        title: '가족에서의 나의 역할',
        theme: '가족 역할',
        description: '가족에서 어떤 역할을 했나요? 평화주의자, 반항아, 돌보는 사람, 보이지 않는 사람?',
        drawingPrompt: '가족 시스템에서 당신의 역할을 그려보세요. 상징적으로 보여주세요 - 반드시 사실적일 필요는 없습니다.'
      },
      uk: {
        title: 'Моя роль у сім\'ї',
        theme: 'Сімейні ролі',
        description: 'Яку роль ви грали у своїй сім\'ї? Миротворець, бунтар, опікун, невидимка?',
        drawingPrompt: 'Намалюйте свою роль у сімейній системі. Покажіть символічно - не обов\'язково реалістично.'
      },
      pl: {
        title: 'Moja Rola W Rodzinie',
        theme: 'Role Rodzinne',
        description: 'Jaką rolę grałeś w swojej rodzinie? Rozjemca, buntownik, opiekun, niewidoczny?',
        drawingPrompt: 'Narysuj swoją rolę w systemie rodzinnym. Pokaż to symbolicznie - niekoniecznie realistycznie.'
      }
    }
  },

  // ==========================================
  // MODULE 5-8: Continue with remaining sessions
  // Total: Sessions 24-43 (20 sessions)
  // ==========================================
  {
    id: 24,
    module: 5,
    icon: '🫀',
    color: '#DC2626',
    estimatedDuration: 40,
    focusAreas: ['body', 'somatic', 'awareness'],
    translations: {
      en: {
        title: 'Body Map',
        theme: 'Somatic Awareness',
        description: 'Draw an outline of your body. Mark where you feel tension, pain, energy, numbness.',
        drawingPrompt: 'Create a body map. Use colors and symbols to show what you feel in different parts of your body.'
      },
      ka: {
        title: 'სხეულის რუკა',
        theme: 'სომატური ცნობიერება',
        description: 'დახატე შენი სხეულის კონტური. აღნიშნე სად გრძნობ დაძაბულობას, ტკივილს, ენერგიას, ბუნდოვანებას.',
        drawingPrompt: 'შექმენი სხეულის რუკა. გამოიყენე ფერები და სიმბოლოები რომ აჩვენო რას გრძნობ სხეულის სხვადასხვა ნაწილში.'
      },
      ru: {
        title: 'Карта тела',
        theme: 'Соматическое осознание',
        description: 'Нарисуйте контур своего тела. Отметьте, где вы чувствуете напряжение, боль, энергию, онемение.',
        drawingPrompt: 'Создайте карту тела. Используйте цвета и символы, чтобы показать, что вы чувствуете в разных частях тела.'
      },
      hy: {
        title: 'Մարմնի քարտեզ',
        theme: 'Սոմատիկ գիտակցություն',
        description: 'Նկարեք ձեր մարմնի ուրվագիծը: Նշեք որտեղ եք զգում լարվածություն, ցավ, էներգիա, անզգայություն:',
        drawingPrompt: 'Ստեղծեք մարմնի քարտեզ: Օգտագործեք գույներ և խորհրդանիշներ ցույց տալու համար ինչ եք զգում մարմնի տարբեր մասերում:'
      },
      tr: {
        title: 'Vücut Haritası',
        theme: 'Somatik Farkındalık',
        description: 'Vücudunun ana hatlarını çiz. Gerginlik, ağrı, enerji, uyuşukluk hissettiğin yerleri işaretle.',
        drawingPrompt: 'Bir vücut haritası oluştur. Vücudunun farklı bölümlerinde ne hissettiğini göstermek için renkler ve semboller kullan.'
      },
      az: {
        title: 'Bədən Xəritəsi',
        theme: 'Somatik Şüur',
        description: 'Bədəninizin konturunu çəkin. Gərginlik, ağrı, enerji, keyləşmə hiss etdiyiniz yerləri qeyd edin.',
        drawingPrompt: 'Bədən xəritəsi yaradın. Bədənin müxtəlif hissələrində nə hiss etdiyinizi göstərmək üçün rənglər və simvollardan istifadə edin.'
      },
      es: {
        title: 'Mapa Del Cuerpo',
        theme: 'Conciencia Somática',
        description: 'Dibuja el contorno de tu cuerpo. Marca dónde sientes tensión, dolor, energía, entumecimiento.',
        drawingPrompt: 'Crea un mapa del cuerpo. Usa colores y símbolos para mostrar lo que sientes en diferentes partes de tu cuerpo.'
      },
      de: {
        title: 'Körperkarte',
        theme: 'Somatisches Bewusstsein',
        description: 'Zeichne den Umriss deines Körpers. Markiere, wo du Spannung, Schmerz, Energie, Taubheit fühlst.',
        drawingPrompt: 'Erstelle eine Körperkarte. Verwende Farben und Symbole, um zu zeigen, was du in verschiedenen Teilen deines Körpers fühlst.'
      },
      fr: {
        title: 'Carte Du Corps',
        theme: 'Conscience Somatique',
        description: 'Dessine le contour de ton corps. Marque où tu ressens de la tension, de la douleur, de l\'énergie, de l\'engourdissement.',
        drawingPrompt: 'Crée une carte du corps. Utilise des couleurs et des symboles pour montrer ce que tu ressens dans différentes parties de ton corps.'
      },
      pt: {
        title: 'Mapa Do Corpo',
        theme: 'Consciência Somática',
        description: 'Desenhe o contorno do seu corpo. Marque onde você sente tensão, dor, energia, dormência.',
        drawingPrompt: 'Crie um mapa do corpo. Use cores e símbolos para mostrar o que você sente em diferentes partes do seu corpo.'
      },
      id: {
        title: 'Peta Tubuh',
        theme: 'Kesadaran Somatik',
        description: 'Gambar garis besar tubuhmu. Tandai di mana kamu merasa tegang, nyeri, energi, mati rasa.',
        drawingPrompt: 'Buat peta tubuh. Gunakan warna dan simbol untuk menunjukkan apa yang kamu rasakan di berbagai bagian tubuhmu.'
      },
      it: {
        title: 'Mappa Del Corpo',
        theme: 'Consapevolezza Somatica',
        description: 'Disegna il contorno del tuo corpo. Segna dove senti tensione, dolore, energia, intorpidimento.',
        drawingPrompt: 'Crea una mappa del corpo. Usa colori e simboli per mostrare cosa senti in diverse parti del tuo corpo.'
      },
      ar: {
        title: 'خريطة الجسم',
        theme: 'الوعي الجسدي',
        description: 'ارسم الخطوط العريضة لجسمك. حدد أين تشعر بالتوتر، الألم، الطاقة، التنميل.',
        drawingPrompt: 'أنشئ خريطة للجسم. استخدم الألوان والرموز لإظهار ما تشعر به في أجزاء مختلفة من جسمك.'
      },
      hi: {
        title: 'शरीर का नक्शा',
        theme: 'दैहिक जागरूकता',
        description: 'अपने शरीर की रूपरेखा बनाएं। चिह्नित करें कि आप कहाँ तनाव, दर्द, ऊर्जा, सुन्नता महसूस करते हैं।',
        drawingPrompt: 'एक शरीर का नक्शा बनाएं। अपने शरीर के विभिन्न हिस्सों में आप क्या महसूस करते हैं यह दिखाने के लिए रंगों और प्रतीकों का उपयोग करें।'
      },
      zh: {
        title: '身体地图',
        theme: '身体意识',
        description: '画出你身体的轮廓。标记出你感到紧张、疼痛、能量、麻木的地方。',
        drawingPrompt: '创建身体地图。使用颜色和符号显示你在身体不同部位的感受。'
      },
      ja: {
        title: '体のマップ',
        theme: '身体的気づき',
        description: 'あなたの体の輪郭を描いてください。緊張、痛み、エネルギー、しびれを感じる場所をマークしてください。',
        drawingPrompt: '体のマップを作成してください。体のさまざまな部分で何を感じているかを示すために色とシンボルを使用してください。'
      },
      ko: {
        title: '신체 지도',
        theme: '신체적 자각',
        description: '신체의 윤곽을 그려보세요. 긴장, 통증, 에너지, 무감각을 느끼는 곳을 표시하세요.',
        drawingPrompt: '신체 지도를 만드세요. 신체의 다양한 부분에서 무엇을 느끼는지 보여주기 위해 색상과 기호를 사용하세요.'
      },
      uk: {
        title: 'Карта тіла',
        theme: 'Соматична усвідомленість',
        description: 'Намалюйте контур свого тіла. Позначте, де ви відчуваєте напругу, біль, енергію, заціпеніння.',
        drawingPrompt: 'Створіть карту тіла. Використовуйте кольори та символи, щоб показати, що ви відчуваєте в різних частинах тіла.'
      },
      pl: {
        title: 'Mapa Ciała',
        theme: 'Świadomość Somatyczna',
        description: 'Narysuj zarys swojego ciała. Zaznacz, gdzie czujesz napięcie, ból, energię, zdrętwienie.',
        drawingPrompt: 'Stwórz mapę ciała. Użyj kolorów i symboli, aby pokazać, co czujesz w różnych częściach ciała.'
      }
    }
  },

  {
    id: 25,
    module: 5,
    icon: '🌊',
    color: '#06B6D4',
    estimatedDuration: 40,
    focusAreas: ['body', 'breath', 'grounding'],
    translations: {
      en: { title: 'Breath As Art', theme: 'Breathing Patterns', description: 'Draw your breath. What does your breathing pattern look like?', drawingPrompt: 'Visualize your breath - shallow, deep, rhythm, flow. Give it visual form.' },
      ka: { title: 'სუნთქვა როგორც ხელოვნება', theme: 'სუნთქვის ნიმუშები', description: 'დახატე შენი სუნთქვა. როგორ გამოიყურება შენი სუნთქვის ნიმუში?', drawingPrompt: 'ვიზუალიზაცია გააკეთე შენს სუნთქვას - ზედაპირული, ღრმა, რიტმი, დინება. მიეცი ვიზუალური ფორმა.' },
      ru: { title: 'Дыхание как искусство', theme: 'Паттерны дыхания', description: 'Нарисуйте свое дыхание. Как выглядит ваш паттерн дыхания?', drawingPrompt: 'Визуализируйте свое дыхание - поверхностное, глубокое, ритм, поток. Придайте визуальную форму.' },
      hy: { title: 'Շնչառությունը որպես արվեստ', theme: 'Շնչառության օրինաչափություններ', description: 'Նկարեք ձեր շնչառությունը: Ինչպիսի՞ն է ձեր շնչառության օրինաչափությունը:', drawingPrompt: 'Վիզուալացրեք ձեր շնչառությունը - մակերեսային, խորը, ռիթմ, հոսք: Տվեք տեսողական ձև:' },
      tr: { title: 'Sanat Olarak Nefes', theme: 'Nefes Kalıpları', description: 'Nefesini çiz. Nefes kalıbın nasıl görünüyor?', drawingPrompt: 'Nefesini görselleştir - sığ, derin, ritim, akış. Görsel bir form ver.' },
      az: { title: 'Nəfəs Sənət Kimi', theme: 'Nəfəs Nümunələri', description: 'Nəfəsinizi çəkin. Nəfəs nümunəniz necə görünür?', drawingPrompt: 'Nəfəsinizi vizuallaşdırın - dayaz, dərin, ritm, axın. Vizual forma verin.' },
      es: { title: 'Respiración Como Arte', theme: 'Patrones De Respiración', description: '¿Dibuja tu respiración. Cómo se ve tu patrón de respiración?', drawingPrompt: 'Visualiza tu respiración - superficial, profunda, ritmo, flujo. Dale forma visual.' },
      de: { title: 'Atem Als Kunst', theme: 'Atemmuster', description: 'Zeichne deinen Atem. Wie sieht dein Atemmuster aus?', drawingPrompt: 'Visualisiere deinen Atem - flach, tief, Rhythmus, Fluss. Gib ihm visuelle Form.' },
      fr: { title: 'Respiration Comme Art', theme: 'Modèles De Respiration', description: 'Dessine ta respiration. À quoi ressemble ton modèle de respiration?', drawingPrompt: 'Visualise ta respiration - superficielle, profonde, rythme, flux. Donne-lui une forme visuelle.' },
      pt: { title: 'Respiração Como Arte', theme: 'Padrões De Respiração', description: 'Desenhe sua respiração. Como é o padrão da sua respiração?', drawingPrompt: 'Visualize sua respiração - rasa, profunda, ritmo, fluxo. Dê forma visual.' },
      id: { title: 'Napas Sebagai Seni', theme: 'Pola Pernapasan', description: 'Gambar napasmu. Seperti apa pola pernapasanmu?', drawingPrompt: 'Visualisasikan napasmu - dangkal, dalam, ritme, aliran. Beri bentuk visual.' },
      it: { title: 'Respiro Come Arte', theme: 'Modelli Di Respirazione', description: 'Disegna il tuo respiro. Come appare il tuo modello di respirazione?', drawingPrompt: 'Visualizza il tuo respiro - superficiale, profondo, ritmo, flusso. Dagli forma visiva.' },
      ar: { title: 'التنفس كفن', theme: 'أنماط التنفس', description: 'ارسم تنفسك. كيف يبدو نمط تنفسك؟', drawingPrompt: 'تصور تنفسك - سطحي، عميق، إيقاع، تدفق. أعطه شكلاً بصرياً.' },
      hi: { title: 'कला के रूप में सांस', theme: 'श्वास पैटर्न', description: 'अपनी सांस को बनाएं। आपकी सांस का पैटर्न कैसा दिखता है?', drawingPrompt: 'अपनी सांस की कल्पना करें - उथली, गहरी, लय, प्रवाह। इसे दृश्य रूप दें।' },
      zh: { title: '呼吸作为艺术', theme: '呼吸模式', description: '画出你的呼吸。你的呼吸模式是什么样的？', drawingPrompt: '将你的呼吸可视化——浅、深、节奏、流动。给它视觉形式。' },
      ja: { title: '芸術としての呼吸', theme: '呼吸のパターン', description: 'あなたの呼吸を描いてください。あなたの呼吸パターンはどのように見えますか？', drawingPrompt: 'あなたの呼吸を視覚化してください - 浅い、深い、リズム、流れ。視覚的な形を与えてください。' },
      ko: { title: '예술로서의 호흡', theme: '호흡 패턴', description: '호흡을 그려보세요. 호흡 패턴이 어떻게 보이나요?', drawingPrompt: '호흡을 시각화하세요 - 얕은, 깊은, 리듬, 흐름. 시각적 형태를 주세요.' },
      uk: { title: 'Дихання як мистецтво', theme: 'Патерни дихання', description: 'Намалюйте своє дихання. Як виглядає ваш патерн дихання?', drawingPrompt: 'Візуалізуйте своє дихання - поверхневе, глибоке, ритм, потік. Надайте візуальну форму.' },
      pl: { title: 'Oddech Jako Sztuka', theme: 'Wzorce Oddychania', description: 'Narysuj swój oddech. Jak wygląda twój wzorzec oddychania?', drawingPrompt: 'Zwizualizuj swój oddech - płytki, głęboki, rytm, przepływ. Nadaj mu wizualną formę.' }
    }
  },

  {
    id: 26,
    module: 5,
    icon: '💪',
    color: '#F97316',
    estimatedDuration: 45,
    focusAreas: ['body', 'strength', 'resilience'],
    translations: {
      en: { title: 'Where I Hold My Strength', theme: 'Physical Power', description: 'Where in your body do you feel strong? Draw your body\'s strength.', drawingPrompt: 'Visualize where you hold strength, power, resilience in your body.' },
      ka: { title: 'სად ვინახავ ჩემს ძალას', theme: 'ფიზიკური ძალა', description: 'სად გრძნობ სხეულში ძლიერებას? დახატე შენი სხეულის ძალა.', drawingPrompt: 'ვიზუალიზაცია გააკეთე სად ინახავ ძალას, ძლიერებას, მედეგობას შენს სხეულში.' },
      ru: { title: 'Где я храню свою силу', theme: 'Физическая сила', description: 'Где в теле вы чувствуете силу? Нарисуйте силу вашего тела.', drawingPrompt: 'Визуализируйте, где вы храните силу, мощь, стойкость в своем теле.' },
      hy: { title: 'Որտեղ եմ պահում իմ ուժը', theme: 'Ֆիզիկական ուժ', description: 'Որտե՞ղ մարմնում եք զգում ուժեղ: Նկարեք ձեր մարմնի ուժը:', drawingPrompt: 'Վիզուալացրեք որտեղ եք պահում ուժը, հզորությունը, դիմացկունությունը ձեր մարմնում:' },
      tr: { title: 'Gücümü Nerede Tutuyorum', theme: 'Fiziksel Güç', description: 'Vücudunda nerede güçlü hissediyorsun? Vücudunun gücünü çiz.', drawingPrompt: 'Vücudunda gücü, kuvveti, dayanıklılığı nerede tuttuğunu görselleştir.' },
      az: { title: 'Gücümü Harada Saxlayıram', theme: 'Fiziki Güc', description: 'Bədəndə harada güclü hiss edirsiniz? Bədəninizin gücünü çəkin.', drawingPrompt: 'Bədəninizdə gücü, qüdrəti, dözümlülüyü harada saxladığınızı vizuallaşdırın.' },
      es: { title: 'Donde Guardo Mi Fuerza', theme: 'Poder Físico', description: '¿Dónde en tu cuerpo te sientes fuerte? Dibuja la fuerza de tu cuerpo.', drawingPrompt: 'Visualiza dónde guardas la fuerza, el poder, la resiliencia en tu cuerpo.' },
      de: { title: 'Wo Ich Meine Kraft Halte', theme: 'Körperliche Kraft', description: 'Wo in deinem Körper fühlst du dich stark? Zeichne die Kraft deines Körpers.', drawingPrompt: 'Visualisiere, wo du Kraft, Macht, Widerstandsfähigkeit in deinem Körper hältst.' },
      fr: { title: 'Où Je Tiens Ma Force', theme: 'Pouvoir Physique', description: 'Où dans ton corps te sens-tu fort? Dessine la force de ton corps.', drawingPrompt: 'Visualise où tu tiens la force, le pouvoir, la résilience dans ton corps.' },
      pt: { title: 'Onde Guardo Minha Força', theme: 'Poder Físico', description: 'Onde em seu corpo você se sente forte? Desenhe a força do seu corpo.', drawingPrompt: 'Visualize onde você guarda força, poder, resiliência em seu corpo.' },
      id: { title: 'Di Mana Aku Menyimpan Kekuatanku', theme: 'Kekuatan Fisik', description: 'Di mana di tubuhmu kamu merasa kuat? Gambar kekuatan tubuhmu.', drawingPrompt: 'Visualisasikan di mana kamu menyimpan kekuatan, daya, ketahanan di tubuhmu.' },
      it: { title: 'Dove Tengo La Mia Forza', theme: 'Potere Fisico', description: 'Dove nel tuo corpo ti senti forte? Disegna la forza del tuo corpo.', drawingPrompt: 'Visualizza dove tieni la forza, il potere, la resilienza nel tuo corpo.' },
      ar: { title: 'أين أحفظ قوتي', theme: 'القوة الجسدية', description: 'أين في جسمك تشعر بالقوة؟ ارسم قوة جسمك.', drawingPrompt: 'تصور أين تحفظ القوة والقدرة والمرونة في جسمك.' },
      hi: { title: 'मैं अपनी ताकत कहाँ रखता हूँ', theme: 'शारीरिक शक्ति', description: 'आपके शरीर में कहाँ आप मजबूत महसूस करते हैं? अपने शरीर की ताकत बनाएं।', drawingPrompt: 'कल्पना करें कि आप अपने शरीर में ताकत, शक्ति, लचीलापन कहाँ रखते हैं।' },
      zh: { title: '我的力量所在', theme: '身体力量', description: '你在身体哪里感到强壮？画出你身体的力量。', drawingPrompt: '将你在身体中储存力量、能量、韧性的地方可视化。' },
      ja: { title: '私が力を持っている場所', theme: '身体的な力', description: '体のどこで強さを感じますか？体の力を描いてください。', drawingPrompt: '体のどこに強さ、力、回復力を保持しているかを視覚化してください。' },
      ko: { title: '내가 힘을 갖고 있는 곳', theme: '신체적 힘', description: '몸 어디에서 강하다고 느끼나요? 몸의 힘을 그려보세요.', drawingPrompt: '몸에서 힘, 능력, 회복력을 갖고 있는 곳을 시각화하세요.' },
      uk: { title: 'Де я тримаю свою силу', theme: 'Фізична сила', description: 'Де в тілі ви відчуваєте силу? Намалюйте силу вашого тіла.', drawingPrompt: 'Візуалізуйте, де ви тримаєте силу, потужність, стійкість у своєму тілі.' },
      pl: { title: 'Gdzie Trzymam Moją Siłę', theme: 'Siła Fizyczna', description: 'Gdzie w ciele czujesz się silny? Narysuj siłę swojego ciała.', drawingPrompt: 'Zwizualizuj gdzie trzymasz siłę, moc, odporność w swoim ciele.' }
    }
  },

  {
    id: 27,
    module: 5,
    icon: '🎭',
    color: '#84CC16',
    estimatedDuration: 40,
    focusAreas: ['body', 'masks', 'authenticity'],
    translations: {
      en: { title: 'Body Language I Show The World', theme: 'Public Vs Private Self', description: 'How does your body present itself to the world? Draw your "public body language".', drawingPrompt: 'Show how you hold yourself in public - posture, gestures, facial expressions.' },
      ka: { title: 'სხეულის ენა რომელსაც ვაჩვენებ სამყაროს', theme: 'საჯარო და პირადი თავი', description: 'როგორ წარმოადგენს სხეული თავს სამყაროს? დახატე შენი "საჯარო სხეულის ენა".', drawingPrompt: 'აჩვენე როგორ იჭერ თავს საჯაროდ - პოზა, ჟესტები, სახის გამონათქვამები.' },
      ru: { title: 'Язык тела, который я показываю миру', theme: 'Публичное против частного я', description: 'Как ваше тело представляет себя миру? Нарисуйте ваш "публичный язык тела".', drawingPrompt: 'Покажите, как вы держите себя на публике - осанка, жесты, выражения лица.' },
      hy: { title: 'Մարմնի լեզուն որ ցույց եմ տալիս աշխարհին', theme: 'Հրապարակային ընդդեմ մասնավոր ես', description: 'Ինչպե՞ս է ձեր մարմինը ներկայացնում իրեն աշխարհին: Նկարեք ձեր "հրապարակային մարմնի լեզուն":', drawingPrompt: 'Ցույց տվեք ինչպես եք պահում ինքներդ ձեզ հանրության մեջ - կեցվածք, ժեստեր, դեմքի արտահայտություններ:' },
      tr: { title: 'Dünyaya Gösterdiğim Beden Dili', theme: 'Kamusal Ve Özel Benlik', description: 'Vücudun kendini dünyaya nasıl sunar? "Kamusal beden dilini" çiz.', drawingPrompt: 'Kamuoyunda kendini nasıl tuttuğunu göster - duruş, jestler, yüz ifadeleri.' },
      az: { title: 'Dünyaya Göstərdiyim Bədən Dili', theme: 'İctimai Və Şəxsi Mən', description: 'Bədəniniz özünü dünyaya necə təqdim edir? "İctimai bədən dilinizi" çəkin.', drawingPrompt: 'İctimaiyyətdə özünüzü necə saxladığınızı göstərin - duruş, jestlər, üz ifadələri.' },
      es: { title: 'Lenguaje Corporal Que Muestro Al Mundo', theme: 'Yo Público Vs Privado', description: '¿Cómo se presenta tu cuerpo al mundo? Dibuja tu "lenguaje corporal público".', drawingPrompt: 'Muestra cómo te mantienes en público - postura, gestos, expresiones faciales.' },
      de: { title: 'Körpersprache Die Ich Der Welt Zeige', theme: 'Öffentliches Vs Privates Selbst', description: 'Wie präsentiert sich dein Körper der Welt? Zeichne deine "öffentliche Körpersprache".', drawingPrompt: 'Zeige, wie du dich in der Öffentlichkeit hältst - Haltung, Gesten, Gesichtsausdrücke.' },
      fr: { title: 'Langage Corporel Que Je Montre Au Monde', theme: 'Moi Public Vs Privé', description: 'Comment ton corps se présente-t-il au monde? Dessine ton "langage corporel public".', drawingPrompt: 'Montre comment tu te tiens en public - posture, gestes, expressions faciales.' },
      pt: { title: 'Linguagem Corporal Que Mostro Ao Mundo', theme: 'Eu Público Vs Privado', description: 'Como seu corpo se apresenta ao mundo? Desenhe sua "linguagem corporal pública".', drawingPrompt: 'Mostre como você se mantém em público - postura, gestos, expressões faciais.' },
      id: { title: 'Bahasa Tubuh Yang Kutunjukkan Pada Dunia', theme: 'Diri Publik Vs Privat', description: 'Bagaimana tubuhmu mempresentasikan dirinya kepada dunia? Gambar "bahasa tubuh publikmu".', drawingPrompt: 'Tunjukkan bagaimana kamu mempertahankan dirimu di depan umum - postur, gestur, ekspresi wajah.' },
      it: { title: 'Linguaggio Del Corpo Che Mostro Al Mondo', theme: 'Sé Pubblico Vs Privato', description: 'Come si presenta il tuo corpo al mondo? Disegna il tuo "linguaggio del corpo pubblico".', drawingPrompt: 'Mostra come ti mantieni in pubblico - postura, gesti, espressioni facciali.' },
      ar: { title: 'لغة الجسد التي أظهرها للعالم', theme: 'الذات العامة مقابل الخاصة', description: 'كيف يقدم جسمك نفسه للعالم؟ ارسم "لغة جسدك العامة".', drawingPrompt: 'أظهر كيف تحمل نفسك في الأماكن العامة - الوضعية، الإيماءات، تعبيرات الوجه.' },
      hi: { title: 'शरीर की भाषा जो मैं दुनिया को दिखाता हूँ', theme: 'सार्वजनिक बनाम निजी स्वयं', description: 'आपका शरीर दुनिया को कैसे प्रस्तुत करता है? अपनी "सार्वजनिक शरीर की भाषा" बनाएं।', drawingPrompt: 'दिखाएं कि आप सार्वजनिक रूप से खुद को कैसे रखते हैं - मुद्रा, हाव-भाव, चेहरे के भाव।' },
      zh: { title: '我向世界展示的肢体语言', theme: '公共与私人自我', description: '你的身体如何向世界展示自己？画出你的"公共肢体语言"。', drawingPrompt: '展示你在公共场合如何保持自己——姿势、手势、面部表情。' },
      ja: { title: '世界に見せるボディランゲージ', theme: '公的自己と私的自己', description: 'あなたの体は世界にどのように現れますか？あなたの「公的なボディランゲージ」を描いてください。', drawingPrompt: '公の場であなたがどのように自分を保っているかを示してください - 姿勢、ジェスチャー、表情。' },
      ko: { title: '내가 세상에 보여주는 신체 언어', theme: '공적 자아 대 사적 자아', description: '당신의 몸은 세상에 어떻게 자신을 제시하나요? "공적 신체 언어"를 그려보세요.', drawingPrompt: '공공장소에서 자신을 어떻게 유지하는지 보여주세요 - 자세, 몸짓, 표정.' },
      uk: { title: 'Мова тіла, яку я показую світу', theme: 'Публічне проти приватного я', description: 'Як ваше тіло представляє себе світу? Намалюйте вашу "публічну мову тіла".', drawingPrompt: 'Покажіть, як ви тримаєте себе на публіці - постава, жести, вирази обличчя.' },
      pl: { title: 'Język Ciała Który Pokazuję Światu', theme: 'Ja Publiczne Vs Prywatne', description: 'Jak twoje ciało prezentuje się światu? Narysuj swój "publiczny język ciała".', drawingPrompt: 'Pokaż jak się trzymasz publicznie - postawa, gesty, wyrazy twarzy.' }
    }
  },

  {
    id: 28,
    module: 5,
    icon: '✨',
    color: '#FDE047',
    estimatedDuration: 45,
    focusAreas: ['body', 'healing', 'transformation'],
    translations: {
      en: { title: 'If My Body Could Heal', theme: 'Physical Healing Wishes', description: 'If your body could heal anything, what would it heal? Draw that healing.', drawingPrompt: 'Visualize your body healing - what changes, what releases, what renews.' },
      ka: { title: 'თუ ჩემს სხეულს შეეძლო განკურნება', theme: 'ფიზიკური განკურნების სურვილები', description: 'თუ შენს სხეულს შეეძლო ყველაფრის განკურნება, რას განკურნავდა? დახატე ეს განკურნება.', drawingPrompt: 'ვიზუალიზაცია გააკეთე შენს სხეულის განკურნებას - რა იცვლება, რა გამოთავისუფლდება, რა განახლდება.' },
      ru: { title: 'Если бы мое тело могло исцелиться', theme: 'Желания физического исцеления', description: 'Если бы ваше тело могло исцелить что угодно, что бы оно исцелило? Нарисуйте это исцеление.', drawingPrompt: 'Визуализируйте исцеление вашего тела - что изменяется, что освобождается, что обновляется.' },
      hy: { title: 'Եթե իմ մարմինը կարողանար բուժվել', theme: 'Ֆիզիկական բուժման ցանկություններ', description: 'Եթե ձեր մարմինը կարող էր բուժել ցանկացած բան, ի՞նչ կբուժեր: Նկարեք այդ բուժումը:', drawingPrompt: 'Վիզուալացրեք ձեր մարմնի բուժումը - ինչը փոխվում է, ինչը ազատվում է, ինչը թարմացվում է:' },
      tr: { title: 'Vücudum İyileşebilseydi', theme: 'Fiziksel İyileşme Dilekleri', description: 'Vücudun her şeyi iyileştirebilseydi, neyi iyileştirirdi? O iyileşmeyi çiz.', drawingPrompt: 'Vücudunun iyileşmesini görselleştir - ne değişir, ne serbest kalır, ne yenilenir.' },
      az: { title: 'Əgər Bədənim Sağala Bilsəydi', theme: 'Fiziki Şəfa Arzuları', description: 'Əgər bədəniniz hər şeyi sağalda bilsəydi, nəyi sağaldardı? O şəfanı çəkin.', drawingPrompt: 'Bədənizin sağalmasını vizuallaşdırın - nə dəyişir, nə azad olur, nə yenilənir.' },
      es: { title: 'Si Mi Cuerpo Pudiera Sanar', theme: 'Deseos De Curación Física', description: 'Si tu cuerpo pudiera sanar cualquier cosa, ¿qué sanaría? Dibuja esa curación.', drawingPrompt: 'Visualiza tu cuerpo sanando - qué cambia, qué se libera, qué se renueva.' },
      de: { title: 'Wenn Mein Körper Heilen Könnte', theme: 'Wünsche Für Körperliche Heilung', description: 'Wenn dein Körper irgendetwas heilen könnte, was würde er heilen? Zeichne diese Heilung.', drawingPrompt: 'Visualisiere die Heilung deines Körpers - was sich ändert, was sich löst, was sich erneuert.' },
      fr: { title: 'Si Mon Corps Pouvait Guérir', theme: 'Souhaits De Guérison Physique', description: 'Si ton corps pouvait guérir n\'importe quoi, que guérirait-il? Dessine cette guérison.', drawingPrompt: 'Visualise la guérison de ton corps - ce qui change, ce qui se libère, ce qui se renouvelle.' },
      pt: { title: 'Se Meu Corpo Pudesse Curar', theme: 'Desejos De Cura Física', description: 'Se seu corpo pudesse curar qualquer coisa, o que curaria? Desenhe essa cura.', drawingPrompt: 'Visualize seu corpo curando - o que muda, o que se liberta, o que se renova.' },
      id: { title: 'Jika Tubuhku Bisa Sembuh', theme: 'Keinginan Penyembuhan Fisik', description: 'Jika tubuhmu bisa menyembuhkan apa pun, apa yang akan disembuhkan? Gambar penyembuhan itu.', drawingPrompt: 'Visualisasikan tubuhmu sembuh - apa yang berubah, apa yang dilepaskan, apa yang diperbaharui.' },
      it: { title: 'Se Il Mio Corpo Potesse Guarire', theme: 'Desideri Di Guarigione Fisica', description: 'Se il tuo corpo potesse guarire qualsiasi cosa, cosa guarirebbe? Disegna quella guarigione.', drawingPrompt: 'Visualizza la guarigione del tuo corpo - cosa cambia, cosa si libera, cosa si rinnova.' },
      ar: { title: 'لو استطاع جسمي أن يشفى', theme: 'أمنيات الشفاء الجسدي', description: 'لو استطاع جسمك أن يشفي أي شيء، ماذا سيشفي؟ ارسم ذلك الشفاء.', drawingPrompt: 'تصور جسمك وهو يشفى - ما الذي يتغير، ما الذي يتحرر، ما الذي يتجدد.' },
      hi: { title: 'अगर मेरा शरीर ठीक हो सकता', theme: 'शारीरिक उपचार की इच्छाएं', description: 'यदि आपका शरीर कुछ भी ठीक कर सकता, तो क्या ठीक करता? उस उपचार को बनाएं।', drawingPrompt: 'अपने शरीर के उपचार की कल्पना करें - क्या बदलता है, क्या मुक्त होता है, क्या नवीनीकृत होता है।' },
      zh: { title: '如果我的身体能够治愈', theme: '身体治愈愿望', description: '如果你的身体可以治愈任何东西，它会治愈什么？画出那种治愈。', drawingPrompt: '将你的身体治愈可视化——什么改变了，什么释放了，什么更新了。' },
      ja: { title: '私の体が癒せるなら', theme: '身体的癒しの願い', description: 'あなたの体が何でも癒せるなら、何を癒しますか？その癒しを描いてください。', drawingPrompt: 'あなたの体が癒されているところを視覚化してください - 何が変わり、何が解放され、何が更新されるか。' },
      ko: { title: '내 몸이 치유할 수 있다면', theme: '신체 치유 소원', description: '당신의 몸이 무엇이든 치유할 수 있다면, 무엇을 치유할까요? 그 치유를 그려보세요.', drawingPrompt: '몸이 치유되는 것을 시각화하세요 - 무엇이 변하고, 무엇이 풀리고, 무엇이 갱신되는지.' },
      uk: { title: 'Якби моє тіло могло вилікуватися', theme: 'Бажання фізичного зцілення', description: 'Якби ваше тіло могло вилікувати що завгодно, що б воно вилікувало? Намалюйте це зцілення.', drawingPrompt: 'Візуалізуйте зцілення вашого тіла - що змінюється, що звільняється, що оновлюється.' },
      pl: { title: 'Gdyby Moje Ciało Mogło Się Uzdrowić', theme: 'Życzenia Fizycznego Uzdrowienia', description: 'Gdyby twoje ciało mogło uzdrowić cokolwiek, co by uzdrowiło? Narysuj to uzdrowienie.', drawingPrompt: 'Zwizualizuj uzdrowienie swojego ciała - co się zmienia, co się uwalnia, co się odnawia.' }
    }
  },

  // MODULE 6: SHADOW & TRAUMA (Sessions 29-33)
  {
    id: 29,
    module: 6,
    icon: '🌑',
    color: '#1F2937',
    estimatedDuration: 50,
    focusAreas: ['shadow', 'dark-side', 'integration'],
    translations: {
      en: { title: 'My Shadow Self', theme: 'Meeting The Shadow', description: 'Draw the parts of yourself you try to hide or deny. Your shadow.', drawingPrompt: 'Give visual form to your shadow - the rejected, denied, hidden parts of you.' },
      ka: { title: 'ჩემი ჩრდილოვანი თავი', theme: 'ჩრდილთან შეხვედრა', description: 'დახატე შენი ნაწილები რომელთა დამალვას ან უარყოფას ცდილობ. შენი ჩრდილი.', drawingPrompt: 'მიეცი ვიზუალური ფორმა შენს ჩრდილს - უარყოფილ, შეუმჩნეველ, დამალულ ნაწილებს.' },
      ru: { title: 'Моя теневая сторона', theme: 'Встреча с тенью', description: 'Нарисуйте части себя, которые вы пытаетесь скрыть или отрицать. Вашу тень.', drawingPrompt: 'Придайте визуальную форму своей тени - отвергнутым, отрицаемым, скрытым частям вас.' },
      hy: { title: 'Իմ ստվերային ես', theme: 'Ստվերի հետ հանդիպում', description: 'Նկարեք ձեր այն մասերը որոնք փորձում եք թաքցնել կամ ժխտել: Ձեր ստվերը:', drawingPrompt: 'Տվեք տեսողական ձև ձեր ստվերին - մերժված, ժխտված, թաքնված մասերին:' },
      tr: { title: 'Gölge Benliğim', theme: 'Gölge İle Tanışma', description: 'Gizlemeye veya inkar etmeye çalıştığın kendinin parçalarını çiz. Gölgeni.', drawingPrompt: 'Gölgene görsel bir form ver - reddedilen, inkar edilen, gizlenen parçalar.' },
      az: { title: 'Mənim Kölgə Mənliyim', theme: 'Kölgə İlə Görüş', description: 'Gizlətməyə və ya inkar etməyə çalışdığınız hissələrinizi çəkin. Kölgənizi.', drawingPrompt: 'Kölgənizə vizual forma verin - rədd edilmiş, inkar edilmiş, gizlədilmiş hissələr.' },
      es: { title: 'Mi Yo Sombra', theme: 'Encuentro Con La Sombra', description: 'Dibuja las partes de ti mismo que intentas ocultar o negar. Tu sombra.', drawingPrompt: 'Da forma visual a tu sombra - las partes rechazadas, negadas, ocultas de ti.' },
      de: { title: 'Mein Schatten-Selbst', theme: 'Begegnung Mit Dem Schatten', description: 'Zeichne die Teile von dir, die du zu verstecken oder zu leugnen versuchst. Deinen Schatten.', drawingPrompt: 'Gib deinem Schatten visuelle Form - die abgelehnten, verleugneten, verborgenen Teile von dir.' },
      fr: { title: 'Mon Moi Ombre', theme: 'Rencontre Avec L\'ombre', description: 'Dessine les parties de toi que tu essaies de cacher ou de nier. Ton ombre.', drawingPrompt: 'Donne une forme visuelle à ton ombre - les parties rejetées, niées, cachées de toi.' },
      pt: { title: 'Meu Eu Sombra', theme: 'Encontro Com A Sombra', description: 'Desenhe as partes de você que tenta esconder ou negar. Sua sombra.', drawingPrompt: 'Dê forma visual à sua sombra - as partes rejeitadas, negadas, escondidas de você.' },
      id: { title: 'Diri Bayanganku', theme: 'Bertemu Dengan Bayangan', description: 'Gambar bagian dari dirimu yang coba kamu sembunyikan atau tolak. Bayanganmu.', drawingPrompt: 'Beri bentuk visual pada bayanganmu - bagian yang ditolak, disangkal, tersembunyi dari dirimu.' },
      it: { title: 'Il Mio Sé Ombra', theme: 'Incontro Con L\'ombra', description: 'Disegna le parti di te stesso che cerchi di nascondere o negare. La tua ombra.', drawingPrompt: 'Dai forma visiva alla tua ombra - le parti rifiutate, negate, nascoste di te.' },
      ar: { title: 'ذاتي الظلية', theme: 'لقاء الظل', description: 'ارسم أجزاء نفسك التي تحاول إخفاءها أو إنكارها. ظلك.', drawingPrompt: 'أعط شكلاً بصرياً لظلك - الأجزاء المرفوضة والمنكورة والمخفية منك.' },
      hi: { title: 'मेरा छाया स्व', theme: 'छाया से मिलना', description: 'अपने उन हिस्सों को बनाएं जिन्हें आप छिपाने या इनकार करने की कोशिश करते हैं। आपकी छाया।', drawingPrompt: 'अपनी छाया को दृश्य रूप दें - आपके अस्वीकृत, अस्वीकृत, छिपे हुए हिस्से।' },
      zh: { title: '我的阴影自我', theme: '与阴影相遇', description: '画出你试图隐藏或否认的自己的部分。你的阴影。', drawingPrompt: '给你的阴影赋予视觉形式——被拒绝、被否认、被隐藏的部分。' },
      ja: { title: '私のシャドウセルフ', theme: 'シャドウとの出会い', description: 'あなたが隠そうとしたり否定しようとしている自分の部分を描いてください。あなたのシャドウ。', drawingPrompt: 'あなたのシャドウに視覚的な形を与えてください - 拒絶された、否定された、隠された部分。' },
      ko: { title: '나의 그림자 자아', theme: '그림자와의 만남', description: '숨기거나 부인하려는 자신의 부분을 그려보세요. 당신의 그림자.', drawingPrompt: '그림자에 시각적 형태를 주세요 - 거부된, 부인된, 숨겨진 부분들.' },
      uk: { title: 'Моя тіньова сторона', theme: 'Зустріч з тінню', description: 'Намалюйте частини себе, які ви намагаєтеся приховати або заперечити. Вашу тінь.', drawingPrompt: 'Надайте візуальну форму своїй тіні - відкинутим, запереченим, прихованим частинам вас.' },
      pl: { title: 'Moje Ja Cienia', theme: 'Spotkanie Z Cieniem', description: 'Narysuj części siebie, które próbujesz ukryć lub zaprzeczyć. Twój cień.', drawingPrompt: 'Nadaj wizualną formę swojemu cieniowi - odrzucone, zaprzeczone, ukryte części ciebie.' }
    }
  },

  {
    id: 30,
    module: 6,
    icon: '⚡',
    color: '#B91C1C',
    estimatedDuration: 50,
    focusAreas: ['trauma', 'memory', 'processing'],
    translations: {
      en: { title: 'A Difficult Memory', theme: 'Trauma Processing', description: 'Draw a difficult memory without details - just the feeling, the energy of it.', drawingPrompt: 'Express a hard memory abstractly - colors, shapes, energy. No need for literal images.' },
      ka: { title: 'რთული მოგონება', theme: 'ტრავმის დამუშავება', description: 'დახატე რთული მოგონება დეტალების გარეშე - მხოლოდ გრძნობა, მისი ენერგია.', drawingPrompt: 'გამოხატე რთული მოგონება აბსტრაქტულად - ფერები, ფორმები, ენერგია. არ არის საჭირო პირდაპირი სურათები.' },
      ru: { title: 'Сложное воспоминание', theme: 'Обработка травмы', description: 'Нарисуйте сложное воспоминание без деталей - только чувство, энергию этого.', drawingPrompt: 'Выразите тяжелое воспоминание абстрактно - цвета, формы, энергия. Не нужны буквальные образы.' },
      hy: { title: 'Դժվար հիշողություն', theme: 'Տրավմայի մշակում', description: 'Նկարեք դժվար հիշողություն առանց մանրամասների - միայն զգացում, դրա էներգիան:', drawingPrompt: 'Արտահայտեք ծանր հիշողությունը աբստրակտ - գույներ, ձևեր, էներգիա: Հարկ չկա բառացի պատկերների:' },
      tr: { title: 'Zor Bir Anı', theme: 'Travma İşleme', description: 'Zor bir anıyı detaysız çiz - sadece duygu, onun enerjisi.', drawingPrompt: 'Zor bir anıyı soyut olarak ifade et - renkler, şekiller, enerji. Gerçek görüntülere gerek yok.' },
      az: { title: 'Çətin Xatirə', theme: 'Travmanın İşlənməsi', description: 'Çətin xatirəni təfərrüatsız çəkin - yalnız hiss, onun enerjisi.', drawingPrompt: 'Çətin xatirəni abstrakt ifadə edin - rənglər, formalar, enerji. Həqiqi təsvirlərə ehtiyac yoxdur.' },
      es: { title: 'Un Recuerdo Difícil', theme: 'Procesamiento Del Trauma', description: 'Dibuja un recuerdo difícil sin detalles - solo el sentimiento, la energía de ello.', drawingPrompt: 'Expresa un recuerdo duro de manera abstracta - colores, formas, energía. No se necesitan imágenes literales.' },
      de: { title: 'Eine Schwierige Erinnerung', theme: 'Trauma-Verarbeitung', description: 'Zeichne eine schwierige Erinnerung ohne Details - nur das Gefühl, die Energie davon.', drawingPrompt: 'Drücke eine harte Erinnerung abstrakt aus - Farben, Formen, Energie. Keine wörtlichen Bilder nötig.' },
      fr: { title: 'Un Souvenir Difficile', theme: 'Traitement Du Traumatisme', description: 'Dessine un souvenir difficile sans détails - juste le sentiment, l\'énergie de celui-ci.', drawingPrompt: 'Exprime un souvenir dur de manière abstraite - couleurs, formes, énergie. Pas besoin d\'images littérales.' },
      pt: { title: 'Uma Memória Difícil', theme: 'Processamento De Trauma', description: 'Desenhe uma memória difícil sem detalhes - apenas o sentimento, a energia dela.', drawingPrompt: 'Expresse uma memória difícil abstratamente - cores, formas, energia. Não precisa de imagens literais.' },
      id: { title: 'Kenangan Sulit', theme: 'Pemrosesan Trauma', description: 'Gambar kenangan sulit tanpa detail - hanya perasaan, energinya.', drawingPrompt: 'Ekspresikan kenangan sulit secara abstrak - warna, bentuk, energi. Tidak perlu gambar literal.' },
      it: { title: 'Un Ricordo Difficile', theme: 'Elaborazione Del Trauma', description: 'Disegna un ricordo difficile senza dettagli - solo il sentimento, l\'energia di esso.', drawingPrompt: 'Esprimi un ricordo difficile astrattamente - colori, forme, energia. Non servono immagini letterali.' },
      ar: { title: 'ذكرى صعبة', theme: 'معالجة الصدمة', description: 'ارسم ذكرى صعبة بدون تفاصيل - فقط الشعور، طاقتها.', drawingPrompt: 'عبر عن ذكرى صعبة بشكل تجريدي - ألوان، أشكال، طاقة. لا حاجة لصور حرفية.' },
      hi: { title: 'एक कठिन स्मृति', theme: 'आघात प्रसंस्करण', description: 'विवरण के बिना एक कठिन स्मृति बनाएं - केवल भावना, इसकी ऊर्जा।', drawingPrompt: 'एक कठिन स्मृति को अमूर्त रूप से व्यक्त करें - रंग, आकार, ऊर्जा। शाब्दिक छवियों की आवश्यकता नहीं।' },
      zh: { title: '困难的记忆', theme: '创伤处理', description: '画出一段困难的记忆，不要细节——只有感觉、能量。', drawingPrompt: '抽象地表达一个困难的记忆——颜色、形状、能量。不需要字面图像。' },
      ja: { title: '困難な記憶', theme: 'トラウマ処理', description: '詳細なしに困難な記憶を描いてください - ただ感情、そのエネルギー。', drawingPrompt: '困難な記憶を抽象的に表現してください - 色、形、エネルギー。文字通りの画像は必要ありません。' },
      ko: { title: '어려운 기억', theme: '트라우마 처리', description: '세부 사항 없이 어려운 기억을 그려보세요 - 단지 느낌, 그 에너지.', drawingPrompt: '어려운 기억을 추상적으로 표현하세요 - 색상, 형태, 에너지. 문자 그대로의 이미지는 필요 없습니다.' },
      uk: { title: 'Складний спогад', theme: 'Обробка травми', description: 'Намалюйте складний спогад без деталей - тільки почуття, енергію цього.', drawingPrompt: 'Виразіть важкий спогад абстрактно - кольори, форми, енергія. Не потрібні буквальні образи.' },
      pl: { title: 'Trudne Wspomnienie', theme: 'Przetwarzanie Traumy', description: 'Narysuj trudne wspomnienie bez szczegółów - tylko uczucie, energię tego.', drawingPrompt: 'Wyraź trudne wspomnienie abstrakcyjnie - kolory, kształty, energia. Nie potrzeba dosłownych obrazów.' }
    }
  },

  {
    id: 31,
    module: 6,
    icon: '🛡️',
    color: '#92400E',
    estimatedDuration: 45,
    focusAreas: ['protection', 'boundaries', 'safety'],
    translations: {
      en: { title: 'My Protection Mechanisms', theme: 'Defense Patterns', description: 'How do you protect yourself? Draw your defenses, your armor, your walls.', drawingPrompt: 'Visualize how you protect yourself emotionally. What does your armor look like?' },
      ka: { title: 'ჩემი დაცვის მექანიზმები', theme: 'თავდაცვის ნიმუშები', description: 'როგორ იცავ თავს? დახატე შენი თავდაცვა, შენი აბჯარი, შენი კედლები.', drawingPrompt: 'ვიზუალიზაცია გააკეთე როგორ იცავ თავს ემოციურად. როგორ გამოიყურება შენი აბჯარი?' },
      ru: { title: 'Мои механизмы защиты', theme: 'Паттерны защиты', description: 'Как вы защищаете себя? Нарисуйте свою защиту, свои доспехи, свои стены.', drawingPrompt: 'Визуализируйте, как вы защищаете себя эмоционально. Как выглядят ваши доспехи?' },
      hy: { title: 'Իմ պաշտպանության մեխանիզմները', theme: 'Պաշտպանության օրինաչափություններ', description: 'Ինչպե՞ս եք պաշտպանում ինքներդ ձեզ: Նկարեք ձեր պաշտպանությունը, ձեր զրահը, ձեր պատերը:', drawingPrompt: 'Վիզուալացրեք ինչպես եք պաշտպանում ինքներդ ձեզ հուզականորեն: Ինչպիսի՞ն է ձեր զրահը:' },
      tr: { title: 'Koruma Mekanizmalarım', theme: 'Savunma Kalıpları', description: 'Kendini nasıl koruyorsun? Savunmalarını, zırhını, duvarlarını çiz.', drawingPrompt: 'Kendini duygusal olarak nasıl koruduğunu görselleştir. Zırhın nasıl görünüyor?' },
      az: { title: 'Mənim Qoruma Mexanizmlərim', theme: 'Müdafiə Nümunələri', description: 'Özünüzü necə qoruyursunuz? Müdafiənizi, zirehinizi, divarlarınızı çəkin.', drawingPrompt: 'Özünüzü emosional olaraq necə qoruduğunuzu vizuallaşdırın. Zirehiniz necə görünür?' },
      es: { title: 'Mis Mecanismos De Protección', theme: 'Patrones De Defensa', description: '¿Cómo te proteges? Dibuja tus defensas, tu armadura, tus muros.', drawingPrompt: 'Visualiza cómo te proteges emocionalmente. ¿Cómo se ve tu armadura?' },
      de: { title: 'Meine Schutzmechanismen', theme: 'Verteidigungsmuster', description: 'Wie schützt du dich? Zeichne deine Verteidigung, deine Rüstung, deine Mauern.', drawingPrompt: 'Visualisiere, wie du dich emotional schützt. Wie sieht deine Rüstung aus?' },
      fr: { title: 'Mes Mécanismes De Protection', theme: 'Modèles De Défense', description: 'Comment te protèges-tu? Dessine tes défenses, ton armure, tes murs.', drawingPrompt: 'Visualise comment tu te protèges émotionnellement. À quoi ressemble ton armure?' },
      pt: { title: 'Meus Mecanismos De Proteção', theme: 'Padrões De Defesa', description: 'Como você se protege? Desenhe suas defesas, sua armadura, seus muros.', drawingPrompt: 'Visualize como você se protege emocionalmente. Como é sua armadura?' },
      id: { title: 'Mekanisme Perlindunganku', theme: 'Pola Pertahanan', description: 'Bagaimana kamu melindungi dirimu? Gambar pertahananmu, baju zirahmu, tembokmu.', drawingPrompt: 'Visualisasikan bagaimana kamu melindungi dirimu secara emosional. Seperti apa baju zirahmu?' },
      it: { title: 'I Miei Meccanismi Di Protezione', theme: 'Modelli Di Difesa', description: 'Come ti proteggi? Disegna le tue difese, la tua armatura, i tuoi muri.', drawingPrompt: 'Visualizza come ti proteggi emotivamente. Come appare la tua armatura?' },
      ar: { title: 'آليات حمايتي', theme: 'أنماط الدفاع', description: 'كيف تحمي نفسك؟ ارسم دفاعاتك، درعك، جدرانك.', drawingPrompt: 'تصور كيف تحمي نفسك عاطفياً. كيف يبدو درعك?' },
      hi: { title: 'मेरे सुरक्षा तंत्र', theme: 'रक्षा पैटर्न', description: 'आप अपनी रक्षा कैसे करते हैं? अपने बचाव, अपने कवच, अपनी दीवारों को बनाएं।', drawingPrompt: 'कल्पना करें कि आप भावनात्मक रूप से अपनी रक्षा कैसे करते हैं। आपका कवच कैसा दिखता है?' },
      zh: { title: '我的保护机制', theme: '防御模式', description: '你如何保护自己？画出你的防御、你的盔甲、你的墙。', drawingPrompt: '将你如何在情感上保护自己可视化。你的盔甲看起来如何？' },
      ja: { title: '私の保護メカニズム', theme: '防御パターン', description: 'どのように自分を守りますか？あなたの防御、鎧、壁を描いてください。', drawingPrompt: '感情的にどのように自分を守るかを視覚化してください。あなたの鎧はどのように見えますか？' },
      ko: { title: '나의 보호 메커니즘', theme: '방어 패턴', description: '자신을 어떻게 보호하나요? 방어, 갑옷, 벽을 그려보세요.', drawingPrompt: '감정적으로 자신을 어떻게 보호하는지 시각화하세요. 갑옷은 어떻게 보이나요?' },
      uk: { title: 'Мої механізми захисту', theme: 'Патерни захисту', description: 'Як ви захищаєте себе? Намалюйте свій захист, свою броню, свої стіни.', drawingPrompt: 'Візуалізуйте, як ви захищаєте себе емоційно. Як виглядає ваша броня?' },
      pl: { title: 'Moje Mechanizmy Ochronne', theme: 'Wzorce Obrony', description: 'Jak się chronisz? Narysuj swoje obrony, swoją zbroję, swoje mury.', drawingPrompt: 'Zwizualizuj jak chronisz się emocjonalnie. Jak wygląda twoja zbroja?' }
    }
  },

  {
    id: 32,
    module: 6,
    icon: '💎',
    color: '#7C3AED',
    estimatedDuration: 45,
    focusAreas: ['transformation', 'alchemy', 'post-traumatic-growth'],
    translations: {
      en: { title: 'Transforming Pain Into Wisdom', theme: 'Alchemy Of Suffering', description: 'What have your difficulties taught you? Draw pain transforming into something valuable.', drawingPrompt: 'Show transformation - pain becoming wisdom, trauma becoming strength. Visual metamorphosis.' },
      ka: { title: 'ტკივილის სიბრძნედ გარდაქმნა', theme: 'ტანჯვის ალქიმია', description: 'რა გასწავლა შენმა სირთულეებმა? დახატე ტკივილი რომელიც გარდაიქმნება ღირებულ რაღაცად.', drawingPrompt: 'აჩვენე ტრანსფორმაცია - ტკივილი რომელიც ხდება სიბრძნე, ტრავმა რომელიც ხდება ძალა. ვიზუალური მეტამორფოზა.' },
      ru: { title: 'Преобразование боли в мудрость', theme: 'Алхимия страдания', description: 'Чему вас научили трудности? Нарисуйте боль, превращающуюся во что-то ценное.', drawingPrompt: 'Покажите трансформацию - боль, становящаяся мудростью, травма, становящаяся силой. Визуальный метаморфоз.' },
      hy: { title: 'Ցավի վերածումը իմաստության', theme: 'Տառապանքի ալքիմիա', description: 'Ի՞նչ սովորեցրին ձեզ դժվարությունները: Նկարեք ցավը որ վերածվում է արժեքավոր բանի:', drawingPrompt: 'Ցույց տվեք վերափոխումը - ցավը որ դառնում է իմաստություն, տրավման որ դառնում է ուժ: Տեսողական մետամորֆոզ:' },
      tr: { title: 'Acıyı Bilgeliğe Dönüştürme', theme: 'Acının Simyası', description: 'Zorlukların sana ne öğretti? Acının değerli bir şeye dönüşmesini çiz.', drawingPrompt: 'Dönüşümü göster - acı bilgeliğe, travma güce dönüşüyor. Görsel metamorfoz.' },
      az: { title: 'Ağrını Müdrikliyə Çevirmək', theme: 'Əzabın Kimyası', description: 'Çətinliklər sizə nə öyrətdi? Ağrının qiymətli bir şeyə çevrilməsini çəkin.', drawingPrompt: 'Transformasiyanı göstərin - ağrı hikmətə, travma gücə çevrilir. Vizual metamorfoz.' },
      es: { title: 'Transformar El Dolor En Sabiduría', theme: 'Alquimia Del Sufrimiento', description: '¿Qué te han enseñado tus dificultades? Dibuja el dolor transformándose en algo valioso.', drawingPrompt: 'Muestra la transformación - el dolor convirtiéndose en sabiduría, el trauma en fuerza. Metamorfosis visual.' },
      de: { title: 'Schmerz In Weisheit Verwandeln', theme: 'Alchemie Des Leidens', description: 'Was haben dich deine Schwierigkeiten gelehrt? Zeichne Schmerz, der sich in etwas Wertvolles verwandelt.', drawingPrompt: 'Zeige Transformation - Schmerz wird zu Weisheit, Trauma wird zu Stärke. Visuelle Metamorphose.' },
      fr: { title: 'Transformer La Douleur En Sagesse', theme: 'Alchimie De La Souffrance', description: 'Qu\'est-ce que tes difficultés t\'ont appris? Dessine la douleur se transformant en quelque chose de précieux.', drawingPrompt: 'Montre la transformation - la douleur devenant sagesse, le traumatisme devenant force. Métamorphose visuelle.' },
      pt: { title: 'Transformar Dor Em Sabedoria', theme: 'Alquimia Do Sofrimento', description: 'O que suas dificuldades te ensinaram? Desenhe a dor se transformando em algo valioso.', drawingPrompt: 'Mostre transformação - dor se tornando sabedoria, trauma se tornando força. Metamorfose visual.' },
      id: { title: 'Mengubah Rasa Sakit Menjadi Kebijaksanaan', theme: 'Alkimia Penderitaan', description: 'Apa yang kesulitanmu ajarkan padamu? Gambar rasa sakit berubah menjadi sesuatu yang berharga.', drawingPrompt: 'Tunjukkan transformasi - rasa sakit menjadi kebijaksanaan, trauma menjadi kekuatan. Metamorfosis visual.' },
      it: { title: 'Trasformare Il Dolore In Saggezza', theme: 'Alchimia Della Sofferenza', description: 'Cosa ti hanno insegnato le tue difficoltà? Disegna il dolore che si trasforma in qualcosa di prezioso.', drawingPrompt: 'Mostra la trasformazione - il dolore che diventa saggezza, il trauma che diventa forza. Metamorfosi visiva.' },
      ar: { title: 'تحويل الألم إلى حكمة', theme: 'خيمياء المعاناة', description: 'ماذا علمتك صعوباتك؟ ارسم الألم يتحول إلى شيء قيم.', drawingPrompt: 'أظهر التحول - الألم يصبح حكمة، الصدمة تصبح قوة. تحول بصري.' },
      hi: { title: 'दर्द को ज्ञान में बदलना', theme: 'पीड़ा का कीमिया', description: 'आपकी कठिनाइयों ने आपको क्या सिखाया? दर्द को कुछ मूल्यवान में बदलते हुए बनाएं।', drawingPrompt: 'परिवर्तन दिखाएं - दर्द ज्ञान बनता है, आघात शक्ति बनता है। दृश्य कायापलट।' },
      zh: { title: '将痛苦转化为智慧', theme: '苦难的炼金术', description: '你的困难教会了你什么？画出痛苦转变成有价值的东西。', drawingPrompt: '展示转化——痛苦变成智慧，创伤变成力量。视觉蜕变。' },
      ja: { title: '痛みを知恵に変える', theme: '苦しみの錬金術', description: 'あなたの困難は何を教えてくれましたか？痛みが価値あるものに変わる様子を描いてください。', drawingPrompt: '変容を示してください - 痛みが知恵になり、トラウマが強さになる。視覚的変態。' },
      ko: { title: '고통을 지혜로 변화시키기', theme: '고난의 연금술', description: '어려움이 당신에게 무엇을 가르쳤나요? 고통이 가치 있는 것으로 변하는 모습을 그려보세요.', drawingPrompt: '변화를 보여주세요 - 고통이 지혜가 되고, 트라우마가 힘이 되는. 시각적 변신.' },
      uk: { title: 'Перетворення болю на мудрість', theme: 'Алхімія страждання', description: 'Чого вас навчили труднощі? Намалюйте біль, що перетворюється на щось цінне.', drawingPrompt: 'Покажіть трансформацію - біль, що стає мудрістю, травма, що стає силою. Візуальний метаморфоз.' },
      pl: { title: 'Przekształcanie Bólu W Mądrość', theme: 'Alchemia Cierpienia', description: 'Czego nauczyły cię trudności? Narysuj ból przekształcający się w coś cennego.', drawingPrompt: 'Pokaż transformację - ból stający się mądrością, trauma stająca się siłą. Wizualna metamorfoza.' }
    }
  },

  {
    id: 33,
    module: 6,
    icon: '🕊️',
    color: '#FFFFFF',
    estimatedDuration: 50,
    focusAreas: ['forgiveness', 'release', 'peace'],
    translations: {
      en: { title: 'What I\'m Ready To Release', theme: 'Letting Go', description: 'What are you ready to let go of? Draw it leaving you.', drawingPrompt: 'Visualize releasing what no longer serves you. Show it moving away, dissolving, transforming.' },
      ka: { title: 'რისი გათავისუფლებისთვის ვარ მზად', theme: 'გაშვება', description: 'რისი გათავისუფლებისთვის ხარ მზად? დახატე როგორც გტოვებს.', drawingPrompt: 'ვიზუალიზაცია გააკეთე რაც აღარ გემსახურება გათავისუფლებას. აჩვენე როგორ მოშორდება, იშლება, გარდაიქმნება.' },
      ru: { title: 'Что я готов отпустить', theme: 'Отпускание', description: 'Что вы готовы отпустить? Нарисуйте, как это покидает вас.', drawingPrompt: 'Визуализируйте освобождение от того, что больше не служит вам. Покажите, как это уходит, растворяется, трансформируется.' },
      hy: { title: 'Ինչ եմ պատրաստ ազատ թողնել', theme: 'Թողնելը', description: 'Ինչ եք պատրաստ ազատ թողնել: Նկարեք ինչպես է լքում ձեզ:', drawingPrompt: 'Վիզուալացրեք ազատելը այն ինչ այլևս չի ծառայում ձեզ: Ցույց տվեք ինչպես է հեռանում, լուծվում, վերափոխվում:' },
      tr: { title: 'Serbest Bırakmaya Hazır Olduğum', theme: 'Bırakmak', description: 'Neyi bırakmaya hazırsın? Seni terk edişini çiz.', drawingPrompt: 'Artık sana hizmet etmeyeni serbest bırakmayı görselleştir. Uzaklaşmasını, çözülmesini, dönüşmesini göster.' },
      az: { title: 'Azad Etməyə Hazır Olduğum', theme: 'Buraxmaq', description: 'Nəyi buraxmağa hazırsınız? Sizi tərk edişini çəkin.', drawingPrompt: 'Artıq sizə xidmət etməyəni azad etməyi vizuallaşdırın. Uzaqlaşmasını, həll olmasını, dəyişməsini göstərin.' },
      es: { title: 'Lo Que Estoy Listo Para Soltar', theme: 'Dejar Ir', description: '¿Qué estás listo para soltar? Dibújalo dejándote.', drawingPrompt: 'Visualiza liberar lo que ya no te sirve. Muéstralo alejándose, disolviéndose, transformándose.' },
      de: { title: 'Was Ich Loszulassen Bereit Bin', theme: 'Loslassen', description: 'Was bist du bereit loszulassen? Zeichne, wie es dich verlässt.', drawingPrompt: 'Visualisiere das Loslassen dessen, was dir nicht mehr dient. Zeige, wie es sich entfernt, auflöst, transformiert.' },
      fr: { title: 'Ce Que Je Suis Prêt À Libérer', theme: 'Lâcher Prise', description: 'De quoi es-tu prêt à te libérer? Dessine-le te quittant.', drawingPrompt: 'Visualise la libération de ce qui ne te sert plus. Montre-le s\'éloigner, se dissoudre, se transformer.' },
      pt: { title: 'O Que Estou Pronto Para Liberar', theme: 'Deixar Ir', description: 'O que você está pronto para soltar? Desenhe-o saindo de você.', drawingPrompt: 'Visualize liberar o que não mais te serve. Mostre se afastando, dissolvendo, transformando.' },
      id: { title: 'Apa Yang Siap Kulepaskan', theme: 'Melepaskan', description: 'Apa yang siap kamu lepaskan? Gambar itu meninggalkanmu.', drawingPrompt: 'Visualisasikan melepaskan apa yang tidak lagi melayanimu. Tunjukkan menjauh, larut, berubah.' },
      it: { title: 'Ciò Che Sono Pronto A Rilasciare', theme: 'Lasciare Andare', description: 'Cosa sei pronto a lasciar andare? Disegnalo mentre ti lascia.', drawingPrompt: 'Visualizza il rilascio di ciò che non ti serve più. Mostralo allontanarsi, dissolversi, trasformarsi.' },
      ar: { title: 'ما أنا مستعد لتركه', theme: 'التخلي', description: 'ما الذي أنت مستعد للتخلي عنه؟ ارسمه وهو يغادرك.', drawingPrompt: 'تصور إطلاق ما لم يعد يخدمك. أظهره يبتعد، يذوب، يتحول.' },
      hi: { title: 'मैं क्या जाने देने के लिए तैयार हूँ', theme: 'जाने देना', description: 'आप क्या जाने देने के लिए तैयार हैं? इसे आपको छोड़ते हुए बनाएं।', drawingPrompt: 'कल्पना करें कि जो अब आपकी सेवा नहीं करता उसे छोड़ना। दिखाएं कि यह दूर जा रहा है, घुल रहा है, बदल रहा है।' },
      zh: { title: '我准备释放的东西', theme: '放手', description: '你准备放下什么？画出它离开你。', drawingPrompt: '将释放不再为你服务的东西可视化。展示它远离、溶解、转变。' },
      ja: { title: '私が手放す準備ができているもの', theme: '手放すこと', description: 'あなたは何を手放す準備ができていますか？それがあなたを離れる様子を描いてください。', drawingPrompt: 'もう役に立たないものを手放すことを視覚化してください。遠ざかり、溶解し、変容する様子を示してください。' },
      ko: { title: '내가 놓아줄 준비가 된 것', theme: '놓아주기', description: '무엇을 놓아줄 준비가 되었나요? 당신을 떠나는 모습을 그려보세요.', drawingPrompt: '더 이상 당신을 돕지 않는 것을 놓아주는 것을 시각화하세요. 멀어지고, 녹아들고, 변화하는 모습을 보여주세요.' },
      uk: { title: 'Що я готовий відпустити', theme: 'Відпускання', description: 'Що ви готові відпустити? Намалюйте, як це залишає вас.', drawingPrompt: 'Візуалізуйте звільнення від того, що більше не служить вам. Покажіть, як це віддаляється, розчиняється, трансформується.' },
      pl: { title: 'To Co Jestem Gotowy Puścić', theme: 'Puszczanie', description: 'Co jesteś gotów puścić? Narysuj to opuszczające ciebie.', drawingPrompt: 'Zwizualizuj wypuszczanie tego, co ci już nie służy. Pokaż jak się oddala, rozpuszcza, transformuje.' }
    }
  },

  // MODULE 7-8 FINAL SESSIONS (34-43) - Continuing with remaining 10 sessions
  {
    id: 34,
    module: 7,
    icon: '🦋',
    color: '#A78BFA',
    estimatedDuration: 45,
    focusAreas: ['transformation', 'growth', 'evolution'],
    translations: {
      en: { title: 'Metamorphosis', theme: 'Personal Evolution', description: 'Draw your transformation journey - from who you were to who you are becoming.', drawingPrompt: 'Show metamorphosis - past self transforming into present/future self. Visual evolution.' },
      ka: { title: 'მეტამორფოზა', theme: 'პირადი ევოლუცია', description: 'დახატე შენი ტრანსფორმაციის მოგზაურობა - ვინც იყავი იქამდე ვინც ხდები.', drawingPrompt: 'აჩვენე მეტამორფოზა - წარსული თავი რომელიც გარდაიქმნება აწმყო/მომავალ თავად. ვიზუალური ევოლუცია.' },
      ru: { title: 'Метаморфоза', theme: 'Личная эволюция', description: 'Нарисуйте ваше путешествие трансформации - от того, кем вы были, к тому, кем становитесь.', drawingPrompt: 'Покажите метаморфоз - прошлое я, превращающееся в настоящее/будущее я. Визуальная эволюция.' },
      hy: { title: 'Մետամորֆոզ', theme: 'Անձնական էվոլյուցիա', description: 'Նկարեք ձեր վերափոխման ճանապարհը - ով էիք մինչև ով եք դառնում:', drawingPrompt: 'Ցույց տվեք մետամորֆոզը - անցյալ ես որ վերածվում է ներկա/ապագա ես-ի: Տեսողական էվոլյուցիա:' },
      tr: { title: 'Metamorfoz', theme: 'Kişisel Evrim', description: 'Dönüşüm yolculuğunu çiz - kim olduğundan kim olmaya başladığına.', drawingPrompt: 'Metamorfozu göster - geçmiş ben şimdiki/gelecek bene dönüşüyor. Görsel evrim.' },
      az: { title: 'Metamorfoza', theme: 'Şəxsi Təkamül', description: 'Transformasiya səyahətinizi çəkin - kim olduğunuzdan kim olduğunuza qədər.', drawingPrompt: 'Metamorfozu göstərin - keçmiş mən indi/gələcək mənə çevrilir. Vizual təkamül.' },
      es: { title: 'Metamorfosis', theme: 'Evolución Personal', description: 'Dibuja tu viaje de transformación - de quien eras a quien te estás convirtiendo.', drawingPrompt: 'Muestra metamorfosis - yo pasado transformándose en yo presente/futuro. Evolución visual.' },
      de: { title: 'Metamorphose', theme: 'Persönliche Evolution', description: 'Zeichne deine Transformationsreise - von wem du warst zu wem du wirst.', drawingPrompt: 'Zeige Metamorphose - vergangenes Ich verwandelt sich in gegenwärtiges/zukünftiges Ich. Visuelle Evolution.' },
      fr: { title: 'Métamorphose', theme: 'Évolution Personnelle', description: 'Dessine ton voyage de transformation - de qui tu étais à qui tu deviens.', drawingPrompt: 'Montre la métamorphose - moi passé se transformant en moi présent/futur. Évolution visuelle.' },
      pt: { title: 'Metamorfose', theme: 'Evolução Pessoal', description: 'Desenhe sua jornada de transformação - de quem você era para quem está se tornando.', drawingPrompt: 'Mostre metamorfose - eu passado se transformando em eu presente/futuro. Evolução visual.' },
      id: { title: 'Metamorfosis', theme: 'Evolusi Pribadi', description: 'Gambar perjalanan transformasimu - dari siapa kamu dulu menjadi siapa kamu sekarang.', drawingPrompt: 'Tunjukkan metamorfosis - diri masa lalu berubah menjadi diri sekarang/masa depan. Evolusi visual.' },
      it: { title: 'Metamorfosi', theme: 'Evoluzione Personale', description: 'Disegna il tuo viaggio di trasformazione - da chi eri a chi stai diventando.', drawingPrompt: 'Mostra la metamorfosi - io passato che si trasforma in io presente/futuro. Evoluzione visiva.' },
      ar: { title: 'التحول', theme: 'التطور الشخصي', description: 'ارسم رحلة تحولك - من كنت إلى من تصبح.', drawingPrompt: 'أظهر التحول - أنا الماضي يتحول إلى أنا الحاضر/المستقبل. تطور بصري.' },
      hi: { title: 'कायापलट', theme: 'व्यक्तिगत विकास', description: 'अपनी परिवर्तन यात्रा बनाएं - आप कौन थे से आप कौन बन रहे हैं।', drawingPrompt: 'कायापलट दिखाएं - अतीत का स्व वर्तमान/भविष्य के स्व में बदल रहा है। दृश्य विकास।' },
      zh: { title: '蜕变', theme: '个人进化', description: '画出你的转变之旅——从过去的你到现在正在成为的你。', drawingPrompt: '展示蜕变——过去的自己转变成现在/未来的自己。视觉进化。' },
      ja: { title: '変態', theme: '個人的進化', description: 'あなたの変容の旅を描いてください - あなたが誰だったかから誰になりつつあるか。', drawingPrompt: '変態を示してください - 過去の自分が現在/未来の自分に変わる。視覚的進化。' },
      ko: { title: '변태', theme: '개인 진화', description: '변화의 여정을 그려보세요 - 과거의 당신에서 되어가는 당신으로.', drawingPrompt: '변태를 보여주세요 - 과거의 자아가 현재/미래의 자아로 변하는. 시각적 진화.' },
      uk: { title: 'Метаморфоза', theme: 'Особиста еволюція', description: 'Намалюйте ваше подорож трансформації - від того, ким ви були, до того, ким стаєте.', drawingPrompt: 'Покажіть метаморфоз - минуле я, що перетворюється на теперішнє/майбутнє я. Візуальна еволюція.' },
      pl: { title: 'Metamorfoza', theme: 'Osobista Ewolucja', description: 'Narysuj swoją podróż transformacji - od tego kim byłeś do tego kim się stajesz.', drawingPrompt: 'Pokaż metamorfozę - przeszłe ja przekształcające się w obecne/przyszłe ja. Wizualna ewolucja.' }
    }
  },

  // Sessions 35-43 would continue here with similar comprehensive structure
  // For brevity, I'll add simplified final sessions to complete the array

  {
    id: 35,
    module: 7,
    icon: '💪',
    color: '#10B981',
    estimatedDuration: 45,
    focusAreas: ['strength', 'resilience', 'empowerment'],
    translations: {
      en: { title: 'My Newfound Strengths', theme: 'Discovering Power', description: 'What strengths have emerged through your healing journey?', drawingPrompt: 'Draw the strengths you\'ve discovered in yourself through this process.' },
      ka: { title: 'ჩემი ახალი ძალები', theme: 'ძალის აღმოჩენა', description: 'რა ძალები გამოჩნდა შენი განკურნების მოგზაურობაში?', drawingPrompt: 'დახატე ძალები რომლებიც აღმოაჩინე შენში ამ პროცესში.' },
      ru: { title: 'Мои новые силы', theme: 'Открытие силы', description: 'Какие силы проявились в вашем путешествии исцеления?', drawingPrompt: 'Нарисуйте силы, которые вы обнаружили в себе через этот процесс.' },
      hy: { title: 'Իմ նոր ուժերը', theme: 'Ուժի հայտնաբերում', description: 'Ի՞նչ ուժեր են հայտնվել ձեր բուժման ճանապարհին:', drawingPrompt: 'Նկարեք ուժերը որոնք հայտնաբերել եք ձեր մեջ այս գործընթացի միջոցով:' },
      tr: { title: 'Yeni Bulduğum Güçler', theme: 'Gücü Keşfetme', description: 'İyileşme yolculuğunda hangi güçler ortaya çıktı?', drawingPrompt: 'Bu süreçte kendinde keşfettiğin güçleri çiz.' },
      az: { title: 'Yeni Tapdığım Güclər', theme: 'Gücün Kəşfi', description: 'Şəfa səyahətində hansı güclər meydana çıxdı?', drawingPrompt: 'Bu prosesdə özünüzdə kəşf etdiyiniz gücləri çəkin.' },
      es: { title: 'Mis Nuevas Fortalezas', theme: 'Descubriendo Poder', description: '¿Qué fortalezas han surgido en tu viaje de sanación?', drawingPrompt: 'Dibuja las fortalezas que has descubierto en ti mismo a través de este proceso.' },
      de: { title: 'Meine Neuen Stärken', theme: 'Kraft Entdecken', description: 'Welche Stärken sind auf deiner Heilungsreise entstanden?', drawingPrompt: 'Zeichne die Stärken, die du durch diesen Prozess in dir entdeckt hast.' },
      fr: { title: 'Mes Nouvelles Forces', theme: 'Découvrir Le Pouvoir', description: 'Quelles forces ont émergé dans ton voyage de guérison?', drawingPrompt: 'Dessine les forces que tu as découvertes en toi à travers ce processus.' },
      pt: { title: 'Minhas Novas Forças', theme: 'Descobrindo Poder', description: 'Que forças surgiram em sua jornada de cura?', drawingPrompt: 'Desenhe as forças que você descobriu em si mesmo através deste processo.' },
      id: { title: 'Kekuatan Baru Yang Kutemukan', theme: 'Menemukan Kekuatan', description: 'Kekuatan apa yang muncul dalam perjalanan penyembuhanmu?', drawingPrompt: 'Gambar kekuatan yang kamu temukan dalam dirimu melalui proses ini.' },
      it: { title: 'Le Mie Nuove Forze', theme: 'Scoprire Il Potere', description: 'Quali forze sono emerse nel tuo viaggio di guarigione?', drawingPrompt: 'Disegna le forze che hai scoperto in te stesso attraverso questo processo.' },
      ar: { title: 'قوتي الجديدة', theme: 'اكتشاف القوة', description: 'ما هي القوى التي ظهرت في رحلة شفائك؟', drawingPrompt: 'ارسم القوى التي اكتشفتها في نفسك من خلال هذه العملية.' },
      hi: { title: 'मेरी नई ताकतें', theme: 'शक्ति की खोज', description: 'आपकी उपचार यात्रा में कौन सी ताकतें उभरी हैं?', drawingPrompt: 'इस प्रक्रिया के माध्यम से आपने अपने आप में जो ताकतें खोजी हैं उन्हें बनाएं।' },
      zh: { title: '我的新力量', theme: '发现力量', description: '在你的治愈之旅中出现了哪些力量？', drawingPrompt: '画出你通过这个过程在自己身上发现的力量。' },
      ja: { title: '新たに見つけた強さ', theme: '力を発見する', description: 'あなたの癒しの旅でどんな強さが現れましたか？', drawingPrompt: 'このプロセスを通じて自分の中に発見した強さを描いてください。' },
      ko: { title: '새로 찾은 나의 힘', theme: '힘의 발견', description: '치유의 여정에서 어떤 힘이 나타났나요?', drawingPrompt: '이 과정을 통해 자신 안에서 발견한 힘을 그려보세요.' },
      uk: { title: 'Мої нові сили', theme: 'Відкриття сили', description: 'Які сили з\'явилися у вашій подорожі зцілення?', drawingPrompt: 'Намалюйте сили, які ви виявили в собі через цей процес.' },
      pl: { title: 'Moje Nowe Siły', theme: 'Odkrywanie Mocy', description: 'Jakie siły pojawiły się w twojej podróży uzdrowienia?', drawingPrompt: 'Narysuj siły, które odkryłeś w sobie poprzez ten proces.' }
    }
  },

  {
    id: 36,
    module: 7,
    icon: '🌈',
    color: '#EC4899',
    estimatedDuration: 40,
    focusAreas: ['integration', 'wholeness', 'acceptance'],
    translations: {
      en: { title: 'Integration - All Parts Of Me', theme: 'Becoming Whole', description: 'Draw all parts of yourself coexisting harmoniously.', drawingPrompt: 'Show all aspects of you - light, shadow, past, present - integrated.' },
      ka: { title: 'ინტეგრაცია - ჩემი ყველა ნაწილი', theme: 'მთლიანობა', description: 'დახატე შენი ყველა ნაწილი ჰარმონიულად თანაარსებობს.', drawingPrompt: 'აჩვენე შენი ყველა ასპექტი - სინათლე, ჩრდილი, წარსული, აწმყო - ინტეგრირებული.' },
      ru: { title: 'Интеграция - Все части меня', theme: 'Становление целостным', description: 'Нарисуйте все части себя, гармонично сосуществующие.', drawingPrompt: 'Покажите все аспекты вас - свет, тень, прошлое, настоящее - интегрированные.' },
      hy: { title: 'Ինտեգրացիա - Իմ բոլոր մասերը', theme: 'Դառնալ ամբողջական', description: 'Նկարեք ձեր բոլոր մասերը ներդաշնակ ապրող:', drawingPrompt: 'Ցույց տվեք ձեր բոլոր ասպեկտները - լույս, ստվեր, անցյալ, ներկա - ինտեգրված:' },
      tr: { title: 'Entegrasyon - Bütün Parçalarım', theme: 'Bütün Olmak', description: 'Kendinin tüm parçalarını uyum içinde bir arada çiz.', drawingPrompt: 'Tüm yönlerini göster - ışık, gölge, geçmiş, şimdi - entegre olmuş.' },
      az: { title: 'İnteqrasiya - Mənim Bütün Hissələrim', theme: 'Bütöv Olmaq', description: 'Öz bütün hissələrinizi harmonik yaşayan çəkin.', drawingPrompt: 'Bütün aspektlərinizi göstərin - işıq, kölgə, keçmiş, indi - inteqrasiya olunmuş.' },
      es: { title: 'Integración - Todas Mis Partes', theme: 'Ser Completo', description: 'Dibuja todas las partes de ti mismo coexistiendo armoniosamente.', drawingPrompt: 'Muestra todos los aspectos de ti - luz, sombra, pasado, presente - integrados.' },
      de: { title: 'Integration - Alle Teile Von Mir', theme: 'Ganz Werden', description: 'Zeichne alle Teile von dir harmonisch koexistierend.', drawingPrompt: 'Zeige alle Aspekte von dir - Licht, Schatten, Vergangenheit, Gegenwart - integriert.' },
      fr: { title: 'Intégration - Toutes Mes Parties', theme: 'Devenir Entier', description: 'Dessine toutes les parties de toi coexistant harmonieusement.', drawingPrompt: 'Montre tous les aspects de toi - lumière, ombre, passé, présent - intégrés.' },
      pt: { title: 'Integração - Todas As Minhas Partes', theme: 'Tornar-se Completo', description: 'Desenhe todas as partes de você coexistindo harmoniosamente.', drawingPrompt: 'Mostre todos os aspectos de você - luz, sombra, passado, presente - integrados.' },
      id: { title: 'Integrasi - Semua Bagian Diriku', theme: 'Menjadi Utuh', description: 'Gambar semua bagian dirimu hidup berdampingan secara harmonis.', drawingPrompt: 'Tunjukkan semua aspek dirimu - cahaya, bayangan, masa lalu, sekarang - terintegrasi.' },
      it: { title: 'Integrazione - Tutte Le Parti Di Me', theme: 'Diventare Intero', description: 'Disegna tutte le parti di te stesso coesistenti armoniosamente.', drawingPrompt: 'Mostra tutti gli aspetti di te - luce, ombra, passato, presente - integrati.' },
      ar: { title: 'التكامل - كل أجزائي', theme: 'أن تصبح كاملاً', description: 'ارسم كل أجزاء نفسك تتعايش بانسجام.', drawingPrompt: 'أظهر كل جوانبك - الضوء، الظل، الماضي، الحاضر - متكاملة.' },
      hi: { title: 'एकीकरण - मेरे सभी भाग', theme: 'पूर्ण बनना', description: 'अपने सभी हिस्सों को सामंजस्यपूर्ण रूप से सह-अस्तित्व में बनाएं।', drawingPrompt: 'अपने सभी पहलुओं को दिखाएं - प्रकाश, छाया, अतीत, वर्तमान - एकीकृत।' },
      zh: { title: '整合 - 我的所有部分', theme: '变得完整', description: '画出你自己的所有部分和谐共存。', drawingPrompt: '展示你的所有方面——光明、阴影、过去、现在——整合在一起。' },
      ja: { title: '統合 - 私のすべての部分', theme: '全体になる', description: 'あなた自身のすべての部分が調和して共存している様子を描いてください。', drawingPrompt: 'あなたのすべての側面を示してください - 光、影、過去、現在 - 統合されて。' },
      ko: { title: '통합 - 나의 모든 부분', theme: '전체가 되기', description: '모든 부분이 조화롭게 공존하는 자신을 그려보세요.', drawingPrompt: '당신의 모든 측면을 보여주세요 - 빛, 그림자, 과거, 현재 - 통합된.' },
      uk: { title: 'Інтеграція - Всі частини мене', theme: 'Ставання цілісним', description: 'Намалюйте всі частини себе, що гармонійно співіснують.', drawingPrompt: 'Покажіть всі аспекти вас - світло, тінь, минуле, теперішнє - інтегровані.' },
      pl: { title: 'Integracja - Wszystkie Części Mnie', theme: 'Stawanie Się Całością', description: 'Narysuj wszystkie części siebie współistniejące harmonijnie.', drawingPrompt: 'Pokaż wszystkie aspekty ciebie - światło, cień, przeszłość, teraźniejszość - zintegrowane.' }
    }
  },

  {
    id: 37,
    module: 7,
    icon: '🔮',
    color: '#8B5CF6',
    estimatedDuration: 45,
    focusAreas: ['intuition', 'inner-wisdom', 'guidance'],
    translations: {
      en: { title: 'My Inner Wisdom', theme: 'Trusting Yourself', description: 'Draw your inner wise voice, your intuition, your inner guide.', drawingPrompt: 'Visualize your inner wisdom as a presence, symbol, or energy.' },
      ka: { title: 'ჩემი შიდა სიბრძნე', theme: 'თავის დანდობა', description: 'დახატე შენი შიდა ბრძენი ხმა, ინტუიცია, შიდა გზამკვლევი.', drawingPrompt: 'ვიზუალიზაცია გააკეთე შენს შიდა სიბრძნეს როგორც არსებობას, სიმბოლოს ან ენერგიას.' },
      ru: { title: 'Моя внутренняя мудрость', theme: 'Доверие себе', description: 'Нарисуйте свой внутренний мудрый голос, вашу интуицию, вашего внутреннего проводника.', drawingPrompt: 'Визуализируйте свою внутреннюю мудрость как присутствие, символ или энергию.' },
      hy: { title: 'Իմ ներքին իմաստությունը', theme: 'Վստահել ինքներդ ձեզ', description: 'Նկարեք ձեր ներքին իմաստուն ձայնը, ձեր ինտուիցիան, ձեր ներքին ուղեցույցը:', drawingPrompt: 'Վիզուալացրեք ձեր ներքին իմաստությունը որպես ներկայություն, խորհրդանիշ կամ էներգիա:' },
      tr: { title: 'İç Bilgeliğim', theme: 'Kendine Güvenme', description: 'İç bilge sesini, sezgini, iç rehberini çiz.', drawingPrompt: 'İç bilgeliğini bir varlık, sembol veya enerji olarak görselleştir.' },
      az: { title: 'Mənim Daxili Müdrikliyi', theme: 'Özünə İnamaq', description: 'Daxili müdrik səsinizi, intuisiyanızı, daxili bələdçinizi çəkin.', drawingPrompt: 'Daxili müdrikliəinizi bir mövcudluq, simvol və ya enerji kimi vizuallaşdırın.' },
      es: { title: 'Mi Sabiduría Interior', theme: 'Confiar En Ti Mismo', description: 'Dibuja tu voz sabia interior, tu intuición, tu guía interior.', drawingPrompt: 'Visualiza tu sabiduría interior como una presencia, símbolo o energía.' },
      de: { title: 'Meine Innere Weisheit', theme: 'Sich Selbst Vertrauen', description: 'Zeichne deine innere weise Stimme, deine Intuition, deinen inneren Führer.', drawingPrompt: 'Visualisiere deine innere Weisheit als Präsenz, Symbol oder Energie.' },
      fr: { title: 'Ma Sagesse Intérieure', theme: 'Se Faire Confiance', description: 'Dessine ta voix sage intérieure, ton intuition, ton guide intérieur.', drawingPrompt: 'Visualise ta sagesse intérieure comme une présence, un symbole ou une énergie.' },
      pt: { title: 'Minha Sabedoria Interior', theme: 'Confiar Em Si Mesmo', description: 'Desenhe sua voz sábia interior, sua intuição, seu guia interior.', drawingPrompt: 'Visualize sua sabedoria interior como uma presença, símbolo ou energia.' },
      id: { title: 'Kebijaksanaan Batinku', theme: 'Mempercayai Diri Sendiri', description: 'Gambar suara bijak batinmu, intuisimu, pemandumu.', drawingPrompt: 'Visualisasikan kebijaksanaan batinmu sebagai kehadiran, simbol, atau energi.' },
      it: { title: 'La Mia Saggezza Interiore', theme: 'Fidarsi Di Se Stessi', description: 'Disegna la tua voce saggia interiore, la tua intuizione, la tua guida interiore.', drawingPrompt: 'Visualizza la tua saggezza interiore come una presenza, simbolo o energia.' },
      ar: { title: 'حكمتي الداخلية', theme: 'الثقة بالنفس', description: 'ارسم صوتك الحكيم الداخلي، حدسك، مرشدك الداخلي.', drawingPrompt: 'تصور حكمتك الداخلية كحضور أو رمز أو طاقة.' },
      hi: { title: 'मेरी आंतरिक बुद्धि', theme: 'खुद पर भरोसा', description: 'अपनी आंतरिक बुद्धिमान आवाज़, अपनी अंतर्ज्ञान, अपने आंतरिक मार्गदर्शक को बनाएं।', drawingPrompt: 'अपनी आंतरिक बुद्धि की कल्पना एक उपस्थिति, प्रतीक या ऊर्जा के रूप में करें।' },
      zh: { title: '我的内在智慧', theme: '信任自己', description: '画出你内心的智慧之声、你的直觉、你的内在向导。', drawingPrompt: '将你的内在智慧可视化为一种存在、象征或能量。' },
      ja: { title: '私の内なる知恵', theme: '自分を信じる', description: 'あなたの内なる賢明な声、直感、内なるガイドを描いてください。', drawingPrompt: 'あなたの内なる知恵を存在、象徴、またはエネルギーとして視覚化してください。' },
      ko: { title: '나의 내면의 지혜', theme: '자신을 믿기', description: '내면의 현명한 목소리, 직관, 내면의 안내자를 그려보세요.', drawingPrompt: '내면의 지혜를 존재, 상징 또는 에너지로 시각화하세요.' },
      uk: { title: 'Моя внутрішня мудрість', theme: 'Довіра собі', description: 'Намалюйте свій внутрішній мудрий голос, вашу інтуїцію, вашого внутрішнього провідника.', drawingPrompt: 'Візуалізуйте свою внутрішню мудрість як присутність, символ або енергію.' },
      pl: { title: 'Moja Wewnętrzna Mądrość', theme: 'Ufać Sobie', description: 'Narysuj swój wewnętrzny mądry głos, swoją intuicję, swojego wewnętrznego przewodnika.', drawingPrompt: 'Zwizualizuj swoją wewnętrzną mądrość jako obecność, symbol lub energię.' }
    }
  },

  {
    id: 38,
    module: 7,
    icon: '🎁',
    color: '#F59E0B',
    estimatedDuration: 45,
    focusAreas: ['gratitude', 'gifts', 'appreciation'],
    translations: {
      en: { title: 'Gifts From This Journey', theme: 'What I\'ve Gained', description: 'What gifts has this therapeutic journey given you?', drawingPrompt: 'Draw the gifts, insights, tools you\'ve gained through therapy.' },
      ka: { title: 'საჩუქრები ამ მოგზაურობიდან', theme: 'რა მივიღე', description: 'რა საჩუქრები მოგცა ამ თერაპიულმა მოგზაურობამ?', drawingPrompt: 'დახატე საჩუქრები, გააზრებები, ხელსაწყოები რომლებიც მიიღე თერაპიით.' },
      ru: { title: 'Дары этого путешествия', theme: 'Что я получил', description: 'Какие дары дала вам эта терапевтическая поездка?', drawingPrompt: 'Нарисуйте дары, понимания, инструменты, которые вы получили через терапию.' },
      hy: { title: 'Այս ճանապարհի նվերները', theme: 'Ինչ եմ ստացել', description: 'Ի՞նչ նվերներ է ձեզ տվել այս թերապևտիկ ճանապարհորդությունը:', drawingPrompt: 'Նկարեք նվերները, պատկերացումները, գործիքները որոնք ստացել եք թերապիայի միջոցով:' },
      tr: { title: 'Bu Yolculuktan Hediyeler', theme: 'Ne Kazandım', description: 'Bu terapötik yolculuk sana hangi hediyeleri verdi?', drawingPrompt: 'Terapi yoluyla kazandığın hediyeleri, içgörüleri, araçları çiz.' },
      az: { title: 'Bu Səyahətdən Hədiyyələr', theme: 'Nə Qazandım', description: 'Bu terapevtik səyahət sizə hansı hədiyyələri verdi?', drawingPrompt: 'Terapiya vasitəsilə qazandığınız hədiyyələri, anlayışları, alətləri çəkin.' },
      es: { title: 'Regalos De Este Viaje', theme: 'Lo Que He Ganado', description: '¿Qué regalos te ha dado este viaje terapéutico?', drawingPrompt: 'Dibuja los regalos, perspectivas, herramientas que has ganado a través de la terapia.' },
      de: { title: 'Geschenke Von Dieser Reise', theme: 'Was Ich Gewonnen Habe', description: 'Welche Geschenke hat dir diese therapeutische Reise gegeben?', drawingPrompt: 'Zeichne die Geschenke, Einsichten, Werkzeuge, die du durch die Therapie gewonnen hast.' },
      fr: { title: 'Cadeaux De Ce Voyage', theme: 'Ce Que J\'ai Gagné', description: 'Quels cadeaux ce voyage thérapeutique t\'a-t-il donnés?', drawingPrompt: 'Dessine les cadeaux, perspectives, outils que tu as gagnés à travers la thérapie.' },
      pt: { title: 'Presentes Desta Jornada', theme: 'O Que Ganhei', description: 'Que presentes esta jornada terapêutica lhe deu?', drawingPrompt: 'Desenhe os presentes, insights, ferramentas que você ganhou através da terapia.' },
      id: { title: 'Hadiah Dari Perjalanan Ini', theme: 'Apa Yang Kudapat', description: 'Hadiah apa yang diberikan perjalanan terapeutik ini kepadamu?', drawingPrompt: 'Gambar hadiah, wawasan, alat yang kamu peroleh melalui terapi.' },
      it: { title: 'Doni Di Questo Viaggio', theme: 'Cosa Ho Guadagnato', description: 'Quali doni ti ha dato questo viaggio terapeutico?', drawingPrompt: 'Disegna i doni, le intuizioni, gli strumenti che hai guadagnato attraverso la terapia.' },
      ar: { title: 'هدايا من هذه الرحلة', theme: 'ما حصلت عليه', description: 'ما الهدايا التي قدمتها لك هذه الرحلة العلاجية؟', drawingPrompt: 'ارسم الهدايا والرؤى والأدوات التي اكتسبتها من خلال العلاج.' },
      hi: { title: 'इस यात्रा के उपहार', theme: 'मैंने क्या प्राप्त किया', description: 'इस उपचारात्मक यात्रा ने आपको कौन से उपहार दिए हैं?', drawingPrompt: 'थेरेपी के माध्यम से आपने जो उपहार, अंतर्दृष्टि, उपकरण प्राप्त किए हैं उन्हें बनाएं।' },
      zh: { title: '这段旅程的礼物', theme: '我获得了什么', description: '这段治疗之旅给了你什么礼物？', drawingPrompt: '画出你通过治疗获得的礼物、洞察力、工具。' },
      ja: { title: 'この旅からの贈り物', theme: '私が得たもの', description: 'この治療的な旅はあなたにどんな贈り物をくれましたか？', drawingPrompt: 'セラピーを通じて得た贈り物、洞察、ツールを描いてください。' },
      ko: { title: '이 여정의 선물', theme: '내가 얻은 것', description: '이 치료적 여정이 당신에게 어떤 선물을 주었나요?', drawingPrompt: '치료를 통해 얻은 선물, 통찰력, 도구를 그려보세요.' },
      uk: { title: 'Дари цієї подорожі', theme: 'Що я отримав', description: 'Які дари дала вам ця терапевтична подорож?', drawingPrompt: 'Намалюйте дари, розуміння, інструменти, які ви отримали через терапію.' },
      pl: { title: 'Prezenty Z Tej Podróży', theme: 'Co Zyskałem', description: 'Jakie prezenty dała ci ta terapeutyczna podróż?', drawingPrompt: 'Narysuj prezenty, wglądy, narzędzia, które zyskałeś poprzez terapię.' }
    }
  },

  // MODULE 8: FUTURE & CLOSURE
  {
    id: 39,
    module: 8,
    icon: '🗺️',
    color: '#06B6D4',
    estimatedDuration: 45,
    focusAreas: ['future', 'vision', 'direction'],
    translations: {
      en: { title: 'The Path Forward', theme: 'Future Vision', description: 'Where do you see yourself going from here?', drawingPrompt: 'Draw your path forward - where you\'re headed, what you\'re moving toward.' },
      ka: { title: 'გზა წინ', theme: 'მომავლის ხედვა', description: 'სად ხედავ თავს აქედან წასვლის შემდეგ?', drawingPrompt: 'დახატე შენი გზა წინ - სად მიდიხარ, რისკენ მოძრაობ.' },
      ru: { title: 'Путь вперед', theme: 'Видение будущего', description: 'Куда вы видите себя движущимся отсюда?', drawingPrompt: 'Нарисуйте свой путь вперед - куда вы направляетесь, к чему движетесь.' },
      hy: { title: 'Ճանապարհ առաջ', theme: 'Ապագայի տեսլական', description: 'Որտե՞ղ եք տեսնում ձեզ գնալու այստեղից:', drawingPrompt: 'Նկարեք ձեր ճանապարհն առաջ - ուր եք գնում, դեպի ինչ եք շարժվում:' },
      tr: { title: 'İleriye Doğru Yol', theme: 'Gelecek Vizyonu', description: 'Kendini buradan nereye giderken görüyorsun?', drawingPrompt: 'İleriye doğru yolunu çiz - nereye gittiğin, neye doğru ilerlediğin.' },
      az: { title: 'İrəli Yol', theme: 'Gələcək Vizyonu', description: 'Özünüzü buradan hara gedərkən görürsünüz?', drawingPrompt: 'İrəli yolunuzu çəkin - hara gedirsəniz, nəyə doğru irəliləyirsiniz.' },
      es: { title: 'El Camino Hacia Adelante', theme: 'Visión Futura', description: '¿Hacia dónde te ves yendo desde aquí?', drawingPrompt: 'Dibuja tu camino hacia adelante - hacia dónde vas, hacia qué te mueves.' },
      de: { title: 'Der Weg Nach Vorne', theme: 'Zukunftsvision', description: 'Wohin siehst du dich von hier aus gehen?', drawingPrompt: 'Zeichne deinen Weg nach vorne - wohin du gehst, worauf du dich zubewegst.' },
      fr: { title: 'Le Chemin Vers L\'avant', theme: 'Vision Future', description: 'Où te vois-tu aller à partir d\'ici?', drawingPrompt: 'Dessine ton chemin vers l\'avant - où tu vas, vers quoi tu te diriges.' },
      pt: { title: 'O Caminho Adiante', theme: 'Visão Futura', description: 'Onde você se vê indo a partir daqui?', drawingPrompt: 'Desenhe seu caminho adiante - para onde você está indo, em direção ao quê você está se movendo.' },
      id: { title: 'Jalan Ke Depan', theme: 'Visi Masa Depan', description: 'Ke mana kamu melihat dirimu pergi dari sini?', drawingPrompt: 'Gambar jalan ke depanmu - ke mana kamu menuju, apa yang kamu tuju.' },
      it: { title: 'Il Percorso Avanti', theme: 'Visione Futura', description: 'Dove ti vedi andare da qui?', drawingPrompt: 'Disegna il tuo percorso avanti - dove sei diretto, verso cosa ti stai muovendo.' },
      ar: { title: 'الطريق إلى الأمام', theme: 'رؤية المستقبل', description: 'أين ترى نفسك تذهب من هنا؟', drawingPrompt: 'ارسم طريقك إلى الأمام - إلى أين تتجه، نحو ماذا تتحرك.' },
      hi: { title: 'आगे का रास्ता', theme: 'भविष्य की दृष्टि', description: 'आप अपने आप को यहाँ से कहाँ जाते हुए देखते हैं?', drawingPrompt: 'अपना आगे का रास्ता बनाएं - आप कहाँ जा रहे हैं, आप किस ओर बढ़ रहे हैं।' },
      zh: { title: '前进的道路', theme: '未来愿景', description: '你看到自己从这里走向哪里？', drawingPrompt: '画出你前进的道路——你要去哪里，你要向什么方向前进。' },
      ja: { title: '前進への道', theme: '未来のビジョン', description: 'ここからどこに向かっているのを見ますか？', drawingPrompt: 'あなたの前進への道を描いてください - あなたが向かっている場所、何に向かって動いているか。' },
      ko: { title: '앞으로의 길', theme: '미래 비전', description: '여기서부터 어디로 가는 자신을 보나요?', drawingPrompt: '앞으로의 길을 그려보세요 - 어디로 가고 있는지, 무엇을 향해 움직이고 있는지.' },
      uk: { title: 'Шлях вперед', theme: 'Бачення майбутнього', description: 'Куди ви бачите себе рухаючись звідси?', drawingPrompt: 'Намалюйте свій шлях вперед - куди ви прямуєте, до чого рухаєтесь.' },
      pl: { title: 'Droga Naprzód', theme: 'Wizja Przyszłości', description: 'Gdzie widzisz siebie idącego stąd?', drawingPrompt: 'Narysuj swoją drogę naprzód - dokąd zmierzasz, do czego się poruszasz.' }
    }
  },

  {
    id: 40,
    module: 8,
    icon: '🌱',
    color: '#84CC16',
    estimatedDuration: 40,
    focusAreas: ['growth', 'potential', 'becoming'],
    translations: {
      en: { title: 'Who I Am Becoming', theme: 'Emerging Self', description: 'Draw the person you are becoming.', drawingPrompt: 'Visualize your future self - the person emerging from this work.' },
      ka: { title: 'ვინ ვხდები', theme: 'წარმოშობილი თავი', description: 'დახატე ადამიანი რომელიც ხდები.', drawingPrompt: 'ვიზუალიზაცია გააკეთე შენს მომავალ თავს - ადამიანს რომელიც ამ სამუშაოდან წარმოიშვა.' },
      ru: { title: 'Кем я становлюсь', theme: 'Возникающее я', description: 'Нарисуйте человека, которым вы становитесь.', drawingPrompt: 'Визуализируйте свое будущее я - человека, возникающего из этой работы.' },
      hy: { title: 'Ով եմ դառնում', theme: 'Բխող ես', description: 'Նկարեք մարդը ում դառնում եք:', drawingPrompt: 'Վիզուալացրեք ձեր ապագա ես - մարդը որ բխում է այս աշխատանքից:' },
      tr: { title: 'Kim Oluyorum', theme: 'Ortaya Çıkan Benlik', description: 'Olduğun kişiyi çiz.', drawingPrompt: 'Gelecek benliğini görselleştir - bu çalışmadan ortaya çıkan kişi.' },
      az: { title: 'Mən Kim Oluram', theme: 'Meydana Gələn Mən', description: 'Olduğunuz insanı çəkin.', drawingPrompt: 'Gələcək mənləyinizi vizuallaşdırın - bu işdən meydana gələn şəxs.' },
      es: { title: 'Quién Estoy Siendo', theme: 'Yo Emergente', description: 'Dibuja la persona en la que te estás convirtiendo.', drawingPrompt: 'Visualiza tu yo futuro - la persona que emerge de este trabajo.' },
      de: { title: 'Wer Ich Werde', theme: 'Aufkommendes Selbst', description: 'Zeichne die Person, die du wirst.', drawingPrompt: 'Visualisiere dein zukünftiges Selbst - die Person, die aus dieser Arbeit hervorgeht.' },
      fr: { title: 'Qui Je Deviens', theme: 'Moi Émergent', description: 'Dessine la personne que tu deviens.', drawingPrompt: 'Visualise ton moi futur - la personne qui émerge de ce travail.' },
      pt: { title: 'Quem Estou Me Tornando', theme: 'Eu Emergente', description: 'Desenhe a pessoa que você está se tornando.', drawingPrompt: 'Visualize seu eu futuro - a pessoa que emerge deste trabalho.' },
      id: { title: 'Siapa Yang Aku Menjadi', theme: 'Diri Yang Muncul', description: 'Gambar orang yang kamu menjadi.', drawingPrompt: 'Visualisasikan dirimu di masa depan - orang yang muncul dari pekerjaan ini.' },
      it: { title: 'Chi Sto Diventando', theme: 'Sé Emergente', description: 'Disegna la persona che stai diventando.', drawingPrompt: 'Visualizza il tuo futuro sé - la persona che emerge da questo lavoro.' },
      ar: { title: 'من أصبح', theme: 'الذات الناشئة', description: 'ارسم الشخص الذي تصبح.', drawingPrompt: 'تصور ذاتك المستقبلية - الشخص الذي يظهر من هذا العمل.' },
      hi: { title: 'मैं कौन बन रहा हूँ', theme: 'उभरता हुआ स्व', description: 'उस व्यक्ति को बनाएं जो आप बन रहे हैं।', drawingPrompt: 'अपने भविष्य के स्व की कल्पना करें - वह व्यक्ति जो इस काम से उभर रहा है।' },
      zh: { title: '我正在成为谁', theme: '新兴的自我', description: '画出你正在成为的人。', drawingPrompt: '将你未来的自己可视化——从这项工作中出现的人。' },
      ja: { title: '私がなりつつある人', theme: '新たな自己', description: 'あなたがなりつつある人を描いてください。', drawingPrompt: 'あなたの未来の自己を視覚化してください - この作業から現れる人。' },
      ko: { title: '내가 되어가는 사람', theme: '떠오르는 자아', description: '당신이 되어가는 사람을 그려보세요.', drawingPrompt: '미래의 자신을 시각화하세요 - 이 작업에서 나타나는 사람.' },
      uk: { title: 'Ким я стаю', theme: 'Виникаюче я', description: 'Намалюйте людину, якою ви стаєте.', drawingPrompt: 'Візуалізуйте своє майбутнє я - людину, що виникає з цієї роботи.' },
      pl: { title: 'Kim Się Staję', theme: 'Wyłaniająca Się Jaźń', description: 'Narysuj osobę, którą się stajesz.', drawingPrompt: 'Zwizualizuj swoje przyszłe ja - osobę wyłaniającą się z tej pracy.' }
    }
  },

  {
    id: 41,
    module: 8,
    icon: '💌',
    color: '#F472B6',
    estimatedDuration: 45,
    focusAreas: ['self-love', 'compassion', 'closure'],
    translations: {
      en: { title: 'Letter To Myself', theme: 'Self-Compassion', description: 'Draw a visual letter to yourself - words, symbols, love.', drawingPrompt: 'Create a visual love letter to yourself with encouragement and compassion.' },
      ka: { title: 'წერილი ჩემს თავს', theme: 'თვითმოწყალება', description: 'დახატე ვიზუალური წერილი შენს თავს - სიტყვები, სიმბოლოები, სიყვარული.', drawingPrompt: 'შექმენი ვიზუალური სიყვარულის წერილი შენს თავს წახალისებითა და მოწყალებით.' },
      ru: { title: 'Письмо себе', theme: 'Самосострадание', description: 'Нарисуйте визуальное письмо себе - слова, символы, любовь.', drawingPrompt: 'Создайте визуальное любовное письмо себе с воодушевлением и состраданием.' },
      hy: { title: 'Նամակ ինձ', theme: 'Ինքնագութություն', description: 'Նկարեք տեսողական նամակ ինքներդ ձեզ - բառեր, խորհրդանիշներ, սեր:', drawingPrompt: 'Ստեղծեք տեսողական սիրո նամակ ինքներդ ձեզ քաջալերանքով և գութությամբ:' },
      tr: { title: 'Kendime Mektup', theme: 'Öz-Şefkat', description: 'Kendine görsel bir mektup çiz - kelimeler, semboller, sevgi.', drawingPrompt: 'Cesaret ve şefkatle kendine görsel bir aşk mektubu oluştur.' },
      az: { title: 'Özümə Məktub', theme: 'Öz-Mərhəmət', description: 'Özünüzə vizual məktub çəkin - sözlər, simvollar, sevgi.', drawingPrompt: 'Həvəs və mərhəmətlə özünüzə vizual sevgi məktubu yaradın.' },
      es: { title: 'Carta Para Mí Mismo', theme: 'Autocompasión', description: 'Dibuja una carta visual para ti mismo - palabras, símbolos, amor.', drawingPrompt: 'Crea una carta de amor visual para ti mismo con aliento y compasión.' },
      de: { title: 'Brief An Mich Selbst', theme: 'Selbstmitgefühl', description: 'Zeichne einen visuellen Brief an dich selbst - Worte, Symbole, Liebe.', drawingPrompt: 'Erstelle einen visuellen Liebesbrief an dich selbst mit Ermutigung und Mitgefühl.' },
      fr: { title: 'Lettre À Moi-Même', theme: 'Auto-Compassion', description: 'Dessine une lettre visuelle pour toi-même - mots, symboles, amour.', drawingPrompt: 'Crée une lettre d\'amour visuelle pour toi-même avec encouragement et compassion.' },
      pt: { title: 'Carta Para Mim Mesmo', theme: 'Autocompaixão', description: 'Desenhe uma carta visual para você mesmo - palavras, símbolos, amor.', drawingPrompt: 'Crie uma carta de amor visual para você mesmo com encorajamento e compaixão.' },
      id: { title: 'Surat Untuk Diriku', theme: 'Belas Kasihan Diri', description: 'Gambar surat visual untuk dirimu - kata-kata, simbol, cinta.', drawingPrompt: 'Buat surat cinta visual untuk dirimu dengan dorongan dan belas kasihan.' },
      it: { title: 'Lettera A Me Stesso', theme: 'Auto-Compassione', description: 'Disegna una lettera visiva per te stesso - parole, simboli, amore.', drawingPrompt: 'Crea una lettera d\'amore visiva per te stesso con incoraggiamento e compassione.' },
      ar: { title: 'رسالة لنفسي', theme: 'الرحمة الذاتية', description: 'ارسم رسالة بصرية لنفسك - كلمات، رموز، حب.', drawingPrompt: 'أنشئ رسالة حب بصرية لنفسك مع التشجيع والرحمة.' },
      hi: { title: 'अपने लिए पत्र', theme: 'आत्म-करुणा', description: 'अपने लिए एक दृश्य पत्र बनाएं - शब्द, प्रतीक, प्यार।', drawingPrompt: 'प्रोत्साहन और करुणा के साथ अपने लिए एक दृश्य प्रेम पत्र बनाएं।' },
      zh: { title: '给自己的信', theme: '自我同情', description: '给自己画一封视觉信件——文字、符号、爱。', drawingPrompt: '用鼓励和同情为自己创建一封视觉情书。' },
      ja: { title: '自分への手紙', theme: '自己への思いやり', description: '自分への視覚的な手紙を描いてください - 言葉、シンボル、愛。', drawingPrompt: '励ましと思いやりをもって自分への視覚的なラブレターを作成してください。' },
      ko: { title: '나에게 보내는 편지', theme: '자기 연민', description: '자신에게 시각적 편지를 그려보세요 - 단어, 상징, 사랑.', drawingPrompt: '격려와 연민으로 자신에게 시각적 사랑의 편지를 만드세요.' },
      uk: { title: 'Лист собі', theme: 'Самоспівчуття', description: 'Намалюйте візуальний лист собі - слова, символи, любов.', drawingPrompt: 'Створіть візуальний любовний лист собі з підбадьоренням і співчуттям.' },
      pl: { title: 'List Do Siebie', theme: 'Współczucie Dla Siebie', description: 'Narysuj wizualny list do siebie - słowa, symbole, miłość.', drawingPrompt: 'Stwórz wizualny list miłosny do siebie z zachętą i współczuciem.' }
    }
  },

  {
    id: 42,
    module: 8,
    icon: '🙏',
    color: '#A855F7',
    estimatedDuration: 40,
    focusAreas: ['gratitude', 'completion', 'honoring'],
    translations: {
      en: { title: 'Honoring My Journey', theme: 'Gratitude For Growth', description: 'Honor everything you\'ve been through. Draw gratitude for your journey.', drawingPrompt: 'Create a visual honoring all you\'ve experienced and overcome.' },
      ka: { title: 'ჩემი მოგზაურობის პატივისცემა', theme: 'მადლობა ზრდისთვის', description: 'პატივი სცე ყველაფერს რაც გამოიარე. დახატე მადლობა შენი მოგზაურობისთვის.', drawingPrompt: 'შექმენი ვიზუალური რომელიც პატივს სცემს ყველაფერს რაც განიცადე და დაძლიე.' },
      ru: { title: 'Почитание моего путешествия', theme: 'Благодарность за рост', description: 'Почтите все, через что вы прошли. Нарисуйте благодарность за ваше путешествие.', drawingPrompt: 'Создайте визуал, почитающий все, что вы пережили и преодолели.' },
      hy: { title: 'Իմ ճանապարհի պատվավորում', theme: 'Շնորհակալություն աճի համար', description: 'Պատվավորեք այն ամենը ինչով անցել եք: Նկարեք շնորհակալություն ձեր ճանապարհի համար:', drawingPrompt: 'Ստեղծեք տեսողական որը պատվավորում է այն ամենը ինչ ապրել և հաղթահարել եք:' },
      tr: { title: 'Yolculuğumu Onurlandırma', theme: 'Büyüme İçin Şükran', description: 'Yaşadığın her şeyi onurlandır. Yolculuğun için minnettarlık çiz.', drawingPrompt: 'Yaşadığın ve üstesinden geldiğin her şeyi onurlandıran bir görsel oluştur.' },
      az: { title: 'Səyahətimi Hörmət Etmək', theme: 'Böyümə Üçün Minnətdarlıq', description: 'Keçdiyiniz hər şeyə hörmət edin. Səyahətiniz üçün minnətdarlıq çəkin.', drawingPrompt: 'Yaşadığınız və öhdəsindən gəldiyiniz hər şeyə hörmət edən vizual yaradın.' },
      es: { title: 'Honrando Mi Viaje', theme: 'Gratitud Por El Crecimiento', description: 'Honra todo por lo que has pasado. Dibuja gratitud por tu viaje.', drawingPrompt: 'Crea una visual que honre todo lo que has experimentado y superado.' },
      de: { title: 'Meine Reise Ehren', theme: 'Dankbarkeit Für Wachstum', description: 'Ehre alles, was du durchgemacht hast. Zeichne Dankbarkeit für deine Reise.', drawingPrompt: 'Erstelle ein Bild, das alles ehrt, was du erlebt und überwunden hast.' },
      fr: { title: 'Honorer Mon Voyage', theme: 'Gratitude Pour La Croissance', description: 'Honore tout ce que tu as traversé. Dessine la gratitude pour ton voyage.', drawingPrompt: 'Crée un visuel qui honore tout ce que tu as vécu et surmonté.' },
      pt: { title: 'Honrando Minha Jornada', theme: 'Gratidão Pelo Crescimento', description: 'Honre tudo pelo que você passou. Desenhe gratidão por sua jornada.', drawingPrompt: 'Crie uma visual que honre tudo o que você experimentou e superou.' },
      id: { title: 'Menghormati Perjalananku', theme: 'Syukur Untuk Pertumbuhan', description: 'Hormati semua yang telah kamu lalui. Gambar rasa syukur untuk perjalananmu.', drawingPrompt: 'Buat visual yang menghormati semua yang telah kamu alami dan atasi.' },
      it: { title: 'Onorare Il Mio Viaggio', theme: 'Gratitudine Per La Crescita', description: 'Onora tutto ciò che hai attraversato. Disegna gratitudine per il tuo viaggio.', drawingPrompt: 'Crea un visuale che onora tutto ciò che hai vissuto e superato.' },
      ar: { title: 'تكريم رحلتي', theme: 'الامتنان للنمو', description: 'كرم كل ما مررت به. ارسم الامتنان لرحلتك.', drawingPrompt: 'أنشئ صورة تكرم كل ما مررت به وتغلبت عليه.' },
      hi: { title: 'अपनी यात्रा का सम्मान', theme: 'विकास के लिए कृतज्ञता', description: 'उन सभी चीजों का सम्मान करें जिनसे आप गुज़रे हैं। अपनी यात्रा के लिए कृतज्ञता बनाएं।', drawingPrompt: 'एक दृश्य बनाएं जो आपने अनुभव किया और दूर किया है उन सभी का सम्मान करता है।' },
      zh: { title: '尊重我的旅程', theme: '感恩成长', description: '尊重你所经历的一切。画出对你旅程的感激。', drawingPrompt: '创建一个视觉作品，尊重你所经历和克服的一切。' },
      ja: { title: '私の旅を敬う', theme: '成長への感謝', description: 'あなたが経験したすべてを敬ってください。あなたの旅への感謝を描いてください。', drawingPrompt: 'あなたが経験し克服したすべてを敬うビジュアルを作成してください。' },
      ko: { title: '나의 여정을 존중하기', theme: '성장에 대한 감사', description: '당신이 겪은 모든 것을 존중하세요. 여정에 대한 감사를 그려보세요.', drawingPrompt: '경험하고 극복한 모든 것을 존중하는 시각적 작품을 만드세요.' },
      uk: { title: 'Вшанування моєї подорожі', theme: 'Подяка за зростання', description: 'Вшануйте все, через що ви пройшли. Намалюйте подяку за вашу подорож.', drawingPrompt: 'Створіть візуал, що вшановує все, що ви пережили і подолали.' },
      pl: { title: 'Uczczenie Mojej Podróży', theme: 'Wdzięczność Za Wzrost', description: 'Uczcij wszystko, przez co przeszedłeś. Narysuj wdzięczność za swoją podróż.', drawingPrompt: 'Stwórz wizualizację, która honoruje wszystko, co przeżyłeś i pokonałeś.' }
    }
  },

  {
    id: 43,
    module: 8,
    icon: '✨',
    color: '#FDE047',
    estimatedDuration: 50,
    focusAreas: ['completion', 'new-beginning', 'celebration'],
    translations: {
      en: { title: 'Final Portrait - The New Me', theme: 'Completion & New Beginning', description: 'Draw yourself now after this entire journey. Your final self-portrait.', drawingPrompt: 'Create a final self-portrait showing who you are after completing this therapeutic art journey.' },
      ka: { title: 'საბოლოო პორტრეტი - ახალი მე', theme: 'დასრულება და ახალი დასაწყისი', description: 'დახატე შენი თავი ახლა მთელი ამ მოგზაურობის შემდეგ. შენი საბოლოო ავტოპორტრეტი.', drawingPrompt: 'შექმენი საბოლოო ავტოპორტრეტი რომელიც აჩვენებს ვინ ხარ ამ თერაპიული ხელოვნების მოგზაურობის დასრულების შემდეგ.' },
      ru: { title: 'Финальный портрет - Новый я', theme: 'Завершение и новое начало', description: 'Нарисуйте себя сейчас после всего этого путешествия. Ваш финальный автопортрет.', drawingPrompt: 'Создайте финальный автопортрет, показывающий кто вы после завершения этого терапевтического художественного путешествия.' },
      hy: { title: 'Վերջնական դիմանկար - Նոր ես', theme: 'Ավարտ և նոր սկիզբ', description: 'Նկարեք ինքներդ ձեզ հիմա ամբողջ այս ճանապարհից հետո: Ձեր վերջնական ինքնադիմանկարը:', drawingPrompt: 'Ստեղծեք վերջնական ինքնադիմանկար որը ցույց է տալիս ով եք այս թերապևտիկ արվեստի ճանապարհը ավարտելուց հետո:' },
      tr: { title: 'Son Portre - Yeni Ben', theme: 'Tamamlanma Ve Yeni Başlangıç', description: 'Tüm bu yolculuktan sonra kendini şimdi çiz. Son otoportren.', drawingPrompt: 'Bu terapötik sanat yolculuğunu tamamladıktan sonra kim olduğunu gösteren son bir otoportre oluştur.' },
      az: { title: 'Son Portret - Yeni Mən', theme: 'Başa Çatma Və Yeni Başlanğıc', description: 'Bütün bu səyahətdən sonra özünüzü indi çəkin. Son avtoportretiniz.', drawingPrompt: 'Bu terapevtik sənət səyahətini başa çatdırdıqdan sonra kim olduğunuzu göstərən son avtoportret yaradın.' },
      es: { title: 'Retrato Final - El Nuevo Yo', theme: 'Finalización Y Nuevo Comienzo', description: 'Dibújate ahora después de todo este viaje. Tu autorretrato final.', drawingPrompt: 'Crea un autorretrato final mostrando quién eres después de completar este viaje de arte terapéutico.' },
      de: { title: 'Finales Portrait - Das Neue Ich', theme: 'Abschluss Und Neubeginn', description: 'Zeichne dich jetzt nach dieser ganzen Reise. Dein finales Selbstportrait.', drawingPrompt: 'Erstelle ein finales Selbstportrait, das zeigt, wer du bist, nachdem du diese therapeutische Kunstreise abgeschlossen hast.' },
      fr: { title: 'Portrait Final - Le Nouveau Moi', theme: 'Achèvement Et Nouveau Départ', description: 'Dessine-toi maintenant après tout ce voyage. Ton autoportrait final.', drawingPrompt: 'Crée un autoportrait final montrant qui tu es après avoir terminé ce voyage artistique thérapeutique.' },
      pt: { title: 'Retrato Final - O Novo Eu', theme: 'Conclusão E Novo Começo', description: 'Desenhe-se agora após toda esta jornada. Seu autorretrato final.', drawingPrompt: 'Crie um autorretrato final mostrando quem você é após completar esta jornada de arte terapêutica.' },
      id: { title: 'Potret Akhir - Aku Yang Baru', theme: 'Penyelesaian Dan Awal Baru', description: 'Gambar dirimu sekarang setelah seluruh perjalanan ini. Potret dirimu yang terakhir.', drawingPrompt: 'Buat potret diri terakhir yang menunjukkan siapa kamu setelah menyelesaikan perjalanan seni terapeutik ini.' },
      it: { title: 'Ritratto Finale - Il Nuovo Me', theme: 'Completamento E Nuovo Inizio', description: 'Disegna te stesso ora dopo tutto questo viaggio. Il tuo autoritratto finale.', drawingPrompt: 'Crea un autoritratto finale che mostra chi sei dopo aver completato questo viaggio artistico terapeutico.' },
      ar: { title: 'الصورة النهائية - أنا الجديد', theme: 'الإكمال وبداية جديدة', description: 'ارسم نفسك الآن بعد كل هذه الرحلة. صورتك الذاتية النهائية.', drawingPrompt: 'أنشئ صورة ذاتية نهائية تظهر من أنت بعد إكمال رحلة الفن العلاجي هذه.' },
      hi: { title: 'अंतिम चित्र - नया मैं', theme: 'पूर्णता और नई शुरुआत', description: 'इस पूरी यात्रा के बाद अब अपने आप को बनाएं। आपका अंतिम स्व-चित्र।', drawingPrompt: 'इस उपचारात्मक कला यात्रा को पूरा करने के बाद आप कौन हैं यह दिखाने वाला एक अंतिम स्व-चित्र बनाएं।' },
      zh: { title: '最终肖像 - 新的我', theme: '完成与新开始', description: '在整个旅程之后现在画出你自己。你的最终自画像。', drawingPrompt: '创建一个最终自画像，展示完成这段治疗艺术之旅后的你是谁。' },
      ja: { title: '最終ポートレート - 新しい私', theme: '完成と新しい始まり', description: 'この旅全体の後、今のあなたを描いてください。あなたの最終自画像。', drawingPrompt: 'この治療的なアートの旅を完了した後、あなたが誰であるかを示す最終自画像を作成してください。' },
      ko: { title: '최종 초상화 - 새로운 나', theme: '완성과 새로운 시작', description: '이 전체 여정 후 지금 자신을 그려보세요. 최종 자화상.', drawingPrompt: '이 치료적 예술 여정을 완료한 후 당신이 누구인지 보여주는 최종 자화상을 만드세요.' },
      uk: { title: 'Фінальний портрет - Новий я', theme: 'Завершення і новий початок', description: 'Намалюйте себе зараз після всієї цієї подорожі. Ваш фінальний автопортрет.', drawingPrompt: 'Створіть фінальний автопортрет, що показує ким ви є після завершення цієї терапевтичної художньої подорожі.' },
      pl: { title: 'Ostatni Portret - Nowe Ja', theme: 'Ukończenie I Nowy Początek', description: 'Narysuj siebie teraz po całej tej podróży. Twój ostateczny autoportret.', drawingPrompt: 'Stwórz ostateczny autoportret pokazujący kim jesteś po ukończeniu tej terapeutycznej artystycznej podróży.' }
    }
  }

];

export const TOTAL_SESSIONS = 43;
export const TOTAL_MODULES = 8;
export const SUPPORTED_LANGUAGES = ['en', 'ka', 'ru', 'hy', 'tr', 'az', 'es', 'de', 'fr', 'pt', 'id', 'it', 'ar', 'hi', 'zh', 'ja', 'ko', 'uk', 'pl'];
