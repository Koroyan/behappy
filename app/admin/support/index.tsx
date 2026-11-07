import { useRouter } from 'expo-router';
import React, { useState } from 'react';

import { useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, FilterChips, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

type F = 'active' | 'waiting_on_staff' | 'waiting_on_user' | 'resolved' | 'closed';
const TONE: Record<string, any> = { open: 'warning', waiting_on_staff: 'warning', waiting_on_user: 'info', resolved: 'good', closed: 'neutral' };

export default function AdminSupport() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const [status, setStatus] = useState<F>('active');
  const [mine, setMine] = useState<'all' | 'me'>('all');
  const q = useAdminData<any>('/support/tickets', { status, assigned: mine === 'me' ? 'me' : undefined });
  return (
    <AdminPage
      title={t('ac.nav.support')}
      subtitle={t('ac.support.subtitle')}
      filters={
        <>
          <FilterChips<F> value={status} onChange={setStatus} options={(['active', 'waiting_on_staff', 'waiting_on_user', 'resolved', 'closed'] as F[]).map((v) => ({ value: v, label: t(`ac.support.filters.${v}`) }))} testID="admin-support-filter" />
          <FilterChips<'all' | 'me'> value={mine} onChange={setMine} options={[{ value: 'all', label: t('ac.support.everyone') }, { value: 'me', label: t('ac.support.mine') }]} />
        </>
      }
      testID="screen-admin-support"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        <DataTable
          rows={q.data?.tickets || []}
          keyFor={(r: any) => r.id}
          onRowPress={(r: any) => router.push(`/admin/support/${r.id}` as any)}
          rowTestID="admin-ticket-row"
          empty={t('ac.support.none')}
          columns={[
            { key: 'subject', label: t('ac.support.cols.subject'), flex: 3, render: (r: any) => r.subject },
            { key: 'category', label: t('ac.support.cols.category'), render: (r: any) => <Pill label={t(`ac.support.categories.${r.category}`)} tone={r.category === 'safety' ? 'danger' : r.category === 'deletion' || r.category === 'privacy' ? 'warning' : 'neutral'} /> },
            { key: 'status', label: t('ac.support.cols.status'), render: (r: any) => <Pill label={t(`ac.support.status.${r.status}`)} tone={TONE[r.status]} /> },
            { key: 'assigned', label: t('ac.support.cols.assigned'), wideOnly: true, render: (r: any) => r.assignedTo?.email || '—' },
            { key: 'updated', label: t('ac.support.cols.updated'), render: (r: any) => f.dateTime(r.updatedAt) },
          ]}
        />
      </AdminState>
    </AdminPage>
  );
}
