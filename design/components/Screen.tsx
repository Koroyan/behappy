import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControlProps, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { useTheme } from '../ThemeProvider';
import { layout, space } from '../tokens';
import { useLayout } from '../useLayout';
import { AppText } from './AppText';
import { IconButton } from './Button';
import { Icon } from './Icon';
import { Press } from './Press';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  /** Show a back control (stack screens). */
  back?: boolean | (() => void);
  headerRight?: React.ReactNode;
  /** Small title in the top bar instead of a large page title (dense tools like chat). */
  compactHeader?: boolean;
  /** Width of the main column. */
  width?: 'reading' | 'content' | 'full';
  scroll?: boolean;
  /** Tab screens: the bottom navigation already accounts for the bottom inset. */
  tab?: boolean;
  /** Optional right-hand context panel on wide screens (≥1280px). */
  aside?: React.ReactNode;
  asideOnNarrow?: 'below' | 'hidden';
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
}

export function Screen({
  title,
  subtitle,
  eyebrow,
  back,
  headerRight,
  compactHeader,
  width = 'content',
  scroll = true,
  tab,
  aside,
  asideOnNarrow = 'below',
  refreshControl,
  keyboard,
  contentStyle,
  children,
  footer,
  testID,
}: ScreenProps) {
  const { colors, scheme } = useTheme();
  const { gutter, hasSideNav, isDesktop, hasContextPanel } = useLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();

  const maxWidth = width === 'reading' ? layout.readingWidth : width === 'content' ? layout.contentWidth : undefined;
  const [scrolled, setScrolled] = useState(false);
  const isPhone = !hasSideNav;
  const topPad = isPhone ? space[2] : space[6];
  // Tab screens sit above the bottom navigation, and a footer bar carries its
  // own inset; otherwise leave room for the home indicator.
  const bottomPad = (tab && isPhone) || footer ? space[6] : Math.max(insets.bottom, space[4]) + space[6];

  const goBack = () => {
    if (typeof back === 'function') return back();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const showTopRow = Boolean(back || headerRight || (compactHeader && title));
  // Phones: the back button and actions stay pinned while content scrolls.
  const pinTopRow = isPhone && showTopRow;
  const topRow = showTopRow ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: compactHeader || pinTopRow ? 0 : space[2] }}>
      {back ? (
        hasSideNav ? (
          <Press onPress={goBack} accessibilityRole="link" accessibilityLabel={t('common.back')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingEnd: 8 }}>
            <Icon name="chevron-back" size={18} color="textSecondary" />
            <AppText variant="smallStrong" color="textSecondary">
              {t('common.back')}
            </AppText>
          </Press>
        ) : (
          <IconButton icon="chevron-back" label={t('common.back')} onPress={goBack} variant="soft" size={40} testID="screen-back" />
        )
      ) : null}
      {compactHeader && title ? (
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="title3" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {headerRight ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{headerRight}</View> : null}
    </View>
  ) : null;

  const pageHeader =
    !compactHeader && (title || eyebrow) ? (
      <View style={{ marginBottom: space[6], gap: 6 }}>
        {eyebrow ? (
          <AppText variant="label" color="primary">
            {eyebrow}
          </AppText>
        ) : null}
        {title ? <AppText variant={isDesktop ? 'display' : 'title1'}>{title}</AppText> : null}
        {subtitle ? (
          <AppText variant="body" color="textSecondary" style={{ maxWidth: 640 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    ) : null;

  const showAsideRight = Boolean(aside) && hasContextPanel;
  const main = (
    <View style={[{ width: '100%', maxWidth: showAsideRight && maxWidth ? maxWidth + layout.contextPanelWidth + space[8] : maxWidth, alignSelf: 'center', flex: scroll ? undefined : 1 }]}>
      {pinTopRow ? null : topRow}
      {pageHeader}
      <View style={{ flexDirection: showAsideRight ? 'row' : 'column', gap: space[8], alignItems: scroll ? 'flex-start' : 'stretch', flex: scroll ? undefined : 1 }}>
        <View style={[{ flex: showAsideRight || !scroll ? 1 : undefined, width: showAsideRight ? undefined : '100%', minWidth: 0 }, contentStyle]}>{children}</View>
        {showAsideRight ? <View style={{ width: layout.contextPanelWidth, gap: space[4] }}>{aside}</View> : null}
      </View>
      {aside && !showAsideRight && asideOnNarrow === 'below' ? <View style={{ marginTop: space[8], gap: space[4] }}>{aside}</View> : null}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: topPad, paddingBottom: bottomPad, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={isDesktop}
      scrollEventThrottle={32}
      onScroll={(e) => {
        const y = e.nativeEvent.contentOffset.y;
        if (y > 4 !== scrolled) setScrolled(y > 4);
      }}
    >
      {main}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: gutter, paddingTop: topPad, paddingBottom: tab && isPhone ? 0 : Math.max(insets.bottom, 8) }}>{main}</View>
  );

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID={testID}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {isPhone ? (
        // Solid area under the status bar / notch: content never scrolls beneath it.
        <View testID="screen-topbar" style={{ paddingTop: insets.top, backgroundColor: colors.bg, borderBottomWidth: pinTopRow && scrolled ? 1 : 0, borderBottomColor: colors.divider, zIndex: 2 }}>
          {pinTopRow ? (
            <View style={{ paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 6 }}>
              <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{topRow}</View>
            </View>
          ) : null}
        </View>
      ) : null}
      {body}
      {footer ? <View testID="screen-footer" style={{ paddingBottom: isPhone && !tab ? insets.bottom : 0, backgroundColor: colors.surface }}>{footer}</View> : null}
    </View>
  );

  return keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );
}
