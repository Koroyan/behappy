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
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface BehaviorExperiment {
  id: string;
  date: string;
  situation: string;
  prediction: string;
  predictionConfidence: number;
  experiment: string;
  outcome: string;
  outcomeConfidence: number;
  learning: string;
  nextSteps: string;
  completed: boolean;
}

const BehaviorExperimentScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [experiment, setExperiment] = useState<Partial<BehaviorExperiment>>({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    situation: '',
    prediction: '',
    predictionConfidence: 5,
    experiment: '',
    outcome: '',
    outcomeConfidence: 5,
    learning: '',
    nextSteps: '',
    completed: false,
  });

  const steps = [
    {
      title: 'Ситуация',
      description: 'Опишите ситуацию, в которой хотите проверить свои убеждения',
      icon: 'location-on',
    },
    {
      title: 'Предсказание',
      description: 'Что, по вашему мнению, произойдет?',
      icon: 'psychology',
    },
    {
      title: 'Эксперимент',
      description: 'Как вы проверите свое предсказание?',
      icon: 'science',
    },
    {
      title: 'Результат',
      description: 'Что на самом деле произошло?',
      icon: 'assignment-turned-in',
    },
    {
      title: 'Выводы',
      description: 'Чему вы научились из этого опыта?',
      icon: 'lightbulb',
    },
  ];

  const experimentTypes = [
    {
      title: 'Социальный эксперимент',
      description: 'Проверка убеждений о социальных взаимодействиях',
      icon: 'people',
      examples: [
        'Начать разговор с незнакомцем',
        'Попросить о помощи',
        'Выразить несогласие',
        'Сделать комплимент',
      ],
    },
    {
      title: 'Эксперимент с тревогой',
      description: 'Проверка катастрофических предсказаний',
      icon: 'warning',
      examples: [
        'Выступить публично',
        'Сделать ошибку намеренно',
        'Не проверять телефон 2 часа',
        'Опоздать на 5 минут',
      ],
    },
    {
      title: 'Эксперимент с уверенностью',
      description: 'Проверка убеждений о собственных способностях',
      icon: 'emoji-emotions',
      examples: [
        'Взяться за новое дело',
        'Предложить свою идею',
        'Отказаться от просьбы',
        'Попробовать новое хобби',
      ],
    },
    {
      title: 'Эксперимент с перфекционизмом',
      description: 'Проверка убеждений о необходимости совершенства',
      icon: 'star',
      examples: [
        'Сделать работу на 80%',
        'Отправить неидеальное сообщение',
        'Не переделывать уже готовое',
        'Поделиться незавершенным проектом',
      ],
    },
  ];

  const saveExperiment = async () => {
    try {
      const existingExperiments = await AsyncStorage.getItem('behavior_experiments');
      const experiments = existingExperiments ? JSON.parse(existingExperiments) : [];
      experiments.push(experiment);
      await AsyncStorage.setItem('behavior_experiments', JSON.stringify(experiments));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Успех', 'Поведенческий эксперимент сохранен!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving experiment:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить эксперимент');
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      saveExperiment();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateExperiment = (field: string, value: any) => {
    setExperiment(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectExampleExperiment = (example: string) => {
    updateExperiment('experiment', example);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return experiment.situation?.trim();
      case 1: return experiment.prediction?.trim();
      case 2: return experiment.experiment?.trim();
      case 3: return experiment.outcome?.trim();
      case 4: return experiment.learning?.trim();
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
              В какой ситуации вы хотите проверить свои убеждения или страхи?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Хочу выступить с презентацией на работе..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={experiment.situation}
              onChangeText={(text) => updateExperiment('situation', text)}
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Ваше предсказание
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Что, по вашему мнению, произойдет? Каких негативных последствий вы ожидаете?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Я забуду слова, все будут смеяться, меня уволят..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={experiment.prediction}
              onChangeText={(text) => updateExperiment('prediction', text)}
            />
            <View style={styles.confidenceContainer}>
              <Text style={[styles.confidenceLabel, { color: theme.colors.text }]}>
                Насколько вы уверены в этом предсказании: {experiment.predictionConfidence}/10
              </Text>
              <View style={styles.confidenceButtons}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.confidenceButton,
                      { backgroundColor: theme.colors.card },
                      experiment.predictionConfidence === num && {
                        backgroundColor: '#f093fb',
                      }
                    ]}
                    onPress={() => updateExperiment('predictionConfidence', num)}
                  >
                    <Text style={[
                      styles.confidenceButtonText,
                      { color: theme.colors.text },
                      experiment.predictionConfidence === num && { color: '#fff' }
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              План эксперимента
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Как именно вы проверите свое предсказание? Что конкретно сделаете?
            </Text>
            
            {/* Experiment Types */}
            <View style={styles.experimentTypesContainer}>
              {experimentTypes.map((type) => (
                <View key={type.title} style={[styles.experimentTypeCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.experimentTypeHeader}>
                    <MaterialIcons name={type.icon as any} size={24} color="#4ECDC4" />
                    <Text style={[styles.experimentTypeTitle, { color: theme.colors.text }]}>
                      {type.title}
                    </Text>
                  </View>
                  <Text style={[styles.experimentTypeDescription, { color: theme.colors.textSecondary }]}>
                    {type.description}
                  </Text>
                  <View style={styles.examplesContainer}>
                    {type.examples.map((example) => (
                      <TouchableOpacity
                        key={example}
                        style={[
                          styles.exampleButton,
                          { backgroundColor: theme.colors.surface },
                          experiment.experiment === example && {
                            backgroundColor: '#4ECDC420',
                            borderColor: '#4ECDC4',
                            borderWidth: 1,
                          }
                        ]}
                        onPress={() => selectExampleExperiment(example)}
                      >
                        <Text style={[
                          styles.exampleText,
                          { color: theme.colors.text },
                          experiment.experiment === example && { color: '#4ECDC4' }
                        ]}>
                          {example}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.orLabel, { color: theme.colors.textSecondary }]}>
              или опишите свой эксперимент:
            </Text>
            
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Опишите конкретные действия..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={experiment.experiment}
              onChangeText={(text) => updateExperiment('experiment', text)}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Результат эксперимента
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Что на самом деле произошло? Насколько ваше предсказание оказалось точным?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Презентация прошла хорошо, никто не смеялся..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={experiment.outcome}
              onChangeText={(text) => updateExperiment('outcome', text)}
            />
            <View style={styles.confidenceContainer}>
              <Text style={[styles.confidenceLabel, { color: theme.colors.text }]}>
                Насколько точным было ваше предсказание: {experiment.outcomeConfidence}/10
              </Text>
              <View style={styles.confidenceButtons}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.confidenceButton,
                      { backgroundColor: theme.colors.card },
                      experiment.outcomeConfidence === num && {
                        backgroundColor: '#4ECDC4',
                      }
                    ]}
                    onPress={() => updateExperiment('outcomeConfidence', num)}
                  >
                    <Text style={[
                      styles.confidenceButtonText,
                      { color: theme.colors.text },
                      experiment.outcomeConfidence === num && { color: '#fff' }
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Выводы и обучение
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Чему вы научились из этого эксперимента? Как это изменит ваше поведение в будущем?
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Например: Я понял, что мои страхи часто преувеличены..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={experiment.learning}
              onChangeText={(text) => updateExperiment('learning', text)}
            />
            
            <Text style={[styles.nextStepsLabel, { color: theme.colors.text }]}>
              Следующие шаги:
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Что вы планируете делать дальше?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={experiment.nextSteps}
              onChangeText={(text) => updateExperiment('nextSteps', text)}
            />
          </View>
        );

      default:
        return null;
    }
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
          Поведенческий эксперимент
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
  confidenceContainer: {
    marginTop: 20,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  confidenceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  confidenceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  experimentTypesContainer: {
    marginBottom: 20,
  },
  experimentTypeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  experimentTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  experimentTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  experimentTypeDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  orLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  nextStepsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
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

export default BehaviorExperimentScreen;
