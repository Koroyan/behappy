import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import ArtTherapyProgramManager, { ART_THERAPY_SESSIONS, SessionProgress } from '../services/artTherapyProgram';
import artTherapyService, { ArtTherapyResponse, ChatMessage } from '../services/artTherapyService';
import TypingIndicator from './TypingIndicator';

const { width } = Dimensions.get('window');

interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isUser }) => {
  // Reduce console logging in production for better performance
  if (__DEV__) {
    console.log('📱 MessageBubble render:', {
      messageId: message.id,
      hasImageUri: !!message.imageUri,
      hasImageBase64: !!message.imageBase64,
    });
  }

  const hasImage = message.imageUri || message.imageBase64;
  
  // Fix: Create proper data URI for base64 images
  let imageSource = message.imageUri;
  if (!imageSource && message.imageBase64) {
    // Convert raw base64 to data URI for display
    imageSource = `data:image/jpeg;base64,${message.imageBase64}`;
  }

  // Only log in development
  if (__DEV__ && hasImage) {
    console.log('🖼️ Image display logic:', {
      hasImage,
      useImageUri: !!message.imageUri,
      useBase64: !message.imageUri && !!message.imageBase64,
      finalSource: imageSource?.substring(0, 50)
    });
  }

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {hasImage && imageSource && (
        <View style={styles.imageContainer}>
          {__DEV__ && (
            <Text style={styles.debugText}>🖼️ IMAGE SOURCE: {imageSource.substring(0, 30)}...</Text>
          )}
          <Image 
            source={{ uri: imageSource }} 
            style={styles.messageImage}
            resizeMode="cover"
            onLoad={() => {
              if (__DEV__) {
                console.log('✅ Image loaded successfully:', imageSource.substring(0, 50));
              }
            }}
            onError={(error) => {
              console.error('❌ Image display error:', error.nativeEvent.error);
            }}
          />
        </View>
      )}
      
      <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
        {message.content}
      </Text>

      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
});

