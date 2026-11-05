import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { JOURNAL_PROMPTS } from '@/content/journalPrompts';
import { pickLocalized } from '@/content/types';
import { AppText, Banner, Button, Card, Icon, IconButton, Screen, space, TextField, useFeedback, useLayout, useTheme } from '@/design';
import { useEnsureConsent } from '@/features/common/Consent';
import { LimitNotice } from '@/features/common/LimitNotice';
import { requestReflection } from '@/features/journal/reflection';
import { MoodPicker } from '@/features/mood/MoodPicker';
import { useT } from '@/i18n';
import { NetworkError, QuotaError } from '@/lib/api/client';
import { ConsentRequiredError } from '@/lib/privacy/consent';
import { clearDraft, createEntry, deleteEntry, getEntry, JournalEntry, loadDraft, MoodLevel, saveDraft, updateEntry, wordCount } from '@/lib/storage/journal';

export default function JournalEditor() {
  const params = useLocalSearchParams<{ id?: string; prompt?: string; draft?: string }>();
  const router = useRouter();
  const { t, tp, formatDate, formatTime, language } = useT();
  const { colors } = useTheme();
  const { isCompact } = useLayout();
  const { confirm, toast } = useFeedback();
  const ensureConsent = useEnsureConsent();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodLevel | undefined>();
  const [promptId, setPromptId] = useState<string | undefined>(params.prompt);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftNote, setDraftNote] = useState<'saved' | 'restored' | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<null | 'failed' | 'limit' | 'offline'>(null);
  const [limitReset, setLimitReset] = useState<number | null>(null);
  const [editing, setEditing] = useState(!params.id);
  const loadedRef = useRef(false);

  const prompt = JOURNAL_PROMPTS.find((p) => p.id === promptId);

  useEffect(() => {
    (async () => {
      if (params.id) {
        const e = await getEntry(params.id);
        if (e) {
          setEntry(e);
          setTitle(e.title ?? '');
          setContent(e.content);
          setMood(e.mood);
          setPromptId(e.promptId);
        }
      } else {
        const d = await loadDraft();
        if (d && !d.entryId && (d.content.trim() || d.title.trim())) {
          setTitle(d.title);
          setContent(d.content);
          setMood(d.mood);
          if (!params.prompt) setPromptId(d.promptId);
          if (params.draft !== '1') setDraftNote('restored');
        }
      }
      loadedRef.current = true;
    })();
  }, [params.id, params.prompt, params.draft]);

  // Autosave the draft of a new entry while typing.
  useEffect(() => {
    if (!loadedRef.current || entry || !dirty) return;
    const id = setTimeout(() => {
      saveDraft({ title, content, mood, promptId }).then(() => setDraftNote('saved'));
    }, 700);
    return () => clearTimeout(id);
  }, [title, content, mood, promptId, entry, dirty]);

  const save = useCallback(async () => {
    if (!content.trim()) {
      toast(t('journal.editor.emptyWarning'));
      return;
    }
    setSaving(true);
    try {
      if (entry) {
        const next = await updateEntry(entry.id, { title: title.trim() || undefined, content, mood, promptId });
        if (next) setEntry(next);
      } else {
        const created = await createEntry({ title, content, mood, promptId, promptTitle: prompt ? pickLocalized(prompt.title, language) : undefined });
        await clearDraft();
        setEntry(created);
        router.setParams({ id: created.id } as any);
      }
      setDirty(false);
      setEditing(false);
      setDraftNote(null);
      toast(t('common.saved'));
    } catch {
      toast(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [content, entry, title, mood, promptId, prompt, language, router, t, toast]);

  const remove = async () => {
    if (!entry) return;
    const ok = await confirm({ title: t('journal.entry.deleteTitle'), body: t('journal.entry.deleteBody'), confirmLabel: t('common.delete'), destructive: true });
    if (!ok) return;
    await deleteEntry(entry.id);
    toast(t('journal.entry.deleted'));
    router.back();
  };

  const discardDraft = async () => {
    await clearDraft();
    setTitle('');
    setContent('');
    setMood(undefined);
    setDraftNote(null);
  };

  const askReflection = async () => {
    if (!entry) return;
    if (!(await ensureConsent())) return;
    setReflecting(true);
    setReflectError(null);
    try {
      const text = await requestReflection(entry, language, prompt ? pickLocalized(prompt.prompt, language) : undefined);
      const next = await updateEntry(entry.id, { aiResponse: text, aiRespondedAt: Date.now() });
      if (next) setEntry(next);
    } catch (e) {
      if (e instanceof QuotaError) {
        setReflectError('limit');
        setLimitReset(e.resetAt);
      } else if (e instanceof ConsentRequiredError) {
        setReflectError(null);
      } else if (e instanceof NetworkError) setReflectError('offline');
      else setReflectError('failed');
    } finally {
      setReflecting(false);
    }
  };

  const readOnly = Boolean(entry) && !editing;
  const headerTitle = entry ? formatDate(entry.timestamp, { weekday: 'long', day: 'numeric', month: 'long' }) : t('journal.newEntry');

  return (
    <Screen
      back
      compactHeader
      title={headerTitle}
      subtitle={entry ? formatTime(entry.timestamp) : undefined}
      width="reading"
      keyboard
      headerRight={
        readOnly ? (
          <>
            <IconButton icon="create-outline" label={t('common.edit')} onPress={() => setEditing(true)} variant="soft" testID="journal-edit" />
            <IconButton icon="trash-outline" label={t('common.delete')} onPress={remove} variant="soft" testID="journal-delete" />
          </>
        ) : (
          <Button label={t('common.save')} size="sm" onPress={save} loading={saving} testID="journal-save" />
        )
      }
      testID="screen-journal-editor"
    >
      <View style={{ gap: space[5], marginTop: space[3] }}>
        {draftNote === 'restored' ? (
          <Banner tone="info" body={t('journal.editor.draftRestored')} action={<Button label={t('journal.editor.discardDraft')} variant="ghost" size="sm" onPress={discardDraft} />} />
        ) : null}

        {prompt ? (
          <Card tone="lavender" padding={16}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name={prompt.icon as any} size={20} color="onLavenderSoft" />
              <View style={{ flex: 1 }}>
                <AppText variant="smallStrong" color="onLavenderSoft">
                  {pickLocalized(prompt.title, language)}
                </AppText>
                <AppText variant="small" color="onLavenderSoft" style={{ marginTop: 2 }}>
                  {pickLocalized(prompt.prompt, language)}
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}

        {readOnly ? (
          <View style={{ gap: space[4] }}>
            {entry?.title ? <AppText variant="title1">{entry.title}</AppText> : null}
            <AppText variant="bodySerif" selectable>
              {entry?.content}
            </AppText>
            {entry?.updatedAt ? (
              <AppText variant="caption" color="textTertiary">
                {t('journal.entry.editedAt', { date: formatDate(entry.updatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
              </AppText>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: space[4] }}>
            <View style={{ gap: space[2] }}>
              <AppText variant="smallStrong" color="textSecondary">
                {t('journal.editor.moodLabel')} · {t('common.optional')}
              </AppText>
              <MoodPicker
                value={mood}
                onChange={(m) => {
                  setMood((cur) => (cur === m ? undefined : m));
                  setDirty(true);
                }}
                size="sm"
              />
            </View>
            <View style={{ backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: isCompact ? 18 : 28, gap: space[3] }}>
              <TextField
                bare
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setDirty(true);
                }}
                placeholder={t('journal.editor.titlePlaceholder')}
                variant="title2"
                testID="journal-title"
              />
              <TextField
                bare
                value={content}
                onChangeText={(v) => {
                  setContent(v);
                  setDirty(true);
                }}
                placeholder={prompt ? pickLocalized(prompt.prompt, language) : t('journal.editor.bodyPlaceholder')}
                variant="bodySerif"
                multiline
                autoFocus={!params.id}
                inputStyle={{ minHeight: isCompact ? 280 : 380 }}
                testID="journal-body"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="caption" color="textTertiary">
                  {tp('journal.editor.words', wordCount(content))}
                </AppText>
                {draftNote === 'saved' ? (
                  <AppText variant="caption" color="textTertiary">
                    {t('journal.editor.draftSaved')}
                  </AppText>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {entry && readOnly ? (
          <Card tone="primary" padding={20} testID="journal-reflection">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space[2] }}>
              <Icon name="sparkles-outline" size={18} color="onPrimarySoft" />
              <AppText variant="smallStrong" color="onPrimarySoft">
                {t('journal.reflection.title')}
              </AppText>
            </View>
            {entry.aiResponse ? (
              <>
                <AppText variant="body">{entry.aiResponse}</AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginTop: space[3] }}>
                  {t('journal.reflection.note')}
                </AppText>
              </>
            ) : reflectError === 'limit' ? (
              <LimitNotice title={t('anulia.limitDailyTitle')} body={t('journal.reflection.limit')} resetAt={limitReset} />
            ) : (
              <View style={{ gap: space[3] }}>
                <AppText variant="small" color="textSecondary">
                  {t('journal.reflection.askHint')}
                </AppText>
                {reflectError ? <Banner tone="warning" body={reflectError === 'offline' ? t('errors.network') : t('journal.reflection.failed')} /> : null}
                <Button label={reflecting ? t('journal.reflection.generating') : t('journal.reflection.ask')} icon="sparkles-outline" variant="primary" onPress={askReflection} loading={reflecting} testID="journal-ask-reflection" />
              </View>
            )}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
