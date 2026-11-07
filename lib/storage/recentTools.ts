/**
 * The tools someone opened lately, so the Tools tab can offer them first.
 * Kept on this device only; never sent to the server or to analytics.
 */
import { publish, readJson, writeJson } from './json';

const KEY = '@behappy_recent_tools_v1';
export const RECENT_TOOLS_TOPIC = 'recentTools';

export interface RecentTool {
  key: string;
  at: number;
}

export async function loadRecentTools(): Promise<RecentTool[]> {
  const list = await readJson<RecentTool[]>(KEY, []);
  return Array.isArray(list) ? list.filter((x) => x && typeof x.key === 'string' && typeof x.at === 'number') : [];
}

export async function markToolUsed(key: string) {
  const list = await loadRecentTools();
  await writeJson(KEY, [{ key, at: Date.now() }, ...list.filter((x) => x.key !== key)].slice(0, 8));
  publish(RECENT_TOOLS_TOPIC);
}
