import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnuliaMark, AppText, Banner, Button, Card, Chip, Icon, IconButton, Sheet, space, useFeedback, useLayout, useTheme } from '@/design';
import {
  Conversation,
  ConversationSummary,
  deleteConversation,
  getConversation,
  lastActivity,
  listConversations,
  makeMessage,
  newConversation,
  saveConversation,
  sendToAnulia,
  summarizeConversation,
} from '@/features/anulia/anuliaService';
import { ConversationList } from '@/features/anulia/ConversationList';
import { ChatScroll, Composer, MessageBubble, TypingDots } from '@/features/chat/ChatKit';
import { useEnsureConsent } from '@/features/common/Consent';
import { LimitNotice } from '@/features/common/LimitNotice';
import { useT } from '@/i18n';
import { getLastAiMeta } from '@/lib/api/ai';
import { NetworkError, QuotaError } from '@/lib/api/client';
import { MicPermissionError, speakText, stopSpeaking, transcribeRecording, useVoiceRecorder, VoiceUnsupportedError } from '@/lib/media/audio';
import { ImageTooLargeError, pickImage } from '@/lib/media/images';
import { getUserProfile } from '@/services/userProfileService';

const RISKY = new Set(['high', 'imminent', 'severe', 'critical', 'moderate_high']);
const RESUME_WINDOW_MS = 12 * 60 * 60 * 1000;

