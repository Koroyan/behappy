import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="art-therapy-session" options={{ headerShown: false }} />
          
          {/* Anulia Chat */}
          <Stack.Screen name="screens/anulia" options={{ headerShown: false }} />

          <Stack.Screen name="screens/problems" options={{ headerShown: false }} />
          <Stack.Screen name="screens/session-history" options={{ headerShown: false }} />

        
          {/* Other Screens */}
          <Stack.Screen name="screens/meditation" options={{ headerShown: false }} />
          <Stack.Screen name="screens/mindfulness" options={{ headerShown: false }} />
          
          {/* Art Therapy Module Screens (removed legacy non-existent routes). Use `art-therapy-session` instead. */}
          

          <Stack.Screen name="screens/cards/index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/emotion" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/resources" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/innerchild" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/positivenegative" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/therapy-chat" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/sessions-history" options={{ headerShown: false }} />


          {/* Other Screens */}
          <Stack.Screen name="screens/curses" options={{ headerShown: false }} />
          <Stack.Screen name="screens/tests" options={{ headerShown: false }} />
          <Stack.Screen name="screens/journal" options={{ headerShown: false }} />
          <Stack.Screen name="screens/breathing" options={{ headerShown: false }} />
          <Stack.Screen name="screens/recommendations" options={{ headerShown: false }} />
          <Stack.Screen name="screens/test-history" options={{ headerShown: false }} />
          <Stack.Screen name="screens/wellness-tracker" options={{ headerShown: false }} />
          <Stack.Screen name="screens/ai-assistant" options={{ headerShown: false }} />

          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </LanguageProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
