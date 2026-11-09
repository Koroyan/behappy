/**
 * Sleep companion: wind down (a sleep sound with a timer; it counts as the
 * bedtime Step) and, in the morning, one optional question: how did you sleep?
 * Self-reports only — no tracking, no scores, no medical claims.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Chip, IconButton, Screen, SectionHeader, space, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { startSound, useSoundSession } from '@/lib/audio/session';
import { loadSound } from '@/lib/audio/soundStore';
import { suggestTrack, trackLayers } from '@/lib/audio/tracks';
import { subscribe } from '@/lib/storage/json';
import { addDays, dayKey } from '@/lib/wellbeing/dates';
import { EVENTS_TOPIC, loadEvents, recordEvent, removeEvents } from '@/lib/wellbeing/eventStore';
import type { WellbeingEvent } from '@/lib/wellbeing/events';

export default function SleepScreen() {
  const params = useLocalSearchParams<{ morning?: string }>();
  const router = useRouter();
  const { t, tl, formatDate } = useT();
  const { toast } = useFeedback();
  const session = useSoundSession();
  const [events, setEvents] = useState<WellbeingEvent[]>([]);
  const [quality, setQuality] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const today = dayKey();

  const refresh = useCallback(() => {
    loadEvents().then(setEvents).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(EVENTS_TOPIC, refresh), [refresh]);

  const checkins = events.filter((e) => e.type === 'sleep.checkin' && e.day >= addDays(today, -6)).sort((a, b) => b.at - a.at);
  const todays = checkins.find((e) => e.day === today);
  const morning = params.morning === '1' || new Date().getHours() < 14;
  const labels = tl('wb.sleep.quality');

  const windDown = async () => {
    // The person's own latest sleep track, else rain and soft piano (a finished, level-matched track).
    const history = await loadSound().then((s) => s.history.map((h) => h.trackId)).catch(() => []);
    const track = suggestTrack('sleep', history);
    await recordEvent('sleep.bedtime', `routine:${today}`, { minutes: 0 });
    await startSound({ mode: 'sleep', title: t(`wb.sound.tracks.${track.id}.title`), layers: trackLayers(track), minutes: track.minutes, trackId: track.id });
    router.push('/sound?mode=sleep' as any);
  };

  const saveMorning = async () => {
    if (!quality) return;
    if (todays) await removeEvents([todays.id]);
    await recordEvent('sleep.checkin', today, { quality, ...(hours ? { hours } : {}) });
    toast(t('wb.sleep.savedMorning'));
    setQuality(null);
  };

  return (
    <Screen back title={t('wb.sleep.title')} subtitle={t('wb.sleep.subtitle')} width="reading" testID="screen-sleep">
      {morning && !todays ? (
        <Card tone="lavender" padding={20} style={{ marginBottom: space[4] }} testID="sleep-morning">
          <AppText variant="title3">{t('wb.sleep.morningTitle')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space[3] }}>
            {labels.map((label, i) => (
              <Chip key={label} label={`${i + 1} · ${label}`} selected={quality === i + 1} onPress={() => setQuality(i + 1)} testID={`sleep-quality-${i + 1}`} />
            ))}
          </View>
          <AppText variant="smallStrong" style={{ marginTop: space[3] }}>
            {t('wb.sleep.hours')}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <IconButton icon="remove" label="−" onPress={() => setHours((h) => (h && h > 1 ? h - 0.5 : null))} size={34} variant="soft" />
            <AppText variant="title3" style={{ minWidth: 70, textAlign: 'center' }}>
              {hours ? t('wb.sleep.hoursValue', { n: hours }) : '—'}
            </AppText>
            <IconButton icon="add" label="+" onPress={() => setHours((h) => Math.min(14, (h ?? 6.5) + 0.5))} size={34} variant="soft" />
          </View>
          <Button label={t('wb.sleep.saveMorning')} onPress={saveMorning} disabled={!quality} style={{ marginTop: space[4], alignSelf: 'flex-start' }} testID="sleep-save" />
        </Card>
      ) : null}

      <SectionHeader title={t('wb.sleep.tonight')} />
      <Card padding={20} style={{ marginBottom: space[4] }} testID="sleep-tonight">
        <AppText variant="body" color="textSecondary">
          {t('wb.sleep.routineHint')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
          <Button label={t('wb.sleep.startRoutine')} icon="moon" onPress={windDown} disabled={Boolean(session && session.mode === 'sleep')} testID="sleep-start" />
          <Button label={t('wb.sleep.sound')} icon="musical-notes-outline" variant="quiet" onPress={() => router.push('/sound?mode=sleep' as any)} />
        </View>
      </Card>

      <SectionHeader title={t('wb.sleep.week')} />
      {checkins.length ? (
        checkins.map((e) => (
          <AppText key={e.id} variant="small" color="textSecondary" style={{ paddingVertical: 4 }}>
            {formatDate(e.at, { weekday: 'short', day: 'numeric', month: 'short' })} · {Number(e.data?.quality)}/5 · {labels[Number(e.data?.quality) - 1] || ''}
            {e.data?.hours ? ` · ${t('wb.sleep.hoursValue', { n: Number(e.data.hours) })}` : ''}
          </AppText>
        ))
      ) : (
        <AppText variant="small" color="textTertiary">
          {t('wb.sleep.noData')}
        </AppText>
      )}
      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[5] }}>
        {t('wb.sleep.honesty')}
      </AppText>
    </Screen>
  );
}
