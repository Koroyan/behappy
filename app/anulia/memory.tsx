/**
 * What Anulia can remember: one switch per category (all off by default),
 * the exact text Anulia would receive, items left out on purpose, notes the
 * person writes, and "forget everything". Community and psychologist
 * messages are never part of it.
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Chip, IconButton, Screen, SectionHeader, space, TextField, ToggleRow, useFeedback, useTheme } from '@/design';
import { chatSummaries, loadAnuliaMemory } from '@/features/anulia/memoryLoader';
import { useT } from '@/i18n';
import { addMemoryNote, deleteMemoryNote, MEMORY_CATEGORIES, revokeAllMemory, setMemoryCategory, setMemoryExcluded, useConsent, useMemoryConsent } from '@/lib/privacy/consent';
import { JournalEntry, loadEntries } from '@/lib/storage/journal';
import type { MemoryBlock } from '@/lib/wellbeing/memory';

export default function AnuliaMemoryScreen() {
  const { t, formatDate } = useT();
  const { colors } = useTheme();
  const { confirm, toast } = useFeedback();
  const memory = useMemoryConsent();
  const consent = useConsent();
  const [preview, setPreview] = useState<MemoryBlock | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [chats, setChats] = useState<Awaited<ReturnType<typeof chatSummaries>>>([]);
  const [note, setNote] = useState('');

  const refresh = useCallback(() => {
    loadEntries().then((l) => setJournal(l.slice(0, 15))).catch(() => {});
    chatSummaries().then((l) => setChats(l.sort((a, b) => b.endedAt - a.endedAt).slice(0, 10))).catch(() => {});
  }, []);
  useFocusEffect(refresh);

  const openPreview = async () => {
    const block = await loadAnuliaMemory({ query: '' });
    setPreview(block);
    setShowPreview(true);
  };

  const itemRow = (id: string, label: string, sub?: string) => {
    const excluded = memory.excluded.includes(id);
    return (
      <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="small" numberOfLines={1} color={excluded ? 'textTertiary' : 'text'}>
            {label}
          </AppText>
          {sub ? (
            <AppText variant="caption" color="textTertiary">
              {sub}
            </AppText>
          ) : null}
        </View>
        <Chip label={excluded ? t('wb.memory.include') : t('wb.memory.exclude')} selected={excluded} onPress={() => setMemoryExcluded(id, !excluded)} testID={`memory-exclude-${id}`} />
      </View>
    );
  };

  return (
    <Screen back title={t('wb.memory.title')} subtitle={t('wb.memory.subtitle')} width="reading" testID="screen-memory">
      <Banner tone="info" icon="lock-closed-outline" body={t('wb.memory.intro')} />
      {!consent.ai ? <Banner tone="warning" body={t('wb.reflection.reasons.consent')} /> : null}

      <View style={{ gap: 4, marginTop: space[3] }}>
        {MEMORY_CATEGORIES.map((c) => (
          <View key={c} style={{ paddingVertical: 4 }}>
            <ToggleRow label={t(`wb.memory.categories.${c}`)} value={memory.categories[c]} onValueChange={(v) => setMemoryCategory(c, v)} testID={`memory-${c}`} />
            <AppText variant="caption" color={c === 'journalText' ? 'danger' : 'textTertiary'}>
              {t(`wb.memory.hints.${c}`)}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
        {t('wb.memory.never')}
      </AppText>

      <Button label={t('wb.memory.preview')} icon="eye-outline" variant="quiet" onPress={openPreview} style={{ marginTop: space[4], alignSelf: 'flex-start' }} testID="memory-preview" />
      {showPreview && preview ? (
        <Card padding={16} style={{ marginTop: space[3], backgroundColor: colors.surfaceSunken }} testID="memory-preview-text">
          {preview.text ? (
            <>
              <AppText variant="caption" color="textTertiary" style={{ marginBottom: 8 }}>
                {t('wb.memory.previewNote')} · {t('wb.memory.sources', { n: preview.sources.length })}
              </AppText>
              <AppText variant="small" selectable>
                {preview.text}
              </AppText>
            </>
          ) : (
            <AppText variant="small">{t('wb.memory.previewEmpty')}</AppText>
          )}
        </Card>
      ) : null}

      {memory.categories.journalText && journal.length ? (
        <>
          <SectionHeader title={t('wb.memory.journalItems')} style={{ marginTop: space[5] }} />
          {journal.map((e) => itemRow(`journal:${e.id}`, (e.title || e.content).replace(/\s+/g, ' ').slice(0, 70), formatDate(e.timestamp, { day: 'numeric', month: 'short' })))}
        </>
      ) : null}
      {memory.categories.priorChats && chats.length ? (
        <>
          <SectionHeader title={t('wb.memory.chatItems')} style={{ marginTop: space[5] }} />
          {chats.map((c) => itemRow(`chat:${c.id}`, c.themes.join(', ') || '—', formatDate(c.endedAt, { day: 'numeric', month: 'short' })))}
        </>
      ) : null}

      <SectionHeader title={t('wb.memory.notes')} style={{ marginTop: space[5] }} />
      <AppText variant="caption" color="textTertiary" style={{ marginBottom: 8 }}>
        {t('wb.memory.notesHint')}
      </AppText>
      {memory.notes.map((n) => (
        <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
          <AppText variant="small" style={{ flex: 1 }}>
            {n.text}
          </AppText>
          <IconButton icon="trash-outline" label={t('wb.sound.delete')} onPress={() => deleteMemoryNote(n.id)} size={32} variant="soft" />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <TextField value={note} onChangeText={setNote} placeholder={t('wb.memory.notePlaceholder')} />
        </View>
        <Button
          label={t('wb.memory.addNote')}
          size="sm"
          onPress={async () => {
            await addMemoryNote(note);
            setNote('');
          }}
          disabled={!note.trim()}
          testID="memory-add-note"
        />
      </View>

      <SectionHeader title={t('wb.memory.transfer')} style={{ marginTop: space[5] }} />
      <AppText variant="small" color="textSecondary">
        {t('wb.memory.transferBody')}
      </AppText>

      <Button
        label={t('wb.memory.forgetAll')}
        icon="trash-outline"
        variant="danger"
        onPress={async () => {
          if (!(await confirm({ title: t('wb.memory.forgetAll'), body: t('wb.memory.forgetConfirm'), confirmLabel: t('wb.memory.forgetAll'), destructive: true }))) return;
          await revokeAllMemory();
          setPreview(null);
          toast(t('wb.memory.forgotten'));
        }}
        style={{ marginTop: space[5], alignSelf: 'flex-start' }}
        testID="memory-forget"
      />
    </Screen>
  );
}
