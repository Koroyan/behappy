/**
 * On-device check for self-harm or suicide language in text the person wrote
 * (journal). It never sends anything anywhere and never blocks writing; when it
 * matches, the app gently offers "Get help now" and the safety plan.
 *
 * Deliberately specific phrases (not single words like "die" or "kill"), so
 * everyday figures of speech ("this exam is killing me") don't trigger it.
 * Missing a phrase is possible; the help screen is always one tap away anyway.
 */

// English: word-boundary patterns.
const EN: RegExp[] = [
  /\bkill(?:ing)? my ?self\b/,
  /\bend(?:ing)? (?:my life|it all|my own life)\b/,
  /\btake my (?:own )?life\b/,
  /\bsuicid(?:e|al)\b/,
  /\bself[- ]?harm/,
  /\b(?:hurt|cut|harm)(?:ing)? my ?self\b/,
  /\bwant(?:ed)? to die\b/,
  /\bwish i (?:was|were) dead\b/,
  /\bbetter off dead\b/,
  /\bdon'?t want to (?:live|be alive|be here anymore|exist)\b/,
  /\bno reason to live\b/,
];

// Other languages: lower-case substrings (scripts without \b support, and
// inflected Latin-script languages).
const PHRASES: string[] = [
  // Georgian
  'თავის მოკვლა', 'თავს მოვიკლავ', 'თავი მოვიკლა', 'თვითმკვლელ', 'სუიციდ', 'სიკვდილი მინდა', 'მოკვდომა მინდა', 'მინდა მოვკვდე',
  'აღარ მინდა ცხოვრება', 'ცხოვრება აღარ მინდა', 'აღარ მინდა სიცოცხლე', 'სიცოცხლე აღარ მინდა', 'არ მინდა ცხოვრება', 'თავს ვიზიანებ', 'თავის დაზიანება',
  // Georgian typed in Latin letters
  'tavis mokvla', 'tavs movikla', 'tavi movikla', 'tvitmkvlel', 'suicid', 'sikvdili minda', 'mokvdoma minda', 'minda movkvde',
  'agar minda cxovreba', 'cxovreba agar minda', 'ar minda cxovreba', 'agar minda sicocxle', 'tavs vizianeb',
  // Russian / Ukrainian
  'суицид', 'покончить с собой', 'покончу с собой', 'убить себя', 'убью себя', 'не хочу жить', 'хочу умереть', 'лучше бы я умер', 'порезать себя', 'причинить себе вред', 'свести счёты с жизнью', 'свести счеты с жизнью', 'жить не хочется',
  'суїцид', 'покінчити з собою', 'вбити себе', 'не хочу жити', 'хочу померти', 'заподіяти собі шкоду',
  // Armenian
  'ինքնասպան', 'ինքս ինձ սպանել', 'չեմ ուզում ապրել', 'ուզում եմ մեռնել', 'ինքս ինձ վնասել',
  // German
  'selbstmord', 'suizid', 'mich umbringen', 'nicht mehr leben', 'will sterben', 'sterben will', 'mir das leben nehmen', 'mich selbst verletzen', 'mich ritzen',
  // Spanish / Portuguese / Italian / French
  'suicid', 'matarme', 'quitarme la vida', 'no quiero vivir', 'quiero morir', 'hacerme daño', 'cortarme',
  'me matar', 'matar-me', 'não quero viver', 'quero morrer', 'me machucar', 'me cortar',
  'uccidermi', 'ammazzarmi', 'non voglio vivere', 'voglio morire', 'farmi del male', 'tagliarmi',
  'me tuer', 'en finir avec la vie', 'mettre fin à mes jours', 'je veux mourir', 'envie de mourir', 'plus envie de vivre', 'me faire du mal', 'me scarifier',
  // Polish / Turkish / Azerbaijani / Indonesian
  'samobój', 'zabić się', 'nie chcę żyć', 'chcę umrzeć', 'skrzywdzić się', 'pociąć się',
  'intihar', 'kendimi öldür', 'ölmek istiyorum', 'yaşamak istemiyorum', 'kendime zarar',
  'özümü öldür', 'ölmək istəyirəm', 'yaşamaq istəmirəm',
  'bunuh diri', 'ingin mati', 'mau mati', 'tidak ingin hidup', 'menyakiti diri',
  // Arabic / Hindi
  'انتحار', 'أقتل نفسي', 'اقتل نفسي', 'أريد أن أموت', 'اريد ان اموت', 'لا أريد أن أعيش', 'إيذاء نفسي',
  'आत्महत्या', 'खुद को मार', 'मरना चाहता', 'मरना चाहती', 'जीना नहीं चाहता', 'जीना नहीं चाहती',
  // Chinese / Japanese / Korean
  '自杀', '自殺', '想死', '不想活', '结束生命', '伤害自己', '割腕', '死にたい', '消えたい', '生きていたくない', '自傷', 'リストカット', '자살', '죽고 싶', '살고 싶지 않', '자해',
];

export function mentionsSelfHarm(text: string): boolean {
  if (!text) return false;
  const normalized = ` ${text.toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ')} `;
  if (EN.some((re) => re.test(normalized))) return true;
  return PHRASES.some((p) => normalized.includes(p));
}
