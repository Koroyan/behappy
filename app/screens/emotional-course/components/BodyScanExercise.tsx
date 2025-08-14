import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';

interface BodyScanExerciseProps {
  onComplete: (bodyAreas: string[]) => void;
}

export default function BodyScanExercise({ onComplete }: BodyScanExerciseProps) {
  const { isDark } = useTheme();
  
  const bodyAreas = [
    { id: 'head', label: 'Голова', description: 'Область головы, лоб, виски' },
    { id: 'face', label: 'Лицо', description: 'Глаза, щеки, челюсть' },
    { id: 'neck', label: 'Шея', description: 'Горло, задняя часть шеи' },
    { id: 'shoulders', label: 'Плечи', description: 'Верхняя часть рук, плечевой пояс' },
    { id: 'chest', label: 'Грудь', description: 'Область сердца, верхняя часть туловища' },
    { id: 'stomach', label: 'Живот', description: 'Область желудка, кишечника' },
    { id: 'back', label: 'Спина', description: 'Верхняя и нижняя часть спины' },
    { id: 'arms', label: 'Руки', description: 'Предплечья, кисти, пальцы' },
    { id: 'pelvis', label: 'Таз', description: 'Нижняя часть живота, бедра' },
    { id: 'legs', label: 'Ноги', description: 'Колени, голени, ступни' },
  ];
  
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const toggleArea = (areaId: string) => {
    if (selectedAreas.includes(areaId)) {
      setSelectedAreas(selectedAreas.filter(id => id !== areaId));
    } else {
      setSelectedAreas([...selectedAreas, areaId]);
    }
  };
  
  const handleSubmit = () => {
    if (selectedAreas.length > 0) {
      onComplete(selectedAreas);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
        Сканирование тела
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
        Закройте глаза и медленно сканируйте свое тело, обращая внимание на ощущения. 
        Отметьте те области, где вы чувствуете напряжение, дискомфорт или другие 
        заметные ощущения.
      </Text>
      
      <View style={styles.imageContainer}>
        <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <Text style={[styles.placeholderText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Схема тела для сканирования
          </Text>
        </View>
      </View>
      
      <View style={styles.areasContainer}>
        {bodyAreas.map((area) => (
          <TouchableOpacity
            key={area.id}
            style={[
              styles.areaButton,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
              selectedAreas.includes(area.id) && styles.selectedAreaButton
            ]}
            onPress={() => toggleArea(area.id)}
          >
            <Text 
              style={[
                styles.areaLabel, 
                selectedAreas.includes(area.id) ? styles.selectedAreaText : { color: isDark ? '#FFFFFF' : '#111827' }
              ]}
            >
              {area.label}
            </Text>
            <Text 
              style={[
                styles.areaDescription,
                selectedAreas.includes(area.id) ? styles.selectedAreaText : { color: isDark ? '#CBD5E1' : '#4B5563' }
              ]}
            >
              {area.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.infoTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Совет:
        </Text>
        <Text style={[styles.infoText, { color: isDark ? '#CBD5E1' : '#4B5563' }]}>
          Эмоции часто проявляются в нашем теле физически. Например, тревога может 
          ощущаться как напряжение в шее и плечах, страх - как тяжесть в груди, 
          а радость - как легкость и тепло в груди.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          selectedAreas.length === 0 && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={selectedAreas.length === 0}
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bodyImage: {
    width: 200,
    height: 300,
    opacity: 0.8,
  },
  placeholderImage: {
    width: 200,
    height: 300,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    padding: 16,
  },
  areasContainer: {
    marginBottom: 24,
  },
  areaButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedAreaButton: {
    backgroundColor: '#6366F1',
  },
  areaLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  areaDescription: {
    fontSize: 14,
  },
  selectedAreaText: {
    color: '#FFFFFF',
  },
  infoContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
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
