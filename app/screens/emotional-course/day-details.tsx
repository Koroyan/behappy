import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Animated,
  ImageBackground
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { CourseDay, CourseExercise } from '../../../services/emotionalCourseService';
import EmotionalCourseService from '../../../services/emotionalCourseService';
import { EmotionalCourseChatService } from '../../../services/emotionalCourseChat';
import { generateAIResponse, getWelcomeMessage } from './ai-helpers';
import { Ionicons, FontAwesome5, MaterialIcons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Расширенный интерфейс для умных сообщений
interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'ai' | 'milestone' | 'reflection' | 'exercise' | 'system';
  metadata?: {
    isCompleted?: boolean;
    exerciseId?: string;
    emotionalAnalysis?: any;
    milestone?: string;
    reflectionPrompts?: string[];
  };
}

interface EmotionalContext {
  emotionWords: string[];
  bodyWords: string[];
  intensityLevel: number;
  hasNegativeEmotion: boolean;
  hasPositiveEmotion: boolean;
  dominantEmotion: string;
}

interface UserEmotionalProfile {
  name?: string;
  lastEmotions: string[];
  lastBodySensations: string[];
  intensityPattern: number[];
  totalMessages: number;
  dayProgress: number;
  completedExercises: string[];
  lastActive: string;
  preferences?: {
    communicationStyle?: 'supportive' | 'direct' | 'analytical';
    preferredTopics?: string[];
    sensitivityLevel?: number;
  };
}

