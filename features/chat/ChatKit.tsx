/**
 * Shared conversation UI for Anulia, Art therapy sessions and Card reflections.
 * Readable, restrained bubbles: assistant text sits on a neutral surface,
 * the person's messages on a soft brand tint. No giant colored blocks.
 */
import { Image } from 'expo-image';
import React, { forwardRef, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, ScrollView, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';

import { AnuliaMark, AppText, Icon, IconButton, Press, radius, space, useLayout, useTextStyle, useTheme } from '@/design';
import { useLanguage } from '@/contexts/LanguageContext';
import { useT } from '@/i18n';

export interface BubbleProps {
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  time?: string;
  streaming?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  onListen?: () => void;
  listening?: boolean;
  footer?: React.ReactNode;
  testID?: string;
}

export function MessageBubble({ role, text, imageUri, time, streaming, failed, onRetry, onListen, listening, footer, testID }: BubbleProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const { isDesktop } = useLayout();
  const isUser = role === 'user';
  return (
    <View testID={testID} style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 10, marginBottom: space[4] }}>
      {!isUser ? (
        <View style={{ marginTop: 2 }}>
          <AnuliaMark size={30} />
        </View>
      ) : null}
      <View style={{ maxWidth: isDesktop ? '78%' : '86%', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            style={{ width: 220, height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }}
          />
        ) : null}
        {text ? (
          <View
            style={{
              backgroundColor: isUser ? colors.chatUser : colors.chatAssistant,
              borderWidth: isUser ? 0 : 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: radius.xl,
              borderTopRightRadius: isUser ? 8 : radius.xl,
              borderTopLeftRadius: isUser ? radius.xl : 8,
            }}
          >
            <AppText variant="body" color={isUser ? 'onChatUser' : 'onChatAssistant'} selectable>
              {text}
              {streaming ? ' ▍' : ''}
            </AppText>
            {footer}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
          {time ? (
            <AppText variant="caption" color="textTertiary">
              {time}
            </AppText>
          ) : null}
          {failed && onRetry ? (
            <Press onPress={onRetry} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="refresh" size={14} color="danger" />
              <AppText variant="caption" color="danger">
                {t('common.retry')}
              </AppText>
            </Press>
          ) : null}
          {!isUser && onListen && text && !streaming ? (
            <Press onPress={onListen} accessibilityRole="button" accessibilityLabel={listening ? t('anulia.stopListening') : t('anulia.listen')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
              <Icon name={listening ? 'stop-circle-outline' : 'volume-medium-outline'} size={15} color="textSecondary" />
              <AppText variant="caption" color="textSecondary">
                {listening ? t('anulia.stopListening') : t('anulia.listen')}
              </AppText>
            </Press>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function TypingDots({ label }: { label?: string }) {
  const { colors, reduceMotion } = useTheme();
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    if (reduceMotion) return;
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(d, { toValue: 0.3, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space[4] }}>
      <AnuliaMark size={30} />
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.xl, backgroundColor: colors.chatAssistant, borderWidth: 1, borderColor: colors.border }}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand, opacity: d }} />
        ))}
      </View>
      {label ? (
        <AppText variant="caption" color="textTertiary">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export interface ComposerProps {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  sending?: boolean;
  disabled?: boolean;
  onAttach?: () => void;
  attachLabel?: string;
  onCamera?: () => void;
  onVoice?: () => void;
  recording?: boolean;
  transcribing?: boolean;
  above?: React.ReactNode;
  testID?: string;
}

export const Composer = forwardRef<TextInputInstance, ComposerProps>(function Composer(
  { value, onChangeText, onSend, placeholder, sending, disabled, onAttach, attachLabel, onCamera, onVoice, recording, transcribing, above, testID },
  ref
) {
  const { colors } = useTheme();
  const { t } = useT();
  const { isRTL } = useLanguage();
  const text = useTextStyle('body');
  const canSend = value.trim().length > 0 && !sending && !disabled;
  const inputRef = useRef<TextInputInstance | null>(null);
  const setInputRef = (node: TextInputInstance | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  // Web: a textarea starts at two rows and never grows by itself. Start at one
  // line and follow the content up to the max height.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el || !el.style) return;
    if (el.rows !== 1) el.rows = 1;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 42), 160)}px`;
  }, [value]);
  return (
    <View style={{ gap: 8 }}>
      {above}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 6,
          padding: 6,
          borderRadius: radius.xxl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {onAttach ? <IconButton icon="image-outline" label={attachLabel ?? t('anulia.attachImage')} onPress={onAttach} disabled={disabled || sending} size={42} testID="composer-attach" /> : null}
        {onCamera ? <IconButton icon="camera-outline" label={t('art.workspace.takePhoto')} onPress={onCamera} disabled={disabled || sending} size={42} /> : null}
        <TextInput
          ref={setInputRef}
          testID={testID ?? 'composer-input'}
          value={value}
          onChangeText={onChangeText}
          placeholder={transcribing ? t('anulia.transcribing') : recording ? t('anulia.recording') : placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled && !recording}
          multiline
          accessibilityLabel={placeholder}
          onKeyPress={(e: any) => {
            // Desktop: Enter sends, Shift+Enter adds a line.
            if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              if (canSend) onSend();
            }
          }}
          style={[
            text,
            {
              flex: 1,
              color: colors.text,
              minHeight: 42,
              maxHeight: 160,
              paddingHorizontal: 10,
              paddingTop: 10,
              paddingBottom: 10,
              textAlign: isRTL ? 'right' : 'left',
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
          ]}
        />
        {onVoice ? (
          <IconButton
            icon={recording ? 'stop' : 'mic-outline'}
            label={recording ? t('anulia.stopRecording') : t('anulia.recordVoice')}
            onPress={onVoice}
            disabled={disabled || sending || transcribing}
            size={42}
            variant={recording ? 'soft' : 'ghost'}
            color={recording ? colors.danger : undefined}
            testID="composer-voice"
          />
        ) : null}
        <Press
          onPress={onSend}
          disabled={!canSend}
          haptic
          accessibilityLabel={t('anulia.send')}
          testID="composer-send"
          style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.primary : colors.surfaceSunken }}
        >
          {sending || transcribing ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Icon name="arrow-up" size={20} color={canSend ? 'onPrimary' : 'textTertiary'} />}
        </Press>
      </View>
    </View>
  );
});

/** Scroll container that keeps the newest message in view. */
export const ChatScroll = forwardRef<ScrollViewInstance, { children: React.ReactNode; contentKey: string | number; padding?: number }>(function ChatScroll({ children, contentKey, padding = 0 }, ref) {
  const inner = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const id = setTimeout(() => inner.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [contentKey]);
  return (
    <ScrollView
      ref={(node) => {
        (inner as any).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as any).current = node;
      }}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: space[4], paddingHorizontal: padding }}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => inner.current?.scrollToEnd({ animated: false })}
    >
      {children}
    </ScrollView>
  );
});
