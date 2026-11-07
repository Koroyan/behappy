import type { IconName } from '@/design';

export interface AdminNavItem {
  key: string;
  href: string;
  icon: IconName;
  /** Needed to see the item (the server checks again on every request). */
  perm?: string;
  /** Opens a screen outside the admin center. */
  external?: boolean;
  /** The page uses the shared date range. */
  range?: boolean;
}

export const ADMIN_NAV: { key: string; items: AdminNavItem[] }[] = [
  {
    key: 'overview',
    items: [
      { key: 'overview', href: '/admin', icon: 'grid-outline', perm: 'dashboard.view', range: true },
      { key: 'analytics', href: '/admin/analytics', icon: 'pulse-outline', perm: 'analytics.view', range: true },
    ],
  },
  {
    key: 'people',
    items: [
      { key: 'users', href: '/admin/users', icon: 'people-outline', perm: 'users.view' },
      { key: 'support', href: '/admin/support', icon: 'chatbox-ellipses-outline', perm: 'support.view' },
    ],
  },
  {
    key: 'professionals',
    items: [
      { key: 'applications', href: '/admin/applications', icon: 'document-text-outline', perm: 'professionals.view' },
      { key: 'professionals', href: '/admin/professionals', icon: 'briefcase-outline', perm: 'professionals.view' },
      { key: 'policies', href: '/admin/policies', icon: 'globe-outline', perm: 'professionals.view' },
      { key: 'appointments', href: '/admin/appointments', icon: 'calendar-outline', perm: 'appointments.view' },
    ],
  },
  {
    key: 'community',
    items: [
      { key: 'rooms', href: '/admin/community', icon: 'chatbubbles-outline', perm: 'community.view', range: true },
      { key: 'moderation', href: '/admin/moderation', icon: 'shield-checkmark-outline', perm: 'moderation.act' },
      { key: 'moderationStats', href: '/admin/moderation/stats', icon: 'stats-chart-outline', perm: 'moderation.act', range: true },
      { key: 'safety', href: '/admin/safety', icon: 'heart-circle-outline', perm: 'safety.view' },
    ],
  },
  { key: 'ai', items: [{ key: 'ai', href: '/admin/ai', icon: 'sparkles-outline', perm: 'ai.view', range: true }] },
  { key: 'finance', items: [{ key: 'finance', href: '/admin/finance', icon: 'card-outline', perm: 'finance.view', range: true }] },
  {
    key: 'system',
    items: [
      { key: 'security', href: '/admin/security', icon: 'lock-closed-outline', perm: 'security.view' },
      { key: 'staff', href: '/admin/staff', icon: 'id-card-outline', perm: 'staff.view' },
      { key: 'settings', href: '/admin/settings', icon: 'options-outline', perm: 'settings.view' },
      { key: 'protected', href: '/admin/protected', icon: 'key-outline', perm: 'sensitive.request' },
      { key: 'audit', href: '/admin/audit', icon: 'list-outline', perm: 'audit.view' },
      { key: 'system', href: '/admin/system', icon: 'server-outline', perm: 'system.view' },
      { key: 'me', href: '/admin/me', icon: 'person-circle-outline' },
    ],
  },
];

export const ALL_ITEMS = ADMIN_NAV.flatMap((s) => s.items);

/** The nav item for a path (longest matching prefix). */
export function itemForPath(path: string): AdminNavItem | undefined {
  let best: AdminNavItem | undefined;
  for (const item of ALL_ITEMS) {
    if (item.external) continue;
    const match = item.href === '/admin' ? path === '/admin' : path === item.href || path.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}
