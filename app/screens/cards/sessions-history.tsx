import ClientSessionSummaryCard from '@/components/ClientSessionSummaryCard';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cardSessionStorage, CompletedCardSession, OngoingCardSession } from '@/services/cardSessionStorage';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Helper to pick translation
const pick = <T extends Record<string, any>>(obj: T, lang: AppLanguage): string => {
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
};

// Multilingual translations
const T = {
  headerTitle: { en: 'Session History', ka: 'სესიების ისტორია', ru: 'История сессий', hy: 'Սեանսների պատմություն', tr: 'Oturum Geçmişi', az: 'Seansların Tarixi', es: 'Historial de Sesiones', de: 'Sitzungsverlauf', fr: 'Historique des Séances', pt: 'Histórico de Sessões', id: 'Riwayat Sesi', it: 'Cronologia Sessioni', ar: 'سجل الجلسات', hi: 'सत्र इतिहास', zh: '会话历史', ja: 'セッション履歴', ko: '세션 기록', uk: 'Історія сесій', pl: 'Historia Sesji' },
  errorTitle: { en: 'Error', ka: 'შეცდომა', ru: 'Ошибка', hy: 'Սխալ', tr: 'Hata', az: 'Xəta', es: 'Error', de: 'Fehler', fr: 'Erreur', pt: 'Erro', id: 'Kesalahan', it: 'Errore', ar: 'خطأ', hi: 'त्रुटि', zh: '错误', ja: 'エラー', ko: '오류', uk: 'Помилка', pl: 'Błąd' },
  loadSessionsError: { en: 'Failed to load sessions', ka: 'სესიების ჩატვირთვა ვერ მოხერხდა', ru: 'Не удалось загрузить сессии', hy: 'Չհաջողվեց բեռնել սեանսները', tr: 'Oturumlar yüklenemedi', az: 'Seansları yükləmək mümkün olmadı', es: 'No se pudieron cargar las sesiones', de: 'Sitzungen konnten nicht geladen werden', fr: 'Échec du chargement des séances', pt: 'Falha ao carregar sessões', id: 'Gagal memuat sesi', it: 'Impossibile caricare le sessioni', ar: 'فشل تحميل الجلسات', hi: 'सत्र लोड करने में विफल', zh: '加载会话失败', ja: 'セッションの読み込みに失敗', ko: '세션 로드 실패', uk: 'Не вдалося завантажити сесії', pl: 'Nie udało się załadować sesji' },
  deleteSessionTitle: { en: 'Delete Session?', ka: 'წაიშალოს სესია?', ru: 'Удалить сессию?', hy: 'Ջնջե՞լ սեանսը', tr: 'Oturumu Sil?', az: 'Seansı sil?', es: '¿Eliminar Sesión?', de: 'Sitzung löschen?', fr: 'Supprimer la Séance?', pt: 'Excluir Sessão?', id: 'Hapus Sesi?', it: 'Eliminare Sessione?', ar: 'حذف الجلسة؟', hi: 'सत्र हटाएं?', zh: '删除会话？', ja: 'セッションを削除？', ko: '세션 삭제?', uk: 'Видалити сесію?', pl: 'Usunąć Sesję?' },
  deleteSessionMessage: { en: 'Are you sure you want to delete this session? This action cannot be undone.', ka: 'დარწმუნებული ხართ რომ გსურთ ამ სესიის წაშლა? ეს მოქმედება შეუქცევადია.', ru: 'Вы уверены, что хотите удалить эту сессию? Это действие необратимо.', hy: 'Համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս սեանսը: Այս գործողությունը հնարավոր չէ հետ շրջել:', tr: 'Bu oturumu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', az: 'Bu seansı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.', es: '¿Está seguro de que desea eliminar esta sesión? Esta acción no se puede deshacer.', de: 'Sind Sie sicher, dass Sie diese Sitzung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.', fr: 'Êtes-vous sûr de vouloir supprimer cette séance? Cette action ne peut pas être annulée.', pt: 'Tem certeza de que deseja excluir esta sessão? Esta ação não pode ser desfeita.', id: 'Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan.', it: 'Sei sicuro di voler eliminare questa sessione? Questa azione non può essere annullata.', ar: 'هل أنت متأكد من أنك تريد حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.', hi: 'क्या आप वाकई इस सत्र को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।', zh: '您确定要删除此会话吗？此操作无法撤消。', ja: 'このセッションを削除してもよろしいですか？この操作は元に戻せません。', ko: '이 세션을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', uk: 'Ви впевнені, що хочете видалити цю сесію? Цю дію не можна скасувати.', pl: 'Czy na pewno chcesz usunąć tę sesję? Ta akcja nie może zostać cofnięta.' },
  cancel: { en: 'Cancel', ka: 'გაუქმება', ru: 'Отмена', hy: 'Չեղարկել', tr: 'İptal', az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar', id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj' },
  delete: { en: 'Delete', ka: 'წაშლა', ru: 'Удалить', hy: 'Ջնջել', tr: 'Sil', az: 'Sil', es: 'Eliminar', de: 'Löschen', fr: 'Supprimer', pt: 'Excluir', id: 'Hapus', it: 'Elimina', ar: 'حذف', hi: 'हटाएं', zh: '删除', ja: '削除', ko: '삭제', uk: 'Видалити', pl: 'Usuń' },
  deleteSessionError: { en: 'Failed to delete session', ka: 'სესიის წაშლა ვერ მოხერხდა', ru: 'Не удалось удалить сессию', hy: 'Չհաջողվեց ջնջել սեանսը', tr: 'Oturum silinemedi', az: 'Seansı silmək mümkün olmadı', es: 'No se pudo eliminar la sesión', de: 'Sitzung konnte nicht gelöscht werden', fr: 'Échec de suppression de la séance', pt: 'Falha ao excluir sessão', id: 'Gagal menghapus sesi', it: 'Impossibile eliminare la sessione', ar: 'فشل حذف الجلسة', hi: 'सत्र हटाने में विफल', zh: '删除会话失败', ja: 'セッションの削除に失敗', ko: '세션 삭제 실패', uk: 'Не вдалося видалити сесію', pl: 'Nie udało się usunąć sesji' },
  emotion: { en: 'Emotion', ka: 'ემოცია', ru: 'Эмоциональная', hy: 'Հույզ', tr: 'Duygu', az: 'Emosiya', es: 'Emoción', de: 'Emotion', fr: 'Émotion', pt: 'Emoção', id: 'Emosi', it: 'Emozione', ar: 'عاطفة', hi: 'भावना', zh: '情感', ja: '感情', ko: '감정', uk: 'Емоція', pl: 'Emocja' },
  resource: { en: 'Resource', ka: 'რესურსი', ru: 'Ресурсная', hy: 'Ռեսուրս', tr: 'Kaynak', az: 'Resurs', es: 'Recurso', de: 'Ressource', fr: 'Ressource', pt: 'Recurso', id: 'Sumber Daya', it: 'Risorsa', ar: 'مورد', hi: 'संसाधन', zh: '资源', ja: 'リソース', ko: '자원', uk: 'Ресурс', pl: 'Zasób' },
  polarity: { en: 'Polarity', ka: 'პოლარობა', ru: 'Полярность', hy: 'Բևեռականություն', tr: 'Kutupluluk', az: 'Qütblük', es: 'Polaridad', de: 'Polarität', fr: 'Polarité', pt: 'Polaridade', id: 'Polaritas', it: 'Polarità', ar: 'القطبية', hi: 'ध्रुवीयता', zh: '极性', ja: '極性', ko: '양극성', uk: 'Полярність', pl: 'Polarność' },
  narrative: { en: 'Narrative', ka: 'ნარატივი', ru: 'Нарративная', hy: 'Պատմողական', tr: 'Anlatı', az: 'Povest', es: 'Narrativa', de: 'Narrativ', fr: 'Narratif', pt: 'Narrativa', id: 'Naratif', it: 'Narrativa', ar: 'سرد', hi: 'कथा', zh: '叙事', ja: 'ナラティブ', ko: '서사', uk: 'Наратив', pl: 'Narracja' },
  noSessions: { en: 'No sessions yet', ka: 'ჯერ არ არის სესიები', ru: 'Нет сессий', hy: 'Դեռ սեանսներ չկան', tr: 'Henüz oturum yok', az: 'Hələ seans yoxdur', es: 'Aún no hay sesiones', de: 'Noch keine Sitzungen', fr: 'Pas encore de séances', pt: 'Ainda não há sessões', id: 'Belum ada sesi', it: 'Nessuna sessione ancora', ar: 'لا توجد جلسات بعد', hi: 'अभी तक कोई सत्र नहीं', zh: '还没有会话', ja: 'まだセッションがありません', ko: '아직 세션 없음', uk: 'Поки немає сесій', pl: 'Jeszcze brak sesji' },
  startFirstSession: { en: 'Start your first therapeutic card session to see it here', ka: 'დაიწყეთ თქვენი პირველი თერაპიული ბარათების სესია რომ იხილოთ აქ', ru: 'Начните свою первую терапевтическую сессию, чтобы увидеть её здесь', hy: 'Սկսեք ձեր առաջին թերապևտիկ քարտի սեանսը՝ այն տեսնելու համար այստեղ', tr: 'İlk terapötik kart seansınızı başlatın ve burada görün', az: 'İlk terapevtik kart seansınıza başlayın və burada görün', es: 'Inicie su primera sesión de cartas terapéuticas para verla aquí', de: 'Starten Sie Ihre erste therapeutische Kartensitzung, um sie hier zu sehen', fr: 'Commencez votre première séance de cartes thérapeutiques pour la voir ici', pt: 'Inicie sua primeira sessão de cartões terapêuticos para vê-la aqui', id: 'Mulai sesi kartu terapeutik pertama Anda untuk melihatnya di sini', it: 'Inizia la tua prima sessione di carte terapeutiche per vederla qui', ar: 'ابدأ أول جلسة بطاقات علاجية لرؤيتها هنا', hi: 'इसे यहां देखने के लिए अपना पहला चिकित्सीय कार्ड सत्र शुरू करें', zh: '开始您的第一次治疗卡片会话以在此处查看', ja: '最初の治療カードセッションを開始してここで確認してください', ko: '여기에 표시하려면 첫 번째 치료 카드 세션을 시작하세요', uk: 'Почніть свою першу терапевтичну картку сесію, щоб побачити її тут', pl: 'Rozpocznij swoją pierwszą sesję kart terapeutycznych, aby ją tutaj zobaczyć' },
  exchanges: { en: 'exchanges', ka: 'გაცვლა', ru: 'обменов', hy: 'փոխանակում', tr: 'değişim', az: 'mübadilə', es: 'intercambios', de: 'Austausche', fr: 'échanges', pt: 'trocas', id: 'pertukaran', it: 'scambi', ar: 'تبادلات', hi: 'आदान-प्रदान', zh: '交流', ja: '交換', ko: '교환', uk: 'обмінів', pl: 'wymian' },
  messages: { en: 'messages', ka: 'შეტყობინება', ru: 'сообщений', hy: 'հաղորդագրություններ', tr: 'mesaj', az: 'mesaj', es: 'mensajes', de: 'Nachrichten', fr: 'messages', pt: 'mensagens', id: 'pesan', it: 'messaggi', ar: 'رسائل', hi: 'संदेश', zh: '消息', ja: 'メッセージ', ko: '메시지', uk: 'повідомлень', pl: 'wiadomości' },
  view: { en: 'View', ka: 'ნახვა', ru: 'Просмотр', hy: 'Դիտել', tr: 'Görüntüle', az: 'Bax', es: 'Ver', de: 'Ansicht', fr: 'Voir', pt: 'Ver', id: 'Lihat', it: 'Visualizza', ar: 'عرض', hi: 'देखें', zh: '查看', ja: '表示', ko: '보기', uk: 'Переглянути', pl: 'Zobacz' },
  continueSession: { en: 'Continue', ka: 'გაგრძელება', ru: 'Продолжить', hy: 'Շարունակել', tr: 'Devam Et', az: 'Davam et', es: 'Continuar', de: 'Fortsetzen', fr: 'Continuer', pt: 'Continuar', id: 'Lanjutkan', it: 'Continua', ar: 'متابعة', hi: 'जारी रखें', zh: '继续', ja: '続ける', ko: '계속', uk: 'Продовжити', pl: 'Kontynuuj' },
  currentSessions: { en: 'Current Sessions', ka: 'მიმდინარე სესიები', ru: 'Текущие сессии', hy: 'Ընթացիկ սեանսներ', tr: 'Mevcut Oturumlar', az: 'Cari Seanslar', es: 'Sesiones Actuales', de: 'Aktuelle Sitzungen', fr: 'Séances Actuelles', pt: 'Sessões Atuais', id: 'Sesi Saat Ini', it: 'Sessioni Correnti', ar: 'الجلسات الحالية', hi: 'वर्तमान सत्र', zh: '当前会话', ja: '現在のセッション', ko: '현재 세션', uk: 'Поточні сесії', pl: 'Bieżące Sesje' },
  inProgress: { en: 'In Progress', ka: 'მიმდინარე', ru: 'В процессе', hy: 'Ընթացքի մեջ', tr: 'Devam Ediyor', az: 'Davam edir', es: 'En Progreso', de: 'Im Gange', fr: 'En Cours', pt: 'Em Andamento', id: 'Sedang Berlangsung', it: 'In Corso', ar: 'قيد التنفيذ', hi: 'प्रगति में', zh: '进行中', ja: '進行中', ko: '진행 중', uk: 'У процесі', pl: 'W trakcie' },
  completedSessions: { en: 'Completed Sessions', ka: 'დასრულებული სესიები', ru: 'Завершенные сессии', hy: 'Ավարտված սեանսներ', tr: 'Tamamlanmış Oturumlar', az: 'Tamamlanmış Seanslar', es: 'Sesiones Completadas', de: 'Abgeschlossene Sitzungen', fr: 'Séances Terminées', pt: 'Sessões Concluídas', id: 'Sesi Selesai', it: 'Sessioni Completate', ar: 'الجلسات المكتملة', hi: 'पूर्ण सत्र', zh: '已完成的会话', ja: '完了したセッション', ko: '완료된 세션', uk: 'Завершені сесії', pl: 'Ukończone Sesje' },
  noCompletedSessions: { en: 'No Completed Sessions', ka: 'დასრულებული სესიები არ არის', ru: 'Нет завершенных сессий', hy: 'Ավարտված սեանսներ չկան', tr: 'Tamamlanmış Oturum Yok', az: 'Tamamlanmış Seans Yoxdur', es: 'No hay Sesiones Completadas', de: 'Keine abgeschlossenen Sitzungen', fr: 'Aucune Séance Terminée', pt: 'Nenhuma Sessão Concluída', id: 'Tidak Ada Sesi Selesai', it: 'Nessuna Sessione Completata', ar: 'لا توجد جلسات مكتملة', hi: 'कोई पूर्ण सत्र नहीं', zh: '没有完成的会话', ja: '完了したセッションはありません', ko: '완료된 세션 없음', uk: 'Немає завершених сесій', pl: 'Brak Ukończonych Sesji' },
  loadingSessions: { en: 'Loading sessions...', ka: 'სესიების ჩატვირთვა...', ru: 'Загрузка сессий...', hy: 'Սեանսները բեռնվում են...', tr: 'Oturumlar yükleniyor...', az: 'Seanslar yüklənir...', es: 'Cargando sesiones...', de: 'Sitzungen werden geladen...', fr: 'Chargement des séances...', pt: 'Carregando sessões...', id: 'Memuat sesi...', it: 'Caricamento sessioni...', ar: 'جارٍ تحميل الجلسات...', hi: 'सत्र लोड हो रहे हैं...', zh: '加载会话中...', ja: 'セッションを読み込んでいます...', ko: '세션 로드 중...', uk: 'Завантаження сесій...', pl: 'Ładowanie sesji...' },
  sessionDetails: { en: 'Session Details', ka: 'სესიის დეტალები', ru: 'Детали сессии', hy: 'Սեանսի մանրամասներ', tr: 'Oturum Detayları', az: 'Seansın Təfərrüatları', es: 'Detalles de la Sesión', de: 'Sitzungsdetails', fr: 'Détails de la Séance', pt: 'Detalhes da Sessão', id: 'Detail Sesi', it: 'Dettagli Sessione', ar: 'تفاصيل الجلسة', hi: 'सत्र विवरण', zh: '会话详情', ja: 'セッション詳細', ko: '세션 세부정보', uk: 'Деталі сесії', pl: 'Szczegóły Sesji' },
  close: { en: 'Close', ka: 'დახურვა', ru: 'Закрыть', hy: 'Փակել', tr: 'Kapat', az: 'Bağla', es: 'Cerrar', de: 'Schließen', fr: 'Fermer', pt: 'Fechar', id: 'Tutup', it: 'Chiudi', ar: 'إغلاق', hi: 'बंद करें', zh: '关闭', ja: '閉じる', ko: '닫기', uk: 'Закрити', pl: 'Zamknij' },
};

