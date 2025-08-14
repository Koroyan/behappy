import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface SkillPractice {
  id: string;
  skillId: string;
  skillName: string;
  date: string;
  situation: string;
  effectiveness: number;
  notes: string;
  duration: number;
}

interface DBTSkill {
  id: string;
  title: string;
  acronym: string;
  description: string;
  steps: string[];
  whenToUse: string;
  color: string[];
  icon: string;
  practiceCount: number;
  lastPracticed?: string;
}

const DBTDistressTolerance = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedSkill, setSelectedSkill] = useState<DBTSkill | null>(null);
  const [practiceModal, setPracticeModal] = useState(false);
  const [practiceData, setPracticeData] = useState({
    situation: '',
    effectiveness: 5,
    notes: '',
    duration: 0,
  });
  const [practices, setPractices] = useState<SkillPractice[]>([]);

  const distressToleranceSkills: DBTSkill[] = [
    {
      id: 'tipp',
      title: 'TIPP',
      acronym: 'Temperature, Intense exercise, Paced breathing, Progressive muscle relaxation',
      description: 'Быстрые способы снижения интенсивности эмоций в критических ситуациях',
      steps: [
        'Temperature - Измените температуру тела (холодная вода на лицо, лед)',
        'Intense exercise - Интенсивные упражнения (бег, прыжки, отжимания)',
        'Paced breathing - Медленное дыхание (выдох длиннее вдоха)',
        'Progressive muscle relaxation - Попеременное напряжение и расслабление мышц'
      ],
      whenToUse: 'Когда эмоции очень интенсивные (8-10 баллов) и нужно быстро снизить их уровень',
      color: ['#667eea', '#764ba2'],
      icon: 'flash-on',
      practiceCount: 0,
    },
    {
      id: 'stop',
      title: 'STOP',
      acronym: 'Stop, Take a breath, Observe, Proceed',
      description: 'Техника для предотвращения импульсивных действий',
      steps: [
        'Stop - Остановитесь, заморозьте все движения',
        'Take a breath - Сделайте глубокий вдох',
        'Observe - Понаблюдайте за своими мыслями, эмоциями и ощущениями',
        'Proceed - Продолжите с осознанным действием'
      ],
      whenToUse: 'Когда чувствуете импульс к деструктивному поведению',
      color: ['#f093fb', '#f5576c'],
      icon: 'pan-tool',
      practiceCount: 0,
    },
    {
      id: 'radical-acceptance',
      title: 'Радикальное принятие',
      acronym: 'Radical Acceptance',
      description: 'Полное принятие реальности без попыток ее изменить',
      steps: [
        'Признайте факты ситуации такими, какие они есть',
        'Примите, что некоторые вещи находятся вне вашего контроля',
        'Позвольте себе почувствовать боль от ситуации',
        'Отпустите борьбу с реальностью',
        'Сосредоточьтесь на том, что можете контролировать'
      ],
      whenToUse: 'Когда сталкиваетесь с неизменяемой болезненной реальностью',
      color: ['#4facfe', '#00f2fe'],
      icon: 'sentiment-neutral',
      practiceCount: 0,
    },
    {
      id: 'distraction',
      title: 'Отвлечение',
      acronym: 'ACCEPTS',
      description: 'Техники отвлечения от болезненных переживаний',
      steps: [
        'Activities - Заняться активностями',
        'Contributing - Помочь кому-то другому',
        'Comparisons - Сравнить с худшими временами',
        'Emotions - Вызвать противоположные эмоции',
        'Pushing away - Мысленно отодвинуть проблему',
        'Thoughts - Занять ум другими мыслями',
        'Sensations - Использовать интенсивные ощущения'
      ],
      whenToUse: 'Когда нужно временно отвлечься от болезненных эмоций',
      color: ['#43e97b', '#38f9d7'],
      icon: 'psychology',
      practiceCount: 0,
    },
    {
      id: 'self-soothing',
      title: 'Самоуспокоение',
      acronym: 'Five Senses',
      description: 'Успокоение через использование пяти чувств',
      steps: [
        'Зрение - Посмотрите на что-то красивое',
        'Слух - Послушайте приятную музыку или звуки природы',
        'Запах - Почувствуйте приятные ароматы',
        'Вкус - Попробуйте что-то вкусное',
        'Осязание - Потрогайте что-то приятное на ощупь'
      ],
      whenToUse: 'Когда нужно успокоиться и позаботиться о себе',
      color: ['#a8edea', '#fed6e3'],
      icon: 'spa',
      practiceCount: 0,
    },
    {
      id: 'improve',
      title: 'IMPROVE',
      acronym: 'Imagery, Meaning, Prayer, Relaxation, One thing, Vacation, Encouragement',
      description: 'Улучшение момента через различные техники',
      steps: [
        'Imagery - Представьте успокаивающие образы',
        'Meaning - Найдите смысл в ситуации',
        'Prayer - Молитва или духовная практика',
        'Relaxation - Техники расслабления',
        'One thing - Сосредоточьтесь на одной вещи',
        'Vacation - Мысленный отпуск',
        'Encouragement - Подбодрите себя'
      ],
      whenToUse: 'Когда нужно улучшить болезненный момент',
      color: ['#96CEB4', '#FFECD2'],
      icon: 'auto-fix-high',
      practiceCount: 0,
    },
  ];

  useEffect(() => {
    loadPractices();
  }, []);

  const loadPractices = async () => {
    try {
      const savedPractices = await AsyncStorage.getItem('dbt_distress_practices');
      if (savedPractices) {
        setPractices(JSON.parse(savedPractices));
      }
    } catch (error) {
      console.error('Error loading practices:', error);
    }
  };

  const savePractice = async (practice: SkillPractice) => {
    try {
      const newPractices = [...practices, practice];
      await AsyncStorage.setItem('dbt_distress_practices', JSON.stringify(newPractices));
      setPractices(newPractices);
    } catch (error) {
      console.error('Error saving practice:', error);
    }
  };

  const handlePracticeSkill = (skill: DBTSkill) => {
    setSelectedSkill(skill);
    setPracticeModal(true);
    setPracticeData({
      situation: '',
      effectiveness: 5,
      notes: '',
      duration: 0,
    });
  };

  const submitPractice = async () => {
    if (!selectedSkill) return;

    const practice: SkillPractice = {
      id: Date.now().toString(),
      skillId: selectedSkill.id,
      skillName: selectedSkill.title,
      date: new Date().toISOString(),
      situation: practiceData.situation,
      effectiveness: practiceData.effectiveness,
      notes: practiceData.notes,
      duration: practiceData.duration,
    };

    await savePractice(practice);
    setPracticeModal(false);
    setSelectedSkill(null);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Отлично!', 'Практика навыка зафиксирована');
  };

  const renderSkillCard = (skill: DBTSkill) => (
    <TouchableOpacity
      key={skill.id}
      style={[styles.skillCard, { backgroundColor: theme.colors.card }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedSkill(skill);
      }}
    >
      <LinearGradient
        colors={skill.color as any}
        style={styles.skillGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.skillHeader}>
          <MaterialIcons name={skill.icon as any} size={32} color="white" />
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={() => handlePracticeSkill(skill)}
          >
            <MaterialIcons name="play-arrow" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.skillTitle}>{skill.title}</Text>
        <Text style={styles.skillAcronym}>{skill.acronym}</Text>
        <Text style={styles.skillDescription}>{skill.description}</Text>
        <View style={styles.skillFooter}>
          <View style={styles.practiceCount}>
            <MaterialIcons name="fitness-center" size={16} color="white" />
            <Text style={styles.practiceCountText}>
              {skill.practiceCount} практик
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSkillDetail = () => {
    if (!selectedSkill) return null;

    return (
      <Modal
        visible={!!selectedSkill}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedSkill(null)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedSkill.title}
            </Text>
            <TouchableOpacity onPress={() => handlePracticeSkill(selectedSkill)}>
              <MaterialIcons name="play-arrow" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.skillDetailCard, { backgroundColor: theme.colors.card }]}>
              <LinearGradient
                colors={selectedSkill.color as any}
                style={styles.skillDetailGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name={selectedSkill.icon as any} size={48} color="white" />
                <Text style={styles.skillDetailTitle}>{selectedSkill.title}</Text>
                <Text style={styles.skillDetailAcronym}>{selectedSkill.acronym}</Text>
              </LinearGradient>
            </View>

            <View style={[styles.detailSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
                Описание
              </Text>
              <Text style={[styles.detailSectionText, { color: theme.colors.text }]}>
                {selectedSkill.description}
              </Text>
            </View>

            <View style={[styles.detailSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
                Шаги выполнения
              </Text>
              {selectedSkill.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.colors.text }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.detailSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
                Когда использовать
              </Text>
              <Text style={[styles.detailSectionText, { color: theme.colors.text }]}>
                {selectedSkill.whenToUse}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderPracticeModal = () => (
    <Modal
      visible={practiceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setPracticeModal(false)}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Практика навыка
          </Text>
          <TouchableOpacity onPress={submitPractice}>
            <MaterialIcons name="check" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Ситуация
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.situation}
              onChangeText={(text) => setPracticeData({...practiceData, situation: text})}
              placeholder="Опишите ситуацию, в которой применили навык"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Эффективность (1-10)
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    {
                      backgroundColor: practiceData.effectiveness >= rating 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setPracticeData({...practiceData, effectiveness: rating})}
                >
                  <Text style={[
                    styles.ratingText,
                    {
                      color: practiceData.effectiveness >= rating 
                        ? 'white' 
                        : theme.colors.text
                    }
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Заметки
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.notes}
              onChangeText={(text) => setPracticeData({...practiceData, notes: text})}
              placeholder="Дополнительные заметки о практике"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Устойчивость к стрессу
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <MaterialIcons name="info" size={24} color="#667eea" />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                Навыки устойчивости к стрессу
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Эти навыки помогают пережить кризисные ситуации без ухудшения состояния. 
              Они не решают проблемы, но дают возможность выжить в трудный момент.
            </Text>
          </LinearGradient>
        </View>

        {/* Skills */}
        <View style={styles.skillsContainer}>
          {distressToleranceSkills.map(renderSkillCard)}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderSkillDetail()}
      {renderPracticeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  infoCard: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  skillsContainer: {
    paddingHorizontal: 20,
  },
  skillCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skillGradient: {
    padding: 20,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  practiceButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  skillTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  skillAcronym: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  skillDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  skillFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  practiceCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceCountText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  skillDetailCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skillDetailGradient: {
    padding: 30,
    alignItems: 'center',
  },
  skillDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  skillDetailAcronym: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  detailSection: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailSectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  inputSection: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  ratingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DBTDistressTolerance;
