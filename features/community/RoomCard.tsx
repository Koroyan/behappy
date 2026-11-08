import React from 'react';
import { View } from 'react-native';

import { type AppLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Badge, Icon, IconName, Press, radius, useTheme } from '@/design';
import { useT } from '@/i18n';
import type { Room } from '@/lib/api/community';

/** A topic room: icon, name, short description, members and unread count. */
export function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  const { t, tp, language } = useT();
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${t(`community.topics.${room.topic}.name`)}. ${t(`community.topics.${room.topic}.about`)}`}
      testID={`room-${room.id}`}
      feedback="scale"
      style={{ flexBasis: 280, flexGrow: 1, padding: 16, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: room.unread ? colors.brand : colors.border, gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={room.icon as IconName} size={20} color="onPrimarySoft" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {t(`community.topics.${room.topic}.name`)}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {tp('community.members', room.members)}
            {/* Rooms of the same topic in two languages looked identical in "Your rooms". */}
            {room.language !== language && LANGUAGE_NAMES[room.language as AppLanguage] ? ` · ${LANGUAGE_NAMES[room.language as AppLanguage]}` : ''}
          </AppText>
        </View>
        {room.unread ? <Badge label={tp('community.unread', room.unread)} tone="primary" /> : room.joined ? <Badge label={t('community.joined')} tone="muted" /> : null}
      </View>
      <AppText variant="small" color="textSecondary" numberOfLines={2}>
        {t(`community.topics.${room.topic}.about`)}
      </AppText>
    </Press>
  );
}
