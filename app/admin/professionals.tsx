import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Sheet, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminGet, adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, FilterChips, KeyValues, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { openAdminDocument } from '@/lib/api/pros';
import { useT } from '@/i18n';

type S = 'all' | 'approved' | 'submitted' | 'under_review' | 'more_info_required' | 'suspended' | 'expired' | 'rejected';
const STATUS_TONE: Record<string, any> = { approved: 'good', submitted: 'warning', under_review: 'warning', more_info_required: 'info', suspended: 'danger', expired: 'neutral', rejected: 'neutral', draft: 'neutral' };

export default function AdminProfessionals() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [status, setStatus] = useState<S>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<any | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);
  const list = useAdminData<any>('/professionals', { status: status === 'all' ? undefined : status, q: search || (focus ? String(focus) : undefined) });
  useEffect(() => {
    if (focus && list.data?.professionals?.length === 1) setOpen(list.data.professionals[0]);
  }, [focus, list.data]);
  return (
    <AdminPage
      title={t('ac.nav.professionals')}
      subtitle={t('ac.pros.subtitle')}
      actions={<Button label={t('ac.nav.applications')} size="sm" variant="secondary" icon="document-text-outline" onPress={() => router.push('/admin/applications' as any)} />}
      filters={
        <View style={{ gap: 10, width: '100%' }}>
          <TextField value={q} onChangeText={setQ} placeholder={t('ac.pros.search')} testID="admin-pros-search" />
          <FilterChips<S> value={status} onChange={setStatus} options={(['all', 'approved', 'submitted', 'under_review', 'more_info_required', 'suspended', 'expired', 'rejected'] as S[]).map((v) => ({ value: v, label: v === 'all' ? t('ac.common.all') : t(`pro.status.${v}`) }))} />
        </View>
      }
      testID="screen-admin-professionals"
    >
      <AdminState error={list.error} loading={list.loading} hasData={Boolean(list.data)} onRetry={list.reload}>
        <DataTable
          rows={list.data?.professionals || []}
          keyFor={(r: any) => r.id}
          onRowPress={setOpen}
          rowTestID="admin-pro-row"
          empty={t('ac.pros.none')}
          columns={[
            { key: 'name', label: t('ac.pros.cols.name'), flex: 2, render: (r: any) => r.publicName || r.legalName || r.id },
            { key: 'status', label: t('ac.pros.cols.verification'), render: (r: any) => <Pill label={t(`pro.status.${r.status}`)} tone={STATUS_TONE[r.status]} /> },
            { key: 'membership', label: t('ac.pros.cols.membership'), render: (r: any) => t(`pro.membershipState.${r.membership.state}`) },
            { key: 'listed', label: t('ac.pros.cols.listed'), render: (r: any) => (r.listed ? <Pill label={t('ac.pros.listed')} tone="good" /> : t('ac.pros.notListed')) },
            { key: 'place', label: t('ac.pros.cols.place'), wideOnly: true, render: (r: any) => [r.city, r.country].filter(Boolean).join(', ') || '—' },
            { key: 'expires', label: t('ac.pros.cols.expires'), wideOnly: true, render: (r: any) => f.date(r.verificationExpiresAt) },
            { key: 'bookings', label: t('ac.pros.cols.bookings30'), wideOnly: true, align: 'right', render: (r: any) => f.num(r.bookings30d) },
          ]}
        />
      </AdminState>
      {open ? <ProSheet pro={open} onClose={() => setOpen(null)} onChanged={list.reload} /> : null}
    </AdminPage>
  );
}

