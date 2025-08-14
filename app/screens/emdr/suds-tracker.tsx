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

interface SUDSReading {
  id: string;
  level: number;
  timestamp: string;
  context: string;
  notes: string;
  phase: 'preparation' | 'processing' | 'integration';
  trigger?: string;
  coping?: string;
}

interface SUDSSession {
  id: string;
  startTime: string;
  endTime?: string;
  initialSUDS: number;
  finalSUDS?: number;
  readings: SUDSReading[];
  notes: string;
  phase: string;
  completed: boolean;
}

const EMDRSUDSTrackerScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [sessions, setSessions] = useState<SUDSSession[]>([]);
  const [currentSession, setCurrentSession] = useState<SUDSSession | null>(null);
  const [currentSUDS, setCurrentSUDS] = useState(5);
  const [showAddReading, setShowAddReading] = useState(false);
  const [readingForm, setReadingForm] = useState({
    context: '',
    notes: '',
    phase: 'preparation' as 'preparation' | 'processing' | 'integration',
    trigger: '',
    coping: '',
  });

  const sudsDescriptions = [
    { level: 0, description: 'Полностью спокоен', color: '#4ECDC4' },
    { level: 1, description: 'Очень расслаблен', color: '#44A08D' },
    { level: 2, description: 'Расслаблен', color: '#6BCF7F' },
    { level: 3, description: 'Слегка взволнован', color: '#96CEB4' },
    { level: 4, description: 'Умеренно взволнован', color: '#FFEAA7' },
    { level: 5, description: 'Заметно взволнован', color: '#FAB1A0' },
    { level: 6, description: 'Довольно взволнован', color: '#FDCB6E' },
    { level: 7, description: 'Значительно взволнован', color: '#E17055' },
    { level: 8, description: 'Сильно взволнован', color: '#D63031' },
    { level: 9, description: 'Очень сильно взволнован', color: '#A29BFE' },
    { level: 10, description: 'Максимальный дистресс', color: '#6C5CE7' },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('emdr_suds_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        // Check if there's an active session
        const activeSession = parsed.find((s: SUDSSession) => !s.completed);
        if (activeSession) {
          setCurrentSession(activeSession);
        }
      }
    } catch (error) {
      console.error('Error loading SUDS sessions:', error);
    }
  };

  const saveSessions = async (newSessions: SUDSSession[]) => {
    try {
      await AsyncStorage.setItem('emdr_suds_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving SUDS sessions:', error);
    }
  };

  const startNewSession = () => {
    const newSession: SUDSSession = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      initialSUDS: currentSUDS,
      readings: [],
      notes: '',
      phase: 'preparation',
      completed: false,
    };

    const newSessions = [newSession, ...sessions];
    saveSessions(newSessions);
    setCurrentSession(newSession);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const endCurrentSession = () => {
    if (!currentSession) return;

    Alert.alert(
      'Завершить сессию',
      'Вы хотите завершить текущую сессию SUDS?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: () => {
            const updatedSession = {
              ...currentSession,
              endTime: new Date().toISOString(),
              finalSUDS: currentSUDS,
              completed: true,
            };

            const updatedSessions = sessions.map(s =>
              s.id === currentSession.id ? updatedSession : s
            );

            saveSessions(updatedSessions);
            setCurrentSession(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const addSUDSReading = () => {
    if (!currentSession) return;

    const newReading: SUDSReading = {
      id: Date.now().toString(),
      level: currentSUDS,
      timestamp: new Date().toISOString(),
      context: readingForm.context,
      notes: readingForm.notes,
      phase: readingForm.phase,
      trigger: readingForm.trigger,
      coping: readingForm.coping,
    };

    const updatedSession = {
      ...currentSession,
      readings: [...currentSession.readings, newReading],
    };

    const updatedSessions = sessions.map(s =>
      s.id === currentSession.id ? updatedSession : s
    );

    saveSessions(updatedSessions);
    setCurrentSession(updatedSession);
    setShowAddReading(false);
    setReadingForm({
      context: '',
      notes: '',
      phase: 'preparation',
      trigger: '',
      coping: '',
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteSUDSReading = (readingId: string) => {
    if (!currentSession) return;

    Alert.alert(
      'Удалить запись',
      'Вы уверены, что хотите удалить эту запись SUDS?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedSession = {
              ...currentSession,
              readings: currentSession.readings.filter(r => r.id !== readingId),
            };

            const updatedSessions = sessions.map(s =>
              s.id === currentSession.id ? updatedSession : s
            );

            saveSessions(updatedSessions);
            setCurrentSession(updatedSession);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const getSUDSColor = (level: number) => {
    const item = sudsDescriptions.find(s => s.level === level);
    return item ? item.color : '#4ECDC4';
  };

  const getSUDSDescription = (level: number) => {
    const item = sudsDescriptions.find(s => s.level === level);
    return item ? item.description : '';
  };

  const renderSUDSLevel = (level: number) => (
    <TouchableOpacity
      key={level}
      style={[
        styles.sudsLevel,
        currentSUDS === level && styles.sudsLevelActive,
        { backgroundColor: currentSUDS === level ? getSUDSColor(level) : '#f0f0f0' },
      ]}
      onPress={() => setCurrentSUDS(level)}
    >
      <Text style={[
        styles.sudsLevelText,
        { color: currentSUDS === level ? '#ffffff' : theme.colors.text }
      ]}>
        {level}
      </Text>
    </TouchableOpacity>
  );

  const renderSUDSReading = ({ item }: { item: SUDSReading }) => (
    <View style={[styles.readingItem, { backgroundColor: theme.colors.card }]}>
      <View style={styles.readingHeader}>
        <View style={styles.readingInfo}>
          <View style={styles.readingLevel}>
            <View style={[styles.levelIndicator, { backgroundColor: getSUDSColor(item.level) }]} />
            <Text style={[styles.levelText, { color: theme.colors.text }]}>
              SUDS: {item.level}/10
            </Text>
          </View>
          <Text style={[styles.readingTime, { color: theme.colors.textSecondary }]}>
            {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteSUDSReading(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.readingDetails}>
        <View style={[styles.phaseBadge, { backgroundColor: getPhaseColor(item.phase) }]}>
          <Text style={styles.phaseBadgeText}>{getPhaseTitle(item.phase)}</Text>
        </View>
        
        {item.context && (
          <Text style={[styles.readingContext, { color: theme.colors.text }]}>
            {item.context}
          </Text>
        )}
        
        {item.trigger && (
          <Text style={[styles.readingTrigger, { color: theme.colors.textSecondary }]}>
            Триггер: {item.trigger}
          </Text>
        )}
        
        {item.coping && (
          <Text style={[styles.readingCoping, { color: theme.colors.textSecondary }]}>
            Способ совладания: {item.coping}
          </Text>
        )}
        
        {item.notes && (
          <Text style={[styles.readingNotes, { color: theme.colors.textSecondary }]}>
            Заметки: {item.notes}
          </Text>
        )}
      </View>
    </View>
  );

  const renderSession = ({ item }: { item: SUDSSession }) => {
    const startTime = new Date(item.startTime);
    const endTime = item.endTime ? new Date(item.endTime) : null;
    const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) : 0;

    return (
      <View style={[styles.sessionItem, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionDate, { color: theme.colors.text }]}>
            {startTime.toLocaleDateString('ru-RU')}
          </Text>
          <Text style={[styles.sessionTime, { color: theme.colors.textSecondary }]}>
            {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            {endTime && ` - ${endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>
        
        <View style={styles.sessionStats}>
          <View style={styles.sessionStat}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Начальный SUDS
            </Text>
            <Text style={[styles.statValue, { color: getSUDSColor(item.initialSUDS) }]}>
              {item.initialSUDS}/10
            </Text>
          </View>
          
          {item.finalSUDS !== undefined && (
            <View style={styles.sessionStat}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Финальный SUDS
              </Text>
              <Text style={[styles.statValue, { color: getSUDSColor(item.finalSUDS) }]}>
                {item.finalSUDS}/10
              </Text>
            </View>
          )}
          
          <View style={styles.sessionStat}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Записей
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {item.readings.length}
            </Text>
          </View>
          
          {item.completed && (
            <View style={styles.sessionStat}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Длительность
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {duration} мин
              </Text>
            </View>
          )}
        </View>
        
        {item.finalSUDS !== undefined && (
          <View style={styles.improvementIndicator}>
            <Text style={[styles.improvementText, { color: theme.colors.textSecondary }]}>
              Изменение: 
            </Text>
            <Text style={[
              styles.improvementValue,
              { color: item.finalSUDS < item.initialSUDS ? '#4ECDC4' : '#ff6b6b' }
            ]}>
              {item.finalSUDS - item.initialSUDS > 0 ? '+' : ''}{item.finalSUDS - item.initialSUDS}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getPhaseColor = (phase: string) => {
    const colors = {
      preparation: '#4ECDC4',
      processing: '#f093fb',
      integration: '#43e97b',
    };
    return colors[phase as keyof typeof colors] || '#4ECDC4';
  };

  const getPhaseTitle = (phase: string) => {
    const titles = {
      preparation: 'Подготовка',
      processing: 'Обработка',
      integration: 'Интеграция',
    };
    return titles[phase as keyof typeof titles] || phase;
  };

  const completedSessions = sessions.filter(s => s.completed);
  const averageImprovement = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.initialSUDS - (s.finalSUDS || s.initialSUDS)), 0) / completedSessions.length
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
            SUDS Трекер
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current SUDS Level */}
        <View style={[styles.currentSUDSContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.currentSUDSTitle, { color: theme.colors.text }]}>
            Текущий уровень SUDS
          </Text>
          
          <View style={styles.sudsScale}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(renderSUDSLevel)}
          </View>
          
          <View style={styles.sudsDescription}>
            <Text style={[styles.sudsDescriptionText, { color: getSUDSColor(currentSUDS) }]}>
              {currentSUDS}/10 - {getSUDSDescription(currentSUDS)}
            </Text>
          </View>
        </View>

        {/* Session Controls */}
        <View style={styles.sessionControls}>
          {!currentSession ? (
            <TouchableOpacity
              style={styles.startSessionButton}
              onPress={startNewSession}
            >
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.startSessionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                <Text style={styles.startSessionText}>Начать сессию</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeSessionControls}>
              <View style={[styles.activeSessionInfo, { backgroundColor: theme.colors.card }]}>
                <MaterialIcons name="fiber-manual-record" size={16} color="#ff6b6b" />
                <Text style={[styles.activeSessionText, { color: theme.colors.text }]}>
                  Активная сессия • {currentSession.readings.length} записей
                </Text>
              </View>
              
              <View style={styles.sessionActions}>
                <TouchableOpacity
                  style={styles.addReadingButton}
                  onPress={() => setShowAddReading(true)}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.addReadingGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons name="add" size={20} color="#ffffff" />
                    <Text style={styles.addReadingText}>Добавить запись</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.endSessionButton}
                  onPress={endCurrentSession}
                >
                  <Text style={styles.endSessionText}>Завершить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Current Session Readings */}
        {currentSession && currentSession.readings.length > 0 && (
          <View style={styles.currentReadingsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Записи текущей сессии
            </Text>
            <FlatList
              data={currentSession.readings.reverse()}
              renderItem={renderSUDSReading}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.readingsList}
            />
          </View>
        )}

        {/* Statistics */}
        {completedSessions.length > 0 && (
          <View style={[styles.statisticsContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Статистика
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#4ECDC4' }]}>
                  {completedSessions.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Сессий
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#667eea' }]}>
                  {averageImprovement > 0 ? '+' : ''}{averageImprovement.toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Среднее улучшение
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#f093fb' }]}>
                  {completedSessions.reduce((sum, s) => sum + s.readings.length, 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Всего записей
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Session History */}
        <View style={styles.historyContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            История сессий ({completedSessions.length})
          </Text>
          
          {completedSessions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <MaterialIcons name="history" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Нет завершенных сессий
              </Text>
            </View>
          ) : (
            <FlatList
              data={completedSessions}
              renderItem={renderSession}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.sessionsList}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Reading Modal */}
      {showAddReading && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Добавить запись SUDS
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSUDSLevel, { color: getSUDSColor(currentSUDS) }]}>
                Уровень SUDS: {currentSUDS}/10
              </Text>
              
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Фаза терапии
              </Text>
              <View style={styles.phaseButtons}>
                {['preparation', 'processing', 'integration'].map(phase => (
                  <TouchableOpacity
                    key={phase}
                    style={[
                      styles.phaseButton,
                      readingForm.phase === phase && { backgroundColor: getPhaseColor(phase) },
                    ]}
                    onPress={() => setReadingForm({ ...readingForm, phase: phase as any })}
                  >
                    <Text style={[
                      styles.phaseButtonText,
                      { color: readingForm.phase === phase ? '#ffffff' : theme.colors.text }
                    ]}>
                      {getPhaseTitle(phase)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Контекст
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={readingForm.context}
                onChangeText={(text) => setReadingForm({ ...readingForm, context: text })}
                placeholder="Что происходило в этот момент?"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
              
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Триггер (необязательно)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={readingForm.trigger}
                onChangeText={(text) => setReadingForm({ ...readingForm, trigger: text })}
                placeholder="Что вызвало такую реакцию?"
                placeholderTextColor={theme.colors.textSecondary}
              />
              
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Способ совладания (необязательно)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={readingForm.coping}
                onChangeText={(text) => setReadingForm({ ...readingForm, coping: text })}
                placeholder="Как вы справились с ситуацией?"
                placeholderTextColor={theme.colors.textSecondary}
              />
              
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Заметки (необязательно)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={readingForm.notes}
                onChangeText={(text) => setReadingForm({ ...readingForm, notes: text })}
                placeholder="Дополнительные заметки..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddReading(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={addSUDSReading}
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentSUDSContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  currentSUDSTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  sudsScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sudsLevel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  sudsLevelActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sudsLevelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sudsDescription: {
    alignItems: 'center',
  },
  sudsDescriptionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionControls: {
    marginTop: 20,
  },
  startSessionButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  startSessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  startSessionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeSessionControls: {
    gap: 15,
  },
  activeSessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeSessionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addReadingButton: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  addReadingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addReadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  endSessionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSessionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  currentReadingsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  readingsList: {
    paddingBottom: 10,
  },
  readingItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  readingInfo: {
    flex: 1,
  },
  readingLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  readingTime: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  readingDetails: {
    gap: 8,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  readingContext: {
    fontSize: 14,
    fontWeight: '500',
  },
  readingTrigger: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  readingCoping: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  readingNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  statisticsContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  historyContainer: {
    marginTop: 20,
    marginBottom: 20,
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
  },
  sessionsList: {
    paddingBottom: 20,
  },
  sessionItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 12,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionStat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  improvementIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  improvementText: {
    fontSize: 14,
    marginRight: 4,
  },
  improvementValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
  modalSUDSLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  phaseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  phaseButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  phaseButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    minHeight: 44,
    textAlignVertical: 'top',
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
});

export default EMDRSUDSTrackerScreen;
