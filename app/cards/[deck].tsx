import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { getDeck } from '@/content/cardDecks';
import { pickLocalized } from '@/content/types';
import { AppText, Badge, Button, Icon, Press, Screen, Sheet, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';

export default function DeckScreen() {
  const { deck: deckId } = useLocalSearchParams<{ deck: string }>();
  const deck = getDeck(String(deckId));
  const router = useRouter();
  const { t, language } = useT();
  const { colors } = useTheme();
  const { width, sidebarWidth, gutter, isCompact } = useLayout();
  const [single, setSingle] = useState<number | null>(null);
  const [light, setLight] = useState<number | null>(null);
  const [heavy, setHeavy] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  if (!deck) {
    return (
      <Screen back title={t('cards.title')}>
        <AppText>{t('errors.loadFailed')}</AppText>
      </Screen>
    );
  }

  const columns = isCompact ? 3 : width - sidebarWidth > 1100 ? 6 : 5;
  const available = Math.min(width - sidebarWidth - gutter * 2, 1080);
  const size = Math.floor((available - space[3] * (columns - 1)) / columns); // whole dp: fractional sizes rounded to pixels overflowed the row and wrapped a column
  const portrait = deck.id === 'moments';
  const ready = deck.mode === 'single' ? single !== null : light !== null && heavy !== null;

  const begin = () => {
    if (!ready) return;
    const q = deck.mode === 'single' ? `card=${single}` : `light=${light}&heavy=${heavy}`;
    router.push(`/cards/chat?deck=${deck.id}&${q}`);
  };

  const roleOf = (i: number) => (deck.mode === 'single' ? (single === i ? 'selected' : null) : light === i ? 'light' : heavy === i ? 'heavy' : null);

  return (
    <Screen back title={pickLocalized(deck.title, language)} subtitle={pickLocalized(deck.description, language)} testID="screen-deck"
      footer={
        <View style={{ paddingHorizontal: gutter, paddingVertical: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ maxWidth: 1080, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {deck.mode === 'pair' ? (
                <>
                  <Badge label={`${t('cards.pairLight')}: ${light !== null ? light + 1 : '—'}`} tone={light !== null ? 'gold' : 'muted'} icon="sunny-outline" />
                  <Badge label={`${t('cards.pairHeavy')}: ${heavy !== null ? heavy + 1 : '—'}`} tone={heavy !== null ? 'lavender' : 'muted'} icon="cloud-outline" />
                </>
              ) : (
                <AppText variant="small" color="textSecondary">
                  {single !== null ? t('cards.preview', { number: single + 1 }) : t('cards.chooseOne')}
                </AppText>
              )}
            </View>
            <Button label={t('cards.begin')} iconRight="arrow-forward" onPress={begin} disabled={!ready} testID="cards-begin" />
          </View>
        </View>
      }
    >
      <AppText variant="smallStrong" color="textSecondary" style={{ marginBottom: space[3] }}>
        {deck.mode === 'pair' ? t('cards.choosePair') : t('cards.chooseOne')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
        {deck.cards.map((src, i) => {
          const role = roleOf(i);
          return (
            <Press
              key={i}
              onPress={() => setPreview(i)}
              feedback="scale"
              accessibilityLabel={t('cards.preview', { number: i + 1 })}
              accessibilityState={{ selected: Boolean(role) }}
              testID={`card-${i}`}
              style={{
                width: size,
                height: portrait ? size * 1.5 : size,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: role ? 3 : 0,
                borderColor: role === 'heavy' ? colors.lavender : role === 'light' ? colors.gold : colors.brand,
                backgroundColor: colors.surfaceSunken,
              }}
            >
              <Image source={src} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={150} recyclingKey={`${deck.id}-${i}`} />
              {role ? (
                <View style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={role === 'heavy' ? 'cloud' : role === 'light' ? 'sunny' : 'checkmark'} size={15} color="text" />
                </View>
              ) : null}
            </Press>
          );
        })}
      </View>

      <Sheet
        visible={preview !== null}
        onClose={() => setPreview(null)}
        title={preview !== null ? t('cards.preview', { number: preview + 1 }) : undefined}
        maxWidth={560}
        footer={
          preview !== null ? (
            deck.mode === 'single' ? (
              <Button label={single === preview ? t('cards.selected') : t('cards.select')} icon="checkmark" onPress={() => { setSingle(preview); setPreview(null); }} fullWidth testID="card-select" />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label={t('cards.selectLight')} icon="sunny-outline" variant="secondary" onPress={() => { setLight(preview); if (heavy === preview) setHeavy(null); setPreview(null); }} style={{ flex: 1 }} testID="card-select-light" />
                <Button label={t('cards.selectHeavy')} icon="cloud-outline" variant="secondary" onPress={() => { setHeavy(preview); if (light === preview) setLight(null); setPreview(null); }} style={{ flex: 1 }} testID="card-select-heavy" />
              </View>
            )
          ) : null
        }
      >
        {preview !== null ? <Image source={deck.cards[preview]} contentFit="contain" style={{ width: '100%', aspectRatio: portrait ? 2 / 3 : 1, borderRadius: 18, backgroundColor: colors.surfaceSunken }} /> : null}
      </Sheet>
    </Screen>
  );
}
