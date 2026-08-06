import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtTherapyResponse } from './artTherapyService';
import { artTherapyDB } from './database/artTherapyDatabase';

export interface SessionProgress {
  sessionId: number;
  completed: boolean;
  phase: 0 | 1 | 2;
  startedAt?: Date;
  completedAt?: Date;
  firstDrawingUri?: string;
  secondDrawingUri?: string;
  chatHistory: any[];
  clinicalSummary?: ArtTherapyResponse;
  emotionalJourney?: string[];
  // Id of the most recent OpenAI response in this session's chain, so the next turn can
  // continue via `previous_response_id` instead of resending the full conversation history.
  lastResponseId?: string;
}

export interface ArtTherapySession {
  id: number;
  module: number;
  title: string;
  theme: string;
  description: string;
  drawingPrompt: string;
  icon: string;
  color: string;
  estimatedDuration: number;
  focusAreas: string[];
}

class ArtTherapyProgramManager {
  private storageKey = '@behappy_art_therapy_progress';
  private initialized = false;
  private currentLanguage = 'en';

  /**
   * Initialize database
   */
  async initialize(language: string = 'en'): Promise<void> {
    this.currentLanguage = language;
    if (this.initialized) return;

    await artTherapyDB.initialize();
    this.initialized = true;
  }

  /**
   * Set current language
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Get all sessions for current language
   */
  async getAllSessions(): Promise<ArtTherapySession[]> {
    await this.ensureInitialized();
    return await artTherapyDB.getSessionsByLanguage(this.currentLanguage);
  }

  /**
   * Get sessions by module
   */
  async getSessionsByModule(moduleNum: number): Promise<ArtTherapySession[]> {
    await this.ensureInitialized();
    return await artTherapyDB.getSessionsByModule(moduleNum, this.currentLanguage);
  }

  /**
   * Get single session by ID
   */
  async getSessionById(id: number): Promise<ArtTherapySession | null> {
    await this.ensureInitialized();
    return await artTherapyDB.getSessionById(id, this.currentLanguage);
  }

  /**
   * Get total session count
   */
  async getTotalSessionCount(): Promise<number> {
    await this.ensureInitialized();
    return await artTherapyDB.getTotalSessionCount();
  }

  /**
   * Get user's progress across all sessions
   */
  async getProgress(): Promise<Map<number, SessionProgress>> {
    try {
      const json = await AsyncStorage.getItem(this.storageKey);
      if (!json) {
        return new Map();
      }

      const data = JSON.parse(json);
      const progressMap = new Map<number, SessionProgress>();

      for (const [key, value] of Object.entries(data)) {
        const progress = value as any;
        // Rehydrate dates from ISO strings
        progressMap.set(Number(key), {
          ...progress,
          startedAt: progress.startedAt ? new Date(progress.startedAt) : undefined,
          completedAt: progress.completedAt ? new Date(progress.completedAt) : undefined
        } as SessionProgress);
      }

      console.log(`📖 Loaded progress for ${progressMap.size} sessions from AsyncStorage`);
      return progressMap;
    } catch (error) {
      console.error('Failed to load art therapy progress:', error);
      return new Map();
    }
  }

  /**
   * Deep-sanitize any value to produce a plain JSON-serializable structure.
   * Uses try-catch on every property access so that getter properties that throw
   * (e.g., react-native-reanimated, React Fiber internals) are safely skipped.
   */
  private deepSanitize(value: any, seen: WeakSet<object> = new WeakSet(), depth: number = 0): any {
    if (depth > 15) return '[MAX_DEPTH]';
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (t === 'function' || t === 'symbol' || t === 'bigint') return undefined;
    if (value instanceof Date) return value.toISOString();
    if (t === 'object') {
      // Skip DOM nodes and elements
      try {
        if (typeof Element !== 'undefined' && value instanceof Element) return undefined;
        if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
      } catch { /* ignore */ }
      // Skip circular references
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      if (Array.isArray(value)) {
        return value.map(item => this.deepSanitize(item, seen, depth + 1));
      }
      const result: Record<string, any> = {};
      let keys: string[];
      try {
        keys = Object.keys(value);
      } catch {
        return '[UnreadableObject]';
      }
      for (const key of keys) {
        let val: any;
        try {
          val = value[key]; // might throw for Reanimated getters
        } catch {
          continue; // skip this property entirely
        }
        const sanitized = this.deepSanitize(val, seen, depth + 1);
        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }
      return result;
    }
    return undefined;
  }

  /**
   * Safe JSON.stringify — deep-sanitizes first to handle throwing getters,
   * circular refs, DOM elements, Reanimated proxies, etc.
   */
  private safeStringify(obj: any): string {
    const sanitized = this.deepSanitize(obj);
    return JSON.stringify(sanitized);
  }

  private sanitizeStoredImageUri(uri?: string): string | undefined {
    if (!uri || typeof uri !== 'string') return undefined;

    const lowerUri = uri.toLowerCase();
    if (lowerUri.startsWith('data:') || lowerUri.startsWith('blob:') || uri.length > 2048) {
      return undefined;
    }

    return uri;
  }

