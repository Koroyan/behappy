import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface MoodEntry {
  id: string;
  date: string;
  mood: string;
  intensity: number;
  notes: string;
  factors: string[];
  activities: string[];
}

const MoodTrackerScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodIntensity, setMoodIntensity] = useState<number>(5);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);

  const moods = [
    { name: 'Радость', emoji: '😊', color: '#4ECDC4' },
    { name: 'Спокойствие', emoji: '😌', color: '#84fab0' },
    { name: 'Энергия', emoji: '🤩', color: '#ffa726' },
    { name: 'Нейтрально', emoji: '😐', color: '#96CEB4' },
    { name: 'Грусть', emoji: '😢', color: '#667eea' },
    { name: 'Тревога', emoji: '😰', color: '#f093fb' },
    { name: 'Злость', emoji: '😡', color: '#ff6b6b' },
    { name: 'Усталость', emoji: '😴', color: '#764ba2' },
  ];

  const factors = [
    'Работа/учеба',
    'Отношения',
    'Здоровье',
    'Финансы',
    'Семья',
    'Друзья',
    'Погода',
    'Сон',
    'Питание',
    'Физическая активность',
    'Стресс',
    'Одиночество',
  ];

  const activities = [
    'Спорт',
    'Медитация',
    'Чтение',
    'Музыка',
    'Фильмы',
    'Прогулка',
    'Встреча с друзьями',
    'Творчество',
    'Готовка',
    'Игры',
    'Работа',
    'Учеба',
  ];

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    try {
      const entries = await AsyncStorage.getItem('mood_entries');
      if (entries) {
        const parsedEntries = JSON.parse(entries);
        setRecentEntries(parsedEntries.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading mood entries:', error);
    }
  };

  const saveMoodEntry = async () => {
    if (!selectedMood) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите настроение');
      return;
    }

    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: selectedMood,
      intensity: moodIntensity,
      notes: '',
      factors: selectedFactors,
      activities: selectedActivities,
    };

    try {
      const existingEntries = await AsyncStorage.getItem('mood_entries');
      const entries = existingEntries ? JSON.parse(existingEntries) : [];
      entries.unshift(newEntry);
      await AsyncStorage.setItem('mood_entries', JSON.stringify(entries));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Успех', 'Запись настроения сохранена!', [
        { text: 'OK', onPress: resetForm }
      ]);
      
      loadRecentEntries();
    } catch (error) {
      console.error('Error saving mood entry:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  const resetForm = () => {
    setSelectedMood('');
    setMoodIntensity(5);
    setSelectedFactors([]);
    setSelectedActivities([]);
  };

  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(s => s !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const getMoodColor = (moodName: string) => {
    const mood = moods.find(m => m.name === moodName);
    return mood?.color || '#4ECDC4';
  };

  const getMoodEmoji = (moodName: string) => {
    const mood = moods.find(m => m.name === moodName);
    return mood?.emoji || '😊';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Трекер настроения
        </Text>
        <TouchableOpacity onPress={() => router.push('/screens/cbt/mood-history' as any)}>
          <MaterialIcons name="history" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Mood Selection */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Как вы себя чувствуете сейчас?
          </Text>
          <View style={styles.moodsGrid}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.name}
                style={[
                  styles.moodButton,
                  { backgroundColor: mood.color + '20' },
                  selectedMood === mood.name && {
                    backgroundColor: mood.color + '40',
                    borderColor: mood.color,
                    borderWidth: 2,
                  }
                ]}
                onPress={() => {
                  setSelectedMood(mood.name);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodName, { color: mood.color }]}>
                  {mood.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Intensity Scale */}
        {selectedMood && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Интенсивность: {moodIntensity}/10
            </Text>
            <View style={styles.intensityContainer}>
              <View style={styles.intensityScale}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.intensityButton,
                      { backgroundColor: theme.colors.surface },
                      moodIntensity === num && {
                        backgroundColor: getMoodColor(selectedMood),
                      }
                    ]}
                    onPress={() => {
                      setMoodIntensity(num);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[
                      styles.intensityText,
                      { color: theme.colors.text },
                      moodIntensity === num && { color: '#fff' }
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.intensityLabels}>
                <Text style={[styles.intensityLabel, { color: theme.colors.textSecondary }]}>
                  Слабо
                </Text>
                <Text style={[styles.intensityLabel, { color: theme.colors.textSecondary }]}>
                  Сильно
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Factors */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Что повлияло на настроение?
          </Text>
          <View style={styles.tagsContainer}>
            {factors.map((factor) => (
              <TouchableOpacity
                key={factor}
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.surface },
                  selectedFactors.includes(factor) && {
                    backgroundColor: '#667eea20',
                    borderColor: '#667eea',
                    borderWidth: 1,
                  }
                ]}
                onPress={() => {
                  toggleSelection(factor, selectedFactors, setSelectedFactors);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.tagText,
                  { color: theme.colors.text },
                  selectedFactors.includes(factor) && { color: '#667eea' }
                ]}>
                  {factor}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activities */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Чем вы занимались?
          </Text>
          <View style={styles.tagsContainer}>
            {activities.map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.surface },
                  selectedActivities.includes(activity) && {
                    backgroundColor: '#4ECDC420',
                    borderColor: '#4ECDC4',
                    borderWidth: 1,
                  }
                ]}
                onPress={() => {
                  toggleSelection(activity, selectedActivities, setSelectedActivities);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.tagText,
                  { color: theme.colors.text },
                  selectedActivities.includes(activity) && { color: '#4ECDC4' }
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Последние записи
            </Text>
            {recentEntries.map((entry) => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMood}>
                    <Text style={styles.entryEmoji}>{getMoodEmoji(entry.mood)}</Text>
                    <Text style={[styles.entryMoodName, { color: theme.colors.text }]}>
                      {entry.mood}
                    </Text>
                  </View>
                  <Text style={[styles.entryDate, { color: theme.colors.textSecondary }]}>
                    {formatDate(entry.date)}
                  </Text>
                </View>
                <View style={styles.entryIntensity}>
                  <Text style={[styles.entryIntensityText, { color: theme.colors.textSecondary }]}>
                    Интенсивность: {entry.intensity}/10
                  </Text>
                </View>
                {entry.factors.length > 0 && (
                  <View style={styles.entryTags}>
                    {entry.factors.slice(0, 3).map((factor) => (
                      <View key={factor} style={[styles.entryTag, { backgroundColor: '#667eea20' }]}>
                        <Text style={[styles.entryTagText, { color: '#667eea' }]}>
                          {factor}
                        </Text>
                      </View>
                    ))}
                    {entry.factors.length > 3 && (
                      <Text style={[styles.entryTagText, { color: theme.colors.textSecondary }]}>
                        +{entry.factors.length - 3}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !selectedMood && styles.saveButtonDisabled
            ]}
            onPress={saveMoodEntry}
            disabled={!selectedMood}
          >
            <LinearGradient
              colors={selectedMood ? ['#4ECDC4', '#667eea'] : ['#cccccc', '#aaaaaa']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="save" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Сохранить запись</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: (width - 80) / 4,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  moodName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  intensityContainer: {
    alignItems: 'center',
  },
  intensityScale: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  intensityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  intensityLabel: {
    fontSize: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryEmoji: {
    fontSize: 20,
  },
  entryMoodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryDate: {
    fontSize: 12,
  },
  entryIntensity: {
    marginBottom: 8,
  },
  entryIntensityText: {
    fontSize: 14,
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  entryTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  entryTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MoodTrackerScreen;
