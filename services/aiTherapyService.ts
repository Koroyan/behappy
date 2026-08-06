import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildProfileContextBlock, getUserProfile } from './userProfileService';

export interface TherapyTechnique {
  method: string;
  name: string;
  description: string;
  clinical_rationale?: string;
}

export interface AIResponse {
  response_text: string;
  technique: TherapyTechnique;
  detected_emotion: string;
  key_insights: string[];
  next_recommendation: string;
  interactive_component?: 'breathing' | 'drawing' | 'journaling' | 'emotion_tracker' | null;
  language?: string;
  crisis_level?: string | null;
  emergency_info?: any;
  motivational_message?: {
    short_quote: string;
    tone: 'gentle' | 'uplifting' | 'empowering' | 'grounding';
    psychological_basis: string;
    ui_component: string;
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  aiResponse?: AIResponse;
  imageUri?: string;
  completed?: boolean;
  emergency_info?: any;
}

export interface SessionData {
  id: string;
  messages: ChatMessage[];
  startTime: Date;
  endTime?: Date;
  insights: string[];
  emotions: { emotion: string; intensity: number; timestamp: Date }[];
  // Id of the most recent OpenAI response in this session's chain, so the next turn can
  // continue via `previous_response_id` instead of resending the full conversation history.
  lastResponseId?: string;
}

const LANGUAGE_PATTERNS = {
  georgian: /[\u10A0-\u10FF]/,
  russian: /[\u0400-\u04FF]/,
  armenian: /[\u0530-\u058F]/,
  english: /^[a-zA-Z0-9\s.,!?'"()-]+$/,
};

const EMOTION_KEYWORDS = {
  anxious: ['worry', 'nervous', 'panic', 'fear', 'stress'],
  sad: ['sad', 'depressed', 'down', 'hopeless'],
  angry: ['angry', 'mad', 'furious', 'frustrated'],
  confused: ['confused', 'lost', 'uncertain'],
  positive: ['happy', 'good', 'great', 'excited'],
};

// The model's `clinical_assessment.emotional_state` field is meant to be a short mood tag
// (e.g. "anxious"), but on hard sessions it can come back as a full clinical phrase
// (e.g. "Heavy, Despairing State, Possible Self-Harm Risk"). That text must never reach the
// client's session-history UI verbatim, so anything that isn't a single short word is
// collapsed to a safe generic tag here, at the one place this field enters the app.
export function normalizeEmotionTag(raw?: string | null): string {
  if (!raw) return 'neutral';
  const trimmed = raw.trim();
  if (!trimmed) return 'neutral';
  const isSimpleTag = !/[,;:.]/.test(trimmed) && trimmed.split(/\s+/).length === 1 && trimmed.length <= 20;
  return isSimpleTag ? trimmed.toLowerCase() : 'neutral';
}

class AITherapyService {
  // API key is now sourced from .env (EXPO_PUBLIC_API_KEY); no AsyncStorage usage.
  private sessionHistory: ChatMessage[] = [];
  private currentSession: SessionData | null = null;
  private hasImageInSession: boolean = false; // Track if session contains images
  // Id of the last Responses API call in this session, used to continue the conversation
  // via previous_response_id (cheap, server-side context) instead of resending full history.
  // Only used on the pure-text path — the image path uses Chat Completions, which has no
  // equivalent chaining mechanism.
  private lastResponseId?: string;
  // Cached prompt/instructions
  private promptInitialized: boolean = false;
  private promptInstructions: string | null = null;
  private readonly PROMPT_ID = "pmpt_6902692e3d8081959fff3a192b21482902ebe8295781d9fb";
  private readonly PROMPT_VERSION = "11";
  // Derived from PROMPT_VERSION so bumping the hosted prompt version automatically
  // invalidates any stale cached instructions text instead of silently reusing it.
  private readonly PROMPT_STORAGE_KEY = `cached_prompt_instructions_v${this.PROMPT_VERSION}`;

  constructor() {}

  // Get API key from environment (Expo public env or extra)
  private getEnvApiKey(): string | null {
    try {
      const fromProcess = (process as any)?.env?.EXPO_PUBLIC_API_KEY;
      if (fromProcess && typeof fromProcess === 'string') return fromProcess;
    } catch {}
    try {
      // Fallback to expo-constants extra
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default;
      const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra;
      const fromExtra = extra?.EXPO_PUBLIC_API_KEY;
      if (fromExtra && typeof fromExtra === 'string') return fromExtra;
    } catch {}
    return null;
  }

  // Backward-compatible API for components: now reads from env, setters are no-ops
  async getApiKeyPublic(): Promise<string | null> {
    return this.getEnvApiKey();
  }

  async setApiKey(_apiKey: string): Promise<void> {
    // No-op: API key is managed via .env (EXPO_PUBLIC_API_KEY)
    return;
  }

  async removeApiKey(): Promise<void> {
    // No-op: API key is managed via .env (EXPO_PUBLIC_API_KEY)
    return;
  }

  async testApiConnection(): Promise<boolean> {
    try {
      const apiKey = this.getEnvApiKey();
      if (!apiKey) {
        return false;
      }
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  async processMessage(userMessage: string, imageUri?: string): Promise<AIResponse> {
    try {
      const apiKey = this.getEnvApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Track if this message has an image
      if (imageUri && imageUri.startsWith('data:image/')) {
        this.hasImageInSession = true;
      }
      
      // Add user message to session history
      this.sessionHistory.push({
        id: `msg_${Date.now()}_user`,
        type: 'user',
        content: userMessage,
        timestamp: new Date(),
        imageUri
      });
      
      // Ensure prompt is initialized/cached once before continuing chat
      await this.initPromptIfNeeded();
      
      const aiResponse = await this.callOpenAIPromptAPI(userMessage, imageUri);
      
      // Add AI response to session history
      this.sessionHistory.push({
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: aiResponse.response_text,
        timestamp: new Date(),
        aiResponse
      });
      
      return aiResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(userMessage, errorMessage);
    }
  }

  /**
   * Initialize and cache the Prompt instructions once.
   * Calls the Responses API with only the Prompt id/version as requested,
   * extracts the instructions text, and stores it for later reference.
   */
  private async initPromptIfNeeded(): Promise<void> {
    if (this.promptInitialized) return;
    try {
      // Try loading from storage first
      const stored = await AsyncStorage.getItem(this.PROMPT_STORAGE_KEY);
      if (stored) {
        this.promptInstructions = stored;
        this.promptInitialized = true;
        return;
      }
      const apiKey = this.getEnvApiKey();
      if (!apiKey) throw new Error('No OpenAI API key available');
      const resp = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-chat-latest',
          prompt: {
            id: this.PROMPT_ID,
            version: this.PROMPT_VERSION,
          }
        })
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Prompt init error:', resp.status, errText);
        // Don't block chat if prompt-only call fails; continue without cached instructions
        this.promptInitialized = true;
        return;
      }
      const data = await resp.json();
      const instructionsText = this.extractInstructionsText(data);
      if (instructionsText) {
        this.promptInstructions = instructionsText;
        await AsyncStorage.setItem(this.PROMPT_STORAGE_KEY, instructionsText);
      }
      this.promptInitialized = true;
    } catch (e) {
      console.error('Failed to initialize prompt:', e);
      this.promptInitialized = true; // fail-open
    }
  }

  /**
   * Public method to fetch and return the cached prompt instructions (initializing if needed).
   */
  async fetchPromptOnce(): Promise<string | null> {
    await this.initPromptIfNeeded();
    return this.promptInstructions;
  }

  private async callOpenAIPromptAPI(userMessage: string, imageUri?: string): Promise<AIResponse> {
    try {
      const apiKey = this.getEnvApiKey();
      if (!apiKey) throw new Error('No OpenAI API key available');
      
      // Check if current message has image OR if session previously had images
      const isBase64Image = imageUri && imageUri.startsWith('data:image/');
      const shouldUseChatAPI = isBase64Image || this.hasImageInSession;
      
      // If session has images, use Chat Completions API for context continuity
      if (shouldUseChatAPI) {
        return await this.callOpenAIChatAPI(userMessage, imageUri);
      }
      
      // For pure text sessions, use Responses API with Prompt
      const profileBlock = buildProfileContextBlock(await getUserProfile());
      const profilePrefix = profileBlock ? `${profileBlock}\n\n` : '';

      const buildFullContext = () => {
        const recentHistory = this.sessionHistory.slice(-20).map(msg =>
          `${msg.type === 'user' ? 'Client' : 'Therapist'}: ${msg.content}`
        ).join('\n');
        return recentHistory
          ? `${profilePrefix}Session context:\n${recentHistory}\n\nCurrent message: ${userMessage}\n\n[Respond with valid JSON matching the clinical schema.]`
          : `${profilePrefix}${userMessage}\n\n[Respond with valid JSON matching the clinical schema.]`;
      };
      // When continuing via previous_response_id, OpenAI already has every earlier turn —
      // only the newest message needs to be sent.
      const buildIncrementalContext = () =>
        `${profilePrefix}${userMessage}\n\n[Respond with valid JSON matching the clinical schema.]`;

      const doRequest = async (inputText: string, chainId?: string): Promise<any> => {
        const resp = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-chat-latest',
            prompt: {
              id: this.PROMPT_ID,
              version: this.PROMPT_VERSION
            },
            input: inputText,
            store: true,
            ...(chainId ? { previous_response_id: chainId } : {}),
            // Encourage JSON output using new Responses API field location
            text: { format: { type: 'json_object' } }
          })
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`OpenAI API error: ${resp.status} ${errorText}`);
        }
        return resp.json();
      };

      let data: any;
      if (this.lastResponseId) {
        try {
          data = await doRequest(buildIncrementalContext(), this.lastResponseId);
        } catch (e: any) {
          const msg = String(e?.message || '').toLowerCase();
          // Only fall back for chain-specific failures (expired/unknown previous_response_id) —
          // anything else should surface normally.
          const looksLikeStaleChain = msg.includes('previous_response') || (msg.includes('response') && msg.includes('not found'));
          if (!looksLikeStaleChain) throw e;
          console.warn('⚠️ previous_response_id stale/invalid — resending full session context once:', e.message);
          data = await doRequest(buildFullContext(), undefined);
        }
      } else {
        data = await doRequest(buildFullContext(), undefined);
      }
      if (data?.id) this.lastResponseId = data.id;

      console.log('OpenAI Response:', data);
      return this.parseOpenAIResponse(data, userMessage);
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Handle messages using Chat Completions API
   * Used when session contains images or for image analysis
   */
  private async callOpenAIChatAPI(userMessage: string, imageUri?: string): Promise<AIResponse> {
    try {
      const apiKey = this.getEnvApiKey();
      if (!apiKey) throw new Error('No OpenAI API key available');

      // Get system prompt instructions
      await this.initPromptIfNeeded();
      const basePrompt = this.promptInstructions || "You are Dr. Pijilo, a warm, curious AI therapy companion grounded in Cognitive Behavioral Therapy (cognitive restructuring, Socratic questioning, behavioral activation) with DBT and mindfulness skills as secondary tools. You are an AI, not a licensed clinician. Ask one focused question at a time; never lecture. Respond with valid JSON matching the clinical schema.";
      const profileBlock = buildProfileContextBlock(await getUserProfile());
      const systemPrompt = profileBlock ? `${basePrompt}\n\n${profileBlock}` : basePrompt;

      // Build conversation history for Chat Completions API
      const messages: any[] = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add recent conversation history (last 10 exchanges = 20 messages)
      const recentHistory = this.sessionHistory.slice(-20);
      for (const msg of recentHistory) {
        if (msg.type === 'user') {
          // User message
          if (msg.imageUri && msg.imageUri.startsWith('data:image/')) {
            // Message with image
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: msg.content },
                { type: 'image_url', image_url: { url: msg.imageUri, detail: 'high' } }
              ]
            });
          } else {
            // Text-only message
            messages.push({
              role: 'user',
              content: msg.content
            });
          }
        } else if (msg.type === 'ai') {
          // AI response
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        }
      }

      // Add current message if not already in history
      const isBase64Image = imageUri && imageUri.startsWith('data:image/');
      if (isBase64Image) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            { type: 'image_url', image_url: { url: imageUri, detail: 'high' } }
          ]
        });
      } else if (recentHistory.length === 0 || recentHistory[recentHistory.length - 1]?.content !== userMessage) {
        messages.push({
          role: 'user',
          content: userMessage
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Vision-capable model
          messages: messages,
          max_tokens: 2000,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Chat API error:', response.status, errorText);
        throw new Error(`OpenAI Chat API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('OpenAI Chat Response:', data);

      // Parse Chat Completions response
      const aiText = data.choices?.[0]?.message?.content || 'Unable to process message.';
      
      // Try to parse as JSON if it looks like our clinical schema
      let parsedResponse: any = null;
      try {
        const jsonMatch = aiText.match(/```json\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*\})/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[2];
          parsedResponse = JSON.parse(jsonStr);
        }
      } catch (parseError) {
        console.log('Response is plain text, not JSON');
      }

      // Build AIResponse from either parsed JSON or plain text
      if (parsedResponse && parsedResponse.response_text) {
        return this.parseOpenAIResponse({ output: [{ content: [{ text: JSON.stringify(parsedResponse) }] }] }, userMessage);
      } else {
        // Fallback to plain text response
        return {
          response_text: aiText,
          technique: {
            method: isBase64Image ? 'Art Therapy' : 'Support',
            name: isBase64Image ? 'visual_analysis' : 'active_listening',
            description: isBase64Image ? 'Analysis of visual art for emotional expression' : 'Therapeutic support'
          },
          detected_emotion: this.detectEmotion(userMessage),
          key_insights: [isBase64Image ? 'Art therapy image analysis' : 'Therapeutic conversation'],
          next_recommendation: isBase64Image ? 'Discuss the emotions and meanings in the artwork' : 'Continue exploring feelings',
          language: this.detectLanguage(userMessage)
        };
      }
    } catch (error) {
      console.error('OpenAI Chat API failed:', error);
      throw error;
    }
  }

  private parseOpenAIResponse(data: any, originalMessage: string): AIResponse {
    try {
      // Try to extract a structured JSON payload from Responses API
      const structured = this.extractStructuredJsonFromResponse(data);
      if (structured && typeof structured === 'object') {
        const responseData = structured;
        const aiResponse: AIResponse = {
          response_text: responseData.response_text || responseData.message || responseData.content || this.extractPlainTextFromResponse(data) || 'I’m here with you. Please continue in your own words.',
          technique: responseData.therapeutic_intervention ? {
            method: responseData.therapeutic_intervention.primary_modality || 'Support',
            name: responseData.therapeutic_intervention.specific_technique || 'active_listening',
            description: responseData.therapeutic_intervention.clinical_rationale || 'Therapeutic support'
          } : {
            method: 'Support',
            name: 'active_listening',
            description: 'Therapeutic support'
          },
          detected_emotion: responseData.clinical_assessment?.emotional_state
            ? normalizeEmotionTag(responseData.clinical_assessment.emotional_state)
            : this.detectEmotion(originalMessage),
          key_insights: responseData.session_data ? [
            responseData.session_data.presenting_concern,
            responseData.session_data.treatment_target
          ].filter(Boolean) : [],
          next_recommendation: responseData.session_data?.homework_suggestion || '',
          interactive_component: this.mapUIComponent(responseData.therapeutic_intervention?.ui_component) || null,
          language: responseData.cultural_adaptation?.language_used || this.detectLanguage(originalMessage),
          crisis_level: responseData.crisis_response?.risk_level || null,
          emergency_info: responseData.crisis_response || null,
          motivational_message: responseData.motivational_message || null
        };
        this.storeEmotionData(aiResponse.detected_emotion);
        return aiResponse;
      }

      // Fallback: extract plain text from Responses API (no JSON schema present)
      const plainText = this.extractPlainTextFromResponse(data);
      if (plainText && typeof plainText === 'string') {
        return {
          response_text: plainText,
          technique: {
            method: 'Support',
            name: 'active_listening',
            description: 'Therapeutic support'
          },
          detected_emotion: this.detectEmotion(originalMessage),
          key_insights: [],
          next_recommendation: 'Continue sharing at your own pace.',
          interactive_component: null,
          language: this.detectLanguage(originalMessage),
          crisis_level: null,
          emergency_info: null,
          motivational_message: undefined
        };
      }

      // Last resort minimal response
      return {
        response_text: 'I’m here and listening. Please tell me more about what you’re experiencing.',
        technique: { method: 'Support', name: 'active_listening', description: 'Therapeutic support' },
        detected_emotion: this.detectEmotion(originalMessage),
        key_insights: [],
        next_recommendation: 'Share whatever feels most present right now.',
        interactive_component: null,
        language: this.detectLanguage(originalMessage),
        crisis_level: null,
        emergency_info: null,
        motivational_message: undefined
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('AI response processing failed');
    }
  }

  /**
   * Extract first output_text block from Responses API and parse JSON if present.
   */
  private extractStructuredJsonFromResponse(data: any): any | null {
    try {
      const outputs = data?.output;
      if (Array.isArray(outputs) && outputs.length > 0) {
        const firstMsg = outputs.find((o: any) => o?.type === 'message') || outputs[0];
        const contentArr = firstMsg?.content;
        if (Array.isArray(contentArr) && contentArr.length > 0) {
          const textItem = contentArr.find((c: any) => c?.type === 'output_text' || c?.type === 'text' || c?.type === 'input_text') || contentArr[0];
          const text: string | undefined = textItem?.text;
          if (typeof text === 'string' && text.trim().length > 0) {
            // Strip markdown fences if present
            const cleaned = text.replace(/^```json\n?|```$/g, '').replace(/```/g, '').trim();
            try {
              return JSON.parse(cleaned);
            } catch {
              // If not pure JSON, try to locate JSON substring
              const start = cleaned.indexOf('{');
              const end = cleaned.lastIndexOf('}');
              if (start !== -1 && end !== -1 && end > start) {
                const slice = cleaned.slice(start, end + 1);
                return JSON.parse(slice);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract structured JSON from response:', e);
    }
    return null;
  }

  /**
   * Extract plain text from Responses API payloads or chat-like payloads.
   */
  private extractPlainTextFromResponse(data: any): string | null {
    try {
      // Responses API shape
      const outputs = data?.output;
      if (Array.isArray(outputs)) {
        const texts: string[] = [];
        for (const msg of outputs) {
          const contentArr = msg?.content;
          if (Array.isArray(contentArr)) {
            for (const c of contentArr) {
              if (typeof c?.text === 'string') texts.push(c.text);
            }
          }
        }
        if (texts.length) return texts.join('\n').trim();
      }

      // Chat completions fallback (if accidentally passed here)
      const choices = data?.choices;
      const t = choices?.[0]?.message?.content;
      if (typeof t === 'string' && t.trim().length) return t.trim();

      // Common alternative fields
      if (typeof data?.content === 'string') return data.content;
      if (typeof data?.message === 'string') return data.message;
    } catch (e) {
      console.warn('Plain text extraction failed:', e);
    }
    return null;
  }

  /**
   * Extract instructions text (system prompt) from the prompt-only call result.
   */
  private extractInstructionsText(data: any): string | null {
    try {
      const instructions = data?.instructions;
      if (Array.isArray(instructions)) {
        const msgItem = instructions.find((i: any) => i?.type === 'message');
        const contentArr = msgItem?.content;
        if (Array.isArray(contentArr)) {
          const texts = contentArr
            .filter((c: any) => c?.type === 'input_text' && typeof c?.text === 'string')
            .map((c: any) => c.text);
          if (texts.length) return texts.join('\n');
        }
      }
    } catch (e) {
      console.warn('Could not extract instructions text:', e);
    }
    return null;
  }

  /** Map UI component names from prompt schema to app-supported components */
  private mapUIComponent(name?: string | null): 'breathing' | 'drawing' | 'journaling' | 'emotion_tracker' | null {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes('breath') || n.includes('breathing')) return 'breathing';
    if (n.includes('journal')) return 'journaling';
    if (n.includes('draw') || n.includes('art')) return 'drawing';
    if (n.includes('emotion') || n.includes('mood')) return 'emotion_tracker';
    return null;
  }

  private createErrorResponse(userMessage: string, errorMessage: string): AIResponse {
    return {
      response_text: 'Technical error occurred. Please try again or contact support.',
      technique: {
        method: 'Support',
        name: 'technical_support',
        description: 'Technical support'
      },
      detected_emotion: 'neutral',
      key_insights: ['Technical error'],
      next_recommendation: 'Try again',
      interactive_component: null,
      language: this.detectLanguage(userMessage),
      crisis_level: null,
      emergency_info: null
    };
  }

  private detectLanguage(text: string): string {
    if (LANGUAGE_PATTERNS.georgian.test(text)) return 'georgian';
    if (LANGUAGE_PATTERNS.russian.test(text)) return 'russian';
    if (LANGUAGE_PATTERNS.armenian.test(text)) return 'armenian';
    return 'english';
  }

  private detectEmotion(text: string): string {
    const lowerText = text.toLowerCase();
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }
    return 'neutral';
  }

  private async storeEmotionData(emotion: string): Promise<void> {
    try {
      const emotionData = {
        emotion,
        intensity: 5,
        timestamp: new Date(),
      };
      const existingData = await AsyncStorage.getItem('emotion_history');
      const emotionHistory = existingData ? JSON.parse(existingData) : [];
      emotionHistory.push(emotionData);
      if (emotionHistory.length > 100) {
        emotionHistory.splice(0, emotionHistory.length - 100);
      }
      await AsyncStorage.setItem('emotion_history', JSON.stringify(emotionHistory));
    } catch (error) {
      console.error('Failed to store emotion data:', error);
    }
  }

  async getEmotionHistory(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('emotion_history');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get emotion history:', error);
      return [];
    }
  }

  async startSession(): Promise<SessionData> {
    const session: SessionData = {
      id: Date.now().toString(),
      messages: [],
      startTime: new Date(),
      insights: [],
      emotions: [],
    };
    this.currentSession = session;
    this.sessionHistory = [];
    this.lastResponseId = undefined;
    try {
      await AsyncStorage.setItem('current_session', JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
    return session;
  }

  async addMessage(message: ChatMessage): Promise<void> {
    if (this.currentSession) {
      this.currentSession.messages.push(message);
      this.sessionHistory.push(message);
      if (this.sessionHistory.length > 20) {
        this.sessionHistory.splice(0, this.sessionHistory.length - 20);
      }
      try {
        await AsyncStorage.setItem('current_session', JSON.stringify(this.currentSession));
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }
  }

  async saveSession(session: SessionData): Promise<void> {
    try {
      const sessions = await AsyncStorage.getItem('therapy_sessions');
      let sessionHistory: SessionData[] = [];
      
      // Safely parse the session history
      if (sessions) {
        try {
          const parsed = JSON.parse(sessions);
          // Ensure it's an array
          sessionHistory = Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.error('Failed to parse session history:', parseError);
          sessionHistory = [];
        }
      }
      
      // Find and update or add session
      const existingIndex = sessionHistory.findIndex((s: SessionData) => s.id === session.id);
      if (existingIndex >= 0) {
        sessionHistory[existingIndex] = session;
      } else {
        sessionHistory.push(session);
      }
      
      await AsyncStorage.setItem('therapy_sessions', JSON.stringify(sessionHistory));
      this.currentSession = session;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Load a specific past (or in-progress) session by id, rehydrating Date fields
   * that come back as strings after AsyncStorage's JSON round-trip.
   */
  async getSessionById(id: string): Promise<SessionData | null> {
    try {
      const raw = await AsyncStorage.getItem('therapy_sessions');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      const found = parsed.find((s: SessionData) => s.id === id);
      if (!found) return null;
      return {
        ...found,
        startTime: new Date(found.startTime),
        endTime: found.endTime ? new Date(found.endTime) : undefined,
        messages: (found.messages || []).map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) })),
        emotions: (found.emotions || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) })),
      };
    } catch (error) {
      console.error('Failed to load session by id:', error);
      return null;
    }
  }

  /**
   * Most recently started session (in-progress or completed), for resuming the
   * conversation the user last had instead of always starting blank.
   */
  async getMostRecentSession(): Promise<SessionData | null> {
    try {
      const raw = await AsyncStorage.getItem('therapy_sessions');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const sorted = [...parsed].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return this.getSessionById(sorted[0].id);
    } catch (error) {
      console.error('Failed to load most recent session:', error);
      return null;
    }
  }

  async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      try {
        const sessions = await AsyncStorage.getItem('therapy_sessions');
        let sessionHistory: SessionData[] = [];
        
        // Safely parse the session history
        if (sessions) {
          try {
            const parsed = JSON.parse(sessions);
            // Ensure it's an array
            sessionHistory = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('Failed to parse session history:', parseError);
            sessionHistory = [];
          }
        }
        
        sessionHistory.push(this.currentSession);
        await AsyncStorage.setItem('therapy_sessions', JSON.stringify(sessionHistory));
        await AsyncStorage.removeItem('current_session');
        this.currentSession = null;
        this.sessionHistory = [];
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
  }

  startNewSession(): void {
    // Clear previous session history to start fresh
    this.sessionHistory = [];
    this.currentSession = null;
    this.hasImageInSession = false; // Reset image flag
    this.lastResponseId = undefined;
    console.log('New session started - history cleared');
  }

  /** Current chain id for the live session, so the caller can persist it alongside SessionData. */
  getLastResponseId(): string | undefined {
    return this.lastResponseId;
  }

  /**
   * Restore in-memory conversation state for a session loaded from storage (resuming
   * an old or in-progress session), so subsequent processMessage() calls have correct
   * context instead of behaving like a brand-new session.
   */
  resumeSession(session: SessionData): void {
    this.currentSession = session;
    this.sessionHistory = (session.messages || []).slice(-20);
    this.hasImageInSession = (session.messages || []).some(m => !!m.imageUri);
    this.lastResponseId = session.lastResponseId;
  }

  async generateSessionSummary(messages: ChatMessage[], language: string = 'en'): Promise<any> {
    try {
      const apiKey = this.getEnvApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Prepare session transcript
      const transcript = messages.map(m => 
        `${m.type === 'user' ? 'Client' : 'Therapist'}: ${m.content}`
      ).join('\n\n');

      // Get all emotions and techniques from messages
      const allEmotions: { [key: string]: number } = {};
      const allTechniques: { [key: string]: number } = {};
      const allInsights: string[] = [];

      messages.forEach(msg => {
        if (msg.aiResponse) {
          // Count emotions
          const emotion = msg.aiResponse.detected_emotion;
          allEmotions[emotion] = (allEmotions[emotion] || 0) + 1;

          // Count techniques
          const method = msg.aiResponse.technique?.method || 'Support';
          allTechniques[method] = (allTechniques[method] || 0) + 1;

          // Collect insights
          if (msg.aiResponse.key_insights) {
            allInsights.push(...msg.aiResponse.key_insights);
          }
        }
      });

      // Use AI to generate comprehensive summary
      const summaryPrompt = `Based on this therapy session transcript, generate a professional clinical summary:

${transcript}

Provide a JSON response with:
{
  "themes": ["main_theme_1", "main_theme_2", "main_theme_3"],
  "keyInsights": ["insight_1", "insight_2", "insight_3"],
  "homework": ["homework_task_1", "homework_task_2"],
  "progressScore": 75,
  "nextSteps": "Detailed next steps and recommendations for continued therapy"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a clinical psychotherapist creating session summaries. Be concise, professional, and therapeutic. IMPORTANT: Respond entirely in the language with code "${language}". All text values in the JSON (themes, keyInsights, homework, nextSteps) must be written in that language.`
            },
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '{}';

      // Parse AI response
      let summaryData: any = {};
      try {
        const jsonMatch = aiText.match(/```json\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*\})/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[2];
          summaryData = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error('Failed to parse summary JSON:', e);
      }

      // Build emotional patterns
      const emotionalPatterns = Object.entries(allEmotions).map(([emotion, frequency]) => ({
        emotion,
        frequency,
        trend: 'stable' as 'improving' | 'stable' | 'declining' // TODO: calculate actual trend
      }));

      // Build techniques list
      const techniques = Object.entries(allTechniques).map(([method, count]) => ({
        method,
        count
      }));

      return {
        themes: summaryData.themes || [],
        emotionalPatterns,
        techniques,
        keyInsights: summaryData.keyInsights || allInsights.slice(0, 5),
        homework: summaryData.homework || [],
        progressScore: summaryData.progressScore || 70,
        nextSteps: summaryData.nextSteps || 'Continue with weekly sessions and practice recommended techniques.'
      };
    } catch (error) {
      console.error('Failed to generate session summary:', error);
      throw error;
    }
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  getSessionHistory(): ChatMessage[] {
    return this.sessionHistory;
  }
}

const aiTherapyService = new AITherapyService();
export default aiTherapyService;
