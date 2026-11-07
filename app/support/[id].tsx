import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Screen, Skeleton, space, TextField, useFeedback, useTheme } from '@/design';
import { useT } from '@/i18n';
import { closeTicket, getTicket, replyTicket, SupportTicket } from '@/lib/api/support';

/** One support request: the conversation with the BeHappy team. */
export default function SupportThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, formatDate, formatTime } = useT();
  const { colors } = useTheme();
  const { toast, confirm } = useFeedback();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getTicket(String(id))
        .then(setTicket)
        .catch(() => setTicket(null));
    }, [id])
  );

  const send = async () => {
    setBusy(true);
    try {
      setTicket(await replyTicket(String(id), reply.trim()));
      setReply('');
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!(await confirm({ title: t('help.close'), confirmLabel: t('help.close') }))) return;
    await closeTicket(String(id)).catch(() => {});
    setTicket((x) => (x ? { ...x, status: 'closed' } : x));
  };

  return (
    <Screen back title={ticket?.subject || t('help.title')} subtitle={ticket ? `${t(`help.categories.${ticket.category}`)} · ${t(`help.status.${ticket.status}`)}` : undefined} width="reading" testID="screen-support-thread">
      {!ticket ? (
        <Skeleton height={160} radius={18} />
      ) : (
        <View style={{ gap: space[3] }}>
          {ticket.category === 'safety' ? <Banner tone="danger" title={t('help.safetyTitle')} body={t('help.safetyBody')} /> : null}
          {(ticket.messages || []).map((m) => {
            const mine = m.from === 'user';
            return (
              <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: mine ? colors.chatUser : colors.surface, borderRadius: 16, padding: 12, gap: 4, borderWidth: mine ? 0 : 1, borderColor: colors.border }} testID={mine ? 'support-msg-mine' : 'support-msg-team'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="caption" color="textTertiary">
                    {mine ? t('help.you') : t('help.team')} · {formatDate(m.at, { day: 'numeric', month: 'short' })} {formatTime(m.at)}
                  </AppText>
                  {!mine ? <Badge label="BeHappy" tone="primary" /> : null}
                </View>
                <AppText variant="body" selectable>
                  {m.body}
                </AppText>
              </View>
            );
          })}
          {ticket.status === 'closed' ? (
            <AppText variant="small" color="textSecondary" align="center">
              {t('help.closed')}
            </AppText>
          ) : (
            <>
              <TextField value={reply} onChangeText={setReply} placeholder={t('help.reply')} multiline maxLength={4000} testID="support-reply" />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Button label={t('help.close')} variant="ghost" onPress={close} />
                <Button label={t('help.send')} onPress={send} loading={busy} disabled={!reply.trim()} testID="support-reply-send" />
              </View>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
