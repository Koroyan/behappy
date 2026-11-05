import { Redirect, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, BrandMark, Button, Screen, space } from '@/design';
import { useT } from '@/i18n';

// Routes from BeHappy 1.x, so saved links and ads keep working.
const LEGACY: [RegExp, string][] = [
  [/^\/(\(tabs\)\/)?(screens\/)?ai-therapy-chat/, '/anulia'],
  [/^\/screens\/session-history/, '/anulia/history'],
  [/^\/screens\/journal/, '/journal'],
  [/^\/screens\/breathing/, '/breathing'],
  [/^\/screens\/meditation/, '/meditation'],
  [/^\/screens\/cards\/sessions-history/, '/cards/history'],
  [/^\/screens\/cards/, '/cards'],
  [/^\/screens\/profile-setup/, '/profile/personal'],
  [/^\/screens\/(recommendations|test-history)/, '/assessments'],
  [/^\/screens\/ai-assistant/, '/anulia'],
  [/^\/(\(tabs\)\/)?general/, '/profile'],
  [/^\/(subscription|purchase)/, '/pricing'],
  [/^\/(\(tabs\)\/)?art-therapy-sessions?/, '/art'],
  [/^\/(\(tabs\)\/)?art-therapy/, '/art'],
];

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const search = useGlobalSearchParams<{ sessionId?: string }>();
  // Old art session links carried the session number; keep it.
  if (/^\/art-therapy-session/.test(pathname) && search.sessionId) return <Redirect href={`/art/session?sessionId=${search.sessionId}` as any} />;
  const target = LEGACY.find(([re]) => re.test(pathname))?.[1];
  if (target) return <Redirect href={target as any} />;
  return (
    <Screen width="reading" testID="screen-not-found">
      <View style={{ alignItems: 'center', gap: space[4], paddingTop: space[12] }}>
        <BrandMark size={56} />
        <AppText variant="title1" align="center">
          {t('notFound.title')}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {t('notFound.body')}
        </AppText>
        <Button label={t('notFound.home')} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
