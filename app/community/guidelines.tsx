import React from 'react';

import { Card, Screen } from '@/design';
import { GuidelinesList } from '@/features/community/RoomParts';
import { useT } from '@/i18n';

export default function CommunityGuidelines() {
  const { t } = useT();
  return (
    <Screen title={t('community.guidelines.title')} back width="reading" testID="screen-community-guidelines">
      <Card padding={22}>
        <GuidelinesList />
      </Card>
    </Screen>
  );
}
