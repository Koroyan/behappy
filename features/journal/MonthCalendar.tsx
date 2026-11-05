import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, IconButton, Press, radius, useTheme } from '@/design';
import { useT } from '@/i18n';
import { dayKey } from '@/lib/storage/json';

/** Month grid. Days with entries get a dot; tapping a day filters the list. */
export function MonthCalendar({ markedDays, selected, onSelect }: { markedDays: Set<string>; selected?: string | null; onSelect: (day: string | null) => void }) {
  const { colors } = useTheme();
  const { formatDate, t } = useT();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { weeks, weekdayLabels } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // Monday-first weeks (common in ka/ru/hy/most of Europe).
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [...Array(offset).fill(null)];
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const monday = new Date(2024, 0, 1); // a Monday
    const labels = Array.from({ length: 7 }, (_, i) => formatDate(new Date(monday.getTime() + i * 86400000), { weekday: 'narrow' }));
    return { weeks: rows, weekdayLabels: labels };
  }, [cursor, formatDate]);

  const today = dayKey();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <IconButton icon="chevron-back" label={t('common.previous')} size={36} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} />
        <AppText variant="smallStrong">{formatDate(cursor, { month: 'long', year: 'numeric' })}</AppText>
        <IconButton icon="chevron-forward" label={t('common.next')} size={36} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} />
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {weekdayLabels.map((l, i) => (
          <AppText key={i} variant="caption" color="textTertiary" align="center" style={{ flex: 1 }}>
            {l}
          </AppText>
        ))}
      </View>
      {weeks.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((d, ci) => {
            if (!d) return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
            const key = dayKey(d);
            const marked = markedDays.has(key);
            const isSel = selected === key;
            const isToday = key === today;
            return (
              <Press
                key={ci}
                onPress={() => onSelect(isSel ? null : key)}
                accessibilityLabel={formatDate(d, { day: 'numeric', month: 'long' })}
                accessibilityState={{ selected: isSel }}
                feedback="opacity"
                style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? colors.primary : 'transparent',
                    borderWidth: isToday && !isSel ? 1 : 0,
                    borderColor: colors.brand,
                  }}
                >
                  <AppText variant="small" color={isSel ? 'onPrimary' : 'text'}>
                    {d.getDate()}
                  </AppText>
                </View>
                <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: marked ? (isSel ? colors.primary : colors.brand) : 'transparent' }} />
              </Press>
            );
          })}
        </View>
      ))}
    </View>
  );
}
