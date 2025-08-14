import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
  Animated,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface WellnessEntry {
  id: string;
  date: string;
  mood: number;
  energy: number;
  stress: number;
  sleep: number;
  notes: string;
  timestamp: number;
}

interface WellnessMetric {
  id: keyof Omit<WellnessEntry, 'id' | 'date' | 'notes' | 'timestamp'>;
  title: string;
  icon: string;
  color: string;
  maxValue: number;
  unit: string;
  description: string;
}

const metrics: WellnessMetric[] = [
  {
    id: 'mood',
    title: 'Настроение',
    icon: 'sentiment-satisfied',
    color: '#4ECDC4',
    maxValue: 10,
    unit: '/10',
    description: 'Как вы себя чувствуете?',
  },
  {
    id: 'energy',
    title: 'Энергия',
    icon: 'battery-charging-full',
    color: '#FFA726',
    maxValue: 10,
    unit: '/10',
    description: 'Уровень энергии',
  },
  {
    id: 'stress',
    title: 'Стресс',
    icon: 'psychology',
    color: '#FF6B6B',
    maxValue: 10,
    unit: '/10',
    description: 'Уровень стресса',
  },
  {
    id: 'sleep',
    title: 'Сон',
    icon: 'bedtime',
    color: '#9C27B0',
    maxValue: 12,
    unit: ' ч',
    description: 'Часы сна',
  },
];

const moodEmojis = ['😞', '😕', '😐', '🙂', '😊', '😄', '🤩'];

