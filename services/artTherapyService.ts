import axios from 'axios';
// Note: We'll use fetch for streaming SSE with the Responses API
// and keep axios for non-stream JSON posts.
import type { AppLanguage } from '@/contexts/LanguageContext';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
// Use standard expo-file-system (legacy path breaks web export and Metro resolution)
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Advanced AI Art Therapy Response Interface
export interface ArtTherapyResponse {
  response_text: string;
  session_phase: 0 | 1 | 2;
  // Flow control and completion flags
  phase_complete?: boolean; // true when current phase is fully complete
  session_complete?: boolean; // true when entire session is complete and closed
  required_input?: 'none' | 'text' | 'image_v1' | 'image_v2'; // what is required next from user
  action?: 'none' | 'continue_exploration' | 'request_modified_drawing' | 'analyze_second_drawing' | 'compare_drawings' | 'close_session';
  phase_summary?: string; // short summary of the just-completed phase (2-4 lines)
  session_summary?: string; // final summary to show the user at the end of session
  clinical_insights: {
    visual_analysis: {
      colors: string[];
      shapes: string[];
      symbols: string[];
      composition: string;
      line_quality: string;
      spatial_use: string;
    };
    emotional_indicators: {
      detected_emotions: string[];
      intensity: 'low' | 'moderate' | 'high';
      conflicting_emotions: boolean;
    };
    psychological_themes: string[];
    cultural_elements: string[];
    trauma_indicators: string[];
  };
  therapeutic_techniques: {
    suggested_technique: string;
    rationale: string;
    instructions: string;
  };
  safety_assessment: {
    risk_level: 'none' | 'low' | 'moderate' | 'high' | 'imminent';
    concerning_imagery: string[];
    immediate_action_needed: boolean;
    safety_recommendations: string[];
  };
  somatic_guidance: {
    body_awareness_prompt: string;
    grounding_technique: string;
  };
  progress_tracking: {
    emotional_shift: string;
    insight_gained: string;
    therapeutic_alliance: string;
  };
  next_steps: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  apiOnlyContent?: string;
  timestamp: Date;
  imageUri?: string;
  imageBase64?: string;
  clinicalData?: ArtTherapyResponse;
}

class ArtTherapyService {
  private apiKey: string;
  private promptId: string = 'pmpt_690baa7920308196a2d94f41d4be76be0bd44ed1840b1049';
  private promptVersion: string = '17';
  private baseURL: string = 'https://api.openai.com/v1';

