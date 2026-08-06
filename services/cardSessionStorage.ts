import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClientSessionSummary } from '../components/ClientSessionSummaryCard';
import { CardContext, ChatMessage } from './cardTherapyService';

// Storage keys
const STORAGE_KEYS = {
  ONGOING_SESSIONS: 'card_therapy_ongoing_sessions', // Changed to plural - stores array
  COMPLETED_SESSIONS: 'card_therapy_completed_sessions',
};

// Ongoing session interface
export interface OngoingCardSession {
  id: string;
  cardContext: CardContext;
  messages: ChatMessage[];
  cardImageBase64?: string | null;
  positiveImageBase64?: string | null;
  negativeImageBase64?: string | null;
  startedAt: number; // timestamp
  lastUpdatedAt: number; // timestamp
  exchangeCount: number;
  // Id of the most recent OpenAI response in this session's chain, so continuing later can
  // resume via `previous_response_id` instead of resending the full conversation history.
  lastResponseId?: string;
}

// Completed session interface
export interface CompletedCardSession {
  id: string;
  cardContext: CardContext;
  messages: ChatMessage[]; // Full message history
  summary: ClientSessionSummary;
  cardImageBase64?: string | null;
  positiveImageBase64?: string | null;
  negativeImageBase64?: string | null;
  completedAt: number; // timestamp
  messageCount: number;
}

class CardSessionStorageService {
  /**
   * Get all ongoing sessions
   */
  async getAllOngoingSessions(): Promise<OngoingCardSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ONGOING_SESSIONS);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get ongoing sessions:', error);
      return [];
    }
  }

  /**
   * Save ongoing session (adds or updates in the array)
   */
  async saveOngoingSession(session: OngoingCardSession): Promise<void> {
    try {
      const sessions = await this.getAllOngoingSessions();
      
      // Find if session with this ID already exists (to update it)
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        // Update existing session (same session ID = update)
        sessions[existingIndex] = session;
      } else {
        // Add new session at the beginning (new session ID = new session)
        sessions.unshift(session);
      }

      // Keep only last 20 ongoing sessions
      const trimmedSessions = sessions.slice(0, 20);

      await AsyncStorage.setItem(
        STORAGE_KEYS.ONGOING_SESSIONS,
        JSON.stringify(trimmedSessions)
      );
    } catch (error) {
      console.error('Failed to save ongoing session:', error);
      throw error;
    }
  }

  /**
   * Get ongoing session by card context
   */
  async getOngoingSession(cardContext?: CardContext): Promise<OngoingCardSession | null> {
    try {
      const sessions = await this.getAllOngoingSessions();
      
      if (!cardContext) {
        // Return most recent session if no context provided
        return sessions.length > 0 ? sessions[0] : null;
      }

      // Find session matching the card context
      const session = sessions.find(s =>
        s.cardContext.cardType === cardContext.cardType &&
        s.cardContext.cardId === cardContext.cardId &&
        s.cardContext.positiveCardId === cardContext.positiveCardId &&
        s.cardContext.negativeCardId === cardContext.negativeCardId
      );

      return session || null;
    } catch (error) {
      console.error('Failed to get ongoing session:', error);
      return null;
    }
  }

  /**
   * Clear specific ongoing session by card context
   */
  async clearOngoingSession(cardContext?: CardContext): Promise<void> {
    try {
      if (!cardContext) {
        // Clear all ongoing sessions
        await AsyncStorage.removeItem(STORAGE_KEYS.ONGOING_SESSIONS);
        return;
      }

      const sessions = await this.getAllOngoingSessions();
      const filteredSessions = sessions.filter(s =>
        !(s.cardContext.cardType === cardContext.cardType &&
          s.cardContext.cardId === cardContext.cardId &&
          s.cardContext.positiveCardId === cardContext.positiveCardId &&
          s.cardContext.negativeCardId === cardContext.negativeCardId)
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.ONGOING_SESSIONS,
        JSON.stringify(filteredSessions)
      );
    } catch (error) {
      console.error('Failed to clear ongoing session:', error);
      throw error;
    }
  }

  /**
   * Save completed session
   */
  async saveCompletedSession(session: CompletedCardSession): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_SESSIONS);
      const sessions: CompletedCardSession[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Add new session at the beginning (most recent first)
      sessions.unshift(session);

      // Keep only last 50 sessions
      const trimmedSessions = sessions.slice(0, 50);

      await AsyncStorage.setItem(
        STORAGE_KEYS.COMPLETED_SESSIONS,
        JSON.stringify(trimmedSessions)
      );
    } catch (error) {
      console.error('Failed to save completed session:', error);
      throw error;
    }
  }

  /**
   * Get all completed sessions
   */
  async getCompletedSessions(): Promise<CompletedCardSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_SESSIONS);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get completed sessions:', error);
      return [];
    }
  }

  /**
   * Get completed session by ID
   */
  async getCompletedSessionById(id: string): Promise<CompletedCardSession | null> {
    try {
      const sessions = await this.getCompletedSessions();
      return sessions.find(s => s.id === id) || null;
    } catch (error) {
      console.error('Failed to get completed session by ID:', error);
      return null;
    }
  }

  /**
   * Delete completed session by ID
   */
  async deleteCompletedSession(id: string): Promise<void> {
    try {
      const sessions = await this.getCompletedSessions();
      const filteredSessions = sessions.filter(s => s.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.COMPLETED_SESSIONS,
        JSON.stringify(filteredSessions)
      );
    } catch (error) {
      console.error('Failed to delete completed session:', error);
      throw error;
    }
  }

  /**
   * Check if there's an ongoing session for specific card context
   */
  async hasOngoingSession(cardContext?: CardContext): Promise<boolean> {
    const session = await this.getOngoingSession(cardContext);
    return session !== null;
  }

  /**
   * Delete specific ongoing session by ID
   */
  async deleteOngoingSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getAllOngoingSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.ONGOING_SESSIONS,
        JSON.stringify(filteredSessions)
      );
    } catch (error) {
      console.error('Failed to delete ongoing session:', error);
      throw error;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `card_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const cardSessionStorage = new CardSessionStorageService();
