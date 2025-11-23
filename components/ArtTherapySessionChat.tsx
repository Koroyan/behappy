import CommonHeader from '@/components/CommonHeader';
import CommonSendButton from '@/components/CommonSendButton';
import { FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
// Removed expo-speech: using OpenAI TTS via service instead
import ArtTherapyProgramManager, { ART_THERAPY_SESSIONS, SessionProgress } from '../services/artTherapyProgram';
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

        {message.content && (
          <>
            <Text style={[
              styles.messageText,
              isUser ? styles.userText : [styles.aiText, { color: theme.colors.text }]
            ]}>
              {message.content}
            </Text>
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
        )}

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
  const [receivedFirstDelta, setReceivedFirstDelta] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [lastImage, setLastImage] = useState<{ displayUri: string; base64: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Web recording state (MediaRecorder)
  const webRecordingRef = useRef<{ mediaRecorder: any; chunks: BlobPart[]; stream: MediaStream | null } | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const readOnly = isSessionComplete === true;

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

      const recent = entries.slice(-5); // last 5 sessions
      const lines: string[] = [];
      recent.forEach(e => {
        const cs: ArtTherapyResponse = e.prog.clinicalSummary!;
        const dateStr = e.prog.completedAt ? new Date(e.prog.completedAt).toISOString().split('T')[0] : 'unknown-date';
        const emotions = cs.clinical_insights.emotional_indicators.detected_emotions.slice(0, 4).join(', ') || 'none';
        const themes = cs.clinical_insights.psychological_themes.slice(0, 4).join(', ') || 'none';
        const shift = cs.progress_tracking?.emotional_shift || '';
        lines.push(`S${e.id}(${dateStr}) Emotions:${emotions}; Themes:${themes}; Shift:${shift}`);
      });

      const allThemes = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.psychological_themes);
      const allEmotions = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.emotional_indicators.detected_emotions);
      const recurringThemes = Array.from(new Set(allThemes)).slice(0, 8);
      const recurringEmotions = Array.from(new Set(allEmotions)).slice(0, 8);

  return `Recent Sessions\n${lines.join('\n')}\nRecurring Themes: ${recurringThemes.join(', ')}\nRecurring Emotions: ${recurringEmotions.join(', ')}\nInstruction: Use patterns above to ask 2 comparative questions, highlight a positive progression, and gently explore one unresolved theme. Respond ONLY with a single JSON object following the agreed schema.`;
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

  // Load session data
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const session = ART_THERAPY_SESSIONS.find(s => s.id.toString() === sessionId);
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

      // Restore chat history if exists; else seed with welcome message
      const history = sessionProgress?.chatHistory || [];
      if (Array.isArray(history) && history.length > 0) {
        const restored: ChatMessage[] = history.map((m: any) => ({
          ...m,
          // Rehydrate Date
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));
        setMessages(restored);
      } else {
        const getByLang = (obj: Record<string, string>) => (obj as any)[language as AppLanguage] ?? obj.en;
        const title = getByLang(session.title);
        const desc = getByLang(session.description);
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          content: `${pick(T.welcomePrefix, language as AppLanguage)} ${title}! ${desc}`,
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
      const progress = await ArtTherapyProgramManager.getProgress();
      let sp = progress.get(sessionNumericId);
      if (!sp) {
        sp = await ArtTherapyProgramManager.startSession(sessionNumericId);
      }
      sp.chatHistory = msgs;
      sp.phase = phase;
      if (response?.session_complete && response?.response_text) {
        sp.completed = true;
        sp.completedAt = new Date();
        sp.clinicalSummary = response;
      }
      await ArtTherapyProgramManager.saveProgress(sessionNumericId, sp);
    } catch (e) {
      console.warn('⚠️ Failed to persist chat history:', e);
    }
  };

  const handleSendMessage = useCallback(async (imageUri?: string, imageBase64?: string) => {
    if (readOnly) {
      Alert.alert(
        pick(T.sessionCompletedTitle, language as AppLanguage),
        pick(T.readOnlyMsg, language as AppLanguage)
      );
      return;
    }
    if (!inputText.trim() && !imageUri && !imageBase64) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      timestamp: new Date(),
      role: 'user',
      imageUri,
      imageBase64
    };

    setMessages(prev => [...prev, userMessage]);
    const newMessages = [...messages, userMessage];
    setInputText('');
    setIsTyping(true);
    setIsStreaming(true);
    setReceivedFirstDelta(false);

    // Persist user message immediately
    if (currentSession) {
      await persistMessages(currentSession.id, newMessages, (sessionProgress?.phase ?? 0) as 0 | 1 | 2);
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

      const sessionTheme = currentSession
        ? ((currentSession.theme as any)[language as AppLanguage] ?? currentSession.theme.en)
        : 'General Art Therapy';

      const longitudinalCtx = await buildMemoryContext();
      const response = await artTherapyService.sendMessageStream(
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
        longitudinalCtx
      );

      // Finalize assistant message with clinical data
  setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: response.response_text, clinicalData: response } : m));
  // Ensure UI scrolls to the finalized message immediately
  scrollToBottom();

      // Persist AI message and phase progression
      if (currentSession) {
        const updated = [...newMessages, { ...placeholder, content: response.response_text, clinicalData: response }];
        await persistMessages(currentSession.id, updated, (response.session_phase ?? 0) as 0 | 1 | 2, response);
      }

      // Check for session completion
      if (response.session_complete && currentSession && !isSessionComplete) {
        await ArtTherapyProgramManager.completeSession(
          currentSession.id,
          response,
          [...newMessages, { ...placeholder, content: response.response_text, clinicalData: response }]
        );
        setIsSessionComplete(true);
        setInputText('');
        setIsTyping(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
  } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(pick(T.error, language as AppLanguage), pick(T.failedToSend, language as AppLanguage));
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
    }
  }, [inputText, currentSession, language, isSessionComplete, sessionProgress, readOnly, buildMemoryContext, messages]);

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

  const getHeaderTitle = () => {
    if (!currentSession) return '';
    return ((currentSession.title as any)[language] ?? currentSession.title.en);
  };

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
        longitudinalCtx
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      {/* Session accent bar */}
      {currentSession && (
        <View style={{ height: 3, backgroundColor: currentSession.color }} />
      )}
      
      {/* Header */}
      <CommonHeader 
        title={getHeaderTitle()}
        subtitle={isSessionComplete ? pick(T.sessionCompletedTitle, language as AppLanguage) : undefined}
        rightActions={
          isSessionComplete && currentSession ? (
            <View style={[styles.completeBadge, { backgroundColor: currentSession.color }]}>
              <Text style={styles.completeBadgeText}>✓</Text>
            </View>
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
    </View>
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