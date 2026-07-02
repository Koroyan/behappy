/**
 * Web-specific implementation of Art Therapy Database
 * Uses in-memory cache instead of SQLite
 */

export interface SessionRow {
  id: number;
  module: number;
  icon: string;
  color: string;
  estimated_duration: number;
  focus_areas: string;
}

export interface TranslationRow {
  session_id: number;
  language_code: string;
  title: string;
  theme: string;
  description: string;
  drawing_prompt: string;
}

class ArtTherapyDatabase {
  private webCache: Map<string, any> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.populateWebCache();
      this.initialized = true;
      console.log('✅ Art Therapy Database initialized (Web mode - in-memory cache)');
    } catch (error) {
      console.error('❌ Failed to initialize web cache:', error);
      throw error;
    }
  }

  private async populateWebCache(): Promise<void> {
    const { ALL_SESSIONS } = await import('./sessionsData');
    this.webCache.set('sessions', ALL_SESSIONS);
    console.log(`📦 Web cache populated with ${ALL_SESSIONS.length} sessions`);
  }

  async getSessionsByLanguage(languageCode: string): Promise<any[]> {
    const allSessions = this.webCache.get('sessions') || [];
    return allSessions.map((session: any) => {
      const trans = session.translations[languageCode] || session.translations.en;
      return {
        id: session.id,
        module: session.module,
        title: trans.title,
        theme: trans.theme,
        description: trans.description,
        drawingPrompt: trans.drawingPrompt,
        icon: session.icon,
        color: session.color,
        estimatedDuration: session.estimatedDuration,
        focusAreas: session.focusAreas
      };
    });
  }

  async getSessionsByModule(moduleNum: number, languageCode: string): Promise<any[]> {
    const allSessions = this.webCache.get('sessions') || [];
    return allSessions
      .filter((session: any) => session.module === moduleNum)
      .map((session: any) => {
        const trans = session.translations[languageCode] || session.translations.en;
        return {
          id: session.id,
          module: session.module,
          title: trans.title,
          theme: trans.theme,
          description: trans.description,
          drawingPrompt: trans.drawingPrompt,
          icon: session.icon,
          color: session.color,
          estimatedDuration: session.estimatedDuration,
          focusAreas: session.focusAreas
        };
      });
  }

  async getSessionById(sessionId: number, languageCode: string): Promise<any | null> {
    const allSessions = this.webCache.get('sessions') || [];
    const session = allSessions.find((s: any) => s.id === sessionId);
    if (!session) return null;
    
    const trans = session.translations[languageCode] || session.translations.en;
    return {
      id: session.id,
      module: session.module,
      title: trans.title,
      theme: trans.theme,
      description: trans.description,
      drawingPrompt: trans.drawingPrompt,
      icon: session.icon,
      color: session.color,
      estimatedDuration: session.estimatedDuration,
      focusAreas: session.focusAreas
    };
  }

  async getTotalSessionCount(): Promise<number> {
    const allSessions = this.webCache.get('sessions') || [];
    return allSessions.length;
  }
}

export const artTherapyDB = new ArtTherapyDatabase();
