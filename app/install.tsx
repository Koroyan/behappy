/**
 * How to install BeHappy from the browser (iPhone/iPad, Android, computer).
 * The person's own system comes first. Where the browser has an install
 * dialog (Android, desktop Chrome/Edge) one tap opens it; iOS has none, so the
 * steps are the way, and the page says so rather than promising a button.
 */
import React from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Screen, SectionHeader, space } from '@/design';
import { useT } from '@/i18n';
import { isAndroid, isIOS, promptInstall } from '@/lib/pwa/pwa';
import { useBrowserValue, useInstallMode } from '@/lib/pwa/usePwa';

function Steps({ title, steps, note, testID }: { title: string; steps: string[]; note?: string; testID?: string }) {
  return (
    <View testID={testID}>
      <SectionHeader title={title} />
      <Card padding={16}>
        <View style={{ gap: space[3] }}>
          {steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <AppText variant="bodyStrong" color="primary" style={{ minWidth: 20 }}>
                {i + 1}.
              </AppText>
              <AppText variant="body" style={{ flex: 1 }}>
                {s}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      {note ? (
        <AppText variant="small" color="textSecondary" style={{ marginTop: space[2] }}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

export default function InstallScreen() {
  const { t, tl } = useT();
  const mode = useInstallMode();
  const platform = useBrowserValue<'ios' | 'android' | 'desktop'>(() => (isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop'), 'desktop');

  const sections = {
    ios: <Steps key="ios" title={t('pwa.install.iosTitle')} steps={tl('pwa.install.iosSteps')} note={t('pwa.install.iosNote')} testID="install-ios" />,
    android: <Steps key="android" title={t('pwa.install.androidTitle')} steps={tl('pwa.install.androidSteps')} testID="install-android" />,
    desktop: <Steps key="desktop" title={t('pwa.install.desktopTitle')} steps={tl('pwa.install.desktopSteps')} testID="install-desktop" />,
  };
  const order = platform === 'ios' ? ['ios', 'android', 'desktop'] : platform === 'android' ? ['android', 'ios', 'desktop'] : ['desktop', 'ios', 'android'];

  return (
    <Screen back title={t('pwa.install.cardTitle')} width="reading" testID="screen-install">
      <View style={{ gap: space[6] }}>
        <AppText variant="body" color="textSecondary">
          {t('pwa.install.intro')}
        </AppText>
        {mode === 'installed' ? <Banner tone="success" body={t('pwa.install.installed')} /> : null}
        {mode === 'prompt' ? <Button label={t('pwa.install.install')} icon="download-outline" size="lg" fullWidth onPress={() => promptInstall()} testID="install-now" /> : null}
        {order.map((k) => sections[k as keyof typeof sections])}
      </View>
    </Screen>
  );
}
