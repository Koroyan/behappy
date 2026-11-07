import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminDownload, adminGet, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, FilterChips, Note, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

type Filter = 'all' | 'registered' | 'suspended' | 'staff' | 'professional';

export default function AdminUsers() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can, act } = useAdmin();
  const { toast } = useFeedback();
  // The search lives in the URL, so coming back from an account keeps it.
  const params = useLocalSearchParams<{ q?: string }>();
  const initial = typeof params.q === 'string' ? params.q : '';
  const [q, setQ] = useState(initial);
  const [search, setSearch] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');
  const [more, setMore] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const query = {
    q: search,
    registered: filter === 'registered' ? 'yes' : undefined,
    status: filter === 'suspended' ? 'suspended' : undefined,
    staff: filter === 'staff' ? 'yes' : undefined,
    professional: filter === 'professional' ? 'yes' : undefined,
  };
  const data = useAdminData<any>('/users', query);
  useEffect(() => {
    setMore([]);
    setCursor(data.data?.nextCursor || null);
  }, [data.data]);
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      if (q.trim() !== (typeof params.q === 'string' ? params.q : '')) router.setParams({ q: q.trim() || undefined } as any);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const loadMore = async () => {
    if (!cursor) return;
    const r = await adminGet<any>('/users', { ...query, cursor });
    setMore((m) => [...m, ...r.users]);
    setCursor(r.nextCursor);
  };

  const exportCsv = async () => {
    try {
      const ok = await act(() => adminDownload('/users/export', 'behappy-accounts.csv'));
      toast(t(ok ? 'ac.users.exported' : 'ac.common.webOnly'));
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };

  const rows = [...(data.data?.users || []), ...more];
  return (
    <AdminPage
      title={t('ac.nav.users')}
      subtitle={t('ac.users.subtitle')}
      actions={can('users.export') ? <Button label={t('ac.users.export')} icon="download-outline" variant="secondary" size="sm" onPress={exportCsv} testID="admin-users-export" /> : null}
      filters={
        <View style={{ gap: 10, width: '100%' }}>
          <TextField value={q} onChangeText={setQ} placeholder={t('ac.users.searchPlaceholder')} autoCapitalize="none" testID="admin-users-search" />
          <FilterChips<Filter>
            value={filter}
            onChange={setFilter}
            options={(['all', 'registered', 'suspended', 'staff', 'professional'] as Filter[]).map((v) => ({ value: v, label: t(`ac.users.filters.${v}`) }))}
            testID="admin-users-filter"
          />
        </View>
      }
      testID="screen-admin-users"
    >
      {data.data && !data.data.contactVisible ? <Note>{t('ac.users.maskedNote')}</Note> : null}
      <AdminState error={data.error} loading={data.loading} hasData={Boolean(data.data)} onRetry={data.reload}>
        <DataTable
          rows={rows}
          keyFor={(r: any) => r.id}
          onRowPress={(r: any) => router.push(`/admin/users/${r.id}` as any)}
          rowTestID="admin-user-row"
          empty={t('ac.users.none')}
          columns={[
            { key: 'email', label: t('ac.users.cols.account'), flex: 2, render: (r: any) => r.email || r.pseudonym || t('ac.users.anonymous') },
            { key: 'registered', label: t('ac.users.cols.type'), render: (r: any) => <Pill label={t(r.registered ? 'ac.users.registered' : 'ac.users.deviceOnly')} tone={r.registered ? 'brand' : 'neutral'} /> },
            { key: 'tier', label: t('ac.users.cols.plan'), render: (r: any) => (r.tier === 'plus' ? <Pill label="Plus" tone="good" /> : t('ac.users.free')) },
            { key: 'status', label: t('ac.users.cols.status'), render: (r: any) => <Pill label={t(`ac.users.status.${r.status}`)} tone={r.status === 'active' ? 'neutral' : 'danger'} /> },
            { key: 'roles', label: t('ac.users.cols.staff'), wideOnly: true, render: (r: any) => (r.staffRoles.length ? r.staffRoles.map((x: string) => t(`ac.roles.${x}`)).join(', ') : '—') },
            { key: 'created', label: t('ac.users.cols.created'), wideOnly: true, render: (r: any) => f.date(r.createdAt) },
            { key: 'seen', label: t('ac.users.cols.lastSeen'), render: (r: any) => f.date(r.lastSeenAt) },
          ]}
        />
        {cursor ? <Button label={t('ac.common.loadMore')} variant="secondary" onPress={loadMore} style={{ alignSelf: 'center' }} /> : null}
      </AdminState>
    </AdminPage>
  );
}
