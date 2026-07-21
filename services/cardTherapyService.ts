import { AppLanguage } from '@/contexts/LanguageContext';
import Constants from 'expo-constants';
import { buildProfileContextBlock, getUserProfile } from './userProfileService';

/**
 * Card Therapy Service
 * Handles therapeutic card sessions using OpenAI Stored Prompts API
 */

interface CardContext {
  cardType: 'emotion' | 'resource' | 'positive_negative' | 'narrative';
  cardId: string;
  positiveCardId?: string; // For positive/negative cards
  negativeCardId?: string; // For positive/negative cards
  language?: AppLanguage; // User's preferred language
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Multilingual context messages (19 languages)
const CONTEXT_MESSAGES = {
  emotion: {
    en: (cardId: string) => `The client has selected Emotion Card #${cardId}. This card represents their current emotional state. Use the EMOTION CARDS PROTOCOL to guide the session through Initial Projection, Exploration & Depth, and Integration & Transformation phases. Total session: 20-30 exchanges.`,
    ka: (cardId: string) => `კლიენტმა აირჩია ემოციების ბარათი #${cardId}. ეს ბარათი წარმოადგენს მათ მიმდინარე ემოციურ მდგომარეობას. გამოიყენეთ EMOTION CARDS PROTOCOL სესიის წარმართვისთვის საწყისი პროექციის, ექსპლორაციისა და სიღრმის, და ინტეგრაციისა და ტრანსფორმაციის ფაზებში. სულ სესია: 20-30 გაცვლა.`,
    ru: (cardId: string) => `Клиент выбрал Эмоциональную карту #${cardId}. Эта карта представляет его текущее эмоциональное состояние. Используйте ПРОТОКОЛ ЭМОЦИОНАЛЬНЫХ КАРТ для проведения сессии через фазы Начальной Проекции, Исследования и Глубины, и Интеграции и Трансформации. Всего сессия: 20-30 обменов.`,
    hy: (cardId: string) => `Հաճախորդը ընտրել է Հույզերի Քարտ #${cardId}։ Այս քարտը ներկայացնում է նրանց ներկայիս հուզական վիճակը։ Օգտագործեք EMOTION CARDS PROTOCOL՝ սեանսը ղեկավարելու Սկզբնական Պրոյեկցիայի, Հետազոտության և Խորության, և Ինտեգրման և Վերափոխման փուլերով։ Ընդհանուր սեանս՝ 20-30 փոխանակում։`,
    tr: (cardId: string) => `Danışan Duygu Kartı #${cardId}'i seçti. Bu kart mevcut duygusal durumlarını temsil ediyor. Seansı İlk Projeksiyon, Keşif ve Derinlik, ve Entegrasyon ve Dönüşüm aşamalarından geçirmek için EMOTION CARDS PROTOCOL kullanın. Toplam seans: 20-30 değişim.`,
    az: (cardId: string) => `Müştəri Emosiya Kartı #${cardId}-ni seçdi. Bu kart onların hazırkı emosional vəziyyətini təmsil edir. Seansı İlkin Proyeksiya, Tədqiqat və Dərinlik, və İnteqrasiya və Transformasiya mərhələləri ilə keçirmək üçün EMOTION CARDS PROTOCOL istifadə edin. Ümumi seans: 20-30 mübadilə.`,
    es: (cardId: string) => `El cliente ha seleccionado la Carta de Emoción #${cardId}. Esta carta representa su estado emocional actual. Use el PROTOCOLO DE CARTAS DE EMOCIÓN para guiar la sesión a través de las fases de Proyección Inicial, Exploración y Profundidad, e Integración y Transformación. Sesión total: 20-30 intercambios.`,
    de: (cardId: string) => `Der Klient hat Emotionskarte #${cardId} ausgewählt. Diese Karte repräsentiert seinen aktuellen emotionalen Zustand. Verwenden Sie das EMOTION CARDS PROTOCOL, um die Sitzung durch die Phasen Anfangsprojektion, Erforschung und Tiefe, und Integration und Transformation zu führen. Gesamtsitzung: 20-30 Austausche.`,
    fr: (cardId: string) => `Le client a sélectionné la Carte d'Émotion #${cardId}. Cette carte représente son état émotionnel actuel. Utilisez le PROTOCOLE DES CARTES D'ÉMOTIONS pour guider la séance à travers les phases de Projection Initiale, d'Exploration et de Profondeur, et d'Intégration et de Transformation. Séance totale : 20-30 échanges.`,
    pt: (cardId: string) => `O cliente selecionou o Cartão de Emoção #${cardId}. Este cartão representa seu estado emocional atual. Use o PROTOCOLO DE CARTÕES DE EMOÇÃO para guiar a sessão através das fases de Projeção Inicial, Exploração e Profundidade, e Integração e Transformação. Sessão total: 20-30 trocas.`,
    id: (cardId: string) => `Klien telah memilih Kartu Emosi #${cardId}. Kartu ini mewakili keadaan emosional mereka saat ini. Gunakan EMOTION CARDS PROTOCOL untuk memandu sesi melalui fase Proyeksi Awal, Eksplorasi & Kedalaman, dan Integrasi & Transformasi. Total sesi: 20-30 pertukaran.`,
    it: (cardId: string) => `Il cliente ha selezionato la Carta delle Emozioni #${cardId}. Questa carta rappresenta il loro stato emotivo attuale. Usa il PROTOCOLLO DELLE CARTE DELLE EMOZIONI per guidare la sessione attraverso le fasi di Proiezione Iniziale, Esplorazione e Profondità, e Integrazione e Trasformazione. Sessione totale: 20-30 scambi.`,
    ar: (cardId: string) => `اختار العميل بطاقة العاطفة #${cardId}. تمثل هذه البطاقة حالتهم العاطفية الحالية. استخدم بروتوكول بطاقات العواطف لتوجيه الجلسة عبر مراحل الإسقاط الأولي والاستكشاف والعمق والتكامل والتحول. إجمالي الجلسة: 20-30 تبادلاً.`,
    hi: (cardId: string) => `ग्राहक ने भावना कार्ड #${cardId} का चयन किया है। यह कार्ड उनकी वर्तमान भावनात्मक स्थिति का प्रतिनिधित्व करता है। प्रारंभिक प्रक्षेपण, अन्वेषण और गहराई, और एकीकरण और परिवर्तन चरणों के माध्यम से सत्र का मार्गदर्शन करने के लिए EMOTION CARDS PROTOCOL का उपयोग करें। कुल सत्र: 20-30 आदान-प्रदान।`,
    zh: (cardId: string) => `客户选择了情感卡片 #${cardId}。此卡片代表他们当前的情绪状态。使用情感卡片协议指导会话通过初始投射、探索与深度、整合与转化阶段。总会话：20-30 次交流。`,
    ja: (cardId: string) => `クライアントは感情カード #${cardId} を選択しました。このカードは彼らの現在の感情状態を表します。EMOTION CARDS PROTOCOL を使用して、初期投影、探索と深さ、統合と変容の段階を通じてセッションを導いてください。合計セッション：20-30 回の交換。`,
    ko: (cardId: string) => `클라이언트가 감정 카드 #${cardId}를 선택했습니다. 이 카드는 현재 감정 상태를 나타냅니다. EMOTION CARDS PROTOCOL을 사용하여 초기 투사, 탐색 및 깊이, 통합 및 변화 단계를 통해 세션을 안내하세요. 총 세션: 20-30회 교환.`,
    uk: (cardId: string) => `Клієнт вибрав Емоційну картку #${cardId}. Ця картка представляє їхній поточний емоційний стан. Використовуйте ПРОТОКОЛ ЕМОЦІЙНИХ КАРТОК для проведення сесії через фази Початкової Проекції, Дослідження та Глибини, та Інтеграції та Трансформації. Всього сесія: 20-30 обмінів.`,
    pl: (cardId: string) => `Klient wybrał Kartę Emocji #${cardId}. Ta karta reprezentuje ich obecny stan emocjonalny. Użyj PROTOKOŁU KART EMOCJI, aby poprowadzić sesję przez fazy Wstępnej Projekcji, Eksploracji i Głębi oraz Integracji i Transformacji. Całkowita sesja: 20-30 wymian.`,
  },
  resource: {
    en: (cardId: string) => `The client has selected Resource Card #${cardId}. This card represents an internal strength or quality they want to explore. Use the RESOURCE CARDS PROTOCOL to guide the session through Resource Identification, Resource Deepening, and Resource Application phases. Total session: 20-30 exchanges.`,
    ka: (cardId: string) => `კლიენტმა აირჩია რესურსის ბარათი #${cardId}. ეს ბარათი წარმოადგენს შიდა ძალას ან თვისებას, რომლის შესწავლაც სურთ. გამოიყენეთ RESOURCE CARDS PROTOCOL სესიის წარმართვისთვის რესურსის იდენტიფიკაციის, რესურსის გაღრმავებისა და რესურსის გამოყენების ფაზებში. სულ სესია: 20-30 გაცვლა.`,
    ru: (cardId: string) => `Клиент выбрал Карту Ресурсов #${cardId}. Эта карта представляет внутреннюю силу или качество, которое он хочет исследовать. Используйте ПРОТОКОЛ КАРТ РЕСУРСОВ для проведения сессии через фазы Идентификации Ресурса, Углубления Ресурса и Применения Ресурса. Всего сессия: 20-30 обменов.`,
    hy: (cardId: string) => `Հաճախորդը ընտրել է Ռեսուրսների Քարտ #${cardId}։ Այս քարտը ներկայացնում է ներքին ուժ կամ որակ, որը նրանք ցանկանում են ուսումնասիրել։ Օգտագործեք RESOURCE CARDS PROTOCOL՝ սեանսը ղեկավարելու Ռեսուրսի Նույնականացման, Ռեսուրսի Խորացման և Ռեսուրսի Կիրառման փուլերով։ Ընդհանուր սեանս՝ 20-30 փոխանակում։`,
    tr: (cardId: string) => `Danışan Kaynak Kartı #${cardId}'i seçti. Bu kart keşfetmek istedikleri bir iç güç veya niteliği temsil ediyor. Seansı Kaynak Tanımlama, Kaynak Derinleştirme ve Kaynak Uygulama aşamalarından geçirmek için RESOURCE CARDS PROTOCOL kullanın. Toplam seans: 20-30 değişim.`,
    az: (cardId: string) => `Müştəri Resurs Kartı #${cardId}-ni seçdi. Bu kart onların öyrənmək istədikləri daxili gücü və ya keyfiyyəti təmsil edir. Seansı Resursun Müəyyənləşdirilməsi, Resursun Dərinləşdirilməsi və Resursun Tətbiqi mərhələləri ilə keçirmək üçün RESOURCE CARDS PROTOCOL istifadə edin. Ümumi seans: 20-30 mübadilə.`,
    es: (cardId: string) => `El cliente ha seleccionado la Carta de Recurso #${cardId}. Esta carta representa una fortaleza o cualidad interna que desean explorar. Use el PROTOCOLO DE CARTAS DE RECURSOS para guiar la sesión a través de las fases de Identificación de Recursos, Profundización de Recursos y Aplicación de Recursos. Sesión total: 20-30 intercambios.`,
    de: (cardId: string) => `Der Klient hat Ressourcenkarte #${cardId} ausgewählt. Diese Karte repräsentiert eine innere Stärke oder Qualität, die er erkunden möchte. Verwenden Sie das RESOURCE CARDS PROTOCOL, um die Sitzung durch die Phasen Ressourcenidentifikation, Ressourcenvertiefung und Ressourcenanwendung zu führen. Gesamtsitzung: 20-30 Austausche.`,
    fr: (cardId: string) => `Le client a sélectionné la Carte de Ressource #${cardId}. Cette carte représente une force ou qualité intérieure qu'il souhaite explorer. Utilisez le PROTOCOLE DES CARTES DE RESSOURCES pour guider la séance à travers les phases d'Identification des Ressources, d'Approfondissement des Ressources et d'Application des Ressources. Séance totale : 20-30 échanges.`,
    pt: (cardId: string) => `O cliente selecionou o Cartão de Recurso #${cardId}. Este cartão representa uma força ou qualidade interna que desejam explorar. Use o PROTOCOLO DE CARTÕES DE RECURSOS para guiar a sessão através das fases de Identificação de Recursos, Aprofundamento de Recursos e Aplicação de Recursos. Sessão total: 20-30 trocas.`,
    id: (cardId: string) => `Klien telah memilih Kartu Sumber Daya #${cardId}. Kartu ini mewakili kekuatan atau kualitas internal yang ingin mereka jelajahi. Gunakan RESOURCE CARDS PROTOCOL untuk memandu sesi melalui fase Identifikasi Sumber Daya, Pendalaman Sumber Daya, dan Aplikasi Sumber Daya. Total sesi: 20-30 pertukaran.`,
    it: (cardId: string) => `Il cliente ha selezionato la Carta delle Risorse #${cardId}. Questa carta rappresenta una forza o qualità interna che vogliono esplorare. Usa il PROTOCOLLO DELLE CARTE DELLE RISORSE per guidare la sessione attraverso le fasi di Identificazione delle Risorse, Approfondimento delle Risorse e Applicazione delle Risorse. Sessione totale: 20-30 scambi.`,
    ar: (cardId: string) => `اختار العميل بطاقة الموارد #${cardId}. تمثل هذه البطاقة قوة أو صفة داخلية يريدون استكشافها. استخدم بروتوكول بطاقات الموارد لتوجيه الجلسة عبر مراحل تحديد الموارد وتعميق الموارد وتطبيق الموارد. إجمالي الجلسة: 20-30 تبادلاً.`,
    hi: (cardId: string) => `ग्राहक ने संसाधन कार्ड #${cardId} का चयन किया है। यह कार्ड एक आंतरिक शक्ति या गुण का प्रतिनिधित्व करता है जिसे वे खोजना चाहते हैं। संसाधन पहचान, संसाधन गहनता, और संसाधन अनुप्रयोग चरणों के माध्यम से सत्र का मार्गदर्शन करने के लिए RESOURCE CARDS PROTOCOL का उपयोग करें। कुल सत्र: 20-30 आदान-प्रदान।`,
    zh: (cardId: string) => `客户选择了资源卡片 #${cardId}。此卡片代表他们想要探索的内在力量或品质。使用资源卡片协议指导会话通过资源识别、资源深化和资源应用阶段。总会话：20-30 次交流。`,
    ja: (cardId: string) => `クライアントはリソースカード #${cardId} を選択しました。このカードは彼らが探索したい内なる強さや特質を表します。RESOURCE CARDS PROTOCOL を使用して、リソース識別、リソース深化、リソース適用の段階を通じてセッションを導いてください。合計セッション：20-30 回の交換。`,
    ko: (cardId: string) => `클라이언트가 자원 카드 #${cardId}를 선택했습니다. 이 카드는 탐구하고자 하는 내적 강점이나 특성을 나타냅니다. RESOURCE CARDS PROTOCOL을 사용하여 자원 식별, 자원 심화, 자원 적용 단계를 통해 세션을 안내하세요. 총 세션: 20-30회 교환.`,
    uk: (cardId: string) => `Клієнт вибрав Ресурсну картку #${cardId}. Ця картка представляє внутрішню силу або якість, яку вони хочуть дослідити. Використовуйте ПРОТОКОЛ РЕСУРСНИХ КАРТОК для проведення сесії через фази Ідентифікації Ресурсу, Поглиблення Ресурсу та Застосування Ресурсу. Всього сесія: 20-30 обмінів.`,
    pl: (cardId: string) => `Klient wybrał Kartę Zasobów #${cardId}. Ta karta reprezentuje wewnętrzną siłę lub cechę, którą chcą zbadać. Użyj PROTOKOŁU KART ZASOBÓW, aby poprowadzić sesję przez fazy Identyfikacji Zasobów, Pogłębienia Zasobów i Zastosowania Zasobów. Całkowita sesja: 20-30 wymian.`,
  },
  positive_negative: {
    en: (positiveCardId: string, negativeCardId: string) => `The client has selected two cards for dialectical work:\n🟢 Positive Card #${positiveCardId} (represents positive feelings/experiences)\n🔴 Negative Card #${negativeCardId} (represents difficult emotions/challenges)\n\nUse the POSITIVE/NEGATIVE CARD PROTOCOL to guide the session through Parallel Exploration, Relational Dynamics, and Dialectical Integration phases. Honor both polarities and help integrate them. Total session: 20-30 exchanges.`,
    ka: (positiveCardId: string, negativeCardId: string) => `კლიენტმა დიალექტიკური მუშაობისთვის აირჩია ორი ბარათი:\n🟢 პოზიტიური ბარათი #${positiveCardId} (წარმოადგენს პოზიტიურ გრძნობებს/გამოცდილებას)\n🔴 ნეგატიური ბარათი #${negativeCardId} (წარმოადგენს რთულ ემოციებს/გამოწვევებს)\n\nგამოიყენეთ POSITIVE/NEGATIVE CARD PROTOCOL სესიის წარმართვისთვის პარალელური ექსპლორაციის, რელაციური დინამიკისა და დიალექტიკური ინტეგრაციის ფაზებში. პატივი სცეთ ორივე პოლარობას და დაეხმარეთ მათ ინტეგრაციაში. სულ სესია: 20-30 გაცვლა.`,
    ru: (positiveCardId: string, negativeCardId: string) => `Клиент выбрал две карты для диалектической работы:\n🟢 Позитивная карта #${positiveCardId} (представляет позитивные чувства/опыт)\n🔴 Негативная карта #${negativeCardId} (представляет сложные эмоции/вызовы)\n\nИспользуйте ПРОТОКОЛ ПОЗИТИВНЫХ/НЕГАТИВНЫХ КАРТ для проведения сессии через фазы Параллельного Исследования, Реляционной Динамики и Диалектической Интеграции. Уважайте обе полярности и помогите их интегрировать. Всего сессия: 20-30 обменов.`,
    hy: (positiveCardId: string, negativeCardId: string) => `Հաճախորդը ընտրել է երկու քարտ դիալեկտիկական աշխատանքի համար:\n🟢 Դրական Քարտ #${positiveCardId} (ներկայացնում է դրական զգացումներ/փորձ)\n🔴 Բացասական Քարտ #${negativeCardId} (ներկայացնում է բարդ զգացմունքներ/մարտահրավերներ)\n\nՕգտագործեք POSITIVE/NEGATIVE CARD PROTOCOL՝ սեանսը ղեկավարելու Զուգահեռ Հետազոտության, Հարաբերական Դինամիկայի և Դիալեկտիկական Ինտեգրման փուլերով։ Հարգեք երկու բևեռականությունները և օգնեք դրանք ինտեգրել։ Ընդհանուր սեանս՝ 20-30 փոխանակում։`,
    tr: (positiveCardId: string, negativeCardId: string) => `Danışan diyalektik çalışma için iki kart seçti:\n🟢 Pozitif Kart #${positiveCardId} (olumlu duyguları/deneyimleri temsil eder)\n🔴 Negatif Kart #${negativeCardId} (zorlu duyguları/zorlukları temsil eder)\n\nSeansı Paralel Keşif, İlişkisel Dinamikler ve Diyalektik Entegrasyon aşamalarından geçirmek için POZİTİF/NEGATİF KART PROTOKOLÜ kullanın. Her iki kutupluluğu da onurlandırın ve entegre olmalarına yardımcı olun. Toplam seans: 20-30 değişim.`,
    az: (positiveCardId: string, negativeCardId: string) => `Müştəri dialektik iş üçün iki kart seçdi:\n🟢 Müsbət Kart #${positiveCardId} (müsbət hissləri/təcrübələri təmsil edir)\n🔴 Mənfi Kart #${negativeCardId} (çətin emosiyaları/çətinlikləri təmsil edir)\n\nSeansı Paralel Tədqiqat, Əlaqəli Dinamika və Dialektik İnteqrasiya mərhələləri ilə keçirmək üçün POZİTİV/NEQATİV KART PROTOKOLU istifadə edin. Hər iki qütbü hörmət edin və onların inteqrasiyasına kömək edin. Ümumi seans: 20-30 mübadilə.`,
    es: (positiveCardId: string, negativeCardId: string) => `El cliente ha seleccionado dos cartas para trabajo dialéctico:\n🟢 Carta Positiva #${positiveCardId} (representa sentimientos/experiencias positivos)\n🔴 Carta Negativa #${negativeCardId} (representa emociones difíciles/desafíos)\n\nUse el PROTOCOLO DE CARTAS POSITIVAS/NEGATIVAS para guiar la sesión a través de las fases de Exploración Paralela, Dinámica Relacional e Integración Dialéctica. Honre ambas polaridades y ayude a integrarlas. Sesión total: 20-30 intercambios.`,
    de: (positiveCardId: string, negativeCardId: string) => `Der Klient hat zwei Karten für dialektische Arbeit ausgewählt:\n🟢 Positive Karte #${positiveCardId} (repräsentiert positive Gefühle/Erfahrungen)\n🔴 Negative Karte #${negativeCardId} (repräsentiert schwierige Emotionen/Herausforderungen)\n\nVerwenden Sie das POSITIVE/NEGATIVE KARTEN PROTOKOLL, um die Sitzung durch die Phasen Parallele Erforschung, Beziehungsdynamik und Dialektische Integration zu führen. Ehren Sie beide Polaritäten und helfen Sie, sie zu integrieren. Gesamtsitzung: 20-30 Austausche.`,
    fr: (positiveCardId: string, negativeCardId: string) => `Le client a sélectionné deux cartes pour un travail dialectique :\n🟢 Carte Positive #${positiveCardId} (représente des sentiments/expériences positifs)\n🔴 Carte Négative #${negativeCardId} (représente des émotions difficiles/défis)\n\nUtilisez le PROTOCOLE DES CARTES POSITIVES/NÉGATIVES pour guider la séance à travers les phases d'Exploration Parallèle, de Dynamique Relationnelle et d'Intégration Dialectique. Honorez les deux polarités et aidez à les intégrer. Séance totale : 20-30 échanges.`,
    pt: (positiveCardId: string, negativeCardId: string) => `O cliente selecionou dois cartões para trabalho dialético:\n🟢 Cartão Positivo #${positiveCardId} (representa sentimentos/experiências positivos)\n🔴 Cartão Negativo #${negativeCardId} (representa emoções difíceis/desafios)\n\nUse o PROTOCOLO DE CARTÕES POSITIVOS/NEGATIVOS para guiar a sessão através das fases de Exploração Paralela, Dinâmica Relacional e Integração Dialética. Honre ambas as polaridades e ajude a integrá-las. Sessão total: 20-30 trocas.`,
    id: (positiveCardId: string, negativeCardId: string) => `Klien telah memilih dua kartu untuk pekerjaan dialektis:\n🟢 Kartu Positif #${positiveCardId} (mewakili perasaan/pengalaman positif)\n🔴 Kartu Negatif #${negativeCardId} (mewakili emosi yang sulit/tantangan)\n\nGunakan POSITIVE/NEGATIVE CARD PROTOCOL untuk memandu sesi melalui fase Eksplorasi Paralel, Dinamika Relasional, dan Integrasi Dialektis. Hormati kedua polaritas dan bantu mengintegrasikannya. Total sesi: 20-30 pertukaran.`,
    it: (positiveCardId: string, negativeCardId: string) => `Il cliente ha selezionato due carte per il lavoro dialettico:\n🟢 Carta Positiva #${positiveCardId} (rappresenta sentimenti/esperienze positive)\n🔴 Carta Negativa #${negativeCardId} (rappresenta emozioni difficili/sfide)\n\nUsa il PROTOCOLLO DELLE CARTE POSITIVE/NEGATIVE per guidare la sessione attraverso le fasi di Esplorazione Parallela, Dinamiche Relazionali e Integrazione Dialettica. Onora entrambe le polarità e aiuta a integrarle. Sessione totale: 20-30 scambi.`,
    ar: (positiveCardId: string, negativeCardId: string) => `اختار العميل بطاقتين للعمل الجدلي:\n🟢 البطاقة الإيجابية #${positiveCardId} (تمثل المشاعر/التجارب الإيجابية)\n🔴 البطاقة السلبية #${negativeCardId} (تمثل العواطف الصعبة/التحديات)\n\nاستخدم بروتوكول البطاقات الإيجابية/السلبية لتوجيه الجلسة عبر مراحل الاستكشاف المتوازي والديناميكيات العلائقية والتكامل الجدلي. احترم كلا القطبين وساعد في دمجهما. إجمالي الجلسة: 20-30 تبادلاً.`,
    hi: (positiveCardId: string, negativeCardId: string) => `ग्राहक ने द्वंद्वात्मक कार्य के लिए दो कार्ड चुने हैं:\n🟢 सकारात्मक कार्ड #${positiveCardId} (सकारात्मक भावनाओं/अनुभवों का प्रतिनिधित्व करता है)\n🔴 नकारात्मक कार्ड #${negativeCardId} (कठिन भावनाओं/चुनौतियों का प्रतिनिधित्व करता है)\n\nसमानांतर अन्वेषण, संबंधात्मक गतिशीलता और द्वंद्वात्मक एकीकरण चरणों के माध्यम से सत्र का मार्गदर्शन करने के लिए POSITIVE/NEGATIVE CARD PROTOCOL का उपयोग करें। दोनों ध्रुवीयताओं का सम्मान करें और उन्हें एकीकृत करने में मदद करें। कुल सत्र: 20-30 आदान-प्रदान।`,
    zh: (positiveCardId: string, negativeCardId: string) => `客户选择了两张卡片进行辩证工作：\n🟢 积极卡片 #${positiveCardId}（代表积极的感受/经历）\n🔴 消极卡片 #${negativeCardId}（代表困难的情绪/挑战）\n\n使用积极/消极卡片协议指导会话通过平行探索、关系动力学和辩证整合阶段。尊重两种极性并帮助整合它们。总会话：20-30 次交流。`,
    ja: (positiveCardId: string, negativeCardId: string) => `クライアントは弁証法的作業のために2枚のカードを選択しました：\n🟢 ポジティブカード #${positiveCardId}（ポジティブな感情/体験を表す）\n🔴 ネガティブカード #${negativeCardId}（困難な感情/課題を表す）\n\nPOSITIVE/NEGATIVE CARD PROTOCOL を使用して、並列探索、関係性ダイナミクス、弁証法的統合の段階を通じてセッションを導いてください。両方の極性を尊重し、それらを統合するのを助けてください。合計セッション：20-30 回の交換。`,
    ko: (positiveCardId: string, negativeCardId: string) => `클라이언트가 변증법적 작업을 위해 두 장의 카드를 선택했습니다:\n🟢 긍정 카드 #${positiveCardId} (긍정적인 감정/경험을 나타냄)\n🔴 부정 카드 #${negativeCardId} (어려운 감정/도전을 나타냄)\n\nPOSITIVE/NEGATIVE CARD PROTOCOL을 사용하여 병렬 탐색, 관계적 역학, 변증법적 통합 단계를 통해 세션을 안내하세요. 두 극성을 모두 존중하고 통합하는 데 도움을 주세요. 총 세션: 20-30회 교환.`,
    uk: (positiveCardId: string, negativeCardId: string) => `Клієнт вибрав дві картки для діалектичної роботи:\n🟢 Позитивна картка #${positiveCardId} (представляє позитивні почуття/досвід)\n🔴 Негативна картка #${negativeCardId} (представляє складні емоції/виклики)\n\nВикористовуйте ПРОТОКОЛ ПОЗИТИВНИХ/НЕГАТИВНИХ КАРТОК для проведення сесії через фази Паралельного Дослідження, Реляційної Динаміки та Діалектичної Інтеграції. Поважайте обидві полярності та допоможіть їх інтегрувати. Всього сесія: 20-30 обмінів.`,
    pl: (positiveCardId: string, negativeCardId: string) => `Klient wybrał dwie karty do pracy dialektycznej:\n🟢 Karta Pozytywna #${positiveCardId} (reprezentuje pozytywne uczucia/doświadczenia)\n🔴 Karta Negatywna #${negativeCardId} (reprezentuje trudne emocje/wyzwania)\n\nUżyj PROTOKOŁU KART POZYTYWNYCH/NEGATYWNYCH, aby poprowadzić sesję przez fazy Równoległej Eksploracji, Dynamiki Relacyjnej i Dialektycznej Integracji. Uhonoruj obie polaryzacje i pomóż je zintegrować. Całkowita sesja: 20-30 wymian.`,
  },
  narrative: {
    en: (cardId: string) => `The client has selected Narrative Card #${cardId}. This card connects to their life story or inner child. Use the NARRATIVE CARDS PROTOCOL to guide the session through Story Elicitation, Deconstruction & Exceptions, and Re-Authoring & Claiming Voice phases. Total session: 20-30 exchanges.`,
    ka: (cardId: string) => `კლიენტმა აირჩია ნარატივის ბარათი #${cardId}. ეს ბარათი უკავშირდება მათ ცხოვრების ისტორიას ან შინაგან ბავშვს. გამოიყენეთ NARRATIVE CARDS PROTOCOL სესიის წარმართვისთვის ამბის გამოყვანის, დეკონსტრუქციისა და გამონაკლისების, და ხელახალი ავტორობისა და ხმის მოთხოვნის ფაზებში. სულ სესია: 20-30 გაცვლა.`,
    ru: (cardId: string) => `Клиент выбрал Нарративную карту #${cardId}. Эта карта связана с их жизненной историей или внутренним ребенком. Используйте ПРОТОКОЛ НАРРАТИВНЫХ КАРТ для проведения сессии через фазы Извлечения Истории, Деконструкции и Исключений, и Переписывания и Обретения Голоса. Всего сессия: 20-30 обменов.`,
    hy: (cardId: string) => `Հաճախորդը ընտրել է Պատմողական Քարտ #${cardId}։ Այս քարտը կապված է նրանց կյանքի պատմության կամ ներքին երեխայի հետ։ Օգտագործեք NARRATIVE CARDS PROTOCOL՝ սեանսը ղեկավարելու Պատմության Հանդես Բերման, Դեկոնստրուկցիայի և Բացառությունների, և Վերագրման և Ձայնի Պահանջման փուլերով։ Ընդհանուր սեանս՝ 20-30 փոխանակում։`,
    tr: (cardId: string) => `Danışan Anlatı Kartı #${cardId}'i seçti. Bu kart yaşam öykülerine veya iç çocuklarına bağlanır. Seansı Hikaye Ortaya Çıkarma, Yapı Bozumu ve İstisnalar, ve Yeniden Yazma ve Ses Kazanma aşamalarından geçirmek için NARRATIVE CARDS PROTOCOL kullanın. Toplam seans: 20-30 değişim.`,
    az: (cardId: string) => `Müştəri Povest Kartı #${cardId}-ni seçdi. Bu kart onların həyat hekayəsi və ya daxili uşaqla əlaqəlidir. Seansı Hekayənin Çıxarılması, Dekonstruksiya və İstisnalar, və Yenidən Müəlliflik və Səsin Əldə Edilməsi mərhələləri ilə keçirmək üçün NARRATIVE CARDS PROTOCOL istifadə edin. Ümumi seans: 20-30 mübadilə.`,
    es: (cardId: string) => `El cliente ha seleccionado la Carta Narrativa #${cardId}. Esta carta se conecta con su historia de vida o niño interior. Use el PROTOCOLO DE CARTAS NARRATIVAS para guiar la sesión a través de las fases de Elicitación de Historia, Deconstrucción y Excepciones, y Re-Autoría y Reclamación de Voz. Sesión total: 20-30 intercambios.`,
    de: (cardId: string) => `Der Klient hat Erzählkarte #${cardId} ausgewählt. Diese Karte verbindet sich mit ihrer Lebensgeschichte oder ihrem inneren Kind. Verwenden Sie das NARRATIVE CARDS PROTOCOL, um die Sitzung durch die Phasen Geschichtenermittlung, Dekonstruktion und Ausnahmen, und Neuautorschaft und Stimmergreifung zu führen. Gesamtsitzung: 20-30 Austausche.`,
    fr: (cardId: string) => `Le client a sélectionné la Carte Narrative #${cardId}. Cette carte se connecte à leur histoire de vie ou enfant intérieur. Utilisez le PROTOCOLE DES CARTES NARRATIVES pour guider la séance à travers les phases d'Élicitation de l'Histoire, de Déconstruction et d'Exceptions, et de Ré-Auteur et de Revendication de Voix. Séance totale : 20-30 échanges.`,
    pt: (cardId: string) => `O cliente selecionou o Cartão Narrativo #${cardId}. Este cartão conecta-se à sua história de vida ou criança interior. Use o PROTOCOLO DE CARTÕES NARRATIVOS para guiar a sessão através das fases de Eliciação de História, Desconstrução e Exceções, e Re-Autoria e Reivindicação de Voz. Sessão total: 20-30 trocas.`,
    id: (cardId: string) => `Klien telah memilih Kartu Naratif #${cardId}. Kartu ini terhubung dengan kisah hidup mereka atau anak batin. Gunakan NARRATIVE CARDS PROTOCOL untuk memandu sesi melalui fase Elisitasi Cerita, Dekonstruksi & Pengecualian, dan Re-Authoring & Claiming Voice. Total sesi: 20-30 pertukaran.`,
    it: (cardId: string) => `Il cliente ha selezionato la Carta Narrativa #${cardId}. Questa carta si connette alla loro storia di vita o bambino interiore. Usa il PROTOCOLLO DELLE CARTE NARRATIVE per guidare la sessione attraverso le fasi di Elicitazione della Storia, Decostruzione ed Eccezioni, e Ri-Autorialità e Rivendicazione della Voce. Sessione totale: 20-30 scambi.`,
    ar: (cardId: string) => `اختار العميل بطاقة السرد #${cardId}. ترتبط هذه البطاقة بقصة حياتهم أو طفلهم الداخلي. استخدم بروتوكول بطاقات السرد لتوجيه الجلسة عبر مراحل استخراج القصة والتفكيك والاستثناءات وإعادة التأليف والمطالبة بالصوت. إجمالي الجلسة: 20-30 تبادلاً.`,
    hi: (cardId: string) => `ग्राहक ने कथा कार्ड #${cardId} का चयन किया है। यह कार्ड उनकी जीवन कहानी या आंतरिक बच्चे से जुड़ता है। कहानी निकालने, विखंडन और अपवाद, और पुनः-लेखन और आवाज का दावा चरणों के माध्यम से सत्र का मार्गदर्शन करने के लिए NARRATIVE CARDS PROTOCOL का उपयोग करें। कुल सत्र: 20-30 आदान-प्रदान।`,
    zh: (cardId: string) => `客户选择了叙事卡片 #${cardId}。此卡片与他们的生活故事或内在儿童相连。使用叙事卡片协议指导会话通过故事引出、解构和例外、重新创作和声称声音阶段。总会话：20-30 次交流。`,
    ja: (cardId: string) => `クライアントはナラティブカード #${cardId} を選択しました。このカードは彼らの人生の物語や内なる子供とつながります。NARRATIVE CARDS PROTOCOL を使用して、ストーリー引き出し、脱構築と例外、再著述と声の主張の段階を通じてセッションを導いてください。合計セッション：20-30 回の交換。`,
    ko: (cardId: string) => `클라이언트가 서사 카드 #${cardId}를 선택했습니다. 이 카드는 그들의 인생 이야기나 내면 아이와 연결됩니다. NARRATIVE CARDS PROTOCOL을 사용하여 이야기 이끌어내기, 해체 및 예외, 재저작 및 목소리 주장 단계를 통해 세션을 안내하세요. 총 세션: 20-30회 교환.`,
    uk: (cardId: string) => `Клієнт вибрав Наративну картку #${cardId}. Ця картка пов'язана з їхньою історією життя або внутрішньою дитиною. Використовуйте ПРОТОКОЛ НАРАТИВНИХ КАРТОК для проведення сесії через фази Витягування Історії, Деконструкції та Винятків, та Переписування і Отримання Голосу. Всього сесія: 20-30 обмінів.`,
    pl: (cardId: string) => `Klient wybrał Kartę Narracyjną #${cardId}. Ta karta łączy się z ich historią życia lub wewnętrznym dzieckiem. Użyj PROTOKOŁU KART NARRACYJNYCH, aby poprowadzić sesję przez fazy Wywołania Historii, Dekonstrukcji i Wyjątków oraz Ponownego Autorstwa i Roszczenia Głosu. Całkowita sesja: 20-30 wymian.`,
  },
}

class CardTherapyService {
  private apiKey: string;
  private promptId: string = 'pmpt_690f8a73181481968bdf18821d56058203765a60aea147e6'; // Replace with your actual prompt ID
  private version: string = '4';

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_KEY
      || process.env.EXPO_PUBLIC_API_KEY
      || '';

    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not found');
    }
  }

  /**
   * Start a new therapeutic card session
   */
  async startSession(
    cardContext: CardContext,
    cardImageBase64?: string | null,
    positiveImageBase64?: string | null,
    negativeImageBase64?: string | null
  ): Promise<string> {
    try {
      const contextMessage = await this.buildContextMessage(cardContext);

      // Build content array with text and optional images
      const content: any[] = [
        {
          type: 'input_text',
          text: contextMessage,
        },
      ];

      // Add card image if available (data URI format: data:image/jpeg;base64,...)
      if (cardImageBase64) {
        console.log('🎴 Attempting to add card image to request, length:', cardImageBase64.length);
        try {
          content.push({
            type: 'input_image',
            image_url: cardImageBase64, // Data URI format expected
          });
          console.log('✅ Card image added to content (data URI format)');
        } catch (e) {
          console.warn('⚠️ Failed to add card image:', e);
        }
      } else {
        console.log('⚠️ No card image provided (cardImageBase64 is null/undefined)');
      }

      // Add positive/negative images if available
      if (positiveImageBase64) {
        console.log('🟢 Adding positive image to request');
        content.push({
          type: 'input_image',
          image_url: positiveImageBase64, // Data URI format
        });
      }

      if (negativeImageBase64) {
        console.log('🔴 Adding negative image to request');
        content.push({
          type: 'input_image',
          image_url: negativeImageBase64, // Data URI format
        });
      }

      console.log('📤 Sending request with content items:', content.length);
      console.log('Content types:', content.map(c => c.type).join(', '));

      const requestBody = {
        prompt: {
          id: this.promptId,
          version: this.version,
        },
        input: [
          {
            role: 'user',
            content: content,
          },
        ],
        max_output_tokens: 1500,
        store: true,
      };

      console.log('📋 Full request preview:', JSON.stringify(requestBody, null, 2).substring(0, 500) + '...');
      
      // IMPORTANT: OpenAI Responses API may not support image inputs yet
      // If you get "Unsupported content type" error, images need to be removed
      // Alternative: Use Chat Completions API with vision model (gpt-4o-mini)

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ API Error Response:', error);
        throw new Error(`Failed to start session: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('✅ Received response from API');
      
      // Extract text from Responses API format
      const assistantMessage = data.output?.[0];
      if (assistantMessage?.content?.[0]?.type === 'output_text') {
        const responseText = assistantMessage.content[0].text;
        console.log('💬 AI Response preview:', responseText.substring(0, 100) + '...');
        return responseText;
      }
      return data.response || 'Session started. How are you feeling?';
    } catch (error) {
      console.error('❌ Error starting card therapy session:', error);
      throw error;
    }
  }

  /**
   * Send a message in an ongoing session
   */
  async sendMessage(
    messages: ChatMessage[],
    cardContext: CardContext,
    onStream?: (delta: string) => void
  ): Promise<string> {
    try {
      // Add card context as system message if not already present
      const hasContext = messages.some(m => m.role === 'system');
      const messagesWithContext = hasContext
        ? messages
        : [
            { role: 'system' as const, content: await this.buildContextMessage(cardContext) },
            ...messages,
          ];

      if (onStream) {
        // Streaming mode
        return await this.sendMessageStream(messagesWithContext, onStream);
      } else {
        // Non-streaming mode
        const input = this.convertMessagesToInput(messagesWithContext);
        
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            prompt: {
              id: this.promptId,
              version: this.version,
            },
            input: input,
            max_output_tokens: 1500,
            store: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send message: ${response.status} ${error}`);
        }

        const data = await response.json();
        // Extract text from Responses API format
        const assistantMessage = data.output?.[0];
        if (assistantMessage?.content?.[0]?.type === 'output_text') {
          return assistantMessage.content[0].text;
        }
        return data.response || '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send message with streaming support
   */
  private async sendMessageStream(
    messages: ChatMessage[],
    onStream: (delta: string) => void
  ): Promise<string> {
    try {
      const input = this.convertMessagesToInput(messages);
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: {
            id: this.promptId,
            version: this.version,
          },
          input: input,
          max_output_tokens: 1500,
          stream: true,
          store: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to stream message: ${response.status} ${error}`);
      }

      // Check if streaming is available
      if (!response.body) {
        console.warn('Streaming not available, falling back to non-streaming');
        const data = await response.json();
        const assistantMessage = data.output?.[0];
        const fullText = assistantMessage?.content?.[0]?.text || '';
        onStream(fullText);
        return fullText;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              // Responses API streaming format: { output: [{ content: [{ type, text }] }] }
              const delta = parsed.output?.[0]?.content?.[0]?.text || parsed.delta || '';
              if (delta) {
                fullText += delta;
                onStream(delta);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      return fullText;
    } catch (error) {
      console.error('Error in streaming:', error);
      throw error;
    }
  }

  /**
   * Request session summary (to be called after 20-30 exchanges)
   */
  async requestSummary(messages: ChatMessage[], cardContext: CardContext): Promise<string> {
    try {
      const summaryRequest: ChatMessage = {
        role: 'user',
        content: 'We\'ve covered a lot of meaningful ground. I\'m ready for the session summary now. Please provide the comprehensive therapeutic summary.',
      };

      // Add context as first user message, then conversation, then summary request
      const allMessages = [
        { role: 'system' as const, content: await this.buildContextMessage(cardContext) },
        ...messages,
        summaryRequest,
      ];
      
      const input = this.convertMessagesToInput(allMessages);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: {
            id: this.promptId,
            version: this.version,
          },
          input: input,
          max_output_tokens: 3000, // Higher limit for summary
          store: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate summary: ${response.status} ${error}`);
      }

      const data = await response.json();
      // Extract text from Responses API format
      const assistantMessage = data.output?.[0];
      if (assistantMessage?.content?.[0]?.type === 'output_text') {
        return assistantMessage.content[0].text;
      }
      return data.response || '';
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Convert ChatMessage[] to Responses API input format
   */
  private convertMessagesToInput(messages: ChatMessage[]): any[] {
    const input: any[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === 'user') {
        input.push({
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: msg.content,
            },
          ],
        });
      } else if (msg.role === 'assistant') {
        // For assistant messages in input (conversation history)
        input.push({
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: msg.content,
            },
          ],
        });
      }
      // Skip 'system' role as it's already in the prompt
    }
    
    return input;
  }

  /**
   * Build context message based on card type (multilingual)
   */
  private async buildContextMessage(cardContext: CardContext): Promise<string> {
    const { cardType, cardId, positiveCardId, negativeCardId, language = 'en' } = cardContext;

    let base: string;
    switch (cardType) {
      case 'emotion':
        base = CONTEXT_MESSAGES.emotion[language]?.(cardId) || CONTEXT_MESSAGES.emotion.en(cardId);
        break;

      case 'resource':
        base = CONTEXT_MESSAGES.resource[language]?.(cardId) || CONTEXT_MESSAGES.resource.en(cardId);
        break;

      case 'positive_negative':
        base = CONTEXT_MESSAGES.positive_negative[language]?.(positiveCardId || '', negativeCardId || '') ||
               CONTEXT_MESSAGES.positive_negative.en(positiveCardId || '', negativeCardId || '');
        break;

      case 'narrative':
        base = CONTEXT_MESSAGES.narrative[language]?.(cardId) || CONTEXT_MESSAGES.narrative.en(cardId);
        break;

      default:
        const defaultMessages = {
          en: `The client has selected Card #${cardId} for therapeutic exploration. Guide them through a meaningful 20-30 exchange session, ending with a comprehensive summary.`,
          ka: `კლიენტმა აირჩია ბარათი #${cardId} თერაპიული ექსპლორაციისთვის. წარმართეთ ისინი მნიშვნელოვან 20-30 გაცვლის სესიაში, რომელიც დასრულდება ყოვლისმომცველი შეჯამებით.`,
          ru: `Клиент выбрал карту #${cardId} для терапевтического исследования. Проведите их через значимую сессию из 20-30 обменов, заканчивающуюся комплексным резюме.`,
        };
        base = defaultMessages[language as keyof typeof defaultMessages] || defaultMessages.en;
    }

    const profileBlock = buildProfileContextBlock(await getUserProfile());
    return profileBlock ? `${profileBlock}\n\n${base}` : base;
  }

  /**
   * Detect if AI is ready to close the session (look for summary indicators)
   */
  isSummaryMessage(message: string): boolean {
    const summaryIndicators = [
      '🎴 THERAPEUTIC CARD SESSION SUMMARY',
      'SESSION SUMMARY',
      '📋 SESSION DETAILS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    return summaryIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Count exchanges in session (user + assistant pairs)
   */
  countExchanges(messages: ChatMessage[]): number {
    return messages.filter(m => m.role === 'user').length;
  }

  /**
   * Check if session is ready for closing (20-30 exchanges)
   */
  isSessionReadyForClosure(messages: ChatMessage[]): boolean {
    const exchanges = this.countExchanges(messages);
    return exchanges >= 20;
  }

  /**
   * Suggest summary if appropriate
   */
  shouldSuggestSummary(messages: ChatMessage[]): boolean {
    const exchanges = this.countExchanges(messages);
    return exchanges >= 25; // Suggest at 25+ exchanges
  }
}

export default new CardTherapyService();
export { CardContext, ChatMessage };

