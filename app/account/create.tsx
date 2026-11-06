import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Screen, space, TextField, useFeedback } from '@/design';
import { CodeField, PasswordField, safeReturn } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { authErrorKey, resendCode, startRegistration, verifyEmail } from '@/lib/api/auth';

/** Two steps: email + password, then the 6-digit code from the email. */
export default function CreateAccount() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = safeReturn(params.returnTo);
  const { t } = useT();
  const { language } = useLanguage();
  const { refresh } = useAccount();
  const identity = useIdentity();
  const { toast } = useFeedback();
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const done = async () => {
    await refresh();
    toast(t('account.created'));
    router.dismissTo(returnTo as any);
  };

  const send = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await startRegistration(email.trim(), password, language);
      setStep('code');
    } catch (e) {
      setError(t(authErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await verifyEmail(code);
      await done();
    } catch (e) {
      setError(t(authErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(undefined);
    try {
      await resendCode(language);
      toast(t('account.resent'));
    } catch (e) {
      setError(t(authErrorKey(e)));
    }
  };

  if (identity.registered) {
    return (
      <Screen title={t('account.createTitle')} back width="reading" testID="screen-account-create">
        <Banner tone="success" body={t('account.signedInAs', { email: identity.email || '' })} action={<Button label={t('common.continue')} onPress={() => router.dismissTo(returnTo as any)} />} />
      </Screen>
    );
  }

  return (
    <Screen title={step === 'details' ? t('account.createTitle') : t('account.verifyTitle')} back width="reading" keyboard testID="screen-account-create">
      <Card padding={22}>
        {step === 'details' ? (
          <View style={{ gap: space[4] }}>
            <AppText variant="body" color="textSecondary">
              {t('account.createBody')}
            </AppText>
            {!identity.emailAvailable ? <Banner tone="warning" body={t('account.errors.email_unavailable')} /> : null}
            <TextField label={t('account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" testID="create-email" />
            <PasswordField label={t('account.password')} value={password} onChangeText={setPassword} helper={t('account.passwordHint')} autoComplete="new-password" textContentType="newPassword" testID="create-password" />
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={t('account.createCta')} onPress={send} loading={busy} disabled={!email.includes('@') || password.length < 10} fullWidth testID="create-send" />
          </View>
        ) : (
          <View style={{ gap: space[4] }}>
            <AppText variant="body" color="textSecondary">
              {t('account.verifyBody', { email: email.trim() })}
            </AppText>
            {identity.testCode ? <Banner tone="test" body={t('account.testCode', { code: identity.testCode })} /> : null}
            <CodeField value={code} onChangeText={setCode} testID="create-code" />
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={t('account.verifyCta')} onPress={confirmCode} loading={busy} disabled={code.length !== 6} fullWidth testID="create-confirm" />
            <Button label={t('account.resend')} variant="ghost" onPress={resend} />
          </View>
        )}
      </Card>
    </Screen>
  );
}
