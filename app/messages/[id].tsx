import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Banner, IconButton, Press, radius, space, useFeedback, useLayout, useTheme } from '@/design';
import { ChatScroll, Composer } from '@/features/chat/ChatKit';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api/client';
import { openThread, reportThreadMessage, sendThreadMessage, Thread } from '@/lib/api/pros';
import { getSocket, onEvent } from '@/lib/realtime/socket';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { hasSideNav, gutter } = useLayout();
  const { t, formatTime, formatDate } = useT();
  const { confirm, toast } = useFeedback();
  const [thread, setThread] = useState<Thread | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setThread(await openThread(String(id)));
    } catch {
      setError(t('common.errorBody'));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // New messages arrive live (and also on focus).
  useEffect(() => {
    getSocket().catch(() => {});
    return onEvent('thread:message', (p: { threadId: string }) => p.threadId === id && load());
  }, [id, load]);

  const send = async () => {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      setThread(await sendThreadMessage(String(id), body));
      setInput('');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      setError(code && ['membership_required', 'not_available', 'suspended', 'client_gone'].includes(code) ? t(`messages.blocked.${code}`) : t('common.errorBody'));
    } finally {
      setSending(false);
    }
  };

  const report = async (messageId: number) => {
    const ok = await confirm({ title: t('messages.report'), body: t('community.report.body'), confirmLabel: t('messages.report') });
    if (!ok) return;
    try {
      await reportThreadMessage(String(id), messageId, 'other');
      toast(t('messages.reported'));
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const title = thread ? (thread.side === 'client' ? thread.professionalName : thread.clientName || t('messages.formerClient')) : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="screen-thread">
      <View style={{ flex: 1, paddingTop: hasSideNav ? space[5] : insets.top + space[2], paddingHorizontal: gutter }}>
        <View style={{ flex: 1, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <IconButton icon="chevron-back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages' as any))} variant="soft" size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="title3" numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {t('messages.private')}
              </AppText>
            </View>
          </View>
          <ChatScroll contentKey={thread?.messages?.length || 0}>
            {thread && !thread.messages?.length ? (
              <View style={{ gap: 6, paddingVertical: space[4] }}>
                <AppText variant="title3">{t('messages.startTitle', { name: title })}</AppText>
                <AppText variant="small" color="textSecondary">
                  {t('messages.startBody')}
                </AppText>
              </View>
            ) : null}
            {(thread?.messages || []).map((m) => {
              const mine = m.sender === thread?.side;
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginTop: space[3] }}>
                  <Press
                    onLongPress={mine ? undefined : () => report(m.id)}
                    accessibilityHint={mine ? undefined : t('messages.report')}
                    style={{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.xl, backgroundColor: mine ? colors.chatUser : colors.surface, borderWidth: mine ? 0 : 1, borderColor: colors.border }}
                  >
                    <AppText variant="body" color={mine ? 'onChatUser' : 'text'} selectable>
                      {m.body}
                    </AppText>
                  </Press>
                  <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                    {formatDate(m.createdAt, { day: 'numeric', month: 'short' })} {formatTime(m.createdAt)}
                  </AppText>
                </View>
              );
            })}
          </ChatScroll>
          <View style={{ paddingTop: space[2], paddingBottom: hasSideNav ? space[4] : Math.max(insets.bottom, space[3]), gap: 8 }}>
            {error ? <Banner tone="warning" body={error} /> : null}
            {thread && !thread.canWrite && thread.writeBlockedReason ? (
              <Banner tone="info" body={t(`messages.blocked.${thread.writeBlockedReason}`)} />
            ) : (
              <Composer value={input} onChangeText={setInput} onSend={send} placeholder={t('messages.placeholder')} sending={sending} testID="thread-composer" />
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
