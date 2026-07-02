import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SessionData } from '@/services/aiTherapyService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ────────────────────────────────────────────────
// Localisation helper
// ────────────────────────────────────────────────
const pick = (obj: Record<string, string>, lang: AppLanguage): string =>
  obj[lang] ?? obj.en;

const T = {
  title: {
    en: 'Session History', ka: 'სესიების ისტორია', ru: 'История сессий',
    hy: 'Սեանսների պատմություն', tr: 'Seans Geçmişi', az: 'Sessiya Tarixi',
    es: 'Historial de sesiones', de: 'Sitzungsverlauf', fr: 'Historique des séances',
    pt: 'Histórico de sessões', id: 'Riwayat Sesi', it: 'Storico sessioni',
    ar: 'سجل الجلسات', hi: 'सत्र इतिहास', zh: '会话历史', ja: 'セッション履歴',
    ko: '세션 기록', uk: 'Історія сесій', pl: 'Historia sesji',
  },
  empty: {
    en: 'No sessions yet', ka: 'სესიები ჯერ არ არის', ru: 'Сессий пока нет',
    hy: 'Դեռ սեանսներ չկան', tr: 'Henüz seans yok', az: 'Hələ sessiya yoxdur',
    es: 'Aún no hay sesiones', de: 'Noch keine Sitzungen', fr: 'Aucune séance pour l\'instant',
    pt: 'Nenhuma sessão ainda', id: 'Belum ada sesi', it: 'Nessuna sessione ancora',
    ar: 'لا توجد جلسات بعد', hi: 'अभी कोई सत्र नहीं', zh: '暂无会话', ja: 'まだセッションがありません',
    ko: '아직 세션 없음', uk: 'Сесій ще немає', pl: 'Brak sesji',
  },
  emptySubtitle: {
    en: 'Your therapy sessions will appear here after you complete them.',
    ka: 'თქვენი სესიები აქ გამოჩნდება სრულ დასრულების შემდეგ.',
    ru: 'Ваши терапевтические сессии появятся здесь после завершения.',
    hy: 'Ձեր թերապևտիկ սեանսները կհայտնվեն այստեղ ավարտելուց հետո։',
    tr: 'Terapi seanslarınız tamamlandıktan sonra burada görünecek.',
    az: 'Terapi sessiyalarınız tamamlandıqdan sonra burada görünəcək.',
    es: 'Tus sesiones de terapia aparecerán aquí una vez completadas.',
    de: 'Deine Therapiesitzungen erscheinen hier nach dem Abschluss.',
    fr: 'Vos séances de thérapie apparaîtront ici après leur complétion.',
    pt: 'Suas sessões de terapia aparecerão aqui após serem concluídas.',
    id: 'Sesi terapi Anda akan muncul di sini setelah selesai.',
    it: 'Le tue sessioni di terapia appariranno qui dopo il completamento.',
    ar: 'ستظهر جلسات العلاج هنا بعد إتمامها.',
    hi: 'आपकी थेरेपी सत्र पूरी होने के बाद यहाँ दिखेंगे।',
    zh: '完成后，您的治疗会话将显示在此处。',
    ja: 'セラピーセッションが完了するとここに表示されます。',
    ko: '치료 세션이 완료되면 여기에 표시됩니다.',
    uk: 'Ваші терапевтичні сесії з\'являться тут після завершення.',
    pl: 'Twoje sesje terapeutyczne pojawią się tutaj po ukończeniu.',
  },
  session: {
    en: 'Session', ka: 'სესია', ru: 'Сессия', hy: 'Սեանս', tr: 'Seans',
    az: 'Sessiya', es: 'Sesión', de: 'Sitzung', fr: 'Séance', pt: 'Sessão',
    id: 'Sesi', it: 'Sessione', ar: 'جلسة', hi: 'सत्र', zh: '会话',
    ja: 'セッション', ko: '세션', uk: 'Сесія', pl: 'Sesja',
  },
  messages: {
    en: 'messages', ka: 'შეტყობინება', ru: 'сообщений', hy: 'հաղորդ.',
    tr: 'mesaj', az: 'mesaj', es: 'mensajes', de: 'Nachrichten', fr: 'messages',
    pt: 'mensagens', id: 'pesan', it: 'messaggi', ar: 'رسالة', hi: 'संदेश',
    zh: '条消息', ja: 'メッセージ', ko: '메시지', uk: 'повідомлень', pl: 'wiadomości',
  },
  duration: {
    en: 'Duration', ka: 'ხანგრძლივობა', ru: 'Длительность', hy: 'Տևողություն',
    tr: 'Süre', az: 'Müddət', es: 'Duración', de: 'Dauer', fr: 'Durée',
    pt: 'Duração', id: 'Durasi', it: 'Durata', ar: 'المدة', hi: 'अवधि',
    zh: '时长', ja: '時間', ko: '기간', uk: 'Тривалість', pl: 'Czas trwania',
  },
  emotions: {
    en: 'Emotions', ka: 'ემოციები', ru: 'Эмоции', hy: 'Հույզեր', tr: 'Duygular',
    az: 'Emosiyalar', es: 'Emociones', de: 'Emotionen', fr: 'Émotions',
    pt: 'Emoções', id: 'Emosi', it: 'Emozioni', ar: 'المشاعر', hi: 'भावनाएं',
    zh: '情绪', ja: '感情', ko: '감정', uk: 'Емоції', pl: 'Emocje',
  },
  insights: {
    en: 'Key Insights', ka: 'მთავარი დასკვნები', ru: 'Ключевые инсайты',
    hy: 'Հիմնական բացահայտումներ', tr: 'Temel Çıkarımlar', az: 'Əsas Açıqlamalar',
    es: 'Insights clave', de: 'Wesentliche Erkenntnisse', fr: 'Points clés',
    pt: 'Insights principais', id: 'Wawasan Utama', it: 'Intuizioni chiave',
    ar: 'الرؤى الرئيسية', hi: 'मुख्य अंतर्दृष्टि', zh: '关键洞察',
    ja: '重要な洞察', ko: '핵심 인사이트', uk: 'Ключові інсайти', pl: 'Kluczowe spostrzeżenia',
  },
  viewDetail: {
    en: 'View Details', ka: 'დეტალების ნახვა', ru: 'Подробнее', hy: 'Մանրամասներ',
    tr: 'Detayları Gör', az: 'Detalları Gör', es: 'Ver detalles', de: 'Details anzeigen',
    fr: 'Voir les détails', pt: 'Ver detalhes', id: 'Lihat Detail', it: 'Vedi dettagli',
    ar: 'عرض التفاصيل', hi: 'विवरण देखें', zh: '查看详情', ja: '詳細を見る',
    ko: '세부 정보 보기', uk: 'Деталі', pl: 'Szczegóły',
  },
  deleteSession: {
    en: 'Delete', ka: 'წაშლა', ru: 'Удалить', hy: 'Ջնջել', tr: 'Sil',
    az: 'Sil', es: 'Eliminar', de: 'Löschen', fr: 'Supprimer', pt: 'Excluir',
    id: 'Hapus', it: 'Elimina', ar: 'حذف', hi: 'हटाएं', zh: '删除',
    ja: '削除', ko: '삭제', uk: 'Видалити', pl: 'Usuń',
  },
  deleteConfirmTitle: {
    en: 'Delete session?', ka: 'წაშალოთ სესია?', ru: 'Удалить сессию?',
    hy: 'Ջնջե՞լ սեանսը', tr: 'Seans silinsin mi?', az: 'Sessiya silinsin?',
    es: '¿Eliminar sesión?', de: 'Sitzung löschen?', fr: 'Supprimer la séance ?',
    pt: 'Excluir sessão?', id: 'Hapus sesi?', it: 'Eliminare sessione?',
    ar: 'حذف الجلسة؟', hi: 'सत्र हटाएं?', zh: '删除会话？', ja: 'セッションを削除しますか？',
    ko: '세션을 삭제하시겠습니까?', uk: 'Видалити сесію?', pl: 'Usunąć sesję?',
  },
  deleteConfirmText: {
    en: 'This action cannot be undone.',
    ka: 'ეს მოქმედება ვერ გაუქმდება.',
    ru: 'Это действие нельзя отменить.',
    hy: 'Այս գործողությունը հնարավոր չէ հետ շրջել։',
    tr: 'Bu işlem geri alınamaz.',
    az: 'Bu əməliyyat geri alına bilməz.',
    es: 'Esta acción no se puede deshacer.',
    de: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    fr: 'Cette action est irréversible.',
    pt: 'Esta ação não pode ser desfeita.',
    id: 'Tindakan ini tidak dapat dibatalkan.',
    it: 'Questa azione non può essere annullata.',
    ar: 'لا يمكن التراجع عن هذا الإجراء.',
    hi: 'यह क्रिया पूर्ववत नहीं की जा सकती।',
    zh: '此操作无法撤销。',
    ja: 'この操作は元に戻せません。',
    ko: '이 작업은 취소할 수 없습니다.',
    uk: 'Цю дію не можна скасувати.',
    pl: 'Tej czynności nie można cofnąć.',
  },
  cancel: {
    en: 'Cancel', ka: 'გაუქმება', ru: 'Отмена', hy: 'Չեղարկել', tr: 'İptal',
    az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar',
    id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消',
    ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj',
  },
  clearAll: {
    en: 'Clear All', ka: 'ყველას გასუფთავება', ru: 'Очистить всё',
    hy: 'Մաքրել ամեն ինչ', tr: 'Tümünü Temizle', az: 'Hamısını Sil',
    es: 'Limpiar todo', de: 'Alles löschen', fr: 'Tout effacer',
    pt: 'Limpar tudo', id: 'Hapus semua', it: 'Cancella tutto',
    ar: 'مسح الكل', hi: 'सब साफ़ करें', zh: '全部清除',
    ja: 'すべてクリア', ko: '모두 지우기', uk: 'Очистити все', pl: 'Wyczyść wszystko',
  },
  min: {
    en: 'min', ka: 'წთ', ru: 'мин', hy: 'ր', tr: 'dk', az: 'dəq',
    es: 'min', de: 'Min', fr: 'min', pt: 'min', id: 'mnt', it: 'min',
    ar: 'د', hi: 'मिनट', zh: '分钟', ja: '分', ko: '분', uk: 'хв', pl: 'min',
  },
  inProgress: {
    en: 'In progress', ka: 'მიმდინარე', ru: 'В процессе', hy: 'Ընթացքի մեջ',
    tr: 'Devam ediyor', az: 'Davam edir', es: 'En curso', de: 'Läuft',
    fr: 'En cours', pt: 'Em andamento', id: 'Sedang berlangsung', it: 'In corso',
    ar: 'جارٍ', hi: 'प्रगति में', zh: '进行中', ja: '進行中',
    ko: '진행 중', uk: 'Триває', pl: 'W toku',
  },
  conversationTitle: {
    en: 'Conversation', ka: 'საუბარი', ru: 'Диалог', hy: 'Զրույց', tr: 'Konuşma',
    az: 'Söhbət', es: 'Conversación', de: 'Gespräch', fr: 'Conversation',
    pt: 'Conversa', id: 'Percakapan', it: 'Conversazione', ar: 'المحادثة',
    hi: 'बातचीत', zh: '对话', ja: '会話', ko: '대화', uk: 'Розмова', pl: 'Rozmowa',
  },
  you: {
    en: 'You', ka: 'თქვენ', ru: 'Вы', hy: 'Դուք', tr: 'Siz', az: 'Siz',
    es: 'Tú', de: 'Du', fr: 'Vous', pt: 'Você', id: 'Kamu', it: 'Tu',
    ar: 'أنت', hi: 'आप', zh: '你', ja: 'あなた', ko: '당신', uk: 'Ви', pl: 'Ty',
  },
};

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const EMOTION_EMOJI: Record<string, string> = {
  anxious: '😰', sad: '😢', angry: '😠', confused: '😕', positive: '😊',
  welcoming: '🤗', neutral: '😐', calm: '😌', fear: '😨', hopeful: '🌱',
};

