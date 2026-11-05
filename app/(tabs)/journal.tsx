import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { JOURNAL_PROMPTS } from '@/content/journalPrompts';
import { pickLocalized } from '@/content/types';
import { AppText, Badge, Button, Card, Chip, EmptyState, Icon, MoodGlyph, Screen, SectionHeader, space, TextField, useLayout } from '@/design';
import { MoodChart } from '@/features/charts/Charts';
import { MonthCalendar } from '@/features/journal/MonthCalendar';
import { useT } from '@/i18n';
import { dayKey } from '@/lib/storage/json';
import { JournalEntry, loadEntries, searchEntries } from '@/lib/storage/journal';

export default function JournalScreen() {
  const router = useRouter();
  const { t, formatDate, formatTime, language } = useT();
  const { hasContextPanel, isCompact } = useLayout();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [query, setQuery] = useState('');
  const [day, setDay] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadEntries().then(setEntries);
    }, [])
  );

  const marked = useMemo(() => new Set(entries.map((e) => dayKey(e.timestamp))), [entries]);
  const filtered = useMemo(() => {
    const byQuery = searchEntries(entries, query);
    return day ? byQuery.filter((e) => dayKey(e.timestamp) === day) : byQuery;
  }, [entries, query, day]);

  const groups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    filtered.forEach((e) => {
      const k = dayKey(e.timestamp);
      map.set(k, [...(map.get(k) || []), e]);
    });
    return [...map.entries()];
  }, [filtered]);

  const trend = useMemo(() => {
    const days = 14;
    const out: { day: string; value: number | null }[] = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    cursor.setDate(cursor.getDate() - (days - 1));
    for (let i = 0; i < days; i += 1) {
      const k = dayKey(cursor);
      const vals = entries.filter((e) => dayKey(e.timestamp) === k && typeof e.mood === 'number').map((e) => e.mood as number);
      out.push({ day: k, value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [entries]);
  const hasTrend = trend.some((p) => p.value !== null);

  const dayLabel = (k: string) => {
    if (k === dayKey()) return t('common.today');
    if (k === dayKey(Date.now() - 86400000)) return t('common.yesterday');
    return formatDate(`${k}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const prompts = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {JOURNAL_PROMPTS.map((p) => (
        <Chip key={p.id} label={pickLocalized(p.title, language)} icon={p.icon as any} onPress={() => router.push(`/journal/editor?prompt=${p.id}`)} testID={`prompt-${p.id}`} />
      ))}
    </ScrollView>
  );

  const calendarCard = (
    <Card padding={16}>
      <SectionHeader title={t('journal.calendarTitle')} actionLabel={day ? t('journal.allEntries') : undefined} onAction={() => setDay(null)} style={{ marginBottom: 4 }} />
      <MonthCalendar markedDays={marked} selected={day} onSelect={setDay} />
    </Card>
  );

  const trendCard = (
    <Card padding={18}>
      <AppText variant="title3" style={{ marginBottom: space[3] }}>
        {t('journal.trendTitle')}
      </AppText>
      {hasTrend ? (
        <MoodChart points={trend} label={t('journal.trendTitle')} height={130} />
      ) : (
        <AppText variant="small" color="textSecondary">
          {t('journal.trendEmpty')}
        </AppText>
      )}
    </Card>
  );

  return (
    <Screen
      tab
      title={t('journal.title')}
      subtitle={t('journal.subtitle')}
      headerRight={<Button label={t('journal.newEntry')} icon="add" size="sm" onPress={() => router.push('/journal/editor')} testID="journal-new" />}
      aside={
        <>
          {calendarCard}
          {trendCard}
        </>
      }
      asideOnNarrow="hidden"
      testID="screen-journal"
    >
      <View style={{ gap: space[5] }}>
        <TextField value={query} onChangeText={setQuery} placeholder={t('journal.searchPlaceholder')} returnKeyType="search" accessibilityLabel={t('common.search')} />
        <View style={{ gap: space[2] }}>
          <AppText variant="smallStrong" color="textSecondary">
            {t('journal.promptsTitle')}
          </AppText>
          {prompts}
        </View>

        {!hasContextPanel ? (
          <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[4] }}>
            <View style={{ flex: 1 }}>{calendarCard}</View>
            <View style={{ flex: 1 }}>{trendCard}</View>
          </View>
        ) : null}

        {day ? (
          <AppText variant="title3">{t('journal.entriesOn', { date: dayLabel(day) })}</AppText>
        ) : null}

        {entries.length === 0 ? (
          <Card padding={8}>
            <EmptyState
              icon="book-outline"
              title={t('journal.emptyTitle')}
              body={t('journal.emptyBody')}
              action={<Button label={t('journal.freeWrite')} icon="create-outline" onPress={() => router.push('/journal/editor')} />}
            />
          </Card>
        ) : filtered.length === 0 ? (
          <AppText variant="body" color="textSecondary">
            {t('journal.noResults')}
          </AppText>
        ) : (
          groups.map(([k, list]) => (
            <View key={k} style={{ gap: space[3] }}>
              <AppText variant="label" color="textTertiary">
                {dayLabel(k)}
              </AppText>
              {list.map((e) => (
                <Card key={e.id} padding={18} onPress={() => router.push(`/journal/editor?id=${e.id}`)} accessibilityLabel={e.title || e.content.slice(0, 60)} testID="journal-entry">
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={{ alignItems: 'center', gap: 6, width: 40 }}>
                      {typeof e.mood === 'number' ? <MoodGlyph level={e.mood} size={36} /> : <Icon name="document-text-outline" size={26} color="textTertiary" />}
                      <AppText variant="caption" color="textTertiary">
                        {formatTime(e.timestamp)}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {e.title ? <AppText variant="title3">{e.title}</AppText> : null}
                      <AppText variant={e.title ? 'small' : 'callout'} color={e.title ? 'textSecondary' : 'text'} numberOfLines={3}>
                        {e.content}
                      </AppText>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {e.promptTitle || e.promptId ? (
                          <Badge label={e.promptId ? pickLocalized(JOURNAL_PROMPTS.find((p) => p.id === e.promptId)?.title ?? { en: e.promptTitle || '' }, language) : (e.promptTitle as string)} tone="lavender" />
                        ) : null}
                        {e.aiResponse ? <Badge label={t('journal.reflection.title')} tone="primary" icon="sparkles-outline" /> : null}
                      </View>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
