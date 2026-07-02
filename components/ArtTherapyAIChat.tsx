import CommonSendButton from '@/components/CommonSendButton';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  imageUri?: string; // Optional image URI for messages with art
}

interface ArtTherapyAIChatProps {
  initialPrompt?: string;
  onImageRequest?: (theme: string) => void;
  onSendMessage?: (message: string) => Promise<string>;
}

// Интерфейс для публичных методов через ref
export interface ArtTherapyAIChatRef {
  addImageMessage: (imageUri: string, analysisText: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const ArtTherapyAIChat = forwardRef<ArtTherapyAIChatRef, ArtTherapyAIChatProps>(({
  initialPrompt,
  onImageRequest,
  onSendMessage
}, ref) => {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Добавление начального сообщения
  useEffect(() => {
    if (initialPrompt) {
      setMessages([
        {
          id: 'welcome',
          text: initialPrompt,
          isUser: false,
          timestamp: Date.now(),
        },
      ]);
    } else {
      // Стандартное приветствие
      setMessages([
        {
          id: 'welcome',
          text: 'Привет! Я твой AI-ассистент по арт-терапии. Я могу помочь тебе в выражении эмоций через искусство и проанализировать твои рисунки. С чего бы ты хотел начать сегодня? Выбери тему для рисования или мы можем обсудить твои чувства.',
          isUser: false,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [initialPrompt]);

  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Вибрация при отправке на нативных платформах
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      text: inputMessage.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      // Проверяем запрос на создание рисунка
      const lowerMessage = inputMessage.toLowerCase();
      if (
        lowerMessage.includes('рисовать') || 
        lowerMessage.includes('рисунок') || 
        lowerMessage.includes('нарисовать') ||
        lowerMessage.includes('рисование')
      ) {
        // Определение темы рисунка из сообщения
        const drawingThemes = [
          { keyword: 'эмоци', theme: 'Эмоции' },
          { keyword: 'семья', theme: 'Семья' },
          { keyword: 'автопортрет', theme: 'Автопортрет' },
          { keyword: 'природ', theme: 'Природа' },
          { keyword: 'сон', theme: 'Сны' },
          { keyword: 'будущее', theme: 'Будущее' },
          { keyword: 'воспоминан', theme: 'Воспоминания' }
        ];
        
        let selectedTheme = 'Свободная тема'; // По умолчанию
        for (const item of drawingThemes) {
          if (lowerMessage.includes(item.keyword)) {
            selectedTheme = item.theme;
            break;
          }
        }
        
        // Добавляем ответ AI
        const aiResponse = {
          id: `ai-${Date.now()}`,
          text: `Отлично! Давай нарисуем что-нибудь на тему "${selectedTheme}". Я открываю холст для рисования.`,
          isUser: false,
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
        
        // Задержка перед вызовом функции рисования
        setTimeout(() => {
          if (onImageRequest) {
            onImageRequest(selectedTheme);
          }
          setIsSending(false);
        }, 1500);
        
        return;
      }
      
      // Обычный ответ AI
      let aiResponseText = 'Я думаю над твоим вопросом...';
      
      if (onSendMessage) {
        aiResponseText = await onSendMessage(inputMessage);
      } else {
        // Примеры стандартных ответов
        if (lowerMessage.includes('как') && lowerMessage.includes('арт-терапия')) {
          aiResponseText = 'Арт-терапия - это метод психологической помощи, основанный на искусстве и творческом самовыражении. Рисуя, ты можешь выразить те эмоции и мысли, которые трудно облечь в слова. Это безопасный способ проявить свои чувства и лучше понять себя.\n\nХочешь попробовать нарисовать что-нибудь сейчас? Я могу предложить несколько тем.';
        } else if (lowerMessage.includes('польза') || lowerMessage.includes('помогает')) {
          aiResponseText = 'Арт-терапия помогает снизить стресс, выразить подавленные эмоции, повысить самооценку и развить творческие навыки. Через рисунок мы можем обнаружить скрытые мысли и чувства, которые сложно выразить словами.\n\nХотел бы ты попробовать нарисовать свое текущее эмоциональное состояние?';
        } else if (lowerMessage.includes('тема') || lowerMessage.includes('что рисовать')) {
          aiResponseText = 'Вот несколько идей для рисования:\n- Автопортрет (как ты себя сейчас видишь)\n- Безопасное место (где тебе комфортно)\n- Визуализация эмоции (как выглядит твоя радость/грусть/злость)\n- Прошлое, настоящее и будущее\n- Семейный рисунок\n\nКакая тема тебя больше привлекает?';
        } else {
          aiResponseText = 'Интересная мысль! Искусство - это прекрасный способ самовыражения. Хотел бы ты попробовать выразить эти чувства через рисунок? Я могу предложить тебе начать с простого упражнения на выражение эмоций через цвет и форму.';
        }
      }

      // Добавляем ответ AI
      const aiResponse = {
        id: `ai-${Date.now()}`,
        text: aiResponseText,
        isUser: false,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Сообщение об ошибке
      const errorResponse = {
        id: `ai-error-${Date.now()}`,
        text: 'Извини, произошла ошибка при обработке сообщения. Пожалуйста, попробуй еще раз.',
        isUser: false,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsSending(false);
    }
  };

  // Добавление сообщения с изображением
  const addImageMessage = (imageUri: string, analysisText: string) => {
    const newMessages = [
      {
        id: `user-image-${Date.now()}`,
        text: '',
        isUser: true,
        timestamp: Date.now(),
        imageUri
      },
      {
        id: `ai-analysis-${Date.now()}`,
        text: analysisText,
        isUser: false,
        timestamp: Date.now() + 100,
      }
    ];
    
    setMessages(prev => [...prev, ...newMessages]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.message,
                msg.isUser
                  ? [styles.userMessage, { backgroundColor: isDark ? '#3b82f6' : '#000000' }]
                  : [styles.aiMessage, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }],
              ]}
            >
              {msg.imageUri && (
                <Image 
                  source={{ uri: msg.imageUri }} 
                  style={styles.messageImage} 
                  resizeMode="contain"
                />
              )}
              <Text
                style={[
                  styles.messageText,
                  { color: msg.isUser ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        {isSending && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
              AI печатает...
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.colors.text, backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' },
          ]}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Введите сообщение..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={1000}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSendMessage}
        />
        <CommonSendButton
          onPress={handleSendMessage}
          disabled={!inputMessage.trim() || isSending}
          loading={isSending}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 10,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 5,
    width: '100%',
    flexDirection: 'row',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  aiMessageWrapper: {
    justifyContent: 'flex-start',
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    borderTopRightRadius: 4,
  },
  aiMessage: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageImage: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    borderRadius: 8,
    marginBottom: 10,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginLeft: 10,
  },
  typingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCCCCC',
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default ArtTherapyAIChat;
