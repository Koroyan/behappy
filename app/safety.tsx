import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { COUNTRIES, defaultCountryFor, HELPLINE_DIRECTORY } from '@/content/safety';
import { AppText, Badge, Button, Card, Icon, Press, Screen, Sheet, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { loadSafetyPlan, planItemCount } from '@/lib/storage/safetyPlan';

const COUNTRY_KEY = '@behappy_safety_country';

/** Never paywalled, never needs an account, works offline. */
export default function SafetyScreen() {
  const router = useRouter();
  const { t, tl, language, locale } = useT();
  const { colors } = useTheme();
  const [code, setCode] = useState(defaultCountryFor(language));
  const [planCount, setPlanCount] = useState(0);
  useEffect(() => {
    loadSafetyPlan().then((p) => setPlanCount(planItemCount(p))).catch(() => {});
  }, []);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COUNTRY_KEY).then((v) => v && setCode(v)).catch(() => {});
  }, []);

  const country = COUNTRIES.find((c) => c.code === code);
  const regionName = (cc: string, fallback: string) => {
    try {
      return new (Intl as any).DisplayNames([locale], { type: 'region' }).of(cc) || fallback;
    } catch {
      return fallback;
    }
  };

  const choose = (next: string) => {
    setCode(next);
    setPicker(false);
    AsyncStorage.setItem(COUNTRY_KEY, next).catch(() => {});
  };

  const call = (digits: string) => Linking.openURL(`tel:${digits}`).catch(() => {});

  return (
    <Screen back title={t('safety.title')} width="reading" testID="screen-safety">
      <View style={{ gap: space[5] }}>
        <Card tone="danger" padding={22}>
          <AppText variant="title3" color="onDangerSoft">
            {t('safety.intro')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[4] }}>
            {(country?.emergency ?? ['112']).map((n) => (
              <Button key={n} label={t('safety.callEmergency', { number: n })} icon="call-outline" onPress={() => call(n)} variant="primary" testID={`call-${n}`} />
            ))}
          </View>
          <AppText variant="caption" color="onDangerSoft" style={{ marginTop: space[3] }}>
            {t('safety.emergencyLabel')} · {country ? regionName(country.code, country.name) : t('safety.otherCountry')}
          </AppText>
        </Card>

        <Press onPress={() => setPicker(true)} accessibilityLabel={t('safety.chooseCountry')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Icon name="globe-outline" size={20} color="textSecondary" />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="textTertiary">
              {t('safety.countryLabel')}
            </AppText>
            <AppText variant="callout">{country ? regionName(country.code, country.name) : t('safety.otherCountry')}</AppText>
          </View>
          <Icon name="chevron-down" size={18} color="textTertiary" />
        </Press>

        <View style={{ gap: space[3] }}>
          <AppText variant="title3">{t('safety.crisisLines')}</AppText>
          {country && country.lines.length ? (
            country.lines.map((line) => (
              <Card key={`${line.name}-${line.number}`} padding={18}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="bodyStrong">{line.name}</AppText>
                    <AppText variant="small" color="textSecondary">
                      {t(`safety.lineTypes.${line.type}`)}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {line.free ? <Badge label={t('safety.badges.free')} tone="primary" /> : null}
                      {line.allDay ? <Badge label={t('safety.badges.allDay')} tone="primary" /> : null}
                      {line.note === 'call or text' ? <Badge label={t('safety.badges.callOrText')} tone="muted" /> : null}
                    </View>
                  </View>
                  <Button label={line.number} icon="call-outline" variant="secondary" onPress={() => call(line.dial)} />
                </View>
              </Card>
            ))
          ) : (
            <AppText variant="small" color="textSecondary">
              {t('safety.noLocalLine')}
            </AppText>
          )}
          <Button label={t('safety.findHelpline')} icon="open-outline" variant="outline" onPress={() => Linking.openURL(HELPLINE_DIRECTORY)} />
        </View>

        <Card padding={20} testID="safety-plan-card">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="shield-checkmark-outline" size={22} color="primary" />
            <AppText variant="title3" style={{ flex: 1 }}>
              {t('safetyPlan.title')}
            </AppText>
          </View>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            {t('safetyPlan.cardBody')}
          </AppText>
          <Button label={planCount ? t('safetyPlan.open') : t('safetyPlan.create')} icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/safety-plan')} style={{ marginTop: space[4] }} testID="safety-plan-open" />
        </Card>

        <Card tone="sage" padding={20}>
          <AppText variant="title3">{t('safety.stepsTitle')}</AppText>
          <View style={{ gap: 10, marginTop: space[3] }}>
            {tl('safety.steps').map((s, i) => (
              <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
                <AppText variant="smallStrong" color="onPrimarySoft" style={{ width: 18 }}>
                  {i + 1}.
                </AppText>
                <AppText variant="body" style={{ flex: 1 }}>
                  {s}
                </AppText>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[4] }}>
            <Button label={t('safety.breathe')} icon="leaf-outline" variant="secondary" onPress={() => router.push('/breathing')} />
            <Button label={t('safety.groundingCta')} icon="hand-left-outline" variant="outline" onPress={() => router.push('/grounding')} testID="safety-grounding" />
          </View>
        </Card>

        <AppText variant="bodyStrong" align="center">
          {t('safety.notAlone')}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {t('safety.aiNote')} {t('safety.verifyNote')}
        </AppText>
      </View>

      <Sheet visible={picker} onClose={() => setPicker(false)} title={t('safety.chooseCountry')}>
        <View style={{ gap: 2, paddingBottom: space[4] }}>
          {[...COUNTRIES]
            .sort((a, b) => regionName(a.code, a.name).localeCompare(regionName(b.code, b.name), locale))
            .map((c) => (
              <Press key={c.code} onPress={() => choose(c.code)} accessibilityRole="radio" accessibilityState={{ selected: c.code === code }} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.code === code ? colors.primarySoft : 'transparent' }}>
                <AppText variant="callout">{regionName(c.code, c.name)}</AppText>
                <AppText variant="small" color="textSecondary">
                  {c.emergency.join(' / ')}
                </AppText>
              </Press>
            ))}
          <Press onPress={() => choose('OTHER')} style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
            <AppText variant="callout">{t('safety.otherCountry')}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t('safety.otherBody')}
            </AppText>
          </Press>
        </View>
      </Sheet>
    </Screen>
  );
}
