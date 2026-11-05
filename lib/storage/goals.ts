/**
 * Personal goals. Pre-2.0 goals ("therapeutic_goals", richer shape with
 * milestones) are imported once; the legacy key is left untouched.
 */
import { publish, readJson, uid, writeJson } from './json';

const KEY = '@behappy_goals_v1';
const LEGACY_KEY = 'therapeutic_goals';
const MIGRATED = '@behappy_goals_migrated';
export const GOALS_TOPIC = 'goals';

export interface Goal {
  id: string;
  title: string;
  createdAt: number;
  status: 'active' | 'completed';
  completedAt?: number;
}

export async function loadGoals(): Promise<Goal[]> {
  let list = await readJson<Goal[]>(KEY, []);
  if (!(await readJson<boolean>(MIGRATED, false))) {
    const legacy = await readJson<any[]>(LEGACY_KEY, []);
    const imported: Goal[] = (Array.isArray(legacy) ? legacy : [])
      .filter((g) => g && typeof g.title === 'string')
      .map((g, i) => ({
        id: typeof g.id === 'string' ? g.id : `legacy_goal_${i}`,
        title: g.title,
        createdAt: Date.parse(g.createdAt) || Date.now(),
        status: g.status === 'completed' ? 'completed' : 'active',
        completedAt: g.status === 'completed' ? Date.now() : undefined,
      }));
    list = [...list, ...imported];
    await writeJson(KEY, list);
    await writeJson(MIGRATED, true);
  }
  return list.sort((a, b) => (a.status === b.status ? b.createdAt - a.createdAt : a.status === 'active' ? -1 : 1));
}

async function save(list: Goal[]) {
  await writeJson(KEY, list);
  publish(GOALS_TOPIC);
}

export async function addGoal(title: string): Promise<Goal> {
  const list = await loadGoals();
  const goal: Goal = { id: uid('goal'), title: title.trim(), createdAt: Date.now(), status: 'active' };
  await save([goal, ...list]);
  return goal;
}

export async function setGoalStatus(id: string, status: Goal['status']) {
  const list = await loadGoals();
  await save(list.map((g) => (g.id === id ? { ...g, status, completedAt: status === 'completed' ? Date.now() : undefined } : g)));
}

export async function deleteGoal(id: string) {
  const list = await loadGoals();
  await save(list.filter((g) => g.id !== id));
}
