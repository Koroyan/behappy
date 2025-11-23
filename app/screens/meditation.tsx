import CommonHeader from '@/components/CommonHeader';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// მედიტაციის სესიები - მარტივი და რეალური
const meditationSessions = [
  {
    id: 'quick-breath',
    title: '🫁 Быстрое дыхание',
    subtitle: 'Для начинающих',
    duration: '3 мин',
    description: 'Простая техника дыхания 4-7-8 для мгновенного успокоения',
    instructions: 'Вдох на 4 счета, задержка на 7, выдох на 8',
    gradient: ['#4ECDC4', '#44A08D'],
    icon: 'air',
    level: 'beginner',
    steps: [
      'Сядьте удобно и закройте глаза',
      'Вдохните через нос на 4 счета',
      'Задержите дыхание на 7 счетов', 
      'Выдохните через рот на 8 счетов',
      'Повторите цикл 4-5 раз'
    ]
  },
  {
    id: 'body-relax',
    title: '😌 Расслабление тела',
    subtitle: 'Снятие напряжения',
    duration: '5 мин',
    description: 'Последовательное расслабление всех групп мышц',
    instructions: 'Поочередно напрягайте и расслабляйте мышцы',
    gradient: ['#667eea', '#764ba2'],
    icon: 'accessibility-new',
    level: 'beginner',
    steps: [
      'Лягте или сядьте комфортно',
      'Начните с пальцев ног - напрягите на 5 сек, расслабьте',
      'Переходите выше: голени, бедра, живот',
      'Продолжите: руки, плечи, лицо',
      'Почувствуйте полное расслабление'
    ]
  },
  {
    id: 'mindful-moment', 
    title: '🧘 Осознанный момент',
    subtitle: 'Присутствие здесь и сейчас',
    duration: '7 мин',
    description: 'Простая практика внимательности к настоящему моменту',
    instructions: 'Сосредоточьтесь на своих ощущениях',
    gradient: ['#A8E6CF', '#7AC7A3'],
    icon: 'psychology',
    level: 'intermediate',
    steps: [
      'Найдите тихое место и сядьте',
      'Сосредоточьтесь на дыхании',
      'Замечайте звуки вокруг без суждений',
      'Почувствуйте свое тело в пространстве',
      'Возвращайтесь к дыханию при отвлечении'
    ]
  },
  {
    id: 'gratitude',
    title: '🙏 Благодарность',
    subtitle: 'Позитивный настрой',
    duration: '5 мин',
    description: 'Медитация на развитие чувства благодарности',
    instructions: 'Подумайте о том, за что вы благодарны',
    gradient: ['#FFB74D', '#FF9800'],
    icon: 'favorite',
    level: 'beginner',
    steps: [
      'Закройте глаза и дышите спокойно',
      'Вспомните 3 вещи, за которые вы благодарны',
      'Почувствуйте тепло благодарности в груди',
      'Пошлите мысленное "спасибо" важным людям',
      'Завершите с улыбкой'
    ]
  },
  {
    id: 'anxiety-relief',
    title: '🌸 При тревоге',
    subtitle: 'Успокоение ума',
    duration: '8 мин',
    description: 'Специальная техника для снижения тревоги и беспокойства',
    instructions: 'Техника заземления 5-4-3-2-1',
    gradient: ['#FF8A65', '#FF7043'],
    icon: 'cloud',
    level: 'intermediate',
    steps: [
      'Назовите 5 вещей, которые видите',
      'Назовите 4 вещи, которые слышите',
      'Назовите 3 вещи, которые чувствуете телом',
      'Назовите 2 запаха вокруг',
      'Назовите 1 вкус во рту'
    ]
  },
  {
    id: 'sleep-prep',
    title: '🌙 Перед сном',
    subtitle: 'Подготовка ко сну',
    duration: '10 мин',
    description: 'Мягкая медитация для легкого засыпания',
    instructions: 'Представляйте спокойные образы',
    gradient: ['#7986CB', '#5C6BC0'],
    icon: 'nights-stay',
    level: 'beginner',
    steps: [
      'Лягте удобно в кровати',
      'Сделайте 10 глубоких вдохов',
      'Представьте спокойное место (пляж, лес)',
      'Почувствуйте расслабление от головы до ног',
      'Позвольте себе погрузиться в сон'
    ]
  }
];

// уровни сложности
const levels = [
  { id: 'all', title: 'Все уровни', color: '#666' },
  { id: 'beginner', title: 'Начинающий', color: '#4CAF50' },
  { id: 'intermediate', title: 'Средний', color: '#FF9800' },
];

