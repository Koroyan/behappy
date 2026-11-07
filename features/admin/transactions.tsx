/**
 * Payment detail drawer, shared by the account page and Finance. Payments
 * are Flitt TEST (sandbox) transactions: the drawer says so, shows only the
 * masked card number Flitt returns, the status history, and what the payment
 * actually gave (an entitlement period comes from the verified payment, never
 * from a label someone changed).
 */
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { View } from 'react-native';

import { AppText, Button, Sheet } from '@/design';
import { useT } from '@/i18n';

import { useAdmin } from './AdminProvider';
import { useAdminData } from './api';
import { useAdminColors } from './theme';
import { AdminState, KeyValues, Note, Pill, Tone, useFmt } from './ui';

export const ORDER_TONE: Record<string, Tone> = { approved: 'good', created: 'neutral', processing: 'info', declined: 'danger', expired: 'neutral', reversed: 'warning' };

export function useOrderStatus() {
  const { t } = useT();
  return useCallback((s: string | null | undefined) => {
    if (!s) return '—';
    const key = `ac.u360.orderStatus.${s}`;
    const v = t(key);
    return v === key ? s : v;
  }, [t]);
}

export function useProductLabel() {
  const { t } = useT();
  return useCallback((kind: string | null | undefined) => {
    if (!kind) return '—';
    const key = `ac.finance.products.${kind}`;
    const v = t(key);
    return v === key ? kind : v;
  }, [t]);
}

/** `accountId` scopes the lookup to one account (the order must belong to it). */
/** `onRefund`: offered for paid orders; the drawer closes first so the reason prompt is on top. */
export function TransactionDrawer({ orderId, accountId, onClose, onRefund }: { orderId: string | null; accountId?: string; onClose: () => void; onRefund?: (order: { id: string; amountMinor: number; currency: string }) => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can } = useAdmin();
  const status = useOrderStatus();
  const product = useProductLabel();
  const enc = encodeURIComponent;
  const path = orderId ? (accountId ? `/users/${enc(accountId)}/transactions/${enc(orderId)}` : `/transactions/${enc(orderId)}`) : null;
  const q = useAdminData<any>(path);
  const d = q.data;
  const o = d?.order;
  const ent = d?.entitlement;
  const gave = !ent
    ? t('ac.u360.gaveNothing')
    : ent.kind === 'membership'
      ? t('ac.u360.gaveMembership', { from: f.date(ent.startsAt), to: f.date(ent.endsAt) })
      : ent.kind === 'art_program'
        ? t('ac.u360.gaveArt', { date: f.date(ent.startsAt) })
        : t('ac.u360.gavePlus', { from: f.date(ent.startsAt), to: f.date(ent.endsAt) });
  return (
    <Sheet visible={Boolean(orderId)} onClose={onClose} title={t('ac.u360.drawerTitle')} subtitle={orderId || undefined} maxWidth={580} testID="admin-tx-drawer">
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {o ? (
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={t('ac.u360.testLabel')} tone="warning" icon="flask-outline" />
              <Pill label={status(o.status)} tone={ORDER_TONE[o.status] || 'neutral'} />
            </View>
            <Note tone="warning">{t('ac.u360.txSub')}</Note>
            <KeyValues
              items={[
                [t('ac.u360.cols.product'), `${product(o.kind)}${o.product ? ` · ${o.product}` : ''}`],
                [t('ac.u360.cols.amount'), f.money(o.amountMinor, o.currency)],
                [t('ac.u360.created'), f.dateTime(o.createdAt)],
                [t('ac.u360.paidAt'), f.dateTime(o.approvedAt)],
                ...(o.reversedAt ? ([[t('ac.u360.refundedAt'), f.dateTime(o.reversedAt)], [t('ac.u360.refundedAmount'), f.money(o.reversalMinor, o.currency)]] as [string, string][]) : []),
                ...(o.durationDays ? ([[t('ac.u360.length'), t('ac.u360.daysN', { n: o.durationDays })]] as [string, string][]) : []),
                [t('ac.u360.provider'), 'Flitt (TEST)'],
                [t('ac.u360.providerStatus'), o.providerStatus || '—'],
                [t('ac.u360.reference'), o.providerReference || '—'],
                [t('ac.u360.cols.card'), o.card || '—'],
                [t('ac.u360.lastCheck'), f.dateTime(o.lastCheckAt)],
              ]}
            />
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {t('ac.u360.cardNote')}
            </AppText>
            <View style={{ gap: 4 }}>
              <AppText variant="label" style={{ color: c.textMuted }}>
                {t('ac.u360.gave')}
              </AppText>
              <AppText variant="small" style={{ color: c.text }} testID="admin-tx-entitlement">
                {gave}
              </AppText>
            </View>
            <View style={{ gap: 4 }}>
              <AppText variant="label" style={{ color: c.textMuted }}>
                {t('ac.u360.history')}
              </AppText>
              {d.history.length ? (
                d.history.map((h: any, i: number) => (
                  <AppText key={i} variant="small" style={{ color: c.textSecondary }}>
                    {status(h.status)}
                    {h.at ? ` · ${f.dateTime(typeof h.at === 'number' ? h.at : Date.parse(h.at))}` : ''}
                    {h.via ? ` · ${t('ac.u360.via', { via: h.via })}` : ''}
                  </AppText>
                ))
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.u360.none')}
                </AppText>
              )}
            </View>
            {d.staffActions.length ? (
              <View style={{ gap: 4 }}>
                <AppText variant="label" style={{ color: c.textMuted }}>
                  {t('ac.u360.staffActions')}
                </AppText>
                {d.staffActions.map((s: any, i: number) => (
                  <AppText key={i} variant="small" style={{ color: c.textSecondary }}>
                    {s.action} · {s.actorRole || '—'} · {f.dateTime(s.at)}
                    {s.reason ? ` · ${s.reason}` : ''}
                  </AppText>
                ))}
              </View>
            ) : null}
            {o.accountDeleted ? <Note>{t('ac.u360.accountDeleted')}</Note> : null}
            {onRefund && o.status === 'approved' && can('payments.refund') ? (
              <Button
                label={t('ac.finance.refund')}
                variant="danger"
                size="sm"
                icon="arrow-undo-outline"
                onPress={() => {
                  onClose();
                  onRefund({ id: o.id, amountMinor: o.amountMinor, currency: o.currency });
                }}
                style={{ alignSelf: 'flex-start' }}
                testID="admin-tx-refund"
              />
            ) : null}
            {!accountId && o.accountId && can('users.view') ? (
              <Button
                label={t('ac.u360.openAccount')}
                variant="outline"
                size="sm"
                icon="person-outline"
                onPress={() => {
                  onClose();
                  router.push(`/admin/users/${enc(o.accountId)}?tab=transactions&order=${enc(o.id)}` as any);
                }}
                style={{ alignSelf: 'flex-start' }}
                testID="admin-tx-open-account"
              />
            ) : null}
          </View>
        ) : null}
      </AdminState>
    </Sheet>
  );
}
