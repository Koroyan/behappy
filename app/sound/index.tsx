/**
 * Sounds: a catalog of finished tracks, one tap to play (lib/audio/tracks).
 * Sleep, relax, meditate, focus, frequency, nature and noise tracks, each a
 * designed, level-matched mix with its own timer. Nothing to set up; the
 * mixer ("Make your own mix") stays one tap away. All sounds are generated on
 * the device. No health claims (docs/ETHICS.md).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Banner, Button, Card, Chip, Icon, IconButton, Press, radius, Screen, SectionHeader, space, ToggleRow, useLayout } from '@/design';
import { useT } from '@/i18n';
import { lastFinished, pauseSound, prepareSounds, resumeSound, setMasterVolume, setSoundTimer, startSound, stopSound, useSoundSession } from '@/lib/audio/session';
import { loadSound, setSoundPrefs, SOUND_TOPIC } from '@/lib/audio/soundStore';
import { CATEGORIES, Track, TrackCategory, trackById, trackLayers, tracksIn } from '@/lib/audio/tracks';
import { subscribe } from '@/lib/storage/json';

type Filter = 'all' | TrackCategory;
const TIMERS = [15, 30, 45, 60, 90];
const clamp01 = (v: number) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
/** Old links (?mode=sleep|focus|relax|mix) open the matching shelf. */
const filterFrom = (mode?: string, category?: string): Filter => {
  if (category && (CATEGORIES as string[]).includes(category)) return category as TrackCategory;
  if (mode === 'sleep' || mode === 'focus' || mode === 'relax') return mode;
  return 'all';
};