export default function MeditationScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, streak: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadStats();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadStats = async () => {
    try {
      const stats = await AsyncStorage.getItem('meditation_stats');
      if (stats) {
        setSessionStats(JSON.parse(stats));
      }
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  const saveStats = async (newStats: any) => {
    try {
      await AsyncStorage.setItem('meditation_stats', JSON.stringify(newStats));
      setSessionStats(newStats);
    } catch (error) {
      console.log('Error saving stats:', error);
    }
  };

  const filteredSessions = selectedLevel === 'all' 
    ? meditationSessions 
    : meditationSessions.filter(session => session.level === selectedLevel);

  const handleSessionPress = (session: any) => {
    setActiveSession(session);
    setIsSessionModalVisible(true);
  };

  const startMeditation = (session: any) => {
    setIsSessionModalVisible(false);
    // Здесь можно добавить логику запуска таймера медитации
    Alert.alert(
      'Медитация началась! 🧘‍♀️',
      `"${session.title}" - ${session.duration}\n\nСледуйте инструкциям и дышите спокойно.`,
      [
        {
          text: 'Завершить',
          onPress: () => {
            const newStats = {
              total: sessionStats.total + 1,
              streak: sessionStats.streak + 1
            };
            saveStats(newStats);
            Alert.alert('Отлично! 🎉', 'Медитация завершена. Как вы себя чувствуете?');
          }
        }
      ]
    );
  };

  const goBack = () => {
    router.back();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1A1A1A' : '#F8F9FA',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: 50,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    placeholder: {
      width: 40,
    },
    welcomeSection: {
      padding: 20,
      paddingTop: 10,
    },
    welcomeText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    welcomeSubtext: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      lineHeight: 22,
    },
    statsContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
      borderRadius: 16,
      padding: 20,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#4CAF50',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
      textAlign: 'center',
    },
    filtersContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    filtersTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    filterButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    filterButtonActive: {
      backgroundColor: '#4CAF50',
    },
    filterButtonText: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
      fontWeight: '500',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    sessionsContainer: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sessionCard: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    sessionGradient: {
      padding: 20,
      minHeight: 120,
      justifyContent: 'space-between',
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    sessionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionDuration: {
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    sessionDurationText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#333',
    },
    sessionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    sessionSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 8,
    },
    sessionDescription: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: width - 40,
      backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalDescription: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
      lineHeight: 24,
      marginBottom: 20,
    },
    stepsContainer: {
      marginBottom: 24,
    },
    stepsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingRight: 16,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    stepText: {
      flex: 1,
      fontSize: 15,
      color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
      lineHeight: 22,
    },
    startButton: {
      backgroundColor: '#4CAF50',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    startButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <CommonHeader title="Медитация" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <Animated.View 
          style={[styles.welcomeSection, { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }]}
        >
          <Text style={styles.welcomeText}>Время для себя ✨</Text>
          <Text style={styles.welcomeSubtext}>
            Найдите покой и гармонию с простыми, проверенными техниками медитации
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View 
          style={[styles.statsContainer, { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }]}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessionStats.total}</Text>
            <Text style={styles.statLabel}>Всего сессий</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessionStats.streak}</Text>
            <Text style={styles.statLabel}>Дней подряд</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.floor(sessionStats.total * 6.5)}</Text>
            <Text style={styles.statLabel}>Минут практики</Text>
          </View>
        </Animated.View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Выберите уровень</Text>
          <View style={styles.filterButtons}>
            {levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.filterButton,
                  selectedLevel === level.id && styles.filterButtonActive
                ]}
                onPress={() => setSelectedLevel(level.id)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedLevel === level.id && styles.filterButtonTextActive
                ]}>
                  {level.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sessions */}
        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Выберите практику</Text>
          {filteredSessions.map((session, index) => (
            <Animated.View
              key={session.id}
              style={[
                styles.sessionCard,
                {
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: Animated.add(slideAnim, new Animated.Value(index * 10))
                  }]
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => handleSessionPress(session)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={session.gradient as [string, string]}
                  style={styles.sessionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionIcon}>
                      <MaterialIcons name={session.icon as any} size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.sessionDuration}>
                      <Text style={styles.sessionDurationText}>{session.duration}</Text>
                    </View>
                  </View>
                  
                  <View>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionSubtitle}>{session.subtitle}</Text>
                    <Text style={styles.sessionDescription}>{session.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Session Details Modal */}
      <Modal
        visible={isSessionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeSession?.title}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsSessionModalVisible(false)}
              >
                <MaterialIcons name="close" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                {activeSession?.description}
              </Text>

              <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>Пошаговая инструкция:</Text>
                {activeSession?.steps.map((step: string, index: number) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => startMeditation(activeSession)}
            >
              <Text style={styles.startButtonText}>
                Начать медитацию ({activeSession?.duration})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
