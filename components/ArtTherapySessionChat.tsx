import CommonHeader from '@/components/CommonHeader';
import CommonSendButton from '@/components/CommonSendButton';
import SOSButton from '@/components/SOSButton';
import { FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
// Removed expo-speech: using OpenAI TTS via service instead
import ArtTherapyProgramManager, { SessionProgress } from '../services/artTherapyProgramNew';
import artTherapyService, { ArtTherapyResponse, ChatMessage } from '../services/artTherapyService';
import TypingIndicator from './TypingIndicator';

const { width } = Dimensions.get('window');

interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  language: AppLanguage;
  theme: any;
  isDark: boolean;
}

// Localized strings for the chat UI
const T = {
  loading: { en: 'Loading...', ka: 'იტვირთება...', ru: 'Загрузка...', hy: 'Բեռնում...', tr: 'Yükleniyor...', az: 'Yüklənir...', es: 'Cargando...', de: 'Laden...', fr: 'Chargement...', pt: 'Carregando...', id: 'Memuat...', it: 'Caricamento...', ar: 'جارٍ التحميل...', hi: 'लोड हो रहा है...', zh: '正在加载…', ja: '読み込み中...', ko: '불러오는 중…', uk: 'Завантаження…', pl: 'Ładowanie…' },
  error: { en: 'Error', ka: 'შეცდომა', ru: 'Ошибка', hy: 'Սխալ', tr: 'Hata', az: 'Xəta', es: 'Error', de: 'Fehler', fr: 'Erreur', pt: 'Erro', id: 'Kesalahan', it: 'Errore', ar: 'خطأ', hi: 'त्रुटि', zh: '错误', ja: 'エラー', ko: '오류', uk: 'Помилка', pl: 'Błąd' },
  sessionNotFound: { en: 'Session not found', ka: 'სესია ვერ მოიძებნა', ru: 'Сеанс не найден', hy: 'Սեանսը չի գտնվել', tr: 'Oturum bulunamadı', az: 'Sessiya tapılmadı', es: 'Sesión no encontrada', de: 'Sitzung nicht gefunden', fr: 'Séance introuvable', pt: 'Sessão não encontrada', id: 'Sesi tidak ditemukan', it: 'Sessione non trovata', ar: 'الجلسة غير موجودة', hi: 'सत्र नहीं मिला', zh: '未找到会话', ja: 'セッションが見つかりません', ko: '세션을 찾을 수 없습니다', uk: 'Сесію не знайдено', pl: 'Nie znaleziono sesji' },
  failedLoadSession: { en: 'Failed to load session', ka: 'სესიის ჩატვირთვა ვერ მოხერხდა', ru: 'Не удалось загрузить сеанс', hy: 'Չհաջողվեց բեռնել սեանսը', tr: 'Oturum yüklenemedi', az: 'Sessiyanı yükləmək mümkün olmadı', es: 'No se pudo cargar la sesión', de: 'Sitzung konnte nicht geladen werden', fr: 'Échec du chargement de la séance', pt: 'Falha ao carregar a sessão', id: 'Gagal memuat sesi', it: 'Impossibile caricare la sessione', ar: 'تعذر تحميل الجلسة', hi: 'सत्र लोड करने में विफल', zh: '加载会话失败', ja: 'セッションの読み込みに失敗しました', ko: '세션을 불러오지 못했습니다', uk: 'Не вдалося завантажити сесію', pl: 'Nie udało się wczytać sesji' },
  sessionLockedTitle: { en: 'Session Locked', ka: 'სესია დაბლოკილია', ru: 'Сессия заблокирована', hy: 'Սեանսը արգելափակված է', tr: 'Oturum kilitli', az: 'Sessiya kilidlənib', es: 'Sesión bloqueada', de: 'Sitzung gesperrt', fr: 'Séance verrouillée', pt: 'Sessão bloqueada', id: 'Sesi terkunci', it: 'Sessione bloccata', ar: 'الجلسة مقفلة', hi: 'सत्र लॉक है', zh: '会话已锁定', ja: 'セッションはロックされています', ko: '세션이 잠겼습니다', uk: 'Сесію заблоковано', pl: 'Sesja zablokowana' },
  sessionLockedMsg: { en: 'Please complete the previous session first.', ka: 'გთხოვთ დაასრულოთ წინა სესია.', ru: 'Пожалуйста, завершите предыдущую сессию.', hy: 'Խնդրում ենք նախ ավարտեք նախորդ սեանսը։', tr: 'Lütfen önce bir önceki seansı tamamlayın.', az: 'Zəhmət olmasa əvvəlki sessiyanı tamamlayın.', es: 'Por favor, completa primero la sesión anterior.', de: 'Bitte schließe zuerst die vorherige Sitzung ab.', fr: 'Veuillez d’abord terminer la séance précédente.', pt: 'Conclua a sessão anterior primeiro.', id: 'Harap selesaikan sesi sebelumnya terlebih dahulu.', it: 'Completa prima la sessione precedente.', ar: 'يرجى إكمال الجلسة السابقة أولاً.', hi: 'कृपया पहले पिछला सत्र पूरा करें।', zh: '请先完成上一次会话。', ja: '先に前のセッションを完了してください。', ko: '먼저 이전 세션을 완료해 주세요.', uk: 'Будь ласка, спочатку завершіть попередню сесію.', pl: 'Najpierw ukończ poprzednią sesję.' },
  ok: { en: 'OK', ka: 'კარგი', ru: 'ОК', hy: 'Լավ', tr: 'Tamam', az: 'OK', es: 'OK', de: 'OK', fr: 'OK', pt: 'OK', id: 'OK', it: 'OK', ar: 'حسنًا', hi: 'ठीक है', zh: '确定', ja: 'OK', ko: '확인', uk: 'Гаразд', pl: 'OK' },
  welcomePrefix: { en: 'Welcome to', ka: 'მოგესალმებით', ru: 'Добро пожаловать в', hy: 'Բարի գալուստ', tr: 'Hoş geldiniz', az: 'Xoş gəlmisiniz', es: 'Bienvenido a', de: 'Willkommen bei', fr: 'Bienvenue à', pt: 'Bem-vindo a', id: 'Selamat datang di', it: 'Benvenuto a', ar: 'مرحبًا بك في', hi: 'स्वागत है', zh: '欢迎来到', ja: 'ようこそ', ko: '환영합니다', uk: 'Ласкаво просимо до', pl: 'Witamy w' },
  sessionWord: { en: 'session', ka: 'სესიაზე', ru: 'сессию', hy: 'սեանս', tr: 'seansına', az: 'sessiyaya', es: 'sesión', de: 'Sitzung', fr: 'séance', pt: 'sessão', id: 'sesi', it: 'sessione', ar: 'الجلسة', hi: 'सत्र', zh: '会话', ja: 'セッション', ko: '세션', uk: 'сесію', pl: 'sesję' },
  sessionCompletedTitle: { en: 'Session completed', ka: 'სესია დასრულებულია', ru: 'Сессия завершена', hy: 'Սեանսը ավարտված է', tr: 'Oturum tamamlandı', az: 'Sessiya tamamlandı', es: 'Sesión completada', de: 'Sitzung abgeschlossen', fr: 'Séance terminée', pt: 'Sessão concluída', id: 'Sesi selesai', it: 'Sessione completata', ar: 'تم إكمال الجلسة', hi: 'सत्र पूरा हुआ', zh: '会话已完成', ja: 'セッションが完了しました', ko: '세션이 완료되었습니다', uk: 'Сесію завершено', pl: 'Sesja zakończona' },
  readOnlyMsg: { en: 'Chat is read-only.', ka: 'ჩათი მხოლოდ წასაკითავადაა.', ru: 'Чат только для чтения.', hy: 'Չաթը միայն կարդալու է։', tr: 'Sohbet salt okunur.', az: 'Söhbət yalnız oxunur.', es: 'El chat es de solo lectura.', de: 'Chat ist schreibgeschützt.', fr: 'Le chat est en lecture seule.', pt: 'O chat é somente leitura.', id: 'Obrolan hanya-baca.', it: 'La chat è in sola lettura.', ar: 'الدردشة للقراءة فقط.', hi: 'चैट केवल पढ़ने के लिए है।', zh: '聊天仅可读。', ja: 'チャットは読み取り専用です。', ko: '채팅은 읽기 전용입니다.', uk: 'Чат лише для читання.', pl: 'Czat jest tylko do odczytu.' },
  needPermissionTitle: { en: 'Permission Required', ka: 'ნებართვაა საჭირო', ru: 'Требуется разрешение', hy: 'Պահանջվում է թույլտվություն', tr: 'İzin gerekli', az: 'İcazə tələb olunur', es: 'Permiso requerido', de: 'Berechtigung erforderlich', fr: 'Autorisation requise', pt: 'Permissão necessária', id: 'Izin diperlukan', it: 'Autorizzazione necessaria', ar: 'الإذن مطلوب', hi: 'अनुमति आवश्यक', zh: '需要权限', ja: '許可が必要です', ko: '권한 필요', uk: 'Потрібен дозвіл', pl: 'Wymagane uprawnienia' },
  needGalleryAccess: { en: 'Camera roll access is needed to select images.', ka: 'საჭიროა გალერეის წვდომა სურათის ასარჩევად.', ru: 'Нужен доступ к галерее, чтобы выбрать изображение.', hy: 'Պահանջվում է պատկերասրահ մուտք՝ պատկեր ընտրելու համար։', tr: 'Görüntü seçmek için galeri erişimi gerekiyor.', az: 'Şəkil seçmək üçün qalereyaya giriş lazımdır.', es: 'Se necesita acceso a la galería para seleccionar imágenes.', de: 'Für die Bildauswahl ist der Zugriff auf die Galerie erforderlich.', fr: 'L’accès à la galerie est nécessaire pour sélectionner des images.', pt: 'É necessário acesso à galeria para selecionar imagens.', id: 'Akses galeri diperlukan untuk memilih gambar.', it: 'È necessario l’accesso alla galleria per selezionare immagini.', ar: 'يلزم الوصول إلى الألبوم لاختيار الصور.', hi: 'छवियाँ चुनने के लिए गैलरी एक्सेस आवश्यक है।', zh: '选择图片需要访问相册。', ja: '画像を選択するにはフォトライブラリへのアクセスが必要です。', ko: '이미지를 선택하려면 갤러리 접근이 필요합니다.', uk: 'Для вибору зображень потрібен доступ до галереї.', pl: 'Aby wybrać obrazy, potrzebny jest dostęp do galerii.' },
  needMicAccess: { en: 'Microphone access is required.', ka: 'საჭიროა მიკროფონის წვდომა.', ru: 'Нужен доступ к микрофону.', hy: 'Պահանջվում է միկրոֆոնի մուտք։', tr: 'Mikrofon erişimi gerekli.', az: 'Mikrofon girişi tələb olunur.', es: 'Se requiere acceso al micrófono.', de: 'Mikrofonzugriff ist erforderlich.', fr: 'L’accès au microphone est requis.', pt: 'Acesso ao microfone é necessário.', id: 'Akses mikrofon diperlukan.', it: 'È necessario l’accesso al microfono.', ar: 'مطلوب الوصول إلى الميكروفون.', hi: 'माइक्रोफ़ोन की अनुमति आवश्यक है।', zh: '需要麦克风访问权限。', ja: 'マイクへのアクセスが必要です。', ko: '마이크 접근 권한이 필요합니다.', uk: 'Потрібен доступ до мікрофона.', pl: 'Wymagany jest dostęp do mikrofonu.' },
  browserNoMic: { en: 'Browser does not support microphone.', ka: 'ბრაუზერი არ უჭერს მხარს მიკროფონს.', ru: 'Браузер не поддерживает микрофон.', hy: 'Բրաուզերը չի աջակցում միկրոֆոնին։', tr: 'Tarayıcı mikrofonu desteklemiyor.', az: 'Brauzer mikrofonu dəstəkləmir.', es: 'El navegador no admite micrófono.', de: 'Der Browser unterstützt kein Mikrofon.', fr: 'Le navigateur ne prend pas en charge le microphone.', pt: 'O navegador não oferece suporte a microfone.', id: 'Browser tidak mendukung mikrofon.', it: 'Il browser non supporta il microfono.', ar: 'المتصفح لا يدعم الميكروفون.', hi: 'ब्राउज़र माइक्रोफ़ोन का समर्थन नहीं करता।', zh: '浏览器不支持麦克风。', ja: 'ブラウザはマイクに対応していません。', ko: '브라우저가 마이크를 지원하지 않습니다.', uk: 'Браузер не підтримує мікрофон.', pl: 'Przeglądarka nie obsługuje mikrofonu.' },
  safariNoAudio: { en: 'This Safari version does not support audio recording.', ka: 'Safari-ის ამ ვერსიას არ აქვს ხმოვანი ჩაწერის მხარდაჭერა.', ru: 'Эта версия Safari не поддерживает запись аудио.', hy: 'Safari-ի այս տարբերակն աուդիո չի ձայնագրում։', tr: 'Bu Safari sürümü ses kaydını desteklemiyor.', az: 'Bu Safari versiyası audio yazmanı dəstəkləmir.', es: 'Esta versión de Safari no admite grabación de audio.', de: 'Diese Safari-Version unterstützt keine Audioaufnahme.', fr: 'Cette version de Safari ne prend pas en charge l’enregistrement audio.', pt: 'Esta versão do Safari não suporta gravação de áudio.', id: 'Versi Safari ini tidak mendukung perekaman audio.', it: 'Questa versione di Safari non supporta la registrazione audio.', ar: 'هذا الإصدار من Safari لا يدعم تسجيل الصوت.', hi: 'इस Safari संस्करण में ऑडियो रिकॉर्डिंग समर्थित नहीं है।', zh: '此版本的 Safari 不支持录音。', ja: 'このバージョンのSafariは音声録音をサポートしていません。', ko: '이 Safari 버전은 오디오 녹음을 지원하지 않습니다.', uk: 'Ця версія Safari не підтримує запис аудіо.', pl: 'Ta wersja Safari nie obsługuje nagrywania dźwięku.' },
  imagePickFailed: { en: 'Failed to select image', ka: 'სურათის არჩევა ვერ მოხერხდა', ru: 'Не удалось выбрать изображение', hy: 'Չհաջողվեց ընտրել պատկերը', tr: 'Görüntü seçilemedi', az: 'Şəkil seçmək mümkün olmadı', es: 'No se pudo seleccionar la imagen', de: 'Bild konnte nicht ausgewählt werden', fr: 'Échec de la sélection de l’image', pt: 'Falha ao selecionar a imagem', id: 'Gagal memilih gambar', it: 'Impossibile selezionare l’immagine', ar: 'تعذر اختيار الصورة', hi: 'छवि का चयन विफल', zh: '选择图片失败', ja: '画像を選択できませんでした', ko: '이미지를 선택하지 못했습니다', uk: 'Не вдалося вибрати зображення', pl: 'Nie udało się wybrać obrazu' },
  failedToSend: { en: 'Failed to send message. Please try again.', ka: 'გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.', ru: 'Не удалось отправить сообщение. Повторите попытку.', hy: 'Չհաջողվեց ուղարկել հաղորդագրությունը։ Կրկին փորձեք։', tr: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.', az: 'Mesaj göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.', es: 'No se pudo enviar el mensaje. Inténtalo de nuevo.', de: 'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.', fr: 'Échec de l’envoi du message. Veuillez réessayer.', pt: 'Falha ao enviar a mensagem. Tente novamente.', id: 'Gagal mengirim pesan. Silakan coba lagi.', it: 'Invio del messaggio non riuscito. Riprova.', ar: 'فشل إرسال الرسالة. حاول مرة أخرى.', hi: 'संदेश भेजने में विफल। कृपया पुनः प्रयास करें।', zh: '发送消息失败。请重试。', ja: 'メッセージを送信できませんでした。もう一度お試しください。', ko: '메시지 전송에 실패했습니다. 다시 시도해 주세요.', uk: 'Не вдалося надіслати повідомлення. Повторіть спробу.', pl: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.' },
  imageOnlyApiInstruction: {
    en: 'I uploaded my artwork image without text. Please look at the image and guide this art therapy session in English.',
    ka: 'სურათი ტექსტის გარეშე ავტვირთე. გთხოვ, შეხედო ამ ნამუშევარს და არტ-თერაპიის სესია ქართულად წარმართო.',
    ru: 'Я загрузил(а) изображение своей работы без текста. Пожалуйста, посмотрите на изображение и ведите арт-терапевтическую сессию на русском языке.',
    hy: 'Ես վերբեռնել եմ իմ ստեղծած նկարը առանց տեքստի։ Խնդրում եմ նայեք պատկերին և արտ-թերապիայի սեանսը վարեք հայերեն։',
    tr: 'Sanat çalışmamın görselini metinsiz yükledim. Lütfen görsele bakın ve bu sanat terapisi seansını Türkçe yönetin.',
    az: 'Mətnsiz olaraq rəsmimin şəklini yüklədim. Zəhmət olmasa şəkilə baxın və bu art-terapiya sessiyasını azərbaycanca aparın.',
    es: 'Subí la imagen de mi obra sin texto. Por favor mira la imagen y guía esta sesión de arteterapia en español.',
    de: 'Ich habe mein Kunstbild ohne Text hochgeladen. Bitte sieh dir das Bild an und leite diese Kunsttherapie-Sitzung auf Deutsch.',
    fr: 'J’ai téléversé l’image de mon œuvre sans texte. Merci de regarder l’image et de guider cette séance d’art-thérapie en français.',
    pt: 'Enviei a imagem do meu trabalho artístico sem texto. Por favor, observe a imagem e conduza esta sessão de arteterapia em português.',
    id: 'Saya mengunggah gambar karya seni saya tanpa teks. Tolong lihat gambarnya dan pandu sesi terapi seni ini dalam bahasa Indonesia.',
    it: 'Ho caricato l’immagine del mio lavoro artistico senza testo. Per favore guarda l’immagine e guida questa sessione di arteterapia in italiano.',
    ar: 'رفعت صورة عملي الفني من دون نص. من فضلك انظر إلى الصورة وقد هذه الجلسة العلاجية بالفن باللغة العربية.',
    hi: 'मैंने अपनी कलाकृति की छवि बिना पाठ के अपलोड की है। कृपया छवि देखें और इस आर्ट थेरेपी सत्र को हिंदी में संचालित करें।',
    zh: '我上传了一张没有文字说明的作品图片。请查看图片，并用中文引导这次艺术治疗会话。',
    ja: 'テキストなしで自分の作品画像をアップロードしました。画像を見て、このアートセラピーのセッションを日本語で進めてください。',
    ko: '텍스트 없이 제 작품 이미지를 업로드했습니다. 이미지를 보고 이 미술 치료 세션을 한국어로 이끌어 주세요.',
    uk: 'Я завантажив/завантажила зображення своєї роботи без тексту. Будь ласка, подивіться на зображення і ведіть цю арт-терапевтичну сесію українською.',
    pl: 'Przesłałem/przesłałam obraz mojej pracy bez tekstu. Proszę spójrz na obraz i poprowadź tę sesję arteterapii po polsku.',
  },
  imageReflectionQuestion: {
    en: 'When you look at this image right now, what do you feel? While you were creating it, what did you feel - was that different from now?',
    ka: 'როცა ახლა ამ სურათს უყურებთ, რას გრძნობთ? მისი შექმნის დროს რას გრძნობდით - ეს განსხვავდება იმგან, რასაც ახლა გრძნობთ?',
    ru: 'Когда вы сейчас смотрите на это изображение, что вы чувствуете? Что вы чувствовали во время создания - отличается ли это от того, что вы чувствуете сейчас?',
    hy: 'Երբ հիմա նայում եք այս պատկերին, ի՞նչ եք զգում։ Ստեղծելու պահին ի՞նչ էիք զգում. դա տարբերվո՞ւմ է նրանից, ինչ հիմա եք զգում։',
    tr: 'Şu anda bu görsele baktığınızda ne hissediyorsunuz? Onu oluştururken ne hissetmiştiniz - bu şu andakinden farklı mı?',
    az: 'İndi bu şəkilə baxanda nə hiss edirsiniz? Onu yaradarkən nə hiss edirdiniz - bu indiki hissdən fərqlənirmi?',
    es: 'Cuando miras esta imagen ahora, ¿qué sientes? Mientras la creabas, ¿qué sentías? ¿Era diferente de lo que sientes ahora?',
    de: 'Wenn du dieses Bild jetzt ansiehst, was fühlst du? Was hast du beim Gestalten gefühlt - war das anders als jetzt?',
    fr: 'Quand vous regardez cette image maintenant, que ressentez-vous ? Pendant que vous la créiez, que ressentiez-vous - est-ce différent de maintenant ?',
    pt: 'Quando você olha para esta imagem agora, o que sente? Enquanto a criava, o que sentia - isso é diferente de agora?',
    id: 'Saat Anda melihat gambar ini sekarang, apa yang Anda rasakan? Saat membuatnya, apa yang Anda rasakan - apakah berbeda dari sekarang?',
    it: 'Quando guardi questa immagine adesso, cosa senti? Mentre la creavi, cosa sentivi - era diverso da ora?',
    ar: 'عندما تنظر إلى هذه الصورة الآن، ماذا تشعر؟ أثناء إنشائها، ماذا كنت تشعر - وهل يختلف ذلك عما تشعر به الآن؟',
    hi: 'जब आप अभी इस छवि को देखते हैं, तो आप क्या महसूस करते हैं? इसे बनाते समय आप क्या महसूस कर रहे थे - क्या वह अभी से अलग था?',
    zh: '当你现在看着这张图像时，你有什么感受？创作它的时候你有什么感受？这和现在不同吗？',
    ja: '今この画像を見て、何を感じますか？制作していたときは何を感じていましたか。今とは違いますか？',
    ko: '지금 이 이미지를 볼 때 무엇이 느껴지나요? 만들고 있을 때는 무엇을 느꼈나요? 지금과 달랐나요?',
    uk: 'Коли ви зараз дивитеся на це зображення, що відчуваєте? Що ви відчували під час створення - чи це відрізняється від теперішнього?',
    pl: 'Kiedy patrzysz teraz na ten obraz, co czujesz? Co czułeś/czułaś podczas jego tworzenia - czy to różni się od tego, co czujesz teraz?',
  },
  fallbackSessionSummary: { en: 'During this session, you explored your artwork and noticed the feelings that appeared while looking at it. The session closed with a clearer, calmer awareness of your inner experience.', ka: 'ამ სესიაში თქვენ შეისწავლეთ თქვენი ნამუშევარი და შეამჩნიეთ ის განცდები, რომლებიც მისი ყურებისას გამოჩნდა. სესია დასრულდა თქვენი შინაგანი გამოცდილების უფრო მშვიდი და გაცნობიერებული ხედვით.', ru: 'В этой сессии вы исследовали свою работу и заметили чувства, которые возникали при взгляде на неё. Сессия завершилась более ясным и спокойным осознанием внутреннего переживания.', hy: 'Այս սեսիայի ընթացքում դուք ուսումնասիրեցիք ձեր նկարը և նկատեցիք այն զգացումները, որոնք առաջացան դիտելիս։ Սեսիան ավարտվեց ձեր ներքին փորձառության ավելի հանգիստ և գիտակցված դիտումով։' },
  endSession: { en: 'End Session', ka: 'სესიის დასრულება', ru: 'Завершить сессию', hy: 'Ավարտել սեանսը', tr: 'Oturumu bitir', az: 'Sessiyanı bitir', es: 'Terminar sesión', de: 'Sitzung beenden', fr: 'Terminer la séance', pt: 'Encerrar sessão', id: 'Akhiri sesi', it: 'Termina sessione', ar: 'إنهاء الجلسة', hi: 'सत्र समाप्त करें', zh: '结束会话', ja: 'セッション終了', ko: '세션 종료', uk: 'Завершити сесію', pl: 'Zakończ sesję' },
  endSessionTitle: { en: 'End this session?', ka: 'დავასრულოთ სესია?', ru: 'Завершить сессию?', hy: 'Ավարտե՞լ սեանսը', tr: 'Oturum bitsin mi?', az: 'Sessiya bitsin?', es: '¿Terminar esta sesión?', de: 'Diese Sitzung beenden?', fr: 'Terminer cette séance ?', pt: 'Encerrar esta sessão?', id: 'Akhiri sesi ini?', it: 'Terminare questa sessione?', ar: 'هل تريد إنهاء هذه الجلسة؟', hi: 'यह सत्र समाप्त करें?', zh: '结束本次会话？', ja: 'このセッションを終了しますか？', ko: '이 세션을 종료할까요?', uk: 'Завершити цю сесію?', pl: 'Zakończyć tę sesję?' },
  endSessionMessage: { en: 'Would you like to close this art therapy session now and receive a summary?', ka: 'გსურთ ახლა დაასრულოთ ეს არტ-თერაპიის სესია და მიიღოთ შეჯამება?', ru: 'Хотите завершить эту арт-терапевтическую сессию сейчас и получить резюме?', hy: 'Ցանկանու՞մ եք հիմա ավարտել այս արտ-թերապիայի սեանսը և ստանալ ամփոփում։', tr: 'Bu sanat terapisi oturumunu şimdi kapatıp özet almak ister misiniz?', az: 'Bu art-terapiya sessiyasını indi bitirib xülasə almaq istəyirsiniz?', es: '¿Quieres cerrar esta sesión de arteterapia ahora y recibir un resumen?', de: 'Möchtest du diese Kunsttherapie-Sitzung jetzt beenden und eine Zusammenfassung erhalten?', fr: 'Voulez-vous terminer cette séance d’art-thérapie maintenant et recevoir un résumé ?', pt: 'Deseja encerrar esta sessão de arteterapia agora e receber um resumo?', id: 'Apakah Anda ingin mengakhiri sesi terapi seni ini sekarang dan menerima ringkasan?', it: 'Vuoi chiudere ora questa sessione di arteterapia e ricevere un riepilogo?', ar: 'هل تريد إنهاء جلسة العلاج بالفن الآن والحصول على ملخص؟', hi: 'क्या आप यह आर्ट थेरेपी सत्र अभी समाप्त करके सारांश पाना चाहते हैं?', zh: '你想现在结束这次艺术治疗会话并获取总结吗？', ja: 'このアートセラピーセッションを今終了して要約を受け取りますか？', ko: '이 미술 치료 세션을 지금 종료하고 요약을 받을까요?', uk: 'Хочете завершити цю арт-терапевтичну сесію зараз і отримати підсумок?', pl: 'Czy chcesz teraz zakończyć tę sesję arteterapii i otrzymać podsumowanie?' },
  endSessionUserMessage: { en: 'I would like to end the session now.', ka: 'ახლა მინდა სესიის დასრულება.', ru: 'Я хочу завершить сессию сейчас.', hy: 'Ես ուզում եմ հիմա ավարտել սեանսը։', tr: 'Oturumu şimdi bitirmek istiyorum.', az: 'Sessiyanı indi bitirmək istəyirəm.', es: 'Me gustaría terminar la sesión ahora.', de: 'Ich möchte die Sitzung jetzt beenden.', fr: 'Je voudrais terminer la séance maintenant.', pt: 'Gostaria de encerrar a sessão agora.', id: 'Saya ingin mengakhiri sesi sekarang.', it: 'Vorrei terminare la sessione ora.', ar: 'أود إنهاء الجلسة الآن.', hi: 'मैं अब सत्र समाप्त करना चाहता/चाहती हूँ।', zh: '我想现在结束会话。', ja: '今このセッションを終了したいです。', ko: '이제 세션을 종료하고 싶습니다.', uk: 'Я хочу завершити сесію зараз.', pl: 'Chcę teraz zakończyć sesję.' },
  sessionSummaryLabel: { en: 'Session summary', ka: 'სესიის შეჯამება', ru: 'Резюме сессии', hy: 'Սեանսի ամփոփում', tr: 'Oturum özeti', az: 'Sessiya xülasəsi', es: 'Resumen de la sesión', de: 'Sitzungszusammenfassung', fr: 'Résumé de la séance', pt: 'Resumo da sessão', id: 'Ringkasan sesi', it: 'Riepilogo della sessione', ar: 'ملخص الجلسة', hi: 'सत्र सारांश', zh: '会话总结', ja: 'セッション要約', ko: '세션 요약', uk: 'Підсумок сесії', pl: 'Podsumowanie sesji' },
  generatingSummary: { en: 'Generating session summary...', ka: 'სესიის შეჯამება მზადდება...', ru: 'Готовим резюме сеанса...', hy: 'Պատրաստվում է սեանսի ամփոփումը...', tr: 'Oturum özeti hazırlanıyor...', az: 'Sessiya xülasəsi hazırlanır...', es: 'Generando resumen de la sesión...', de: 'Sitzungszusammenfassung wird erstellt...', fr: 'Génération du résumé de séance...', pt: 'Gerando resumo da sessão...', id: 'Membuat ringkasan sesi...', it: 'Generazione del riepilogo della sessione...', ar: 'جارٍ إنشاء ملخص الجلسة...', hi: 'सत्र सारांश तैयार हो रहा है...', zh: '正在生成会话总结...', ja: 'セッション要約を生成中...', ko: '세션 요약을 생성하는 중...', uk: 'Створюємо підсумок сесії...', pl: 'Generowanie podsumowania sesji...' },
  cancel: { en: 'Cancel', ka: 'გაუქმება', ru: 'Отмена', hy: 'Չեղարկել', tr: 'İptal', az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar', id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj' },
  resetProgressTitle: { en: 'Reset session?', ka: 'გადავაყენოთ სესია?', ru: 'Сбросить сессию?', hy: 'Վերակայե՞լ սեանսը', tr: 'Oturum sıfırlansın mı?', az: 'Sessiya sıfırlansın?', es: '¿Restablecer sesión?', de: 'Sitzung zurücksetzen?', fr: 'Réinitialiser la séance ?', pt: 'Redefinir sessão?', id: 'Reset sesi?', it: 'Reimpostare la sessione?', ar: 'إعادة تعيين الجلسة؟', hi: 'सत्र रीसेट करें?', zh: '重置会话？', ja: 'セッションをリセットしますか？', ko: '세션을 초기화할까요?', uk: 'Скинути сесію?', pl: 'Zresetować sesję?' },
  resetProgressMsg: { en: 'This will clear this session chat and progress.', ka: 'ეს გაასუფთავებს ამ სესიის ჩათს და პროგრესს.', ru: 'Это очистит чат и прогресс этой сессии.', hy: 'Սա կմաքրի այս սեանսի չաթը և առաջընթացը։', tr: 'Bu, bu oturumun sohbetini ve ilerlemesini temizler.', az: 'Bu, bu sessiyanın söhbətini və irəliləyişini siləcək.', es: 'Esto borrará el chat y el progreso de esta sesión.', de: 'Dadurch werden Chat und Fortschritt dieser Sitzung gelöscht.', fr: 'Cela effacera le chat et la progression de cette séance.', pt: 'Isso limpará o chat e o progresso desta sessão.', id: 'Ini akan menghapus chat dan progres sesi ini.', it: 'Questo cancellerà chat e progressi della sessione.', ar: 'سيؤدي هذا إلى مسح دردشة هذه الجلسة وتقدمها.', hi: 'यह इस सत्र की चैट और प्रगति साफ़ कर देगा।', zh: '这将清除此会话的聊天和进度。', ja: 'このセッションのチャットと進行状況が消去されます。', ko: '이 세션의 채팅과 진행 상황이 지워집니다.', uk: 'Це очистить чат і прогрес цієї сесії.', pl: 'To wyczyści czat i postęp tej sesji.' },
  reset: { en: 'Reset', ka: 'გადაყენება', ru: 'Сбросить', hy: 'Վերակայել', tr: 'Sıfırla', az: 'Sıfırla', es: 'Restablecer', de: 'Zurücksetzen', fr: 'Réinitialiser', pt: 'Redefinir', id: 'Reset', it: 'Reimposta', ar: 'إعادة تعيين', hi: 'रीसेट', zh: '重置', ja: 'リセット', ko: '초기화', uk: 'Скинути', pl: 'Resetuj' },
  goNext: { en: 'Go to next session', ka: 'გადადი შემდეგ სესიაზე', ru: 'Перейти к следующей сессии', hy: 'Անցնել հաջորդ սեանսին', tr: 'Sonraki seansa geç', az: 'Növbəti sessiyaya keç', es: 'Ir a la siguiente sesión', de: 'Zur nächsten Sitzung', fr: 'Aller à la séance suivante', pt: 'Ir para a próxima sessão', id: 'Ke sesi berikutnya', it: 'Vai alla prossima sessione', ar: 'انتقل إلى الجلسة التالية', hi: 'अगले सत्र पर जाएँ', zh: '前往下一次会话', ja: '次のセッションへ', ko: '다음 세션으로 이동', uk: 'Перейти до наступної сесії', pl: 'Przejdź do następnej sesji' },
  inputPlaceholder: { en: 'Type a message...', ka: 'მესიჯი...', ru: 'Напишите сообщение...', hy: 'Մուտքագրեք հաղորդագրություն...', tr: 'Bir mesaj yazın...', az: 'Mesaj yazın...', es: 'Escribe un mensaje...', de: 'Nachricht eingeben...', fr: 'Écrivez un message...', pt: 'Digite uma mensagem...', id: 'Ketik pesan...', it: 'Scrivi un messaggio...', ar: 'اكتب رسالة...', hi: 'संदेश लिखें...', zh: '输入消息…', ja: 'メッセージを入力...', ko: '메시지 입력...', uk: 'Введіть повідомлення…', pl: 'Napisz wiadomość…' },
  recording: { en: 'Recording...', ka: 'იწერება...', ru: 'Запись...', hy: 'Ձայնագրում...', tr: 'Kaydediliyor...', az: 'Yazılır...', es: 'Grabando...', de: 'Aufnahme...', fr: 'Enregistrement...', pt: 'Gravando...', id: 'Merekam...', it: 'Registrazione...', ar: 'جارٍ التسجيل...', hi: 'रिकॉर्ड हो रहा है...', zh: '正在录音…', ja: '録音中...', ko: '녹음 중…', uk: 'Запис...', pl: 'Nagrywanie...' },
  voiceMessage: { en: '🎤 Voice message', ka: '🎤 ხმოვანი შეტყობინება', ru: '🎤 Голосовое сообщение', hy: '🎤 Ձայնային հաղորդագրություն', tr: '🎤 Sesli mesaj', az: '🎤 Səsli mesaj', es: '🎤 Mensaje de voz', de: '🎤 Sprachnachricht', fr: '🎤 Message vocal', pt: '🎤 Mensagem de voz', id: '🎤 Pesan suara', it: '🎤 Messaggio vocale', ar: '🎤 رسالة صوتية', hi: '🎤 वॉइस संदेश', zh: '🎤 语音消息', ja: '🎤 音声メッセージ', ko: '🎤 음성 메시지', uk: '🎤 Голосове повідомлення', pl: '🎤 Wiadomość głosowa' },
  audioNotRecorded: { en: 'No audio recorded', ka: 'აუდიო არ ჩაიწერა', ru: 'Аудио не записано', hy: 'Աուդիոն չի ձայնագրվել', tr: 'Ses kaydedilmedi', az: 'Səs yazılmadı', es: 'No se grabó audio', de: 'Kein Audio aufgezeichnet', fr: 'Aucun audio enregistré', pt: 'Nenhum áudio gravado', id: 'Tidak ada audio yang direkam', it: 'Nessun audio registrato', ar: 'لم يتم تسجيل أي صوت', hi: 'कोई ऑडियो रिकॉर्ड नहीं हुआ', zh: '未录到音频', ja: '音声が録音されていません', ko: '오디오가 녹음되지 않았습니다', uk: 'Аудіо не записано', pl: 'Nie nagrano dźwięku' },
  startRecordingFailed: { en: 'Failed to start recording', ka: 'აუდიოს ჩაწერა ვერ დაიწყო', ru: 'Не удалось начать запись', hy: 'Չհաջողվեց սկսել ձայնագրումը', tr: 'Kayda başlama başarısız', az: 'Yazmaya başlama mümkün olmadı', es: 'No se pudo iniciar la grabación', de: 'Aufnahme konnte nicht gestartet werden', fr: 'Échec du démarrage de l’enregistrement', pt: 'Falha ao iniciar a gravação', id: 'Gagal memulai perekaman', it: 'Impossibile avviare la registrazione', ar: 'فشل بدء التسجيل', hi: 'रिकॉर्डिंग शुरू नहीं हो सकी', zh: '无法开始录音', ja: '録音を開始できませんでした', ko: '녹음을 시작하지 못했습니다', uk: 'Не вдалося розпочати запис', pl: 'Nie udało się rozpocząć nagrywania' },
  processAudioFailed: { en: 'Failed to process audio', ka: 'აუდიოს დამუშავება ვერ მოხერხდა', ru: 'Не удалось обработать аудио', hy: 'Չհաջողվեց մշակել աուդիոն', tr: 'Ses işlenemedi', az: 'Audio emal etmək mümkün olmadı', es: 'No se pudo procesar el audio', de: 'Audio konnte nicht verarbeitet werden', fr: 'Échec du traitement de l’audio', pt: 'Falha ao processar o áudio', id: 'Gagal memproses audio', it: 'Impossibile elaborare l’audio', ar: 'تعذر معالجة الصوت', hi: 'ऑडियो संसाधित नहीं हो सका', zh: '无法处理音频', ja: '音声の処理に失敗しました', ko: '오디오를 처리하지 못했습니다', uk: 'Не вдалося обробити аудіо', pl: 'Nie udało się przetworzyć dźwięku' },
  continueNext: { en: 'Continue to next session', ka: 'გადადი შემდეგ სესიაზე', ru: 'Перейти к следующей сессии', hy: 'Շարունակել հաջորդ սեանսին', tr: 'Sonraki seansa devam et', az: 'Növbəti sessiyaya davam et', es: 'Continuar a la siguiente sesión', de: 'Weiter zur nächsten Sitzung', fr: 'Continuer vers la prochaine séance', pt: 'Continuar para a próxima sessão', id: 'Lanjut ke sesi berikutnya', it: 'Continua alla prossima sessione', ar: 'تابع إلى الجلسة التالية', hi: 'अगले सत्र पर जारी रखें', zh: '继续下一次会话', ja: '次のセッションへ進む', ko: '다음 세션으로 계속', uk: 'Продовжити до наступної сесії', pl: 'Kontynuuj do następnej sesji' },
} as const;

