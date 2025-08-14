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
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface TargetMemory {
  id: string;
  title: string;
  description: string;
  image: string;
  negativeBeliefs: string[];
  positiveBeliefs: string[];
  emotions: string[];
  bodyLocations: string[];
  initialSUDS: number;
  initialVoC: number;
  createdDate: string;
  lastWorked?: string;
  sessions: string[];
  completed: boolean;
}

interface ProcessingSession {
  id: string;
  memoryId: string;
  startTime: string;
  endTime?: string;
  phase: 'preparation' | 'activation' | 'desensitization' | 'installation' | 'body-scan' | 'closure';
  initialSUDS: number;
  finalSUDS?: number;
  initialVoC: number;
  finalVoC?: number;
  sets: {
    setNumber: number;
    stimulationType: 'visual' | 'auditory' | 'tactile';
    duration: number;
    beforeSUDS: number;
    afterSUDS: number;
    notes: string;
    imagery: string;
    bodyAwareness: string;
  }[];
  notes: string;
  completed: boolean;
}

const EMDRMemoryProcessingScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [memories, setMemories] = useState<TargetMemory[]>([]);
  const [sessions, setSessions] = useState<ProcessingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ProcessingSession | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<TargetMemory | null>(null);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showProcessingSession, setShowProcessingSession] = useState(false);
  const [memoryForm, setMemoryForm] = useState({
    title: '',
    description: '',
    image: '',
    negativeBeliefs: [''],
    positiveBeliefs: [''],
    emotions: [''],
    bodyLocations: [''],
    initialSUDS: 7,
    initialVoC: 3,
  });

  const processingPhases = [
    { id: 'preparation', name: 'Подготовка', color: '#4ECDC4' },
    { id: 'activation', name: 'Активация', color: '#667eea' },
    { id: 'desensitization', name: 'Десенсибилизация', color: '#f093fb' },
    { id: 'installation', name: 'Инсталляция', color: '#43e97b' },
    { id: 'body-scan', name: 'Сканирование тела', color: '#ffa726' },
    { id: 'closure', name: 'Закрытие', color: '#ff6b6b' },
  ];

  const stimulationTypes = [
    { id: 'visual', name: 'Визуальная', icon: 'visibility' },
    { id: 'auditory', name: 'Слуховая', icon: 'hearing' },
    { id: 'tactile', name: 'Тактильная', icon: 'touch-app' },
  ];

  useEffect(() => {
    loadMemories();
    loadSessions();
  }, []);

  const loadMemories = async () => {
    try {
      const saved = await AsyncStorage.getItem('emdr_target_memories');
      if (saved) {
        setMemories(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const saved = await AsyncStorage.getItem('emdr_processing_sessions');
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveMemories = async (newMemories: TargetMemory[]) => {
    try {
      await AsyncStorage.setItem('emdr_target_memories', JSON.stringify(newMemories));
      setMemories(newMemories);
    } catch (error) {
      console.error('Error saving memories:', error);
    }
  };

  const saveSessions = async (newSessions: ProcessingSession[]) => {
    try {
      await AsyncStorage.setItem('emdr_processing_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const addMemory = () => {
    if (!memoryForm.title.trim()) {
      Alert.alert('Ошибка', 'Введите название воспоминания');
      return;
    }

    const newMemory: TargetMemory = {
      id: Date.now().toString(),
      title: memoryForm.title,
      description: memoryForm.description,
      image: memoryForm.image,
      negativeBeliefs: memoryForm.negativeBeliefs.filter(b => b.trim()),
      positiveBeliefs: memoryForm.positiveBeliefs.filter(b => b.trim()),
      emotions: memoryForm.emotions.filter(e => e.trim()),
      bodyLocations: memoryForm.bodyLocations.filter(l => l.trim()),
      initialSUDS: memoryForm.initialSUDS,
      initialVoC: memoryForm.initialVoC,
      createdDate: new Date().toISOString(),
      sessions: [],
      completed: false,
    };

    const newMemories = [newMemory, ...memories];
    saveMemories(newMemories);
    
    setMemoryForm({
      title: '',
      description: '',
      image: '',
      negativeBeliefs: [''],
      positiveBeliefs: [''],
      emotions: [''],
      bodyLocations: [''],
      initialSUDS: 7,
      initialVoC: 3,
    });
    setShowAddMemory(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startProcessingSession = (memory: TargetMemory) => {
    setSelectedMemory(memory);
    
    const newSession: ProcessingSession = {
      id: Date.now().toString(),
      memoryId: memory.id,
      startTime: new Date().toISOString(),
      phase: 'preparation',
      initialSUDS: memory.initialSUDS,
      initialVoC: memory.initialVoC,
      sets: [],
      notes: '',
      completed: false,
    };
    
    setCurrentSession(newSession);
    setShowProcessingSession(true);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addProcessingSet = (setData: any) => {
    if (!currentSession) return;

    const newSet = {
      setNumber: currentSession.sets.length + 1,
      stimulationType: setData.stimulationType,
      duration: setData.duration,
      beforeSUDS: setData.beforeSUDS,
      afterSUDS: setData.afterSUDS,
      notes: setData.notes,
      imagery: setData.imagery,
      bodyAwareness: setData.bodyAwareness,
    };

    const updatedSession = {
      ...currentSession,
      sets: [...currentSession.sets, newSet],
    };

    setCurrentSession(updatedSession);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const finishProcessingSession = (finalSUDS: number, finalVoC: number) => {
    if (!currentSession || !selectedMemory) return;

    const completedSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      finalSUDS,
      finalVoC,
      completed: true,
    };

    const updatedSessions = [completedSession, ...sessions];
    saveSessions(updatedSessions);

    // Update memory
    const updatedMemory = {
      ...selectedMemory,
      lastWorked: new Date().toISOString(),
      sessions: [...selectedMemory.sessions, completedSession.id],
      completed: finalSUDS <= 2 && finalVoC >= 6,
    };

    const updatedMemories = memories.map(m =>
      m.id === selectedMemory.id ? updatedMemory : m
    );
    saveMemories(updatedMemories);

    setCurrentSession(null);
    setSelectedMemory(null);
    setShowProcessingSession(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteMemory = (memoryId: string) => {
    Alert.alert(
      'Удалить воспоминание',
      'Вы уверены, что хотите удалить это целевое воспоминание?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedMemories = memories.filter(m => m.id !== memoryId);
            saveMemories(updatedMemories);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const getPhaseColor = (phase: string) => {
    const phaseInfo = processingPhases.find(p => p.id === phase);
    return phaseInfo ? phaseInfo.color : '#4ECDC4';
  };

  const getPhaseName = (phase: string) => {
    const phaseInfo = processingPhases.find(p => p.id === phase);
    return phaseInfo ? phaseInfo.name : phase;
  };

  const renderMemoryCard = ({ item }: { item: TargetMemory }) => {
    const memorySessions = sessions.filter(s => s.memoryId === item.id && s.completed);
    const lastSession = memorySessions.length > 0 ? memorySessions[0] : null;
    const currentSUDS = lastSession ? lastSession.finalSUDS : item.initialSUDS;
    const currentVoC = lastSession ? lastSession.finalVoC : item.initialVoC;

    return (
      <View style={[styles.memoryCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.memoryHeader}>
          <View style={styles.memoryInfo}>
            <Text style={[styles.memoryTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.memoryDescription, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          <View style={styles.memoryActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMemory(item.id)}
            >
              <MaterialIcons name="delete" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.memoryStats}>
          <View style={styles.memoryStat}>
            <Text style={[styles.memoryStatLabel, { color: theme.colors.textSecondary }]}>
              SUDS
            </Text>
            <Text style={[styles.memoryStatValue, { color: getSUDSColor(currentSUDS || 0) }]}>
              {currentSUDS || item.initialSUDS}/10
            </Text>
          </View>
          <View style={styles.memoryStat}>
            <Text style={[styles.memoryStatLabel, { color: theme.colors.textSecondary }]}>
              VoC
            </Text>
            <Text style={[styles.memoryStatValue, { color: getVoCColor(currentVoC || 0) }]}>
              {currentVoC || item.initialVoC}/7
            </Text>
          </View>
          <View style={styles.memoryStat}>
            <Text style={[styles.memoryStatLabel, { color: theme.colors.textSecondary }]}>
              Сессий
            </Text>
            <Text style={[styles.memoryStatValue, { color: theme.colors.text }]}>
              {memorySessions.length}
            </Text>
          </View>
        </View>

        <View style={styles.memoryBeliefs}>
          <Text style={[styles.beliefsTitle, { color: theme.colors.text }]}>
            Негативные убеждения:
          </Text>
          {item.negativeBeliefs.map((belief, index) => (
            <Text key={index} style={[styles.beliefText, { color: theme.colors.textSecondary }]}>
              • {belief}
            </Text>
          ))}
        </View>

        <View style={styles.memoryActions}>
          <TouchableOpacity
            style={styles.processButton}
            onPress={() => startProcessingSession(item)}
          >
            <LinearGradient
              colors={item.completed ? ['#4ECDC4', '#44A08D'] : ['#667eea', '#764ba2']}
              style={styles.processButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons 
                name={item.completed ? "check-circle" : "play-arrow"} 
                size={20} 
                color="#ffffff" 
              />
              <Text style={styles.processButtonText}>
                {item.completed ? 'Завершено' : 'Начать обработку'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getSUDSColor = (level: number) => {
    if (level <= 2) return '#4ECDC4';
    if (level <= 5) return '#ffa726';
    return '#ff6b6b';
  };

  const getVoCColor = (level: number) => {
    if (level >= 6) return '#4ECDC4';
    if (level >= 4) return '#ffa726';
    return '#ff6b6b';
  };

  const renderProcessingSet = ({ item }: { item: any }) => (
    <View style={[styles.processingSet, { backgroundColor: theme.colors.card }]}>
      <View style={styles.setHeader}>
        <Text style={[styles.setNumber, { color: theme.colors.text }]}>
          Сет {item.setNumber}
        </Text>
        <View style={[styles.stimulationBadge, { backgroundColor: getPhaseColor('activation') }]}>
          <Text style={styles.stimulationBadgeText}>
            {stimulationTypes.find(t => t.id === item.stimulationType)?.name || 'Неизвестно'}
          </Text>
        </View>
      </View>
      
      <View style={styles.setStats}>
        <View style={styles.setStat}>
          <Text style={[styles.setStatLabel, { color: theme.colors.textSecondary }]}>
            До
          </Text>
          <Text style={[styles.setStatValue, { color: getSUDSColor(item.beforeSUDS) }]}>
            {item.beforeSUDS}
          </Text>
        </View>
        <View style={styles.setStat}>
          <Text style={[styles.setStatLabel, { color: theme.colors.textSecondary }]}>
            После
          </Text>
          <Text style={[styles.setStatValue, { color: getSUDSColor(item.afterSUDS) }]}>
            {item.afterSUDS}
          </Text>
        </View>
        <View style={styles.setStat}>
          <Text style={[styles.setStatLabel, { color: theme.colors.textSecondary }]}>
            Время
          </Text>
          <Text style={[styles.setStatValue, { color: theme.colors.text }]}>
            {item.duration}с
          </Text>
        </View>
      </View>
      
      {item.notes && (
        <Text style={[styles.setNotes, { color: theme.colors.textSecondary }]}>
          {item.notes}
        </Text>
      )}
    </View>
  );

  const completedSessions = sessions.filter(s => s.completed);
  const averageProgress = memories.length > 0 
    ? memories.filter(m => m.completed).length / memories.length * 100
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8f9fa', '#e9ecef']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Обработка воспоминаний
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddMemory(true)}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
            Статистика обработки
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#4ECDC4' }]}>
                {memories.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Воспоминаний
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#667eea' }]}>
                {memories.filter(m => m.completed).length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Завершено
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#f093fb' }]}>
                {completedSessions.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Сессий
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#43e97b' }]}>
                {Math.round(averageProgress)}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Прогресс
              </Text>
            </View>
          </View>
        </View>

        {/* Target Memories */}
        <View style={styles.memoriesContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Целевые воспоминания ({memories.length})
          </Text>
          
          {memories.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <MaterialIcons name="psychology" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Нет целевых воспоминаний
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddMemory(true)}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.emptyStateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Добавить воспоминание
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={memories}
              renderItem={renderMemoryCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.memoriesList}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Memory Modal */}
      {showAddMemory && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Добавить воспоминание
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Название воспоминания
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={memoryForm.title}
                onChangeText={(text) => setMemoryForm({ ...memoryForm, title: text })}
                placeholder="Краткое описание события"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Описание события
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={memoryForm.description}
                onChangeText={(text) => setMemoryForm({ ...memoryForm, description: text })}
                placeholder="Подробное описание..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Негативные убеждения
              </Text>
              {memoryForm.negativeBeliefs.map((belief, index) => (
                <TextInput
                  key={index}
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.colors.background, color: theme.colors.text }
                  ]}
                  value={belief}
                  onChangeText={(text) => {
                    const newBeliefs = [...memoryForm.negativeBeliefs];
                    newBeliefs[index] = text;
                    setMemoryForm({ ...memoryForm, negativeBeliefs: newBeliefs });
                  }}
                  placeholder="Например: Я беспомощен"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              ))}

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Позитивные убеждения
              </Text>
              {memoryForm.positiveBeliefs.map((belief, index) => (
                <TextInput
                  key={index}
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.colors.background, color: theme.colors.text }
                  ]}
                  value={belief}
                  onChangeText={(text) => {
                    const newBeliefs = [...memoryForm.positiveBeliefs];
                    newBeliefs[index] = text;
                    setMemoryForm({ ...memoryForm, positiveBeliefs: newBeliefs });
                  }}
                  placeholder="Например: Я справляюсь"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              ))}

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Первоначальный SUDS: {memoryForm.initialSUDS}/10
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMemoryForm({ ...memoryForm, initialSUDS: Math.max(0, memoryForm.initialSUDS - 1) })}
                >
                  <MaterialIcons name="remove" size={20} color="#666666" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(memoryForm.initialSUDS / 10) * 100}%` }]} />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMemoryForm({ ...memoryForm, initialSUDS: Math.min(10, memoryForm.initialSUDS + 1) })}
                >
                  <MaterialIcons name="add" size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Первоначальный VoC: {memoryForm.initialVoC}/7
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMemoryForm({ ...memoryForm, initialVoC: Math.max(1, memoryForm.initialVoC - 1) })}
                >
                  <MaterialIcons name="remove" size={20} color="#666666" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(memoryForm.initialVoC / 7) * 100}%` }]} />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMemoryForm({ ...memoryForm, initialVoC: Math.min(7, memoryForm.initialVoC + 1) })}
                >
                  <MaterialIcons name="add" size={20} color="#666666" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddMemory(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={addMemory}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalButtonText}>Добавить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Processing Session Modal */}
      {showProcessingSession && selectedMemory && currentSession && (
        <View style={styles.modalOverlay}>
          <View style={[styles.processingModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.processingHeader}>
              <Text style={[styles.processingTitle, { color: theme.colors.text }]}>
                Обработка: {selectedMemory.title}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowProcessingSession(false)}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sessionInfo}>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatLabel, { color: theme.colors.textSecondary }]}>
                  Фаза
                </Text>
                <View style={[styles.phaseBadge, { backgroundColor: getPhaseColor(currentSession.phase) }]}>
                  <Text style={styles.phaseBadgeText}>
                    {getPhaseName(currentSession.phase)}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionStat}>
                <Text style={[styles.sessionStatLabel, { color: theme.colors.textSecondary }]}>
                  Сетов
                </Text>
                <Text style={[styles.sessionStatValue, { color: theme.colors.text }]}>
                  {currentSession.sets.length}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.processingContent} showsVerticalScrollIndicator={false}>
              {/* Processing Sets */}
              <FlatList
                data={currentSession.sets}
                renderItem={renderProcessingSet}
                keyExtractor={item => item.setNumber.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.processingSetsList}
              />

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => {
                  Alert.alert(
                    'Добавить сет',
                    'Выберите тип стимуляции',
                    stimulationTypes.map(type => ({
                      text: type.name,
                      onPress: () => {
                        // Simplified set addition - in real app would have full form
                        addProcessingSet({
                          stimulationType: type.id,
                          duration: 30,
                          beforeSUDS: 5,
                          afterSUDS: 3,
                          notes: '',
                          imagery: '',
                          bodyAwareness: '',
                        });
                      },
                    }))
                  );
                }}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.addSetGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="add" size={24} color="#ffffff" />
                  <Text style={styles.addSetText}>Добавить сет</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.finishSession}>
              <TouchableOpacity
                style={styles.finishButton}
                onPress={() => {
                  Alert.prompt(
                    'Завершить сессию',
                    'Введите финальные показатели SUDS и VoC через запятую',
                    [
                      { text: 'Отмена', style: 'cancel' },
                      {
                        text: 'Завершить',
                        onPress: (input) => {
                          const values = input?.split(',').map(v => parseInt(v.trim())) || [2, 6];
                          finishProcessingSession(values[0] || 2, values[1] || 6);
                        },
                      },
                    ],
                    'plain-text',
                    '2, 6'
                  );
                }}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.finishButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="check-circle" size={24} color="#ffffff" />
                  <Text style={styles.finishButtonText}>Завершить сессию</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  memoriesContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  emptyStateButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  memoriesList: {
    paddingBottom: 20,
  },
  memoryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  memoryInfo: {
    flex: 1,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  memoryActions: {
    marginTop: 15,
  },
  deleteButton: {
    padding: 4,
  },
  memoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  memoryStat: {
    alignItems: 'center',
    flex: 1,
  },
  memoryStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  memoryStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memoryBeliefs: {
    marginBottom: 15,
  },
  beliefsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  beliefText: {
    fontSize: 14,
    marginBottom: 4,
  },
  processButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  processButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 15,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  processingModal: {
    width: '100%',
    height: '90%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  processingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sessionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  phaseBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  processingContent: {
    flex: 1,
  },
  processingSetsList: {
    paddingBottom: 20,
  },
  processingSet: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  stimulationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stimulationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  setStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  setStat: {
    alignItems: 'center',
    flex: 1,
  },
  setStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  setStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  setNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addSetButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
  },
  addSetGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addSetText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  finishSession: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  finishButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  finishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EMDRMemoryProcessingScreen;
