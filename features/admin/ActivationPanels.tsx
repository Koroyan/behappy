/**
 * Analytics › activation, retention, journey, programs, choices, community
 * and business. Everything is aggregated on the server with small groups
 * hidden (null → "hidden"); choices are anonymous totals never linked to an
 * account. Business numbers come from Flitt-verified orders (TEST mode).
 */
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { useAdminData } from '@/features/admin/api';
import { RankedBars } from '@/features/admin/charts';
import { useAdminColors } from '@/features/admin/theme';
import { AdminState, DataTable, Grid, KpiTile, Note, Panel, useFmt } from '@/features/admin/ui';
import { LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { useT } from '@/i18n';

const pctText = (v: number | null | undefined, f: ReturnType<typeof useFmt>) => (v === null || v === undefined ? '—' : f.pct(v));

export function ActivationPanels() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { range, can } = useAdmin();
  const q = { from: range.from, to: range.to };
  const act = useAdminData<any>('/analytics/activation', q);
  const ret = useAdminData<any>('/analytics/retention-days', q);
  const fun = useAdminData<any>('/analytics/funnel', q);
  const prog = useAdminData<any>('/analytics/programs', q);
  const ch = useAdminData<any>('/analytics/choices', q);
  const com = useAdminData<any>(can('community.view') ? '/analytics/community' : null, q);
  const biz = useAdminData<any>(can('finance.view') ? '/analytics/business' : null, q);
  const hidden = t('ac.analytics.hiddenSmall');
  const num = (v: number | null | undefined) => (v === null || v === undefined ? '—' : f.num(v));

  return (
    <View style={{ gap: 14 }} testID="admin-activation">
      <Grid min={420}>
        <Panel title={t('ac.analytics.activationTitle')} subtitle={t('ac.analytics.activationSub')}>
          <AdminState error={act.error} loading={act.loading} hasData={Boolean(act.data)} onRetry={act.reload}>
            {act.data ? (
              <View style={{ gap: 12 }}>
                <Grid min={140}>
                  <KpiTile label={t('ac.analytics.newPeople')} value={num(act.data.newPeople)} />
                  <KpiTile label={t('ac.analytics.activatedDay')} value={pctText(act.data.rateFirstDay, f)} note={act.data.suppressed ? hidden : num(act.data.activatedFirstDay)} />
                  <KpiTile label={t('ac.analytics.activatedWeek')} value={pctText(act.data.rateFirstWeek, f)} note={act.data.suppressed ? hidden : num(act.data.activatedFirstWeek)} />
                </Grid>
                {act.data.firstActions.length ? (
                  <View style={{ gap: 6 }}>
                    <AppText variant="smallStrong" style={{ color: c.text }}>
                      {t('ac.analytics.firstActions')}
                    </AppText>
                    <RankedBars items={act.data.firstActions.map((a: any) => ({ label: `${t(`ac.features.${a.feature}`)} · ${a.kind.replace(/_/g, ' ')}`, value: a.people }))} format={f.num} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </AdminState>
        </Panel>
        <Panel title={t('ac.analytics.retentionDaysTitle')} subtitle={t('ac.analytics.retentionDaysSub')}>
          <AdminState error={ret.error} loading={ret.loading} hasData={Boolean(ret.data)} onRetry={ret.reload}>
            {ret.data ? (
              <Grid min={120}>
                {ret.data.days.map((d: any) => (
                  <KpiTile key={d.day} label={t('ac.analytics.retentionDay', { n: d.day })} value={pctText(d.rate, f)} note={d.suppressed ? hidden : `${t('ac.analytics.orLater', { v: pctText(d.rateOnOrAfter, f) })} · ${t('ac.analytics.eligible', { n: num(d.eligible) })}`} />
                ))}
              </Grid>
            ) : null}
          </AdminState>
        </Panel>
      </Grid>

      <Panel title={t('ac.analytics.funnelTitle')} subtitle={t('ac.analytics.funnelSub')}>
        <AdminState error={fun.error} loading={fun.loading} hasData={Boolean(fun.data)} onRetry={fun.reload}>
          {fun.data ? (
            <RankedBars
              items={fun.data.steps.map((s: any) => ({ label: t(`ac.analytics.funnel.${s.step}`), value: s.people, note: s.people === null ? hidden : s.rateOfStart !== null ? t('ac.analytics.ofStart', { v: f.pct(s.rateOfStart) }) : undefined }))}
              format={f.num}
              testID="admin-funnel"
            />
          ) : null}
        </AdminState>
      </Panel>

      <Panel title={t('ac.analytics.programsTitle')} subtitle={t('ac.analytics.programsSub')}>
        <AdminState error={prog.error} loading={prog.loading} hasData={Boolean(prog.data)} onRetry={prog.reload}>
          {prog.data ? (
            <View style={{ gap: 12 }}>
              <Note icon="trail-sign-outline">
                {t('ac.analytics.programPeople', { enrolled: num(prog.data.people.enrolled), finished: num(prog.data.people.finished), rate: pctText(prog.data.people.completionRate, f) })}
              </Note>
              <DataTable
                columns={[
                  { key: 'program', label: t('ac.analytics.programCols.program'), flex: 2, render: (r: any) => t(`jr.programs.defs.${r.program}.title`) },
                  { key: 'started', label: t('ac.analytics.programCols.started'), width: 90, align: 'right', render: (r: any) => num(r.started) },
                  { key: 'days', label: t('ac.analytics.programCols.days'), width: 100, align: 'right', render: (r: any) => num(r.daysCompleted) },
                  { key: 'per', label: t('ac.analytics.programCols.perStart'), width: 110, align: 'right', wideOnly: true, render: (r: any) => (r.avgDaysPerStart === null ? '—' : String(r.avgDaysPerStart)) },
                  { key: 'done', label: t('ac.analytics.programCols.completed'), width: 90, align: 'right', render: (r: any) => num(r.completed) },
                  { key: 'rate', label: t('ac.analytics.programCols.rate'), width: 100, align: 'right', render: (r: any) => (r.suppressed ? hidden : pctText(r.completionRate, f)) },
                ]}
                rows={prog.data.programs}
                keyFor={(r: any) => r.program}
              />
              <View style={{ gap: 6 }}>
                <AppText variant="smallStrong" style={{ color: c.text }}>
                  {t('ac.analytics.programProgress')}
                </AppText>
                <RankedBars items={prog.data.progress.map((p: any) => ({ label: t('ac.analytics.dayN', { n: p.day }), value: p.completions }))} format={f.num} />
              </View>
            </View>
          ) : null}
        </AdminState>
      </Panel>

      <Panel title={t('ac.analytics.choicesTitle')} subtitle={t('ac.analytics.choicesSub')}>
        <AdminState error={ch.error} loading={ch.loading} hasData={Boolean(ch.data)} onRetry={ch.reload}>
          {ch.data ? (
            <View style={{ gap: 14 }}>
              <Note icon="shield-checkmark-outline">
                {t('ac.analytics.onboardingFunnel', { started: num(ch.data.onboarding.started), chose: num(ch.data.onboarding.choseOption), first: num(ch.data.onboarding.firstActivity), left: num(ch.data.onboarding.leftWithoutChoosing) })}
              </Note>
              <Grid min={300}>
                <RankedBars items={ch.data.onboarding.options.map((o: any) => ({ label: t(`ac.analytics.options.${o.value}`), value: o.n }))} format={f.num} />
                <View style={{ gap: 6 }}>
                  <AppText variant="smallStrong" style={{ color: c.text }}>
                    {t('ac.analytics.soundTracks')}
                  </AppText>
                  <RankedBars items={ch.data.sound.tracks.map((o: any) => ({ label: o.value, value: o.n }))} format={f.num} />
                </View>
                <View style={{ gap: 6 }}>
                  <AppText variant="smallStrong" style={{ color: c.text }}>
                    {t('ac.analytics.calmExercises')}
                  </AppText>
                  <RankedBars items={ch.data.calmExercises.map((o: any) => ({ label: o.value, value: o.n }))} format={f.num} />
                </View>
                <View style={{ gap: 6 }}>
                  <AppText variant="smallStrong" style={{ color: c.text }}>
                    {t('ac.analytics.badgesEarned')}
                  </AppText>
                  <RankedBars items={ch.data.badges.map((o: any) => ({ label: t(`wb.badges.names.${o.value}`), value: o.n }))} format={f.num} />
                </View>
              </Grid>
            </View>
          ) : null}
        </AdminState>
      </Panel>

      {com.data || com.loading || com.error ? (
        <Panel title={t('ac.analytics.communityTitle')} subtitle={t('ac.analytics.communitySub', { n: com.data?.minCohort ?? 5 })}>
          <AdminState error={com.error} loading={com.loading} hasData={Boolean(com.data)} onRetry={com.reload}>
            {com.data ? (
              <View style={{ gap: 12 }}>
                <Grid min={160}>
                  <KpiTile label={t('ac.analytics.activeRooms')} value={f.num(com.data.activeRooms)} note={t('ac.analytics.activeRoomsOf', { n: f.num(com.data.activeRooms), total: f.num(com.data.totalRooms) })} />
                  <KpiTile label={t('ac.analytics.writers')} value={num(com.data.writers)} />
                  <KpiTile label={t('ac.analytics.joins')} value={f.num(com.data.joins)} />
                </Grid>
                <DataTable
                  columns={[
                    { key: 'lang', label: t('ac.analytics.languageCols.language'), flex: 1.4, render: (r: any) => (LANGUAGE_NAMES as Record<string, string>)[r.language] || r.language || '—' },
                    { key: 'rooms', label: t('ac.analytics.languageCols.rooms'), width: 100, align: 'right', render: (r: any) => f.num(r.activeRooms) },
                    { key: 'messages', label: t('ac.analytics.languageCols.messages'), width: 100, align: 'right', render: (r: any) => num(r.messages) },
                    { key: 'writers', label: t('ac.analytics.languageCols.writers'), width: 90, align: 'right', render: (r: any) => num(r.writers) },
                    { key: 'reports', label: t('ac.analytics.languageCols.reports'), width: 90, align: 'right', wideOnly: true, render: (r: any) => f.num(r.reports) },
                    { key: 'open', label: t('ac.analytics.languageCols.open'), width: 70, align: 'right', wideOnly: true, render: (r: any) => f.num(r.openReports) },
                    { key: 'hours', label: t('ac.analytics.languageCols.hours'), width: 110, align: 'right', wideOnly: true, render: (r: any) => (r.avgHoursToResolve === null ? '—' : String(r.avgHoursToResolve)) },
                  ]}
                  rows={com.data.languages}
                  keyFor={(r: any) => String(r.language)}
                />
              </View>
            ) : null}
          </AdminState>
        </Panel>
      ) : null}

      {biz.data || biz.loading || biz.error ? (
        <Panel title={t('ac.analytics.businessTitle')} subtitle={t('ac.analytics.businessSub')}>
          <AdminState error={biz.error} loading={biz.loading} hasData={Boolean(biz.data)} onRetry={biz.reload}>
            {biz.data ? (
              <Grid min={170}>
                {biz.data.revenue.length ? (
                  biz.data.revenue.map((r: any) => <KpiTile key={r.currency} label={`${t('ac.analytics.revenue')} · ${r.currency}`} value={f.num(Math.round(r.minor / 100))} note={`${f.num(r.orders)} · ${f.num(r.payers)}`} />)
                ) : (
                  <KpiTile label={t('ac.analytics.revenue')} value="0" />
                )}
                <KpiTile label={t('ac.analytics.firstTimePayers')} value={f.num(biz.data.firstTimePayers)} />
                <KpiTile label={t('ac.analytics.paidConversion')} value={pctText(biz.data.paidConversionRate, f)} note={`${f.num(biz.data.newAccountsWhoPaid)} / ${f.num(biz.data.newAccounts)}`} />
                <KpiTile label={t('ac.analytics.refunds')} value={f.num(biz.data.refunds)} />
                <KpiTile label={t('ac.analytics.failedPayments')} value={f.num(biz.data.failedOrExpiredPayments)} />
                <KpiTile label={t('ac.analytics.churn')} value={biz.data.plusChurn.churnRate === null ? t('ac.analytics.notMeasurable') : f.pct(biz.data.plusChurn.churnRate)} note={t('ac.analytics.churnNote', { churned: f.num(biz.data.plusChurn.churned), ended: f.num(biz.data.plusChurn.periodsEnded) })} />
                <KpiTile label={t('ac.analytics.proTrials')} value={biz.data.professionalTrials.conversionRate === null ? t('ac.analytics.notMeasurable') : f.pct(biz.data.professionalTrials.conversionRate)} note={t('ac.analytics.proTrialsNote', { converted: f.num(biz.data.professionalTrials.convertedToPaid), ended: f.num(biz.data.professionalTrials.ended) })} />
              </Grid>
            ) : null}
          </AdminState>
        </Panel>
      ) : null}
    </View>
  );
}
