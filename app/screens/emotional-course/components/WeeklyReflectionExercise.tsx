import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface WeeklyReflectionExerciseProps {
  onComplete: (answers: { [key: string]: string }) => void;
}

export default function WeeklyReflectionExercise({ onComplete }: WeeklyReflectionExerciseProps) {
  const { isDark } = useTheme();
  
  const reflectionQuestions = [
    {
      id: 'patterns',
      question: 'Что вас удивило в ваших эмоциональных паттернах на этой неделе?',
      placeholder: 'Например: я заметил(а), что чаще всего испытываю тревогу утром...',
    },
    {
      id: 'emotion',
      question: 'С какой эмоцией вы познакомились лучше всего на этой неделе?',
      placeholder: 'Например: я лучше понял(а) свой гнев и то, как он проявляется...',
    },
    {
      id: 'different',
      question: 'Какую ситуацию вы обработали по-другому благодаря новым навыкам?',
      placeholder: 'Например: когда коллега критиковал мою работу, я...',
    },
    {
      id: 'learned',
      question: 'Какой самый важный урок вы извлекли из этой недели практики?',
      placeholder: 'Например: я понял(а), что...',
    },
    {
      id: 'next',
      question: 'Какой навык эмоциональной регуляции вы хотите развить дальше?',
      placeholder: 'Например: я хочу научиться лучше...',
    }
  ];
  
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  
  const handleAnswerChange = (id: string, text: string) => {
    setAnswers({ ...answers, [id]: text });
  };
  
  const isFormComplete = () => {
    // Должен быть заполнен хотя бы один ответ
    return Object.values(answers).some(answer => answer.trim() !== '');
  };
  
  const handleSubmit = () => {
    if (isFormComplete()) {
      onComplete(answers);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Недельная рефлексия
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Поздравляем с завершением первой недели курса эмоционального интеллекта! 
        Уделите время, чтобы осмыслить ваш прогресс и открытия.
      </Text>
      
      <View style={[styles.celebrationContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>🎉</Text>
        </View>
        <Text style={[styles.celebrationText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Вы прошли первую неделю практики!
        </Text>
        <Text style={[styles.celebrationSubtext, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          За это время вы освоили основы распознавания, принятия и работы с эмоциями
        </Text>
      </View>
      
      {reflectionQuestions.map((item) => (
        <View 
          key={item.id} 
          style={[
            styles.questionContainer,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
          ]}
        >
          <Text style={[styles.questionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {item.question}
          </Text>
          
          <TextInput
            style={[
              styles.answerInput,
              { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#FFFFFF' : '#111827'
              }
            ]}
            placeholder={item.placeholder}
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            multiline
            textAlignVertical="top"
            numberOfLines={4}
            value={answers[item.id] || ''}
            onChangeText={(text) => handleAnswerChange(item.id, text)}
          />
          
          {answers[item.id]?.trim() !== '' && (
            <View style={styles.answeredBadge}>
              <MaterialIcons name="check-circle" size={16} color="#10B981" />
              <Text style={styles.answeredText}>Заполнено</Text>
            </View>
          )}
        </View>
      ))}
      
      <View style={styles.affirmationContainer}>
        <Text style={[styles.affirmationTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Утверждение недели:
        </Text>
        <Text style={[styles.affirmationText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          "Я учусь понимать язык своих эмоций."
        </Text>
        <Text style={[styles.affirmationSubtext, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Повторяйте это утверждение, когда вам нужна поддержка в работе с эмоциями
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          !isFormComplete() && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!isFormComplete()}
      >
        <Text style={styles.submitButtonText}>
          Завершить рефлексию
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  celebrationContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiContainer: {
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
  },
  celebrationText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  questionContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  answerInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  answeredText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#10B981',
  },
  affirmationContainer: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  affirmationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
    color: '#FFFFFF',
  },
  affirmationText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  affirmationSubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.9,
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
