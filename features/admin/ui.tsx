/**
 * Building blocks for admin center pages: page frame, panels, KPI tiles,
 * responsive tables (columns on wide screens, cards on phones), status pills,
 * key-value lists and one place that turns API errors into the right prompt.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Button, Chip, EmptyState, Icon, IconName, Press, Skeleton, useLayout } from '@/design';
import { useT } from '@/i18n';

import { errorCode } from './api';
import { useAdmin } from './AdminProvider';
import { useAdminColors } from './theme';

// ---------- Formatting ----------
export function useFmt() {
  const { formatDate, formatTime, locale } = useT();
  const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : new Intl.NumberFormat(locale).format(n));
  const compact = (n: number | null | undefined) => (n === null || n === undefined ? '—' : new Intl.NumberFormat(locale, { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n));
  const money = (minor: number | null | undefined, currency = 'GEL') => (minor === null || minor === undefined ? '—' : `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)} ${currency}`);
  const usd = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `$${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`);
  const date = (ms: number | null | undefined) => (ms ? formatDate(ms, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const day = (iso: string) => formatDate(Date.parse(`${iso}T12:00:00Z`), { day: 'numeric', month: 'short' });
  const dateTime = (ms: number | null | undefined) => (ms ? `${formatDate(ms, { day: 'numeric', month: 'short' })} ${formatTime(ms)}` : '—');
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v)}%`);
  const minutes = (m: number | null | undefined) => {
    if (m === null || m === undefined) return '—';
    if (m < 60) return `${Math.round(m)} min`;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(m / 60)} h`;
  };
  return { num, compact, money, usd, date, day, dateTime, pct, minutes };
}

// ---------- Page frame ----------
/**
 * `scroll={false}` gives the page the full height instead (for workspaces
 * whose columns scroll on their own); `maxWidth` widens the frame.
 */
