import type { AppLanguage } from '@/contexts/LanguageContext';
import { aiChat } from '@/lib/api/ai';
import type { JournalEntry } from '@/lib/storage/journal';
import { latinToGeorgian, looksLikeGeorgianLatin } from '@/lib/text/georgianLatin';

import { ANULIA_PERSONA_CONTEXT } from '../anulia/persona';

const NAMES: Record<string, string> = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German', fr: 'French',
  pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};

// Sentence ends with a question mark in any script we support (Latin/Cyrillic
// "?", full-width "？", Arabic "؟", Greek-style ";" is not used here).
const QUESTION_END = /[?？؟]["'”’»)\]]*$/u;
// Armenian marks a question with "՞" on the stressed vowel, not at the end.
const ARMENIAN_QUESTION = /՞/u;

/**
 * The journal is a place to write, not a chat: the person can't answer back,
 * so a reflection must never end on (or contain) a question. The prompt says
 * so; this removes any question sentence the model writes anyway. Also used
 * when showing reflections saved before this rule existed.
 */
export function withoutQuestions(text: string): string {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const cleaned = paragraphs
    .map((p) => {
      const sentences = p.split(/(?<=[.!?。！？؟։…])\s+/u).filter(Boolean);
      return sentences.filter((s) => !QUESTION_END.test(s.trim()) && !ARMENIAN_QUESTION.test(s)).join(' ');
    })
    .filter(Boolean);
  // If every sentence was a question (very unlikely), keep the text but end it calmly.
  if (!cleaned.length) return String(text || '').trim().replace(/[?？؟]+(["'”’»)\]]*)$/u, '.$1');
  return cleaned.join('\n\n');
}

/** The entry as sent to the model; Georgian typed in Latin letters gets a Georgian-script copy. */
function userMessage(entry: JournalEntry, promptText?: string): string {
  const body = entry.content.slice(0, 6000);
  const latinGeorgian = looksLikeGeorgianLatin(`${entry.title || ''} ${body}`);
  return [
    promptText ? `Prompt: ${promptText}` : '',
    entry.title ? `Title: ${entry.title}` : '',
    `Entry${latinGeorgian ? ' (as typed, Georgian in Latin letters)' : ''}:\n${body}`,
    latinGeorgian ? `The same entry in Georgian script (automatic, may have small spelling slips):\n${latinToGeorgian(body)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Asks Anulia for a short reflection on one journal entry. Called only when
 * the person taps "Ask Anulia for a reflection" (never automatically).
 */
export async function requestReflection(entry: JournalEntry, language: AppLanguage, promptText?: string): Promise<string> {
  const appLanguage = NAMES[language] || 'English';
  const data = await aiChat(
    {
      // gpt-4.1-mini writes noticeably better Georgian, Russian and Armenian than 4o-mini.
      model: 'gpt-4.1-mini',
      max_tokens: 380,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content:
            `${ANULIA_PERSONA_CONTEXT}\n` +
            'You are writing a short reflection on a private journal entry the person chose to share. This is NOT a chat: the person cannot reply, so do not ask any questions at all, not even at the end.\n' +
            'Language: reply in the language the entry is written in. If the entry is Georgian, Russian or Armenian typed in Latin letters, reply in that language in its own script (Georgian: ქართული). ' +
            `If the language is unclear, reply in ${appLanguage}.\n` +
            'Write 3–5 warm, plain sentences as a statement: reflect back what you notice in their own words, acknowledge the feeling without judging it, and name one strength or need you hear. ' +
            'You may end with one small, optional idea phrased as an invitation (for example a breath, a short walk, or writing a little more), never as an instruction and never as a question.\n' +
            'No advice lists, no diagnosis, no clinical terms, no promises. If the entry suggests they may be unsafe, say kindly that they deserve support now and suggest the app\'s "Get help now" screen or local emergency services.',
        },
        {
          role: 'user',
          content: userMessage(entry, promptText),
        },
      ],
    },
    { feature: 'journal' }
  );
  const text = withoutQuestions(String(data?.choices?.[0]?.message?.content || '').trim());
  if (!text) throw new Error('empty reflection');
  return text;
}
