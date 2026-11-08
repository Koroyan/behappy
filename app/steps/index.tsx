/**
 * My Steps: small routines on chosen days. Gentle consistency ("5 of 7
 * planned") by default; a classic streak only when the owner's ethics flag is
 * on AND the person opts in (docs/ETHICS.md).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Chip, Icon, IconButton, IconName, Screen, SectionHeader, Sheet, space, TextField, Toggle, useFeedback, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { askNotificationPermission } from '@/lib/notifications/reminders';
import { Goal, loadGoals } from '@/lib/storage/goals';
import { subscribe } from '@/lib/storage/json';
import { dayKey, formatTime, parseTime } from '@/lib/wellbeing/dates';
import { addStep, archiveStep, editStep, loadStepData, markStep, setShowStreaks, STEPS_TOPIC, undoMark } from '@/lib/wellbeing/stepStore';
import { classicStreak, consistency, monthGrid, Step, StepTemplate, stepsForDay, TEMPLATE_KEYS, TEMPLATES } from '@/lib/wellbeing/steps';

type Data = Awaited<ReturnType<typeof loadStepData>>;

export function stepName(step: Step, t: (k: string) => string) {
  return step.title?.trim() || t(`wb.steps.templates.${step.template}`);
}

export default function StepsScreen() {
  const router = useRouter();
  const { t, tl, formatDate } = useT();
  const { colors } = useTheme();
  const { confirm } = useFeedback();
  const { me } = useAccount();
  const streakAllowed = Boolean((me?.platform as { features?: { classicStreak?: boolean } } | undefined)?.features?.classicStreak);
  const [data, setData] = useState<Data | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<Step | null>(null);
  const [today, setToday] = useState(() => dayKey());
  const [month, setMonth] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() + 1 }));

  const refresh = useCallback(() => {
    setToday(dayKey());
    loadStepData().then(setData).catch(() => {});
    loadGoals().then(setGoals).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(STEPS_TOPIC, refresh), [refresh]);

  const steps = useMemo(() => (data?.steps || []).filter((s) => !s.archived), [data]);
  const marks = useMemo(() => data?.marks || [], [data]);
  const todays = stepsForDay(steps, marks, today);
  const week = consistency(steps, marks, today, 7);
  const showStreaks = streakAllowed && Boolean(data?.showStreaks);
  const grid = monthGrid(steps, marks, month.y, month.m);
  const weekdays = tl('wb.steps.weekdaysShort');

  const create = async (template: StepTemplate) => {
    setPicking(false);
    const step = await addStep(template);
    setEditing(step);
  };

  return (
    <Screen back title={t('wb.steps.title')} subtitle={t('wb.steps.subtitle')} width="reading" testID="screen-steps" headerRight={<IconButton icon="add" label={t('wb.steps.add')} onPress={() => setPicking(true)} variant="soft" testID="steps-add" />}>
      <SectionHeader title={t('wb.steps.today')} />
      {!steps.length ? (
        <Card tone="sage" padding={20} style={{ marginBottom: space[4] }}>
          <AppText variant="body">{t('wb.steps.empty')}</AppText>
          <Button label={t('wb.steps.add')} icon="add" onPress={() => setPicking(true)} style={{ marginTop: space[3], alignSelf: 'flex-start' }} testID="steps-add-first" />
        </Card>
      ) : todays.length ? (
        <View style={{ gap: space[3], marginBottom: space[4] }}>
          {todays.map(({ step, state, mark }) => {
            const tpl = TEMPLATES[step.template];
            const streak = showStreaks ? classicStreak(step, marks, today) : 0;
            return (
              <Card key={step.id} padding={16} testID={`step-${step.template}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: state === 'done' ? colors.sageSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={(state === 'done' ? 'checkmark' : tpl.icon) as IconName} size={20} color="onPrimarySoft" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong">{stepName(step, t)}</AppText>
                    <AppText variant="caption" color="textTertiary">
                      {[step.time || t('wb.steps.anyTime'), step.minutes ? t('wb.sound.minutes', { n: step.minutes }) : null, streak ? t('wb.steps.streak', { n: streak }) : null].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                  {state === 'done' ? <Badge label={t('wb.steps.done')} tone="success" icon="checkmark" /> : state === 'skipped' ? <Badge label={t('wb.steps.skipped')} tone="muted" /> : null}
                </View>
                {state === 'due' ? (
                  <>
                    {tpl.completes ? (
                      <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
                        {t('wb.steps.autoNote')}
                      </AppText>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {tpl.route ? <Button label={t('wb.steps.doIt')} icon="play" size="sm" onPress={() => router.push(tpl.route as any)} testID={`step-start-${step.template}`} /> : null}
                      <Button label={t('wb.steps.markDone')} icon="checkmark" size="sm" variant={tpl.route ? 'quiet' : 'primary'} onPress={() => markStep(step, today, 'done')} testID={`step-done-${step.template}`} />
                      <Button label={t('wb.steps.skip')} size="sm" variant="ghost" onPress={() => markStep(step, today, 'skipped')} testID={`step-skip-${step.template}`} />
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    {mark?.source === 'auto' ? (
                      <AppText variant="caption" color="textTertiary" style={{ flex: 1 }}>
                        {t('wb.steps.autoCompleted')}
                      </AppText>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <Button label={t('wb.steps.undo')} size="sm" variant="ghost" icon="arrow-undo" onPress={() => undoMark(step, today)} testID={`step-undo-${step.template}`} />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      ) : (
        <AppText variant="body" color="textSecondary" style={{ marginBottom: space[4] }}>
          {t('wb.steps.none')}
        </AppText>
      )}

      {week.planned ? (
        <Card tone="sage" padding={18} style={{ marginBottom: space[4] }} testID="steps-consistency">
          <AppText variant="title3">{t('wb.steps.consistency', { done: week.done, planned: week.planned })}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('wb.steps.consistencyHint')}
          </AppText>
        </Card>
      ) : null}

      {streakAllowed ? (
        <View style={{ marginBottom: space[4] }}>
          <Toggle label={t('wb.steps.streakOptIn')} value={Boolean(data?.showStreaks)} onValueChange={(v) => setShowStreaks(v)} testID="steps-streak-toggle" />
          <AppText variant="caption" color="textTertiary">
            {t('wb.steps.streakNote')}
          </AppText>
        </View>
      ) : null}

      {steps.length ? (
        <>
          <SectionHeader title={t('wb.steps.title')} />
          <View style={{ gap: 8, marginBottom: space[4] }}>
            {steps.map((s) => (
              <Card key={s.id} padding={14} onPress={() => setEditing(s)} accessibilityLabel={`${t('wb.steps.edit')}: ${stepName(s, t)}`} testID={`step-row-${s.template}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name={TEMPLATES[s.template].icon as IconName} size={18} color="textSecondary" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {stepName(s, t)}
                    </AppText>
                    <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                      {s.days.length === 7 ? t('wb.steps.everyDay') : [...s.days].sort().map((d) => weekdays[d]).join(' ')}
                      {s.time ? ` · ${s.time}` : ''}
                      {s.reminder ? ' · 🔔' : ''}
                      {` · ${t('wb.steps.consistency', consistency(steps, marks, today, 7, s.id))}`}
                    </AppText>
                  </View>
                  {s.paused ? <Badge label={t('wb.steps.paused')} tone="muted" /> : null}
                  <Icon name="chevron-forward" size={16} color="textTertiary" />
                </View>
              </Card>
            ))}
          </View>

          <SectionHeader title={t('wb.steps.calendar')} />
          <Card padding={14} style={{ marginBottom: space[4] }} testID="steps-calendar">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <IconButton icon="chevron-back" label={t('wb.steps.previousMonth')} onPress={() => setMonth(({ y, m }) => (m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }))} size={34} variant="soft" />
              <AppText variant="bodyStrong" align="center" style={{ flex: 1 }}>
                {formatDate(new Date(month.y, month.m - 1, 15).getTime(), { month: 'long', year: 'numeric' })}
              </AppText>
              <IconButton icon="chevron-forward" label={t('wb.steps.nextMonth')} onPress={() => setMonth(({ y, m }) => (m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }))} size={34} variant="soft" />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {weekdays.map((w) => (
                <AppText key={w} variant="caption" color="textTertiary" align="center" style={{ flex: 1 }}>
                  {w}
                </AppText>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: new Date(month.y, month.m - 1, 1).getDay() }).map((_, i) => (
                <View key={`pad${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />
              ))}
              {grid.map((g) => {
                const full = g.planned > 0 && g.done >= g.planned;
                const some = g.done > 0;
                return (
                  <View key={g.day} style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${g.day}: ${t('wb.steps.dayDone', { done: g.done, planned: g.planned })}`}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: full ? colors.sageSoft : some ? colors.primarySoft : 'transparent', borderWidth: g.day === today ? 1.5 : 0, borderColor: colors.brand }}>
                      <AppText variant="caption" color={g.planned ? 'text' : 'textTertiary'}>
                        {Number(g.day.slice(8))}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      ) : null}

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('wb.steps.add')}>
        <View style={{ gap: 8 }}>
          {TEMPLATE_KEYS.map((k) => (
            <Card key={k} padding={14} onPress={() => create(k)} accessibilityLabel={t(`wb.steps.templates.${k}`)} testID={`steps-template-${k}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name={TEMPLATES[k].icon as IconName} size={20} color="textSecondary" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{t(`wb.steps.templates.${k}`)}</AppText>
                  <AppText variant="caption" color="textTertiary">
                    {t(`wb.steps.templateHints.${k}`)}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </Sheet>

      {editing ? (
        <StepEditor
          step={editing}
          goals={goals.filter((g) => g.status === 'active')}
          onClose={() => setEditing(null)}
          onRemove={async () => {
            const ok = await confirm({ title: t('wb.steps.archive'), body: t('wb.steps.archiveConfirm'), confirmLabel: t('wb.steps.archive'), destructive: true });
            if (!ok) return;
            await archiveStep(editing.id);
            setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function StepEditor({ step, goals, onClose, onRemove }: { step: Step; goals: Goal[]; onClose: () => void; onRemove: () => void }) {
  const { t, tl } = useT();
  const weekdays = tl('wb.steps.weekdaysShort');
  const [draft, setDraft] = useState<Step>(step);
  const [permissionNote, setPermissionNote] = useState(false);
  const set = (patch: Partial<Step>) => setDraft((d) => ({ ...d, ...patch }));
  const minute = parseTime(draft.time);
  const shiftTime = (by: number) => set({ time: formatTime(((minute ?? 9 * 60) + by + 24 * 60) % (24 * 60)) });

  const save = async () => {
    const { id, createdAt, ...patch } = draft;
    void createdAt;
    await editStep(id, { ...patch, days: draft.days.length ? draft.days : [0, 1, 2, 3, 4, 5, 6] });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={t('wb.steps.edit')} footer={<Button label={t('wb.steps.save')} fullWidth onPress={save} testID="step-save" />}>
      <View style={{ gap: space[4] }}>
        <TextField value={draft.title ?? ''} onChangeText={(v) => set({ title: v })} placeholder={t(`wb.steps.templates.${draft.template}`)} label={t('wb.steps.name')} />
        <View style={{ gap: 6 }}>
          <AppText variant="smallStrong">{t('wb.steps.days')}</AppText>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {weekdays.map((w, i) => (
              <Chip key={w} label={w} selected={draft.days.includes(i)} onPress={() => set({ days: draft.days.includes(i) ? draft.days.filter((d) => d !== i) : [...draft.days, i].sort() })} testID={`step-day-${i}`} />
            ))}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <AppText variant="smallStrong">{t('wb.steps.time')}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton icon="remove" label={t('wb.steps.earlier')} onPress={() => shiftTime(-30)} size={36} variant="soft" />
            <AppText variant="title3" style={{ minWidth: 80, textAlign: 'center' }}>
              {draft.time ?? t('wb.steps.anyTime')}
            </AppText>
            <IconButton icon="add" label={t('wb.steps.later')} onPress={() => shiftTime(30)} size={36} variant="soft" />
            <Chip label={t('wb.steps.anyTime')} selected={!draft.time} onPress={() => set({ time: draft.time ? null : TEMPLATES[draft.template].time || '09:00', reminder: draft.time ? false : draft.reminder })} />
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <AppText variant="smallStrong">{t('wb.steps.minutes')}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton icon="remove" label={`${t('wb.steps.minutes')} −5`} onPress={() => set({ minutes: draft.minutes && draft.minutes > 5 ? draft.minutes - 5 : null })} size={36} variant="soft" />
            <AppText variant="title3" style={{ minWidth: 80, textAlign: 'center' }}>
              {draft.minutes ? t('wb.sound.minutes', { n: draft.minutes }) : t('wb.steps.noMinutes')}
            </AppText>
            <IconButton icon="add" label={`${t('wb.steps.minutes')} +5`} onPress={() => set({ minutes: Math.min(180, (draft.minutes || 0) + 5) })} size={36} variant="soft" />
          </View>
        </View>
        {draft.time ? (
          <View>
            <Toggle
              label={t('wb.steps.reminder')}
              value={draft.reminder}
              onValueChange={async (v) => {
                if (v && (await askNotificationPermission()) !== 'granted') {
                  setPermissionNote(true);
                  return;
                }
                set({ reminder: v });
              }}
              testID="step-reminder"
            />
            <AppText variant="caption" color="textTertiary">
              {t('wb.steps.reminderNote')}
            </AppText>
            {permissionNote ? <Banner tone="warning" body={t('alerts.reminders.denied')} /> : null}
          </View>
        ) : null}
        {goals.length ? (
          <View style={{ gap: 6 }}>
            <AppText variant="smallStrong">{t('wb.steps.goal')}</AppText>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Chip label={t('wb.steps.noGoal')} selected={!draft.goalId} onPress={() => set({ goalId: null })} />
              {goals.map((g) => (
                <Chip key={g.id} label={g.title} selected={draft.goalId === g.id} onPress={() => set({ goalId: g.id })} />
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button label={draft.paused ? t('wb.steps.resume') : t('wb.steps.pause')} icon={draft.paused ? 'play' : 'pause'} variant="quiet" size="sm" onPress={() => set({ paused: !draft.paused })} />
          <Button label={t('wb.steps.archive')} icon="trash-outline" variant="ghost" size="sm" onPress={onRemove} />
        </View>
      </View>
    </Sheet>
  );
}
