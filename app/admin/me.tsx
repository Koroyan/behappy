import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { AppText, Button, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode } from '@/features/admin/api';
import { AdminPage, KeyValues, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

/** The signed-in staff member's own security: confirmation window and two-step codes. */
export default function AdminMe() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { me, act, reloadMe, confirmIdentity } = useAdmin();
  const { toast } = useFeedback();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const start = async () => {
    try {
      setSetup(await act(() => adminPost<{ secret: string; otpauthUrl: string }>('/mfa/setup')));
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const enable = async () => {
    setBusy(true);
    try {
      await adminPost('/mfa/enable', { code });
      setSetup(null);
      setCode('');
      await reloadMe();
      toast(t('ac.mfa.enabled'));
    } catch (e) {
      toast(t(errorCode(e) === 'code_wrong' ? 'ac.stepUp.codeWrong' : 'ac.common.failed', { code: errorCode(e) }));
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    try {
      await act(() => adminPost('/mfa/disable'));
      await reloadMe();
      toast(t('ac.mfa.disabled'));
    } catch (e) {
      toast(t(errorCode(e) === 'mfa_required_by_policy' ? 'ac.mfa.requiredByPolicy' : 'ac.common.failed', { code: errorCode(e) }));
    }
  };
  return (
    <AdminPage title={t('ac.nav.me')} subtitle={me.email} testID="screen-admin-me">
      {me.mfa.required && !me.mfa.enabled ? <Note tone="warning" icon="key-outline">{t('ac.mfa.requiredBody')}</Note> : null}
      <Panel title={t('ac.me.access')}>
        <KeyValues
          items={[
            [t('ac.staff.cols.roles'), me.roles.map((r) => t(`ac.roles.${r}`)).join(', ')],
            [t('ac.me.confirmation'), me.stepUp.validUntil ? t('ac.me.confirmedUntil', { time: f.dateTime(me.stepUp.validUntil) }) : t('ac.me.notConfirmed', { minutes: me.stepUp.minutes })],
            [t('ac.staff.cols.twoStep'), <Pill key="m" label={t(me.mfa.enabled ? 'ac.common.on' : 'ac.common.off')} tone={me.mfa.enabled ? 'good' : 'warning'} />],
          ]}
        />
        <Button label={t('ac.me.confirmNow')} size="sm" variant="secondary" onPress={async () => (await confirmIdentity()) && reloadMe()} style={{ alignSelf: 'flex-start' }} />
      </Panel>
      <Panel title={t('ac.mfa.title')} subtitle={t('ac.mfa.subtitle')}>
        {me.mfa.enabled ? (
          <Button label={t('ac.mfa.turnOff')} variant="ghost" size="sm" onPress={disable} style={{ alignSelf: 'flex-start' }} />
        ) : setup ? (
          <View style={{ gap: 10 }}>
            <AppText variant="small" style={{ color: c.textSecondary }}>
              {t('ac.mfa.addKey')}
            </AppText>
            <AppText variant="bodyStrong" style={{ color: c.text, letterSpacing: 2 }} selectable testID="admin-mfa-secret">
              {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
            </AppText>
            {Platform.OS !== 'web' ? <Button label={t('ac.mfa.openApp')} variant="secondary" size="sm" onPress={() => Linking.openURL(setup.otpauthUrl)} style={{ alignSelf: 'flex-start' }} /> : null}
            <TextField label={t('ac.stepUp.code')} value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" testID="admin-mfa-code" />
            <Button label={t('ac.mfa.turnOn')} onPress={enable} loading={busy} disabled={code.length !== 6} style={{ alignSelf: 'flex-start' }} testID="admin-mfa-enable" />
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {t('ac.mfa.keyOnce')}
            </AppText>
          </View>
        ) : (
          <Button label={t('ac.mfa.setUp')} onPress={start} size="sm" style={{ alignSelf: 'flex-start' }} testID="admin-mfa-setup" />
        )}
      </Panel>
    </AdminPage>
  );
}
