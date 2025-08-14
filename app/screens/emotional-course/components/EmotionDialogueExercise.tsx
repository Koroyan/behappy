import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface EmotionDialogueExerciseProps {
  onComplete: (dialogue: {
    emotion1: string;
    emotion2: string;
    conversation: string;
    insight: string;
  }) => void;
}

export default function EmotionDialogueExercise({ onComplete }: EmotionDialogueExerciseProps) {
  const { isDark } = useTheme();
  const [emotion1, setEmotion1] = useState('');
  const [emotion2, setEmotion2] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [insight, setInsight] = useState('');
  
  // Примеры комбинаций эмоций для диалога
  const emotionPairs = [
    { first: 'Страх', second: 'Уверенность' },
    { first: 'Гнев', second: 'Спокойствие' },
    { first: 'Стыд', second: 'Самопринятие' },
    { first: 'Грусть', second: 'Радость' },
    { first: 'Тревога', second: 'Безопасность' }
  ];
  
  const handleSelectPair = (pair: { first: string, second: string }) => {
    setEmotion1(pair.first);
    setEmotion2(pair.second);
  };
  
  const handleSubmit = () => {
    if (!emotion1 || !emotion2 || !dialogue) {
      return;
    }
    
    onComplete({
      emotion1,
      emotion2,
      conversation: dialogue,
      insight
    });
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Диалог эмоций
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        В этом упражнении вы создадите воображаемый диалог между двумя эмоциями, 
        чтобы лучше понять их послания и взаимодействие.
      </Text>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          1. Выберите две эмоции для диалога
        </Text>
        
        <Text style={[styles.sectionDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Вы можете выбрать пару из предложенных или указать свои эмоции
        </Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pairsContainer}
        >
          {emotionPairs.map((pair, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.pairChip,
                { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
                (emotion1 === pair.first && emotion2 === pair.second) && { 
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)' 
                }
              ]}
              onPress={() => handleSelectPair(pair)}
            >
              <Text 
                style={[
                  styles.pairText, 
                  { color: isDark ? '#FFFFFF' : '#111827' },
                  (emotion1 === pair.first && emotion2 === pair.second) && { color: '#6366F1' }
                ]}
              >
                {pair.first} ↔ {pair.second}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.emotionsInputContainer}>
          <View style={styles.emotionInputWrapper}>
            <TextInput
              style={[
                styles.emotionInput,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Эмоция 1"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={emotion1}
              onChangeText={setEmotion1}
            />
          </View>
          
          <Ionicons name="arrow-forward" size={20} color={isDark ? '#FFFFFF' : '#111827'} style={styles.arrowIcon} />
          
          <View style={styles.emotionInputWrapper}>
            <TextInput
              style={[
                styles.emotionInput,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Эмоция 2"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={emotion2}
              onChangeText={setEmotion2}
            />
          </View>
        </View>
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          2. Напишите диалог между эмоциями
        </Text>
        
        <Text style={[styles.sectionDescription, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Представьте, что каждая эмоция — это персонаж со своим голосом, характером 
          и посланием. Что бы они сказали друг другу?
        </Text>
        
        <TextInput
          style={[
            styles.dialogueInput,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder={`${emotion1 || 'Эмоция 1'}: "..."\n\n${emotion2 || 'Эмоция 2'}: "..."\n\n${emotion1 || 'Эмоция 1'}: "..."`}
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          multiline
          textAlignVertical="top"
          numberOfLines={8}
          value={dialogue}
          onChangeText={setDialogue}
        />
      </View>
      
      <View style={[styles.exerciseContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          3. Что вы узнали из этого диалога?
        </Text>
        
        <TextInput
          style={[
            styles.insightInput,
            { 
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              color: isDark ? '#FFFFFF' : '#111827'
            }
          ]}
          placeholder="Какое послание или понимание вы получили?"
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          value={insight}
          onChangeText={setInsight}
        />
      </View>
      
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Советы:
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Будьте искренни и позвольте эмоциям говорить свободно
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Попробуйте прочитать диалог вслух, как будто это пьеса
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Обратите внимание на телесные ощущения во время написания
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Это упражнение можно повторять с разными парами эмоций
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          (!emotion1 || !emotion2 || !dialogue) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!emotion1 || !emotion2 || !dialogue}
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pairsContainer: {
    paddingVertical: 10,
    flexDirection: 'row',
  },
  pairChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  pairText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emotionsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  emotionInputWrapper: {
    flex: 1,
  },
  emotionInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  arrowIcon: {
    marginHorizontal: 10,
  },
  dialogueInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
  },
  insightInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  tipsContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
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
