// What the person actually said: feelings (with negation), colours and body
// places, from Georgian (script or Latin letters), Russian (Cyrillic or Latin
// letters), English and Armenian.
//
// This is a safety net, not the understanding itself: the model reads the
// conversation in context (helped by a Georgian-script rendering of Latin
// Georgian, see languageNote). The net catches the failure that matters most:
// a reply or a session summary that turns "unpleasant tension" into "a
// pleasant experience". A real session had exactly that:
//   "naprajenie" (tension, Russian in Latin letters), "ara sasiamovno" (not
//   pleasant, Georgian in Latin letters) → reply "Сейчас это звучит как
//   приятное переживание."
//
// Matching is done on a canonical Latin spelling per language, which absorbs
// the ways people type: Georgian ფ/პ → p, თ/ტ → t, კ/ქ/ყ → k, წ/ც → c ("w",
// "ts", "c" all work), Russian я/ya/a → a, ж/zh/j → zh, and so on. Words are
// matched by stem at the start of a word. Negation: "not / не / ara, ar, ver /
// ոչ" up to two words before a feeling word flips an evaluation ("ara
// sasiamovno" = unpleasant) and cancels a state ("no tension").

// ---------- Canonical spellings ----------

const KA_SCRIPT = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'p', ქ: 'k', ღ: 'g', ყ: 'k', შ: 'sh', ჩ: 'ch', ც: 'c', ძ: 'dz', წ: 'c', ჭ: 'ch', ხ: 'x', ჯ: 'j', ჰ: 'h',
};

