import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
  Text,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { createStyles } from '@/app/styles/artTherapyStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Web-specific types and utilities
interface HTMLImageElementWeb extends HTMLImageElement {
  onload: () => void;
  onerror: () => void;
  src: string;
}

const createWebImage = (): HTMLImageElementWeb => {
  if (isWeb) {
    return new window.Image() as HTMLImageElementWeb;
  }
  throw new Error('createWebImage should only be called on web platform');
};

// Drawing path type
interface DrawingPath {
  d: string;
  color: string;
  strokeWidth: number;
  id?: number;
}

// Constants
const COLORS = [
  '#FFFFFF', // White (eraser)
  '#000000', // Black
  '#FF0000', // Red
  '#00AA00', // Green
  '#0066FF', // Blue
  '#FFD700', // Yellow
  '#FF6600', // Orange
  '#8B00FF', // Purple
  '#FF1493', // Pink
  '#00CED1', // Cyan
  '#8B4513', // Brown
  '#808080', // Gray
];

const BRUSH_SIZES = [2, 4, 6, 8, 10, 15, 20];

const TOOL_LABELS = {
  colors: 'Цвета',
  brushes: 'Кисти',
  clear: 'Очистить',
  analyze: 'Анализировать',
  history: 'История',
  back: 'Назад',
  loading: 'Анализирую рисунок...',
  noHistory: 'История пуста',
  delete: 'Удалить',
  send: 'Отправить',
  placeholder: 'Введите сообщение...',
};

const MESSAGES = {
  deleteConfirm: {
    title: 'Удаление',
    message: 'Вы уверены, что хотите удалить этот рисунок?',
    ok: 'Удалить',
    cancel: 'Отмена',
  },
  error: {
    title: 'Ошибка',
    save: 'Не удалось сохранить рисунок',
    load: 'Не удалось загрузить историю',
    delete: 'Не удалось удалить рисунок',
    analyze: 'Не удалось проанализировать рисунок',
  },
};

