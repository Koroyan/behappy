import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface EmotionNamingExerciseProps {
  onComplete: (emotions: { name: string; trigger: string; intensity: number }[]) => void;
}

export default function EmotionNamingExercise({ onComplete }: EmotionNamingExerciseProps) {
  const { isDark } = useTheme();
  const [emotions, setEmotions] = useState<{ name: string; trigger: string; intensity: number }[]>([
    { name: '', trigger: '', intensity: 5 },
    { name: '', trigger: '', intensity: 5 },
    { name: '', trigger: '', intensity: 5 },
  ]);

  const handleEmotionChange = (index: number, field: 'name' | 'trigger' | 'intensity', value: string | number) => {
    const updatedEmotions = [...emotions];
    updatedEmotions[index] = { ...updatedEmotions[index], [field]: value };
    setEmotions(updatedEmotions);
  };

  const handleSubmit = () => {
    // Проверка заполнения хотя бы одной эмоции полностью
    const hasValidEmotion = emotions.some(e => e.name.trim() !== '' && e.trigger.trim() !== '');
    
    if (!hasValidEmotion) {
      Alert.alert('Не хватает информации', 'Пожалуйста, укажите название и триггер хотя бы для одной эмоции');
      return;
    }
    
    // Отфильтруем пустые записи
    const validEmotions = emotions.filter(e => e.name.trim() !== '' && e.trigger.trim() !== '');
    
    onComplete(validEmotions);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Назови свои эмоции
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Определите 3 эмоции, которые вы испытали сегодня, что их вызвало и насколько 
        интенсивными они были по шкале от 1 до 10.
      </Text>
      
      {emotions.map((emotion, index) => (
        <View 
          key={index} 
          style={[
            styles.emotionContainer,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
          ]}
        >
          <Text style={[styles.emotionLabel, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            Эмоция {index + 1}
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Название эмоции
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Например: радость, гнев, страх..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={emotion.name}
              onChangeText={(text) => handleEmotionChange(index, 'name', text)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Что вызвало эту эмоцию?
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Опишите ситуацию или триггер"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={emotion.trigger}
              onChangeText={(text) => handleEmotionChange(index, 'trigger', text)}
              multiline
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Интенсивность (1-10): {emotion.intensity}
            </Text>
            <View style={styles.intensityContainer}>
              <TouchableOpacity
                onPress={() => handleEmotionChange(index, 'intensity', Math.max(1, emotion.intensity - 1))}
                style={[
                  styles.intensityButton,
                  { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
                ]}
              >
                <MaterialIcons name="remove" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
              
              <View 
                style={[
                  styles.intensityBar,
                  { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
                ]}
              >
                <View 
                  style={[
                    styles.intensityFill, 
                    { width: `${(emotion.intensity / 10) * 100}%` }
                  ]}
                />
              </View>
              
              <TouchableOpacity
                onPress={() => handleEmotionChange(index, 'intensity', Math.min(10, emotion.intensity + 1))}
                style={[
                  styles.intensityButton,
                  { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
                ]}
              >
                <MaterialIcons name="add" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
      
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
  emotionContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intensityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 5,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
