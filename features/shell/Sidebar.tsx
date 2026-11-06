import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, BrandMark, Icon, IconButton, IconName, Press, radius, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { isStaffIdentity, useAccount, useIdentity } from '@/lib/api/account';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  href: string;
  match: (path: string) => boolean;
  badge?: number;
}

export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

/**
 * Navigation model. Phones: five tabs. Desktop/tablet: a sidebar grouped into
 * Personal, Community and Account (plus staff tools for moderators/admins).
 */
export function usePrimaryNav() {
  const { t } = useT();
  const { me } = useAccount();
  const identity = useIdentity();
  const unreadRooms = (me?.community as { unreadRooms?: number } | undefined)?.unreadRooms || 0;

  const today: NavItem = { key: 'today', label: t('nav.today'), icon: 'sunny-outline', activeIcon: 'sunny', href: '/', match: (p) => p === '/' || p === '/index' };
  const community: NavItem = { key: 'community', label: t('shell.community_tab'), icon: 'people-outline', activeIcon: 'people', href: '/community', match: (p) => p.startsWith('/community'), badge: unreadRooms };
  const anulia: NavItem = { key: 'anulia', label: t('nav.anulia'), icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', href: '/anulia', match: (p) => p.startsWith('/anulia') };
  const journal: NavItem = { key: 'journal', label: t('nav.journal'), icon: 'book-outline', activeIcon: 'book', href: '/journal', match: (p) => p.startsWith('/journal') };
  const profile: NavItem = { key: 'profile', label: t('nav.profile'), icon: 'person-circle-outline', activeIcon: 'person-circle', href: '/profile', match: (p) => p.startsWith('/profile') || p.startsWith('/settings') || p.startsWith('/account') };

  const specialists: NavItem = { key: 'specialists', label: t('shell.specialists'), icon: 'medkit-outline', activeIcon: 'medkit', href: '/specialists', match: (p) => p.startsWith('/specialists') };
  const primary: NavItem[] = [today, community, anulia, specialists, profile];
  const client = me?.client as { unreadMessages?: number } | undefined;
  const professional = me?.professional as { status?: string } | null | undefined;

  const sections: NavSection[] = [
    {
      key: 'personal',
      title: t('shell.personal'),
      items: [
        today,
        anulia,
        journal,
        { key: 'art', label: t('explore.items.art.title'), icon: 'color-palette-outline', activeIcon: 'color-palette', href: '/art', match: (p) => p.startsWith('/art') },
        { key: 'cards', label: t('explore.items.cards.title'), icon: 'albums-outline', activeIcon: 'albums', href: '/cards', match: (p) => p.startsWith('/cards') },
        {
          key: 'exercises',
          label: t('shell.exercises'),
          icon: 'leaf-outline',
          activeIcon: 'leaf',
          href: '/explore',
          match: (p) => ['/explore', '/breathing', '/meditation', '/grounding', '/assessments', '/goals', '/safety-plan'].some((x) => p.startsWith(x)),
        },
        { key: 'insights', label: t('explore.items.insights.title'), icon: 'analytics-outline', activeIcon: 'analytics', href: '/insights', match: (p) => p.startsWith('/insights') },
      ],
    },
    {
      key: 'community',
      title: t('shell.community'),
      items: [
        { ...community, label: t('shell.myCommunities') },
        { key: 'topics', label: t('shell.exploreTopics'), icon: 'compass-outline', activeIcon: 'compass', href: '/community/topics', match: (p) => p.startsWith('/community/topics') },
      ],
    },
    {
      key: 'help',
      title: t('shell.professionalHelp'),
      items: [
        { ...specialists, label: t('shell.findPsychologists') },
        { key: 'appointments', label: t('shell.appointments'), icon: 'calendar-outline', activeIcon: 'calendar', href: '/appointments', match: (p) => p.startsWith('/appointments') },
        { key: 'messages', label: t('shell.messages'), icon: 'mail-outline', activeIcon: 'mail', href: '/messages', match: (p) => p.startsWith('/messages'), badge: client?.unreadMessages || 0 },
      ],
    },
  ];

  if (professional) {
    sections.push({
      key: 'workspace',
      title: t('shell.workspace'),
      items: [
        { key: 'pro-dashboard', label: t('shell.dashboard'), icon: 'grid-outline', activeIcon: 'grid', href: '/pro', match: (p) => p === '/pro' },
        { key: 'pro-bookings', label: t('shell.proBookings'), icon: 'calendar-number-outline', activeIcon: 'calendar-number', href: '/pro/bookings', match: (p) => p.startsWith('/pro/bookings') },
        { key: 'pro-profile', label: t('shell.proProfile'), icon: 'id-card-outline', activeIcon: 'id-card', href: '/pro/apply', match: (p) => p.startsWith('/pro/apply') },
        { key: 'pro-membership', label: t('shell.proMembership'), icon: 'card-outline', activeIcon: 'card', href: '/pro/membership', match: (p) => p.startsWith('/pro/membership') || p.startsWith('/pro/receipt') },
      ],
    });
  }

  sections.push({
    key: 'account',
    title: t('shell.account'),
    items: [
      { key: 'membership', label: t('shell.membership'), icon: 'ribbon-outline', activeIcon: 'ribbon', href: '/pricing', match: (p) => p.startsWith('/pricing') || p.startsWith('/purchases') || p.startsWith('/checkout') },
      { key: 'notifications', label: t('shell.notifications'), icon: 'notifications-outline', activeIcon: 'notifications', href: '/notifications', match: (p) => p.startsWith('/notifications'), badge: me?.notifications?.unread || 0 },
      profile,
      ...(professional ? [] : [{ key: 'for-pros', label: t('shell.forProfessionals'), icon: 'briefcase-outline', activeIcon: 'briefcase', href: '/pro', match: (p: string) => p === '/pro' } as NavItem]),
      { key: 'about', label: t('shell.help'), icon: 'help-circle-outline', activeIcon: 'help-circle', href: '/about', match: (p) => p.startsWith('/about') },
    ],
  });

  const staffItems: NavItem[] = [];
  if (isStaffIdentity(identity, 'admin')) {
    staffItems.push({ key: 'admin', label: t('shell.admin'), icon: 'stats-chart-outline', activeIcon: 'stats-chart', href: '/admin', match: (p) => p === '/admin' });
    staffItems.push({ key: 'applications', label: t('shell.applications'), icon: 'document-text-outline', activeIcon: 'document-text', href: '/admin/applications', match: (p) => p.startsWith('/admin/applications') });
  }
  if (isStaffIdentity(identity, 'moderator') || isStaffIdentity(identity, 'admin')) {
    staffItems.push({ key: 'moderation', label: t('shell.moderation'), icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark', href: '/moderation', match: (p) => p.startsWith('/moderation') });
  }
  if (staffItems.length) sections.push({ key: 'staff', title: t('shell.staff'), items: staffItems });

  return { primary, sections };
}

const COLLAPSE_KEY = '@behappy_sidebar_collapsed';

export function Sidebar() {
  const { colors } = useTheme();
  const { isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t, formatDate } = useT();
  const { sections } = usePrimaryNav();
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

  // The most specific match wins (Community vs Explore topics).
  const activeKey = (() => {
    let best: { key: string; len: number } | null = null;
    for (const s of sections)
      for (const item of s.items)
        if (item.match(pathname)) {
          const len = item.href.length;
          if (!best || len > best.len) best = { key: item.key, len };
        }
    return best?.key;
  })();

  const renderItem = (item: NavItem) => {
    const active = item.key === activeKey;
    return (
      <Press
        key={`${item.key}-${item.href}`}
        onPress={() => router.navigate(item.href as any)}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.badge ? `${item.label} (${item.badge})` : item.label}
        testID={`nav-${item.key}`}
        style={{
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: collapsed ? 4 : 12,
          paddingVertical: collapsed ? 9 : 9,
          paddingHorizontal: collapsed ? 4 : 12,
          borderRadius: radius.md,
          backgroundColor: active ? colors.primarySoft : 'transparent',
        }}
      >
        <View>
          <Icon name={active ? item.activeIcon : item.icon} size={22} color={active ? 'onPrimarySoft' : 'textSecondary'} />
          {item.badge && collapsed ? <View style={{ position: 'absolute', top: -2, end: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
        </View>
        <AppText variant={collapsed ? 'caption' : 'callout'} color={active ? 'onPrimarySoft' : 'textSecondary'} numberOfLines={2} align={collapsed ? 'center' : undefined} style={[collapsed ? { fontSize: 11 } : null, !collapsed ? { flex: 1 } : null]}>
          {item.label}
        </AppText>
        {item.badge && !collapsed ? <Badge label={String(Math.min(item.badge, 99))} tone="primary" /> : null}
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
      <View style={{ flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: 10, paddingHorizontal: collapsed ? 0 : 20, marginBottom: space[4] }}>
        <Press onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="BeHappy" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: collapsed ? undefined : 1 }}>
          <BrandMark size={collapsed ? 34 : 32} />
          {!collapsed ? <AppText variant="title3">BeHappy</AppText> : null}
        </Press>
        {isDesktop ? <IconButton icon={collapsed ? 'chevron-forward' : 'chevron-back'} label={collapsed ? t('nav.expand') : t('nav.collapse')} onPress={toggle} size={34} /> : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: collapsed ? 8 : 12, gap: 2, paddingBottom: space[3] }} showsVerticalScrollIndicator={false}>
        {sections.map((s, i) => (
          <View key={s.key} style={{ gap: 2, marginTop: i ? space[3] : 0 }}>
            {collapsed ? (
              i ? <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: space[2], marginHorizontal: 8 }} /> : null
            ) : (
              <AppText variant="label" color="textTertiary" style={{ paddingHorizontal: 12, marginBottom: 4, textTransform: 'uppercase' }}>
                {s.title}
              </AppText>
            )}
            {s.items.map(renderItem)}
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: collapsed ? 8 : 12, gap: 8, marginTop: space[2] }}>
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
