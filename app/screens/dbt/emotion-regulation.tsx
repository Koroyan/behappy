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
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface EmotionRegulationSkill {
  id: string;
  title: string;
  acronym: string;
  description: string;
  steps: string[];
  whenToUse: string;
  color: string[];
  icon: string;
  practiceCount: number;
  difficulty: 'Легкий' | 'Средний' | 'Сложный';
  category: 'understanding' | 'changing' | 'coping' | 'opposite';
}

interface SkillPractice {
  id: string;
  skillId: string;
  skillName: string;
  date: string;
  situation: string;
  emotionBefore: string;
  emotionAfter: string;
  intensityBefore: number;
  intensityAfter: number;
  effectiveness: number;
  notes: string;
}

const DBTEmotionRegulation = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedSkill, setSelectedSkill] = useState<EmotionRegulationSkill | null>(null);
  const [practiceModal, setPracticeModal] = useState(false);
  const [practiceData, setPracticeData] = useState({
    situation: '',
    emotionBefore: '',
    emotionAfter: '',
    intensityBefore: 5,
    intensityAfter: 5,
    effectiveness: 5,
    notes: '',
  });
  const [practices, setPractices] = useState<SkillPractice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const emotionRegulationSkills: EmotionRegulationSkill[] = [
    {
      id: 'please',
      title: 'PLEASE',
      acronym: 'Physical illness, Eating, Avoid substances, Sleep, Exercise',
      description: 'Забота о физическом здоровье для улучшения эмоциональной регуляции',
      steps: [
        'Physical illness - Лечите физические заболевания',
        'Eating - Питайтесь сбалансированно',
        'Avoid substances - Избегайте алкоголя и наркотиков',
        'Sleep - Получайте достаточно сна',
        'Exercise - Регулярно занимайтесь спортом'
      ],
      whenToUse: 'Ежедневно для поддержания эмоционального баланса',
      color: ['#4ECDC4', '#44A08D'],
      icon: 'health-and-safety',
      practiceCount: 0,
      difficulty: 'Легкий',
      category: 'understanding',
    },
    {
      id: 'abc-please',
      title: 'ABC PLEASE',
      acronym: 'Accumulate positives, Build mastery, Cope ahead + PLEASE',
      description: 'Предотвращение негативных эмоций через позитивные активности',
      steps: [
        'Accumulate positives - Накапливайте позитивные эмоции',
        'Build mastery - Развивайте мастерство в чем-то',
        'Cope ahead - Планируйте преодоление трудностей',
        'Применяйте навыки PLEASE'
      ],
      whenToUse: 'Для профилактики эмоциональных кризисов',
      color: ['#667eea', '#764ba2'],
      icon: 'build',
      practiceCount: 0,
      difficulty: 'Средний',
      category: 'understanding',
    },
    {
      id: 'opposite-action',
      title: 'Противоположное действие',
      acronym: 'Opposite Action',
      description: 'Действие противоположное тому, к чему побуждает эмоция',
      steps: [
        'Определите эмоцию и её побуждение',
        'Проверьте, оправдана ли эмоция фактами',
        'Если неоправдана, действуйте противоположно',
        'Делайте это полностью и с убеждением',
        'Повторяйте до изменения эмоции'
      ],
      whenToUse: 'Когда эмоция неоправдана или чрезмерна',
      color: ['#f093fb', '#f5576c'],
      icon: 'swap-horiz',
      practiceCount: 0,
      difficulty: 'Сложный',
      category: 'opposite',
    },
    {
      id: 'check-the-facts',
      title: 'Проверка фактов',
      acronym: 'Check the Facts',
      description: 'Определение оправданности эмоции через анализ фактов',
      steps: [
        'Какая эмоция возникла?',
        'Что её спровоцировало?',
        'Каковы мои интерпретации?',
        'Соответствуют ли факты моим мыслям?',
        'Оправдана ли интенсивность эмоции?'
      ],
      whenToUse: 'Когда сомневаетесь в адекватности эмоциональной реакции',
      color: ['#43e97b', '#38f9d7'],
      icon: 'fact-check',
      practiceCount: 0,
      difficulty: 'Средний',
      category: 'understanding',
    },
    {
      id: 'problem-solving',
      title: 'Решение проблем',
      acronym: 'Problem Solving',
      description: 'Изменение ситуации, вызывающей болезненную эмоцию',
      steps: [
        'Определите проблему конкретно',
        'Проверьте, можно ли её решить',
        'Найдите возможные решения',
        'Выберите наилучшее решение',
        'Действуйте по плану'
      ],
      whenToUse: 'Когда эмоция оправдана и ситуацию можно изменить',
      color: ['#4facfe', '#00f2fe'],
      icon: 'construction',
      practiceCount: 0,
      difficulty: 'Средний',
      category: 'changing',
    },
    {
      id: 'mindfulness-of-emotions',
      title: 'Осознанность эмоций',
      acronym: 'Mindfulness of Emotions',
      description: 'Наблюдение за эмоциями без попыток их изменить',
      steps: [
        'Заметьте эмоцию и назовите её',
        'Понаблюдайте за телесными ощущениями',
        'Понаблюдайте за мыслями',
        'Помните: вы не ваши эмоции',
        'Позвольте эмоции быть, не борясь с ней'
      ],
      whenToUse: 'Когда нужно принять эмоцию без её изменения',
      color: ['#a8edea', '#fed6e3'],
      icon: 'visibility',
      practiceCount: 0,
      difficulty: 'Средний',
      category: 'coping',
    },
    {
      id: 'emotional-surfing',
      title: 'Эмоциональный серфинг',
      acronym: 'Emotional Surfing',
      description: 'Переживание эмоциональной волны без усиления',
      steps: [
        'Заметьте начало эмоции',
        'Не боритесь с ней и не подпитывайте',
        'Дышите и расслабляйтесь',
        'Наблюдайте, как она достигает пика',
        'Позвольте ей естественно утихнуть'
      ],
      whenToUse: 'При интенсивных эмоциях, которые нужно пережить',
      color: ['#96CEB4', '#FFECD2'],
      icon: 'waves',
      practiceCount: 0,
      difficulty: 'Сложный',
      category: 'coping',
    },
    {
      id: 'emotional-regulation-in-the-moment',
      title: 'Регуляция в моменте',
      acronym: 'TIPP + Distraction',
      description: 'Быстрое снижение эмоциональной интенсивности',
      steps: [
        'Используйте TIPP для снижения интенсивности',
        'Отвлекитесь на другие активности',
        'Используйте самоуспокоение',
        'Примените техники заземления',
        'Вернитесь к ситуации позже'
      ],
      whenToUse: 'В острых эмоциональных состояниях',
      color: ['#ff6b6b', '#ffa726'],
      icon: 'speed',
      practiceCount: 0,
      difficulty: 'Средний',
      category: 'coping',
    },
  ];

  const categories = [
    { id: 'all', title: 'Все навыки', color: '#667eea' },
    { id: 'understanding', title: 'Понимание эмоций', color: '#4ECDC4' },
    { id: 'changing', title: 'Изменение ситуации', color: '#4facfe' },
    { id: 'coping', title: 'Совладание с эмоциями', color: '#a8edea' },
    { id: 'opposite', title: 'Противоположное действие', color: '#f093fb' },
  ];

  const filteredSkills = selectedCategory === 'all' 
    ? emotionRegulationSkills 
    : emotionRegulationSkills.filter(skill => skill.category === selectedCategory);

  useEffect(() => {
    loadPractices();
  }, []);

  const loadPractices = async () => {
    try {
      const savedPractices = await AsyncStorage.getItem('emotion_regulation_practices');
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
      await AsyncStorage.setItem('emotion_regulation_practices', JSON.stringify(newPractices));
      setPractices(newPractices);
    } catch (error) {
      console.error('Error saving practice:', error);
    }
  };

  const handlePracticeSkill = (skill: EmotionRegulationSkill) => {
    setSelectedSkill(skill);
    setPracticeModal(true);
    setPracticeData({
      situation: '',
      emotionBefore: '',
      emotionAfter: '',
      intensityBefore: 5,
      intensityAfter: 5,
      effectiveness: 5,
      notes: '',
    });
  };

  const submitPractice = async () => {
    if (!selectedSkill || !practiceData.situation || !practiceData.emotionBefore) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    const practice: SkillPractice = {
      id: Date.now().toString(),
      skillId: selectedSkill.id,
      skillName: selectedSkill.title,
      date: new Date().toISOString(),
      situation: practiceData.situation,
      emotionBefore: practiceData.emotionBefore,
      emotionAfter: practiceData.emotionAfter,
      intensityBefore: practiceData.intensityBefore,
      intensityAfter: practiceData.intensityAfter,
      effectiveness: practiceData.effectiveness,
      notes: practiceData.notes,
    };

    await savePractice(practice);
    setPracticeModal(false);
    setSelectedSkill(null);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Отлично!', 'Практика эмоциональной регуляции сохранена');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Легкий': return '#4ECDC4';
      case 'Средний': return '#667eea';
      case 'Сложный': return '#ff6b6b';
      default: return '#4ECDC4';
    }
  };

  const renderSkillCard = (skill: EmotionRegulationSkill) => (
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
          <View style={styles.skillIconContainer}>
            <MaterialIcons name={skill.icon as any} size={32} color="white" />
          </View>
          <View style={styles.skillHeaderRight}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(skill.difficulty) }]}>
              <Text style={styles.difficultyText}>{skill.difficulty}</Text>
            </View>
            <TouchableOpacity
              style={styles.practiceButton}
              onPress={() => handlePracticeSkill(skill)}
            >
              <MaterialIcons name="play-arrow" size={20} color="white" />
            </TouchableOpacity>
          </View>
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
          <MaterialIcons name="chevron-right" size={24} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSkillDetail = () => {
    if (!selectedSkill) return null;

    return (
      <Modal
        visible={!!selectedSkill && !practiceModal}
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
                <View style={[styles.skillDetailBadge, { backgroundColor: getDifficultyColor(selectedSkill.difficulty) }]}>
                  <Text style={styles.skillDetailBadgeText}>{selectedSkill.difficulty}</Text>
                </View>
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
              Ситуация *
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
              Эмоция до применения навыка *
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.emotionBefore}
              onChangeText={(text) => setPracticeData({...practiceData, emotionBefore: text})}
              placeholder="Какую эмоцию вы испытывали?"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Интенсивность до (1-10)
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    {
                      backgroundColor: practiceData.intensityBefore >= rating 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setPracticeData({...practiceData, intensityBefore: rating})}
                >
                  <Text style={[
                    styles.ratingText,
                    {
                      color: practiceData.intensityBefore >= rating 
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
              Эмоция после применения навыка
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.emotionAfter}
              onChangeText={(text) => setPracticeData({...practiceData, emotionAfter: text})}
              placeholder="Какую эмоцию вы испытывали после?"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Интенсивность после (1-10)
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    {
                      backgroundColor: practiceData.intensityAfter >= rating 
                        ? theme.colors.primary 
                        : theme.colors.background
                    }
                  ]}
                  onPress={() => setPracticeData({...practiceData, intensityAfter: rating})}
                >
                  <Text style={[
                    styles.ratingText,
                    {
                      color: practiceData.intensityAfter >= rating 
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
          Регуляция эмоций
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
                Навыки регуляции эмоций
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Эти навыки помогают понимать, изменять и справляться с эмоциями. 
              Цель - не избавиться от эмоций, а научиться управлять ими эффективно.
            </Text>
          </LinearGradient>
        </View>

        {/* Category Filter */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === category.id 
                      ? category.color 
                      : theme.colors.card
                  }
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.categoryText,
                  {
                    color: selectedCategory === category.id 
                      ? 'white' 
                      : theme.colors.text
                  }
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Skills */}
        <View style={styles.skillsContainer}>
          {filteredSkills.map(renderSkillCard)}
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
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
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
  skillIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
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
    marginBottom: 16,
  },
  skillDetailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  skillDetailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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

export default DBTEmotionRegulation;