export function AdminPage({ title, subtitle, actions, filters, children, testID, scroll = true, maxWidth = 1360 }: { title: string; subtitle?: string; actions?: React.ReactNode; filters?: React.ReactNode; children: React.ReactNode; testID?: string; scroll?: boolean; maxWidth?: number }) {
  const c = useAdminColors();
  const { isCompact } = useLayout();
  const pad = isCompact ? 16 : 28;
  const header = (
    <View style={{ gap: 12, marginBottom: 18 }}>
      <View style={{ flexDirection: isCompact ? 'column' : 'row', alignItems: isCompact ? 'stretch' : 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <AppText variant="title2" style={{ color: c.text }} accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" style={{ color: c.textSecondary }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {actions ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</View> : null}
      </View>
      {filters ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{filters}</View> : null}
    </View>
  );
  const body = (
    <View style={{ padding: pad, paddingBottom: scroll ? 48 : pad, width: '100%', maxWidth, alignSelf: 'center', flex: scroll ? undefined : 1, minHeight: 0 }}>
      {header}
      <View style={{ gap: 16, flex: scroll ? undefined : 1, minHeight: 0 }}>{children}</View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID={testID}>
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView> : body}
    </View>
  );
}

export function Panel({ title, subtitle, actions, children, padding = 18, testID, style }: { title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; padding?: number; testID?: string; style?: any }) {
  const c = useAdminColors();
  return (
    <View testID={testID} style={[{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding, gap: 12, minWidth: 0 }, style]}>
      {title || actions ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            {title ? (
              <AppText variant="bodyStrong" style={{ color: c.text }}>
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="caption" style={{ color: c.textMuted }}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {actions ? <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{actions}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Wrapping grid with a minimum column width. */
export function Grid({ min = 220, gap = 14, children }: { min?: number; gap?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginEnd: -0 }}>
      {items.map((child, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: min, minWidth: Math.min(min, 280) }}>
          {child}
        </View>
      ))}
    </View>
  );
}

// ---------- Figures ----------
export function KpiTile({ label, value, change, goodWhenUp = true, note, onPress, testID }: { label: string; value: string; change?: number | null; goodWhenUp?: boolean; note?: string; onPress?: () => void; testID?: string }) {
  const c = useAdminColors();
  const { t } = useT();
  const up = (change ?? 0) > 0;
  const flat = change === 0 || change === null || change === undefined;
  const good = flat ? null : up === goodWhenUp;
  const tile = (
    <View style={{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, gap: 6, minHeight: 112 }} testID={testID}>
      <AppText variant="small" style={{ color: c.textSecondary }} numberOfLines={2}>
        {label}
      </AppText>
      <AppText style={{ color: c.text, fontSize: value.length > 12 ? 20 : value.length > 8 ? 24 : 28, lineHeight: value.length > 12 ? 26 : value.length > 8 ? 30 : 34, fontWeight: '600' }}>
        {value}
      </AppText>
      {change === null ? (
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {t('ac.kpi.noPrevious')}
        </AppText>
      ) : change !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {!flat ? <Icon name={up ? 'arrow-up' : 'arrow-down'} size={14} color={good ? c.success : c.danger} /> : null}
          <AppText variant="caption" style={{ color: flat ? c.textMuted : good ? c.success : c.danger, fontWeight: '600' }}>
            {`${up ? '+' : ''}${change}%`}
          </AppText>
          <AppText variant="caption" style={{ color: c.textMuted }}>
            {t('ac.kpi.vsPrevious')}
          </AppText>
        </View>
      ) : null}
      {note ? (
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {tile}
    </Press>
  ) : (
    tile
  );
}

export type Tone = 'neutral' | 'good' | 'warning' | 'danger' | 'info' | 'brand';
export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = useAdminColors();
  const map: Record<Tone, [string, string]> = {
    neutral: [c.cardMuted, c.textSecondary],
    good: [c.successSoft, c.success],
    warning: [c.warningSoft, c.warning],
    danger: [c.dangerSoft, c.danger],
    info: [c.infoSoft, c.text],
    brand: [c.accent, c.accentText],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <AppText variant="caption" style={{ color: fg, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function KeyValues({ items }: { items: [string, React.ReactNode][] }) {
  const c = useAdminColors();
  return (
    <View style={{ gap: 8 }}>
      {items.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.border, paddingBottom: 8 }}>
          <AppText variant="small" style={{ color: c.textSecondary, flexShrink: 1 }}>
            {k}
          </AppText>
          {typeof v === 'string' || typeof v === 'number' ? (
            <AppText variant="smallStrong" style={{ color: c.text, flexShrink: 1, textAlign: 'right' }} selectable>
              {v}
            </AppText>
          ) : (
            <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{v}</View>
          )}
        </View>
      ))}
    </View>
  );
}

export function FilterChips<T extends string>({ options, value, onChange, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} testID={testID}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} testID={testID ? `${testID}-${o.value}` : undefined} />
      ))}
    </ScrollView>
  );
}

// ---------- Tables ----------
export interface Column<R> {
  key: string;
  label: string;
  flex?: number;
  width?: number;
  align?: 'left' | 'right';
  render?: (row: R) => React.ReactNode;
  /** Hidden on phones (the card shows the remaining columns). */
  wideOnly?: boolean;
}

