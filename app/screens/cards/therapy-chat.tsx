import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cardSessionStorage, OngoingCardSession } from '@/services/cardSessionStorage';
import cardTherapyService, { CardContext, ChatMessage } from '@/services/cardTherapyService';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ClientSessionSummaryCard, { ClientSessionSummary } from '../../../components/ClientSessionSummaryCard';

// Helper to pick translation
const pick = <T extends Record<string, any>>(obj: T, lang: AppLanguage): string => {
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
};

// Multilingual translations
const T = {
  continueSessionTitle: {
    en: 'Continue Session?',
    ka: 'გავაგრძელოთ სესია?',
    ru: 'Продолжить сессию?',
    hy: 'Շարունակե՞լ սեանսը',
    tr: 'Oturuma Devam Et?',
    az: 'Seansa Davam?',
    es: '¿Continuar Sesión?',
    de: 'Sitzung fortsetzen?',
    fr: 'Continuer la Séance?',
    pt: 'Continuar Sessão?',
    id: 'Lanjutkan Sesi?',
    it: 'Continuare la Sessione?',
    ar: 'متابعة الجلسة؟',
    hi: 'सत्र जारी रखें?',
    zh: '继续会话？',
    ja: 'セッションを続けますか？',
    ko: '세션을 계속하시겠습니까?',
    uk: 'Продовжити сесію?',
    pl: 'Kontynuować Sesję?',
  },
  continueSessionMessage: {
    en: 'You have an ongoing session with this card. Continue it or start a new one? (Previous session will be saved)',
    ka: 'თქვენ გაქვთ მიმდინარე სესია ამ ბარათზე. გააგრძელოთ თუ ახალი დაიწყოთ? (წინა სესია შენახული იქნება)',
    ru: 'У вас есть сессия с этой картой. Продолжить её или начать новую? (Предыдущая сессия будет сохранена)',
    hy: 'Դուք ունեք սեանս այս քարտով: Շարունակե՞լ այն, թե սկսել նորը: (Նախորդ սեանսը կպահպանվի)',
    tr: 'Bu kartla devam eden bir oturumunuz var. Devam et veya yenisini başlat? (Önceki oturum kaydedilecek)',
    az: 'Bu kartla davam edən seansınız var. Davam edin və ya yenisini başlayın? (Əvvəlki seans saxlanacaq)',
    es: 'Tienes una sesión con esta carta. ¿Continuarla o iniciar una nueva? (La sesión anterior se guardará)',
    de: 'Sie haben eine Sitzung mit dieser Karte. Fortfahren oder neue beginnen? (Vorherige Sitzung wird gespeichert)',
    fr: 'Vous avez une séance avec cette carte. Continuer ou en commencer une nouvelle? (La séance précédente sera sauvegardée)',
    pt: 'Você tem uma sessão com este cartão. Continuar ou iniciar uma nova? (A sessão anterior será salva)',
    id: 'Anda memiliki sesi dengan kartu ini. Lanjutkan atau mulai yang baru? (Sesi sebelumnya akan disimpan)',
    it: 'Hai una sessione con questa carta. Continuare o iniziarne una nuova? (La sessione precedente verrà salvata)',
    ar: 'لديك جلسة مع هذه البطاقة. المتابعة أم البدء بجلسة جديدة؟ (سيتم حفظ الجلسة السابقة)',
    hi: 'इस कार्ड के साथ आपका एक सत्र है। जारी रखें या नया शुरू करें? (पिछला सत्र सहेजा जाएगा)',
    zh: '您有一个使用此卡的会话。继续它还是开始新的？（以前的会话将被保存）',
    ja: 'このカードでセッションがあります。続けますか、それとも新しいセッションを始めますか？（前のセッションは保存されます）',
    ko: '이 카드로 진행 중인 세션이 있습니다. 계속하시겠습니까, 아니면 새로 시작하시겠습니까? (이전 세션은 저장됩니다)',
    uk: 'У вас є сесія з цією карткою. Продовжити чи почати нову? (Попередня сесія буде збережена)',
    pl: 'Masz sesję z tą kartą. Kontynuować czy rozpocząć nową? (Poprzednia sesja zostanie zapisana)',
  },
  newSession: {
    en: 'New Session',
    ka: 'ახალი სესია',
    ru: 'Новая сессия',
    hy: 'Նոր սեանս',
    tr: 'Yeni Oturum',
    az: 'Yeni Seans',
    es: 'Nueva Sesión',
    de: 'Neue Sitzung',
    fr: 'Nouvelle Séance',
    pt: 'Nova Sessão',
    id: 'Sesi Baru',
    it: 'Nuova Sessione',
    ar: 'جلسة جديدة',
    hi: 'नया सत्र',
    zh: '新会话',
    ja: '新しいセッション',
    ko: '새 세션',
    uk: 'Нова сесія',
    pl: 'Nowa Sesja',
  },
  continue: {
    en: 'Continue',
    ka: 'გაგრძელება',
    ru: 'Продолжить',
    hy: 'Շարունակել',
    tr: 'Devam Et',
    az: 'Davam et',
    es: 'Continuar',
    de: 'Fortsetzen',
    fr: 'Continuer',
    pt: 'Continuar',
    id: 'Lanjutkan',
    it: 'Continua',
    ar: 'متابعة',
    hi: 'जारी रखें',
    zh: '继续',
    ja: '続ける',
    ko: '계속',
    uk: 'Продовжити',
    pl: 'Kontynuuj',
  },
  errorTitle: {
    en: 'Error',
    ka: 'შეცდომა',
    ru: 'Ошибка',
    hy: 'Սխալ',
    tr: 'Hata',
    az: 'Xəta',
    es: 'Error',
    de: 'Fehler',
    fr: 'Erreur',
    pt: 'Erro',
    id: 'Kesalahan',
    it: 'Errore',
    ar: 'خطأ',
    hi: 'त्रुटि',
    zh: '错误',
    ja: 'エラー',
    ko: '오류',
    uk: 'Помилка',
    pl: 'Błąd',
  },
  sendMessageError: {
    en: 'Failed to send message',
    ka: 'შეტყობინების გაგზავნა ვერ მოხერხდა',
    ru: 'Не удалось отправить сообщение',
    hy: 'Հաղորդագրությունը չհաջողվեց ուղարկել',
    tr: 'Mesaj gönderilemedi',
    az: 'Mesaj göndərilə bilmədi',
    es: 'No se pudo enviar el mensaje',
    de: 'Nachricht konnte nicht gesendet werden',
    fr: 'Échec de l\'envoi du message',
    pt: 'Falha ao enviar mensagem',
    id: 'Gagal mengirim pesan',
    it: 'Impossibile inviare il messaggio',
    ar: 'فشل إرسال الرسالة',
    hi: 'संदेश भेजने में विफल',
    zh: '发送消息失败',
    ja: 'メッセージの送信に失敗しました',
    ko: '메시지 전송 실패',
    uk: 'Не вдалося надіслати повідомлення',
    pl: 'Nie udało się wysłać wiadomości',
  },
  closeSession: {
    en: 'Close Session',
    ka: 'სესიის დახურვა',
    ru: 'Закрыть сессию',
    hy: 'Փակել սեանսը',
    tr: 'Oturumu Kapat',
    az: 'Seansı bağla',
    es: 'Cerrar Sesión',
    de: 'Sitzung schließen',
    fr: 'Fermer la Séance',
    pt: 'Fechar Sessão',
    id: 'Tutup Sesi',
    it: 'Chiudi Sessione',
    ar: 'إغلاق الجلسة',
    hi: 'सत्र बंद करें',
    zh: '关闭会话',
    ja: 'セッションを閉じる',
    ko: '세션 닫기',
    uk: 'Закрити сесію',
    pl: 'Zamknij Sesję',
  },
  typePlaceholder: {
    en: 'Type your message...',
    ka: 'ჩაწერეთ თქვენი შეტყობინება...',
    ru: 'Введите сообщение...',
    hy: 'Մուտքագրեք ձեր հաղորդագրությունը...',
    tr: 'Mesajınızı yazın...',
    az: 'Mesajınızı yazın...',
    es: 'Escribe tu mensaje...',
    de: 'Geben Sie Ihre Nachricht ein...',
    fr: 'Tapez votre message...',
    pt: 'Digite sua mensagem...',
    id: 'Ketik pesan Anda...',
    it: 'Scrivi il tuo messaggio...',
    ar: 'اكتب رسالتك...',
    hi: 'अपना संदेश लिखें...',
    zh: '输入您的消息...',
    ja: 'メッセージを入力...',
    ko: '메시지를 입력하세요...',
    uk: 'Введіть повідомлення...',
    pl: 'Wpisz swoją wiadomość...',
  },
  emotionTherapy: {
    en: 'Emotion Therapy',
    ka: 'ემოციური თერაპია',
    ru: 'Эмоциональная терапия',
    hy: 'Զգացմունքային թերապիա',
    tr: 'Duygu Terapisi',
    az: 'Emosiya Terapiyası',
    es: 'Terapia de Emoción',
    de: 'Emotionstherapie',
    fr: 'Thérapie Émotionnelle',
    pt: 'Terapia de Emoção',
    id: 'Terapi Emosi',
    it: 'Terapia delle Emozioni',
    ar: 'علاج العواطف',
    hi: 'भावना चिकित्सा',
    zh: '情感治疗',
    ja: '感情療法',
    ko: '감정 치료',
    uk: 'Емоційна терапія',
    pl: 'Terapia Emocji',
  },
  resourceWork: {
    en: 'Resource Work',
    ka: 'რესურსებთან მუშაობა',
    ru: 'Работа с ресурсами',
    hy: 'Ռեսուրսների հետ աշխատանք',
    tr: 'Kaynak Çalışması',
    az: 'Resurs işi',
    es: 'Trabajo de Recursos',
    de: 'Ressourcenarbeit',
    fr: 'Travail sur les Ressources',
    pt: 'Trabalho de Recursos',
    id: 'Kerja Sumber Daya',
    it: 'Lavoro sulle Risorse',
    ar: 'العمل على الموارد',
    hi: 'संसाधन कार्य',
    zh: '资源工作',
    ja: 'リソースワーク',
    ko: '자원 작업',
    uk: 'Робота з ресурсами',
    pl: 'Praca z Zasobami',
  },
  polarityIntegration: {
    en: 'Polarity Integration',
    ka: 'პოლარობის ინტეგრაცია',
    ru: 'Интеграция полярностей',
    hy: 'Բևեռայնության ինտեգրում',
    tr: 'Polarite Entegrasyonu',
    az: 'Polyarlığın inteqrasiyası',
    es: 'Integración de Polaridad',
    de: 'Polaritätsintegration',
    fr: 'Intégration de la Polarité',
    pt: 'Integração de Polaridade',
    id: 'Integrasi Polaritas',
    it: 'Integrazione della Polarità',
    ar: 'تكامل القطبية',
    hi: 'ध्रुवता एकीकरण',
    zh: '极性整合',
    ja: '極性統合',
    ko: '극성 통합',
    uk: 'Інтеграція полярностей',
    pl: 'Integracja Polarności',
  },
  narrativeTherapy: {
    en: 'Narrative Therapy',
    ka: 'ნარატიული თერაპია',
    ru: 'Нарративная терапия',
    hy: 'Պատմողական թերապիա',
    tr: 'Anlatı Terapisi',
    az: 'Narrativ terapiya',
    es: 'Terapia Narrativa',
    de: 'Narrative Therapie',
    fr: 'Thérapie Narrative',
    pt: 'Terapia Narrativa',
    id: 'Terapi Naratif',
    it: 'Terapia Narrativa',
    ar: 'العلاج السردي',
    hi: 'कथा चिकित्सा',
    zh: '叙事治疗',
    ja: 'ナラティブセラピー',
    ko: '서사 치료',
    uk: 'Наративна терапія',
    pl: 'Terapia Narracyjna',
  },
  therapySession: {
    en: 'Therapy Session',
    ka: 'თერაპიული სესია',
    ru: 'Терапевтическая сессия',
    hy: 'Թերապևտիկ սեանս',
    tr: 'Terapötik Seans',
    az: 'Terapevtik seans',
    es: 'Sesión Terapéutica',
    de: 'Therapiesitzung',
    fr: 'Séance Thérapeutique',
    pt: 'Sessão Terapêutica',
    id: 'Sesi Terapi',
    it: 'Sessione Terapeutica',
    ar: 'جلسة علاجية',
    hi: 'चिकित्सा सत्र',
    zh: '治疗会话',
    ja: 'セラピーセッション',
    ko: '치료 세션',
    uk: 'Терапевтична сесія',
    pl: 'Sesja Terapeutyczna',
  },
  resumed: {
    en: 'Resumed',
    ka: 'გაგრძელებული',
    ru: 'Продолжено',
    hy: 'Վերսկսված',
    tr: 'Devam Ediyor',
    az: 'Davam edir',
    es: 'Reanudado',
    de: 'Fortgesetzt',
    fr: 'Repris',
    pt: 'Retomado',
    id: 'Dilanjutkan',
    it: 'Ripreso',
    ar: 'مستأنف',
    hi: 'फिर से शुरू',
    zh: '已恢复',
    ja: '再開',
    ko: '재개됨',
    uk: 'Відновлено',
    pl: 'Wznowiono',
  },
  activeSession: {
    en: 'Active session',
    ka: 'აქტიური სესია',
    ru: 'Активная сессия',
    hy: 'Ակտիվ սեանս',
    tr: 'Aktif oturum',
    az: 'Aktiv seans',
    es: 'Sesión activa',
    de: 'Aktive Sitzung',
    fr: 'Séance active',
    pt: 'Sessão ativa',
    id: 'Sesi aktif',
    it: 'Sessione attiva',
    ar: 'جلسة نشطة',
    hi: 'सक्रिय सत्र',
    zh: '活动会话',
    ja: 'アクティブなセッション',
    ko: '활성 세션',
    uk: 'Активна сесія',
    pl: 'Aktywna sesja',
  },
  sessionComplete: {
    en: '✨ Session complete. Your summary is ready.',
    ka: '✨ სესია დასრულდა. თქვენი შეჯამება მზადაა.',
    ru: '✨ Сессия завершена. Ваше резюме готово.',
    hy: '✨ Սեանսը ավարտված է: Ձեր ամփոփումը պատրաստ է:',
    tr: '✨ Oturum tamamlandı. Özetiniz hazır.',
    az: '✨ Seans tamamlandı. Xülasəniz hazırdır.',
    es: '✨ Sesión completa. Tu resumen está listo.',
    de: '✨ Sitzung abgeschlossen. Ihre Zusammenfassung ist fertig.',
    fr: '✨ Séance terminée. Votre résumé est prêt.',
    pt: '✨ Sessão concluída. Seu resumo está pronto.',
    id: '✨ Sesi selesai. Ringkasan Anda siap.',
    it: '✨ Sessione completata. Il tuo riepilogo è pronto.',
    ar: '✨ اكتملت الجلسة. ملخصك جاهز.',
    hi: '✨ सत्र पूर्ण। आपका सारांश तैयार है।',
    zh: '✨ 会话完成。您的摘要已准备好。',
    ja: '✨ セッション完了。要約の準備ができました。',
    ko: '✨ 세션 완료. 요약이 준비되었습니다.',
    uk: '✨ Сесія завершена. Ваше резюме готове.',
    pl: '✨ Sesja zakończona. Twoje podsumowanie jest gotowe.',
  },
  endSessionTitle: {
    en: 'End Session?',
    ka: 'დავასრულოთ სესია?',
    ru: 'Завершить сессию?',
    hy: 'Ավարտե՞լ սեանսը',
    tr: 'Oturumu Bitir?',
    az: 'Seansı bitir?',
    es: '¿Finalizar Sesión?',
    de: 'Sitzung beenden?',
    fr: 'Terminer la Séance?',
    pt: 'Encerrar Sessão?',
    id: 'Akhiri Sesi?',
    it: 'Terminare la Sessione?',
    ar: 'إنهاء الجلسة؟',
    hi: 'सत्र समाप्त करें?',
    zh: '结束会话？',
    ja: 'セッションを終了しますか？',
    ko: '세션을 종료하시겠습니까?',
    uk: 'Завершити сесію?',
    pl: 'Zakończyć Sesję?',
  },
  endSessionMessage: {
    en: 'Do you want to end the therapeutic session and receive a summary?',
    ka: 'გსურთ თერაპიული სესიის დასრულება და შეჯამების მიღება?',
    ru: 'Вы хотите завершить терапевтическую сессию и получить резюме?',
    hy: 'Ցանկանու՞մ եք ավարտել թերապևտիկ սեանսը և ստանալ ամփոփում:',
    tr: 'Terapötik seansı bitirmek ve özet almak ister misiniz?',
    az: 'Terapevtik seansı bitirmək və xülasə almaq istəyirsiniz?',
    es: '¿Quieres finalizar la sesión terapéutica y recibir un resumen?',
    de: 'Möchten Sie die therapeutische Sitzung beenden und eine Zusammenfassung erhalten?',
    fr: 'Voulez-vous terminer la séance thérapeutique et recevoir un résumé?',
    pt: 'Deseja encerrar a sessão terapêutica e receber um resumo?',
    id: 'Apakah Anda ingin mengakhiri sesi terapi dan menerima ringkasan?',
    it: 'Vuoi terminare la sessione terapeutica e ricevere un riepilogo?',
    ar: 'هل تريد إنهاء الجلسة العلاجية والحصول على ملخص؟',
    hi: 'क्या आप चिकित्सीय सत्र समाप्त करना और सारांश प्राप्त करना चाहते हैं?',
    zh: '您想结束治疗会话并接收摘要吗？',
    ja: 'セラピーセッションを終了して要約を受け取りますか？',
    ko: '치료 세션을 종료하고 요약을 받으시겠습니까?',
    uk: 'Ви хочете завершити терапевтичну сесію та отримати резюме?',
    pl: 'Czy chcesz zakończyć sesję terapeutyczną i otrzymać podsumowanie?',
  },
  cancel: {
    en: 'Cancel',
    ka: 'გაუქმება',
    ru: 'Отмена',
    hy: 'Չեղարկել',
    tr: 'İptal',
    az: 'Ləğv et',
    es: 'Cancelar',
    de: 'Abbrechen',
    fr: 'Annuler',
    pt: 'Cancelar',
    id: 'Batal',
    it: 'Annulla',
    ar: 'إلغاء',
    hi: 'रद्द करें',
    zh: '取消',
    ja: 'キャンセル',
    ko: '취소',
    uk: 'Скасувати',
    pl: 'Anuluj',
  },
  yesEndSession: {
    en: 'Yes, End Session',
    ka: 'დიახ, დავასრულოთ',
    ru: 'Да, завершить',
    hy: 'Այո, ավարտել',
    tr: 'Evet, Bitir',
    az: 'Bəli, bitir',
    es: 'Sí, Finalizar',
    de: 'Ja, Beenden',
    fr: 'Oui, Terminer',
    pt: 'Sim, Encerrar',
    id: 'Ya, Akhiri',
    it: 'Sì, Termina',
    ar: 'نعم، إنهاء',
    hi: 'हां, समाप्त करें',
    zh: '是的，结束',
    ja: 'はい、終了',
    ko: '예, 종료',
    uk: 'Так, завершити',
    pl: 'Tak, Zakończ',
  },
};

