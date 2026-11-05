import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, IconButton, Press, Screen, space, TextField, useFeedback, useTheme } from '@/design';
import { useT } from '@/i18n';
import { addGoal, deleteGoal, Goal, loadGoals, setGoalStatus } from '@/lib/storage/goals';

export default function GoalsScreen() {
  const { t, formatDate } = useT();
  const { colors } = useTheme();
  const { confirm } = useFeedback();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback(() => {
    loadGoals().then(setGoals);
  }, []);
  useFocusEffect(reload);

  const add = async () => {
    if (!draft.trim()) return;
    await addGoal(draft);
    setDraft('');
    reload();
  };

  const toggle = async (g: Goal) => {
    await setGoalStatus(g.id, g.status === 'active' ? 'completed' : 'active');
    reload();
  };

  const remove = async (g: Goal) => {
    if (!(await confirm({ title: t('goals.deleteConfirm'), confirmLabel: t('common.delete'), destructive: true }))) return;
    await deleteGoal(g.id);
    reload();
  };

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status === 'completed');

  const row = (g: Goal) => (
    <Card key={g.id} padding={14} testID="goal-item">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Press
          onPress={() => toggle(g)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: g.status === 'completed' }}
          accessibilityLabel={g.status === 'completed' ? t('goals.reopen') : t('goals.markDone')}
          style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: g.status === 'completed' ? colors.brand : colors.borderStrong, backgroundColor: g.status === 'completed' ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}
        >
          {g.status === 'completed' ? <Icon name="checkmark" size={18} color="onPrimary" /> : null}
        </Press>
        <View style={{ flex: 1 }}>
          <AppText variant="callout" style={g.status === 'completed' ? { textDecorationLine: 'line-through', opacity: 0.7 } : undefined}>
            {g.title}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {formatDate(g.completedAt ?? g.createdAt, { day: 'numeric', month: 'short' })}
          </AppText>
        </View>
        <IconButton icon="trash-outline" label={t('common.delete')} onPress={() => remove(g)} size={38} />
      </View>
    </Card>
  );

  return (
    <Screen back title={t('goals.title')} subtitle={t('goals.subtitle')} width="reading" keyboard testID="screen-goals">
      <View style={{ gap: space[5] }}>
        <Card padding={16}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <TextField containerStyle={{ flex: 1 }} value={draft} onChangeText={setDraft} placeholder={t('goals.placeholder')} onSubmitEditing={add} returnKeyType="done" testID="goal-input" />
            <Button label={t('goals.add')} icon="add" onPress={add} disabled={!draft.trim()} testID="goal-add" />
          </View>
        </Card>
        {goals.length === 0 ? (
          <EmptyState icon="flag-outline" title={t('goals.empty')} />
        ) : (
          <>
            {active.length ? (
              <View style={{ gap: space[2] }}>
                <AppText variant="label" color="textTertiary">
                  {t('goals.active')}
                </AppText>
                {active.map(row)}
              </View>
            ) : null}
            {done.length ? (
              <View style={{ gap: space[2] }}>
                <AppText variant="label" color="textTertiary">
                  {t('goals.completed')}
                </AppText>
                {done.map(row)}
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
