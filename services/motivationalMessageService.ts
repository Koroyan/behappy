import type { AppLanguage } from '@/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { ActivityEvent, getRecentActivity } from './activityAggregator';

// Same key-resolution order as services/aiTherapyService.ts / services/gptApi.js —
// EXPO_PUBLIC_API_KEY is the only key actually populated in .env / app.config.js extra.
const API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_KEY ||
  (process as any).env?.EXPO_PUBLIC_API_KEY ||
  '';

const CACHE_KEY = '@behappy_daily_motivation';
const REFRESH_MS = 12 * 60 * 60 * 1000; // twice a day

const languageNames: Record<string, string> = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani',
  es: 'Spanish', de: 'German', fr: 'French', pt: 'Portuguese', id: 'Indonesian', it: 'Italian',
  ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};

const FEATURE_LABELS: Record<ActivityEvent['feature'], string> = {
  ai: 'AI chat session(s)',
  journal: 'journal entr(y/ies)',
  art: 'art therapy session(s)',
  breathing: 'breathing exercise(s)',
  cards: 'card therapy conversation(s)',
};

// Resilience fallback for outages/missing key — not cached, so real generation is retried
// on the next call. Not the "hardcoded fake functionality" this feature replaces: those were
// dead buttons, this is a graceful degradation path for a live network call.
const FALLBACKS: Record<string, string[]> = {
  en: [
    "Every small step you take today matters — keep going.",
    "You showed up for yourself today, and that's worth noticing.",
    "Be as kind to yourself as you would be to someone you love.",
  ],
  ka: [
    "დღეს გადადგმული ყოველი მცირე ნაბიჯი მნიშვნელოვანია — განაგრძე.",
    "დღეს საკუთარი თავისთვის გამოჩნდი, და ეს შესამჩნევია.",
    "იყავი საკუთარი თავის მიმართ ისეთივე მოსიყვარულე, როგორც საყვარელი ადამიანის მიმართ იქნებოდი.",
  ],
  ru: [
    "Каждый маленький шаг сегодня имеет значение — продолжайте.",
    "Сегодня вы были рядом с собой, и это заметно.",
    "Будьте к себе так же добры, как к тому, кого любите.",
  ],
};

const pickFallback = (lang: string): string => {
  const list = FALLBACKS[lang] || FALLBACKS.en;
  return list[Math.floor(Math.random() * list.length)];
};

const summarizeActivity = (events: ActivityEvent[]): string => {
  if (events.length === 0) return 'No activity recorded yet today.';
  const counts: Partial<Record<ActivityEvent['feature'], number>> = {};
  events.forEach((event) => {
    counts[event.feature] = (counts[event.feature] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([feature, count]) => `${count} ${FEATURE_LABELS[feature as ActivityEvent['feature']]}`)
    .join(', ');
};

type CachedMotivation = { text: string; generatedAt: number; language: string };

export async function getDailyMotivation(language: AppLanguage): Promise<string> {
  try {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as CachedMotivation;
      if (
        cached?.text &&
        cached.language === language &&
        typeof cached.generatedAt === 'number' &&
        Date.now() - cached.generatedAt < REFRESH_MS
      ) {
        return cached.text;
      }
    }
  } catch (error) {
    console.log('Failed to read cached daily motivation:', error);
  }

  try {
    if (!API_KEY) throw new Error('OpenAI API key is not configured');

    const events = await getRecentActivity(24);
    const summary = summarizeActivity(events);
    const languageName = languageNames[language] || 'English';

    const systemPrompt = `You are a warm, concise mental-health companion inside a wellness app. Write ONE short motivational message (1-2 sentences, under 220 characters) in ${languageName}. Ground it in the user's real activity summary given below when there is any; if there is none, gently encourage them to start. No clinical language, no diagnosis, no generic filler — warm and specific. Reply with the message only, no quotes around it.`;
    const userPrompt = `User's activity in the last 24 hours: ${summary}`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 120,
        temperature: 0.8,
      },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        timeout: 20000,
      }
    );

    const text: string = (response.data?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('Empty motivational message response');

    const toCache: CachedMotivation = { text, generatedAt: Date.now(), language };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toCache));
    return text;
  } catch (error) {
    console.log('Daily motivation generation failed, using fallback:', error);
    return pickFallback(language);
  }
}
