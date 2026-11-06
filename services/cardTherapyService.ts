import { AppLanguage } from '@/contexts/LanguageContext';
import { aiResponses, aiResponsesStream, createResponseStreamParser, responseText, StaleChainError } from '@/lib/api/ai';
import { canPersonalize } from '@/lib/privacy/consent';
import { buildProfileContextBlock, getUserProfile } from './userProfileService';

/**
 * Card reflection service: conversations with Anulia about picture cards,
 * through the BeHappy server.
 */

interface CardContext {
  cardType: 'emotion' | 'resource' | 'positive_negative' | 'narrative';
  cardId: string;
  positiveCardId?: string; // For positive/negative cards
  negativeCardId?: string; // For positive/negative cards
  language?: AppLanguage; // User's preferred language
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German', fr: 'French',
  pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};

/**
 * Neutral context for the model (the instructions themselves are server-owned:
 * server/prompts/cards.md). It names the cards and the reply language and
 * nothing else: no "client", no protocol, no claim about what a card reveals.
 */
function describeCards(ctx: CardContext): string {
  const lang = LANGUAGE_NAMES[ctx.language || 'en'] || 'English';
  const what =
    ctx.cardType === 'positive_negative'
      ? `a light and heavy pair: card #${ctx.positiveCardId || '?'} (light) and card #${ctx.negativeCardId || '?'} (heavy)`
      : ctx.cardType === 'resource'
        ? `resource card #${ctx.cardId}`
        : ctx.cardType === 'narrative'
          ? `moments (story) card #${ctx.cardId}`
          : `emotion card #${ctx.cardId}`;
  return `[Card reflection] The person chose ${what} from the BeHappy card decks; the card image is shared in this conversation. Reply in ${lang}.`;
}

class CardTherapyService {
  // Instructions are server-owned (server/prompts/cards.md); requests go through
  // the BeHappy server, which holds the key.

  private ctx(conversationId?: string) {
    return { feature: 'cards' as const, conversationId: conversationId || 'cards-default' };
  }

  private async request(input: any[], conversationId: string | undefined, chainId?: string, maxTokens = 1500): Promise<any> {
    return aiResponses(
      {
        input,
        max_output_tokens: maxTokens,
        store: true,
        ...(chainId ? { previous_response_id: chainId } : {}),
      },
      this.ctx(conversationId)
    );
  }

  /**
   * Start a new card reflection. Card images are sent as data URIs.
   */
  async startSession(
    cardContext: CardContext,
    cardImageBase64?: string | null,
    positiveImageBase64?: string | null,
    negativeImageBase64?: string | null,
    onResponseId?: (id: string) => void,
    conversationId?: string
  ): Promise<string> {
    const contextMessage = await this.buildContextMessage(cardContext);
    const content: any[] = [{ type: 'input_text', text: contextMessage }];
    if (cardImageBase64) content.push({ type: 'input_image', image_url: cardImageBase64 });
    if (positiveImageBase64) content.push({ type: 'input_image', image_url: positiveImageBase64 });
    if (negativeImageBase64) content.push({ type: 'input_image', image_url: negativeImageBase64 });

    const data = await this.request([{ role: 'user', content }], conversationId);
    if (data?.id) onResponseId?.(data.id);
    return responseText(data) || data?.response || '';
  }

  /**
   * Send a message in an ongoing reflection. With `previousResponseId`, only
   * the newest turn is sent (server-side chaining); a stale chain falls back
   * to resending the full local transcript once.
   */
  async sendMessage(
    messages: ChatMessage[],
    cardContext: CardContext,
    onStream?: (delta: string) => void,
    previousResponseId?: string,
    onResponseId?: (id: string) => void,
    conversationId?: string
  ): Promise<string> {
    const buildFullInput = async (): Promise<any[]> => {
      const hasContext = messages.some((m) => m.role === 'system');
      const withContext = hasContext ? messages : [{ role: 'system' as const, content: await this.buildContextMessage(cardContext) }, ...messages];
      return this.convertMessagesToInput(withContext);
    };
    const buildIncrementalInput = (): any[] => {
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'user') return this.convertMessagesToInput(messages);
      return [{ role: 'user', content: [{ type: 'input_text', text: last.content }] }];
    };

