import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface EmotionalJournalExerciseProps {
  onComplete: (journalEntries: {
    time: string;
    emotion: string;
    trigger: string;
    intensity: number;
  }[]) => void;
}

export default function EmotionalJournalExercise({ onComplete }: EmotionalJournalExerciseProps) {
  const { isDark } = useTheme();
  
  const [entries, setEntries] = useState<{
    time: string;
    emotion: string;
    trigger: string;
    intensity: number;
  }[]>([
    { time: '', emotion: '', trigger: '', intensity: 5 },
    { time: '', emotion: '', trigger: '', intensity: 5 }
  ]);
  
  const handleEntryChange = (index: number, field: 'time' | 'emotion' | 'trigger' | 'intensity', value: string | number) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setEntries(updatedEntries);
  };
  
  const addEntry = () => {
    setEntries([...entries, { time: '', emotion: '', trigger: '', intensity: 5 }]);
  };
  
  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);
  };
  
  const handleSubmit = () => {
    // Проверка валидности записей
    const validEntries = entries.filter(
      entry => entry.time.trim() !== '' && entry.emotion.trim() !== '' && entry.trigger.trim() !== ''
    );
    
    if (validEntries.length > 0) {
      onComplete(validEntries);
    }
  };
  
  const isEntryComplete = (entry: { time: string; emotion: string; trigger: string }) => {
    return entry.time.trim() !== '' && entry.emotion.trim() !== '' && entry.trigger.trim() !== '';
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Эмоциональный дневник
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Отслеживайте свои эмоции, чтобы развить осознанность и лучше понимать свои 
        эмоциональные паттерны. Запишите информацию о 2-3 эмоциональных моментах, 
        которые вы испытали сегодня.
      </Text>
      
      {entries.map((entry, index) => (
        <View 
          key={index} 
          style={[
            styles.entryContainer,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
          ]}
        >
          <View style={styles.entryHeader}>
            <Text style={[styles.entryTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Запись {index + 1}
            </Text>
            
            {entries.length > 1 && (
              <TouchableOpacity
                onPress={() => removeEntry(index)}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={18} color={isDark ? '#CBD5E1' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Время
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Например: 14:30 или утро"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={entry.time}
              onChangeText={(text) => handleEntryChange(index, 'time', text)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Эмоция
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Какую эмоцию вы испытали?"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              value={entry.emotion}
              onChangeText={(text) => handleEntryChange(index, 'emotion', text)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Триггер
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#111827'
                }
              ]}
              placeholder="Что вызвало эту эмоцию?"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              multiline
              textAlignVertical="top"
              numberOfLines={3}
              value={entry.trigger}
              onChangeText={(text) => handleEntryChange(index, 'trigger', text)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
              Интенсивность (1-10): {entry.intensity}
            </Text>
            <View style={styles.intensityContainer}>
              <TouchableOpacity
                onPress={() => handleEntryChange(index, 'intensity', Math.max(1, entry.intensity - 1))}
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
                    { width: `${(entry.intensity / 10) * 100}%` }
                  ]}
                />
              </View>
              
              <TouchableOpacity
                onPress={() => handleEntryChange(index, 'intensity', Math.min(10, entry.intensity + 1))}
                style={[
                  styles.intensityButton,
                  { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
                ]}
              >
                <MaterialIcons name="add" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.completionBadge}>
            {isEntryComplete(entry) ? (
              <View style={styles.completeEntry}>
                <MaterialIcons name="check-circle" size={16} color="#10B981" />
                <Text style={styles.completeText}>Заполнено</Text>
              </View>
            ) : (
              <View style={styles.incompleteEntry}>
                <MaterialIcons name="info" size={16} color="#F59E0B" />
                <Text style={styles.incompleteText}>Заполните все поля</Text>
              </View>
            )}
          </View>
        </View>
      ))}
      
      <TouchableOpacity 
        style={[
          styles.addButton,
          { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }
        ]}
        onPress={addEntry}
      >
        <MaterialIcons name="add" size={20} color="#6366F1" />
        <Text style={styles.addButtonText}>Добавить запись</Text>
      </TouchableOpacity>
      
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Советы для ведения эмоционального дневника:
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Записывайте эмоции как можно скорее после их появления
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Будьте конкретны в описании триггеров
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Отмечайте паттерны и связи между ситуациями и эмоциями
        </Text>
        <Text style={[styles.tipItem, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          • Старайтесь вести дневник регулярно для лучшего эффекта
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          !entries.some(isEntryComplete) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!entries.some(isEntryComplete)}
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
  entryContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
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
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
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
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#6366F1',
  },
  completionBadge: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  completeEntry: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#10B981',
  },
  incompleteEntry: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incompleteText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#F59E0B',
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
