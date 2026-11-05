import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { useTheme } from '../ThemeProvider';
import { elevation, radius } from '../tokens';
import { useLayout } from '../useLayout';
import { AppText } from './AppText';
import { Button, IconButton } from './Button';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
  dismissible?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Bottom sheet on phones, centered dialog on tablets and desktop. */
export function Sheet({ visible, onClose, title, subtitle, children, footer, maxWidth = 520, dismissible = true, contentStyle, testID }: SheetProps) {
  const { colors, scheme, reduceMotion } = useTheme();
  const { isCompact, height } = useLayout();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [visible, anim, reduceMotion]);

  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [isCompact ? 40 : 12, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissible ? onClose : undefined} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={dismissible ? onClose : undefined}
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: isCompact ? 'flex-end' : 'center', alignItems: 'center', padding: isCompact ? 0 : 24 }}
        >
          <Animated.View
            testID={testID}
            onStartShouldSetResponder={() => true}
            style={[
              {
                width: '100%',
                maxWidth: isCompact ? undefined : maxWidth,
                maxHeight: isCompact ? height * 0.92 : height * 0.86,
                backgroundColor: colors.surfaceRaised,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                borderBottomLeftRadius: isCompact ? 0 : radius.xxl,
                borderBottomRightRadius: isCompact ? 0 : radius.xxl,
                paddingBottom: isCompact ? Math.max(insets.bottom, 16) : 8,
                opacity: anim,
                transform: [{ translateY: translate }],
                ...elevation(scheme, 3),
              },
            ]}
          >
            {isCompact ? <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: 10 }} /> : null}
            {title ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: isCompact ? 14 : 22, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="title2">{title}</AppText>
                  {subtitle ? (
                    <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                {dismissible ? <IconButton icon="close" label={t('common.close')} onPress={onClose} size={40} variant="soft" /> : null}
              </View>
            ) : null}
            <ScrollView contentContainerStyle={[{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }, contentStyle]} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 10 }}>{footer}</View> : null}
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Promise-based confirm + toast (works on web, unlike Alert.alert) ----------

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { colors, scheme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const toast = useCallback(
    (message: string) => {
      setToastText(message);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(toastAnim, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: reduceMotion ? 0 : 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setToastText(null));
      }, 2600);
    },
    [toastAnim, reduceMotion]
  );

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      <Sheet
        visible={Boolean(pending)}
        onClose={() => settle(false)}
        title={pending?.title}
        maxWidth={440}
        footer={
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button label={pending?.cancelLabel ?? t('common.cancel')} variant="quiet" onPress={() => settle(false)} />
            <Button label={pending?.confirmLabel ?? t('common.confirm')} variant={pending?.destructive ? 'danger' : 'primary'} onPress={() => settle(true)} testID="confirm-accept" />
          </View>
        }
      >
        {pending?.body ? (
          <AppText variant="body" color="textSecondary">
            {pending.body}
          </AppText>
        ) : null}
      </Sheet>
      {toastText ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: Math.max(insets.bottom, 16) + 76,
            alignItems: 'center',
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <View style={{ backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.text, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, maxWidth: 480, ...elevation(scheme, 2) }}>
            <AppText variant="callout" color={scheme === 'dark' ? 'text' : 'textInverse'} align="center">
              {toastText}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
