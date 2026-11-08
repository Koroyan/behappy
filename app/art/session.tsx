import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ART_SESSION_TEXT } from '@/content/artSessionText';
import { pickLocalized } from '@/content/types';
import { AppText, Banner, Button, Card, Icon, IconButton, space, useFeedback, useLayout, useTheme } from '@/design';
import { MaterialsCard } from '@/features/art/Materials';
import { buildMemoryContext } from '@/features/art/memoryContext';
import { needsAccess } from '@/features/art/program';
import { isStaleTurn, nextPhase, runIdFor } from '@/features/art/turnGuard';
import { ChatScroll, Composer, MessageBubble, TypingDots } from '@/features/chat/ChatKit';
import { useEnsureConsent } from '@/features/common/Consent';
import { LimitNotice } from '@/features/common/LimitNotice';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { ApiError, NetworkError, QuotaError } from '@/lib/api/client';
import { Artwork, artworkDataUrl, listArtworks, saveArtwork } from '@/lib/media/artworkStore';
import { MicPermissionError, speakText, stopSpeaking, transcribeRecording, useVoiceRecorder } from '@/lib/media/audio';
import { ImageTooLargeError, pickImage } from '@/lib/media/images';
import ArtTherapyProgramManager, { ArtTherapySession, SessionProgress } from '@/services/artTherapyProgramNew';
import artTherapyService, { ArtTherapyResponse, ChatMessage } from '@/services/artTherapyService';

const IMAGE_ONLY_INSTRUCTION =
  'An image was uploaded without text. Before guiding the art reflection session, apply the image eligibility rules and continue only if it clearly appears to be hand-made artwork the person made on paper for this session.';

const buildEndSessionControlContext = (source: 'button' | 'text') =>
  [
    `[User Action: The person asked to close the session via ${source}.]`,
    'Close the current art reflection session now without asking another exploration question.',
    'Return valid JSON with session_phase=2, phase_complete=true, session_complete=true, required_input="none", action="close_session", and include session_summary.',
    'response_text should be a brief warm closure in the user language, followed by no new question.',
  ].join('\n');

// Conservative: an ending word AND a session word near each other (see
// docs: "Art Therapy premature-close bug"). Only a soft hint for the model.
const isEndSessionTextIntent = (text: string): boolean => {
  const normalized = text.toLowerCase();
  const sessionWord = '(session|conversation|chat|summary|summarize|сесси|бесед|разговор|итог|резюм|სესია|სესიი|საუბარ|საუბრ|შეჯამ)';
  const endingStem = '(\\b(end|finish|close|stop|wrap up)\\b|заверш|законч|закры|остановит|სრულ|ხურ|წყვიტ)';
  return [new RegExp(`${endingStem}.{0,30}${sessionWord}`, 'i'), new RegExp(`${sessionWord}.{0,30}${endingStem}`, 'i'), /ավարտել.{0,30}(սեանս|խոսակց)/i].some((p) => p.test(normalized));
};

const RISK = new Set(['high', 'imminent']);

/** The first drawing of this session as a data URL (in memory, or from the saved artworks). */
async function firstDrawing(messages: ChatMessage[]): Promise<string | null> {
  const first = messages.find((m) => m.role === 'user' && (m.imageBase64 || m.imageUri));
  if (!first) return null;
  if (first.imageBase64) return first.imageBase64;
  const ref = first.imageUri?.startsWith('artwork:') ? first.imageUri.slice(8) : first.imageUri;
  return ref ? artworkDataUrl(ref).catch(() => null) : null;
}
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

