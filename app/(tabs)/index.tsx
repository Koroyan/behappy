import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { pickLocalized } from '@/content/types';
import { QUOTES } from '@/content/quotes';
import { AppText, Avatar, Button, Card, Chip, Icon, IconButton, IconName, MoodGlyph, ProgressBar, Press, SectionHeader, Screen, space, TextField, useLayout, useTheme } from '@/design';
import { conversationTitle, listConversations, type Conversation } from '@/features/anulia/anuliaService';
import { loadProgram, type ProgramState } from '@/features/art/program';
import { MoodPicker } from '@/features/mood/MoodPicker';
import { useT } from '@/i18n';
import { loadActivity, summarize } from '@/lib/storage/activity';
import { addCheckIn, CheckIn, FEELINGS, Feeling, latestToday, loadCheckIns } from '@/lib/storage/checkins';
import { JournalEntry, loadEntries, MoodLevel, saveDraft } from '@/lib/storage/journal';
import { getUserProfile } from '@/services/userProfileService';

type SuggestionKey = 'ground' | 'unload' | 'talk' | 'create' | 'savor';
const SUGGESTION_META: Record<SuggestionKey, { icon: IconName; tone: 'primary' | 'peach' | 'lavender' | 'gold' | 'sage'; route: string }> = {
  ground: { icon: 'leaf-outline', tone: 'sage', route: '/breathing' },
  unload: { icon: 'create-outline', tone: 'lavender', route: '/journal/editor' },
  talk: { icon: 'chatbubble-ellipses-outline', tone: 'primary', route: '/anulia' },
  create: { icon: 'color-palette-outline', tone: 'peach', route: '/art' },
  savor: { icon: 'sunny-outline', tone: 'gold', route: '/journal/editor?prompt=gratitude' },
};

function suggestionFor(mood?: MoodLevel): SuggestionKey {
  if (mood === undefined) return 'talk';
  if (mood <= 1) return 'ground';
  if (mood === 2) return 'unload';
  if (mood === 3) return 'create';
  return 'savor';
}

