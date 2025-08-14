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
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface CBTExercise {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Легкий' | 'Средний' | 'Сложный';
  duration: string;
  instructions: string[];
  tips: string[];
  isCompleted: boolean;
  completedTimes: number;
  lastCompleted?: string;
}

interface ExerciseSession {
  id: string;
  exerciseId: string;
  date: string;
  notes: string;
  rating: number;
  helpfulness: number;
}

const CBTExercisesScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [exercises, setExercises] = useState<CBTExercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<CBTExercise | null>(null);
  const [exerciseStep, setExerciseStep] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState(5);

  const categories = ['Все', 'Мышление', 'Поведение', 'Эмоции', 'Релаксация', 'Самооценка'];

  const exercisesData: CBTExercise[] = [
    {
      id: '1',
      title: 'Техника "Остановка мысли"',
      description: 'Научитесь прерывать негативные мыслительные циклы',
      category: 'Мышление',
      difficulty: 'Легкий',
      duration: '5-10 мин',
      instructions: [
        'Заметьте негативную или тревожную мысль',
        'Мысленно или вслух скажите "СТОП!"',
        'Сделайте глубокий вдох',
        'Переключите внимание на что-то конкретное вокруг вас',
        'Замените негативную мысль на нейтральную или позитивную'
      ],
      tips: [
        'Практикуйте технику регулярно, даже когда вы спокойны',
        'Можете носить резинку на запястье и щелкать ею при слове "СТОП"',
        'Подготовьте заранее список позитивных мыслей для замещения'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
    {
      id: '2',
      title: 'Дневник благодарности',
      description: 'Фокусируйтесь на позитивных аспектах жизни',
      category: 'Эмоции',
      difficulty: 'Легкий',
      duration: '5-15 мин',
      instructions: [
        'Каждый день записывайте 3-5 вещей, за которые вы благодарны',
        'Будьте конкретными в описаниях',
        'Включайте как большие, так и маленькие радости',
        'Перечитывайте записи в трудные моменты',
        'Делитесь благодарностью с другими людьми'
      ],
      tips: [
        'Ведите дневник в одно и то же время каждый день',
        'Не повторяйте одни и те же пункты слишком часто',
        'Записывайте не только события, но и эмоции'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
    {
      id: '3',
      title: 'Прогрессивная мышечная релаксация',
      description: 'Снимите физическое и эмоциональное напряжение',
      category: 'Релаксация',
      difficulty: 'Средний',
      duration: '15-20 мин',
      instructions: [
        'Найдите тихое место и лягте комфортно',
        'Начните с мышц стоп - напрягите на 5 секунд, затем расслабьте',
        'Продвигайтесь вверх: голени, бедра, живот, руки, плечи, лицо',
        'Почувствуйте разницу между напряжением и расслаблением',
        'Завершите глубоким дыханием и общим расслаблением'
      ],
      tips: [
        'Не напрягайте мышцы слишком сильно',
        'Используйте спокойную музыку или звуки природы',
        'Практикуйте регулярно для лучшего эффекта'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
    {
      id: '4',
      title: 'Техника "Pros and Cons"',
      description: 'Принимайте более обдуманные решения',
      category: 'Мышление',
      difficulty: 'Средний',
      duration: '10-15 мин',
      instructions: [
        'Четко сформулируйте решение, которое нужно принять',
        'Разделите лист на две колонки: "За" и "Против"',
        'Запишите все аргументы в соответствующие колонки',
        'Оцените важность каждого аргумента по шкале 1-10',
        'Проанализируйте результат и примите решение'
      ],
      tips: [
        'Будьте честными с собой при оценке',
        'Учитывайте как краткосрочные, так и долгосрочные последствия',
        'Обсудите решение с доверенным человеком'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
    {
      id: '5',
      title: 'Экспозиционная терапия (мягкая)',
      description: 'Постепенно преодолевайте страхи и тревоги',
      category: 'Поведение',
      difficulty: 'Сложный',
      duration: '20-30 мин',
      instructions: [
        'Составьте список ситуаций, вызывающих тревогу (от 1 до 10)',
        'Начните с ситуации уровня 3-4',
        'Представьте ситуацию или столкнитесь с ней в реальности',
        'Оставайтесь в ситуации, пока тревога не снизится наполовину',
        'Повторяйте упражнение, пока тревога не станет минимальной'
      ],
      tips: [
        'Не торопитесь переходить к более сложным ситуациям',
        'Используйте техники релаксации во время экспозиции',
        'Обратитесь к специалисту при сильной тревоге'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
    {
      id: '6',
      title: 'Аффирмации и самоподдержка',
      description: 'Укрепите позитивное отношение к себе',
      category: 'Самооценка',
      difficulty: 'Легкий',
      duration: '10-15 мин',
      instructions: [
        'Составьте список ваших сильных сторон и достижений',
        'Создайте позитивные утверждения о себе',
        'Повторяйте аффирмации перед зеркалом каждое утро',
        'Записывайте подтверждения своих положительных качеств',
        'Практикуйте самосострадание при ошибках'
      ],
      tips: [
        'Делайте аффирмации реалистичными и достижимыми',
        'Используйте настоящее время ("Я есть", а не "Я буду")',
        'Повторяйте с искренними эмоциями'
      ],
      isCompleted: false,
      completedTimes: 0,
    },
  ];

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const savedExercises = await AsyncStorage.getItem('cbt_exercises');
      if (savedExercises) {
        setExercises(JSON.parse(savedExercises));
      } else {
        setExercises(exercisesData);
        await AsyncStorage.setItem('cbt_exercises', JSON.stringify(exercisesData));
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      setExercises(exercisesData);
    }
  };

  const saveExercises = async (updatedExercises: CBTExercise[]) => {
    try {
      await AsyncStorage.setItem('cbt_exercises', JSON.stringify(updatedExercises));
      setExercises(updatedExercises);
    } catch (error) {
      console.error('Error saving exercises:', error);
    }
  };

  const filteredExercises = selectedCategory === 'Все' 
    ? exercises 
    : exercises.filter(ex => ex.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Легкий': return '#4ECDC4';
      case 'Средний': return '#667eea';
      case 'Сложный': return '#ff6b6b';
      default: return '#4ECDC4';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Мышление': return 'psychology';
      case 'Поведение': return 'directions-walk';
      case 'Эмоции': return 'mood';
      case 'Релаксация': return 'spa';
      case 'Самооценка': return 'favorite';
      default: return 'fitness-center';
    }
  };

  const startExercise = (exercise: CBTExercise) => {
    setSelectedExercise(exercise);
    setExerciseStep(0);
    setSessionNotes('');
    setSessionRating(5);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const completeExercise = async () => {
    if (!selectedExercise) return;

    const updatedExercises = exercises.map(ex => 
      ex.id === selectedExercise.id 
        ? {
            ...ex,
            isCompleted: true,
            completedTimes: ex.completedTimes + 1,
            lastCompleted: new Date().toISOString()
          }
        : ex
    );

    await saveExercises(updatedExercises);

    // Save exercise session
    const session: ExerciseSession = {
      id: Date.now().toString(),
      exerciseId: selectedExercise.id,
      date: new Date().toISOString(),
      notes: sessionNotes,
      rating: sessionRating,
      helpfulness: sessionRating,
    };

    try {
      const existingSessions = await AsyncStorage.getItem('exercise_sessions');
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);
      await AsyncStorage.setItem('exercise_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session:', error);
    }

    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Отлично!', 'Упражнение завершено! Продолжайте практиковать регулярно.');
  };

  const renderExerciseCard = ({ item }: { item: CBTExercise }) => (
    <TouchableOpacity
      style={[styles.exerciseCard, { backgroundColor: theme.colors.card }]}
      onPress={() => startExercise(item)}
    >
      <View style={styles.exerciseHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
          <MaterialIcons 
            name={getCategoryIcon(item.category) as any} 
            size={16} 
            color={getDifficultyColor(item.difficulty)} 
          />
          <Text style={[styles.categoryText, { color: getDifficultyColor(item.difficulty) }]}>
            {item.category}
          </Text>
        </View>
        {item.isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4ECDC4" />
            <Text style={[styles.completedText, { color: '#4ECDC4' }]}>
              {item.completedTimes}x
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.exerciseTitle, { color: theme.colors.text }]}>
        {item.title}
      </Text>
      <Text style={[styles.exerciseDescription, { color: theme.colors.textSecondary }]}>
        {item.description}
      </Text>

      <View style={styles.exerciseFooter}>
        <View style={styles.exerciseMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {item.duration}
            </Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
            <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
              {item.difficulty}
            </Text>
          </View>
        </View>
        <LinearGradient
          colors={['#4ECDC4', '#667eea']}
          style={styles.startButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.startButtonText}>Начать</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  const renderExerciseModal = () => {
    if (!selectedExercise) return null;

    const isLastStep = exerciseStep === selectedExercise.instructions.length;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedExercise.title}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {!isLastStep ? (
              <>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepNumber, { color: theme.colors.text }]}>
                    Шаг {exerciseStep + 1} из {selectedExercise.instructions.length}
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: theme.colors.surface }]}>
                    <LinearGradient
                      colors={['#4ECDC4', '#667eea']}
                      style={[
                        styles.progressBar,
                        { width: `${((exerciseStep + 1) / selectedExercise.instructions.length) * 100}%` }
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>

                <Text style={[styles.instructionText, { color: theme.colors.text }]}>
                  {selectedExercise.instructions[exerciseStep]}
                </Text>

                {exerciseStep === 0 && selectedExercise.tips.length > 0 && (
                  <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
                      💡 Полезные советы:
                    </Text>
                    {selectedExercise.tips.map((tip, index) => (
                      <Text key={index} style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.completionSection}>
                <View style={styles.completionIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#4ECDC4" />
                </View>
                <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
                  Упражнение завершено!
                </Text>
                <Text style={[styles.completionDescription, { color: theme.colors.textSecondary }]}>
                  Как прошло упражнение? Поделитесь своими мыслями.
                </Text>

                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  Заметки (необязательно):
                </Text>
                <TextInput
                  style={[styles.notesInput, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border 
                  }]}
                  placeholder="Опишите ваши впечатления..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                />

                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  Насколько полезным было упражнение? {sessionRating}/10
                </Text>
                <View style={styles.ratingButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.ratingButton,
                        { backgroundColor: theme.colors.surface },
                        sessionRating === num && { backgroundColor: '#4ECDC4' }
                      ]}
                      onPress={() => setSessionRating(num)}
                    >
                      <Text style={[
                        styles.ratingButtonText,
                        { color: theme.colors.text },
                        sessionRating === num && { color: '#fff' }
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {!isLastStep ? (
              <TouchableOpacity
                style={styles.nextStepButton}
                onPress={() => {
                  if (exerciseStep < selectedExercise.instructions.length - 1) {
                    setExerciseStep(exerciseStep + 1);
                  } else {
                    setExerciseStep(selectedExercise.instructions.length);
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#667eea']}
                  style={styles.nextStepGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextStepText}>
                    {exerciseStep === selectedExercise.instructions.length - 1 ? 'Завершить' : 'Следующий шаг'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={completeExercise}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.completeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="check" size={24} color="#fff" />
                  <Text style={styles.completeButtonText}>Сохранить результат</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Упражнения КПТ
        </Text>
        <TouchableOpacity onPress={() => router.push('/screens/cbt/exercise-history' as any)}>
          <MaterialIcons name="history" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              { backgroundColor: theme.colors.surface },
              selectedCategory === category && {
                backgroundColor: '#4ECDC4',
              }
            ]}
            onPress={() => {
              setSelectedCategory(category);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              styles.categoryButtonText,
              { color: theme.colors.text },
              selectedCategory === category && { color: '#fff' }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercises List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExerciseCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesList}
        showsVerticalScrollIndicator={false}
      />

      {renderExerciseModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exercisesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  exerciseCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  instructionText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 24,
    textAlign: 'center',
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  completionSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  completionIcon: {
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  ratingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  nextStepButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextStepGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextStepText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CBTExercisesScreen;
