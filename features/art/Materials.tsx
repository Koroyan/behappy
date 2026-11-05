import React from 'react';
import { View } from 'react-native';

import { AppText, Card, Icon, IconButton, IconName, space } from '@/design';
import { useT } from '@/i18n';

/**
 * "What you'll need": art therapy here happens on real paper, never in the
 * app. This hint tells people which paper and paints to use and how to
 * photograph the result.
 */
export function MaterialsCard({ compact, onClose }: { compact?: boolean; onClose?: () => void }) {
  const { t } = useT();
  const rows: { icon: IconName; text: string }[] = [
    { icon: 'document-outline', text: t('art.materials.paper') },
    { icon: 'color-palette-outline', text: t('art.materials.paints') },
    { icon: 'brush-outline', text: t('art.materials.tools') },
    { icon: 'camera-outline', text: t('art.materials.photo') },
  ];
  return (
    <Card tone="gold" padding={compact ? 16 : 22} testID="art-materials">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space[3] }}>
        <Icon name="color-filter-outline" size={20} color="onGoldSoft" />
        <AppText variant="title3" style={{ flex: 1 }}>
          {t('art.materials.title')}
        </AppText>
        {onClose ? <IconButton icon="close" label={t('common.close')} onPress={onClose} size={34} /> : null}
      </View>
      <View style={{ gap: 12 }}>
        {rows.map((r) => (
          <View key={r.icon} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Icon name={r.icon} size={18} color="onGoldSoft" style={{ marginTop: 2 }} />
            <AppText variant="small" style={{ flex: 1 }}>
              {r.text}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="onGoldSoft" style={{ marginTop: space[3] }}>
        {t('art.materials.note')}
      </AppText>
    </Card>
  );
}

export function HowItWorks() {
  const { t, tl } = useT();
  const icons: IconName[] = ['reader-outline', 'brush-outline', 'camera-outline', 'chatbubble-ellipses-outline'];
  return (
    <Card padding={22}>
      <AppText variant="title3" style={{ marginBottom: space[3] }}>
        {t('art.howItWorks.title')}
      </AppText>
      <View style={{ gap: 14 }}>
        {tl('art.howItWorks.steps').map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icons[i]} size={20} color="brand" />
            </View>
            <AppText variant="small" style={{ flex: 1 }}>
              {s}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
