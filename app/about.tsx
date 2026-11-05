import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText, BrandMark, Button, Card, Icon, IconName, Screen, space } from '@/design';
import { useT } from '@/i18n';

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useT();
  const sections: { icon: IconName; title: string; body: string; tone: 'surface' | 'muted' | 'lavender' | 'sage' | 'peach' }[] = [
    { icon: 'leaf-outline', title: t('about.whatTitle'), body: t('about.whatBody'), tone: 'sage' },
    { icon: 'alert-circle-outline', title: t('about.notTitle'), body: t('about.notBody'), tone: 'peach' },
    { icon: 'sparkles-outline', title: t('about.aiTitle'), body: t('about.aiBody'), tone: 'lavender' },
    { icon: 'lock-closed-outline', title: t('about.privacyTitle'), body: t('about.privacyBody'), tone: 'surface' },
    { icon: 'medkit-outline', title: t('about.professionalTitle'), body: t('about.professionalBody'), tone: 'muted' },
  ];
  return (
    <Screen back title={t('about.title')} subtitle={t('brand.tagline')} width="reading" testID="screen-about">
      <View style={{ gap: space[4] }}>
        <View style={{ alignItems: 'flex-start', marginBottom: space[2] }}>
          <BrandMark size={56} />
        </View>
        {sections.map((s) => (
          <Card key={s.title} tone={s.tone} padding={20}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name={s.icon} size={22} color="text" />
              <View style={{ flex: 1, gap: 6 }}>
                <AppText variant="title3">{s.title}</AppText>
                <AppText variant="body" color="textSecondary">
                  {s.body}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
        <Button label={t('safety.title')} icon="heart-outline" variant="danger" onPress={() => router.push('/safety')} />
      </View>
    </Screen>
  );
}
