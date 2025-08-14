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

interface CognitiveDistortion {
  id: string;
  name: string;
  description: string;
  examples: string[];
  antidote: string;
  questions: string[];
  color: string[];
  icon: string;
  userExamples: string[];
  practiceCount: number;
}

interface DistortionPractice {
  id: string;
  distortionId: string;
  date: string;
  situation: string;
  distortedThought: string;
  reframedThought: string;
  effectiveness: number;
}

const CognitiveDistortionsScreen = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedDistortion, setSelectedDistortion] = useState<CognitiveDistortion | null>(null);
  const [practiceModal, setPracticeModal] = useState(false);
  const [practiceData, setPracticeData] = useState({
    situation: '',
    distortedThought: '',
    reframedThought: '',
    effectiveness: 5,
  });
  const [practices, setPractices] = useState<DistortionPractice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const cognitiveDistortions: CognitiveDistortion[] = [
    {
      id: 'all-or-nothing',
      name: 'Черно-белое мышление',
      description: 'Видение вещей только в крайностях - либо идеально, либо полный провал.',
      examples: [
        'Если я не сделаю это идеально, я полный неудачник',
        'Все меня ненавидят',
        'Я никогда ничего не делаю правильно',
      ],
      antidote: 'Ищите промежуточные варианты и серые зоны. Жизнь полна нюансов.',
      questions: [
        'Есть ли промежуточные варианты между этими крайностями?',
        'Что бы я сказал другу в такой ситуации?',
        'Какие доказательства против этого утверждения?',
      ],
      color: ['#667eea', '#764ba2'],
      icon: 'tonality',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'catastrophizing',
      name: 'Катастрофизация',
      description: 'Ожидание худшего возможного исхода без реальных оснований.',
      examples: [
        'Если я провалю этот экзамен, моя жизнь будет разрушена',
        'Эта головная боль - точно что-то серьезное',
        'Если я опоздаю, меня уволят',
      ],
      antidote: 'Задайте себе вопрос: "Какова вероятность того, что это действительно произойдет?"',
      questions: [
        'Какова реальная вероятность этого исхода?',
        'Что самое худшее может произойти, и как я с этим справлюсь?',
        'Случалось ли подобное раньше, и как все закончилось?',
      ],
      color: ['#ff6b6b', '#ffa726'],
      icon: 'warning',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'mind-reading',
      name: 'Чтение мыслей',
      description: 'Предположение о том, что вы знаете, что думают другие люди.',
      examples: [
        'Он думает, что я глупый',
        'Она не отвечает, потому что злится на меня',
        'Все считают меня скучным',
      ],
      antidote: 'Помните: вы не можете читать мысли. Спрашивайте напрямую.',
      questions: [
        'Есть ли у меня реальные доказательства этих мыслей?',
        'Могу ли я спросить напрямую, что они думают?',
        'Какие другие объяснения возможны?',
      ],
      color: ['#4ECDC4', '#44A08D'],
      icon: 'psychology',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'fortune-telling',
      name: 'Предсказание будущего',
      description: 'Предположение о том, что вы знаете, что произойдет в будущем.',
      examples: [
        'Я никогда не найду работу',
        'Это отношение обречено на провал',
        'Я всегда буду одиноким',
      ],
      antidote: 'Будущее неопределенно. Сосредоточьтесь на том, что можете контролировать сейчас.',
      questions: [
        'Основано ли это предсказание на фактах или на страхах?',
        'Что я могу сделать сейчас, чтобы повлиять на исход?',
        'Бывали ли мои негативные прогнозы неверными раньше?',
      ],
      color: ['#f093fb', '#f5576c'],
      icon: 'crystal-ball',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'personalization',
      name: 'Персонализация',
      description: 'Принятие на себя ответственности за вещи, которые не под вашим контролем.',
      examples: [
        'Это моя вина, что встреча прошла плохо',
        'Если бы я был лучшим родителем, мой ребенок не болел бы',
        'Дождь испортил пикник - я должен был проверить прогноз',
      ],
      antidote: 'Различайте, что находится под вашим контролем, а что нет.',
      questions: [
        'Что в этой ситуации я действительно могу контролировать?',
        'Какие другие факторы могли повлиять на этот исход?',
        'Взял бы я на себя ответственность за хорошие вещи так же легко?',
      ],
      color: ['#43e97b', '#38f9d7'],
      icon: 'person',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'emotional-reasoning',
      name: 'Эмоциональное рассуждение',
      description: 'Принятие эмоций за факты: "Я чувствую, значит это правда".',
      examples: [
        'Я чувствую себя виноватым, значит я плохой человек',
        'Мне страшно лететь, значит это опасно',
        'Я чувствую себя неудачником, значит я ничего не умею',
      ],
      antidote: 'Эмоции - это не факты. Они отражают ваши мысли, но не обязательно реальность.',
      questions: [
        'Какие факты подтверждают или опровергают это чувство?',
        'Что бы я сказал другу, который чувствует то же самое?',
        'Как бы я оценил эту ситуацию, если бы не испытывал этих эмоций?',
      ],
      color: ['#a8edea', '#fed6e3'],
      icon: 'favorite',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'mental-filter',
      name: 'Ментальный фильтр',
      description: 'Фокусирование только на негативных аспектах ситуации.',
      examples: [
        'Из 10 комплиментов помню только одну критику',
        'Презентация прошла хорошо, но я сделал одну ошибку',
        'Весь день был испорчен из-за одного неприятного разговора',
      ],
      antidote: 'Сознательно ищите позитивные аспекты и сбалансированную картину.',
      questions: [
        'Что хорошего произошло в этой ситуации?',
        'Фокусируюсь ли я только на негативе?',
        'Как бы беспристрастный наблюдатель описал эту ситуацию?',
      ],
      color: ['#96CEB4', '#FFECD2'],
      icon: 'filter-alt',
      userExamples: [],
      practiceCount: 0,
    },
    {
      id: 'should-statements',
      name: 'Долженствование',
      description: 'Жесткие правила о том, как вы или другие "должны" себя вести.',
      examples: [
        'Я должен всегда быть сильным',
        'Люди должны быть справедливыми',
        'Я не должен делать ошибок',
      ],
      antidote: 'Замените "должен" на "предпочитаю" или "хотел бы".',
      questions: [
        'Откуда взялось это правило?',
        'Помогает ли мне это утверждение или мешает?',
        'Что случится, если я не буду следовать этому правилу?',
      ],
      color: ['#84fab0', '#8fd3f4'],
      icon: 'rule',
      userExamples: [],
      practiceCount: 0,
    },
  ];

  const filteredDistortions = cognitiveDistortions.filter(distortion =>
    distortion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    distortion.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadPractices();
  }, []);

  const loadPractices = async () => {
    try {
      const savedPractices = await AsyncStorage.getItem('distortion_practices');
      if (savedPractices) {
        setPractices(JSON.parse(savedPractices));
      }
    } catch (error) {
      console.error('Error loading practices:', error);
    }
  };

  const savePractice = async (practice: DistortionPractice) => {
    try {
      const newPractices = [...practices, practice];
      await AsyncStorage.setItem('distortion_practices', JSON.stringify(newPractices));
      setPractices(newPractices);
    } catch (error) {
      console.error('Error saving practice:', error);
    }
  };

  const handlePracticeDistortion = (distortion: CognitiveDistortion) => {
    setSelectedDistortion(distortion);
    setPracticeModal(true);
    setPracticeData({
      situation: '',
      distortedThought: '',
      reframedThought: '',
      effectiveness: 5,
    });
  };

  const submitPractice = async () => {
    if (!selectedDistortion || !practiceData.situation || !practiceData.distortedThought) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    const practice: DistortionPractice = {
      id: Date.now().toString(),
      distortionId: selectedDistortion.id,
      date: new Date().toISOString(),
      situation: practiceData.situation,
      distortedThought: practiceData.distortedThought,
      reframedThought: practiceData.reframedThought,
      effectiveness: practiceData.effectiveness,
    };

    await savePractice(practice);
    setPracticeModal(false);
    setSelectedDistortion(null);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Отлично!', 'Практика когнитивной перестройки сохранена');
  };

  const renderDistortionCard = (distortion: CognitiveDistortion) => (
    <TouchableOpacity
      key={distortion.id}
      style={[styles.distortionCard, { backgroundColor: theme.colors.card }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDistortion(distortion);
      }}
    >
      <LinearGradient
        colors={distortion.color as any}
        style={styles.distortionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.distortionHeader}>
          <MaterialIcons name={distortion.icon as any} size={32} color="white" />
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={() => handlePracticeDistortion(distortion)}
          >
            <MaterialIcons name="fitness-center" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.distortionName}>{distortion.name}</Text>
        <Text style={styles.distortionDescription}>{distortion.description}</Text>
        <View style={styles.distortionFooter}>
          <Text style={styles.practiceCount}>
            Практик: {distortion.practiceCount}
          </Text>
          <MaterialIcons name="chevron-right" size={24} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderDistortionDetail = () => {
    if (!selectedDistortion) return null;

    return (
      <Modal
        visible={!!selectedDistortion && !practiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedDistortion(null)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedDistortion.name}
            </Text>
            <TouchableOpacity onPress={() => handlePracticeDistortion(selectedDistortion)}>
              <MaterialIcons name="fitness-center" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.detailCard, { backgroundColor: theme.colors.card }]}>
              <LinearGradient
                colors={selectedDistortion.color as any}
                style={styles.detailGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name={selectedDistortion.icon as any} size={48} color="white" />
                <Text style={styles.detailTitle}>{selectedDistortion.name}</Text>
                <Text style={styles.detailDescription}>{selectedDistortion.description}</Text>
              </LinearGradient>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Примеры мыслей
              </Text>
              {selectedDistortion.examples.map((example, index) => (
                <View key={index} style={styles.exampleItem}>
                  <MaterialIcons name="format-quote" size={16} color={theme.colors.primary} />
                  <Text style={[styles.exampleText, { color: theme.colors.text }]}>
                    {example}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Антидот
              </Text>
              <Text style={[styles.antidoteText, { color: theme.colors.text }]}>
                {selectedDistortion.antidote}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Вопросы для размышления
              </Text>
              {selectedDistortion.questions.map((question, index) => (
                <View key={index} style={styles.questionItem}>
                  <View style={[styles.questionNumber, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.questionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.questionText, { color: theme.colors.text }]}>
                    {question}
                  </Text>
                </View>
              ))}
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
            Практика перестройки
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
              placeholder="Опишите ситуацию, в которой возникла искаженная мысль"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Искаженная мысль *
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.distortedThought}
              onChangeText={(text) => setPracticeData({...practiceData, distortedThought: text})}
              placeholder="Какая именно мысль была искажена?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Переработанная мысль
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={practiceData.reframedThought}
              onChangeText={(text) => setPracticeData({...practiceData, reframedThought: text})}
              placeholder="Как вы можете переосмыслить эту мысль более реалистично?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={[styles.inputSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Эффективность перестройки (1-10)
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
          Когнитивные искажения
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card }]}>
          <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Поиск искажений..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <MaterialIcons name="info" size={24} color="#667eea" />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                О когнитивных искажениях
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Когнитивные искажения - это автоматические паттерны мышления, которые часто неточно 
              интерпретируют реальность. Изучение этих паттернов поможет вам мыслить более реалистично.
            </Text>
          </LinearGradient>
        </View>

        {/* Distortions */}
        <View style={styles.distortionsContainer}>
          {filteredDistortions.map(renderDistortionCard)}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderDistortionDetail()}
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
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
  distortionsContainer: {
    paddingHorizontal: 20,
  },
  distortionCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  distortionGradient: {
    padding: 20,
  },
  distortionHeader: {
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
  distortionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  distortionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  distortionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  practiceCount: {
    fontSize: 14,
    color: 'white',
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
  detailCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailGradient: {
    padding: 30,
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  detailDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  antidoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  questionText: {
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

export default CognitiveDistortionsScreen;
