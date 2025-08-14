import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  StyleSheet,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { TokenProgressIndicator } from '../../components/TokenProgressIndicator';
import { ChatRecommendations } from '../../components/ChatRecommendations';
import { TokenManager, TokenUsage } from '../../services/tokenManager';
import {
  generateTherapeuticChatResponse,
  initializeTherapeuticChat,
  generateProblemWelcomeMessage,
  TherapeuticMessage,
  TherapeuticChatParams,
  generateSessionCompletionMessage,
  generateStructuredSessionRecommendations,
  AI_THERAPIST_ROLES
} from '../../services/localAI';
import { SessionManager } from '../../services/sessionManager';

// Card data definitions
const cards = [
  { id: 1, uri: require('../../assets/cards/positivenegative/1.jpg') },
  { id: 2, uri: require('../../assets/cards/positivenegative/2.jpg') },
  { id: 3, uri: require('../../assets/cards/positivenegative/3.jpg') },
  { id: 4, uri: require('../../assets/cards/positivenegative/4.jpg') },
  { id: 5, uri: require('../../assets/cards/positivenegative/5.jpg') },
  { id: 6, uri: require('../../assets/cards/positivenegative/6.jpg') },
  { id: 7, uri: require('../../assets/cards/positivenegative/7.jpg') },
  { id: 8, uri: require('../../assets/cards/positivenegative/8.jpg') },
  { id: 9, uri: require('../../assets/cards/positivenegative/9.jpg') },
  { id: 10, uri: require('../../assets/cards/positivenegative/10.jpg') },
  { id: 11, uri: require('../../assets/cards/positivenegative/11.jpg') },
  { id: 12, uri: require('../../assets/cards/positivenegative/12.jpg') },
  { id: 13, uri: require('../../assets/cards/positivenegative/13.jpg') },
  { id: 14, uri: require('../../assets/cards/positivenegative/14.jpg') },
  { id: 15, uri: require('../../assets/cards/positivenegative/15.jpg') },
  { id: 16, uri: require('../../assets/cards/positivenegative/16.jpg') },
  { id: 17, uri: require('../../assets/cards/positivenegative/17.jpg') },
  { id: 18, uri: require('../../assets/cards/positivenegative/18.jpg') },
  { id: 19, uri: require('../../assets/cards/positivenegative/19.jpg') },
  { id: 20, uri: require('../../assets/cards/positivenegative/20.jpg') },
];

const emotionCards = [
  { id: 1, uri: require('../../assets/cards/emotions/card1.jpg'), name: 'Радость' },
  { id: 2, uri: require('../../assets/cards/emotions/card2.jpg'), name: 'Печаль' },
  { id: 3, uri: require('../../assets/cards/emotions/card3.jpg'), name: 'Гнев' },
  { id: 4, uri: require('../../assets/cards/emotions/card4.jpg'), name: 'Страх' },
  { id: 5, uri: require('../../assets/cards/emotions/card5.jpg'), name: 'Удивление' },
  { id: 6, uri: require('../../assets/cards/emotions/card6.jpg'), name: 'Отвращение' },
  { id: 7, uri: require('../../assets/cards/emotions/card7.jpg'), name: 'Доверие' },
  { id: 8, uri: require('../../assets/cards/emotions/card8.jpg'), name: 'Ожидание' },
  { id: 9, uri: require('../../assets/cards/emotions/card9.jpg'), name: 'Восторг' },
  { id: 10, uri: require('../../assets/cards/emotions/card10.jpg'), name: 'Скорбь' },
  { id: 11, uri: require('../../assets/cards/emotions/card11.jpg'), name: 'Ярость' },
  { id: 12, uri: require('../../assets/cards/emotions/card12.jpg'), name: 'Тревога' },
  { id: 13, uri: require('../../assets/cards/emotions/card13.jpg'), name: 'Зависть' },
  { id: 14, uri: require('../../assets/cards/emotions/card14.jpg'), name: 'Надежда' },
  { id: 15, uri: require('../../assets/cards/emotions/card15.jpg'), name: 'Любовь' },
  { id: 16, uri: require('../../assets/cards/emotions/card16.jpg'), name: 'Одиночество' },
  { id: 17, uri: require('../../assets/cards/emotions/card17.jpg'), name: 'Гордость' },
  { id: 18, uri: require('../../assets/cards/emotions/card18.jpg'), name: 'Готовность' },
  { id: 19, uri: require('../../assets/cards/emotions/card19.jpg'), name: 'Покой' },
  { id: 20, uri: require('../../assets/cards/emotions/card20.jpg'), name: 'Удовлетворение' },
  { id: 21, uri: require('../../assets/cards/emotions/card21.jpg'), name: 'Эмпатия' },
];

