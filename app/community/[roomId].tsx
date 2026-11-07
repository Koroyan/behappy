import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Chip, EmptyState, IconButton, ListRow, Press, Sheet, space, TextField, useFeedback, useLayout, useTheme } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { ChatScroll, Composer, TypingDots } from '@/features/chat/ChatKit';
import { MessageMenu, MessageRow, ReportSheet, SafetySheet } from '@/features/community/RoomParts';
import { useRoom } from '@/features/community/useRoom';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { deleteMessage, reportMessage, RoomMessage, searchRoom, setBlocked, setMuted, setRoomNotify, Suspension } from '@/lib/api/community';

const FIVE_MIN = 5 * 60 * 1000;

export default function RoomScreen() {
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = decodeURIComponent(String(params.roomId || ''));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { hasSideNav, gutter } = useLayout();
  const { t, tp, formatTime, formatDate } = useT();
  const { me } = useAccount();
  const identity = useIdentity();
  const { confirm, toast } = useFeedback();
  const community = me?.community as { profile: { pseudonym: string } | null; suspension: Suspension | null } | undefined;
  const r = useRoom(roomId);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<RoomMessage | null>(null);
  const [askAnulia, setAskAnulia] = useState(false);
  const [menuFor, setMenuFor] = useState<RoomMessage | null>(null);
  const [reportFor, setReportFor] = useState<RoomMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RoomMessage[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [topic, lang] = roomId.split(':');
  const title = t(`community.topics.${topic}.name`);
  const visible = r.messages;

  useEffect(() => {
    if (visible.length) r.markRead();
  }, [visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (r.anuliaNotice) {
      setNotice(t(`community.room.anuliaUnavailable.${r.anuliaNotice}`));
      r.clearAnuliaNotice();
    }
  }, [r.anuliaNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  const time = (ms: number) => {
    const d = new Date(ms);
    const today = new Date();
    return d.toDateString() === today.toDateString() ? formatTime(ms) : `${formatDate(ms, { day: 'numeric', month: 'short' })} ${formatTime(ms)}`;
  };

  const errorText = (code?: string) => {
    if (code === 'slow_down') return t('community.room.slowDown');
    if (code === 'duplicate_message') return t('community.room.duplicate');
    if (code === 'message_too_long') return t('community.room.tooLong');
    if (code === 'suspended') return t('community.errors.suspended');
    if (code === 'bad_reply') return t('community.errors.bad_reply');
    if (code === 'not_a_member') return t('community.errors.not_a_member');
    if (code === 'room_paused') return t('community.errors.room_paused');
    return t('community.errors.generic');
  };

  const send = async (retry?: RoomMessage) => {
    const body = retry ? retry.body : input.trim();
    if (!body) return;
    setSending(true);
    setNotice(null);
    const res = await r.send(body, { replyToId: retry ? undefined : replyTo?.id, askAnulia: retry ? retry.asksAnulia : askAnulia, retryOf: retry?.nonce });
    setSending(false);
    if (res.ok) {
      if (!retry) {
        setInput('');
        setReplyTo(null);
        setAskAnulia(false);
      }
    } else if (res.error !== 'network' && res.error !== 'timeout') {
      setNotice(errorText(res.error));
    }
  };

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    try {
      setResults(await searchRoom(roomId, query.trim()));
    } catch {
      setResults([]);
    }
  };

  const memberAction = async (m: RoomMessage, kind: 'block' | 'mute') => {
    setMenuFor(null);
    const name = m.author.pseudonym || '';
    if (!m.author.ref) return;
    if (kind === 'block') {
      const ok = await confirm({ title: t('community.room.block', { name }), body: t('community.room.blockConfirm', { name }), confirmLabel: t('community.room.block', { name }), destructive: true });
      if (!ok) return;
      await setBlocked(m.author.ref, true);
      toast(t('community.room.blocked', { name }));
    } else {
      await setMuted(m.author.ref, !m.mutedAuthor);
      toast(m.mutedAuthor ? t('community.room.unmute', { name }) : t('community.room.muted', { name }));
    }
    await r.refreshRelations();
  };

  const grouped = useMemo(
    () =>
      visible.map((m, i) => {
        const prev = visible[i - 1];
        const same = prev && prev.author.kind === m.author.kind && prev.author.ref === m.author.ref && prev.author.isMe === m.author.isMe && m.createdAt - prev.createdAt < FIVE_MIN && !m.replyTo && prev.status !== 'removed';
        return { m, grouped: Boolean(same) };
      }),
    [visible]
  );

  const suspended = community?.suspension ?? null;
  const joined = Boolean(r.room?.joined);
  const canWrite = identity.registered && Boolean(community?.profile) && !suspended && joined && !r.room?.paused;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <IconButton icon="chevron-back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))} variant="soft" size={40} testID="room-back" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="title3" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textTertiary" numberOfLines={1}>
          {LANGUAGE_NAMES[lang as AppLanguage] || lang}
          {r.room ? ` · ${tp('community.members', r.room.members)}` : ''}
        </AppText>
      </View>
      {joined ? <IconButton icon="search-outline" label={t('community.room.search')} onPress={() => setSearchOpen(true)} size={40} testID="room-search" /> : null}
      {joined ? <IconButton icon="ellipsis-horizontal" label={t('community.room.notifications')} onPress={() => setSettingsOpen(true)} size={40} testID="room-settings" /> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="screen-room">
      <View style={{ flex: 1, paddingTop: hasSideNav ? space[5] : insets.top + space[2], paddingHorizontal: gutter }}>
        <View style={{ flex: 1, maxWidth: 860, width: '100%', alignSelf: 'center' }}>
          {header}
          <View style={{ paddingTop: space[2] }}>
            <Press onPress={() => router.push('/safety')} accessibilityRole="link" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
              <AppText variant="caption" color="textTertiary" style={{ flexShrink: 1 }}>
                {t('community.peerNotice')}
              </AppText>
              <AppText variant="caption" color="danger" numberOfLines={1}>
                {t('community.getHelp')}
              </AppText>
            </Press>
          </View>
          {r.connection === 'offline' ? (
            <View style={{ marginTop: space[2] }}>
              <Banner tone="warning" body={t('community.room.reconnecting')} />
            </View>
          ) : null}
          {r.room?.pinned ? (
            <Card tone="gold" padding={12} style={{ marginTop: space[2] }}>
              <AppText variant="label" color="onGoldSoft">
                {t('community.room.pinned')}
              </AppText>
              <AppText variant="small" numberOfLines={3}>
                {r.room.pinned.body}
              </AppText>
            </Card>
          ) : null}

          <ChatScroll contentKey={`${visible.length}-${r.anuliaThinking ?? ''}`}>
            {r.hasMore ? <Button label={t('community.room.loadEarlier')} variant="ghost" size="sm" onPress={r.loadEarlier} loading={r.loadingEarlier} style={{ alignSelf: 'center' }} testID="room-load-earlier" /> : null}
            {r.error ? <Banner tone="danger" body={t(`community.errors.${r.error}`) === `community.errors.${r.error}` ? t('community.errors.generic') : t(`community.errors.${r.error}`)} action={<Button label={t('common.retry')} size="sm" variant="secondary" onPress={r.reload} />} /> : null}
            {!r.loading && !r.error && r.room && !joined ? <EmptyState icon="lock-closed-outline" title={title} body={t('community.room.joinToRead')} /> : null}
            {!r.loading && !r.error && joined && !visible.length ? <EmptyState icon="chatbubbles-outline" title={title} body={t('community.room.empty')} /> : null}
            {grouped.map(({ m, grouped: g }) => (
              <MessageRow
                key={m.nonce && m.pending ? m.nonce : m.id}
                message={m}
                myName={community?.profile?.pseudonym}
                time={time(m.createdAt)}
                grouped={g}
                onMore={m.pending ? undefined : () => setMenuFor(m)}
                onReply={canWrite && m.status === 'visible' ? () => setReplyTo(m) : undefined}
                onReact={canWrite ? (reaction) => r.toggleReaction(m, reaction) : undefined}
                onRetry={() => send(m)}
              />
            ))}
            {r.anuliaThinking !== null ? (
              <View style={{ marginTop: space[3] }}>
                <TypingDots label={t('community.room.anuliaThinking')} />
              </View>
            ) : null}
          </ChatScroll>

          <View style={{ paddingTop: space[2], paddingBottom: hasSideNav ? space[4] : Math.max(insets.bottom, space[3]), gap: 8 }}>
            {notice ? <Banner tone="warning" body={notice} /> : null}
            {!identity.registered ? (
              <AccountGate returnTo={`/community/${encodeURIComponent(roomId)}`} />
            ) : !community?.profile ? (
              <Button label={t('community.setup.title')} onPress={() => router.replace('/community' as any)} fullWidth />
            ) : suspended ? (
              <Banner tone="warning" title={t('community.suspension.title')} body={suspended.kind === 'permanent' ? t('community.suspension.permanent', { reason: suspended.reason }) : t('community.suspension.temporary', { date: formatDate(suspended.endsAt || 0, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }), reason: suspended.reason })} />
            ) : !r.room ? (
              // Still loading: don't offer a composer that may turn into "Join room".
              <View style={{ height: 52 }} />
            ) : !r.room.joined ? (
              <View style={{ gap: 6 }}>
                <AppText variant="small" color="textSecondary" align="center">
                  {t('community.room.joinToWrite')}
                </AppText>
                <Button label={t('community.join')} icon="enter-outline" onPress={() => r.join().catch(() => toast(t('community.errors.generic')))} fullWidth testID="room-join" />
              </View>
            ) : r.room.paused ? (
              <Banner tone="info" body={t('community.room.paused')} />
            ) : (
              <Composer
                value={input}
                onChangeText={setInput}
                onSend={() => send()}
                placeholder={t('community.room.composer')}
                sending={sending}
                testID="room-composer"
                above={
                  <View style={{ gap: 8 }}>
                    {replyTo ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surfaceMuted }}>
                        <AppText variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
                          {t('community.room.replyingTo', { name: replyTo.author.kind === 'anulia' ? 'Anulia' : replyTo.author.pseudonym || '' })}
                        </AppText>
                        <IconButton icon="close" label={t('community.room.cancelReply')} onPress={() => setReplyTo(null)} size={28} />
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Chip label={askAnulia ? t('community.room.askAnuliaOn') : t('community.room.askAnulia')} icon="sparkles-outline" tone="lavender" selected={askAnulia} onPress={() => setAskAnulia((v) => !v)} testID="room-ask-anulia" />
                      {askAnulia ? (
                        <AppText variant="caption" color="textTertiary" style={{ flex: 1, minWidth: 160 }}>
                          {t('community.room.askAnuliaHint')}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>

      <MessageMenu
        message={menuFor}
        onClose={() => setMenuFor(null)}
        onReply={() => {
          setReplyTo(menuFor);
          setMenuFor(null);
        }}
        onReact={(reaction) => {
          if (menuFor) r.toggleReaction(menuFor, reaction);
          setMenuFor(null);
        }}
        onReport={() => {
          setReportFor(menuFor);
          setMenuFor(null);
        }}
        onBlock={() => menuFor && memberAction(menuFor, 'block')}
        onMute={() => menuFor && memberAction(menuFor, 'mute')}
        onDelete={async () => {
          const m = menuFor;
          setMenuFor(null);
          if (!m) return;
          if (!(await confirm({ title: t('community.room.deleteOwn'), body: t('community.room.deleteConfirm'), confirmLabel: t('common.delete'), destructive: true }))) return;
          try {
            await deleteMessage(m.id);
            r.removeLocal(m.id);
          } catch {
            toast(t('community.errors.generic'));
          }
        }}
      />
      <ReportSheet
        visible={Boolean(reportFor)}
        onClose={() => setReportFor(null)}
        onSend={async (reason, details) => {
          if (!reportFor) return;
          try {
            const res = await reportMessage(reportFor.id, reason, details || undefined);
            toast(res.alreadyReported ? t('community.report.already') : t('community.report.sent'));
            setReportFor(null);
          } catch (e) {
            toast(e instanceof ApiError ? t('community.errors.generic') : t('community.errors.generic'));
          }
        }}
      />
      <SafetySheet visible={r.safetyNotice} onClose={r.clearSafetyNotice} />
      <Sheet visible={searchOpen} onClose={() => setSearchOpen(false)} title={t('community.room.search')}>
        <TextField value={query} onChangeText={setQuery} placeholder={t('community.room.searchPlaceholder')} onSubmitEditing={runSearch} returnKeyType="search" autoFocus testID="room-search-input" />
        <Button label={t('common.search')} onPress={runSearch} variant="secondary" size="sm" style={{ marginTop: space[3] }} />
        <View style={{ marginTop: space[3], gap: 6 }}>
          {results && !results.length ? (
            <AppText variant="small" color="textSecondary">
              {t('community.room.noResults')}
            </AppText>
          ) : null}
          {(results || []).map((m) => (
            <ListRow key={m.id} title={m.author.kind === 'anulia' ? 'Anulia' : m.author.pseudonym || t('community.room.formerMember')} subtitle={`${time(m.createdAt)} · ${m.body.slice(0, 140)}`} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('community.room.notifications')}>
        {(['all', 'mentions', 'none'] as const).map((n) => (
          <ListRow
            key={n}
            title={t(`community.room.notify.${n}`)}
            right={r.room?.notify === n ? <AppText color="primary">✓</AppText> : null}
            onPress={async () => {
              await setRoomNotify(roomId, n).catch(() => {});
              r.setRoom(r.room ? { ...r.room, notify: n } : r.room);
              setSettingsOpen(false);
            }}
          />
        ))}
        <Button
          label={t('community.leave')}
          variant="danger"
          icon="exit-outline"
          style={{ marginTop: space[4] }}
          onPress={async () => {
            setSettingsOpen(false);
            if (!(await confirm({ title: t('community.leaveConfirmTitle'), body: t('community.leaveConfirmBody'), confirmLabel: t('community.leave') }))) return;
            await r.leave().catch(() => toast(t('community.errors.generic')));
          }}
          testID="room-leave"
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
