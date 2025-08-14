import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing?.lg || 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing?.lg || 16,
    paddingVertical: theme.spacing?.md || 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors?.borderLight || theme.colors?.border || '#E0E0E0',
    backgroundColor: theme.colors?.header || theme.colors?.background,
  },
  headerTitle: {
    fontSize: theme.typography?.h3?.fontSize || 18,
    fontWeight: theme.typography?.h3?.fontWeight || '600',
    color: theme.colors.text,
  },
  backButton: {
    padding: theme.spacing?.sm || 8,
  },
  profileButton: {
    padding: theme.spacing?.sm || 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors?.card || theme.colors?.surface || '#F5F5F5',
    borderRadius: theme.borderRadius?.lg || 12,
    marginHorizontal: 4,
    ...theme.shadows?.sm,
  },
  statNumber: {
    fontSize: theme.typography?.h2?.fontSize || 24,
    fontWeight: theme.typography?.h2?.fontWeight || '700',
    color: theme.colors.text,
    marginTop: theme.spacing?.xs || 4,
  },
  statLabel: {
    fontSize: theme.typography?.caption?.fontSize || 12,
    color: theme.colors?.textSecondary || theme.colors?.text,
    marginTop: theme.spacing?.xs || 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  coursesSection: {
    paddingHorizontal: theme.spacing?.lg || 16,
    paddingBottom: theme.spacing?.xl || 24,
  },
  sectionTitle: {
    fontSize: theme.typography?.h3?.fontSize || 18,
    fontWeight: theme.typography?.h3?.fontWeight || '600',
    color: theme.colors.text,
    marginBottom: theme.spacing?.md || 12,
  },
  courseCard: {
    backgroundColor: theme.colors?.card || theme.colors?.surface || '#FFFFFF',
    borderRadius: theme.borderRadius?.lg || 12,
    marginBottom: theme.spacing?.md || 12,
    overflow: 'hidden',
    ...theme.shadows?.md,
  },
  courseGradient: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseContent: {
    padding: theme.spacing?.lg || 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing?.sm || 8,
  },
  courseTitle: {
    fontSize: theme.typography?.h4?.fontSize || 16,
    fontWeight: theme.typography?.h4?.fontWeight || '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing?.sm || 8,
  },
  courseDescription: {
    fontSize: theme.typography?.body?.fontSize || 14,
    color: theme.colors?.textSecondary || theme.colors?.text,
    marginBottom: theme.spacing?.md || 12,
    lineHeight: 20,
  },
  courseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing?.md || 12,
  },
  courseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseDetailText: {
    fontSize: theme.typography?.caption?.fontSize || 12,
    color: theme.colors?.textSecondary || theme.colors?.text,
    marginLeft: theme.spacing?.xs || 4,
  },
  courseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing?.sm || 8,
  },
  tag: {
    backgroundColor: theme.colors?.accent + '20' || 'rgba(108, 92, 231, 0.2)',
    borderRadius: theme.borderRadius?.full || 999,
    paddingHorizontal: theme.spacing?.sm || 8,
    paddingVertical: theme.spacing?.xs || 4,
  },
  tagText: {
    fontSize: theme.typography?.caption?.fontSize || 12,
    color: theme.colors?.accent || '#6C5CE7',
  },
  courseBadges: {
    flexDirection: 'row',
    gap: theme.spacing?.xs || 4,
  },
  badge: {
    borderRadius: theme.borderRadius?.md || 8,
    paddingHorizontal: theme.spacing?.xs || 4,
    paddingVertical: 2,
  },
  freeBadge: {
    backgroundColor: theme.colors?.success || '#4BB543',
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceBadge: {
    backgroundColor: theme.colors?.accent || '#6C5CE7',
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  enrolledBadge: {
    backgroundColor: theme.colors?.success || '#4BB543',
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing?.lg || 16,
    paddingVertical: theme.spacing?.md || 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors?.borderLight || theme.colors?.border || '#E0E0E0',
  },
  modalTitle: {
    fontSize: theme.typography?.h3?.fontSize || 18,
    fontWeight: theme.typography?.h3?.fontWeight || '600',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: theme.spacing?.sm || 8,
  },
  modalContent: {
    flex: 1,
  },
  courseHero: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing?.lg || 16,
  },
  courseHeroTitle: {
    fontSize: theme.typography?.h2?.fontSize || 24,
    fontWeight: theme.typography?.h2?.fontWeight || '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: theme.spacing?.md || 12,
  },
  courseHeroInstructor: {
    fontSize: theme.typography?.body?.fontSize || 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: theme.spacing?.xs || 4,
  },
  courseInfo: {
    padding: theme.spacing?.lg || 16,
  },
  courseDescriptionFull: {
    fontSize: theme.typography?.body?.fontSize || 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing?.xl || 24,
  },
  courseMetrics: {
    flexDirection: 'row',
    gap: theme.spacing?.lg || 16,
    marginBottom: theme.spacing?.xl || 24,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing?.md || 12,
    backgroundColor: theme.colors?.surface || theme.colors?.card || '#F5F5F5',
    borderRadius: theme.borderRadius?.md || 8,
  },
  metricLabel: {
    fontSize: theme.typography?.caption?.fontSize || 12,
    color: theme.colors?.textSecondary || theme.colors?.text,
    marginTop: theme.spacing?.xs || 4,
  },
  metricValue: {
    fontSize: theme.typography?.body?.fontSize || 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing?.xs || 4,
  },
  allTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing?.sm || 8,
    marginBottom: theme.spacing?.xl || 24,
  },
  modalTag: {
    backgroundColor: theme.colors?.accent || '#6C5CE7',
    borderRadius: theme.borderRadius?.full || 999,
    paddingHorizontal: theme.spacing?.md || 12,
    paddingVertical: theme.spacing?.sm || 8,
  },
  modalTagText: {
    fontSize: theme.typography?.caption?.fontSize || 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  enrollButton: {
    backgroundColor: theme.colors?.accent || '#6C5CE7',
    borderRadius: theme.borderRadius?.lg || 12,
    paddingVertical: theme.spacing?.md || 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing?.sm || 8,
    ...theme.shadows?.md,
  },
  enrolledButton: {
    backgroundColor: theme.colors?.success || '#4BB543',
  },
  enrollButtonText: {
    fontSize: theme.typography?.button?.fontSize || 16,
    fontWeight: theme.typography?.button?.fontWeight || '600',
    color: '#ffffff',
  },
});

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  durationDays: number;
  difficulty: 'Начинающий' | 'Средний' | 'Продвинутый';
  category: string;
  instructor: string;
  rating: number;
  enrolled: number;
  gradient: string[];
  icon: string;
  price: 'Бесплатно' | number;
  lessons: number;
  certificated: boolean;
  tags: string[];
  progress?: number;
  isEnrolled?: boolean;
}

