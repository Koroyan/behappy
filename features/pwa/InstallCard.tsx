/**
 * "Install BeHappy": a small card on Today, on phones, in the browser only.
 *
 * Gentle on purpose: not on the first visit, never inside the installed app,
 * "Not now" hides it for 30 days and after the second "Not now" only the
 * Profile row offers it. Android Chrome / Edge get the browser's own install
 * dialog; iPhone and iPad (no such dialog exists there) get the steps.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, BrandMark, Button, Card, space, useLayout } from '@/design';
import { useT } from '@/i18n';
import { countVisit, dismissInstall, installSuggestionAllowed, promptInstall } from '@/lib/pwa/pwa';
import { useInstallMode } from '@/lib/pwa/usePwa';

export function InstallCard() {
  return Platform.OS === 'web' ? <WebInstallCard /> : null;
}

function WebInstallCard() {
  const { t } = useT();
  const router = useRouter();
  const { isCompact } = useLayout();
  const mode = useInstallMode();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([installSuggestionAllowed(), countVisit()]).then(([ok, visits]) => {
      if (alive) setAllowed(ok && visits >= 2);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!isCompact || !allowed || !(mode === 'prompt' || mode === 'ios' || mode === 'manual')) return null;

  const notNow = async () => {
    await dismissInstall();
    setAllowed(false);
  };
  const go = async () => {
    if (mode === 'prompt') {
      const r = await promptInstall();
      if (r !== 'unavailable') return;
    }
    router.push('/install' as never);
  };

  return (
    <Card tone="sage" padding={16} testID="install-card">
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <BrandMark size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title3">{t('pwa.install.cardTitle')}</AppText>
          <AppText variant="small" color="textSecondary">
            {t('pwa.install.cardBody')}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: space[3], justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button label={t('pwa.install.notNow')} size="sm" variant="quiet" onPress={notNow} testID="install-card-later" />
        <Button label={mode === 'prompt' ? t('pwa.install.install') : t('pwa.install.how')} size="sm" icon={mode === 'prompt' ? 'download-outline' : undefined} onPress={go} testID="install-card-go" />
      </View>
    </Card>
  );
}
