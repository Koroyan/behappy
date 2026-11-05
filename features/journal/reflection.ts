import type { AppLanguage } from '@/contexts/LanguageContext';
import { aiChat } from '@/lib/api/ai';
import type { JournalEntry } from '@/lib/storage/journal';

import { ANULIA_PERSONA_CONTEXT } from '../anulia/persona';

const NAMES: Record<string, string> = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German', fr: 'French',
  pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};

/**
 * Asks Anulia for a short reflection on one journal entry. Called only when
 * the person taps "Ask Anulia for a reflection" (never automatically).
 */
export async function requestReflection(entry: JournalEntry, language: AppLanguage, promptText?: string): Promise<string> {
  const lang = NAMES[language] || 'English';
  const data = await aiChat(
    {
      model: 'gpt-4o-mini',
      max_tokens: 380,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            `${ANULIA_PERSONA_CONTEXT}\nYou are reading a private journal entry the person chose to share. Reply in ${lang}, in 3–5 warm, plain sentences: ` +
            `reflect back what you notice in their own words, name one strength or need you hear, and end with at most one gentle, optional question. ` +
            `No advice lists, no diagnosis, no clinical terms. If the entry suggests they may be unsafe, encourage them kindly to use "Get help now" or contact local emergency services.`,
        },
        {
          role: 'user',
          content: `${promptText ? `Prompt: ${promptText}\n` : ''}${entry.title ? `Title: ${entry.title}\n` : ''}Entry:\n${entry.content.slice(0, 6000)}`,
        },
      ],
    },
    { feature: 'journal' }
  );
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('empty reflection');
  return text;
}
