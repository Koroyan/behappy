import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Card, EmptyState, Screen, Skeleton, space } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { listThreads, Thread } from '@/lib/api/pros';

export default function MessagesList() {
  const router = useRouter();
  const { t, tp, formatDate } = useT();
  const identity = useIdentity();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!identity.registered) return;
      listThreads()
        .then(setThreads)
        .catch(() => setThreads([]));
    }, [identity.registered])
  );

  return (
    <Screen back title={t('messages.title')} subtitle={t('messages.private')} width="reading" testID="screen-messages">
      {!identity.registered ? (
        <AccountGate returnTo="/messages" />
      ) : threads === null ? (
        <Skeleton height={80} radius={22} />
      ) : threads.length ? (
        <View style={{ gap: space[3] }}>
          {threads.map((th) => (
            <Card key={th.id} padding={16} onPress={() => router.push(`/messages/${th.id}` as any)} accessibilityLabel={th.side === 'client' ? th.professionalName : th.clientName || ''} testID="thread-row">
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {th.side === 'client' ? th.professionalName : th.clientName || t('messages.formerClient')}
                  </AppText>
                  {th.unread ? <Badge label={tp('pro.unread', th.unread)} tone="primary" /> : null}
                </View>
                {th.lastMessage ? (
                  <AppText variant="small" color="textSecondary" numberOfLines={2}>
                    {th.lastMessage.sender === th.side ? `${t('messages.you')}: ` : ''}
                    {th.lastMessage.body}
                  </AppText>
                ) : null}
                {th.lastMessageAt ? (
                  <AppText variant="caption" color="textTertiary">
                    {formatDate(th.lastMessageAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState icon="mail-outline" title={t('messages.empty')} />
      )}
    </Screen>
  );
}
