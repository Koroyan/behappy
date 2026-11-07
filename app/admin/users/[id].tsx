/**
 * Account 360°: one person's account across the platform, in tabs. Each tab
 * loads from its own endpoint, which checks its own permission (support, for
 * example, sees payments and sign-in history but not usage statistics or the
 * community link). Private content (journal, Anulia, self-checks, safety
 * plans) is not stored on the server and is never shown here.
 *
 * Deep links: ?tab=<tab> opens a tab, ?order=<id> opens a payment.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Icon, IconName, Press, useFeedback, useLayout } from '@/design';
import { rangeFor, RangePreset, useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { RankedBars, TrendChart } from '@/features/admin/charts';
import { useAdminColors } from '@/features/admin/theme';
import { ORDER_TONE, TransactionDrawer, useOrderStatus, useProductLabel } from '@/features/admin/transactions';
import { AdminPage, AdminState, DataTable, FilterChips, Grid, KeyValues, KpiTile, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useT } from '@/i18n';

type Tab = 'overview' | 'activity' | 'transactions' | 'subscriptions' | 'appointments' | 'community' | 'support' | 'security';
const TABS: Tab[] = ['overview', 'activity', 'transactions', 'subscriptions', 'appointments', 'community', 'support', 'security'];
const enc = encodeURIComponent;

export default function AdminUser() {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const params = useLocalSearchParams<{ id: string; tab?: string; order?: string }>();
  const id = String(params.id);
  const base = `/users/${enc(id)}`;
  const q = useAdminData<any>(base);
  const d = q.data;
  const allowed: Tab[] = d ? TABS.filter((k) => d.tabs?.[k]) : ['overview'];
  const tab: Tab = allowed.includes(params.tab as Tab) ? (params.tab as Tab) : 'overview';
  const [tick, setTick] = useState(0);
  const setTab = (k: Tab) => router.setParams({ tab: k === 'overview' ? undefined : k, order: undefined } as any);
  const openOrder = (orderId: string) => router.setParams({ order: orderId } as any);

  const run = async (path: string, body: Record<string, unknown>, done: string, after?: () => void) => {
    try {
      await act(() => adminPost(path, body));
      toast(t(done));
      if (after) after();
      else {
        q.reload();
        setTick((n) => n + 1);
      }
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const withReason = async (title: string, path: string, done: string, extra: Record<string, unknown> = {}) => {
    const reason = await ask({ title, body: t('ac.users.reasonBody') });
    if (reason) await run(path, { ...extra, reason }, done);
  };
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
  const back = () => (router.canGoBack() ? router.back() : router.push('/admin/users' as any));
  const { isCompact } = useLayout();

  // Account actions: in the header on wide screens; on phones, in a panel on the overview.
  const manage =
    d && (can('users.manage') || can('users.sessions')) ? (
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
    ) : null;

  return (
    <AdminPage
      title={d?.user.email || t('ac.users.account')}
      subtitle={d ? `${d.user.id} · ${t('ac.users.since', { date: f.date(d.user.createdAt) })}` : undefined}
      actions={
        <>
          <Button label={t('ac.u360.back')} variant="ghost" size="sm" icon="arrow-back" onPress={back} testID="admin-user-back" />
          {isCompact ? null : manage}
        </>
      }
      filters={d ? <FilterChips<Tab> options={allowed.map((k) => ({ value: k, label: t(`ac.u360.tabs.${k}`) }))} value={tab} onChange={setTab} testID="admin-user-tabs" /> : undefined}
      testID="screen-admin-user"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Note icon="lock-closed-outline">{t('ac.users.privacy')}</Note>
            {tab === 'overview' ? <Overview d={d} onGrant={grant} onDelete={remove} manage={isCompact ? manage : null} /> : null}
            {tab === 'activity' ? <ActivityTab id={id} onOrder={openOrder} /> : null}
            {tab === 'transactions' ? <TransactionsTab key={tick} id={id} onOrder={openOrder} /> : null}
            {tab === 'subscriptions' ? <PlansTab key={tick} id={id} onGrant={grant} onRevoke={(g) => withReason(t('ac.users.revokeGrant'), `${base}/grants/${g}/revoke`, 'ac.users.grantRevoked')} /> : null}
            {tab === 'appointments' ? <AppointmentsTab id={id} /> : null}
            {tab === 'community' ? (
              <CommunityTab
                key={tick}
                id={id}
                onRestrict={async () => {
                  const hours = await ask({ title: t('ac.users.restrict'), label: t('ac.users.restrictHours'), min: 1, multiline: false, initial: '24' });
                  if (!hours) return;
                  const reason = await ask({ title: t('ac.users.restrict'), body: t('ac.users.reasonBody') });
                  if (reason) await run(`${base}/restrict-posting`, { hours: Number(hours), reason }, 'ac.users.restricted');
                }}
              />
            ) : null}
            {tab === 'support' ? <SupportTab id={id} /> : null}
            {tab === 'security' ? <SecurityTab key={tick} id={id} /> : null}
          </>
        ) : null}
      </AdminState>
      <TransactionDrawer orderId={typeof params.order === 'string' ? params.order : null} accountId={id} onClose={() => router.setParams({ order: undefined } as any)} />
    </AdminPage>
  );
}

// ---------- Overview ----------
function Overview({ d, onGrant, onDelete, manage }: { d: any; onGrant: () => void; onDelete: () => void; manage: React.ReactNode }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can } = useAdmin();
  return (
    <>
      <Grid min={300}>
        <Panel title={t('ac.users.accountPanel')} testID="admin-user-account">
          <KeyValues
            items={[
              [t('ac.users.cols.status'), <Pill key="s" label={t(`ac.users.status.${d.user.status}`)} tone={d.user.status === 'active' ? 'good' : 'danger'} />],
              [t('ac.users.cols.type'), t(`ac.u360.types.${d.user.type}`)],
              [t('ac.u360.emailVerified'), d.user.emailVerified ? t('ac.u360.yes') : t('ac.u360.no')],
              [t('ac.users.cols.lastSeen'), f.dateTime(d.user.lastSeenAt)],
              [t('ac.users.sessions'), d.sessions.map((s: any) => `${t(`ac.users.sessionKinds.${s.kind}`)}: ${s.count}`).join(' · ') || '0'],
              [t('ac.users.cols.staff'), d.user.staffRoles?.length ? d.user.staffRoles.map((r: string) => t(`ac.roles.${r}`)).join(', ') : '—'],
              [t('ac.u360.analytics'), d.user.analyticsOptOut ? t('ac.u360.analyticsOff') : t('ac.u360.analyticsOn')],
              ...(d.user.lockedUntil ? ([[t('ac.users.lockedUntil'), f.dateTime(d.user.lockedUntil)]] as [string, string][]) : []),
              ...(d.user.suspensionReason ? ([[t('ac.users.suspensionReason'), d.user.suspensionReason]] as [string, string][]) : []),
            ]}
          />
        </Panel>
        <Panel title={t('ac.users.planPanel')} actions={can('users.entitlements') ? <Button label={t('ac.users.grant')} size="sm" variant="secondary" onPress={onGrant} testID="admin-user-grant" /> : null}>
          <KeyValues
            items={[
              [t('ac.users.cols.plan'), d.plan.tier === 'plus' ? `Plus · ${t('ac.users.until', { date: f.date(d.plan.plusExpiresAt) })}` : t('ac.users.free')],
              [t('ac.u360.artProgram'), d.plan.artProgram ? t('ac.u360.owned') : '—'],
            ]}
          />
          <AppText variant="caption" style={{ color: c.textMuted }}>
            {t('ac.users.grantNote')}
          </AppText>
        </Panel>
        <Panel title={t('ac.u360.glance')}>
          <KeyValues
            items={[
              [t('ac.u360.supportOpen'), f.num(d.supportOpen)],
              ...(d.restrictions.community !== undefined ? ([[t('ac.u360.communityRestricted'), d.restrictions.community ? t('ac.u360.paused') : t('ac.u360.notPaused')]] as [string, string][]) : []),
              [t('ac.u360.usage30d'), d.usage30d ? t('ac.u360.usageLine', { days: d.usage30d.activeDays, sessions: d.usage30d.sessions }) : t('ac.u360.usageHidden')],
              [t('ac.users.professional'), d.professional ? `${d.professional.publicName || d.professional.id} · ${t(`pro.status.${d.professional.status}`)}` : '—'],
            ]}
          />
          {d.professional && can('professionals.view') ? <Button label={t('ac.users.openProfessional')} variant="ghost" size="sm" onPress={() => router.push(`/admin/applications/${d.professional.id}` as any)} /> : null}
        </Panel>
      </Grid>
      {manage ? (
        <Panel title={t('ac.users.accountPanel')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{manage}</View>
        </Panel>
      ) : null}
      {can('users.deletion') && !d.user.staffRoles?.length ? (
        <Panel title={t('ac.users.dangerZone')}>
          <AppText variant="small" style={{ color: c.textSecondary }}>
            {t('ac.users.deleteExplain')}
          </AppText>
          <Button label={t('ac.users.deleteTitle')} variant="danger" size="sm" onPress={onDelete} style={{ alignSelf: 'flex-start' }} testID="admin-user-delete" />
        </Panel>
      ) : null}
    </>
  );
}

// ---------- Activity ----------
const EVENT_ICON: Record<string, IconName> = {
  account_created: 'person-add-outline',
  email_verified: 'mail-outline',
  checkout_started: 'cart-outline',
  payment_completed: 'card-outline',
  payment_refunded: 'arrow-undo-outline',
  complimentary_given: 'gift-outline',
  complimentary_revoked: 'gift-outline',
  appointment_requested: 'calendar-outline',
  appointment_confirmed: 'calendar-outline',
  appointment_cancelled: 'calendar-clear-outline',
  community_room_joined: 'chatbubbles-outline',
  support_request: 'chatbox-ellipses-outline',
  security_event: 'lock-closed-outline',
  app_used: 'phone-portrait-outline',
};

function ActivityTab({ id, onOrder }: { id: string; onOrder: (orderId: string) => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can } = useAdmin();
  const product = useProductLabel();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const range = rangeFor(preset);
  const q = useAdminData<any>(`/users/${enc(id)}/activity`, { from: range.from, to: range.to });
  const d = q.data;
  const label = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const detail = (e: any) => {
    const x = e.detail || {};
    switch (e.type) {
      case 'payment_completed':
        return `${product(x.product)} · ${f.money(x.amountMinor, x.currency)} · TEST`;
      case 'checkout_started':
      case 'payment_refunded':
        return `${product(x.product)} · TEST`;
      case 'complimentary_given':
      case 'complimentary_revoked':
        return t('ac.u360.daysN', { n: x.days });
      case 'appointment_requested':
        return x.professional || '';
      case 'appointment_cancelled':
        return x.status ? label(`appointments.status.${x.status}`, x.status) : '';
      case 'support_request':
        return label(`ac.support.categories.${x.category}`, x.category || '');
      case 'security_event':
        return label(`ac.security.kinds.${x.kind}`, x.kind || '');
      case 'app_used':
        return `${t('ac.u360.appUsedLine', { sessions: x.sessions, minutes: x.minutes })}${x.features?.length ? ` · ${x.features.map((k: string) => label(`ac.features.${k}`, k)).join(', ')}` : ''}`;
      case 'community_room_joined':
        return t('ac.u360.roomHidden');
      default:
        return '';
    }
  };
  const open = (e: any) => {
    if (e.ref?.kind === 'order' && can('users.transactions.view')) return () => onOrder(e.ref.id);
    if (e.ref?.kind === 'appointment' && can('appointments.view')) return () => router.push(`/admin/appointments?focus=${enc(e.ref.id)}` as any);
    if (e.ref?.kind === 'ticket' && can('support.view')) return () => router.push(`/admin/support/${enc(e.ref.id)}` as any);
    return null;
  };
  const perDay = d?.usage?.daily ? fill(range.from, range.to, d.usage.daily) : [];
  return (
    <>
      <FilterChips<RangePreset> options={(['7d', '30d', '90d'] as RangePreset[]).map((p) => ({ value: p, label: t(`ac.range.${p}`) }))} value={preset} onChange={setPreset} testID="admin-user-range" />
      <AppText variant="small" style={{ color: c.textSecondary }}>
        {t('ac.u360.activitySub')}
      </AppText>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            {d.usage.optedOut ? (
              <Note>{t('ac.users.optedOut')}</Note>
            ) : (
              <>
                <Grid min={170}>
                  <KpiTile label={t('ac.u360.kpis.activeDays')} value={f.num(d.usage.activeDays)} note={t('ac.u360.estimated')} />
                  <KpiTile label={t('ac.u360.kpis.sessions')} value={f.num(d.usage.sessions)} />
                  <KpiTile label={t('ac.u360.kpis.minutes')} value={f.minutes(d.usage.minutes)} />
                  <KpiTile label={t('ac.u360.kpis.avgSession')} value={f.minutes(d.usage.avgSessionMinutes)} />
                </Grid>
                <Grid min={380}>
                  <Panel title={t('ac.u360.perDay')} subtitle={t('ac.u360.estimated')}>
                    <TrendChart kind="bars" data={perDay} format={(v) => f.num(v)} valueLabel={t('ac.u360.minutes')} />
                  </Panel>
                  <Panel title={t('ac.u360.features')} subtitle={t('ac.u360.estimated')}>
                    {d.usage.features.length ? <RankedBars items={d.usage.features.map((x: any) => ({ label: label(`ac.features.${x.feature}`, x.feature), value: x.minutes }))} format={(v) => f.minutes(v)} /> : <AppText variant="small" style={{ color: c.textMuted }}>{t('ac.u360.none')}</AppText>}
                  </Panel>
                </Grid>
              </>
            )}
            {d.ai.length ? (
              <Panel title={t('ac.u360.ai')}>
                <KeyValues items={d.ai.map((x: any) => [label(`ac.features.${x.feature}`, x.feature), t('ac.u360.aiLine', { n: x.requests, errors: x.errors })] as [string, string])} />
              </Panel>
            ) : null}
            <Panel title={t('ac.u360.timeline')} testID="admin-user-timeline">
              {d.events.length ? (
                d.events.map((e: any, i: number) => {
                  const go = open(e);
                  const body = (
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: e.source === 'app' ? c.infoSoft : c.cardMuted, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={EVENT_ICON[e.type] || 'ellipse-outline'} size={16} color={c.textSecondary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="smallStrong" style={{ color: go ? c.primary : c.text }}>
                          {label(`ac.u360.events.${e.type}`, e.type)}
                        </AppText>
                        {detail(e) ? (
                          <AppText variant="caption" style={{ color: c.textSecondary }}>
                            {detail(e)}
                          </AppText>
                        ) : null}
                        <AppText variant="caption" style={{ color: c.textMuted }}>
                          {e.type === 'app_used' ? f.date(e.at) : f.dateTime(e.at)} · {t(`ac.u360.sources.${e.source}`)}
                        </AppText>
                      </View>
                      {go ? <Icon name="chevron-forward" size={16} color={c.textMuted} /> : null}
                    </View>
                  );
                  return go ? (
                    <Press key={i} onPress={go} accessibilityRole="button" testID={`admin-user-event-${e.type}`}>
                      {body}
                    </Press>
                  ) : (
                    <View key={i}>{body}</View>
                  );
                })
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.u360.noEvents')}
                </AppText>
              )}
            </Panel>
          </>
        ) : null}
      </AdminState>
    </>
  );
}

function fill(from: string, to: string, rows: { day: string; minutes: number }[]) {
  const map = new Map(rows.map((r) => [r.day, r.minutes]));
  const out = [];
  for (let d = Date.parse(`${from}T00:00:00Z`); d <= Date.parse(`${to}T00:00:00Z`); d += 86400000) {
    const key = new Date(d).toISOString().slice(0, 10);
    out.push({ x: key, y: map.get(key) || 0 });
  }
  return out;
}

// ---------- Payments and plans ----------
function TransactionsTab({ id, onOrder }: { id: string; onOrder: (orderId: string) => void }) {
  const { t } = useT();
  const f = useFmt();
  const status = useOrderStatus();
  const product = useProductLabel();
  const q = useAdminData<any>(`/users/${enc(id)}/transactions`);
  const d = q.data;
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <Panel title={t('ac.u360.tabs.transactions')} subtitle={t('ac.u360.txSub')} actions={<Pill label={t('ac.u360.testLabel')} tone="warning" icon="flask-outline" />}>
          <DataTable
            rows={d.orders}
            keyFor={(r: any) => r.id}
            onRowPress={(r: any) => onOrder(r.id)}
            rowTestID="admin-user-order"
            empty={t('ac.u360.noPayments')}
            columns={[
              { key: 'date', label: t('ac.u360.cols.date'), render: (r: any) => f.dateTime(r.createdAt) },
              { key: 'product', label: t('ac.u360.cols.product'), render: (r: any) => product(r.kind) },
              { key: 'amount', label: t('ac.u360.cols.amount'), align: 'right', render: (r: any) => f.money(r.amountMinor, r.currency) },
              { key: 'status', label: t('ac.u360.cols.status'), render: (r: any) => <Pill label={status(r.status)} tone={ORDER_TONE[r.status] || 'neutral'} /> },
              { key: 'card', label: t('ac.u360.cols.card'), render: (r: any) => r.card || '—' },
              { key: 'ref', label: t('ac.u360.cols.reference'), render: (r: any) => r.id },
            ]}
          />
        </Panel>
      ) : null}
    </AdminState>
  );
}

function PlansTab({ id, onGrant, onRevoke }: { id: string; onGrant: () => void; onRevoke: (grantId: number) => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const { can } = useAdmin();
  const q = useAdminData<any>(`/users/${enc(id)}/transactions`);
  const d = q.data;
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <>
          <Note>{t('ac.u360.plansSub')}</Note>
          <Grid min={320}>
            <Panel title={t('ac.u360.current')} actions={can('users.entitlements') ? <Button label={t('ac.users.grant')} size="sm" variant="secondary" onPress={onGrant} testID="admin-user-grant-plans" /> : null}>
              <KeyValues
                items={[
                  [t('ac.users.cols.plan'), d.subscription.tier === 'plus' ? `Plus · ${t('ac.users.until', { date: f.date(d.subscription.plusExpiresAt) })}` : t('ac.users.free')],
                  [t('ac.u360.artProgram'), d.subscription.artProgram ? t('ac.u360.owned') : '—'],
                ]}
              />
            </Panel>
            <Panel title={t('ac.u360.periods')} testID="admin-user-periods">
              {d.subscription.periods.length ? (
                d.subscription.periods.map((p: any) => (
                  <View key={`${p.ref}-${p.startsAt}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Pill label={p.kind === 'paid' ? t('ac.u360.paid') : t('ac.u360.complimentary')} tone={p.kind === 'paid' ? 'good' : 'info'} />
                    <AppText variant="small" style={{ color: c.text, flex: 1 }}>
                      {t('ac.u360.periodLine', { from: f.date(p.startsAt), to: f.date(p.endsAt), days: p.days })}
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.u360.noPeriods')}
                </AppText>
              )}
            </Panel>
          </Grid>
          <Panel title={t('ac.u360.grants')} subtitle={t('ac.finance.complimentarySub')}>
            {d.grants.length ? (
              d.grants.map((g: any) => (
                <View key={g.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <AppText variant="small" style={{ color: g.revokedAt ? c.textMuted : c.text, flex: 1 }}>
                    {t('ac.users.grantLine', { days: g.days, date: f.date(g.startsAt), reason: g.reason })}
                    {g.revokedAt ? ` · ${t('ac.u360.revokedLine', { reason: g.revokeReason || '—' })}` : ''}
                  </AppText>
                  {!g.revokedAt && can('users.entitlements') ? <Button label={t('ac.users.revoke')} variant="ghost" size="sm" onPress={() => onRevoke(g.id)} /> : g.revokedAt ? <Pill label={t('ac.users.revoked')} /> : null}
                </View>
              ))
            ) : (
              <AppText variant="small" style={{ color: c.textMuted }}>
                {t('ac.u360.noGrants')}
              </AppText>
            )}
          </Panel>
        </>
      ) : null}
    </AdminState>
  );
}

// ---------- Appointments, community, support, security ----------
function AppointmentsTab({ id }: { id: string }) {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can } = useAdmin();
  const q = useAdminData<any>(`/users/${enc(id)}/appointments`);
  const d = q.data;
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <Panel title={t('ac.u360.tabs.appointments')} subtitle={t('ac.appointments.privacy')}>
          <DataTable
            rows={d.appointments}
            keyFor={(r: any) => r.id}
            onRowPress={can('appointments.view') ? (r: any) => router.push(`/admin/appointments?focus=${enc(r.id)}` as any) : undefined}
            empty={t('ac.u360.noAppointments')}
            columns={[
              { key: 'when', label: t('ac.u360.cols.when'), render: (r: any) => f.dateTime(r.startsAt) },
              { key: 'pro', label: t('ac.u360.cols.professional'), render: (r: any) => r.professional.publicName || '—' },
              { key: 'service', label: t('ac.u360.cols.service'), render: (r: any) => `${r.service || '—'} · ${t(`ac.appointments.modes.${r.mode}`)}` },
              { key: 'length', label: t('ac.u360.cols.length'), render: (r: any) => f.minutes(r.minutes) },
              { key: 'status', label: t('ac.u360.cols.status'), render: (r: any) => <Pill label={t(`appointments.status.${r.status}`)} /> },
            ]}
          />
        </Panel>
      ) : null}
    </AdminState>
  );
}

function CommunityTab({ id, onRestrict }: { id: string; onRestrict: () => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { can } = useAdmin();
  const q = useAdminData<any>(`/users/${enc(id)}/community`);
  const d = q.data;
  const reasonLabel = (r: string) => {
    const k = `ac.safety.reasons.${r}`;
    const v = t(k);
    return v === k ? r : v;
  };
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        d.profile ? (
          <>
            <Grid min={320}>
              <Panel
                title={t('ac.users.communityPanel')}
                subtitle={t('ac.u360.communitySub')}
                actions={can('moderation.members.view') ? <Button label={t('ac.u360.memberProfile')} size="sm" variant="ghost" iconRight="chevron-forward" onPress={() => router.push(`/admin/moderation/members/${enc(d.profile.ref)}` as any)} testID="admin-user-member" /> : undefined}
              >
                <KeyValues
                  items={[
                    [t('ac.users.pseudonym'), d.profile.pseudonym],
                    [t('ac.u360.cols.started'), f.date(d.profile.since)],
                    [t('ac.users.rooms'), f.num(d.profile.rooms)],
                    [t('ac.users.messages'), f.num(d.profile.messages)],
                    [t('ac.users.reportsAgainst'), f.num(d.reportsAgainst.length)],
                    [t('ac.u360.reportsMade'), f.num(d.reportsMade)],
                    [t('ac.mod.counts.warnings'), f.num(d.warnings)],
                  ]}
                />
                {can('users.manage') ? <Button label={t('ac.users.restrict')} size="sm" variant="secondary" onPress={onRestrict} style={{ alignSelf: 'flex-start' }} /> : null}
              </Panel>
              <Panel title={t('ac.mod.restrictions')}>
                {d.restrictions.length ? (
                  d.restrictions.map((s: any) => (
                    <AppText key={s.id} variant="small" style={{ color: s.lifted ? c.textMuted : c.text }}>
                      {t(`ac.mod.kind.${s.kind}`)} · {f.date(s.startsAt)}
                      {s.endsAt ? ` → ${f.date(s.endsAt)}` : ''}
                      {s.lifted ? ` · ${t('ac.mod.liftedTag')}` : ''}
                      {s.reason ? ` · ${s.reason}` : ''}
                    </AppText>
                  ))
                ) : (
                  <AppText variant="small" style={{ color: c.textMuted }}>
                    {t('ac.u360.none')}
                  </AppText>
                )}
              </Panel>
            </Grid>
            <Panel title={t('ac.users.reportsAgainst')}>
              {d.reportsAgainst.length ? (
                d.reportsAgainst.map((r: any) =>
                  can('moderation.act') ? (
                    <Press key={r.id} onPress={() => router.push(`/admin/moderation/reports/${r.id}` as any)} accessibilityRole="link" style={{ paddingVertical: 4 }}>
                      <AppText variant="small" style={{ color: c.primary }}>
                        #{r.id} · {reasonLabel(r.reason)} · {t(`ac.mod.status.${r.status}`)} · {f.date(r.at)}
                      </AppText>
                    </Press>
                  ) : (
                    <AppText key={r.id} variant="small" style={{ color: c.textSecondary }}>
                      #{r.id} · {reasonLabel(r.reason)} · {t(`ac.mod.status.${r.status}`)} · {f.date(r.at)}
                    </AppText>
                  )
                )
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.u360.none')}
                </AppText>
              )}
            </Panel>
          </>
        ) : (
          <Panel>
            <AppText variant="small" style={{ color: c.textSecondary }}>
              {t('ac.u360.noCommunity')}
            </AppText>
          </Panel>
        )
      ) : null}
    </AdminState>
  );
}

function SupportTab({ id }: { id: string }) {
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const q = useAdminData<any>(`/users/${enc(id)}/support`);
  const d = q.data;
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <Panel title={t('ac.u360.tabs.support')}>
          <DataTable
            rows={d.tickets}
            keyFor={(r: any) => r.id}
            onRowPress={(r: any) => router.push(`/admin/support/${enc(r.id)}` as any)}
            empty={t('ac.u360.noTickets')}
            columns={[
              { key: 'topic', label: t('ac.u360.cols.topic'), render: (r: any) => t(`ac.support.categories.${r.category}`) },
              { key: 'status', label: t('ac.u360.cols.status'), render: (r: any) => <Pill label={t(`ac.support.status.${r.status}`)} /> },
              { key: 'updated', label: t('ac.u360.cols.updated'), render: (r: any) => f.dateTime(r.updatedAt) },
              { key: 'assigned', label: t('ac.u360.cols.assigned'), render: (r: any) => r.assignedTo || '—' },
            ]}
          />
        </Panel>
      ) : null}
    </AdminState>
  );
}

function SecurityTab({ id }: { id: string }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const q = useAdminData<any>(`/users/${enc(id)}/security`);
  const d = q.data;
  const kind = (k: string) => {
    const key = `ac.security.kinds.${k}`;
    const v = t(key);
    return v === key ? k : v;
  };
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <>
          <Panel title={t('ac.u360.sessions')}>
            <DataTable
              rows={d.sessions}
              keyFor={(r: any) => `${r.kind}-${r.createdAt}`}
              empty={t('ac.u360.none')}
              columns={[
                { key: 'kind', label: t('ac.u360.cols.kind'), render: (r: any) => t(`ac.users.sessionKinds.${r.kind}`) },
                { key: 'started', label: t('ac.u360.cols.started'), render: (r: any) => f.dateTime(r.createdAt) },
                { key: 'last', label: t('ac.u360.cols.lastUsed'), render: (r: any) => f.dateTime(r.lastUsedAt) },
                { key: 'state', label: t('ac.u360.cols.status'), render: (r: any) => <Pill label={r.revokedAt ? t('ac.u360.ended') : t('ac.u360.active')} tone={r.revokedAt ? 'neutral' : 'good'} /> },
                { key: 'device', label: t('ac.u360.cols.device'), render: (r: any) => r.device || '—' },
              ]}
            />
          </Panel>
          <Grid min={340}>
            <Panel title={t('ac.u360.authEvents')} subtitle={t('ac.u360.ipNote')}>
              {d.events.length ? (
                d.events.map((e: any) => (
                  <AppText key={e.id} variant="small" style={{ color: c.textSecondary }}>
                    {kind(e.kind)} · {f.dateTime(e.at)}
                    {e.ipHash ? ` · ${e.ipHash}` : ''}
                  </AppText>
                ))
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.u360.none')}
                </AppText>
              )}
            </Panel>
            <Panel title={t('ac.users.historyPanel')} subtitle={t('ac.users.historySub')}>
              {d.staffActions.length ? (
                d.staffActions.map((h: any, i: number) => (
                  <View key={i} style={{ gap: 2 }}>
                    <AppText variant="smallStrong" style={{ color: c.text }}>
                      {h.action}
                    </AppText>
                    <AppText variant="caption" style={{ color: c.textMuted }}>
                      {f.dateTime(h.at)} · {h.actorRole || '—'}
                      {h.reason ? ` · ${h.reason}` : ''}
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {t('ac.users.noHistory')}
                </AppText>
              )}
            </Panel>
          </Grid>
        </>
      ) : null}
    </AdminState>
  );
}
