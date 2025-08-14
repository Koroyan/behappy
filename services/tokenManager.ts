import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TokenUsage {
  sessionId: string;
  tokensUsed: number;
  maxTokens: number;
  messagesCount: number;
  estimatedTokensPerMessage: number;
  lastUpdated: Date;
}

export class TokenManager {
  private static readonly MAX_TOKENS = 10000;
  private static readonly ESTIMATED_TOKENS_PER_MESSAGE = 150; // Average tokens per message
  private static readonly STORAGE_KEY = 'token_usage';

  static async getTokenUsage(sessionId: string): Promise<TokenUsage> {
    try {
      const storedUsage = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allUsage: { [key: string]: TokenUsage } = storedUsage ? JSON.parse(storedUsage) : {};
      
      return allUsage[sessionId] || {
        sessionId,
        tokensUsed: 0,
        maxTokens: this.MAX_TOKENS,
        messagesCount: 0,
        estimatedTokensPerMessage: this.ESTIMATED_TOKENS_PER_MESSAGE,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting token usage:', error);
      return {
        sessionId,
        tokensUsed: 0,
        maxTokens: this.MAX_TOKENS,
        messagesCount: 0,
        estimatedTokensPerMessage: this.ESTIMATED_TOKENS_PER_MESSAGE,
        lastUpdated: new Date()
      };
    }
  }

  static async updateTokenUsage(sessionId: string, newMessage: string): Promise<TokenUsage> {
    try {
      const currentUsage = await this.getTokenUsage(sessionId);
      
      // Estimate tokens for the new message (rough calculation)
      const estimatedTokens = Math.ceil(newMessage.length / 4); // ~4 characters per token
      
      const updatedUsage: TokenUsage = {
        ...currentUsage,
        tokensUsed: currentUsage.tokensUsed + estimatedTokens,
        messagesCount: currentUsage.messagesCount + 1,
        lastUpdated: new Date()
      };

      // Update storage
      const storedUsage = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allUsage: { [key: string]: TokenUsage } = storedUsage ? JSON.parse(storedUsage) : {};
      allUsage[sessionId] = updatedUsage;
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allUsage));
      
      return updatedUsage;
    } catch (error) {
      console.error('Error updating token usage:', error);
      return await this.getTokenUsage(sessionId);
    }
  }

  static async isTokenLimitReached(sessionId: string): Promise<boolean> {
    const usage = await this.getTokenUsage(sessionId);
    return usage.tokensUsed >= usage.maxTokens;
  }

  static async getRemainingTokens(sessionId: string): Promise<number> {
    const usage = await this.getTokenUsage(sessionId);
    return Math.max(0, usage.maxTokens - usage.tokensUsed);
  }

  static async getTokenProgressPercentage(sessionId: string): Promise<number> {
    const usage = await this.getTokenUsage(sessionId);
    return Math.min(100, (usage.tokensUsed / usage.maxTokens) * 100);
  }

  static async resetTokenUsage(sessionId: string): Promise<void> {
    try {
      const storedUsage = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedUsage) {
        const allUsage: { [key: string]: TokenUsage } = JSON.parse(storedUsage);
        delete allUsage[sessionId];
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allUsage));
      }
    } catch (error) {
      console.error('Error resetting token usage:', error);
    }
  }

  static async generateSessionSummary(sessionId: string): Promise<string> {
    const usage = await this.getTokenUsage(sessionId);
    
    if (usage.tokensUsed >= usage.maxTokens * 0.9) {
      return `🔥 Сессия подходит к концу! Использовано токенов: ${usage.tokensUsed}/${usage.maxTokens}. У вас ${usage.messagesCount} сообщений и вы уже близки к лимиту сессии.`;
    } else if (usage.tokensUsed >= usage.maxTokens * 0.7) {
      return `⚠️ Уже использовано 70% сессии! Использовано токенов: ${usage.tokensUsed}/${usage.maxTokens}. Начинайте подготовку к завершению сессии.`;
    } else if (usage.tokensUsed >= usage.maxTokens * 0.5) {
      return `📊 Использована половина сессии. Использовано токенов: ${usage.tokensUsed}/${usage.maxTokens}. Все идет хорошо!`;
    } else {
      return `✅ Сессия проходит отлично! Использовано токенов: ${usage.tokensUsed}/${usage.maxTokens}. Отправлено ${usage.messagesCount} сообщений.`;
    }
  }
}
