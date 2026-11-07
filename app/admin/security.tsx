import React from 'react';
import { View } from 'react-native';

import { AppText, Button, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, DataTable, Grid, KeyValues, KpiTile, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

const BAD = new Set(['login_failed', 'account_locked', 'login_while_locked', 'login_rate_limited', 'step_up_failed', 'mfa_failed', 'step_up_rate_limited']);

export default function AdminSecurity() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/security');
  const d = q.data;
  const failuresPerDay = (() => {
    if (!d) return [];
    const map = new Map<string, number>();
    for (const r of d.eventsPerDay) if (BAD.has(r.kind)) map.set(r.day, (map.get(r.day) || 0) + r.n);
    const out = [];
    for (let i = 29; i >= 0; i -= 1) {
      const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ x: key, y: map.get(key) || 0 });
    }
    return out;
  })();
  const unlock = async (id: string) => {
    const reason = await ask({ title: t('ac.security.unlock'), min: 3 });
    if (!reason) return;
    try {
      await act(() => adminPost(`/security/accounts/${encodeURIComponent(id)}/unlock`, { reason }));
      toast(t('ac.security.unlocked'));
      q.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const flag = (ok: boolean, okLabel: string, badLabel: string) => <Pill label={t(ok ? okLabel : badLabel)} tone={ok ? 'good' : 'danger'} icon={ok ? 'checkmark' : 'alert-circle-outline'} />;
  return (
    <AdminPage title={t('ac.nav.security')} subtitle={t('ac.security.subtitle')} testID="screen-admin-security">
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            {d.config.blocking.length || d.config.leakedRootKeyStillInEnvFile ? (
              <Panel title={t('ac.security.attention')}>
                {d.config.leakedRootKeyStillInEnvFile ? (
                  <AppText variant="small" style={{ color: c.danger }}>
                    {t('ac.security.leakedKey')}
                  </AppText>
                ) : null}
                {d.config.blocking.map((b: string) => (
                  <AppText key={b} variant="small" style={{ color: c.danger }}>
                    • {b}
                  </AppText>
                ))}
              </Panel>
            ) : null}
            <Grid min={180}>
              <KpiTile label={t('ac.security.locked')} value={f.num(d.locked.length)} />
              <KpiTile label={t('ac.security.staff')} value={f.num(d.staff.total)} note={t('ac.security.suspendedStaff', { n: d.staff.suspended })} />
              <KpiTile label={t('ac.security.noTwoStep')} value={f.num(d.staff.withoutTwoStep)} note={t(d.config.twoStepRequired ? 'ac.security.twoStepRequired' : 'ac.security.twoStepOptional')} />
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.security.failuresPerDay')} subtitle={t('ac.security.failuresSub')}>
                <TrendChart kind="bars" data={failuresPerDay} format={f.compact} valueLabel={t('ac.security.failures')} />
              </Panel>
              <Panel title={t('ac.security.config')}>
                <KeyValues
                  items={[
                    [t('ac.security.environment'), t(d.config.production ? 'ac.security.production' : 'ac.security.development')],
                    [t('ac.security.devTools'), flag(!d.config.devTools || !d.config.production, 'ac.security.devToolsOk', 'ac.security.devToolsOn')],
                    [t('ac.security.keys'), flag(d.config.encryptionKeys.documents && d.config.encryptionKeys.messages && d.config.encryptionKeys.identifiers, 'ac.security.keysSet', 'ac.security.keysMissing')],
                    [t('ac.security.adminToken'), <Pill key="tok" label={t(d.config.adminTokenSet ? 'ac.security.tokenSet' : 'ac.security.tokenUnset')} tone={d.config.adminTokenSet ? 'warning' : 'good'} />],
                    [t('ac.security.email'), flag(d.config.email, 'ac.common.on', 'ac.common.off')],
                    [t('ac.security.payments'), <Pill key="pay" label={t('ac.test')} tone="warning" />],
                  ]}
                />
                {d.config.warnings.map((w: string) => (
                  <AppText key={w} variant="caption" style={{ color: c.warning }}>
                    • {w}
                  </AppText>
                ))}
              </Panel>
            </Grid>
            {d.locked.length ? (
              <Panel title={t('ac.security.lockedTitle')}>
                {d.locked.map((a: any) => (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="small" style={{ flex: 1, color: c.text }}>
                      {a.email || a.id} · {t('ac.users.until', { date: f.dateTime(a.until) })}
                    </AppText>
                    {can('security.manage') ? <Button label={t('ac.security.unlock')} size="sm" variant="ghost" onPress={() => unlock(a.id)} /> : null}
                  </View>
                ))}
              </Panel>
            ) : null}
            <Panel title={t('ac.security.recent')} subtitle={t('ac.security.recentSub')}>
              <DataTable
                rows={d.recent}
                keyFor={(r: any) => String(r.id)}
                columns={[
                  { key: 'at', label: t('ac.security.cols.when'), render: (r: any) => f.dateTime(r.at) },
                  { key: 'kind', label: t('ac.security.cols.event'), flex: 2, render: (r: any) => <Pill label={t(`ac.security.kinds.${r.kind}`)} tone={BAD.has(r.kind) ? 'warning' : 'neutral'} /> },
                  { key: 'who', label: t('ac.security.cols.account'), flex: 2, render: (r: any) => r.email || r.accountId || '—' },
                  { key: 'ip', label: t('ac.security.cols.ip'), wideOnly: true, render: (r: any) => (r.ipHash ? r.ipHash.slice(0, 10) : '—') },
                ]}
              />
            </Panel>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