/** Georgian (script or Latin letters) → canonical Latin. */
export function kaCanon(word) {
  let w = String(word).toLowerCase();
  if (/[ა-ჰ]/.test(w)) return [...w].map((ch) => KA_SCRIPT[ch] ?? ch).join('');
  w = w.replace(/['’`]/g, '');
  return w
    .replace(/tch|ch/g, 'ch')
    .replace(/kh/g, 'x')
    .replace(/gh/g, 'g')
    .replace(/ts|tz|w/g, 'c')
    .replace(/q|y/g, 'k')
    .replace(/f/g, 'p');
}

const RU_SCRIPT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'x', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'u', я: 'a',
};

/** Russian (Cyrillic or Latin letters) → canonical Latin. */
export function ruCanon(word) {
  let w = String(word).toLowerCase();
  if (/[а-яё]/.test(w)) return [...w].map((ch) => RU_SCRIPT[ch] ?? ch).join('');
  w = w.replace(/['’`]/g, '');
  return w
    .replace(/shch|sch/g, 'sh')
    .replace(/kh|h/g, 'x')
    .replace(/zh|j/g, 'zh')
    .replace(/ts|tz/g, 'c')
    .replace(/ya|ia/g, 'a')
    .replace(/yu|iu/g, 'u')
    .replace(/yo|io/g, 'o')
    .replace(/y/g, 'i');
}

// ---------- Lexicons (canonical stems) ----------
// kind: eval = an evaluation (pleasant/unpleasant); state = a feeling or body
// state; polarity +1 / -1 / 0 (neutral, e.g. energy).

const lex = (list, kind, polarity) => list.map((stem) => ({ stem, kind, polarity }));

const KA = [
  ...lex(['arasasiamovn', 'usiamovn', 'cud', 'sashinel', 'mdzime', 'mdzimed'], 'eval', -1),
  ...lex(['sasiamovn', 'kargad', 'kargi', 'kargia', 'mshvenier', 'sasixarul'], 'eval', 1),
  ...lex(['dadzab', 'shish', 'sheshin', 'braz', 'gabraz', 'sevd', 'tkiv', 'mtkiv', 'nerv', 'stres', 'dagl', 'mocken', 'shpot', 'dard', 'marto', 'shpotv', 'cuxil', 'cuxs'], 'state', -1),
  ...lex(['mshvid', 'bednier', 'sixarul', 'msubuk', 'sitbo', 'tbili', 'gaxarebul', 'damshvid'], 'state', 1),
  ...lex(['energi', 'dzala'], 'state', 0),
];
const KA_COLOURS = { citel: 'red', lurj: 'blue', mcvane: 'green', kvitel: 'yellow', shav: 'black', tetr: 'white', narinjisper: 'orange', iisper: 'purple', vardisper: 'pink', cisper: 'light blue', kavisper: 'brown', nacrisper: 'grey' };
const KA_BODY = { tavi: 'head', tavshi: 'head', tavs: 'head', guli: 'chest', gulshi: 'chest', mucel: 'belly', mucelshi: 'belly', mkerd: 'chest', kiser: 'neck', mxr: 'shoulders' };
const KA_NEG = new Set(['ara', 'ar', 'ver', 'nu', 'araa', 'arc', 'ara.']);

const RU = [
  ...lex(['nepriatn', 'diskomfort', 'plox', 'uzhasn', 'tazhel', 'tazhk', 'neudobn', 'nekomfort', 'otvratit', 'mersk'], 'eval', -1),
  ...lex(['priatn', 'xorosh', 'prekrasn', 'zamechateln', 'radostn', 'nravit', 'klass'], 'eval', 1),
  ...lex(['naprazh', 'napraz', 'trevog', 'trevozh', 'strax', 'strash', 'boazn', 'zlost', 'zlus', 'zloi', 'grust', 'pechal', 'tosk', 'bol', 'razdrazh', 'ustal', 'stres', 'bespokoi', 'davit', 'davlen', 'odinok', 'obid', 'panik'], 'state', -1),
  ...lex(['spokoin', 'radost', 'legk', 'legch', 'schast', 'teplo', 'rasslabl', 'umirotvor', 'uspokoen'], 'state', 1),
  ...lex(['energi', 'sila', 'sili'], 'state', 0),
];
const RU_COLOURS = { krasn: 'red', sin: 'blue', golub: 'light blue', zelen: 'green', zhelt: 'yellow', chern: 'black', bel: 'white', oranzh: 'orange', fiolet: 'purple', rozov: 'pink', korichn: 'brown', seri: 'grey', serii: 'grey', sera: 'grey', seroe: 'grey' };
const RU_BODY = { golov: 'head', grud: 'chest', zhivot: 'belly', serdc: 'chest', plech: 'shoulders', she: 'neck', shee: 'neck', gorl: 'throat' };
const RU_NEG = new Set(['ne', 'ni', 'net', 'bez', 'vovse']);

const EN = [
  ...lex(['unpleasant', 'discomfort', 'bad', 'awful', 'terrible', 'horrible', 'uncomfortable', 'heavy', 'painful', 'hard', 'difficult', 'disgust'], 'eval', -1),
  ...lex(['pleasant', 'nice', 'good', 'great', 'enjoy', 'lovely', 'wonderful', 'comfortable', 'fine'], 'eval', 1),
  ...lex(['tense', 'tension', 'anxious', 'anxiety', 'afraid', 'fear', 'scared', 'angry', 'anger', 'sad', 'lonely', 'hurt', 'pain', 'stress', 'tired', 'worried', 'nervous', 'overwhelm', 'irritat', 'upset', 'panic'], 'state', -1),
  ...lex(['calm', 'happy', 'joy', 'relaxed', 'relief', 'peace', 'warm', 'safe', 'content', 'glad', 'grateful'], 'state', 1),
  ...lex(['energy', 'energetic'], 'state', 0),
];
const EN_COLOURS = { red: 'red', blue: 'blue', green: 'green', yellow: 'yellow', black: 'black', white: 'white', orange: 'orange', purple: 'purple', violet: 'purple', pink: 'pink', brown: 'brown', grey: 'grey', gray: 'grey' };
const EN_BODY = { head: 'head', chest: 'chest', belly: 'belly', stomach: 'belly', heart: 'chest', throat: 'throat', shoulder: 'shoulders', neck: 'neck' };
const EN_NEG = new Set(['not', 'no', 'never', 'without', 'hardly', "isn't", "wasn't", "don't", "didn't", "doesn't", 'isnt', 'wasnt', 'dont', 'didnt', 'nothing']);

const HY = [
  ...lex(['տհաճ', 'վատ', 'ծանր', 'սարսափել'], 'eval', -1),
  ...lex(['հաճելի', 'լավ', 'հրաշալի'], 'eval', 1),
  ...lex(['լարված', 'լարվածություն', 'վախ', 'տխուր', 'տխրություն', 'ցավ', 'անհանգիստ', 'զայրույթ', 'բարկ', 'հոգն'], 'state', -1),
  ...lex(['հանգիստ', 'ուրախ', 'երջանիկ', 'թեթև', 'ջերմ'], 'state', 1),
  ...lex(['էներգիա'], 'state', 0),
];
const HY_COLOURS = { կարմիր: 'red', կապույտ: 'blue', կանաչ: 'green', դեղին: 'yellow', սև: 'black', սպիտակ: 'white', նարնջագույն: 'orange', մանուշակագույն: 'purple', վարդագույն: 'pink' };
const HY_BODY = { գլուխ: 'head', գլխ: 'head', կրծք: 'chest', փոր: 'belly', սիրտ: 'chest' };
const HY_NEG = new Set(['ոչ', 'չէ', 'չեմ', 'չի', 'չէր']);

// Words that are also common English words: never read as Latin Georgian/Russian.
const LATIN_STOP = new Set(['a', 'an', 'and', 'the', 'is', 'it', 'in', 'on', 'of', 'to', 'me', 'my', 'so', 'i', 'you', 'be', 'bad', 'good', 'red', 'bel', 'sin', 'she', 'sila', 'bol']);

const words = (text) => String(text || '').toLowerCase().match(/[\p{L}\p{M}'’-]+/gu) || [];
const script = (text) => (/[ა-ჰ]/.test(text) ? 'ka' : /[а-яё]/i.test(text) ? 'ru' : /[Ա-֏]/.test(text) ? 'hy' : /[a-z]/i.test(text) ? 'latin' : 'other');

/** Latin letters that read as Georgian (also for one- or two-word answers). */
export function looksLikeGeorgianLatin(text) {
  if (script(text) !== 'latin') return false;
  const ws = words(text);
  if (!ws.length) return false;
  const known = ws.filter((w) => !LATIN_STOP.has(w) && (KA_NEG.has(w) || KA.some((e) => kaCanon(w).startsWith(e.stem)) || Object.keys(KA_COLOURS).some((s) => kaCanon(w).startsWith(s)) || KA_BODY[kaCanon(w)] || /^(var|xar|aris|vgrdzn|vicod|rom|magram|dzalian|cota|ase|kidev|mgonia|minda|ver|peri|bevri|tavshi|gulshi|kvelaperi|kvela|ar[a]?)$/.test(w)));
  const georgianShape = ws.filter((w) => /(shi|ad|eli|uli|oba|ovno|ebi|ian|vdi|ob)$/.test(w) || /(gh|dz|kh|ts|w|q)/.test(w)).length;
  return known.length >= 1 && (known.length + georgianShape) / ws.length >= 0.5;
}

/** Latin letters that read as Russian ("naprajenie", "nepriyatno"). */
export function looksLikeRussianLatin(text) {
  if (script(text) !== 'latin') return false;
  const ws = words(text).filter((w) => !LATIN_STOP.has(w));
  if (!ws.length) return false;
  const hits = ws.filter((w) => RU.some((e) => ruCanon(w).startsWith(e.stem)) || RU_NEG.has(w) || Object.keys(RU_COLOURS).some((s) => ruCanon(w).startsWith(s) && s.length > 3));
  const shape = ws.filter((w) => /(enie|anie|ost|stvo|no|iy|aya|oye|ovat|zh|shch|ya|yu)$|zh|shch/.test(w)).length;
  return hits.length >= 1 && (hits.length + shape) / ws.length >= 0.5;
}

const KA_LATIN_DIGRAPHS = [['sh', 'შ'], ['ch', 'ჩ'], ['zh', 'ჟ'], ['kh', 'ხ'], ['gh', 'ღ'], ['ts', 'ც'], ['dz', 'ძ']];
const KA_LATIN = { a: 'ა', b: 'ბ', g: 'გ', d: 'დ', e: 'ე', v: 'ვ', z: 'ზ', t: 'თ', i: 'ი', k: 'კ', l: 'ლ', m: 'მ', n: 'ნ', o: 'ო', p: 'პ', j: 'ჯ', r: 'რ', s: 'ს', u: 'უ', f: 'ფ', q: 'ქ', y: 'ყ', c: 'ც', w: 'წ', x: 'ხ', h: 'ჰ' };

/** Best-effort Latin → Georgian script (same rules as lib/text/georgianLatin.ts). */
export function latinToGeorgian(text) {
  const lower = String(text).toLowerCase();
  let out = '';
  for (let i = 0; i < lower.length; i += 1) {
    const d = KA_LATIN_DIGRAPHS.find(([l]) => l === lower.slice(i, i + 2));
    if (d) {
      out += d[1];
      i += 1;
    } else out += KA_LATIN[lower[i]] ?? text[i];
  }
  return out;
}

const RU_LATIN = [['shch', 'щ'], ['sch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['ch', 'ч'], ['sh', 'ш'], ['ts', 'ц'], ['ya', 'я'], ['yu', 'ю'], ['yo', 'ё'], ['iy', 'ий'], ['j', 'ж'], ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'], ['e', 'е'], ['z', 'з'], ['i', 'и'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'], ['h', 'х'], ['x', 'х'], ['c', 'ц'], ['y', 'ы'], ['w', 'в']];

/** Best-effort Latin → Cyrillic for Russian typed in Latin letters. */
export function latinToCyrillic(text) {
  const lower = String(text).toLowerCase();
  let out = '';
  for (let i = 0; i < lower.length; ) {
    const hit = RU_LATIN.find(([l]) => lower.startsWith(l, i));
    if (hit) {
      out += hit[1];
      i += hit[0].length;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

const COPULA = new Set(['იყო', 'არის', 'ვარ', 'ვიყავი', 'var', 'viyavi', 'vgrdznob', 'ყოფილა', 'მქონდა', 'iyo', 'aris', 'yofila', 'mqonda', 'было', 'был', 'была', 'были', 'есть', 'bylo', 'bilo', 'byl', 'bil']);

function scan(ws, canon, lexicon, colours, body, negators, lang) {
  const feelings = [];
  const found = { colours: [], body: [] };
  ws.forEach((w, i) => {
    const c = canon(w);
    // Negation before the word ("ara sasiamovno", "не приятно", "not pleasant"),
    // or after it with a copula, as Georgian and Russian also say it
    // ("სასიამოვნო არ იყო", "sasiamovno ar iyo", "приятно не было").
    const after = negators.has(ws[i + 1]) && COPULA.has(ws[i + 2]);
    const neg = after || negators.has(ws[i - 1]) || negators.has(ws[i - 2]) || (lang === 'ru' && ws[i - 1] === 'не') || (lang === 'en' && /n't$/.test(ws[i - 1] || ''));
    // Longest stem first ("arasasiamovn" before "sasiamovn", "nepriatn" before "priatn").
    const hit = lexicon.filter((e) => c.startsWith(e.stem)).sort((a, b) => b.stem.length - a.stem.length)[0];
    if (hit) {
      let polarity = hit.polarity;
      if (neg && hit.kind === 'eval') polarity = -polarity;
      else if (neg && hit.kind === 'state') polarity = 0;
      feelings.push({ term: w, stem: hit.stem, kind: hit.kind, polarity, negated: neg, lang });
      return;
    }
    const col = Object.entries(colours).find(([s]) => (s.length <= 3 ? c === s || c === `${s}i` || c === `${s}ii` || c === `${s}a` || c === `${s}e` : c.startsWith(s)));
    if (col) found.colours.push(col[1]);
    const b = body[c] || Object.entries(body).find(([s]) => s.length >= 4 && c.startsWith(s))?.[1];
    if (b) found.body.push(b);
  });
  return { feelings, ...found };
}

/**
 * Facts from one message of the person. `lang` = the app language (helps with
 * Latin letters, which may be English, Georgian or Russian).
 */
export function extractFacts(text) {
  const ws = words(text);
  const s = script(text);
  const parts = [];
  if (s === 'ka') parts.push(scan(ws, kaCanon, KA, KA_COLOURS, KA_BODY, new Set(['არა', 'არ', 'ვერ', 'ნუ', 'არაა']), 'ka'));
  if (s === 'ru') parts.push(scan(ws, ruCanon, RU, RU_COLOURS, RU_BODY, new Set(['не', 'ни', 'нет', 'без']), 'ru'));
  if (s === 'hy') parts.push(scan(ws, (w) => w, HY, HY_COLOURS, HY_BODY, HY_NEG, 'hy'));
  if (s === 'latin') {
    parts.push(scan(ws, (w) => w, EN, EN_COLOURS, EN_BODY, EN_NEG, 'en'));
    const content = ws.filter((w) => !LATIN_STOP.has(w));
    if (content.length) {
      parts.push(scan(ws.map((w) => (LATIN_STOP.has(w) ? '' : w)), kaCanon, KA, KA_COLOURS, KA_BODY, KA_NEG, 'ka-latin'));
      parts.push(scan(ws.map((w) => (LATIN_STOP.has(w) ? '' : w)), ruCanon, RU, RU_COLOURS, RU_BODY, RU_NEG, 'ru-latin'));
    }
  }
  // One reading per word: prefer the language whose lexicon matched more of the message.
  const seen = new Set();
  const feelings = [];
  for (const p of parts.sort((a, b) => b.feelings.length - a.feelings.length))
    for (const f of p.feelings) {
      if (seen.has(f.term)) continue;
      seen.add(f.term);
      feelings.push(f);
    }
  return {
    feelings,
    colours: [...new Set(parts.flatMap((p) => p.colours))],
    body: [...new Set(parts.flatMap((p) => p.body))],
    georgianLatin: looksLikeGeorgianLatin(text),
    russianLatin: looksLikeRussianLatin(text),
  };
}

/**
 * Direction of a claim: an evaluation ("pleasant", "неприятно", "ara
 * sasiamovno") decides over feeling states, so "приятное напряжение"
 * (pleasant tension) counts as pleasant and contradicts "unpleasant".
 */
export function claimPolarity(feelings) {
  const evals = feelings.filter((f) => f.kind === 'eval' && f.polarity !== 0);
  return evals.length ? polarityOf(evals) : polarityOf(feelings);
}

/** Overall direction of what was said: -1 unpleasant, +1 pleasant, 0 mixed or none. */
export function polarityOf(feelings) {
  const neg = feelings.filter((f) => f.polarity < 0).length;
  const pos = feelings.filter((f) => f.polarity > 0).length;
  if (neg && !pos) return -1;
  if (pos && !neg) return 1;
  return 0;
}

/**
 * A note for the model about how to read the person's last message, when it
 * is typed in Latin letters. The person's words are never changed.
 */
export function languageNote(text) {
  const t = String(text || '').trim();
  if (!t || t.length > 600) return '';
  const notes = [];
  if (looksLikeGeorgianLatin(t)) notes.push(`Georgian typed in Latin letters. Georgian script: "${latinToGeorgian(t)}".`);
  if (looksLikeRussianLatin(t)) notes.push(`Possibly Russian typed in Latin letters. Cyrillic: "${latinToCyrillic(t)}".`);
  return notes.length ? `The person's last message "${t}" may be: ${notes.join(' Or: ')} Read it in that language, keep any negation ("ara/ar/ver" = not, "не" = not), and keep replying in the selected app language.` : '';
}

// ---------- Wanting to stop ----------

const STOP = [
  /\b(end|finish|stop|close|wrap up|that'?s enough|enough for (now|today)|i'?m done|let'?s stop)\b/i,
  /(заверш|законч|закончим|хватит|достаточно|давайте остановимся|на сегодня всё|на этом всё|стоп(?!\p{L}))/iu,
  /(დავასრულოთ|დასრულება|ვამთავრებ|საკმარისია|ვჩერდები|მოვრჩეთ|davasrulot|vamtavreb|sakmarisia|movrchet|damtavreba)/i,
  /(ավարտ|բավական է|վերջացնենք|կանգ առնենք)/i,
];

/** The person writes that they want to end now (the model's "early end" rule applies). */
export const endIntent = (text) => STOP.some((re) => re.test(String(text || '')));

// ---------- Claims in a reply or a summary ----------

const SENTENCES = (text) => String(text || '').split(/(?<=[.!?。！？])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/** Feelings asserted (not asked) in a reply: question sentences are skipped. */
export function assertedFeelings(text) {
  return SENTENCES(text)
    .filter((s) => !/[?？]\s*$/.test(s))
    .flatMap((s) => extractFacts(s).feelings.filter((f) => f.kind === 'eval' || f.polarity !== 0));
}

// Statements that the drawing changed (for comparisons that found no change).
const CHANGE_CLAIMS = [
  /(ярче|темнее|светлее|насыщеннее|появил|добавил|добавлен|исчез|изменил|изменен|стал[аио]?\s+(больше|меньше|ярче|темнее|светлее)|нов(ый|ая|ое|ые|ых)\s+(цвет|детал|элемент|оттен|форм))/i,
  /\b(brighter|darker|lighter|bigger|smaller|added|appeared|disappeared|removed|more (colou?r|vivid|saturated)|new (colou?rs?|details?|shapes?|elements?)|has changed|have changed|you changed|now (has|have|there))\b/i,
  /(უფრო\s+(ნათელ|მუქ|დიდ|პატარ|კაშკაშ|მკვეთრ)|დაემატ|დაამატ|გაჩნდ|გაქრ|შეიცვალ|შეცვალე|შეცვლილ|ახალი\s+(ფერ|დეტალ|ელემენტ))/i,
  /(ավելի\s+(պայծառ|մուգ|մեծ|փոքր)|ավելաց|հայտնվ|անհետաց|փոխվ|փոխել)/i,
];
// "no visible changes", "не удалось подтвердить изменений", "ვერ ვხედავ ცვლილებას": negated, not a claim.
// Whole words in any script (JavaScript's \b only knows Latin letters).
const W = (w) => String.raw`(?<!\p{L})` + w + String.raw`(?!\p{L})`;
const CHANGE_NEGATION = new RegExp(
  ['не', 'нет', 'ни', 'без', 'no', 'not', 'nothing', 'none', 'without', 'cannot', 'არ', 'ვერ', 'არა', 'არაფერი', 'ոչ'].map(W).join('|') + String.raw`|n['’]t(?!\p{L})|(?<!\p{L})չ`,
  'iu'
);
export const claimsVisualChange = (text) =>
  SENTENCES(text)
    .filter((s) => !/[?？]\s*$/.test(s))
    .some((s) =>
      CHANGE_CLAIMS.some((re) => {
        const m = re.exec(s);
        if (!m) return false;
        const around = s.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30);
        return !CHANGE_NEGATION.test(around);
      })
    );

// Diagnostic or clinical labels the companion must never assign.
const CLINICAL = [
  /(депресс|расстройств|диагноз|травм|психоз|биполяр|птср|патолог|невроз)/i,
  /\b(depress\w*|disorder|diagnos\w*|trauma\w*|ptsd|bipolar|psychos\w*|patholog\w*|neuros\w*)\b/i,
  /(დეპრესი|აშლილობ|დიაგნოზ|ტრავმ|ფსიქოზ)/i,
  /(դեպրեսի|խանգարում|ախտորոշ|տրավմ|փսիխոզ)/i,
];
export const clinicalClaims = (text) => SENTENCES(text).filter((s) => CLINICAL.some((re) => re.test(s)));
export { SENTENCES as sentences };
