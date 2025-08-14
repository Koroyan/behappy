import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessageToGPT } from '@/services/gptApi';

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  aiResponse?: string;
  mood?: number;
  timestamp: number;
}

interface JournalPrompt {
  title: string;
  description: string;
  prompt: string;
  icon: string;
  gradient: [string, string];
}

const journalPrompts: JournalPrompt[] = [
  {
    title: 'Рефлексия дня',
    description: 'Что произошло сегодня важного?',
    prompt: 'Расскажите о самом важном событии сегодняшнего дня. Как это повлияло на ваше настроение?',
    icon: 'sun',
    gradient: ['#FFA726', '#FF7043'],
  },
  {
    title: 'Благодарность',
    description: 'За что вы благодарны?',
    prompt: 'Перечислите 3 вещи, за которые вы благодарны сегодня. Почему они важны для вас?',
    icon: 'heart',
    gradient: ['#EC407A', '#E91E63'],
  },
  {
    title: 'Эмоции',
    description: 'Какие эмоции вы испытываете?',
    prompt: 'Опишите свои текущие эмоции. Что их вызвало? Как бы вы хотели себя чувствовать?',
    icon: 'smile',
    gradient: ['#42A5F5', '#1E88E5'],
  },
  {
    title: 'Цели и мечты',
    description: 'О чем вы мечтаете?',
    prompt: 'Поделитесь своими мечтами или целями. Какой шаг можете сделать сегодня к их достижению?',
    icon: 'star',
    gradient: ['#AB47BC', '#8E24AA'],
  },
  {
    title: 'Проблемы',
    description: 'Что вас беспокоит?',
    prompt: 'Опишите то, что вас беспокоит. Какие варианты решения видите? Что поможет справиться?',
    icon: 'lightbulb',
    gradient: ['#66BB6A', '#43A047'],
  },
  {
    title: 'Свободная запись',
    description: 'Напишите то, что на душе',
    prompt: 'Напишите все, что приходит в голову. Не ограничивайте себя темой или структурой.',
    icon: 'feather-alt',
    gradient: ['#26C6DA', '#00ACC1'],
  },
];

