import AsyncStorage from '@react-native-async-storage/async-storage';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  healthConditions?: string;
  mainConcerns?: string;
  updatedAt: string;
}

const STORAGE_KEY = '@behappy_user_profile';

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch (error) {
    console.warn('Failed to read user profile:', error);
    return null;
  }
}

export async function saveUserProfile(profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  const toSave: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export async function hasProfile(): Promise<boolean> {
  const profile = await getUserProfile();
  return !!profile?.name;
}

const GENDER_LABEL: Record<Gender, string> = {
  male: 'male',
  female: 'female',
  other: 'other',
  prefer_not_to_say: 'not specified',
};

/**
 * Single shared formatter reused by every AI service (aiTherapyService, artTherapyService,
 * cardTherapyService) so the exact wording sent to every hosted prompt stays consistent.
 * Prompts are instructed (see the *_PROMPT_*_DRAFT.md files) to use this block naturally —
 * address the client by first name, let context quietly inform tone — and never recite it
 * back to the client as a list.
 */
export function buildProfileContextBlock(profile: UserProfile | null): string {
  if (!profile?.name) return '';

  const firstName = profile.name.trim().split(/\s+/)[0];
  const parts = [
    `Name: ${profile.name.trim()}`,
    `Gender: ${GENDER_LABEL[profile.gender] || 'not specified'}`,
    `Age: ${profile.age}`,
    `Health context: ${profile.healthConditions?.trim() || 'none provided'}`,
    `What brought them here: ${profile.mainConcerns?.trim() || 'not specified'}`,
  ];

  return `[Client Profile: ${parts.join('. ')}. Address the client as "${firstName}" naturally in conversation — not mechanically every turn. Let this context quietly inform your tone and understanding; never recite it back to the client as a list or treat it as a form to review aloud.]`;
}
