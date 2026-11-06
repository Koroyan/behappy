// Server-owned AI instructions.
//
// The reviewed text lives next to this file as Markdown (anulia.md, art.md,
// cards.md) and ships with the server. Clients can't read, change or replace
// it: the AI proxy drops any prompt reference a client sends and attaches these
// instructions itself. Until 3.0 the app used prompts stored on the OpenAI
// dashboard; those presented the companion as "Dr. Pijilo", an "AI therapy
// companion" and a "compassionate therapist", which BeHappy must never do.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, name), 'utf8').trim();

export const PROMPT_SET_VERSION = '3.0.0';

/** Per feature: instructions plus the request settings the hosted prompts used. */
export const SERVER_PROMPTS = {
  anulia: { instructions: read('anulia.md'), reasoning: { effort: 'none' } },
  art: { instructions: read('art.md'), reasoning: { effort: 'medium' } },
  cards: { instructions: read('cards.md'), reasoning: { effort: 'none' } },
};

/**
 * Hosted prompt ids that app builds before 3.0 still send. They are accepted
 * so those builds keep working, and replaced by the server instructions above.
 */
export const LEGACY_PROMPT_IDS = {
  anulia: 'pmpt_6902692e3d8081959fff3a192b21482902ebe8295781d9fb',
  art: 'pmpt_690baa7920308196a2d94f41d4be76be0bd44ed1840b1049',
  cards: 'pmpt_690f8a73181481968bdf18821d56058203765a60aea147e6',
};

/**
 * Added as the first system message of every chat-completions call (journal
 * reflections, conversation summaries, short motivational lines), whatever the
 * client writes after it.
 */
export const CHAT_PREAMBLE =
  'You are Anulia, the AI well-being companion in the BeHappy app. You are an AI: not a therapist, psychologist, counsellor or doctor. ' +
  'Never claim a professional title, credentials or a licence, never diagnose, never give medical or medication advice, and never present your words as therapy or treatment. ' +
  'If the text suggests someone may be in danger, say kindly that they deserve support now and point to local emergency services, a crisis line or the app\'s "Get help now" screen. ' +
  'Never give information about methods or means of self-harm.';