export default function AnuliaScreen() {
  const params = useLocalSearchParams<{ c?: string; starter?: string }>();
  const router = useRouter();
  const { t, tl, formatTime, formatDate, language } = useT();
  const { colors } = useTheme();
  const { isDesktop, hasSideNav, gutter, isCompact } = useLayout();
  const headerBtn = isCompact ? 40 : 44;
  const insets = useSafeAreaInsets();
  const { confirm, toast } = useFeedback();
  const ensureConsent = useEnsureConsent();
  const recorder = useVoiceRecorder();

  const [conv, setConv] = useState<Conversation>(() => newConversation());
  const [all, setAll] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [limit, setLimit] = useState<QuotaError | null>(null);
  const [graceLeft, setGraceLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const convRef = useRef(conv);
  convRef.current = conv;

  const refreshList = useCallback(async () => setAll(await listConversations()), []);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      setFirstName(profile?.name?.trim().split(/\s+/)[0] ?? '');
      const list = await listConversations();
      setAll(list);
      if (params.c) {
        const found = await getConversation(params.c);
        if (found) return setConv(found);
      }
      const recent = list.find((c) => c.messages.some((m) => m.type === 'user'));
      if (recent && !params.starter && Date.now() - lastActivity(recent) < RESUME_WINDOW_MS && !recent.summary) setConv(recent);
    })();
  }, [params.c, params.starter]);

  useEffect(() => {
    if (params.starter) setInput(String(params.starter));
  }, [params.starter]);

  useFocusEffect(
    useCallback(() => {
      refreshList();
      return () => {
        stopSpeaking();
      };
    }, [refreshList])
  );

  const persist = async (next: Conversation) => {
    setConv(next);
    await saveConversation(next);
    refreshList();
  };

  const send = async (opts: { text?: string; imageDataUrl?: string; imageUri?: string; retryOf?: string } = {}) => {
    const text = (opts.text ?? input).trim();
    if ((!text && !opts.imageDataUrl) || sending) return;
    if (!(await ensureConsent())) return;
    setError(null);

    let base = convRef.current;
    let userMsg;
    if (opts.retryOf) {
      userMsg = base.messages.find((m) => m.id === opts.retryOf)!;
      base = { ...base, messages: base.messages.map((m) => (m.id === opts.retryOf ? { ...m, failed: false } : m)) };
    } else {
      userMsg = makeMessage('user', text || t('anulia.imageShared'), { imageUri: opts.imageUri });
      base = { ...base, messages: [...base.messages, userMsg] };
      setInput('');
    }
    await persist(base);

    setSending(true);
    setStreamText('');
    try {
      const { reply, responseId, memoryVersion, memoryHash } = await sendToAnulia({
        conversation: base,
        history: base.messages,
        text: opts.imageDataUrl ? `${text ? `${text}\n\n` : ''}${t('anulia.imageInstruction')}` : userMsg.content,
        imageDataUrl: opts.imageDataUrl,
        language,
        onDelta: (partial) => setStreamText(partial),
      });
      const aiMsg = makeMessage('ai', reply.response_text, { aiResponse: reply });
      const next: Conversation = {
        ...base,
        messages: [...base.messages, aiMsg],
        lastResponseId: responseId ?? base.lastResponseId,
        // The chain now matches this memory consent (see sendToAnulia).
        memoryVersion: responseId ? memoryVersion : base.memoryVersion,
        memoryHash: responseId ? memoryHash : base.memoryHash,
        insights: [...base.insights, ...(reply.key_insights ?? [])].slice(-30),
        emotions: reply.detected_emotion ? [...base.emotions, { emotion: reply.detected_emotion, intensity: 5, timestamp: new Date().toISOString() }].slice(-60) : base.emotions,
      };
      await persist(next);
      const meta = getLastAiMeta();
      setGraceLeft(meta.grace !== undefined ? meta.grace : null);
    } catch (e) {
      if (e instanceof QuotaError) {
        setLimit(e);
      } else {
        await persist({ ...base, messages: base.messages.map((m) => (m.id === userMsg.id ? { ...m, failed: true } : m)) });
        setError(e instanceof NetworkError ? t('anulia.unavailable') : t('anulia.errorReply'));
      }
    } finally {
      setSending(false);
      setStreamText(null);
    }
  };

  const shareImage = async () => {
    if (!(await ensureConsent())) return;
    try {
      const img = await pickImage('library');
      if (img) await send({ text: input, imageDataUrl: img.dataUrl, imageUri: img.displayUri });
    } catch (e) {
      toast(e instanceof ImageTooLargeError ? t('anulia.imageTooLarge') : t('anulia.imageFailed'));
    }
  };

  const toggleVoice = async () => {
    if (recorder.recording) {
      const rec = await recorder.stop();
      if (!rec) return;
      setTranscribing(true);
      try {
        const text = await transcribeRecording(rec.uri, rec.mime, language);
        if (text) setInput((cur) => (cur ? `${cur} ${text}` : text));
      } catch (e) {
        if (e instanceof QuotaError) setLimit(e);
        else toast(t('errors.ai'));
      } finally {
        setTranscribing(false);
      }
      return;
    }
    if (!(await ensureConsent())) return;
    try {
      await recorder.start();
    } catch (e) {
      toast(e instanceof MicPermissionError ? t('anulia.micDenied') : e instanceof VoiceUnsupportedError ? t('anulia.voiceUnavailable') : t('anulia.voiceUnavailable'));
    }
  };

  const listen = async (id: string, text: string) => {
    if (speakingId === id) {
      await stopSpeaking();
      setSpeakingId(null);
      return;
    }
    if (!(await ensureConsent())) return;
    setSpeakingId(id);
    try {
      await speakText(text, language);
    } catch (e) {
      if (e instanceof QuotaError) toast(t('anulia.limitDailyTitle'));
    } finally {
      setSpeakingId((cur) => (cur === id ? null : cur));
    }
  };

  const startNew = () => {
    stopSpeaking();
    setConv(newConversation());
    setLimit(null);
    setGraceLeft(null);
    setError(null);
    setInput('');
    router.setParams({ c: undefined, starter: undefined } as any);
  };

  const finish = async () => {
    if (!conv.messages.some((m) => m.type === 'ai')) return;
    const ok = await confirm({ title: t('anulia.endConfirmTitle'), body: t('anulia.endConfirmBody'), confirmLabel: t('anulia.endConversation') });
    if (!ok) return;
    if (!(await ensureConsent())) return;
    setSummarizing(true);
    try {
      const s = await summarizeConversation(conv, language);
      await persist({ ...conv, summary: s, endTime: new Date().toISOString() });
      setSummary(s);
    } catch {
      await persist({ ...conv, endTime: new Date().toISOString() });
      toast(t('errors.ai'));
    } finally {
      setSummarizing(false);
    }
  };

  const removeConversation = async (id: string) => {
    const ok = await confirm({ title: t('anulia.deleteConversation'), body: t('anulia.deleteConfirm'), confirmLabel: t('common.delete'), destructive: true });
    if (!ok) return;
    await deleteConversation(id);
    if (id === conv.id) startNew();
    refreshList();
  };

  const risky = conv.messages.some((m) => m.aiResponse?.crisis_level && RISKY.has(String(m.aiResponse.crisis_level).toLowerCase()));
  const empty = !conv.messages.length;
  const welcome = firstName ? t('anulia.welcomeNamed', { name: firstName }) : t('anulia.welcome');

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: isCompact ? 8 : 12, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <AnuliaMark size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="title3">{t('anulia.name')}</AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {sending ? t('anulia.thinking') : t('anulia.role')}
        </AppText>
      </View>
      {!isDesktop ? <IconButton icon="time-outline" label={t('anulia.history')} onPress={() => router.push('/anulia/history')} variant="soft" size={headerBtn} testID="anulia-history" /> : null}
      <IconButton icon="bookmark-outline" label={t('wb.memory.title')} onPress={() => router.push('/anulia/memory' as any)} variant="soft" size={headerBtn} testID="anulia-memory" />
      <IconButton icon="add" label={t('anulia.newConversation')} onPress={startNew} variant="soft" size={headerBtn} testID="anulia-new" />
      <IconButton icon="checkmark-done-outline" label={t('anulia.endConversation')} onPress={finish} variant="soft" size={headerBtn} disabled={summarizing || !conv.messages.some((m) => m.type === 'ai')} testID="anulia-finish" />
    </View>
  );

  const chat = (
    <View style={{ flex: 1, maxWidth: 820, width: '100%', alignSelf: 'stretch' }}>
      {header}
      {risky ? (
        <View style={{ marginTop: space[3] }}>
          <Banner tone="danger" title={t('nav.needHelpNow')} body={t('safety.notAlone')} action={<Button label={t('safety.title')} variant="danger" size="sm" icon="heart-outline" onPress={() => router.push('/safety')} />} />
        </View>
      ) : null}
      <ChatScroll contentKey={`${conv.messages.length}-${streamText?.length ?? 0}`}>
        {empty ? (
          <View style={{ gap: space[4] }}>
            <MessageBubble role="assistant" text={welcome} />
            <View style={{ paddingStart: 40, gap: space[2] }}>
              <AppText variant="smallStrong" color="textSecondary">
                {t('anulia.startersTitle')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tl('anulia.starters').map((s) => (
                  <Chip key={s} label={s} action onPress={() => send({ text: s })} testID="anulia-starter" />
                ))}
              </View>
            </View>
          </View>
        ) : null}
        {conv.messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.type === 'user' ? 'user' : 'assistant'}
            text={m.content}
            imageUri={m.imageUri}
            time={formatTime(m.timestamp)}
            failed={m.failed}
            onRetry={m.failed ? () => send({ retryOf: m.id }) : undefined}
            onListen={m.type === 'ai' ? () => listen(m.id, m.content) : undefined}
            listening={speakingId === m.id}
            testID={m.type === 'user' ? 'msg-user' : 'msg-ai'}
          />
        ))}
        {streamText !== null ? streamText ? <MessageBubble role="assistant" text={streamText} streaming /> : <TypingDots label={t('anulia.thinking')} /> : null}
        {conv.summary ? (
          <Card tone="primary" padding={18} style={{ marginBottom: space[4] }}>
            <AppText variant="smallStrong" color="onPrimarySoft">
              {t('anulia.summaryTitle')}
            </AppText>
            {conv.summary.themes.length ? (
              <AppText variant="small" style={{ marginTop: 6 }}>
                {conv.summary.themes.join(' · ')}
              </AppText>
            ) : null}
            <Button label={t('anulia.newConversation')} variant="secondary" size="sm" icon="add" onPress={startNew} style={{ marginTop: space[3] }} />
          </Card>
        ) : null}
      </ChatScroll>

      <View style={{ paddingTop: space[2], paddingBottom: hasSideNav ? space[4] : space[3], gap: 8 }}>
        {error ? <Banner tone="warning" body={error} /> : null}
        {graceLeft !== null && !limit ? <Banner tone="info" body={t('anulia.graceNote')} /> : null}
        {limit ? (
          <LimitNotice
            title={limit.reason === 'daily_limit' ? t('anulia.limitDailyTitle') : t('anulia.limitTitle')}
            body={limit.reason === 'daily_limit' ? t('anulia.limitDailyBody') : t('anulia.limitBody', { date: limit.resetAt ? formatDate(limit.resetAt, { day: 'numeric', month: 'long' }) : '' })}
            resetAt={limit.resetAt}
            showUpgrade={limit.tier !== 'plus'}
          />
        ) : (
          <Composer
            value={input}
            onChangeText={setInput}
            onSend={() => send()}
            placeholder={t('anulia.placeholder')}
            sending={sending}
            onAttach={shareImage}
            onVoice={toggleVoice}
            recording={recorder.recording}
            transcribing={transcribing}
          />
        )}
        <AppText variant="caption" color="textTertiary" align="center">
          {t('anulia.disclaimer')}
        </AppText>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="screen-anulia">
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: isDesktop ? 'flex-start' : 'center', paddingTop: hasSideNav ? space[5] : insets.top + space[2], paddingHorizontal: gutter, gap: space[6] }}>
        {isDesktop ? (
          <View style={{ width: 280, paddingTop: 4 }}>
            <Button label={t('anulia.newConversation')} icon="add" variant="secondary" onPress={startNew} fullWidth />
            <AppText variant="label" color="textTertiary" style={{ marginTop: space[5], marginBottom: space[2] }}>
              {t('anulia.history')}
            </AppText>
            <ScrollView style={{ flex: 1 }}>
              <ConversationList conversations={all} activeId={conv.id} onOpen={async (id) => { const c = await getConversation(id); if (c) { setConv(c); setLimit(null); } }} onDelete={removeConversation} />
            </ScrollView>
            <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3], marginBottom: space[4] }}>
              {t('anulia.privacyNote')}
            </AppText>
          </View>
        ) : null}
        {chat}
      </View>

      <Sheet visible={Boolean(summary)} onClose={() => setSummary(null)} title={t('anulia.summaryTitle')} footer={<Button label={t('anulia.newConversation')} icon="add" onPress={() => { setSummary(null); startNew(); }} fullWidth />}>
        {summary ? (
          <View style={{ gap: space[4] }}>
            {summary.themes.length ? (
              <View style={{ gap: 6 }}>
                <AppText variant="smallStrong" color="textSecondary">
                  {t('anulia.summaryThemes')}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {summary.themes.map((th) => (
                    <Chip key={th} label={th} tone="lavender" selected />
                  ))}
                </View>
              </View>
            ) : null}
            {summary.insights.map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="ellipse" size={8} color="brand" style={{ marginTop: 8 }} />
                <AppText variant="body" style={{ flex: 1 }}>
                  {i}
                </AppText>
              </View>
            ))}
            {summary.practice.length ? (
              <Card tone="sage" padding={16}>
                <AppText variant="smallStrong">{t('anulia.summaryPractice')}</AppText>
                {summary.practice.map((p) => (
                  <AppText key={p} variant="small" style={{ marginTop: 6 }}>
                    {p}
                  </AppText>
                ))}
              </Card>
            ) : null}
            <AppText variant="caption" color="textTertiary">
              {t('anulia.summaryNote')}
            </AppText>
          </View>
        ) : null}
      </Sheet>
    </KeyboardAvoidingView>
  );
}
