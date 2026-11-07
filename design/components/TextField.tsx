import React, { forwardRef, useState } from 'react';
import { Platform, StyleProp, TextInput, TextInputProps, TextStyle, View, ViewStyle, type TextInputInstance } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';

import { useTheme } from '../ThemeProvider';
import { radius } from '../tokens';
import { TextVariant } from '../typography';
import { AppText, useTextStyle } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  variant?: TextVariant;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  bare?: boolean;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, helper, error, variant = 'body', containerStyle, inputStyle, bare, multiline, onFocus, onBlur, ...rest },
  ref
) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const text = useTextStyle(variant);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <AppText variant="smallStrong" color="textSecondary">
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.brand}
        cursorColor={colors.primary}
        accessibilityLabel={label ?? rest.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          text,
          {
            color: colors.text,
            textAlign: isRTL ? 'right' : 'left',
            textAlignVertical: multiline ? 'top' : 'center',
          },
          bare
            ? { padding: 0 }
            : {
                minHeight: multiline ? 120 : 50,
                paddingHorizontal: 16,
                paddingVertical: multiline ? 14 : 12,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: error ? colors.danger : focused ? colors.brand : colors.border,
              },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
          inputStyle,
        ]}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="textTertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});
