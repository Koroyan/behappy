import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { getDeck } from '@/content/cardDecks';
import { pickLocalized } from '@/content/types';
import { AppText, Badge, Card, EmptyState, IconButton, Screen, SectionHeader, space, useFeedback, useTheme } from '@/design';
import { CardSession, CompletedCardSession, deleteCardSession, listCompleted, listOngoing } from '@/features/cards/storage';
import { useT } from '@/i18n';

export default function CardHistory() {
  const router = useRouter();
  const { t, formatDate, language } = useT();
  const { colors } = useTheme();
  const { confirm } = useFeedback();
  const [ongoing, setOngoing] = useState<CardSession[]>([]);
  const [done, setDone] = useState<CompletedCardSession[]>([]);

  const load = useCallback(() => {
    listOngoing().then(setOngoing);
    listCompleted().then(setDone);
  }, []);
  useFocusEffect(load);

  const remove = async (id: string) => {
    if (!(await confirm({ title: t('common.delete'), confirmLabel: t('common.delete'), destructive: true }))) return;
    await deleteCardSession(id);
    load();
  };

  const row = (s: CardSession, completed: boolean) => {
    const deck = s.choice ? getDeck(s.choice.deck) : undefined;
    const first = deck && s.choice ? deck.cards[s.choice.cards[0]] : s.cardImageBase64 ? { uri: s.cardImageBase64 } : undefined;
    const lastText = [...(s.messages || [])].reverse().find((m) => m.role === 'assistant')?.content ?? '';
    return (
      <Card key={s.id} padding={14} onPress={() => router.push(`/cards/chat?session=${s.id}`)} testID="card-history-item">
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {first ? <Image source={first as any} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surfaceSunken }} /> : null}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <AppText variant="smallStrong">{deck ? pickLocalized(deck.title, language) : t('cards.title')}</AppText>
              {completed ? <Badge label={t('cards.chat.closed')} tone="success" /> : <Badge label={t('art.status.inProgress')} tone="gold" />}
            </View>
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {lastText}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              {formatDate((s as CompletedCardSession).completedAt ?? s.lastUpdatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </AppText>
          </View>
          <IconButton icon="trash-outline" label={t('common.delete')} onPress={() => remove(s.id)} size={36} />
        </View>
      </Card>
    );
  };

  return (
    <Screen back title={t('cards.history')} width="reading" testID="screen-card-history">
      {ongoing.length === 0 && done.length === 0 ? (
        <EmptyState icon="albums-outline" title={t('cards.historyEmpty')} />
      ) : (
        <View style={{ gap: space[6] }}>
          {ongoing.length ? (
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('cards.continueOngoing')} />
              {ongoing.map((s) => row(s, false))}
            </View>
          ) : null}
          {done.length ? (
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('cards.history')} />
              {done.map((s) => row(s, true))}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
