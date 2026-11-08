/**
 * Small building blocks: Chip, Badge, Divider, SectionHeader, ListRow,
 * Banner, EmptyState, ProgressBar, Toggle, Segmented, Avatar, Skeleton.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleProp, Switch, View, ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { ColorRole, Palette, radius, space } from '../tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { Press } from './Press';

// ---------- Chip ----------
export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'primary' | 'peach' | 'lavender' | 'gold' | 'sage';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Action chips (e.g. conversation starters) are buttons, not toggles. */
  action?: boolean;
}

export function Chip({ label, selected, onPress, icon, tone = 'primary', style, testID, action }: ChipProps) {
  const { colors } = useTheme();
  const soft: Record<string, ColorRole> = { primary: 'primarySoft', peach: 'peachSoft', lavender: 'lavenderSoft', gold: 'goldSoft', sage: 'sageSoft' };
  const ink: Record<string, ColorRole> = { primary: 'onPrimarySoft', peach: 'onPeachSoft', lavender: 'onLavenderSoft', gold: 'onGoldSoft', sage: 'onPrimarySoft' };
  return (
    <Press
      onPress={onPress}
      accessibilityRole={action ? 'button' : 'checkbox'}
      accessibilityState={action ? undefined : { checked: Boolean(selected) }}
      accessibilityLabel={label}
      focusRadius={radius.pill}
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 40,
          maxWidth: '100%',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors[soft[tone]] : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors[soft[tone]] : colors.border,
        },
        style,
      ]}
    >
      {selected ? <Icon name="checkmark" size={16} color={ink[tone]} /> : icon ? <Icon name={icon} size={16} color="textSecondary" /> : null}
      <AppText variant="callout" color={selected ? (ink[tone] as any) : 'text'} style={{ flexShrink: 1 }}>
        {label}
      </AppText>
    </Press>
  );
}

// ---------- Badge ----------
export function Badge({ label, tone = 'muted', icon }: { label: string; tone?: 'muted' | 'primary' | 'gold' | 'peach' | 'lavender' | 'danger' | 'success'; icon?: IconName }) {
  const { colors } = useTheme();
  const map: Record<string, [ColorRole, ColorRole]> = {
    muted: ['surfaceMuted', 'textSecondary'],
    primary: ['primarySoft', 'onPrimarySoft'],
    gold: ['goldSoft', 'onGoldSoft'],
    peach: ['peachSoft', 'onPeachSoft'],
    lavender: ['lavenderSoft', 'onLavenderSoft'],
    danger: ['dangerSoft', 'onDangerSoft'],
    success: ['successSoft', 'success'],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors[bg] }}>
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <AppText variant="label" color={fg as any}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- Divider ----------
export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.divider, marginStart: inset }, style]} />;
}

// ---------- SectionHeader ----------
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: space[3] }, style]}>
      <View style={{ flex: 1 }}>
        <AppText variant="title2">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color="textSecondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Press onPress={onAction} accessibilityRole="link" style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <AppText variant="smallStrong" color="primary">
            {actionLabel}
          </AppText>
        </Press>
      ) : null}
    </View>
  );
}

// ---------- ListRow ----------
export interface ListRowProps {
  icon?: IconName;
  iconTone?: 'primary' | 'peach' | 'lavender' | 'gold' | 'sage' | 'muted' | 'danger';
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  testID?: string;
}

export function ListRow({ icon, iconTone = 'muted', title, subtitle, value, onPress, right, chevron = Boolean(onPress), destructive, testID }: ListRowProps) {
  const { colors } = useTheme();
  const toneBg: Record<string, ColorRole> = { primary: 'primarySoft', peach: 'peachSoft', lavender: 'lavenderSoft', gold: 'goldSoft', sage: 'sageSoft', muted: 'surfaceMuted', danger: 'dangerSoft' };
  const toneFg: Record<string, ColorRole> = { primary: 'onPrimarySoft', peach: 'onPeachSoft', lavender: 'onLavenderSoft', gold: 'onGoldSoft', sage: 'onPrimarySoft', muted: 'textSecondary', danger: 'onDangerSoft' };
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, minHeight: 56 }}>
      {icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors[toneBg[iconTone]] }}>
          <Icon name={icon} size={19} color={toneFg[iconTone]} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="callout" color={destructive ? 'danger' : 'text'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="small" color="textSecondary" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </AppText>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Press onPress={onPress} accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} testID={testID}>
      {content}
    </Press>
  );
}