function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export default function TodayScreen() {
  const router = useRouter();
  const { t, tl, formatDate, formatTime, language } = useT();
  const { colors } = useTheme();
  const { isCompact, isDesktop } = useLayout();

  const [name, setName] = useState<string>('');
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [program, setProgram] = useState<ProgramState | null>(null);
  const [week, setWeek] = useState({ checkIns: 0, journal: 0, practices: 0 });
  const [loaded, setLoaded] = useState(false);

  const [mood, setMood] = useState<MoodLevel | undefined>();
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState(false);
  const [quick, setQuick] = useState('');

  const load = useCallback(async () => {
    const [profile, ci, je, convs, activity] = await Promise.all([getUserProfile(), loadCheckIns(), loadEntries(), listConversations(), loadActivity()]);
    setName(profile?.name?.trim().split(/\s+/)[0] ?? '');
    setCheckIns(ci);
    setEntries(je);
    setConversation(convs.find((c) => c.messages.some((m) => m.type === 'user')) ?? null);
    const s = summarize(activity, 7 * 86400000);
    setWeek({ checkIns: s.checkIns, journal: s.journal, practices: s.breathing + s.meditation + s.art + s.cards });
    setLoaded(true);
    loadProgram(language).then(setProgram).catch(() => setProgram(null));
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const todayCheckIn = latestToday(checkIns);
  const showPicker = !todayCheckIn || editingCheckIn;
  const suggestion = suggestionFor(todayCheckIn?.mood ?? mood);
  const meta = SUGGESTION_META[suggestion];
  const levels = tl('mood.levels');
  const isNew = loaded && !checkIns.length && !entries.length && !conversation;
  const quote = useMemo(() => {
    // Heavier clinical lines (e.g. about depression) are not used as a daily greeting.
    const gentle = QUOTES.filter((q) => !/depress/i.test(q.text.en));
    return gentle[Math.floor(Date.now() / 86400000) % gentle.length];
  }, []);

  const greeting = t(`today.greeting.${greetingKey(new Date().getHours())}`);
  const title = name ? t('today.greetingNamed', { greeting, name }) : greeting;

  const saveCheckIn = async () => {
    if (mood === undefined) return;
    setSaving(true);
    try {
      await addCheckIn({ mood, feelings, note });
      setFeelings([]);
      setNote('');
      setEditingCheckIn(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const continueQuickNote = async () => {
    if (quick.trim()) await saveDraft({ title: '', content: quick, mood: todayCheckIn?.mood });
    setQuick('');
    router.push('/journal/editor?draft=1');
  };

  const nextArt = program ? program.sessions.find((s) => s.id === (program.inProgressId ?? program.nextId)) : undefined;

  const checkInCard = (
    <Card padding={isCompact ? 18 : 24} testID="today-checkin">
      {showPicker ? (
        <View style={{ gap: space[4] }}>
          <AppText variant="title3">{t('mood.question')}</AppText>
          <MoodPicker value={mood} onChange={setMood} />
          {mood !== undefined ? (
            <View style={{ gap: space[4] }}>
              <View style={{ gap: space[2] }}>
                <AppText variant="smallStrong" color="textSecondary">
                  {t('mood.feelingsTitle')}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FEELINGS.map((f) => (
                    <Chip
                      key={f}
                      label={t(`mood.feelings.${f}`)}
                      selected={feelings.includes(f)}
                      onPress={() => setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                    />
                  ))}
                </View>
              </View>
              <TextField value={note} onChangeText={setNote} placeholder={t('mood.notePlaceholder')} multiline inputStyle={{ minHeight: 72 }} />
              <Button label={t('mood.save')} onPress={saveCheckIn} loading={saving} testID="checkin-save" />
            </View>
          ) : null}
        </View>
      ) : todayCheckIn ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MoodGlyph level={todayCheckIn.mood} size={48} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{levels[todayCheckIn.mood]}</AppText>
            <AppText variant="small" color="textSecondary">
              {t('mood.savedAt', { time: formatTime(todayCheckIn.at) })}
              {todayCheckIn.feelings.length ? ` · ${todayCheckIn.feelings.map((f) => t(`mood.feelings.${f}`)).join(', ')}` : ''}
            </AppText>
          </View>
          <Button
            label={t('mood.again')}
            variant="ghost"
            size="sm"
            onPress={() => {
              setMood(undefined);
              setEditingCheckIn(true);
            }}
          />
        </View>
      ) : null}
    </Card>
  );

  const suggestionCard = (
    <Card tone={meta.tone === 'primary' ? 'primary' : meta.tone} padding={isCompact ? 18 : 22} onPress={() => router.push(meta.route as any)} accessibilityLabel={t(`today.suggestion.${suggestion}.title`)} testID="today-suggestion">
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={meta.icon} size={22} color="text" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color="textSecondary">
            {t('today.suggestionLabel')}
          </AppText>
          <AppText variant="title3">{t(`today.suggestion.${suggestion}.title`)}</AppText>
          <AppText variant="small" color="textSecondary">
            {t(`today.suggestion.${suggestion}.body`)}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <AppText variant="smallStrong">{t(`today.suggestion.${suggestion}.cta`)}</AppText>
            <Icon name="arrow-forward" size={16} color="text" />
          </View>
        </View>
      </View>
    </Card>
  );

  const lastAi = conversation ? [...conversation.messages].reverse().find((m) => m.type === 'ai' && m.content) : undefined;
  const anuliaCard = (
    <Card padding={isCompact ? 18 : 22} testID="today-anulia">
      <SectionHeader title={t('today.anuliaTitle')} style={{ marginBottom: space[2] }} />
      {conversation ? (
        <Press onPress={() => router.push(`/anulia?c=${conversation.id}`)} accessibilityLabel={t('today.anuliaContinue')} style={{ gap: 6 }}>
          <AppText variant="smallStrong">{conversationTitle(conversation)}</AppText>
          {lastAi ? (
            <AppText variant="small" color="textSecondary" numberOfLines={2}>
              {lastAi.content}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <AppText variant="smallStrong" color="primary">
              {t('today.anuliaContinue')}
            </AppText>
            <Icon name="arrow-forward" size={16} color="primary" />
          </View>
        </Press>
      ) : (
        <View style={{ gap: space[3] }}>
          <AppText variant="small" color="textSecondary">
            {t('today.anuliaEmpty')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tl('anulia.starters')
              .slice(0, 2)
              .map((s) => (
                <Chip key={s} label={s} icon="chatbubble-outline" onPress={() => router.push(`/anulia?starter=${encodeURIComponent(s)}`)} />
              ))}
          </View>
          <Button label={t('today.anuliaStart')} variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/anulia')} />
        </View>
      )}
    </Card>
  );

  const quickCard = (
    <Card padding={isCompact ? 18 : 22} testID="today-quicknote">
      <SectionHeader title={t('today.quickJournalTitle')} style={{ marginBottom: space[2] }} />
      <TextField value={quick} onChangeText={setQuick} placeholder={t('today.quickJournalPlaceholder')} multiline variant="bodySerif" inputStyle={{ minHeight: 96 }} />
      <Button label={t('today.quickJournalCta')} variant="quiet" iconRight="arrow-forward" onPress={continueQuickNote} style={{ marginTop: space[3] }} />
    </Card>
  );

  const artCard = nextArt ? (
    <Card tone="peach" padding={isCompact ? 18 : 22} onPress={() => router.push(`/art/${nextArt.id}`)} accessibilityLabel={nextArt.title} testID="today-art">
      <AppText variant="label" color="onPeachSoft">
        {program?.inProgressId ? t('today.artContinue') : t('today.artNext')} · {t('art.session.label', { number: nextArt.id })}
      </AppText>
      <AppText variant="title3" style={{ marginTop: 6 }}>
        {nextArt.title}
      </AppText>
      <AppText variant="small" color="textSecondary" numberOfLines={2} style={{ marginTop: 4 }}>
        {nextArt.theme}
      </AppText>
      <View style={{ marginTop: space[4], gap: 6 }}>
        <ProgressBar value={(program?.completed ?? 0) / (program?.total || 43)} label={t('art.progress', { done: program?.completed ?? 0, total: program?.total ?? 43 })} />
        <AppText variant="caption" color="textSecondary">
          {t('art.progress', { done: program?.completed ?? 0, total: program?.total ?? 43 })}
        </AppText>
      </View>
    </Card>
  ) : null;

  const recentCard = (
    <View testID="today-recent">
      <SectionHeader title={t('today.recentTitle')} actionLabel={entries.length ? t('common.seeAll') : undefined} onAction={() => router.push('/journal')} />
      {entries.length ? (
        <View style={{ gap: space[3] }}>
          {entries.slice(0, 2).map((e) => (
            <Card key={e.id} padding={16} onPress={() => router.push(`/journal/editor?id=${e.id}`)} accessibilityLabel={e.title || e.content.slice(0, 40)}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                {typeof e.mood === 'number' ? <MoodGlyph level={e.mood} size={32} /> : <Icon name="document-text-outline" size={24} color="textTertiary" />}
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="textTertiary">
                    {formatDate(e.timestamp, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </AppText>
                  <AppText variant="callout" numberOfLines={2} style={{ marginTop: 2 }}>
                    {e.title || e.content}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <AppText variant="small" color="textSecondary">
          {t('today.recentEmpty')}
        </AppText>
      )}
    </View>
  );

  const weekCard = (
    <Card tone="muted" padding={20} testID="today-week">
      <AppText variant="title3" style={{ marginBottom: space[3] }}>
        {t('today.weekTitle')}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: t('today.weekCheckIns'), value: week.checkIns, icon: 'happy-outline' as IconName },
          { label: t('today.weekEntries'), value: week.journal, icon: 'book-outline' as IconName },
          { label: t('today.weekPractices'), value: week.practices, icon: 'leaf-outline' as IconName },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, gap: 4 }}>
            <Icon name={s.icon} size={18} color="textSecondary" />
            <AppText variant="title2">{s.value}</AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
        {t('today.weekNote')}
      </AppText>
    </Card>
  );

  const quoteCard = quote ? (
    <Card tone="lavender" padding={20}>
      <Icon name="chatbox-ellipses-outline" size={20} color="onLavenderSoft" />
      <AppText variant="bodySerif" style={{ marginTop: 8 }}>
        “{pickLocalized(quote.text, language)}”
      </AppText>
      <AppText variant="caption" color="onLavenderSoft" style={{ marginTop: 8 }}>
        {quote.author}
      </AppText>
    </Card>
  ) : null;

  const safetyCard = (
    <Card tone="danger" padding={18} onPress={() => router.push('/safety')} accessibilityLabel={t('nav.needHelpNow')} testID="today-safety">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="heart-circle-outline" size={24} color="onDangerSoft" />
        <View style={{ flex: 1 }}>
          <AppText variant="smallStrong" color="onDangerSoft">
            {t('nav.needHelpNow')}
          </AppText>
          <AppText variant="caption" color="onDangerSoft">
            {t('explore.items.safety.subtitle')}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={18} color="onDangerSoft" />
      </View>
    </Card>
  );

  const firstTime = isNew ? (
    <Card tone="sage" padding={22}>
      <AppText variant="title3">{t('today.firstTimeTitle')}</AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 4, marginBottom: space[4] }}>
        {t('today.firstTimeBody')}
      </AppText>
      <View style={{ gap: 8 }}>
        {[
          { icon: 'book-outline' as IconName, label: t('explore.items.journal.title'), sub: t('explore.items.journal.subtitle'), route: '/journal/editor' },
          { icon: 'chatbubble-ellipses-outline' as IconName, label: t('explore.items.anulia.title'), sub: t('explore.items.anulia.subtitle'), route: '/anulia' },
          { icon: 'leaf-outline' as IconName, label: t('explore.items.breathing.title'), sub: t('explore.items.breathing.subtitle'), route: '/breathing' },
        ].map((item) => (
          <Press key={item.route} onPress={() => router.push(item.route as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface }}>
            <Icon name={item.icon} size={20} color="primary" />
            <View style={{ flex: 1 }}>
              <AppText variant="smallStrong">{item.label}</AppText>
              <AppText variant="caption" color="textSecondary">
                {item.sub}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={16} color="textTertiary" />
          </Press>
        ))}
      </View>
    </Card>
  ) : null;

  const aside = (
    <>
      {weekCard}
      {quoteCard}
      {safetyCard}
    </>
  );

  return (
    <Screen
      tab
      eyebrow={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
      title={title}
      subtitle={t('today.intro')}
      headerRight={isCompact ? <IconButton icon="person-circle-outline" label={t('nav.profile')} onPress={() => router.push('/profile')} variant="soft" /> : <Avatar name={name} size={40} />}
      aside={aside}
      testID="screen-today"
    >
      <View style={{ gap: space[5] }}>
        {firstTime}
        {checkInCard}
        {suggestionCard}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space[5] }}>
          <View style={{ flex: 1 }}>{anuliaCard}</View>
          <View style={{ flex: 1 }}>{quickCard}</View>
        </View>
        {artCard}
        {recentCard}
        <View style={{ alignItems: 'center', marginTop: space[4] }}>
          <Button label={t('today.exploreAll')} variant="ghost" iconRight="arrow-forward" onPress={() => router.push('/explore')} />
        </View>
      </View>
    </Screen>
  );
}
