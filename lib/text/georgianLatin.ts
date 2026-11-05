/**
 * Many people in Georgia type Georgian with Latin letters ("ar vici raze").
 * AI models misread it badly, so before sending such text we add a
 * Georgian-script rendering next to the original. Nothing is changed in what
 * the person wrote or sees.
 */

// Frequent Georgian words as typed in Latin letters. Words that are also
// common in English ("me", "a", "i", "so") are left out on purpose.
const MARKERS = new Set([
  'var', 'xar', 'aris', 'ari', 'vart', 'xart', 'arian', 'ar', 'ara', 'ver', 'vici', 'vicodi', 'ici', 'rom', 'da', 'magram', 'tu', 'ki', 'xo', 'ho',
  'shen', 'sheni', 'chemi', 'chven', 'tkven', 'isini', 'mas', 'mis', 'chemtvis', 'shentvis', 'ratom', 'rogor', 'raze', 'rame', 'ravi', 'vin', 'ras', 'rodis',
  'dges', 'dgea', 'gushin', 'xval', 'axla', 'kvela', 'yvela', 'yvelaferi', 'aranairi', 'aravin', 'cota', 'dzalian', 'dzlier', 'ase', 'isev', 'agar', 'kidev', 'mere',
  'minda', 'mindoda', 'vgrdznob', 'vfiqrob', 'mgonia', 'vcdilob', 'shemidzlia', 'ver', 'kargad', 'cudad', 'tsudad', 'gabrazebuli', 'nervebi', 'stresi', 'dagliloba', 'daglili',
  'megobari', 'megobrebi', 'deda', 'mama', 'saxli', 'samsaxuri', 'skola', 'gamarjoba', 'madloba', 'nu', 'unda', 'iyo', 'iqneba', 'vqeni', 'gavakete',
]);

const DIGRAPHS: [string, string][] = [
  ['sh', 'შ'], ['ch', 'ჩ'], ['zh', 'ჟ'], ['kh', 'ხ'], ['gh', 'ღ'], ['ts', 'ც'], ['dz', 'ძ'],
];
const LETTERS: Record<string, string> = {
  a: 'ა', b: 'ბ', g: 'გ', d: 'დ', e: 'ე', v: 'ვ', z: 'ზ', t: 'თ', i: 'ი', k: 'კ', l: 'ლ', m: 'მ', n: 'ნ', o: 'ო', p: 'პ',
  j: 'ჯ', r: 'რ', s: 'ს', u: 'უ', f: 'ფ', q: 'ქ', y: 'ყ', c: 'ც', w: 'წ', x: 'ხ', h: 'ჰ',
};

/** True when the text is Latin-only and reads like Georgian. */
export function looksLikeGeorgianLatin(text: string): boolean {
  if (!text || /[Ⴀ-ჿЀ-ӿ԰-֏]/.test(text)) return false;
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length < 2) return false;
  const hits = new Set(words.filter((w) => MARKERS.has(w)));
  return hits.size >= 2 && words.filter((w) => MARKERS.has(w)).length / words.length >= 0.2;
}

/** Best-effort Latin → Georgian script (lower-case; small spelling slips are expected). */
export function latinToGeorgian(text: string): string {
  const lower = text.toLowerCase();
  let out = '';
  for (let i = 0; i < lower.length; i += 1) {
    const pair = lower.slice(i, i + 2);
    const digraph = DIGRAPHS.find(([latin]) => latin === pair);
    if (digraph) {
      out += digraph[1];
      i += 1;
    } else out += LETTERS[lower[i]] ?? text[i];
  }
  return out;
}