function formatDuration(startTime: Date, endTime?: Date, lang: AppLanguage = 'en'): string {
  if (!endTime) return pick(T.inProgress, lang);
  const mins = Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000));
  if (mins === 0) return `< 1 ${pick(T.min, lang)}`;
  return `${mins} ${pick(T.min, lang)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function topEmotions(emotions: { emotion: string; intensity: number }[]): string[] {
  const counts: Record<string, number> = {};
  emotions.forEach(e => { counts[e.emotion] = (counts[e.emotion] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);
}

// ────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────

interface SessionCardProps {
  session: SessionData;
  index: number;
  lang: AppLanguage;
  isDark: boolean;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, index, lang, isDark, colors, onPress, onDelete }) => {
  const msgCount = session.messages?.length ?? 0;
  const duration = formatDuration(session.startTime, session.endTime, lang);
  const date = formatDate(session.startTime);
  const time = formatTime(session.startTime);
  const emotions = topEmotions(session.emotions ?? []);
  const isComplete = !!session.endTime;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', shadowColor: colors.shadow }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.sessionBadge, { backgroundColor: isComplete ? '#E8F5E9' : '#FFF3E0' }]}>
            <Ionicons
              name={isComplete ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={isComplete ? '#4CAF50' : '#FF9500'}
            />
            <Text style={[styles.sessionBadgeText, { color: isComplete ? '#4CAF50' : '#FF9500' }]}>
              {`${pick(T.session, lang)} ${index}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={isDark ? '#666' : '#AAA'} />
          </TouchableOpacity>
        </View>

        {/* Date & time */}
        <Text style={[styles.cardDate, { color: colors.text }]}>{date}</Text>
        <Text style={[styles.cardTime, { color: colors.textMuted }]}>{time}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="chatbubbles-outline" size={15} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {`${msgCount} ${pick(T.messages, lang)}`}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="timer-outline" size={15} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{duration}</Text>
          </View>
        </View>

        {/* Emotion chips */}
        {emotions.length > 0 && (
          <View style={styles.emotionRow}>
            {emotions.map(e => (
              <View key={e} style={[styles.emotionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0F4FF' }]}>
                <Text style={styles.emotionEmoji}>{EMOTION_EMOJI[e] ?? '💭'}</Text>
                <Text style={[styles.emotionLabel, { color: colors.textSecondary }]}>{e}</Text>
              </View>
            ))}
          </View>
        )}

        {/* View button */}
        <View style={[styles.viewBtn, { backgroundColor: isDark ? 'rgba(0,149,246,0.15)' : '#EFF6FF' }]}>
          <Text style={[styles.viewBtnText, { color: colors.accent }]}>{pick(T.viewDetail, lang)}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ────────────────────────────────────────────────
// Detail Modal
// ────────────────────────────────────────────────
interface DetailModalProps {
  session: SessionData | null;
  visible: boolean;
  onClose: () => void;
  lang: AppLanguage;
  isDark: boolean;
  colors: any;
}

const DetailModal: React.FC<DetailModalProps> = ({ session, visible, onClose, lang, isDark, colors }) => {
  if (!session) return null;
  const messages = session.messages ?? [];
  const insights = session.insights?.filter(Boolean) ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDark ? colors.background : '#F8FAFF' }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{pick(T.conversationTitle, lang)}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{formatDate(session.startTime)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={28} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Key Insights */}
          {insights.length > 0 && (
            <View style={[styles.insightsBlock, { backgroundColor: isDark ? colors.surface : '#EFF6FF', borderColor: colors.accent + '30' }]}>
              <View style={styles.insightsHeader}>
                <Ionicons name="bulb-outline" size={18} color={colors.accent} />
                <Text style={[styles.insightsTitle, { color: colors.accent }]}>{pick(T.insights, lang)}</Text>
              </View>
              {insights.slice(0, 5).filter(i => i.length > 2).map((insight, i) => (
                <Text key={i} style={[styles.insightItem, { color: colors.textSecondary }]}>{'• '}{insight}</Text>
              ))}
            </View>
          )}

          {/* Messages */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{pick(T.conversationTitle, lang)}</Text>
          {messages.filter(m => m.content?.trim()).map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.msgBubble,
                msg.type === 'user'
                  ? [styles.msgBubbleUser, { backgroundColor: colors.accent }]
                  : [styles.msgBubbleAI, { backgroundColor: isDark ? colors.surface : '#F5F7FA', borderColor: colors.border }],
              ]}
            >
              <Text style={[
                styles.msgSender,
                { color: msg.type === 'user' ? 'rgba(255,255,255,0.75)' : colors.textMuted },
              ]}>
                {msg.type === 'user' ? pick(T.you, lang) : 'Dr. Sophia'}
              </Text>
              <Text style={[
                styles.msgText,
                { color: msg.type === 'user' ? '#FFFFFF' : colors.text },
              ]}>
                {msg.content}
              </Text>
              <Text style={[
                styles.msgTime,
                { color: msg.type === 'user' ? 'rgba(255,255,255,0.6)' : colors.textMuted },
              ]}>
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────
export default function SessionHistoryScreen() {
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('therapy_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Sort newest first
          const sorted = [...parsed].sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
          setSessions(sorted);
        }
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const onRefresh = () => { setRefreshing(true); loadSessions(); };

  const deleteSession = (id: string) => {
    Alert.alert(
      pick(T.deleteConfirmTitle, language),
      pick(T.deleteConfirmText, language),
      [
        { text: pick(T.cancel, language), style: 'cancel' },
        {
          text: pick(T.deleteSession, language),
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = sessions.filter(s => s.id !== id);
              await AsyncStorage.setItem('therapy_sessions', JSON.stringify(updated));
              setSessions(updated);
            } catch { /* ignore */ }
          },
        },
      ]
    );
  };

  const clearAll = () => {
    Alert.alert(
      pick(T.clearAll, language),
      pick(T.deleteConfirmText, language),
      [
        { text: pick(T.cancel, language), style: 'cancel' },
        {
          text: pick(T.deleteSession, language),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('therapy_sessions');
            setSessions([]);
          },
        },
      ]
    );
  };

  const c = theme.colors;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient
        colors={isDark ? [c.background, c.surface] : ['#EFF6FF', '#FFFFFF']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>{pick(T.title, language)}</Text>
        {sessions.length > 0 ? (
          <TouchableOpacity onPress={clearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={22} color="#FF3B5C" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </LinearGradient>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? c.surface : '#EFF6FF' }]}>
            <Ionicons name="chatbubbles-outline" size={52} color={isDark ? c.textMuted : '#93C5FD'} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{pick(T.empty, language)}</Text>
          <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>{pick(T.emptySubtitle, language)}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
          renderItem={({ item, index }) => (
            <SessionCard
              session={item}
              index={sessions.length - index}
              lang={language}
              isDark={isDark}
              colors={c}
              onPress={() => { setSelectedSession(item); setShowDetail(true); }}
              onDelete={() => deleteSession(item.id)}
            />
          )}
        />
      )}

      <DetailModal
        session={selectedSession}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        lang={language}
        isDark={isDark}
        colors={c}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sessionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  sessionBadgeText: { fontSize: 12, fontWeight: '600' },
  cardDate: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardTime: { fontSize: 13, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13 },
  emotionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  emotionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  emotionEmoji: { fontSize: 14 },
  emotionLabel: { fontSize: 12, textTransform: 'capitalize' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 10,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  modalBody: { flex: 1, padding: 16 },
  insightsBlock: {
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1,
  },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  insightsTitle: { fontSize: 14, fontWeight: '700' },
  insightItem: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  msgBubble: { borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: '85%' },
  msgBubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgBubbleAI: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  msgSender: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
});
