import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, EmptyState, Screen, SectionHeader, Segmented, Skeleton, space } from '@/design';
import { StaffGate } from '@/features/account/StaffGate';
import { MembershipBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { canStaff, useIdentity } from '@/lib/api/account';
import { adminHealth, adminMemberships, adminOverview, adminPayments } from '@/lib/api/pros';

type Tab = 'overview' | 'memberships' | 'payments' | 'health';

function Tile({ label, value, hint, testID }: { label: string; value: string | number; hint?: string; testID?: string }) {
  return (
    <Card padding={16} style={{ flexGrow: 1, flexBasis: 160 }} testID={testID}>
      <AppText variant="title1">{String(value)}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
}

const sum = (o: Record<string, number> | undefined) => Object.values(o || {}).reduce((a, b) => a + b, 0);

export default function AdminHome() {
  const router = useRouter();
  const identity = useIdentity();
  const { t, formatPrice, formatDate } = useT();
  const allowed = canStaff(identity, 'dashboard.view');
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      setError(false);
      if (tab === 'overview') adminOverview().then(setOverview).catch(() => setError(true));
      if (tab === 'health') adminHealth().then(setHealth).catch(() => setError(true));
      if (tab === 'memberships') adminMemberships().then(setMemberships).catch(() => setError(true));
      if (tab === 'payments') adminPayments().then(setPayments).catch(() => setError(true));
    }, [allowed, tab])
  );

  if (!allowed) {
    return (
      <Screen back title={t('admin.title')} width="reading" testID="screen-admin">
        <StaffGate permission="dashboard.view" returnTo="/admin" />
      </Screen>
    );
  }

  const money = (minor: number) => formatPrice(minor, 'GEL');
  const rev = (r: any) => `${money(r.gross)} · ${t('admin.refunded')} ${money(r.refunded)} · ${t('admin.net')} ${money(r.gross - r.refunded)}`;

  return (
    <Screen back title={t('admin.title')} subtitle={t('admin.subtitle')} testID="screen-admin">
      <View style={{ gap: space[5] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label={t('admin.sections.applications')} icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/admin/applications' as any)} testID="admin-open-applications" />
          <Button label={t('admin.sections.moderation')} icon="flag-outline" variant="quiet" onPress={() => router.push('/moderation' as any)} />
        </View>
        <Segmented
          label={t('admin.title')}
          value={tab}
          onChange={setTab}
          options={(['overview', 'memberships', 'payments', 'health'] as Tab[]).map((v) => ({ value: v, label: t(`admin.sections.${v}`) }))}
        />
        {error ? <Banner tone="warning" body={t('common.errorBody')} /> : null}

        {tab === 'overview' ? (
          !overview ? (
            <Skeleton height={300} radius={22} />
          ) : (
            <>
              <Banner tone="test" title={t('common.test')} body={overview.revenue.note} />
              <View>
                <SectionHeader title={t('admin.accounts')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Tile label={t('admin.accounts')} value={overview.accounts.total} />
                  <Tile label={t('admin.registered')} value={overview.accounts.registered} />
                  <Tile label={t('admin.new30d')} value={overview.accounts.new30d} />
                </View>
              </View>
              <View>
                <SectionHeader title={t('admin.professionals')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Tile label={t('admin.listedNow')} value={overview.professionals.listed} testID="admin-listed" />
                  {Object.entries(overview.professionals.byStatus as Record<string, number>).map(([s, n]) => (
                    <Tile key={s} label={t(`pro.status.${s}`)} value={n} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {Object.entries(overview.professionals.membershipStates as Record<string, number>).map(([s, n]) => (
                    <View key={s} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <MembershipBadge state={s} />
                      <AppText variant="smallStrong">{n}</AppText>
                    </View>
                  ))}
                </View>
              </View>
              <View>
                <SectionHeader title={t('admin.revenue')} />
                <Card padding={18}>
                  <View style={{ gap: 10 }}>
                    <AppText variant="bodyStrong">{t('admin.membershipRevenue')}</AppText>
                    <AppText variant="small" color="textSecondary">
                      {t('admin.last30')}: {rev(overview.revenue.professional30d)}
                    </AppText>
                    <AppText variant="small" color="textSecondary">
                      {t('admin.allTime')}: {rev(overview.revenue.professionalAllTime)}
                    </AppText>
                    <AppText variant="bodyStrong">{t('admin.consumerRevenue')}</AppText>
                    <AppText variant="small" color="textSecondary">
                      {t('admin.last30')}: {rev(overview.revenue.consumer30d)}
                    </AppText>
                    <AppText variant="small" color="textSecondary">
                      {t('admin.allTime')}: {rev(overview.revenue.consumerAllTime)}
                    </AppText>
                  </View>
                </Card>
              </View>
              <View>
                <SectionHeader title={t('admin.bookings')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Tile label={t('admin.bookings')} value={sum(overview.bookings)} />
                  {Object.entries(overview.bookings as Record<string, number>).map(([s, n]) => (
                    <Tile key={s} label={t(`appointments.status.${s}`)} value={n} />
                  ))}
                </View>
              </View>
              <View>
                <SectionHeader title={t('admin.community')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Tile label={t('admin.activeRooms')} value={overview.community.active_rooms} />
                  <Tile label={t('admin.messages7d')} value={overview.community.messages7d} />
                  <Tile label={t('admin.anulia7d')} value={overview.community.anulia7d} />
                  <Tile label={t('admin.openReports')} value={overview.community.open_reports} hint={`${t('admin.urgent')}: ${overview.community.urgent_reports}`} />
                  <Tile label={t('admin.appeals')} value={overview.community.open_appeals} />
                </View>
              </View>
              <View>
                <SectionHeader title={t('admin.ai')} />
                <Card padding={16}>
                  <View style={{ gap: 6 }}>
                    {(overview.ai.last30d as any[]).map((row) => (
                      <AppText key={`${row.feature}-${row.model}`} variant="small">
                        {row.feature} · {row.model} · {row.calls} · {t('admin.tokens', { input: row.input, output: row.output })}
                      </AppText>
                    ))}
                    <AppText variant="caption" color="textTertiary">
                      {overview.ai.estimatedCostUsd !== null ? t('admin.cost', { amount: overview.ai.estimatedCostUsd }) : t('admin.costUnknown')}
                    </AppText>
                  </View>
                </Card>
              </View>
            </>
          )
        ) : null}

        {tab === 'memberships' ? (
          !memberships ? (
            <Skeleton height={200} radius={22} />
          ) : (
            <Card padding={4}>
              {memberships.map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {m.publicName || '—'}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {t(`pro.status.${m.status}`)}
                      {m.endsAt ? ` · ${formatDate(m.endsAt, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      {m.listed ? ` · ${t('admin.listedNow')}` : ''}
                    </AppText>
                  </View>
                  <MembershipBadge state={m.state} />
                  <Button label={t('admin.applications.open')} size="sm" variant="quiet" onPress={() => router.push(`/admin/applications/${m.id}` as any)} />
                </View>
              ))}
              {!memberships.length ? <EmptyState icon="people-outline" title={t('admin.applications.empty')} /> : null}
            </Card>
          )
        ) : null}

        {tab === 'payments' ? (
          !payments ? (
            <Skeleton height={200} radius={22} />
          ) : (
            <Card padding={4}>
              {payments.map((o) => (
                <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">
                      {formatPrice(o.amountMinor, o.currency)} · {o.productKind}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {formatDate(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {t(`purchases.status.${o.status}`)}
                      {o.professionalName ? ` · ${o.professionalName}` : ''}
                    </AppText>
                  </View>
                  <Badge label={t('purchases.testLabel')} tone="gold" />
                </View>
              ))}
              {!payments.length ? <EmptyState icon="card-outline" title={t('purchases.empty')} /> : null}
            </Card>
          )
        ) : null}

        {tab === 'health' ? (
          !health ? (
            <Skeleton height={200} radius={22} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Tile label={t('admin.database')} value={health.database} hint={health.driver} />
              <Tile label={t('admin.schema')} value={health.schema ?? '—'} />
              <Tile label={t('admin.uptime')} value={`${Math.round(health.uptimeSeconds / 60)} min`} hint={`${health.memoryMb} MB · ${health.node}`} />
              <Tile label={t('admin.sockets')} value={health.realtimeConnections ?? '—'} />
              <Tile label={t('admin.scheduler')} value={health.scheduler?.lastRunAt ? formatDate(health.scheduler.lastRunAt, { hour: '2-digit', minute: '2-digit' }) : '—'} />
              <Tile label={t('admin.email')} value={health.email ? t('admin.on') : t('admin.off')} />
              <Tile label={t('admin.sms')} value={health.sms ? t('admin.on') : t('admin.off')} />
              <Tile label="AI" value={health.ai ? t('admin.on') : t('admin.off')} />
              <Tile label="Flitt" value="TEST" />
            </View>
          )
        ) : null}
      </View>
    </Screen>
  );
}
