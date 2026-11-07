import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, Button, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { RankedBars } from '@/features/admin/charts';
import { AdminPage, AdminState, Grid, KeyValues, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

export default function AdminUser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const router = useRouter();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>(`/users/${encodeURIComponent(String(id))}`);
  const d = q.data;

  const run = async (path: string, body: Record<string, unknown>, done: string, after?: () => void) => {
    try {
      await act(() => adminPost(path, body));
      toast(t(done));
      if (after) after();
      else q.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const withReason = async (title: string, path: string, done: string, extra: Record<string, unknown> = {}) => {
    const reason = await ask({ title, body: t('ac.users.reasonBody') });
    if (reason) await run(path, { ...extra, reason }, done);
  };
  const base = `/users/${encodeURIComponent(String(id))}`;

  const grant = async () => {
    const days = await ask({ title: t('ac.users.grantTitle'), label: t('ac.users.grantDays'), min: 1, multiline: false, initial: '30' });
    if (!days) return;
    const reason = await ask({ title: t('ac.users.grantTitle'), body: t('ac.users.grantBody') });
    if (reason) await run(`${base}/grants`, { days: Number(days), reason }, 'ac.users.granted');
  };
  const remove = async () => {
    const reason = await ask({ title: t('ac.users.deleteTitle'), body: t('ac.users.deleteBody'), min: 10, destructive: true });
    if (!reason || !d?.user.email) return;
    const typed = await ask({ title: t('ac.users.deleteTitle'), typeToConfirm: d.user.email, destructive: true, confirmLabel: t('ac.users.deleteConfirm') });
    if (typed) await run(`${base}/delete`, { reason, confirmEmail: typed }, 'ac.users.deleted', () => router.replace('/admin/users' as any));
  };

  return (
    <AdminPage
      title={d?.user.email || d?.community?.pseudonym || t('ac.users.account')}
      subtitle={d ? `${d.user.id} · ${t('ac.users.since', { date: f.date(d.user.createdAt) })}` : undefined}
      actions={
        d ? (
          <>
            {can('users.manage') ? (
              d.user.status === 'active' ? (
                <Button label={t('ac.users.suspend')} variant="danger" size="sm" onPress={() => withReason(t('ac.users.suspendTitle'), `${base}/suspend`, 'ac.users.suspended')} testID="admin-user-suspend" />
              ) : (
                <Button label={t('ac.users.reinstate')} size="sm" onPress={() => withReason(t('ac.users.reinstateTitle'), `${base}/reinstate`, 'ac.users.reinstated')} testID="admin-user-reinstate" />
              )
            ) : null}
            {can('users.sessions') ? <Button label={t('ac.users.endSessions')} variant="secondary" size="sm" onPress={() => withReason(t('ac.users.endSessions'), `${base}/sessions/revoke`, 'ac.users.sessionsEnded')} /> : null}
            {can('users.sessions') && d.user.emailVerified ? <Button label={t('ac.users.sendReset')} variant="secondary" size="sm" onPress={() => withReason(t('ac.users.sendReset'), `${base}/password-reset`, 'ac.users.resetSent')} /> : null}
          </>
        ) : null
      }
      testID="screen-admin-user"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Note icon="lock-closed-outline">{t('ac.users.privacy')}</Note>
            <Grid min={300}>
              <Panel title={t('ac.users.accountPanel')}>
                <KeyValues
                  items={[
                    [t('ac.users.cols.status'), <Pill key="s" label={t(`ac.users.status.${d.user.status}`)} tone={d.user.status === 'active' ? 'good' : 'danger'} />],
                    [t('ac.users.cols.type'), t(d.user.registered ? 'ac.users.registered' : 'ac.users.deviceOnly')],
                    [t('ac.users.cols.lastSeen'), f.dateTime(d.user.lastSeenAt)],
                    [t('ac.users.sessions'), d.sessions.map((s: any) => `${t(`ac.users.sessionKinds.${s.kind}`)}: ${s.count}`).join(' · ') || '0'],
                    [t('ac.users.cols.staff'), d.user.staffRoles.length ? d.user.staffRoles.map((r: string) => t(`ac.roles.${r}`)).join(', ') : '—'],
                    ...(d.user.lockedUntil ? ([[t('ac.users.lockedUntil'), f.dateTime(d.user.lockedUntil)]] as [string, string][]) : []),
                    ...(d.user.suspensionReason ? ([[t('ac.users.suspensionReason'), d.user.suspensionReason]] as [string, string][]) : []),
                  ]}
                />
              </Panel>
              <Panel title={t('ac.users.planPanel')} actions={can('users.entitlements') ? <Button label={t('ac.users.grant')} size="sm" variant="secondary" onPress={grant} testID="admin-user-grant" /> : null}>
                <KeyValues
                  items={[
                    [t('ac.users.cols.plan'), d.entitlements.tier === 'plus' ? `Plus · ${t('ac.users.until', { date: f.date(d.entitlements.plus.expiresAt) })}` : t('ac.users.free')],
                    [t('ac.users.payments'), t('ac.users.paymentsLine', { approved: d.payments.approved, refunded: d.payments.refunded })],
                  ]}
                />
                {d.grants.map((g: any) => (
                  <View key={g.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <AppText variant="caption" style={{ color: g.revokedAt ? c.textMuted : c.text, flex: 1 }}>
                      {t('ac.users.grantLine', { days: g.days, date: f.date(g.startsAt), reason: g.reason })}
                    </AppText>
                    {!g.revokedAt && can('users.entitlements') ? (
                      <Button label={t('ac.users.revoke')} variant="ghost" size="sm" onPress={() => withReason(t('ac.users.revokeGrant'), `${base}/grants/${g.id}/revoke`, 'ac.users.grantRevoked')} />
                    ) : g.revokedAt ? (
                      <Pill label={t('ac.users.revoked')} />
                    ) : null}
                  </View>
                ))}
                <AppText variant="caption" style={{ color: c.textMuted }}>
                  {t('ac.users.grantNote')}
                </AppText>
              </Panel>
              <Panel title={t('ac.users.usagePanel')} subtitle={t('ac.users.usageSub')}>
                {d.usage.optedOut ? (
                  <AppText variant="small" style={{ color: c.textSecondary }}>
                    {t('ac.users.optedOut')}
                  </AppText>
                ) : (
                  <>
                    <KeyValues
                      items={[
                        [t('ac.users.activeDays'), f.num(d.usage.activeDays)],
                        [t('ac.users.timeInApp'), f.minutes(d.usage.minutes)],
                        [t('ac.users.sessionsCount'), f.num(d.usage.sessions)],
                      ]}
                    />
                    {d.usage.topFeatures.length ? <RankedBars items={d.usage.topFeatures.map((x: any) => ({ label: t(`ac.features.${x.feature}`), value: x.minutes }))} format={(v) => f.minutes(v)} /> : null}
                  </>
                )}
              </Panel>
              <Panel title={t('ac.users.communityPanel')}>
                {d.community ? (
                  <>
                    <KeyValues
                      items={[
                        [t('ac.users.pseudonym'), d.community.pseudonym],
                        [t('ac.users.rooms'), f.num(d.community.rooms)],
                        [t('ac.users.messages'), f.num(d.community.messages)],
                        [t('ac.users.reportsAgainst'), f.num(d.community.reportsAgainst)],
                        [t('ac.users.postingPause'), d.community.suspension ? t('ac.users.until', { date: f.dateTime(d.community.suspension.endsAt) }) : '—'],
                      ]}
                    />
                    {can('users.manage') ? (
                      <Button
                        label={t('ac.users.restrict')}
                        size="sm"
                        variant="secondary"
                        onPress={async () => {
                          const hours = await ask({ title: t('ac.users.restrict'), label: t('ac.users.restrictHours'), min: 1, multiline: false, initial: '24' });
                          if (!hours) return;
                          const reason = await ask({ title: t('ac.users.restrict'), body: t('ac.users.reasonBody') });
                          if (reason) await run(`${base}/restrict-posting`, { hours: Number(hours), reason }, 'ac.users.restricted');
                        }}
                      />
                    ) : null}
                  </>
                ) : (
                  <AppText variant="small" style={{ color: c.textSecondary }}>
                    {t('ac.users.noCommunity')}
                  </AppText>
                )}
              </Panel>
              <Panel title={t('ac.users.otherPanel')}>
                <KeyValues
                  items={[
                    [t('ac.users.professional'), d.professional ? `${d.professional.publicName || d.professional.id} · ${t(`pro.status.${d.professional.status}`)}` : '—'],
                    [t('ac.users.bookings'), t('ac.users.bookingsLine', { total: d.bookingsAsClient.total, confirmed: d.bookingsAsClient.confirmed })],
                    [t('ac.users.aiCalls'), d.aiCalls30d.length ? d.aiCalls30d.map((x: any) => `${x.feature}: ${x.calls}`).join(' · ') : '0'],
                    [t('ac.users.tickets'), d.supportTickets.length ? d.supportTickets.map((x: any) => t(`ac.support.status.${x.status}`)).join(', ') : '—'],
                  ]}
                />
                {d.professional ? <Button label={t('ac.users.openProfessional')} variant="ghost" size="sm" onPress={() => router.push(`/admin/applications/${d.professional.id}` as any)} /> : null}
              </Panel>
              <Panel title={t('ac.users.historyPanel')} subtitle={t('ac.users.historySub')}>
                {d.history.length ? (
                  d.history.map((h: any, i: number) => (
                    <View key={i} style={{ gap: 2 }}>
                      <AppText variant="smallStrong" style={{ color: c.text }}>
                        {h.action}
                      </AppText>
                      <AppText variant="caption" style={{ color: c.textMuted }}>
                        {f.dateTime(h.at)} · {h.actorRole}
                        {h.reason ? ` · ${h.reason}` : ''}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="small" style={{ color: c.textSecondary }}>
                    {t('ac.users.noHistory')}
                  </AppText>
                )}
              </Panel>
            </Grid>
            {can('users.deletion') && !d.user.staffRoles.length ? (
              <Panel title={t('ac.users.dangerZone')}>
                <AppText variant="small" style={{ color: c.textSecondary }}>
                  {t('ac.users.deleteExplain')}
                </AppText>
                <Button label={t('ac.users.deleteTitle')} variant="danger" size="sm" onPress={remove} style={{ alignSelf: 'flex-start' }} testID="admin-user-delete" />
              </Panel>
            ) : null}
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
