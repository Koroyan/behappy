import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, TextField, Toggle, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPut, errorCode, useAdminData } from '@/features/admin/api';
import { TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, DataTable, Grid, KpiTile, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

const SWITCHES = ['anulia', 'journal', 'cards', 'art', 'community'] as const;

export default function AdminAi() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { range, can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/ai', { from: range.from, to: range.to });
  const prompts = useAdminData<any>('/ai/prompts');
  const [budget, setBudget] = useState<string | null>(null);
  const [prices, setPrices] = useState<{ i: string; o: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState<string | null>(null);
  const d = q.data;
  const manage = can('ai.manage');

  const save = async (key: string, value: unknown) => {
    const reason = await ask({ title: t('ac.ai.changeTitle'), body: t('ac.ai.changeBody') });
    if (!reason) return false;
    try {
      await act(() => adminPut(`/ai/settings/${key}`, { value, reason }));
      toast(t('ac.common.saved'));
      q.reload();
      return true;
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
      return false;
    }
  };

  const totals = d ? d.byFeature.reduce((s: any, x: any) => ({ calls: s.calls + x.calls, errors: s.errors + x.errors, cost: x.costUsd === null ? s.cost : (s.cost || 0) + x.costUsd }), { calls: 0, errors: 0, cost: null as number | null }) : null;
  return (
    <AdminPage title={t('ac.nav.ai')} subtitle={t('ac.ai.subtitle')} testID="screen-admin-ai">
      <Note icon="shield-checkmark-outline">{t('ac.ai.privacy')}</Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d && totals ? (
          <>
            <Grid min={180}>
              <KpiTile label={t('ac.ai.calls')} value={f.num(totals.calls)} />
              <KpiTile label={t('ac.ai.errorRate')} value={f.pct(totals.calls ? Math.round((totals.errors / totals.calls) * 1000) / 10 : 0)} />
              <KpiTile label={t('ac.ai.cost')} value={d.pricing ? f.usd(totals.cost) : t('ac.ai.noPricing')} note={t('ac.ai.estimate')} />
              <KpiTile label={t('ac.ai.today')} value={d.pricing ? f.usd(d.today.costUsd) : f.num(d.today.calls)} note={d.today.budgetUsd ? t('ac.ai.budgetOf', { v: f.usd(d.today.budgetUsd) }) : t('ac.ai.noBudget')} />
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.ai.callsPerDay')}>
                <TrendChart kind="bars" data={d.daily.map((x: any) => ({ x: x.day, y: x.calls }))} format={f.compact} valueLabel={t('ac.ai.calls')} />
              </Panel>
              {d.pricing ? (
                <Panel title={t('ac.ai.costPerDay')}>
                  <TrendChart data={d.daily.map((x: any) => ({ x: x.day, y: x.costUsd }))} format={(v) => f.usd(v)} valueLabel={t('ac.ai.cost')} />
                </Panel>
              ) : null}
            </Grid>
            <Panel title={t('ac.ai.byFeature')}>
              <DataTable
                rows={d.byFeature}
                keyFor={(r: any) => r.feature}
                columns={[
                  { key: 'feature', label: t('ac.ai.cols.feature'), render: (r: any) => r.feature },
                  { key: 'calls', label: t('ac.ai.calls'), align: 'right', render: (r: any) => f.num(r.calls) },
                  { key: 'errors', label: t('ac.ai.cols.errors'), align: 'right', render: (r: any) => f.pct(r.errorRate) },
                  { key: 'latency', label: t('ac.ai.cols.latency'), align: 'right', wideOnly: true, render: (r: any) => (r.avgLatencyMs ? `${f.num(r.avgLatencyMs)} / ${f.num(r.p95LatencyMs)} ms` : '—') },
                  { key: 'cost', label: t('ac.ai.cost'), align: 'right', render: (r: any) => (r.costUsd === null ? '—' : f.usd(r.costUsd)) },
                ]}
              />
            </Panel>
            <Grid min={340}>
              <Panel title={t('ac.ai.switches')} subtitle={t('ac.ai.switchesSub')}>
                {SWITCHES.map((k) => (
                  <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="small" style={{ color: c.text }}>
                      {t(`ac.ai.features.${k}`)}
                    </AppText>
                    {manage ? (
                      <Toggle value={d.switches?.[k] !== false} onValueChange={(v) => save('ai.features', { ...d.switches, [k]: v })} label={t(`ac.ai.features.${k}`)} testID={`admin-ai-switch-${k}`} />
                    ) : (
                      <Pill label={t(d.switches?.[k] !== false ? 'ac.common.on' : 'ac.common.off')} tone={d.switches?.[k] !== false ? 'good' : 'warning'} />
                    )}
                  </View>
                ))}
              </Panel>
              <Panel title={t('ac.ai.budget')} subtitle={t('ac.ai.budgetSub')}>
                {manage ? (
                  <>
                    <TextField label={t('ac.ai.budgetLabel')} value={budget ?? (d.today.budgetUsd ? String(d.today.budgetUsd) : '')} onChangeText={setBudget} keyboardType="decimal-pad" placeholder={t('ac.ai.none')} />
                    <Button label={t('ac.common.save')} size="sm" variant="secondary" onPress={async () => (await save('ai.dailyBudgetUsd', budget === '' || budget === null ? null : Number(budget))) && setBudget(null)} style={{ alignSelf: 'flex-start' }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextField label={t('ac.ai.inPrice')} containerStyle={{ flex: 1 }} value={prices?.i ?? (d.pricing ? String(d.pricing.inputPerMillion) : '')} onChangeText={(v) => setPrices({ i: v, o: prices?.o ?? (d.pricing ? String(d.pricing.outputPerMillion) : '') })} keyboardType="decimal-pad" />
                      <TextField label={t('ac.ai.outPrice')} containerStyle={{ flex: 1 }} value={prices?.o ?? (d.pricing ? String(d.pricing.outputPerMillion) : '')} onChangeText={(v) => setPrices({ i: prices?.i ?? (d.pricing ? String(d.pricing.inputPerMillion) : ''), o: v })} keyboardType="decimal-pad" />
                    </View>
                    <Button label={t('ac.ai.savePrices')} size="sm" variant="secondary" disabled={!prices} onPress={async () => prices && (await save('ai.pricing', { inputPerMillion: prices.i === '' ? null : Number(prices.i), outputPerMillion: prices.o === '' ? null : Number(prices.o) })) && setPrices(null)} style={{ alignSelf: 'flex-start' }} />
                  </>
                ) : (
                  <AppText variant="small" style={{ color: c.textSecondary }}>
                    {d.today.budgetUsd ? f.usd(d.today.budgetUsd) : t('ac.ai.noBudget')}
                  </AppText>
                )}
              </Panel>
            </Grid>
            <Panel title={t('ac.ai.prompts')} subtitle={prompts.data?.changeProcess}>
              {(prompts.data?.prompts || []).map((p: any) => (
                <View key={p.key} style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <AppText variant="smallStrong" style={{ color: c.text }}>
                      {p.key}
                    </AppText>
                    <Pill label={`v ${prompts.data.setVersion} · ${p.currentHash}`} tone="brand" />
                    <AppText variant="caption" style={{ color: c.textMuted }}>
                      {t('ac.ai.chars', { n: f.num(p.characters) })}
                    </AppText>
                    {p.text ? <Button label={t(showPrompt === p.key ? 'ac.ai.hide' : 'ac.ai.read')} size="sm" variant="ghost" onPress={() => setShowPrompt(showPrompt === p.key ? null : p.key)} /> : null}
                  </View>
                  {p.history.map((h: any) => (
                    <AppText key={h.hash} variant="caption" style={{ color: c.textSecondary }}>
                      {h.hash} · {t('ac.ai.seen', { from: f.date(h.firstSeenAt), to: f.date(h.lastSeenAt) })}
                      {h.current ? ` · ${t('ac.ai.current')}` : ''}
                    </AppText>
                  ))}
                  {showPrompt === p.key && p.text ? (
                    <AppText variant="caption" style={{ color: c.text, backgroundColor: c.cardMuted, padding: 10, borderRadius: 8 }} selectable>
                      {p.text}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </Panel>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