// ---------- Banner ----------
export function Banner({ tone = 'info', icon, title, body, action }: { tone?: 'info' | 'warning' | 'test' | 'danger' | 'success'; icon?: IconName; title?: string; body: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const map = {
    info: [colors.infoSoft, 'text', 'information-circle-outline'],
    warning: [colors.warningSoft, 'onWarningSoft', 'alert-circle-outline'],
    test: [colors.goldSoft, 'onGoldSoft', 'flask-outline'],
    danger: [colors.dangerSoft, 'onDangerSoft', 'heart-outline'],
    success: [colors.successSoft, 'text', 'checkmark-circle-outline'],
  } as const;
  const [bg, fg, defaultIcon] = map[tone];
  return (
    <View accessibilityRole="summary" style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: bg, alignItems: 'flex-start' }}>
      <Icon name={icon ?? (defaultIcon as IconName)} size={20} color={fg as any} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <AppText variant="smallStrong" color={fg as any}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="small" color={fg as any}>
          {body}
        </AppText>
        {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
      </View>
    </View>
  );
}

// ---------- EmptyState ----------
export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Icon name={icon} size={28} color="onPrimarySoft" />
      </View>
      <AppText variant="title3" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="small" color="textSecondary" align="center" style={{ maxWidth: 420 }}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

// ---------- ProgressBar ----------
export function ProgressBar({ value, color, height = 6, label }: { value: number; color?: string; height?: number; label?: string }) {
  const { colors, reduceMotion } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, value));
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(clamped);
      return;
    }
    Animated.timing(anim, { toValue: clamped, duration: 500, useNativeDriver: false }).start();
  }, [clamped, anim, reduceMotion]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}
    >
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color ?? colors.brand, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

// ---------- Toggle ----------
export function Toggle({ value, onValueChange, label, testID }: { value: boolean; onValueChange: (v: boolean) => void; label: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      testID={testID}
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      thumbColor={Platform.OS === 'android' ? (value ? colors.surface : colors.surface) : undefined}
      {...(Platform.OS === 'web' ? ({ activeThumbColor: colors.surface } as any) : null)}
    />
  );
}

/** A switch with its visible label; the whole row toggles. */
export function ToggleRow({ value, onValueChange, label, testID }: { value: boolean; onValueChange: (v: boolean) => void; label: string; testID?: string }) {
  return (
    <Pressable onPress={() => onValueChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 }}>
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Toggle value={value} onValueChange={onValueChange} label={label} testID={testID} />
    </Pressable>
  );
}

// ---------- Segmented ----------
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, gap: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Press
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            feedback="none"
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText variant="smallStrong" color={active ? 'text' : 'textSecondary'} numberOfLines={1}>
              {o.label}
            </AppText>
          </Press>
        );
      })}
    </View>
  );
}

// ---------- Avatar ----------
export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const { colors } = useTheme();
  const initials = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
      {initials ? (
        <AppText variant={size > 50 ? 'title2' : 'bodyStrong'} color="onPrimarySoft">
          {initials}
        </AppText>
      ) : (
        <Icon name="person-outline" size={size * 0.45} color="onPrimarySoft" />
      )}
    </View>
  );
}

// ---------- Skeleton ----------
export function Skeleton({ height = 16, width = '100%', radius: r = 8, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, reduceMotion } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);
  return <Animated.View style={[{ height, width, borderRadius: r, backgroundColor: colors.surfaceSunken, opacity: pulse }, style]} />;
}
