import AsyncStorage from '@react-native-async-storage/async-storage';

export type DashboardProgress = {
  aiSessions: number;
  artCompleted: number;
  artStarted: number;
  journalNotes: number;
  breathingMinutes: number;
  cardSessions: number;
  streakDays: number;
  activeDays: number;
};

export const emptyDashboardProgress: DashboardProgress = {
  aiSessions: 0,
  artCompleted: 0,
  artStarted: 0,
  journalNotes: 0,
  breathingMinutes: 0,
  cardSessions: 0,
  streakDays: 0,
  activeDays: 0,
};

export type ActivityFeature = 'ai' | 'journal' | 'art' | 'breathing' | 'cards';

export type ActivityEvent = {
  feature: ActivityFeature;
  timestampMs: number;
};

const dateKey = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const toEpochMs = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const t = new Date(value as any).getTime();
  return Number.isNaN(t) ? null : t;
};

const getCurrentStreak = (keys: Set<string>): number => {
  let streak = 0;
  const cursor = new Date();

  while (keys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.log(`Failed to read ${key}:`, error);
    return fallback;
  }
};

type BreathingStats = {
  totalMinutes?: number;
  completedSessions?: Array<{ completedAt?: string; durationMinutes?: number }>;
};

async function readAllSources() {
  const [therapySessions, journalEntries, artProgress, breathingStats, cardOngoing, cardCompleted] = await Promise.all([
    readJson<any[]>('therapy_sessions', []),
    readJson<any[]>('journal_entries', []),
    readJson<Record<string, any>>('@behappy_art_therapy_progress', {}),
    readJson<BreathingStats>('@behappy_breathing_progress', {}),
    readJson<any[]>('card_therapy_ongoing_sessions', []),
    readJson<any[]>('card_therapy_completed_sessions', []),
  ]);

  return { therapySessions, journalEntries, artProgress, breathingStats, cardOngoing, cardCompleted };
}

export async function getDashboardProgress(): Promise<DashboardProgress> {
  const { therapySessions, journalEntries, artProgress, breathingStats, cardOngoing, cardCompleted } = await readAllSources();

  const activeDateKeys = new Set<string>();
  const addActiveDate = (value: unknown) => {
    const key = dateKey(value);
    if (key) activeDateKeys.add(key);
  };

  therapySessions.forEach((session) => addActiveDate(session?.endTime ?? session?.startTime ?? session?.date));
  journalEntries.forEach((entry) => addActiveDate(entry?.timestamp ?? entry?.date));

  const artItems = Object.values(artProgress ?? {});
  artItems.forEach((progress: any) => addActiveDate(progress?.completedAt ?? progress?.startedAt));

  const breathingSessions = Array.isArray(breathingStats?.completedSessions) ? breathingStats.completedSessions : [];
  breathingSessions.forEach((session) => addActiveDate(session?.completedAt));

  const breathingMinutes = typeof breathingStats?.totalMinutes === 'number'
    ? breathingStats.totalMinutes
    : breathingSessions.reduce((sum, session) => sum + (Number(session?.durationMinutes) || 0), 0);

  cardOngoing.forEach((session: any) => addActiveDate(session?.lastUpdatedAt ?? session?.startedAt));
  cardCompleted.forEach((session: any) => addActiveDate(session?.completedAt));

  return {
    aiSessions: therapySessions.length,
    artCompleted: artItems.filter((progress: any) => progress?.completed).length,
    artStarted: artItems.length,
    journalNotes: journalEntries.length,
    breathingMinutes: Math.round(breathingMinutes),
    cardSessions: cardOngoing.length + cardCompleted.length,
    streakDays: getCurrentStreak(activeDateKeys),
    activeDays: activeDateKeys.size,
  };
}

export async function getRecentActivity(hours = 24): Promise<ActivityEvent[]> {
  const { therapySessions, journalEntries, artProgress, breathingStats, cardOngoing, cardCompleted } = await readAllSources();
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const events: ActivityEvent[] = [];

  const add = (feature: ActivityFeature, value: unknown) => {
    const ts = toEpochMs(value);
    if (ts !== null && ts >= cutoff) events.push({ feature, timestampMs: ts });
  };

  therapySessions.forEach((session: any) => add('ai', session?.endTime ?? session?.startTime));
  journalEntries.forEach((entry: any) => add('journal', entry?.timestamp));
  Object.values(artProgress ?? {}).forEach((progress: any) => add('art', progress?.completedAt ?? progress?.startedAt));

  const breathingSessions = Array.isArray(breathingStats?.completedSessions) ? breathingStats.completedSessions : [];
  breathingSessions.forEach((session: any) => add('breathing', session?.completedAt));

  cardOngoing.forEach((session: any) => add('cards', session?.lastUpdatedAt ?? session?.startedAt));
  cardCompleted.forEach((session: any) => add('cards', session?.completedAt));

  return events.sort((a, b) => b.timestampMs - a.timestampMs);
}
