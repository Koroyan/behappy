import { Tabs } from 'expo-router';
import React from 'react';

import { useLayout, useTheme } from '@/design';
import { MobileTabBar } from '@/features/shell/TabBar';
import { useT } from '@/i18n';

export default function TabLayout() {
  const { hasSideNav } = useLayout();
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Tabs
      tabBar={(props) => (hasSideNav ? null : <MobileTabBar {...props} />)}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      {/* Phones: Today, Tools, Anulia (centre), Community, Specialists. Profile opens from the avatar at the top. */}
      <Tabs.Screen name="index" options={{ title: t('nav.today') }} />
      <Tabs.Screen name="tools" options={{ title: t('tools.tab') }} />
      <Tabs.Screen name="anulia" options={{ title: t('nav.anulia') }} />
      <Tabs.Screen name="community" options={{ title: t('shell.community_tab') }} />
      <Tabs.Screen name="specialists" options={{ title: t('shell.specialists') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), href: null }} />
    </Tabs>
  );
}
