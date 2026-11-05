/**
 * Personal safety plan (after the Stanley–Brown safety planning approach).
 * Stored only on this device: never sent to the AI or the server. Included in
 * data export and removed by "Delete all data" like every other local key.
 */
import { publish, readJson, uid, writeJson } from './json';

const KEY = '@behappy_safety_plan_v1';
export const SAFETY_PLAN_TOPIC = 'safetyPlan';

export type PlanSectionKey = 'warningSigns' | 'coping' | 'distractions' | 'people' | 'professionals' | 'environment' | 'reasons';
export const PLAN_SECTIONS: PlanSectionKey[] = ['warningSigns', 'coping', 'distractions', 'people', 'professionals', 'environment', 'reasons'];
/** Sections whose items can carry a phone number. */
export const CONTACT_SECTIONS = new Set<PlanSectionKey>(['people', 'professionals']);

export interface PlanItem {
  id: string;
  text: string;
  phone?: string;
}

export interface SafetyPlan {
  sections: Record<PlanSectionKey, PlanItem[]>;
  updatedAt: number | null;
}

const MAX_TEXT = 300;
const MAX_PHONE = 40;

const emptyPlan = (): SafetyPlan => ({
  sections: Object.fromEntries(PLAN_SECTIONS.map((k) => [k, []])) as unknown as Record<PlanSectionKey, PlanItem[]>,
  updatedAt: null,
});

export async function loadSafetyPlan(): Promise<SafetyPlan> {
  const stored = await readJson<Partial<SafetyPlan> | null>(KEY, null);
  const plan = emptyPlan();
  if (!stored || typeof stored !== 'object' || !stored.sections) return plan;
  for (const key of PLAN_SECTIONS) {
    const list = (stored.sections as Record<string, unknown>)[key];
    plan.sections[key] = Array.isArray(list)
      ? list
          .filter((i): i is PlanItem => Boolean(i) && typeof (i as PlanItem).text === 'string' && (i as PlanItem).text.trim() !== '')
          .map((i) => ({
            id: typeof i.id === 'string' ? i.id : uid('sp'),
            text: i.text.slice(0, MAX_TEXT),
            phone: typeof i.phone === 'string' && i.phone.trim() ? i.phone.slice(0, MAX_PHONE) : undefined,
          }))
      : [];
  }
  plan.updatedAt = typeof stored.updatedAt === 'number' ? stored.updatedAt : null;
  return plan;
}

async function save(plan: SafetyPlan): Promise<SafetyPlan> {
  const next = { ...plan, updatedAt: Date.now() };
  await writeJson(KEY, next);
  publish(SAFETY_PLAN_TOPIC);
  return next;
}

export async function addPlanItem(section: PlanSectionKey, text: string, phone?: string): Promise<SafetyPlan> {
  const clean = text.trim().slice(0, MAX_TEXT);
  const plan = await loadSafetyPlan();
  if (!clean) return plan;
  const tel = CONTACT_SECTIONS.has(section) && phone?.trim() ? phone.trim().slice(0, MAX_PHONE) : undefined;
  plan.sections[section] = [...plan.sections[section], { id: uid('sp'), text: clean, phone: tel }];
  return save(plan);
}

export async function removePlanItem(section: PlanSectionKey, id: string): Promise<SafetyPlan> {
  const plan = await loadSafetyPlan();
  plan.sections[section] = plan.sections[section].filter((i) => i.id !== id);
  return save(plan);
}

export const planItemCount = (plan: SafetyPlan) => PLAN_SECTIONS.reduce((n, k) => n + plan.sections[k].length, 0);

/** Digits and a leading "+" only, for a tel: link. */
export const dialable = (phone: string) => phone.replace(/[^\d+]/g, '');
