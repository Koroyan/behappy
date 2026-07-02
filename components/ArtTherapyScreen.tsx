import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ArtTherapyProgramManager, { ArtTherapySession } from '../services/artTherapyProgramNew';
import ArtTherapyCompletedList from './ArtTherapyCompletedList';

const { width } = Dimensions.get('window');

interface SessionCardProps {
  session: ArtTherapySession;
  isUnlocked: boolean;
  isCompleted: boolean;
  onPress: () => void;
  language: string;
  theme: any;
  isDark: boolean;
}

const T = {
  title: { en: 'Art Therapy', ka: 'ხელოვნების თერაპია', ru: 'Арт-терапия', hy: 'Արվեստաբուժություն', tr: 'Sanat Terapisi', az: 'İncəsənət Terapiyası', es: 'Arteterapia', de: 'Kunsttherapie', fr: 'Art‑thérapie', pt: 'Arteterapia', id: 'Terapi Seni', it: 'Arteterapia', ar: 'العلاج بالفن', hi: 'आर्ट थेरेपी', zh: '艺术治疗', ja: 'アートセラピー', ko: '아트 테라피', uk: 'Арт‑терапія', pl: 'Arteterapia' },
  loading: { en: 'Loading...', ka: 'იტვირთება...', ru: 'Загрузка...', hy: 'Բեռնում...', tr: 'Yükleniyor...', az: 'Yüklənir...', es: 'Cargando...', de: 'Laden...', fr: 'Chargement...', pt: 'Carregando...', id: 'Memuat...', it: 'Caricamento...', ar: 'جارٍ التحميل...', hi: 'लोड हो रहा है...', zh: '正在加载…', ja: '読み込み中...', ko: '불러오는 중…', uk: 'Завантаження…', pl: 'Ładowanie…' },
  errorLoading: { en: 'Error loading sessions', ka: 'შეცდომა დატვირთვისას', ru: 'Ошибка при загрузке сеансов', hy: 'Սեանսների բեռնման սխալ', tr: 'Oturumlar yüklenirken hata', az: 'Sessiyaların yüklənməsində səhv', es: 'Error al cargar sesiones', de: 'Fehler beim Laden der Sitzungen', fr: 'Erreur lors du chargement des séances', pt: 'Erro ao carregar sessões', id: 'Kesalahan memuat sesi', it: 'Errore nel caricamento delle sessioni', ar: 'خطأ أثناء تحميل الجلسات', hi: 'सत्र लोड करने में त्रुटि', zh: '加载会话时出错', ja: 'セッションの読み込みエラー', ko: '세션 로딩 오류', uk: 'Помилка завантаження сеансів', pl: 'Błąd podczas ładowania sesji' },
  retry: { en: 'Retry', ka: 'ხელახლა ცდა', ru: 'Повторить', hy: 'Կրկին փորձել', tr: 'Yeniden dene', az: 'Yenidən cəhd et', es: 'Reintentar', de: 'Erneut versuchen', fr: 'Réessayer', pt: 'Tentar novamente', id: 'Coba lagi', it: 'Riprova', ar: 'إعادة المحاولة', hi: 'फिर से कोशिश करें', zh: '重试', ja: '再試行', ko: '다시 시도', uk: 'Повторити', pl: 'Spróbuj ponownie' },
  percentComplete: { en: 'Complete', ka: 'დასრულებულია', ru: 'завершено', hy: 'ավարտված', tr: 'Tamamlandı', az: 'Tamamlandı', es: 'Completado', de: 'Abgeschlossen', fr: 'Terminé', pt: 'Concluído', id: 'Selesai', it: 'Completato', ar: 'مكتمل', hi: 'पूर्ण', zh: '已完成', ja: '完了', ko: '완료', uk: 'завершено', pl: 'Ukończono' },
  status: {
    completed: { en: 'Completed', ka: 'დასრულებული', ru: 'Завершено', hy: 'Ավարտված', tr: 'Tamamlandı', az: 'Tamamlandı', es: 'Completado', de: 'Abgeschlossen', fr: 'Terminé', pt: 'Concluído', id: 'Selesai', it: 'Completato', ar: 'مكتمل', hi: 'पूर्ण', zh: '已完成', ja: '完了', ko: '완료', uk: 'Завершено', pl: 'Zakończono' },
    available: { en: 'Available', ka: 'ხელმისაწვდომი', ru: 'Доступно', hy: 'Մատչելի', tr: 'Kullanılabilir', az: 'Mövcud', es: 'Disponible', de: 'Verfügbar', fr: 'Disponible', pt: 'Disponível', id: 'Tersedia', it: 'Disponibile', ar: 'متاح', hi: 'उपलब्ध', zh: '可用', ja: '利用可能', ko: '사용 가능', uk: 'Доступно', pl: 'Dostępne' },
    locked: { en: 'Locked', ka: 'ჩაკეტილი', ru: 'Заблокировано', hy: 'Փակված', tr: 'Kilitli', az: 'Kilidli', es: 'Bloqueado', de: 'Gesperrt', fr: 'Verrouillé', pt: 'Bloqueado', id: 'Terkunci', it: 'Bloccato', ar: 'مقفل', hi: 'लॉक्ड', zh: '已锁定', ja: 'ロック済み', ko: '잠김', uk: 'Заблоковано', pl: 'Zablokowany' },
  },
  action: {
    review: { en: 'Review', ka: 'ხელახლა ნახვა', ru: 'Просмотреть', hy: 'Դիտել', tr: 'Gözden geçir', az: 'Yenidən bax', es: 'Revisar', de: 'Ansehen', fr: 'Revoir', pt: 'Rever', id: 'Tinjau', it: 'Rivedi', ar: 'مراجعة', hi: 'समीक्षा', zh: '回顾', ja: '見直す', ko: '검토', uk: 'Переглянути', pl: 'Przejrzyj' },
    start: { en: 'Start', ka: 'დაწყება', ru: 'Начать', hy: 'Սկսել', tr: 'Başlat', az: 'Başla', es: 'Comenzar', de: 'Starten', fr: 'Commencer', pt: 'Começar', id: 'Mulai', it: 'Inizia', ar: 'ابدأ', hi: 'शुरू करें', zh: '开始', ja: '開始', ko: '시작', uk: 'Почати', pl: 'Start' },
    startSession: { en: 'Start Session', ka: 'სესიის დაწყება', ru: 'Начать сеанс', hy: 'Սկսել սեանսը', tr: 'Seansı Başlat', az: 'Sessiyaya Başla', es: 'Iniciar sesión', de: 'Sitzung starten', fr: 'Démarrer la séance', pt: 'Iniciar sessão', id: 'Mulai Sesi', it: 'Avvia sessione', ar: 'ابدأ الجلسة', hi: 'सत्र शुरू करें', zh: '开始会话', ja: 'セッションを開始', ko: '세션 시작', uk: 'Почати сеанс', pl: 'Rozpocznij sesję' },
    goNext: { en: 'Go to next session', ka: 'გადადი შემდეგ სესიაზე', ru: 'Перейти к следующей сессии', hy: 'Անցնել հաջորդ սեանսին', tr: 'Sonraki seansa geç', az: 'Növbəti sessiyaya keç', es: 'Ir a la siguiente sesión', de: 'Zur nächsten Sitzung', fr: 'Aller à la séance suivante', pt: 'Ir para a próxima sessão', id: 'Ke sesi berikutnya', it: 'Vai alla prossima sessione', ar: 'انتقل إلى الجلسة التالية', hi: 'अगले सत्र पर जाएँ', zh: '前往下一次会话', ja: '次のセッションへ', ko: '다음 세션으로 이동', uk: 'Перейти до наступної сесії', pl: 'Przejdź do następnej sesji' },
  },
  units: { min: { en: 'min', ka: 'წუთი', ru: 'мин', hy: 'ր', tr: 'dk', az: 'dəq', es: 'min', de: 'Min', fr: 'min', pt: 'min', id: 'mnt', it: 'min', ar: 'د', hi: 'मि', zh: '分', ja: '分', ko: '분', uk: 'хв', pl: 'min' } },
  nextLocked: {
    title: { en: 'Next session locked', ka: 'შემდეგი სესია დაბლოკილია', ru: 'Следующий сеанс заблокирован', hy: 'Հաջորդ սեանսը արգելափակված է', tr: 'Sonraki seans kilitli', az: 'Növbəti sessiya kilidlidir', es: 'Próxima sesión bloqueada', de: 'Nächste Sitzung gesperrt', fr: 'Prochaine séance verrouillée', pt: 'Próxima sessão bloqueada', id: 'Sesi berikutnya terkunci', it: 'Prossima sessione bloccata', ar: 'الجلسة التالية مقفلة', hi: 'अगला सत्र लॉक है', zh: '下一个会话已锁定', ja: '次のセッションはロックされています', ko: '다음 세션이 잠겨 있습니다', uk: 'Наступна сесія заблокована', pl: 'Następna sesja zablokowana' },
    hint: { en: 'Unlocks after you complete this session.', ka: 'გაიხსნება ამ სესიის დასრულების შემდეგ.', ru: 'Откроется после завершения текущего сеанса.', hy: 'Կբացվի այս սեանսի ավարտից հետո։', tr: 'Bu seansı tamamladıktan sonra açılır.', az: 'Bu sessiyanı bitirdikdən sonra açılacaq.', es: 'Se desbloquea después de completar esta sesión.', de: 'Wird nach Abschluss dieser Sitzung freigeschaltet.', fr: 'Se déverrouille après avoir terminé cette séance.', pt: 'Desbloqueia após você concluir esta sessão.', id: 'Terbuka setelah Anda menyelesaikan sesi ini.', it: 'Si sblocca dopo aver completato questa sessione.', ar: 'يُفتح بعد إكمال هذه الجلسة.', hi: 'यह सत्र पूरा करने के बाद अनलॉक होगा।', zh: '完成本次会话后将解锁。', ja: 'このセッションを完了するとロック解除されます。', ko: '이 세션을 완료하면 잠금이 해제됩니다.', uk: 'Відкриється після завершення цього сеансу.', pl: 'Odblokuje się po ukończeniu tej sesji.' },
  },
  completeBanner: {
    congrats: { en: '🎉 Congratulations! 🎉', ka: '🎉 გილოცავთ! 🎉', ru: '🎉 Поздравляем! 🎉', hy: '🎉 Շնորհավորում ենք! 🎉', tr: '🎉 Tebrikler! 🎉', az: '🎉 Təbriklər! 🎉', es: '🎉 ¡Felicidades! 🎉', de: '🎉 Glückwunsch! 🎉', fr: '🎉 Félicitations ! 🎉', pt: '🎉 Parabéns! 🎉', id: '🎉 Selamat! 🎉', it: '🎉 Congratulazioni! 🎉', ar: '🎉 مبروك! 🎉', hi: '🎉 बधाई! 🎉', zh: '🎉 恭喜！🎉', ja: '🎉 おめでとう！🎉', ko: '🎉 축하합니다! 🎉', uk: '🎉 Вітаємо! 🎉', pl: '🎉 Gratulacje! 🎉' },
    allDone: { en: 'You have completed all therapy sessions!', ka: 'ყველა სეანსი წარმატებით დაასრულეთ!', ru: 'Вы завершили все сеансы арт‑терапии!', hy: 'Դուք ավարտել եք բոլոր սեանսները։', tr: 'Tüm terapi seanslarını tamamladınız!', az: 'Bütün terapi seanslarını tamamladınız!', es: '¡Has completado todas las sesiones de terapia!', de: 'Sie haben alle Therapiesitzungen abgeschlossen!', fr: 'Vous avez terminé toutes les séances de thérapie !', pt: 'Você concluiu todas as sessões de terapia!', id: 'Anda telah menyelesaikan semua sesi terapi!', it: 'Hai completato tutte le sessioni di terapia!', ar: 'لقد أكملت جميع جلسات العلاج!', hi: 'आपने सभी थेरेपी सत्र पूरे कर लिए हैं!', zh: '你已完成所有治疗课程！', ja: 'すべてのセラピーセッションを完了しました！', ko: '모든 치료 세션을 완료했습니다!', uk: 'Ви завершили всі сеанси терапії!', pl: 'Ukończyłeś wszystkie sesje terapii!' },
    continue: { en: 'Continue Journey', ka: 'გაგრძელება', ru: 'Продолжить путь', hy: 'Շարունակել ճանապարհը', tr: 'Yolculuğa devam et', az: 'Səyahəti davam et', es: 'Continuar el camino', de: 'Reise fortsetzen', fr: 'Poursuivre le parcours', pt: 'Continuar a jornada', id: 'Lanjutkan perjalanan', it: 'Continua il percorso', ar: 'واصل الرحلة', hi: 'यात्रा जारी रखें', zh: '继续前行', ja: '旅を続ける', ko: '여정을 계속하기', uk: 'Продовжити шлях', pl: 'Kontynuuj podróż' },
  },
  marketing: {
    title: { en: 'A 43-session Art Therapy course', ka: 'ხელოვნების თერაპიის 43-სესიანი კურსი', ru: '43-сеансовый курс арт-терапии', hy: '43 սեանսանոց արվեստաբուժության դասընթաց', tr: '43 seanslı Sanat Terapisi kursu', az: '43 sessiyal İncəsənət Terapiyası kursu', es: 'Un curso de arteterapia en 43 sesiones', de: 'Ein 43-stufiger Kunsttherapie-Kurs', fr: 'Un parcours d\'art-thérapie en 43 séances', pt: 'Um curso de arteterapia em 43 sessões', id: 'Kursus Terapi Seni 43 sesi', it: 'Un corso di arteterapia in 43 sessioni', ar: 'دورة علاج بالفن من 43 جلسة', hi: '43 सत्रों का आर्ट थेरेपी कोर्स', zh: '43 阶段艺术治疗课程', ja: '43 セッションのアートセラピー講座', ko: '43세션 아트 테라피 코스', uk: '43-сеансовий курс арт-терапії', pl: '43-sesyjny kurs arteterapii' },
    p1: {
      en: 'A structured, safe, session-based path for self-discovery and emotion regulation. In each session you draw, reflect, and receive warm, professional guidance.',
      ka: 'სტრუქტურირებული, უსაფრთხო და პრაქტიკული სესია-ბაზირებული გზა თვითშემეცნებისა და ემოციური რეგულაციისთვის. ყოველ სესიაში ხარატავ, ფიქრობ და იღებ თბილ, პროფესიულ მხარდაჭერას.',
      ru: 'Структурированный, безопасный и практический путь на основе сеансов для самопознания и эмоциональной регуляции. В каждом сеансе вы рисуете, размышляете и получаете тёплую профессиональную поддержку.',
      hy: 'Կառուցվածքային և անվտանգ սեանսների շարան՝ ինքնաճանաչման և էմոցիաների կարգավորման համար։ Յուրաքանչյուր սեանսում դուք նկարում եք, մտորում և ստանում ջերմ, մասնագիտական ուղեցույց։',
      tr: 'Öz keşfi ve duygu düzenlemesi için yapılandırılmış, güvenli, seans tabanlı bir yol. Her seansta çizim yapar, düşünür ve sıcak, profesyonel rehberlik alırsınız.',
      az: 'Özünü kəşf və emosiyaların tənzimi üçün strukturlaşdırılmış, təhlükəsiz, sessiya əsaslı yol. Hər sessiyada çəkir, düşünür və isti, peşəkar dəstək alırsınız.',
      es: 'Un camino estructurado y seguro, basado en sesiones, para el autodescubrimiento y la regulación emocional. En cada sesión dibujas, reflexionas y recibes una guía profesional y cálida.',
      de: 'Ein strukturierter, sicherer, sitzungsbasierter Weg zur Selbsterkenntnis und Emotionsregulation. In jeder Sitzung zeichnen Sie, reflektieren und erhalten warmherzige, professionelle Begleitung.',
      fr: 'Un parcours structuré et sécurisé, basé sur des séances, pour l’auto‑découverte et la régulation des émotions. À chaque séance, vous dessinez, réfléchissez et recevez un accompagnement professionnel chaleureux.',
      pt: 'Um caminho estruturado e seguro, baseado em sessões, para autoconhecimento e regulação emocional. Em cada sessão você desenha, reflete e recebe orientação profissional acolhedora.',
      id: 'Jalur terstruktur dan aman berbasis sesi untuk penemuan diri dan regulasi emosi. Di setiap sesi Anda menggambar, merefleksikan, dan menerima bimbingan profesional yang hangat.',
      it: 'Un percorso strutturato e sicuro, basato su sessioni, per l’autoscoperta e la regolazione emotiva. In ogni sessione disegni, rifletti e ricevi una guida professionale accogliente.',
      ar: 'مسار منظم وآمن قائم على الجلسات لاكتشاف الذات وتنظيم المشاعر. في كل جلسة ترسم، تتأمل، وتتلقى إرشادًا مهنيًا دافئًا.',
      hi: 'स्व-खोज और भावनात्मक विनियमन के लिए संरचित, सुरक्षित, सत्र-आधारित मार्ग। हर सत्र में आप चित्र बनाते हैं, चिंतन करते हैं, और गर्मजोशी भरा, पेशेवर मार्गदर्शन प्राप्त करते हैं।',
      zh: '一种结构化且安全的分阶段路径，帮助自我探索与情绪调节。在每次会话中，你会绘画、反思，并获得温暖且专业的引导。',
      ja: '自己探求と感情の調整のための、構造化された安全なセッション型の道筋です。各セッションで描き、振り返り、温かい専門的なガイダンスを受け取ります。',
      ko: '자기 발견과 감정 조절을 위한 구조적이고 안전한 세션 기반 여정입니다. 각 세션에서 그림을 그리고 성찰하며 따뜻한 전문적 안내를 받습니다.',
      uk: 'Структурований, безпечний, сеансний шлях для самопізнання та емоційної регуляції. У кожному сеансі ви малюєте, розмірковуєте та отримуєте теплу професійну підтримку.',
      pl: 'Ustrukturyzowana, bezpieczna ścieżka oparta na sesjach do samopoznania i regulacji emocji. W każdej sesji rysujesz, reflektujesz i otrzymujesz ciepłe, profesjonalne wskazówki.'
    },
    p2: {
      en: 'No art skills required. Move at your own pace, your results stay private, and you can revisit anytime.',
      ka: 'მხატვრობის ცოდნა არ არის საჭირო. იმუშავე შენს ტემპში, შედეგები პირადია და შეგიძლია ნებისმიერ დროს გადაახედო.',
      ru: 'Навыки рисования не нужны. Двигайтесь в своём темпе, результаты остаются конфиденциальными, и вы можете возвращаться к ним в любое время.',
      hy: 'Արվեստի հմտություններ անհրաժեշտ չեն։ Շարժվեք ձեր տեմպով, արդյունքները մնում են անձնական, և կարող եք վերադառնալ ցանկացած պահին։',
      tr: 'Sanat becerileri gerekmez. Kendi temponuzda ilerleyin, sonuçlarınız gizli kalır ve dilediğiniz zaman geri dönebilirsiniz.',
      az: 'Rəssamlıq bacarıqları tələb olunmur. Öz sürətinizlə irəliləyin, nəticələriniz məxfi qalır və istənilən vaxt geri dönə bilərsiniz.',
      es: 'No se requieren habilidades artísticas. Avanza a tu ritmo, tus resultados son privados y puedes volver cuando quieras.',
      de: 'Keine Zeichenkünste erforderlich. Gehen Sie in Ihrem eigenen Tempo voran, Ihre Ergebnisse bleiben privat und Sie können jederzeit zurückkehren.',
      fr: 'Aucune compétence artistique requise. Avancez à votre rythme, vos résultats restent privés, et vous pouvez y revenir à tout moment.',
      pt: 'Não é necessário saber desenhar. Avance no seu ritmo, seus resultados permanecem privados e você pode revisitá‑los a qualquer momento.',
      id: 'Tidak perlu keterampilan seni. Bergerak sesuai kecepatan Anda, hasil Anda tetap pribadi, dan Anda dapat kembali kapan saja.',
      it: 'Non sono necessarie capacità artistiche. Avanza al tuo ritmo, i risultati restano privati e puoi rivederli in qualsiasi momento.',
      ar: 'لا تحتاج إلى مهارات فنية. تحرك وفق وتيرتك، تظل نتائجك خاصة، ويمكنك العودة في أي وقت.',
      hi: 'कला कौशल की आवश्यकता नहीं। अपनी गति से चलें, आपके परिणाम निजी रहते हैं, और आप कभी भी वापस आ सकते हैं।',
      zh: '无需任何绘画技能。按照自己的节奏前进，结果私密保存，随时可以回顾。',
      ja: '美術のスキルは不要です。自分のペースで進められ、結果はプライベートに保たれ、いつでも見直せます。',
      ko: '미술 실력이 필요하지 않습니다. 자신의 속도로 진행하고 결과는 비공개로 유지되며 언제든 다시 볼 수 있습니다.',
      uk: 'Художні навички не потрібні. Рухайтесь у власному темпі, результати залишаються приватними, і ви можете повертатися будь‑коли.',
      pl: 'Nie są wymagane umiejętności plastyczne. Postępuj we własnym tempie, wyniki pozostają prywatne i możesz do nich wracać w każdej chwili.'
    },
  },
} as const;

