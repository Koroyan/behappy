import AsyncStorage from '@react-native-async-storage/async-storage';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
  name: string;
  gender: Gender;
  /** 0 or missing = not provided. */
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
 * Single shared formatter reused by every AI service (Anulia, art reflection, cards) so the
 * wording stays consistent. Sent only when the person allowed personalisation. The server
 * prompts (server/prompts/*.md) tell the model to use this block naturally — address the
 * person by first name, let context quietly inform tone — and never recite it back as a list.
 */
export function buildProfileContextBlock(profile: UserProfile | null): string {
  if (!profile?.name) return '';

  const firstName = profile.name.trim().split(/\s+/)[0];
  // Only details the person actually provided are shared.
  const parts = [
    `Name: ${profile.name.trim()}`,
    profile.gender && profile.gender !== 'prefer_not_to_say' ? `Gender: ${GENDER_LABEL[profile.gender]}` : '',
    profile.age && profile.age > 0 ? `Age: ${profile.age}` : '',
    profile.healthConditions?.trim() ? `Health context: ${profile.healthConditions.trim()}` : '',
    profile.mainConcerns?.trim() ? `What brought them here: ${profile.mainConcerns.trim()}` : '',
  ].filter(Boolean);

  return `[Profile: ${parts.join('. ')}. Shared by the person. Address them as "${firstName}" naturally in conversation — not mechanically every turn. Let this context quietly inform your tone; never recite it back as a list or treat it as a form to review aloud.]`;
}
