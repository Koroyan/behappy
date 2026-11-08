/**
 * One recap fact in the person's language (used by the reflection screen and
 * the "Today so far" card). Pure formatting of recorded values.
 */
import React from 'react';
import { View } from 'react-native';

import { AppText, Icon, IconName } from '@/design';
import { useT } from '@/i18n';
import type { RecapFact } from '@/lib/wellbeing/recap';

const ICONS: Record<string, IconName> = {
  steps: 'footsteps-outline',
  mood: 'happy-outline',
  journal: 'book-outline',
  calm: 'leaf-outline',
  sound: 'musical-notes-outline',
  sleep: 'moon-outline',
  art: 'color-palette-outline',
  cards: 'albums-outline',
  challenges: 'flag-outline',
  goals: 'trophy-outline',
};

export function useFactText() {
  const { t, tl } = useT();
  return (f: RecapFact): string => {
    const v = f.values;
    if (f.category === 'challenges') return t('wb.reflection.facts.challenge', { name: t(`wb.badges.challenges.names.${v.challenge}`), progress: v.progress, target: v.target });
    const names = String(v.names || '')
      .split(', ')
      .filter(Boolean)
      .map((n) => (t(`wb.steps.templates.${n}`) !== `wb.steps.templates.${n}` ? t(`wb.steps.templates.${n}`) : n));
    const feelings = String(v.feelings || '')
      .split(',')
      .filter(Boolean)
      .map((x) => t(`mood.feelings.${x}`));
    const levels = tl('mood.levels');
    let text = t(`wb.reflection.facts.${f.id.replace('.', '_')}`, {
      ...v,
      names: names.length ? `: ${names.join(', ')}` : '',
      mood: levels[Number(v.last)] ?? String(v.last ?? ''),
      hours: v.hours ? t('wb.reflection.hoursSuffix', { hours: v.hours }) : '',
      finished: Number(v.finished) ? t('wb.reflection.goalsFinished', { n: v.finished }) : '',
    });
    if (feelings.length) text += ` · ${t('wb.reflection.feelings', { list: feelings.join(', ') })}`;
    return text;
  };
}

export function FactLine({ fact }: { fact: RecapFact }) {
  const text = useFactText()(fact);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }} testID={`fact-${fact.id}`}>
      <Icon name={ICONS[fact.category] || 'ellipse-outline'} size={18} color="textSecondary" />
      <AppText variant="small" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