const resourceCards = [
  { id: 1, uri: require('../../assets/cards/resources/card1.jpg'), name: 'Внутренняя сила' },
  { id: 2, uri: require('../../assets/cards/resources/card2.jpg'), name: 'Мудрость' },
  { id: 3, uri: require('../../assets/cards/resources/card3.jpg'), name: 'Творчество' },
  { id: 4, uri: require('../../assets/cards/resources/card4.jpg'), name: 'Устойчивость' },
  { id: 5, uri: require('../../assets/cards/resources/card5.jpg'), name: 'Интуиция' },
  { id: 6, uri: require('../../assets/cards/resources/card6.jpg'), name: 'Сострадание' },
  { id: 7, uri: require('../../assets/cards/resources/card7.jpg'), name: 'Гибкость' },
  { id: 8, uri: require('../../assets/cards/resources/card8.jpg'), name: 'Внутренний покой' },
  { id: 9, uri: require('../../assets/cards/resources/card9.jpg'), name: 'Смелость' },
  { id: 10, uri: require('../../assets/cards/resources/card10.jpg'), name: 'Внимательность' },
  { id: 11, uri: require('../../assets/cards/resources/card11.jpg'), name: 'Энергия' },
  { id: 12, uri: require('../../assets/cards/resources/card12.jpg'), name: 'Принятие' },
  { id: 13, uri: require('../../assets/cards/resources/card13.jpg'), name: 'Ясность' },
  { id: 14, uri: require('../../assets/cards/resources/card14.jpg'), name: 'Независимость' },
  { id: 15, uri: require('../../assets/cards/resources/card15.jpg'), name: 'Целостность' },
  { id: 16, uri: require('../../assets/cards/resources/card16.jpg'), name: 'Трансформация' },
  { id: 17, uri: require('../../assets/cards/resources/card17.jpg'), name: 'Исцеление' },
  { id: 18, uri: require('../../assets/cards/resources/card18.jpg'), name: 'Вдохновение' },
  { id: 19, uri: require('../../assets/cards/resources/card19.jpg'), name: 'Баланс' },
  { id: 20, uri: require('../../assets/cards/resources/card20.jpg'), name: 'Освобождение' },
  { id: 21, uri: require('../../assets/cards/resources/card21.jpg'), name: 'Осознанность' },
];

