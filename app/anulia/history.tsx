import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { Card, Screen, useFeedback } from '@/design';
import { Conversation, deleteConversation, listConversations } from '@/features/anulia/anuliaService';
import { ConversationList } from '@/features/anulia/ConversationList';
import { useT } from '@/i18n';

export default function AnuliaHistory() {
  const router = useRouter();
  const { t } = useT();
  const { confirm } = useFeedback();
  const [list, setList] = useState<Conversation[]>([]);

  useFocusEffect(
    useCallback(() => {
      listConversations().then(setList);
    }, [])
  );

  const remove = async (id: string) => {
    const ok = await confirm({ title: t('anulia.deleteConversation'), body: t('anulia.deleteConfirm'), confirmLabel: t('common.delete'), destructive: true });
    if (!ok) return;
    await deleteConversation(id);
    setList(await listConversations());
  };

  return (
    <Screen back title={t('anulia.history')} subtitle={t('anulia.privacyNote')} width="reading" testID="screen-anulia-history">
      <Card padding={8}>
        <ConversationList conversations={list} onOpen={(id) => router.navigate(`/anulia?c=${id}`)} onDelete={remove} />
      </Card>
    </Screen>
  );
}
