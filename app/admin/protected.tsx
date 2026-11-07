import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, Sheet, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminGet, adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, KeyValues, Note, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

const TONE: Record<string, any> = { requested: 'warning', approved: 'good', denied: 'neutral', revoked: 'neutral', expired: 'neutral' };
const BASES = ['legal_obligation', 'vital_interests', 'user_request', 'legitimate_interest'];

/** Governed, time-limited access to one protected item; off unless the owner enables it. */
export default function AdminProtected() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask, me } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/sensitive/requests');
  const [form, setForm] = useState<{ category: string; resourceId: string; purpose: string; lawfulBasis: string; ticketRef: string } | null>(null);
  const [view, setView] = useState<any | null>(null);
  const run = async (fn: () => Promise<any>, done: string) => {
    try {
      const out = await act(fn);
      toast(t(done));
      q.reload();
      return out;
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
      return null;
    }
  };
  return (
    <AdminPage
      title={t('ac.nav.protected')}
      subtitle={t('ac.protected.subtitle')}
      actions={q.data?.enabled ? <Button label={t('ac.protected.new')} size="sm" icon="add" onPress={() => setForm({ category: 'booking_notes', resourceId: '', purpose: '', lawfulBasis: 'legal_obligation', ticketRef: '' })} /> : null}
      testID="screen-admin-protected"
    >
      <Note tone="warning" icon="key-outline">
        {t('ac.protected.rules')}
      </Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        {q.data ? (
          <>
            {!q.data.enabled ? <Note>{t('ac.protected.offBody')}</Note> : null}
            <DataTable
              rows={q.data.requests}
              keyFor={(r: any) => String(r.id)}
              empty={t('ac.protected.none')}
              columns={[
                { key: 'what', label: t('ac.protected.cols.item'), flex: 2, render: (r: any) => `${t(`ac.protected.categories.${r.category}`)} · ${r.resourceId}` },
                { key: 'basis', label: t('ac.protected.cols.basis'), wideOnly: true, render: (r: any) => t(`ac.protected.bases.${r.lawfulBasis}`) },
                { key: 'status', label: t('ac.protected.cols.status'), render: (r: any) => <Pill label={t(`ac.protected.status.${r.status}`)} tone={TONE[r.status]} /> },
                { key: 'until', label: t('ac.protected.cols.until'), render: (r: any) => (r.status === 'approved' ? f.dateTime(r.expiresAt) : '—') },
                {
                  key: 'act',
                  label: '',
                  flex: 2,
                  render: (r: any) => (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {r.status === 'requested' && can('sensitive.approve') && r.requesterId !== me?.accountId ? (
                        <>
                          <Button label={t('ac.protected.approve')} size="sm" onPress={async () => { const note = await ask({ title: t('ac.protected.approve'), body: r.purpose, min: 10 }); if (note) await run(() => adminPost(`/sensitive/requests/${r.id}/decide`, { approve: true, note, hours: 4 }), 'ac.protected.approved'); }} />
                          <Button label={t('ac.protected.deny')} size="sm" variant="ghost" onPress={async () => { const note = await ask({ title: t('ac.protected.deny'), min: 10 }); if (note) await run(() => adminPost(`/sensitive/requests/${r.id}/decide`, { approve: false, note }), 'ac.protected.denied'); }} />
                        </>
                      ) : null}
                      {r.status === 'approved' && r.requesterId === me?.accountId ? (
                        <Button label={t('ac.protected.open')} size="sm" variant="secondary" onPress={async () => { const out = await run(() => adminGet(`/sensitive/requests/${r.id}/view`), 'ac.protected.opened'); if (out) setView(out); }} />
                      ) : null}
                      {['requested', 'approved'].includes(r.status) ? <Button label={t('ac.protected.revoke')} size="sm" variant="ghost" onPress={() => run(() => adminPost(`/sensitive/requests/${r.id}/revoke`, { note: 'closed in the admin center' }), 'ac.protected.revoked')} /> : null}
                    </View>
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </AdminState>
      <Sheet visible={Boolean(form)} onClose={() => setForm(null)} title={t('ac.protected.new')} maxWidth={560}>
        {form ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['booking_notes', 'private_messages'].map((k) => (
                <Chip key={k} label={t(`ac.protected.categories.${k}`)} selected={form.category === k} onPress={() => setForm({ ...form, category: k })} />
              ))}
            </View>
            <TextField label={t(form.category === 'booking_notes' ? 'ac.protected.bookingId' : 'ac.protected.threadId')} value={form.resourceId} onChangeText={(v) => setForm({ ...form, resourceId: v.trim() })} autoCapitalize="none" />
            <TextField label={t('ac.protected.purpose')} helper={t('ac.protected.purposeHelp')} value={form.purpose} onChangeText={(v) => setForm({ ...form, purpose: v })} multiline />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {BASES.map((b) => (
                <Chip key={b} label={t(`ac.protected.bases.${b}`)} selected={form.lawfulBasis === b} onPress={() => setForm({ ...form, lawfulBasis: b })} />
              ))}
            </View>
            <TextField label={t('ac.protected.ticket')} value={form.ticketRef} onChangeText={(v) => setForm({ ...form, ticketRef: v })} />
            <Button
              label={t('ac.protected.submit')}
              disabled={form.purpose.trim().length < 30 || form.ticketRef.trim().length < 3 || !form.resourceId}
              onPress={async () => {
                if (await run(() => adminPost('/sensitive/requests', form), 'ac.protected.requested')) setForm(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>
      <Sheet visible={Boolean(view)} onClose={() => setView(null)} title={t('ac.protected.viewing')} maxWidth={640}>
        {view ? (
          <View style={{ gap: 10 }}>
            <Note tone="warning">{t('ac.protected.viewingNote', { time: f.dateTime(view.expiresAt) })}</Note>
            <KeyValues items={[[t('ac.protected.purpose'), view.request.purpose], [t('ac.protected.ticket'), view.request.ticketRef]]} />
            {view.data.note !== undefined ? (
              <AppText variant="small" style={{ color: c.text }} selectable>
                {view.data.note || '—'}
              </AppText>
            ) : null}
            {(view.data.messages || []).map((m: any) => (
              <View key={m.id} style={{ backgroundColor: c.cardMuted, borderRadius: 10, padding: 10, gap: 2 }}>
                <AppText variant="caption" style={{ color: c.textMuted }}>
                  {m.from} · {f.dateTime(m.at)}
                </AppText>
                <AppText variant="small" style={{ color: c.text }}>
                  {m.body}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Sheet>
    </AdminPage>
  );
}
