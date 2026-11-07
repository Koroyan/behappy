import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Sheet, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminGet, adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, FilterChips, KeyValues, Note, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

type S = 'all' | 'requested' | 'confirmed' | 'declined' | 'cancelled_by_client' | 'cancelled_by_professional' | 'cancelled_by_admin' | 'expired';
const TONE: Record<string, any> = { requested: 'warning', confirmed: 'good', declined: 'neutral', cancelled_by_client: 'neutral', cancelled_by_professional: 'neutral', cancelled_by_admin: 'danger', expired: 'neutral' };

export default function AdminAppointments() {
  const { t } = useT();
  const f = useFmt();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [status, setStatus] = useState<S>('all');
  const [q, setQ] = useState(focus ? String(focus) : '');
  const [search, setSearch] = useState(q);
  const [open, setOpen] = useState<string | null>(focus ? String(focus) : null);
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);
  const list = useAdminData<any>('/appointments', { status: status === 'all' ? undefined : status, q: search || undefined });
  return (
    <AdminPage
      title={t('ac.nav.appointments')}
      subtitle={t('ac.appointments.subtitle')}
      filters={
        <View style={{ gap: 10, width: '100%' }}>
          <TextField value={q} onChangeText={setQ} placeholder={t('ac.appointments.search')} autoCapitalize="none" />
          <FilterChips<S> value={status} onChange={setStatus} options={(['all', 'requested', 'confirmed', 'declined', 'cancelled_by_client', 'cancelled_by_professional', 'cancelled_by_admin', 'expired'] as S[]).map((v) => ({ value: v, label: v === 'all' ? t('ac.common.all') : t(`appointments.status.${v}`) }))} />
        </View>
      }
      testID="screen-admin-appointments"
    >
      <Note icon="lock-closed-outline">{t('ac.appointments.privacy')}</Note>
      <AdminState error={list.error} loading={list.loading} hasData={Boolean(list.data)} onRetry={list.reload}>
        <DataTable
          rows={list.data?.appointments || []}
          keyFor={(r: any) => r.id}
          onRowPress={(r: any) => setOpen(r.id)}
          rowTestID="admin-appointment-row"
          empty={t('ac.appointments.none')}
          columns={[
            { key: 'when', label: t('ac.appointments.cols.when'), render: (r: any) => f.dateTime(r.startsAt) },
            { key: 'pro', label: t('ac.appointments.cols.professional'), flex: 2, render: (r: any) => r.professional.publicName },
            { key: 'client', label: t('ac.appointments.cols.client'), flex: 2, render: (r: any) => (r.client.deleted ? t('ac.appointments.formerClient') : r.client.displayName) },
            { key: 'status', label: t('ac.appointments.cols.status'), render: (r: any) => <Pill label={t(`appointments.status.${r.status}`)} tone={TONE[r.status]} /> },
            { key: 'service', label: t('ac.appointments.cols.service'), wideOnly: true, render: (r: any) => `${r.serviceTitle} · ${f.money(r.priceMinor, r.currency)}` },
          ]}
        />
      </AdminState>
      {open ? <AppointmentSheet id={open} onClose={() => setOpen(null)} onChanged={list.reload} /> : null}
    </AdminPage>
  );
}

function AppointmentSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act } = useAdmin();
  const { toast } = useFeedback();
  const [d, setD] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [toClient, setToClient] = useState('');
  const [toPro, setToPro] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => adminGet<any>(`/appointments/${encodeURIComponent(id)}`).then(setD).catch(() => setD(null));
  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = d?.appointment;
  const active = a && ['requested', 'confirmed'].includes(a.status) && a.endsAt > Date.now();
  const cancel = async () => {
    setBusy(true);
    try {
      await act(() => adminPost(`/appointments/${encodeURIComponent(id)}/cancel`, { reason, messageToClient: toClient || undefined, messageToProfessional: toPro || undefined }));
      toast(t('ac.appointments.cancelled'));
      await load();
      onChanged();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible onClose={onClose} title={a ? f.dateTime(a.startsAt) : t('ac.nav.appointments')} maxWidth={620} testID="admin-appointment-sheet">
      {a ? (
        <View style={{ gap: 14 }}>
          <KeyValues
            items={[
              [t('ac.appointments.cols.status'), t(`appointments.status.${a.status}`)],
              [t('ac.appointments.cols.professional'), a.professional.publicName],
              [t('ac.appointments.cols.client'), a.client.deleted ? t('ac.appointments.formerClient') : a.client.displayName],
              [t('ac.appointments.cols.service'), `${a.serviceTitle} · ${t(`ac.appointments.modes.${a.mode}`)}`],
              [t('ac.appointments.price'), `${f.money(a.priceMinor, a.currency)} · ${t('ac.appointments.paidDirectly')}`],
              [t('ac.appointments.note'), a.hasClientNote ? t('ac.appointments.notePrivate') : '—'],
            ]}
          />
          <AppText variant="bodyStrong" style={{ color: c.text }}>
            {t('ac.appointments.history')}
          </AppText>
          {d.history.map((h: any, i: number) => (
            <AppText key={i} variant="caption" style={{ color: c.textSecondary }}>
              {f.dateTime(h.at)} · {t(`ac.appointments.actors.${h.actor}`)} · {h.to ? t(`appointments.status.${h.to}`) : h.event}
            </AppText>
          ))}
          {d.staffActions.map((h: any, i: number) => (
            <AppText key={`s${i}`} variant="caption" style={{ color: c.textSecondary }}>
              {f.dateTime(h.at)} · {h.actorRole} · {h.action}
              {h.reason ? ` · ${h.reason}` : ''}
            </AppText>
          ))}
          {active && can('appointments.manage') ? (
            <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 }}>
              <AppText variant="bodyStrong" style={{ color: c.text }}>
                {t('ac.appointments.cancelTitle')}
              </AppText>
              <AppText variant="caption" style={{ color: c.textMuted }}>
                {t('ac.appointments.cancelBody')}
              </AppText>
              <TextField label={t('ac.ask.reason')} value={reason} onChangeText={setReason} multiline testID="admin-appointment-reason" />
              <TextField label={t('ac.appointments.toClient')} value={toClient} onChangeText={setToClient} multiline />
              <TextField label={t('ac.appointments.toPro')} value={toPro} onChangeText={setToPro} multiline />
              <Button label={t('ac.appointments.cancelConfirm')} variant="danger" onPress={cancel} loading={busy} disabled={reason.trim().length < 10} testID="admin-appointment-cancel" />
            </View>
          ) : null}
        </View>
      ) : (
        <AppText variant="small" style={{ color: c.textSecondary }}>
          {t('ac.common.loading')}
        </AppText>
      )}
    </Sheet>
  );
}
