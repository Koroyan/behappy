import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';

import { useTheme } from '../ThemeProvider';
import { Palette } from '../tokens';
import { resolveVariant, scriptForLanguage, TextVariant } from '../typography';
import { useLayout } from '../useLayout';

type TextColorRole = keyof Pick<
  Palette,
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'primary'
  | 'onPrimary'
  | 'onPrimarySoft'
  | 'danger'
  | 'onDangerSoft'
  | 'onPeachSoft'
  | 'onLavenderSoft'
  | 'onGoldSoft'
  | 'success'
  | 'brand'
  | 'onChatUser'
  | 'onChatAssistant'
>;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColorRole;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function useTextStyle(variant: TextVariant): TextStyle {
  const { language } = useLanguage();
  const { textScale } = useTheme();
  const { isDesktop } = useLayout();
  return resolveVariant(variant, scriptForLanguage(language), isDesktop, textScale);
}

export function AppText({ variant = 'body', color = 'text', align, style, children, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const base = useTextStyle(variant);
  const heading = variant === 'display' || variant === 'title1' || variant === 'title2' || variant === 'title3';
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      {...rest}
      style={[base, { color: colors[color], textAlign: align ?? (isRTL ? 'right' : undefined) }, style]}
    >
      {children}
    </Text>
  );
}
