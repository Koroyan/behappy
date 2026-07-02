import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 65;
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

const TAB_LABELS: Record<string, Record<string, string>> = {
  home:    { en:'Home', ru:'Главная', ka:'მთავარი', hy:'Հիմնական', tr:'Ana Sayfa', az:'Əsas', es:'Inicio', de:'Startseite', fr:'Accueil', pt:'Início', id:'Beranda', it:'Home', ar:'الرئيسية', hi:'होम', zh:'首页', ja:'ホーム', ko:'홈', uk:'Головна', pl:'Strona główna' },
  therapy: { en:'AI Therapy', ru:'AI Терапия', ka:'AI თერაპია', hy:'ԱԻ թերապիա', tr:'AI Terapi', az:'AI Terapiya', es:'Terapia IA', de:'KI-Therapie', fr:'Thérapie IA', pt:'Terapia IA', id:'Terapi AI', it:'Terapia AI', ar:'العلاج AI', hi:'AI थेरेपी', zh:'AI治疗', ja:'AIセラピー', ko:'AI 치료', uk:'AI Терапія', pl:'Terapia AI' },
  art:     { en:'Art Therapy', ru:'Арт Терапия', ka:'არт თერაპია', hy:'Արվեստի թերապիա', tr:'Sanat Terapi', az:'Art Terapiya', es:'Arteterapia', de:'Kunsttherapie', fr:'Art-thérapie', pt:'Arteterapia', id:'Terapi Seni', it:'Arte Terapia', ar:'العلاج بالفن', hi:'कला चिकित्सा', zh:'艺术治疗', ja:'芸術療法', ko:'미술 치료', uk:'Арт Терапія', pl:'Arteterapia' },
  profile: { en:'Profile', ru:'Профиль', ka:'პროფილი', hy:'Կարգավորումներ', tr:'Profil', az:'Profil', es:'Perfil', de:'Profil', fr:'Profil', pt:'Perfil', id:'Profil', it:'Profilo', ar:'الملف الشخصي', hi:'प्रोफ़ाइल', zh:'个人资料', ja:'プロフィール', ko:'프로필', uk:'Профіль', pl:'Profil' },
};

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);
  const tl = (key: string) => TAB_LABELS[key]?.[language] ?? TAB_LABELS[key]?.en ?? key;

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
          title: tl('home'),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-therapy-chat"
        options={{
          title: tl('therapy'),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="brain" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="art-therapy"
        options={{
          title: tl('art'),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="palette" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="general"
        options={{
          title: tl('profile'),
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
