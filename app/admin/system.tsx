import React, { useMemo } from 'react';

import { useAdminData } from '@/features/admin/api';
import { RankedBars } from '@/features/admin/charts';
import { AdminPage, AdminState, Grid, KeyValues, Panel, Pill, useFmt } from '@/features/admin/ui';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { translationCoverage, useT } from '@/i18n';

export default function AdminSystem() {
  const { t } = useT();
  const f = useFmt();
  const q = useAdminData<any>('/health');
  const d = q.data;
  const coverage = useMemo(() => translationCoverage(), []);
  const on = (v: boolean) => <Pill label={t(v ? 'ac.common.on' : 'ac.common.off')} tone={v ? 'good' : 'warning'} />;
  return (
    <AdminPage title={t('ac.nav.system')} subtitle={t('ac.system.subtitle')} testID="screen-admin-system">
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <Grid min={320}>
            <Panel title={t('ac.system.health')}>
              <KeyValues
                items={[
                  [t('ac.system.database'), <Pill key="db" label={d.database} tone={d.database === 'ok' ? 'good' : 'danger'} />],
                  [t('ac.system.driver'), d.driver],
                  [t('ac.system.schema'), d.schema || '—'],
                  [t('ac.system.uptime'), f.minutes(d.uptimeSeconds / 60)],
                  [t('ac.system.memory'), `${f.num(d.memoryMb)} MB`],
                  [t('ac.system.node'), d.node],
                  [t('ac.system.realtime'), f.num(d.realtimeConnections)],
                  [t('ac.system.scheduler'), d.scheduler ? f.dateTime(d.scheduler.lastRunAt) : '—'],
                ]}
              />
            </Panel>
            <Panel title={t('ac.system.services')}>
              <KeyValues
                items={[
                  [t('ac.system.email'), on(d.email)],
                  [t('ac.system.sms'), on(d.sms)],
                  [t('ac.system.ai'), on(d.ai)],
                  [t('ac.system.payments'), <Pill key="p" label={t('ac.test')} tone="warning" />],
                  [t('ac.system.devTools'), <Pill key="dt" label={t(d.devTools ? 'ac.common.on' : 'ac.common.off')} tone={d.devTools ? 'warning' : 'good'} />],
                ]}
              />
            </Panel>
          </Grid>
        ) : null}
      </AdminState>
      <Panel title={t('ac.system.translations')} subtitle={t('ac.system.translationsSub')}>
        <RankedBars
          items={SUPPORTED_LANGUAGES.map((l) => ({ label: LANGUAGE_NAMES[l], value: coverage[l]?.percent ?? 0, note: t('ac.system.strings', { have: f.num(coverage[l]?.have ?? 0), total: f.num(coverage[l]?.total ?? 0) }) }))}
          format={(v) => `${v}%`}
        />
      </Panel>
    </AdminPage>
  );
}
