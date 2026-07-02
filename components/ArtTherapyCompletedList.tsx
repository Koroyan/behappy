import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import ArtTherapyProgramManager, { ArtTherapySession } from '@/services/artTherapyProgramNew';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CompletedItem {
  id: number;
  title: string;
  icon: string;
  color: string;
  completedAt?: string | Date;
  sessionSummary?: string;
}

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US', ka: 'ka-GE', ru: 'ru-RU', hy: 'hy-AM', tr: 'tr-TR', az: 'az-AZ', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', pt: 'pt-PT', id: 'id-ID', it: 'it-IT', ar: 'ar', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', uk: 'uk-UA', pl: 'pl-PL'
};

const HY_MONTHS = ['հնվ', 'փտվ', 'մրտ', 'ապր', 'մյս', 'հնս', 'հլս', 'օգս', 'սեպ', 'հոկ', 'նոյ', 'դեկ'];

const formatDate = (d: string | Date | undefined, lang: string) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  if (lang === 'hy') {
    return `${date.getDate()} ${HY_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(DATE_LOCALES[lang] ?? 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const previewText = (s?: string) => {
  if (!s) return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 140 ? trimmed.slice(0, 140) + '…' : trimmed;
};

export default function ArtTherapyCompletedList() {
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [activeSummary, setActiveSummary] = useState<CompletedItem | null>(null);

  useEffect(() => {
    const load = async () => {
      await ArtTherapyProgramManager.initialize(language);
      const map = await ArtTherapyProgramManager.getProgress();
      const sessions = await ArtTherapyProgramManager.getAllSessions();
      const sessionsById = new Map<number, ArtTherapySession>(sessions.map(session => [session.id, session]));
      const list: CompletedItem[] = [];
      for (const [sessionId, p] of map.entries()) {
        if (p?.completed) {
          const session = sessionsById.get(sessionId);
          if (!session) continue;
          list.push({
            id: session.id,
            title: session.title,
            icon: session.icon,
            color: session.color,
            completedAt: p.completedAt as any,
            sessionSummary: p.clinicalSummary?.session_summary,
          });
        }
      }
      list.sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt as any).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt as any).getTime() : 0;
        return tb - ta;
      });
      setItems(list);
    };
    load();
  }, [language]);

  const t = useMemo(() => ({
    ka: {
      header: 'დასრულებული სესიები',
      view: 'ნახვა',
      open: 'ჩატის გახსნა',
      empty: 'ჯერ არ გაქვს დასრულებული სესიები',
      summaryTitle: 'სესიის შეჯამება',
      close: 'დახურვა',
    },
    en: {
      header: 'Completed Sessions',
      view: 'View',
      open: 'Open Chat',
      empty: 'No completed sessions yet',
      summaryTitle: 'Session Summary',
      close: 'Close',
    },
    ru: {
      header: 'Завершённые сеансы',
      view: 'Просмотр',
      open: 'Открыть чат',
      empty: 'Пока нет завершённых сеансов',
      summaryTitle: 'Итоги сеанса',
      close: 'Закрыть',
    },
    hy: {
      header: 'Ավարտված սեանսներ',
      view: 'Դիտել',
      open: 'Բացել չաթը',
      empty: 'Դեռ ավարտված սեանսներ չկան',
      summaryTitle: 'Սեանսի ամփոփում',
      close: 'Փակել',
    },
    tr: {
      header: 'Tamamlanan Seanslar',
      view: 'Görüntüle',
      open: 'Sohbeti Aç',
      empty: 'Henüz tamamlanan seans yok',
      summaryTitle: 'Seans Özeti',
      close: 'Kapat',
    },
    az: {
      header: 'Tamamlanmış Seanslar',
      view: 'Bax',
      open: 'Söhbəti Aç',
      empty: 'Hələ tamamlanmış seanslar yoxdur',
      summaryTitle: 'Seans Xülasəsi',
      close: 'Bağla',
    },
    es: {
      header: 'Sesiones Completadas',
      view: 'Ver',
      open: 'Abrir Chat',
      empty: 'Aún no hay sesiones completadas',
      summaryTitle: 'Resumen de Sesión',
      close: 'Cerrar',
    },
    de: {
      header: 'Abgeschlossene Sitzungen',
      view: 'Ansehen',
      open: 'Chat Öffnen',
      empty: 'Noch keine abgeschlossenen Sitzungen',
      summaryTitle: 'Sitzungszusammenfassung',
      close: 'Schließen',
    },
    fr: {
      header: 'Sessions Terminées',
      view: 'Voir',
      open: 'Ouvrir le Chat',
      empty: 'Aucune session terminée pour le moment',
      summaryTitle: 'Résumé de Session',
      close: 'Fermer',
    },
    pt: {
      header: 'Sessões Concluídas',
      view: 'Ver',
      open: 'Abrir Chat',
      empty: 'Ainda não há sessões concluídas',
      summaryTitle: 'Resumo da Sessão',
      close: 'Fechar',
    },
    ar: {
      header: 'الجلسات المكتملة',
      view: 'عرض',
      open: 'فتح الدردشة',
      empty: 'لا توجد جلسات مكتملة بعد',
      summaryTitle: 'ملخص الجلسة',
      close: 'إغلاق',
    },
    id: {
      header: 'Sesi Selesai',
      view: 'Lihat',
      open: 'Buka Chat',
      empty: 'Belum ada sesi yang selesai',
      summaryTitle: 'Ringkasan Sesi',
      close: 'Tutup',
    },
    it: {
      header: 'Sessioni Completate',
      view: 'Vedi',
      open: 'Apri Chat',
      empty: 'Nessuna sessione completata ancora',
      summaryTitle: 'Riepilogo Sessione',
      close: 'Chiudi',
    },
    ja: {
      header: '完了したセッション',
      view: '表示',
      open: 'チャットを開く',
      empty: 'まだ完了したセッションはありません',
      summaryTitle: 'セッションの概要',
      close: '閉じる',
    },
    zh: {
      header: '已完成的会话',
      view: '查看',
      open: '打开聊天',
      empty: '还没有完成的会话',
      summaryTitle: '会话摘要',
      close: '关闭',
    },
    hi: {
      header: 'पूर्ण सत्र',
      view: 'देखें',
      open: 'चैट खोलें',
      empty: 'अभी तक कोई पूर्ण सत्र नहीं',
      summaryTitle: 'सत्र सारांश',
      close: 'बंद करें',
    },
    ko: {
      header: '완료된 세션',
      view: '보기',
      open: '채팅 열기',
      empty: '아직 완료된 세션이 없습니다',
      summaryTitle: '세션 요약',
      close: '닫기',
    },
    uk: {
      header: 'Завершені Сеанси',
      view: 'Перегляд',
      open: 'Відкрити Чат',
      empty: 'Поки немає завершених сеансів',
      summaryTitle: 'Підсумки Сеансу',
      close: 'Закрити',
    },
    pl: {
      header: 'Zakończone Sesje',
      view: 'Zobacz',
      open: 'Otwórz Chat',
      empty: 'Brak zakończonych sesji',
      summaryTitle: 'Podsumowanie Sesji',
      close: 'Zamknij',
    }
  }), []);

  const lang = ['ka', 'en', 'ru', 'hy', 'tr', 'az', 'es', 'de', 'fr', 'pt', 'ar', 'id', 'it', 'ja', 'zh', 'hi', 'ko', 'uk', 'pl'].includes(language) 
    ? language 
    : 'en';

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t[lang].empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t[lang].header}</Text>
      {items.map((it) => (
        <View key={it.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <LinearGradient colors={isDark ? [`${it.color}30`, theme.colors.card] : [`${it.color}1A`, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardBg} />
          <View style={styles.row}>
            <View style={[styles.iconWrap, { borderColor: it.color, backgroundColor: theme.colors.surface }]}>
              <Text style={styles.icon}>{it.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{it.title}</Text>
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{formatDate(it.completedAt, lang)}</Text>
            </View>
          </View>
          {it.sessionSummary ? (
            <Text style={[styles.preview, { color: theme.colors.textSecondary }]} numberOfLines={2}>{previewText(it.sessionSummary)}</Text>
          ) : null}
          <View style={styles.actions}>
            {it.sessionSummary ? (
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} onPress={() => setActiveSummary(it)}>
                <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{t[lang].view}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: it.color }]} onPress={() => router.push({ pathname: '/art-therapy-session', params: { sessionId: String(it.id) } })}>
              <Text style={styles.primaryText}>{t[lang].open}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={!!activeSummary} animationType="slide" transparent onRequestClose={() => setActiveSummary(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t[lang].summaryTitle}</Text>
              <TouchableOpacity onPress={() => setActiveSummary(null)}>
                <Text style={[styles.modalClose, { color: theme.colors.primary }]}>{t[lang].close}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {activeSummary ? (
                <>
                  <Text style={[styles.modalSessionTitle, { color: theme.colors.text }]}>{activeSummary.title}</Text>
                  {activeSummary.completedAt ? (
                    <Text style={[styles.modalMeta, { color: theme.colors.textSecondary }]}>{formatDate(activeSummary.completedAt, lang)}</Text>
                  ) : null}
                  <Text style={[styles.modalSummary, { color: theme.colors.text }]}>{activeSummary.sessionSummary}</Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  emptyWrap: { paddingVertical: 8 },
  emptyText: {},
  card: { position: 'relative', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, overflow: 'hidden' },
  cardBg: { ...StyleSheet.absoluteFillObject },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '800' },
  meta: { marginTop: 2, fontSize: 12 },
  preview: { marginTop: 6 },
  actions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  secondaryBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  secondaryText: { fontWeight: '700' },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalClose: { fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingTop: 12 },
  modalSessionTitle: { fontSize: 15, fontWeight: '800' },
  modalMeta: { marginTop: 4, fontSize: 12 },
  modalSummary: { marginTop: 12, color: '#232323', lineHeight: 20, paddingBottom: 18 },
});