export function DataTable<R>({ columns, rows, keyFor, onRowPress, empty, testID, rowTestID }: { columns: Column<R>[]; rows: R[]; keyFor: (r: R) => string; onRowPress?: (r: R) => void; empty?: string; testID?: string; rowTestID?: string }) {
  const c = useAdminColors();
  const { isCompact } = useLayout();
  const { t } = useT();
  if (!rows.length) return <EmptyState icon="file-tray-outline" title={empty || t('ac.common.empty')} />;
  const cell = (col: Column<R>, r: R) => {
    const v = col.render ? col.render(r) : (r as any)[col.key];
    return typeof v === 'string' || typeof v === 'number' ? (
      <AppText variant="small" style={{ color: c.text, textAlign: col.align === 'right' ? 'right' : 'left' }} numberOfLines={2}>
        {v === '' ? '—' : String(v)}
      </AppText>
    ) : (
      v ?? <AppText style={{ color: c.textMuted }}>—</AppText>
    );
  };
  if (isCompact) {
    return (
      <View style={{ gap: 10 }} testID={testID}>
        {rows.map((r) => {
          const [first, ...rest] = columns.filter((col) => !col.wideOnly);
          const content = (
            <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, gap: 8 }}>
              <View>{cell(first, r)}</View>
              {rest.map((col) => (
                <View key={col.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <AppText variant="caption" style={{ color: c.textMuted }}>
                    {col.label}
                  </AppText>
                  <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{cell(col, r)}</View>
                </View>
              ))}
            </View>
          );
          return onRowPress ? (
            <Press key={keyFor(r)} onPress={() => onRowPress(r)} accessibilityRole="button" testID={rowTestID}>
              {content}
            </Press>
          ) : (
            <View key={keyFor(r)} testID={rowTestID}>
              {content}
            </View>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 14, overflow: 'hidden', backgroundColor: c.card }} testID={testID}>
      <View style={{ flexDirection: 'row', backgroundColor: c.cardMuted, paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
        {columns.map((col) => (
          <View key={col.key} style={{ flex: col.width ? undefined : col.flex ?? 1, width: col.width, minWidth: 0 }}>
            <AppText variant="caption" style={{ color: c.textSecondary, fontWeight: '600', textAlign: col.align === 'right' ? 'right' : 'left' }} numberOfLines={1}>
              {col.label}
            </AppText>
          </View>
        ))}
      </View>
      {rows.map((r, i) => {
        const line = (
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 12, alignItems: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border }}>
            {columns.map((col) => (
              <View key={col.key} style={{ flex: col.width ? undefined : col.flex ?? 1, width: col.width, minWidth: 0, alignItems: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                {cell(col, r)}
              </View>
            ))}
          </View>
        );
        return onRowPress ? (
          <Press key={keyFor(r)} onPress={() => onRowPress(r)} accessibilityRole="button" testID={rowTestID}>
            {line}
          </Press>
        ) : (
          <View key={keyFor(r)} testID={rowTestID}>
            {line}
          </View>
        );
      })}
    </View>
  );
}

// ---------- Loading and errors ----------
/** Shows the right state for an admin request: loading, a confirmation prompt, no access, or an error. */
export function AdminState({ error, loading, hasData, onRetry, children }: { error: unknown; loading: boolean; hasData: boolean; onRetry: () => void; children: React.ReactNode }) {
  const { t } = useT();
  const { confirmIdentity } = useAdmin();
  const router = useRouter();
  if (error) {
    const code = errorCode(error);
    if (code === 'step_up_required' || code === 'mfa_code_required') {
      return (
        <Panel>
          <EmptyState icon="shield-checkmark-outline" title={t('ac.stepUp.needed')} body={t('ac.stepUp.neededBody')} action={<Button label={t('ac.stepUp.confirm')} onPress={async () => (await confirmIdentity()) && onRetry()} testID="admin-state-step-up" />} />
        </Panel>
      );
    }
    if (code === 'mfa_setup_required') {
      return (
        <Panel>
          <EmptyState icon="key-outline" title={t('ac.mfa.requiredTitle')} body={t('ac.mfa.requiredBody')} action={<Button label={t('ac.mfa.setUp')} onPress={() => router.push('/admin/me' as any)} />} />
        </Panel>
      );
    }
    if (code === 'forbidden') return <Panel><EmptyState icon="lock-closed-outline" title={t('ac.common.noAccess')} /></Panel>;
    if (code === 'feature_disabled') return <Panel><EmptyState icon="toggle-outline" title={t('ac.protected.off')} body={t('ac.protected.offBody')} /></Panel>;
    return (
      <Panel>
        <EmptyState icon="cloud-offline-outline" title={t('ac.common.loadFailed')} body={code} action={<Button label={t('common.retry')} variant="secondary" onPress={onRetry} />} />
      </Panel>
    );
  }
  if (loading && !hasData) {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton height={112} radius={16} />
        <Skeleton height={240} radius={16} />
      </View>
    );
  }
  return <View style={{ opacity: loading ? 0.6 : 1, gap: 16 }}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const c = useAdminColors();
  return (
    <AppText variant="label" style={{ color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 }}>
      {children}
    </AppText>
  );
}

/** A plain note shown at the top of pages that deal with sensitive areas. */
export function Note({ icon = 'information-circle-outline', children, tone = 'info' }: { icon?: IconName; children: string; tone?: 'info' | 'warning' }) {
  const c = useAdminColors();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: tone === 'warning' ? c.warningSoft : c.infoSoft, borderRadius: 12, padding: 12 }}>
      <Icon name={icon} size={18} color={tone === 'warning' ? c.warning : c.textSecondary} />
      <AppText variant="small" style={{ color: c.text, flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}