export default function ArtTherapySessionChat() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const sessionId = parseInt(params.sessionId as string);

  const [session] = useState(() => ART_THERAPY_SESSIONS.find(s => s.id === sessionId));
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2>(0);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null);
  const [firstDrawingUri, setFirstDrawingUri] = useState<string | null>(null);
  const [secondDrawingUri, setSecondDrawingUri] = useState<string | null>(null);
  const [requiredInput, setRequiredInput] = useState<'none' | 'text' | 'image_v1' | 'image_v2'>('none');
  const [sessionComplete, setSessionComplete] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    // Use both refs depending on which is active
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      } else if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (!isInitializing && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isInitializing, scrollToBottom]);

  const initializeSession = useCallback(async () => {
    try {
      setIsInitializing(true);
      
      if (!session) {
        Alert.alert('Error', 'Session not found');
        router.back();
        return;
      }

      // Use setTimeout to make initialization non-blocking
      setTimeout(async () => {
        try {
          // Load existing progress or start new session
          const progress = await ArtTherapyProgramManager.getProgress();
          const existingProgress = progress.get(sessionId);

          if (existingProgress) {
            setSessionProgress(existingProgress);
            setCurrentPhase(existingProgress.phase);
            setFirstDrawingUri(existingProgress.firstDrawingUri || null);
            setSecondDrawingUri(existingProgress.secondDrawingUri || null);
            
            // Load chat history
            if (existingProgress.chatHistory && existingProgress.chatHistory.length > 0) {
              setMessages(existingProgress.chatHistory);
            } else {
              sendWelcomeMessage();
            }
          } else {
            // Start new session
            const newProgress = await ArtTherapyProgramManager.startSession(sessionId);
            setSessionProgress(newProgress);
            sendWelcomeMessage();
          }
        } catch (error) {
          console.error('Session initialization error:', error);
        } finally {
          setIsInitializing(false);
        }
      }, 50); // Small delay to allow UI to render first
    } catch (error) {
      console.error('Session setup error:', error);
      setIsInitializing(false);
    }
  }, [session, sessionId, router, language]);

  const sendWelcomeMessage = useCallback(() => {
    const welcomeMessages = {
      en: `Welcome to Session ${sessionId}: ${session?.title.en}\n\n${session?.description.en}\n\n📝 Drawing Prompt:\n${session?.drawingPrompt.en}\n\nWhen you're ready, tap 📷 to take a photo or �️ to pick from your gallery.`,
      ka: `კეთილი იყოს შენი მობრძანება სესიაზე ${sessionId}: ${session?.title.ka}\n\n${session?.description.ka}\n\n📝 ხატვის დავალება:\n${session?.drawingPrompt.ka}\n\nროდესაც მზად ხარ, დააჭირე 📷 ღილაკს ფოტოს გადასაღებად ან �️ გალერეიდან ასარჩევად.`,
      ru: `Добро пожаловать на сессию ${sessionId}: ${session?.title.ru}\n\n${session?.description.ru}\n\n📝 Задание для рисунка:\n${session?.drawingPrompt.ru}\n\nКогда будете готовы, нажмите 📷 чтобы сделать фото или �️ чтобы выбрать из галереи.`,
      hy: `Բարի գալուստ ${sessionId} նիստ: ${session?.title.hy}\n\n${session?.description.hy}\n\n📝 Նկարչական հանձնարարություն:\n${session?.drawingPrompt.hy}\n\nԵրբ պատրաստ եք, սեղմեք 📷՝ լուսանկարելու համար կամ �️՝ պատկեր ընտրելու համար:`,
    };

    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: welcomeMessages[language],
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  }, [sessionId, session, language]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitializing && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isInitializing, scrollToBottom]);

  const handleImagePicker = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          language === 'ka' ? 'საჭიროა ნებართვა' : language === 'ru' ? 'Требуется разрешение' : language === 'hy' ? 'Պետք է թույլատրություն' : 'Permission Required',
          language === 'ka' ? 'გთხოვ მიეცი სრული წვდომა ფოტოებზე, რომ შევძლოთ გალერედან არჩევა.' : language === 'ru' ? 'Пожалуйста, предоставьте полный доступ к фото, чтобы выбрать из галереи.' : language === 'hy' ? 'Խնդրում ենք տրամադրել լիարժեք մուտք լուսանկարներին՝ ընտրելու համար.' : 'Please grant full access to photos to pick from gallery.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as any],
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 1,
        allowsMultipleSelection: false,
        base64: true, // Request base64 data directly
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // Force compatible format
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Pass the asset with base64 data directly
        await handleImageSubmit(asset);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert(
          language === 'ka' ? 'საჭიროა კამერის ნებართვა' : language === 'ru' ? 'Требуется доступ к камере' : language === 'hy' ? 'Պետք է տեսախցիկի թույլատվություն' : 'Camera Permission',
          language === 'ka' ? 'გთხოვ მისცე აპლიკაციას კამერაზე წვდომა ფოტოს გადასაღებად.' : language === 'ru' ? 'Пожалуйста, разрешите доступ к камере, чтобы сделать фото.' : language === 'hy' ? 'Խնդրում ենք թույլատրել տեսախցիկի մուտքը՝ լուսանկարելու համար.' : 'Please allow camera access to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images' as any],
        quality: 0.8,
        allowsEditing: false,
        base64: true, // Request base64 data directly
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // Force compatible format
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Pass the asset with base64 data directly
        await handleImageSubmit(asset);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleImageSubmit = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    let userMessageId: string | null = null;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('📸 handleImageSubmit called');
      console.log('  - asset URI:', asset.uri?.substring(0, 100));
      console.log('  - has base64:', !!asset.base64);
      console.log('  - base64 length:', asset.base64?.length || 0);
      console.log('  - currentPhase:', currentPhase);

      // Store drawing based on phase
      if (currentPhase === 0) {
        setFirstDrawingUri(asset.uri);
      } else if (currentPhase === 1) {
        setSecondDrawingUri(asset.uri);
      }

      // Process image through service with the full asset
      console.log('⚙️ Converting image to JPEG via service...');
      const imageResult = await artTherapyService.prepareImageForAPI(asset);
      console.log('✅ Image converted to JPEG format');
      console.log('  - Display URI length:', imageResult.displayUri.length);
      console.log('  - Base64 length:', imageResult.base64.length);
      console.log('  - Base64 prefix:', imageResult.base64.substring(0, 50));

      // Create language-specific image description
      const imageDescriptions = {
        en: "Here is my drawing for this session.",
        ka: "აი ჩემი ნახატი ამ სესიისთვის.",
        ru: "Вот мой рисунок для этой сессии.",
        hy: "Ահա իմ նկարը այս նիստի համար։"
      };

      // Create user message with image - use base64 for display reliability
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: imageDescriptions[language],
        timestamp: new Date(),
        imageUri: imageResult.base64, // Use base64 data URI for reliable display
        imageBase64: imageResult.base64 // Data URI for API calls
      };
      
      userMessageId = userMessage.id;

      console.log('✅ User message created with image');
      console.log('  - Message ID:', userMessage.id);
      console.log('  - Has imageUri:', !!userMessage.imageUri);
      console.log('  - Has imageBase64:', !!userMessage.imageBase64);
      console.log('  - ImageUri type:', typeof userMessage.imageUri);
      console.log('  - ImageUri starts with data:', userMessage.imageUri?.startsWith('data:'));
      console.log('  - ImageUri preview:', userMessage.imageUri?.substring(0, 50));
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Send to AI for analysis
      console.log('📤 Sending to AI...');
      const response = await artTherapyService.sendMessage(
        [...messages, userMessage],
        session?.theme[language] || '',
        language,
        currentPhase
      );

      console.log('✅ AI response received');
      console.log('  - response_text length:', response.response_text.length);
      console.log('  - session_phase:', response.session_phase);
      console.log('  - session_complete:', response.session_complete);

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response_text,
        timestamp: new Date(),
        clinicalData: response
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update flow control
      setRequiredInput(response.required_input || 'none');
      setCurrentPhase(response.session_phase);

      // If session completed, show summary and finish
      if (response.session_complete) {
        setSessionComplete(true);

        if (response.session_summary) {
          const summaryTitles = {
            en: '✨ Session Summary',
            ka: '✨ სესიის შეჯამება',
            ru: '✨ Итоги сессии',
            hy: '✨ Նիստի ամփոփում'
          } as const;

          const summaryMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `${summaryTitles[language]}:\n\n${response.session_summary}`,
            timestamp: new Date(),
            clinicalData: response // Save clinical data with summary
          };
          setMessages(prev => [...prev, summaryMessage]);
        }

        // Save complete session with all messages including summary
        const allMessages = [...messages, userMessage, assistantMessage];
        if (response.session_summary) {
          const summaryMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✨ სესიის შეჯამება:\n\n${response.session_summary}`,
            timestamp: new Date(),
            clinicalData: response
          };
          allMessages.push(summaryMessage);
        }

        await saveProgress(allMessages, response, response.session_phase);
        await ArtTherapyProgramManager.completeSession(
          sessionId,
          response,
          allMessages
        );
        setTimeout(() => {
          showCompletionDialog(response);
        }, 1200);
        return;
      }

      // Phase 0 complete -> wait for modified drawing
      if (response.session_phase === 1 && (response.required_input === 'image_v2' || response.action === 'request_modified_drawing')) {
        setRequiredInput('image_v2');
      }

      // Save progress
      await saveProgress([...messages, userMessage, assistantMessage], response, response.session_phase);

      // No longer auto-complete based only on phase; rely on session_complete

    } catch (error: any) {
      console.error('❌ Image submit error:', error);
      console.error('Error stack:', error.stack);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to analyze drawing';
      
      Alert.alert(
        '❌ შეცდომა / Error',
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              // Remove the failed user message if it was added
              if (userMessageId) {
                setMessages(prev => prev.filter(m => m.id !== userMessageId));
              }
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPhase, sessionId, sessionComplete, messages, language, firstDrawingUri, secondDrawingUri, sessionProgress]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    if (sessionComplete) return;
    if (requiredInput === 'image_v2') {
      // Require image before proceeding
      const prompts = {
        en: 'Please upload your modified drawing to continue (tap 🎨 or 📸).',
        ka: 'გთხოვ ატვირთე შეცვლილი ნახატი გასაგრძელებლად (დააჭირე 🎨 ან 📸).',
        ru: 'Пожалуйста, загрузите изменённый рисунок, чтобы продолжить (нажмите 🎨 или 📸).',
        hy: 'Խնդրում ենք վերբեռնել փոփոխված նկարը շարունակելու համար (սեղմեք 🎨 կամ 📸):'
      } as const;
      Alert.alert('🔔', prompts[language]);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText.trim(),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);

      // Send to AI
      const response = await artTherapyService.sendMessage(
        [...messages, userMessage],
        session?.theme[language] || '',
        language,
        currentPhase
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response_text,
        timestamp: new Date(),
        clinicalData: response
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRequiredInput(response.required_input || 'none');
      setCurrentPhase(response.session_phase);

      if (response.session_complete) {
        setSessionComplete(true);
        if (response.session_summary) {
          const summaryTitles = {
            en: 'Session Summary',
            ka: 'სესიის შეჯამება',
            ru: 'Итоги сессии',
            hy: 'Նիստի ամփոփում'
          } as const;
          const summaryMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `${summaryTitles[language]}:\n\n${response.session_summary}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, summaryMessage]);
        }
        await saveProgress([...messages, userMessage, assistantMessage], response, response.session_phase);
        await ArtTherapyProgramManager.completeSession(
          sessionId,
          response,
          [...messages, userMessage, assistantMessage]
        );
        setTimeout(() => {
          showCompletionDialog(response);
        }, 1200);
        return;
      }

      // Phase transition requirements
      if (response.session_phase === 1 && (response.required_input === 'image_v2' || response.action === 'request_modified_drawing')) {
        setRequiredInput('image_v2');
      }

      await saveProgress([...messages, userMessage, assistantMessage], response, response.session_phase);

    } catch (error: any) {
      console.error('Send message error:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async (updatedMessages: ChatMessage[], latestResponse: ArtTherapyResponse, effectivePhase?: 0 | 1 | 2) => {
    if (!sessionProgress) return;

    // Strip large base64 data from messages before saving to AsyncStorage
    // Keep only the file URIs for re-loading
    const messagesForStorage = updatedMessages.map(msg => {
      if (msg.imageBase64 && msg.imageBase64.length > 1000) {
        // Keep a smaller version or just the URI
        return {
          ...msg,
          // Remove base64 but keep imageUri for reference
          imageBase64: undefined
        };
      }
      return msg;
    });

    const updated: SessionProgress = {
      ...sessionProgress,
      phase: typeof effectivePhase === 'number' ? effectivePhase : currentPhase,
      chatHistory: messagesForStorage, // Save optimized version
      firstDrawingUri: firstDrawingUri || undefined,
      secondDrawingUri: secondDrawingUri || undefined,
      clinicalSummary: latestResponse
    };

    await ArtTherapyProgramManager.saveProgress(sessionId, updated);
    setSessionProgress(updated);
  };

  const showCompletionDialog = (finalResponse: ArtTherapyResponse) => {
    Alert.alert(
      '✨ Session Complete!',
      'You have completed this art therapy session. Your insights have been saved, and the next session is now unlocked.',
      [
        {
          text: 'View Summary',
          onPress: () => {
            // Navigate to summary screen (to be created)
          }
        },
        {
          text: 'Continue',
          onPress: async () => {
            await ArtTherapyProgramManager.completeSession(
              sessionId,
              finalResponse,
              messages
            );
            router.back();
          }
        }
      ]
    );
  };

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>
          {language === 'ka' ? 'იტვირთება...' : 
           language === 'ru' ? 'Загрузка...' : 
           language === 'hy' ? 'Բեռնվում է...' : 
           'Loading...'}
        </Text>
        <Text style={styles.loadingSubtext}>
          {session.title[language]}
        </Text>
      </View>
    );
  }

  // Memoized message list for better performance
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble key={item.id} message={item} isUser={item.role === 'user'} />
  ), []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={[session.color, session.color + 'DD']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>{session.icon}</Text>
          <View>
            <Text style={styles.headerTitle}>{session.title[language]}</Text>
            <Text style={styles.headerSubtitle}>Phase {currentPhase + 1} / 3</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Messages with FlatList for better performance */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        updateCellsBatchingPeriod={100}
        disableVirtualization={false}
        getItemLayout={undefined} // Let FlatList calculate
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingContainer}>
              <TypingIndicator />
            </View>
          ) : null
        }
      />

      {/* Required input banner */}
      {requiredInput === 'image_v2' && !sessionComplete && (
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            {language === 'en' && 'Please upload your modified drawing to continue (tap 📷 or 🖼️).'}
            {language === 'ka' && 'გთხოვ ატვირთე შეცვლილი ნახატი გასაგრძელებლად (დააჭირე 📷 ან 🖼️).'}
            {language === 'ru' && 'Пожалуйста, загрузите изменённый рисунок, чтобы продолжить (нажмите 📷 или 🖼️).'}
            {language === 'hy' && 'Խնդրում ենք վերբեռնել փոփոխված նկարը շարունակելու համար (սեղմեք 📷 կամ �️):'}
          </Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleCameraCapture}
          disabled={isLoading || sessionComplete}
        >
          <Text style={styles.iconButtonText}>📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleImagePicker}
          disabled={isLoading || sessionComplete}
        >
          <Text style={styles.iconButtonText}>�️</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            language === 'en' ? 'Type your thoughts...' :
            language === 'ka' ? 'შეიყვანე შენი აზრები...' :
            language === 'ru' ? 'Напишите ваши мысли...' :
            'Մուտքագրեք ձեր մտքերը...'
          }
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={1000}
          editable={!isLoading && !sessionComplete && requiredInput !== 'image_v2'}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading || sessionComplete || requiredInput === 'image_v2') && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isLoading || sessionComplete || requiredInput === 'image_v2'}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  fullScreen: {
    flex: 1
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center'
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF'
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2
  },
  messagesContainer: {
    flex: 1
  },
  messagesContent: {
    padding: 16
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1'
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      },
      android: {
        elevation: 2
      }
    })
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  userText: {
    color: '#FFFFFF'
  },
  assistantText: {
    color: '#1F2937'
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F3F4F6', // Light background for loading
  },
  imageContainer: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6', // Placeholder background
    minHeight: 200, // Ensure container has minimum height
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    padding: 4,
    backgroundColor: '#FFF3CD',
  },
  messageTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right'
  },
  typingContainer: {
    alignSelf: 'flex-start',
    paddingVertical: 12
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  iconButtonText: {
    fontSize: 24
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    fontSize: 16,
    color: '#1F2937'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1'
  },
  sendButtonText: {
    fontSize: 24,
    color: '#FFFFFF'
  },
  bannerContainer: {
    backgroundColor: '#EEF2FF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  bannerText: {
    textAlign: 'center',
    color: '#4F46E5'
  }
});
