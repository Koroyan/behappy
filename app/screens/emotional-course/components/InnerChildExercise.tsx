import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';

interface InnerChildExerciseProps {
  onComplete: (letter: string, connection: string) => void;
}

export default function InnerChildExercise({ onComplete }: InnerChildExerciseProps) {
  const { isDark } = useTheme();
  const [letter, setLetter] = useState('');
  const [connection, setConnection] = useState('');
  
  const handleSubmit = () => {
    if (!letter.trim()) {
      return;
    }
    
    onComplete(letter.trim(), connection.trim());
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Встреча с внутренним ребенком
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Это упражнение поможет вам установить связь с вашим внутренним ребенком — 
        частью вас, которая сохранила детские эмоции, потребности и воспоминания.
      </Text>
      
      <View style={[styles.meditationContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.meditationTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Визуализация
        </Text>
        
        <Text style={[styles.meditationText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Сядьте удобно, закройте глаза и сделайте несколько глубоких вдохов.
          
          Представьте, что вы идете по знакомой тропинке и впереди видите ребенка — это вы в возрасте 6-7 лет.
          
          Посмотрите, как этот ребенок выглядит, во что он одет, что выражает его лицо. Какие эмоции вы видите?
          
          Подойдите к ребенку и поздоровайтесь. Спросите, как он себя чувствует и что ему нужно.
          
          Слушайте внимательно и с сочувствием, без осуждения или попыток исправить.
        </Text>
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Напишите письмо вашему внутреннему ребенку
        </Text>
        
        <Text style={[styles.sectionDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Выразите поддержку, понимание и принятие. Что бы вы хотели сказать себе в том возрасте?
        </Text>
        
        <TextInput
          style={[
            styles.letterInput,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder="Дорогой(ая)..."
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          multiline
          textAlignVertical="top"
          numberOfLines={12}
          value={letter}
          onChangeText={setLetter}
        />
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Какая связь между вашими текущими эмоциями и детским опытом?
        </Text>
        
        <Text style={[styles.sectionDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Замечаете ли вы, как некоторые сегодняшние эмоциональные реакции могут быть связаны 
          с опытом из детства? Опишите эти связи.
        </Text>
        
        <TextInput
          style={[
            styles.connectionInput,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder="Я заметил(а), что..."
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          multiline
          textAlignVertical="top"
          numberOfLines={6}
          value={connection}
          onChangeText={setConnection}
        />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.infoTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Важно помнить:
        </Text>
        <Text style={[styles.infoText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Это упражнение может вызвать сильные эмоции. Будьте бережны к себе.
        </Text>
        <Text style={[styles.infoText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Если возникают тяжелые воспоминания, рассмотрите возможность обсудить их с профессионалом.
        </Text>
        <Text style={[styles.infoText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Практика общения с внутренним ребенком — это путь к самопринятию и исцелению.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          !letter.trim() && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!letter.trim()}
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
  meditationContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  meditationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  meditationText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  letterInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
  },
  connectionInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  infoContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderStyle: 'solid',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
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