const innerChildCards = [
  { id: 1, uri: require('../../assets/cards/innerchild/1.jpg'), name: 'Детская радость' },
  { id: 2, uri: require('../../assets/cards/innerchild/2.jpg'), name: 'Игривость' },
  { id: 3, uri: require('../../assets/cards/innerchild/3.jpg'), name: 'Чистота' },
  { id: 4, uri: require('../../assets/cards/innerchild/4.jpg'), name: 'Доверие' },
  { id: 5, uri: require('../../assets/cards/innerchild/5.jpg'), name: 'Любопытство' },
  { id: 6, uri: require('../../assets/cards/innerchild/6.jpg'), name: 'Спонтанность' },
  { id: 7, uri: require('../../assets/cards/innerchild/7.jpg'), name: 'Невинность' },
  { id: 8, uri: require('../../assets/cards/innerchild/8.jpg'), name: 'Творческая свобода' },
  { id: 9, uri: require('../../assets/cards/innerchild/9.jpg'), name: 'Безусловная любовь' },
  { id: 10, uri: require('../../assets/cards/innerchild/10.jpg'), name: 'Мечты' },
  { id: 11, uri: require('../../assets/cards/innerchild/11.jpg'), name: 'Исцеление травм' },
  { id: 12, uri: require('../../assets/cards/innerchild/12.jpg'), name: 'Внутренняя защита' },
  { id: 13, uri: require('../../assets/cards/innerchild/13.jpg'), name: 'Принятие себя' },
  { id: 14, uri: require('../../assets/cards/innerchild/14.jpg'), name: 'Эмоциональная честность' },
  { id: 15, uri: require('../../assets/cards/innerchild/15.jpg'), name: 'Забота о себе' },
  { id: 16, uri: require('../../assets/cards/innerchild/16.jpg'), name: 'Внутренний родитель' },
  { id: 17, uri: require('../../assets/cards/innerchild/17.jpg'), name: 'Интеграция' },
  { id: 18, uri: require('../../assets/cards/innerchild/18.jpg'), name: 'Возвращение домой' },
  { id: 19, uri: require('../../assets/cards/innerchild/19.jpg'), name: 'Прощение' },
  { id: 20, uri: require('../../assets/cards/innerchild/20.jpg'), name: 'Новое начало' },
  { id: 21, uri: require('../../assets/cards/innerchild/21.jpg'), name: 'Целостность' },
];

const narrativeCards = [
  { id: 1, uri: require('../../assets/cards/narrative/1.jpg'), name: 'Новое начало истории' },
  { id: 2, uri: require('../../assets/cards/narrative/2.jpg'), name: 'Переписывание сценария' },
  { id: 3, uri: require('../../assets/cards/narrative/3.jpg'), name: 'Поиск голоса' },
  { id: 4, uri: require('../../assets/cards/narrative/4.jpg'), name: 'Освобождение от старых ролей' },
  { id: 5, uri: require('../../assets/cards/narrative/5.jpg'), name: 'Создание новой идентичности' },
  { id: 6, uri: require('../../assets/cards/narrative/6.jpg'), name: 'Исследование альтернативных путей' },
  { id: 7, uri: require('../../assets/cards/narrative/7.jpg'), name: 'Деконструкция проблем' },
  { id: 8, uri: require('../../assets/cards/narrative/8.jpg'), name: 'Обнаружение скрытых навыков' },
  { id: 9, uri: require('../../assets/cards/narrative/9.jpg'), name: 'Связь с ценностями' },
  { id: 10, uri: require('../../assets/cards/narrative/10.jpg'), name: 'Создание предпочтительной истории' },
  { id: 11, uri: require('../../assets/cards/narrative/11.jpg'), name: 'Поиск уникальных результатов' },
  { id: 12, uri: require('../../assets/cards/narrative/12.jpg'), name: 'Расширение истории' },
  { id: 13, uri: require('../../assets/cards/narrative/13.jpg'), name: 'Культурное влияние' },
  { id: 14, uri: require('../../assets/cards/narrative/14.jpg'), name: 'Социальная реконструкция' },
  { id: 15, uri: require('../../assets/cards/narrative/15.jpg'), name: 'Авторство жизни' },
  { id: 16, uri: require('../../assets/cards/narrative/16.jpg'), name: 'Свидетели изменений' },
  { id: 17, uri: require('../../assets/cards/narrative/17.jpg'), name: 'Ритуалы перехода' },
  { id: 18, uri: require('../../assets/cards/narrative/18.jpg'), name: 'Наследие и мудрость' },
  { id: 19, uri: require('../../assets/cards/narrative/19.jpg'), name: 'Будущие возможности' },
  { id: 20, uri: require('../../assets/cards/narrative/20.jpg'), name: 'Празднование прогресса' },
  { id: 21, uri: require('../../assets/cards/narrative/21.jpg'), name: 'Живая история' },
];

