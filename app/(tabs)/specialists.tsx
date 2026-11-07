import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Chip, EmptyState, Icon, Press, Screen, Segmented, Sheet, Skeleton, space, TextField, useLayout, useTheme } from '@/design';
import { ProCard } from '@/features/pro/ProParts';
import { ProfileButton } from '@/features/shell/ProfileButton';
import { useT } from '@/i18n';
import { PublicPro, searchPros } from '@/lib/api/pros';

const SPECIALIZATIONS = ['anxiety', 'depression', 'panic', 'trauma', 'stress_burnout', 'relationships', 'family', 'grief', 'self_esteem', 'emotional_regulation', 'sleep', 'addiction', 'eating', 'ocd', 'children_adolescents', 'work_career', 'life_transitions', 'lgbtq', 'personal_growth'];
const PRICES = [0, 8000, 12000, 18000];

export default function Specialists() {
  const router = useRouter();
  const { isCompact } = useLayout();
  const { t, tp, formatPrice } = useT();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const [lang, setLang] = useState<AppLanguage | ''>(language);
  const [focus, setFocus] = useState('');
  const [mode, setMode] = useState<'' | 'online' | 'in_person'>('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState<PublicPro[] | null>(null);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState<null | 'language' | 'focus' | 'price'>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setList(await searchPros({ language: lang || undefined, specialization: focus || undefined, mode: mode || undefined, maxPrice: maxPrice || undefined, city: city.trim() || undefined, q: q.trim() || undefined }));
    } catch {
      setError(true);
      setList([]);
    }
  }, [lang, focus, mode, maxPrice, city, q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filterChip = (label: string, active: boolean, onPress: () => void, testID: string) => (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }}
    >
      <AppText variant="callout" color={active ? 'onPrimarySoft' : 'text'} numberOfLines={1}>
        {label}
      </AppText>
      <Icon name="chevron-down" size={14} color={active ? 'onPrimarySoft' : 'textSecondary'} />
    </Press>
  );

  return (
    <Screen tab title={t('specialists.title')} subtitle={t('specialists.subtitle')} headerRight={isCompact ? <ProfileButton /> : undefined} testID="screen-specialists">
      <View style={{ gap: space[4] }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {filterChip(lang ? LANGUAGE_NAMES[lang] : t('specialists.anyLanguage'), Boolean(lang), () => setSheet('language'), 'filter-language')}
          {filterChip(focus ? t(`specialists.specializations.${focus}`) : t('specialists.anyFocus'), Boolean(focus), () => setSheet('focus'), 'filter-focus')}
          {filterChip(maxPrice ? t('specialists.upTo', { price: formatPrice(maxPrice, 'GEL') }) : t('specialists.anyPrice'), Boolean(maxPrice), () => setSheet('price'), 'filter-price')}
        </ScrollView>
        <Segmented<'' | 'online' | 'in_person'>
          label={t('specialists.format')}
          value={mode}
          onChange={setMode}
          options={[
            { value: '', label: t('specialists.anyFormat') },
            { value: 'online', label: t('specialists.online') },
            { value: 'in_person', label: t('specialists.inPerson') },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <TextField value={q} onChangeText={setQ} placeholder={t('specialists.search')} returnKeyType="search" onSubmitEditing={load} containerStyle={{ flex: 2, minWidth: 220 }} testID="specialists-search" />
          <TextField value={city} onChangeText={setCity} placeholder={t('specialists.city')} returnKeyType="search" onSubmitEditing={load} containerStyle={{ flex: 1, minWidth: 140 }} />
        </View>

        {error ? <Banner tone="warning" body={t('common.errorBody')} action={<Button label={t('common.retry')} size="sm" variant="secondary" onPress={load} />} /> : null}

        {list === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={150} radius={22} />
            <Skeleton height={150} radius={22} />
          </View>
        ) : list.length ? (
          <>
            <AppText variant="smallStrong" color="textSecondary">
              {tp('specialists.results', list.length)}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {list.map((p) => (
                <ProCard key={p.id} pro={p} onPress={() => router.push(`/specialists/${p.id}` as any)} />
              ))}
            </View>
            <AppText variant="caption" color="textTertiary">
              {t('specialists.fairOrder')}
            </AppText>
          </>
        ) : (
          <EmptyState icon="people-outline" title={t('specialists.emptyTitle')} body={t('specialists.emptyBody')} />
        )}

        <Banner tone="info" body={t('specialists.disclaimer')} action={<Button label={t('community.getHelp')} size="sm" variant="danger" icon="heart-outline" onPress={() => router.push('/safety')} />} />
        <Button label={t('specialists.joinCta')} variant="ghost" iconRight="arrow-forward" onPress={() => router.push('/pro' as any)} testID="specialists-join" />
      </View>

      <Sheet visible={sheet === 'language'} onClose={() => setSheet(null)} title={t('specialists.language')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: space[4] }}>
          <Chip label={t('specialists.anyLanguage')} selected={!lang} onPress={() => { setLang(''); setSheet(null); }} />
          {SUPPORTED_LANGUAGES.map((l) => (
            <Chip key={l} label={LANGUAGE_NAMES[l]} selected={lang === l} onPress={() => { setLang(l); setSheet(null); }} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'focus'} onClose={() => setSheet(null)} title={t('specialists.focus')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: space[4] }}>
          <Chip label={t('specialists.anyFocus')} selected={!focus} onPress={() => { setFocus(''); setSheet(null); }} />
          {SPECIALIZATIONS.map((s) => (
            <Chip key={s} label={t(`specialists.specializations.${s}`)} selected={focus === s} onPress={() => { setFocus(s); setSheet(null); }} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={sheet === 'price'} onClose={() => setSheet(null)} title={t('specialists.price')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: space[4] }}>
          {PRICES.map((p) => (
            <Chip key={p} label={p ? t('specialists.upTo', { price: formatPrice(p, 'GEL') }) : t('specialists.anyPrice')} selected={maxPrice === p} onPress={() => { setMaxPrice(p); setSheet(null); }} />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