export default function WellnessTrackerScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  // State
  const [currentEntry, setCurrentEntry] = useState<Partial<WellnessEntry>>({
    mood: 5,
    energy: 5,
    stress: 5,
    sleep: 8,
    notes: '',
  });
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<WellnessMetric | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<{ [key: string]: number }>({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadData();
    startAnimations();
  }, []);

  useEffect(() => {
    calculateWeeklyStats();
  }, [entries]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('wellness_entries');
      if (stored) {
        setEntries(JSON.parse(stored));
      }

      // Load today's entry if exists
      const today = new Date().toDateString();
      if (stored) {
        const parsedEntries = JSON.parse(stored);
        const todayEntry = parsedEntries.find((entry: WellnessEntry) => entry.date === today);
        if (todayEntry) {
          setCurrentEntry(todayEntry);
        }
      }
    } catch (error) {
      console.error('Error loading wellness data:', error);
    }
  };

  const calculateWeeklyStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentEntries = entries.filter(entry => 
      new Date(entry.timestamp) >= oneWeekAgo
    );

    const stats: { [key: string]: number } = {};
    
    metrics.forEach(metric => {
      const values = recentEntries
        .map(entry => entry[metric.id])
        .filter(value => value !== undefined && value !== null);
      
      if (values.length > 0) {
        stats[metric.id] = Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10;
      } else {
        stats[metric.id] = 0;
      }
    });

    setWeeklyStats(stats);
  };

  const updateMetric = (metricId: string, value: number) => {
    setCurrentEntry(prev => ({
      ...prev,
      [metricId]: value,
    }));
  };

  const saveEntry = async () => {
    const today = new Date().toDateString();
    const timestamp = Date.now();

    const newEntry: WellnessEntry = {
      id: timestamp.toString(),
      date: today,
      mood: currentEntry.mood || 5,
      energy: currentEntry.energy || 5,
      stress: currentEntry.stress || 5,
      sleep: currentEntry.sleep || 8,
      notes: currentEntry.notes || '',
      timestamp,
    };

    // Remove today's entry if exists and add new one
    const updatedEntries = entries.filter(entry => entry.date !== today);
    updatedEntries.push(newEntry);
    updatedEntries.sort((a, b) => b.timestamp - a.timestamp);

    setEntries(updatedEntries);

    try {
      await AsyncStorage.setItem('wellness_entries', JSON.stringify(updatedEntries));
      Alert.alert('✅ Сохранено', 'Данные о самочувствии обновлены!');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('❌ Ошибка', 'Не удалось сохранить данные');
    }
  };

  const MetricCard = ({ metric }: { metric: WellnessMetric }) => {
    const value = currentEntry[metric.id] || 0;
    const progress = value / metric.maxValue;

    return (
      <TouchableOpacity
        style={styles.metricCard}
        onPress={() => setSelectedMetric(metric)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[metric.color, metric.color + '80']}
          style={styles.metricGradient}
        >
          <MaterialIcons name={metric.icon as any} size={28} color="#FFFFFF" />
          <Text style={styles.metricTitle}>{metric.title}</Text>
          <Text style={styles.metricValue}>
            {value}{metric.unit}
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress * 100}%` }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const MetricModal = () => {
    if (!selectedMetric) return null;

    const value = currentEntry[selectedMetric.id] || 0;

    return (
      <Modal
        visible={!!selectedMetric}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedMetric.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedMetric(null)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.metricIcon, { backgroundColor: selectedMetric.color + '20' }]}>
              <MaterialIcons 
                name={selectedMetric.icon as any} 
                size={48} 
                color={selectedMetric.color} 
              />
            </View>

            <Text style={[styles.metricDescription, { color: theme.colors.textSecondary }]}>
              {selectedMetric.description}
            </Text>

            <Text style={[styles.currentValue, { color: selectedMetric.color }]}>
              {value}{selectedMetric.unit}
            </Text>

            <View style={styles.sliderContainer}>
              {Array.from({ length: selectedMetric.maxValue + 1 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.sliderButton,
                    value === i && { backgroundColor: selectedMetric.color }
                  ]}
                  onPress={() => updateMetric(selectedMetric.id, i)}
                >
                  <Text style={[
                    styles.sliderButtonText,
                    { color: value === i ? '#fff' : theme.colors.text }
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const HistoryModal = () => (
    <Modal
      visible={showHistory}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHistory(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.historyModalContent, { backgroundColor: theme.colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              История записей
            </Text>
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyList}>
            {entries.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Пока нет записей
              </Text>
            ) : (
              entries.slice(0, 30).map((entry) => (
                <View key={entry.id} style={[styles.historyItem, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.historyDate, { color: theme.colors.text }]}>
                    {new Date(entry.timestamp).toLocaleDateString('ru-RU')}
                  </Text>
                  <View style={styles.historyMetrics}>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyLabel}>Настроение:</Text>
                      <Text style={[styles.historyValue, { color: '#4ECDC4' }]}>
                        {entry.mood}/10
                      </Text>
                    </View>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyLabel}>Энергия:</Text>
                      <Text style={[styles.historyValue, { color: '#FFA726' }]}>
                        {entry.energy}/10
                      </Text>
                    </View>
                  </View>
                  {entry.notes && (
                    <Text style={[styles.historyNotes, { color: theme.colors.textSecondary }]}>
                      {entry.notes}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Трекер самочувствия
        </Text>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyButton}>
          <MaterialIcons name="history" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today Section */}
        <Animated.View 
          style={[
            styles.todaySection,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#667eea', '#764ba2'] : ['#4ECDC4', '#44A08D']}
            style={styles.todayCard}
          >
            <MaterialIcons name="today" size={32} color="#FFFFFF" />
            <Text style={styles.todayTitle}>Сегодня</Text>
            <Text style={styles.todayDate}>
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Weekly Stats */}
        {Object.keys(weeklyStats).length > 0 && (
          <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              📊 Средние показатели за неделю
            </Text>
            <View style={styles.statsGrid}>
              {metrics.map((metric) => (
                <View key={metric.id} style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                  <MaterialIcons name={metric.icon as any} size={24} color={metric.color} />
                  <Text style={[styles.statValue, { color: metric.color }]}>
                    {weeklyStats[metric.id] || 0}{metric.unit}
                  </Text>
                  <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
                    {metric.title}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Metrics Grid */}
        <Animated.View style={[styles.metricsSection, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🎯 Сегодняшние показатели
          </Text>
          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </View>
        </Animated.View>

        {/* Notes Section */}
        <Animated.View style={[styles.notesSection, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📝 Заметки
          </Text>
          <View style={[styles.notesContainer, { backgroundColor: theme.colors.card }]}>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text }]}
              value={currentEntry.notes || ''}
              onChangeText={(text) => setCurrentEntry(prev => ({ ...prev, notes: text }))}
              placeholder="Как прошел день? Что чувствуете?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={200}
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View style={[styles.saveSection, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={saveEntry} style={styles.saveButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={styles.saveGradient}
            >
              <MaterialIcons name="save" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Сохранить запись</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <MetricModal />
      <HistoryModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  todaySection: {
    margin: 20,
  },
  todayCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  todayDate: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
    width: '100%',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  notesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  notesContainer: {
    borderRadius: 16,
    padding: 16,
  },
  notesInput: {
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  saveSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  historyModalContent: {
    width: width - 40,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  metricIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  metricDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  sliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  sliderButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    maxHeight: 400,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  historyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyLabel: {
    fontSize: 14,
    color: '#666',
  },
  historyValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 40,
  },
});
