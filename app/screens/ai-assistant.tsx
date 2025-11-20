import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { generateAIChatResponse } from '../../services/localAI';

const { width, height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCards?: Array<{
    id: string;
    title: string;
    description: string;
    route: string;
    icon: string;
    color: string[];
  }>;
}

const AIAssistantScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я ваш ИИ-ассистент в приложении beHappy. Я помогу вам разобраться с функциями приложения и отвечу на вопросы о ментальном здоровье. Что вас интересует?',
      timestamp: new Date().toISOString(),
      functionCards: [
        {
          id: 'cbt-main',
          title: 'КПТ Терапия',
          description: 'Когнитивно-поведенческая терапия для работы с мыслями',
          route: '/screens/anulia',
          icon: 'psychology',
          color: ['#667eea', '#764ba2']
        },
        {
          id: 'tests',
          title: 'Тесты и оценки',
          description: 'Клинические шкалы и самооценка',
          route: '/screens/tests',
          icon: 'assessment',
          color: ['#ffecd2', '#fcb69f']
        },
        {
          id: 'meditation',
          title: 'Медитация',
          description: 'Практики осознанности и релаксации',
          route: '/screens/meditation',
          icon: 'self-improvement',
          color: ['#84fab0', '#8fd3f4']
        }
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickQuestions = [
    {
      id: 'what-is-cbt',
      text: 'Что такое КПТ?',
      icon: 'psychology',
    },
    {
      id: 'how-to-start',
      text: 'С чего начать?',
      icon: 'play-arrow',
    },
    {
      id: 'manage-anxiety',
      text: 'Как справиться с тревогой?',
      icon: 'favorite',
    },
    {
      id: 'meditation-help',
      text: 'Помощь с медитацией',
      icon: 'self-improvement',
    },
  ];

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      // Get chat history for context
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await generateAIChatResponse(text.trim(), chatHistory);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        functionCards: response.functionCards,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
        timestamp: new Date().toISOString(),
        functionCards: [
          {
            id: 'cbt-main',
            title: 'КПТ Терапия',
            description: 'Когнитивно-поведенческая терапия для работы с мыслями',
            route: '/screens/anulia',
            icon: 'psychology',
            color: ['#667eea', '#764ba2']
          },
          {
            id: 'meditation',
            title: 'Медитация',
            description: 'Практики осознанности и релаксации',
            route: '/screens/meditation',
            icon: 'self-improvement',
            color: ['#84fab0', '#8fd3f4']
          }
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleFunctionCardPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id} style={styles.messageContainer}>
        <View style={[
          styles.messageRow,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer
        ]}>
          {!isUser && (
            <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialIcons name="psychology" size={20} color="#fff" />
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isUser ? [styles.userBubble, { backgroundColor: isDark ? '#3b82f6' : '#000000' }] : [styles.assistantBubble, { backgroundColor: theme.colors.card }]
          ]}>
            <Text style={[
              styles.messageText,
              { color: isUser ? '#fff' : theme.colors.text }
            ]}>
              {message.content}
            </Text>
          </View>

          {isUser && (
            <View style={[styles.avatarContainer, { backgroundColor: theme.colors.textSecondary }]}>
              <MaterialIcons name="person" size={20} color="#fff" />
            </View>
          )}
        </View>
        
        {/* Function Cards */}
        {!isUser && message.functionCards && message.functionCards.length > 0 && (
          <View style={styles.functionCardsContainer}>
            <Text style={[styles.functionCardsTitle, { color: theme.colors.text }]}>
              Рекомендуемые функции:
            </Text>
            <View style={styles.functionCardsGrid}>
              {message.functionCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.functionCard}
                  onPress={() => handleFunctionCardPress(card.route)}
                >
                  <LinearGradient
                    colors={card.color}
                    style={styles.functionCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.functionCardIcon}>
                      <MaterialIcons name={card.icon as any} size={20} color="#fff" />
                    </View>
                    <View style={styles.functionCardContent}>
                      <Text style={styles.functionCardTitle}>{card.title}</Text>
                      <Text style={styles.functionCardDescription}>{card.description}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="psychology" size={24} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              ИИ-Ассистент
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Ваш помощник по ментальному здоровью
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={[styles.assistantBubble, { backgroundColor: theme.colors.card }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Думаю...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={[styles.quickQuestionsTitle, { color: theme.colors.text }]}>
              Быстрые вопросы:
            </Text>
            <View style={styles.quickQuestionsGrid}>
              {quickQuestions.map((question) => (
                <TouchableOpacity
                  key={question.id}
                  style={[styles.quickQuestionButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleQuickQuestion(question.text)}
                >
                  <MaterialIcons name={question.icon as any} size={20} color={theme.colors.primary} />
                  <Text style={[styles.quickQuestionText, { color: theme.colors.text }]}>
                    {question.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text 
            }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Задайте вопрос..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.textSecondary 
            }]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  functionCardsContainer: {
    marginTop: 8,
    marginLeft: 40,
    marginRight: 8,
  },
  functionCardsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  functionCardsGrid: {
    flexDirection: 'column',
  },
  functionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  functionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 64,
  },
  functionCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  functionCardContent: {
    flex: 1,
    marginRight: 8,
  },
  functionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  functionCardDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 15,
  },
  quickQuestionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  quickQuestionText: {
    fontSize: 14,
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIAssistantScreen;
