import React, { useState } from 'react';

import { Banner, Button, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { StackedColumns } from '@/features/admin/charts';
import { TransactionDrawer, useOrderStatus } from '@/features/admin/transactions';
import { AdminPage, AdminState, DataTable, Grid, KeyValues, KpiTile, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

const TONE: Record<string, any> = { approved: 'good', reversed: 'neutral', partially_reversed: 'neutral', declined: 'danger', created: 'warning', processing: 'warning', expired: 'neutral', error: 'danger' };

export default function AdminFinance() {
  const { t } = useT();
  const f = useFmt();
  const { range, can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/finance', { from: range.from, to: range.to });
  const payments = useAdminData<any>(can('memberships.view') ? '/payments' : null);
  const d = q.data;
  const status = useOrderStatus();
  const [order, setOrder] = useState<string | null>(null);
  const rowOpens = can('users.transactions.view');
  const refund = async (o: any) => {
    const reason = await ask({ title: t('ac.finance.refundTitle'), body: t('ac.finance.refundBody', { amount: f.money(o.amountMinor, o.currency) }), min: 5, destructive: true });
    if (!reason) return;
    try {
      await act(() => adminPost(`/orders/${encodeURIComponent(o.id)}/refund`, { reason }));
      toast(t('ac.finance.refunded'));
      payments.reload();
      q.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  return (
    <AdminPage title={t('ac.nav.finance')} subtitle={t('ac.finance.subtitle')} testID="screen-admin-finance">
      <Banner tone="test" title={t('ac.finance.testTitle')} body={t('ac.finance.testBody')} />
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Grid min={180}>
              <KpiTile label={t('ac.finance.net')} value={f.money(d.current.netMinor, d.currency)} change={d.changes.netMinor} note={t('ac.finance.testShort')} />
              <KpiTile label={t('ac.finance.gross')} value={f.money(d.current.grossMinor, d.currency)} />
              <KpiTile label={t('ac.finance.refunds')} value={f.money(d.current.refundedMinor, d.currency)} note={t('ac.finance.refundCount', { n: d.current.refunds })} goodWhenUp={false} />
              <KpiTile label={t('ac.finance.payments')} value={f.num(d.current.paid)} change={d.changes.paid} />
              <KpiTile label={t('ac.finance.conversion')} value={f.pct(d.current.conversion)} note={t('ac.finance.conversionNote', { n: d.current.checkouts })} />
            </Grid>
            <Panel title={t('ac.finance.perDay')} actions={<Pill label={t('ac.test')} tone="warning" icon="flask-outline" />}>
              <StackedColumns data={d.daily.map((x: any) => ({ x: x.day, values: [x.professional, x.plus, x.art] }))} series={[t('ac.finance.products.professional'), t('ac.finance.products.plus'), t('ac.finance.products.art')]} format={(v) => f.money(v, d.currency)} />
            </Panel>
            <Grid min={320}>
              <Panel title={t('ac.finance.memberships')} subtitle={t('ac.finance.membershipsSub', { price: f.money(d.memberships.priceMinor, d.currency), days: d.memberships.durationDays })}>
                <KeyValues
                  items={[
                    ...Object.entries(d.memberships.states).map(([k, v]) => [t(`pro.membershipState.${k}`), f.num(v as number)] as [string, string]),
                    [t('ac.finance.renewals'), f.num(d.memberships.renewals)],
                    [t('ac.finance.churned'), f.num(d.memberships.churned)],
                  ]}
                />
              </Panel>
              <Panel title={t('ac.finance.complimentary')} subtitle={t('ac.finance.complimentarySub')}>
                <KeyValues
                  items={[
                    [t('ac.finance.plusGrants'), t('ac.finance.plusGrantsLine', { n: d.complimentary.plusGrants, days: d.complimentary.plusDays })],
                    [t('ac.finance.membershipGrants'), f.num(d.complimentary.membershipGrants)],
                  ]}
                />
              </Panel>
              <Panel title={t('ac.finance.commission')}>
                <KeyValues items={[[t('ac.finance.sessions'), t('ac.finance.zeroCommission')]]} />
              </Panel>
            </Grid>
          </>
        ) : null}
      </AdminState>
      {payments.data ? (
        <Panel title={t('ac.finance.paymentsTitle')}>
          <DataTable
            rows={payments.data.payments}
            keyFor={(r: any) => r.id}
            onRowPress={rowOpens ? (r: any) => setOrder(r.id) : undefined}
            rowTestID="admin-finance-payment"
            columns={[
              { key: 'date', label: t('ac.finance.cols.date'), render: (r: any) => f.dateTime(r.createdAt) },
              { key: 'product', label: t('ac.finance.cols.product'), render: (r: any) => (r.professionalName ? `${t('ac.finance.products.professional')} · ${r.professionalName}` : r.productId) },
              { key: 'amount', label: t('ac.finance.cols.amount'), align: 'right', render: (r: any) => f.money(r.amountMinor, r.currency) },
              { key: 'status', label: t('ac.finance.cols.status'), render: (r: any) => <Pill label={status(r.status)} tone={TONE[r.status] || 'neutral'} /> },
              // When rows open the payment drawer, Refund lives in the drawer (a button can't sit inside a clickable row).
              ...(rowOpens ? [] : [{ key: 'refund', label: '', render: (r: any) => (r.status === 'approved' && can('payments.refund') ? <Button label={t('ac.finance.refund')} size="sm" variant="ghost" onPress={() => refund(r)} /> : null) }]),
            ]}
          />
        </Panel>
      ) : null}
      <TransactionDrawer orderId={order} onClose={() => setOrder(null)} onRefund={refund} />
    </AdminPage>
  );
}