export default function DayDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams();
  const { id } = params;
  const dayId = typeof id === 'string' && !isNaN(parseInt(id, 10)) ? parseInt(id, 10) : 1;

  const [day, setDay] = useState<CourseDay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [totalTokensUsed, setTotalTokensUsed] = useState<number>(0);
  const [dayCompleted, setDayCompleted] = useState<boolean>(false);
  const maxTokensPerDay = 5000;
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAITyping, setShowAITyping] = useState<boolean>(false);
  const [userEmotionalProfile, setUserEmotionalProfile] = useState<UserEmotionalProfile>({
    lastEmotions: [],
    lastBodySensations: [],
    intensityPattern: [],
    totalMessages: 0,
    dayProgress: 1,
    completedExercises: [],
    lastActive: new Date().toISOString()
  });

  const chatScrollViewRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);

  // Загрузка данных дня
  const loadDayData = async () => {
    if (dataLoaded) return; // Prevent multiple loads
    
    try {
      console.log(`Loading day data for dayId: ${dayId}`);
      setLoading(true);
      const dayData = await EmotionalCourseService.getDay(dayId);
      setDay(dayData);
      
      // Добавляем приветственное сообщение при первой загрузке
      if (messages.length === 0 && dayData) {
        try {
          const welcomeMessages = await getWelcomeMessage(dayData);
          // Convert messages to our format with proper text handling
          const convertedMessages: ChatMessage[] = welcomeMessages
            .filter(msg => msg.text) // Only include messages with text
            .map(msg => ({
              id: msg.id,
              text: msg.text || '', // Ensure text is never undefined
              isUser: msg.type === 'user',
              timestamp: new Date(msg.timestamp),
              type: msg.type as 'ai' | 'milestone' | 'reflection' | 'exercise' | 'system'
            }));
          setMessages(convertedMessages);
        } catch (welcomeError) {
          console.error('Error loading welcome messages:', welcomeError);
        }
      }
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDayData = useCallback(async () => {
    if (!day || loading) return;
    
    try {
      console.log(`Refreshing day data for dayId: ${day.id}`);
      const updatedDay = await EmotionalCourseService.getDay(day.id);
      setDay(updatedDay);
    } catch (error) {
      console.error('Error refreshing day data:', error);
    }
  }, [day?.id, loading]);

  useEffect(() => {
    console.log(`useEffect triggered for dayId: ${dayId}, dataLoaded: ${dataLoaded}`);
    setDataLoaded(false); // Reset when dayId changes
    loadDayData();
  }, [dayId]); // Only depend on dayId, not loadDayData

  // Disable useFocusEffect to prevent infinite loops
  // useFocusEffect(
  //   useCallback(() => {
  //     console.log('useFocusEffect triggered');
  //     // Only refresh if we have a day loaded and we're not currently loading
  //     if (day && !loading) {
  //       console.log('Refreshing day data');
  //       refreshDayData();
  //     }
  //   }, [refreshDayData, day, loading])
  // );

  // Вспомогательные функции для создания сообщений
  const createUserMessage = (text: string): ChatMessage => ({
    id: `user-${Date.now()}-${Math.random()}`,
    text,
    isUser: true,
    timestamp: new Date(),
    type: 'ai'
  });

  const createAIMessage = (text: string): ChatMessage => ({
    id: `ai-${Date.now()}-${Math.random()}`,
    text,
    isUser: false,
    timestamp: new Date(),
    type: 'ai'
  });

  const createMilestoneMessage = (title: string, description: string, emoji: string = "🎯"): ChatMessage => ({
    id: `milestone-${Date.now()}-${Math.random()}`,
    text: `${emoji} **${title}**\n\n${description}`,
    isUser: false,
    timestamp: new Date(),
    type: 'milestone'
  });

  // Анализ эмоционального контекста пользовательского сообщения
  const analyzeEmotionalContext = (message: string): EmotionalContext => {
    const emotionWords = [
      'грустно', 'радостно', 'злость', 'страх', 'удивление', 'отвращение', 
      'счастье', 'печаль', 'гнев', 'тревога', 'восторг', 'разочарование',
      'волнение', 'спокойствие', 'усталость', 'энергичность', 'любовь', 'ненависть'
    ];
    
    const bodyWords = [
      'напряжение', 'расслабление', 'дрожь', 'тепло', 'холод', 'боль',
      'легкость', 'тяжесть', 'сердцебиение', 'дыхание', 'мышцы'
    ];

    const foundEmotions = emotionWords.filter(word => 
      message.toLowerCase().includes(word)
    );
    
    const foundBodyWords = bodyWords.filter(word => 
      message.toLowerCase().includes(word)
    );

    const negativeWords = ['грустно', 'злость', 'страх', 'печаль', 'гнев', 'тревога', 'разочарование', 'ненависть'];
    const positiveWords = ['радостно', 'счастье', 'удивление', 'восторг', 'волнение', 'спокойствие', 'энергичность', 'любовь'];

    const hasNegative = foundEmotions.some(emotion => negativeWords.includes(emotion));
    const hasPositive = foundEmotions.some(emotion => positiveWords.includes(emotion));

    return {
      emotionWords: foundEmotions,
      bodyWords: foundBodyWords,
      intensityLevel: Math.min(foundEmotions.length + foundBodyWords.length, 10),
      hasNegativeEmotion: hasNegative,
      hasPositiveEmotion: hasPositive,
      dominantEmotion: foundEmotions[0] || 'нейтральное'
    };
  };

  // WORKING OPENAI INTEGRATION - Обработка отправки сообщения с умной логикой курса
  const handleSendMessage = async () => {
    if (!message.trim() || !day || isProcessing) return;

    setIsProcessing(true);
    setShowAITyping(true);

    try {
      const trimmedMessage = message.trim();
      const userMessage = createUserMessage(trimmedMessage);
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Анализ эмоционального контекста
      const emotionalContext = analyzeEmotionalContext(trimmedMessage);
      
      // Обновление профиля пользователя с conversation history
      setUserEmotionalProfile((prev: any) => ({
        ...prev,
        lastEmotions: emotionalContext.emotionWords,
        lastBodySensations: emotionalContext.bodyWords,
        intensityPattern: [...(prev.intensityPattern || []), emotionalContext.intensityLevel].slice(-10),
        totalMessages: (prev.totalMessages || 0) + 1,
        dayProgress: day.id,
        lastActive: new Date().toISOString(),
        conversationHistory: [
          ...(prev.conversationHistory || []).slice(-5), // Keep last 5 messages
          trimmedMessage
        ],
        lastMessage: trimmedMessage
      }));

      // Умная логика обработки завершения упражнений - ნაკლები ფუნქციონალი
      const exerciseCompletionPhrases = [
        'выполнил', 'сделал', 'закончил', 'завершил', 'готово', 'выполнено', 
        'прошел', 'справился', 'освоил', 'изучил', 'практиковал', 'медитировал'
      ];
      
      const mentionsExerciseCompletion = exerciseCompletionPhrases.some(phrase => 
        trimmedMessage.toLowerCase().includes(phrase)
      );

      // Проверка на автоматическое завершение упражнений - მარტივი ვერსია
      if (mentionsExerciseCompletion && day.exercises.length > 0) {
        const incompleteExercise = day.exercises.find(ex => !ex.isCompleted);
        if (incompleteExercise) {
          await EmotionalCourseService.completeExercise(day.id, incompleteExercise.id);
          await refreshDayData();
          
          setTimeout(() => {
            setShowAITyping(false);
            
            // Персонализированная реакция на завершение
            const congratsMsg = createMilestoneMessage(
              `Упражнение выполнено! 🎉`,
              `Отлично! Продолжай рассказывать о своих ощущениях.`,
              "✅"
            );
            setMessages(prev => [...prev, congratsMsg]);
          }, 1000);
          return;
        }
      }

      // Генерация умного ответа с помощью OpenAI API  
      setTimeout(async () => {
        try {
          setShowAITyping(false);
          
          // Use new token-aware chat service
          const chatService = EmotionalCourseChatService.getInstance();
          const aiResult = await chatService.generateResponseWithTokens(
            trimmedMessage,
            day,
            userEmotionalProfile,
            totalTokensUsed,
            maxTokensPerDay
          );
          
          if (aiResult.error) {
            console.error('AI response error:', aiResult.error);
            const errorMsg = createUserMessage('შეცდომა AI პასუხისას. სცადეთ ხელახლა.');
            setMessages(prev => [...prev, errorMsg]);
            return;
          }
          
          // Update token count
          setTotalTokensUsed(aiResult.tokensUsed);
          
          // Update user profile with AI response for conversation context
          setUserEmotionalProfile((prev: any) => ({
            ...prev,
            conversationHistory: [
              ...(prev.conversationHistory || []).slice(-5), // Keep last 5 messages  
              `AI: ${aiResult.response}`
            ]
          }));
          
          // Create AI message
          const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            text: aiResult.response,
            isUser: false,
            timestamp: new Date(),
            type: 'ai'
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // Check if day should be completed
          if (aiResult.dayComplete) {
            setTimeout(async () => {
              setDayCompleted(true);
              // Auto-complete day
              if (day.exercises.length > 0) {
                for (const exercise of day.exercises) {
                  await EmotionalCourseService.completeExercise(day.id, exercise.id);
                }
              }
              await EmotionalCourseService.completeDay(day.id);
              
              const completionMsg = createMilestoneMessage(
                `День ${day.id} завершен! 🎉`,
                `შესანიშნავია! შენ დღეს ემოციური განვითარების მნიშვნელოვანი გზა გაიარე. ${day.id < 7 ? `ვნახოთ ხვალ დღეზე ${day.id + 1}!` : 'გილოცავ მთელი კურსის დასრულებას!'}`,
                "🌟"
              );
              setMessages(prev => [...prev, completionMsg]);
            }, 2000);
          }
          
          // Автоскролл после сообщения
          setTimeout(() => {
            if (chatScrollViewRef.current) {
              chatScrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        } catch (error) {
          console.error('Error with AI response:', error);
          setMessages(prev => [...prev, 
            createAIMessage("Извини, произошла ошибка с AI-системой. Но я все равно здесь для тебя! Продолжай делиться своими мыслями.")
          ]);
        }
      }, 1500 + Math.random() * 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, 
        createAIMessage("Произошла техническая ошибка. Попробуй еще раз, пожалуйста.")
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollViewRef.current) {
        chatScrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'milestone') {
      return (
        <View key={msg.id} style={[styles.milestoneMessage, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)' }]}>
          <Text style={[styles.milestoneText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {msg.text}
          </Text>
        </View>
      );
    }

    return (
      <View key={msg.id} style={[
        styles.messageContainer,
        msg.isUser ? styles.userMessage : styles.aiMessage
      ]}>
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: msg.isUser 
              ? '#6366F1'
              : (isDark ? '#374151' : '#FFFFFF'),
            borderColor: isDark ? '#4B5563' : '#E5E7EB'
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: msg.isUser ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#111827') }
          ]}>
            {msg.text}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            Загружаем день...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!day) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            День не найден
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.errorText, { color: '#FFFFFF' }]}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Шапка */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={[
              styles.dayNumberContainer,
              { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }
            ]}>
              <Text style={styles.dayNumber}>
                {day.id}
              </Text>
            </View>
            
            <View style={styles.titleContainer}>
              <Text style={[styles.dayTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {day.title}
              </Text>
              <Text style={[styles.daySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {day.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Прогресс дня */}
        <View style={[styles.progressSection, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Прогресс дня
            </Text>
            <Text style={[styles.progressText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {day.exercises.filter(e => e.isCompleted).length} / {day.exercises.length}
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
            <View style={[
              styles.progressFill,
              { 
                width: `${(day.exercises.filter(e => e.isCompleted).length / day.exercises.length) * 100}%`,
                backgroundColor: '#10B981'
              }
            ]} />
          </View>
        </View>

        {/* Чат секция */}
        <View style={[styles.chatSection, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', flex: 1 }]}>
          {/* Токен прогресс */}
          <View style={[styles.tokenProgress, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
            <View style={styles.tokenProgressContent}>
              <Text style={[styles.tokenProgressText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Токены: {totalTokensUsed} / {maxTokensPerDay}
              </Text>
              <View style={[styles.tokenProgressBar, { backgroundColor: isDark ? '#4B5563' : '#E5E7EB' }]}>
                <View style={[
                  styles.tokenProgressFill,
                  { 
                    width: `${Math.min((totalTokensUsed / maxTokensPerDay) * 100, 100)}%`,
                    backgroundColor: totalTokensUsed > maxTokensPerDay ? '#EF4444' : '#10B981'
                  }
                ]} />
              </View>
            </View>
            {totalTokensUsed > maxTokensPerDay * 0.8 && (
              <Text style={[styles.tokenWarning, { color: '#F59E0B' }]}>
                Приближаемся к лимиту дня
              </Text>
            )}
          </View>
          <ScrollView
            ref={chatScrollViewRef}
            style={styles.chatMessages}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(renderMessage)}
            
            {showAITyping && (
              <View style={[styles.messageContainer, styles.aiMessage]}>
                <View style={[
                  styles.messageBubble,
                  { backgroundColor: isDark ? '#374151' : '#FFFFFF', borderColor: isDark ? '#4B5563' : '#E5E7EB' }
                ]}>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, { backgroundColor: isDark ? '#9CA3AF' : '#6B7280' }]} />
                    <View style={[styles.typingDot, { backgroundColor: isDark ? '#9CA3AF' : '#6B7280' }]} />
                    <View style={[styles.typingDot, { backgroundColor: isDark ? '#9CA3AF' : '#6B7280' }]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Поле ввода */}
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
            <TextInput
              ref={messageInputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#374151' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#111827',
                  borderColor: isDark ? '#4B5563' : '#E5E7EB'
                }
              ]}
              placeholder={dayCompleted ? "День завершен! Увидимся завтра!" : "Напишите ваше сообщение..."}
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={!isProcessing && !dayCompleted}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!message.trim() || isProcessing) || dayCompleted) && styles.disabledSendButton
              ]}
              onPress={handleSendMessage}
              disabled={!message.trim() || isProcessing || dayCompleted}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : dayCompleted ? (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumberContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  titleContainer: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  daySubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chatSection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tokenProgress: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tokenProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenProgressText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 12,
  },
  tokenProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tokenProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tokenWarning: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  milestoneMessage: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  milestoneText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
});
