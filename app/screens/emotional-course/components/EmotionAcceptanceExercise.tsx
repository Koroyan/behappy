import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';

interface EmotionAcceptanceExerciseProps {
  onComplete: (data: {
    emotion: string;
    resistance: string;
    color: string;
    sound: string;
    motion: string;
  }) => void;
}

export default function EmotionAcceptanceExercise({ onComplete }: EmotionAcceptanceExerciseProps) {
  const { isDark } = useTheme();
  const [emotion, setEmotion] = useState('');
  const [resistance, setResistance] = useState('');
  const [color, setColor] = useState('');
  const [sound, setSound] = useState('');
  const [motion, setMotion] = useState('');
  
  const handleSubmit = () => {
    if (!emotion) {
      Alert.alert('Поле не заполнено', 'Пожалуйста, укажите эмоцию, которую вам сложно принять');
      return;
    }
    
    onComplete({
      emotion,
      resistance,
      color,
      sound,
      motion
    });
  };
  
  // Предлагаемые эмоции, которые часто вызывают сопротивление
  const suggestedEmotions = [
    'Гнев', 'Разочарование', 'Страх', 'Грусть', 'Вина',
    'Зависть', 'Стыд', 'Тревога', 'Обида', 'Печаль'
  ];
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Принятие эмоций
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        В этом упражнении вы будете работать с эмоцией, которую вам обычно сложно 
        принять. Помните, что все эмоции естественны и имеют право на существование.
      </Text>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          1. Выберите эмоцию, которую вам сложно принять
        </Text>
        
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder="Например: гнев, страх, зависть..."
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          value={emotion}
          onChangeText={setEmotion}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedContainer}
        >
          {suggestedEmotions.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.suggestionChip,
                { borderColor: isDark ? '#4B5563' : '#D1D5DB' },
                emotion === item && { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' }
              ]}
              onPress={() => setEmotion(item)}
            >
              <Text 
                style={[
                  styles.suggestionText,
                  { color: isDark ? '#CBD5E1' : '#4B5563' },
                  emotion === item && { color: '#6366F1' }
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          2. Что вы обычно делаете с этой эмоцией?
        </Text>
        
        <Text style={[styles.sectionDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Как вы обычно реагируете, когда испытываете эту эмоцию? Подавляете, 
          отрицаете, отвлекаетесь, действуете импульсивно?
        </Text>
        
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder="Опишите ваши типичные реакции..."
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={resistance}
          onChangeText={setResistance}
        />
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          3. Выразите эту эмоцию через:
        </Text>
        
        <View style={styles.expressionContainer}>
          <Text style={[styles.expressionLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            Цвет:
          </Text>
          <TextInput
            style={[
              styles.expressionInput,
              { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#FFFFFF' : '#111827'
              }
            ]}
            placeholder="Какого цвета эта эмоция?"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={color}
            onChangeText={setColor}
          />
        </View>
        
        <View style={styles.expressionContainer}>
          <Text style={[styles.expressionLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            Звук:
          </Text>
          <TextInput
            style={[
              styles.expressionInput,
              { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#FFFFFF' : '#111827'
              }
            ]}
            placeholder="Какой звук соответствует эмоции?"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={sound}
            onChangeText={setSound}
          />
        </View>
        
        <View style={styles.expressionContainer}>
          <Text style={[styles.expressionLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
            Движение:
          </Text>
          <TextInput
            style={[
              styles.expressionInput,
              { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#FFFFFF' : '#111827'
              }
            ]}
            placeholder="Какое движение выражает эмоцию?"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={motion}
            onChangeText={setMotion}
          />
        </View>
      </View>
      
      <View style={styles.reminderContainer}>
        <Text style={[styles.reminderTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Напоминание:
        </Text>
        <Text style={[styles.reminderText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Принятие эмоции не означает, что вам она должна нравиться или что вы всегда 
          должны ей следовать. Принятие — это признание того, что эмоция существует, 
          и она имеет на это право.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>
          Завершить упражнение
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
  exerciseContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    marginBottom: 12,
  },
  suggestedContainer: {
    paddingVertical: 8,
    flexDirection: 'row',
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  expressionContainer: {
    marginBottom: 12,
  },
  expressionLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  expressionInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  reminderContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 14,
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
