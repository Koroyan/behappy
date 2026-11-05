import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, Badge, Card, Icon, IconName, Screen, SectionHeader, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';

type Tone = 'primary' | 'peach' | 'lavender' | 'gold' | 'sage' | 'danger' | 'muted';

interface Tile {
  key: string;
  icon: IconName;
  tone: Tone;
  route: string;
  badge?: string;
}

const TONE_BG: Record<Tone, 'primarySoft' | 'peachSoft' | 'lavenderSoft' | 'goldSoft' | 'sageSoft' | 'dangerSoft' | 'surfaceMuted'> = {
  primary: 'primarySoft',
  peach: 'peachSoft',
  lavender: 'lavenderSoft',
  gold: 'goldSoft',
  sage: 'sageSoft',
  danger: 'dangerSoft',
  muted: 'surfaceMuted',
};
const TONE_FG: Record<Tone, 'onPrimarySoft' | 'onPeachSoft' | 'onLavenderSoft' | 'onGoldSoft' | 'onDangerSoft' | 'textSecondary'> = {
  primary: 'onPrimarySoft',
  peach: 'onPeachSoft',
  lavender: 'onLavenderSoft',
  gold: 'onGoldSoft',
  sage: 'onPrimarySoft',
  danger: 'onDangerSoft',
  muted: 'textSecondary',
};

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const { width, isCompact, sidebarWidth, gutter } = useLayout();
  const { entitlements } = useAccount();

  const columns = isCompact ? (width < 380 ? 1 : 2) : width - sidebarWidth > 1100 ? 4 : 3;
  const available = Math.min(width - sidebarWidth - gutter * 2, 1080);
  const tileWidth = (available - space[4] * (columns - 1)) / columns;

  const sections: { key: string; tiles: Tile[] }[] = [
    {
      key: 'calm',
      tiles: [
        { key: 'breathing', icon: 'leaf-outline', tone: 'sage', route: '/breathing' },
        { key: 'meditation', icon: 'flower-outline', tone: 'lavender', route: '/meditation' },
        { key: 'grounding', icon: 'hand-left-outline', tone: 'primary', route: '/grounding' },
      ],
    },
    {
      key: 'create',
      tiles: [
        { key: 'art', icon: 'color-palette-outline', tone: 'peach', route: '/art', badge: entitlements.artProgram.active ? undefined : t('art.session.freeBadge') },
        { key: 'cards', icon: 'albums-outline', tone: 'gold', route: '/cards' },
        { key: 'journal', icon: 'book-outline', tone: 'lavender', route: '/journal' },
        { key: 'anulia', icon: 'chatbubble-ellipses-outline', tone: 'primary', route: '/anulia' },
      ],
    },
    {
      key: 'understand',
      tiles: [
        { key: 'assessments', icon: 'clipboard-outline', tone: 'primary', route: '/assessments' },
        { key: 'insights', icon: 'analytics-outline', tone: 'sage', route: '/insights' },
        { key: 'goals', icon: 'flag-outline', tone: 'gold', route: '/goals' },
      ],
    },
    {
      key: 'support',
      tiles: [
        { key: 'safety', icon: 'heart-circle-outline', tone: 'danger', route: '/safety' },
        { key: 'safetyPlan', icon: 'shield-checkmark-outline', tone: 'sage', route: '/safety-plan' },
        { key: 'about', icon: 'information-circle-outline', tone: 'muted', route: '/about' },
        { key: 'pricing', icon: 'sparkles-outline', tone: 'gold', route: '/pricing', badge: entitlements.plus.active ? t('profile.plusPlan') : undefined },
      ],
    },
  ];

  return (
    <Screen tab title={t('explore.title')} subtitle={t('explore.subtitle')} testID="screen-explore">
      <View style={{ gap: space[8] }}>
        {sections.map((section) => (
          <View key={section.key}>
            <SectionHeader title={t(`explore.sections.${section.key}`)} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
              {section.tiles.map((tile) => (
                <Card
                  key={tile.key}
                  onPress={() => router.push(tile.route as any)}
                  accessibilityLabel={`${t(`explore.items.${tile.key}.title`)}. ${t(`explore.items.${tile.key}.subtitle`)}`}
                  padding={18}
                  testID={`explore-${tile.key}`}
                  style={{ width: columns === 1 ? '100%' : tileWidth, minHeight: isCompact ? 132 : 150 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors[TONE_BG[tile.tone]], alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={tile.icon} size={23} color={TONE_FG[tile.tone]} />
                    </View>
                    {tile.badge ? <Badge label={tile.badge} tone="gold" /> : <Icon name="arrow-forward" size={18} color="textTertiary" />}
                  </View>
                  <View style={{ marginTop: space[4], gap: 4 }}>
                    <AppText variant="title3">{t(`explore.items.${tile.key}.title`)}</AppText>
                    <AppText variant="small" color="textSecondary">
                      {t(`explore.items.${tile.key}.subtitle`)}
                    </AppText>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
