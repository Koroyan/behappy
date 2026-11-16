/**
 * Shared pieces of My Programs: the program card used on the Programs
 * screen and Today, and small helpers for names and tones.
 */
import React from 'react';
import { View } from 'react-native';

import { AppText, Badge, Card, Icon, IconName, ProgressBar, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { ACTIVITIES, ActivityKind, PROGRAM_DAYS, ProgramDef, ProgramRun, RunState } from '@/lib/wellbeing/programs';

const SOFT = { primary: 'primarySoft', peach: 'peachSoft', lavender: 'lavenderSoft', gold: 'goldSoft', sage: 'sageSoft' } as const;
const INK = { primary: 'onPrimarySoft', peach: 'onPeachSoft', lavender: 'onLavenderSoft', gold: 'onGoldSoft', sage: 'onPrimarySoft' } as const;

export function ProgramIcon({ def, size = 44 }: { def: ProgramDef; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: colors[SOFT[def.tone]], alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={def.icon as IconName} size={Math.round(size * 0.5)} color={INK[def.tone]} />
    </View>
  );
}

export const activityIcon = (k: ActivityKind) => ACTIVITIES[k].icon as IconName;

/**
 * A program as a card: name, what it is, and where the person is in it
 * (day, progress) when there is a run.
 */
export function ProgramCard({ def, run, state, onPress, testID, note }: { def: ProgramDef; run?: ProgramRun | null; state?: RunState | null; onPress: () => void; testID?: string; note?: string }) {
  const { t } = useT();
  const status = run?.status;
  const label = t(`jr.programs.defs.${def.id}.title`);
  return (
    <Card padding={18} onPress={onPress} accessibilityLabel={`${label}. ${t(`jr.programs.defs.${def.id}.short`)}`} testID={testID}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <ProgramIcon def={def} />
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
              {label}
            </AppText>
            {status === 'active' ? <Badge label={t('jr.programs.statusActive')} tone="primary" /> : status === 'paused' ? <Badge label={t('jr.programs.statusPaused')} tone="gold" /> : status === 'completed' ? <Badge label={t('jr.programs.statusDone')} tone="success" icon="checkmark" /> : null}
          </View>
          <AppText variant="small" color="textSecondary" numberOfLines={3}>
            {t(`jr.programs.defs.${def.id}.short`)}
          </AppText>
          {run && state && (status === 'active' || status === 'paused') ? (
            <View style={{ marginTop: space[2], gap: 6 }}>
              <ProgressBar value={state.done / PROGRAM_DAYS} label={t('jr.programs.progress', { done: state.done, total: PROGRAM_DAYS })} />
              <AppText variant="caption" color="textSecondary">
                {state.current ? t('jr.programs.dayOf', { n: state.current, total: PROGRAM_DAYS }) : t('jr.programs.allDone')}
                {state.current && status === 'active' ? ` · ${t(`jr.programs.defs.${def.id}.days.d${state.current}.title`)}` : ''}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
              {t('jr.programs.perDay', { n: def.minutes })}
            </AppText>
          )}
          {note ? (
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
              {note}
            </AppText>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      </View>
    </Card>
  );
}
