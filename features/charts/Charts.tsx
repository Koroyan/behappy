/**
 * Small, accessible SVG charts. Meaning is carried by labels and position,
 * never by color alone; mood is a single-hue scale, never red-vs-green.
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppText, useTheme } from '@/design';
import { useT } from '@/i18n';

export interface MoodPoint {
  day: string; // YYYY-MM-DD
  value: number | null; // 0–4
}

export function MoodChart({ points, height = 168, label }: { points: MoodPoint[]; height?: number; label: string }) {
  const { colors } = useTheme();
  const { tl, formatDate } = useT();
  const [width, setWidth] = useState(0);
  const levels = tl('mood.levels');
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / 4) * innerH;

  // Line segments only between consecutive days that both have data.
  let d = '';
  points.forEach((p, i) => {
    if (p.value === null) return;
    const prev = points[i - 1];
    d += `${prev && prev.value !== null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
  });

  const withData = points.filter((p) => p.value !== null);
  const avg = withData.length ? withData.reduce((s, p) => s + (p.value as number), 0) / withData.length : null;
  const summary = avg === null ? '' : `${label}. ${levels[Math.round(avg)] ?? ''}.`;
  const tickEvery = n > 45 ? 15 : n > 14 ? 7 : n > 7 ? 2 : 1;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary || label}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ justifyContent: 'space-between', paddingTop: padT - 6, paddingBottom: padB - 6, marginEnd: 6 }}>
          {[4, 2, 0].map((l) => (
            <AppText key={l} variant="caption" color="textTertiary" style={{ fontSize: 11 }}>
              {levels[l]}
            </AppText>
          ))}
        </View>
        <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              {[0, 1, 2, 3, 4].map((l) => (
                <Line key={l} x1={padL} x2={width - padR} y1={y(l)} y2={y(l)} stroke={colors.divider} strokeWidth={1} strokeDasharray={l === 2 ? '0' : '3 4'} />
              ))}
              {d ? <Path d={d} stroke={colors.brand} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {points.map((p, i) =>
                p.value === null ? null : <Circle key={p.day} cx={x(i)} cy={y(p.value)} r={n > 40 ? 2.5 : 4} fill={colors.surface} stroke={colors.brand} strokeWidth={2} />
              )}
            </Svg>
          ) : (
            <View style={{ height }} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -padB + 4 }}>
            {points
              .filter((_, i) => i % tickEvery === 0 || i === n - 1)
              .slice(0, 8)
              .map((p) => (
                <AppText key={p.day} variant="caption" color="textTertiary" style={{ fontSize: 11 }}>
                  {formatDate(`${p.day}T12:00:00`, { day: 'numeric', month: 'short' })}
                </AppText>
              ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function BarList({ items, max }: { items: { label: string; value: number }[]; max?: number }) {
  const { colors } = useTheme();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 12 }}>
      {items.map((item, idx) => (
        <View key={item.label} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <AppText variant="small">{item.label}</AppText>
            <AppText variant="smallStrong">{item.value}</AppText>
          </View>
          <Svg width="100%" height={8}>
            <Rect x={0} y={0} width="100%" height={8} rx={4} fill={colors.surfaceSunken} />
            <Rect x={0} y={0} width={`${Math.max(2, (item.value / top) * 100)}%`} height={8} rx={4} fill={colors.chart[idx % colors.chart.length]} />
          </Svg>
        </View>
      ))}
    </View>
  );
}
