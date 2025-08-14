import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface BilateralSession {
  id: string;
  date: string;
  type: 'visual' | 'auditory' | 'tactile';
  duration: number;
  speed: number;
  sudsStart: number;
  sudsEnd: number;
  targetMemory: string;
  notes: string;
}

interface StimulationSettings {
  type: 'visual' | 'auditory' | 'tactile';
  speed: number;
  duration: number;
  color: string;
  size: number;
  intensity: number;
}

const EMDRBilateralStimulation = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<BilateralSession | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [sessions, setSessions] = useState<BilateralSession[]>([]);
  const [timer, setTimer] = useState(0);
  const [settings, setSettings] = useState<StimulationSettings>({
    type: 'visual',
    speed: 1000,
    duration: 30,
    color: '#4ECDC4',
    size: 60,
    intensity: 80,
  });
  const [sessionData, setSessionData] = useState({
    sudsStart: 8,
    sudsEnd: 3,
    targetMemory: '',
    notes: '',
  });

  // Animation refs
  const dotAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSessions();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('bilateral_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSession = async (session: BilateralSession) => {
    try {
      const newSessions = [...sessions, session];
      await AsyncStorage.setItem('bilateral_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startStimulation = () => {
    if (!sessionData.targetMemory) {
      Alert.alert('Внимание', 'Пожалуйста, укажите целевое воспоминание перед началом сессии');
      setSessionModal(true);
      return;
    }

    setIsActive(true);
    setTimer(0);
    
    // Create session
    const session: BilateralSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: settings.type,
      duration: settings.duration,
      speed: settings.speed,
      sudsStart: sessionData.sudsStart,
      sudsEnd: sessionData.sudsEnd,
      targetMemory: sessionData.targetMemory,
      notes: sessionData.notes,
    };
    setCurrentSession(session);

    // Start animation
    if (settings.type === 'visual') {
      startVisualStimulation();
    } else if (settings.type === 'auditory') {
      startAuditoryStimulation();
    } else if (settings.type === 'tactile') {
      startTactileStimulation();
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev >= settings.duration) {
          stopStimulation();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const stopStimulation = () => {
    setIsActive(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animations
    dotAnimation.stopAnimation();
    pulseAnimation.stopAnimation();

    // Show session completion
    if (currentSession) {
      Alert.alert(
        'Сессия завершена',
        'Как вы себя чувствуете? Обновите ваш SUDS уровень.',
        [
          { text: 'Позже', style: 'cancel' },
          { text: 'Обновить', onPress: () => setSessionModal(true) }
        ]
      );
    }
  };

  const startVisualStimulation = () => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: settings.speed / 2,
          useNativeDriver: false,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: settings.speed / 2,
          useNativeDriver: false,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: settings.speed / 4,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: settings.speed / 4,
          useNativeDriver: false,
        }),
      ]).start();
    };

    animate();
    intervalRef.current = setInterval(animate, settings.speed);
  };

  const startAuditoryStimulation = () => {
    // Simulate auditory stimulation with haptic feedback
    const stimulate = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Alternate pulse animation
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.3,
          duration: settings.speed / 3,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: settings.speed / 3,
          useNativeDriver: false,
        }),
      ]).start();
    };

    stimulate();
    intervalRef.current = setInterval(stimulate, settings.speed);
  };

  const startTactileStimulation = () => {
    // Simulate tactile stimulation with stronger haptic feedback
    const stimulate = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Pulse animation with different pattern
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.4,
          duration: settings.speed / 4,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0.8,
          duration: settings.speed / 4,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: settings.speed / 2,
          useNativeDriver: false,
        }),
      ]).start();
    };

    stimulate();
    intervalRef.current = setInterval(stimulate, settings.speed);
  };

  const completeSession = async () => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        sudsEnd: sessionData.sudsEnd,
        notes: sessionData.notes,
        duration: timer,
      };
      
      await saveSession(completedSession);
      setCurrentSession(null);
      setSessionModal(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Сессия сохранена', 'Ваша EMDR сессия успешно записана');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const dotPosition = dotAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, width - 110],
  });

  const renderVisualStimulation = () => (
    <View style={styles.visualContainer}>
      <Animated.View
        style={[
          styles.movingDot,
          {
            left: dotPosition,
            backgroundColor: settings.color,
            width: settings.size,
            height: settings.size,
            borderRadius: settings.size / 2,
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      />
      <View style={styles.trackLine} />
    </View>
  );

  const renderAuditoryStimulation = () => (
    <View style={styles.auditoryContainer}>
      <Animated.View
        style={[
          styles.auditoryIndicator,
          {
            backgroundColor: settings.color,
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      >
        <MaterialIcons name="volume-up" size={60} color="white" />
      </Animated.View>
      <Text style={[styles.auditoryText, { color: theme.colors.text }]}>
        Слушайте и следите за звуком
      </Text>
    </View>
  );

  const renderTactileStimulation = () => (
    <View style={styles.tactileContainer}>
      <Animated.View
        style={[
          styles.tactileIndicator,
          {
            backgroundColor: settings.color,
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      >
        <MaterialIcons name="vibration" size={60} color="white" />
      </Animated.View>
      <Text style={[styles.tactileText, { color: theme.colors.text }]}>
        Почувствуйте вибрацию
      </Text>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: theme.colors.text }]}>
          {formatTime(timer)} / {formatTime(settings.duration)}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(timer / settings.duration) * 100}%`,
                backgroundColor: settings.color,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.card }]}
          onPress={() => setSettingsModal(true)}
          disabled={isActive}
        >
          <MaterialIcons name="settings" size={24} color={theme.colors.text} />
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>
            Настройки
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: isActive ? '#ff6b6b' : '#4ECDC4' },
          ]}
          onPress={isActive ? stopStimulation : startStimulation}
        >
          <MaterialIcons 
            name={isActive ? 'stop' : 'play-arrow'} 
            size={32} 
            color="white" 
          />
          <Text style={styles.mainButtonText}>
            {isActive ? 'Остановить' : 'Начать'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.card }]}
          onPress={() => setSessionModal(true)}
          disabled={isActive}
        >
          <MaterialIcons name="note-add" size={24} color={theme.colors.text} />
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>
            Сессия
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSessionModal = () => (
    <Modal
      visible={sessionModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setSessionModal(false)}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Данные сессии
          </Text>
          <TouchableOpacity onPress={completeSession}>
            <MaterialIcons name="check" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Целевое воспоминание
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={sessionData.targetMemory}
              onChangeText={(text) => setSessionData({...sessionData, targetMemory: text})}
              placeholder="Кратко опишите воспоминание или образ"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              SUDS до сессии (0-10)
            </Text>
            <View style={styles.sudsContainer}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.sudsButton,
                    {
                      backgroundColor: sessionData.sudsStart === level 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setSessionData({...sessionData, sudsStart: level})}
                >
                  <Text style={[
                    styles.sudsText,
                    {
                      color: sessionData.sudsStart === level 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              SUDS после сессии (0-10)
            </Text>
            <View style={styles.sudsContainer}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.sudsButton,
                    {
                      backgroundColor: sessionData.sudsEnd === level 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setSessionData({...sessionData, sudsEnd: level})}
                >
                  <Text style={[
                    styles.sudsText,
                    {
                      color: sessionData.sudsEnd === level 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Заметки
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={sessionData.notes}
              onChangeText={(text) => setSessionData({...sessionData, notes: text})}
              placeholder="Что вы заметили во время сессии?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={settingsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setSettingsModal(false)}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Настройки стимуляции
          </Text>
          <TouchableOpacity onPress={() => setSettingsModal(false)}>
            <MaterialIcons name="check" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={[styles.settingSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Тип стимуляции
            </Text>
            <View style={styles.typeButtons}>
              {[
                { key: 'visual', label: 'Визуальная', icon: 'visibility' },
                { key: 'auditory', label: 'Слуховая', icon: 'volume-up' },
                { key: 'tactile', label: 'Тактильная', icon: 'vibration' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: settings.type === type.key 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setSettings({...settings, type: type.key as any})}
                >
                  <MaterialIcons 
                    name={type.icon as any} 
                    size={24} 
                    color={settings.type === type.key ? 'white' : theme.colors.text} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    {
                      color: settings.type === type.key 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.settingSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Скорость: {settings.speed}ms
            </Text>
            <View style={styles.speedButtons}>
              {[500, 750, 1000, 1250, 1500, 2000].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedButton,
                    {
                      backgroundColor: settings.speed === speed 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setSettings({...settings, speed})}
                >
                  <Text style={[
                    styles.speedButtonText,
                    {
                      color: settings.speed === speed 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {speed}ms
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.settingSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Длительность: {settings.duration} сек
            </Text>
            <View style={styles.speedButtons}>
              {[15, 30, 45, 60, 90, 120].map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.speedButton,
                    {
                      backgroundColor: settings.duration === duration 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setSettings({...settings, duration})}
                >
                  <Text style={[
                    styles.speedButtonText,
                    {
                      color: settings.duration === duration 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {duration}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.settingSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Цвет
            </Text>
            <View style={styles.colorButtons}>
              {['#4ECDC4', '#667eea', '#f093fb', '#43e97b', '#ff6b6b', '#ffa726'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: color,
                      borderWidth: settings.color === color ? 3 : 0,
                      borderColor: theme.colors.text,
                    }
                  ]}
                  onPress={() => setSettings({...settings, color})}
                />
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (isActive) {
              Alert.alert(
                'Остановить сессию?',
                'Вы уверены, что хотите остановить активную сессию?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Остановить', onPress: () => { stopStimulation(); router.back(); } }
                ]
              );
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Билатеральная стимуляция
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Warning */}
      <View style={[styles.warningCard, { backgroundColor: theme.colors.card }]}>
        <MaterialIcons name="warning" size={20} color="#ff6b6b" />
        <Text style={[styles.warningText, { color: theme.colors.text }]}>
          Используйте только в безопасном месте. При сильном дискомфорте остановите сессию.
        </Text>
      </View>

      {/* Stimulation Area */}
      <View style={styles.stimulationArea}>
        {settings.type === 'visual' && renderVisualStimulation()}
        {settings.type === 'auditory' && renderAuditoryStimulation()}
        {settings.type === 'tactile' && renderTactileStimulation()}
      </View>

      {/* Controls */}
      {renderControls()}

      {/* Modals */}
      {renderSessionModal()}
      {renderSettingsModal()}
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  warningText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  stimulationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  visualContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    position: 'relative',
  },
  movingDot: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
  },
  trackLine: {
    position: 'absolute',
    top: '50%',
    left: 50,
    right: 50,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  auditoryContainer: {
    alignItems: 'center',
  },
  auditoryIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  auditoryText: {
    fontSize: 16,
    textAlign: 'center',
  },
  tactileContainer: {
    alignItems: 'center',
  },
  tactileIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  tactileText: {
    fontSize: 16,
    textAlign: 'center',
  },
  controlsContainer: {
    padding: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  mainButton: {
    padding: 20,
    borderRadius: 60,
    alignItems: 'center',
    minWidth: 120,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sudsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sudsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sudsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSection: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  speedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  speedButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 4,
  },
});

export default EMDRBilateralStimulation;
