import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MoodTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  selectedMood: any;
}

const MoodTrackerModal: React.FC<MoodTrackerModalProps> = ({
  visible,
  onClose,
  theme,
  selectedMood,
}) => {
  const [stressLevel, setStressLevel] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [notes, setNotes] = useState('');

  const saveDetailedMoodData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingData = await AsyncStorage.getItem('moodTrackingData');
      const moodData = existingData ? JSON.parse(existingData) : [];
      
      const newEntry = {
        date: today,
        mood: selectedMood?.value || 5,
        stress: stressLevel,
        anxiety: anxietyLevel,
        energy: energyLevel,
        sleep: sleepQuality,
        notes: notes,
        timestamp: new Date().toISOString(),
      };
      
      // Check if today's entry exists
      const todayIndex = moodData.findIndex((entry: any) => entry.date === today);
      
      if (todayIndex >= 0) {
        moodData[todayIndex] = { ...moodData[todayIndex], ...newEntry };
      } else {
        moodData.push(newEntry);
      }
      
      // Keep only last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const filteredData = moodData.filter((entry: any) => 
        new Date(entry.date) >= ninetyDaysAgo
      );
      
      await AsyncStorage.setItem('moodTrackingData', JSON.stringify(filteredData));
      
      Alert.alert('Сохранено', 'Данные о настроении записаны для анализа');
      onClose();
      
      // Reset form
      setStressLevel(5);
      setAnxietyLevel(5);
      setEnergyLevel(5);
      setSleepQuality(5);
      setNotes('');
    } catch (error) {
      console.error('Error saving detailed mood data:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    }
  };

  const renderSlider = (
    title: string,
    value: number,
    setValue: (value: number) => void,
    icon: string,
    lowLabel: string,
    highLabel: string,
    color: string
  ) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <FontAwesome5 name={icon} size={16} color={color} />
        <Text style={[styles.sliderTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.sliderValue, { color: color }]}>{value}/10</Text>
      </View>
      
      <View style={styles.sliderTrack}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.sliderDot,
              {
                backgroundColor: num <= value ? color : theme.colors.border,
              },
            ]}
            onPress={() => setValue(num)}
          />
        ))}
      </View>
      
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
          {lowLabel}
        </Text>
        <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
          {highLabel}
        </Text>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      padding: 16,
    },
    moodDisplay: {
      alignItems: 'center',
      marginBottom: 24,
      padding: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
    },
    moodEmoji: {
      fontSize: 48,
      marginBottom: 8,
    },
    moodLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    sliderContainer: {
      marginBottom: 24,
    },
    sliderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sliderTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
      flex: 1,
    },
    sliderValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    sliderTrack: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    sliderDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginHorizontal: 2,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sliderLabel: {
      fontSize: 12,
    },
    saveButton: {
      backgroundColor: theme.colors.accent,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      margin: 16,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    privacyNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      margin: 16,
      marginTop: 8,
    },
    privacyText: {
      fontSize: 11,
      lineHeight: 16,
      marginLeft: 8,
      flex: 1,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Детальная оценка</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome5 name="times" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {selectedMood && (
              <View style={styles.moodDisplay}>
                <Text style={styles.moodEmoji}>{selectedMood.emoji}</Text>
                <Text style={styles.moodLabel}>{selectedMood.label}</Text>
              </View>
            )}

            {renderSlider(
              'Уровень стресса',
              stressLevel,
              setStressLevel,
              'exclamation-triangle',
              'Расслаблен',
              'Очень стресс',
              '#FF3B30'
            )}

            {renderSlider(
              'Уровень тревоги',
              anxietyLevel,
              setAnxietyLevel,
              'heart',
              'Спокоен',
              'Очень тревожен',
              '#FFA500'
            )}

            {renderSlider(
              'Уровень энергии',
              energyLevel,
              setEnergyLevel,
              'bolt',
              'Усталость',
              'Полон энергии',
              '#45B7D1'
            )}

            {renderSlider(
              'Качество сна',
              sleepQuality,
              setSleepQuality,
              'bed',
              'Плохо спал',
              'Отлично спал',
              '#4BB543'
            )}
          </ScrollView>

          <View style={styles.privacyNote}>
            <FontAwesome5 name="shield-alt" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              Данные используются для анализа вашего ментального здоровья и остаются конфиденциальными
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveDetailedMoodData}>
            <Text style={styles.saveButtonText}>Сохранить данные</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default MoodTrackerModal;
