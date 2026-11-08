import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { DECKS } from '@/content/cardDecks';
import { pickLocalized } from '@/content/types';
import { AppText, Badge, Banner, Button, Card, Icon, Screen, space, useLayout, useTheme } from '@/design';
import { listOngoing } from '@/features/cards/storage';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';

export default function CardsScreen() {
  const router = useRouter();
  const { t, tp, language } = useT();
  const { colors } = useTheme();
  const { width, sidebarWidth, gutter, isCompact } = useLayout();
  const { entitlements } = useAccount();
  const [ongoing, setOngoing] = useState(0);

  useFocusEffect(
    useCallback(() => {
      listOngoing().then((l) => setOngoing(l.length));
    }, [])
  );

  const columns = isCompact ? (width < 380 ? 1 : 2) : width - sidebarWidth > 1100 ? 3 : 2;
  const available = Math.min(width - sidebarWidth - gutter * 2, 1080);
  const tile = Math.floor((available - space[4] * (columns - 1)) / columns); // whole dp: fractional sizes rounded to pixels overflowed the row and wrapped a column

  return (
    <Screen
      back
      title={t('cards.title')}
      subtitle={t('cards.subtitle')}
      headerRight={<Button label={t('cards.history')} icon="time-outline" variant="quiet" size="sm" onPress={() => router.push('/cards/history')} />}
      testID="screen-cards"
    >
      <View style={{ gap: space[5] }}>
        <Banner tone="info" body={entitlements.plus.active ? t('cards.noDiagnosis') : `${t('cards.access.trial')} ${t('cards.noDiagnosis')}`} />
        {ongoing ? (
          <Card tone="gold" padding={16} onPress={() => router.push('/cards/history')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="chatbubbles-outline" size={20} color="onGoldSoft" />
              <AppText variant="smallStrong" color="onGoldSoft" style={{ flex: 1 }}>
                {t('cards.continueOngoing')}
              </AppText>
              <Icon name="chevron-forward" size={18} color="onGoldSoft" />
            </View>
          </Card>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
          {DECKS.map((d) => (
            <Card key={d.id} padding={0} onPress={() => router.push(`/cards/${d.id}`)} accessibilityLabel={pickLocalized(d.title, language)} style={{ width: columns === 1 ? '100%' : tile, overflow: 'hidden' }} testID={`deck-${d.id}`}>
              <View style={{ height: isCompact ? 150 : 180, backgroundColor: colors.surfaceSunken }}>
                <Image source={d.cards[0]} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={200} />
                <View style={{ position: 'absolute', left: 12, top: 12 }}>
                  <Badge label={tp('cards.countCards', d.cards.length)} tone="muted" />
                </View>
              </View>
              <View style={{ padding: 18, gap: 4 }}>
                <AppText variant="title3">{pickLocalized(d.title, language)}</AppText>
                <AppText variant="small" color="textSecondary">
                  {pickLocalized(d.description, language)}
                </AppText>
                <AppText variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                  {d.mode === 'pair' ? t('cards.choosePair') : t('cards.chooseOne')}
                </AppText>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
