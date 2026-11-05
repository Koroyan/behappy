// Quotes carried over from the pre-2.0 home screen (19 languages).
// Kept only quotes whose attribution could be verified; five were removed in 2.0
// (one misattributed, four unverifiable or altered). See docs/BEHAPPY_AUDIT.md.
import type { Localized } from './types';

export interface Quote {
  author: string;
  text: Localized;
  /** Gentle enough to greet someone on the Today screen. */
  today?: boolean;
}

export const QUOTES: Quote[] = [
  {
    "author": "Carl Rogers",
    "text": {
      "en": "The curious paradox is that when I accept myself just as I am, then I can change.",
      "ka": "უცნაური პარადოქსია, რომ როცა საკუთარ თავს ისეთს ვიღებ, როგორიც ვარ, მხოლოდ მაშინ შემიძლია შეიცვალო.",
      "ru": "Любопытный парадокс в том, что когда я принимаю себя таким, какой я есть, я могу измениться.",
      "hy": "Հետաքրքիր պարադոքսն այն է, որ երբ ես ընդունում եմ ինքս ինձ այնպիսին, ինչպիսին կամ, միայն այդժամ կարող եմ փոխվել։",
      "uk": "Цікавий парадокс у тому, що коли я приймаю себе таким, яким я є, лише тоді я можу змінитися.",
      "tr": "İlginç paradoks şu ki, kendimi olduğum gibi kabul ettiğimde ancak o zaman değişebilirim.",
      "az": "Maraqlı paradoks ondan ibarətdir ki, mən özümü olduğum kimi qəbul etdikdə, yalnız o zaman dəyişə bilirəm.",
      "de": "Das merkwürdige Paradox ist, dass ich mich erst verändern kann, wenn ich mich so annehme, wie ich bin.",
      "fr": "Le curieux paradoxe est que lorsque j'accepte d'être tel que je suis, alors je peux changer.",
      "es": "La curiosa paradoja es que cuando me acepto tal como soy, entonces puedo cambiar.",
      "it": "Il curioso paradosso è che quando accetto me stesso così come sono, allora posso cambiare.",
      "pt": "O curioso paradoxo é que, quando me aceito exatamente como sou, então posso mudar.",
      "pl": "Ciekawy paradoks polega na tym, że gdy akceptuję siebie takim, jaki jestem, dopiero wtedy mogę się zmienić.",
      "id": "Paradoks anehnya adalah ketika saya menerima diri saya apa adanya, barulah saya bisa berubah.",
      "ar": "المفارقة الغريبة هي أنني عندما أتقبل نفسي كما أنا، عندها فقط أستطيع أن أتغير.",
      "hi": "अजीब विरोधाभास यह है कि जब मैं खुद को जैसा हूँ वैसा स्वीकार करता हूँ, तभी मैं बदल सकता हूँ।",
      "zh": "奇怪的悖论在于，当我接受真实的自己时，我才能够改变。",
      "ja": "不思議な逆説だが、ありのままの自分を受け入れたときにこそ、人は変わることができる。",
      "ko": "신기한 역설은, 있는 그대로의 나를 받아들일 때 비로소 변할 수 있다는 것이다."
    }
  },
  {
    "author": "Viktor Frankl",
    "text": {
      "en": "When we are no longer able to change a situation, we are challenged to change ourselves.",
      "ka": "როცა ვეღარ ვცვლით სიტუაციას, გამოწვევა გვექმნება, შევცვალოთ საკუთარი თავი.",
      "ru": "Когда мы уже не можем изменить ситуацию, перед нами встаёт задача изменить себя.",
      "hy": "Երբ այլևս ի վիճակի չենք փոխել իրավիճակը, մեզ մարտահրավեր է նետվում փոխել մեզ ինքներս։",
      "uk": "Коли ми більше не можемо змінити ситуацію, перед нами постає виклик змінити самих себе.",
      "tr": "Bir durumu artık değiştiremediğimizde, kendimizi değiştirme zorunluluğuyla karşı karşıya kalırız.",
      "az": "Vəziyyəti artıq dəyişə bilmədiyimiz zaman özümüzü dəyişmək öhdəliyi ilə üzləşirik.",
      "de": "Wenn wir eine Situation nicht mehr ändern können, sind wir herausgefordert, uns selbst zu ändern.",
      "fr": "Lorsque nous ne pouvons plus changer une situation, nous sommes mis au défi de nous changer nous-mêmes.",
      "es": "Cuando ya no podemos cambiar una situación, se nos exige cambiar a nosotros mismos.",
      "it": "Quando non possiamo più cambiare una situazione, siamo chiamati a cambiare noi stessi.",
      "pt": "Quando já não podemos mudar uma situação, somos desafiados a mudar a nós mesmos.",
      "pl": "Kiedy nie możemy już zmienić sytuacji, stajemy przed wyzwaniem zmiany samych siebie.",
      "id": "Ketika kita tidak lagi mampu mengubah suatu situasi, kita ditantang untuk mengubah diri kita sendiri.",
      "ar": "عندما لا نعود قادرين على تغيير موقف ما، فإننا نواجه تحدي تغيير أنفسنا.",
      "hi": "जब हम किसी स्थिति को बदलने में असमर्थ हो जाते हैं, तो हमें खुद को बदलने की चुनौती मिलती है।",
      "zh": "当我们无法再改变某种处境时，我们便面临着改变自己的挑战。",
      "ja": "状況を変えられなくなったとき、私たちは自分自身を変えるという課題に直面する。",
      "ko": "더 이상 상황을 바꿀 수 없을 때, 우리는 자신을 바꾸어야 하는 과제에 직면한다."
    }
  },
  {
    "author": "Carl Jung",
    "text": {
      "en": "Who looks outside, dreams; who looks inside, awakes.",
      "ka": "ვინც გარეთ იყურება, სიზმარშია; ვინც შიგნით იყურება, იღვიძებს.",
      "ru": "Тот, кто смотрит вовне, грезит; тот, кто смотрит внутрь, пробуждается.",
      "hy": "Ով նայում է դուրս, երազում է. ով նայում է ներս, արթնանում է։",
      "uk": "Хто дивиться назовні, той мріє; хто дивиться всередину, той прокидається.",
      "tr": "Dışa bakan düş görür; içe bakan uyanır.",
      "az": "Kənara baxan yuxu görür, içərisinə baxan oyanır.",
      "de": "Wer nach außen schaut, träumt; wer nach innen schaut, erwacht.",
      "fr": "Celui qui regarde à l'extérieur rêve ; celui qui regarde à l'intérieur s'éveille.",
      "es": "Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.",
      "it": "Chi guarda fuori sogna; chi guarda dentro si risveglia.",
      "pt": "Quem olha para fora, sonha; quem olha para dentro, desperta.",
      "pl": "Kto patrzy na zewnątrz, śni; kto patrzy do wewnątrz, budzi się.",
      "id": "Yang memandang keluar, bermimpi; yang memandang ke dalam, terjaga.",
      "ar": "من ينظر إلى الخارج يحلم؛ ومن ينظر إلى الداخل يستيقظ.",
      "hi": "जो बाहर देखता है, सपने देखता है; जो भीतर देखता है, जागता है।",
      "zh": "向外看的人是在做梦，向内看的人才是清醒的。",
      "ja": "外を見る者は夢を見て、内を見る者は目覚める。",
      "ko": "밖을 보는 자는 꿈을 꾸고, 안을 보는 자는 깨어난다."
    }
  },
  {
    "author": "Virginia Satir",
    "text": {
      "en": "Life is not the way it's supposed to be. It's the way it is. The way you cope with it makes the difference.",
      "ka": "ცხოვრება ისეთი არაა, როგორიც უნდა იყოს — ის ისეთია, როგორიცაა. მნიშვნელოვანია, როგორ უმკლავდები მას.",
      "ru": "Жизнь не такая, какой должна быть. Она такая, какая есть. Важно то, как вы с ней справляетесь.",
      "hy": "Կյանքն այնպիսին չէ, ինչպիսին պետք է լինի։ Այն այնպիսին է, ինչպիսին կա։ Կարևորը, թե ինչպես ես դիմանում դրան։",
      "uk": "Життя не таке, яким має бути. Воно таке, яке є. Важливо те, як ви з ним справляєтеся.",
      "tr": "Hayat olması gerektiği gibi değil, olduğu gibidir. Önemli olan onunla nasıl başa çıktığınızdır.",
      "az": "Həyat necə olmalıdırsa elə deyil. O, necədirsə elədir. Əsas olan onunla necə mübarizə apardığınızdır.",
      "de": "Das Leben ist nicht so, wie es sein sollte. Es ist so, wie es ist. Entscheidend ist, wie du damit umgehst.",
      "fr": "La vie n'est pas ce qu'elle devrait être. Elle est ce qu'elle est. La façon dont vous y faites face fait la différence.",
      "es": "La vida no es como se supone que debería ser. Es como es. La forma en que la enfrentas marca la diferencia.",
      "it": "La vita non è come dovrebbe essere. È come è. Il modo in cui la affronti fa la differenza.",
      "pt": "A vida não é como deveria ser. É como é. A forma como você lida com ela faz a diferença.",
      "pl": "Życie nie jest takie, jakie powinno być. Jest takie, jakie jest. Liczy się to, jak sobie z nim radzisz.",
      "id": "Hidup tidak seperti seharusnya. Hidup adalah apa adanya. Cara Anda menghadapinya yang membuat perbedaan.",
      "ar": "الحياة ليست كما يجب أن تكون. إنها كما هي. طريقة تعاملك معها هي ما يصنع الفرق.",
      "hi": "जीवन वैसा नहीं है जैसा उसे होना चाहिए। यह वैसा ही है जैसा है। फर्क इस बात से पड़ता है कि आप इससे कैसे निपटते हैं।",
      "zh": "生活不是它应该是的样子，而是它本来的样子。你如何应对它，才是关键。",
      "ja": "人生はこうあるべきというものではなく、ただそうであるものだ。大切なのはそれにどう向き合うかだ。",
      "ko": "삶은 마땅히 그래야 하는 모습이 아니라 있는 그대로의 모습이다. 중요한 것은 그것에 어떻게 대처하느냐이다."
    }
  },
  {
    "author": "Rollo May",
    "text": {
      "en": "Depression is the inability to construct a future.",
      "ka": "დეპრესია არის მომავლის აგების უუნარობა.",
      "ru": "Депрессия — это неспособность построить будущее.",
      "hy": "Ընկճախտը ապագա կառուցելու անկարողությունն է։",
      "uk": "Депресія — це нездатність побудувати майбутнє.",
      "tr": "Depresyon, bir gelecek inşa edememe halidir.",
      "az": "Depressiya gələcək qurmaq bacarıqsızlığıdır.",
      "de": "Depression ist die Unfähigkeit, sich eine Zukunft vorzustellen.",
      "fr": "La dépression est l'incapacité à construire un avenir.",
      "es": "La depresión es la incapacidad de construir un futuro.",
      "it": "La depressione è l'incapacità di costruire un futuro.",
      "pt": "A depressão é a incapacidade de construir um futuro.",
      "pl": "Depresja to niezdolność do zbudowania przyszłości.",
      "id": "Depresi adalah ketidakmampuan untuk membangun masa depan.",
      "ar": "الاكتئاب هو عدم القدرة على بناء مستقبل.",
      "hi": "अवसाद भविष्य का निर्माण करने में असमर्थता है।",
      "zh": "抑郁是一种无法构建未来的能力丧失。",
      "ja": "抑うつとは、未来を思い描けなくなることである。",
      "ko": "우울증이란 미래를 그려낼 수 없는 상태이다."
    }
  },
  {
    "author": "Abraham Maslow",
    "text": {
      "en": "What is necessary to change a person is to change their awareness of themselves.",
      "ka": "ადამიანის შესაცვლელად საჭიროა შეიცვალოს მისი გაცნობიერება საკუთარი თავის შესახებ.",
      "ru": "Чтобы изменить человека, нужно изменить его осознание самого себя.",
      "hy": "Մարդուն փոխելու համար անհրաժեշտ է փոխել նրա գիտակցությունն իր մասին։",
      "uk": "Щоб змінити людину, потрібно змінити її усвідомлення самої себе.",
      "tr": "Bir insanı değiştirmek için gerekli olan, onun kendi farkındalığını değiştirmektir.",
      "az": "İnsanı dəyişmək üçün onun özü haqqında dərk etməsini dəyişmək lazımdır.",
      "de": "Um einen Menschen zu verändern, muss man sein Bewusstsein über sich selbst verändern.",
      "fr": "Ce qui est nécessaire pour changer une personne, c'est de changer sa conscience d'elle-même.",
      "es": "Lo necesario para cambiar a una persona es cambiar su conciencia de sí misma.",
      "it": "Ciò che è necessario per cambiare una persona è cambiare la sua consapevolezza di sé.",
      "pt": "O que é necessário para mudar uma pessoa é mudar sua consciência sobre si mesma.",
      "pl": "To, co jest potrzebne, aby zmienić człowieka, to zmiana jego świadomości samego siebie.",
      "id": "Yang diperlukan untuk mengubah seseorang adalah mengubah kesadaran mereka akan diri sendiri.",
      "ar": "ما يلزم لتغيير الشخص هو تغيير وعيه بذاته.",
      "hi": "किसी व्यक्ति को बदलने के लिए आवश्यक है कि उसकी स्वयं के प्रति जागरूकता बदली जाए।",
      "zh": "要改变一个人，必须先改变他对自身的觉察。",
      "ja": "人を変えるために必要なのは、その人の自己に対する気づきを変えることだ。",
      "ko": "사람을 변화시키기 위해 필요한 것은 그 사람의 자기 인식을 바꾸는 것이다."
    }
  },
  {
    "author": "Carl Rogers",
    "text": {
      "en": "The good life is a process, not a state of being.",
      "ka": "კარგი ცხოვრება პროცესია და არა მდგომარეობა.",
      "ru": "Хорошая жизнь — это процесс, а не состояние.",
      "hy": "Բարի կյանքը գործընթաց է, ոչ թե վիճակ։",
      "uk": "Добре життя — це процес, а не стан.",
      "tr": "İyi yaşam bir süreçtir, bir hâl değil.",
      "az": "Yaxşı həyat prosesdir, vəziyyət deyil.",
      "de": "Das gute Leben ist ein Prozess, kein Zustand.",
      "fr": "La bonne vie est un processus, pas un état.",
      "es": "La buena vida es un proceso, no un estado del ser.",
      "it": "La vita buona è un processo, non uno stato.",
      "pt": "A boa vida é um processo, não um estado.",
      "pl": "Dobre życie to proces, a nie stan.",
      "id": "Kehidupan yang baik adalah sebuah proses, bukan keadaan.",
      "ar": "الحياة الطيبة عملية وليست حالة.",
      "hi": "अच्छा जीवन एक प्रक्रिया है, कोई अवस्था नहीं।",
      "zh": "美好的生活是一个过程，而不是一种状态。",
      "ja": "良い人生とはプロセスであり、状態ではない。",
      "ko": "좋은 삶은 하나의 상태가 아니라 과정이다."
    }
  },
  {
    "author": "Brené Brown",
    "text": {
      "en": "Vulnerability is not weakness; it's our most accurate measure of courage.",
      "ka": "დაუცველობა სისუსტე არაა — ეს ჩვენი გამბედაობის ყველაზე ზუსტი საზომია.",
      "ru": "Уязвимость — это не слабость, а самое точное мерило нашей смелости.",
      "hy": "Խոցելիությունը թուլություն չէ, այն մեր խիզախության ամենաճշգրիտ չափանիշն է։",
      "uk": "Вразливість — це не слабкість; це найточніший вимір нашої мужності.",
      "tr": "Kırılganlık zayıflık değildir; cesaretimizin en doğru ölçüsüdür.",
      "az": "Zəiflik olmaq zəiflik deyil; bu, cəsarətimizin ən dəqiq ölçüsüdür.",
      "de": "Verletzlichkeit ist keine Schwäche; sie ist unser genauestes Maß für Mut.",
      "fr": "La vulnérabilité n'est pas une faiblesse ; c'est notre mesure la plus précise du courage.",
      "es": "La vulnerabilidad no es debilidad; es la medida más precisa de nuestro coraje.",
      "it": "La vulnerabilità non è debolezza; è la misura più accurata del nostro coraggio.",
      "pt": "A vulnerabilidade não é fraqueza; é a medida mais precisa da nossa coragem.",
      "pl": "Wrażliwość nie jest słabością; to najdokładniejsza miara naszej odwagi.",
      "id": "Kerentanan bukanlah kelemahan; itu adalah ukuran keberanian kita yang paling akurat.",
      "ar": "الضعف ليس ضعفًا؛ إنه أدق مقياس لشجاعتنا.",
      "hi": "भेद्यता कमजोरी नहीं है; यह हमारे साहस का सबसे सटीक मापदंड है।",
      "zh": "脆弱不是软弱，它是衡量我们勇气最准确的标准。",
      "ja": "脆さは弱さではない。それは私たちの勇気を最も正確に測る尺度である。",
      "ko": "취약함은 나약함이 아니다. 그것은 우리의 용기를 가장 정확하게 재는 척도이다."
    }
  },
  {
    "author": "Daniel Goleman",
    "text": {
      "en": "In a very real sense we have two minds: one that thinks and one that feels.",
      "ka": "ჭეშმარიტი გაგებით ჩვენ გვაქვს ორი გონება: ერთი, რომელიც ფიქრობს, და ერთი, რომელიც გრძნობს.",
      "ru": "В самом реальном смысле у нас два разума: один думает, другой чувствует.",
      "hy": "Շատ իրական իմաստով մենք ունենք երկու միտք՝ մեկը, որ մտածում է, և մեկը, որ զգում է։",
      "uk": "У дуже реальному сенсі ми маємо два розуми: один, що мислить, і один, що відчуває.",
      "tr": "Çok gerçek bir anlamda iki zihnimiz var: biri düşünen, biri hisseden.",
      "az": "Çox real mənada bizim iki ağlımız var: biri düşünən, digəri hiss edən.",
      "de": "In einem sehr realen Sinne haben wir zwei Geister: einen, der denkt, und einen, der fühlt.",
      "fr": "Dans un sens très réel, nous avons deux esprits : l'un qui pense et l'un qui ressent.",
      "es": "En un sentido muy real tenemos dos mentes: una que piensa y otra que siente.",
      "it": "In un senso molto reale abbiamo due menti: una che pensa e una che sente.",
      "pt": "Em um sentido muito real, temos duas mentes: uma que pensa e outra que sente.",
      "pl": "W bardzo realnym sensie mamy dwa umysły: jeden, który myśli, i jeden, który czuje.",
      "id": "Dalam arti yang sangat nyata, kita memiliki dua pikiran: satu yang berpikir dan satu yang merasakan.",
      "ar": "بمعنى حقيقي جدًا، لدينا عقلان: واحد يفكر وآخر يشعر.",
      "hi": "एक बहुत वास्तविक अर्थ में हमारे पास दो मन हैं: एक जो सोचता है और एक जो महसूस करता है।",
      "zh": "从一个非常真实的意义上说，我们拥有两种心智：一个思考，一个感受。",
      "ja": "実に本質的な意味で、私たちには二つの心がある。考える心と、感じる心だ。",
      "ko": "아주 실제적인 의미에서 우리에게는 두 개의 마음이 있다. 생각하는 마음과 느끼는 마음이다."
    }
  },
  {
    "author": "Nathaniel Branden",
    "text": {
      "en": "The first step toward change is awareness.",
      "ka": "ცვლილებისკენ პირველი ნაბიჯი გაცნობიერებაა.",
      "ru": "Первый шаг к переменам — осознанность.",
      "hy": "Փոփոխության առաջին քայլը գիտակցումն է։",
      "uk": "Перший крок до змін — усвідомлення.",
      "tr": "Değişime giden ilk adım farkındalıktır.",
      "az": "Dəyişikliyə doğru ilk addım məlumatlılıqdır.",
      "de": "Der erste Schritt zur Veränderung ist Bewusstsein.",
      "fr": "Le premier pas vers le changement est la prise de conscience.",
      "es": "El primer paso hacia el cambio es la conciencia.",
      "it": "Il primo passo verso il cambiamento è la consapevolezza.",
      "pt": "O primeiro passo para a mudança é a consciência.",
      "pl": "Pierwszym krokiem ku zmianie jest świadomość.",
      "id": "Langkah pertama menuju perubahan adalah kesadaran.",
      "ar": "الخطوة الأولى نحو التغيير هي الوعي.",
      "hi": "बदलाव की ओर पहला कदम जागरूकता है।",
      "zh": "迈向改变的第一步是觉察。",
      "ja": "変化への第一歩は気づきである。",
      "ko": "변화를 향한 첫걸음은 자각이다."
    }
  },
  {
    "author": "William James",
    "text": {
      "en": "The greatest weapon against stress is our ability to choose one thought over another.",
      "ka": "სტრესის წინააღმდეგ ყველაზე ძლიერი იარაღი ჩვენი უნარია, ერთი აზრი მეორეს ამჯობინოთ.",
      "ru": "Величайшее оружие против стресса — наша способность выбирать одну мысль вместо другой.",
      "hy": "Սթրեսի դեմ ամենամեծ զենքը մեր ունակությունն է՝ ընտրելու մեկ միտք մյուսի փոխարեն։",
      "uk": "Найбільша зброя проти стресу — це наша здатність обирати одну думку замість іншої.",
      "tr": "Strese karşı en büyük silahımız, bir düşünceyi diğerine tercih etme yeteneğimizdir.",
      "az": "Stresə qarşı ən böyük silahımız bir fikri digərindən üstün tutmaq bacarığımızdır.",
      "de": "Die größte Waffe gegen Stress ist unsere Fähigkeit, einen Gedanken einem anderen vorzuziehen.",
      "fr": "La plus grande arme contre le stress est notre capacité à choisir une pensée plutôt qu'une autre.",
      "es": "La mayor arma contra el estrés es nuestra capacidad de elegir un pensamiento sobre otro.",
      "it": "La più grande arma contro lo stress è la nostra capacità di scegliere un pensiero piuttosto che un altro.",
      "pt": "A maior arma contra o estresse é nossa capacidade de escolher um pensamento em vez de outro.",
      "pl": "Najpotężniejszą bronią przeciwko stresowi jest nasza zdolność wyboru jednej myśli zamiast innej.",
      "id": "Senjata terbesar melawan stres adalah kemampuan kita untuk memilih satu pikiran daripada yang lain.",
      "ar": "أعظم سلاح ضد التوتر هو قدرتنا على اختيار فكرة بدلاً من أخرى.",
      "hi": "तनाव के खिलाफ सबसे बड़ा हथियार एक विचार को दूसरे पर चुनने की हमारी क्षमता है।",
      "zh": "对抗压力最强大的武器，是我们选择一种想法而非另一种想法的能力。",
      "ja": "ストレスに対する最大の武器は、ある考えを別の考えより選び取る力である。",
      "ko": "스트레스에 맞서는 가장 강력한 무기는 한 생각을 다른 생각보다 선택할 수 있는 능력이다."
    }
  }
];
