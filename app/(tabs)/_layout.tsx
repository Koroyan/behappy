import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 65;
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);

  // Create tab bar background with blur
  const TabBarBackground = React.memo(function TabBarBackground({ style }: { style: any }) {
    const gradientColors = React.useMemo(() => {
      const color1 = isDark ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)';
      const color2 = isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      return [color1, color2] as const;
    }, [isDark]);

    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={45}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.background, style]}
        >
          <LinearGradient
            colors={gradientColors}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>
      );
    }

    return (
      <View style={[styles.background, style]}>
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  });

  const screenOptions = React.useMemo(() => ({
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    tabBarStyle: styles.tabBar,
    tabBarBackground: () => <TabBarBackground style={styles.tabBarBackground} />,
    tabBarShowLabel: true,
    tabBarLabelStyle: styles.tabBarLabel,
    headerShown: false,
    tabBarIconStyle: {
      marginTop: 6,
    },
    tabBarItemStyle: {
      paddingVertical: 8,
    },
  }), [theme.colors.primary, isDark, styles]);

  return (
    <Tabs
      screenOptions={screenOptions}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-therapy-chat"
        options={{
          title: "AI Терапия",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="brain" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="art-therapy"
        options={{
          title: "Арт Терапия",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="palette" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="general"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: BOTTOM_INSET,
  },
  tabBarBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'none',
  },
});
