/**
 * Admin charts (react-native-svg), following the BeHappy data-viz rules:
 * one axis, thin marks (2px lines, bars at most 24px with 4px rounded ends
 * on the data side), hairline solid gridlines, a 10% area wash, end dots
 * with a 2px surface ring, a value at the line's end only, a legend for two
 * or more series, a crosshair tooltip on trends and per-bar tooltips, and a
 * table view for every chart (tooltips never gate a value). Series colours
 * come from the validated palette in theme.ts and follow the series, never
 * its rank.
 */
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, Button } from '@/design';
import { useT } from '@/i18n';

import { useAdminColors } from './theme';
import { useFmt } from './ui';

export interface Point {
  x: string; // ISO day
  y: number | null;
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

/** Top-rounded bar path: square at the baseline, 4px radius at the data end. */
const barPath = (x: number, y: number, w: number, h: number, r = 4) => {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return { width, onLayout };
}

function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const c = useAdminColors();
  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.cardMuted, paddingHorizontal: 10, paddingVertical: 6 }}>
        {head.map((h, i) => (
          <AppText key={i} variant="caption" style={{ flex: 1, color: c.textSecondary, fontWeight: '600', textAlign: i === 0 ? 'left' : 'right' }}>
            {h}
          </AppText>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: c.border }}>
          {r.map((cell, j) => (
            <AppText key={j} variant="caption" style={{ flex: 1, color: c.text, textAlign: j === 0 ? 'left' : 'right', fontVariant: ['tabular-nums'] }}>
              {String(cell)}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

function TableToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useT();
  return <Button label={t(open ? 'ac.chart.hideTable' : 'ac.chart.showTable')} variant="ghost" size="sm" icon="list-outline" onPress={onToggle} style={{ alignSelf: 'flex-start' }} />;
}

/** Pointer/touch position along x, for the crosshair. */
function useHover(count: number, left: number, step: number) {
  const [index, setIndex] = useState<number | null>(null);
  const at = (x: number) => {
    if (!count) return;
    const i = Math.max(0, Math.min(count - 1, Math.round((x - left) / (step || 1))));
    setIndex(i);
  };
  const handlers: any = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: any) => at(e.nativeEvent.locationX),
    onResponderMove: (e: any) => at(e.nativeEvent.locationX),
    onResponderRelease: () => setTimeout(() => setIndex(null), 1800),
    ...(Platform.OS === 'web'
      ? {
          onPointerMove: (e: any) => at(e.nativeEvent.offsetX ?? e.nativeEvent.locationX),
          onPointerLeave: () => setIndex(null),
        }
      : {}),
  };
  return { index, handlers };
}

function Tooltip({ x, width, lines, title }: { x: number; width: number; title: string; lines: { color?: string; value: string; label?: string }[] }) {
  const c = useAdminColors();
  const w = 168;
  const left = Math.max(0, Math.min(width - w, x + 12 > width - w ? x - w - 12 : x + 12));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 4, left, width: w, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 8, gap: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <AppText variant="caption" style={{ color: c.textMuted }}>
        {title}
      </AppText>
      {lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {l.color ? <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: l.color }} /> : null}
          <AppText variant="smallStrong" style={{ color: c.text }}>
            {l.value}
          </AppText>
          {l.label ? (
            <AppText variant="caption" style={{ color: c.textSecondary, flexShrink: 1 }} numberOfLines={1}>
              {l.label}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** One series over days: a line with a soft area, or columns. */
export function TrendChart({ data, format, kind = 'line', height = 190, valueLabel, testID }: { data: Point[]; format: (v: number) => string; kind?: 'line' | 'bars'; height?: number; valueLabel: string; testID?: string }) {
  const c = useAdminColors();
  const f = useFmt();
  const [table, setTable] = useState(false);
  const { width, onLayout } = useWidth();
  const color = c.series[0];
  const left = 44;
  const right = kind === 'line' ? 56 : 12;
  const top = 12;
  const bottom = 26;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const values = data.map((d) => d.y ?? 0);
  const yMax = niceMax(Math.max(0, ...values));
  const n = data.length;
  const step = kind === 'bars' ? plotW / Math.max(1, n) : plotW / Math.max(1, n - 1);
  const xAt = (i: number) => (kind === 'bars' ? left + step * i + step / 2 : left + step * i);
  const yAt = (v: number) => top + plotH * (1 - v / yMax);
  const { index, handlers } = useHover(n, kind === 'bars' ? left + step / 2 : left, step);

  const paths = useMemo(() => {
    if (kind !== 'line' || !width) return { line: '', area: '' };
    let line = '';
    let started = false;
    data.forEach((d, i) => {
      if (d.y === null) {
        started = false;
        return;
      }
      line += `${started ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(d.y).toFixed(1)}`;
      started = true;
    });
    const area = n > 1 ? `${line}L${xAt(n - 1)},${top + plotH}L${xAt(0)},${top + plotH}Z` : '';
    return { line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, yMax, kind]);

  const ticks = [0, yMax / 2, yMax];
  const lastIdx = (() => {
    for (let i = n - 1; i >= 0; i -= 1) if (data[i].y !== null) return i;
    return -1;
  })();
  const xLabels = n ? [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i) : [];
  const barW = Math.max(2, Math.min(24, step - 2));

  return (
    <View style={{ gap: 8 }} testID={testID}>
      <View onLayout={onLayout} style={{ height, width: '100%' }} accessibilityLabel={valueLabel}>
        {width ? (
          <View style={{ position: 'absolute', inset: 0 } as any} {...handlers}>
            <Svg width={width} height={height}>
              {ticks.map((tk, i) => (
                <G key={i}>
                  <Line x1={left} x2={width - right} y1={yAt(tk)} y2={yAt(tk)} stroke={i === 0 ? c.axis : c.grid} strokeWidth={1} />
                  <SvgText x={left - 8} y={yAt(tk) + 4} fontSize={11} fill={c.chartInk} textAnchor="end">
                    {format(tk)}
                  </SvgText>
                </G>
              ))}
              {xLabels.map((i) => (
                <SvgText key={i} x={Math.min(Math.max(xAt(i), left + 18), width - right - 18)} y={height - 6} fontSize={11} fill={c.chartInk} textAnchor="middle">
                  {f.day(data[i].x)}
                </SvgText>
              ))}
              {kind === 'line' ? (
                <>
                  {paths.area ? <Path d={paths.area} fill={color} opacity={0.1} /> : null}
                  <Path d={paths.line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  {lastIdx >= 0 ? (
                    <>
                      <Circle cx={xAt(lastIdx)} cy={yAt(data[lastIdx].y as number)} r={6} fill={c.card} />
                      <Circle cx={xAt(lastIdx)} cy={yAt(data[lastIdx].y as number)} r={4} fill={color} />
                      <SvgText x={xAt(lastIdx) + 8} y={yAt(data[lastIdx].y as number) + 4} fontSize={12} fontWeight="600" fill={c.text}>
                        {format(data[lastIdx].y as number)}
                      </SvgText>
                    </>
                  ) : null}
                </>
              ) : (
                data.map((d, i) => {
                  const v = d.y ?? 0;
                  const h = plotH * (v / yMax);
                  return <Path key={i} d={barPath(xAt(i) - barW / 2, top + plotH - h, barW, h)} fill={color} opacity={index === null || index === i ? 1 : 0.55} />;
                })
              )}
              {index !== null && kind === 'line' ? <Line x1={xAt(index)} x2={xAt(index)} y1={top} y2={top + plotH} stroke={c.axis} strokeWidth={1} /> : null}
              {index !== null && kind === 'line' && data[index].y !== null ? (
                <>
                  <Circle cx={xAt(index)} cy={yAt(data[index].y as number)} r={6} fill={c.card} />
                  <Circle cx={xAt(index)} cy={yAt(data[index].y as number)} r={4} fill={color} />
                </>
              ) : null}
            </Svg>
            {index !== null ? <Tooltip x={xAt(index)} width={width} title={f.day(data[index].x)} lines={[{ value: data[index].y === null ? '—' : format(data[index].y as number), label: valueLabel }]} /> : null}
          </View>
        ) : null}
      </View>
      <TableToggle open={table} onToggle={() => setTable((v) => !v)} />
      {table ? <TableView head={['', valueLabel]} rows={data.map((d) => [f.day(d.x), d.y === null ? '—' : format(d.y)])} /> : null}
    </View>
  );
}

/** Up to three series stacked per day, with a 2px surface gap between segments and a legend. */
export function StackedColumns({ data, series, format, height = 200, testID }: { data: { x: string; values: number[] }[]; series: string[]; format: (v: number) => string; height?: number; testID?: string }) {
  const c = useAdminColors();
  const f = useFmt();
  const { t } = useT();
  const [table, setTable] = useState(false);
  const { width, onLayout } = useWidth();
  const left = 52;
  const right = 12;
  const top = 12;
  const bottom = 26;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0));
  const yMax = niceMax(Math.max(0, ...totals));
  const n = data.length;
  const step = plotW / Math.max(1, n);
  const xAt = (i: number) => left + step * i + step / 2;
  const barW = Math.max(2, Math.min(24, step - 2));
  const { index, handlers } = useHover(n, left + step / 2, step);
  const ticks = [0, yMax / 2, yMax];
  const xLabels = n ? [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i) : [];
  return (
    <View style={{ gap: 8 }} testID={testID}>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }} accessibilityRole="list">
        {series.map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.series[i] }} />
            <AppText variant="caption" style={{ color: c.textSecondary }}>
              {s}
            </AppText>
          </View>
        ))}
      </View>
      <View onLayout={onLayout} style={{ height, width: '100%' }}>
        {width ? (
          <View style={{ position: 'absolute', inset: 0 } as any} {...handlers}>
            <Svg width={width} height={height}>
              {ticks.map((tk, i) => (
                <G key={i}>
                  <Line x1={left} x2={width - right} y1={top + plotH * (1 - tk / yMax)} y2={top + plotH * (1 - tk / yMax)} stroke={i === 0 ? c.axis : c.grid} strokeWidth={1} />
                  <SvgText x={left - 8} y={top + plotH * (1 - tk / yMax) + 4} fontSize={11} fill={c.chartInk} textAnchor="end">
                    {format(tk)}
                  </SvgText>
                </G>
              ))}
              {xLabels.map((i) => (
                <SvgText key={i} x={Math.min(Math.max(xAt(i), left + 18), width - right - 18)} y={height - 6} fontSize={11} fill={c.chartInk} textAnchor="middle">
                  {f.day(data[i].x)}
                </SvgText>
              ))}
              {data.map((d, i) => {
                let acc = 0;
                const segs = d.values.map((v, s) => {
                  const h = plotH * (v / yMax);
                  const y = top + plotH - acc - h;
                  acc += h;
                  if (v <= 0) return null;
                  const isTop = d.values.slice(s + 1).every((x) => x <= 0);
                  const gap = isTop ? 0 : 2;
                  return isTop ? (
                    <Path key={s} d={barPath(xAt(i) - barW / 2, y, barW, h)} fill={c.series[s]} />
                  ) : (
                    <Rect key={s} x={xAt(i) - barW / 2} y={y + gap} width={barW} height={Math.max(0, h - gap)} fill={c.series[s]} />
                  );
                });
                return (
                  <G key={i} opacity={index === null || index === i ? 1 : 0.55}>
                    {segs}
                  </G>
                );
              })}
            </Svg>
            {index !== null ? (
              <Tooltip
                x={xAt(index)}
                width={width}
                title={f.day(data[index].x)}
                lines={[...series.map((s, i) => ({ color: c.series[i], value: format(data[index].values[i] || 0), label: s })), { value: format(totals[index]), label: t('ac.chart.total') }]}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      <TableToggle open={table} onToggle={() => setTable((v) => !v)} />
      {table ? <TableView head={['', ...series, t('ac.chart.total')]} rows={data.map((d, i) => [f.day(d.x), ...d.values.map(format), format(totals[i])])} /> : null}
    </View>
  );
}

/** Ranked horizontal bars, one hue, value at the tip. Suppressed rows show "hidden". */
export function RankedBars({ items, format, testID }: { items: { label: string; value: number | null; note?: string }[]; format: (v: number) => string; testID?: string }) {
  const c = useAdminColors();
  const { t } = useT();
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <View style={{ gap: 10 }} testID={testID}>
      {items.map((it) => (
        <View key={it.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <AppText variant="small" style={{ color: c.text, flexShrink: 1 }} numberOfLines={1}>
              {it.label}
            </AppText>
            <AppText variant="smallStrong" style={{ color: c.text }}>
              {it.value === null ? t('ac.common.hidden') : format(it.value)}
            </AppText>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.cardMuted, overflow: 'hidden' }}>
            {it.value ? <View style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: c.series[0] }} /> : null}
          </View>
          {it.note ? (
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {it.note}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Retention cohorts: a table whose cells are shaded by value (one hue), numbers always printed. */
export function CohortTable({ cohorts, weekLabel, sizeLabel }: { cohorts: { cohort: string; size: number | null; suppressed: boolean; weekly: (number | null)[] }[]; weekLabel: (w: number) => string; sizeLabel: string }) {
  const c = useAdminColors();
  const f = useFmt();
  const { t } = useT();
  const weeks = Math.max(0, ...cohorts.map((x) => x.weekly.length));
  const shade = (v: number) => {
    const a = Math.max(0.08, Math.min(1, v / 60));
    return { bg: `${c.series[0]}${Math.round(a * 255).toString(16).padStart(2, '0')}`, ink: a > 0.55 ? '#ffffff' : c.text };
  };
  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.cardMuted }}>
        <AppText variant="caption" style={{ width: 92, padding: 8, color: c.textSecondary, fontWeight: '600' }}>
          {t('ac.analytics.cohort')}
        </AppText>
        <AppText variant="caption" style={{ width: 60, padding: 8, color: c.textSecondary, fontWeight: '600', textAlign: 'right' }}>
          {sizeLabel}
        </AppText>
        {Array.from({ length: weeks }).map((_, i) => (
          <AppText key={i} variant="caption" style={{ flex: 1, minWidth: 44, padding: 8, color: c.textSecondary, fontWeight: '600', textAlign: 'center' }}>
            {weekLabel(i + 1)}
          </AppText>
        ))}
      </View>
      {cohorts.map((row) => (
        <View key={row.cohort} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border }}>
          <AppText variant="caption" style={{ width: 92, padding: 8, color: c.text }}>
            {f.day(row.cohort)}
          </AppText>
          <AppText variant="caption" style={{ width: 60, padding: 8, color: c.text, textAlign: 'right' }}>
            {row.suppressed ? t('ac.common.hidden') : f.num(row.size)}
          </AppText>
          {Array.from({ length: weeks }).map((_, i) => {
            const v = row.weekly[i];
            if (v === undefined) return <View key={i} style={{ flex: 1, minWidth: 44 }} />;
            const s = v === null ? null : shade(v);
            return (
              <View key={i} style={{ flex: 1, minWidth: 44, margin: 2, borderRadius: 6, backgroundColor: s ? s.bg : c.cardMuted, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                <AppText variant="caption" style={{ color: s ? s.ink : c.textMuted, fontWeight: '600' }}>
                  {v === null ? '—' : f.pct(v)}
                </AppText>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
