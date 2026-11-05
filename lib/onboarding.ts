import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@behappy_onboarding_v2';

/**
 * People who used BeHappy before 2.0 already know it: if any of their data
 * exists, onboarding is skipped instead of greeting them as new users.
 */
const LEGACY_SIGNALS = ['@behappy_user_profile', 'journal_entries', 'therapy_sessions', '@behappy_art_therapy_progress', 'onboardingCompleted'];

export async function isOnboardingDone(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(KEY)) === 'done') return true;
    const legacy = await AsyncStorage.multiGet(LEGACY_SIGNALS);
    if (legacy.some(([, v]) => v && v !== '[]' && v !== '{}')) {
      await AsyncStorage.setItem(KEY, 'done');
      return true;
    }
  } catch {
    return true; // never trap someone in onboarding because storage failed
  }
  return false;
}

export async function completeOnboarding(focusAreas: string[] = []) {
  await AsyncStorage.multiSet([
    [KEY, 'done'],
    ['@behappy_focus_areas', JSON.stringify(focusAreas)],
  ]);
}

export async function getFocusAreas(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem('@behappy_focus_areas');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
