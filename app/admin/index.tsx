import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useAdmin } from '@/features/admin/AdminProvider';
import { useAdminData } from '@/features/admin/api';
import { StackedColumns, TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, Grid, KpiTile, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

/** Overview: what changed in the chosen period, and what is waiting for a person. */
export default function AdminOverview() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { range, can } = useAdmin();
  const q = useAdminData<any>('/dashboard', { from: range.from, to: range.to });
  const d = q.data;
  const k = d?.kpis;
  const go = (href: string) => () => router.push(href as any);
  const queue = (key: string, n: number, href: string, urgent = false) => (
    <KpiTile key={key} label={t(`ac.overview.queues.${key}`)} value={f.num(n)} note={urgent && n ? t('ac.overview.urgentNote') : n ? t('ac.overview.waiting') : t('ac.overview.clear')} onPress={go(href)} testID={`admin-queue-${key}`} />
  );
  return (
    <AdminPage title={t('ac.nav.overview')} subtitle={t('ac.overview.subtitle', { from: f.day(range.from), to: f.day(range.to) })} testID="screen-admin-overview">
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Grid min={190}>
              <KpiTile label={t('ac.overview.kpi.newAccounts')} value={f.num(k.newAccounts.value)} change={k.newAccounts.change} testID="admin-kpi-new" />
              <KpiTile label={t('ac.overview.kpi.registrations')} value={f.num(k.registrations.value)} change={k.registrations.change} />
              {d.engagement ? <KpiTile label={t('ac.overview.kpi.activeUsers')} value={f.num(d.engagement.current.activeUsers)} change={pctChange(d.engagement.current.activeUsers, d.engagement.previous.activeUsers)} note={t('ac.overview.dauWauMau', { dau: f.num(d.engagement.activeNow.dau), wau: f.num(d.engagement.activeNow.wau), mau: f.num(d.engagement.activeNow.mau) })} /> : null}
              <KpiTile label={t('ac.overview.kpi.communityMessages')} value={f.num(k.communityMessages.value)} change={k.communityMessages.change} />
              <KpiTile label={t('ac.overview.kpi.bookingRequests')} value={f.num(k.bookingRequests.value)} change={k.bookingRequests.change} />
              <KpiTile label={t('ac.overview.kpi.applications')} value={f.num(k.applications.value)} change={k.applications.change} />
              <KpiTile label={t('ac.overview.kpi.aiCalls')} value={f.num(k.aiCalls.value)} change={k.aiCalls.change} goodWhenUp={false} />
              {d.finance ? <KpiTile label={t('ac.overview.kpi.testRevenue')} value={f.money(d.finance.netMinor, d.finance.currency)} change={d.finance.change} note={t('ac.finance.testShort')} /> : null}
            </Grid>

            <Panel title={t('ac.overview.waitingTitle')} subtitle={t('ac.overview.waitingSub')}>
              <Grid min={170}>
                {can('professionals.view') ? queue('applications', d.queues.applications, '/admin/applications') : null}
                {can('moderation.act') ? queue('reports', d.queues.reports, '/admin/moderation') : null}
                {can('moderation.act') ? queue('urgentReports', d.queues.urgentReports, '/admin/moderation?view=urgent', true) : null}
                {can('moderation.appeals') ? queue('appeals', d.queues.appeals, '/admin/moderation?view=appeals') : null}
                {can('safety.view') ? queue('safetyCases', d.queues.safetyCases, '/admin/safety', true) : null}
                {can('support.view') ? queue('supportWaiting', d.queues.supportWaiting, '/admin/support') : null}
              </Grid>
            </Panel>

            <Grid min={420}>
              {d.engagement ? (
                <Panel title={t('ac.overview.activePerDay')} subtitle={d.engagement.collecting ? undefined : t('ac.analytics.notCollecting')}>
                  <TrendChart data={d.engagement.daily.map((x: any) => ({ x: x.day, y: x.activeUsers }))} format={f.compact} valueLabel={t('ac.overview.activeUsersLabel')} testID="admin-chart-active" />
                </Panel>
              ) : null}
              {d.engagement ? (
                <Panel title={t('ac.overview.newPerDay')}>
                  <TrendChart kind="bars" data={d.engagement.daily.map((x: any) => ({ x: x.day, y: x.newAccounts }))} format={f.compact} valueLabel={t('ac.overview.newAccountsLabel')} />
                </Panel>
              ) : null}
              {d.finance ? (
                <Panel title={t('ac.overview.revenuePerDay')} actions={<Pill label={t('ac.test')} tone="warning" icon="flask-outline" />}>
                  <StackedColumns
                    data={d.finance.daily.map((x: any) => ({ x: x.day, values: [x.professional, x.plus, x.art] }))}
                    series={[t('ac.finance.products.professional'), t('ac.finance.products.plus'), t('ac.finance.products.art')]}
                    format={(v) => f.money(v, d.finance.currency)}
                  />
                </Panel>
              ) : null}
            </Grid>
            <View>
              <Note>{t('ac.overview.privacy')}</Note>
            </View>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}

const pctChange = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
