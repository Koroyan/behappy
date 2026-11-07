/**
 * The admin center frame: a dark sidebar on wide screens (a menu sheet on
 * phones), a top bar with global search, the shared date range and the TEST
 * mode badge, and the gates in front of everything: a staff role, a password
 * sign-in, staff access not suspended, and the two-step code when it is on.
 */
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, Icon, IconButton, Press, Sheet, Skeleton, TextField, useLayout } from '@/design';
import { StaffGate } from '@/features/account/StaffGate';
import { useT } from '@/i18n';
import { hasStaffRole, useIdentity } from '@/lib/api/account';

import { adminGet, adminPost, errorCode } from './api';
import { RangePreset, useAdmin } from './AdminProvider';
import { ADMIN_NAV, AdminNavItem, itemForPath } from './nav';
import { useAdminColors } from './theme';

function Center({ children }: { children: React.ReactNode }) {
  const c = useAdminColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 520, backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 24, gap: 12 }}>{children}</View>
    </View>
  );
}

function CodeGate() {
  const { t } = useT();
  const { reloadMe } = useAdmin();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await adminPost('/mfa/verify', { code });
      await reloadMe();
    } catch (e) {
      setProblem(t(errorCode(e) === 'rate_limited' ? 'ac.stepUp.tooMany' : 'ac.stepUp.codeWrong'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Center>
      <EmptyState icon="key-outline" title={t('ac.stepUp.codeTitle')} body={t('ac.mfa.enterToOpen')} />
      <TextField label={t('ac.stepUp.code')} value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" onSubmitEditing={submit} testID="admin-code-gate" />
      {problem ? (
        <AppText variant="small" color="danger">
          {problem}
        </AppText>
      ) : null}
      <Button label={t('ac.stepUp.confirm')} onPress={submit} loading={busy} disabled={code.length !== 6} />
    </Center>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const { can } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const active = itemForPath(pathname);
  const visible = (i: AdminNavItem) => !i.perm || can(i.perm);
  return (
    <View style={{ gap: 14 }}>
      {ADMIN_NAV.map((section) => {
        const items = section.items.filter(visible);
        if (!items.length) return null;
        return (
          <View key={section.key} style={{ gap: 2 }}>
            <AppText variant="label" style={{ color: c.sidebarMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 12, marginBottom: 4 }}>
              {t(`ac.nav.sections.${section.key}`)}
            </AppText>
            {items.map((item) => {
              const on = active?.key === item.key && !item.external;
              return (
                <Press
                  key={item.key}
                  onPress={() => {
                    onNavigate?.();
                    router.push(item.href as any);
                  }}
                  accessibilityRole="link"
                  accessibilityState={{ selected: on }}
                  testID={`admin-nav-${item.key}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: on ? c.sidebarActive : 'transparent' }}
                >
                  <Icon name={item.icon} size={18} color={on ? c.sidebarActiveText : c.sidebarText} />
                  <AppText variant="small" style={{ color: on ? c.sidebarActiveText : c.sidebarText, fontWeight: on ? '600' : '400', flex: 1 }} numberOfLines={2}>
                    {t(`ac.nav.${item.key}`)}
                  </AppText>
                  {item.external ? <Icon name="open-outline" size={14} color={c.sidebarMuted} /> : null}
                </Press>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function Brand() {
  const c = useAdminColors();
  const { t } = useT();
  return (
    <View style={{ gap: 6, paddingHorizontal: 12 }}>
      <AppText variant="bodyStrong" style={{ color: '#FFFFFF' }}>
        BeHappy
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <AppText variant="caption" style={{ color: c.sidebarMuted }}>
          {t('ac.title')}
        </AppText>
        <View style={{ backgroundColor: '#F5C451', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
          <AppText variant="label" style={{ color: '#2B2100' }}>
            {t('ac.test')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Who() {
  const c = useAdminColors();
  const { t } = useT();
  const { me } = useAdmin();
  const router = useRouter();
  if (!me) return null;
  return (
    <View style={{ gap: 8, paddingHorizontal: 12 }}>
      <AppText variant="caption" style={{ color: c.sidebarText }} numberOfLines={1}>
        {me.email}
      </AppText>
      <AppText variant="caption" style={{ color: c.sidebarMuted }}>
        {me.roles.map((r) => t(`ac.roles.${r}`)).join(' · ')}
      </AppText>
      <Press onPress={() => router.replace('/' as any)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} testID="admin-back-to-app">
        <Icon name="arrow-back-outline" size={16} color={c.sidebarText} />
        <AppText variant="small" style={{ color: c.sidebarText }}>
          {t('ac.backToApp')}
        </AppText>
      </Press>
    </View>
  );
}

const TYPE_HREF: Record<string, (id: string) => string> = {
  user: (id) => `/admin/users/${encodeURIComponent(id)}`,
  professional: (id) => `/admin/professionals?focus=${encodeURIComponent(id)}`,
  appointment: (id) => `/admin/appointments?focus=${encodeURIComponent(id)}`,
  ticket: (id) => `/admin/support/${encodeURIComponent(id)}`,
  room: (id) => `/admin/community?focus=${encodeURIComponent(id)}`,
};

function Search() {
  const c = useAdminColors();
  const { t } = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      adminGet<{ results: typeof results }>('/search', { q: q.trim() })
        .then((r) => {
          setResults(r.results);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 250);
  }, [q]);
  return (
    <View style={{ flex: 1, maxWidth: 420, zIndex: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.cardMuted, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: c.border }}>
        <Icon name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t('ac.search.placeholder')}
          placeholderTextColor={c.textMuted}
          accessibilityLabel={t('ac.search.placeholder')}
          style={{ flex: 1, paddingVertical: 8, color: c.text, fontSize: 14, outlineStyle: 'none' } as any}
          testID="admin-search"
        />
      </View>
      {open && q.trim().length >= 2 ? (
        <View style={{ position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
          {results.length ? (
            results.map((r) => (
              <Press
                key={`${r.type}:${r.id}`}
                onPress={() => {
                  setOpen(false);
                  setQ('');
                  router.push(TYPE_HREF[r.type](r.id) as any);
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}
                accessibilityRole="link"
                testID="admin-search-result"
              >
                <AppText variant="smallStrong" style={{ color: c.text }} numberOfLines={1}>
                  {r.title}
                </AppText>
                <AppText variant="caption" style={{ color: c.textMuted }} numberOfLines={1}>
                  {t(`ac.search.types.${r.type}`)}
                  {r.subtitle ? ` · ${r.subtitle}` : ''}
                </AppText>
              </Press>
            ))
          ) : (
            <AppText variant="caption" style={{ color: c.textMuted, padding: 12 }}>
              {t('ac.search.none')}
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

function RangePicker() {
  const { t } = useT();
  const c = useAdminColors();
  const { range, setRange } = useAdmin();
  const presets: RangePreset[] = ['7d', '30d', '90d'];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.cardMuted, borderRadius: 10, padding: 3, gap: 2, borderWidth: 1, borderColor: c.border }} accessibilityRole="radiogroup" accessibilityLabel={t('ac.range.label')}>
      {presets.map((p) => {
        const on = range.preset === p;
        return (
          <Press key={p} onPress={() => setRange(p)} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`admin-range-${p}`} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: on ? c.card : 'transparent' }}>
            <AppText variant="caption" style={{ color: on ? c.text : c.textSecondary, fontWeight: on ? '700' : '500' }}>
              {t(`ac.range.${p}`)}
            </AppText>
          </Press>
        );
      })}
    </View>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const c = useAdminColors();
  const { t } = useT();
  const identity = useIdentity();
  const { me, meError, reloadMe, can } = useAdmin();
  const pathname = usePathname();
  const { isCompact } = useLayout();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const item = itemForPath(pathname);

  if (!hasStaffRole(identity)) {
    return (
      <Center>
        <StaffGate permission="dashboard.view" returnTo={pathname} />
      </Center>
    );
  }
  if (identity.sessionKind !== 'password' || errorCode(meError) === 'password_session_required') {
    return (
      <Center>
        <StaffGate permission="dashboard.view" returnTo={pathname} />
      </Center>
    );
  }
  if (meError) {
    const code = errorCode(meError);
    return (
      <Center>
        <EmptyState icon="lock-closed-outline" title={t(code === 'staff_suspended' ? 'ac.gate.suspended' : code === 'account_suspended' ? 'ac.gate.accountSuspended' : 'ac.common.loadFailed')} body={code === 'staff_suspended' ? t('ac.gate.suspendedBody') : undefined} action={<Button label={t('common.retry')} variant="secondary" onPress={reloadMe} />} />
      </Center>
    );
  }
  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, gap: 12 }}>
        <Skeleton height={48} radius={12} />
        <Skeleton height={160} radius={16} />
      </View>
    );
  }
  if (me.mfa.enabled && !me.mfa.verified) return <CodeGate />;
  const mustEnrol = me.mfa.required && !me.mfa.enabled && pathname !== '/admin/me';

  const content = mustEnrol ? (
    <Center>
      <EmptyState icon="key-outline" title={t('ac.mfa.requiredTitle')} body={t('ac.mfa.requiredBody')} />
    </Center>
  ) : (
    children
  );

  const topBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: isCompact ? 12 : 24, paddingTop: isCompact ? insets.top + 8 : 12, paddingBottom: 12, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border, zIndex: 10 }}>
      {isCompact ? <IconButton icon="menu-outline" label={t('ac.menu')} onPress={() => setMenu(true)} size={40} testID="admin-menu" /> : null}
      {isCompact ? (
        <AppText variant="bodyStrong" style={{ color: c.text, flex: 1 }} numberOfLines={1}>
          {item ? t(`ac.nav.${item.key}`) : t('ac.title')}
        </AppText>
      ) : can('dashboard.view') ? (
        <Search />
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {item?.range && !isCompact ? <RangePicker /> : null}
      <View style={{ backgroundColor: '#F5C451', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }} accessibilityLabel={t('ac.testModeLabel')}>
        <AppText variant="label" style={{ color: '#2B2100' }}>
          {t('ac.test')}
        </AppText>
      </View>
    </View>
  );

  if (isCompact) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {topBar}
        {item?.range ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row' }}>
            <RangePicker />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>{content}</View>
        <Sheet visible={menu} onClose={() => setMenu(false)} title={t('ac.title')}>
          <View style={{ backgroundColor: c.sidebar, borderRadius: 16, paddingVertical: 14, gap: 16 }}>
            {can('dashboard.view') ? (
              <View style={{ paddingHorizontal: 12 }}>
                <Search />
              </View>
            ) : null}
            <NavList onNavigate={() => setMenu(false)} />
            <Who />
          </View>
        </Sheet>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      <View style={{ width: 252, backgroundColor: c.sidebar, paddingVertical: 20 }} testID="admin-sidebar">
        <ScrollView contentContainerStyle={{ gap: 22, paddingHorizontal: 10, paddingBottom: 20 }}>
          <Brand />
          <NavList />
          <Who />
        </ScrollView>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {topBar}
        <View style={{ flex: 1 }}>{content}</View>
      </View>
    </View>
  );
}
