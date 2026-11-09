/**
 * Financial control center: real revenue and AI spend next to the economics
 * model's worst case per product, safe discounts, promotions and alerts.
 * Numbers come from /api/admin/economics (finance.economics permission); a
 * cost that is not known shows "UNVERIFIED", never 0.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Chip, TextField, ToggleRow, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, adminPut, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, Grid, KeyValues, KpiTile, Note, Panel, Pill } from '@/features/admin/ui';
import { useT } from '@/i18n';

const gel = (x: any) => (typeof x === 'number' ? `${x.toFixed(2)} ₾` : String(x ?? '—'));
const usd = (x: any) => (typeof x === 'number' ? `$${x.toFixed(2)}` : String(x ?? '—'));

export default function AdminEconomics() {
  const { t } = useT();
  const { can, act } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/economics');
  const d = q.data;
  const [form, setForm] = useState({ name: '', code: '', kind: 'percent', value: '10', productIds: [] as string[], endsAt: '', firstPurchaseOnly: false, stackable: false });
  const [preview, setPreview] = useState<any[] | null>(null);
  const manage = can('promotions.manage');

  const create = async () => {
    try {
      const out: any = await act(() => adminPost('/promotions', { ...form, value: Number(form.value), code: form.code || null, endsAt: form.endsAt || null }));
      setPreview(out?.preview || null);
      toast(t('ac.econ.promoCreated'));
      q.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const setActive = async (id: string, active: boolean) => {
    try {
      await act(() => adminPut(`/promotions/${encodeURIComponent(id)}`, { active }));
      q.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };

  return (
    <AdminPage title={t('ac.nav.economics')} subtitle={t('ac.econ.subtitle')} testID="screen-admin-economics">
      <Banner tone="test" title={t('ac.finance.testTitle')} body={t('ac.econ.testBody')} />
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <View style={{ gap: 16 }}>
            {d.alerts.length ? (
              <Panel title={t('ac.econ.alerts')} testID="econ-alerts">
                <View style={{ gap: 8 }}>
                  {d.alerts.map((a: any, i: number) => (
                    <Note key={i} tone={a.level === 'info' ? 'info' : 'warning'} icon={a.level === 'danger' ? 'alert-circle-outline' : a.level === 'warning' ? 'warning-outline' : 'information-circle-outline'}>
                      {a.message}
                    </Note>
                  ))}
                </View>
              </Panel>
            ) : null}

            <Grid min={180}>
              <KpiTile label={t('ac.econ.revenueToday')} value={gel(d.revenue.todayGel)} />
              <KpiTile label={t('ac.econ.revenueMonth')} value={gel(d.revenue.monthGel)} />
              <KpiTile label={t('ac.econ.paying')} value={String(d.users.paying)} note={`${t('ac.econ.free')}: ${d.users.free}`} />
              <KpiTile label={t('ac.econ.perPaying')} value={gel(d.users.revenuePerPayingGel)} />
              <KpiTile label={t('ac.econ.aiMonth')} value={usd(d.ai.monthUsd)} note={`${t('ac.econ.today')}: ${usd(d.ai.todayUsd)}`} />
              <KpiTile label={t('ac.econ.netContribution')} value={gel(d.netContributionMonthGel)} note={t('ac.econ.netNote')} />
              <KpiTile label={t('ac.econ.projected')} value={gel(d.projectedMonth.profitTypicalGel)} note={`${t('ac.econ.worst')}: ${gel(d.projectedMonth.profitWorstGel)}`} />
              <KpiTile label={t('ac.econ.breakEven')} value={String(d.breakEvenPlus30Subscribers ?? '—')} note={t('ac.econ.breakEvenNote')} />
            </Grid>

            <Panel title={t('ac.econ.products')} subtitle={t('ac.econ.productsNote', { scenario: d.taxScenario.label })} testID="econ-products">
              <DataTable
                rows={d.products}
                keyFor={(r: any) => r.productId}
                columns={[
                  { key: 'productId', label: t('ac.econ.product'), flex: 1.4 },
                  { key: 'priceGel', label: t('ac.econ.price'), align: 'right', render: (r: any) => gel(r.priceGel) },
                  { key: 'worst', label: t('ac.econ.worstMargin'), align: 'right', render: (r: any) => gel(r.worstContributionGel) },
                  { key: 'requiredGel', label: t('ac.econ.required'), align: 'right', render: (r: any) => gel(r.requiredGel) },
                  { key: 'floorGel', label: t('ac.econ.floor'), align: 'right', render: (r: any) => gel(r.floorGel) },
                  { key: 'max', label: t('ac.econ.maxDiscount'), align: 'right', render: (r: any) => `${r.maxSafeDiscountPercent}%` },
                  { key: 'ok', label: '', width: 90, render: (r: any) => <Pill label={r.passes ? (r.headroomGel < 5 ? t('ac.econ.near') : 'OK') : t('ac.econ.loss')} tone={r.passes ? (r.headroomGel < 5 ? 'warning' : 'good') : 'danger'} /> },
                ]}
              />
            </Panel>

            <Grid min={320}>
              <Panel title={t('ac.econ.costs')}>
                <KeyValues
                  items={[
                    [t('ac.econ.fees'), gel(d.costs.paymentFeesGel)],
                    ['VAT', gel(d.costs.vatGel)],
                    [t('ac.econ.turnoverTax'), gel(d.costs.turnoverTaxGel)],
                    [t('ac.econ.hosting'), `${gel(d.costs.hostingSoFarGel)} (${t('ac.econ.month')}: ${gel(d.costs.hostingMonthGel)})`],
                    [t('ac.econ.support'), gel(d.costs.supportSoFarGel)],
                    ['CAC', gel(d.costs.cacGel)],
                    [t('ac.econ.monitoring'), gel(d.costs.monitoringGel)],
                    [t('ac.econ.push'), gel(d.costs.pushGel)],
                  ]}
                />
                <AppText variant="caption" style={{ marginTop: 8, opacity: 0.7 }}>
                  {d.costs.paymentFeesNote}
                </AppText>
              </Panel>
              <Panel title={t('ac.econ.aiByFeature')} subtitle={`${t('ac.econ.reservedNow')}: ${d.ai.reservedNow.requests} (${usd(d.ai.reservedNow.usd)})`}>
                <KeyValues items={Object.entries(d.ai.byFeatureUsd).map(([k, v]) => [k, usd(v)] as [string, string])} />
                <View style={{ height: 10 }} />
                <KeyValues items={d.ai.byModelUsd.map((m: any) => [m.model, `${usd(m.usd)} · ${m.calls}`] as [string, string])} />
              </Panel>
              <Panel title={t('ac.econ.taxes')}>
                <KeyValues items={Object.values(d.taxScenarios).map((s: any) => [s.label, `${gel(s.vatGel + s.turnoverTaxGel)} · ${s.approval}`] as [string, string])} />
              </Panel>
            </Grid>

            <Panel title={t('ac.econ.cohorts')} subtitle={t('ac.econ.cohortsNote')}>
              <DataTable
                rows={d.cohorts}
                keyFor={(r: any) => r.productId}
                empty={t('ac.econ.noCohorts')}
                columns={[
                  { key: 'productId', label: t('ac.econ.product'), flex: 1.4 },
                  { key: 'accounts', label: t('ac.econ.accounts'), align: 'right' },
                  { key: 'aiUsd', label: t('ac.econ.ai'), align: 'right', render: (r: any) => usd(r.aiUsd) },
                  { key: 'avg', label: t('ac.econ.avgMargin'), align: 'right', render: (r: any) => gel(r.avgMarginGel) },
                  { key: 'worst', label: t('ac.econ.lowestMargin'), align: 'right', render: (r: any) => gel(r.worstMarginGel) },
                ]}
              />
            </Panel>

            <Panel title={t('ac.econ.promotions')} subtitle={t('ac.econ.promotionsNote')} testID="econ-promotions">
              <DataTable
                rows={d.promotions}
                keyFor={(r: any) => r.id}
                empty={t('ac.econ.noPromotions')}
                columns={[
                  { key: 'name', label: t('ac.econ.name'), flex: 1.2 },
                  { key: 'code', label: t('ac.econ.code'), render: (r: any) => r.code || t('ac.econ.automatic') },
                  { key: 'value', label: t('ac.econ.offer'), render: (r: any) => (r.kind === 'percent' ? `−${r.value}%` : r.kind === 'fixed_price' ? `${r.value} ₾` : `−${r.value} ₾`) },
                  { key: 'prices', label: t('ac.econ.charged'), flex: 1.6, render: (r: any) => r.prices.map((p: any) => `${p.productId}: ${p.finalGel}${p.clamped ? '*' : ''}`).join(' · ') },
                  { key: 'endsAt', label: t('ac.econ.ends'), render: (r: any) => (r.endsAt ? new Date(r.endsAt).toLocaleDateString() : '—') },
                  { key: 'active', label: '', width: 120, render: (r: any) => (manage ? <Button size="sm" variant="quiet" label={r.active ? t('ac.econ.pause') : t('ac.econ.resume')} onPress={() => setActive(r.id, !r.active)} /> : <Pill label={r.active ? 'on' : 'off'} />) },
                ]}
              />
              <AppText variant="caption" style={{ marginTop: 8, opacity: 0.7 }}>
                {t('ac.econ.clampedNote')}
              </AppText>
              {manage ? (
                <View style={{ gap: 10, marginTop: 14 }} testID="econ-new-promo">
                  <AppText variant="bodyStrong">{t('ac.econ.newPromo')}</AppText>
                  <TextField value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={t('ac.econ.name')} />
                  <TextField value={form.code} onChangeText={(code) => setForm({ ...form, code })} placeholder={t('ac.econ.codeOptional')} autoCapitalize="characters" />
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {(['percent', 'fixed_price', 'amount_off'] as const).map((k) => (
                      <Chip key={k} label={t(`ac.econ.kind_${k}`)} selected={form.kind === k} onPress={() => setForm({ ...form, kind: k })} />
                    ))}
                  </View>
                  <TextField value={form.value} onChangeText={(value) => setForm({ ...form, value })} placeholder={t('ac.econ.value')} keyboardType="decimal-pad" />
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {d.products.map((p: any) => (
                      <Chip key={p.productId} label={p.productId} selected={form.productIds.includes(p.productId)} onPress={() => setForm({ ...form, productIds: form.productIds.includes(p.productId) ? form.productIds.filter((x) => x !== p.productId) : [...form.productIds, p.productId] })} />
                    ))}
                  </View>
                  <TextField value={form.endsAt} onChangeText={(endsAt) => setForm({ ...form, endsAt })} placeholder={t('ac.econ.endsAt')} />
                  <ToggleRow label={t('ac.econ.firstPurchase')} value={form.firstPurchaseOnly} onValueChange={(v) => setForm({ ...form, firstPurchaseOnly: v })} />
                  <ToggleRow label={t('ac.econ.stackable')} value={form.stackable} onValueChange={(v) => setForm({ ...form, stackable: v })} />
                  <Button label={t('ac.econ.create')} onPress={create} disabled={!form.name.trim() || !(Number(form.value) > 0)} testID="econ-create-promo" />
                  {preview ? (
                    <Note tone="info">{preview.map((p: any) => `${p.productId}: ${(p.finalMinor ?? 0) / 100} ₾${p.safe ? '' : ` (${t('ac.econ.raisedToFloor')} ${p.floorMinor / 100} ₾)`}`).join(' · ')}</Note>
                  ) : null}
                </View>
              ) : null}
            </Panel>

            <Note tone="info">{t('ac.econ.sourcesNote', { fx: d.fxUsdGel })}</Note>
          </View>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
