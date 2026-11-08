// Fixed texts for art-reflection turns the app has to correct itself, in the
// person's language (same forms of address as server/prompts/art.md).
//
//   identical   the same drawing was uploaded as the changed one
//   uncertain   the app can't tell reliably what changed
//   clarifyNeg  the reply contradicted an unpleasant feeling: ask instead
//   clarifyPos  the reply contradicted a pleasant feeling: ask instead
//   retry       the AI answer was unusable twice
//   thanks      a session note when nothing reliable is left of a summary
//   note        the "AI companion, not therapy" sentence that ends a summary

export const ART_TEXT = {
  en: {
    identical: "I don't see any changes between the two images. Perhaps you sent the same drawing? We can keep working with it if you like.",
    uncertain: "I can't tell for sure what changed. If you like, tell me what you decided to change.",
    clarifyNeg: 'Do I understand correctly that this felt unpleasant for you?',
    clarifyPos: 'Do I understand correctly that this felt pleasant for you?',
    retry: 'Sorry, something went wrong on my side. Could you write that once more?',
    thanks: 'Thank you for this session and for sharing your drawing.',
    note: 'This was a reflective space with an AI companion, not a substitute for therapy or medical care.',
  },
  ka: {
    identical: 'ორ სურათს შორის ცვლილებას ვერ ვხედავ. შეიძლება იგივე ნახატი გამოგზავნე? თუ გინდა, ამით გავაგრძელოთ.',
    uncertain: 'ზუსტად ვერ ვამბობ, რა შეიცვალა. თუ გინდა, მომიყევი, რისი შეცვლა გადაწყვიტე.',
    clarifyNeg: 'სწორად მესმის, რომ ეს შენთვის უსიამოვნო იყო?',
    clarifyPos: 'სწორად მესმის, რომ ეს შენთვის სასიამოვნო იყო?',
    retry: 'ბოდიში, ჩემს მხარეს რაღაც ვერ გამოვიდა. შეგიძლია კიდევ ერთხელ დაწერო?',
    thanks: 'მადლობა ამ სესიისთვის და იმისთვის, რომ შენი ნახატი გამიზიარე.',
    note: 'ეს იყო ფიქრის სივრცე ხელოვნური ინტელექტის თანამგზავრთან და არა თერაპიის ან სამედიცინო დახმარების შემცვლელი.',
  },
  ru: {
    identical: 'Я не вижу изменений между изображениями. Возможно, вы отправили тот же рисунок? Мы можем продолжить работу с ним, если хотите.',
    uncertain: 'Я не могу уверенно определить, что изменилось. Если хотите, расскажите, что вы решили поменять.',
    clarifyNeg: 'Правильно ли я понимаю, что для вас это было неприятно?',
    clarifyPos: 'Правильно ли я понимаю, что для вас это было приятно?',
    retry: 'Извините, у меня что-то не получилось. Можете написать это ещё раз?',
    thanks: 'Спасибо за эту сессию и за то, что поделились своим рисунком.',
    note: 'Это было пространство для размышлений с ИИ-компаньоном, а не замена терапии или медицинской помощи.',
  },
  hy: {
    identical: 'Երկու պատկերների միջև փոփոխություն չեմ տեսնում։ Գուցե նույն նկարն եք ուղարկել։ Եթե ցանկանում եք, կարող ենք շարունակել դրանով։',
    uncertain: 'Չեմ կարող վստահ ասել, թե ինչ է փոխվել։ Եթե ցանկանում եք, պատմեք, թե ինչ որոշեցիք փոխել։',
    clarifyNeg: 'Ճի՞շտ եմ հասկանում, որ դա ձեզ համար տհաճ էր։',
    clarifyPos: 'Ճի՞շտ եմ հասկանում, որ դա ձեզ համար հաճելի էր։',
    retry: 'Ներողություն, իմ կողմից ինչ-որ բան չստացվեց։ Կարո՞ղ եք մեկ անգամ էլ գրել։',
    thanks: 'Շնորհակալություն այս սեանսի և ձեր նկարով կիսվելու համար։',
    note: 'Սա արհեստական բանականությամբ ուղեկցի հետ մտորումների տարածք էր, ոչ թե թերապիայի կամ բժշկական օգնության փոխարինում։',
  },
  uk: {
    identical: 'Я не бачу змін між зображеннями. Можливо, ви надіслали той самий малюнок? Якщо хочете, можемо продовжити з ним.',
    uncertain: 'Я не можу впевнено визначити, що змінилося. Якщо хочете, розкажіть, що ви вирішили змінити.',
    clarifyNeg: 'Чи правильно я розумію, що для вас це було неприємно?',
    clarifyPos: 'Чи правильно я розумію, що для вас це було приємно?',
    retry: 'Вибачте, у мене щось не вийшло. Можете написати це ще раз?',
    thanks: 'Дякую за цю сесію і за те, що поділилися своїм малюнком.',
    note: 'Це був простір для роздумів із ШІ-компаньйоном, а не заміна терапії чи медичної допомоги.',
  },
  az: {
    identical: 'İki şəkil arasında dəyişiklik görmürəm. Bəlkə eyni rəsmi göndərmisiniz? İstəsəniz, onunla davam edə bilərik.',
    uncertain: 'Nəyin dəyişdiyini dəqiq deyə bilmirəm. İstəsəniz, nəyi dəyişməyə qərar verdiyinizi danışın.',
    clarifyNeg: 'Düz başa düşürəmmi ki, bu sizin üçün xoşagəlməz idi?',
    clarifyPos: 'Düz başa düşürəmmi ki, bu sizin üçün xoş idi?',
    retry: 'Bağışlayın, mənim tərəfimdə nəsə alınmadı. Bunu bir daha yaza bilərsiniz?',
    thanks: 'Bu sessiya və rəsminizi paylaşdığınız üçün təşəkkür edirəm.',
    note: 'Bu, terapiyanı və ya tibbi yardımı əvəz etməyən, süni intellekt yoldaşı ilə düşüncə məkanı idi.',
  },
  tr: {
    identical: 'İki resim arasında bir değişiklik göremiyorum. Belki aynı çizimi gönderdin? İstersen onunla devam edebiliriz.',
    uncertain: 'Neyin değiştiğini kesin olarak söyleyemiyorum. İstersen neyi değiştirmeye karar verdiğini anlat.',
    clarifyNeg: 'Doğru mu anlıyorum, bu senin için hoş değildi?',
    clarifyPos: 'Doğru mu anlıyorum, bu senin için hoştu?',
    retry: 'Üzgünüm, benim tarafımda bir şey ters gitti. Bunu bir kez daha yazabilir misin?',
    thanks: 'Bu oturum ve çizimini paylaştığın için teşekkür ederim.',
    note: 'Bu, terapinin ya da tıbbi bakımın yerini tutmayan, bir yapay zekâ yol arkadaşıyla bir düşünme alanıydı.',
  },
  de: {
    identical: 'Ich sehe keine Veränderungen zwischen den beiden Bildern. Hast du vielleicht dieselbe Zeichnung geschickt? Wenn du magst, können wir damit weitermachen.',
    uncertain: 'Ich kann nicht sicher sagen, was sich verändert hat. Wenn du magst, erzähl mir, was du verändern wolltest.',
    clarifyNeg: 'Verstehe ich richtig, dass sich das für dich unangenehm angefühlt hat?',
    clarifyPos: 'Verstehe ich richtig, dass sich das für dich angenehm angefühlt hat?',
    retry: 'Entschuldige, bei mir ist etwas schiefgelaufen. Kannst du das noch einmal schreiben?',
    thanks: 'Danke für diese Sitzung und dafür, dass du deine Zeichnung geteilt hast.',
    note: 'Das war ein Raum zum Nachdenken mit einer KI-Begleitung, kein Ersatz für Therapie oder medizinische Versorgung.',
  },
  fr: {
    identical: 'Je ne vois pas de changement entre les deux images. Peut-être avez-vous envoyé le même dessin ? Nous pouvons continuer avec celui-ci si vous le souhaitez.',
    uncertain: 'Je ne peux pas dire avec certitude ce qui a changé. Si vous le souhaitez, dites-moi ce que vous avez décidé de modifier.',
    clarifyNeg: 'Est-ce que je comprends bien que c’était désagréable pour vous ?',
    clarifyPos: 'Est-ce que je comprends bien que c’était agréable pour vous ?',
    retry: 'Désolée, quelque chose n’a pas fonctionné de mon côté. Pouvez-vous l’écrire encore une fois ?',
    thanks: 'Merci pour cette séance et d’avoir partagé votre dessin.',
    note: 'C’était un espace de réflexion avec une compagne IA, et non un substitut à une thérapie ou à des soins médicaux.',
  },
  es: {
    identical: 'No veo cambios entre las dos imágenes. ¿Quizá enviaste el mismo dibujo? Si quieres, podemos seguir trabajando con él.',
    uncertain: 'No puedo saber con seguridad qué cambió. Si quieres, cuéntame qué decidiste cambiar.',
    clarifyNeg: '¿Entiendo bien que esto fue desagradable para ti?',
    clarifyPos: '¿Entiendo bien que esto fue agradable para ti?',
    retry: 'Lo siento, algo falló por mi parte. ¿Puedes escribirlo una vez más?',
    thanks: 'Gracias por esta sesión y por compartir tu dibujo.',
    note: 'Este fue un espacio de reflexión con una compañera de IA, no un sustituto de la terapia ni de la atención médica.',
  },
  it: {
    identical: 'Non vedo cambiamenti tra le due immagini. Forse hai inviato lo stesso disegno? Se vuoi, possiamo continuare a lavorarci.',
    uncertain: 'Non riesco a dire con certezza che cosa sia cambiato. Se vuoi, raccontami che cosa hai deciso di cambiare.',
    clarifyNeg: 'Capisco bene che per te è stato spiacevole?',
    clarifyPos: 'Capisco bene che per te è stato piacevole?',
    retry: 'Scusa, qualcosa non ha funzionato da parte mia. Puoi scriverlo ancora una volta?',
    thanks: 'Grazie per questa sessione e per aver condiviso il tuo disegno.',
    note: 'È stato uno spazio di riflessione con una compagna IA, non un sostituto della terapia o delle cure mediche.',
  },
  pt: {
    identical: 'Não vejo alterações entre as duas imagens. Talvez tenha enviado o mesmo desenho? Se quiser, podemos continuar a trabalhar com ele.',
    uncertain: 'Não consigo dizer com certeza o que mudou. Se quiser, conte-me o que decidiu mudar.',
    clarifyNeg: 'Percebo bem que isto foi desagradável para si?',
    clarifyPos: 'Percebo bem que isto foi agradável para si?',
    retry: 'Desculpe, algo correu mal do meu lado. Pode escrever isso mais uma vez?',
    thanks: 'Obrigada por esta sessão e por partilhar o seu desenho.',
    note: 'Este foi um espaço de reflexão com uma companheira de IA, não um substituto de terapia ou de cuidados médicos.',
  },
  pl: {
    identical: 'Nie widzę zmian między obrazami. Może wysłałeś(-aś) ten sam rysunek? Jeśli chcesz, możemy dalej z nim pracować.',
    uncertain: 'Nie potrafię z pewnością powiedzieć, co się zmieniło. Jeśli chcesz, opowiedz, co postanowiłeś(-aś) zmienić.',
    clarifyNeg: 'Czy dobrze rozumiem, że było to dla Ciebie nieprzyjemne?',
    clarifyPos: 'Czy dobrze rozumiem, że było to dla Ciebie przyjemne?',
    retry: 'Przepraszam, coś poszło nie tak po mojej stronie. Możesz napisać to jeszcze raz?',
    thanks: 'Dziękuję za tę sesję i za podzielenie się rysunkiem.',
    note: 'To była przestrzeń do refleksji z towarzyszką AI, a nie zastępstwo terapii ani opieki medycznej.',
  },
  ar: {
    identical: 'لا أرى أي تغييرات بين الصورتين. ربما أرسلتَ الرسم نفسه؟ يمكننا متابعة العمل عليه إن أردت.',
    uncertain: 'لا أستطيع أن أحدد بثقة ما الذي تغيّر. إن أردت، أخبرني بما قررت تغييره.',
    clarifyNeg: 'هل أفهم بشكل صحيح أن ذلك كان مزعجًا بالنسبة لك؟',
    clarifyPos: 'هل أفهم بشكل صحيح أن ذلك كان لطيفًا بالنسبة لك؟',
    retry: 'عذرًا، حدث خطأ من جهتي. هل يمكنك كتابة ذلك مرة أخرى؟',
    thanks: 'شكرًا لك على هذه الجلسة وعلى مشاركة رسمك.',
    note: 'كانت هذه مساحة للتأمل مع رفيق ذكاء اصطناعي، وليست بديلًا عن العلاج أو الرعاية الطبية.',
  },
  hi: {
    identical: 'मुझे दोनों तस्वीरों में कोई बदलाव नहीं दिख रहा। शायद आपने वही चित्र भेजा है? अगर आप चाहें, तो हम इसी के साथ आगे बढ़ सकते हैं।',
    uncertain: 'मैं पक्के तौर पर नहीं कह सकती कि क्या बदला है। अगर आप चाहें, तो बताइए कि आपने क्या बदलने का फ़ैसला किया।',
    clarifyNeg: 'क्या मैं सही समझ रही हूँ कि यह आपके लिए अप्रिय था?',
    clarifyPos: 'क्या मैं सही समझ रही हूँ कि यह आपके लिए सुखद था?',
    retry: 'माफ़ कीजिए, मेरी ओर से कुछ गड़बड़ हो गई। क्या आप इसे एक बार फिर लिख सकते हैं?',
    thanks: 'इस सत्र के लिए और अपना चित्र साझा करने के लिए धन्यवाद।',
    note: 'यह एक AI साथी के साथ चिंतन का स्थान था, थेरेपी या चिकित्सा देखभाल का विकल्प नहीं।',
  },
  id: {
    identical: 'Aku tidak melihat perubahan di antara kedua gambar. Mungkin kamu mengirim gambar yang sama? Kalau mau, kita bisa lanjut dengan gambar ini.',
    uncertain: 'Aku tidak bisa memastikan apa yang berubah. Kalau mau, ceritakan apa yang kamu putuskan untuk diubah.',
    clarifyNeg: 'Apakah aku benar memahami bahwa ini terasa tidak menyenangkan bagimu?',
    clarifyPos: 'Apakah aku benar memahami bahwa ini terasa menyenangkan bagimu?',
    retry: 'Maaf, ada yang tidak berjalan di sisiku. Bisakah kamu menuliskannya sekali lagi?',
    thanks: 'Terima kasih untuk sesi ini dan karena sudah membagikan gambarmu.',
    note: 'Ini adalah ruang refleksi bersama pendamping AI, bukan pengganti terapi atau perawatan medis.',
  },
  ja: {
    identical: '2枚の画像に違いは見当たりません。同じ絵を送ったのかもしれませんね。よければ、この絵のまま続けましょう。',
    uncertain: '何が変わったのか、はっきりとはわかりません。よければ、何を変えることにしたのか教えてください。',
    clarifyNeg: 'これはあなたにとって不快な感じだった、という理解で合っていますか？',
    clarifyPos: 'これはあなたにとって心地よい感じだった、という理解で合っていますか？',
    retry: 'すみません、こちらでうまくいきませんでした。もう一度書いていただけますか？',
    thanks: 'このセッションと、絵を見せてくださったことに感謝します。',
    note: 'これはAIのパートナーと振り返るための時間であり、セラピーや医療の代わりではありません。',
  },
  ko: {
    identical: '두 이미지 사이에서 달라진 점이 보이지 않아요. 같은 그림을 보내셨을 수도 있어요. 원하시면 이 그림으로 계속해요.',
    uncertain: '무엇이 바뀌었는지 확실히 말하기 어려워요. 원하시면 무엇을 바꾸기로 했는지 알려 주세요.',
    clarifyNeg: '이게 불편하게 느껴졌다는 뜻으로 이해하면 될까요?',
    clarifyPos: '이게 기분 좋게 느껴졌다는 뜻으로 이해하면 될까요?',
    retry: '죄송해요, 제 쪽에서 문제가 생겼어요. 한 번 더 써 주실 수 있나요?',
    thanks: '이번 세션과 그림을 나눠 주셔서 고마워요.',
    note: '이 시간은 AI 동반자와 함께한 성찰의 공간이었으며, 치료나 의료를 대신하지 않아요.',
  },
  zh: {
    identical: '我没有看到两张图片之间有变化。也许你发送的是同一幅画？如果你愿意，我们可以继续用它。',
    uncertain: '我无法确定哪里发生了变化。如果你愿意，可以告诉我你决定改动了什么。',
    clarifyNeg: '我理解得对吗：这对你来说是不舒服的？',
    clarifyPos: '我理解得对吗：这对你来说是愉快的？',
    retry: '抱歉，我这边出了点问题。你能再写一次吗？',
    thanks: '感谢你参与这次练习，并分享你的画。',
    note: '这是一个与AI伙伴一起反思的空间，不能替代心理治疗或医疗照护。',
  },
};

export const artText = (language, key) => (ART_TEXT[language] || ART_TEXT.en)[key] || ART_TEXT.en[key];

/** Language code from the app's "Language: Russian (Русский)" context, or a code. */
const NAMES = { english: 'en', georgian: 'ka', russian: 'ru', armenian: 'hy', ukrainian: 'uk', azerbaijani: 'az', turkish: 'tr', german: 'de', french: 'fr', spanish: 'es', italian: 'it', portuguese: 'pt', polish: 'pl', arabic: 'ar', hindi: 'hi', indonesian: 'id', japanese: 'ja', korean: 'ko', chinese: 'zh' };
export function languageCode(value) {
  const v = String(value || '').trim().toLowerCase();
  if (ART_TEXT[v]) return v;
  const name = v.split(/[\s(]/)[0];
  return NAMES[name] || 'en';
}