type FilterOption = {
  name: string;
  value: string;
  label: string;
};

interface FilterSelectProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  style?: any;
}

const FilterSelect = React.memo<FilterSelectProps>(function FilterSelect({ options, value, onChange, style }) {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderColor: value !== 'all' ? theme.colors.primary : 'transparent',
        },
        style
      ]}
      onPress={() => {
        const nextIndex = options.findIndex(opt => opt.value === value) + 1;
        onChange(options[nextIndex >= options.length ? 0 : nextIndex].value);
      }}
    >
      <Text style={[
        styles.filterButtonText,
        { color: value !== 'all' ? theme.colors.primary : theme.colors.text }
      ]}>
        {options.find(opt => opt.value === value)?.label}
      </Text>
      <FontAwesome5
        name="chevron-down"
        size={12}
        color={value !== 'all' ? theme.colors.primary : theme.colors.text}
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>
  );
});

const FILTERS = {
  DIFFICULTY: [
    { name: 'difficulty', value: 'all', label: 'Все уровни' },
    { name: 'difficulty', value: 'Начинающий', label: 'Начинающий' },
    { name: 'difficulty', value: 'Средний', label: 'Средний' },
    { name: 'difficulty', value: 'Продвинутый', label: 'Продвинутый' },
  ],
  CATEGORY: [
    { name: 'category', value: 'all', label: 'Все категории' },
    { name: 'category', value: 'Медитация', label: 'Медитация' },
    { name: 'category', value: 'Личностное развитие', label: 'Личностное развитие' },
    { name: 'category', value: 'Психическое здоровье', label: 'Психическое здоровье' },
  ],
  PRICE: [
    { name: 'price', value: 'all', label: 'Все цены' },
    { name: 'price', value: 'free', label: 'Бесплатные' },
    { name: 'price', value: 'paid', label: 'Платные' },
  ],
  DURATION: [
    { name: 'duration', value: 'all', label: 'Любая длительность' },
    { name: 'duration', value: 'short', label: 'До 7 дней' },
    { name: 'duration', value: 'medium', label: '8-14 дней' },
    { name: 'duration', value: 'long', label: '15+ дней' },
  ],
};