function ProSheet({ pro, onClose, onChanged }: { pro: any; onClose: () => void; onChanged: () => void }) {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const router = useRouter();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [periods, setPeriods] = useState<any[] | null>(null);
  const base = `/professionals/${encodeURIComponent(pro.id)}`;
  const load = () => {
    adminGet<any>(`${base}/documents`).then((r) => setDocs(r.documents)).catch(() => setDocs([]));
    if (can('memberships.view')) adminGet<any>(`${base}/memberships`).then((r) => setPeriods(r.periods)).catch(() => setPeriods([]));
  };
  useEffect(load, [pro.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (path: string, body: object, done: string) => {
    try {
      await act(() => adminPost(path, body));
      toast(t(done));
      load();
      onChanged();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const reviewDoc = async (doc: any, outcome: 'accepted' | 'rejected' | 'unclear') => {
    const note = outcome === 'accepted' ? '' : await ask({ title: t(`ac.pros.docOutcomes.${outcome}`), body: t('ac.pros.docNoteBody'), min: 5 });
    if (note === null) return;
    await run(`${base}/documents/${doc.id}/review`, { outcome, note }, 'ac.pros.docReviewed');
  };
  const openDoc = async (doc: any) => {
    try {
      const url = await act(() => openAdminDocument(pro.id, doc.id));
      if (!url) toast(t('ac.common.webOnly'));
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  return (
    <Sheet visible onClose={onClose} title={pro.publicName || pro.legalName || pro.id} maxWidth={640} testID="admin-pro-sheet">
      <View style={{ gap: 14 }}>
        <KeyValues
          items={[
            [t('ac.pros.cols.verification'), t(`pro.status.${pro.status}`)],
            [t('ac.pros.legalName'), pro.legalName || '—'],
            [t('ac.pros.cols.place'), [pro.city, pro.country].filter(Boolean).join(', ') || '—'],
            [t('ac.pros.cols.expires'), f.date(pro.verificationExpiresAt)],
            [t('ac.pros.cols.membership'), `${t(`pro.membershipState.${pro.membership.state}`)}${pro.membership.endsAt ? ` · ${f.date(pro.membership.endsAt)}` : ''}`],
          ]}
        />
        <Button label={t('ac.pros.openReview')} variant="secondary" size="sm" icon="document-text-outline" onPress={() => router.push(`/admin/applications/${pro.id}` as any)} style={{ alignSelf: 'flex-start' }} />
        <AppText variant="bodyStrong" style={{ color: c.text }}>
          {t('ac.pros.documents')}
        </AppText>
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {t('ac.pros.documentsNote')}
        </AppText>
        {(docs || []).map((d) => (
          <View key={d.id} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <AppText variant="smallStrong" style={{ color: c.text, flexShrink: 1 }}>
                {t(`pro.apply.documentKinds.${d.kind}`)} · {d.fileName}
              </AppText>
              {d.review ? <Pill label={t(`ac.pros.docOutcomes.${d.review.outcome}`)} tone={d.review.outcome === 'accepted' ? 'good' : d.review.outcome === 'rejected' ? 'danger' : 'warning'} /> : <Pill label={t('ac.pros.docNotReviewed')} />}
            </View>
            {d.review?.note ? (
              <AppText variant="caption" style={{ color: c.textSecondary }}>
                {d.review.note}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {can('professionals.documents') ? <Button label={t('ac.pros.openDoc')} size="sm" variant="secondary" icon="eye-outline" onPress={() => openDoc(d)} /> : null}
              {can('professionals.verify') ? (
                <>
                  <Button label={t('ac.pros.docOutcomes.accepted')} size="sm" variant="ghost" onPress={() => reviewDoc(d, 'accepted')} />
                  <Button label={t('ac.pros.docOutcomes.unclear')} size="sm" variant="ghost" onPress={() => reviewDoc(d, 'unclear')} />
                  <Button label={t('ac.pros.docOutcomes.rejected')} size="sm" variant="ghost" onPress={() => reviewDoc(d, 'rejected')} />
                </>
              ) : null}
            </View>
          </View>
        ))}
        {can('professionals.manage') && pro.status === 'approved' ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label={t('ac.pros.renew')}
              size="sm"
              variant="secondary"
              onPress={async () => {
                const reference = await ask({ title: t('ac.pros.renew'), label: t('ac.pros.reviewReference'), body: t('ac.pros.renewBody'), multiline: false });
                if (!reference) return;
                const reason = await ask({ title: t('ac.pros.renew'), min: 5 });
                if (reason) await run(`${base}/verification/renew`, { reason, reviewReference: reference }, 'ac.pros.renewed');
              }}
            />
            <Button
              label={t('ac.pros.expire')}
              size="sm"
              variant="danger"
              onPress={async () => {
                const reason = await ask({ title: t('ac.pros.expire'), body: t('ac.pros.expireBody'), min: 5, destructive: true });
                if (reason) await run(`${base}/verification/expire`, { reason }, 'ac.pros.expired');
              }}
            />
          </View>
        ) : null}
        {periods && periods.length ? (
          <View style={{ gap: 6 }}>
            <AppText variant="bodyStrong" style={{ color: c.text }}>
              {t('ac.pros.periods')}
            </AppText>
            {periods.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <AppText variant="caption" style={{ color: p.revokedAt ? c.textMuted : c.text, flex: 1 }}>
                  {t(`ac.pros.periodKinds.${p.kind}`)} · {f.date(p.startsAt)} – {f.date(p.endsAt)}
                  {p.revokedAt ? ` · ${t('ac.users.revoked')}` : ''}
                </AppText>
                {!p.revokedAt && p.kind !== 'paid' && can('memberships.manage') ? (
                  <Button
                    label={t('ac.users.revoke')}
                    size="sm"
                    variant="ghost"
                    onPress={async () => {
                      const reason = await ask({ title: t('ac.pros.revokePeriod'), min: 5 });
                      if (reason) await run(`${base}/membership/${p.id}/revoke`, { reason }, 'ac.pros.periodRevoked');
                    }}
                  />
                ) : null}
              </View>
            ))}
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {t('ac.pros.paidNote')}
            </AppText>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
