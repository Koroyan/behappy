import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface ThoughtRecord {
  id: string;
  date: string;
  situation: string;
  mood: string;
  moodIntensity: number;
  automaticThought: string;
  thoughtIntensity: number;
  evidence: string;
  alternativeThought: string;
  newMood: string;
  newMoodIntensity: number;
  cognitiveDistortions: string[];
}

const ThoughtRecordScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [thoughtRecord, setThoughtRecord] = useState<Partial<ThoughtRecord>>({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    situation: '',
    mood: '',
    moodIntensity: 5,
    automaticThought: '',
    thoughtIntensity: 5,
    evidence: '',
    alternativeThought: '',
    newMood: '',
    newMoodIntensity: 5,
    cognitiveDistortions: [],
  });

  const steps = [
    {
      title: 'Ситуация',
      description: 'Опишите ситуацию, когда возникли негативные эмоции',
      icon: 'location-on',
    },
    {
      title: 'Настроение',
      description: 'Определите ваше настроение и его интенсивность',
      icon: 'mood',
    },
    {
      title: 'Автоматическая мысль',
      description: 'Какие мысли возникли в этой ситуации?',
      icon: 'psychology',
    },
    {
      title: 'Когнитивные искажения',
      description: 'Выберите типы мыслительных искажений',
      icon: 'visibility',
    },
    {
      title: 'Доказательства',
      description: 'Найдите доказательства за и против этой мысли',
      icon: 'gavel',
    },
    {
      title: 'Альтернативная мысль',
      description: 'Сформулируйте более реалистичную мысль',
      icon: 'lightbulb',
    },
    {
      title: 'Новое настроение',
      description: 'Оцените изменение вашего настроения',
      icon: 'sentiment-satisfied',
    },
  ];

  const cognitiveDistortions = [
    'Чёрно-белое мышление',
    'Катастрофизация',
    'Обесценивание позитивного',
    'Эмоциональное обоснование',
    'Навешивание ярлыков',
    'Ментальный фильтр',
    'Чтение мыслей',
    'Предсказание будущего',
    'Персонализация',
    'Долженствование',
  ];

  const emotions = [
    { name: 'Грусть', color: '#667eea' },
    { name: 'Тревога', color: '#f093fb' },
    { name: 'Злость', color: '#ff6b6b' },
    { name: 'Страх', color: '#764ba2' },
    { name: 'Стыд', color: '#fa709a' },
    { name: 'Вина', color: '#96CEB4' },
    { name: 'Радость', color: '#4ECDC4' },
    { name: 'Спокойствие', color: '#84fab0' },
  ];

  const saveThoughtRecord = async () => {
    try {
      const existingRecords = await AsyncStorage.getItem('thought_records');
      const records = existingRecords ? JSON.parse(existingRecords) : [];
      records.push(thoughtRecord);
      await AsyncStorage.setItem('thought_records', JSON.stringify(records));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Успех', 'Запись мыслей сохранена!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving thought record:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      saveThoughtRecord();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateThoughtRecord = (field: string, value: any) => {
    setThoughtRecord(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleDistortion = (distortion: string) => {
    const currentDistortions = thoughtRecord.cognitiveDistortions || [];
    if (currentDistortions.includes(distortion)) {
      updateThoughtRecord('cognitiveDistortions', 
        currentDistortions.filter(d => d !== distortion)
      );
    } else {
      updateThoughtRecord('cognitiveDistortions', 
        [...currentDistortions, distortion]
      );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return thoughtRecord.situation?.trim();
      case 1: return thoughtRecord.mood?.trim();
      case 2: return thoughtRecord.automaticThought?.trim();
      case 3: return thoughtRecord.cognitiveDistortions?.length;
      case 4: return thoughtRecord.evidence?.trim();
      case 5: return thoughtRecord.alternativeThought?.trim();
      case 6: return thoughtRecord.newMood?.trim();
      default: return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Опишите ситуацию
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Что произошло? Где вы были? С кем? Когда это случилось?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Был на работе, коллега критиковал мою презентацию..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={thoughtRecord.situation}
              onChangeText={(text) => updateThoughtRecord('situation', text)}
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Ваше настроение
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Выберите эмоцию и оцените её интенсивность от 1 до 10
            </Text>
            <View style={styles.emotionsGrid}>
              {emotions.map((emotion) => (
                <TouchableOpacity
                  key={emotion.name}
                  style={[
                    styles.emotionButton,
                    { backgroundColor: emotion.color + '20' },
                    thoughtRecord.mood === emotion.name && { 
                      backgroundColor: emotion.color + '40',
                      borderColor: emotion.color,
                      borderWidth: 2 
                    }
                  ]}
                  onPress={() => updateThoughtRecord('mood', emotion.name)}
                >
                  <Text style={[styles.emotionText, { color: emotion.color }]}>
                    {emotion.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {thoughtRecord.mood && (
              <View style={styles.intensityContainer}>
                <Text style={[styles.intensityLabel, { color: theme.colors.text }]}>
                  Интенсивность: {thoughtRecord.moodIntensity}/10
                </Text>
                <View style={styles.intensityButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.intensityButton,
                        { backgroundColor: theme.colors.card },
                        thoughtRecord.moodIntensity === num && {
                          backgroundColor: '#4ECDC4',
                        }
                      ]}
                      onPress={() => updateThoughtRecord('moodIntensity', num)}
                    >
                      <Text style={[
                        styles.intensityButtonText,
                        { color: theme.colors.text },
                        thoughtRecord.moodIntensity === num && { color: '#fff' }
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Автоматическая мысль
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Что первое пришло в голову? Какие мысли возникли автоматически?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Я никогда не делаю ничего правильно..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={thoughtRecord.automaticThought}
              onChangeText={(text) => updateThoughtRecord('automaticThought', text)}
            />
            <View style={styles.intensityContainer}>
              <Text style={[styles.intensityLabel, { color: theme.colors.text }]}>
                Насколько сильно вы в это верите: {thoughtRecord.thoughtIntensity}/10
              </Text>
              <View style={styles.intensityButtons}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.intensityButton,
                      { backgroundColor: theme.colors.card },
                      thoughtRecord.thoughtIntensity === num && {
                        backgroundColor: '#667eea',
                      }
                    ]}
                    onPress={() => updateThoughtRecord('thoughtIntensity', num)}
                  >
                    <Text style={[
                      styles.intensityButtonText,
                      { color: theme.colors.text },
                      thoughtRecord.thoughtIntensity === num && { color: '#fff' }
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Когнитивные искажения
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Какие типы мыслительных искажений присутствуют в вашей мысли?
            </Text>
            <View style={styles.distortionsGrid}>
              {cognitiveDistortions.map((distortion) => (
                <TouchableOpacity
                  key={distortion}
                  style={[
                    styles.distortionButton,
                    { backgroundColor: theme.colors.card },
                    thoughtRecord.cognitiveDistortions?.includes(distortion) && {
                      backgroundColor: '#f093fb20',
                      borderColor: '#f093fb',
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => toggleDistortion(distortion)}
                >
                  <Text style={[
                    styles.distortionText,
                    { color: theme.colors.text },
                    thoughtRecord.cognitiveDistortions?.includes(distortion) && {
                      color: '#f093fb',
                      fontWeight: '600'
                    }
                  ]}>
                    {distortion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Доказательства
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Найдите доказательства ЗА и ПРОТИВ вашей автоматической мысли
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="ЗА: Что подтверждает эту мысль?&#10;&#10;ПРОТИВ: Что опровергает эту мысль?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              value={thoughtRecord.evidence}
              onChangeText={(text) => updateThoughtRecord('evidence', text)}
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Альтернативная мысль
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Сформулируйте более реалистичную и сбалансированную мысль
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Иногда я делаю ошибки, но это нормально для обучения..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={thoughtRecord.alternativeThought}
              onChangeText={(text) => updateThoughtRecord('alternativeThought', text)}
            />
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Новое настроение
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Как изменилось ваше настроение после работы с мыслями?
            </Text>
            <View style={styles.emotionsGrid}>
              {emotions.map((emotion) => (
                <TouchableOpacity
                  key={emotion.name}
                  style={[
                    styles.emotionButton,
                    { backgroundColor: emotion.color + '20' },
                    thoughtRecord.newMood === emotion.name && { 
                      backgroundColor: emotion.color + '40',
                      borderColor: emotion.color,
                      borderWidth: 2 
                    }
                  ]}
                  onPress={() => updateThoughtRecord('newMood', emotion.name)}
                >
                  <Text style={[styles.emotionText, { color: emotion.color }]}>
                    {emotion.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {thoughtRecord.newMood && (
              <View style={styles.intensityContainer}>
                <Text style={[styles.intensityLabel, { color: theme.colors.text }]}>
                  Интенсивность: {thoughtRecord.newMoodIntensity}/10
                </Text>
                <View style={styles.intensityButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.intensityButton,
                        { backgroundColor: theme.colors.card },
                        thoughtRecord.newMoodIntensity === num && {
                          backgroundColor: '#4ECDC4',
                        }
                      ]}
                      onPress={() => updateThoughtRecord('newMoodIntensity', num)}
                    >
                      <Text style={[
                        styles.intensityButtonText,
                        { color: theme.colors.text },
                        thoughtRecord.newMoodIntensity === num && { color: '#fff' }
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Запись мыслей
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['#4ECDC4', '#667eea']}
            style={[styles.progressBar, { width: `${((currentStep + 1) / steps.length) * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
          {currentStep + 1} из {steps.length}
        </Text>
      </View>

      {/* Step Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepIcon}>
          <MaterialIcons name={steps[currentStep].icon as any} size={24} color="#4ECDC4" />
        </View>
        <Text style={[styles.stepHeaderTitle, { color: theme.colors.text }]}>
          {steps[currentStep].title}
        </Text>
        <Text style={[styles.stepHeaderDescription, { color: theme.colors.textSecondary }]}>
          {steps[currentStep].description}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.card },
              currentStep === 0 && styles.navButtonDisabled
            ]}
            onPress={prevStep}
            disabled={currentStep === 0}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
              Назад
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              !canProceed() && styles.navButtonDisabled
            ]}
            onPress={nextStep}
            disabled={!canProceed()}
          >
            <LinearGradient
              colors={canProceed() ? ['#4ECDC4', '#667eea'] : ['#cccccc', '#aaaaaa']}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Сохранить' : 'Далее'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepHeaderDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
  },
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emotionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  intensityContainer: {
    marginTop: 20,
  },
  intensityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  intensityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  intensityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  distortionsGrid: {
    gap: 12,
  },
  distortionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  distortionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ThoughtRecordScreen;
