import { useRouter } from 'expo-router';
import React from 'react';

import { Button } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { useAdminData } from '@/features/admin/api';
import { RankedBars, TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, Grid, KeyValues, KpiTile, Panel, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

export default function AdminModerationStats() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { range } = useAdmin();
  const q = useAdminData<any>('/moderation/stats', { from: range.from, to: range.to });
  const d = q.data;
  const perDay = d ? fill(range.from, range.to, d.reportsPerDay) : [];
  return (
    <AdminPage
      title={t('ac.nav.moderationStats')}
      subtitle={t('ac.moderation.subtitle')}
      actions={<Button label={t('ac.mod.queue')} icon="flag-outline" size="sm" onPress={() => router.push('/admin/moderation' as any)} testID="admin-open-queue" />}
      testID="screen-admin-moderation-stats"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Grid min={180}>
              <KpiTile label={t('ac.moderation.open')} value={f.num(d.queue.open)} note={d.queue.oldestOpenAt ? t('ac.moderation.oldest', { date: f.dateTime(d.queue.oldestOpenAt) }) : undefined} />
              <KpiTile label={t('ac.moderation.urgent')} value={f.num(d.queue.urgent)} />
              <KpiTile label={t('ac.moderation.resolved')} value={f.num(d.resolved.count)} note={t('ac.moderation.dismissed', { n: d.resolved.dismissed })} />
              <KpiTile label={t('ac.moderation.median')} value={f.minutes(d.resolved.medianMinutes)} note={t('ac.moderation.p90', { v: f.minutes(d.resolved.p90Minutes) })} />
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.moderation.perDay')}>
                <TrendChart kind="bars" data={perDay} format={f.compact} valueLabel={t('ac.moderation.reports')} />
              </Panel>
              <Panel title={t('ac.moderation.byReason')}>
                <RankedBars items={d.byReason.map((x: any) => ({ label: t(`community.report.reasons.${x.reason}`), value: x.n }))} format={f.num} />
              </Panel>
            </Grid>
            <Grid min={300}>
              <Panel title={t('ac.moderation.actions')}>
                <RankedBars items={d.actions.map((x: any) => ({ label: x.action, value: x.n }))} format={f.num} />
              </Panel>
              <Panel title={t('ac.moderation.appeals')}>
                <KeyValues items={[[t('ac.moderation.appealStates.open'), f.num(d.appeals.open || 0)], [t('ac.moderation.appealStates.upheld'), f.num(d.appeals.upheld || 0)], [t('ac.moderation.appealStates.overturned'), f.num(d.appeals.overturned || 0)]]} />
              </Panel>
              <Panel title={t('ac.moderation.workload')} subtitle={t('ac.moderation.workloadSub')}>
                <KeyValues items={d.workload.map((w: any, i: number) => [t('ac.moderation.moderatorN', { n: i + 1 }), f.num(w.actions)])} />
              </Panel>
            </Grid>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}

function fill(from: string, to: string, rows: { day: string; n: number }[]) {
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const out = [];
  for (let d = Date.parse(`${from}T00:00:00Z`); d <= Date.parse(`${to}T00:00:00Z`); d += 86400000) {
    const key = new Date(d).toISOString().slice(0, 10);
    out.push({ x: key, y: map.get(key) || 0 });
  }
  return out;
}
