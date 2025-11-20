import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChatMessage from '../../components/ChatMessage';
import ClientSessionSummaryCard, { ClientSessionSummary } from '../../components/ClientSessionSummaryCard';
import TypingIndicator from '../../components/TypingIndicator';
import aiTherapyService, {
  ChatMessage as ChatMessageType,
  SessionData
} from '../../services/aiTherapyService';
import { TherapyColors, therapyStyles } from '../../styles/therapyStyles';

const AITherapyChatScreen: React.FC = () => {
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const pick = (obj: Record<string, string>, lang: AppLanguage) => obj[lang] ?? obj.en;
  const t = {
    headerStatuses: {
      analyzing: { en: '💭 Conducting clinical analysis...', ka: '💭 მიმდინარეობს კლინიკური ანალიზი...', ru: '💭 Провожу клинический анализ...', hy: '💭 Կատարվում է կլինիկական վերլուծություն...', tr: '💭 Klinik analiz yapılıyor...', az: '💭 Klinik analiz aparılır...', es: '💭 Realizando análisis clínico...', de: '💭 Klinische Analyse läuft...', fr: '💭 Analyse clinique en cours...', pt: '💭 Realizando análise clínica...', id: '💭 Melakukan analisis klinis...', it: '💭 Analisi clinica in corso...', ar: '💭 إجراء تحليل سريري...', hi: '💭 नैदानिक विश्लेषण जारी है...', zh: '💭 正在进行临床分析…', ja: '💭 臨床分析を実行中...', ko: '💭 임상 분석 중...', uk: '💭 Виконується клінічний аналіз...', pl: '💭 Trwa analiza kliniczna...' },
      pro: { en: '✨ GPT‑5 Clinical Specialist Active', ka: '✨ GPT‑5 კლინიკური სპეციალისტი აქტიურია', ru: '✨ Активен клинический специалист GPT‑5', hy: '✨ GPT‑5 կլինիկական մասնագետը ակտիվ է', tr: '✨ GPT‑5 Klinik Uzmanı Aktif', az: '✨ GPT‑5 Klinik Mütəxəssisi Aktivdir', es: '✨ Especialista clínico GPT‑5 activo', de: '✨ GPT‑5 Klinischer Spezialist aktiv', fr: '✨ Spécialiste clinique GPT‑5 actif', pt: '✨ Especialista clínico GPT‑5 ativo', id: '✨ Spesialis Klinis GPT‑5 aktif', it: '✨ Specialista clinico GPT‑5 attivo', ar: '✨ اختصاصي سريري GPT‑5 مفعل', hi: '✨ GPT‑5 क्लिनिकल विशेषज्ञ सक्रिय', zh: '✨ GPT‑5 临床专家已启用', ja: '✨ GPT‑5 臨床スペシャリスト有効', ko: '✨ GPT‑5 임상 전문가 활성화', uk: '✨ Активний клінічний спеціаліст GPT‑5', pl: '✨ Aktywny specjalista kliniczny GPT‑5' },
      core: { en: '💫 Core Therapeutic Mode', ka: '💫 ძირითადი თერაპიული რეჟიმი', ru: '💫 Базовый терапевтический режим', hy: '💫 Հիմնական թերապևտիկ ռեժիմ', tr: '💫 Temel Terapötik Mod', az: '💫 Əsas Terapevtik Rejim', es: '💫 Modo terapéutico básico', de: '💫 Grundlegender therapeutischer Modus', fr: '💫 Mode thérapeutique de base', pt: '💫 Modo terapêutico básico', id: '💫 Mode Terapeutik Inti', it: '💫 Modalità terapeutica di base', ar: '💫 وضع علاجي أساسي', hi: '💫 मूल चिकित्सीय मोड', zh: '💫 核心治疗模式', ja: '💫 コア治療モード', ko: '💫 기본 치료 모드', uk: '💫 Базовий терапевтичний режим', pl: '💫 Podstawowy tryb terapeutyczny' },
    },
    endSession: { en: 'End Session', ka: 'სესიის დასრულება', ru: 'Завершить сессию', hy: 'Ավարտել սեանսը', tr: 'Oturumu bitir', az: 'Sessiyanı bitir', es: 'Terminar sesión', de: 'Sitzung beenden', fr: 'Terminer la séance', pt: 'Encerrar sessão', id: 'Akhiri sesi', it: 'Termina sessione', ar: 'إنهاء الجلسة', hi: 'सत्र समाप्त करें', zh: '结束会话', ja: 'セッション終了', ko: '세션 종료', uk: 'Завершити сесію', pl: 'Zakończ sesję' },
    inputPlaceholderFirst: { en: "Share what's on your mind... 💙", ka: 'რას გრძნობ, მომიყევი... 💙', ru: 'Поделитесь тем, что на душе... 💙', hy: 'Կիսվիր այն մտքերով, որ ունես... 💙', tr: 'Aklındakileri paylaş... 💙', az: 'Düşüncələrini bölüş... 💙', es: 'Comparte lo que sientes... 💙', de: 'Teile, was dich bewegt... 💙', fr: 'Partage ce que tu as en tête... 💙', pt: 'Compartilhe o que está em sua mente... 💙', id: 'Bagikan yang ada di pikiranmu... 💙', it: 'Condividi ciò che provi... 💙', ar: 'شارك ما يدور في بالك... 💙', hi: 'अपने मन की बात साझा करें... 💙', zh: '说说你的心事… 💙', ja: '心の中を話してみて… 💙', ko: '마음속 이야기를 나눠 보세요… 💙', uk: 'Поділіться тим, що на серці... 💙', pl: 'Podziel się tym, co czujesz... 💙' },
    inputPlaceholderNext: { en: 'Continue sharing... 💭', ka: 'გაგრძელე გაზიარება... 💭', ru: 'Продолжайте делиться... 💭', hy: 'Շարունակիր կիսվել... 💭', tr: 'Paylaşmaya devam et... 💭', az: 'Paylaşmağa davam et... 💭', es: 'Sigue compartiendo... 💭', de: 'Erzähle weiter... 💭', fr: 'Continue de partager... 💭', pt: 'Continue compartilhando... 💭', id: 'Lanjutkan bercerita... 💭', it: 'Continua a condividere... 💭', ar: 'تابع المشاركة... 💭', hi: 'साझा करना जारी रखें... 💭', zh: '继续分享… 💭', ja: '続けて話してね… 💭', ko: '계속 이야기해 주세요… 💭', uk: 'Продовжуйте ділитися... 💭', pl: 'Kontynuuj dzielenie się... 💭' },
    alerts: {
      permissionTitle: { en: 'Permission Required', ka: 'ნებართვაა საჭირო', ru: 'Требуется разрешение', hy: 'Պահանջվում է թույլտվություն', tr: 'İzin gerekli', az: 'İcazə tələb olunur', es: 'Permiso requerido', de: 'Berechtigung erforderlich', fr: 'Autorisation requise', pt: 'Permissão necessária', id: 'Izin diperlukan', it: 'Autorizzazione necessaria', ar: 'الإذن مطلوب', hi: 'अनुमति आवश्यक', zh: '需要权限', ja: '許可が必要です', ko: '권한 필요', uk: 'Потрібен дозвіл', pl: 'Wymagane uprawnienia' },
      galleryAccess: { en: 'Please grant photo library access to share images.', ka: 'სურათების გასაზიარებლად მიეცით გალერეაზე წვდომა.', ru: 'Пожалуйста, предоставьте доступ к фотобиблиотеке для обмена изображениями.', hy: 'Խնդրում ենք տրամադրել պատկերասրահի մուտք՝ պատկերներ կիսիելու համար։', tr: 'Lütfen görselleri paylaşmak için fotoğraf kitaplığına erişim izni verin.', az: 'Şəkil paylaşmaq üçün qalereyaya giriş icazəsi verin.', es: 'Concede acceso a la galería para compartir imágenes.', de: 'Bitte erlaube den Zugriff auf die Fotobibliothek, um Bilder zu teilen.', fr: 'Veuillez autoriser l’accès à la photothèque pour partager des images.', pt: 'Conceda acesso à biblioteca de fotos para compartilhar imagens.', id: 'Beri akses ke galeri foto untuk berbagi gambar.', it: 'Concedi l’accesso alla libreria foto per condividere immagini.', ar: 'يرجى منح إذن الوصول إلى معرض الصور لمشاركة الصور.', hi: 'छवियाँ साझा करने के लिए फोटो लाइब्रेरी की अनुमति दें।', zh: '请授予照片库访问权限以分享图片。', ja: '画像を共有するにはフォトライブラリへのアクセスを許可してください。', ko: '이미지 공유를 위해 사진 보관함 접근을 허용해 주세요.', uk: 'Надайте доступ до фотобібліотеки, щоб ділитися зображеннями.', pl: 'Zezwól na dostęp do biblioteki zdjęć, aby udostępniać obrazy.' },
      imageTooLargeTitle: { en: 'Image Too Large', ka: 'სურათი ძალიან დიდია', ru: 'Слишком большое изображение', hy: 'Պատկերը չափազանց մեծ է', tr: 'Görüntü Çok Büyük', az: 'Şəkil çox böyükdür', es: 'Imagen demasiado grande', de: 'Bild zu groß', fr: 'Image trop volumineuse', pt: 'Imagem muito grande', id: 'Gambar terlalu besar', it: 'Immagine troppo grande', ar: 'الصورة كبيرة جدًا', hi: 'छवि बहुत बड़ी है', zh: '图像过大', ja: '画像が大きすぎます', ko: '이미지가 너무 큽니다', uk: 'Занадто велике зображення', pl: 'Obraz jest zbyt duży' },
      imageTooLargeText: { en: 'This image is too large to process. Please select a smaller image or screenshot.', ka: 'ეს სურათი დამუშავებისთვის ძალიან დიდია. აირჩიეთ უფრო პატარა სურათი ან ეკრანის ანაბეჭდი.', ru: 'Это изображение слишком велико для обработки. Пожалуйста, выберите изображение поменьше или скриншот.', hy: 'Այս պատկերը չափազանց մեծ է մշակման համար։ Խնդրում ենք ընտրել ավելի փոքր պատկեր կամ սքրինշոթ։', tr: 'Bu görüntü işlemek için çok büyük. Lütfen daha küçük bir görüntü veya ekran görüntüsü seçin.', az: 'Bu şəkil emal üçün çox böyükdür. Zəhmət olmasa daha kiçik şəkil və ya skrinşot seçin.', es: 'Esta imagen es demasiado grande para procesarla. Selecciona una imagen más pequeña o una captura de pantalla.', de: 'Dieses Bild ist zu groß zur Verarbeitung. Bitte wähle ein kleineres Bild oder einen Screenshot.', fr: 'Cette image est trop volumineuse pour être traitée. Veuillez choisir une image plus petite ou une capture d’écran.', pt: 'Esta imagem é grande demais para processar. Selecione uma imagem menor ou uma captura de tela.', id: 'Gambar ini terlalu besar untuk diproses. Pilih gambar yang lebih kecil atau tangkapan layar.', it: 'Questa immagine è troppo grande per essere elaborata. Scegli un’immagine più piccola o uno screenshot.', ar: 'هذه الصورة كبيرة جدًا للمعالجة. يرجى اختيار صورة أصغر أو لقطة شاشة.', hi: 'यह छवि प्रोसेस करने के लिए बहुत बड़ी है। कृपया एक छोटी छवि या स्क्रीनशॉट चुनें।', zh: '此图像过大，无法处理。请选择较小的图片或截图。', ja: 'この画像は大きすぎて処理できません。より小さい画像またはスクリーンショットを選択してください。', ko: '이 이미지는 처리하기에 너무 큽니다. 더 작은 이미지 또는 스크린샷을 선택해 주세요.', uk: 'Це зображення надто велике для обробки. Виберіть менше зображення або скріншот.', pl: 'Ten obraz jest zbyt duży do przetworzenia. Wybierz mniejszy obraz lub zrzut ekranu.' },
      cannotOpenTitle: { en: 'Cannot Open This Image', ka: 'სურათის გახსნა შეუძლებელია', ru: 'Не удаётся открыть изображение', hy: 'Հնարավոր չէ բացել այս պատկերը', tr: 'Bu Görüntü Açılamıyor', az: 'Bu şəkil açılmır', es: 'No se puede abrir esta imagen', de: 'Dieses Bild kann nicht geöffnet werden', fr: 'Impossible d’ouvrir cette image', pt: 'Não é possível abrir esta imagem', id: 'Gambar ini tidak dapat dibuka', it: 'Impossibile aprire questa immagine', ar: 'لا يمكن فتح هذه الصورة', hi: 'यह छवि नहीं खोली जा सकती', zh: '无法打开此图像', ja: 'この画像を開けません', ko: '이 이미지를 열 수 없습니다', uk: 'Не вдається відкрити це зображення', pl: 'Nie można otworzyć tego obrazu' },
      cannotOpenText: { en: 'This photo cannot be processed. Try a different photo, take a new one, or use a screenshot. Some camera formats (HEIC, RAW) may cause issues.', ka: 'ეს ფოტო ვერ მუშავდება. სცადეთ სხვა ფოტო, გადაიღეთ ახალი ან გამოიყენეთ ეკრანის ანაბეჭდი. ზოგიერთი კამერის ფორმატი (HEIC, RAW) პრობლემებს იწვევს.', ru: 'Невозможно обработать это фото. Попробуйте другое фото, сделайте новое или используйте скриншот. Некоторые форматы (HEIC, RAW) могут вызывать проблемы.', hy: 'Այս լուսանկարը չի մշակվում։ Փորձեք այլ լուսանկար, նոր նկարեք կամ օգտագործեք սքրինշոթ։ Որոշ ձևաչափեր (HEIC, RAW) կարող են խնդիրներ առաջացնել։', tr: 'Bu foto işlenemiyor. Farklı bir foto deneyin, yenisini çekin veya ekran görüntüsü kullanın. Bazı formatlar (HEIC, RAW) sorun yaratabilir.', az: 'Bu foto emal edilə bilmir. Başqa foto seçin, yenisini çəkin və ya skrinşot istifadə edin. Bəzi formatlar (HEIC, RAW) problemlərə səbəb ola bilər.', es: 'No se puede procesar esta foto. Prueba con otra, toma una nueva o usa una captura. Algunos formatos (HEIC, RAW) pueden causar problemas.', de: 'Dieses Foto kann nicht verarbeitet werden. Versuche ein anderes, mache ein neues oder nutze einen Screenshot. Manche Formate (HEIC, RAW) können Probleme verursachen.', fr: 'Cette photo ne peut pas être traitée. Essayez une autre, prenez‑en une nouvelle ou utilisez une capture d’écran. Certains formats (HEIC, RAW) peuvent poser problème.', pt: 'Esta foto não pôde ser processada. Tente outra, tire uma nova ou use uma captura de tela. Alguns formatos (HEIC, RAW) podem causar problemas.', id: 'Foto ini tidak dapat diproses. Cobalah foto lain, ambil yang baru, atau gunakan tangkapan layar. Beberapa format (HEIC, RAW) dapat menimbulkan masalah.', it: 'Questa foto non può essere elaborata. Prova un’altra, scattane una nuova o usa uno screenshot. Alcuni formati (HEIC, RAW) possono creare problemi.', ar: 'لا يمكن معالجة هذه الصورة. جرّب صورة أخرى، التقط واحدة جديدة، أو استخدم لقطة شاشة. قد تسبب بعض الصيغ (HEIC، RAW) مشكلات.', hi: 'यह फोटो प्रोसेस नहीं हो सका। कोई और फोटो चुनें, नया लें, या स्क्रीनशॉट इस्तेमाल करें। कुछ फॉर्मैट (HEIC, RAW) समस्या कर सकते हैं।', zh: '无法处理此照片。尝试其他照片、重新拍摄或使用屏幕截图。某些格式（HEIC、RAW）可能会导致问题。', ja: 'この写真は処理できません。別の写真を試すか、新しく撮るか、スクリーンショットを使用してください。一部の形式（HEIC、RAW）は問題になる場合があります。', ko: '이 사진은 처리할 수 없습니다. 다른 사진을 선택하거나 새로 촬영하거나 스크린샷을 사용하세요. 일부 형식(HEIC, RAW)은 문제가 될 수 있습니다.', uk: 'Не вдається обробити це фото. Спробуйте інше, зробіть нове або використайте скріншот. Деякі формати (HEIC, RAW) можуть спричиняти проблеми.', pl: 'Tego zdjęcia nie można przetworzyć. Spróbuj innego, zrób nowe lub użyj zrzutu ekranu. Niektóre formaty (HEIC, RAW) mogą powodować problemy.' },
      errorTitle: { en: 'Error', ka: 'შეცდომა', ru: 'Ошибка', hy: 'Սխալ', tr: 'Hata', az: 'Xəta', es: 'Error', de: 'Fehler', fr: 'Erreur', pt: 'Erro', id: 'Kesalahan', it: 'Errore', ar: 'خطأ', hi: 'त्रुटि', zh: '错误', ja: 'エラー', ko: '오류', uk: 'Помилка', pl: 'Błąd' },
      selectImageFailed: { en: 'Failed to select image. Please try again.', ka: 'სურათის არჩევა ვერ მოხერხდა. სცადეთ ხელახლა.', ru: 'Не удалось выбрать изображение. Попробуйте ещё раз.', hy: 'Չհաջողվեց ընտրել պատկեր։ Խնդրում ենք կրկին փորձել։', tr: 'Görüntü seçilemedi. Lütfen tekrar deneyin.', az: 'Şəkil seçmək alınmadı. Yenidən cəhd edin.', es: 'No se pudo seleccionar la imagen. Inténtalo de nuevo.', de: 'Bild konnte nicht ausgewählt werden. Bitte erneut versuchen.', fr: 'Échec de la sélection de l’image. Veuillez réessayer.', pt: 'Falha ao selecionar a imagem. Tente novamente.', id: 'Gagal memilih gambar. Silakan coba lagi.', it: 'Impossibile selezionare l’immagine. Riprova.', ar: 'تعذر اختيار الصورة. يرجى المحاولة مرة أخرى.', hi: 'छवि का चयन नहीं हो सका। कृपया पुनः प्रयास करें।', zh: '选择图片失败。请重试。', ja: '画像の選択に失敗しました。もう一度お試しください。', ko: '이미지를 선택하지 못했습니다. 다시 시도해 주세요.', uk: 'Не вдалося вибрати зображення. Повторіть спробу.', pl: 'Nie udało się wybrać obrazu. Spróbuj ponownie.' },
      failedEncode: { en: 'Failed to encode image. Please try again.', ka: 'სურათის კოდირება ვერ მოხერხდა. სცადეთ თავიდან.', ru: 'Не удалось закодировать изображение. Попробуйте ещё раз.', hy: 'Չհաջողվեց կոդավորել պատկերը։ Կրկին փորձեք։', tr: 'Görüntü kodlanamadı. Lütfen tekrar deneyin.', az: 'Şəkli kodlaşdırmaq mümkün olmadı. Yenidən cəhd edin.', es: 'No se pudo codificar la imagen. Inténtalo de nuevo.', de: 'Bild konnte nicht kodiert werden. Bitte erneut versuchen.', fr: 'Échec de l’encodage de l’image. Veuillez réessayer.', pt: 'Falha ao codificar a imagem. Tente novamente.', id: 'Gagal mengkodekan gambar. Silakan coba lagi.', it: 'Impossibile codificare l’immagine. Riprova.', ar: 'تعذر ترميز الصورة. حاول مرة أخرى.', hi: 'छवि एन्कोड नहीं हो सकी। कृपया पुनः प्रयास करें।', zh: '图像编码失败。请重试。', ja: '画像のエンコードに失敗しました。もう一度お試しください。', ko: '이미지 인코딩에 실패했습니다. 다시 시도해 주세요.', uk: 'Не вдалося кодувати зображення. Повторіть спробу.', pl: 'Nie udało się zakodować obrazu. Spróbuj ponownie.' },
      sessionSavedTitle: { en: 'Session Saved', ka: 'სესია შენახულია', ru: 'Сессия сохранена', hy: 'Սեանսը պահպանված է', tr: 'Oturum Kaydedildi', az: 'Sessiya yadda saxlanıldı', es: 'Sesión guardada', de: 'Sitzung gespeichert', fr: 'Séance enregistrée', pt: 'Sessão salva', id: 'Sesi tersimpan', it: 'Sessione salvata', ar: 'تم حفظ الجلسة', hi: 'सत्र सहेजा गया', zh: '会话已保存', ja: 'セッションが保存されました', ko: '세션이 저장되었습니다', uk: 'Сесію збережено', pl: 'Sesja zapisana' },
      sessionSavedText: { en: 'Your session has been saved.', ka: 'თქვენი სესია შეინახა.', ru: 'Ваша сессия была сохранена.', hy: 'Ձեր սեանսը պահպանվել է։', tr: 'Oturumunuz kaydedildi.', az: 'Sessiyanız yadda saxlanıldı.', es: 'Tu sesión ha sido guardada.', de: 'Ihre Sitzung wurde gespeichert.', fr: 'Votre séance a été enregistrée.', pt: 'Sua sessão foi salva.', id: 'Sesi Anda telah disimpan.', it: 'La tua sessione è stata salvata.', ar: 'تم حفظ جلستك.', hi: 'आपका सत्र सहेजा गया है।', zh: '您的会话已保存。', ja: 'セッションが保存されました。', ko: '세션이 저장되었습니다.', uk: 'Вашу сесію збережено.', pl: 'Twoja sesja została zapisana.' },
      startNewTitle: { en: 'Start New Session?', ka: 'დაიწყოთ ახალი სესია?', ru: 'Начать новую сессию?', hy: 'Սկսե՞լ նոր սեանս', tr: 'Yeni oturum başlatılsın mı?', az: 'Yeni sessiya başlansın?', es: '¿Iniciar nueva sesión?', de: 'Neue Sitzung starten?', fr: 'Commencer une nouvelle séance ?', pt: 'Iniciar nova sessão?', id: 'Mulai sesi baru?', it: 'Iniziare una nuova sessione?', ar: 'هل تريد بدء جلسة جديدة؟', hi: 'नया सत्र शुरू करें?', zh: '开始新会话？', ja: '新しいセッションを開始しますか？', ko: '새 세션을 시작할까요?', uk: 'Розпочати нову сесію?', pl: 'Rozpocząć nową sesję?' },
      startNewText: { en: 'Would you like to begin a new therapy session?', ka: 'გსურთ ახალი თერაპიის სესიის დაწყება?', ru: 'Хотите начать новую терапевтическую сессию?', hy: 'Ցանկանու՞մ եք սկսել նոր թերապևտիկ սեանս։', tr: 'Yeni bir terapi oturumu başlatmak ister misiniz?', az: 'Yeni terapi sessiyasına başlamaq istəyirsiniz?', es: '¿Te gustaría comenzar una nueva sesión de terapia?', de: 'Möchten Sie eine neue Therapiesitzung beginnen?', fr: 'Souhaitez-vous commencer une nouvelle séance de thérapie ?', pt: 'Você gostaria de iniciar uma nova sessão de terapia?', id: 'Apakah Anda ingin memulai sesi terapi baru?', it: 'Vuoi iniziare una nuova sessione di terapia?', ar: 'هل ترغب في بدء جلسة علاجية جديدة؟', hi: 'क्या आप एक नया थेरेपी सत्र शुरू करना चाहते हैं?', zh: '您想开始新的治疗会话吗？', ja: '新しいセラピーセッションを始めますか？', ko: '새로운 치료 세션을 시작하시겠습니까?', uk: 'Бажаєте розпочати нову терапевтичну сесію?', pl: 'Czy chcesz rozpocząć nową sesję terapii?' },
      yesStartFresh: { en: 'Yes, Start Fresh', ka: 'დიახ, დაიწყე თავიდან', ru: 'Да, начать заново', hy: 'Այո, սկսել զրոյից', tr: 'Evet, sıfırdan başla', az: 'Bəli, yenidən başla', es: 'Sí, empezar de nuevo', de: 'Ja, neu beginnen', fr: 'Oui, repartir à zéro', pt: 'Sim, começar do zero', id: 'Ya, mulai baru', it: 'Sì, ricomincia', ar: 'نعم، ابدأ من جديد', hi: 'हाँ, नए सिरे से शुरू करें', zh: '是的，重新开始', ja: 'はい、新しく始める', ko: '예, 처음부터 시작', uk: 'Так, почати спочатку', pl: 'Tak, zacznij od nowa' },
      stayHere: { en: 'Stay Here', ka: 'დარჩი აქ', ru: 'Остаться здесь', hy: 'Մնա այստեղ', tr: 'Burada kal', az: 'Burada qal', es: 'Quedarse aquí', de: 'Hier bleiben', fr: 'Rester ici', pt: 'Ficar aqui', id: 'Tetap di sini', it: 'Rimani qui', ar: 'البقاء هنا', hi: 'यहीं रहें', zh: '留在此处', ja: 'ここにとどまる', ko: '여기에 머무르기', uk: 'Залишитися тут', pl: 'Zostań tutaj' },
      savedTitle: { en: 'Saved!', ka: 'შენახულია!', ru: 'Сохранено!', hy: 'Պահպանված է!', tr: 'Kaydedildi!', az: 'Yadda saxlanıldı!', es: '¡Guardado!', de: 'Gespeichert!', fr: 'Enregistré !', pt: 'Salvo!', id: 'Tersimpan!', it: 'Salvato!', ar: 'تم الحفظ!', hi: 'सहेजा गया!', zh: '已保存！', ja: '保存しました！', ko: '저장됨!', uk: 'Збережено!', pl: 'Zapisano!' },
      savedText: { en: 'Your session summary has been saved for your personal reflection.', ka: 'თქვენი სესიის შეჯამება შენახულია პირადი რეფлексიისთვის.', ru: 'Итог вашей сессии сохранён для личных раздумий.', hy: 'Ձեր սեանսի ամփոփագիրը պահպանվել է անձնական անդրադարձի համար։', tr: 'Oturum özetiniz kişisel değerlendirmeniz için kaydedildi.', az: 'Sessiya xülasəniz şəxsi düşüncələriniz üçün saxlanıldı.', es: 'El resumen de tu sesión se ha guardado para tu reflexión personal.', de: 'Die Zusammenfassung Ihrer Sitzung wurde für Ihre persönliche Reflexion gespeichert.', fr: 'Le résumé de votre séance a été enregistré pour votre réflexion personnelle.', pt: 'O resumo da sua sessão foi salvo para sua reflexão pessoal.', id: 'Ringkasan sesi Anda telah disimpan untuk refleksi pribadi Anda.', it: 'Il riepilogo della tua sessione è stato salvato per la tua riflessione personale.', ar: 'تم حفظ ملخص جلستك لتفكيرك الشخصي.', hi: 'आपके सत्र का सारांश आपकी निजी चिंतन के लिए सहेज लिया गया है।', zh: '您的会话摘要已保存，供您个人回顾。', ja: 'セッションの要約が保存されました。', ko: '세션 요약이 개인적인 성찰을 위해 저장되었습니다.', uk: 'Підсумок вашої сесії збережено для особистих роздумів.', pl: 'Podsumowanie sesji zostało zapisane do Twojej osobistej refleksji.' },
    },
    welcome: {
      en: `Hi, I’m glad you’re here. This is a gentle, judgment‑free space. You can share as much or as little as you want—at your own pace. I’m here to listen, support, and help you make sense of what you’re feeling. Whenever you’re ready, what would you like to talk about today?`,
      ka: `გამარჯობა, მიხარია, რომ აქ ხარ. ეს არის თბილი და მიუკერძოებელი სივრცე. შეგიძლია გაზიარო იმდენი, რამდენიც გინდა — შენს ტემპში. მე აქ ვარ, რომ მოგისმინო, დაგიჭირო მხარი და დაგეხმარო შენს გრძნობებში გარკევაში. როცა მზად იქნები, რაზე გინდა ვისაუბროთ დღეს?`,
      ru: `Привет, я рада, что вы здесь. Это бережное, безопасное пространство без осуждения. Вы можете делиться столько, сколько хотите — в вашем темпе. Я здесь, чтобы внимательно слушать, поддерживать и помочь разобраться в ваших чувствах. Когда будете готовы, о чём вам хотелось бы поговорить сегодня?`,
      hy: `Բարև, ուրախ եմ, որ այստեղ ես։ Սա հարազատ, չդատող տարածք է։ Կարող ես կիսվել այնքան, որքան քեզ հարմար է՝ քո տեմպով։ Ես այստեղ եմ՝ լսելու, աջակց করার և օգնելու հասկանալ, ինչ ես զգում։ Երբ պատրաստ լինես, ինչի՞ մասին կցանկանաս խոսել այսօր։`,
      tr: `Merhaba, burada olmana sevindim. Burası yargısız, nazik bir alan. İstersen az, istersen çok paylaşabilirsin — kendi hızında. Dinlemek, destek olmak ve hissettiklerini anlamlandırmana yardımcı olmak için buradayım. Hazır olduğunda, bugün ne hakkında konuşmak istersin?`,
      az: `Salam, burada olduğuna sevinirəm. Bura mühakiməsiz, zərif bir məkandır. İstədiyin qədər paylaşa bilərsən — öz sürətinlə. Dinləmək, dəstək olmaq və hisslərini anlamaqda kömək etmək üçün buradayam. Hazır olanda, bu gün nə barədə danışmaq istərdin?`,
      es: `Hola, me alegra que estés aquí. Este es un espacio amable y sin juicios. Puedes compartir tanto o tan poco como quieras, a tu propio ritmo. Estoy aquí para escucharte, apoyarte y ayudarte a comprender lo que sientes. Cuando te sientas listo/a, ¿de qué te gustaría hablar hoy?`,
      de: `Hallo, ich freue mich, dass du hier bist. Das ist ein achtsamer, urteilsfreier Raum. Du kannst so viel oder so wenig teilen, wie du möchtest – in deinem eigenen Tempo. Ich bin hier, um zuzuhören, dich zu unterstützen und dir zu helfen, deine Gefühle zu verstehen. Wenn du bereit bist: Worüber möchtest du heute sprechen?`,
      fr: `Bonjour, je suis heureux(se) que tu sois ici. Cet espace est bienveillant et sans jugement. Tu peux partager autant ou aussi peu que tu veux — à ton rythme. Je suis là pour t’écouter, te soutenir et t’aider à comprendre ce que tu ressens. Quand tu te sentiras prêt(e), de quoi aimerais-tu parler aujourd’hui ?`,
      pt: `Olá, que bom que você está aqui. Este é um espaço acolhedor e sem julgamentos. Você pode compartilhar o quanto quiser — no seu próprio tempo. Estou aqui para ouvir, apoiar e ajudar você a compreender o que está sentindo. Quando se sentir pronto(a), sobre o que gostaria de conversar hoje?`,
      id: `Halo, senang kamu ada di sini. Ini adalah ruang yang hangat dan tanpa penilaian. Kamu bisa berbagi sedikit atau banyak—sesuai ritmemu. Aku di sini untuk mendengarkan, mendukung, dan membantu memahami apa yang kamu rasakan. Saat kamu siap, ingin membicarakan apa hari ini?`,
      it: `Ciao, sono felice che tu sia qui. Questo è uno spazio gentile e senza giudizio. Puoi condividere quanto vuoi, al tuo ritmo. Sono qui per ascoltarti, sostenerti e aiutarti a dare senso a ciò che provi. Quando ti sentirai pronto/a, di cosa ti piacerebbe parlare oggi?`,
      ar: `مرحبًا، يسعدني وجودك هنا. هذا مكان دافئ وخالٍ من الأحكام. يمكنك مشاركة القليل أو الكثير — وفق وتيرتك. أنا هنا لأستمع إليك، وأدعمك، وأساعدك على فهم ما تشعر به. حين تكون مستعدًا/مستعدة، عمّا تود/تودين الحديث اليوم؟`,
      hi: `नमस्ते, मुझे खुशी है कि आप यहाँ हैं। यह एक सुरक्षित, स्नेहपूर्ण और बिना जजमेंट का स्थान है। आप जितना चाहें उतना साझा कर सकते हैं — अपनी गति से। मैं सुनने, साथ देने और आपकी भावनाओं को समझने में मदद करने के लिए यहाँ हूँ। जब आप तैयार हों, आज किस बारे में बात करना चाहेंगे?`,
      zh: `你好，很高兴你来到这里。这里是一个温柔、无评判的空间。你可以按自己的节奏，分享多一点或少一点都可以。我在这里倾听、支持，并帮助你理解自己的感受。准备好的时候，今天你想聊些什么？`,
      ja: `こんにちは。ここに来てくれてうれしいです。ここはやさしく、評価のない安心できる場です。話したいことを、あなたのペースで少しずつでも大丈夫です。私はあなたの気持ちに寄り添い、耳を傾け、言葉にするお手伝いをします。準備ができたら、今日は何について話したいですか？`,
      ko: `안녕하세요, 여기 와 주셔서 고마워요. 여기는 따뜻하고 판단하지 않는 공간이에요. 당신의 속도에 맞춰, 하고 싶은 만큼만 나눠도 괜찮아요. 저는 당신의 이야기를 듣고, 지지하며, 감정을 이해하도록 돕기 위해 여기 있어요. 준비가 되면, 오늘 무엇에 대해 이야기하고 싶으신가요?`,
      uk: `Привіт, я рад(а), що ви тут. Це теплий простір без осуду. Ви можете ділитися стільки, скільки хочете — у власному темпі. Я тут, щоб слухати, підтримувати й допомогти розібратися у ваших почуттях. Коли будете готові, про що хотіли б поговорити сьогодні?`,
      pl: `Cześć, cieszę się, że tu jesteś. To życzliwa przestrzeń bez oceniania. Możesz podzielić się tyle, ile chcesz — we własnym tempie. Jestem tutaj, aby wysłuchać, wesprzeć i pomóc zrozumieć to, co czujesz. Gdy będziesz gotowy/a, o czym chciał(a)byś dziś porozmawiać?`,
    },
    imageSharePrompt: {
      en: "I'd like to share this image with you for art therapy analysis.",
      ka: "მინდა ეს სურათი გაგიზიარო არტ თერაპიის ანალიზისთვის.",
      ru: "Я хочу поделиться этим изображением для арт-терапевтического анализа.",
      hy: "Կցանկանայի կիսվել այս ছবով արվեստաթերապիայի վերլուծության համար։",
      tr: "Bu görseli sanat terapisi analizi için seninle paylaşmak istiyorum.",
      az: "Bu təsviri sənə art-terapiya təhlili üçün paylaşmaq istəyirəm.",
      es: "Me gustaría compartir esta imagen contigo para un análisis de arteterapia.",
      de: "Ich möchte dieses Bild für eine kunsttherapeutische Analyse mit dir teilen.",
      fr: "Je souhaite partager cette image avec toi pour une analyse d’art‑thérapie.",
      pt: "Gostaria de compartilhar esta imagem com você para análise de arteterapia.",
      id: "Aku ingin membagikan gambar ini untuk analisis terapi seni.",
      it: "Vorrei condividere questa immagine con te per un'analisi di arteterapia.",
      ar: "أود مشاركة هذه الصورة معك لتحليل العلاج بالفن.",
      hi: "मैं यह चित्र आपके साथ कला-चिकित्सा विश्लेषण के लिए साझा करना चाहता/चाहती हूँ।",
      zh: "我想与你分享这张图片用于艺术治疗分析。",
      ja: "この画像をアートセラピーの分析のために共有したいです。",
      ko: "이 이미지를 미술치료 분석을 위해 공유하고 싶어요.",
      uk: "Я хочу поділитися цим зображенням для арт-терапевтичного аналізу.",
      pl: "Chciał(a)bym udostępnić ten obraz do analizy w ramach arteterapii.",
    },
    imageAnalysisSystemPrompt: {
      en: 'User shared an image for art therapy analysis. Please analyze the emotional content, colors, shapes, and symbolism.',
      ka: 'მომხმარებელმა გააზიარა სურათი არტ თერაპიის ანალიზისთვის. გთხოვ შეაფასო ემოციური შინაარსი, ფერები, ფორმები და სიმბოლიკა.',
      ru: 'Пользователь поделился изображением для арт-терапевтического анализа. Проанализируй эмоциональное содержание, цвета, формы и символику.',
      hy: 'Օգտվողը պատկեր է կիսվել արվեստաթերապիայի վերլուծության համար։ Վերլուծիր էմոցիոնալ բովանդակությունը, գույները, ձևերը և խորհրդաբանությունը։',
      tr: 'Kullanıcı sanat terapisi analizi için bir görsel paylaştı. Lütfen duygusal içeriği, renkleri, şekilleri ve sembolizmi analiz et.',
      az: 'İstifadəçi art-terapiya təhlili üçün təsvir paylaşdı. Zəhmət olmasa emosional məzmunu, rəngləri, formaları və simvolikanı təhlil et.',
      es: 'El usuario compartió una imagen para análisis de arteterapia. Analiza el contenido emocional, los colores, las formas y el simbolismo.',
      de: 'Der Nutzer hat ein Bild für eine kunsttherapeutische Analyse geteilt. Bitte analysiere den emotionalen Inhalt, Farben, Formen und Symbolik.',
      fr: 'L’utilisateur a partagé une image pour une analyse d’art‑thérapie. Analyse le contenu émotionnel, les couleurs, les formes et la symbolique.',
      pt: 'O usuário compartilhou uma imagem para análise de arteterapia. Analise o conteúdo emocional, cores, formas e simbolismo.',
      id: 'Pengguna membagikan gambar untuk analisis terapi seni. Tolong analisis muatan emosional, warna, bentuk, dan simbolismenya.',
      it: 'L’utente ha condiviso un’immagine per analisi di arteterapia. Analizza il contenuto emotivo, i colori, le forme e la simbologia.',
      ar: 'شارك المستخدم صورة لتحليل العلاج بالفن. يرجى تحليل المحتوى العاطفي والألوان والأشكال والرمزية.',
      hi: 'उपयोगकर्ता ने कला-चिकित्सा विश्लेषण के लिए एक छवि साझा की है। कृपया भावनात्मक सामग्री, रंग, आकार और प्रतीकवाद का विश्लेषण करें।',
      zh: '用户分享了一张用于艺术治疗分析的图片。请分析其情感内容、颜色、形状和象征意义。',
      ja: 'ユーザーがアートセラピー分析のために画像を共有しました。感情的な内容、色彩、形、象徴性を分析してください。',
      ko: '사용자가 미술치료 분석을 위해 이미지를 공유했습니다. 감정적 내용, 색상, 형태, 상징성을 분석해주세요.',
      uk: 'Користувач поділився зображенням для арт-терапевтичного аналізу. Проаналізуй емоційний зміст, кольори, форми та символіку.',
      pl: 'Użytkownik udostępnił obraz do analizy w ramach arteterapii. Przeanalizuj emocjonalną treść, kolory, kształty i symbolikę.',
    },
  } as const;
  // Ensure we never append an empty AI message
  const safeText = (s: any): string => {
    if (typeof s === 'string' && s.trim().length > 0) return s;
    const fallbacks: Record<AppLanguage, string> = {
      en: "I’m here with you. What feels most present right now?",
      ka: "აქ ვარ შენთან ერთად. ახლა ყველაზე მეტად რას გრძნობ?",
      ru: "Я рядом с вами. Что вы чувствуете прямо сейчас?",
      hy: "Ես քեզ հետ եմ։ Ի՞նչ ես զգում հենց հիմա։",
      tr: "Buradayım ve yanındayım. Şu anda en çok ne hissediyorsun?",
      az: "Burdayam, yanındayam. Hazırda ən çox nə hiss edirsən?",
      es: "Estoy aquí contigo. ¿Qué sientes más presente ahora?",
      de: "Ich bin bei dir. Was ist gerade am stärksten präsent?",
      fr: "Je suis là avec toi. Qu’est-ce qui est le plus présent en toi maintenant ?",
      pt: "Estou aqui com você. O que está mais presente agora?",
      id: "Aku di sini bersamamu. Apa yang paling kamu rasakan saat ini?",
      it: "Sono qui con te. Cosa senti più presente adesso?",
      ar: "أنا هنا معك. ما الذي تشعر به أكثر الآن؟",
      hi: "मैं यहाँ आपके साथ हूँ। अभी सबसे अधिक क्या महसूस हो रहा है?",
      zh: "我在这里陪着你。此刻你最强烈的感受是什么？",
      ja: "ここにいますよ。今いちばん強く感じているのは何ですか？",
      ko: "제가 곁에 있어요. 지금 가장 크게 느껴지는 감정은 무엇인가요?",
      uk: "Я поруч із вами. Що ви відчуваєте найбільше зараз?",
      pl: "Jestem tu z Tobą. Co teraz czujesz najbardziej?",
    };
    return fallbacks[language] || fallbacks.en;
  };
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [isOpenAIConnected, setIsOpenAIConnected] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<ClientSessionSummary | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    initializeSession();
    startWelcomeAnimation();
    checkOpenAIConnection();

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Check API connectivity once on mount
  const checkOpenAIConnection = async () => {
    try {
      const ok = await aiTherapyService.testApiConnection();
      setIsOpenAIConnected(ok);
    } catch (error) {
      setIsOpenAIConnected(false);
    }
  };

  // Smooth entrance animation for messages list
  const startWelcomeAnimation = () => {
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withSpring(0, { damping: 15 });
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const initializeSession = () => {
    // Clear previous session history in the service
    aiTherapyService.startNewSession();
    
    const session: SessionData = {
      id: `session_${Date.now()}`,
      messages: [],
      startTime: new Date(),
      insights: [],
      emotions: [],
    };
    setCurrentSession(session);

    // Add welcome message with more sophisticated, gentle approach
    const welcomeMessage: ChatMessageType = {
      id: `msg_${Date.now()}`,
      type: 'ai',
      content: pick(t.welcome as any, language),
      timestamp: new Date(),
      aiResponse: {
        response_text: "Professional welcome establishing therapeutic alliance",
        technique: {
          method: "Therapeutic Alliance",
          name: "rapport_building",
          description: "Establishing safety and connection for therapeutic work",
          clinical_rationale: "Initial alliance-building sets foundation for effective therapeutic engagement"
        },
        detected_emotion: "welcoming",
        key_insights: ["Client entering therapeutic space", "Establishing safety and trust"],
        next_recommendation: "Allow client to share at their own pace",
        language: "english"
      }
    };

    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !isLoading) return;

    const userMessage: ChatMessageType = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsFirstMessage(false);

    try {
      // Process message with AI service
  const aiResponse = await aiTherapyService.processMessage(userMessage.content);
      
      // Create AI response message
      const aiMessage: ChatMessageType = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: safeText(aiResponse.response_text),
        timestamp: new Date(),
        aiResponse,
      };

      // Add AI response
      setMessages(prev => [...prev, aiMessage]);

      // Update current session
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, userMessage, aiMessage],
          insights: [...currentSession.insights, ...aiResponse.key_insights],
          emotions: [
            ...currentSession.emotions,
            {
              emotion: aiResponse.detected_emotion,
              intensity: Math.random() * 10, // In real app, this would be more sophisticated
              timestamp: new Date(),
            },
          ],
        };
        setCurrentSession(updatedSession);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage: ChatMessageType = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: "I'm sorry, I encountered an issue processing your message. Please try again, and remember that I'm here to support you.",
        timestamp: new Date(),
        aiResponse: {
          response_text: "Error message",
          technique: {
            method: "Error",
            name: "error_handling",
            description: "Handle error gracefully and maintain therapeutic relationship"
          },
          detected_emotion: "neutral",
          key_insights: ["Technical error occurred"],
          next_recommendation: "Please try rephrasing your message",
          language: "english"
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(pick(t.alerts.permissionTitle as any, language), pick(t.alerts.galleryAccess as any, language));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // ✅ Disable crop - allows all images
        quality: 0.3, // Lower quality for compression
        base64: false,
        allowsMultipleSelection: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // ✅ Detailed logging for debugging
        console.log('=== IMAGE SELECTED ===');
        console.log('URI:', asset.uri);
        console.log('Dimensions:', asset.width, 'x', asset.height);
        console.log('Type:', asset.type);
        console.log('File name:', asset.fileName || 'unknown');
        console.log('Platform:', Platform.OS);
        console.log('===================');

        let base64Image: string | null = null;

        // Always read file manually for consistent behavior across platforms
        try {
          // Ensure URI is clean
          let cleanUri = asset.uri;
          
          // ✅ Better URI handling for different platforms
          if (Platform.OS === 'android') {
            if (!cleanUri.startsWith('file://') && !cleanUri.startsWith('content://')) {
              cleanUri = `file://${cleanUri}`;
            }
          } else if (Platform.OS === 'ios') {
            // iOS file URIs should work as-is, but log for debugging
            if (!cleanUri.startsWith('file://') && !cleanUri.startsWith('ph://')) {
              console.warn('Unexpected iOS URI format:', cleanUri);
            }
          }

          console.log('Reading image from URI:', cleanUri);
          console.log('Platform:', Platform.OS);
          
          // ✅ Try to get file info (may fail for some URIs)
          let fileInfo: any = null;
          try {
            fileInfo = await FileSystem.getInfoAsync(cleanUri);
            console.log('File info:', fileInfo);
            
            if (fileInfo.exists && fileInfo.size) {
              const sizeMB = fileInfo.size / (1024 * 1024);
              console.log(`File size: ${sizeMB.toFixed(2)} MB`);
            }
          } catch (infoError) {
            console.log('Could not get file info (may be normal for some URIs):', infoError);
            // Continue anyway - not critical
          }
          
          // ✅ COMPRESS IMAGE FIRST (especially for camera photos)
          console.log('Compressing image with ImageManipulator...');
          
          try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              cleanUri,
              [
                { resize: { width: 1024 } }, // ✅ Resize to max 1024px width
              ],
              {
                compress: 0.7, // ✅ JPEG compression
                format: ImageManipulator.SaveFormat.JPEG, // ✅ Force JPEG (not HEIC)
                base64: true, // ✅ Get base64 directly
              }
            );

            console.log('✅ Compression successful!');
            console.log('Compressed image URI:', manipulatedImage.uri);
            console.log('Compressed base64 length:', manipulatedImage.base64?.length || 0);

            base64Image = manipulatedImage.base64 || null;
            
            if (!base64Image) {
              console.log('No base64 in result, reading from file...');
              // Fallback: try reading compressed file
              base64Image = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
                encoding: 'base64',
              });
            }
          } catch (manipError) {
            console.error('ImageManipulator failed:', manipError);
            console.log('Trying direct read as fallback...');
            
            // ✅ Fallback: try direct read without compression
            try {
              base64Image = await FileSystem.readAsStringAsync(cleanUri, {
                encoding: 'base64',
              });
              console.log('✅ Direct read successful, length:', base64Image?.length || 0);
              
              // Warn about large file
              if (base64Image && base64Image.length > 5 * 1024 * 1024) {
                console.warn('⚠️ Large uncompressed image, may be slow');
              }
            } catch (fallbackError) {
              console.error('❌ Both compression and direct read failed');
              throw fallbackError;
            }
          }
          
          console.log('Final base64 length:', base64Image?.length || 0);
          
          // ✅ Check if base64 is reasonable size (< 10MB encoded after compression)
          if (base64Image && base64Image.length > 10 * 1024 * 1024) {
            Alert.alert(pick(t.alerts.imageTooLargeTitle as any, language), pick(t.alerts.imageTooLargeText as any, language));
            return;
          }
          
        } catch (readError: any) {
          console.error('Error processing image:', readError);
          console.error('Error details:', {
            message: readError?.message,
            code: readError?.code,
            uri: asset.uri,
            platform: Platform.OS
          });
          
          Alert.alert(pick(t.alerts.cannotOpenTitle as any, language), pick(t.alerts.cannotOpenText as any, language), [{ text: 'OK' }]);
          return;
        }

        if (!base64Image) {
          Alert.alert(pick(t.alerts.errorTitle as any, language), pick(t.alerts.failedEncode as any, language));
          return;
        }

        const imageMessage: ChatMessageType = {
          id: `msg_${Date.now()}_image`,
          type: 'user',
          content: pick(t.imageSharePrompt as any, language),
          timestamp: new Date(),
          imageUri: asset.uri, // Keep URI for display
        };

        setMessages(prev => [...prev, imageMessage]);
        setIsLoading(true);

        try {
          // Send base64 image to AI
          const aiResponse = await aiTherapyService.processMessage(
            pick(t.imageAnalysisSystemPrompt as any, language),
            `data:image/jpeg;base64,${base64Image}` // Send as data URI
          );

          const aiMessage: ChatMessageType = {
            id: `msg_${Date.now()}_ai_image`,
            type: 'ai',
            content: safeText(aiResponse.response_text),
            timestamp: new Date(),
            aiResponse,
          };

          setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
          console.error('Error processing image:', error);
          
          const errorMessage: ChatMessageType = {
            id: `msg_${Date.now()}_error`,
            type: 'ai',
            content: "I apologize, but I encountered an issue analyzing your image. The visual content is important, and I'd love to discuss what you were expressing through your art. Could you describe what you drew and what it means to you?",
            timestamp: new Date(),
            aiResponse: {
              response_text: "Error processing image",
              technique: {
                method: "Support",
                name: "error_recovery",
                description: "Maintain therapeutic relationship during technical issues"
              },
              detected_emotion: "neutral",
              key_insights: ["Technical error with image processing"],
              next_recommendation: "Describe the image verbally",
              language: "english"
            }
          };

          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(pick(t.alerts.errorTitle as any, language), pick(t.alerts.selectImageFailed as any, language));
    }
  };

  const handleInteractionComplete = async (interactionData: any) => {
    // Build detailed message based on interaction type
    let userMessage = '';
    
    if (interactionData.type === 'breathing') {
      userMessage = `I completed a breathing exercise: ${interactionData.cycles} cycles over ${interactionData.duration} minutes. I feel more centered now.`;
    } else if (interactionData.type === 'drawing') {
      userMessage = `I completed an art therapy drawing exercise and expressed my emotions through art.`;
    } else if (interactionData.type === 'journal') {
      userMessage = `I completed a journaling exercise and reflected on my thoughts and feelings.`;
    } else if (interactionData.type === 'emotion_tracker') {
      userMessage = `I viewed my emotional patterns and tracked my mood.`;
    } else {
      userMessage = `Completed ${interactionData.type} activity`;
    }

    // Create user message with activity details
    const interactionMessage: ChatMessageType = {
      id: `msg_${Date.now()}_interaction`,
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, interactionMessage]);
    setIsLoading(true);

    try {
      // Get AI response acknowledging the completed activity
  const aiResponse = await aiTherapyService.processMessage(userMessage);
      
      const aiMessage: ChatMessageType = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: safeText(aiResponse.response_text),
        timestamp: new Date(),
        aiResponse,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback message
      const followUpMessage: ChatMessageType = {
        id: `msg_${Date.now()}_followup`,
        type: 'ai',
        content: getFollowUpMessage(interactionData.type),
        timestamp: new Date(),
        aiResponse: {
          response_text: getFollowUpMessage(interactionData.type),
          technique: {
            method: "FollowUp",
            name: "activity_completion",
            description: "Acknowledge completion of therapeutic activity"
          },
          detected_emotion: "positive",
          key_insights: [`User completed ${interactionData.type} activity`],
          next_recommendation: "Continue sharing your thoughts and feelings",
          language: "english"
        }
      };

      setMessages(prev => [...prev, followUpMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFollowUpMessage = (activityType: string): string => {
    const messages = {
      breathing: "Great job with the breathing exercise! How are you feeling now? Notice any changes in your body or mind?",
      drawing: "Thank you for sharing your artistic expression. Art can reveal so much about our inner world. What did you notice while drawing?",
      journal: "I appreciate you taking the time to reflect and write. Writing can be a powerful tool for self-discovery. What insights did you gain?",
      emotion_tracker: "It's wonderful that you're tracking your emotions. Self-awareness is the first step toward emotional wellness. What patterns do you notice?"
    };

    return messages[activityType as keyof typeof messages] || "Thank you for completing that activity. How did it feel?";
  };

  const endSession = async () => {
    if (!currentSession) return;

    setIsLoading(true);

    try {
      // Calculate session duration
      const duration = Math.floor((new Date().getTime() - currentSession.startTime.getTime()) / 60000);

      // Generate AI summary
      const summaryData = await aiTherapyService.generateSessionSummary(messages);

      // Create CLIENT-SAFE summary (no sensitive clinical details)
      const clientSummary: ClientSessionSummary = {
        sessionDate: currentSession.startTime,
        duration,
        // Simplify emotions to general feelings (remove clinical terms)
        mainFeelings: summaryData.themes?.slice(0, 4).map((theme: string) => 
          theme.replace(/_/g, ' ').toLowerCase()
        ) || ['reflection', 'awareness', 'growth'],
        // Simplify activities (no detailed clinical techniques)
        practiceActivities: summaryData.homework?.slice(0, 3) || [
          'Take time to reflect on today\'s conversation',
          'Practice self-compassion',
          'Notice your feelings without judgment'
        ],
        // Positive, encouraging message
        encouragement: summaryData.nextSteps || 
          'You took an important step today by being here. Continue being kind to yourself and remember that growth is a journey, not a destination. You\'re doing great! 💚',
        // Optional growth note (positive spin on progress)
        personalGrowth: summaryData.progressScore && summaryData.progressScore >= 60 
          ? 'You showed great openness and willingness to explore your feelings today.' 
          : 'Every session is a step forward. Your commitment to your wellbeing matters.'
      };

      // Save session (with full clinical data in storage)
      const updatedSession = {
        ...currentSession,
        endTime: new Date(),
        messages,
      };

      await aiTherapyService.saveSession(updatedSession);
      
      setIsLoading(false);

      // Show CLIENT-SAFE summary in modal
      setSessionSummary(clientSummary);
      setShowSummaryModal(true);
    } catch (error) {
      setIsLoading(false);
  Alert.alert(pick(t.alerts.sessionSavedTitle as any, language), pick(t.alerts.sessionSavedText as any, language));
      
      // Fallback: just save session
      const updatedSession = {
        ...currentSession,
        endTime: new Date(),
        messages,
      };
      await aiTherapyService.saveSession(updatedSession);
      
      Alert.alert(pick(t.alerts.startNewTitle as any, language), pick(t.alerts.startNewText as any, language), [
        {
          text: pick(t.alerts.yesStartFresh as any, language),
          onPress: () => {
            setMessages([]);
            setCurrentSession(null);
            initializeSession();
          },
        },
        { text: pick(t.alerts.stayHere as any, language), style: 'cancel' }
      ]);
    }
  };

  const animatedContainer = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }],
    };
  });

  return (
  <SafeAreaView style={[therapyStyles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top','bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={isDark ? [theme.colors.background, theme.colors.surface] : [TherapyColors.background, '#FFFFFF']}
          style={[therapyStyles.container, { backgroundColor: theme.colors.background }]}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? theme.colors.border : '#E1E8ED',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18 }}>🌸</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[therapyStyles.subtitle, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">Dr. Sophia Chen, PhD, LCSW</Text>
                <Text style={[therapyStyles.caption, { color: theme.colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
                  {isLoading 
                    ? pick(t.headerStatuses.analyzing as any, language)
                    : isOpenAIConnected 
                      ? pick(t.headerStatuses.pro as any, language)
                      : pick(t.headerStatuses.core as any, language)
                  }
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={endSession}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(231, 76, 60, 0.2)' : 'rgba(255, 59, 92, 0.12)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(231, 76, 60, 0.4)' : 'rgba(255, 59, 92, 0.3)',
                shadowColor: '#FF3B5C',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="stop-circle" 
                size={16} 
                color="#FF3B5C" 
                style={{ marginRight: 6 }}
              />
              <Text numberOfLines={1} ellipsizeMode="clip" style={{
                color: '#FF3B5C',
                fontSize: 13,
                fontWeight: '700',
                letterSpacing: 0.3
              }}>
                {pick(t.endSession as any, language)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <Animated.View style={[{ flex: 1 }, animatedContainer]}>
            <ScrollView
              ref={scrollViewRef}
              style={[therapyStyles.chatMessagesContainer, { backgroundColor: theme.colors.background }]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {messages
                .filter((m) => {
                  const hasImage = !!m.imageUri;
                  const text = typeof m.content === 'string'
                    ? m.content.trim()
                    : (m.content ? JSON.stringify(m.content).trim() : '');
                  // Hide empty text-only messages to avoid blank bubbles
                  return hasImage || text.length > 0;
                })
                .map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onInteractionComplete={handleInteractionComplete}
                />
              ))}
              
              {/* Typing indicator - professional animated dots */}
              {isLoading && <TypingIndicator />}
            </ScrollView>
          </Animated.View>

          {/* Input area - always above keyboard and navigation bar */}
          <View style={{
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingBottom: isKeyboardVisible ? 10 : 75, // Less padding when keyboard is visible
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 8,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: isDark ? theme.colors.surface : '#F5F8FA',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginRight: 8,
                  minHeight: 44,
                  maxHeight: 150,
                  fontSize: 16,
                  lineHeight: 22,
                  color: theme.colors.text,
                }}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isFirstMessage ? pick(t.inputPlaceholderFirst as any, language) : pick(t.inputPlaceholderNext as any, language)}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
              />
              
              <TouchableOpacity
                onPress={handleImagePicker}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: TherapyColors.support,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Ionicons name="camera" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (!inputText.trim() || isLoading) ? 0.4 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Ionicons 
                  name={isLoading ? "hourglass" : "paper-plane"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Session Summary Modal - CLIENT-SAFE VERSION */}
      <Modal
        visible={showSummaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        {sessionSummary && (
          <ClientSessionSummaryCard
            summary={sessionSummary}
            onClose={() => {
              setShowSummaryModal(false);
              // Ask if user wants to start new session
              Alert.alert(
                'Start New Session?',
                'Would you like to begin a new therapy session?',
                [
                  {
                    text: 'Yes, Start Fresh',
                    onPress: () => {
                      setMessages([]);
                      setCurrentSession(null);
                      setSessionSummary(null);
                      initializeSession();
                    },
                  },
                  {
                    text: 'Stay Here',
                    style: 'cancel'
                  }
                ]
              );
            }}
            onSave={async () => {
              // Save summary to user's personal history
              Alert.alert(pick(t.alerts.savedTitle as any, language), pick(t.alerts.savedText as any, language));
              setShowSummaryModal(false);
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default AITherapyChatScreen;
