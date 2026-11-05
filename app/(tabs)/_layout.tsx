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
      <Tabs.Screen name="index" options={{ title: t('nav.today') }} />
      <Tabs.Screen name="explore" options={{ title: t('nav.explore') }} />
      <Tabs.Screen name="anulia" options={{ title: t('nav.anulia') }} />
      <Tabs.Screen name="journal" options={{ title: t('nav.journal') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}
