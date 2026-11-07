/**
 * Moderation command center. Wide screens: the queue, the report and the
 * actions with the member side by side; tablets: queue and report; phones:
 * the queue, opening each report on its own page. Filters and the selected
 * report live in the URL, so links and the back button keep them.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { AppText, Button, EmptyState, Sheet, TextField, useFeedback, useLayout } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminGet, useAdminData } from '@/features/admin/api';
import { AppealItem, AppealPanel, AppealRow, Decision, isModView, keepFilters, ModView, MOD_VIEWS, QueueItem, QueueRow, ReportHandle, ReportWorkspace, useModError } from '@/features/admin/moderation';
import { useAdminColors } from '@/features/admin/theme';
import { AdminPage, AdminState, FilterChips, Panel } from '@/features/admin/ui';
import { useT } from '@/i18n';

const KEYS: [string, string][] = [
  ['j / ↓', 'next'],
  ['k / ↑', 'prev'],
  ['c', 'take'],
  ['n', 'note'],
  ['x', 'context'],
  ['d', 'dismiss'],
  ['r', 'remove'],
  ['w', 'warn'],
  ['e', 'escalate'],
  ['/', 'search'],
  ['?', 'help'],
];

export default function ModerationCenter() {
  const { t } = useT();
  const c = useAdminColors();
  const router = useRouter();
  const { can } = useAdmin();
  const { width, isCompact } = useLayout();
  const errText = useModError();
  const { toast } = useFeedback();
  const params = useLocalSearchParams<{ view?: string; q?: string; report?: string; appeal?: string }>();
  const view: ModView = isModView(params.view) ? params.view : 'open';
  const search = typeof params.q === 'string' ? params.q : '';
  const selected = params.report ? Number(params.report) : null;
  const selectedAppeal = params.appeal ? Number(params.appeal) : null;
  const [text, setText] = useState(search);
  const [help, setHelp] = useState(false);
  const searchRef = useRef<any>(null);
  const workspace = useRef<ReportHandle>(null);

  // The content area is the window minus the admin sidebar and page padding.
  const content = isCompact ? width - 32 : width - 252 - 56;
  const cols = content >= 1000 ? 3 : content >= 700 ? 2 : 1;

  const counts = useAdminData<Record<string, number>>('/moderation/counts');
  const queue = useAdminData<{ reports: QueueItem[]; nextBefore: number | null }>(view === 'appeals' ? null : '/moderation/queue', { view, q: search || undefined });
  const appeals = useAdminData<{ appeals: AppealItem[] }>(view === 'appeals' && can('moderation.appeals') ? '/api/moderation/appeals' : null);
  const [older, setOlder] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  useEffect(() => {
    setOlder([]);
    setCursor(queue.data?.nextBefore ?? null);
  }, [queue.data]);
  const rows = [...(queue.data?.reports || []), ...older];
  const appealRows = appeals.data?.appeals || [];

  // Search updates the URL after a short pause.
  useEffect(() => {
    const id = setTimeout(() => {
      // Only the search changes; a report picked meanwhile stays open.
      if (text.trim() !== search) router.setParams({ q: text.trim() || undefined } as any);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const refresh = () => {
    counts.reload();
    if (view === 'appeals') appeals.reload();
    else queue.reload();
  };
  const loadOlder = async () => {
    if (!cursor) return;
    try {
      const more = await adminGet<{ reports: QueueItem[]; nextBefore: number | null }>('/moderation/queue', { view, q: search || undefined, before: cursor });
      setOlder((o) => [...o, ...more.reports]);
      setCursor(more.nextBefore);
    } catch (e) {
      toast(errText(e));
    }
  };
  const setView = (v: ModView) => router.setParams({ view: v === 'open' ? undefined : v, report: undefined, appeal: undefined } as any);
  const select = (id: number) => {
    if (cols === 1) router.push(`/admin/moderation/reports/${id}${keepFilters(view, search)}` as any);
    else router.setParams({ report: String(id) } as any);
  };
  const selectAppeal = (id: number) => router.setParams({ appeal: String(id) } as any);

  // Keyboard shortcuts (web, wide layouts). Off while typing or while a dialog is open.
  const stateRef = useRef({ rows, selected, cols, view, appealRows, selectedAppeal });
  stateRef.current = { rows, selected, cols, view, appealRows, selectedAppeal };
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const s = stateRef.current;
      const move = (step: number) => {
        if (s.view === 'appeals') {
          const i = s.appealRows.findIndex((a) => a.id === s.selectedAppeal);
          const next = s.appealRows[Math.max(0, Math.min(s.appealRows.length - 1, i + step))];
          if (next) selectAppeal(next.id);
          return;
        }
        const i = s.rows.findIndex((r) => r.id === s.selected);
        const next = s.rows[Math.max(0, Math.min(s.rows.length - 1, i + step))];
        if (next) select(next.id);
      };
      const decide = (d: Decision) => workspace.current?.decide(d);
      const map: Record<string, () => void> = {
        j: () => move(1),
        ArrowDown: () => move(1),
        k: () => move(-1),
        ArrowUp: () => move(-1),
        c: () => workspace.current?.take(),
        n: () => workspace.current?.note(),
        x: () => workspace.current?.context(),
        d: () => decide('dismiss'),
        r: () => decide('remove_message'),
        w: () => decide('warn'),
        e: () => workspace.current?.escalate(),
        '/': () => searchRef.current?.focus?.(),
        '?': () => setHelp(true),
      };
      const fn = map[e.key];
      if (!fn || (s.cols === 1 && e.key !== '/' && e.key !== '?')) return;
      e.preventDefault();
      fn();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const views = MOD_VIEWS.filter((v) => v !== 'appeals' || can('moderation.appeals'));
  const n = (v: ModView) => {
    const k = v === 'appeals' ? 'appeals' : v === 'all' ? null : v;
    const value = k ? counts.data?.[k] : undefined;
    return typeof value === 'number' ? ` ${value}` : '';
  };

  const filters = (
    <View style={{ gap: 10, width: '100%' }}>
      <FilterChips options={views.map((v) => ({ value: v, label: `${t(`ac.mod.views.${v}`)}${n(v)}` }))} value={view} onChange={setView} testID="mod-views" />
      {view !== 'appeals' ? (
        <TextField ref={searchRef} value={text} onChangeText={setText} placeholder={t('ac.mod.search')} accessibilityLabel={t('ac.mod.search')} returnKeyType="search" containerStyle={{ maxWidth: cols === 1 ? undefined : 420 }} testID="mod-search" />
      ) : null}
    </View>
  );

  const listBody =
    view === 'appeals' ? (
      <AdminState error={appeals.error} loading={appeals.loading} hasData={Boolean(appeals.data)} onRetry={appeals.reload}>
        {appealRows.length ? (
          appealRows.map((a) => <AppealRow key={a.id} a={a} selected={cols > 1 && a.id === selectedAppeal} onPress={() => selectAppeal(a.id)} />)
        ) : (
          <Panel>
            <EmptyState icon="checkmark-circle-outline" title={t('ac.mod.noAppeals')} />
          </Panel>
        )}
      </AdminState>
    ) : (
      <AdminState error={queue.error} loading={queue.loading} hasData={Boolean(queue.data)} onRetry={queue.reload}>
        {rows.length ? (
          <>
            {rows.map((r) => (
              <QueueRow key={r.id} r={r} selected={cols > 1 && r.id === selected} onPress={() => select(r.id)} />
            ))}
            {cursor ? <Button label={t('ac.mod.loadMore')} variant="ghost" onPress={loadOlder} testID="mod-load-more" /> : null}
          </>
        ) : (
          <Panel>
            <EmptyState icon="checkmark-circle-outline" title={search ? t('ac.mod.emptySearch') : t('ac.mod.empty')} />
          </Panel>
        )}
      </AdminState>
    );

  const pickedAppeal = appealRows.find((a) => a.id === selectedAppeal) || null;
  const placeholder = (
    <Panel>
      <EmptyState icon="arrow-back-outline" title={t('ac.mod.pick')} />
    </Panel>
  );
  const detail =
    view === 'appeals' ? (
      pickedAppeal ? (
        <AppealPanel key={pickedAppeal.id} appeal={pickedAppeal} onDone={refresh} />
      ) : (
        placeholder
      )
    ) : selected ? (
      <ReportWorkspace key={selected} ref={workspace} id={selected} layout={cols === 3 ? 'panes' : 'stack'} onChanged={refresh} view={view} q={search} />
    ) : (
      placeholder
    );

  const headerActions = (
    <>
      {Platform.OS === 'web' && cols > 1 ? <Button label={t('ac.mod.shortcuts')} size="sm" variant="ghost" icon="keypad-outline" onPress={() => setHelp(true)} testID="mod-shortcuts" /> : null}
      <Button label={t('ac.mod.stats')} size="sm" variant="outline" icon="stats-chart-outline" onPress={() => router.push('/admin/moderation/stats' as any)} testID="mod-stats" />
    </>
  );

  const helpSheet = (
    <Sheet visible={help} onClose={() => setHelp(false)} title={t('ac.mod.shortcuts')} subtitle={t('ac.mod.keysNote')} testID="mod-keys">
      <View style={{ gap: 8, paddingBottom: 8 }}>
        {KEYS.map(([key, name]) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ minWidth: 64, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.cardMuted, alignItems: 'center' }}>
              <AppText variant="smallStrong" style={{ color: c.text }}>
                {key}
              </AppText>
            </View>
            <AppText variant="small" style={{ color: c.textSecondary }}>
              {t(`ac.mod.keys.${name}`)}
            </AppText>
          </View>
        ))}
      </View>
    </Sheet>
  );

  if (cols === 1) {
    return (
      <AdminPage title={t('ac.nav.moderation')} subtitle={t('ac.mod.subtitle')} actions={headerActions} filters={filters} testID="screen-admin-moderation">
        {view === 'appeals' && pickedAppeal ? (
          // Inline, not in a sheet: the reason prompt has to open on top of it.
          <View style={{ gap: 12 }}>
            <Button label={t('ac.mod.backToQueue')} size="sm" variant="ghost" icon="arrow-back" onPress={() => router.setParams({ appeal: undefined } as any)} style={{ alignSelf: 'flex-start' }} testID="mod-appeal-back" />
            <AppealPanel
              key={pickedAppeal.id}
              appeal={pickedAppeal}
              onDone={() => {
                router.setParams({ appeal: undefined } as any);
                refresh();
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>{listBody}</View>
        )}
        {helpSheet}
      </AdminPage>
    );
  }

  return (
    <AdminPage title={t('ac.nav.moderation')} subtitle={t('ac.mod.subtitle')} actions={headerActions} filters={filters} scroll={false} maxWidth={1800} testID="screen-admin-moderation">
      <View style={{ flex: 1, flexDirection: 'row', gap: 16, minHeight: 0 }}>
        <ScrollView style={{ width: cols === 3 ? 300 : 280, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 32 }} testID="mod-list">
          {listBody}
        </ScrollView>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {cols === 3 && view !== 'appeals' && selected ? (
            detail
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
              {detail}
            </ScrollView>
          )}
        </View>
      </View>
      {helpSheet}
    </AdminPage>
  );
}