const coursesData: Course[] = [
  {
    id: 'stress_resilience_30d',
    title: 'Мастерство стрессоустойчивости',
    description: 'Постройте долговременную устойчивость к стрессу и выгоранию',
    duration: '30 дней',
    durationDays: 30,
    difficulty: 'Продвинутый',
    category: 'Психическое здоровье',
    instructor: 'Д-р Роберт Ким',
    rating: 4.9,
    enrolled: 5400,
    gradient: ['#ff9a9e', '#fecfef'],
    icon: 'mountain',
    price: 49,
    lessons: 30,
    certificated: true,
    tags: ['Устойчивость', 'Предотвращение выгорания', 'Продвинутый'],
  },
  {
    id: 'mindfulness_basics_7d',
    title: 'Основы осознанности',
    description: 'Изучите базовые принципы медитации и осознанности для ежедневной практики',
    duration: '7 дней',
    durationDays: 7,
    difficulty: 'Начинающий',
    category: 'Медитация',
    instructor: 'Анна Соколова',
    rating: 4.8,
    enrolled: 12000,
    gradient: ['#667eea', '#764ba2'],
    icon: 'leaf',
    price: 'Бесплатно',
    lessons: 7,
    certificated: false,
    tags: ['Медитация', 'Осознанность', 'Начинающий'],
  },
  {
    id: 'anxiety_management_14d',
    title: 'Управление тревожностью',
    description: 'Научитесь эффективно справляться с тревогой и паническими атаками',
    duration: '14 дней',
    durationDays: 14,
    difficulty: 'Средний',
    category: 'Психическое здоровье',
    instructor: 'Д-р Елена Петрова',
    rating: 4.7,
    enrolled: 8500,
    gradient: ['#ffecd2', '#fcb69f'],
    icon: 'heart',
    price: 29,
    lessons: 14,
    certificated: true,
    tags: ['Тревожность', 'Релаксация', 'Дыхание'],
  },
  {
    id: 'self_confidence_21d',
    title: 'Уверенность в себе',
    description: 'Повысьте самооценку и научитесь верить в свои силы',
    duration: '21 день',
    durationDays: 21,
    difficulty: 'Средний',
    category: 'Личностное развитие',
    instructor: 'Максим Орлов',
    rating: 4.6,
    enrolled: 7200,
    gradient: ['#a8edea', '#fed6e3'],
    icon: 'star',
    price: 35,
    lessons: 21,
    certificated: true,
    tags: ['Самооценка', 'Уверенность', 'Мотивация'],
  },
  {
    id: 'sleep_improvement_10d',
    title: 'Здоровый сон',
    description: 'Улучшите качество сна и научитесь быстро засыпать',
    duration: '10 дней',
    durationDays: 10,
    difficulty: 'Начинающий',
    category: 'Психическое здоровье',
    instructor: 'Д-р Мария Волкова',
    rating: 4.5,
    enrolled: 9800,
    gradient: ['#d299c2', '#fef9d7'],
    icon: 'moon',
    price: 'Бесплатно',
    lessons: 10,
    certificated: false,
    tags: ['Сон', 'Релаксация', 'Гигиена сна'],
  },
  {
    id: 'emotional_intelligence_28d',
    title: 'Эмоциональный интеллект',
    description: 'Развейте навыки понимания и управления эмоциями',
    duration: '28 дней',
    durationDays: 28,
    difficulty: 'Продвинутый',
    category: 'Личностное развитие',
    instructor: 'Ольга Смирнова',
    rating: 4.8,
    enrolled: 6400,
    gradient: ['#fa709a', '#fee140'],
    icon: 'brain',
    price: 42,
    lessons: 28,
    certificated: true,
    tags: ['Эмоции', 'Интеллект', 'Коммуникация'],
  },
  {
    id: 'morning_routine_5d',
    title: 'Утренние ритуалы',
    description: 'Создайте идеальную утреннюю рутину для продуктивного дня',
    duration: '5 дней',
    durationDays: 5,
    difficulty: 'Начинающий',
    category: 'Продуктивность',
    instructor: 'Игорь Васильев',
    rating: 4.4,
    enrolled: 11500,
    gradient: ['#ffeaa7', '#fab1a0'],
    icon: 'sun',
    price: 'Бесплатно',
    lessons: 5,
    certificated: false,
    tags: ['Утро', 'Привычки', 'Энергия'],
  },
  {
    id: 'positive_thinking_12d',
    title: 'Позитивное мышление',
    description: 'Переключитесь на позитивный настрой и измените отношение к жизни',
    duration: '12 дней',
    durationDays: 12,
    difficulty: 'Средний',
    category: 'Личностное развитие',
    instructor: 'Светлана Козлова',
    rating: 4.6,
    enrolled: 8900,
    gradient: ['#fdbb2d', '#22c1c3'],
    icon: 'smile',
    price: 25,
    lessons: 12,
    certificated: true,
    tags: ['Позитив', 'Мышление', 'Настрой'],
  },
];

