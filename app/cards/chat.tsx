import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDeck } from '@/content/cardDecks';
import { pickLocalized } from '@/content/types';
import { AppText, Banner, Button, Card, IconButton, space, useFeedback, useLayout, useTheme } from '@/design';
import { CardSession, completeSession, getSession, newCardSessionId, saveOngoing } from '@/features/cards/storage';
import { ChatScroll, Composer, MessageBubble, TypingDots } from '@/features/chat/ChatKit';
import { useEnsureConsent } from '@/features/common/Consent';
import { LimitNotice } from '@/features/common/LimitNotice';
import { useT } from '@/i18n';
import { QuotaError } from '@/lib/api/client';
import { assetToDataUrl } from '@/lib/media/images';
import cardTherapyService, { CardContext, ChatMessage } from '@/services/cardTherapyService';

export default function CardChatScreen() {
  const params = useLocalSearchParams<{ deck?: string; card?: string; light?: string; heavy?: string; session?: string }>();
  const router = useRouter();
  const { t, language } = useT();
  const { colors } = useTheme();
  const { hasSideNav, gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const { confirm } = useFeedback();
  const ensureConsent = useEnsureConsent();

  const [session, setSession] = useState<CardSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [quota, setQuota] = useState<QuotaError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsStart, setNeedsStart] = useState(false);
  const lastIdRef = useRef<string | undefined>(undefined);
  const sessionRef = useRef<CardSession | null>(null);
  sessionRef.current = session;

  const deck = getDeck(String(session?.choice?.deck ?? params.deck ?? ''));
  const cards = session?.choice?.cards ?? (params.card !== undefined ? [Number(params.card)] : params.light !== undefined ? [Number(params.light), Number(params.heavy)] : []);

  useEffect(() => {
    (async () => {
      if (params.session) {
        const found = await getSession(String(params.session));
        if (found) {
          setSession(found.session);
          setMessages(found.session.messages || []);
          lastIdRef.current = found.session.lastResponseId;
          setClosed(found.completed);
          return;
        }
      }
      if (!deck || !cards.length) return;
      const ctx: CardContext = {
        cardType: deck.cardType,
        cardId: String(cards[0] + 1),
        positiveCardId: deck.mode === 'pair' ? String(cards[0] + 1) : undefined,
        negativeCardId: deck.mode === 'pair' ? String(cards[1] + 1) : undefined,
        language,
      };
      setSession({ id: newCardSessionId(), cardContext: ctx, messages: [], startedAt: Date.now(), lastUpdatedAt: Date.now(), exchangeCount: 0, choice: { deck: deck.id, cards } });
      setNeedsStart(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.session]);

  const persist = async (s: CardSession, msgs: ChatMessage[]) => {
    const next = { ...s, messages: msgs, lastUpdatedAt: Date.now(), exchangeCount: cardTherapyService.countExchanges(msgs), lastResponseId: lastIdRef.current };
    setSession(next);
    await saveOngoing(next);
    return next;
  };

  const start = async () => {
    const s = sessionRef.current;
    if (!s || !deck) return;
    if (!(await ensureConsent())) return;
    setNeedsStart(false);
    setSending(true);
    setError(null);
    try {
      const images = await Promise.all(cards.map((c) => assetToDataUrl(deck.cards[c])));
      const welcome = await cardTherapyService.startSession(
        { ...s.cardContext, language },
        deck.mode === 'single' ? images[0] : null,
        deck.mode === 'pair' ? images[0] : null,
        deck.mode === 'pair' ? images[1] : null,
        (rid) => {
          lastIdRef.current = rid;
        },
        s.id
      );
      const msgs: ChatMessage[] = [{ role: 'assistant', content: welcome }];
      setMessages(msgs);
      await persist(s, msgs);
    } catch (e) {
      if (e instanceof QuotaError) setQuota(e);
      else {
        setError(t('cards.chat.errorSend'));
        setNeedsStart(true);
      }
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const s = sessionRef.current;
    const text = input.trim();
    if (!s || !text || sending || closed) return;
    if (!(await ensureConsent())) return;
    const withUser: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(withUser);
    setInput('');
    await persist(s, withUser);
    setSending(true);
    setStreamText('');
    setError(null);
    try {
      let acc = '';
      const reply = await cardTherapyService.sendMessage(
        withUser,
        { ...s.cardContext, language },
        (delta) => {
          acc += delta;
          setStreamText(acc);
        },
        lastIdRef.current,
        (rid) => {
          lastIdRef.current = rid;
        },
        s.id
      );
      const finalMsgs: ChatMessage[] = [...withUser, { role: 'assistant', content: reply }];
      setMessages(finalMsgs);
      const saved = await persist(s, finalMsgs);
      if (cardTherapyService.isSummaryMessage(reply)) {
        await completeSession(saved, reply);
        setClosed(true);
      }
    } catch (e) {
      if (e instanceof QuotaError) setQuota(e);
      else setError(t('cards.chat.errorSend'));
    } finally {
      setSending(false);
      setStreamText(null);
    }
  };

  const summarize = async () => {
    const s = sessionRef.current;
    if (!s || sending) return;
    const ok = await confirm({ title: t('cards.chat.summarize'), confirmLabel: t('cards.chat.summarize') });
    if (!ok) return;
    if (!(await ensureConsent())) return;
    setSending(true);
    try {
      const summary = await cardTherapyService.requestSummary(messages, { ...s.cardContext, language }, lastIdRef.current, (rid) => (lastIdRef.current = rid), s.id);
      const finalMsgs: ChatMessage[] = [...messages, { role: 'assistant', content: summary }];
      setMessages(finalMsgs);
      const saved = await persist(s, finalMsgs);
      await completeSession(saved, summary);
      setClosed(true);
    } catch (e) {
      if (e instanceof QuotaError) setQuota(e);
      else setError(t('cards.chat.errorSend'));
    } finally {
      setSending(false);
    }
  };

  const thumbs = deck
    ? cards.map((c, i) => (
        <View key={c} style={{ alignItems: 'center', gap: 4 }}>
          <Image source={deck.cards[c]} contentFit="cover" style={{ width: 64, height: deck.id === 'moments' ? 96 : 64, borderRadius: 12, backgroundColor: colors.surfaceSunken }} />
          {deck.mode === 'pair' ? (
            <AppText variant="caption" color="textTertiary">
              {i === 0 ? t('cards.pairLight') : t('cards.pairHeavy')}
            </AppText>
          ) : null}
        </View>
      ))
    : null;

  const legacyImages = !deck && session ? [session.cardImageBase64, session.positiveImageBase64, session.negativeImageBase64].filter(Boolean) : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="screen-card-chat">
      <View style={{ flex: 1, paddingTop: hasSideNav ? space[5] : insets.top + space[2], paddingHorizontal: gutter }}>
        <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <IconButton icon="chevron-back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/cards'))} variant="soft" size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textTertiary">
                {deck ? pickLocalized(deck.title, language) : t('cards.title')}
              </AppText>
              <AppText variant="title3">{t('cards.chat.title')}</AppText>
            </View>
            {!closed && messages.length > 2 ? <Button label={t('cards.chat.summarize')} size="sm" variant="quiet" onPress={summarize} testID="cards-summarize" /> : null}
          </View>

          <ChatScroll contentKey={`${messages.length}-${streamText?.length ?? 0}`}>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: space[4] }}>
              {thumbs}
              {legacyImages.map((src, i) => (
                <Image key={i} source={{ uri: String(src) }} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 12 }} />
              ))}
            </View>
            {needsStart ? (
              <Card tone="primary" padding={20} style={{ marginBottom: space[4] }}>
                <AppText variant="body">{t('cards.noDiagnosis')}</AppText>
                <Button label={t('cards.begin')} icon="sparkles-outline" onPress={start} style={{ marginTop: space[3] }} testID="cards-start" />
              </Card>
            ) : null}
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role === 'user' ? 'user' : 'assistant'} text={m.content} testID={m.role === 'user' ? 'msg-user' : 'msg-ai'} />
            ))}
            {sending ? streamText ? <MessageBubble role="assistant" text={streamText} streaming /> : <TypingDots label={t('anulia.thinking')} /> : null}
            {closed ? (
              <Card tone="sage" padding={18} style={{ marginBottom: space[4] }}>
                <AppText variant="bodyStrong">{t('cards.chat.closed')}</AppText>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: space[3], flexWrap: 'wrap' }}>
                  <Button label={t('cards.chat.newReflection')} icon="add" onPress={() => router.replace('/cards')} />
                  <Button label={t('cards.history')} variant="quiet" onPress={() => router.replace('/cards/history')} />
                </View>
              </Card>
            ) : null}
          </ChatScroll>

          <View style={{ paddingTop: space[2], paddingBottom: hasSideNav ? space[4] : Math.max(insets.bottom, space[3]), gap: 8 }}>
            {error ? <Banner tone="warning" body={error} /> : null}
            {quota ? (
              <LimitNotice
                title={quota.reason === 'need_plus' ? t('cards.title') : t('anulia.limitDailyTitle')}
                body={quota.reason === 'need_plus' ? t('cards.access.needPlus') : t('cards.access.daily')}
                resetAt={quota.resetAt}
                showUpgrade={quota.reason === 'need_plus'}
              />
            ) : !closed && !needsStart ? (
              <Composer value={input} onChangeText={setInput} onSend={send} placeholder={t('cards.chat.placeholder')} sending={sending} />
            ) : null}
            <AppText variant="caption" color="textTertiary" align="center">
              {t('anulia.disclaimer')}
            </AppText>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