const pick = (map: Record<string, string>, lang: AppLanguage) => map[lang] ?? map.en;

const splitSessionSummaryContent = (content: string, lang: AppLanguage) => {
  const label = pick(T.sessionSummaryLabel, lang);
  const markers = [`\n\n${label}\n`, `\n${label}\n`, `${label}\n`];

  for (const marker of markers) {
    const markerIndex = content.indexOf(marker);
    if (markerIndex >= 0) {
      return {
        body: content.slice(0, markerIndex).trim(),
        summaryTitle: label,
        summary: content.slice(markerIndex + marker.length).trim(),
      };
    }
  }

  return { body: content, summaryTitle: '', summary: '' };
};

const buildEndSessionControlContext = (source: 'button' | 'text') => [
  `[User Action: The client requested session closure via ${source}.]`,
  'Close the current art-therapy session now without asking another exploration question.',
  'Return valid JSON with session_phase=2, phase_complete=true, session_complete=true, required_input="none", action="close_session", and include session_summary.',
  'response_text should be a brief warm closure in the user language, followed by no new question.'
].join('\n');

// Deliberately conservative: requires BOTH an "ending" word AND a word that clearly refers to
// the session/conversation itself, near each other — not just one common word root anywhere in
// the message. A client saying "I want to finish this drawing" or "დავასრულო ეს ნახატი" (finish
// this drawing) must NOT match; only an explicit, unambiguous request to end the session should.
// This is a soft hint for the model, not something that overrides its own judgment (see
// `requestedClose` below) — false negatives here are fine, the model's own Early End Protocol
// handles genuine end-requests; false positives are what caused sessions to close mid-conversation.
const isEndSessionTextIntent = (text: string): boolean => {
  const normalized = text.toLowerCase();
  // "საუბარ"/"საუბრ" covers both the nominative ("საუბარი") and declined ("საუბრის", genitive
  // syncope) forms of the Georgian word for "conversation".
  const sessionWord = '(session|conversation|chat|summary|summarize|сесси|бесед|разговор|итог|резюм|სესია|საუბარ|საუბრ|შეხვედრ|ceans|görüşme|conversación|sesión)';
  // English needs \b so "close"/"stop" don't match inside unrelated words like "disclose" or
  // "desktop". \b is ASCII-word-based and unreliable for Cyrillic/Georgian script, so those use
  // bare stems instead (still safe: matched only in proximity to an explicit session word below) —
  // stems, not full conjugated words, since e.g. Russian "завершим"/"завершить"/"завершаю" or
  // Georgian "დავასრულო"/"დაასრულე"/"დავასრულოთ" conjugate by inserting a person marker between
  // the "და/დავ" prefix and the root, so the stem is the bare root (სრულ/ხურ/წყვიტ), not the
  // prefixed form.
  const endingStem = '(\\b(end|finish|close|stop|wrap up)\\b|заверш|законч|закры|остановит|სრულ|ხურ|წყვიტ)';
  return [
    new RegExp(`${endingStem}.{0,30}${sessionWord}`, 'i'),
    new RegExp(`${sessionWord}.{0,30}${endingStem}`, 'i'),
    /ավարտել.{0,30}(ceans|խոսակց)/i,
    /terminar.{0,30}(sesión|conversación)/i,
    /bitirmek.{0,30}(seans|görüşme)/i,
  ].some(pattern => pattern.test(normalized));
};

