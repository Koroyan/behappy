import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, Sheet, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { STAFF_ROLES } from '@/lib/api/account';
import { useT } from '@/i18n';

export default function AdminStaff() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask, me } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/staff');
  const roles = useAdminData<any>('/roles');
  const [grant, setGrant] = useState<{ email: string; role: string } | null>(null);
  const [open, setOpen] = useState<any | null>(null);
  const manage = can('staff.manage');

  const run = async (path: string, body: object, done: string) => {
    try {
      await act(() => adminPost(path, body));
      toast(t(done));
      q.reload();
      return true;
    } catch (e) {
      toast(t(`ac.staff.errors.${errorCode(e)}`) === `ac.staff.errors.${errorCode(e)}` ? t('ac.common.failed', { code: errorCode(e) }) : t(`ac.staff.errors.${errorCode(e)}`));
      return false;
    }
  };
  const doGrant = async () => {
    if (!grant) return;
    const reason = await ask({ title: t('ac.staff.grantTitle'), body: t('ac.staff.grantBody', { role: t(`ac.roles.${grant.role}`), email: grant.email }) });
    if (reason && (await run('/staff/roles', { email: grant.email.trim(), role: grant.role, grant: true, reason }, 'ac.staff.granted'))) setGrant(null);
  };
  return (
    <AdminPage
      title={t('ac.nav.staff')}
      subtitle={t('ac.staff.subtitle')}
      actions={manage ? <Button label={t('ac.staff.add')} icon="person-add-outline" size="sm" onPress={() => setGrant({ email: '', role: 'support' })} testID="admin-staff-add" /> : null}
      testID="screen-admin-staff"
    >
      <Note icon="key-outline">{t('ac.staff.note')}</Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        <DataTable
          rows={q.data?.staff || []}
          keyFor={(r: any) => r.id}
          onRowPress={manage ? setOpen : undefined}
          rowTestID="admin-staff-row"
          columns={[
            { key: 'email', label: t('ac.users.cols.account'), flex: 2, render: (r: any) => r.email + (r.id === me?.accountId ? ` (${t('ac.staff.you')})` : '') },
            { key: 'roles', label: t('ac.staff.cols.roles'), flex: 2, render: (r: any) => r.roles.map((x: string) => t(`ac.roles.${x}`)).join(', ') },
            { key: 'mfa', label: t('ac.staff.cols.twoStep'), render: (r: any) => <Pill label={t(r.mfaEnabled ? 'ac.common.on' : 'ac.common.off')} tone={r.mfaEnabled ? 'good' : 'warning'} /> },
            { key: 'state', label: t('ac.staff.cols.state'), render: (r: any) => (r.staffSuspendedAt ? <Pill label={t('ac.staff.suspended')} tone="danger" /> : <Pill label={t('ac.staff.active')} tone="good" />) },
            { key: 'seen', label: t('ac.users.cols.lastSeen'), wideOnly: true, render: (r: any) => f.date(r.lastSeenAt) },
          ]}
        />
      </AdminState>
      {roles.data ? (
        <Panel title={t('ac.staff.matrix')} subtitle={t('ac.staff.matrixSub')}>
          {roles.data.roles.map((r: any) => (
            <View key={r.role} style={{ gap: 4, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8 }}>
              <AppText variant="smallStrong" style={{ color: c.text }}>
                {t(`ac.roles.${r.role}`)}
              </AppText>
              <AppText variant="caption" style={{ color: c.textSecondary }}>
                {t(`ac.roleNotes.${r.role}`)}
              </AppText>
              <AppText variant="caption" style={{ color: c.textMuted }}>
                {r.permissions.join(' · ')}
              </AppText>
            </View>
          ))}
        </Panel>
      ) : null}
      <Sheet visible={Boolean(grant)} onClose={() => setGrant(null)} title={t('ac.staff.add')}>
        {grant ? (
          <View style={{ gap: 12 }}>
            <TextField label={t('ac.staff.email')} value={grant.email} onChangeText={(v) => setGrant({ ...grant, email: v })} autoCapitalize="none" keyboardType="email-address" testID="admin-staff-email" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {STAFF_ROLES.map((r) => (
                <Chip key={r} label={t(`ac.roles.${r}`)} selected={grant.role === r} onPress={() => setGrant({ ...grant, role: r })} testID={`admin-staff-role-${r}`} />
              ))}
            </View>
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {t(`ac.roleNotes.${grant.role}`)}
            </AppText>
            <Button label={t('ac.staff.grant')} onPress={doGrant} disabled={!grant.email.includes('@')} testID="admin-staff-grant" />
          </View>
        ) : null}
      </Sheet>
      <Sheet visible={Boolean(open)} onClose={() => setOpen(null)} title={open?.email}>
        {open ? (
          <View style={{ gap: 10 }}>
            {open.id === me?.accountId ? <Note>{t('ac.staff.notYourself')}</Note> : null}
            {open.roles.map((r: string) => (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="small">{t(`ac.roles.${r}`)}</AppText>
                {open.id !== me?.accountId ? (
                  <Button
                    label={t('ac.staff.remove')}
                    size="sm"
                    variant="ghost"
                    onPress={async () => {
                      const reason = await ask({ title: t('ac.staff.removeTitle', { role: t(`ac.roles.${r}`) }), min: 3 });
                      if (reason && (await run('/staff/roles', { accountId: open.id, role: r, grant: false, reason }, 'ac.staff.removed'))) setOpen(null);
                    }}
                  />
                ) : null}
              </View>
            ))}
            {open.id !== me?.accountId ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {open.staffSuspendedAt ? (
                  <Button label={t('ac.staff.reinstate')} size="sm" onPress={async () => { const reason = await ask({ title: t('ac.staff.reinstate') }); if (reason && (await run(`/staff/${open.id}/reinstate`, { reason }, 'ac.staff.reinstated'))) setOpen(null); }} />
                ) : (
                  <Button label={t('ac.staff.suspend')} size="sm" variant="danger" onPress={async () => { const reason = await ask({ title: t('ac.staff.suspend'), body: t('ac.staff.suspendBody'), destructive: true }); if (reason && (await run(`/staff/${open.id}/suspend`, { reason }, 'ac.staff.suspendedDone'))) setOpen(null); }} />
                )}
                {open.mfaEnabled ? <Button label={t('ac.staff.resetMfa')} size="sm" variant="secondary" onPress={async () => { const reason = await ask({ title: t('ac.staff.resetMfa'), body: t('ac.staff.resetMfaBody') }); if (reason && (await run(`/staff/${open.id}/mfa/reset`, { reason }, 'ac.staff.mfaReset'))) setOpen(null); }} /> : null}
                {can('security.manage') ? <Button label={t('ac.staff.endSessions')} size="sm" variant="secondary" onPress={async () => { const reason = await ask({ title: t('ac.staff.endSessions') }); if (reason) await run(`/staff/${open.id}/sessions/revoke`, { reason }, 'ac.users.sessionsEnded'); }} /> : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </AdminPage>
  );
}
