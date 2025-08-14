import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* CBT Module Screens */}
          <Stack.Screen name="screens/cbt/index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/thought-record" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/mood-tracker" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/behavior-experiment" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/cognitive-distortions" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/problem-solving" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/goal-setting" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/exercises" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cbt/analytics" options={{ headerShown: false }} />

          <Stack.Screen name="screens/problems" options={{ headerShown: false }} />
          <Stack.Screen name="screens/session-history" options={{ headerShown: false }} />

          {/* DBT Module Screens */}
          <Stack.Screen name="screens/dbt/index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/distress-tolerance" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/emotion-regulation" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/interpersonal-effectiveness" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/mindfulness" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/skills-tracker" options={{ headerShown: false }} />
          <Stack.Screen name="screens/dbt/analytics" options={{ headerShown: false }} />
          
          {/* EMDR Module Screens */}
          <Stack.Screen name="screens/emdr/index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/emdr/bilateral-stimulation" options={{ headerShown: false }} />
          <Stack.Screen name="screens/emdr/safe-place" options={{ headerShown: false }} />
          <Stack.Screen name="screens/emdr/suds-tracker" options={{ headerShown: false }} />
          <Stack.Screen name="screens/emdr/resource-installation" options={{ headerShown: false }} />
          <Stack.Screen name="screens/emdr/memory-processing" options={{ headerShown: false }} />
          
          {/* Other Screens */}
          <Stack.Screen name="screens/meditation" options={{ headerShown: false }} />
          <Stack.Screen name="screens/mindfulness" options={{ headerShown: false }} />
          
          {/* Art Therapy Module Screens */}
          <Stack.Screen name="screens/art-therapy/index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/art-therapy/arttherapy" options={{ headerShown: false }} />
          <Stack.Screen name="screens/art-therapy/art-therapy-history" options={{ headerShown: false }} />
          

          <Stack.Screen name="screens/cards/card" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/emotion" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/resources" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/innerchild" options={{ headerShown: false }} />
          <Stack.Screen name="screens/cards/positivenegative" options={{ headerShown: false }} />


          {/* Other Screens */}
          <Stack.Screen name="screens/cards/index" options={{ headerShown: false }} />
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
    </ThemeProvider>
  );
}
