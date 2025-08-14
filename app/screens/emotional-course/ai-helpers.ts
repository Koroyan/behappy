// Simple welcome message system that calls OpenAI API

import { CourseDay } from '@/services/emotionalCourseService';
import { EmotionalCourseChatService } from '@/services/emotionalCourseChat';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'exercise' | 'tip' | 'quote' | 'image' | 'technique' | 'reflection' | 'milestone';
  text?: string;
  timestamp: string;
  exercise?: any;
  imageUrl?: string;
  tipTitle?: string;
  animationDelay?: number;
  isTyping?: boolean;
  quote?: {
    text: string;
    author: string;
  };
  reflection?: {
    question: string;
    suggestions: string[];
  };
  milestone?: {
    title: string;
    description: string;
    emoji: string;
  };
}

interface AIResponseData {
  messages: ChatMessage[];
  tokensUsed: number;
  isDayComplete: boolean;
  exerciseTriggered?: {
    type: string;
    instructions: string;
  };
}

// Parse OpenAI response for tokens and completion signals
export const parseAIResponse = (response: any, content: string): AIResponseData => {
  const tokensUsed = response?.usage?.total_tokens || 0;
  
  // Check for day completion signal
  const dayCompleteSignals = [
    'DAY_COMPLETE',
    'ДЕНЬ_ЗАВЕРШЕН', 
    'SESSION_END',
    'ПРАКТИКА_ОКОНЧЕНА'
  ];
  
  const isDayComplete = dayCompleteSignals.some(signal => 
    content.includes(signal)
  );
  
  // Check for exercise trigger
  let exerciseTriggered = undefined;
  const exercisePatterns = [
    { type: 'breathing', keywords: ['дыхание', 'дыхательная', 'breathing'] },
    { type: 'meditation', keywords: ['медитация', 'meditation', 'осознанность'] },
    { type: 'reflection', keywords: ['подумай', 'рефлексия', 'reflection'] },
    { type: 'journaling', keywords: ['запиши', 'journal', 'дневник'] }
  ];
  
  for (const pattern of exercisePatterns) {
    if (pattern.keywords.some(keyword => content.toLowerCase().includes(keyword))) {
      exerciseTriggered = {
        type: pattern.type,
        instructions: content
      };
      break;
    }
  }
  
  // Clean content from special signals
  let cleanContent = content;
  dayCompleteSignals.forEach(signal => {
    cleanContent = cleanContent.replace(signal, '');
  });
  
  const messages: ChatMessage[] = [{
    id: Math.random().toString(36).substr(2, 9),
    text: cleanContent.trim(),
    type: 'ai',
    timestamp: new Date().toISOString(),
  }];
  
  return {
    messages,
    tokensUsed,
    isDayComplete,
    exerciseTriggered
  };
};

export const getWelcomeMessage = (day: CourseDay): ChatMessage[] => {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createAIMessage = (text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
    id: generateId(),
    text,
    type: 'ai',
    timestamp: new Date().toISOString(),
    ...extra
  });

  const welcomeMessages: ChatMessage[] = [];
  
  welcomeMessages.push(createAIMessage(
    `Привет! 👋 Я твой персональный AI-наставник по эмоциональному развитию. Добро пожаловать на день ${day.id} нашего курса!`
  ));

  if (day.id === 1) {
    welcomeMessages.push(createAIMessage(
      `Сегодня мы начнем увлекательное путешествие в мир эмоций. Тема дня: "${day.title}". \n\nЯ создан специально для того, чтобы помочь тебе лучше понимать свои чувства и развивать эмоциональный интеллект. 🧠💗`
    ));
  } else {
    welcomeMessages.push(createAIMessage(
      `Продолжаем наше путешествие! Сегодняшняя тема: "${day.title}". \n\n${day.description}`
    ));
  }

  welcomeMessages.push(createAIMessage(
    "Готов начать? Расскажи мне, как дела и что у тебя сейчас на душе?"
  ));

  return welcomeMessages;
};

// Advanced AI response using OpenAI API with token tracking
export const generateAIResponse = async (
  userMessage: string, 
  day: CourseDay, 
  userProfile: any = {},
  currentTokens: number = 0
): Promise<AIResponseData> => {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  try {
    // Generate AI response using OpenAI with sophisticated system prompt
    const response = await EmotionalCourseChatService.generateResponseWithTokens(
      day.id,
      userMessage,
      day,
      userProfile,
      currentTokens
    );

    // Parse the response
    return parseAIResponse(response.rawResponse, response.content);

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback response
    return {
      messages: [{
        id: generateId(),
        text: 'Извини, произошла техническая ошибка. Но я все равно здесь для тебя. Расскажи, что сейчас у тебя на душе?',
        type: 'ai',
        timestamp: new Date().toISOString()
      }],
      tokensUsed: 50, // Estimate for fallback
      isDayComplete: false
    };
  }
};