  constructor() {
    // Get API key from environment variables
    this.apiKey =
      Constants.expoConfig?.extra?.OPENAI_API_KEY ||
      (process as any).env?.EXPO_PUBLIC_OPENAI_API_KEY ||
      (process as any).env?.OPENAI_API_KEY ||
      '';
    
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API Key not found. Please set OPENAI_API_KEY in .env file');
    }
  }

  /**
   * Convert language code to full language name for better AI understanding
   */
  private getLanguageName(langCode: string): string {
    const languageMap: Record<string, string> = {
      en: 'English',
      ka: 'Georgian (ქართული)',
      ru: 'Russian (Русский)',
      hy: 'Armenian (Հայերեն)',
      tr: 'Turkish (Türkçe)',
      az: 'Azerbaijani (Azərbaycan)',
      es: 'Spanish (Español)',
      de: 'German (Deutsch)',
      fr: 'French (Français)',
      pt: 'Portuguese (Português)',
      id: 'Indonesian (Bahasa Indonesia)',
      it: 'Italian (Italiano)',
      ar: 'Arabic (العربية)',
      hi: 'Hindi (हिन्दी)',
      zh: 'Chinese Simplified (简体中文)',
      ja: 'Japanese (日本語)',
      ko: 'Korean (한국어)',
      uk: 'Ukrainian (Українська)',
      pl: 'Polish (Polski)'
    };
    return languageMap[langCode] || langCode;
  }

  private buildSessionContext(
    sessionTheme: string,
    languageName: string,
    currentPhase: 0 | 1 | 2,
    hasImageOnlyMessage: boolean,
    extraContext?: string
  ): string {
    const imageOnlyInstruction = hasImageOnlyMessage
      ? '\nThe latest user message contains only an image. Treat it as the client\'s art therapy artwork. Do not ask them to upload or describe the image again.'
      : '';

    return `\n\n[Session Context: Theme: ${sessionTheme}, Language: ${languageName}, Phase: ${currentPhase}. CRITICAL: You MUST respond in ${languageName} language for ALL text, including response_text, phase_summary, session_summary, next_steps, and any question. Do NOT respond in English unless Language is English.${imageOnlyInstruction} Respond with valid JSON matching the ArtTherapyResponse schema.]` + (extraContext ? `\n[Prior Sessions]\n${extraContext}` : '');
  }

  /**
   * Compress and convert image to base64, save persistently for display
   * Returns both display URI and base64 for API
   */
  async prepareImageForAPI(asset: ImagePicker.ImagePickerAsset): Promise<{ displayUri: string; base64: string }> {
    try {
      console.log('🔧 prepareImageForAPI: Starting image preparation');
      console.log('  - Asset URI:', asset.uri?.substring(0, 100));
      console.log('  - Asset type:', asset.type);
      console.log('  - Has base64:', !!asset.base64);
      console.log('  - Base64 length:', asset.base64?.length || 0);
      
      // Helper: get base64 from a URI when ImagePicker doesn't provide it (notably on Web)
      const getBase64FromUri = async (uri: string): Promise<string> => {
        if (Platform.OS === 'web') {
          // Fetch the blob and convert to base64 via ArrayBuffer -> btoa
          const res = await fetch(uri);
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000; // 32KB chunks to avoid call stack issues
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null as any, bytes.subarray(i, i + chunkSize) as any);
          }
          const base64 = (globalThis as any).btoa ? (globalThis as any).btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
          return base64;
        }

        // Native: use FileSystem to read the file as base64
        try {
          const fileBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return fileBase64;
        } catch (e) {
          console.warn('⚠️ Could not read file as base64, uri:', uri, e);
          throw e;
        }
      };

      // Always produce a safe JPEG for API using expo-image-manipulator (avoids HEIC issues),
      // then progressively reduce size if needed.
      const ensureCompressedJPEG = async (targetWidth?: number, compress?: number) => {
        // Dynamic namespace import to be compatible across platforms
        const ImageManipulator = await import('expo-image-manipulator');
        const actions: any[] = [];
        if (targetWidth && targetWidth > 0) actions.push({ resize: { width: targetWidth } });
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri!,
          actions,
          {
            compress: compress ?? 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        if (!manipulated.base64) throw new Error('Failed to generate base64');
        return manipulated.base64 as string;
      };

      // First attempt: re-encode to JPEG without resizing
      let finalBase64 = '';
      try {
        finalBase64 = await ensureCompressedJPEG(undefined, 0.8);
      } catch (e) {
        console.warn('⚠️ Manipulator encode failed. Falling back to raw uri->base64:', e);
        finalBase64 = asset.base64 || (asset.uri ? await getBase64FromUri(asset.uri) : '');
        if (!finalBase64) throw new Error('No base64 data available from image');
      }

      // Progressive size control for API payload (~<= 800KB target, 1024KB hard cap)
      let estKB = Math.round((finalBase64.length * 1.33) / 1024);
      const maxKB = 800;
      const hardMaxKB = 1024;
      console.log('📏 Initial data URI est size:', estKB, 'KB');
      if (estKB > maxKB) {
        const widths = [1600, 1280, 1024, 900, 800, 700, 600, 512, 480];
        const qualities = [0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35];
        let improved = false;
        for (const w of widths) {
          for (const q of qualities) {
            try {
              const b64 = await ensureCompressedJPEG(w, q);
              const kb = Math.round((b64.length * 1.33) / 1024);
              console.log(`🔧 Recompress try width=${w} q=${q} -> ${kb}KB`);
              if (kb <= maxKB) {
                finalBase64 = b64;
                estKB = kb;
                improved = true;
                break;
              } else if (kb < estKB) {
                finalBase64 = b64;
                estKB = kb;
              }
            } catch (e) {
              console.warn('⚠️ Recompression failed:', e);
            }
          }
          if (improved) break;
        }
        if (estKB > maxKB) {
          console.warn(`⚠️ Using best effort size ${estKB}KB (> ${maxKB}KB)`);
        }
      }

      // Final hard cap guard
      if (estKB > hardMaxKB) {
        try {
          const b64 = await ensureCompressedJPEG(480, 0.3);
          const kb = Math.round((b64.length * 1.33) / 1024);
          if (kb < estKB) {
            finalBase64 = b64;
            estKB = kb;
          }
        } catch {}
      }
      
      // Display: show original image as-is (no forced crop). Use chosen URI directly.
      const displayUri = asset.uri || '';

      // Create data URI for API - we send JPEG
      const mimeType = 'image/jpeg';

      const dataUri = `data:${mimeType};base64,${finalBase64}`;
      console.log('✅ Data URI created for API, final size:', Math.round(dataUri.length / 1024), 'KB');
      console.log('✅ MIME type:', mimeType);

      return {
        displayUri, // Persistent file (native) or data URI (web) for display
        base64: dataUri // Compressed data URI for API
      };

    } catch (error) {
      console.error('❌ Image preparation failed:', error);
      throw new Error(`Failed to prepare image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe recorded audio into text using OpenAI Transcriptions API.
   */
  async transcribeAudio(audioFileUri: string): Promise<string> {
    if (!this.apiKey) throw new Error('OpenAI API key is not configured');
    try {
      // Build multipart body. In browsers we must provide a File/Blob; in RN native we can provide { uri, name, type }.
      const fd = new FormData();
      let name = audioFileUri.split('/').pop() || 'audio.m4a';
      const ext = (name.split('.').pop() || 'm4a').toLowerCase();
  let mime = 'audio/m4a';
  if (ext === 'wav') mime = 'audio/wav';
  else if (ext === 'mp3') mime = 'audio/mpeg';
  else if (ext === 'm4a' || ext === 'mp4') mime = 'audio/mp4';
  else if (ext === 'webm') mime = 'audio/webm';
  else if (ext === 'ogg' || ext === 'oga') mime = 'audio/ogg';

      const uriLower = (audioFileUri || '').toLowerCase();
      const looksLikeWeb = Platform.OS === 'web' || uriLower.startsWith('blob:') || uriLower.startsWith('data:') || uriLower.startsWith('http');

      console.log('🎤 transcribeAudio - audioFileUri:', audioFileUri);
      console.log('🎤 transcribeAudio - looksLikeWeb:', looksLikeWeb, 'Platform:', Platform.OS);

      if (looksLikeWeb && typeof window !== 'undefined') {
        // Web: convert the URI to a Blob and append as a File
        let blob: Blob;
        try {
          console.log('🎤 Fetching blob from URI...');
          const resp = await fetch(audioFileUri);
          blob = await resp.blob();
          console.log('🎤 Blob fetched, type:', blob.type, 'size:', blob.size);
          // Prefer blob's type if available
          if (blob.type) {
            // Normalize codec-suffixed types like 'audio/webm;codecs=opus'
            const t = blob.type.split(';')[0].trim();
            mime = t || mime;
          }
        } catch (e) {
          console.warn('⚠️ Failed to fetch audio URI as blob on web. Falling back to empty blob.', e);
          blob = new Blob([], { type: mime });
        }
        // Ensure filename has proper extension to help server-side parsers
        const hasDot = name.includes('.');
        const extFromMime = mime.endsWith('webm') ? 'webm'
          : mime.endsWith('wav') ? 'wav'
          : mime.endsWith('mpeg') ? 'mp3'
          : mime.endsWith('mp4') ? 'm4a'
          : mime.endsWith('ogg') ? 'ogg'
          : 'm4a';
        if (!hasDot) name = `audio.${extFromMime}`;
        else if (!name.toLowerCase().endsWith(`.${extFromMime}`)) name = `${name}.${extFromMime}`;
        
        console.log('🎤 Filename:', name, 'MIME:', mime);
        
        // Create File object for web
        let file: File | Blob;
        if (typeof File !== 'undefined') {
          try {
            file = new File([blob], name, { type: mime });
            console.log('🎤 File created successfully');
          } catch (e) {
            console.warn('🎤 Failed to create File, using Blob:', e);
            file = blob;
          }
        } else {
          console.log('🎤 File constructor not available, using Blob');
          file = blob;
        }
        
        console.log('🎤 Appending to FormData...');
        // @ts-ignore - RN web FormData supports (file, filename)
        fd.append('file', file as any, name);
      } else {
        // React Native (iOS/Android): use URI-based file descriptor
        // @ts-ignore React Native FormData supports { uri, name, type }
        fd.append('file', { uri: audioFileUri, name, type: mime });
      }

      fd.append('model', 'gpt-4o-mini-transcribe'); // stable speech-to-text model
      fd.append('response_format', 'text');

      console.log('🎤 Sending transcription request...');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: fd as any,
      });
      console.log('🎤 Transcription response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('🎤 Transcription error:', res.status, errText);
        throw new Error(`Transcription failed: ${res.status} ${errText}`);
      }
      const text = await res.text();
      console.log('🎤 Transcription successful, text length:', text?.length || 0);
      return text?.trim?.() || '';
    } catch (e) {
      console.error('Transcription error:', e);
      throw e;
    }
  }

  /**
   * Text-to-Speech using OpenAI TTS. Plays audio and resolves when finished.
   * Uses expo-av for playback on native and web.
   */
  async speakTextTTS(text: string, userLanguage: AppLanguage = 'ru'): Promise<void> {
    if (!text?.trim()) return;
    if (!this.apiKey) throw new Error('OpenAI API key is not configured');

    // Choose a stable multilingual voice
  const voice = userLanguage === 'en' ? 'alloy' : 'marin';
    const format: 'mp3' | 'wav' = 'mp3';

    // Request speech audio from OpenAI
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        format,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TTS failed: ${res.status} ${errText}`);
    }

    // Convert to a playable source
    const arrayBuf = await res.arrayBuffer();

    if (Platform.OS === 'web') {
      const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const blob = new Blob([arrayBuf], { type: mime });
      const url = URL.createObjectURL(blob);
      try {
        const sound = new Audio.Sound();
        // On web, expo-av can play blob URLs
        await sound.loadAsync({ uri: url });
        await sound.playAsync();
        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status?.didJustFinish) resolve();
          });
        });
        await sound.unloadAsync();
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }

    // Native: write to cache and play
    const bytes = new Uint8Array(arrayBuf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = (globalThis as any).btoa ? (globalThis as any).btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    const filename = `${FileSystem.cacheDirectory}tts_${Date.now()}.${format}`;
    await FileSystem.writeAsStringAsync(filename, base64, { encoding: FileSystem.EncodingType.Base64 });

    const sound = new Audio.Sound();
    try {
      await sound.loadAsync({ uri: filename });
      await sound.playAsync();
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status?.didJustFinish) resolve();
        });
      });
    } finally {
      await sound.unloadAsync();
      try { await FileSystem.deleteAsync(filename, { idempotent: true }); } catch {}
    }
  }

  /**
   * Voice turn (push-to-talk): transcribe audio, then call the streaming text pipeline with optional image context.
   */
  async sendVoiceTurn(
    audioFileUri: string,
    options: {
      lastImageBase64?: string;
      sessionTheme: string;
      userLanguage: string;
      currentPhase?: 0 | 1 | 2;
      history?: ChatMessage[];
    }
  ): Promise<ArtTherapyResponse> {
    const { lastImageBase64, sessionTheme, userLanguage, currentPhase = 0, history = [] } = options;
    // 1) STT
    const transcribed = await this.transcribeAudio(audioFileUri);
    // 2) Append as user message (with optional image)
    const msgs: ChatMessage[] = [
      ...history,
      { id: `${Date.now()}`, role: 'user', content: transcribed, timestamp: new Date(), imageBase64: lastImageBase64 },
    ];
    // 3) Stream as usual
    const response = await this.sendMessage(
      msgs,
      sessionTheme,
      userLanguage,
      currentPhase
    );
    return response;
  }

  // Use a stored prompt and inject a lightweight, dynamic session context
  private buildSystemContext(sessionTheme: string, userLanguage: string, currentPhase: 0 | 1 | 2): string {
    return `Current Session\n- Theme: ${sessionTheme}\n- Language: ${userLanguage}\n- Phase: ${currentPhase}\n\nRespond strictly in ${userLanguage}. Return ONLY one valid JSON object following the agreed schema.`;
  }

  /**
   * Send message (non-streaming) using the OpenAI Responses API
   */
  async sendMessage(
    messages: ChatMessage[],
    sessionTheme: string,
    userLanguage: string = 'en',
    currentPhase: 0 | 1 | 2 = 0,
    extraContext?: string
  ): Promise<ArtTherapyResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      // Build Responses API input array
      const input: any[] = [];

      // Prepare copy of messages to append session context to the last user message
      const msgs = [...messages];
      const languageName = this.getLanguageName(userLanguage);
      console.log('🌐 AI Request Language:', languageName, `(${userLanguage})`);
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          const hasImageOnlyMessage = Boolean(msgs[i].imageBase64) && !msgs[i].content;
          const ctx = this.buildSessionContext(sessionTheme, languageName, currentPhase, hasImageOnlyMessage, extraContext);
          const apiText = msgs[i].apiOnlyContent || msgs[i].content || '';
          msgs[i] = { ...msgs[i], apiOnlyContent: apiText + ctx };
          break;
        }
      }

      for (const msg of msgs) {
        const content: any[] = [];
        if (msg.role === 'user') {
          const textContent = msg.apiOnlyContent || msg.content;
          if (textContent) content.push({ type: 'input_text', text: textContent });
          if (msg.imageBase64) content.push({ type: 'input_image', image_url: msg.imageBase64 });
          input.push({ role: 'user', content });
        } else if (msg.role === 'assistant') {
          if (msg.content) content.push({ type: 'output_text', text: msg.content });
          input.push({ role: 'assistant', content });
        } // ignore 'system' here; we rely on stored prompt
      }

      const payload: any = {
        input,
        prompt: { id: this.promptId, version: this.promptVersion },
        max_output_tokens: 2048,
        store: false,
        // Encourage well-formed JSON to match our schema (new field location)
  text: { format: { type: 'json_object' } },
      };

      const response = await axios.post(
        `${this.baseURL}/responses`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 60000
        }
      );

      // Expect output_text with JSON string
      const outputText: string | undefined = response.data?.output_text || response.data?.output?.[0]?.content?.[0]?.text || response.data?.response?.output_text;
      if (!outputText) {
        throw new Error('AI returned empty response. Please try with a different image.');
      }

      // Parse response as JSON with resilience: strip code fences, or extract the first {...} block.
      let parsed: any;
      let text = (outputText || '').trim();
      const stripFences = (s: string) => {
        // Remove triple backtick fences like ```json ... ```
        if (s.startsWith('```')) {
          s = s.replace(/^```(?:json|JSON)?\s*/i, '');
          // remove trailing fence at the end
          if (s.endsWith('```')) s = s.replace(/```\s*$/i, '');
        }
        return s.trim();
      };
      const extractJson = (s: string) => {
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start >= 0 && end > start) return s.slice(start, end + 1);
        return s;
      };
      try {
        parsed = JSON.parse(text);
      } catch {
        try {
          parsed = JSON.parse(stripFences(text));
        } catch {
          try {
            const candidate = extractJson(text);
            parsed = JSON.parse(candidate);
          } catch {
            // Plain text fallback: construct minimal response so UI always shows something
            const fallback: ArtTherapyResponse = this.normalizeResponse({ response_text: text }, currentPhase);
            this.validateResponse(fallback);
            return fallback;
          }
        }
      }
      let normalized = this.normalizeResponse(parsed, currentPhase);
      // Fallback: if response_text ended up empty, try to salvage from raw text
      if (!normalized.response_text) {
        const m = text.match(/"response_text"\s*:\s*"((?:\\.|[^"\\])*)/);
        let salvage = '';
        if (m && m[1]) {
          salvage = m[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          salvage = text;
        }
        if (salvage && typeof salvage === 'string') {
          normalized = { ...normalized, response_text: salvage.trim() };
        }
      }
      this.validateResponse(normalized);
      return normalized;

    } catch (error: any) {
      console.error('Art Therapy API Error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.message?.includes('AI_REFUSAL:')) {
        const refusalMessage = error.message.replace('AI_REFUSAL: ', '');
        throw new Error(`${refusalMessage}\n\n🎨 გთხოვთ ატვირთოთ თქვენი ხატვა ან ნახატი, სადაც არ არის ადამიანის სახე.\n\n(Please upload your drawing or artwork without people's faces.)`);
      } else if (error.message?.includes('AI refused to analyze')) {
        throw new Error('სურათის ანალიზი შეუძლებელია. გთხოვთ სცადოთ სხვა სურათით.\n\n(Image analysis refused. Please try a different image.)');
      } else if (error.response?.status === 400) {
        // Bad Request - often due to large payload
        const errorData = error.response?.data;
        if (errorData?.error?.message?.includes('maximum context length') || 
            errorData?.error?.message?.includes('too large') ||
            errorData?.error?.code === 'context_length_exceeded') {
          throw new Error('სურათი ძალიან დიდია. გთხოვთ გამოიყენოთ უფრო პატარა სურათი ან დაიწყოთ ფოტო უფრო დაბალი რეზოლუციით.\n\n(Image is too large. Please use a smaller image or take a photo with lower resolution.)');
        } else {
          throw new Error(`API მოთხოვნის შეცდომა: ${errorData?.error?.message || 'გთხოვთ სცადოთ თავიდან'}\n\n(API request error: Please try again.)`);
        }
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please check your internet connection.');
      } else if (error.message?.includes('empty response')) {
        throw new Error('AI-მ ვერ შეძლო პასუხის გენერირება. გთხოვთ სცადოთ თავიდან.\n\n(AI failed to generate response. Please try again.)');
      } else if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        throw new Error('ქსელის შეცდომა. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი.\n\n(Network error. Please check your internet connection.)');
      }
      
      throw new Error(`AI Art Therapy service error: ${error.message}`);
    }
  }

  /**
   * Stream message using Responses API (SSE). Emits partial response_text via onDelta,
   * and resolves with the final parsed JSON when complete.
   */
  async sendMessageStream(
    messages: ChatMessage[],
    sessionTheme: string,
    userLanguage: string = 'en',
    currentPhase: 0 | 1 | 2 = 0,
    onDelta?: (partialResponseText: string) => void,
    extraContext?: string
  ): Promise<ArtTherapyResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Build Responses input as in sendMessage
    const input: any[] = [];
    const msgs = [...messages];
    const languageName = this.getLanguageName(userLanguage);
    console.log('🌐 AI Stream Request Language:', languageName, `(${userLanguage})`);
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        const hasImageOnlyMessage = Boolean(msgs[i].imageBase64) && !msgs[i].content;
        const ctx = this.buildSessionContext(sessionTheme, languageName, currentPhase, hasImageOnlyMessage, extraContext);
        const apiText = msgs[i].apiOnlyContent || msgs[i].content || '';
        msgs[i] = { ...msgs[i], apiOnlyContent: apiText + ctx };
        break;
      }
    }
    for (const msg of msgs) {
      const content: any[] = [];
      if (msg.role === 'user') {
        const textContent = msg.apiOnlyContent || msg.content;
        if (textContent) content.push({ type: 'input_text', text: textContent });
        if (msg.imageBase64) content.push({ type: 'input_image', image_url: msg.imageBase64 });
        input.push({ role: 'user', content });
      } else if (msg.role === 'assistant') {
        if (msg.content) content.push({ type: 'output_text', text: msg.content });
        input.push({ role: 'assistant', content });
      }
    }

    const body = JSON.stringify({
      input,
      prompt: { id: this.promptId, version: this.promptVersion },
      max_output_tokens: 2048,
      stream: true,
      // Encourage JSON, but we still handle plain-text gracefully
  text: { format: { type: 'json_object' } }
    });

    const controller = new AbortController();
  let buffer = '';
  let partialShown = '';

    const extractResponseText = (buf: string): string => {
      // Try to extract the current JSON field value for "response_text"
      const m = buf.match(/"response_text"\s*:\s*"((?:\\.|[^"\\])*)/);
      if (!m) return partialShown;
      const raw = m[1];
      // Unescape minimal JSON sequences for display
      const unescaped = raw
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      return unescaped;
    };

    try {
      const res = await fetch(`${this.baseURL}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body,
        signal: controller.signal,
      } as any);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Streaming request failed: ${res.status} ${text}`);
      }

      // React Native fetch may not expose a ReadableStream body. If so, fall back to non-streaming.
      if (!(res as any).body || !(res as any).body.getReader) {
        try {
          // Graceful fallback: re-issue as non-streaming request
          const nonStream = await this.sendMessage(messages, sessionTheme, userLanguage, currentPhase);
          // Surface full text to UI once
          if (nonStream?.response_text) onDelta?.(nonStream.response_text);
          return nonStream;
        } catch (e) {
          const text = await res.text().catch(() => '');
          throw new Error(`Streaming unsupported on this platform. Fallback failed. Raw: ${text}`);
        }
      }

      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
  let finalText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer += chunk;

        // Split on event separators. SSE frames are separated by two newlines
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';
        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace(/^data:\s*/, '').trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const evt = JSON.parse(jsonStr);
              const type = evt.type || evt.event || '';
              if (type === 'response.output_text.delta' && typeof evt.delta === 'string') {
                finalText += evt.delta;
                // Prefer extracting response_text field; if absent, surface plain text so the user sees progress
                const current = extractResponseText(finalText) || finalText;
                const display = (current || '').trim();
                if (display && display !== partialShown) {
                  partialShown = display;
                  onDelta?.(partialShown);
                }
              } else if (type === 'response.completed') {
                // Some implementations include full response here
                if (evt.response?.output_text && typeof evt.response.output_text === 'string') {
                  finalText = evt.response.output_text;
                }
              } else if (type === 'response.error') {
                const msg = evt.error?.message || 'Unknown streaming error';
                throw new Error(msg);
              }
            } catch (e) {
              // Ignore JSON parse errors for partial frames
            }
          }
        }
      }

      const text = finalText.trim();
      if (!text) throw new Error('AI returned empty response.');

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        // If the model returned something else, try to salvage by locating a JSON object
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
          parsed = JSON.parse(text.slice(start, end + 1));
        } else {
          // Plain text fallback
          const fallback: ArtTherapyResponse = this.normalizeResponse({ response_text: text }, currentPhase);
          this.validateResponse(fallback);
          return fallback;
        }
      }

      const normalized = this.normalizeResponse(parsed, currentPhase);
      this.validateResponse(normalized);
      return normalized;
    } catch (error: any) {
      // Map to same error handling as non-streaming
      console.error('Art Therapy Streaming Error:', error?.message || error);
      if (error?.message?.includes('maximum context length') || error?.message?.includes('too large')) {
        throw new Error('სურათი ძალიან დიდია. გთხოვთ გამოიყენოთ უფრო პატარა სურათი ან დაიწყოთ ფოტო უფრო დაბალი რეზოლუციით.\n\n(Image is too large. Please use a smaller image or take a photo with lower resolution.)');
      }
      throw error;
    } finally {
      controller.abort();
    }
  }

  /**
   * Ensure AI response always contains required fields with safe defaults
   */
  private normalizeResponse(resp: any, fallbackPhase: 0 | 1 | 2): ArtTherapyResponse {
    const safe = (v: any, d: any) => (v === undefined || v === null ? d : v);

    const session_phase: 0 | 1 | 2 = [0,1,2].includes(resp?.session_phase) ? resp.session_phase : fallbackPhase;

    const clinical_insights = {
      visual_analysis: {
        colors: Array.isArray(resp?.clinical_insights?.visual_analysis?.colors) ? resp.clinical_insights.visual_analysis.colors : [],
        shapes: Array.isArray(resp?.clinical_insights?.visual_analysis?.shapes) ? resp.clinical_insights.visual_analysis.shapes : [],
        symbols: Array.isArray(resp?.clinical_insights?.visual_analysis?.symbols) ? resp.clinical_insights.visual_analysis.symbols : [],
        composition: safe(resp?.clinical_insights?.visual_analysis?.composition, ''),
        line_quality: safe(resp?.clinical_insights?.visual_analysis?.line_quality, ''),
        spatial_use: safe(resp?.clinical_insights?.visual_analysis?.spatial_use, ''),
      },
      emotional_indicators: {
        detected_emotions: Array.isArray(resp?.clinical_insights?.emotional_indicators?.detected_emotions) ? resp.clinical_insights.emotional_indicators.detected_emotions : [],
        intensity: ['low','moderate','high'].includes(resp?.clinical_insights?.emotional_indicators?.intensity) ? resp.clinical_insights.emotional_indicators.intensity : 'low',
        conflicting_emotions: Boolean(resp?.clinical_insights?.emotional_indicators?.conflicting_emotions),
      },
      psychological_themes: Array.isArray(resp?.clinical_insights?.psychological_themes) ? resp.clinical_insights.psychological_themes : [],
      cultural_elements: Array.isArray(resp?.clinical_insights?.cultural_elements) ? resp.clinical_insights.cultural_elements : [],
      trauma_indicators: Array.isArray(resp?.clinical_insights?.trauma_indicators) ? resp.clinical_insights.trauma_indicators : [],
    };

    const therapeutic_techniques = {
      suggested_technique: safe(resp?.therapeutic_techniques?.suggested_technique, 'Gentle exploration'),
      rationale: safe(resp?.therapeutic_techniques?.rationale, 'Support gradual insight and emotional safety.'),
      instructions: safe(resp?.therapeutic_techniques?.instructions, 'Consider 1–2 small steps that feel safe right now.'),
    };

    const safety_assessment = {
      risk_level: ['none','low','moderate','high','imminent'].includes(resp?.safety_assessment?.risk_level) ? resp.safety_assessment.risk_level : 'none',
      concerning_imagery: Array.isArray(resp?.safety_assessment?.concerning_imagery) ? resp.safety_assessment.concerning_imagery : [],
      immediate_action_needed: Boolean(resp?.safety_assessment?.immediate_action_needed),
      safety_recommendations: Array.isArray(resp?.safety_assessment?.safety_recommendations) ? resp.safety_assessment.safety_recommendations : [],
    };

    const somatic_guidance = {
      body_awareness_prompt: safe(resp?.somatic_guidance?.body_awareness_prompt, 'Notice any sensations in your body as you look at your drawing.'),
      grounding_technique: safe(resp?.somatic_guidance?.grounding_technique, 'Take three slow breaths. Feel your feet on the floor.'),
    };

    const progress_tracking = {
      emotional_shift: safe(resp?.progress_tracking?.emotional_shift, ''),
      insight_gained: safe(resp?.progress_tracking?.insight_gained, ''),
      therapeutic_alliance: safe(resp?.progress_tracking?.therapeutic_alliance, ''),
    };

    // Build best-effort textual response if primary field is empty
    const primaryText = safe(resp?.response_text, '');
    const fallbackPieces: string[] = [];
    const maybePhaseSummary = safe(resp?.phase_summary, '');
    const maybeSessionSummary = safe(resp?.session_summary, '');
    const maybeNext = safe(resp?.next_steps, '');
    if (!primaryText) {
      if (maybePhaseSummary) fallbackPieces.push(maybePhaseSummary);
      if (maybeSessionSummary) fallbackPieces.push(maybeSessionSummary);
      if (maybeNext) fallbackPieces.push(maybeNext);
    }

    const normalized: ArtTherapyResponse = {
      response_text: primaryText || fallbackPieces.join('\n\n'),
      session_phase,
      phase_complete: Boolean(resp?.phase_complete),
      session_complete: Boolean(resp?.session_complete),
      required_input: resp?.required_input ?? 'none',
      action: resp?.action ?? 'none',
      phase_summary: safe(resp?.phase_summary, undefined),
      session_summary: safe(resp?.session_summary, undefined),
      clinical_insights,
      therapeutic_techniques,
      safety_assessment,
      somatic_guidance,
      progress_tracking,
      next_steps: safe(resp?.next_steps, ''),
    };

    return normalized;
  }

  /**
   * Validate that the AI response matches our expected schema
   */
  private validateResponse(response: any): void {
    const required = [
      'response_text',
      'session_phase',
      'clinical_insights',
      'therapeutic_techniques',
      'safety_assessment',
      'somatic_guidance',
      'progress_tracking',
      'next_steps'
    ];

    for (const field of required) {
      if (!(field in response)) {
        throw new Error(`Invalid AI response: missing field '${field}'`);
      }
    }

    // Validate safety assessment
    if (response.safety_assessment.immediate_action_needed === true) {
      console.warn('⚠️ IMMEDIATE ACTION NEEDED - High risk detected in art therapy session');
    }
  }

  /**
   * Get crisis resources based on user's language/location
   */
  getCrisisResources(language: string): { name: string; number: string; description: string }[] {
    const resources = {
      en: [
        { name: 'National Suicide Prevention Lifeline (USA)', number: '988', description: '24/7 crisis support' },
        { name: 'Crisis Text Line (USA)', number: 'Text HOME to 741741', description: 'Text-based crisis support' },
        { name: 'International Association for Suicide Prevention', number: 'https://www.iasp.info/resources/Crisis_Centres/', description: 'Global crisis centers' }
      ],
      ka: [ // Georgian
        { name: 'საქართველოს კრიზისული ხაზი', number: '116 006', description: '24/7 ფსიქოლოგიური დახმარება' },
        { name: 'ემოციური დახმარების ცხელი ხაზი', number: '2 27 27 27', description: 'თბილისის კრიზისული ცენტრი' }
      ],
      ru: [ // Russian
        { name: 'Телефон доверия (Россия)', number: '8-800-2000-122', description: 'Бесплатная психологическая помощь' },
        { name: 'Центр экстренной психологической помощи МЧС', number: '8-499-216-50-50', description: 'Кризисная поддержка' }
      ],
      hy: [ // Armenian
        { name: 'Հոգեբանական օգնության գիծ', number: '+374 (0)60 655 000', description: 'Անվճար հոգեբանական աջակցություն' }
      ]
    };

    return resources[language as keyof typeof resources] || resources.en;
  }

  /**
   * Clean up old art therapy session images (keep only recent ones)
   */
  async cleanupOldImages(): Promise<void> {
    // Skip on web: no persistent documentDirectory
    if (Platform.OS === 'web') return;
    try {
      const docsDir = FileSystem.documentDirectory || '';
      if (!docsDir) return;

      const files = await FileSystem.readDirectoryAsync(docsDir);
      type ArtSessionFile = { name: string; path: string; timestamp: number };
      const artSessionFiles: ArtSessionFile[] = files
        .filter((file: string) => file.startsWith('art_session_'))
        .map((file: string): ArtSessionFile => ({
          name: file,
          path: `${docsDir}${file}`,
          timestamp: parseInt(file.replace('art_session_', '').split('_')[0]) || 0
        }))
        .sort((a: ArtSessionFile, b: ArtSessionFile) => b.timestamp - a.timestamp); // Most recent first

      // Keep only the 20 most recent images
      const filesToDelete = artSessionFiles.slice(20);
      
  for (const file of filesToDelete) {
        try {
          await FileSystem.deleteAsync(file.path, { idempotent: true });
          console.log('🗑️ Cleaned up old art therapy image:', file.name);
        } catch (e) {
          console.warn('⚠️ Could not delete old image file:', e);
        }
      }

      if (filesToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${filesToDelete.length} old art therapy images`);
      }
    } catch (error) {
      console.warn('⚠️ Error during image cleanup:', error);
    }
  }
}

export default new ArtTherapyService();
