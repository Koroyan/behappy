import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Divider, ListRow, SectionHeader } from '@/design';

import { NavItem, usePrimaryNav } from './Sidebar';

/** Items the phone tab bar already shows (or the profile screen itself covers). */
const SKIP = new Set(['today', 'tools', 'specialists', 'profile', 'about', 'membership', 'community', 'topics', 'journal', 'art', 'cards', 'exercises', 'insights', 'anulia']);

/**
 * Phones have five tabs and no sidebar: this lists the rest of the sidebar
 * (appointments, messages, notifications, the professional workspace and staff
 * tools) on the Profile tab, with the same unread badges.
 */
export function MoreMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { sections } = usePrimaryNav();
  const groups = sections.map((s) => ({ ...s, items: s.items.filter((i) => !SKIP.has(i.key)) })).filter((s) => s.items.length);
  if (!groups.length) return null;
  return (
    <View style={{ gap: 16 }} testID="more-menu">
      {groups.map((s) => (
        <Card key={s.key} padding={20}>
          <SectionHeader title={s.title} />
          {s.items.map((item: NavItem, i: number) => (
            <View key={item.key}>
              {i ? <Divider /> : null}
              <ListRow
                icon={item.match(pathname) ? item.activeIcon : item.icon}
                iconTone={s.key === 'staff' ? 'gold' : s.key === 'workspace' ? 'lavender' : 'primary'}
                title={item.label}
                right={item.badge ? <Badge label={String(item.badge)} tone="primary" /> : undefined}
                onPress={() => router.push(item.href as any)}
                testID={`more-${item.key}`}
              />
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}