export default function CardTherapyChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [cardImage, setCardImage] = useState<any>(null);
  const [positiveImage, setPositiveImage] = useState<any>(null);
  const [negativeImage, setNegativeImage] = useState<any>(null);
  const [cardImageBase64, setCardImageBase64] = useState<string | null>(null);
  const [positiveImageBase64, setPositiveImageBase64] = useState<string | null>(null);
  const [negativeImageBase64, setNegativeImageBase64] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  const flatListRef = useRef<FlatList>(null);

  // Extract card context from params
  const cardContext: CardContext = {
    cardType: params.context as any,
    cardId: params.cardId as string,
    positiveCardId: params.positive_card_id as string,
    negativeCardId: params.negative_card_id as string,
    language: language, // Add user's language for multilingual support
  };

  // Check for ongoing session and restore if found
  useEffect(() => {
    const checkOngoingSession = async () => {
      try {
        // Get ongoing session for this specific card context
        const ongoingSession = await cardSessionStorage.getOngoingSession(cardContext);
        const autoRestore = params.autoRestore === 'true'; // Check if coming from history
        
        // Check if we found a matching session
        const isSameCard = ongoingSession !== null;
        
        if (isSameCard) {
          if (autoRestore) {
            // Auto-restore without asking (coming from sessions history)
            setSessionId(ongoingSession.id);
            setMessages(ongoingSession.messages);
            setSessionStartTime(ongoingSession.startedAt);
            setIsRestoredSession(true);
            
            if (ongoingSession.cardImageBase64) setCardImageBase64(ongoingSession.cardImageBase64);
            if (ongoingSession.positiveImageBase64) setPositiveImageBase64(ongoingSession.positiveImageBase64);
            if (ongoingSession.negativeImageBase64) setNegativeImageBase64(ongoingSession.negativeImageBase64);
          } else {
            // Ask user if they want to continue the session
            Alert.alert(
              pick(T.continueSessionTitle, language),
              pick(T.continueSessionMessage, language),
              [
                {
                  text: pick(T.newSession, language),
                  onPress: () => {
                    // Don't delete the old session - just create a new one
                    // The old one will remain in ongoing sessions list
                    const newId = cardSessionStorage.generateSessionId();
                    console.log('🆕 Creating new session:', newId, 'Old session remains saved');
                    setSessionId(newId);
                    setSessionStartTime(Date.now());
                    setMessages([]); // Clear messages for new session
                    setIsRestoredSession(false); // Mark as new session
                  },
                },
                {
                  text: pick(T.continue, language),
                  onPress: () => {
                    // Restore session
                    setSessionId(ongoingSession.id);
                    setMessages(ongoingSession.messages);
                    setSessionStartTime(ongoingSession.startedAt);
                    setIsRestoredSession(true);
                    
                    if (ongoingSession.cardImageBase64) setCardImageBase64(ongoingSession.cardImageBase64);
                    if (ongoingSession.positiveImageBase64) setPositiveImageBase64(ongoingSession.positiveImageBase64);
                    if (ongoingSession.negativeImageBase64) setNegativeImageBase64(ongoingSession.negativeImageBase64);
                  },
                  style: 'default',
                },
              ]
            );
          }
        } else {
          // Different card or no ongoing session - create new
          const newId = cardSessionStorage.generateSessionId();
          setSessionId(newId);
          setSessionStartTime(Date.now());
          
          // If there was an ongoing session with different card, optionally notify user
          if (ongoingSession) {
            console.log('Starting new session with different card, previous session still saved');
          }
        }
      } catch (error) {
        console.error('Failed to check ongoing session:', error);
        const newId = cardSessionStorage.generateSessionId();
        setSessionId(newId);
        setSessionStartTime(Date.now());
      }
    };

    checkOngoingSession();
  }, [language, cardContext.cardType, cardContext.cardId, cardContext.positiveCardId, cardContext.negativeCardId, params.autoRestore]);

  // Parse image URIs from params (run only once on mount)
  const paramsProcessed = useRef(false);
  
  useEffect(() => {
    if (paramsProcessed.current) return;
    paramsProcessed.current = true;

    if (params.cardImageUri) {
      try {
        const uri = JSON.parse(params.cardImageUri as string);
        setCardImage(uri);
      } catch (e) {
        console.error('Failed to parse card image URI');
      }
    }

    if (params.positiveCardImageUri) {
      try {
        const uri = JSON.parse(params.positiveCardImageUri as string);
        setPositiveImage(uri);
      } catch (e) {
        console.error('Failed to parse positive card image URI');
      }
    }

    if (params.negativeCardImageUri) {
      try {
        const uri = JSON.parse(params.negativeCardImageUri as string);
        setNegativeImage(uri);
      } catch (e) {
        console.error('Failed to parse negative card image URI');
      }
    }
  }, []); // Empty array - run only once

  // Convert images to base64
  const convertImageToBase64 = async (imageUri: any): Promise<string | null> => {
    try {
      let uriToFetch: string | null = null;

      // Handle different input types
      if (typeof imageUri === 'object' && imageUri !== null) {
        uriToFetch = imageUri.uri;
      } else if (typeof imageUri === 'number') {
        const { Image: RNImage } = require('react-native');
        const resolved = RNImage.resolveAssetSource(imageUri);
        uriToFetch = resolved?.uri;
      } else if (typeof imageUri === 'string') {
        uriToFetch = imageUri;
      }

      if (!uriToFetch) {
        return null;
      }
      
      const response = await fetch(uriToFetch);
      if (!response.ok) {
        return null;
      }
      
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          resolve(dataUri);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return null;
    }
  };

  // Parse JSON session summary from message content
  const parseSessionSummary = (content: string): { summary: ClientSessionSummary | null, textBeforeJson: string } => {
    try {
      // Find JSON block in message (after closing message text)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (!jsonMatch) {
        return { summary: null, textBeforeJson: content };
      }

      const textBeforeJson = content.substring(0, jsonMatch.index).trim();
      const jsonString = jsonMatch[1];
      const parsed = JSON.parse(jsonString);

      // Map detailed clinical JSON to client-friendly summary
      const clientSummary: ClientSessionSummary = {
        sessionDate: new Date(parsed.session_details?.date || Date.now()),
        duration: parseInt(parsed.session_details?.session_duration || '20'),
        mainFeelings: parsed.emotional_landscape?.primary_emotions?.map((e: any) => e.emotion || e.description).filter(Boolean) || [],
        practiceActivities: [
          parsed.next_steps_and_intentions?.action,
          parsed.resources_and_support?.grounding_practice,
          parsed.resources_and_support?.journaling_prompt
        ].filter(Boolean),
        encouragement: parsed.next_steps_and_intentions?.closing_reflection || parsed.closing_message || '',
        personalGrowth: parsed.key_insights_and_themes?.join(' ') || parsed.resources_and_strengths?.[0]?.description
      };

      return { summary: clientSummary, textBeforeJson };
    } catch (error) {
      console.error('Failed to parse session summary:', error);
      return { summary: null, textBeforeJson: content };
    }
  };

  // Track if session has been initialized
  const sessionInitialized = useRef(false);
  
  // Reset session initialization when sessionId changes (new session created)
  useEffect(() => {
    if (sessionId) {
      sessionInitialized.current = false;
      console.log('🔄 Session changed, reset initialization flag:', sessionId);
    }
  }, [sessionId]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate header on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-scroll to bottom when messages update (especially during streaming)
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure FlatList has rendered the new content
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Auto-save session after every message (with debounce for streaming)
  useEffect(() => {
    const saveSession = async () => {
      // Only save if there are actual messages (not just initial AI message)
      if (!sessionId || messages.length <= 1 || sessionClosed) return;

      try {
        const exchangeCount = cardTherapyService.countExchanges(messages);
        const ongoingSession: OngoingCardSession = {
          id: sessionId,
          cardContext,
          messages,
          cardImageBase64,
          positiveImageBase64,
          negativeImageBase64,
          startedAt: sessionStartTime,
          lastUpdatedAt: Date.now(),
          exchangeCount,
        };

        await cardSessionStorage.saveOngoingSession(ongoingSession);
        console.log('✅ Auto-saved session:', sessionId, 'messages:', messages.length);
      } catch (error) {
        console.error('❌ Failed to auto-save session:', error);
      }
    };

    // Debounce save during streaming (500ms), but save immediately after complete messages
    const lastMessage = messages[messages.length - 1];
    const isStreamingInProgress = isTyping && lastMessage?.role === 'assistant' && lastMessage?.content;
    
    if (isStreamingInProgress) {
      // During streaming, debounce to avoid too frequent saves
      const timeoutId = setTimeout(saveSession, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // After complete message, save immediately
      saveSession();
    }
  }, [messages, sessionId, cardContext, cardImageBase64, positiveImageBase64, negativeImageBase64, sessionClosed, sessionStartTime, isTyping]);

  // Initialize session once when images are ready OR when sessionId changes
  useEffect(() => {
    // Don't initialize if already done for this sessionId
    if (sessionInitialized.current) return;
    
    // Need sessionId to initialize
    if (!sessionId) return;
    
    // Wait for cardContext to be available
    if (!cardContext.cardType) return;
    
    // For positive/negative cards, wait for both images
    if (cardContext.cardType === 'positive_negative') {
      if (!positiveImage || !negativeImage) return;
    } else {
      // For other card types, wait for single image
      if (!cardImage) return;
    }
    
    // Skip initialization if we have restored messages (session continuation)
    if (isRestoredSession && messages.length > 0) {
      console.log('⏭️ Skipping initialization - restored session with', messages.length, 'messages');
      sessionInitialized.current = true;
      return;
    }
    
    console.log('🚀 Initializing new session:', sessionId);
    sessionInitialized.current = true;
    initializeSession();
  }, [sessionId, cardContext.cardType, cardImage, positiveImage, negativeImage, isRestoredSession, messages.length]);

  const initializeSession = async () => {
    setIsLoading(true);
    try {
      let imageBase64: string | null = null;
      let positiveBase64: string | null = null;
      let negativeBase64: string | null = null;

      if (cardImage) {
        imageBase64 = await convertImageToBase64(cardImage);
      }
      
      if (positiveImage) {
        positiveBase64 = await convertImageToBase64(positiveImage);
      }
      
      if (negativeImage) {
        negativeBase64 = await convertImageToBase64(negativeImage);
      }

      const welcomeMessage = await cardTherapyService.startSession(
        cardContext,
        imageBase64,
        positiveBase64,
        negativeBase64
      );
      
      setMessages([
        {
          role: 'assistant',
          content: welcomeMessage,
        },
      ]);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      Alert.alert(
        language === 'ru' ? 'Ошибка' : 'Error',
        language === 'ru' ? 'Не удалось начать сессию' : 'Failed to start session'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || sessionClosed) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setIsLoading(true);

    // Save user message immediately
    if (sessionId && !sessionClosed) {
      try {
        const messagesWithUser = [...messages, userMessage];
        const currentExchangeCount = cardTherapyService.countExchanges(messagesWithUser);
        await cardSessionStorage.saveOngoingSession({
          id: sessionId,
          cardContext,
          messages: messagesWithUser,
          cardImageBase64,
          positiveImageBase64,
          negativeImageBase64,
          startedAt: sessionStartTime,
          lastUpdatedAt: Date.now(),
          exchangeCount: currentExchangeCount,
        });
      } catch (saveError) {
        console.error('Failed to save user message:', saveError);
      }
    }

    // Create placeholder for streaming
    const assistantId = `assistant-${Date.now()}`;
    const placeholderMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      let fullResponse = '';

      await cardTherapyService.sendMessage(
        [...messages, userMessage],
        cardContext,
        (delta) => {
          fullResponse += delta;
          setMessages(prev => 
            prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, content: fullResponse } : m
            )
          );
        }
      );

      // Check if this is a summary message
      if (cardTherapyService.isSummaryMessage(fullResponse)) {
        setSessionClosed(true);
      }

      // Save session immediately after AI response (including the full response)
      if (sessionId && !sessionClosed) {
        try {
          const finalMessages = [
            ...messages,
            userMessage,
            { role: 'assistant' as const, content: fullResponse }
          ];
          
          const newExchangeCount = cardTherapyService.countExchanges(finalMessages);
          
          await cardSessionStorage.saveOngoingSession({
            id: sessionId,
            cardContext,
            messages: finalMessages,
            cardImageBase64,
            positiveImageBase64,
            negativeImageBase64,
            startedAt: sessionStartTime,
            lastUpdatedAt: Date.now(),
            exchangeCount: newExchangeCount,
          });
        } catch (saveError) {
          console.error('Failed to save session after AI response:', saveError);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.slice(0, -1)); // Remove placeholder
      Alert.alert(
        pick(T.errorTitle, language),
        pick(T.sendMessageError, language)
      );
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [inputText, messages, isLoading, sessionClosed, cardContext, language]);

  const handleRequestSummary = useCallback(async () => {
    if (isLoading) return;

    Alert.alert(
      pick(T.endSessionTitle, language),
      pick(T.endSessionMessage, language),
      [
        {
          text: pick(T.cancel, language),
          style: 'cancel',
        },
        {
          text: pick(T.yesEndSession, language),
          onPress: async () => {
            setIsLoading(true);
            setIsTyping(true);

            // Add placeholder for summary
            const placeholderMessage: ChatMessage = {
              role: 'assistant',
              content: '📝 Generating your session summary...',
            };
            setMessages(prev => [...prev, placeholderMessage]);

            try {
              const summary = await cardTherapyService.requestSummary(messages, cardContext);
              
              const updatedMessages = [
                ...messages,
                {
                  role: 'assistant' as const,
                  content: summary,
                },
              ];
              
              setMessages(prev => [
                ...prev.slice(0, -1),
                {
                  role: 'assistant',
                  content: summary,
                },
              ]);

              setSessionClosed(true);

              // Parse summary and save completed session
              const { summary: parsedSummary } = parseSessionSummary(summary);
              if (parsedSummary) {
                try {
                  await cardSessionStorage.saveCompletedSession({
                    id: sessionId,
                    cardContext,
                    messages: updatedMessages, // Save full message history
                    summary: parsedSummary,
                    cardImageBase64,
                    positiveImageBase64,
                    negativeImageBase64,
                    completedAt: Date.now(),
                    messageCount: updatedMessages.length,
                  });

                  // Clear ongoing session for this card context
                  await cardSessionStorage.clearOngoingSession(cardContext);
                } catch (saveError) {
                  console.error('Failed to save completed session:', saveError);
                }
              }
            } catch (error) {
              console.error('Failed to generate summary:', error);
              setMessages(prev => prev.slice(0, -1));
              Alert.alert(
                language === 'ru' ? 'Ошибка' : 'Error',
                language === 'ru' ? 'Не удалось создать резюме' : 'Failed to generate summary'
              );
            } finally {
              setIsLoading(false);
              setIsTyping(false);
            }
          },
        },
      ]
    );
  }, [messages, isLoading, cardContext, language]);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isLastMessage = index === messages.length - 1;
    const isSummary = cardTherapyService.isSummaryMessage(item.content);
    const isFirstAIMessage = !isUser && index === 0;

    // Check if this message contains a session summary JSON
    const { summary: sessionSummary, textBeforeJson } = !isUser ? parseSessionSummary(item.content) : { summary: null, textBeforeJson: '' };

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.aiMessage,
        ]}
      >
        {/* Show card images in first AI message */}
        {isFirstAIMessage && (cardImage || (positiveImage && negativeImage)) && (
          <View style={styles.messageCardImages}>
            {cardImage && (
              <View style={styles.messageCardSingle}>
                <Image source={cardImage} style={styles.messageCardImage} resizeMode="cover" />
              </View>
            )}
            {positiveImage && negativeImage && (
              <View style={styles.messageCardDual}>
                <View style={styles.messageCardItem}>
                  <Image source={positiveImage} style={styles.messageCardImageSmall} resizeMode="cover" />
                  <View style={[styles.messageCardBadge, styles.positiveBadge]}>
                    <Text style={styles.badgeTextSmall}>🟢 #{cardContext.positiveCardId}</Text>
                  </View>
                </View>
                <View style={styles.messageCardItem}>
                  <Image source={negativeImage} style={styles.messageCardImageSmall} resizeMode="cover" />
                  <View style={[styles.messageCardBadge, styles.negativeBadge]}>
                    <Text style={styles.badgeTextSmall}>🔴 #{cardContext.negativeCardId}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* If message has session summary, render the beautiful card */}
        {sessionSummary ? (
          <View style={styles.summaryContainer}>
            {/* Show closing message text before the summary */}
            {textBeforeJson && (
              <View style={[styles.messageBubble, styles.aiBubble, { marginBottom: 12 }]}>
                <Text style={[styles.messageText, styles.aiText]}>
                  {textBeforeJson}
                </Text>
              </View>
            )}
            {/* Beautiful session summary card */}
            <ClientSessionSummaryCard summary={sessionSummary} />
          </View>
        ) : (
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.aiBubble,
              isSummary && styles.summaryBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.aiText,
                isSummary && styles.summaryText,
              ]}
            >
              {item.content}
            </Text>

            {isLastMessage && isTyping && !isUser && (
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const getHeaderTitle = () => {
    switch (cardContext.cardType) {
      case 'emotion':
        return pick(T.emotionTherapy, language);
      case 'resource':
        return pick(T.resourceWork, language);
      case 'positive_negative':
        return pick(T.polarityIntegration, language);
      case 'narrative':
        return pick(T.narrativeTherapy, language);
      default:
        return pick(T.therapySession, language);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0f' : '#f5f7fa',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingTop: Platform.OS === 'ios' ? 10 : 14,
      minHeight: 70,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 0.2,
    },
    headerSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 3,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.textMuted,
      letterSpacing: 0.1,
    },
    restoredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    restoredText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#4CAF50',
      letterSpacing: 0.2,
    },
    historyButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    messageContainer: {
      marginVertical: 8,
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    aiMessage: {
      alignItems: 'flex-start',
    },
    summaryContainer: {
      width: '100%',
      maxWidth: '95%',
    },
    messageBubble: {
      maxWidth: '82%',
      borderRadius: 20,
      padding: 14,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 6,
    },
    aiBubble: {
      backgroundColor: isDark ? '#1f1f2e' : '#ffffff',
      borderWidth: 0,
      borderBottomLeftRadius: 6,
    },
    summaryBubble: {
      maxWidth: '94%',
      backgroundColor: isDark ? '#1a1a2e' : '#f0f4ff',
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: 16,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 23,
      letterSpacing: 0.2,
    },
    userText: {
      color: '#ffffff',
      fontWeight: '500',
    },
    aiText: {
      color: theme.colors.text,
      fontWeight: '400',
    },
    summaryText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.text,
    },
    typingIndicator: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 6,
      alignItems: 'center',
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      opacity: 0.6,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      borderTopWidth: 0,
      gap: 12,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    textInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f7fa',
      borderRadius: 24,
      fontSize: 15,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    sendButtonDisabled: {
      opacity: 0.4,
      elevation: 0,
    },
    sessionClosedOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 24,
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    sessionClosedText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: 0.3,
    },
    closeSessionButton: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      elevation: 4,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    closeSessionButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    positiveBadge: {
      backgroundColor: '#4CAF50',
    },
    negativeBadge: {
      backgroundColor: '#F44336',
    },
    badgeTextSmall: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.2,
    },
    // Message card images (inside first AI message)
    messageCardImages: {
      marginBottom: 10,
      alignItems: 'flex-start',
      maxHeight: 140, // Prevent images from taking too much space
      overflow: 'hidden',
    },
    messageCardSingle: {
      alignItems: 'center',
    },
    messageCardImage: {
      width: 90,
      height: 120,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    messageCardDual: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
    },
    messageCardItem: {
      alignItems: 'center',
    },
    messageCardImageSmall: {
      width: 70,
      height: 93,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    },
    messageCardBadge: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
  });

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.text }}>
            {language === 'ru' ? 'Начинаем сессию...' : 'Starting session...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Modern Header with Gradient */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <LinearGradient
            colors={isDark 
              ? ['#1a1a2e', '#16213e', '#0f1629'] 
              : ['#ffffff', '#f8f9fa', '#f1f3f5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <FontAwesome5 name="chevron-left" size={16} color={theme.colors.text} />
              </TouchableOpacity>
              
              {/* Card Type Icon */}
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons 
                  name={
                    cardContext.cardType === 'emotion' ? 'heart' :
                    cardContext.cardType === 'resource' ? 'diamond-stone' :
                    cardContext.cardType === 'positive_negative' ? 'yin-yang' :
                    'book-open-page-variant'
                  }
                  size={20}
                  color={
                    cardContext.cardType === 'emotion' ? '#ff6b9d' :
                    cardContext.cardType === 'resource' ? '#00c851' :
                    cardContext.cardType === 'positive_negative' ? '#9c27b0' :
                    '#ff9800'
                  }
                />
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                <View style={styles.headerSubtitleRow}>
                  {isRestoredSession && (
                    <View style={styles.restoredBadge}>
                      <MaterialCommunityIcons name="restore" size={10} color="#4CAF50" />
                      <Text style={styles.restoredText}>
                        {pick(T.resumed, language)}
                      </Text>
                    </View>
                  )}
                  {!isRestoredSession && sessionStartTime && (
                    <Text style={styles.headerSubtitle}>
                      {pick(T.activeSession, language)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              {!sessionClosed && cardTherapyService.shouldSuggestSummary(messages) && (
                <TouchableOpacity onPress={handleRequestSummary} style={styles.summaryButton}>
                  <MaterialCommunityIcons name="file-document-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => router.push('/screens/cards/sessions-history')} 
                style={styles.historyButton}
              >
                <MaterialCommunityIcons 
                  name="history" 
                  size={18} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `message-${index}`}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            // Auto-scroll handled by useEffect, but keep this as backup
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* Input */}
        {!sessionClosed ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={pick(T.typePlaceholder, language)}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <FontAwesome5 name="paper-plane" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionClosedOverlay}>
            <Text style={styles.sessionClosedText}>
              {pick(T.sessionComplete, language)}
            </Text>
            <TouchableOpacity style={styles.closeSessionButton} onPress={() => router.back()}>
              <Text style={styles.closeSessionButtonText}>
                {pick(T.closeSession, language)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