export default function JournalScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);
  const [entryText, setEntryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState<number>(3);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const savedEntries = await AsyncStorage.getItem('journal_entries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
    }
  };

  const saveEntry = async () => {
    if (entryText.trim().length === 0) {
      Alert.alert('Внимание', 'Пожалуйста, напишите что-нибудь в дневнике');
      return;
    }

    setIsLoading(true);

    try {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('ru-RU'),
        content: entryText,
        mood,
        timestamp: Date.now(),
      };

      // Получаем ответ от ИИ
      const aiPrompt = currentPrompt 
        ? `Пользователь написал в дневнике на тему "${currentPrompt.title}": "${entryText}". Дайте краткий, поддерживающий и мудрый ответ на русском языке, который поможет осмыслить написанное. Будьте эмпатичными и конструктивными.`
        : `Пользователь написал в дневнике: "${entryText}". Дайте краткий, поддерживающий ответ на русском языке, который поможет осмыслить написанное.`;

      const aiResponse = await sendMessageToGPT([
        { role: 'user', content: aiPrompt }
      ]);
      newEntry.aiResponse = aiResponse;

      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      await AsyncStorage.setItem('journal_entries', JSON.stringify(updatedEntries));

      setEntryText('');
      setIsWriting(false);
      setCurrentPrompt(null);
      setMood(3);

      Alert.alert('Успешно', 'Запись сохранена в дневник');
    } catch (error) {
      console.error('Ошибка сохранения записи:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    } finally {
      setIsLoading(false);
    }
  };

  const startWriting = (prompt?: JournalPrompt) => {
    setCurrentPrompt(prompt || null);
    setIsWriting(true);
    if (prompt) {
      setEntryText(prompt.prompt + '\n\n');
    }
  };

  const cancelWriting = () => {
    setIsWriting(false);
    setCurrentPrompt(null);
    setEntryText('');
    setMood(3);
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert(
      'Удаление записи',
      'Вы уверены, что хотите удалить эту запись?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            setEntries(updatedEntries);
            await AsyncStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
          },
        },
      ]
    );
  };

  const moodEmojis = ['😔', '😕', '😐', '😊', '😁'];
  const moodLabels = ['Плохо', 'Грустно', 'Нормально', 'Хорошо', 'Отлично'];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
    },
    welcomeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    welcomeText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    promptsContainer: {
      marginBottom: 24,
    },
    promptGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    promptCard: {
      width: (screenWidth - 48) / 2,
      height: 120,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
    },
    promptGradient: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    promptIcon: {
      alignSelf: 'flex-start',
    },
    promptTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    promptDescription: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    quickWriteButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    quickWriteText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    entriesContainer: {
      marginTop: 8,
    },
    entryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    entryDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    entryMood: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moodEmoji: {
      fontSize: 16,
      marginRight: 4,
    },
    moodText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    entryContent: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: 12,
    },
    aiResponseContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    aiResponseLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    aiResponse: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    deleteButton: {
      marginLeft: 8,
      padding: 4,
    },
    // Writing mode styles
    writingContainer: {
      flex: 1,
      padding: 16,
    },
    promptInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    promptInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    promptInfoText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    moodSelector: {
      marginBottom: 16,
    },
    moodLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    moodOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    moodOption: {
      alignItems: 'center',
      padding: 8,
      borderRadius: 12,
      minWidth: 60,
    },
    moodOptionActive: {
      backgroundColor: theme.colors.surface,
    },
    moodOptionEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    moodOptionText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 200,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
  });

  if (isWriting) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={cancelWriting}>
            <FontAwesome5 name="times" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentPrompt ? currentPrompt.title : 'Свободная запись'}
          </Text>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.writingContainer}>
            {currentPrompt && (
              <View style={styles.promptInfo}>
                <Text style={styles.promptInfoTitle}>{currentPrompt.title}</Text>
                <Text style={styles.promptInfoText}>{currentPrompt.description}</Text>
              </View>
            )}

            <View style={styles.moodSelector}>
              <Text style={styles.moodLabel}>Как вы себя чувствуете?</Text>
              <View style={styles.moodOptions}>
                {moodEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.moodOption,
                      mood === index && styles.moodOptionActive,
                    ]}
                    onPress={() => setMood(index)}
                  >
                    <Text style={styles.moodOptionEmoji}>{emoji}</Text>
                    <Text style={styles.moodOptionText}>{moodLabels[index]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Начните писать..."
              placeholderTextColor={theme.colors.textSecondary}
              value={entryText}
              onChangeText={setEntryText}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelWriting}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveEntry}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.loadingText}>Сохранение...</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, styles.saveButtonText]}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Умный дневник</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Добро пожаловать в ваш умный дневник! 📝</Text>
          <Text style={styles.welcomeText}>
            Ведите дневник с поддержкой ИИ. Записывайте мысли, получайте мудрые советы 
            и отслеживайте свое эмоциональное состояние.
          </Text>
        </View>

        <TouchableOpacity style={styles.quickWriteButton} onPress={() => startWriting()}>
          <FontAwesome5 name="edit" size={18} color="#FFFFFF" />
          <Text style={styles.quickWriteText}>Быстрая запись</Text>
        </TouchableOpacity>

        <View style={styles.promptsContainer}>
          <Text style={styles.sectionTitle}>Темы для размышлений</Text>
          <View style={styles.promptGrid}>
            {journalPrompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptCard}
                onPress={() => startWriting(prompt)}
              >
                <LinearGradient
                  colors={prompt.gradient}
                  style={styles.promptGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FontAwesome5 
                    name={prompt.icon} 
                    size={20} 
                    color="#FFFFFF" 
                    style={styles.promptIcon} 
                  />
                  <View>
                    <Text style={styles.promptTitle}>{prompt.title}</Text>
                    <Text style={styles.promptDescription}>{prompt.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>Ваши записи</Text>
          
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 
                name="book-open" 
                size={48} 
                color={theme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateTitle}>Пока нет записей</Text>
              <Text style={styles.emptyStateText}>
                Начните вести дневник, выбрав тему выше или сделав быструю запись
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {entry.mood !== undefined && (
                      <View style={styles.entryMood}>
                        <Text style={styles.moodEmoji}>{moodEmojis[entry.mood]}</Text>
                        <Text style={styles.moodText}>{moodLabels[entry.mood]}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteEntry(entry.id)}
                    >
                      <FontAwesome5 name="trash" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.entryContent}>{entry.content}</Text>
                
                {entry.aiResponse && (
                  <View style={styles.aiResponseContainer}>
                    <Text style={styles.aiResponseLabel}>💡 Умная поддержка</Text>
                    <Text style={styles.aiResponse}>{entry.aiResponse}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
