/**
 * Tools: every self-help practice in one place, as its own tab on phones.
 * Search, quick ways in for right now, card therapy up front, what you used
 * recently (kept on this device), then the tools by purpose. Safety help is
 * always here and always free.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Badge, Card, Chip, Icon, Press, Screen, SectionHeader, space, TextField, useLayout, useTheme } from '@/design';
import { ProfileButton } from '@/features/shell/ProfileButton';
import { QUICK, TONE_BG, TONE_FG, Tool, ToolSection, TOOLS } from '@/features/tools/catalog';
import { useToolFlags } from '@/features/tools/useToolFlags';
import { useT } from '@/i18n';
import { subscribe } from '@/lib/storage/json';
import { loadRecentTools, markToolUsed, RecentTool, RECENT_TOOLS_TOPIC } from '@/lib/storage/recentTools';

const SECTIONS: { key: ToolSection; title: string }[] = [
  { key: 'calm', title: 'explore.sections.calm' },
  { key: 'grow', title: 'wb.tools.section' },
  { key: 'create', title: 'explore.sections.create' },
  { key: 'understand', title: 'explore.sections.understand' },
  { key: 'professional', title: 'tools.sectionProfessional' },
  { key: 'safety', title: 'tools.sectionSafety' },
];


export default function ToolsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const { width, isCompact, sidebarWidth, gutter } = useLayout();
  const flags = useToolFlags();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<RecentTool[]>([]);

  const refresh = useCallback(() => {
    loadRecentTools().then(setRecent).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(RECENT_TOOLS_TOPIC, refresh), [refresh]);

  const tools = TOOLS.filter((x) => !x.flag || flags[x.flag]);
  const open = (route: string, toolKey?: string) => {
    if (toolKey) markToolUsed(toolKey).catch(() => {});
    router.push(route as any);
  };

  const columns = isCompact ? (width < 340 ? 1 : 2) : width - sidebarWidth > 1100 ? 4 : 3;
  const available = Math.min(width - sidebarWidth - gutter * 2, 1080);
  const tileWidth = Math.floor((available - space[3] * (columns - 1)) / columns); // whole dp: fractional sizes rounded to pixels overflowed the row and wrapped a column

  const query = q.trim().toLocaleLowerCase();
  const results = query ? tools.filter((x) => `${t(x.title)} ${t(x.subtitle)}`.toLocaleLowerCase().includes(query)) : null;
  const recentTools = recent.map((r) => tools.find((x) => x.key === r.key)).filter(Boolean).slice(0, 4) as Tool[];

  const tile = (tool: Tool) => (
    <Card
      key={tool.key}
      onPress={() => open(tool.route, tool.key)}
      accessibilityLabel={`${t(tool.title)}. ${t(tool.subtitle)}`}
      padding={16}
      tone={tool.key === 'safety' ? 'danger' : 'surface'}
      testID={`tools-${tool.key}`}
      style={{ width: columns === 1 ? '100%' : tileWidth, minHeight: isCompact ? 124 : 140 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors[TONE_BG[tool.tone]], alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tool.icon} size={22} color={TONE_FG[tool.tone]} />
        </View>
        {tool.key === 'safety' ? <Badge label={t('tools.safetyFree')} tone="danger" /> : null}
      </View>
      <View style={{ marginTop: space[3], gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {t(tool.title)}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {t(tool.subtitle)}
        </AppText>
      </View>
    </Card>
  );

  const featured = (
    <Card tone="gold" padding={isCompact ? 20 : 24} onPress={() => open('/cards', 'cards')} accessibilityLabel={`${t('explore.items.cards.title')}. ${t('tools.featuredTitle')}`} testID="tools-featured-cards">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="label" color="onGoldSoft" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('explore.items.cards.title')}
          </AppText>
          <AppText variant="title3">{t('tools.featuredTitle')}</AppText>
          <AppText variant="small" color="textSecondary">
            {t('tools.featuredBody')}
          </AppText>
          {/* The whole card is the button; this only looks like one (a button inside a button isn't allowed on the web). */}
          <View style={{ flexDirection: 'row', marginTop: space[2] }}>
            <View testID="tools-featured-start" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Icon name="albums-outline" size={16} color="onPrimary" />
              <AppText variant="smallStrong" color="onPrimary">
                {t('tools.featuredCta')}
              </AppText>
            </View>
          </View>
        </View>
        <CardStack />
      </View>
    </Card>
  );

  return (
    <Screen tab title={t('tools.title')} subtitle={t('tools.subtitle')} headerRight={isCompact ? <ProfileButton /> : undefined} testID="screen-tools">
      <View style={{ gap: space[6] }}>
        <TextField value={q} onChangeText={setQ} placeholder={t('tools.search')} accessibilityLabel={t('tools.search')} returnKeyType="search" testID="tools-search" />
        {results ? (
          results.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>{results.map(tile)}</View>
          ) : (
            <AppText variant="body" color="textSecondary" testID="tools-no-results">
              {t('tools.noResults', { q: q.trim() })}
            </AppText>
          )
        ) : (
          <>
            <View>
              <SectionHeader title={t('tools.rightNow')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingRight: space[2] }} testID="tools-quick">
                {QUICK.map((x) => (
                  <Chip key={x.key} label={t(x.label)} icon={x.icon} onPress={() => open(x.route, x.tool)} testID={`tools-quick-${x.key}`} />
                ))}
              </ScrollView>
            </View>
            {featured}
            {recentTools.length ? (
              <View testID="tools-recent">
                <SectionHeader title={t('tools.recent')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                  {recentTools.map((tool) => (
                    <Press key={tool.key} onPress={() => open(tool.route, tool.key)} accessibilityRole="button" accessibilityLabel={t(tool.title)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                      <Icon name={tool.icon} size={18} color={TONE_FG[tool.tone]} />
                      <AppText variant="smallStrong">{t(tool.title)}</AppText>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}
            {SECTIONS.map((s) => {
              const list = tools.filter((x) => x.section === s.key);
              if (!list.length) return null;
              return (
                <View key={s.key} testID={`tools-section-${s.key}`}>
                  <SectionHeader title={t(s.title)} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>{list.map(tile)}</View>
                </View>
              );
            })}
          </>
        )}
      </View>
    </Screen>
  );
}

/** Three fanned cards: a small drawing for the card therapy banner. */
function CardStack() {
  const { colors } = useTheme();
  const card = (rotate: string, bg: string, z: number, left: number) => (
    <View
      style={{
        position: 'absolute',
        left,
        top: 6,
        width: 46,
        height: 64,
        borderRadius: 8,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: colors.surface,
        transform: [{ rotate }],
        zIndex: z,
        shadowColor: colors.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      }}
    />
  );
  return (
    <View style={{ width: 92, height: 82 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {card('-14deg', colors.lavenderSoft, 1, 6)}
      {card('2deg', colors.peachSoft, 2, 24)}
      {card('16deg', colors.primarySoft, 3, 42)}
      <View style={{ position: 'absolute', left: 50, top: 26, zIndex: 4, transform: [{ rotate: '16deg' }] }}>
        <Icon name="sparkles" size={22} color="onPrimarySoft" />
      </View>
    </View>
  );
}