export default function SessionsHistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  const [sessions, setSessions] = useState<CompletedCardSession[]>([]);
  const [ongoingSessions, setOngoingSessions] = useState<OngoingCardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CompletedCardSession | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [completedSessions, ongoing] = await Promise.all([
        cardSessionStorage.getCompletedSessions(),
        cardSessionStorage.getAllOngoingSessions(),
      ]);
      setSessions(completedSessions);
      setOngoingSessions(ongoing);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      Alert.alert(
        pick(T.errorTitle, language),
        pick(T.loadSessionsError, language)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = useCallback((sessionId: string) => {
    Alert.alert(
      pick(T.deleteSessionTitle, language),
      pick(T.deleteSessionMessage, language),
      [
        {
          text: pick(T.cancel, language),
          style: 'cancel',
        },
        {
          text: pick(T.delete, language),
          style: 'destructive',
          onPress: async () => {
            try {
              await cardSessionStorage.deleteCompletedSession(sessionId);
              setSessions(prev => prev.filter(s => s.id !== sessionId));
              if (selectedSession?.id === sessionId) {
                setModalVisible(false);
                setSelectedSession(null);
              }
            } catch (error) {
              console.error('Failed to delete session:', error);
              Alert.alert(
                pick(T.errorTitle, language),
                pick(T.deleteSessionError, language)
              );
            }
          },
        },
      ]
    );
  }, [language, selectedSession]);

  const getCardTypeLabel = (cardType: string) => {
    switch (cardType) {
      case 'emotion':
        return pick(T.emotion, language);
      case 'resource':
        return pick(T.resource, language);
      case 'positive_negative':
        return pick(T.polarity, language);
      case 'narrative':
        return pick(T.narrative, language);
      default:
        return cardType;
    }
  };

  const getCardTypeIcon = (cardType: string) => {
    switch (cardType) {
      case 'emotion':
        return 'emoticon-happy-outline';
      case 'resource':
        return 'lightbulb-on-outline';
      case 'positive_negative':
        return 'yin-yang';
      case 'narrative':
        return 'book-open-variant';
      default:
        return 'card-outline';
    }
  };

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'emotion':
        return '#FF6B9D';
      case 'resource':
        return '#4CAF50';
      case 'positive_negative':
        return '#9C27B0';
      case 'narrative':
        return '#2196F3';
      default:
        return theme.colors.primary;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContinueSession = (session: OngoingCardSession) => {
    router.push({
      pathname: '/screens/cards/therapy-chat',
      params: {
        context: session.cardContext.cardType,
        cardId: session.cardContext.cardId,
        positive_card_id: session.cardContext.positiveCardId,
        negative_card_id: session.cardContext.negativeCardId,
        autoRestore: 'true', // Signal to auto-restore without asking
      },
    });
  };

  const handleDeleteOngoingSession = useCallback((sessionId: string) => {
    Alert.alert(
      pick(T.deleteSessionTitle, language),
      pick(T.deleteSessionMessage, language),
      [
        {
          text: pick(T.cancel, language),
          style: 'cancel',
        },
        {
          text: pick(T.delete, language),
          style: 'destructive',
          onPress: async () => {
            try {
              await cardSessionStorage.deleteOngoingSession(sessionId);
              setOngoingSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch (error) {
              console.error('Failed to delete ongoing session:', error);
              Alert.alert(
                pick(T.errorTitle, language),
                pick(T.deleteSessionError, language)
              );
            }
          },
        },
      ]
    );
  }, [language]);

  const renderOngoingSessionsHeader = () => {
    if (ongoingSessions.length === 0) return null;

    return (
      <View>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="progress-clock" size={18} color={theme.colors.text} />
          <Text style={[styles.sectionHeaderText, { color: theme.colors.text }]}>
            {pick(T.currentSessions, language)}
          </Text>
        </View>

        {/* Render all ongoing sessions */}
        {ongoingSessions.map((ongoingSession, index) => {
          const cardTypeColor = getCardTypeColor(ongoingSession.cardContext.cardType);
          const cardTypeIcon = getCardTypeIcon(ongoingSession.cardContext.cardType);
          const messageCount = ongoingSession.messages.length;

          // Count how many sessions exist for this card type
          const sameCardSessions = ongoingSessions.filter(s =>
            s.cardContext.cardType === ongoingSession.cardContext.cardType &&
            s.cardContext.cardId === ongoingSession.cardContext.cardId
          );
          const sessionNumber = sameCardSessions.findIndex(s => s.id === ongoingSession.id) + 1;
          const showSessionNumber = sameCardSessions.length > 1;

          return (
            <TouchableOpacity
              key={ongoingSession.id}
              activeOpacity={0.7}
              onPress={() => handleContinueSession(ongoingSession)}
              style={[styles.sessionCard, isDark && styles.sessionCardDark]}
            >
              <LinearGradient
                colors={isDark
                  ? ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.08)']
                  : ['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
                style={styles.sessionCardGradient}
              >
                {/* In Progress Badge */}
                <View style={styles.inProgressBadge}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color="#4CAF50" />
                  <Text style={styles.inProgressBadgeText}>
                    {pick(T.inProgress, language)}
                  </Text>
                </View>

                {/* Header */}
                <View style={styles.sessionCardHeader}>
                  <View style={[styles.sessionTypeIcon, { backgroundColor: cardTypeColor + '20' }]}>
                    <MaterialCommunityIcons name={cardTypeIcon as any} size={24} color={cardTypeColor} />
                  </View>
                  <View style={styles.sessionCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.sessionCardTitle, { color: theme.colors.text }]}>
                        {getCardTypeLabel(ongoingSession.cardContext.cardType)}
                      </Text>
                      {showSessionNumber && (
                        <View style={[styles.sessionNumberBadge, { backgroundColor: cardTypeColor + '20' }]}>
                          <Text style={[styles.sessionNumberText, { color: cardTypeColor }]}>
                            #{sessionNumber}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.sessionCardMeta}>
                      <MaterialCommunityIcons name="calendar-clock" size={12} color={theme.colors.textMuted} />
                      <Text style={[styles.sessionCardMetaText, { color: theme.colors.textMuted }]}>
                        {formatDate(ongoingSession.startedAt)} • {formatTime(ongoingSession.startedAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteOngoingSession(ongoingSession.id);
                    }}
                    style={styles.deleteButton}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
                  </TouchableOpacity>
                </View>

                {/* Preview - Last message */}
                {messageCount > 0 && (
                  <View style={styles.sessionPreview}>
                    <Text
                      style={[styles.sessionPreviewText, { color: theme.colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {ongoingSession.messages[messageCount - 1].content}
                    </Text>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.sessionCardFooter}>
                  <View style={styles.sessionStats}>
                    <MaterialCommunityIcons name="message-text" size={14} color={theme.colors.textMuted} />
                    <Text style={[styles.sessionStatsText, { color: theme.colors.textMuted }]}>
                      {messageCount} {pick(T.messages, language)}
                    </Text>
                  </View>
                  <View style={[styles.viewButton, { backgroundColor: '#4CAF50' + '15' }]}>
                    <Text style={[styles.viewButtonText, { color: '#4CAF50' }]}>
                      {pick(T.continueSession, language)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#4CAF50" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSessionCard = ({ item, index }: { item: CompletedCardSession; index: number }) => {
    const cardTypeColor = getCardTypeColor(item.cardContext.cardType);
    const cardTypeIcon = getCardTypeIcon(item.cardContext.cardType);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedSession(item);
          setModalVisible(true);
        }}
        style={[styles.sessionCard, isDark && styles.sessionCardDark]}
      >
        <LinearGradient
          colors={isDark
            ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
            : ['#ffffff', '#f8f9fa']}
          style={styles.sessionCardGradient}
        >
          {/* Header */}
          <View style={styles.sessionCardHeader}>
            <View style={[styles.sessionTypeIcon, { backgroundColor: cardTypeColor + '20' }]}>
              <MaterialCommunityIcons name={cardTypeIcon as any} size={24} color={cardTypeColor} />
            </View>
            <View style={styles.sessionCardInfo}>
              <Text style={[styles.sessionCardTitle, { color: theme.colors.text }]}>
                {getCardTypeLabel(item.cardContext.cardType)}
              </Text>
              <View style={styles.sessionCardMeta}>
                <MaterialCommunityIcons name="calendar-clock" size={12} color={theme.colors.textMuted} />
                <Text style={[styles.sessionCardMetaText, { color: theme.colors.textMuted }]}>
                  {formatDate(item.completedAt)} • {formatTime(item.completedAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteSession(item.id)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.sessionPreview}>
            {item.summary.mainFeelings.length > 0 && (
              <View style={styles.feelingsPreview}>
                {item.summary.mainFeelings.slice(0, 3).map((feeling, idx) => (
                  <View key={idx} style={styles.feelingTag}>
                    <Text style={styles.feelingTagText}>
                      {feeling.length > 15 ? feeling.substring(0, 15) + '...' : feeling}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text
              style={[styles.sessionPreviewText, { color: theme.colors.textMuted }]}
              numberOfLines={2}
            >
              {item.summary.encouragement}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.sessionCardFooter}>
            <View style={styles.sessionStats}>
              <MaterialCommunityIcons name="message-text" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.sessionStatsText, { color: theme.colors.textMuted }]}>
                {item.messageCount} {pick(T.messages, language)}
              </Text>
            </View>
            <View style={[styles.viewButton, { backgroundColor: cardTypeColor + '15' }]}>
              <Text style={[styles.viewButtonText, { color: cardTypeColor }]}>
                {pick(T.view, language)}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={cardTypeColor} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={48}
          color={theme.colors.textMuted}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {pick(T.noCompletedSessions, language)}
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
        {pick(T.startFirstSession, language)}
      </Text>
    </View>
  );

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
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
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
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    listContent: {
      padding: 16,
    },
    sessionCard: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    sessionCardDark: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    sessionCardGradient: {
      padding: 16,
    },
    sessionCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    sessionTypeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    sessionCardInfo: {
      flex: 1,
    },
    sessionCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
      letterSpacing: 0.2,
    },
    sessionCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sessionCardMetaText: {
      fontSize: 12,
      fontWeight: '500',
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionPreview: {
      marginBottom: 12,
    },
    feelingsPreview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    feelingTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    feelingTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sessionPreviewText: {
      fontSize: 13,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    sessionCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    sessionStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sessionStatsText: {
      fontSize: 12,
      fontWeight: '600',
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    viewButtonText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 100,
    },
    emptyIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0f' : '#f5f7fa',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingTop: Platform.OS === 'ios' ? 50 : 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 16,
      letterSpacing: 0.3,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    inProgressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      marginBottom: 12,
      gap: 4,
    },
    inProgressBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#4CAF50',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    sectionHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    sessionNumberBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    sessionNumberText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {pick(T.loadingSessions, language)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>
            {pick(T.headerTitle, language)}
          </Text>
        </View>
      </LinearGradient>

      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sessions.length === 0 && ongoingSessions.length === 0 ? { flex: 1 } : styles.listContent}
        ListHeaderComponent={() => (
          <>
            {renderOngoingSessionsHeader()}
            {ongoingSessions.length > 0 && sessions.length > 0 && (
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.text} />
                <Text style={[styles.sectionHeaderText, { color: theme.colors.text }]}>
                  {pick(T.completedSessions, language)}
                </Text>
              </View>
            )}
          </>
        )}
        ListEmptyComponent={ongoingSessions.length === 0 ? renderEmpty : null}
      />

      {/* Session Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ width: 36 }} />
            <Text style={styles.modalTitle}>
              {pick(T.sessionDetails, language)}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {selectedSession && (
            <ScrollView>
              <ClientSessionSummaryCard
                summary={selectedSession.summary}
                onClose={() => setModalVisible(false)}
              />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
