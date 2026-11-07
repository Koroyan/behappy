import { useRouter } from 'expo-router';
import React, { useState } from 'react';

import { useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, FilterChips, Note, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

type F = 'active' | 'open' | 'in_progress' | 'escalated' | 'resolved';
const SAFETY_TONE: Record<string, any> = { open: 'danger', in_progress: 'warning', escalated: 'danger', resolved: 'good' };

export default function AdminSafety() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const [status, setStatus] = useState<F>('active');
  const q = useAdminData<any>('/safety/incidents', { status });
  return (
    <AdminPage
      title={t('ac.nav.safety')}
      subtitle={t('ac.safety.subtitle')}
      filters={<FilterChips<F> value={status} onChange={setStatus} options={(['active', 'open', 'in_progress', 'escalated', 'resolved'] as F[]).map((v) => ({ value: v, label: t(`ac.safety.filters.${v}`) }))} testID="admin-safety-filter" />}
      testID="screen-admin-safety"
    >
      <Note icon="heart-circle-outline" tone="warning">
        {t('ac.safety.staffedNote')}
      </Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        <DataTable
          rows={q.data?.incidents || []}
          keyFor={(r: any) => String(r.id)}
          onRowPress={(r: any) => router.push(`/admin/safety/${r.id}` as any)}
          rowTestID="admin-safety-row"
          empty={t('ac.safety.none')}
          columns={[
            { key: 'what', label: t('ac.safety.cols.what'), flex: 3, render: (r: any) => (r.snippet ? `“${r.snippet}”` : t(`ac.safety.reasons.${r.reason || 'support_request'}`)) },
            { key: 'source', label: t('ac.safety.cols.source'), render: (r: any) => t(`ac.safety.sources.${r.source}`) },
            { key: 'status', label: t('ac.safety.cols.status'), render: (r: any) => <Pill label={t(`ac.safety.status.${r.status}`)} tone={SAFETY_TONE[r.status]} icon={r.status === 'resolved' ? 'checkmark' : 'alert-circle-outline'} /> },
            { key: 'assigned', label: t('ac.safety.cols.assigned'), wideOnly: true, render: (r: any) => r.assignedTo?.email || t('ac.safety.nobody') },
            { key: 'created', label: t('ac.safety.cols.opened'), render: (r: any) => f.dateTime(r.createdAt) },
          ]}
        />
      </AdminState>
    </AdminPage>
  );
}
