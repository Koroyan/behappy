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
  /** Share profile details (name, age…) with Anulia. Default on once AI is on. */
  personalize: boolean;
}

let state: ConsentState = { ai: false, decidedAt: null, personalize: true };
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
    state = { ai: Boolean(parsed?.ai), decidedAt: parsed?.decidedAt ?? null, personalize: p === null ? true : p === 'true' };
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

export async function setPersonalize(personalize: boolean) {
  state = { ...state, personalize };
  subs.forEach((fn) => fn(state));
  await AsyncStorage.setItem(PERSONALIZE_KEY, String(personalize));
}

export async function assertAiConsent() {
  const s = await loadConsent();
  if (!s.ai) throw new ConsentRequiredError();
}

export async function canPersonalize(): Promise<boolean> {
  const s = await loadConsent();
  return s.ai && s.personalize;
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