export default function SoundsScreen() {
  const params = useLocalSearchParams<{ mode?: string; category?: string }>();
  const { t } = useT();
  const { width } = useLayout();
  const session = useSoundSession();
  const [filter, setFilter] = useState<Filter>(() => filterFrom(params.mode, params.category));
  const [store, setStore] = useState<Awaited<ReturnType<typeof loadSound>> | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Headache comfort lives with the mixer (silence first, a dim screen).
  useEffect(() => {
    if (params.mode === 'headache') router.replace('/sound/mixer?mode=headache' as any);
  }, [params.mode]);

  const refresh = useCallback(() => {
    loadSound().then(setStore).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    return subscribe(SOUND_TOPIC, refresh);
  }, [refresh]);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const recent = useMemo(() => {
    const ids: string[] = [];
    for (const h of store?.history || []) if (h.trackId && !ids.includes(h.trackId) && trackById(h.trackId)) ids.push(h.trackId);
    return ids.slice(0, 6).map((id) => trackById(id)!);
  }, [store]);

  // Prepare the likeliest next track in the background (sounds are generated once, then cached).
  const likely = recent[0] ?? (filter === 'all' ? null : tracksIn(filter)[0]);
  useEffect(() => {
    if (!likely || session) return;
    const timer = setTimeout(() => prepareSounds(trackLayers(likely).map((l) => l.spec)), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likely?.id]);

  const playing = trackById(session?.trackId);
  const title = (tr: Track) => t(`wb.sound.tracks.${tr.id}.title`);

  const tap = async (tr: Track) => {
    if (session?.trackId === tr.id) {
      if (session.state === 'paused') await resumeSound();
      else if (session.state === 'playing') await pauseSound();
      return;
    }
    await startSound({ mode: tr.mode, title: title(tr), layers: trackLayers(tr), minutes: tr.minutes, trackId: tr.id }).catch(() => {});
  };

  const master = store?.master ?? 0.5;
  const setMaster = (v: number) => {
    const m = clamp01(v);
    setMasterVolume(m);
    setSoundPrefs({ master: m }).catch(() => {});
  };

  const cols = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const tileWidth: `${number}%` = cols === 4 ? '23.5%' : cols === 3 ? '31.5%' : '48%';
  const focusDone = lastFinished && lastFinished.mode === 'focus' && now - lastFinished.at < 10 * 60000 && !session;
  const shelves: TrackCategory[] = filter === 'all' ? CATEGORIES : [filter];

  const tile = (tr: Track, w: number | `${number}%`) => {
    const active = session?.trackId === tr.id;
    const state = active ? session!.state : null;
    return (
      <Press
        key={tr.id}
        onPress={() => tap(tr)}
        feedback="scale"
        focusRadius={radius.lg}
        accessibilityRole="button"
        accessibilityLabel={`${title(tr)}. ${t(`wb.sound.tracks.${tr.id}.desc`)}`}
        accessibilityState={{ selected: active }}
        testID={`sound-track-${tr.id}`}
        style={{ width: w, gap: 6 }}
      >
        <LinearGradient colors={tr.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ aspectRatio: 1.25, borderRadius: radius.lg, padding: 12, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <Icon name={tr.icon} size={22} color="#FFFFFF" />
            {tr.binaural ? <Icon name="headset-outline" size={16} color="rgba(255,255,255,0.85)" accessibilityLabel={t('wb.sound.headphonesBadge')} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
            {tr.badge ? (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 }}>
                <AppText variant="caption" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                  {tr.badge}
                </AppText>
              </View>
            ) : (
              <View />
            )}
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={state === 'loading' ? 'hourglass-outline' : active && state === 'playing' ? 'pause' : 'play'} size={17} color={active ? tr.colors[0] : '#FFFFFF'} />
            </View>
          </View>
        </LinearGradient>
        <AppText variant="smallStrong" numberOfLines={2}>
          {title(tr)}
        </AppText>
        <AppText variant="caption" color="textTertiary" numberOfLines={2}>
          {t(`wb.sound.tracks.${tr.id}.desc`)}
        </AppText>
      </Press>
    );
  };

  const shelf = (tracks: Track[], key: string) =>
    filter === 'all' ? (
      <ScrollView key={key} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: space[2] }}>
        {tracks.map((tr) => tile(tr, 150))}
      </ScrollView>
    ) : (
      <View key={key} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        {tracks.map((tr) => tile(tr, tileWidth))}
      </View>
    );

  return (
    <Screen back title={t('wb.sound.title')} subtitle={t('wb.sound.catalogSubtitle')} width="reading" testID="screen-sound">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space[3] }}>
        {(['all', ...CATEGORIES] as Filter[]).map((c) => (
          <Chip key={c} label={t(`wb.sound.catalog.${c}`)} selected={filter === c} onPress={() => setFilter(c)} testID={`sound-cat-${c}`} />
        ))}
      </ScrollView>

      {focusDone ? <Banner tone="success" icon="checkmark-circle-outline" body={t('wb.sound.focusDone')} /> : null}

      {session ? (
        <Card tone="primary" padding={18} style={{ marginBottom: space[4], gap: 10 }} testID="sound-now">
          <AppText variant="caption" color="onPrimarySoft">
            {t('wb.sound.nowPlaying')}
          </AppText>
          <AppText variant="title3" numberOfLines={2}>
            {playing ? title(playing) : session.title}
          </AppText>
          <AppText variant="small" testID={`sound-now-state-${session.trackId ?? 'mix'}-${session.state}`}>
            {session.state === 'stopped' ? '…' : session.state === 'loading' ? t('wb.sound.preparing') : session.state === 'paused' ? t('wb.sound.paused') : t('wb.sound.playing')}
            {session.state === 'stopped' ? '' : session.endsAt ? ` · ${t('wb.sound.remaining', { time: mmss(session.endsAt - now) })}` : ` · ${t('wb.sound.untilStopped')}`}
          </AppText>
          {session.interrupted ? <AppText variant="small">{t('wb.sound.pausedBySystem')}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {session.state === 'paused' ? (
              <Button label={t('wb.sound.resume')} icon="play" onPress={() => resumeSound()} testID="sound-resume" />
            ) : (
              <Button label={t('wb.sound.pause')} icon="pause" onPress={() => pauseSound()} disabled={session.state === 'loading'} testID="sound-pause" />
            )}
            <Button label={t('wb.sound.stop')} icon="stop" variant="quiet" onPress={() => stopSound({ completed: false })} testID="sound-stop" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginStart: 'auto' }}>
              <IconButton icon="volume-low-outline" label={t('wb.sound.quieter')} onPress={() => setMaster(master - 0.1)} size={36} variant="soft" testID="sound-quieter" />
              <AppText variant="caption" style={{ minWidth: 22, textAlign: 'center' }}>
                {Math.round((master / 0.8) * 10)}
              </AppText>
              <IconButton icon="volume-high-outline" label={t('wb.sound.louder')} onPress={() => setMaster(Math.min(0.8, master + 0.1))} size={36} variant="soft" testID="sound-louder" />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TIMERS.map((m) => (
              <Chip key={m} label={t('wb.sound.minutes', { n: m })} onPress={() => setSoundTimer(m)} testID={`sound-timer-${m}`} />
            ))}
            <Chip label={t('wb.sound.noTimer')} selected={!session.endsAt} onPress={() => setSoundTimer(null)} testID="sound-timer-off" />
          </ScrollView>
          {playing?.binaural && store && !store.headphonesNoted ? (
            <Banner tone="info" icon="headset-outline" body={t('wb.sound.binaural.headphones')} action={<Button label={t('wb.sound.binaural.gotIt')} size="sm" variant="quiet" onPress={() => setSoundPrefs({ headphonesNoted: true })} />} />
          ) : null}
          {playing?.binaural ? (
            <AppText variant="caption" color="textTertiary" testID="sound-binaural-ears">
              {t('wb.sound.binaural.ears', { left: playing.binaural.carrier, right: playing.binaural.carrier + playing.binaural.beat, beat: playing.binaural.beat })} · {t('wb.sound.binaural.explain')}
            </AppText>
          ) : null}
          {playing?.categories.includes('frequencies') ? (
            <AppText variant="caption" color="textTertiary" testID="sound-frequency-note">
              {t('wb.sound.frequencyNote')}
            </AppText>
          ) : null}
          {session.mode === 'sleep' ? (
            <>
              <AppText variant="caption" color="textTertiary">
                {t('wb.sound.sleep.fadeNote')}
              </AppText>
              <ToggleRow label={t('wb.sound.sleep.morning')} value={store?.morningCheckIn ?? true} onValueChange={(v) => setSoundPrefs({ morningCheckIn: v })} />
            </>
          ) : null}
          <Button label={t('wb.sound.customize')} icon="options-outline" variant="quiet" size="sm" onPress={() => router.push(`/sound/mixer?mode=${session.mode}` as any)} testID="sound-customize" />
        </Card>
      ) : null}

      {filter === 'all' && recent.length ? (
        <View style={{ marginBottom: space[4] }}>
          <SectionHeader title={t('wb.sound.recent')} />
          {shelf(recent, 'recent')}
        </View>
      ) : null}

      {shelves.map((c) => (
        <View key={c} style={{ marginBottom: space[5] }}>
          {filter === 'all' ? <SectionHeader title={t(`wb.sound.catalog.${c}`)} actionLabel={t('wb.sound.seeAll')} onAction={() => setFilter(c)} /> : null}
          {shelf(tracksIn(c), c)}
        </View>
      ))}

      <View style={{ gap: 10, marginBottom: space[4] }}>
        <Card padding={16} onPress={() => router.push('/sound/mixer?mode=headache' as any)} accessibilityLabel={t('wb.sound.modes.headache')} testID="sound-headache">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="moon-outline" size={22} color="textSecondary" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('wb.sound.modes.headache')}</AppText>
              <AppText variant="caption" color="textTertiary">
                {t('wb.sound.modeHints.headache')}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </View>
        </Card>
        <Card padding={16} onPress={() => router.push('/sound/mixer?mode=mix' as any)} accessibilityLabel={t('wb.sound.customMix')} testID="sound-mixer">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="options-outline" size={22} color="textSecondary" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('wb.sound.customMix')}</AppText>
              <AppText variant="caption" color="textTertiary">
                {t('wb.sound.customMixHint')}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </View>
        </Card>
      </View>

      <AppText variant="caption" color="textTertiary" style={{ marginBottom: 6 }}>
        {t('wb.sound.background')}
      </AppText>
      <AppText variant="caption" color="textTertiary">
        {t('wb.sound.honesty')}
      </AppText>
    </Screen>
  );
}
