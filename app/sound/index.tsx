/**
 * Sound Lab: Focus, Sleep, Relax, Headache comfort and a mixer. All sounds are
 * generated on the device (lib/audio/synth): noise colours, nature-like
 * textures and true stereo binaural tones. No health claims (docs/ETHICS.md).
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { AppText, Banner, Button, Card, Chip, Icon, IconButton, ProgressBar, Screen, SectionHeader, Sheet, space, TextField, ToggleRow, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { bandOf, binauralLayer, HEADACHE_MAX_VOLUME, layerFor, LIBRARY, nameKey, noiseLayer, PRESETS, STYLE_MIXES } from '@/lib/audio/presets';
import { lastFinished, pauseSound, resumeSound, setLayerVolume, setMasterVolume, startSound, stopSound, updateLayers, useSoundSession } from '@/lib/audio/session';
import { loadSound, MixLayer, removeFavorite, saveFavorite, setSoundPrefs, SOUND_TOPIC, SoundMode } from '@/lib/audio/soundStore';
import { BEAT_BANDS, BeatBand, binaural, CARRIER } from '@/lib/audio/synth';
import { subscribe } from '@/lib/storage/json';

const MODES: SoundMode[] = ['focus', 'sleep', 'relax', 'headache', 'mix'];
const clamp01 = (v: number) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function SoundLabScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { t, formatDate } = useT();
  const { toast } = useFeedback();
  const session = useSoundSession();
  const initial = (MODES.includes(params.mode as SoundMode) ? params.mode : session?.mode || 'focus') as SoundMode;
  const [mode, setMode] = useState<SoundMode>(initial);
  const [layers, setLayers] = useState<MixLayer[]>(PRESETS[initial].layers);
  const [minutes, setMinutes] = useState<number | null>(PRESETS[initial].minutes);
  const [store, setStore] = useState<Awaited<ReturnType<typeof loadSound>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [mixName, setMixName] = useState('');
  const [dim, setDim] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    loadSound().then(setStore).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    return subscribe(SOUND_TOPIC, refresh);
  }, [refresh]);
  // A clock for the remaining time (only while something is playing).
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const live = session && session.mode === mode ? session : null;
  const shown = live ? live.layers : layers;
  const cap = mode === 'headache' ? HEADACHE_MAX_VOLUME : 1;

  const chooseMode = (m: SoundMode) => {
    setMode(m);
    if (!(session && session.mode === m)) {
      setLayers(PRESETS[m].layers);
      setMinutes(PRESETS[m].minutes);
    }
  };

  const change = (next: MixLayer[]) => {
    const capped = next.map((l) => ({ ...l, volume: Math.min(cap, l.volume) }));
    if (live) updateLayers(capped).catch(() => {});
    else setLayers(capped);
  };
  const setVol = (id: string, v: number) => {
    const volume = Math.min(cap, clamp01(v));
    if (live) setLayerVolume(id, volume);
    else setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, volume } : l)));
  };

  const hasBinaural = shown.some((l) => l.spec.kind === 'binaural');
  const needsHeadphonesNote = hasBinaural && store && !store.headphonesNoted;

  const play = async () => {
    try {
      await startSound({ mode, title: t(`wb.sound.modes.${mode}`), layers: shown, minutes });
    } catch {
      toast(t('errors.saveFailed'));
    }
  };

  const binauralLayerNow = shown.find((l) => l.spec.kind === 'binaural');
  const bin = binauralLayerNow?.spec.kind === 'binaural' ? binauralLayerNow.spec : null;
  const setBinaural = (carrier: number, beat: number) => {
    try {
      const spec = binaural(carrier, beat);
      change(shown.map((l) => (l.spec.kind === 'binaural' ? { ...l, spec } : l)));
    } catch {
      // outside the safe range: ignore the tap
    }
  };

  const master = store?.master ?? 0.5;
  const setMaster = (v: number) => {
    const m = clamp01(v);
    setMasterVolume(m);
    setSoundPrefs({ master: m }).catch(() => {});
  };

  const focusDone = lastFinished && lastFinished.mode === 'focus' && now - lastFinished.at < 10 * 60000 && !session;
  const addable = LIBRARY.filter((s) => !shown.some((l) => l.id === layerFor(s).id));
  const timers = PRESETS[mode].timers;
  const recent = (store?.history || []).slice(0, 6);

  const levelRow = (label: string, value: number, onChange: (v: number) => void, max = 1, testID?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} testID={testID}>
      <IconButton icon="remove" label={`${t('wb.sound.quieter')}: ${label}`} onPress={() => onChange(value - 0.1)} size={36} variant="soft" />
      <View style={{ flex: 1, gap: 4 }}>
        <ProgressBar value={max ? value / max : 0} label={t('wb.sound.level', { n: Math.round((value / max) * 10) })} />
      </View>
      <IconButton icon="add" label={`${t('wb.sound.louder')}: ${label}`} onPress={() => onChange(Math.min(max, value + 0.1))} size={36} variant="soft" />
    </View>
  );

  return (
    <Screen back title={t('wb.sound.title')} subtitle={t('wb.sound.subtitle')} width="reading" testID="screen-sound">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space[2] }}>
        {MODES.map((m) => (
          <Chip key={m} label={t(`wb.sound.modes.${m}`)} selected={mode === m} onPress={() => chooseMode(m)} testID={`sound-mode-${m}`} />
        ))}
      </ScrollView>
      <AppText variant="body" color="textSecondary" style={{ marginBottom: space[3] }}>
        {t(`wb.sound.modeHints.${mode}`)}
      </AppText>

      {mode === 'relax' || mode === 'mix' ? (
        <View style={{ gap: 6, marginBottom: space[3] }}>
          <AppText variant="smallStrong" color="textSecondary">
            {t('wb.sound.styleMixes')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STYLE_MIXES.map((m) => (
              <Chip key={m.id} label={m.label} icon="musical-notes-outline" selected={shown.some((l) => l.id === 'tones')} onPress={() => change(m.layers())} testID={`sound-style-${m.id}`} />
            ))}
          </View>
          {shown.some((l) => l.id === 'tones') ? (
            <AppText variant="caption" color="textTertiary">
              {t('wb.sound.tonesNote')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {focusDone ? <Banner tone="success" icon="checkmark-circle-outline" body={t('wb.sound.focusDone')} /> : null}
      {mode === 'headache' ? <Banner tone="info" icon="moon-outline" body={t('wb.sound.headache.silenceNote')} /> : null}

      {session ? (
        <Card tone="primary" padding={20} style={{ marginBottom: space[4] }} testID="sound-now">
          <AppText variant="caption" color="onPrimarySoft">
            {t('wb.sound.nowPlaying')} · {t(`wb.sound.modes.${session.mode}`)}
          </AppText>
          <AppText variant="title2" style={{ marginTop: 4 }}>
            {session.state === 'loading' ? t('wb.sound.loading') : session.state === 'paused' ? t('wb.sound.paused') : t('wb.sound.playing')}
            {session.endsAt ? ` · ${t('wb.sound.remaining', { time: mmss(session.endsAt - now) })}` : ''}
          </AppText>
          {session.interrupted ? (
            <AppText variant="small" style={{ marginTop: 6 }}>
              {t('wb.sound.pausedBySystem')}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
            {session.state === 'paused' ? (
              <Button label={t('wb.sound.resume')} icon="play" onPress={() => resumeSound()} testID="sound-resume" />
            ) : (
              <Button label={t('wb.sound.pause')} icon="pause" onPress={() => pauseSound()} disabled={session.state === 'loading'} testID="sound-pause" />
            )}
            <Button label={t('wb.sound.stop')} icon="stop" variant="quiet" onPress={() => stopSound({ completed: false })} testID="sound-stop" />
          </View>
          <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
            {t('wb.sound.background')}
          </AppText>
        </Card>
      ) : null}

      {mode === 'headache' ? (
        <View style={{ gap: space[3], marginBottom: space[4] }}>
          <Button label={t('wb.sound.headache.dim')} icon="moon" onPress={() => setDim(true)} testID="sound-dim" />
          <ToggleRow
            label={t('wb.sound.headache.softSound')}
            value={shown.some((l) => l.id === 'noise-brown')}
            onValueChange={(on) => change(on ? [noiseLayer('brown', 0.1)] : [])}
            testID="sound-headache-soft"
          />
        </View>
      ) : null}

      {shown.length ? (
        <View style={{ gap: space[3], marginBottom: space[4] }}>
          <SectionHeader title={t('wb.sound.layers')} />
          {shown.map((l) => (
            <Card key={l.id} padding={16} testID={`sound-layer-${l.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Icon name={l.spec.kind === 'binaural' ? 'headset-outline' : l.spec.kind === 'noise' ? 'radio-outline' : l.spec.kind === 'pad' || l.spec.kind === 'tones' ? 'musical-note-outline' : 'rainy-outline'} size={20} color="textSecondary" />
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {t(`wb.sound.names.${nameKey(l.spec)}`)}
                </AppText>
                {mode !== 'headache' ? <IconButton icon="close" label={`${t('wb.sound.remove')}: ${t(`wb.sound.names.${nameKey(l.spec)}`)}`} onPress={() => change(shown.filter((x) => x.id !== l.id))} size={32} variant="soft" /> : null}
              </View>
              {levelRow(t(`wb.sound.names.${nameKey(l.spec)}`), l.volume, (v) => setVol(l.id, v), cap)}
            </Card>
          ))}
        </View>
      ) : null}

      {bin ? (
        <Card padding={18} style={{ marginBottom: space[4], gap: 10 }} testID="sound-binaural">
          <AppText variant="bodyStrong">{t('wb.sound.binaural.title')}</AppText>
          <AppText variant="small" color="textSecondary">
            {t('wb.sound.binaural.explain')}
          </AppText>
          <AppText variant="smallStrong" testID="sound-binaural-ears">
            {t('wb.sound.binaural.ears', { left: bin.leftHz, right: bin.rightHz, beat: Math.round((bin.rightHz - bin.leftHz) * 10) / 10 })}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(BEAT_BANDS) as BeatBand[]).map((b) => (
              <Chip
                key={b}
                label={`${t(`wb.sound.binaural.bands.${b}`)} · ${t('wb.sound.binaural.bandHint', { min: BEAT_BANDS[b].min, max: BEAT_BANDS[b].max })}`}
                selected={bandOf(bin.rightHz - bin.leftHz) === b}
                onPress={() => setBinaural(bin.leftHz, BEAT_BANDS[b].preset)}
                testID={`sound-band-${b}`}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText variant="small" style={{ flex: 1 }}>
              {t('wb.sound.binaural.carrier')}: {bin.leftHz} Hz
            </AppText>
            <IconButton icon="remove" label={`${t('wb.sound.binaural.carrier')} −10 Hz`} onPress={() => setBinaural(Math.max(CARRIER.min, bin.leftHz - 10), bin.rightHz - bin.leftHz)} size={34} variant="soft" />
            <IconButton icon="add" label={`${t('wb.sound.binaural.carrier')} +10 Hz`} onPress={() => setBinaural(Math.min(CARRIER.max, bin.leftHz + 10), bin.rightHz - bin.leftHz)} size={34} variant="soft" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText variant="small" style={{ flex: 1 }}>
              {t('wb.sound.binaural.beat')}: {Math.round((bin.rightHz - bin.leftHz) * 10) / 10} Hz
            </AppText>
            <IconButton icon="remove" label={`${t('wb.sound.binaural.beat')} −0.5 Hz`} onPress={() => setBinaural(bin.leftHz, bin.rightHz - bin.leftHz - 0.5)} size={34} variant="soft" testID="sound-beat-down" />
            <IconButton icon="add" label={`${t('wb.sound.binaural.beat')} +0.5 Hz`} onPress={() => setBinaural(bin.leftHz, bin.rightHz - bin.leftHz + 0.5)} size={34} variant="soft" testID="sound-beat-up" />
          </View>
        </Card>
      ) : null}
      {needsHeadphonesNote ? (
        <Banner tone="info" icon="headset-outline" body={t('wb.sound.binaural.headphones')} action={<Button label={t('wb.sound.binaural.gotIt')} size="sm" variant="quiet" onPress={() => setSoundPrefs({ headphonesNoted: true })} />} />
      ) : null}

      {mode !== 'headache' ? (
        <View style={{ gap: 8, marginBottom: space[4] }}>
          <AppText variant="smallStrong" color="textSecondary">
            {t('wb.sound.add')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {addable.map((s) => (
              <Chip key={layerFor(s).id} label={t(`wb.sound.names.${nameKey(s)}`)} icon="add" onPress={() => change([...shown, layerFor(s, 0.3)])} testID={`sound-add-${layerFor(s).id}`} />
            ))}
            {!hasBinaural ? <Chip label={t('wb.sound.names.binaural')} icon="headset-outline" onPress={() => change([...shown, binauralLayer(200, 10, 0.2)])} testID="sound-add-binaural" /> : null}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8, marginBottom: space[4] }}>
        <AppText variant="smallStrong" color="textSecondary">
          {t('wb.sound.timer')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('wb.sound.noTimer')} selected={minutes === null} onPress={() => setMinutes(null)} />
          {timers.map((m) => (
            <Chip key={m} label={t('wb.sound.minutes', { n: m })} selected={minutes === m} onPress={() => setMinutes(m)} testID={`sound-timer-${m}`} />
          ))}
          <Chip label={`${t('wb.sound.custom')}${minutes && !timers.includes(minutes) ? `: ${t('wb.sound.minutes', { n: minutes })}` : ''}`} selected={Boolean(minutes && !timers.includes(minutes))} onPress={() => setMinutes((m) => Math.min(180, (m && !timers.includes(m) ? m : 0) + 5))} />
        </View>
        {mode === 'sleep' ? (
          <>
            <AppText variant="caption" color="textTertiary">
              {t('wb.sound.sleep.fadeNote')}
            </AppText>
            <ToggleRow label={t('wb.sound.sleep.morning')} value={store?.morningCheckIn ?? true} onValueChange={(v) => setSoundPrefs({ morningCheckIn: v })} />
          </>
        ) : null}
      </View>

      <View style={{ gap: 6, marginBottom: space[4] }}>
        <AppText variant="smallStrong" color="textSecondary">
          {t('wb.sound.master')}
        </AppText>
        {levelRow(t('wb.sound.master'), master, setMaster, 0.8, 'sound-master')}
      </View>

      {!live ? <Button label={t('wb.sound.play')} icon="play" onPress={play} disabled={!shown.length} fullWidth testID="sound-play" /> : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
        {shown.length ? <Button label={t('wb.sound.saveMix')} icon="heart-outline" variant="quiet" size="sm" onPress={() => setSaving(true)} testID="sound-save" /> : null}
      </View>

      <SectionHeader title={t('wb.sound.favorites')} style={{ marginTop: space[5] }} />
      {store?.favorites.length ? (
        <View style={{ gap: 8 }}>
          {store.favorites.map((f) => (
            <Card key={f.id} padding={14} onPress={() => { setMode(f.mode); setLayers(f.layers); }} accessibilityLabel={f.name}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="heart" size={18} color="textSecondary" />
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {f.name}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {t(`wb.sound.modes.${f.mode}`)}
                </AppText>
                <IconButton icon="trash-outline" label={`${t('wb.sound.delete')}: ${f.name}`} onPress={() => removeFavorite(f.id)} size={32} variant="soft" />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <AppText variant="small" color="textTertiary">
          {t('wb.sound.noFavorites')}
        </AppText>
      )}

      <SectionHeader title={t('wb.sound.history')} style={{ marginTop: space[5] }} />
      {recent.length ? (
        recent.map((h) => (
          <AppText key={h.id} variant="small" color="textSecondary" style={{ paddingVertical: 4 }}>
            {formatDate(h.startedAt, { day: 'numeric', month: 'short' })} · {t('wb.sound.sessionLine', { mode: t(`wb.sound.modes.${h.mode}`), minutes: h.minutes })}
          </AppText>
        ))
      ) : (
        <AppText variant="small" color="textTertiary">
          {t('wb.sound.noHistory')}
        </AppText>
      )}

      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[5] }}>
        {t('wb.sound.honesty')}
      </AppText>

      <Sheet visible={saving} onClose={() => setSaving(false)} title={t('wb.sound.saveMix')} footer={<Button label={t('wb.sound.save')} fullWidth onPress={async () => { await saveFavorite(mixName || t(`wb.sound.modes.${mode}`), mode, shown); setSaving(false); setMixName(''); toast(t('wb.sound.saved')); }} testID="sound-save-confirm" />}>
        <TextField value={mixName} onChangeText={setMixName} placeholder={t('wb.sound.mixName')} />
      </Sheet>

      <Modal visible={dim} transparent animationType="fade" onRequestClose={() => setDim(false)} statusBarTranslucent>
        <Pressable onPress={() => setDim(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 48 }} accessibilityLabel={t('wb.sound.headache.undim')} testID="sound-dim-overlay">
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t('wb.sound.headache.undim')}
          </AppText>
        </Pressable>
      </Modal>
    </Screen>
  );
}
