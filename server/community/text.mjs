// Text rules for the community: pseudonyms and automatic message checks.
//
// The checks never decide alone. They hold some messages for a human
// moderator (contact details, links from brand-new members, "as a
// psychologist" claims) and raise a priority report when someone may be at
// risk. Moderators make every final decision.

import { mentionsSelfHarm } from '../../lib/safety/riskLanguage.ts';

const RESERVED = /anulia|ანულია|анулия|անուլիա|behappy|admin|moderator|moderation|support|official|system|staff/i;

// Professional titles in the app languages. Community names must not
// present anyone as a professional (verified specialists are listed under
// Specialists, with their real name and checked credentials).
const TITLE_TOKENS = new Set(['dr', 'doc', 'doctor', 'dott', 'md', 'phd', 'prof', 'lmft', 'lcsw', 'lpc', 'psyd']);
const TITLE_PARTS = [
  'psycholog', 'psychiatr', 'psychotherap', 'therapist', 'therapeut', 'thérapeute', 'counsel', 'clinician',
  'ექიმ', 'ფსიქოლოგ', 'ფსიქიატრ', 'თერაპევტ', 'ფსიქოთერაპ',
  'доктор', 'врач', 'психолог', 'психиатр', 'психотерап', 'терапевт', 'лікар',
  'բժիշկ', 'հոգեբան', 'թերապևտ', 'հոգեբույժ',
  'psikolog', 'terapist', 'psikiyatr', 'doktor', 'psixoloq', 'həkim', 'terapevt',
  'psicolog', 'psicólog', 'psiquiatr', 'psichiatr', 'terapeut', 'médic', 'medico', 'médico',
  'arzt', 'ärzt', 'psychologue', 'médecin', 'psychiatre',
  'lekarz', 'terapeuta', 'dokter', 'psikiater',
  '医生', '医师', '醫生', '心理师', '心理醫', '心理咨询', '治疗师', '医師', '心理士', 'カウンセラー', 'セラピスト', '精神科',
  '의사', '상담사', '상담가', '치료사', '심리학자',
  'डॉक्टर', 'मनोवैज्ञानिक', 'चिकित्सक', 'मनोचिकित्सक', 'थेरेपिस्ट',
  'طبيب', 'معالج', 'أخصائي', 'اخصائي', 'دكتور', 'نفساني',
];

const PSEUDONYM_CHARS = /^[\p{L}\p{M}\p{N} ._-]+$/u;

export const normalizePseudonym = (value) => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ');

/** Returns an error code, or null when the pseudonym is acceptable. */
export function pseudonymProblem(value) {
  const name = normalizePseudonym(value);
  if ([...name].length < 3) return 'pseudonym_too_short';
  if ([...name].length > 24) return 'pseudonym_too_long';
  if (!PSEUDONYM_CHARS.test(name)) return 'pseudonym_characters';
  if (/\d{6,}/.test(name.replace(/[ ._-]/g, ''))) return 'pseudonym_contact';
  if (/(https?|www|\.com|\.ge|\.ru|\.org|\.net)/i.test(name)) return 'pseudonym_contact';
  if (RESERVED.test(name)) return 'pseudonym_reserved';
  const lower = name.toLowerCase();
  const tokens = lower.split(/[ ._-]+/).filter(Boolean);
  if (tokens.some((tok) => TITLE_TOKENS.has(tok)) || TITLE_PARTS.some((p) => lower.includes(p))) return 'pseudonym_title';
  return null;
}

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(com|net|org|ge|ru|am|ua|io|me|info|xyz|link|app|site|online|shop|ly|gg|tv)\b/i;
const EMAIL_RE = /[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
// Social handles only with an explicit platform name: "@Nino" is an in-app mention.
const HANDLE_RE = /(telegram|whatsapp|viber|signal|instagram|insta|tiktok|snapchat|facebook|discord|t\.me)\s*[:/@]?\s*@?[\w.]{3,}/i;

// "As a psychologist…", "I am a therapist…" and the like, in a few languages.
const PRO_CLAIM_RE =
  /\b(i'?m|i am|as an?|speaking as an?)\s+(licensed\s+|clinical\s+)?(psychologist|therapist|psychiatrist|psychotherapist|counsel+or|doctor)\b|я\s+(психолог|психотерапевт|психиатр|врач)|как\s+(психолог|психотерапевт|психиатр|врач)|(ფსიქოლოგი|ფსიქოთერაპევტი|ფსიქიატრი|ექიმი)\s+ვარ|როგორც\s+(ფსიქოლოგი|ფსიქოთერაპევტი|ფსიქიატრი|ექიმი)|ich bin\s+(psychologin|psychologe|therapeutin|therapeut|ärztin|arzt)|soy\s+(psicólog[oa]|terapeuta|psiquiatra|médic[oa])|je suis\s+(psychologue|thérapeute|psychiatre|médecin)|ben\s+(psikolog|terapist|doktor)um/i;

const MENTION_RE = /(^|[\s(])@(anulia|ანულია|анулия|անուլիա)(?![\p{L}\p{N}])/iu;

export const mentionsAnulia = (body) => MENTION_RE.test(String(body || ''));

/** Pseudonyms mentioned with @, e.g. "@Nino" (Anulia excluded). */
export function mentionedPseudonyms(body) {
  const out = new Set();
  for (const m of String(body || '').matchAll(/(^|[\s(])@([\p{L}\p{M}\p{N}._-]{3,24})/gu)) {
    if (!MENTION_RE.test(`@${m[2]}`)) out.add(m[2]);
  }
  return [...out].slice(0, 5);
}

/**
 * Automatic checks for one message.
 * Returns { hold: string|null, flags: {...}, risk: boolean }.
 */
export function analyzeMessage(body, { newMember = false } = {}) {
  const text = String(body || '');
  const flags = {};
  if (URL_RE.test(text)) flags.link = true;
  if (EMAIL_RE.test(text) || PHONE_RE.test(text) || HANDLE_RE.test(text)) flags.contact = true;
  if (PRO_CLAIM_RE.test(text)) flags.professionalClaim = true;
  const risk = mentionsSelfHarm(text);
  if (risk) flags.risk = true;
  // Contact details in a public mental-health room put people at risk; a
  // moderator looks first. Links from brand-new members wait too (spam).
  let hold = null;
  if (flags.contact) hold = 'contact_details';
  else if (flags.professionalClaim) hold = 'professional_claim';
  else if (flags.link && newMember) hold = 'new_member_link';
  return { hold, flags, risk };
}
