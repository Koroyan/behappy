/**
 * How BeHappy works, in one short page: what it is (and isn't), what is free,
 * what needs AI consent or Plus, where human help is, how data is protected,
 * and how to begin and continue. Linked from Today (first days) and Profile.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, IconName, Screen, space } from '@/design';
import { useT } from '@/i18n';

const SECTIONS: { key: string; icon: IconName; tone: 'sage' | 'primary' | 'gold' | 'peach' | 'lavender' | 'muted'; links: { label: string; route: string }[] }[] = [
  { key: 'what', icon: 'sunny-outline', tone: 'sage', links: [] },
  { key: 'free', icon: 'leaf-outline', tone: 'sage', links: [{ label: 'jr.guide.links.tools', route: '/tools' }, { label: 'jr.guide.links.programs', route: '/programs' }] },
  { key: 'ai', icon: 'sparkles-outline', tone: 'lavender', links: [{ label: 'jr.guide.links.bea', route: '/anulia' }] },
  { key: 'plus', icon: 'star-outline', tone: 'gold', links: [{ label: 'jr.guide.links.pricing', route: '/pricing' }] },
  { key: 'people', icon: 'people-outline', tone: 'peach', links: [{ label: 'jr.guide.links.specialists', route: '/specialists' }, { label: 'jr.guide.links.community', route: '/community' }] },
  { key: 'data', icon: 'lock-closed-outline', tone: 'primary', links: [{ label: 'jr.guide.links.backup', route: '/settings/backup' }, { label: 'jr.guide.links.privacy', route: '/profile' }] },
  { key: 'begin', icon: 'compass-outline', tone: 'muted', links: [{ label: 'jr.guide.links.today', route: '/' }] },
];

export default function GuideScreen() {
  const router = useRouter();
  const { t } = useT();
  return (
    <Screen back title={t('jr.guide.title')} subtitle={t('jr.guide.subtitle')} width="reading" testID="screen-guide">
      <View style={{ gap: space[4] }}>
        {SECTIONS.map((s) => (
          <Card key={s.key} tone={s.tone === 'muted' ? 'muted' : s.tone} padding={20} testID={`guide-${s.key}`}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <Icon name={s.icon} size={22} color="text" />
              <View style={{ flex: 1, gap: 6 }}>
                <AppText variant="title3" accessibilityRole="header">
                  {t(`jr.guide.${s.key}.title`)}
                </AppText>
                <AppText variant="small" color="textSecondary">
                  {t(`jr.guide.${s.key}.body`)}
                </AppText>
                {s.links.length ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {s.links.map((l) => (
                      <Button key={l.route} label={t(l.label)} size="sm" variant="secondary" iconRight="arrow-forward" onPress={() => router.push(l.route as never)} />
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        ))}
        <Card tone="danger" padding={18} onPress={() => router.push('/safety')} accessibilityLabel={t('nav.needHelpNow')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="heart-circle-outline" size={24} color="onDangerSoft" />
            <View style={{ flex: 1 }}>
              <AppText variant="smallStrong" color="onDangerSoft">
                {t('nav.needHelpNow')}
              </AppText>
              <AppText variant="caption" color="onDangerSoft">
                {t('jr.guide.safety')}
              </AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