export default function ArtSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const router = useRouter();
  const { t, tl, formatTime, formatDate, language } = useT();
  const { colors } = useTheme();
  const { hasSideNav, gutter, isCompact } = useLayout();
  const insets = useSafeAreaInsets();
  const { confirm, toast } = useFeedback();
  const ensureConsent = useEnsureConsent();
  const { entitlements, me, refresh: refreshAccount } = useAccount();
  const recorder = useVoiceRecorder();

  const [session, setSession] = useState<ArtTherapySession | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [completed, setCompleted] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [quota, setQuota] = useState<QuotaError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artworks, setArtworks] = useState<Record<string, Artwork>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const lastResponseIdRef = useRef<string | undefined>(undefined);
  const sendingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const hasProgram = entitlements.artProgram.active;
  const accessBlocked = needsAccess(id, hasProgram);

  // Fresh allowance numbers for the check below (and the time they were read: render stays pure).
  const [usageReadAt, setUsageReadAt] = useState(() => Date.now());
  useEffect(() => {
    refreshAccount().finally(() => setUsageReadAt(Date.now()));
  }, [refreshAccount]);

  // Today's new session is used and the server hasn't started this one: say so
  // before a drawing is uploaded, not as a refusal after it.
  const artUsage = me?.usage?.art;
  const dailyFull = Boolean(
    !completed &&
      !accessBlocked &&
      artUsage?.startedIds &&
      !artUsage.startedIds.includes(id) &&
      artUsage.startedToday >= artUsage.newSessionsPerDay &&
      (!artUsage.resetAt || usageReadAt < artUsage.resetAt)
  );
  const limit = quota && quota.reason !== 'need_art_access' ? { reason: quota.reason, resetAt: quota.resetAt } : dailyFull ? { reason: 'daily_new_session_limit', resetAt: artUsage?.resetAt ?? null } : null;
  const summaryLabel = pickLocalized(ART_SESSION_TEXT.sessionSummaryLabel, language);

  const refreshArtworks = useCallback(async () => {
    const list = await listArtworks();
    setArtworks(Object.fromEntries(list.map((a) => [a.id, a])));
  }, []);

  const persist = useCallback(
    async (msgs: ChatMessage[], phase: 0 | 1 | 2, response?: ArtTherapyResponse, answers?: string): Promise<SessionProgress | null> => {
      const map = await ArtTherapyProgramManager.getProgress();
      let sp = map.get(id);
      if (!sp) sp = await ArtTherapyProgramManager.startSession(id);
      // A reply that arrives after the stored conversation moved on (the screen
      // was left and opened again) must not overwrite the newer messages.
      if (answers && isStaleTurn(sp.chatHistory as { id?: string }[], answers)) return null;
      sp.chatHistory = msgs;
      sp.phase = phase;
      if (lastResponseIdRef.current) sp.lastResponseId = lastResponseIdRef.current;
      if (response?.session_complete && response?.response_text) {
        sp.completed = true;
        sp.completedAt = new Date();
        sp.clinicalSummary = response;
      }
      await ArtTherapyProgramManager.saveProgress(id, sp);
      setProgress({ ...sp });
      return sp;
    },
    [id]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await ArtTherapyProgramManager.initialize(language);
      ArtTherapyProgramManager.setLanguage(language);
      artTherapyService.setActiveSession(id);
      const s = await ArtTherapyProgramManager.getSessionById(id);
      if (!s) {
        setLoading(false);
        return;
      }
      setSession(s);
      if (!(await ArtTherapyProgramManager.isSessionUnlocked(id))) {
        setLocked(true);
        setLoading(false);
        return;
      }
      const map = await ArtTherapyProgramManager.getProgress();
      const sp = map.get(id) ?? null;
      setProgress(sp);
      setCompleted(Boolean(sp?.completed));
      lastResponseIdRef.current = sp?.lastResponseId;
      artTherapyService.setActiveRun(runIdFor(sp?.startedAt));
      const history = (sp?.chatHistory || []).map((m: any) => ({ ...m, id: m.id || uid(), timestamp: m.timestamp ? new Date(m.timestamp) : new Date() }));
      setMessages(history.length ? history : [{ id: uid(), role: 'assistant', content: `${s.title}\n\n${s.drawingPrompt}`, timestamp: new Date() }]);
      setShowMaterials(!history.some((m: any) => m.role === 'user'));
      await refreshArtworks();
      setLoading(false);
    })();
    return () => {
      stopSpeaking();
      artTherapyService.setActiveSession(undefined);
    };
  }, [id, language, refreshArtworks]);

  const formatAssistant = (r: ArtTherapyResponse) => {
    const text = r.response_text || '';
    const closing = r.session_complete || r.action === 'close_session' || (r.session_phase === 2 && r.phase_complete);
    const summary = closing && r.session_summary ? r.session_summary.trim() : '';
    return !summary || text.includes(summary) ? text : `${text}\n\n${summaryLabel}\n${summary}`;
  };

  const send = async (opts: { text?: string; imageUri?: string; imageBase64?: string; control?: string } = {}) => {
    // A ref, not state: two quick taps arrive before `streaming` re-renders.
    if (completed || streaming || sendingRef.current || !session) return;
    const outgoing = (opts.text ?? input).trim();
    if (!outgoing && !opts.imageBase64) return;
    sendingRef.current = true;
    try {
      if (!(await ensureConsent())) return;
      await sendTurn(outgoing, opts);
    } finally {
      sendingRef.current = false;
    }
  };

  const sendTurn = async (outgoing: string, opts: { text?: string; imageUri?: string; imageBase64?: string; control?: string }) => {
    if (!session) return;
    setError(null);

    const prior = messagesRef.current;
    // A second drawing: send the first one again next to it, so the AI sees both
    // side by side even when the stored conversation can't be continued.
    const reference = opts.imageBase64 ? await firstDrawing(prior) : null;
    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content: outgoing,
      apiOnlyContent: !outgoing && opts.imageBase64 ? IMAGE_ONLY_INSTRUCTION : undefined,
      timestamp: new Date(),
      imageUri: opts.imageUri,
      imageBase64: opts.imageBase64,
      ...(reference ? { referenceImageBase64: reference } : {}),
    };
    const nextMessages = [...prior, userMessage];
    setMessages(nextMessages);
    setInput('');
    const phase = (progress?.phase ?? 0) as 0 | 1 | 2;
    const saved = await persist(nextMessages, phase);
    artTherapyService.setActiveRun(runIdFor(saved?.startedAt));

    const buttonClose = Boolean(opts.control);
    const textHint = !buttonClose && isEndSessionTextIntent(outgoing);
    const lastClinical = [...prior].reverse().find((m) => m.role === 'assistant' && m.clinicalData)?.clinicalData;
    const isModifiedUpload = Boolean(opts.imageBase64 && !outgoing && lastClinical?.required_input === 'image_v2');
    const memory = await buildMemoryContext();
    const control = opts.control || (textHint ? buildEndSessionControlContext('text') : '');

    setStreaming(true);
    setStreamText('');
    try {
      let gotResponseId = false;
      let response = await artTherapyService.sendMessageStream(
        nextMessages,
        session.theme,
        language,
        phase,
        (partial) => setStreamText(partial),
        [memory, control].filter(Boolean).join('\n\n'),
        lastResponseIdRef.current,
        (rid) => {
          gotResponseId = true;
          lastResponseIdRef.current = rid;
        }
      );
      // No id back (the server keeps nothing at OpenAI): next turn sends the full history.
      if (!gotResponseId) lastResponseIdRef.current = undefined;
      if (isModifiedUpload) {
        response = { ...response, session_phase: 1, phase_complete: false, session_complete: false, required_input: 'text', action: 'analyze_second_drawing' };
      }
      if (buttonClose) {
        response = {
          ...response,
          session_phase: 2,
          phase_complete: true,
          session_complete: true,
          required_input: 'none',
          action: 'close_session',
          session_summary: response.session_summary || response.phase_summary || pickLocalized(ART_SESSION_TEXT.fallbackSessionSummary, language),
        };
      } else if (response.session_complete && /[?？]\s*$/.test((response.response_text || '').trim())) {
        // The model's visible question wins over a contradictory "complete" flag.
        response = { ...response, session_complete: false, phase_complete: false, required_input: 'text', action: 'continue_exploration' };
      }
      const aiMessage: ChatMessage = { id: uid(), role: 'assistant', content: formatAssistant(response), timestamp: new Date(), clinicalData: response };
      const finalMessages = [...nextMessages, aiMessage];
      // The conversation moved on while this reply was on its way: drop it.
      const stored = (await ArtTherapyProgramManager.getProgress()).get(id);
      if (isStaleTurn(stored?.chatHistory as { id?: string }[], userMessage.id)) return;
      setMessages(finalMessages);
      const finalPhase = nextPhase(phase, response.session_phase);
      const done = response.session_complete || response.action === 'close_session' || (response.session_phase === 2 && response.phase_complete && Boolean(response.session_summary));
      if (done) {
        await ArtTherapyProgramManager.completeSession(id, { ...response, session_complete: true }, finalMessages);
        setCompleted(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        await persist(finalMessages, finalPhase, response, userMessage.id);
      }
    } catch (e) {
      if (e instanceof QuotaError) {
        // Refused before anything was sent: put the conversation back as it was
        // (a first turn leaves the session unstarted) and keep the typed words.
        setMessages(prior);
        if (outgoing) setInput(outgoing);
        if (prior.some((m) => m.role === 'user')) await persist(prior, phase);
        else {
          await ArtTherapyProgramManager.discardSession(id);
          setProgress(null);
        }
        setQuota(e);
        refreshAccount();
      } else if (e instanceof NetworkError) setError(t('errors.network'));
      else if (e instanceof ApiError && e.status === 503) setError(t('errors.ai'));
      else setError(t('art.workspace.errorSend'));
    } finally {
      setStreaming(false);
      setStreamText('');
    }
  };

  const upload = async (source: 'library' | 'camera') => {
    // Never accept a photo while a reply is streaming: it would be saved but not sent.
    if (streaming || completed) return;
    if (!(await ensureConsent())) return;
    try {
      const img = await pickImage(source);
      if (!img) return;
      const art = await saveArtwork(id, img.dataUrl).catch(() => null);
      await refreshArtworks();
      const ref = art ? (Platform.OS === 'web' ? `artwork:${art.id}` : art.uri) : undefined;
      setShowMaterials(false);
      await send({ imageUri: ref, imageBase64: img.dataUrl, text: input });
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
        if (e instanceof QuotaError) setQuota(e);
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
      toast(e instanceof MicPermissionError ? t('anulia.micDenied') : t('anulia.voiceUnavailable'));
    }
  };

  const endEarly = async () => {
    if (completed || streaming) return;
    const ok = await confirm({ title: t('art.workspace.endConfirmTitle'), body: t('art.workspace.endConfirmBody'), confirmLabel: t('art.workspace.endSession') });
    if (!ok) return;
    await send({ text: pickLocalized(ART_SESSION_TEXT.endSessionUserMessage, language), control: buildEndSessionControlContext('button') });
  };

  const listen = async (mid: string, text: string) => {
    if (speakingId === mid) {
      await stopSpeaking();
      setSpeakingId(null);
      return;
    }
    if (!(await ensureConsent())) return;
    setSpeakingId(mid);
    try {
      await speakText(text, language);
    } catch {
      // ignore
    } finally {
      setSpeakingId((cur) => (cur === mid ? null : cur));
    }
  };

  const resolveImage = (uri?: string) => {
    if (!uri) return undefined;
    if (uri.startsWith('artwork:')) return artworks[uri.slice(8)]?.uri;
    return uri;
  };

  const lastRisk = [...messages].reverse().find((m) => m.clinicalData?.safety_assessment?.risk_level)?.clinicalData?.safety_assessment?.risk_level;
  const risky = lastRisk ? RISK.has(String(lastRisk)) : false;
  const phase = (progress?.phase ?? 0) as 0 | 1 | 2;
  const phaseNames = tl('art.workspace.phases');
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.clinicalData;
  const wantsImage = !completed && (!messages.some((m) => m.imageBase64 || m.imageUri) || lastAssistant?.required_input === 'image_v1' || lastAssistant?.required_input === 'image_v2');
  const nextId = id < 43 ? id + 1 : null;

  const body = () => {
    if (loading) return <TypingDots />;
    if (!session) return <Banner tone="warning" body={t('errors.loadFailed')} />;
    if (locked)
      return (
        <Card padding={24}>
          <AppText variant="title2">{t('art.workspace.lockedTitle')}</AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            {t('art.workspace.lockedBody')}
          </AppText>
          <Button label={t('art.workspace.backToProgram')} onPress={() => router.replace('/art')} style={{ marginTop: space[4] }} />
        </Card>
      );
    if (accessBlocked || quota?.reason === 'need_art_access')
      return (
        <Card tone="peach" padding={24}>
          <AppText variant="title2">{t('art.workspace.needAccess')}</AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            {t('art.access.freeFirst')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
            <Button label={t('art.access.cta')} onPress={() => router.push('/pricing')} />
            <Button label={t('art.workspace.backToProgram')} variant="quiet" onPress={() => router.replace('/art')} />
          </View>
        </Card>
      );
    return null;
  };

  const blocking = body();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="screen-art-session">
      <View style={{ flex: 1, paddingTop: hasSideNav ? space[5] : insets.top + space[2], paddingHorizontal: gutter }}>
        <View style={{ maxWidth: 860, width: '100%', alignSelf: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <IconButton icon="chevron-back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/art/${id}`))} variant="soft" size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {t('art.session.label', { number: id })}
                {session ? ` · ${t(`art.modules.${session.module}`)}` : ''}
              </AppText>
              <AppText variant="title3" numberOfLines={1}>
                {session?.title ?? ''}
              </AppText>
            </View>
            {!completed && !blocking && !limit ? <Button label={t('art.workspace.endSession')} variant="quiet" size="sm" onPress={endEarly} testID="art-end" /> : null}
          </View>

          {!blocking ? (
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: space[3] }} accessibilityRole="progressbar" accessibilityLabel={phaseNames[phase]}>
              {phaseNames.map((name, i) => (
                <View key={name} style={{ flex: 1, gap: 4 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= (completed ? 2 : phase) ? colors.brand : colors.surfaceSunken }} />
                  {!isCompact ? (
                    <AppText variant="caption" color={i === phase && !completed ? 'text' : 'textTertiary'} numberOfLines={1}>
                      {name}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {risky ? <Banner tone="danger" title={t('nav.needHelpNow')} body={t('safety.notAlone')} action={<Button label={t('safety.title')} variant="danger" size="sm" icon="heart-outline" onPress={() => router.push('/safety')} />} /> : null}

          {blocking ? (
            <View style={{ paddingTop: space[6] }}>{blocking}</View>
          ) : (
            <>
              <ChatScroll contentKey={`${messages.length}-${streamText.length}`}>
                {showMaterials ? (
                  <View style={{ marginBottom: space[4] }}>
                    <MaterialsCard compact onClose={() => setShowMaterials(false)} />
                  </View>
                ) : null}
                {messages.map((m) => {
                  const [main, summary] = m.role === 'assistant' && m.content.includes(`\n${summaryLabel}\n`) ? m.content.split(`\n${summaryLabel}\n`) : [m.content, ''];
                  return (
                    <View key={m.id}>
                      <MessageBubble
                        role={m.role === 'user' ? 'user' : 'assistant'}
                        text={main.trim()}
                        imageUri={resolveImage(m.imageUri) ?? (m.imageBase64 && !m.imageUri ? m.imageBase64 : undefined)}
                        time={formatTime(m.timestamp)}
                        onListen={m.role === 'assistant' ? () => listen(m.id, main) : undefined}
                        listening={speakingId === m.id}
                        testID={m.role === 'user' ? 'msg-user' : 'msg-ai'}
                      />
                      {summary ? (
                        <Card tone="primary" padding={16} style={{ marginStart: 40, marginBottom: space[4] }}>
                          <AppText variant="smallStrong" color="onPrimarySoft">
                            {summaryLabel}
                          </AppText>
                          <AppText variant="body" style={{ marginTop: 6 }}>
                            {summary.trim()}
                          </AppText>
                        </Card>
                      ) : null}
                    </View>
                  );
                })}
                {streaming ? streamText ? <MessageBubble role="assistant" text={streamText} streaming /> : <TypingDots label={t('anulia.thinking')} /> : null}
                {completed ? (
                  <Card tone="sage" padding={20} style={{ marginBottom: space[4] }} testID="art-complete">
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <Icon name="checkmark-circle" size={24} color="success" />
                      <AppText variant="title3">{t('art.workspace.completedTitle')}</AppText>
                    </View>
                    <AppText variant="small" color="textSecondary" style={{ marginTop: 6 }}>
                      {progress?.completedAt ? `${formatDate(progress.completedAt, { day: 'numeric', month: 'long' })} · ` : ''}
                      {t('art.workspace.completedBody')}
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
                      {nextId ? <Button label={t('art.workspace.nextSession')} iconRight="arrow-forward" onPress={() => router.replace(`/art/${nextId}`)} /> : null}
                      <Button label={t('art.workspace.backToProgram')} variant="quiet" onPress={() => router.replace('/art')} />
                    </View>
                  </Card>
                ) : null}
              </ChatScroll>

              <View style={{ paddingTop: space[2], paddingBottom: hasSideNav ? space[4] : Math.max(insets.bottom, space[3]), gap: 8 }}>
                {error ? <Banner tone="warning" body={error} /> : null}
                {limit ? (
                  <LimitNotice
                    title={t('anulia.limitDailyTitle')}
                    body={t(limit.reason === 'session_message_limit' ? 'art.workspace.sessionLimit' : 'art.workspace.dailyLimit')}
                    resetAt={limit.resetAt}
                    showUpgrade={!entitlements.plus.active}
                  />
                ) : null}
                {completed ? (
                  <AppText variant="caption" color="textTertiary" align="center">
                    {t('art.workspace.readOnly')}
                  </AppText>
                ) : limit || quota ? null : (
                  <Composer
                    value={input}
                    onChangeText={setInput}
                    onSend={() => send()}
                    placeholder={t('art.workspace.placeholder')}
                    sending={streaming}
                    onAttach={() => upload('library')}
                    attachLabel={t('art.workspace.uploadPhoto')}
                    onCamera={Platform.OS !== 'web' ? () => upload('camera') : undefined}
                    onVoice={toggleVoice}
                    recording={recorder.recording}
                    transcribing={transcribing}
                    above={
                      wantsImage ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.peachSoft }}>
                          <Icon name="image-outline" size={20} color="onPeachSoft" />
                          <AppText variant="small" color="onPeachSoft" style={{ flex: 1 }}>
                            {t('art.workspace.photoHint')}
                          </AppText>
                          <Button label={t('art.workspace.uploadPhoto')} size="sm" variant="primary" onPress={() => upload('library')} disabled={streaming} testID="art-upload" />
                        </View>
                      ) : null
                    }
                  />
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