  /**
   * Sanitize clinical data to ensure it's JSON-serializable (no circular refs)
   */
  private sanitizeClinicalData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    try {
      // Only keep known primitive/object fields from ArtTherapyResponse
      return {
        response_text: typeof data.response_text === 'string' ? data.response_text : undefined,
        session_phase: data.session_phase,
        phase_complete: data.phase_complete,
        session_complete: data.session_complete,
        required_input: data.required_input,
        action: data.action,
        phase_summary: typeof data.phase_summary === 'string' ? data.phase_summary : undefined,
        session_summary: typeof data.session_summary === 'string' ? data.session_summary : undefined,
        next_steps: typeof data.next_steps === 'string' ? data.next_steps : undefined,
        clinical_insights: data.clinical_insights ? {
          visual_analysis: data.clinical_insights.visual_analysis ? {
            colors: Array.isArray(data.clinical_insights.visual_analysis.colors) ? data.clinical_insights.visual_analysis.colors : [],
            shapes: Array.isArray(data.clinical_insights.visual_analysis.shapes) ? data.clinical_insights.visual_analysis.shapes : [],
            symbols: Array.isArray(data.clinical_insights.visual_analysis.symbols) ? data.clinical_insights.visual_analysis.symbols : [],
            composition: data.clinical_insights.visual_analysis.composition,
            line_quality: data.clinical_insights.visual_analysis.line_quality,
            spatial_use: data.clinical_insights.visual_analysis.spatial_use,
          } : undefined,
          emotional_indicators: data.clinical_insights.emotional_indicators,
          psychological_themes: data.clinical_insights.psychological_themes,
          cultural_elements: data.clinical_insights.cultural_elements,
          trauma_indicators: data.clinical_insights.trauma_indicators,
        } : undefined,
        therapeutic_techniques: data.therapeutic_techniques,
        safety_assessment: data.safety_assessment,
        somatic_guidance: data.somatic_guidance,
        progress_tracking: data.progress_tracking,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Save session progress
   */
  async saveProgress(sessionId: number, progress: SessionProgress): Promise<void> {
    try {
      const currentProgress = await this.getProgress();
      currentProgress.set(sessionId, progress);

      const obj: Record<number, any> = {};
      currentProgress.forEach((value, key) => {
        const sanitized: any = {
          sessionId: value.sessionId,
          completed: !!value.completed,
          phase: value.phase,
          startedAt: value.startedAt ? (value.startedAt instanceof Date ? value.startedAt.toISOString() : value.startedAt) : undefined,
          completedAt: value.completedAt ? (value.completedAt instanceof Date ? value.completedAt.toISOString() : value.completedAt) : undefined,
          firstDrawingUri: this.sanitizeStoredImageUri(value.firstDrawingUri),
          secondDrawingUri: this.sanitizeStoredImageUri(value.secondDrawingUri),
          emotionalJourney: value.emotionalJourney,
          clinicalSummary: this.sanitizeClinicalData(value.clinicalSummary),
          chatHistory: Array.isArray(value.chatHistory)
            ? value.chatHistory.map((m: any) => ({
                id: m?.id,
                role: m?.role,
                content: m?.content,
                timestamp: m?.timestamp,
                imageUri: this.sanitizeStoredImageUri(m?.imageUri),
                imageBase64: undefined,
                clinicalData: this.sanitizeClinicalData(m?.clinicalData)
              }))
            : []
        };
        obj[key] = sanitized;
      });

      await AsyncStorage.setItem(this.storageKey, this.safeStringify(obj));
      
      const dataSize = this.safeStringify(obj).length;
      const dataSizeKB = (dataSize / 1024).toFixed(2);
      console.log(`💾 Saved progress for session ${sessionId} to AsyncStorage (${dataSizeKB} KB)`);
    } catch (error) {
      console.error('Failed to save art therapy progress:', error);
      throw error;
    }
  }

  /**
   * Start a new session
   */
  async startSession(sessionId: number): Promise<SessionProgress> {
    const newProgress: SessionProgress = {
      sessionId,
      completed: false,
      phase: 0,
      startedAt: new Date(),
      chatHistory: [],
      emotionalJourney: []
    };
    
    await this.saveProgress(sessionId, newProgress);
    console.log(`🎨 Started new session ${sessionId}`);
    return newProgress;
  }

  /**
   * Complete a session
   */
  async completeSession(
    sessionId: number,
    clinicalSummary: ArtTherapyResponse,
    chatHistory: any[]
  ): Promise<void> {
    const progress = await this.getProgress();
    let sessionProgress = progress.get(sessionId);
    
    if (!sessionProgress) {
      sessionProgress = await this.startSession(sessionId);
    }
    
    sessionProgress.completed = true;
    sessionProgress.completedAt = new Date();
    sessionProgress.clinicalSummary = clinicalSummary;
    sessionProgress.chatHistory = chatHistory;
    
    await this.saveProgress(sessionId, sessionProgress);
    console.log(`✅ Completed session ${sessionId}`);
  }

  /**
   * Check if session is unlocked
   */
  async isSessionUnlocked(sessionId: number): Promise<boolean> {
    if (sessionId === 1) return true;
    
    const progress = await this.getProgress();
    const previousSession = progress.get(sessionId - 1);
    
    return previousSession?.completed === true;
  }

  /**
   * Get completed session count
   */
  async getCompletedCount(): Promise<number> {
    const progress = await this.getProgress();
    let count = 0;
    progress.forEach(p => {
      if (p.completed) count++;
    });
    return count;
  }

  /**
   * Get progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    const completed = await this.getCompletedCount();
    const total = await this.getTotalSessionCount();
    return Math.round((completed / total) * 100);
  }

  /**
   * Get sessions grouped by module
   */
  async getSessionsGroupedByModule(): Promise<{ [module: number]: ArtTherapySession[] }> {
    const allSessions = await this.getAllSessions();
    const grouped: { [module: number]: ArtTherapySession[] } = {};

    for (const session of allSessions) {
      if (!grouped[session.module]) {
        grouped[session.module] = [];
      }
      grouped[session.module].push(session);
    }

    return grouped;
  }

  /**
   * Clear all progress (for testing/reset)
   */
  async clearProgress(): Promise<void> {
    await AsyncStorage.removeItem(this.storageKey);
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize(this.currentLanguage);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await artTherapyDB.close();
    this.initialized = false;
  }
}

export default new ArtTherapyProgramManager();
