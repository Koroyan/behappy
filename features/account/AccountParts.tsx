/**
 * Shared pieces for account screens: a password field with show/hide, a
 * 6-digit code field, and the gate shown where a registered account is needed
 * (community rooms, bookings, professional tools).
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, IconButton, space, TextField } from '@/design';
import type { TextFieldProps } from '@/design/components/TextField';
import { useT } from '@/i18n';

export function PasswordField(props: Omit<TextFieldProps, 'secureTextEntry'> & { testID?: string }) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <TextField
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={props.textContentType ?? 'password'}
        autoComplete={props.autoComplete ?? 'password'}
        containerStyle={[{ paddingEnd: 0 }, props.containerStyle]}
      />
      <View style={{ position: 'absolute', end: 4, top: props.label ? 30 : 6 }}>
        <IconButton icon={visible ? 'eye-off-outline' : 'eye-outline'} label={visible ? t('account.hidePassword') : t('account.showPassword')} onPress={() => setVisible((v) => !v)} size={40} />
      </View>
    </View>
  );
}

export function CodeField({ value, onChangeText, testID }: { value: string; onChangeText: (v: string) => void; testID?: string }) {
  const { t } = useT();
  return (
    <TextField
      label={t('account.code')}
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={6}
      variant="title2"
      inputStyle={{ letterSpacing: 6, textAlign: 'center' }}
      testID={testID}
    />
  );
}

/** Only internal paths are accepted as a return target. */
export const safeReturn = (value: unknown, fallback = '/account') => {
  const s = typeof value === 'string' ? value : '';
  return /^\/[A-Za-z0-9/_\-?=&.%]{0,200}$/.test(s) && !s.startsWith('//') ? s : fallback;
};

/** Shown instead of a feature that needs a registered account. */
export function AccountGate({ returnTo }: { returnTo: string }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <Card tone="lavender" padding={22} testID="account-gate">
      <View style={{ gap: space[2] }}>
        <AppText variant="title3">{t('account.requiredTitle')}</AppText>
        <AppText variant="small" color="textSecondary">
          {t('account.requiredBody')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[2] }}>
          <Button label={t('account.create')} icon="person-add-outline" onPress={() => router.push({ pathname: '/account/create', params: { returnTo } } as any)} testID="gate-create" />
          <Button label={t('account.signIn')} variant="outline" onPress={() => router.push({ pathname: '/account/sign-in', params: { returnTo } } as any)} testID="gate-sign-in" />
        </View>
      </View>
    </Card>
  );
}
