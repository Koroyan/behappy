/**
 * Base direction for right-to-left languages.
 *
 * The web (`dir="auto"`, which React Native Web puts on text) and the phone text
 * engines pick a paragraph's direction from its first letter. An Arabic sentence
 * that opens with a Latin word ("Anulia …", "BeHappy Plus …") is then laid out
 * left-to-right, and its full stop and «» quotes land at the wrong end. A leading
 * RIGHT-TO-LEFT MARK (invisible, zero-width) keeps the base direction right-to-left
 * without changing the text. Only interface strings pass through here; what people
 * write themselves keeps its natural direction.
 */
export const RLM = '\u200F';

const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
// Letters of every script the app ships, plus Hebrew and Arabic. Digits and punctuation are neutral.
const STRONG = /[A-Za-z\u00C0-\u024F\u0370-\u058F\u0590-\u08FF\u0900-\u097F\u10A0-\u10FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Adds a right-to-left mark when right-to-left text would otherwise start with a left-to-right word. */
export function withRtlBase(text: string): string {
  if (!text || text.startsWith(RLM) || !RTL_LETTER.test(text)) return text;
  const first = STRONG.exec(text)?.[0];
  return first && !RTL_LETTER.test(first) ? RLM + text : text;
}
