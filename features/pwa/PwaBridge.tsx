/**
 * The installed web app's quiet helpers, mounted once at the root (web only;
 * renders nothing on iOS/Android):
 *
 *  - registers the service worker (offline shell, notifications);
 *  - "A new version of BeHappy is ready · Refresh": shown when an update has
 *    been downloaded. Nothing changes until the person taps Refresh, so an
 *    entry being written is never interrupted; "Later" hides it until the
 *    next start;
 *  - keeps the browser/status bar colour (theme-color) in step with the
 *    app's light or dark theme.
 */
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, elevation, Icon, radius, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { applyUpdate, countVisit, registerServiceWorker } from '@/lib/pwa/pwa';
import { useUpdateAvailable } from '@/lib/pwa/usePwa';

export function PwaBridge() {
  return Platform.OS === 'web' ? <WebPwa /> : null;
}

function WebPwa() {
  const { t } = useT();
  const { colors, scheme } = useTheme();
  const { hasSideNav } = useLayout();
  const insets = useSafeAreaInsets();
  const update = useUpdateAvailable();
  const [later, setLater] = useState(false);

  useEffect(() => {
    registerServiceWorker().catch(() => null);
    countVisit().catch(() => 0);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', colors.bg));
  }, [colors.bg]);

  if (!update || later) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: hasSideNav ? 24 : insets.bottom + 80, alignItems: 'center', zIndex: 1000 }}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID="pwa-update"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          maxWidth: 520,
          marginHorizontal: 16,
          paddingVertical: 10,
          paddingLeft: 16,
          paddingRight: 10,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...elevation(scheme, 2),
        }}
      >
        <Icon name="sparkles-outline" size={20} color="primary" />
        <AppText variant="callout" style={{ flexShrink: 1 }}>
          {t('pwa.update.title')}
        </AppText>
        <Button label={t('pwa.update.later')} size="sm" variant="quiet" onPress={() => setLater(true)} testID="pwa-update-later" />
        <Button label={t('pwa.update.refresh')} size="sm" onPress={applyUpdate} testID="pwa-update-refresh" />
      </View>
    </View>
  );
}