    const run = async (input: any[], chainId?: string): Promise<string> => {
      if (!onStream) {
        const data = await this.request(input, conversationId, chainId);
        if (data?.id) onResponseId?.(data.id);
        return responseText(data) || data?.response || '';
      }
      let emitted = '';
      const parser = createResponseStreamParser({
        onDelta: (full) => {
          const delta = full.slice(emitted.length);
          emitted = full;
          if (delta) onStream(delta);
        },
        onId: (id) => onResponseId?.(id),
      });
      await aiResponsesStream(
        {
          input,
          max_output_tokens: 1500,
          store: true,
          ...(chainId ? { previous_response_id: chainId } : {}),
        },
        this.ctx(conversationId),
        (chunk) => parser.push(chunk)
      );
      const { text, id } = parser.finish();
      if (id) onResponseId?.(id);
      if (text.length > emitted.length) onStream(text.slice(emitted.length));
      return text;
    };

    if (previousResponseId) {
      try {
        return await run(buildIncrementalInput(), previousResponseId);
      } catch (e) {
        if (!(e instanceof StaleChainError)) throw e;
      }
    }
    return run(await buildFullInput(), undefined);
  }

  /**
   * Request the closing summary of a reflection.
   */
  async requestSummary(
    messages: ChatMessage[],
    cardContext: CardContext,
    previousResponseId?: string,
    onResponseId?: (id: string) => void,
    conversationId?: string
  ): Promise<string> {
    const summaryRequest: ChatMessage = {
      role: 'user',
      content: "We've covered a lot of meaningful ground. I'm ready for the session summary now. Please provide the summary of this reflection.",
    };
    const buildFullInput = async () =>
      this.convertMessagesToInput([{ role: 'system' as const, content: await this.buildContextMessage(cardContext) }, ...messages, summaryRequest]);

    let data: any;
    if (previousResponseId) {
      try {
        data = await this.request(this.convertMessagesToInput([summaryRequest]), conversationId, previousResponseId, 3000);
      } catch (e) {
        if (!(e instanceof StaleChainError)) throw e;
        data = await this.request(await buildFullInput(), conversationId, undefined, 3000);
      }
    } else {
      data = await this.request(await buildFullInput(), conversationId, undefined, 3000);
    }
    if (data?.id) onResponseId?.(data.id);
    return responseText(data) || data?.response || '';
  }

  /**
   * Convert ChatMessage[] to Responses API input format
   */
  private convertMessagesToInput(messages: ChatMessage[]): any[] {
    const input: any[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // The app's card context travels as a user turn: the server accepts only
      // user and assistant messages from clients (instructions are its own).
      if (msg.role === 'user' || msg.role === 'system') {
        input.push({
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: msg.content,
            },
          ],
        });
      } else if (msg.role === 'assistant') {
        // For assistant messages in input (conversation history)
        input.push({
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: msg.content,
            },
          ],
        });
      }
    }

    return input;
  }

  /** The first-turn context: which cards, and the reply language. */
  private async buildContextMessage(cardContext: CardContext): Promise<string> {
    const base = describeCards(cardContext);
    const profileBlock = (await canPersonalize()) ? buildProfileContextBlock(await getUserProfile()) : '';
    return profileBlock ? `${profileBlock}\n\n${base}` : base;
  }

  /**
   * Detect if AI is ready to close the session (look for summary indicators)
   */
  isSummaryMessage(message: string): boolean {
    if (message.trimStart().startsWith('🎴')) return true;
    const summaryIndicators = [
      '🎴 THERAPEUTIC CARD SESSION SUMMARY',
      'SESSION SUMMARY',
      '📋 SESSION DETAILS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    return summaryIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Count exchanges in session (user + assistant pairs)
   */
  countExchanges(messages: ChatMessage[]): number {
    return messages.filter(m => m.role === 'user').length;
  }

  /**
   * Check if session is ready for closing (20-30 exchanges)
   */
  isSessionReadyForClosure(messages: ChatMessage[]): boolean {
    const exchanges = this.countExchanges(messages);
    return exchanges >= 20;
  }

  /**
   * Suggest summary if appropriate
   */
  shouldSuggestSummary(messages: ChatMessage[]): boolean {
    const exchanges = this.countExchanges(messages);
    return exchanges >= 25; // Suggest at 25+ exchanges
  }
}

export default new CardTherapyService();
export { CardContext, ChatMessage };