const isDefaultEnglishImageQuestion = (text?: string): boolean => {
  if (!text) return false;
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized.includes('when you look at this image right now')
    && normalized.includes('what do you feel')
    && normalized.includes('while you were creating')
    && normalized.includes('was that different from now');
};

const isMeaningfulImage = (value?: string | null) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  // Base64 placeholders sometimes end with comma only
  if (trimmed.startsWith('data:')) {
    return trimmed.length > 'data:image/jpeg;base64,'.length + 10;
  }
  return true;
};

const pickWebImageAsset = (): Promise<any | null> => new Promise((resolve, reject) => {
  if (typeof document === 'undefined') {
    reject(new Error('Image selection is not available in this environment'));
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  let settled = false;
  const cleanup = () => {
    input.onchange = null;
    input.oncancel = null;
    setTimeout(() => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    }, 0);
  };

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) {
      if (!settled) {
        settled = true;
        resolve(null);
      }
      cleanup();
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      if (!settled) {
        settled = true;
        reject(new Error('Failed to read selected image'));
      }
      cleanup();
    };
    reader.onload = () => {
      if (!settled) {
        settled = true;
        resolve({
          uri: String(reader.result),
          type: 'image',
          fileName: file.name,
          mimeType: file.type,
        });
      }
      cleanup();
    };
    reader.readAsDataURL(file);
  };

  input.oncancel = () => {
    if (!settled) {
      settled = true;
      resolve(null);
    }
    cleanup();
  };

  document.body.appendChild(input);
  input.click();
});

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isUser, language, theme, isDark }) => {
  const [speaking, setSpeaking] = useState(false);

  let imageSource: string | null = null;
  if (isMeaningfulImage(message.imageUri)) {
    imageSource = message.imageUri!.trim();
  } else if (isMeaningfulImage(message.imageBase64)) {
    const base = message.imageBase64!.trim();
    imageSource = base.startsWith('data:') ? base : `data:image/jpeg;base64,${base}`;
  }
  const hasImage = Boolean(imageSource);
  const contentParts = message.content && !isUser
    ? splitSessionSummaryContent(message.content, language)
    : { body: message.content || '', summaryTitle: '', summary: '' };

  const bubbleStyles = isUser
    ? [styles.messageBubble, styles.userBubble, { backgroundColor: isDark ? '#3b82f6' : '#000000' }]
    : [styles.messageBubble, styles.aiBubble, { backgroundColor: theme.colors.card }];

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
      <View style={bubbleStyles}>
        {hasImage && imageSource && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageSource }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </View>
        )}

        {message.content ? (
          <>
            {contentParts.body ? (
              <Text style={[
                styles.messageText,
                isUser ? styles.userText : [styles.aiText, { color: theme.colors.text }]
              ]}>
                {contentParts.body}
              </Text>
            ) : null}
            {!isUser && contentParts.summary ? (
              <View style={[
                styles.sessionSummaryBox,
                {
                  backgroundColor: isDark ? 'rgba(96, 165, 250, 0.14)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(147, 197, 253, 0.38)' : '#BFDBFE'
                }
              ]}>
                <View style={styles.sessionSummaryHeaderRow}>
                  <FontAwesome5 name="clipboard-check" size={13} color={isDark ? '#93C5FD' : '#1D4ED8'} />
                  <Text style={[styles.sessionSummaryTitle, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
                    {contentParts.summaryTitle}
                  </Text>
                </View>
                <Text style={[styles.sessionSummaryText, { color: theme.colors.text }]}>
                  {contentParts.summary}
                </Text>
              </View>
            ) : null}
            {!isUser && (
              <View style={styles.ttsRow}>
                <TouchableOpacity
                  onPress={async () => {
                    if (speaking) return;
                    try {
                      setSpeaking(true);
                      await artTherapyService.speakTextTTS(message.content!, language as AppLanguage);
                    } catch (e) {
                      console.warn('TTS playback failed:', e);
                    } finally {
                      setSpeaking(false);
                    }
                  }}
                  style={[styles.ttsBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 name={speaking ? 'stop' : 'volume-up'} size={14} color={isDark ? '#fff' : '#111827'} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : null}

        <Text style={[
          styles.messageTime,
          isUser ? styles.userTime : [styles.aiTime, { color: theme.colors.textMuted }]
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';

export default function ArtTherapySessionChat() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [receivedFirstDelta, setReceivedFirstDelta] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [lastImage, setLastImage] = useState<{ displayUri: string; base64: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  // Tracks the OpenAI response id to continue this session's conversation via
  // previous_response_id instead of resending the full history every turn. A ref (not
  // state) because it must read-and-write synchronously within the same send handler.
  const lastResponseIdRef = useRef<string | undefined>(undefined);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Web recording state (MediaRecorder)
  const webRecordingRef = useRef<{ mediaRecorder: any; chunks: BlobPart[]; stream: MediaStream | null } | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const readOnly = isSessionComplete === true;

  // Surface crisis resources whenever the model itself flags meaningful risk — previously this
  // only produced a console.warn that no user would ever see.
  const showCrisisSupport = useMemo(() => {
    const lastRisk = [...messages]
      .reverse()
      .find(m => m.role === 'assistant' && m.clinicalData)
      ?.clinicalData?.safety_assessment?.risk_level;
    return lastRisk === 'high' || lastRisk === 'imminent';
  }, [messages]);

  // Longitudinal memory preview (recent sessions aggregation)
  const [memoryPreview, setMemoryPreview] = useState<string>('');

  const buildMemoryContext = useCallback(async (): Promise<string> => {
    try {
      const progressMap = await ArtTherapyProgramManager.getProgress();
      const entries = Array.from(progressMap.entries())
        .map(([id, prog]) => ({ id, prog }))
        .filter(e => e.prog.completed && e.prog.clinicalSummary);
      if (entries.length === 0) return '';

      // Sort by completion date ascending
      entries.sort((a, b) => {
        const at = a.prog.completedAt ? new Date(a.prog.completedAt).getTime() : 0;
        const bt = b.prog.completedAt ? new Date(b.prog.completedAt).getTime() : 0;
        return at - bt;
      });

      // Build detailed clinical history (last 3-5 sessions)
      const recent = entries.slice(-5);
      const sessionDetails: string[] = [];
      recent.forEach(e => {
        const cs: ArtTherapyResponse = e.prog.clinicalSummary!;
        const dateStr = e.prog.completedAt ? new Date(e.prog.completedAt).toISOString().split('T')[0] : 'unknown';
        const emotions = cs.clinical_insights.emotional_indicators.detected_emotions.slice(0, 4).join(', ') || 'none';
        const themes = cs.clinical_insights.psychological_themes.slice(0, 4).join(', ') || 'none';
        const shift = cs.progress_tracking?.emotional_shift || '';
        const insight = cs.progress_tracking?.insight_gained || '';
        sessionDetails.push(`Session ${e.id} (${dateStr}):\n  Emotions: ${emotions}\n  Themes: ${themes}\n  Emotional shift: ${shift}\n  Key insight: ${insight}`);
      });

      // Get most recent session summary if available
      const lastSession = recent[recent.length - 1];
      const lastSummary = lastSession?.prog.clinicalSummary?.session_summary || '';

      // Collect recurring patterns across all sessions
      const allThemes = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.psychological_themes);
      const allEmotions = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.emotional_indicators.detected_emotions);
      const recurringThemes = Array.from(new Set(allThemes)).slice(0, 8);
      const recurringEmotions = Array.from(new Set(allEmotions)).slice(0, 8);

      // Check for any safety concerns in history
      const safetyConcerns = entries
        .filter(e => {
          const risk = e.prog.clinicalSummary?.safety_assessment?.risk_level;
          return risk && risk !== 'none' && risk !== 'low';
        })
        .map(e => {
          const risk = e.prog.clinicalSummary!.safety_assessment.risk_level;
          const concerns = e.prog.clinicalSummary!.safety_assessment.concerning_imagery;
          return `Session ${e.id}: ${risk} risk${concerns.length > 0 ? ' (' + concerns.join(', ') + ')' : ''}`;
        });

      // Analyze progress trajectory (subtle insights for AI awareness)
      let progressNote = '';
      if (recent.length >= 2) {
        const recentShifts = recent.map(e => e.prog.clinicalSummary?.progress_tracking?.emotional_shift || '').filter(s => s);
        const recentAlliance = recent.map(e => e.prog.clinicalSummary?.progress_tracking?.therapeutic_alliance || '').filter(a => a);
        if (recentShifts.length > 0) {
          progressNote = `Recent emotional shifts: ${recentShifts.slice(-3).join(' → ')}`;
        }
        if (recentAlliance.length > 0) {
          progressNote += `\nTherapeutic alliance trend: ${recentAlliance.slice(-3).join(' → ')}`;
        }
      }

      // Professional clinical context: AI knows everything but stays present-focused
      return `[CLINICAL CONTEXT - Internal Reference Only]
Total Sessions: ${entries.length}

Recent Session History:
${sessionDetails.join('\n\n')}

Recurring Patterns Across All Sessions:
- Themes: ${recurringThemes.join(', ')}
- Emotions: ${recurringEmotions.join(', ')}

Last Session Summary: ${lastSummary}
${safetyConcerns.length > 0 ? `\nPrevious Safety Concerns:\n${safetyConcerns.join('\n')}` : ''}
${progressNote ? `\n${progressNote}` : ''}

[THERAPEUTIC INSTRUCTION]
Use this context as your internal clinical "cheat sheet" to inform empathy, depth, and continuity of care.
- Stay present-focused on THIS session's image and current feelings
- Do NOT ask comparative questions about previous sessions unless the client spontaneously brings them up
- Let prior insights inform your understanding and therapeutic attunement, not your questions
- Recognize patterns when clinically relevant but don't explicitly mention "in previous sessions you..."
- Build on therapeutic alliance through continuity while respecting each session's independence
- Monitor for changes in safety concerns or progress trajectory without making it obvious
- Avoid repeating questions that were already deeply explored in prior sessions
- Use recurring themes awareness to ask deeper, more attuned questions about THIS session's material`;
    } catch (e) {
      console.warn('Memory context build failed:', e);
      return '';
    }
  }, []);

  // Load memory preview once (not every render)
  useEffect(() => {
    (async () => {
      const ctx = await buildMemoryContext();
      setMemoryPreview(ctx);
    })();
  }, [buildMemoryContext]);


  const formatAssistantContent = useCallback((response: ArtTherapyResponse): string => {
    const responseText = response.response_text || '';
    const isClosingResponse = response.session_complete || response.action === 'close_session' || (response.session_phase === 2 && response.phase_complete);
    const summary = isClosingResponse && response.session_summary ? response.session_summary.trim() : '';

    if (!summary || responseText.includes(summary)) {
      return responseText;
    }

    return `${responseText}\n\n${pick(T.sessionSummaryLabel, language as AppLanguage)}\n${summary}`;
  }, [language]);

  // Load session data
  useEffect(() => {
    loadSessionData();
  }, [sessionId, language]);

  const loadSessionData = async () => {
    try {
      // Initialize database with current language
      await ArtTherapyProgramManager.initialize(language);
      
      // Get session from database
      const session = await ArtTherapyProgramManager.getSessionById(Number(sessionId));
      if (!session) {
        Alert.alert(pick(T.error, language as AppLanguage), pick(T.sessionNotFound, language as AppLanguage));
        router.back();
        return;
      }

      // Gate: block if previous session not completed
      const unlocked = await ArtTherapyProgramManager.isSessionUnlocked(session.id);
      if (!unlocked) {
        Alert.alert(
          pick(T.sessionLockedTitle, language as AppLanguage),
          pick(T.sessionLockedMsg, language as AppLanguage),
          [ { text: pick(T.ok, language as AppLanguage), onPress: () => router.replace('/art-therapy-sessions') } ]
        );
        return;
      }

      setCurrentSession(session);
      
      const progress = await ArtTherapyProgramManager.getProgress();
      const sessionProgress = progress.get(session.id);
      setSessionProgress(sessionProgress || null);
      setIsSessionComplete(sessionProgress?.completed || false);
      lastResponseIdRef.current = sessionProgress?.lastResponseId;

      console.log(`📚 Loading session ${session.id}:`, {
        hasProgress: !!sessionProgress,
        chatHistoryLength: sessionProgress?.chatHistory?.length || 0,
        phase: sessionProgress?.phase,
        completed: sessionProgress?.completed
      });

      // Restore chat history if exists; else seed with welcome message
      const history = sessionProgress?.chatHistory || [];
      if (Array.isArray(history) && history.length > 0) {
        const restored: ChatMessage[] = history.map((m: any) => ({
          ...m,
          // Rehydrate Date
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));
        setMessages(restored);
        console.log(`✅ Restored ${restored.length} messages from storage`);
      } else {
        // Session data already has translated strings from database
        // Use drawing prompt as the welcome message
        const welcomeText = `${session.title}\n\n${session.drawingPrompt}`;
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          content: welcomeText,
          timestamp: new Date(),
          role: 'assistant'
        };
        setMessages([welcomeMessage]);

        // Persist initial message to start session progress
        await persistMessages(session.id, [welcomeMessage], 0);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.failedLoadSession, language as AppLanguage));
    } finally {
      setIsLoading(false);
    }
  };

  const persistMessages = async (
    sessionNumericId: number,
    msgs: ChatMessage[],
    phase: 0 | 1 | 2,
    response?: any
  ) => {
    try {
      console.log(`💾 Persisting ${msgs.length} messages for session ${sessionNumericId}, phase ${phase}`);
      const progress = await ArtTherapyProgramManager.getProgress();
      let sp = progress.get(sessionNumericId);
      if (!sp) {
        sp = await ArtTherapyProgramManager.startSession(sessionNumericId);
      }
      sp.chatHistory = msgs;
      sp.phase = phase;
      if (lastResponseIdRef.current) sp.lastResponseId = lastResponseIdRef.current;
      if (response?.session_complete && response?.response_text) {
        sp.completed = true;
        sp.completedAt = new Date();
        sp.clinicalSummary = response;
        console.log(`✅ Session ${sessionNumericId} marked as complete`);
      }
      await ArtTherapyProgramManager.saveProgress(sessionNumericId, sp);
    } catch (e) {
      console.warn('⚠️ Failed to persist chat history:', e);
    }
  };

  const handleSendMessage = useCallback(async (
    imageUri?: string,
    imageBase64?: string,
    overrideText?: string,
    controlContext?: string
  ) => {
    if (readOnly) {
      Alert.alert(
        pick(T.sessionCompletedTitle, language as AppLanguage),
        pick(T.readOnlyMsg, language as AppLanguage)
      );
      return;
    }
    const outgoingText = overrideText ?? inputText.trim();
    if (!outgoingText && !imageUri && !imageBase64) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: outgoingText,
      apiOnlyContent: !outgoingText && imageBase64
        ? 'An image was uploaded without text. Before guiding the art therapy session, apply the image eligibility rules and continue only if it clearly appears to be hand-made artwork created by the client for this session.'
        : undefined,
      timestamp: new Date(),
      role: 'user',
      imageUri,
      imageBase64
    };

    // Build newMessages synchronously from captured messages state
    const newMessages = [...messages, userMessage];
    setMessages(prev => [...prev, userMessage]);
    
    setInputText('');
    setIsTyping(true);
    setIsStreaming(true);
    setReceivedFirstDelta(false);

    // Persist user message immediately to prevent data loss
    if (currentSession) {
      try {
        await persistMessages(currentSession.id, newMessages, (sessionProgress?.phase ?? 0) as 0 | 1 | 2);
        console.log(`💾 User message persisted immediately for session ${currentSession.id}`);
      } catch (error) {
        console.warn('⚠️ Failed to persist user message:', error);
      }
    }

    try {
      // Create placeholder assistant message to stream into
      const aiId = (Date.now() + 1).toString();
      const placeholder: ChatMessage = {
        id: aiId,
        content: '',
        timestamp: new Date(),
        role: 'assistant'
      };
      setMessages(prev => [...prev, placeholder]);

      // Session theme is already translated from database
      const sessionTheme = currentSession
        ? currentSession.theme
        : 'General Art Therapy';

      const longitudinalCtx = await buildMemoryContext();
      // Explicit button press: unambiguous, deliberate — safe to force the outcome afterward.
      const buttonRequestedClose = Boolean(controlContext);
      // Free-text guess: only a hint fed to the model, never used to override its actual
      // response below — see the note on isEndSessionTextIntent for why.
      const textHintsClose = !buttonRequestedClose && isEndSessionTextIntent(outgoingText);
      const lastAssistantClinical = [...messages]
        .reverse()
        .find(m => m.role === 'assistant' && m.clinicalData)
        ?.clinicalData;
      const isModifiedImageUpload = Boolean(imageBase64 && !outgoingText && lastAssistantClinical?.required_input === 'image_v2');
      setIsGeneratingSummary(buttonRequestedClose || textHintsClose);
      const effectiveControlContext = controlContext || (textHintsClose ? buildEndSessionControlContext('text') : '');
      const requestContext = [longitudinalCtx, effectiveControlContext].filter(Boolean).join('\n\n');
      let response = await artTherapyService.sendMessageStream(
        newMessages,
        sessionTheme,
        language as AppLanguage,
        (sessionProgress?.phase ?? 0) as 0 | 1 | 2,
        (partial) => {
          // Stream partial response_text into placeholder
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: partial } : m));
          if (!receivedFirstDelta) {
            setReceivedFirstDelta(true);
            setIsTyping(false); // hide dots as soon as real text starts streaming
          }
        },
        requestContext,
        lastResponseIdRef.current,
        (id) => { lastResponseIdRef.current = id; }
      );

      if (imageBase64 && !outgoingText) {
        if (isModifiedImageUpload) {
          response = {
            ...response,
            session_phase: 1 as const,
            phase_complete: false,
            session_complete: false,
            required_input: 'text' as const,
            action: 'analyze_second_drawing' as const,
          };
        }
      }

      if (buttonRequestedClose) {
        // Explicit, deliberate user action — always honor it regardless of what the model said.
        response = {
          ...response,
          session_phase: 2,
          phase_complete: true,
          session_complete: true,
          required_input: 'none',
          action: 'close_session',
          session_summary: response.session_summary || response.phase_summary || pick(T.fallbackSessionSummary, language as AppLanguage),
        };
      } else if (response.session_complete && /[?？]\s*$/.test((response.response_text || '').trim())) {
        // Safety net: the model marked the session done but its own reply still ends in a
        // question — trust the visible question over the flag rather than showing a message
        // that both asks something and locks the conversation as finished.
        response = {
          ...response,
          session_complete: false,
          phase_complete: false,
          required_input: 'text',
          action: 'continue_exploration',
        };
      }

      // Finalize assistant message with clinical data
      const assistantContent = formatAssistantContent(response);
      const aiMessage: ChatMessage = { ...placeholder, content: assistantContent, clinicalData: response };
      // Build finalMessages synchronously - no reliance on setState updater being called sync
      const finalMessages = [...newMessages, aiMessage];
      setMessages(prev => prev.map(m => m.id === aiId ? aiMessage : m));
      
      // Ensure UI scrolls to the finalized message immediately
      scrollToBottom();

      // Persist AI message and phase progression immediately after response
      if (currentSession) {
        await persistMessages(currentSession.id, finalMessages, (response.session_phase ?? 0) as 0 | 1 | 2, response);
        console.log(`✅ Persisted AI response for session ${currentSession.id}, total messages: ${finalMessages.length}, phase: ${response.session_phase}`);
      }

      // Complete the session only from the model's own structured signals (never from
      // pattern-matching its prose — that's what previously caused sessions to end on innocent
      // phrases that merely resembled a farewell).
      const completedFinalPhase = response.session_phase === 2 && response.phase_complete && Boolean(response.session_summary);
      const shouldCompleteSession = response.session_complete || response.action === 'close_session' || completedFinalPhase;

      if (shouldCompleteSession && currentSession && !isSessionComplete) {
        console.log('✅ Completing session:', currentSession.id);
        await ArtTherapyProgramManager.completeSession(
          currentSession.id,
          response,
          finalMessages
        );
        setIsSessionComplete(true);
        setInputText('');
        setIsGeneratingSummary(false);
        setIsTyping(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
  } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.failedToSend, language as AppLanguage));
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      setIsGeneratingSummary(false);
    }
  }, [inputText, currentSession, language, isSessionComplete, sessionProgress, readOnly, buildMemoryContext, messages, formatAssistantContent]);

  const handleEndSessionEarly = useCallback(() => {
    if (!currentSession || readOnly || isTyping || isStreaming) return;

    if (Platform.OS === 'web') {
      void handleSendMessage(
        undefined,
        undefined,
        pick(T.endSessionUserMessage, language as AppLanguage),
        buildEndSessionControlContext('button')
      );
      return;
    }

    Alert.alert(
      pick(T.endSessionTitle, language as AppLanguage),
      pick(T.endSessionMessage, language as AppLanguage),
      [
        {
          text: pick(T.cancel, language as AppLanguage),
          style: 'cancel'
        },
        {
          text: pick(T.endSession, language as AppLanguage),
          style: 'destructive',
          onPress: () => {
            const controlContext = buildEndSessionControlContext('button');

            void handleSendMessage(
              undefined,
              undefined,
              pick(T.endSessionUserMessage, language as AppLanguage),
              controlContext
            );
          }
        }
      ]
    );
  }, [currentSession, readOnly, isTyping, isStreaming, language, handleSendMessage]);

  const handleImagePicker = useCallback(async () => {
    if (readOnly) {
      Alert.alert(
        pick(T.sessionCompletedTitle, language as AppLanguage),
        pick(T.readOnlyMsg, language as AppLanguage)
      );
      return;
    }
    try {
      // On native, request permission; on web, skip (browser prompts file picker permissions)
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(
            pick(T.needPermissionTitle, language as AppLanguage),
            pick(T.needGalleryAccess, language as AppLanguage)
          );
          return;
        }
      }

      if (Platform.OS === 'web') {
        const asset = await pickWebImageAsset();
        if (!asset) return;

        const prepared = await artTherapyService.prepareImageForAPI(asset);
        setLastImage(prepared);
        await handleSendMessage(prepared.displayUri, prepared.base64);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // არ ვაძალებთ კროპს
        // არ ვაყენებთ aspect-ს, რომ სრულად აირჩიოს სურათი
        base64: false, // ავირიდოთ მეხსიერების მწვავე გამოყენება მობილურზე
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Prepare cross-platform (handles base64/uri and compression)
        const prepared = await artTherapyService.prepareImageForAPI(asset as any);
        setLastImage(prepared);
        await handleSendMessage(prepared.displayUri, prepared.base64);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.imagePickFailed, language as AppLanguage));
    }
  }, [handleSendMessage, language, readOnly]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-persist messages to AsyncStorage whenever they change (but not during streaming)
  useEffect(() => {
    if (!currentSession || isStreaming || messages.length === 0) {
      return;
    }

    const persistCurrentMessages = async () => {
      try {
        await persistMessages(
          currentSession.id,
          messages,
          (sessionProgress?.phase ?? 0) as 0 | 1 | 2
        );
        console.log(`💾 Auto-persisted ${messages.length} messages for session ${currentSession.id}`);
      } catch (error) {
        console.warn('⚠️ Auto-persist failed:', error);
      }
    };

    // Debounce to avoid excessive writes during rapid updates
    const timeoutId = setTimeout(persistCurrentMessages, 500);
    return () => clearTimeout(timeoutId);
  }, [messages, currentSession, isStreaming, sessionProgress?.phase]);

  const getHeaderTitle = () => {
    if (!currentSession) return '';
    // Session data now has translated strings directly from database
    return currentSession.title;
  };

  // Reset session progress with confirmation
  const handleResetProgress = useCallback(() => {
    if (!currentSession) return;
    
    Alert.alert(
      pick(T.resetProgressTitle, language as AppLanguage),
      pick(T.resetProgressMsg, language as AppLanguage),
      [
        {
          text: pick(T.cancel, language as AppLanguage),
          style: 'cancel'
        },
        {
          text: pick(T.reset, language as AppLanguage),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear session progress
              const progress = await ArtTherapyProgramManager.getProgress();
              progress.delete(currentSession.id);
              await ArtTherapyProgramManager.saveProgress(currentSession.id, {
                sessionId: currentSession.id,
                chatHistory: [],
                phase: 0,
                completed: false,
                clinicalSummary: undefined,
                completedAt: undefined
              });
              
              // Reload session
              await loadSessionData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error('Failed to reset progress:', e);
              Alert.alert(pick(T.error, language as AppLanguage), 'Failed to reset progress');
            }
          }
        }
      ]
    );
  }, [currentSession, language]);

  // Voice: start/stop recording (push-to-talk)
  const startRecording = useCallback(async () => {
    if (readOnly) return;
    try {
      if (Platform.OS === 'web') {
        // Web: Use MediaRecorder
        const navAny: any = navigator as any;
        const MR: any = (window as any).MediaRecorder;
        
        if (!navAny?.mediaDevices?.getUserMedia){
          Alert.alert(pick(T.error, language as AppLanguage), pick(T.browserNoMic, language as AppLanguage));
          return;
        }
        
        if (!MR) {
          Alert.alert(pick(T.error, language as AppLanguage), pick(T.safariNoAudio, language as AppLanguage));
          return;
        }
        
        console.log('🎤 Starting web recording...');
        const stream = await navAny.mediaDevices.getUserMedia({ audio: true });
        console.log('🎤 Got media stream:', stream);
        
        let mime = 'audio/webm;codecs=opus';
        if (MR?.isTypeSupported) {
          if (!MR.isTypeSupported(mime)) {
            mime = MR.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
          }
        }
        console.log('🎤 Using MIME type:', mime);
        
        const mediaRecorder = new MR(stream, mime ? { mimeType: mime } : undefined);
        const chunks: BlobPart[] = [];
        
        mediaRecorder.ondataavailable = (e: any) => { 
          console.log('🎤 Data available, size:', e?.data?.size || 0);
          if (e?.data && e.data.size > 0) {
            chunks.push(e.data);
            console.log('🎤 Chunk added, total chunks:', chunks.length);
          }
        };
        
        mediaRecorder.onerror = (e: any) => {
          console.error('🎤 MediaRecorder error:', e?.error || e);
        };
        
        mediaRecorder.onstart = () => {
          console.log('🎤 Recording started');
          setIsRecording(true);
        };
        
        mediaRecorder.onstop = () => {
          console.log('🎤 Recording stopped, chunks:', chunks.length);
        };
        
        try {
          // Start with timeslice to ensure chunks are captured on mobile
          mediaRecorder.start(100); // Request data every 100ms
          console.log('🎤 MediaRecorder.start(100) called');
        } catch (e) {
          console.error('🎤 Failed to start MediaRecorder:', e);
          throw e;
        }
        
        webRecordingRef.current = { mediaRecorder, chunks, stream };
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Native: Use expo-av recording
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(pick(T.needPermissionTitle, language as AppLanguage), pick(T.needMicAccess, language as AppLanguage));
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsRecording(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.warn('Failed to start recording:', e);
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.startRecordingFailed, language as AppLanguage));
    }
  }, [language, readOnly]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    let finalUriRef: string | null = null;
    try {
      let revokeUrl: string | null = null;
      if (Platform.OS === 'web') {
        const ctx = webRecordingRef.current;
        if (!ctx) {
          console.log('🎤 No recording context');
          return;
        }
        const { mediaRecorder, chunks, stream } = ctx;
        
        console.log('🎤 Stopping recording, current chunks:', chunks.length);
        
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => {
            console.log('🎤 onstop fired, chunks:', chunks.length);
            resolve();
          };
          try { 
            mediaRecorder.stop(); 
            console.log('🎤 mediaRecorder.stop() called');
          } catch (e) {
            console.error('🎤 Error stopping recorder:', e);
            resolve();
          }
        });
        
        if (stream) {
          try { 
            stream.getTracks().forEach(t => t.stop()); 
            console.log('🎤 Stream tracks stopped');
          } catch (e) {
            console.error('🎤 Error stopping tracks:', e);
          }
        }
        
        // Wait longer for final chunks on mobile
        if (!chunks.length) {
          console.log('🎤 No chunks yet, waiting 200ms...');
          await new Promise(r => setTimeout(r, 200));
        }
        
        console.log('🎤 Final chunks count:', chunks.length);
        
        if (!chunks.length) {
          Alert.alert(pick(T.error, language as AppLanguage), pick(T.audioNotRecorded, language as AppLanguage));
          webRecordingRef.current = null;
          setIsRecording(false);
          return;
        }
        
        const type = (mediaRecorder && typeof mediaRecorder.mimeType === 'string' ? mediaRecorder.mimeType : 'audio/webm').split(';')[0];
        console.log('🎤 Creating blob with type:', type);
        const blob = new Blob(chunks, { type });
        console.log('🎤 Blob created, size:', blob.size);
        
        const url = URL.createObjectURL(blob);
        console.log('🎤 Blob URL created:', url);
        finalUriRef = url;
        revokeUrl = url;
        webRecordingRef.current = null;
        setIsRecording(false);
      } else {
        if (!recordingRef.current) return;
        await recordingRef.current.stopAndUnloadAsync();
        finalUriRef = recordingRef.current.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        if (!finalUriRef) return;
      }

      // 1) Transcribe audio so user's spoken text is visible
      console.log('🎤 About to transcribe, URI:', finalUriRef);
      const transcribed = await artTherapyService.transcribeAudio(finalUriRef!);

      const voiceUserMsg: ChatMessage = {
        id: Date.now().toString(),
        content: transcribed || pick(T.voiceMessage, language as AppLanguage),
        timestamp: new Date(),
        role: 'user',
        imageUri: lastImage?.displayUri,
        imageBase64: lastImage?.base64,
      };
      setMessages(prev => [...prev, voiceUserMsg]);

      if (currentSession) {
        await persistMessages(currentSession.id, [...messages, voiceUserMsg], (sessionProgress?.phase ?? 0) as 0 | 1 | 2);
      }

      // 2) Stream AI response so text is visible, then play via OpenAI TTS
      setIsTyping(true);
      setIsStreaming(true);
      setReceivedFirstDelta(false);

      const aiId = (Date.now() + 1).toString();
      const placeholder: ChatMessage = { id: aiId, content: '', timestamp: new Date(), role: 'assistant' };
      setMessages(prev => [...prev, placeholder]);

      const sessionTheme = currentSession
        ? ((currentSession.theme as any)[language as AppLanguage] ?? currentSession.theme.en)
        : 'General Art Therapy';

      const longitudinalCtx = await buildMemoryContext();
      const response = await artTherapyService.sendMessageStream(
        [...messages, voiceUserMsg],
        sessionTheme,
  language as AppLanguage,
        (sessionProgress?.phase ?? 0) as 0 | 1 | 2,
        (partial) => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: partial } : m));
          if (!receivedFirstDelta) {
            setReceivedFirstDelta(true);
            setIsTyping(false);
          }
        },
        longitudinalCtx,
        lastResponseIdRef.current,
        (id) => { lastResponseIdRef.current = id; }
      );

      // Finalize AI message with full text and clinical data
  setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: response.response_text, clinicalData: response } : m));
  // Ensure UI scrolls to the finalized message immediately
  scrollToBottom();

      // Speak via OpenAI TTS now that text is visible
      if (response.response_text) {
  await artTherapyService.speakTextTTS(response.response_text, language as AppLanguage);
      }

      // Persist and complete if needed
      if (currentSession) {
        const updated = [...messages, voiceUserMsg, { ...placeholder, content: response.response_text, clinicalData: response }];
        await persistMessages(currentSession.id, updated, (response.session_phase ?? 0) as 0 | 1 | 2, response);
        if (response.session_complete && !isSessionComplete) {
          await ArtTherapyProgramManager.completeSession(currentSession.id, response, updated);
          setIsSessionComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (e: any) {
      console.warn('Failed to stop recording/process voice:', e);
      const msg = typeof e?.message === 'string' ? e.message : '';
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.processAudioFailed, language as AppLanguage) + (msg ? `\n\n${msg}` : ''));
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      // Revoke blob URL on web
      try {
        if (typeof window !== 'undefined' && (finalUriRef as any) && (finalUriRef as any).startsWith && (finalUriRef as any).startsWith('blob:')) {
          URL.revokeObjectURL(finalUriRef as any);
        }
      } catch {}
    }
  }, [isRecording, language, lastImage, currentSession, messages, sessionProgress, isSessionComplete]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>
          {pick(T.loading, language as AppLanguage)}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      {/* Session accent bar */}
      {currentSession && (
        <View style={{ height: 3, backgroundColor: currentSession.color }} />
      )}

      {showCrisisSupport && <SOSButton variant="floating" />}

      {/* Header */}
      <CommonHeader 
        title={getHeaderTitle()}
        subtitle={isSessionComplete ? pick(T.sessionCompletedTitle, language as AppLanguage) : undefined}
        rightActions={
          isSessionComplete && currentSession ? (
            <View style={[styles.completeBadge, { backgroundColor: currentSession.color }]}>
              <Text style={styles.completeBadgeText}>✓</Text>
            </View>
          ) : currentSession ? (
            <TouchableOpacity
              style={[
                styles.endSessionButton,
                {
                  borderColor: currentSession.color,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'
                },
                (isTyping || isStreaming) && styles.disabledButton
              ]}
              onPress={handleEndSessionEarly}
              disabled={isTyping || isStreaming}
              activeOpacity={0.75}
            >
              <FontAwesome5 name="flag-checkered" size={13} color={isTyping || isStreaming ? '#999' : currentSession.color} />
              <Text style={[styles.endSessionText, { color: isTyping || isStreaming ? '#999' : currentSession.color }]} numberOfLines={1}>
                {pick(T.endSession, language as AppLanguage)}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages.filter(m => !(m.role === 'assistant' && !m.content && !m.imageUri && !m.imageBase64))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isUser={item.role === 'user'} language={language as AppLanguage} theme={theme} isDark={isDark} />
        )}
        style={[styles.messagesList, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <TypingIndicator />
        </View>
      )}

      {isGeneratingSummary && (
        <View style={[styles.summaryProgressContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.summaryProgressHeader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.summaryProgressText, { color: theme.colors.text }]}>{pick(T.generatingSummary, language as AppLanguage)}</Text>
          </View>
          <View style={[styles.summaryProgressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}>
            <View style={[styles.summaryProgressFill, { backgroundColor: theme.colors.primary }]} />
          </View>
        </View>
      )}

      {/* Read-only Notice */}
      {readOnly && (
        <View style={[styles.readonlyBanner, { backgroundColor: isDark ? theme.colors.surface : '#F5F5F5' }]}>
          <Text style={[styles.readonlyText, { color: theme.colors.textSecondary }]}>{pick(T.sessionCompletedTitle, language as AppLanguage)} — {pick(T.readOnlyMsg, language as AppLanguage)}</Text>
        </View>
      )}

      {readOnly && currentSession && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, backgroundColor: theme.colors.background }}>
          <TouchableOpacity
            style={{
              backgroundColor: currentSession.color,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={async () => {
              const nextId = currentSession.id + 1;
              const canOpen = await ArtTherapyProgramManager.isSessionUnlocked(nextId);
              if (canOpen) {
                router.replace({ pathname: '/art-therapy-session', params: { sessionId: String(nextId) } });
              } else {
                router.replace('/art-therapy-sessions');
              }
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{pick(T.goNext, language as AppLanguage)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={[
              styles.imageButton, 
              { backgroundColor: readOnly ? (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB') },
              readOnly && styles.disabledButton
            ]} 
            onPress={handleImagePicker} 
            disabled={readOnly}
          >
            <FontAwesome5 name="image" size={18} color={readOnly ? '#999' : (isDark ? '#fff' : '#000')} />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { backgroundColor: isDark ? theme.colors.card : '#F5F5F5', color: theme.colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={pick(T.inputPlaceholder, language as AppLanguage)}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={1000}
            onSubmitEditing={() => (readOnly ? undefined : handleSendMessage())}
            blurOnSubmit={false}
            editable={!readOnly}
          />
          {/* Mic button: push-to-talk */}
          <TouchableOpacity
            style={[
              styles.micButton, 
              { backgroundColor: isRecording ? (isDark ? '#ff4444' : '#ff0000') : (readOnly ? (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB') : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB')) },
              isRecording && styles.micButtonRecording
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={readOnly}
          >
            <FontAwesome5 name={isRecording ? 'circle' : 'microphone'} size={18} color={isRecording ? '#fff' : (readOnly ? '#999' : (isDark ? '#fff' : '#000'))} solid={isRecording} />
          </TouchableOpacity>
          {isRecording && (
            <Text style={[styles.recordingText, { color: theme.colors.error || '#ff0000' }]}>
              {pick(T.recording, language as AppLanguage)}
            </Text>
          )}
          
          <CommonSendButton 
            onPress={handleSendMessage}
            disabled={!inputText.trim() || readOnly}
            loading={isTyping}
            icon={readOnly ? 'lock' : 'paper-plane'}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  endSessionButton: {
    minHeight: 34,
    maxWidth: 150,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  endSessionText: {
    fontSize: 12,
    fontWeight: '700',
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.8,
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
  },
  aiBubble: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#111827', // near-black for better readability
  },
  sessionSummaryBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sessionSummaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionSummaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryProgressContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryProgressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    width: '72%',
    height: '100%',
    borderRadius: 999,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiTime: {
    color: '#6B7280', // gray-500
    textAlign: 'left',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  messageImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 12,
  },
  typingContainer: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.1 }],
  },
  recordingText: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
  },
  sendButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  readonlyBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readonlyText: {
    fontSize: 12,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  ttsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  ttsBtn: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});