const pick = (obj: Record<string, string>, lang: string) => (obj as any)[lang] ?? obj.en;

const SessionCard: React.FC<SessionCardProps> = ({ session, isUnlocked, isCompleted, onPress, language, theme, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.selectionAsync();
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getStatusText = () => {
    if (isCompleted) return pick(T.status.completed as any, language);
    if (isUnlocked) return pick(T.status.available as any, language);
    return pick(T.status.locked as any, language);
  };

  const getButtonText = () => {
    if (isCompleted) return pick(T.action.review as any, language);
    if (isUnlocked) return pick(T.action.start as any, language);
    return pick(T.status.locked as any, language);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.sessionCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isCompleted && [styles.completedCard, { borderColor: theme.colors.primary }],
          !isUnlocked && styles.lockedCard,
        ]}
        onPress={isUnlocked ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isUnlocked}
        activeOpacity={0.8}
      >
        <View style={styles.sessionCardContent}>
          <View style={styles.sessionHeader}>
            <Text style={[styles.sessionTitle, { color: theme.colors.text }]}>
              {session.title}
            </Text>
            <View style={[
              styles.sessionStatus,
              isCompleted && [styles.completedStatus, { backgroundColor: theme.colors.primary }],
              isUnlocked && !isCompleted && [styles.unlockedStatus, { backgroundColor: isDark ? theme.colors.surface : '#F5F5F5' }],
              !isUnlocked && [styles.lockedStatus, { backgroundColor: isDark ? theme.colors.background : '#F9F9F9' }],
            ]}>
              <Text style={[
                styles.statusText,
                isCompleted && styles.completedText,
                isUnlocked && !isCompleted && [styles.unlockedText, { color: theme.colors.text }],
                !isUnlocked && [styles.lockedText, { color: theme.colors.textMuted }],
              ]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.sessionDescription, { color: theme.colors.textSecondary }]}>
            {session.description}
          </Text>
          
          <View style={styles.sessionFooter}>
            <Text style={[styles.sessionDuration, { color: theme.colors.textMuted }]}>~{session.estimatedDuration} {pick(T.units.min as any, language)}</Text>
            <TouchableOpacity
              style={[
                styles.sessionButton,
                { backgroundColor: theme.colors.primary },
                !isUnlocked && [styles.sessionButtonDisabled, { backgroundColor: isDark ? '#333' : '#E0E0E0' }],
              ]}
              onPress={isUnlocked ? onPress : undefined}
              disabled={!isUnlocked}
            >
              <Text style={[
                styles.sessionButtonText,
                !isUnlocked && [styles.sessionButtonTextDisabled, { color: theme.colors.textMuted }],
              ]}>
                {getButtonText()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ArtTherapyScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [sessions, setSessions] = useState<ArtTherapySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadSessions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await ArtTherapyProgramManager.initialize(language);
      const sessionData = await ArtTherapyProgramManager.getAllSessions();
      const progress = await ArtTherapyProgramManager.getProgress();
      const completed = Array.from(progress.entries())
        .filter(([_, prog]) => prog.completed)
        .map(([sessionId, _]) => sessionId.toString());
      
      setSessions(sessionData);
      setCompletedSessions(completed);
      
      // Animate progress
      const progressValue = completed.length / sessionData.length;
      Animated.timing(progressAnim, {
        toValue: progressValue,
        duration: 1000,
        useNativeDriver: false,
      }).start();
      
    } catch {
      setError(pick(T.errorLoading as any, language));
    } finally {
      setLoading(false);
    }
  }, [language, progressAnim]);

  useFocusEffect(
    React.useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleSessionPress = (session: ArtTherapySession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/art-therapy-session?sessionId=${session.id}`);
  };

  const isSessionUnlocked = (sessionIndex: number): boolean => {
    if (sessionIndex === 0) return true;
    return completedSessions.includes((sessions[sessionIndex - 1]?.id || 0).toString());
  };

  const isSessionCompleted = (sessionId: number): boolean => {
    return completedSessions.includes(sessionId.toString());
  };

  const completionPercentage = sessions.length > 0 
    ? Math.round((completedSessions.length / sessions.length) * 100) 
    : 0;

  const getTitle = () => pick(T.title as any, language);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{pick(T.loading as any, language)}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} onPress={loadSessions}>
          <Text style={styles.retryButtonText}>{pick(T.retry as any, language)}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Clean Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{getTitle()}</Text>
          <View style={[styles.headerStats, { backgroundColor: isDark ? theme.colors.card : '#F5F5F5' }]}>
            <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>{`${completionPercentage}% ${pick(T.percentComplete as any, language)}`}</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Sessions (current only) */}
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.sessionList}
        showsVerticalScrollIndicator={false}
      >
        {/* Completion Card */}
        {completionPercentage === 100 && (
          <View style={[styles.completionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.completionTitle, { color: theme.colors.text }]}>{pick(T.completeBanner.congrats as any, language)}</Text>
            <Text style={[styles.completionSubtitle, { color: theme.colors.textSecondary }]}>{pick(T.completeBanner.allDone as any, language)}</Text>
            <TouchableOpacity
              style={[styles.celebrationButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
            >
              <Text style={styles.celebrationButtonText}>{pick(T.completeBanner.continue as any, language)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Session Hero (only) */}
        {completionPercentage < 100 && (() => {
          const currentIndex = sessions.findIndex((s, idx) => isSessionUnlocked(idx) && !isSessionCompleted(s.id));
          const current = currentIndex >= 0 ? sessions[currentIndex] : null;
          const hasNextLocked = currentIndex >= 0 && currentIndex + 1 < sessions.length;
          if (!current) return null;
          return (
            <View style={[styles.heroCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <LinearGradient
                colors={isDark ? [`${current.color || '#111827'}40`, theme.colors.card] : [`${current.color || '#111827'}26`, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroBg}
              />
              <View style={styles.heroHeader}>
                <View style={[styles.heroIconWrap, { borderColor: current.color, backgroundColor: theme.colors.surface }]}>
                  <Text style={styles.heroIcon}>{current.icon}</Text>
                </View>
                <View style={styles.heroMeta}>
                  <Text style={[styles.heroTitle, { color: theme.colors.text }]} numberOfLines={2}>
                    {current.title}
                  </Text>
                  <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    ~{current.estimatedDuration} {pick(T.units.min as any, language)} · {current.theme}
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroDesc, { color: theme.colors.textSecondary }]}>
                {current.description}
              </Text>
              <TouchableOpacity
                style={[styles.heroButton, { backgroundColor: current.color || theme.colors.primary }]}
                onPress={() => handleSessionPress(current)}
                activeOpacity={0.9}
              >
                <Text style={styles.heroButtonText}>{pick(T.action.startSession as any, language)}</Text>
              </TouchableOpacity>

              {hasNextLocked && (
                <View style={[styles.lockedNotice, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surface : '#FAFAFA' }]}>
                  <Text style={styles.lockedEmoji}>🔒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lockedTitle, { color: theme.colors.text }]}>{pick(T.nextLocked.title as any, language)}</Text>
                    <Text style={[styles.lockedHintText, { color: theme.colors.textSecondary }]}>{pick(T.nextLocked.hint as any, language)}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {/* Program marketing hint */}
        <View style={[styles.marketingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.marketingTitle, { color: theme.colors.text }]}>{pick(T.marketing.title as any, language)}</Text>
          <Text style={[styles.marketingText, { color: theme.colors.textSecondary }]}>{pick(T.marketing.p1 as any, language)}</Text>
          <Text style={[styles.marketingText, { color: theme.colors.textSecondary }]}>{pick(T.marketing.p2 as any, language)}</Text>
        </View>

        {/* Completed sessions history */}
        <ArtTherapyCompletedList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerStats: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 5,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  sessionList: {
    padding: 20,
  },
  marketingCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  marketingTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  marketingText: { lineHeight: 20, marginTop: 2 },
  // New hero styles
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroHeader: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrap: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroIcon: { fontSize: 28 },
  heroMeta: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { marginTop: 4, fontWeight: '600' },
  heroDesc: { marginTop: 12, lineHeight: 20 },
  heroButton: { marginTop: 14, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  heroButtonText: { color: '#FFFFFF', fontWeight: '800' },
  lockedNotice: { marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12 },
  lockedEmoji: { fontSize: 20, marginRight: 10 },
  lockedTitle: { fontSize: 14, fontWeight: '700' },
  lockedHintText: { fontSize: 12, marginTop: 2 },
  sessionCard: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
  },
  completedCard: {
    borderWidth: 2,
  },
  lockedCard: {
    opacity: 0.5,
  },
  sessionCardContent: {
    padding: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  sessionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  completedStatus: {
  },
  unlockedStatus: {
  },
  lockedStatus: {
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: '#FFFFFF',
  },
  unlockedText: {
  },
  lockedText: {
  },
  sessionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 12,
  },
  sessionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sessionButtonDisabled: {
  },
  sessionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionButtonTextDisabled: {
  },
  completionCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  celebrationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});