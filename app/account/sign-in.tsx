import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Screen, space, TextField, useFeedback } from '@/design';
import { CodeField, PasswordField, safeReturn } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { authErrorKey, forgotPassword, resetPassword, signIn } from '@/lib/api/auth';

type Step = 'sign-in' | 'forgot' | 'reset';

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = safeReturn(params.returnTo);
  const { t } = useT();
  const { language } = useLanguage();
  const { refresh } = useAccount();
  const identity = useIdentity();
  const { toast } = useFeedback();
  const [step, setStep] = useState<Step>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = async (fn: () => Promise<void>) => {
    setError(undefined);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(t(authErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await refresh();
    toast(t('account.signedIn'));
    router.dismissTo(returnTo as any);
  };

  const title = step === 'sign-in' ? t('account.signInTitle') : step === 'forgot' ? t('account.forgotTitle') : t('account.resetTitle');

  return (
    <Screen title={title} back width="reading" keyboard testID="screen-sign-in">
      <Card padding={22}>
        {step === 'sign-in' ? (
          <View style={{ gap: space[4] }}>
            <AppText variant="body" color="textSecondary">
              {t('account.signInBody')}
            </AppText>
            {!identity.registered ? <Banner tone="info" body={t('account.signInWarning')} /> : null}
            <TextField label={t('account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="username" testID="sign-in-email" />
            <PasswordField label={t('account.password')} value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" testID="sign-in-password" />
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={t('account.signIn')} onPress={() => run(async () => { await signIn(email.trim(), password); await finish(); })} loading={busy} disabled={!email.includes('@') || !password} fullWidth testID="sign-in-submit" />
            <Button label={t('account.forgot')} variant="ghost" onPress={() => { setError(undefined); setStep('forgot'); }} />
          </View>
        ) : step === 'forgot' ? (
          <View style={{ gap: space[4] }}>
            <AppText variant="body" color="textSecondary">
              {t('account.forgotBody')}
            </AppText>
            <TextField label={t('account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={t('account.forgotCta')} onPress={() => run(async () => { await forgotPassword(email.trim(), language); setStep('reset'); })} loading={busy} disabled={!email.includes('@')} fullWidth />
            <Button label={t('common.back')} variant="ghost" onPress={() => setStep('sign-in')} />
          </View>
        ) : (
          <View style={{ gap: space[4] }}>
            <AppText variant="body" color="textSecondary">
              {t('account.resetBody')}
            </AppText>
            <CodeField value={code} onChangeText={setCode} />
            <PasswordField label={t('account.newPassword')} value={password} onChangeText={setPassword} helper={t('account.passwordHint')} autoComplete="new-password" textContentType="newPassword" />
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={t('account.resetCta')} onPress={() => run(async () => { await resetPassword(email.trim(), code, password); await finish(); })} loading={busy} disabled={code.length !== 6 || password.length < 10} fullWidth />
          </View>
        )}
      </Card>
    </Screen>
  );
}
