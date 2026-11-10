/**
 * "Know when someone writes to you · Turn on": a gentle card where it matters
 * (Community, Notifications) for people whose device doesn't get
 * notifications yet. Notifications are off until the person allows them, so
 * without this many would never hear about a reply.
 *
 *  - Permission is asked only after the tap (never on its own).
 *  - Not shown when notifications are already on, when this device can't get
 *    them, or for 14 days after "Not now".
 *  - iPhone/iPad in a Safari tab: says to add BeHappy to the Home Screen first.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleProp, View, ViewStyle } from 'react-native';

import { AppText, Banner, Button, Card, Icon, space } from '@/design';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { enableThisPhone, loadPushState, pushAvailability, PushAvailability } from '@/lib/notifications/push';
import { useBrowserValue } from '@/lib/pwa/usePwa';

const KEY = '@behappy_notify_prompt_v1';
const QUIET_DAYS = 14;

export function NotifyPrompt({ testID = 'notify-prompt', style }: { testID?: string; style?: StyleProp<ViewStyle> }) {
  const { t, language } = useT();
  const router = useRouter();
  const identity = useIdentity();
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  const availability = useBrowserValue<PushAvailability>(pushAvailability, native ? pushAvailability() : 'web');
  const [state, setState] = useState<'hidden' | 'show' | 'denied'>('hidden');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!identity.registered || !(availability === 'ok' || availability === 'needs-install')) {
        setState('hidden');
        return;
      }
      Promise.all([loadPushState(), AsyncStorage.getItem(KEY).catch(() => null)]).then(([push, raw]) => {
        if (!alive) return;
        const at = Number(raw || 0);
        setState(push.enabled || (at && Date.now() - at < QUIET_DAYS * 24 * 60 * 60 * 1000) ? 'hidden' : 'show');
      });
      return () => {
        alive = false;
      };
    }, [identity.registered, availability])
  );

  if (state === 'hidden') return null;
  if (state === 'denied') {
    return native ? (
      <Banner tone="warning" body={t('alerts.reminders.denied')} action={<Button label={t('alerts.reminders.openSettings')} size="sm" variant="secondary" onPress={() => Linking.openSettings().catch(() => {})} />} />
    ) : (
      <Banner tone="warning" body={t('pwa.push.denied')} />
    );
  }

  const later = async () => {
    setState('hidden');
    await AsyncStorage.setItem(KEY, String(Date.now())).catch(() => {});
  };
  const enable = async () => {
    if (availability === 'needs-install') {
      router.push('/install' as never);
      return;
    }
    setBusy(true);
    try {
      const r = await enableThisPhone(language);
      if (r === 'ok') setState('hidden');
      else if (r === 'denied') setState('denied');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card tone="primary" padding={16} testID={testID} style={style}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="notifications" size={24} color="onPrimarySoft" />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodyStrong" color="onPrimarySoft">
            {t('pwa.notify.title')}
          </AppText>
          <AppText variant="small" color="onPrimarySoft">
            {availability === 'needs-install' ? t('pwa.push.needsInstall') : t('pwa.notify.body')}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: space[3], flexWrap: 'wrap' }}>
        <Button label={t('pwa.notify.later')} size="sm" variant="quiet" onPress={later} testID={`${testID}-later`} />
        <Button label={availability === 'needs-install' ? t('pwa.push.howToInstall') : t('pwa.notify.enable')} size="sm" icon="notifications-outline" onPress={enable} loading={busy} testID={`${testID}-enable`} />
      </View>
    </Card>
  );
}
