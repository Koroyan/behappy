/**
 * Scoring for the self-check questionnaires. Pure functions, no imports, so
 * they can be unit-tested directly with Node (lib/assessments/scoring.test.mjs).
 *
 * Cut-offs follow the published instruments:
 *  - PHQ-9 (Kroenke, Spitzer & Williams, 2001): 0–4 minimal, 5–9 mild,
 *    10–14 moderate, 15–19 moderately severe, 20–27 severe. Item 9 (thoughts
 *    of death/self-harm) is flagged on ANY non-zero answer, whatever the total.
 *  - GAD-7 (Spitzer et al., 2006): 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe.
 *  - DASS-21 (Lovibond & Lovibond, 1995): subscale sums × 2, then
 *    Depression 0–9 normal, 10–13 mild, 14–20 moderate, 21–27 severe, 28+ extremely severe;
 *    Anxiety   0–7 normal, 8–9 mild, 10–14 moderate, 15–19 severe, 20+ extremely severe;
 *    Stress    0–14 normal, 15–18 mild, 19–25 moderate, 26–33 severe, 34+ extremely severe.
 * These are screening ranges, never diagnoses.
 */

export type TestId = 'phq9' | 'gad7' | 'dass21';
export type Band = 'minimal' | 'mild' | 'moderate' | 'moderatelySevere' | 'severe' | 'normal' | 'extremelySevere';
export type Meaning = 'low' | 'mild' | 'moderate' | 'high';

export const ITEM_COUNT: Record<TestId, number> = { phq9: 9, gad7: 7, dass21: 21 };
export const MAX_SCORE: Record<'phq9' | 'gad7', number> = { phq9: 27, gad7: 21 };

function validate(answers: number[], n: number) {
  if (!Array.isArray(answers) || answers.length !== n) throw new Error(`expected ${n} answers`);
  for (const a of answers) if (!Number.isInteger(a) || a < 0 || a > 3) throw new Error('answers must be 0–3');
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export interface SimpleResult {
  total: number;
  max: number;
  band: Band;
  meaning: Meaning;
  /** PHQ-9 item 9 > 0 — always show support resources. */
  safetyFlag: boolean;
}

export function scorePHQ9(answers: number[]): SimpleResult {
  validate(answers, 9);
  const total = sum(answers);
  const band: Band = total <= 4 ? 'minimal' : total <= 9 ? 'mild' : total <= 14 ? 'moderate' : total <= 19 ? 'moderatelySevere' : 'severe';
  const meaning: Meaning = band === 'minimal' ? 'low' : band === 'mild' ? 'mild' : band === 'moderate' ? 'moderate' : 'high';
  return { total, max: 27, band, meaning, safetyFlag: answers[8] > 0 };
}

export function scoreGAD7(answers: number[]): SimpleResult {
  validate(answers, 7);
  const total = sum(answers);
  const band: Band = total <= 4 ? 'minimal' : total <= 9 ? 'mild' : total <= 14 ? 'moderate' : 'severe';
  const meaning: Meaning = band === 'minimal' ? 'low' : band === 'mild' ? 'mild' : band === 'moderate' ? 'moderate' : 'high';
  return { total, max: 21, band, meaning, safetyFlag: false };
}

// 1-based DASS-21 item numbers per subscale.
export const DASS_ITEMS = {
  depression: [3, 5, 10, 13, 16, 17, 21],
  anxiety: [2, 4, 7, 9, 15, 19, 20],
  stress: [1, 6, 8, 11, 12, 14, 18],
} as const;

const DASS_CUTS = {
  depression: [9, 13, 20, 27],
  anxiety: [7, 9, 14, 19],
  stress: [14, 18, 25, 33],
} as const;

export interface DassScale {
  score: number;
  band: Band;
  meaning: Meaning;
}

export interface DassResult {
  depression: DassScale;
  anxiety: DassScale;
  stress: DassScale;
  /** Highest concern across the three scales, for the headline. */
  meaning: Meaning;
}

function dassBand(score: number, cuts: readonly number[]): Band {
  if (score <= cuts[0]) return 'normal';
  if (score <= cuts[1]) return 'mild';
  if (score <= cuts[2]) return 'moderate';
  if (score <= cuts[3]) return 'severe';
  return 'extremelySevere';
}

const bandMeaning = (b: Band): Meaning => (b === 'normal' || b === 'minimal' ? 'low' : b === 'mild' ? 'mild' : b === 'moderate' ? 'moderate' : 'high');

export function scoreDASS21(answers: number[]): DassResult {
  validate(answers, 21);
  const scale = (name: keyof typeof DASS_ITEMS): DassScale => {
    const score = sum(DASS_ITEMS[name].map((i) => answers[i - 1])) * 2;
    const band = dassBand(score, DASS_CUTS[name]);
    return { score, band, meaning: bandMeaning(band) };
  };
  const depression = scale('depression');
  const anxiety = scale('anxiety');
  const stress = scale('stress');
  const order: Meaning[] = ['low', 'mild', 'moderate', 'high'];
  const meaning = [depression, anxiety, stress].map((s) => s.meaning).reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), 'low' as Meaning);
  return { depression, anxiety, stress, meaning };
}
