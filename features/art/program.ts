/**
 * Art therapy program state: the 43 sessions in 8 modules (content in
 * services/database/sessionsData.ts, 19 languages) plus the user's local
 * progress ("@behappy_art_therapy_progress", unchanged from earlier versions).
 */
import ArtTherapyProgramManager, { ArtTherapySession, SessionProgress } from '@/services/artTherapyProgramNew';

export type { ArtTherapySession, SessionProgress };

export interface ProgramState {
  sessions: ArtTherapySession[];
  progress: Map<number, SessionProgress>;
  completed: number;
  total: number;
  /** First session that is open and not completed. */
  nextId: number | null;
  /** A session with a started conversation that isn't completed yet. */
  inProgressId: number | null;
  modules: { module: number; sessions: ArtTherapySession[] }[];
}

export type SessionStatus = 'completed' | 'inProgress' | 'available' | 'locked';

export async function loadProgram(language: string): Promise<ProgramState> {
  await ArtTherapyProgramManager.initialize(language);
  ArtTherapyProgramManager.setLanguage(language);
  const [sessions, progress] = await Promise.all([ArtTherapyProgramManager.getAllSessions(), ArtTherapyProgramManager.getProgress()]);
  const sorted = [...sessions].sort((a, b) => a.id - b.id);
  let completed = 0;
  progress.forEach((p) => {
    if (p.completed) completed += 1;
  });
  const isOpen = (id: number) => id === 1 || progress.get(id - 1)?.completed === true;
  const nextId = sorted.find((s) => !progress.get(s.id)?.completed && isOpen(s.id))?.id ?? null;
  const started = sorted.find((s) => {
    const p = progress.get(s.id);
    return p && !p.completed && Array.isArray(p.chatHistory) && p.chatHistory.some((m: any) => m?.role === 'user');
  });
  const modules = [...new Set(sorted.map((s) => s.module))].map((module) => ({ module, sessions: sorted.filter((s) => s.module === module) }));
  return { sessions: sorted, progress, completed, total: sorted.length || 43, nextId, inProgressId: started?.id ?? null, modules };
}

export function sessionStatus(state: ProgramState, id: number): SessionStatus {
  const p = state.progress.get(id);
  if (p?.completed) return 'completed';
  const open = id === 1 || state.progress.get(id - 1)?.completed === true;
  if (!open) return 'locked';
  if (p && Array.isArray(p.chatHistory) && p.chatHistory.some((m: any) => m?.role === 'user')) return 'inProgress';
  return 'available';
}

/** Session 1 is free; the rest need the Art program (owned or via Plus). */
export const needsAccess = (id: number, hasProgram: boolean) => id !== 1 && !hasProgram;
