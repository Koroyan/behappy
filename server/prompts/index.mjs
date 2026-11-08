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

export const PROMPT_SET_VERSION = '3.2.0';

// The help screen as the app labels it (i18n safety.title). Without this a
// Russian reply pointed people to «Get help now», a button they can't find.
export const HELP_SCREEN_NAMES =
  'The "Get help now" screen is labelled in the app as: en "Get help now", ka „დახმარება ახლავე“, ru «Помощь сейчас», hy «Օգնություն հիմա», uk «Допомога зараз», ' +
  'tr "Şimdi yardım", az "İndi kömək", de „Hilfe jetzt“, fr « Aide immédiate », es "Ayuda ahora", it "Aiuto subito", pt "Ajuda agora", pl „Pomoc teraz”, ' +
  'id "Bantuan sekarang", ar "المساعدة الآن", hi "अभी मदद पाएँ", zh "立即求助", ja "今すぐ助けを", ko "지금 도움 받기". When you mention it, use the label of the language you reply in.';
const withHelpNames = (text) => `${text}\n\n${HELP_SCREEN_NAMES}`;

/** The daily reflection (server/reflection): facts in, a checked short text out. */
export const REFLECTION_PROMPT = withHelpNames(read('reflection.md'));

/** Per feature: instructions plus the request settings the hosted prompts used. */
export const SERVER_PROMPTS = {
  anulia: { instructions: withHelpNames(read('anulia.md')), reasoning: { effort: 'none' } },
  art: { instructions: withHelpNames(read('art.md')), reasoning: { effort: 'medium' } },
  cards: { instructions: withHelpNames(read('cards.md')), reasoning: { effort: 'none' } },
  // Anulia in public community rooms (server/community/anulia.mjs).
  community: { instructions: withHelpNames(read('community.md')), reasoning: { effort: 'none' } },
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
  'Never give information about methods or means of self-harm. ' +
  HELP_SCREEN_NAMES;
