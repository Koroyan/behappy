import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'behappy_art_therapy.db';
const DB_VERSION = 1;
const IS_WEB = Platform.OS === 'web';

export interface SessionRow {
  id: number;
  module: number;
  icon: string;
  color: string;
  estimated_duration: number;
  focus_areas: string; // JSON string array
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
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;
  private webCache: Map<string, any> | null = null; // For web platform

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // On web, use in-memory cache instead of SQLite
      if (IS_WEB) {
        this.webCache = new Map();
        await this.populateWebCache();
        this.initialized = true;
        console.log('✅ Art Therapy Database initialized (Web mode - in-memory cache)');
        return;
      }

      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      
      // Create tables
      await this.createTables();
      
      // Check if we need to populate data
      const count = await this.getSessionCount();
      if (count === 0) {
        await this.populateInitialData();
      }

      this.initialized = true;
      console.log('✅ Art Therapy Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Populate web cache with session data (web platform only)
   */
  private async populateWebCache(): Promise<void> {
    const { ALL_SESSIONS } = await import('./sessionsData');
    this.webCache!.set('sessions', ALL_SESSIONS);
    console.log(`📦 Web cache populated with ${ALL_SESSIONS.length} sessions`);
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        module INTEGER NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        estimated_duration INTEGER NOT NULL,
        focus_areas TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_translations (
        session_id INTEGER NOT NULL,
        language_code TEXT NOT NULL,
        title TEXT NOT NULL,
        theme TEXT NOT NULL,
        description TEXT NOT NULL,
        drawing_prompt TEXT NOT NULL,
        PRIMARY KEY (session_id, language_code),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_module ON sessions(module);
      CREATE INDEX IF NOT EXISTS idx_language ON session_translations(language_code);
    `);
  }

  /**
   * Get session count
   */
  private async getSessionCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessions'
    );
    return result?.count || 0;
  }

  /**
   * Get all sessions for a specific language
   */
  async getSessionsByLanguage(languageCode: string): Promise<any[]> {
    // Web cache mode
    if (IS_WEB && this.webCache) {
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

    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.getAllAsync(`
      SELECT 
        s.id,
        s.module,
        s.icon,
        s.color,
        s.estimated_duration,
        s.focus_areas,
        t.title,
        t.theme,
        t.description,
        t.drawing_prompt
      FROM sessions s
      JOIN session_translations t ON s.id = t.session_id
      WHERE t.language_code = ?
      ORDER BY s.id
    `, [languageCode]);

    return sessions.map((row: any) => ({
      id: row.id,
      module: row.module,
      title: row.title,
      theme: row.theme,
      description: row.description,
      drawingPrompt: row.drawing_prompt,
      icon: row.icon,
      color: row.color,
      estimatedDuration: row.estimated_duration,
      focusAreas: JSON.parse(row.focus_areas)
    }));
  }

  /**
   * Get sessions by module number
   */
  async getSessionsByModule(moduleNum: number, languageCode: string): Promise<any[]> {
    // Web cache mode
    if (IS_WEB && this.webCache) {
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

    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.getAllAsync(`
      SELECT 
        s.id,
        s.module,
        s.icon,
        s.color,
        s.estimated_duration,
        s.focus_areas,
        t.title,
        t.theme,
        t.description,
        t.drawing_prompt
      FROM sessions s
      JOIN session_translations t ON s.id = t.session_id
      WHERE s.module = ? AND t.language_code = ?
      ORDER BY s.id
    `, [moduleNum, languageCode]);

    return sessions.map((row: any) => ({
      id: row.id,
      module: row.module,
      title: row.title,
      theme: row.theme,
      description: row.description,
      drawingPrompt: row.drawing_prompt,
      icon: row.icon,
      color: row.color,
      estimatedDuration: row.estimated_duration,
      focusAreas: JSON.parse(row.focus_areas)
    }));
  }

  /**
   * Get a single session by ID
   */
  async getSessionById(sessionId: number, languageCode: string): Promise<any | null> {
    // Web cache mode
    if (IS_WEB && this.webCache) {
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

    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(`
      SELECT 
        s.id,
        s.module,
        s.icon,
        s.color,
        s.estimated_duration,
        s.focus_areas,
        t.title,
        t.theme,
        t.description,
        t.drawing_prompt
      FROM sessions s
      JOIN session_translations t ON s.id = t.session_id
      WHERE s.id = ? AND t.language_code = ?
    `, [sessionId, languageCode]);

    if (!row) return null;

    return {
      id: (row as any).id,
      module: (row as any).module,
      title: (row as any).title,
      theme: (row as any).theme,
      description: (row as any).description,
      drawingPrompt: (row as any).drawing_prompt,
      icon: (row as any).icon,
      color: (row as any).color,
      estimatedDuration: (row as any).estimated_duration,
      focusAreas: JSON.parse((row as any).focus_areas)
    };
  }

  /**
   * Get total session count
   */
  async getTotalSessionCount(): Promise<number> {
    // Web cache mode
    if (IS_WEB && this.webCache) {
      const allSessions = this.webCache.get('sessions') || [];
      return allSessions.length;
    }
    
    return this.getSessionCount();
  }

  /**
   * Update a session (for future admin features)
   */
  async updateSessionTranslation(
    sessionId: number,
    languageCode: string,
    data: Partial<TranslationRow>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const params: any[] = [];

    if (data.title) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.theme) {
      updates.push('theme = ?');
      params.push(data.theme);
    }
    if (data.description) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.drawing_prompt) {
      updates.push('drawing_prompt = ?');
      params.push(data.drawing_prompt);
    }

    if (updates.length === 0) return;

    params.push(sessionId, languageCode);

    await this.db.runAsync(
      `UPDATE session_translations SET ${updates.join(', ')} WHERE session_id = ? AND language_code = ?`,
      params
    );
  }

  /**
   * Clear all data (for re-initialization)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM session_translations;
      DELETE FROM sessions;
    `);
  }

  /**
   * Populate initial data - Will be filled with all 43 sessions
   */
  private async populateInitialData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('📦 Populating database with art therapy sessions...');

    // Import sessions data
    const { ALL_SESSIONS } = await import('./sessionsData');

    let successCount = 0;
    let errorCount = 0;

    // Insert all sessions
    for (const sessionData of ALL_SESSIONS) {
      try {
        await this.insertSession(sessionData.id, {
          module: sessionData.module,
          icon: sessionData.icon,
          color: sessionData.color,
          estimatedDuration: sessionData.estimatedDuration,
          focusAreas: sessionData.focusAreas,
          translations: sessionData.translations
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to insert session ${sessionData.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Database populated: ${successCount} sessions added${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
  }

  /**
   * Insert a session with all translations
   */
  private async insertSession(
    id: number,
    data: {
      module: number;
      icon: string;
      color: string;
      estimatedDuration: number;
      focusAreas: string[];
      translations: Record<string, {
        title: string;
        theme: string;
        description: string;
        drawingPrompt: string;
      }>;
    }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Insert session
    await this.db.runAsync(
      `INSERT INTO sessions (id, module, icon, color, estimated_duration, focus_areas) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.module,
        data.icon,
        data.color,
        data.estimatedDuration,
        JSON.stringify(data.focusAreas)
      ]
    );

    // Insert all translations
    for (const [langCode, translation] of Object.entries(data.translations)) {
      await this.db.runAsync(
        `INSERT INTO session_translations (session_id, language_code, title, theme, description, drawing_prompt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          langCode,
          translation.title,
          translation.theme,
          translation.description,
          translation.drawingPrompt
        ]
      );
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Singleton instance
export const artTherapyDB = new ArtTherapyDatabase();
