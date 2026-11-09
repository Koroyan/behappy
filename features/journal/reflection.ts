import type { AppLanguage } from '@/contexts/LanguageContext';
import { aiChat } from '@/lib/api/ai';
import type { JournalEntry } from '@/lib/storage/journal';
import { latinToGeorgian, looksLikeGeorgianLatin } from '@/lib/text/georgianLatin';


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

const GEORGIAN_LETTERS = /[ა-ჿ]/gu;
// One or two Latin words, then optional punctuation, right before Georgian text.
const STRAY_LATIN_LEAD = /^[A-Za-z]{1,14}(?:\s+[A-Za-z]{1,14})?[,.:;!–-]*\s+(?=[ა-ჿ])/u;

/**
 * Replies to Georgian typed in Latin letters occasionally open with a stray
 * Latin word ("gabon, შენ გრძნობ…") before the model settles into Georgian
 * script. In a reply that is otherwise Georgian, that lead is dropped.
 */
export function withoutStrayLatinLead(text: string): string {
  const s = String(text || '');
  if ((s.match(GEORGIAN_LETTERS) || []).length < 20) return s;
  return s.replace(STRAY_LATIN_LEAD, '');
}

/** What the journal shows: no questions, no stray Latin opening. */
export const tidyReflection = (text: string) => withoutStrayLatinLead(withoutQuestions(text));

/** The entry as sent to the model; Georgian typed in Latin letters gets a Georgian-script copy. */
function userMessage(entry: JournalEntry, promptText?: string): string {
  const body = entry.content.slice(0, 6000);
  const latinGeorgian = looksLikeGeorgianLatin(`${entry.title || ''} ${body}`);
  return [
    promptText ? `Prompt: ${promptText}` : '',
    entry.title ? `Title: ${entry.title}` : '',
    `Entry${latinGeorgian ? ' (as typed, Georgian in Latin letters)' : ''}:\n${body}`,
    latinGeorgian ? `The same entry in Georgian script (automatic, may have small spelling slips):\n${latinToGeorgian(body)}` : '',
    latinGeorgian ? 'Reply in Georgian script only (ქართული ასოებით), with no Latin letters.' : '',
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
  // The server writes the instructions and chooses the model (server/prompts CHAT_PROMPTS.journal).
  const data = await aiChat(
    {
      max_tokens: 380,
      temperature: 0.6,
      language: appLanguage,
      messages: [{ role: 'user', content: userMessage(entry, promptText) }],
    },
    { feature: 'journal' }
  );
  const text = tidyReflection(String(data?.choices?.[0]?.message?.content || '').trim());
  if (!text) throw new Error('empty reflection');
  return text;
}
