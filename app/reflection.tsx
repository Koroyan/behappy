/**
 * Daily reflection: today's facts (always, on the device), and on request an
 * AI reflection that the server checked against those facts. If it can't be
 * made, the facts stay — with an honest one-line reason.
 */
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, IconButton, Screen, SectionHeader, space, ToggleRow } from '@/design';
import { FactLine, useFactText } from '@/features/wellbeing/FactLine';
import { useT } from '@/i18n';
import { askNotificationPermission } from '@/lib/notifications/reminders';
import { subscribe } from '@/lib/storage/json';
import { dayKey, formatTime, parseTime } from '@/lib/wellbeing/dates';
import { EVENTS_TOPIC } from '@/lib/wellbeing/eventStore';
import { RECAP_CATEGORIES, RecapFact } from '@/lib/wellbeing/recap';
import { factsFor, loadReflection, makeReflection, REFLECTION_TOPIC, ReflectionRecord, setReflectionSettings } from '@/lib/wellbeing/reflectionStore';

export default function ReflectionScreen() {
  const params = useLocalSearchParams<{ auto?: string }>();
  const { t, language, formatDate } = useT();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadReflection>> | null>(null);
  const [facts, setFacts] = useState<RecapFact[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const autoDone = useRef(false);
  const describe = useFactText();
  const today = dayKey();

  const refresh = useCallback(() => {
    loadReflection().then(setData).catch(() => {});
    factsFor().then(setFacts).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const a = subscribe(REFLECTION_TOPIC, refresh);
    const b = subscribe(EVENTS_TOPIC, refresh);
    return () => {
      a();
      b();
    };
  }, [refresh]);

  const record: ReflectionRecord | undefined = data?.history.find((h) => h.day === today);
  const make = useCallback(async () => {
    setBusy(true);
    try {
      await makeReflection(language, LANGUAGE_NAMES[language] || 'English', { describe });
    } finally {
      setBusy(false);
    }
  }, [language, describe]);

  // Opened from the evening reminder: write it now (made on the phone, not while the app is closed).
  useEffect(() => {
    if (params.auto === '1' && data && !record && facts.length && !autoDone.current) {
      autoDone.current = true;
      make();
    }
  }, [params.auto, data, record, facts.length, make]);

  const s = data?.settings;
  const minute = parseTime(s?.time) ?? 21 * 60;

  return (
    <Screen back title={t('wb.reflection.title')} subtitle={t('wb.reflection.subtitle')} width="reading" testID="screen-reflection">
      <SectionHeader title={t('wb.reflection.factsTitle')} />
      <Card padding={16} style={{ marginBottom: space[4] }} testID="reflection-facts">
        {facts.length ? facts.map((f) => <FactLine key={f.id} fact={f} />) : <AppText variant="body" color="textSecondary">{t('wb.reflection.noFacts')}</AppText>}
      </Card>

      {record?.ai ? (
        <Card tone="primary" padding={20} style={{ marginBottom: space[4], gap: 10 }} testID="reflection-ai">
          <AppText variant="smallStrong" color="onPrimarySoft">
            {t('wb.reflection.aiTitle')}
          </AppText>
          <AppText variant="body">{record.ai.reflection}</AppText>
          {record.ai.patterns.length ? (
            <View style={{ gap: 4 }}>
              <AppText variant="smallStrong">{t('wb.reflection.patterns')}</AppText>
              {record.ai.patterns.map((p, i) => (
                <AppText key={i} variant="small">
                  • {p.text}
                </AppText>
              ))}
            </View>
          ) : null}
          {record.ai.suggestion ? (
            <View>
              <AppText variant="smallStrong">{t('wb.reflection.suggestion')}</AppText>
              <AppText variant="small">{record.ai.suggestion}</AppText>
            </View>
          ) : null}
          <AppText variant="caption" color="textTertiary">
            {t('wb.reflection.aiNote')}
          </AppText>
        </Card>
      ) : null}
      {record?.reason && record.source === 'facts' ? <Banner tone="info" body={t(`wb.reflection.reasons.${record.reason}`)} /> : null}

      <Button label={busy ? t('wb.reflection.making') : record?.ai ? t('wb.reflection.remake') : t('wb.reflection.make')} icon="sparkles-outline" onPress={make} loading={busy} disabled={!facts.length} fullWidth testID="reflection-make" />
      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[2] }}>
        {t('wb.reflection.privacy')}
      </AppText>

      {s ? (
        <>
          <SectionHeader title={t('wb.reflection.settings')} style={{ marginTop: space[5] }} />
          <ToggleRow
            label={t('wb.reflection.remind')}
            value={s.enabled}
            onValueChange={async (v) => {
              if (v) await askNotificationPermission();
              setReflectionSettings({ enabled: v });
            }}
            testID="reflection-remind"
          />
          {s.enabled ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space[3] }}>
              <AppText variant="small" style={{ flex: 1 }}>
                {t('wb.reflection.time')}
              </AppText>
              <IconButton icon="remove" label="−30" onPress={() => setReflectionSettings({ time: formatTime((minute + 24 * 60 - 30) % (24 * 60)) })} size={34} variant="soft" />
              <AppText variant="bodyStrong">{s.time}</AppText>
              <IconButton icon="add" label="+30" onPress={() => setReflectionSettings({ time: formatTime((minute + 30) % (24 * 60)) })} size={34} variant="soft" />
            </View>
          ) : null}
          <AppText variant="smallStrong" color="textSecondary" style={{ marginTop: space[2] }}>
            {t('wb.reflection.categories')}
          </AppText>
          {RECAP_CATEGORIES.map((c) => (
            <ToggleRow key={c} label={t(`wb.reflection.categoryNames.${c}`)} value={s.categories[c] !== false} onValueChange={(v) => setReflectionSettings({ categories: { ...s.categories, [c]: v } })} testID={`reflection-cat-${c}`} />
          ))}
          <ToggleRow label={t('wb.reflection.journalText')} value={s.journalText} onValueChange={(v) => setReflectionSettings({ journalText: v })} testID="reflection-journal-text" />
          <AppText variant="caption" color="textTertiary">
            {t('wb.reflection.journalTextNote')}
          </AppText>
          <ToggleRow label={t('wb.reflection.artSummaries')} value={s.artSummaries} onValueChange={(v) => setReflectionSettings({ artSummaries: v })} testID="reflection-art" />
          <AppText variant="caption" color="textTertiary">
            {t('wb.reflection.artSummariesNote')}
          </AppText>
        </>
      ) : null}

      {data && data.history.filter((h) => h.day !== today).length ? (
        <>
          <SectionHeader title={t('wb.reflection.history')} style={{ marginTop: space[5] }} />
          {data.history
            .filter((h) => h.day !== today)
            .slice(0, 14)
            .map((h) => (
              <Card key={h.day} padding={14} style={{ marginBottom: 8 }} onPress={() => setOpen(open === h.day ? null : h.day)} accessibilityLabel={h.day}>
                <AppText variant="bodyStrong">{formatDate(new Date(`${h.day}T12:00:00`).getTime(), { weekday: 'long', day: 'numeric', month: 'long' })}</AppText>
                {open === h.day ? (
                  <View style={{ marginTop: 8 }}>
                    {h.facts.map((f) => (
                      <FactLine key={f.id} fact={f} />
                    ))}
                    {h.ai ? (
                      <AppText variant="small" style={{ marginTop: 8 }}>
                        {h.ai.reflection}
                      </AppText>
                    ) : null}
                  </View>
                ) : (
                  <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                    {h.ai?.reflection || t('wb.reflection.factsOnly')}
                  </AppText>
                )}
              </Card>
            ))}
        </>
      ) : null}
    </Screen>
  );
}
