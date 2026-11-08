/**
 * Consent for AI features.
 *
 * Nothing the user writes or uploads is sent to the AI provider until they
 * explicitly agree. The choice is stored on the device and can be withdrawn
 * any time in Profile › Privacy.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = '@behappy_ai_consent_v1';
const PERSONALIZE_KEY = '@behappy_ai_personalize_v1';

export interface ConsentState {
  ai: boolean;
  decidedAt: number | null;
  /** Share profile details (name, age…) with Anulia. Off until the person turns it on. */
  personalize: boolean;
}

let state: ConsentState = { ai: false, decidedAt: null, personalize: false };
let loaded = false;
const subs = new Set<(s: ConsentState) => void>();

export class ConsentRequiredError extends Error {
  constructor() {
    super('AI consent required');
    this.name = 'ConsentRequiredError';
  }
}

export async function loadConsent(): Promise<ConsentState> {
  if (loaded) return state;
  try {
    const [raw, p] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(PERSONALIZE_KEY)]);
    const parsed = raw ? JSON.parse(raw) : null;
    // Profile sharing is off until the person chooses it (see MemoryConsent).
    state = { ai: Boolean(parsed?.ai), decidedAt: parsed?.decidedAt ?? null, personalize: p === 'true' };
  } catch {
    // default: off
  }
  loaded = true;
  return state;
}

export async function setAiConsent(ai: boolean) {
  state = { ...state, ai, decidedAt: Date.now() };
  subs.forEach((fn) => fn(state));
  await AsyncStorage.setItem(KEY, JSON.stringify({ ai, decidedAt: state.decidedAt }));
}

/** The older "personalize" switch is the same as the "profile" memory switch. */
export async function setPersonalize(personalize: boolean) {
  state = { ...state, personalize };
  subs.forEach((fn) => fn(state));
  await setMemoryCategory('profile', personalize);
}

export async function assertAiConsent() {
  const s = await loadConsent();
  if (!s.ai) throw new ConsentRequiredError();
}

/** Profile details for Anulia: only with AI consent AND the "profile" memory switch. */
export async function canPersonalize(): Promise<boolean> {
  const s = await loadConsent();
  const m = await loadMemoryConsent();
  return s.ai && m.categories.profile;
}

// ---------- What Anulia can remember ----------
//
// Separate from the general AI consent: agreeing to use AI never lets Anulia
// see anything from the person's history. Every category is off until the
// person switches it on; any switch off (or an item excluded, a note deleted)
// raises `version`, which drops cached context and the stored conversation
// chain at OpenAI (a new chain starts without what was revoked).

export type MemoryCategory = 'profile' | 'steps' | 'mood' | 'sound' | 'sleep' | 'activity' | 'journalText' | 'artSummaries' | 'assessments' | 'priorChats';
export const MEMORY_CATEGORIES: MemoryCategory[] = ['profile', 'steps', 'mood', 'activity', 'sound', 'sleep', 'priorChats', 'journalText', 'artSummaries', 'assessments'];

export interface MemoryNote {
  id: string;
  text: string;
  createdAt: number;
}

export interface MemoryConsent {
  categories: Record<MemoryCategory, boolean>;
  /** Items left out on purpose: "journal:<id>", "chat:<id>", "art:<session>". */
  excluded: string[];
  /** Lasting preferences the person wrote themselves ("I prefer short answers"). */
  notes: MemoryNote[];
  version: number;
  updatedAt: number | null;
}

const MEMORY_KEY = '@behappy_memory_consent_v1';
const allOff = (): Record<MemoryCategory, boolean> => Object.fromEntries(MEMORY_CATEGORIES.map((c) => [c, false])) as Record<MemoryCategory, boolean>;
let memory: MemoryConsent = { categories: allOff(), excluded: [], notes: [], version: 1, updatedAt: null };
let memoryLoaded = false;
const memorySubs = new Set<(m: MemoryConsent) => void>();

export async function loadMemoryConsent(): Promise<MemoryConsent> {
  if (memoryLoaded) return memory;
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      memory = { categories: { ...allOff(), ...(p.categories || {}) }, excluded: Array.isArray(p.excluded) ? p.excluded : [], notes: Array.isArray(p.notes) ? p.notes : [], version: Number(p.version) || 1, updatedAt: p.updatedAt ?? null };
    } else {
      // Before these switches existed, profile details were shared unless the
      // person turned "personalize" off. Now it is off unless they chose it.
      const old = await AsyncStorage.getItem(PERSONALIZE_KEY);
      memory = { ...memory, categories: { ...allOff(), profile: old === 'true' } };
    }
  } catch {
    // default: everything off
  }
  memoryLoaded = true;
  return memory;
}

async function saveMemory(next: MemoryConsent, revoked: boolean) {
  memory = { ...next, version: revoked ? memory.version + 1 : memory.version, updatedAt: Date.now() };
  memorySubs.forEach((fn) => fn(memory));
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export async function setMemoryCategory(category: MemoryCategory, on: boolean) {
  const m = await loadMemoryConsent();
  await saveMemory({ ...m, categories: { ...m.categories, [category]: on } }, !on);
  if (category === 'profile') await AsyncStorage.setItem(PERSONALIZE_KEY, String(on));
}

export async function setMemoryExcluded(itemId: string, excluded: boolean) {
  const m = await loadMemoryConsent();
  const list = excluded ? [...new Set([...m.excluded, itemId])] : m.excluded.filter((x) => x !== itemId);
  await saveMemory({ ...m, excluded: list.slice(-2000) }, excluded);
}

export async function addMemoryNote(text: string) {
  const m = await loadMemoryConsent();
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!clean) return;
  await saveMemory({ ...m, notes: [...m.notes, { id: `note_${Date.now().toString(36)}`, text: clean, createdAt: Date.now() }].slice(-20) }, false);
}

export async function deleteMemoryNote(id: string) {
  const m = await loadMemoryConsent();
  await saveMemory({ ...m, notes: m.notes.filter((n) => n.id !== id) }, true);
}

/** "Forget everything": all switches off, notes deleted, exclusions kept. */
export async function revokeAllMemory() {
  const m = await loadMemoryConsent();
  await saveMemory({ ...m, categories: allOff(), notes: [] }, true);
  await AsyncStorage.setItem(PERSONALIZE_KEY, 'false');
}

export function useMemoryConsent(): MemoryConsent & { loaded: boolean } {
  const [m, setM] = useState<MemoryConsent>(memory);
  const [isLoaded, setLoaded] = useState(memoryLoaded);
  useEffect(() => {
    let alive = true;
    loadMemoryConsent().then((v) => {
      if (!alive) return;
      setM(v);
      setLoaded(true);
    });
    memorySubs.add(setM);
    return () => {
      alive = false;
      memorySubs.delete(setM);
    };
  }, []);
  return { ...m, loaded: isLoaded };
}

export function useConsent(): ConsentState & { loaded: boolean } {
  const [s, setS] = useState<ConsentState>(state);
  const [isLoaded, setLoaded] = useState(loaded);
  useEffect(() => {
    let alive = true;
    loadConsent().then((v) => {
      if (!alive) return;
      setS(v);
      setLoaded(true);
    });
    subs.add(setS);
    return () => {
      alive = false;
      subs.delete(setS);
    };
  }, []);
  return { ...s, loaded: isLoaded };
}
