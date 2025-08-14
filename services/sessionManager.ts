import AsyncStorage from '@react-native-async-storage/async-storage';
import { TherapeuticMessage } from './localAI';

export interface TherapySession {
  id: string;
  categoryId: string;
  problemContext: string;
  therapistRole: any;
  messages: TherapeuticMessage[];
  isActive: boolean;
  isCompleted: boolean;
  messageCount: number;
  recommendations?: any[]; // AI-generated structured recommendations
  completionSummary?: string; // AI-generated completion summary
  completionMessage?: string; // AI-generated completion message
}

export interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMessagesSent: number;
  mostUsedCategory: string;
}

const STORAGE_KEYS = {
  THERAPY_SESSIONS: 'therapy_sessions',
  ACTIVE_SESSION: 'active_session_id',
  SESSION_COUNTER: 'session_counter'
};

export class SessionManager {
  
  // Cache for sessions to improve performance
  private static sessionsCache: Record<string, TherapySession> | null = null;
  private static cacheTimestamp: number | null = null;
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  // Clear cache
  private static clearCache(): void {
    this.sessionsCache = null;
    this.cacheTimestamp = null;
  }

  // Check if cache is valid
  private static isCacheValid(): boolean {
    if (!this.sessionsCache || !this.cacheTimestamp) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }
  
  // Generate unique session ID
  static async generateSessionId(): Promise<string> {
    const counter = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNTER);
    const newCounter = counter ? parseInt(counter) + 1 : 1;
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNTER, newCounter.toString());
    return `session_${Date.now()}_${newCounter}`;
  }

  // Create new therapy session
  static async createSession(
    categoryId: string,
    problemContext: string,
    therapistRole: any,
    initialMessage: TherapeuticMessage
  ): Promise<string> {
    try {
      const sessionId = await this.generateSessionId();
      const session: TherapySession = {
        id: sessionId,
        categoryId,
        problemContext,
        therapistRole,
        messages: [initialMessage],
        isActive: true,
        isCompleted: false,
        messageCount: 1
      };

      // Save session
      await this.saveSession(session);
      
      // Set as active session
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, sessionId);
      
      console.log('Session created:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Save session data
  static async saveSession(session: TherapySession): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      sessions[session.id] = session;
      await AsyncStorage.setItem(STORAGE_KEYS.THERAPY_SESSIONS, JSON.stringify(sessions));
      
      // Update cache
      this.sessionsCache = sessions;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // Get all sessions
  static async getAllSessions(): Promise<Record<string, TherapySession>> {
    try {
      // Return cached data if valid
      if (this.isCacheValid() && this.sessionsCache) {
        return this.sessionsCache;
      }

      const sessionsData = await AsyncStorage.getItem(STORAGE_KEYS.THERAPY_SESSIONS);
      const sessions = sessionsData ? JSON.parse(sessionsData) : {};
      
      // Update cache
      this.sessionsCache = sessions;
      this.cacheTimestamp = Date.now();
      
      return sessions;
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return {};
    }
  }

  // Get active session
  static async getActiveSession(): Promise<TherapySession | null> {
    try {
      const activeSessionId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (!activeSessionId) return null;

      const sessions = await this.getAllSessions();
      const session = sessions[activeSessionId];
      
      return session && session.isActive ? session : null;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  // Get session by ID
  static async getSession(sessionId: string): Promise<TherapySession | null> {
    try {
      const sessions = await this.getAllSessions();
      return sessions[sessionId] || null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Update session with new message
  static async addMessageToSession(sessionId: string, message: TherapeuticMessage): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      session.messages.push(message);
      session.messageCount = session.messages.length;

      await this.saveSession(session);
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw error;
    }
  }

  // Complete session
  static async completeSession(sessionId: string, recommendations?: any[], completionSummary?: string, completionMessage?: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      session.isActive = false;
      session.isCompleted = true;
      
      // Save recommendations and completion summary
      if (recommendations) {
        session.recommendations = recommendations;
      }
      if (completionSummary) {
        session.completionSummary = completionSummary;
      }
      if (completionMessage) {
        session.completionMessage = completionMessage;
      }

      await this.saveSession(session);
      
      // Clear active session if this was the active one
      const activeSessionId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (activeSessionId === sessionId) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  // Resume session (set as active)
  static async resumeSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      session.isActive = true;
      
      await this.saveSession(session);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, sessionId);
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    }
  }

  // Get sessions by status
  static async getSessionsByStatus(isActive: boolean): Promise<TherapySession[]> {
    try {
      const sessions = await this.getAllSessions();
      return Object.values(sessions).filter(session => session.isActive === isActive);
    } catch (error) {
      console.error('Error getting sessions by status:', error);
      return [];
    }
  }

  // Get session summary statistics
  static async getSessionSummary(): Promise<SessionSummary> {
    try {
      const sessions = await this.getAllSessions();
      const sessionList = Object.values(sessions);
      
      const categoryCount: Record<string, number> = {};
      let totalMessagesSent = 0;

      sessionList.forEach(session => {
        categoryCount[session.categoryId] = (categoryCount[session.categoryId] || 0) + 1;
        totalMessagesSent += session.messageCount;
      });

      const mostUsedCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b, Object.keys(categoryCount)[0] || ''
      );

      return {
        totalSessions: sessionList.length,
        activeSessions: sessionList.filter(s => s.isActive).length,
        completedSessions: sessionList.filter(s => s.isCompleted).length,
        totalMessagesSent,
        mostUsedCategory
      };
    } catch (error) {
      console.error('Error getting session summary:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        totalMessagesSent: 0,
        mostUsedCategory: ''
      };
    }
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      delete sessions[sessionId];
      await AsyncStorage.setItem(STORAGE_KEYS.THERAPY_SESSIONS, JSON.stringify(sessions));

      // Update cache
      this.sessionsCache = sessions;
      this.cacheTimestamp = Date.now();

      // Clear active session if this was the active one
      const activeSessionId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (activeSessionId === sessionId) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Clear all sessions (for debugging/reset)
  static async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.THERAPY_SESSIONS);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_COUNTER);
      
      // Clear cache
      this.clearCache();
    } catch (error) {
      console.error('Error clearing all sessions:', error);
      throw error;
    }
  }
}