export default function CoursesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState('All');
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    difficulty: 'all',
    category: 'all',
    price: 'all',
    duration: 'all',
  });
  const [filteredCourses, setFilteredCourses] = useState(coursesData);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEnrolledCourses();
  }, []);

  const loadEnrolledCourses = async () => {
    try {
      const enrolled = await AsyncStorage.getItem('enrolledCourses');
      if (enrolled) {
        setEnrolledCourses(JSON.parse(enrolled));
      }
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
    }
  };

  const enrollInCourse = async (courseId: string) => {
    try {
      const newEnrolled = [...enrolledCourses, courseId];
      setEnrolledCourses(newEnrolled);
      await AsyncStorage.setItem('enrolledCourses', JSON.stringify(newEnrolled));
      Alert.alert('Успешно!', 'Вы записаны на курс. Проверьте свой прогресс во вкладке Профиль.');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось записаться на курс. Попробуйте еще раз.');
    }
  };

  const handleFilterChange = (filter: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [filter]: value }));
  };

  const filteredCoursesByFilters = coursesData.filter(course => {
    const difficultyMatch = selectedFilters.difficulty === 'all' || course.difficulty === selectedFilters.difficulty;
    const categoryMatch = selectedFilters.category === 'all' || course.category === selectedFilters.category;
    const priceMatch = selectedFilters.price === 'all' || (selectedFilters.price === 'free' ? course.price === 'Бесплатно' : course.price !== 'Бесплатно');
    
    let durationMatch = true;
    if (selectedFilters.duration !== 'all') {
      switch (selectedFilters.duration) {
        case 'short':
          durationMatch = course.durationDays <= 7;
          break;
        case 'medium':
          durationMatch = course.durationDays > 7 && course.durationDays <= 14;
          break;
        case 'long':
          durationMatch = course.durationDays > 14;
          break;
      }
    }
    
    return difficultyMatch && categoryMatch && priceMatch && durationMatch;
  });

  useEffect(() => {
    let result = coursesData;

    if (selectedFilters.difficulty !== 'all') {
      result = result.filter(course => course.difficulty === selectedFilters.difficulty);
    }

    if (selectedFilters.category !== 'all') {
      result = result.filter(course => course.category === selectedFilters.category);
    }

    if (selectedFilters.price !== 'all') {
      result = result.filter(course => 
        selectedFilters.price === 'free' ? course.price === 'Бесплатно' : course.price !== 'Бесплатно'
      );
    }

    if (selectedFilters.duration !== 'all') {
      result = result.filter(course => {
        switch (selectedFilters.duration) {
          case 'short':
            return course.durationDays <= 7;
          case 'medium':
            return course.durationDays > 7 && course.durationDays <= 14;
          case 'long':
            return course.durationDays > 14;
          default:
            return true;
        }
      });
    }

    setFilteredCourses(result);
  }, [selectedFilters]);

  const openCourseDetails = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* SOS Button */}

      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Курсы здоровья</Text>
        <TouchableOpacity style={styles.profileButton}>
          <FontAwesome5 name="user-graduate" size={18} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <FontAwesome5 name="book-open" size={20} color={theme.colors.accent} />
            <Text style={styles.statNumber}>{filteredCourses.length}</Text>
            <Text style={styles.statLabel}>Курсы</Text>
          </View>
          <View style={styles.statCard}>
            <FontAwesome5 name="users" size={20} color={theme.colors.success} />
            <Text style={styles.statNumber}>{enrolledCourses.length}</Text>
            <Text style={styles.statLabel}>Записан</Text>
          </View>
          <View style={styles.statCard}>
            <FontAwesome5 name="certificate" size={20} color={theme.colors.warning} />
            <Text style={styles.statNumber}>{coursesData.filter(c => c.certificated).length}</Text>
            <Text style={styles.statLabel}>Сертификат</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            gap: 8
          }}
        >
          {Object.entries(FILTERS).map(([key, options]) => (
            <TouchableOpacity
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selectedFilters[key.toLowerCase() as keyof typeof selectedFilters] !== 'all' 
                  ? theme.colors.primary 
                  : 'transparent',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                marginRight: 8,
                minWidth: 120,
                justifyContent: 'space-between',
              }}
              onPress={() => {
                const currentValue = selectedFilters[key.toLowerCase() as keyof typeof selectedFilters];
                const currentIndex = options.findIndex(opt => opt.value === currentValue);
                const nextValue = options[(currentIndex + 1) % options.length].value;
                setSelectedFilters(prev => ({ ...prev, [key.toLowerCase()]: nextValue }));
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: selectedFilters[key.toLowerCase() as keyof typeof selectedFilters] !== 'all' 
                  ? theme.colors.primary 
                  : theme.colors.text,
              }}>
                {options.find(opt => opt.value === selectedFilters[key.toLowerCase() as keyof typeof selectedFilters])?.label}
              </Text>
              <FontAwesome5 
                name="chevron-down" 
                size={12} 
                color={selectedFilters[key.toLowerCase() as keyof typeof selectedFilters] !== 'all' 
                  ? theme.colors.primary 
                  : theme.colors.text} 
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Courses List */}
        <View style={styles.coursesSection}>
          <Text style={styles.sectionTitle}>
            {filteredCourses.length} курс{filteredCourses.length !== 1 ? 'ов' : ''} доступно
          </Text>
          
          {filteredCourses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => openCourseDetails(course)}
            >
              <LinearGradient
                colors={course.gradient as any}
                style={styles.courseGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 name={course.icon} size={24} color="#ffffff" />
              </LinearGradient>
              
              <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <View style={styles.courseBadges}>
                    {course.price === 'Бесплатно' ? (
                      <View style={[styles.badge, styles.freeBadge]}>
                        <Text style={styles.freeBadgeText}>БЕСПЛАТНО</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.priceBadge]}>
                        <Text style={styles.priceBadgeText}>${course.price}</Text>
                      </View>
                    )}
                    {enrolledCourses.includes(course.id) && (
                      <View style={[styles.badge, styles.enrolledBadge]}>
                        <FontAwesome5 name="check" size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.courseDescription} numberOfLines={2}>
                  {course.description}
                </Text>
                
                <View style={styles.courseDetails}>
                  <View style={styles.courseDetailItem}>
                    <FontAwesome5 name="clock" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.courseDetailText}>{course.duration}</Text>
                  </View>
                  <View style={styles.courseDetailItem}>
                    <FontAwesome5 name="signal" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.courseDetailText}>{course.difficulty}</Text>
                  </View>
                  <View style={styles.courseDetailItem}>
                    <FontAwesome5 name="star" size={12} color="#FFD700" />
                    <Text style={styles.courseDetailText}>{course.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.courseTags}>
                  {course.tags.slice(0, 2).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Course Details Modal */}
      <Modal
        visible={showCourseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCourseModal(false)}
      >
        {selectedCourse && (
          <SafeAreaView style={styles.modalContainer}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowCourseModal(false)}
                style={styles.modalCloseButton}
              >
                <FontAwesome5 name="times" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Детали курса</Text>
              <View style={{ width: 30 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Course Hero */}
              <LinearGradient
                colors={selectedCourse.gradient as any}
                style={styles.courseHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 name={selectedCourse.icon} size={48} color="#ffffff" />
                <Text style={styles.courseHeroTitle}>{selectedCourse.title}</Text>
                <Text style={styles.courseHeroInstructor}>от {selectedCourse.instructor}</Text>
              </LinearGradient>

              {/* Course Info */}
              <View style={styles.courseInfo}>
                <Text style={styles.courseDescriptionFull}>{selectedCourse.description}</Text>
                
                <View style={styles.courseMetrics}>
                  <View style={styles.metricItem}>
                    <FontAwesome5 name="calendar-alt" size={16} color={theme.colors.accent} />
                    <Text style={styles.metricLabel}>Продолжительность</Text>
                    <Text style={styles.metricValue}>{selectedCourse.duration}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <FontAwesome5 name="book" size={16} color={theme.colors.accent} />
                    <Text style={styles.metricLabel}>Уроки</Text>
                    <Text style={styles.metricValue}>{selectedCourse.lessons}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <FontAwesome5 name="users" size={16} color={theme.colors.accent} />
                    <Text style={styles.metricLabel}>Записано</Text>
                    <Text style={styles.metricValue}>{selectedCourse.enrolled.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.allTags}>
                  {selectedCourse.tags.map((tag, index) => (
                    <View key={index} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Enroll Button */}
                <TouchableOpacity
                  style={[
                    styles.enrollButton,
                    enrolledCourses.includes(selectedCourse.id) && styles.enrolledButton
                  ]}
                  onPress={() => {
                    if (!enrolledCourses.includes(selectedCourse.id)) {
                      enrollInCourse(selectedCourse.id);
                    }
                    setShowCourseModal(false);
                  }}
                >
                  <FontAwesome5 
                    name={enrolledCourses.includes(selectedCourse.id) ? "check" : "play"} 
                    size={16} 
                    color="#ffffff" 
                  />
                  <Text style={styles.enrollButtonText}>
                    {enrolledCourses.includes(selectedCourse.id) ? 'Записан' : 'Записаться сейчас'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}
