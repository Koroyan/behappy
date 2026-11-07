import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Banner, Card, Chip, EmptyState, Screen, Skeleton, space } from '@/design';
import { StaffGate } from '@/features/account/StaffGate';
import { VerificationBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { canStaff, useIdentity } from '@/lib/api/account';
import { adminApplications } from '@/lib/api/pros';

const FILTERS = ['queue', 'more_info_required', 'approved', 'rejected', 'suspended', 'expired'] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminApplications() {
  const router = useRouter();
  const identity = useIdentity();
  const { t, tp, formatDate } = useT();
  const allowed = canStaff(identity, 'professionals.view');
  const [filter, setFilter] = useState<Filter>('queue');
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      setList(null);
      setError(false);
      adminApplications(filter === 'queue' ? undefined : filter)
        .then(setList)
        .catch(() => {
          setList([]);
          setError(true);
        });
    }, [allowed, filter])
  );

  if (!allowed) {
    return (
      <Screen back title={t('admin.applications.title')} width="reading" testID="screen-admin-applications">
        <StaffGate permission="professionals.view" returnTo="/admin/applications" />
      </Screen>
    );
  }

  return (
    <Screen back title={t('admin.applications.title')} width="reading" testID="screen-admin-applications">
      <View style={{ gap: space[4] }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={t(`admin.applications.filters.${f}`)} selected={filter === f} onPress={() => setFilter(f)} testID={`admin-filter-${f}`} />
          ))}
        </ScrollView>
        {error ? <Banner tone="warning" body={t('common.errorBody')} /> : null}
        {list === null ? (
          <Skeleton height={120} radius={22} />
        ) : list.length === 0 ? (
          <EmptyState icon="file-tray-outline" title={t('admin.applications.empty')} />
        ) : (
          list.map((p) => (
            <Card key={p.id} padding={16} onPress={() => router.push(`/admin/applications/${p.id}` as any)} accessibilityLabel={p.publicName || p.legalName || p.id} testID="admin-application-row">
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {p.publicName || p.legalName || '—'}
                  </AppText>
                  <VerificationBadge status={p.status} />
                </View>
                <AppText variant="small" color="textSecondary" numberOfLines={1}>
                  {[p.legalName, [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {p.submittedAt ? t('admin.applications.submittedOn', { date: formatDate(p.submittedAt, { day: 'numeric', month: 'short', year: 'numeric' }) }) : ''}
                  {p.submittedAt ? ' · ' : ''}
                  {tp('admin.applications.documents', p.documents)}
                </AppText>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
