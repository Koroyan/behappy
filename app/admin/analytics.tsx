import React from 'react';

import { Button, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminDownload, errorCode, useAdminData } from '@/features/admin/api';
import { CohortTable, RankedBars, TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, Grid, KpiTile, Note, Panel, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

const change = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

export default function AdminAnalytics() {
  const { t } = useT();
  const f = useFmt();
  const { range, can, act } = useAdmin();
  const { toast } = useFeedback();
  const query = { from: range.from, to: range.to };
  const o = useAdminData<any>('/analytics/overview', query);
  const feats = useAdminData<any>('/analytics/features', query);
  const ret = useAdminData<any>('/analytics/retention', { weeks: 8 });
  const d = o.data;
  const exportCsv = async () => {
    try {
      const ok = await act(() => adminDownload('/analytics/export', `behappy-usage-${range.from}-${range.to}.csv`, query));
      toast(t(ok ? 'ac.analytics.exported' : 'ac.common.webOnly'));
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  return (
    <AdminPage
      title={t('ac.nav.analytics')}
      subtitle={t('ac.analytics.subtitle')}
      actions={can('analytics.export') ? <Button label={t('ac.analytics.export')} icon="download-outline" size="sm" variant="secondary" onPress={exportCsv} /> : null}
      testID="screen-admin-analytics"
    >
      <Note icon="shield-checkmark-outline">{t('ac.analytics.privacy', { n: d?.minCohort ?? 5 })}</Note>
      <AdminState error={o.error} loading={o.loading} hasData={Boolean(d)} onRetry={o.reload}>
        {d ? (
          <>
            {!d.collecting ? <Note tone="warning">{t('ac.analytics.notCollecting')}</Note> : null}
            <Grid min={180}>
              <KpiTile label={t('ac.analytics.dau')} value={f.num(d.activeNow.dau)} />
              <KpiTile label={t('ac.analytics.wau')} value={f.num(d.activeNow.wau)} />
              <KpiTile label={t('ac.analytics.mau')} value={f.num(d.activeNow.mau)} note={t('ac.analytics.stickiness', { v: f.pct(d.activeNow.stickiness) })} />
              <KpiTile label={t('ac.analytics.activeInRange')} value={f.num(d.current.activeUsers)} change={change(d.current.activeUsers, d.previous.activeUsers)} />
              <KpiTile label={t('ac.analytics.timePerDay')} value={f.minutes(d.current.avgSecondsPerActiveDay / 60)} change={change(d.current.avgSecondsPerActiveDay, d.previous.avgSecondsPerActiveDay)} />
              <KpiTile label={t('ac.analytics.sessionsPerDay')} value={String(d.current.sessionsPerActiveDay)} change={change(d.current.sessionsPerActiveDay, d.previous.sessionsPerActiveDay)} />
              <KpiTile label={t('ac.analytics.newAccounts')} value={f.num(d.current.newAccounts)} change={change(d.current.newAccounts, d.previous.newAccounts)} />
              <KpiTile label={t('ac.analytics.registrations')} value={f.num(d.current.registrations)} change={change(d.current.registrations, d.previous.registrations)} />
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.analytics.activePerDay')}>
                <TrendChart data={d.daily.map((x: any) => ({ x: x.day, y: x.activeUsers }))} format={f.compact} valueLabel={t('ac.overview.activeUsersLabel')} />
              </Panel>
              <Panel title={t('ac.analytics.minutesPerDay')}>
                <TrendChart data={d.daily.map((x: any) => ({ x: x.day, y: x.minutes }))} format={f.compact} valueLabel={t('ac.analytics.minutesLabel')} />
              </Panel>
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.analytics.featuresTitle')} subtitle={t('ac.analytics.featuresSub')}>
                {feats.data ? (
                  <RankedBars
                    items={feats.data.features.map((x: any) => ({
                      label: t(`ac.features.${x.feature}`),
                      value: x.minutes,
                      note: x.suppressed ? t('ac.analytics.hiddenSmall') : t('ac.analytics.featureNote', { users: f.num(x.users), avg: f.minutes(x.avgMinutesPerUser) }),
                    }))}
                    format={(v) => f.minutes(v)}
                  />
                ) : null}
              </Panel>
              <Panel title={t('ac.analytics.platforms')}>
                <RankedBars items={d.platforms.map((p: any) => ({ label: t(`ac.analytics.platform.${p.platform}`), value: p.users }))} format={f.num} />
              </Panel>
            </Grid>
            <Panel title={t('ac.analytics.retentionTitle')} subtitle={t('ac.analytics.retentionSub')}>
              {ret.data ? <CohortTable cohorts={ret.data.cohorts} weekLabel={(w) => t('ac.analytics.week', { n: w })} sizeLabel={t('ac.analytics.people')} /> : null}
            </Panel>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
