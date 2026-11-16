/**
 * One program: what it is and what to expect, the seven days, and — once
 * started — today's day: one main activity (with a way in, or "I did this"
 * for things done away from the app), optional extras, a short private
 * reflection, pause / resume / stop, an optional daily reminder and, at the
 * end, a summary and a next suggestion. Missed days just wait: no streaks,
 * no warnings, nothing resets.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Chip, Icon, IconButton, Screen, SectionHeader, space, TextField, ToggleRow, useFeedback, useTheme } from '@/design';
import { activityIcon, ProgramIcon } from '@/features/programs/ProgramParts';
import { useT } from '@/i18n';
import { askNotificationPermission } from '@/lib/notifications/reminders';
import { noteFirstActivity } from '@/lib/onboarding';
import { subscribe } from '@/lib/storage/json';
import { dayKey, formatTime, parseTime } from '@/lib/wellbeing/dates';
import { EVENTS_TOPIC, loadEvents } from '@/lib/wellbeing/eventStore';
import type { WellbeingEvent } from '@/lib/wellbeing/events';
import { completeDayManually, latestRunOf, loadPrograms, pauseProgram, PROGRAMS_TOPIC, type ProgramData, resumeProgram, saveDayNote, setProgramReminder, startProgram, stopProgram } from '@/lib/wellbeing/programStore';
import { ACTIVITIES, nextProgramAfter, PROGRAM_DAYS, PROGRAM_IDS, programById, runState, runSummary } from '@/lib/wellbeing/programs';

const shiftTime = (hhmm: string, minutes: number) => {
  const m = ((parseTime(hhmm) ?? 20 * 60) + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export default function ProgramScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const { t, formatDate } = useT();
  const { colors } = useTheme();
  const { confirm, toast } = useFeedback();
  const def = programById(String(id));
  const [data, setData] = useState<ProgramData | null>(null);
  const [events, setEvents] = useState<WellbeingEvent[]>([]);
  // Unsaved reflections, by run and day (the saved one is the default).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const today = dayKey();

  const refresh = useCallback(() => {
    loadPrograms().then(setData).catch(() => setData({ v: 1, runs: [] }));
    loadEvents().then(setEvents).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const a = subscribe(PROGRAMS_TOPIC, refresh);
    const b = subscribe(EVENTS_TOPIC, refresh);
    return () => {
      a();
      b();
    };
  }, [refresh]);

  const run = useMemo(() => (data && def ? latestRunOf(data, def.id) : null), [data, def]);
  const live = run && (run.status === 'active' || run.status === 'paused') ? run : null;
  const otherActive = data?.runs.find((r) => r.status === 'active' && r.programId !== def?.id) || null;
  const state = live ? runState(live, today) : null;
  // The day whose reflection is shown: today's open day, or the day done today.
  const doneToday = live ? Object.entries(live.days).find(([, m]) => m.doneDay === today) : undefined;
  const shownDay = live ? (doneToday ? Number(doneToday[0]) : state?.openToday ? state.current : null) : null;
  const noteKey = live && shownDay ? `${live.runId}:${shownDay}` : null;
  const savedNote = live && shownDay ? live.notes[String(shownDay)]?.text || '' : '';
  const note = noteKey && drafts[noteKey] !== undefined ? drafts[noteKey] : savedNote;
  const setNote = (text: string) => noteKey && setDrafts((d) => ({ ...d, [noteKey]: text }));

  if (!def) {
    return (
      <Screen back title={t('jr.programs.title')} width="reading">
        <Banner tone="warning" body={t('jr.programs.notFound')} action={<Button label={t('jr.programs.title')} size="sm" onPress={() => router.replace('/programs' as never)} />} />
      </Screen>
    );
  }

  const name = t(`jr.programs.defs.${def.id}.title`);
  const dayText = (n: number, part: 'title' | 'body' | 'reflect') => t(`jr.programs.defs.${def.id}.days.d${n}.${part}`);

  const start = async () => {
    setBusy(true);
    try {
      await startProgram(def.id);
      noteFirstActivity('program').catch(() => {});
      toast(t('jr.programs.started', { name }));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const didIt = async (n: number) => {
    const ok = await completeDayManually(live!.runId, n);
    if (ok) toast(t('jr.programs.dayDone', { n }));
    refresh();
  };

  const saveNote = async () => {
    if (!live || !shownDay) return;
    await saveDayNote(live.runId, shownDay, note);
    toast(t('jr.programs.reflectSaved'));
  };

  const stop = async () => {
    if (!live) return;
    const ok = await confirm({ title: t('jr.programs.stopConfirmTitle'), body: t('jr.programs.stopConfirmBody'), confirmLabel: t('jr.programs.stopCta') });
    if (!ok) return;
    await stopProgram(live.runId);
    refresh();
  };

  const toggleReminder = async (on: boolean) => {
    if (!live) return;
    if (on && (await askNotificationPermission()) !== 'granted') {
      toast(t('jr.programs.reminderDenied'));
      return;
    }
    await setProgramReminder(live.runId, { ...live.reminder, enabled: on });
    refresh();
  };

  const intro = (
    <Card padding={20} testID="program-intro">
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ProgramIcon def={def} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="textSecondary">
            {t('jr.programs.perDay', { n: def.minutes })}
          </AppText>
        </View>
      </View>
      <AppText variant="body" style={{ marginTop: space[3] }}>
        {t(`jr.programs.defs.${def.id}.short`)}
      </AppText>
      <AppText variant="smallStrong" style={{ marginTop: space[4] }}>
        {t('jr.programs.expectTitle')}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
        {t(`jr.programs.defs.${def.id}.expect`)}
      </AppText>
      {!live ? (
        <View style={{ marginTop: space[4], gap: 8 }}>
          {otherActive ? <AppText variant="caption" color="textSecondary">{t('jr.programs.pausesOther', { name: t(`jr.programs.defs.${otherActive.programId}.title`) })}</AppText> : null}
          <Button label={run?.status === 'completed' ? t('jr.programs.startAgain') : t('jr.programs.start')} icon="play" onPress={start} loading={busy} testID="program-start" style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
    </Card>
  );

  const todayCard = live && state ? (
    <Card tone={def.tone} padding={20} testID="program-today">
      {live.status === 'paused' ? (
        <View style={{ gap: space[3] }}>
          <AppText variant="title3">{t('jr.programs.pausedTitle')}</AppText>
          <AppText variant="small" color="textSecondary">
            {t('jr.programs.pausedBody')}
          </AppText>
          <Button label={t('jr.programs.resume')} icon="play" onPress={async () => { await resumeProgram(live.runId); refresh(); }} testID="program-resume" style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : doneToday ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="checkmark-circle" size={22} color="brand" />
            <AppText variant="title3">{t('jr.programs.dayDone', { n: Number(doneToday[0]) })}</AppText>
          </View>
          <AppText variant="small" color="textSecondary">
            {state.current ? t('jr.programs.opensTomorrow', { n: state.current }) : t('jr.programs.allDone')}
          </AppText>
        </View>
      ) : state.current && state.openToday ? (
        <View style={{ gap: space[3] }}>
          {state.quietDays >= 2 ? <AppText variant="small" color="textSecondary">{t('jr.programs.welcomeBack')}</AppText> : null}
          <AppText variant="label" color="textSecondary">
            {t('jr.programs.dayOf', { n: state.current, total: PROGRAM_DAYS })}
          </AppText>
          <AppText variant="title2" accessibilityRole="header">
            {dayText(state.current, 'title')}
          </AppText>
          <AppText variant="body">{dayText(state.current, 'body')}</AppText>
          {(() => {
            const d = def.days[state.current - 1];
            const info = ACTIVITIES[d.main];
            const route = d.main === 'journal' && d.prompt ? `/journal/editor?prompt=${d.prompt}` : info.route;
            return (
              <View style={{ gap: space[3] }}>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {route ? <Button label={t(`jr.programs.activities.${d.main}`)} icon={activityIcon(d.main)} onPress={() => router.push(route as never)} testID="program-do" /> : null}
                  <Button label={t('jr.programs.didIt')} icon="checkmark" variant={route ? 'secondary' : 'primary'} onPress={() => didIt(state.current!)} testID="program-did-it" />
                </View>
                {info.completes ? (
                  <AppText variant="caption" color="textSecondary">
                    {t('jr.programs.autoNote')}
                  </AppText>
                ) : null}
                {d.supports.length ? (
                  <View style={{ gap: 6 }}>
                    <AppText variant="smallStrong">{t('jr.programs.optional')}</AppText>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {d.supports.map((k) => (
                        <Chip key={k} label={t(`jr.programs.activities.${k}`)} icon={activityIcon(k)} onPress={() => ACTIVITIES[k].route && router.push(ACTIVITIES[k].route as never)} testID={`program-extra-${k}`} />
                      ))}
                    </View>
                    {d.supports.some((k) => ACTIVITIES[k].ai) ? (
                      <AppText variant="caption" color="textSecondary">
                        {t('jr.programs.aiNote')}
                      </AppText>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })()}
        </View>
      ) : state.current ? (
        <AppText variant="body">{t('jr.programs.opensOn', { n: state.current, date: formatDate(`${state.opensOn}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' }) })}</AppText>
      ) : null}

      {shownDay && live.status === 'active' ? (
        <View style={{ marginTop: space[4], gap: 8 }} testID="program-reflect">
          <AppText variant="smallStrong">{t('jr.programs.reflectTitle')}</AppText>
          <AppText variant="small" color="textSecondary">
            {dayText(shownDay, 'reflect')}
          </AppText>
          <TextField value={note} onChangeText={setNote} placeholder={t('jr.programs.reflectPlaceholder')} multiline maxLength={2000} inputStyle={{ minHeight: 80 }} variant="bodySerif" testID="program-note" accessibilityLabel={dayText(shownDay, 'reflect')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button label={t('jr.programs.reflectSave')} size="sm" variant="secondary" onPress={saveNote} disabled={note === (live.notes[String(shownDay)]?.text || '')} testID="program-note-save" />
            <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {t('jr.programs.reflectPrivate')}
            </AppText>
          </View>
        </View>
      ) : null}
    </Card>
  ) : null;

  const summary =
    run && run.status === 'completed'
      ? (() => {
          const s = runSummary(run, events, today);
          const finished = (data?.runs || []).filter((r) => r.status === 'completed').map((r) => r.programId);
          const next = nextProgramAfter(def.id, finished);
          return (
            <Card tone="sage" padding={20} testID="program-summary">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="ribbon-outline" size={24} color="onPrimarySoft" />
                <AppText variant="title3">{t('jr.programs.summaryTitle', { name })}</AppText>
              </View>
              <View style={{ marginTop: space[3], gap: 4 }}>
                <AppText variant="small">{t('jr.programs.summaryDays', { n: s.daysDone, span: s.spanDays })}</AppText>
                {s.calmMinutes ? <AppText variant="small">{t('jr.programs.summaryMinutes', { n: s.calmMinutes })}</AppText> : null}
                {s.journalEntries ? <AppText variant="small">{t('jr.programs.summaryEntries', { n: s.journalEntries })}</AppText> : null}
                {s.notesWritten ? <AppText variant="small">{t('jr.programs.summaryNotes', { n: s.notesWritten })}</AppText> : null}
              </View>
              <AppText variant="small" color="textSecondary" style={{ marginTop: space[3] }}>
                {t('jr.programs.summaryBody')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
                {next ? <Button label={t('jr.programs.nextSuggestion', { name: t(`jr.programs.defs.${next}.title`) })} size="sm" iconRight="arrow-forward" onPress={() => router.push(`/programs/${next}` as never)} testID="program-next" /> : null}
                <Button label={t('jr.programs.startAgain')} size="sm" variant="quiet" onPress={start} testID="program-again" />
              </View>
            </Card>
          );
        })()
      : null;

  const notes = run ? Object.entries(run.notes).filter(([, n]) => n.text.trim()).sort((a, b) => Number(a[0]) - Number(b[0])) : [];

  return (
    <Screen back title={name} subtitle={from === 'start' ? t('jr.programs.fromStart') : undefined} width="reading" testID={`screen-program-${def.id}`}>
      <View style={{ gap: space[5] }}>
        {summary}
        {todayCard}
        {intro}

        <View>
          <SectionHeader title={t('jr.programs.daysTitle')} />
          <View style={{ gap: 2 }}>
            {def.days.map((d) => {
              const mark = live?.days[String(d.n)] || (run?.status === 'completed' ? run.days[String(d.n)] : undefined);
              const isCurrent = Boolean(live && state?.current === d.n);
              return (
                <View key={d.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }} testID={`program-day-${d.n}`}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: mark ? colors.primarySoft : isCurrent ? colors.surface : colors.surfaceMuted, borderWidth: isCurrent ? 2 : 0, borderColor: colors.primary }}>
                    {mark ? <Icon name="checkmark" size={16} color="onPrimarySoft" /> : <AppText variant="caption">{d.n}</AppText>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant={isCurrent ? 'bodyStrong' : 'body'}>{dayText(d.n, 'title')}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {t(`jr.programs.activities.${d.main}`)}
                    </AppText>
                  </View>
                  <Icon name={activityIcon(d.main)} size={18} color="textTertiary" />
                </View>
              );
            })}
          </View>
        </View>

        {notes.length ? (
          <View>
            <SectionHeader title={t('jr.programs.yourNotes')} />
            <View style={{ gap: space[3] }}>
              {notes.map(([n, x]) => (
                <Card key={n} tone="muted" padding={14}>
                  <AppText variant="caption" color="textSecondary">
                    {t('jr.programs.dayOf', { n: Number(n), total: PROGRAM_DAYS })} · {dayText(Number(n), 'reflect')}
                  </AppText>
                  <AppText variant="bodySerif" style={{ marginTop: 4 }}>
                    {x.text}
                  </AppText>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {live ? (
          <Card padding={18} testID="program-settings">
            <ToggleRow value={live.reminder.enabled} onValueChange={toggleReminder} label={t('jr.programs.reminder')} testID="program-reminder" />
            {live.reminder.enabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconButton icon="remove" label={t('alerts.reminders.earlier')} size={34} variant="soft" onPress={() => setProgramReminder(live.runId, { ...live.reminder, time: shiftTime(live.reminder.time, -30) }).then(refresh)} />
                <AppText variant="title3" style={{ minWidth: 70, textAlign: 'center' }}>
                  {formatTime(parseTime(live.reminder.time) ?? 0)}
                </AppText>
                <IconButton icon="add" label={t('alerts.reminders.later')} size={34} variant="soft" onPress={() => setProgramReminder(live.runId, { ...live.reminder, time: shiftTime(live.reminder.time, 30) }).then(refresh)} />
              </View>
            ) : null}
            <AppText variant="caption" color="textSecondary">
              {t('jr.programs.reminderHint')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: space[3], flexWrap: 'wrap' }}>
              {live.status === 'active' ? <Button label={t('jr.programs.pause')} icon="pause" size="sm" variant="quiet" onPress={async () => { await pauseProgram(live.runId); refresh(); }} testID="program-pause" /> : null}
              <Button label={t('jr.programs.stop')} size="sm" variant="ghost" onPress={stop} testID="program-stop" />
            </View>
          </Card>
        ) : null}

        <Card tone="muted" padding={18}>
          <AppText variant="smallStrong">{t('jr.programs.notTitle')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('jr.programs.notBody')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: space[2] }}>
            <Button label={t('nav.needHelpNow')} icon="heart-outline" variant="ghost" size="sm" onPress={() => router.push('/safety')} />
            <Button label={t('jr.programs.findSpecialist')} icon="medkit-outline" variant="ghost" size="sm" onPress={() => router.push('/specialists')} />
          </View>
        </Card>

        {PROGRAM_IDS.length > 1 ? (
          <Button label={t('jr.programs.allPrograms')} variant="ghost" iconRight="arrow-forward" onPress={() => router.push('/programs' as never)} style={{ alignSelf: 'center' }} />
        ) : null}
      </View>
    </Screen>
  );
}