export default function ArtTherapyScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams();
  
  // Get theme information from navigation params
  const artTheme = params.theme as string || 'Свободная тема';
  const themeColor = params.color as string || '#FF6B6B';
  
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const colorRef = useRef(COLORS[1]); // Start with black (second color) as default
  const strokeWidthRef = useRef(4);
  const [currentColor, setCurrentColor] = useState(colorRef.current);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(strokeWidthRef.current);
  const [isEraser, setIsEraser] = useState(false); // Start with drawing enabled
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [aiResponse, setAiResponse] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false); // For full-screen image view
  const [savedSessions, setSavedSessions] = useState<Array<{
    id: string;
    imageUri: string;
    date: string;
    conversation: string[];
  }>>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const currentPath = useRef('');
  // Use 'any' type for viewShotRef to work across platforms
  const viewShotRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load saved sessions on component mount
  useEffect(() => {
    const loadSavedSessions = async () => {
      try {
        const storedSessions = await AsyncStorage.getItem('artTherapySessions');
        if (storedSessions) {
          setSavedSessions(JSON.parse(storedSessions));
        }
      } catch (error) {
        console.error('Failed to load saved sessions:', error);
      }
    };
    
    loadSavedSessions();
  }, []);

  // Auto-save session when leaving the screen or when chat updates
  useEffect(() => {
    // Only try to save if we have a chat and image
    if (chatStarted && aiResponse.length > 0 && imageUri) {
      const autoSaveSession = async () => {
        try {
          const newSession = {
            id: Date.now().toString(),
            imageUri: imageUri === 'web-platform' ? 'web' : imageUri,
            date: new Date().toLocaleString('ru'),
            conversation: [...aiResponse]
          };
          
          // Get existing sessions
          const storedSessions = await AsyncStorage.getItem('artTherapySessions');
          const sessions = storedSessions ? JSON.parse(storedSessions) : [];
          
          // Check if we already have this session by comparing the last few messages
          const sessionExists = sessions.some((s: { conversation: string[]; date: string }) => 
            s.conversation.length > 0 && 
            s.conversation[0] === aiResponse[0] &&
            s.date.split(',')[0] === newSession.date.split(',')[0]
          );
          
          if (!sessionExists) {
            // Add new session
            sessions.push(newSession);
            
            // Save back to storage
            await AsyncStorage.setItem('artTherapySessions', JSON.stringify(sessions));
            
            // Update local state
            setSavedSessions(sessions);
            console.log('Session auto-saved');
          }
        } catch (error) {
          console.error('Error auto-saving session:', error);
        }
      };
      
      // Set up auto-save when component unmounts
      return () => {
        autoSaveSession();
      };
    }
  }, [chatStarted, aiResponse, imageUri]);

  // Larger canvas size for better drawing experience - make it even bigger
  const canvasHeight = screenHeight * 0.8; // 80% of screen height for maximum drawing space

  const handleColorChange = useCallback((color: string) => {
    if (color === '#FFFFFF') {
      setIsEraser(true);
      colorRef.current = '#FFFFFF';
    } else {
      setIsEraser(false);
      colorRef.current = color;
    }
    setCurrentColor(color);
  }, []);

  const handleBrushChange = useCallback((size: number) => {
    strokeWidthRef.current = size;
    setCurrentStrokeWidth(size);
  }, []);

  // Simple undo function - remove only the last stroke
  const undoLastStroke = useCallback(() => {
    if (paths.length > 0) {
      setPaths(prevPaths => prevPaths.slice(0, -1));
    }
  }, [paths.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const pathString = `M ${Math.max(0, locationX)} ${Math.max(0, locationY)}`;
        currentPath.current = pathString;
        
        const newPath = {
          color: isEraser ? '#FFFFFF' : colorRef.current,
          d: pathString,
          strokeWidth: isEraser ? strokeWidthRef.current * 2 : strokeWidthRef.current,
          id: Date.now() + Math.random()
        };
        
        setPaths((prevPaths) => [...prevPaths, newPath]);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const clampedX = Math.max(0, Math.min(screenWidth, locationX));
        const clampedY = Math.max(0, Math.min(canvasHeight, locationY));
        currentPath.current += ` L ${clampedX} ${clampedY}`;
        
        setPaths((prevPaths) => {
          if (prevPaths.length > 0) {
            const updatedPaths = [...prevPaths];
            updatedPaths[updatedPaths.length - 1] = {
              ...updatedPaths[updatedPaths.length - 1],
              d: currentPath.current
            };
            return updatedPaths;
          }
          return prevPaths;
        });
      },
      onPanResponderRelease: () => {
        currentPath.current = '';
      },
    })
  ).current;

  const clearCanvas = () => {
    setPaths([]);
    setAiResponse([]);
    setChatStarted(false);
    setImageUri(null);
  };

  const showHistory = useCallback(() => {
    setIsHistoryVisible(true);
  }, []);

  // Function to save the current session
  const saveSession = useCallback(async () => {
    if (!imageUri || aiResponse.length === 0) {
      Alert.alert('Внимание', 'Нет данных для сохранения сессии');
      return;
    }

    const newSession = {
      id: Date.now().toString(),
      imageUri: imageUri === 'web-platform' ? 'web' : imageUri,
      date: new Date().toLocaleString('ru'),
      conversation: [...aiResponse]
    };

    try {
      // Get existing sessions
      const storedSessions = await AsyncStorage.getItem('artTherapySessions');
      const sessions = storedSessions ? JSON.parse(storedSessions) : [];

      // Check if we already have this session by comparing first message
      const sessionExists = sessions.some((s: { conversation: string[]; date: string }) => 
        s.conversation.length > 0 && 
        s.conversation[0] === aiResponse[0] &&
        s.date.split(',')[0] === newSession.date.split(',')[0]
      );
      
      if (sessionExists) {
        // Update the existing session instead
        const updatedSessions = sessions.map((s: any) => {
          if (s.conversation.length > 0 && s.conversation[0] === aiResponse[0] && 
              s.date.split(',')[0] === newSession.date.split(',')[0]) {
            return {
              ...s, 
              conversation: [...aiResponse],
              date: new Date().toLocaleString('ru')
            };
          }
          return s;
        });
        
        await AsyncStorage.setItem('artTherapySessions', JSON.stringify(updatedSessions));
        setSavedSessions(updatedSessions);
        Alert.alert('Готово', 'Сеанс арт-терапии обновлен');
      } else {
        // Add new session
        sessions.push(newSession);
        await AsyncStorage.setItem('artTherapySessions', JSON.stringify(sessions));
        setSavedSessions(sessions);
        Alert.alert('Готово', 'Сеанс арт-терапии сохранен');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить сеанс. Попробуйте еще раз.');
    }
  }, [aiResponse, imageUri]);

  // SVG to PNG conversion utility
  const svgToPng = (svgString: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a Blob from the SVG string
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        // Create Image object to load the SVG
        const image = createWebImage();
        image.onload = () => {
          try {
            // Create canvas and context
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // Draw the image
            ctx.drawImage(image as unknown as HTMLImageElement, 0, 0);
            
            // Get base64 PNG data
            const pngBase64 = canvas.toDataURL('image/png').split(',')[1];
            
            // Clean up
            URL.revokeObjectURL(blobURL);
            
            resolve(pngBase64);
          } catch (err) {
            reject(err);
          }
        };
        image.onerror = () => reject(new Error('Failed to load SVG'));
        image.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  };

  const startArtTherapy = async () => {
    console.log('Starting art therapy session...');
    if (paths.length === 0) {
      Alert.alert('Сообщение', 'Пожалуйста, сначала что-нибудь нарисуйте!');
      return;
    }

    setLoading(true);
    try {
      let base64 = '';
      
      // Capture drawing for both web and mobile
      try {
        if (isWeb) {
          // For web, convert SVG to PNG using HTML Canvas
          const svgString = `<svg width="${screenWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#ffffff"/>
            ${paths.map(p => `<path d="${p.d}" stroke="${p.color}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join('')}
          </svg>`;

          // Convert SVG to PNG using canvas
          const svgData = `data:image/svg+xml;base64,${btoa(svgString)}`;
          const img = document.createElement('img');
          
          await new Promise<void>((resolve, reject) => {
            img.onload = async () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = screenWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                  throw new Error('Could not get canvas context');
                }

                // Draw white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, screenWidth, canvasHeight);
                
                // Draw the SVG image
                ctx.drawImage(img, 0, 0);
                
                // Get PNG base64
                base64 = canvas.toDataURL('image/png').split(',')[1];
                const dataUrl = `data:image/png;base64,${base64}`;
                setImageUri(dataUrl);
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            img.onerror = () => reject(new Error('Failed to load SVG'));
            img.src = svgData;
          });
        } else {
          // Native platforms: Use ViewShot
          if (!viewShotRef.current?.capture) {
            throw new Error('Canvas is not ready');
          }
          
          const uri = await viewShotRef.current.capture();
          setImageUri(uri);
          base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (error) {
        console.error('Error capturing drawing:', error);
        Alert.alert('Ошибка', 'Не удалось сохранить рисунок');
        setLoading(false);
        return;
      }

      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      
      if (!apiKey) {
        Alert.alert('Ошибка', 'API ключ не настроен');
        setLoading(false);
        return;
      }
    
      // Create system message with comprehensive art therapy instructions in Russian
      const systemMessage = {
        role: 'system',
        content: `Вы - опытный арт-терапевт с 20-летним стажем работы. Ваша роль - проводить профессиональную арт-терапевтическую сессию, основанную на научных принципах и методах арт-терапии.

КОНТЕКСТ СЕССИИ:
Пациент работает с темой: "${artTheme}"
Эта тема была выбрана для исследования определенных аспектов внутреннего мира пациента.

СПЕЦИФИЧЕСКИЕ ПОДХОДЫ ДЛЯ РАЗНЫХ ТЕМ:
• Свободная тема - фокус на спонтанном самовыражении и бессознательных процессах
• Автопортрет - исследование самовосприятия, идентичности, самооценки
• Эмоции - работа с эмоциональным интеллектом и способами выражения чувств
• Природа - связь с естественным миром, потребность в гармонии и покое
• Сны - доступ к бессознательному, символическому мышлению
• Семья - анализ семейных отношений, ролей, привязанностей
• Будущее - исследование планов, страхов, надежд, жизненных целей
• Воспоминания - проработка прошлого опыта, травм или значимых событий

ТЕОРЕТИЧЕСКАЯ ОСНОВА:
Вы работаете в рамках интегративного подхода, сочетающего:
• Аналитическую арт-терапию (анализ символов и бессознательного)
• Гуманистический подход (безусловное принятие, эмпатия)
• Гештальт-подход (работа с эмоциями "здесь и сейчас")
• Когнитивно-поведенческие элементы (связь между творчеством и мышлением)

МЕТОДЫ АНАЛИЗА РИСУНКА:
1. ЦВЕТОВОЙ АНАЛИЗ:
   • Красный - страсть, гнев, энергия, опасность, любовь
   • Синий - спокойствие, грусть, холод, стабильность, доверие
   • Желтый - радость, оптимизм, тревога, интеллект
   • Зеленый - рост, природа, безопасность, зависть
   • Черный - депрессия, страх, элегантность, неизвестность
   • Белый - чистота, новое начало, пустота, совершенство
   • Фиолетовый - духовность, мистика, креативность
   • Коричневый - стабильность, приземленность, застой

2. КОМПОЗИЦИОННЫЙ АНАЛИЗ:
   • Центр листа - сбалансированность, уверенность
   • Верх листа - духовность, мечты, будущее
   • Низ листа - реальность, прошлое, приземленность
   • Левая сторона - прошлое, интроверсия
   • Правая сторона - будущее, экстраверсия
   • Края листа - желание выйти за рамки или избегание

3. ЛИНИИ И ФОРМЫ:
   • Плавные линии - гармония, спокойствие
   • Резкие/угловатые - напряжение, агрессия, решительность
   • Прерывистые - неуверенность, тревога
   • Круги - целостность, защита, женственность
   • Квадраты - стабильность, порядок, мужественность
   • Треугольники - направленность, агрессия, движение вверх

4. ПРОСТРАНСТВЕННЫЕ ЭЛЕМЕНТЫ:
   • Заполненность - активность, тревога
   • Пустота - депрессия, потребность в покое
   • Размер элементов - значимость, самооценка
   • Повторения - навязчивость, важность темы

ЭТАПЫ ТЕРАПЕВТИЧЕСКОЙ БЕСЕДЫ:
1. ОПИСАНИЕ (без интерпретации): "Я вижу..."
2. ЭМОЦИОНАЛЬНЫЙ ОТКЛИК: "Это изображение вызывает у меня ощущение..."
3. ВОПРОСЫ ДЛЯ ИССЛЕДОВАНИЯ:
   • "Что вы чувствовали, когда рисовали это?"
   • "Какая часть рисунка привлекает ваше внимание больше всего?"
   • "Если бы ваш рисунок мог говорить, что бы он сказал?"
   • "Напоминает ли вам что-то в этом рисунке ситуацию из вашей жизни?"

ТЕРАПЕВТИЧЕСКИЕ ПРИНЦИПЫ:
• Безусловное позитивное принятие
• Активное слушание и отражение чувств
• Избегание преждевременных интерпретаций
• Поощрение самостоятельных открытий клиента
• Создание безопасного пространства для выражения
• Фокус на процессе, а не на художественном качестве

ТЕХНИКИ АРТТЕРАПИИ:
• Свободное рисование (выражение подсознательного)
• Мандала (центрирование, самопознание)
• Автопортрет (самовосприятие)
• Семейный рисунок (отношения)
• Дом-дерево-человек (проективная диагностика)
• Рисунок эмоций (эмоциональная грамотность)

Начните анализ с внимательного рассмотрения изображения, опишите что видите, затем деликатно поделитесь психологическими наблюдениями и задайте открытые вопросы для самоисследования. Говорите по-русски, теплым и профессиональным тоном.`
      };

      // Create user message with image for all platforms
      let userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Я нарисовал этот рисунок на тему "${artTheme}". Пожалуйста, проанализируйте его как арт-терапевт, учитывая выбранную тему, и помогите мне понять мои эмоции и состояние через мое творчество.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          },
        ],
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [systemMessage, userMessage],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const firstMessage = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ.';
      setAiResponse([firstMessage]);
      setChatStarted(true);
    } catch (err: any) {
      console.error('Art therapy error:', err);
      Alert.alert('Ошибка', err?.message || 'Не удалось отправить рисунок. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  const sendUserReply = async () => {
    if (!userInput.trim()) return;
    const newMessages = [...aiResponse, `Клиент: ${userInput}`];
    setAiResponse(newMessages);
    setLoading(true);
    setUserInput('');

    try {
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      
      if (!apiKey) {
        Alert.alert('Ошибка', 'API ключ не настроен');
        setLoading(false);
        return;
      }

      // Build conversation history
      const messages = [];
      
      // System message for continuing the conversation
      const systemContent = `Продолжайте работу как опытный арт-терапевт. Вы анализируете рисунок клиента и помогаете ему понять свои эмоции через творчество.

Важные инструкции:
1. Говорите ТОЛЬКО на русском языке, теплым и поддерживающим тоном
2. Связывайте слова клиента с элементами рисунка
3. Используйте АКТИВНОЕ слушание и ЭМПАТИЧНОЕ отражение
4. Задавайте открытые вопросы для глубокого самопознания
5. Принимайте все эмоции без осуждения
6. Помогайте находить скрытые смыслы и символы

Помните - вы создаете безопасное пространство для исцеления.`;
      
      // Add system message
      messages.push({
        role: 'system',
        content: systemContent
      });
      
      // Handle first user message based on platform
      if (isWeb || imageUri === 'web-platform') {
        // For web platform - text only message
        messages.push({
          role: 'user',
          content: 'Я нарисовал изображение в приложении. Давайте обсудим процесс рисования и что это может рассказать о моих чувствах и эмоциях.'
        });
      } else {
        // For mobile platform - include the image if possible
        let base64 = '';
        try {
          if (imageUri) {
            base64 = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          // Only include image if we successfully got base64 data
          if (base64) {
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Я нарисовал это изображение. Пожалуйста, проанализируйте его как арт-терапевт и помогите мне понять мои эмоции и состояние через мое творчество.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64}`,
                  },
                },
              ],
            });
          } else {
            // Fallback if base64 is empty
            messages.push({
              role: 'user',
              content: 'Я нарисовал изображение в приложении. Давайте обсудим процесс рисования и что это может рассказать о моих чувствах и эмоциях.'
            });
          }
        } catch (error) {
          console.error('Error processing image:', error);
          // Fallback to text-only message if image processing fails
          messages.push({
            role: 'user',
            content: 'Я нарисовал изображение в приложении. Давайте обсудим процесс рисования и что это может рассказать о моих чувствах и эмоциях.'
          });
        }
      }
      
      // Add the conversation history, skipping the first message which was replaced above
      for (let i = 0; i < newMessages.length; i++) {
        if (i === 0) {
          // First AI response
          messages.push({
            role: 'assistant',
            content: newMessages[i]
          });
        } else {
          // Subsequent messages
          messages.push({
            role: i % 2 === 0 ? 'assistant' : 'user',
            content: newMessages[i].replace('Клиент: ', '')
          });
        }
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ.';
      setAiResponse((prev) => [...prev, reply]);
      
      // Auto-scroll to bottom after receiving response
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (err: any) {
      console.error('Chat error:', err);
      Alert.alert('Ошибка', 'Не удалось получить ответ. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  const saveDrawing = async () => {
    setLoading(true);
    try {
      const uri = await captureDrawing();
      if (uri) {
        const currentDate = new Date().toLocaleString('ru-RU');
        const newSession = {
          id: Date.now().toString(),
          imageUri: uri,
          date: currentDate,
          conversation: aiResponse,
        };
        
        const updatedSessions = [newSession, ...savedSessions];
        await AsyncStorage.setItem('artTherapySessions', JSON.stringify(updatedSessions));
        setSavedSessions(updatedSessions);
        Alert.alert('Успешно', 'Рисунок сохранен');
      }
    } catch (error) {
      console.error('Error saving drawing:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить рисунок');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Подтверждение',
      'Вы уверены, что хотите удалить эту сессию?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSessions = savedSessions.filter(session => session.id !== sessionId);
              await AsyncStorage.setItem('artTherapySessions', JSON.stringify(updatedSessions));
              setSavedSessions(updatedSessions);
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Ошибка', 'Не удалось удалить сессию');
            }
          }
        }
      ]
    );
  };

  const captureDrawing = async (): Promise<string | null> => {
    try {
      if (isWeb) {
        // For web platform, return a placeholder
        return 'web-platform';
      } else {
        // Native platforms: Use ViewShot
        if (!viewShotRef.current?.capture) {
          throw new Error('Canvas is not ready');
        }
        
        const uri = await viewShotRef.current.capture();
        return uri;
      }
    } catch (error) {
      console.error('Error capturing drawing:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить рисунок');
      return null;
    }
  };

  const viewImage = (imageUri: string) => {
    if (imageUri === 'web' || imageUri === 'web-platform') {
      Alert.alert('Информация', 'Изображение было создано в веб-версии приложения');
      return;
    }
    
    // Set up for full-screen image view
    setImageUri(imageUri);
    setIsImageViewVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Арт-терапия</Text>
        <Text style={styles.headerSubtitle}>{artTheme}</Text>
      </View>
      <TouchableOpacity onPress={showHistory} style={styles.historyButton}>
        <FontAwesome5 name="history" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderColorPicker = () => (
    <View style={styles.toolsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
        {COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              color === currentColor && styles.selectedColor
            ]}
            onPress={() => setCurrentColor(color)}
          />
        ))}
      </ScrollView>
      <View style={styles.brushSizes}>
        {BRUSH_SIZES.map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.brushButton,
              currentStrokeWidth === size && styles.selectedBrush
            ]}
            onPress={() => setCurrentStrokeWidth(size)}
          >
            <View style={[styles.brushPreview, { width: size, height: size }]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHistoryModal = () => (
    <Modal
      visible={isHistoryVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsHistoryVisible(false)}
    >
      <SafeAreaView style={[styles.historyContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: theme.colors.text }]}>История рисунков</Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setIsHistoryVisible(false)}
          >
            <FontAwesome5 name="times" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.historyList}>
          {savedSessions.length === 0 ? (
            <Text style={[styles.noHistoryText, { color: theme.colors.textSecondary }]}>
              Нет сохраненных рисунков
            </Text>
          ) : (
            savedSessions.map((session) => (
              <View key={session.id} style={styles.historyItem}>
                <TouchableOpacity
                  onPress={() => viewImage(session.imageUri)}
                  style={styles.historyImageContainer}
                >
                  <Image
                    source={{ uri: session.imageUri }}
                    style={styles.historyImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyDate, { color: theme.colors.text }]}>
                    {session.date}
                  </Text>
                  {session.conversation && session.conversation.length > 0 && (
                    <Text style={[styles.historyConversation, { color: theme.colors.textSecondary }]}>
                      {session.conversation[session.conversation.length - 1]}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.historyDeleteButton}
                  onPress={() => deleteSession(session.id)}
                >
                  <FontAwesome5 name="trash-alt" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const styles = createStyles(theme);

  if (chatStarted) {
    return (
      <SafeAreaView style={styles.container}>
        
        {/* SOS Button */}

        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/tools');
            }
          }} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: 20 }]}>Арт-терапия</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={saveSession} style={styles.saveButton}>
              <FontAwesome5 name="save" size={18} color={theme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearCanvas} style={styles.resetButton}>
              <FontAwesome5 name="redo" size={18} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer} 
          showsVerticalScrollIndicator={false}
          className="chat-scroll-view"
        >
          {/* Show drawing thumbnail - always show some representation */}
          <View style={styles.drawingThumbnail}>
            <Text style={styles.drawingLabel}>Ваш рисунок:</Text>
            {imageUri && imageUri !== 'web-platform' ? (
              <TouchableOpacity onPress={() => setIsImageViewVisible(true)}>
                <Image source={{ uri: imageUri }} style={styles.thumbnailImage} />
                <View style={styles.viewImageOverlay}>
                  <Text style={styles.viewImageText}>Просмотр</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.colors.border }]}>
                <FontAwesome5 name="paint-brush" size={24} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  {imageUri === 'web-platform' ? 'Веб-версия' : 'Рисунок недоступен'}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.viewImageButton}
              onPress={() => {
                if (imageUri && imageUri !== 'web-platform') {
                  setIsImageViewVisible(true);
                }
              }}
            >
              <Text style={styles.viewImageButtonText}>
                {imageUri && imageUri !== 'web-platform' ? 'Просмотреть рисунок' : 'Рисунок недоступен'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Image view modal */}
          <Modal
            visible={isImageViewVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsImageViewVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {imageUri && imageUri !== 'web-platform' && (
                  <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
                )}
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setIsImageViewVisible(false)}
                >
                  <FontAwesome5 name="times" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    bottom: 40,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                  }}
                  onPress={() => {
                    setIsImageViewVisible(false);
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 16 }}>
                    Вернуться к разговору
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          
          {aiResponse.map((msg, i) => (
            <View key={i} style={i % 2 === 0 ? styles.therapistMessage : styles.userMessage}>
              <Text style={i % 2 === 0 ? styles.therapistText : styles.userText}>
                {msg}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingMessage}>
              <ActivityIndicator size="small" color="#8e8e93" />
              <Text style={styles.loadingText}>Терапевт анализирует ваш рисунок...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Расскажите о своих чувствах..."
            placeholderTextColor="#8e8e93"
            style={styles.textInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={sendUserReply} 
            style={[styles.sendButton, { opacity: userInput.trim() ? 1 : 0.3 }]}
            disabled={!userInput.trim() || loading}
          >
            <FontAwesome5 name="paper-plane" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.push('/(tabs)/tools');
          }
        }} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Арт-терапия</Text>
        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={() => router.push('/art-therapy-history' as any)}
        >
          <FontAwesome5 name="history" size={18} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Canvas - Full Screen Drawing Area */}
      {isWeb ? (
        <View style={[styles.canvasContainer, { flex: 1, height: canvasHeight }]}>
          <View
            style={[styles.canvas, { 
              height: canvasHeight, 
              width: screenWidth,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }]}
            {...panResponder.panHandlers}
          >
            <Svg 
              height={canvasHeight} 
              width={screenWidth} 
              style={{ backgroundColor: '#ffffff', position: 'absolute', top: 0, left: 0 }}
            >
              {paths.map((p, i) => (
                <Path 
                  key={p.id || i} 
                  d={p.d} 
                  stroke={p.color} 
                  strokeWidth={p.strokeWidth} 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : (
        <ViewShot ref={viewShotRef} style={[styles.canvasContainer, { flex: 1, height: canvasHeight }]} options={{ format: 'png', quality: 0.9 }}>
          <View
            style={[styles.canvas, { 
              height: canvasHeight, 
              width: screenWidth,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }]}
            {...panResponder.panHandlers}
            shouldRasterizeIOS={true}
            renderToHardwareTextureAndroid={true}
            removeClippedSubviews={true}
          >
            <Svg 
              height={canvasHeight} 
              width={screenWidth} 
              style={{ backgroundColor: '#ffffff', position: 'absolute', top: 0, left: 0 }}
            >
              {paths.map((p, i) => (
                <Path 
                  key={p.id || i} 
                  d={p.d} 
                  stroke={p.color} 
                  strokeWidth={p.strokeWidth} 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>
          </View>
        </ViewShot>
      )}

      {/* Tools */}
      <View style={styles.toolsContainer}>
        {/* Undo Button */}
        <View style={[styles.section, { marginBottom: 12 }]}>
          <TouchableOpacity 
            onPress={undoLastStroke} 
            style={[
              styles.analyzeButton, 
              { 
                opacity: paths.length > 0 ? 1 : 0.3,
                backgroundColor: paths.length > 0 ? theme.colors.accent : theme.colors.surface,
                paddingVertical: 8,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }
            ]}
            disabled={paths.length === 0}
          >
            <FontAwesome5 name="undo" size={14} color={paths.length > 0 ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text style={[
              styles.analyzeButtonText, 
              { 
                color: paths.length > 0 ? '#FFFFFF' : theme.colors.textSecondary,
                fontSize: 14,
              }
            ]}>
              Отменить
            </Text>
          </TouchableOpacity>
        </View>

        {/* Colors - Single Row */}
        <View style={styles.section}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -8 }}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {COLORS.map((color, index) => (
              <TouchableOpacity
                key={color}
                onPress={() => handleColorChange(color)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color,
                    borderWidth: currentColor === color ? 3 : 2,
                    borderColor: currentColor === color ? theme.colors.accent : '#e0e0e0',
                    transform: currentColor === color ? [{ scale: 1.1 }] : [{ scale: 1 }],
                    shadowColor: currentColor === color ? theme.colors.accent : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: currentColor === color ? 0.3 : 0.1,
                    shadowRadius: currentColor === color ? 4 : 2,
                    elevation: currentColor === color ? 4 : 2,
                    marginHorizontal: 4,
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                  },
                ]}
              >
                {color === '#FFFFFF' && (
                  <FontAwesome5 name="eraser" size={12} color="#666666" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Brush Sizes - Compact Row */}
        <View style={styles.section}>
          <View style={[styles.brushGrid, { justifyContent: 'space-around', paddingHorizontal: 16 }]}>
            {BRUSH_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => handleBrushChange(size)}
                style={[
                  styles.brushButton,
                  {
                    borderWidth: currentStrokeWidth === size ? 2 : 1,
                    borderColor: currentStrokeWidth === size ? theme.colors.accent : '#e0e0e0',
                    backgroundColor: currentStrokeWidth === size ? theme.colors.accent + '20' : 'transparent',
                    borderRadius: 6,
                    padding: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                  },
                ]}
              >
                <View 
                  style={[
                    styles.brushPreview, 
                    { 
                      width: Math.min(size, 16), 
                      height: Math.min(size, 16),
                      backgroundColor: currentStrokeWidth === size ? theme.colors.accent : '#666',
                      borderRadius: Math.min(size, 16) / 2,
                    }
                  ]} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          onPress={clearCanvas} 
          style={[
            styles.clearButton,
            {
              shadowColor: '#FF3B30',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
              borderRadius: 12,
            }
          ]}
        >
          <FontAwesome5 name="trash" size={14} color="#FF3B30" />
          <Text style={styles.clearButtonText}>Очистить</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={startArtTherapy} 
          style={[
            styles.analyzeButton,
            {
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
              borderRadius: 12,
            }
          ]} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <FontAwesome5 name="brain" size={14} color="#ffffff" />
              <Text style={styles.analyzeButtonText}>Начать терапию</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Styles are imported from separate file

