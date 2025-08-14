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

interface Resource {
  id: string;
  name: string;
  type: 'strength' | 'nurturing' | 'wisdom' | 'protection' | 'other';
  description: string;
  bodyFeelings: string;
  emotions: string;
  cueWord: string;
  installationDate: string;
  strengthLevel: number;
  usageCount: number;
  lastUsed?: string;
  installationSteps: {
    step: number;
    description: string;
    completed: boolean;
  }[];
}

interface ResourceInstallationSession {
  id: string;
  resourceId: string;
  startTime: string;
  endTime?: string;
  steps: {
    step: number;
    startTime: string;
    endTime?: string;
    effectiveness: number;
    notes: string;
  }[];
  completed: boolean;
  finalStrength: number;
}

const EMDRResourceInstallationScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [sessions, setSessions] = useState<ResourceInstallationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ResourceInstallationSession | null>(null);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showInstallationSteps, setShowInstallationSteps] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState({
    name: '',
    type: 'strength' as 'strength' | 'nurturing' | 'wisdom' | 'protection' | 'other',
    description: '',
    bodyFeelings: '',
    emotions: '',
    cueWord: '',
  });

  const resourceTypes = [
    { id: 'strength', name: 'Сила', icon: 'fitness-center', color: '#4ECDC4' },
    { id: 'nurturing', name: 'Забота', icon: 'favorite', color: '#f093fb' },
    { id: 'wisdom', name: 'Мудрость', icon: 'psychology', color: '#667eea' },
    { id: 'protection', name: 'Защита', icon: 'shield', color: '#43e97b' },
    { id: 'other', name: 'Другое', icon: 'star', color: '#ffa726' },
  ];

  const installationSteps = [
    {
      step: 1,
      title: 'Активация ресурса',
      description: 'Мысленно представьте свой ресурс. Почувствуйте его качества.',
      instruction: 'Закройте глаза и вспомните момент, когда вы чувствовали это качество наиболее ярко.',
    },
    {
      step: 2,
      title: 'Усиление образа',
      description: 'Сделайте образ более ярким и четким.',
      instruction: 'Увеличьте яркость, контрастность, добавьте детали к вашему образу.',
    },
    {
      step: 3,
      title: 'Телесные ощущения',
      description: 'Сосредоточьтесь на телесных ощущениях.',
      instruction: 'Где в теле вы чувствуете этот ресурс? Какие ощущения он вызывает?',
    },
    {
      step: 4,
      title: 'Билатеральная стимуляция',
      description: 'Применяйте билатеральную стимуляцию.',
      instruction: '12-24 движения глаз или тактильная стимуляция.',
    },
    {
      step: 5,
      title: 'Проверка силы',
      description: 'Оцените силу ресурса от 1 до 10.',
      instruction: 'Насколько сильно вы чувствуете этот ресурс прямо сейчас?',
    },
    {
      step: 6,
      title: 'Повторение',
      description: 'Повторите процесс 3-5 раз.',
      instruction: 'Каждый раз усиливайте образ и телесные ощущения.',
    },
    {
      step: 7,
      title: 'Создание сигнала',
      description: 'Создайте сигнал для быстрого доступа.',
      instruction: 'Свяжите ресурс с кодовым словом или жестом.',
    },
  ];

  useEffect(() => {
    loadResources();
    loadSessions();
  }, []);

  const loadResources = async () => {
    try {
      const saved = await AsyncStorage.getItem('emdr_resources');
      if (saved) {
        setResources(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const saved = await AsyncStorage.getItem('emdr_resource_sessions');
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveResources = async (newResources: Resource[]) => {
    try {
      await AsyncStorage.setItem('emdr_resources', JSON.stringify(newResources));
      setResources(newResources);
    } catch (error) {
      console.error('Error saving resources:', error);
    }
  };

  const saveSessions = async (newSessions: ResourceInstallationSession[]) => {
    try {
      await AsyncStorage.setItem('emdr_resource_sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const addResource = () => {
    if (!resourceForm.name.trim()) {
      Alert.alert('Ошибка', 'Введите название ресурса');
      return;
    }

    const newResource: Resource = {
      id: Date.now().toString(),
      name: resourceForm.name,
      type: resourceForm.type,
      description: resourceForm.description,
      bodyFeelings: resourceForm.bodyFeelings,
      emotions: resourceForm.emotions,
      cueWord: resourceForm.cueWord,
      installationDate: new Date().toISOString(),
      strengthLevel: 0,
      usageCount: 0,
      installationSteps: installationSteps.map((step, index) => ({
        step: index + 1,
        description: step.description,
        completed: false,
      })),
    };

    const newResources = [newResource, ...resources];
    saveResources(newResources);
    
    setResourceForm({
      name: '',
      type: 'strength',
      description: '',
      bodyFeelings: '',
      emotions: '',
      cueWord: '',
    });
    setShowAddResource(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startInstallation = (resource: Resource) => {
    setSelectedResource(resource);
    setShowInstallationSteps(true);
    
    const newSession: ResourceInstallationSession = {
      id: Date.now().toString(),
      resourceId: resource.id,
      startTime: new Date().toISOString(),
      steps: [],
      completed: false,
      finalStrength: 0,
    };
    
    setCurrentSession(newSession);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const completeInstallationStep = (stepNumber: number, effectiveness: number, notes: string) => {
    if (!currentSession) return;

    const stepData = {
      step: stepNumber,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      effectiveness,
      notes,
    };

    const updatedSession = {
      ...currentSession,
      steps: [...currentSession.steps, stepData],
    };

    setCurrentSession(updatedSession);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const finishInstallation = (finalStrength: number) => {
    if (!currentSession || !selectedResource) return;

    const completedSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      completed: true,
      finalStrength,
    };

    const updatedSessions = [completedSession, ...sessions];
    saveSessions(updatedSessions);

    // Update resource
    const updatedResource = {
      ...selectedResource,
      strengthLevel: finalStrength,
      usageCount: selectedResource.usageCount + 1,
      lastUsed: new Date().toISOString(),
    };

    const updatedResources = resources.map(r =>
      r.id === selectedResource.id ? updatedResource : r
    );
    saveResources(updatedResources);

    setCurrentSession(null);
    setSelectedResource(null);
    setShowInstallationSteps(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteResource = (resourceId: string) => {
    Alert.alert(
      'Удалить ресурс',
      'Вы уверены, что хотите удалить этот ресурс?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedResources = resources.filter(r => r.id !== resourceId);
            saveResources(updatedResources);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const getResourceTypeInfo = (type: string) => {
    return resourceTypes.find(t => t.id === type) || resourceTypes[0];
  };

  const renderResourceCard = ({ item }: { item: Resource }) => {
    const typeInfo = getResourceTypeInfo(item.type);
    const lastUsedDate = item.lastUsed ? new Date(item.lastUsed) : null;

    return (
      <View style={[styles.resourceCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.resourceHeader}>
          <View style={styles.resourceInfo}>
            <View style={styles.resourceTitle}>
              <MaterialIcons 
                name={typeInfo.icon as any} 
                size={24} 
                color={typeInfo.color} 
              />
              <Text style={[styles.resourceName, { color: theme.colors.text }]}>
                {item.name}
              </Text>
            </View>
            <View style={[styles.resourceTypeBadge, { backgroundColor: typeInfo.color }]}>
              <Text style={styles.resourceTypeBadgeText}>{typeInfo.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteResource(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.resourceDescription, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>

        <View style={styles.resourceStats}>
          <View style={styles.resourceStat}>
            <Text style={[styles.resourceStatLabel, { color: theme.colors.textSecondary }]}>
              Сила
            </Text>
            <Text style={[styles.resourceStatValue, { color: typeInfo.color }]}>
              {item.strengthLevel}/10
            </Text>
          </View>
          <View style={styles.resourceStat}>
            <Text style={[styles.resourceStatLabel, { color: theme.colors.textSecondary }]}>
              Использований
            </Text>
            <Text style={[styles.resourceStatValue, { color: theme.colors.text }]}>
              {item.usageCount}
            </Text>
          </View>
          {lastUsedDate && (
            <View style={styles.resourceStat}>
              <Text style={[styles.resourceStatLabel, { color: theme.colors.textSecondary }]}>
                Последнее использование
              </Text>
              <Text style={[styles.resourceStatValue, { color: theme.colors.text }]}>
                {lastUsedDate.toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.resourceActions}>
          <TouchableOpacity
            style={styles.useResourceButton}
            onPress={() => startInstallation(item)}
          >
            <LinearGradient
              colors={[typeInfo.color, `${typeInfo.color}CC`]}
              style={styles.useResourceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="play-arrow" size={20} color="#ffffff" />
              <Text style={styles.useResourceText}>Провести инсталляцию</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {item.cueWord && (
          <View style={styles.cueWordContainer}>
            <Text style={[styles.cueWordLabel, { color: theme.colors.textSecondary }]}>
              Кодовое слово:
            </Text>
            <Text style={[styles.cueWord, { color: typeInfo.color }]}>
              &quot;{item.cueWord}&quot;
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderInstallationStep = (step: any, index: number) => {
    const isCompleted = currentSession?.steps.some(s => s.step === step.step);
    const isNext = index === (currentSession?.steps.length || 0);

    return (
      <View key={step.step} style={[
        styles.installationStep,
        isCompleted && styles.completedStep,
        isNext && styles.nextStep,
      ]}>
        <View style={styles.stepHeader}>
          <View style={[
            styles.stepNumber,
            { backgroundColor: isCompleted ? '#4ECDC4' : isNext ? '#667eea' : '#e0e0e0' }
          ]}>
            <Text style={[
              styles.stepNumberText,
              { color: isCompleted || isNext ? '#ffffff' : '#666666' }
            ]}>
              {step.step}
            </Text>
          </View>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            {step.title}
          </Text>
        </View>
        
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
          {step.description}
        </Text>
        
        <Text style={[styles.stepInstruction, { color: theme.colors.text }]}>
          {step.instruction}
        </Text>

        {isNext && (
          <View style={styles.stepActions}>
            <TouchableOpacity
              style={styles.completeStepButton}
              onPress={() => {
                Alert.prompt(
                  'Завершить шаг',
                  'Оцените эффективность шага от 1 до 10 и добавьте заметки',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Завершить',
                      onPress: (input) => {
                        const effectiveness = parseInt(input || '5');
                        completeInstallationStep(step.step, effectiveness, '');
                      },
                    },
                  ],
                  'plain-text',
                  '5'
                );
              }}
            >
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.completeStepGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="check" size={20} color="#ffffff" />
                <Text style={styles.completeStepText}>Завершить шаг</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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
            Инсталляция ресурсов
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddResource(true)}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
            Статистика ресурсов
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#4ECDC4' }]}>
                {resources.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Ресурсов
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#667eea' }]}>
                {sessions.filter(s => s.completed).length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Сессий
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#f093fb' }]}>
                {resources.length > 0 ? 
                  Math.round(resources.reduce((sum, r) => sum + r.strengthLevel, 0) / resources.length * 10) / 10 
                  : 0
                }
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Средняя сила
              </Text>
            </View>
          </View>
        </View>

        {/* Resources List */}
        <View style={styles.resourcesContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Мои ресурсы ({resources.length})
          </Text>
          
          {resources.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <MaterialIcons name="auto-awesome" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Нет созданных ресурсов
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddResource(true)}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.emptyStateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Создать первый ресурс
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={resources}
              renderItem={renderResourceCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.resourcesList}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Resource Modal */}
      {showAddResource && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Создать ресурс
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Название ресурса
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={resourceForm.name}
                onChangeText={(text) => setResourceForm({ ...resourceForm, name: text })}
                placeholder="Например: Внутренняя сила"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Тип ресурса
              </Text>
              <View style={styles.typeButtons}>
                {resourceTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      resourceForm.type === type.id && { backgroundColor: type.color },
                    ]}
                    onPress={() => setResourceForm({ ...resourceForm, type: type.id as any })}
                  >
                    <MaterialIcons 
                      name={type.icon as any} 
                      size={20} 
                      color={resourceForm.type === type.id ? '#ffffff' : '#666666'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      { color: resourceForm.type === type.id ? '#ffffff' : '#666666' }
                    ]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Описание
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={resourceForm.description}
                onChangeText={(text) => setResourceForm({ ...resourceForm, description: text })}
                placeholder="Опишите ваш ресурс..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Телесные ощущения
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={resourceForm.bodyFeelings}
                onChangeText={(text) => setResourceForm({ ...resourceForm, bodyFeelings: text })}
                placeholder="Как вы чувствуете это в теле?"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Эмоции
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={resourceForm.emotions}
                onChangeText={(text) => setResourceForm({ ...resourceForm, emotions: text })}
                placeholder="Какие эмоции вы испытываете?"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Кодовое слово (необязательно)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text }
                ]}
                value={resourceForm.cueWord}
                onChangeText={(text) => setResourceForm({ ...resourceForm, cueWord: text })}
                placeholder="Слово для быстрого доступа"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddResource(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={addResource}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalButtonText}>Создать</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Installation Steps Modal */}
      {showInstallationSteps && selectedResource && (
        <View style={styles.modalOverlay}>
          <View style={[styles.installationModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.installationHeader}>
              <Text style={[styles.installationTitle, { color: theme.colors.text }]}>
                Инсталляция: {selectedResource.name}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInstallationSteps(false)}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.installationSteps} showsVerticalScrollIndicator={false}>
              {installationSteps.map((step, index) => renderInstallationStep(step, index))}
            </ScrollView>

            {currentSession && currentSession.steps.length === installationSteps.length && (
              <View style={styles.finishInstallation}>
                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={() => {
                    Alert.prompt(
                      'Завершить инсталляцию',
                      'Оцените итоговую силу ресурса от 1 до 10',
                      [
                        { text: 'Отмена', style: 'cancel' },
                        {
                          text: 'Завершить',
                          onPress: (input) => {
                            const finalStrength = parseInt(input || '5');
                            finishInstallation(finalStrength);
                          },
                        },
                      ],
                      'plain-text',
                      '7'
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
                    <Text style={styles.finishButtonText}>Завершить инсталляцию</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
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
  resourcesContainer: {
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
  resourcesList: {
    paddingBottom: 20,
  },
  resourceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  resourceTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resourceTypeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  resourceDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  resourceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  resourceStat: {
    alignItems: 'center',
    flex: 1,
  },
  resourceStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  resourceStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resourceActions: {
    marginBottom: 10,
  },
  useResourceButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  useResourceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  useResourceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cueWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cueWordLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  cueWord: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
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
  installationModal: {
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
  installationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  installationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  installationSteps: {
    flex: 1,
  },
  installationStep: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  completedStep: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4ECDC4',
  },
  nextStep: {
    backgroundColor: '#e8f0ff',
    borderColor: '#667eea',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  stepInstruction: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  stepActions: {
    alignItems: 'center',
  },
  completeStepButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  completeStepGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  completeStepText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  finishInstallation: {
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

export default EMDRResourceInstallationScreen;
