import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, space } from '@/design';
import { useT } from '@/i18n';

/**
 * Shown when an allowance is reached. Calm, never a pop-up mid-conversation,
 * and safety resources always come first.
 */
export function LimitNotice({ title, body, resetAt, showUpgrade = true }: { title: string; body: string; resetAt?: number | null; showUpgrade?: boolean }) {
  const { t, formatDate } = useT();
  const router = useRouter();
  return (
    <Card tone="muted" padding={18} testID="limit-notice">
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="time-outline" size={22} color="textSecondary" />
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="small" color="textSecondary">
            {body}
          </AppText>
          {resetAt ? (
            <AppText variant="caption" color="textTertiary">
              {t('limits.resetsOn', { date: formatDate(resetAt, { day: 'numeric', month: 'long' }) })}
            </AppText>
          ) : null}
          <AppText variant="small" color="textSecondary" style={{ marginTop: space[2] }}>
            {t('anulia.limitSafety')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space[2] }}>
            <Button label={t('safety.title')} icon="heart-outline" variant="danger" size="sm" onPress={() => router.push('/safety')} />
            {showUpgrade ? <Button label={t('limits.upgrade')} variant="secondary" size="sm" onPress={() => router.push('/pricing')} /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}
