import type { DassResult, SimpleResult, TestId } from '@/lib/assessments/scoring';

import { trackAction } from '@/lib/analytics';

import { publish, readJson, uid, writeJson } from './json';

const KEY = '@behappy_assessments_v1';
const DRAFT_KEY = '@behappy_assessment_draft_v1';
export const ASSESSMENT_TOPIC = 'assessments';

export interface AssessmentRecord {
  id: string;
  test: TestId;
  at: number;
  answers: number[];
  result: SimpleResult | DassResult;
}

export interface AssessmentDraft {
  test: TestId;
  answers: (number | null)[];
  index: number;
  savedAt: number;
}

export async function listResults(): Promise<AssessmentRecord[]> {
  const list = await readJson<AssessmentRecord[]>(KEY, []);
  return (Array.isArray(list) ? list : []).sort((a, b) => b.at - a.at);
}

export async function saveResult(test: TestId, answers: number[], result: SimpleResult | DassResult): Promise<AssessmentRecord> {
  const rec: AssessmentRecord = { id: uid('as'), test, at: Date.now(), answers, result };
  await writeJson(KEY, [rec, ...(await listResults())].slice(0, 100));
  await clearDraft();
  publish(ASSESSMENT_TOPIC);
  // Only that a check was completed: never answers or scores.
  trackAction('assessments', 'assessment_completed');
  return rec;
}

export async function deleteResult(id: string) {
  await writeJson(
    KEY,
    (await listResults()).filter((r) => r.id !== id)
  );
  publish(ASSESSMENT_TOPIC);
}

export async function saveDraft(draft: Omit<AssessmentDraft, 'savedAt'>) {
  await writeJson(DRAFT_KEY, { ...draft, savedAt: Date.now() });
}

export async function loadDraft(): Promise<AssessmentDraft | null> {
  return readJson<AssessmentDraft | null>(DRAFT_KEY, null);
}

export async function clearDraft() {
  await writeJson(DRAFT_KEY, null);
}
