import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface SafePlace {
  id: string;
  name: string;
  description: string;
  visualDetails: string;
  sounds: string;
  smells: string;
  feelings: string;
  cueWords: string[];
  strengthening: string;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

interface SafePlaceSession {
  id: string;
  safePlaceId: string;
  duration: number;
  sudsBeforeInstallation: number;
  sudsAfterInstallation: number;
  pcBeforeInstallation: number;
  pcAfterInstallation: number;
  notes: string;
  createdAt: string;
}

const SafePlaceScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [sessions, setSessions] = useState<SafePlaceSession[]>([]);
  const [selectedSafePlace, setSelectedSafePlace] = useState<SafePlace | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationStep, setInstallationStep] = useState(0);

  const [newSafePlace, setNewSafePlace] = useState({
    name: '',
    description: '',
    visualDetails: '',
    sounds: '',
    smells: '',
    feelings: '',
    cueWords: [] as string[],
    strengthening: '',
  });

  const [sessionData, setSessionData] = useState({
    duration: 0,
    sudsBeforeInstallation: 0,
    sudsAfterInstallation: 0,
    pcBeforeInstallation: 0,
    pcAfterInstallation: 0,
    notes: '',
  });

  const installationSteps = [
    {
      title: 'Подготовка',
      description: 'Найдите удобное положение и закройте глаза',
      duration: 60,
    },
    {
      title: 'Визуализация',
      description: 'Представьте ваше безопасное место во всех деталях',
      duration: 180,
    },
    {
      title: 'Усиление ощущений',
      description: 'Сосредоточьтесь на звуках, запахах и телесных ощущениях',
      duration: 120,
    },
    {
      title: 'Эмоциональное подключение',
      description: 'Почувствуйте безопасность и покой в этом месте',
      duration: 120,
    },
    {
      title: 'Создание сигнала',
      description: 'Создайте жест или слово для быстрого доступа',
      duration: 60,
    },
    {
      title: 'Билатеральная стимуляция',
      description: 'Используйте короткие серии движений глаз или постукивания',
      duration: 90,
    },
    {
      title: 'Проверка',
      description: 'Проверьте силу и доступность ресурса',
      duration: 60,
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedSafePlaces = await AsyncStorage.getItem('emdr_safe_places');
      const savedSessions = await AsyncStorage.getItem('emdr_safe_place_sessions');
      
      if (savedSafePlaces) {
        setSafePlaces(JSON.parse(savedSafePlaces));
      }
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveSafePlaces = async (places: SafePlace[]) => {
    try {
      await AsyncStorage.setItem('emdr_safe_places', JSON.stringify(places));
      setSafePlaces(places);
    } catch (error) {
      console.error('Error saving safe places:', error);
    }
  };

  const saveSessions = async (newSessions: SafePlaceSession[]) => {
    try {
      await AsyncStorage.setItem('emdr_safe_place_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const createSafePlace = async () => {
    if (!newSafePlace.name.trim() || !newSafePlace.description.trim()) {
      Alert.alert('Ошибка', 'Заполните название и описание');
      return;
    }

    const safePlace: SafePlace = {
      id: Date.now().toString(),
      name: newSafePlace.name,
      description: newSafePlace.description,
      visualDetails: newSafePlace.visualDetails,
      sounds: newSafePlace.sounds,
      smells: newSafePlace.smells,
      feelings: newSafePlace.feelings,
      cueWords: newSafePlace.cueWords,
      strengthening: newSafePlace.strengthening,
      createdAt: new Date().toISOString(),
      useCount: 0,
    };

    const updatedSafePlaces = [...safePlaces, safePlace];
    await saveSafePlaces(updatedSafePlaces);
    
    setNewSafePlace({
      name: '',
      description: '',
      visualDetails: '',
      sounds: '',
      smells: '',
      feelings: '',
      cueWords: [],
      strengthening: '',
    });
    
    setShowCreateModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const startInstallation = (safePlace: SafePlace) => {
    setSelectedSafePlace(safePlace);
    setSessionData({
      duration: 0,
      sudsBeforeInstallation: 0,
      sudsAfterInstallation: 0,
      pcBeforeInstallation: 0,
      pcAfterInstallation: 0,
      notes: '',
    });
    setInstallationStep(0);
    setShowInstallationModal(true);
  };

  const nextInstallationStep = () => {
    if (installationStep < installationSteps.length - 1) {
      setInstallationStep(installationStep + 1);
      Haptics.selectionAsync();
    } else {
      completeInstallation();
    }
  };

  const completeInstallation = async () => {
    if (!selectedSafePlace) return;

    const session: SafePlaceSession = {
      id: Date.now().toString(),
      safePlaceId: selectedSafePlace.id,
      duration: sessionData.duration,
      sudsBeforeInstallation: sessionData.sudsBeforeInstallation,
      sudsAfterInstallation: sessionData.sudsAfterInstallation,
      pcBeforeInstallation: sessionData.pcBeforeInstallation,
      pcAfterInstallation: sessionData.pcAfterInstallation,
      notes: sessionData.notes,
      createdAt: new Date().toISOString(),
    };

    const newSessions = [...sessions, session];
    await saveSessions(newSessions);

    // Update safe place usage
    const updatedSafePlaces = safePlaces.map(place => {
      if (place.id === selectedSafePlace.id) {
        return {
          ...place,
          useCount: place.useCount + 1,
          lastUsed: new Date().toISOString(),
        };
      }
      return place;
    });
    await saveSafePlaces(updatedSafePlaces);

    setShowInstallationModal(false);
    setSelectedSafePlace(null);
    setInstallationStep(0);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Успех', 'Инсталляция безопасного места завершена');
  };

  const deleteSafePlace = async (safePlaceId: string) => {
    Alert.alert(
      'Удалить безопасное место',
      'Вы уверены, что хотите удалить это безопасное место?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const updatedSafePlaces = safePlaces.filter(place => place.id !== safePlaceId);
            await saveSafePlaces(updatedSafePlaces);
          },
        },
      ]
    );
  };

  const addCueWord = (word: string) => {
    if (word.trim() && !newSafePlace.cueWords.includes(word.trim())) {
      setNewSafePlace({
        ...newSafePlace,
        cueWords: [...newSafePlace.cueWords, word.trim()],
      });
    }
  };

  const removeCueWord = (index: number) => {
    setNewSafePlace({
      ...newSafePlace,
      cueWords: newSafePlace.cueWords.filter((_, i) => i !== index),
    });
  };

  const renderSafePlaceCard = (safePlace: SafePlace) => {
    const lastUsed = safePlace.lastUsed ? new Date(safePlace.lastUsed).toLocaleDateString() : 'Никогда';
    
    return (
      <View key={safePlace.id} style={[styles.safePlaceCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.safePlaceHeader}>
          <View style={styles.safePlaceTitle}>
            <MaterialIcons name="home" size={24} color={theme.colors.primary} />
            <Text style={[styles.safePlaceName, { color: theme.colors.text }]}>
              {safePlace.name}
            </Text>
          </View>
          <View style={styles.safePlaceActions}>
            <TouchableOpacity
              onPress={() => startInstallation(safePlace)}
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            >
              <MaterialIcons name="play-arrow" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteSafePlace(safePlace.id)}
              style={[styles.actionButton, { backgroundColor: '#ff6b6b' }]}
            >
              <MaterialIcons name="delete" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={[styles.safePlaceDescription, { color: theme.colors.textSecondary }]}>
          {safePlace.description}
        </Text>
        
        <View style={styles.safePlaceDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="visibility" size={16} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {safePlace.visualDetails || 'Не указано'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="volume-up" size={16} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {safePlace.sounds || 'Не указано'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="spa" size={16} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {safePlace.smells || 'Не указано'}
            </Text>
          </View>
        </View>
        
        {safePlace.cueWords.length > 0 && (
          <View style={styles.cueWordsContainer}>
            <Text style={[styles.cueWordsTitle, { color: theme.colors.text }]}>
              Слова-сигналы:
            </Text>
            <View style={styles.cueWordsRow}>
              {safePlace.cueWords.map((word, index) => (
                <View key={index} style={[styles.cueWordBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.cueWordText}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.safePlaceStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="access-time" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              Последний раз: {lastUsed}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="fitness-center" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              Использовано: {safePlace.useCount} раз
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCreateModal = () => {
    return (
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Создать безопасное место
            </Text>
            <TouchableOpacity onPress={createSafePlace}>
              <MaterialIcons name="save" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
                Основная информация
              </Text>
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Название места"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.name}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, name: text })}
              />
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Общее описание места"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.description}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
                Сенсорные детали
              </Text>
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Визуальные детали (что вы видите?)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.visualDetails}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, visualDetails: text })}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Звуки (что вы слышите?)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.sounds}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, sounds: text })}
                multiline
                numberOfLines={2}
              />
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Запахи (что вы чувствуете?)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.smells}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, smells: text })}
                multiline
                numberOfLines={2}
              />
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Телесные ощущения (что вы чувствуете в теле?)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.feelings}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, feelings: text })}
                multiline
                numberOfLines={2}
              />
            </View>
            
            <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
                Слова-сигналы
              </Text>
              
              <View style={styles.cueWordsInputContainer}>
                <TextInput
                  style={[styles.cueWordInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Добавить слово-сигнал"
                  placeholderTextColor={theme.colors.textSecondary}
                  onSubmitEditing={(e) => {
                    addCueWord(e.nativeEvent.text);
                  }}
                />
              </View>
              
              <View style={styles.cueWordsList}>
                {newSafePlace.cueWords.map((word, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.cueWordItem, { backgroundColor: theme.colors.primary }]}
                    onPress={() => removeCueWord(index)}
                  >
                    <Text style={styles.cueWordItemText}>{word}</Text>
                    <MaterialIcons name="close" size={16} color="white" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
                Укрепление
              </Text>
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Как вы будете укреплять это безопасное место?"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSafePlace.strengthening}
                onChangeText={(text) => setNewSafePlace({ ...newSafePlace, strengthening: text })}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderInstallationModal = () => {
    if (!selectedSafePlace) return null;
    
    const currentStep = installationSteps[installationStep];
    const progress = ((installationStep + 1) / installationSteps.length) * 100;
    
    return (
      <Modal visible={showInstallationModal} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.installationContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.installationHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={() => setShowInstallationModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.installationTitle, { color: theme.colors.text }]}>
              {selectedSafePlace.name}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={[styles.progressFill, { width: `${progress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              Шаг {installationStep + 1} из {installationSteps.length}
            </Text>
          </View>
          
          <View style={styles.installationContent}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={styles.stepCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepDescription}>{currentStep.description}</Text>
              <Text style={styles.stepDuration}>
                Длительность: {Math.floor(currentStep.duration / 60)}:{(currentStep.duration % 60).toString().padStart(2, '0')}
              </Text>
            </LinearGradient>
            
            {installationStep === 0 && (
              <View style={[styles.safePlaceInfo, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  Ваше безопасное место:
                </Text>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {selectedSafePlace.description}
                </Text>
                {selectedSafePlace.visualDetails && (
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Визуальные детали: {selectedSafePlace.visualDetails}
                  </Text>
                )}
              </View>
            )}
            
            {installationStep === installationSteps.length - 1 && (
              <View style={[styles.evaluationForm, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.evaluationTitle, { color: theme.colors.text }]}>
                  Оценка эффективности
                </Text>
                
                <View style={styles.evaluationItem}>
                  <Text style={[styles.evaluationLabel, { color: theme.colors.text }]}>
                    SUDS до инсталляции: {sessionData.sudsBeforeInstallation}
                  </Text>
                  <View style={styles.ratingContainer}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        style={[styles.ratingButton, { 
                          backgroundColor: sessionData.sudsBeforeInstallation >= rating ? 
                            '#ff6b6b' : theme.colors.border 
                        }]}
                        onPress={() => setSessionData({ ...sessionData, sudsBeforeInstallation: rating })}
                      >
                        <Text style={[styles.ratingText, { 
                          color: sessionData.sudsBeforeInstallation >= rating ? 'white' : theme.colors.textSecondary 
                        }]}>
                          {rating}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.evaluationItem}>
                  <Text style={[styles.evaluationLabel, { color: theme.colors.text }]}>
                    SUDS после инсталляции: {sessionData.sudsAfterInstallation}
                  </Text>
                  <View style={styles.ratingContainer}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        style={[styles.ratingButton, { 
                          backgroundColor: sessionData.sudsAfterInstallation >= rating ? 
                            '#ff6b6b' : theme.colors.border 
                        }]}
                        onPress={() => setSessionData({ ...sessionData, sudsAfterInstallation: rating })}
                      >
                        <Text style={[styles.ratingText, { 
                          color: sessionData.sudsAfterInstallation >= rating ? 'white' : theme.colors.textSecondary 
                        }]}>
                          {rating}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <TextInput
                  style={[styles.notesInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }]}
                  placeholder="Заметки о сессии"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={sessionData.notes}
                  onChangeText={(text) => setSessionData({ ...sessionData, notes: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>
          
          <View style={[styles.installationActions, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
              onPress={nextInstallationStep}
            >
              <Text style={styles.nextButtonText}>
                {installationStep === installationSteps.length - 1 ? 'Завершить' : 'Далее'}
              </Text>
              <MaterialIcons 
                name={installationStep === installationSteps.length - 1 ? 'check' : 'arrow-forward'} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Безопасное место
        </Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <MaterialIcons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialIcons name="info" size={24} color={theme.colors.primary} />
          <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
            Безопасное место - это внутренний ресурс, который помогает создать чувство безопасности и 
            спокойствия. Этот ресурс можно использовать для стабилизации между сессиями EMDR.
          </Text>
        </View>
        
        {safePlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="home" size={64} color={theme.colors.border} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              У вас пока нет безопасных мест
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>Создать первое место</Text>
            </TouchableOpacity>
          </View>
        ) : (
          safePlaces.map(renderSafePlaceCard)
        )}
      </ScrollView>
      
      {renderCreateModal()}
      {renderInstallationModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: 'flex-start',
  },
  infoCardText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  safePlaceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  safePlaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  safePlaceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  safePlaceName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  safePlaceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safePlaceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  safePlaceDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  cueWordsContainer: {
    marginBottom: 16,
  },
  cueWordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cueWordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cueWordBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cueWordText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  safePlaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 12,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  cueWordsInputContainer: {
    marginBottom: 12,
  },
  cueWordInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cueWordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cueWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  cueWordItemText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  installationContainer: {
    flex: 1,
  },
  installationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  installationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  installationContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  stepDuration: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  safePlaceInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  evaluationForm: {
    padding: 20,
    borderRadius: 16,
  },
  evaluationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  evaluationItem: {
    marginBottom: 20,
  },
  evaluationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  installationActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SafePlaceScreen;