// Styles function
const createChatStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface || (isDark ? '#1a1a2e' : '#ffffff'),
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border || (isDark ? '#2a2a40' : '#e5e7eb'),
    shadowColor: isDark ? '#ffffff' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary || '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text || (isDark ? '#ffffff' : '#1f2937'),
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted || (isDark ? '#9ca3af' : '#6b7280'),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 12,
  },
  menuButton: {
    padding: 8,
  },
  completeButton: {
    padding: 8,
    marginRight: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary || '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarPlaceholder: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessage: {
    backgroundColor: theme.colors.primary || '#6366f1',
    borderBottomRightRadius: 4,
    shadowColor: isDark ? '#ffffff' : '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.1 : 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aiMessage: {
    backgroundColor: theme.colors.surface || (isDark ? '#2a2a40' : '#f3f4f6'),
    borderBottomLeftRadius: 4,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#3a3a50' : 'transparent',
    shadowColor: isDark ? '#ffffff' : '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: theme.colors.text || '#1f2937',
  },
  cardsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  cardWrapper: {
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  simpleCardImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  cardNumber: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
  emotionName: {
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
    maxWidth: 60,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textMuted || '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.surface || (isDark ? '#1f1f35' : '#f9f9fb'),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border || (isDark ? '#2a2a40' : '#e5e7eb'),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: Platform.OS === 'web' ? 100 : 10, // Higher zIndex for web
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 0,
    ...(Platform.OS === 'web' && {
      position: 'fixed', // Use fixed position on web
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      paddingBottom: 16,
    }),
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border || (isDark ? '#3a3a50' : '#e5e7eb'),
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
    backgroundColor: theme.colors.background || (isDark ? '#2a2a40' : '#ffffff'),
    color: theme.colors.text || (isDark ? '#ffffff' : '#1f2937'),
    textAlignVertical: 'center',
    shadowColor: isDark ? '#ffffff' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 3,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: isDark ? '#ffffff' : '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.1 : 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary || '#6366f1',
    transform: [{ scale: 1.03 }],
  },
  sendButtonInactive: {
    backgroundColor: isDark ? '#3a3a50' : '#e0e0e5',
    opacity: 0.8,
  },
  readOnlyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: theme.colors.surface || (isDark ? '#2a2a40' : '#f9fafb'),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border || (isDark ? '#2a2a40' : '#e5e7eb'),
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: Platform.OS === 'web' ? '100%' : undefined,
    zIndex: Platform.OS === 'web' ? 100 : 10,
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  readOnlyText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

// Helper function to detect web platform
const isWeb = Platform.OS === 'web';

export default function ChatScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as any;
  const [messages, setMessages] = useState<TherapeuticMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [sessionRecommendations, setSessionRecommendations] = useState<any>(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    sessionId: '',
    tokensUsed: 0,
    maxTokens: 10000,
    messagesCount: 0,
    estimatedTokensPerMessage: 150,
    lastUpdated: new Date()
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    // For web, listen to window resize events
    if (isWeb) {
      const handleResize = () => {
        setWindowDimensions(Dimensions.get('window'));
      };

      Dimensions.addEventListener('change', handleResize);
      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
        // Clean up the event listener
        Dimensions.removeEventListener('change', handleResize);
      };
    }

    // Clean up listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      setInitializing(true);
      
      try {
        // Check if this is a read-only mode (viewing completed session)
        if (params?.readOnly === 'true') {
          setReadOnlyMode(true);
          if (params?.sessionId) {
            const session = await SessionManager.getSession(params.sessionId);
            if (session) {
              setMessages(session.messages);
              setCurrentSessionId(session.id);
              
              // Load recommendations if available
              if (session.recommendations && session.recommendations.length > 0) {
                setSessionRecommendations({
                  recommendations: session.recommendations,
                  completionMessage: session.completionMessage || '',
                  sessionSummary: session.completionSummary || '',
                  therapistName: session.therapistRole?.name || 'Ваш AI-помощник'
                });
              }
            }
          }
          setInitializing(false);
          return;
        }

        // Check if we're resuming an existing session
        if (params?.sessionId) {
          const session = await SessionManager.getSession(params.sessionId);
          if (session) {
            setMessages(session.messages);
            setCurrentSessionId(session.id);
            setInitializing(false);
            return;
          }
        }

        // Only initialize new session if we haven't already (messages array is empty)
        if (messages.length > 0) return;

        let welcomeMessage: TherapeuticMessage;
        let sessionId: string | null = null;

        // Check if we have a problem-specific context
        if (params?.categoryId && params?.problemContext) {
          // Generate AI welcome message for the specific problem
          const welcomeText = await generateProblemWelcomeMessage(
            params.categoryId as any,
            params.problemContext
          );
          
          welcomeMessage = {
            id: Date.now().toString(),
            text: welcomeText,
            isUser: false,
          };

          // Create new session for problem-specific therapy
          const therapistRole = params?.therapistRole ? JSON.parse(params.therapistRole) : null;
          if (therapistRole) {
            sessionId = await SessionManager.createSession(
              params.categoryId,
              params.problemContext,
              therapistRole,
              welcomeMessage
            );
            setCurrentSessionId(sessionId);
          }
        } else {
          // Use the regular initialization for other contexts
          const chatParams: TherapeuticChatParams = {
            context: params?.context,
            positive_card_id: params?.positive_card_id ? parseInt(params.positive_card_id) : undefined,
            negative_card_id: params?.negative_card_id ? parseInt(params.negative_card_id) : undefined,
            cardId: params?.cardId ? parseInt(params.cardId) : undefined,
            therapistRole: params?.therapistRole,
            problemContext: params?.problemContext,
            categoryId: params?.categoryId,
          };

          welcomeMessage = await initializeTherapeuticChat(
            chatParams,
            cards,
            emotionCards,
            resourceCards,
            innerChildCards,
            narrativeCards
          );
        }

        const initialMessages = [welcomeMessage];
        setMessages(initialMessages);

        // Session is already created with the welcome message for problem-specific therapy
        // No need to save separately since it was included in createSession

      } catch (error) {
        console.error('Error initializing chat:', error);
        // Fallback welcome message in case of error
        const fallbackMessage: TherapeuticMessage = {
          id: Date.now().toString(),
          text: 'Привет! Я Anulya, ваш персональный психолог. Как дела? Что вас беспокоит?',
          isUser: false,
        };
        setMessages([fallbackMessage]);
      } finally {
        setInitializing(false);
      }
    };

    initializeChat();
  }, [params]);

  // Load token usage when session is available
  useEffect(() => {
    const loadTokenUsage = async () => {
      if (currentSessionId) {
        const usage = await TokenManager.getTokenUsage(currentSessionId);
        setTokenUsage(usage);
      }
    };
    
    loadTokenUsage();
  }, [currentSessionId]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading || readOnlyMode) return;

    // Check token limit before sending
    const isLimitReached = await TokenManager.isTokenLimitReached(currentSessionId || '');
    if (isLimitReached) {
      console.log('Token limit reached, completing session...');
      await completeSession();
      return;
    }

    // Check if user wants to end session early
    const lowerInput = inputText.toLowerCase().trim();
    const endSessionPhrases = [
      'спасибо', 'закончить', 'хватит', 'достаточно', 'завершить', 'конец',
      'больше нет вопросов', 'все', 'закрыть', 'до свидания', 'пока',
      'благодарю', 'заканчиваем', 'решил проблему', 'проблема решена',
      'все понятно', 'помогли', 'разобрались'
    ];
    
    // Check for confirmation phrases
    const confirmationPhrases = [
      'да', 'конечно', 'точно', 'да, завершить', 'да завершить', 
      'точно завершить', 'конечно завершить', 'подтверждаю',
      'согласен', 'согласна', 'хочу завершить'
    ];
    
    const isEndingSession = endSessionPhrases.some(phrase => lowerInput.includes(phrase));
    const isConfirmingEnd = confirmationPhrases.some(phrase => lowerInput.includes(phrase));
    
    // Check if this is a response to a previous confirmation request
    const lastAIMessage = messages.filter(m => !m.isUser).slice(-1)[0];
    const isConfirmationRequest = lastAIMessage && (
      lastAIMessage.text.includes('готовы завершить') || 
      lastAIMessage.text.includes('действительно готовы') ||
      lastAIMessage.text.includes('хотите закончить')
    );
    
    if (isConfirmationRequest && isConfirmingEnd) {
      // User confirmed session end
      await completeSession();
      return;
    }
    
    if (isEndingSession && !isConfirmationRequest) {
      // User wants to end session, but we haven't asked for confirmation yet
      // Let the AI handle this and ask for confirmation
      // The AI will decide whether to ask for confirmation or end immediately
    }

    const userMessage: TherapeuticMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setLoading(true);

    try {
      // Save user message to session
      if (currentSessionId) {
        await SessionManager.addMessageToSession(currentSessionId, userMessage);
        
        // Update token usage for user message
        const updatedUsage = await TokenManager.updateTokenUsage(currentSessionId, userMessage.text);
        setTokenUsage(updatedUsage);
      }

      const chatParams: TherapeuticChatParams = {
        context: params?.context,
        positive_card_id: params?.positive_card_id ? parseInt(params.positive_card_id) : undefined,
        negative_card_id: params?.negative_card_id ? parseInt(params.negative_card_id) : undefined,
        cardId: params?.cardId ? parseInt(params.cardId) : undefined,
        therapistRole: params?.therapistRole,
        problemContext: params?.problemContext,
        categoryId: params?.categoryId,
      };

      const aiMessage = await generateTherapeuticChatResponse(
        userMessage,
        messages,
        chatParams,
        cards,
        emotionCards,
        resourceCards,
        innerChildCards,
        narrativeCards,
        tokenUsage
      );
      
      setMessages(prev => [...prev, aiMessage]);

      // Check if AI requested session closure
      if (aiMessage.text.includes('SESSION_CLOSE_REQUEST')) {
        // Remove the SESSION_CLOSE_REQUEST from the message text
        const cleanedText = aiMessage.text.replace(/SESSION_CLOSE_REQUEST/g, '').trim();
        
        // Update the message with cleaned text
        aiMessage.text = cleanedText;
        
        // Only add the message if there's actual content after removing SESSION_CLOSE_REQUEST
        if (cleanedText) {
          setMessages(prev => [...prev, aiMessage]);
          
          // Save AI message to session only if there's content
          if (currentSessionId) {
            await SessionManager.addMessageToSession(currentSessionId, aiMessage);
            const updatedUsage = await TokenManager.updateTokenUsage(currentSessionId, aiMessage.text);
            setTokenUsage(updatedUsage);
          }
        }
        
        // Complete session immediately
        setTimeout(() => completeSession(), 1000);
        return;
      }

      // Save AI message to session and update token usage
      if (currentSessionId) {
        await SessionManager.addMessageToSession(currentSessionId, aiMessage);
        
        // Update token usage for AI message
        const updatedUsage = await TokenManager.updateTokenUsage(currentSessionId, aiMessage.text);
        setTokenUsage(updatedUsage);
        
        // Check if we're approaching token limit
        const limitReached = await TokenManager.isTokenLimitReached(currentSessionId);
        if (limitReached) {
          setTimeout(() => completeSession(), 1000);
        }
      }
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Simple error message without alert
      const errorMessage: TherapeuticMessage = {
        id: Date.now().toString(),
        text: 'Извините, возникла ошибка при отправке сообщения. Попробуйте еще раз.',
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const completeSession = async () => {
    if (!currentSessionId) return;
    
    try {
      // Show loading indicator for recommendations generation
      setGeneratingRecommendations(true);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Get current session to access therapist role
      const session = await SessionManager.getSession(currentSessionId);
      if (!session) return;
      
      // Generate structured recommendations with AI
      const structuredData = await generateStructuredSessionRecommendations(
        messages,
        session.therapistRole,
        session.problemContext
      );

      // Set the recommendations to be displayed by ChatRecommendations component
      setSessionRecommendations({
        recommendations: structuredData.recommendations || [],
        completionMessage: structuredData.completionMessage || '',
        sessionSummary: structuredData.sessionSummary || '',
        therapistName: session.therapistRole.name || 'Ваш AI-помощник'
      });

      // Save recommendations to session storage
      await SessionManager.completeSession(
        currentSessionId,
        structuredData.recommendations || [],
        structuredData.sessionSummary || '',
        structuredData.completionMessage || ''
      );
      
      // Reset token usage for this session
      await TokenManager.resetTokenUsage(currentSessionId);
      
      // Mark as read-only
      setReadOnlyMode(true);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Error completing session:', error);
      
      // Show error recommendations
      setSessionRecommendations({
        recommendations: [{
          title: "Ошибка генерации рекомендаций",
          description: "Не удалось сгенерировать персональные рекомендации. Пожалуйста, попробуйте позже.",
          category: "general",
          icon: "exclamation-triangle",
          actionSteps: ["Попробуйте начать новую сессию", "Обратитесь к специалисту при необходимости"],
          expectedResult: "Получение квалифицированной помощи"
        }],
        completionMessage: "Произошла ошибка при создании рекомендаций",
        sessionSummary: "Сессия завершена с ошибкой",
        therapistName: "Система"
      });
      
      setReadOnlyMode(true);
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const styles = createChatStyles(theme, isDark);

  const renderMessage = (message: TherapeuticMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageRow,
        message.isUser ? styles.userMessageRow : styles.aiMessageRow,
      ]}
    >
      {!message.isUser && (
        <View style={styles.avatarSmall}>
          <FontAwesome5 name="brain" size={12} color="#ffffff" />
        </View>
      )}
      
      <View
        style={[
          styles.messageContainer,
          message.isUser ? styles.userMessage : styles.aiMessage,
        ]}
      >
        <Text style={[
          styles.messageText,
          message.isUser ? styles.userMessageText : styles.aiMessageText,
        ]}>
          {message.text}
        </Text>
        
        {/* Card images if available - simplified version */}
        {!message.isUser && message.cardImages && (
          <View style={styles.cardsRow}>
            {message.cardImages.positiveId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={cards.find(card => card.id === message.cardImages!.positiveId)?.uri || require('../../assets/cards/positivenegative/1.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.positiveId}</Text>
              </View>
            )}
            {message.cardImages.negativeId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={cards.find(card => card.id === message.cardImages!.negativeId)?.uri || require('../../assets/cards/positivenegative/11.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.negativeId}</Text>
              </View>
            )}
            {message.cardImages.emotionId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={emotionCards.find(card => card.id === message.cardImages!.emotionId)?.uri || require('../../assets/cards/emotions/card1.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.emotionId}</Text>
                {/* Add emotion name */}
                {message.cardImages.emotionId && (
                  <Text style={[styles.emotionName, { color: theme.colors.text }]}>
                    {emotionCards.find(card => card.id === message.cardImages!.emotionId)?.name || 'Эмоция'}
                  </Text>
                )}
              </View>
            )}

            {message.cardImages.resourceId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={resourceCards.find(card => card.id === message.cardImages!.resourceId)?.uri || require('../../assets/cards/resources/card1.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.resourceId}</Text>
                {/* Add resource name */}
                {message.cardImages.resourceId && (
                  <Text style={[styles.emotionName, { color: theme.colors.text }]}>
                    {resourceCards.find(card => card.id === message.cardImages!.resourceId)?.name || 'Ресурс'}
                  </Text>
                )}
              </View>
            )}

            {message.cardImages.innerChildId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={innerChildCards.find(card => card.id === message.cardImages!.innerChildId)?.uri || require('../../assets/cards/innerchild/1.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.innerChildId}</Text>
                {/* Add inner child name */}
                {message.cardImages.innerChildId && (
                  <Text style={[styles.emotionName, { color: theme.colors.text }]}>
                    {innerChildCards.find(card => card.id === message.cardImages!.innerChildId)?.name || 'Внутренний ребенок'}
                  </Text>
                )}
              </View>
            )}

            {message.cardImages.narrativeId && (
              <View style={styles.cardWrapper}>
                <Image
                  source={narrativeCards.find(card => card.id === message.cardImages!.narrativeId)?.uri || require('../../assets/cards/narrative/1.jpg')}
                  style={styles.simpleCardImage}
                  resizeMode="cover"
                />
                <Text style={[styles.cardNumber, { color: theme.colors.text }]}>#{message.cardImages.narrativeId}</Text>
                {/* Add narrative therapy name */}
                {message.cardImages.narrativeId && (
                  <Text style={[styles.emotionName, { color: theme.colors.text }]}>
                    {narrativeCards.find(card => card.id === message.cardImages!.narrativeId)?.name || 'Нарративная терапия'}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
      
      {message.isUser && (
        <View style={styles.userAvatarPlaceholder} />
      )}
    </View>
  );

  // Calculate dimensions for proper layout
  const tabBarHeight = Platform.OS === 'ios' ? 80 : 65;
  const inputContainerHeight = 70;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <FontAwesome5 name="brain" size={22} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Anulya</Text>
            <Text style={styles.headerSubtitle}>Персональный психолог</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusIndicator} />
          
          {/* Token Progress Indicator - compact for header */}
          {!readOnlyMode && (
            <TokenProgressIndicator
              tokensUsed={tokenUsage.tokensUsed}
              maxTokens={tokenUsage.maxTokens}
              messagesCount={tokenUsage.messagesCount}
              isCompact={true}
            />
          )}

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => console.log('Session info')}
          >
            <FontAwesome5 name="info-circle" size={18} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat interface */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        enabled={!isWeb} // Disable keyboard avoiding view on web
      >
          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[
              styles.messagesContent,
              { paddingBottom: isWeb ? 180 : (Platform.OS === 'ios' ? 150 : 130) }
            ]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
        {initializing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Anulya готовится к встрече...</Text>
          </View>
        ) : (
          <>
            {messages.map(renderMessage)}
            {sessionRecommendations && (
              <ChatRecommendations recommendations={sessionRecommendations} />
            )}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.loadingText}>Anulya печатает...</Text>
              </View>
            )}
            {generatingRecommendations && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Создаю персональные рекомендации...</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

        {/* Input container - positioned at the bottom */}
        {!readOnlyMode ? (
          <View style={[
            styles.inputContainer,
            isWeb ? 
            {
              paddingBottom: 16,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
            } : 
            { 
              bottom: keyboardVisible ? keyboardHeight - (Platform.OS === 'ios' ? 10 : 4) : 0,
              paddingBottom: keyboardVisible ? 12 : Platform.OS === 'ios' ? insets.bottom + 16 : 16
            }
          ]}>
            <TouchableOpacity 
              style={{ marginRight: 8, opacity: 0.8, padding: 4, width: 36, alignItems: 'center' }}
              onPress={() => Alert.alert('BeHappy', 'Функция эмодзи будет добавлена в следующей версии')}
            >
              <FontAwesome5 
                name="smile" 
                size={22} 
                color={theme.colors.primary || (isDark ? '#9ca3af' : '#6b7280')} 
                solid
              />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Напишите сообщение..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={1000}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            <TouchableOpacity 
              style={[styles.sendButton, inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <FontAwesome5 
                  name="paper-plane" 
                  size={18} 
                  color={inputText.trim() ? "#ffffff" : theme.colors.textMuted} 
                  solid
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.readOnlyIndicator,
            isWeb && { position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%' }
          ]}>
            <FontAwesome5 name="history" size={18} color={theme.colors.primary} solid />
            <Text style={[styles.readOnlyText, { color: theme.colors.textSecondary }]}>
              Режим просмотра сеанса
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
