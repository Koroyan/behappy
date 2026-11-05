import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, BrandMark, Icon, IconButton, IconName, Press, radius, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';

interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  href: string;
  match: (path: string) => boolean;
}

export function usePrimaryNav() {
  const { t } = useT();
  const primary: NavItem[] = [
    { key: 'today', label: t('nav.today'), icon: 'sunny-outline', activeIcon: 'sunny', href: '/', match: (p) => p === '/' || p === '/index' },
    { key: 'explore', label: t('nav.explore'), icon: 'compass-outline', activeIcon: 'compass', href: '/explore', match: (p) => p.startsWith('/explore') },
    { key: 'anulia', label: t('nav.anulia'), icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', href: '/anulia', match: (p) => p.startsWith('/anulia') },
    { key: 'journal', label: t('nav.journal'), icon: 'book-outline', activeIcon: 'book', href: '/journal', match: (p) => p.startsWith('/journal') },
    { key: 'profile', label: t('nav.profile'), icon: 'person-circle-outline', activeIcon: 'person-circle', href: '/profile', match: (p) => p.startsWith('/profile') || p.startsWith('/settings') || p.startsWith('/purchases') },
  ];
  const secondary: NavItem[] = [
    { key: 'art', label: t('explore.items.art.title'), icon: 'color-palette-outline', activeIcon: 'color-palette', href: '/art', match: (p) => p.startsWith('/art') },
    { key: 'cards', label: t('explore.items.cards.title'), icon: 'albums-outline', activeIcon: 'albums', href: '/cards', match: (p) => p.startsWith('/cards') },
    { key: 'breathing', label: t('explore.items.breathing.title'), icon: 'leaf-outline', activeIcon: 'leaf', href: '/breathing', match: (p) => p.startsWith('/breathing') },
    { key: 'meditation', label: t('explore.items.meditation.title'), icon: 'flower-outline', activeIcon: 'flower', href: '/meditation', match: (p) => p.startsWith('/meditation') },
    { key: 'insights', label: t('explore.items.insights.title'), icon: 'analytics-outline', activeIcon: 'analytics', href: '/insights', match: (p) => p.startsWith('/insights') },
  ];
  return { primary, secondary };
}

const COLLAPSE_KEY = '@behappy_sidebar_collapsed';

export function Sidebar() {
  const { colors } = useTheme();
  const { isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t, formatDate } = useT();
  const { primary, secondary } = usePrimaryNav();
  const { entitlements } = useAccount();
  const [collapsedPref, setCollapsedPref] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COLLAPSE_KEY).then((v) => setCollapsedPref(v === 'true')).catch(() => {});
  }, []);

  const collapsed = !isDesktop || collapsedPref;
  const width = collapsed ? 84 : 256;

  const toggle = () => {
    const next = !collapsedPref;
    setCollapsedPref(next);
    AsyncStorage.setItem(COLLAPSE_KEY, String(next)).catch(() => {});
  };

  const renderItem = (item: NavItem) => {
    const active = item.match(pathname);
    return (
      <Press
        key={item.key}
        onPress={() => router.navigate(item.href as any)}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        testID={`nav-${item.key}`}
        style={{
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: collapsed ? 4 : 12,
          paddingVertical: collapsed ? 10 : 10,
          paddingHorizontal: collapsed ? 4 : 12,
          borderRadius: radius.md,
          backgroundColor: active ? colors.primarySoft : 'transparent',
        }}
      >
        <Icon name={active ? item.activeIcon : item.icon} size={22} color={active ? 'onPrimarySoft' : 'textSecondary'} />
        <AppText variant={collapsed ? 'caption' : 'callout'} color={active ? 'onPrimarySoft' : 'textSecondary'} numberOfLines={collapsed ? 2 : 1} align={collapsed ? 'center' : undefined} style={collapsed ? { fontSize: 11 } : undefined}>
          {item.label}
        </AppText>
      </Press>
    );
  };

  return (
    <View
      accessibilityRole="menu"
      style={{
        width,
        backgroundColor: colors.surface,
        borderEndWidth: 1,
        borderEndColor: colors.border,
        paddingTop: Math.max(insets.top, 12) + 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View style={{ flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: 10, paddingHorizontal: collapsed ? 0 : 20, marginBottom: space[6] }}>
        <Press onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="BeHappy" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: collapsed ? undefined : 1 }}>
          <BrandMark size={collapsed ? 34 : 32} />
          {!collapsed ? <AppText variant="title3">BeHappy</AppText> : null}
        </Press>
        {isDesktop ? <IconButton icon={collapsed ? 'chevron-forward' : 'chevron-back'} label={collapsed ? t('nav.expand') : t('nav.collapse')} onPress={toggle} size={34} /> : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: collapsed ? 8 : 12, gap: 4 }} showsVerticalScrollIndicator={false}>
        {primary.map(renderItem)}
        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: space[3], marginHorizontal: collapsed ? 8 : 12 }} />
        {secondary.map(renderItem)}
      </ScrollView>

      <View style={{ paddingHorizontal: collapsed ? 8 : 12, gap: 8, marginTop: space[3] }}>
        {!collapsed ? (
          <Press onPress={() => router.navigate('/pricing')} accessibilityRole="link" style={{ padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}>
            <AppText variant="smallStrong">{entitlements.plus.active ? t('profile.plusPlan') : t('profile.freePlan')}</AppText>
            <AppText variant="caption" color="textSecondary">
              {entitlements.plus.active && entitlements.plus.expiresAt
                ? t('profile.plusUntil', { date: formatDate(entitlements.plus.expiresAt, { day: 'numeric', month: 'short', year: 'numeric' }) })
                : t('profile.seePlans')}
            </AppText>
          </Press>
        ) : null}
        <Press
          onPress={() => router.navigate('/safety')}
          accessibilityRole="link"
          accessibilityLabel={t('nav.needHelpNow')}
          testID="nav-safety"
          style={{ flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: collapsed ? 4 : 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft }}
        >
          <Icon name="heart-circle-outline" size={22} color="onDangerSoft" />
          <AppText variant={collapsed ? 'caption' : 'smallStrong'} color="onDangerSoft" align={collapsed ? 'center' : undefined} style={collapsed ? { fontSize: 11 } : undefined} numberOfLines={collapsed ? 3 : 2}>
            {t('nav.needHelpNow')}
          </AppText>
        </Press>
      </View>
    </View>
  );
}
