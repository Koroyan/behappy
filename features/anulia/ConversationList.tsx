import React from 'react';
import { View } from 'react-native';

import { AppText, Icon, IconButton, Press, radius, useTheme } from '@/design';
import { useT } from '@/i18n';

import { Conversation, conversationTitle, lastActivity } from './anuliaService';

export function ConversationList({
  conversations,
  activeId,
  onOpen,
  onDelete,
}: {
  conversations: Conversation[];
  activeId?: string;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { t, formatDate } = useT();
  const withMessages = conversations.filter((c) => c.messages.some((m) => m.type === 'user'));
  if (!withMessages.length) {
    return (
      <AppText variant="small" color="textSecondary" style={{ padding: 8 }}>
        {t('anulia.historyEmpty')}
      </AppText>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      {withMessages.map((c) => {
        const active = c.id === activeId;
        return (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, backgroundColor: active ? colors.primarySoft : 'transparent' }}>
            <Press onPress={() => onOpen(c.id)} accessibilityLabel={conversationTitle(c)} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 2 }} testID="conversation-item">
              <AppText variant="smallStrong" numberOfLines={1} color={active ? 'onPrimarySoft' : 'text'}>
                {conversationTitle(c) || t('anulia.newConversation')}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {c.summary ? <Icon name="sparkles-outline" size={12} color="textTertiary" /> : null}
                <AppText variant="caption" color="textTertiary">
                  {formatDate(lastActivity(c), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </AppText>
              </View>
            </Press>
            {onDelete ? <IconButton icon="trash-outline" label={t('anulia.deleteConversation')} size={36} onPress={() => onDelete(c.id)} /> : null}
          </View>
        );
      })}
    </View>
  );
}
