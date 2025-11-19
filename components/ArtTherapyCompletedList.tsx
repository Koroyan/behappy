import { useLanguage } from '@/contexts/LanguageContext';
import ArtTherapyProgramManager, { ART_THERAPY_SESSIONS, SessionProgress } from '@/services/artTherapyProgram';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CompletedItem {
  id: number;
  title: { ka: string; en: string; ru?: string };
  icon: string;
  color: string;
  completedAt?: string | Date;
  sessionSummary?: string;
}

const formatDate = (d?: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const previewText = (s?: string) => {
  if (!s) return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 140 ? trimmed.slice(0, 140) + '…' : trimmed;
};

export default function ArtTherapyCompletedList() {
  const { language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [activeSummary, setActiveSummary] = useState<CompletedItem | null>(null);

  useEffect(() => {
    const load = async () => {
      const map = await ArtTherapyProgramManager.getProgress();
      const list: CompletedItem[] = [];
      for (const s of ART_THERAPY_SESSIONS) {
        const p = map.get(s.id) as SessionProgress | undefined;
        if (p?.completed) {
          list.push({
            id: s.id,
            title: { ka: s.title.ka, en: s.title.en, ru: (s.title as any).ru },
            icon: s.icon,
            color: s.color,
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
  }, []);

  const t = useMemo(() => ({
    ka: {
      header: 'დასრულებული სესიები',
      view: 'ნახვა',
      open: 'ჩატის გახსნა',
      empty: 'ჯერ არ გაქვს დასრულებული სესიები',
      summaryTitle: 'სესიის შეჯამება',
      close: 'დახურვა',
    },
    ru: {
      header: 'Завершённые сеансы',
      view: 'Просмотр',
      open: 'Открыть чат',
      empty: 'Пока нет завершённых сеансов',
      summaryTitle: 'Итоги сеанса',
      close: 'Закрыть',
    },
    en: {
      header: 'Completed Sessions',
      view: 'View',
      open: 'Open Chat',
      empty: 'No completed sessions yet',
      summaryTitle: 'Session Summary',
      close: 'Close',
    }
  }), []);

  const lang = language === 'ka' ? 'ka' : language === 'ru' ? 'ru' : 'en';

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{t[lang].empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t[lang].header}</Text>
      {items.map((it) => (
        <View key={it.id} style={styles.card}>
          <LinearGradient colors={[`${it.color}1A`, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardBg} />
          <View style={styles.row}>
            <View style={[styles.iconWrap, { borderColor: it.color }]}>
              <Text style={styles.icon}>{it.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{lang === 'ka' ? it.title.ka : lang === 'ru' ? (it.title.ru ?? it.title.en) : it.title.en}</Text>
              <Text style={styles.meta} numberOfLines={1}>{formatDate(it.completedAt)}</Text>
            </View>
          </View>
          {it.sessionSummary ? (
            <Text style={styles.preview} numberOfLines={2}>{previewText(it.sessionSummary)}</Text>
          ) : null}
          <View style={styles.actions}>
            {it.sessionSummary ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setActiveSummary(it)}>
                <Text style={styles.secondaryText}>{t[lang].view}</Text>
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t[lang].summaryTitle}</Text>
              <TouchableOpacity onPress={() => setActiveSummary(null)}>
                <Text style={styles.modalClose}>{t[lang].close}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {activeSummary ? (
                <>
                  <Text style={styles.modalSessionTitle}>{lang === 'ka' ? activeSummary.title.ka : lang === 'ru' ? (activeSummary.title.ru ?? activeSummary.title.en) : activeSummary.title.en}</Text>
                  {activeSummary.completedAt ? (
                    <Text style={styles.modalMeta}>{formatDate(activeSummary.completedAt)}</Text>
                  ) : null}
                  <Text style={styles.modalSummary}>{activeSummary.sessionSummary}</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyWrap: { paddingVertical: 8 },
  emptyText: { color: '#6B7280' },
  card: { position: 'relative', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12, overflow: 'hidden' },
  cardBg: { ...StyleSheet.absoluteFillObject },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginRight: 10 },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { marginTop: 2, fontSize: 12, color: '#6B7280' },
  preview: { marginTop: 6, color: '#374151' },
  actions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  secondaryBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#111827', fontWeight: '700' },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  modalClose: { color: '#111827', fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingTop: 12 },
  modalSessionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  modalMeta: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  modalSummary: { marginTop: 12, color: '#232323', lineHeight: 20, paddingBottom: 18 },
});
