import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Divider, ListRow, Screen, SectionHeader, space, useFeedback } from '@/design';
import { PasswordField } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { authErrorKey, changePassword, DeviceSession, listSessions, revokeSession, signOut } from '@/lib/api/auth';
import { consumeSignOutNotice } from '@/lib/api/client';

export default function AccountScreen() {
  const router = useRouter();
  const { t, formatDate } = useT();
  const { refresh } = useAccount();
  const identity = useIdentity();
  const { confirm, toast } = useFeedback();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState<string | undefined>();

  useEffect(() => {
    if (consumeSignOutNotice()) setNotice(t('account.sessionEnded'));
  }, [t]);

  const load = useCallback(async () => {
    await refresh();
    try {
      setSessions(await listSessions());
    } catch {
      setSessions([]);
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSignOut = async () => {
    const ok = await confirm({ title: t('account.signOutConfirmTitle'), body: t('account.signOutConfirmBody'), confirmLabel: t('account.signOut') });
    if (!ok) return;
    await signOut();
    toast(t('account.signedOut'));
    await load();
  };

  const onChange = async () => {
    setPwError(undefined);
    setChanging(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      toast(t('account.passwordChanged'));
      await load();
    } catch (e) {
      setPwError(t(authErrorKey(e)));
    } finally {
      setChanging(false);
    }
  };

  const onRevoke = async (s: DeviceSession) => {
    try {
      await revokeSession(s.id);
      await load();
    } catch {
      toast(t('account.errors.generic'));
    }
  };

  return (
    <Screen title={t('account.title')} back width="reading" keyboard testID="screen-account">
      <View style={{ gap: space[5] }}>
        {notice ? <Banner tone="warning" body={notice} /> : null}

        {identity.registered ? (
          <Card padding={20} testID="account-registered">
            <View style={{ gap: 6 }}>
              <AppText variant="label" color="textTertiary">
                {t('account.email')}
              </AppText>
              <AppText variant="title3" selectable>
                {identity.email}
              </AppText>
              <Badge label={t('account.verified')} tone="success" icon="checkmark-circle-outline" />
            </View>
            <Divider style={{ marginVertical: space[4] }} />
            <Button label={t('account.signOut')} variant="outline" icon="log-out-outline" onPress={onSignOut} testID="account-sign-out" />
          </Card>
        ) : (
          <Card tone="sage" padding={22} testID="account-anonymous">
            <View style={{ gap: space[2] }}>
              <AppText variant="title3">{t('account.anonymousTitle')}</AppText>
              <AppText variant="small" color="textSecondary">
                {t('account.anonymousBody')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[2] }}>
                <Button label={t('account.create')} icon="person-add-outline" onPress={() => router.push('/account/create' as any)} testID="account-create" />
                <Button label={t('account.signIn')} variant="outline" onPress={() => router.push('/account/sign-in' as any)} testID="account-sign-in" />
              </View>
            </View>
          </Card>
        )}

        {identity.registered ? (
          <Card padding={20}>
            <SectionHeader title={t('account.changePassword')} subtitle={t('account.changeBody')} />
            <View style={{ gap: space[3] }}>
              <PasswordField label={t('account.currentPassword')} value={current} onChangeText={setCurrent} autoComplete="current-password" textContentType="password" />
              <PasswordField label={t('account.newPassword')} value={next} onChangeText={setNext} helper={t('account.passwordHint')} error={pwError} autoComplete="new-password" textContentType="newPassword" />
              <Button label={t('account.changePassword')} onPress={onChange} loading={changing} disabled={!current || next.length < 10} />
            </View>
          </Card>
        ) : null}

        {sessions.length ? (
          <View>
            <SectionHeader title={t('account.devices')} />
            <Card padding={8}>
              {sessions.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <Divider inset={16} /> : null}
                  <View style={{ paddingHorizontal: 12 }}>
                    <ListRow
                      icon={s.kind === 'password' ? 'key-outline' : 'phone-portrait-outline'}
                      iconTone={s.current ? 'primary' : 'muted'}
                      title={s.current ? t('account.thisDevice') : s.kind === 'password' ? t('account.devicePassword') : t('account.deviceApp')}
                      subtitle={t('account.lastActive', { date: formatDate(s.lastUsedAt, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                      right={s.current ? null : <Button label={t('account.signOutDevice')} size="sm" variant="quiet" onPress={() => onRevoke(s)} />}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
