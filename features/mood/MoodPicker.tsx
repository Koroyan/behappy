import React from 'react';
import { View } from 'react-native';

import { AppText, MoodGlyph, Press, radius, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import type { MoodLevel } from '@/lib/storage/journal';

/** Five-step mood picker: glyph + label, radio semantics, large targets. */
export function MoodPicker({ value, onChange, size = 'md' }: { value?: MoodLevel; onChange: (m: MoodLevel) => void; size?: 'sm' | 'md' }) {
  const { tl, t } = useT();
  const { colors } = useTheme();
  const { width } = useLayout();
  const labels = tl('mood.levels');
  const glyph = size === 'sm' ? 34 : width < 360 ? 38 : 46;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('mood.question')} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
      {([0, 1, 2, 3, 4] as MoodLevel[]).map((level) => {
        const selected = value === level;
        return (
          <Press
            key={level}
            onPress={() => onChange(level)}
            haptic
            feedback="scale"
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[level]}
            testID={`mood-${level}`}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: radius.lg,
              backgroundColor: selected ? colors.primarySoft : 'transparent',
            }}
          >
            <MoodGlyph level={level} size={glyph} selected={selected} />
            <AppText variant="caption" color={selected ? 'text' : 'textSecondary'} numberOfLines={1} align="center" style={{ fontSize: size === 'sm' ? 11.5 : 12.5 }}>
              {labels[level]}
            </AppText>
          </Press>
        );
      })}
    </View>
  );
}
