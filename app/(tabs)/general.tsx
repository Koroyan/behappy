import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfile } from '@/services/clinicalAssessment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClinicalAssessmentScreen from '@/components/ClinicalAssessmentScreen';

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'toggle' | 'action' | 'info';
  value?: boolean;
  color: string;
}

interface UserInfo {
  name: string;
  age: string;
  gender: string;
  occupation: string;
  location: string;
  email: string;
  phone: string;
  emergencyContact: string;
  interests: string;
  goals: string;
  maritalStatus: string;
  children: string;
  education: string;
  income: string;
  housing: string;
  smoking: string;
  alcohol: string;
  exercise: string;
  sleep: string;
  chronicDiseases: string;
  medications: string;
  previousTherapy: string;
  familyHistory: string;
  [key: string]: string;
}

export default function GeneralScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ 
    name: '', age: '', gender: '', occupation: '', location: '', 
    email: '', phone: '', emergencyContact: '', interests: '', goals: '',
    maritalStatus: '', children: '', education: '', income: '', housing: '',
    smoking: '', alcohol: '', exercise: '', sleep: '', chronicDiseases: '',
    medications: '', previousTherapy: '', familyHistory: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempUserInfo, setTempUserInfo] = useState<UserInfo>({ 
    name: '', age: '', gender: '', occupation: '', location: '', 
    email: '', phone: '', emergencyContact: '', interests: '', goals: '',
    maritalStatus: '', children: '', education: '', income: '', housing: '',
    smoking: '', alcohol: '', exercise: '', sleep: '', chronicDiseases: '',
    medications: '', previousTherapy: '', familyHistory: ''
  });
  const [assessmentVisible, setAssessmentVisible] = useState(false);
  const [currentAssessmentType, setCurrentAssessmentType] = useState<'PHQ9' | 'GAD7' | 'DASS21' | 'BigFive' | 'BDI'>('PHQ9');

  // Add state for modal visibility and content
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    options: string[];
    currentValue: string;
    onSelect: (value: string) => void;
  }>({
    title: '',
    options: [],
    currentValue: '',
    onSelect: () => {},
  });

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        const profile: UserProfile = JSON.parse(profileData);
        setUserProfile(profile);
        setUserInfo({
          name: profile.personalInfo?.name || '',
          age: String(profile.personalInfo?.age || ''),
          gender: profile.personalInfo?.gender || '',
          occupation: profile.personalInfo?.occupation || '',
          location: profile.personalInfo?.location || '',
          email: profile.personalInfo?.email || '',
          phone: profile.personalInfo?.phone || '',
          emergencyContact: profile.personalInfo?.emergencyContact || '',
          interests: profile.personalInfo?.interests || '',
          goals: profile.personalInfo?.goals || '',
          maritalStatus: profile.personalInfo?.maritalStatus || '',
          children: profile.personalInfo?.children || '',
          education: profile.personalInfo?.education || '',
          income: profile.personalInfo?.income || '',
          housing: profile.personalInfo?.housing || '',
          smoking: profile.personalInfo?.smoking || '',
          alcohol: profile.personalInfo?.alcohol || '',
          exercise: profile.personalInfo?.exercise || '',
          sleep: profile.personalInfo?.sleep || '',
          chronicDiseases: profile.personalInfo?.chronicDiseases || '',
          medications: profile.personalInfo?.medications || '',
          previousTherapy: profile.personalInfo?.previousTherapy || '',
          familyHistory: profile.personalInfo?.familyHistory || '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const saveUserInfo = async () => {
    try {
      const existingProfile = userProfile || {
        personalInfo: {},
        psychologicalProfile: {
          personalityTraits: [],
          emotionalPatterns: [],
          strengthsAndResources: [],
          growthAreas: [],
          copingStrategies: [],
          communicationStyle: '',
          motivationalFactors: [],
          stressIndicators: [],
        },
        aiInsights: {
          overallWellness: '',
          keyRecommendations: [],
          personalizationNotes: [],
          nextSteps: [],
          riskFactors: [],
          protectiveFactors: [],
        },
        assessmentHistory: {
          completedTests: [],
          totalTests: 5,
          completionPercentage: 0,
          lastTestDate: '',
          progressNotes: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProfile: UserProfile = {
        ...existingProfile,
        personalInfo: {
          ...existingProfile.personalInfo,
          name: tempUserInfo.name,
          age: parseInt(tempUserInfo.age) || 0,
          gender: tempUserInfo.gender,
          occupation: tempUserInfo.occupation,
          location: tempUserInfo.location,
          email: tempUserInfo.email,
          phone: tempUserInfo.phone,
          emergencyContact: tempUserInfo.emergencyContact,
          interests: tempUserInfo.interests,
          goals: tempUserInfo.goals,
          maritalStatus: tempUserInfo.maritalStatus,
          children: tempUserInfo.children,
          education: tempUserInfo.education,
          income: tempUserInfo.income,
          housing: tempUserInfo.housing,
          smoking: tempUserInfo.smoking,
          alcohol: tempUserInfo.alcohol,
          exercise: tempUserInfo.exercise,
          sleep: tempUserInfo.sleep,
          chronicDiseases: tempUserInfo.chronicDiseases,
          medications: tempUserInfo.medications,
          previousTherapy: tempUserInfo.previousTherapy,
          familyHistory: tempUserInfo.familyHistory,
        },
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      setUserInfo(tempUserInfo);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving user info:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить информацию');
    }
  };

  const openTestsPage = () => {
    // Navigate to tests tab using Expo Router
    router.push('/screens/tests');
  };

  const openAssessment = (type: 'PHQ9' | 'GAD7' | 'DASS21' | 'BigFive' | 'BDI') => {
    setCurrentAssessmentType(type);
    setAssessmentVisible(true);
  };

  const getCompletionPercentage = () => {
    return userProfile?.assessmentHistory?.completionPercentage || 0;
  };

  const getCompletedTestsCount = () => {
    return userProfile?.assessmentHistory?.completedTests?.length || 0;
  };

  const getTotalTestsCount = () => {
    return userProfile?.assessmentHistory?.totalTests || 7; // We now have 7 total tests
  };
  
  const getLastTestDate = () => {
    if (!userProfile?.assessmentHistory?.lastTestDate) return null;
    
    const date = new Date(userProfile.assessmentHistory.lastTestDate);
    return date.toLocaleDateString('ru-RU');
  };
  
  const getLastTestType = () => {
    const typeMap: Record<string, string> = {
      'PHQ9': 'Тест на депрессию',
      'GAD7': 'Тест на тревогу',
      'DASS21': 'Комплексный тест',
      'BDI': 'Шкала депрессии Бека',
      'BigFive': 'Большая пятерка',
      'EmotionalIntelligence': 'Эмоциональный интеллект',
      'Resilience': 'Психологическая устойчивость'
    };
    
    return typeMap[userProfile?.assessmentHistory?.lastTestType] || 'Психологический тест';
  };

  // Select options
  const genderOptions = ['Мужской', 'Женский', 'Другой'];
  const maritalStatusOptions = ['Холост', 'Женат', 'Разведен', 'Вдовец'];
  const childrenOptions = ['Нет', '1', '2', '3', '4+'];
  const educationOptions = ['Среднее', 'Высшее', 'Аспирантура'];
  const incomeOptions = ['Низкий', 'Средний', 'Высокий'];
  const housingOptions = ['Съемное жилье', 'Собственное жилье'];
  const smokingOptions = ['Не курю', 'Курю'];
  const alcoholOptions = ['Не употребляю', 'Редко', 'Часто'];
  const exerciseOptions = ['Нет', 'Редко', 'Регулярно'];
  const sleepOptions = ['Меньше 6 часов', '6-8 часов', 'Больше 8 часов'];
  const therapyOptions = ['Нет', 'Да'];

  const showSelectModal = (title: string, options: string[], currentValue: string, onSelect: (value: string) => void) => {
    if (!options || options.length === 0) {
      console.error(`No options available for ${title}`);
      return;
    }

    // Show modal with options
    setModalContent({
      title,
      options,
      currentValue,
      onSelect,
    });
    setIsModalVisible(true);
  };

  const settingsItems: SettingsItem[] = [
    {
      id: 'darkMode',
      title: 'Темная тема',
      subtitle: 'Переключить на темную тему',
      icon: isDark ? 'sun' : 'moon',
      type: 'toggle',
      value: isDark,
      color: '#4A4A4A',
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      subtitle: 'Получать напоминания и обновления',
      icon: 'bell',
      type: 'toggle',
      value: notificationsEnabled,
      color: '#FF6B6B',
    },
    {
      id: 'privacy',
      title: 'Настройки приватности',
      subtitle: 'Управление вашими данными',
      icon: 'shield-alt',
      type: 'action',
      color: '#4ECDC4',
    },
    {
      id: 'export',
      title: 'Экспорт данных',
      subtitle: 'Скачать вашу информацию',
      icon: 'download',
      type: 'action',
      color: '#45B7D1',
    },
    {
      id: 'help',
      title: 'Помощь и поддержка',
      subtitle: 'Получить помощь или связаться с нами',
      icon: 'question-circle',
      type: 'action',
      color: '#96CEB4',
    },
    {
      id: 'about',
      title: 'О приложении',
      subtitle: 'Версия и информация о приложении',
      icon: 'info-circle',
      type: 'action',
      color: '#FFA07A',
    },
  ];

  const handleSettingPress = (item: SettingsItem) => {
    switch (item.id) {
      case 'darkMode':
        toggleTheme();
        break;
      case 'notifications':
        setNotificationsEnabled(!notificationsEnabled);
        break;
      case 'privacy':
        Alert.alert('Настройки приватности', 'Настройки приватности скоро появятся');
        break;
      case 'export':
        Alert.alert('Экспорт данных', 'Функция экспорта данных скоро появится');
        break;
      case 'help':
        Alert.alert('Помощь и поддержка', 'Свяжитесь с нами: support@behappy.com');
        break;
      case 'about':
        Alert.alert('О BeHappy', 'Версия 1.0.0\nВаш спутник психического здоровья');
        break;
    }
  };

  const styles = createStyles(theme);

  const renderSettingItem = (item: SettingsItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => handleSettingPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: item.color }]}>
          <FontAwesome5 name={item.icon} size={20} color="white" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={() => handleSettingPress(item)}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
            thumbColor="#ffffff"
          />
        ) : (
          <FontAwesome5 name="chevron-right" size={14} color={theme.colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Главная</Text>
        <Text style={styles.headerSubtitle}>Ваш путь к психическому благополучию</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <FontAwesome5 name="user" size={40} color={theme.colors.accent} />
          </View>
          <Text style={styles.profileName}>
            {userInfo.name || 'Добро пожаловать!'}
          </Text>
          <View style={styles.userInfoContainer}>
            {userInfo.age && (
              <View style={styles.infoItem}>
                <FontAwesome5 name="calendar" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{userInfo.age} лет</Text>
              </View>
            )}
            {userInfo.location && (
              <View style={styles.infoItem}>
                <FontAwesome5 name="map-marker-alt" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{userInfo.location}</Text>
              </View>
            )}
            {userInfo.occupation && (
              <View style={styles.infoItem}>
                <FontAwesome5 name="briefcase" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{userInfo.occupation}</Text>
              </View>
            )}
          </View>
          
          {!userInfo.name && (
            <Text style={styles.profileEmail}>
              Заполните профиль для лучшей персонализации
            </Text>
          )}
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => {
              // Debug: Log current userInfo before copying
              console.log('Current userInfo:', userInfo);
              
              // Properly copy current userInfo to tempUserInfo
              const newTempUserInfo = {
                name: userInfo.name || '',
                age: userInfo.age || '',
                gender: userInfo.gender || '',
                occupation: userInfo.occupation || '',
                location: userInfo.location || '',
                email: userInfo.email || '',
                phone: userInfo.phone || '',
                emergencyContact: userInfo.emergencyContact || '',
                interests: userInfo.interests || '',
                goals: userInfo.goals || '',
                maritalStatus: userInfo.maritalStatus || '',
                children: userInfo.children || '',
                education: userInfo.education || '',
                income: userInfo.income || '',
                housing: userInfo.housing || '',
                smoking: userInfo.smoking || '',
                alcohol: userInfo.alcohol || '',
                exercise: userInfo.exercise || '',
                sleep: userInfo.sleep || '',
                chronicDiseases: userInfo.chronicDiseases || '',
                medications: userInfo.medications || '',
                previousTherapy: userInfo.previousTherapy || '',
                familyHistory: userInfo.familyHistory || '',
              };
              
              console.log('Setting tempUserInfo to:', newTempUserInfo);
              setTempUserInfo(newTempUserInfo);
              setIsEditingProfile(true);
            }}
          >
            <FontAwesome5 name="edit" size={16} color={theme.colors.accent} />
            <Text style={styles.editProfileText}>
              {userInfo.name ? 'Редактировать профиль' : 'Заполнить профиль'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <FontAwesome5 name="chart-line" size={24} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Прогресс тестирования</Text>
          </View>
          
          <View style={styles.progressCard}>
            <View style={styles.progressStats}>
              <Text style={styles.progressNumber}>{getCompletedTestsCount()}</Text>
              <Text style={styles.progressTotal}>/ {getTotalTestsCount()}</Text>
              <Text style={styles.progressLabel}>тестов пройдено</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${getCompletionPercentage()}%`,
                      backgroundColor: theme.colors.accent
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercentage}>{getCompletionPercentage()}%</Text>
            </View>
            
            {getLastTestDate() && (
              <View style={styles.lastTestInfo}>
                <FontAwesome5 name="calendar-check" size={14} color={theme.colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.lastTestText}>
                  Последний тест: {getLastTestType()} ({getLastTestDate()})
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.testsButton}
            onPress={openTestsPage}
          >
            <FontAwesome5 name="clipboard-list" size={20} color="white" />
            <Text style={styles.testsButtonText}>Пройти психологические тесты</Text>
            <FontAwesome5 name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testsButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => router.push('/screens/test-history')}
          >
            <FontAwesome5 name="history" size={20} color={theme.colors.accent} />
            <Text style={[styles.testsButtonText, { color: theme.colors.text }]}>История тестов</Text>
            <FontAwesome5 name="arrow-right" size={16} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Recent AI Insights */}
        {userProfile?.aiInsights?.overallWellness && (
          <View style={styles.insightsSection}>
            <View style={styles.insightsHeader}>
              <FontAwesome5 name="brain" size={24} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Последний анализ ИИ</Text>
            </View>
            
            <View style={styles.insightsCard}>
              <Text style={styles.insightsText}>
                {userProfile.aiInsights.overallWellness}
              </Text>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          {settingsItems.map(renderSettingItem)}
        </View>

        {/* Space for tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* User Info Edit Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditingProfile(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditingProfile(false)}>
              <Text style={[styles.modalButton, { color: theme.colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Редактировать профиль</Text>
            <TouchableOpacity onPress={saveUserInfo}>
              <Text style={[styles.modalButton, { color: theme.colors.accent }]}>Сохранить</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Имя</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.name}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, name: text })}
                  placeholder="Введите ваше имя"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Возраст</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.age}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, age: text })}
                  placeholder="Введите ваш возраст"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Пол</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Пол',
                    genderOptions,
                    tempUserInfo.gender,
                    (value) => setTempUserInfo({ ...tempUserInfo, gender: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.gender ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.gender || 'Выберите пол'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Профессия</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.occupation}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, occupation: text })}
                  placeholder="Ваша профессия"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Местоположение</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.location}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, location: text })}
                  placeholder="Город, страна"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.email}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, email: text })}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Телефон</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.phone}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, phone: text })}
                  placeholder="+7 (999) 123-45-67"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Экстренный контакт</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  value={tempUserInfo.emergencyContact}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, emergencyContact: text })}
                  placeholder="Контакт близкого человека"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Интересы и хобби</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    minHeight: 80
                  }]}
                  value={tempUserInfo.interests}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, interests: text })}
                  placeholder="Чем вы увлекаетесь?"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Цели и мечты</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    minHeight: 80
                  }]}
                  value={tempUserInfo.goals}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, goals: text })}
                  placeholder="К чему вы стремитесь?"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Семейное положение */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Семейное положение</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Семейное положение',
                    maritalStatusOptions,
                    tempUserInfo.maritalStatus,
                    (value) => setTempUserInfo({ ...tempUserInfo, maritalStatus: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.maritalStatus ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.maritalStatus || 'Выберите семейное положение'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Дети */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Дети</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Дети',
                    childrenOptions,
                    tempUserInfo.children,
                    (value) => setTempUserInfo({ ...tempUserInfo, children: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.children ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.children || 'Укажите количество детей'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Образование */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Образование</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Образование',
                    educationOptions,
                    tempUserInfo.education,
                    (value) => setTempUserInfo({ ...tempUserInfo, education: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.education ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.education || 'Выберите уровень образования'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Доходы */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Уровень дохода</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Уровень дохода',
                    incomeOptions,
                    tempUserInfo.income,
                    (value) => setTempUserInfo({ ...tempUserInfo, income: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.income ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.income || 'Выберите уровень дохода'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Жилье */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Жилищные условия</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Жилищные условия',
                    housingOptions,
                    tempUserInfo.housing,
                    (value) => setTempUserInfo({ ...tempUserInfo, housing: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.housing ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.housing || 'Выберите тип жилья'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Курение */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Курение</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Курение',
                    smokingOptions,
                    tempUserInfo.smoking,
                    (value) => setTempUserInfo({ ...tempUserInfo, smoking: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.smoking ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.smoking || 'Выберите отношение к курению'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Алкоголь */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Употребление алкоголя</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Употребление алкоголя',
                    alcoholOptions,
                    tempUserInfo.alcohol,
                    (value) => setTempUserInfo({ ...tempUserInfo, alcohol: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.alcohol ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.alcohol || 'Выберите частоту употребления'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Физическая активность */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Физическая активность</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Физическая активность',
                    exerciseOptions,
                    tempUserInfo.exercise,
                    (value) => setTempUserInfo({ ...tempUserInfo, exercise: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.exercise ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.exercise || 'Выберите уровень активности'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Сон */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Режим сна</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Режим сна',
                    sleepOptions,
                    tempUserInfo.sleep,
                    (value) => setTempUserInfo({ ...tempUserInfo, sleep: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.sleep ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.sleep || 'Выберите продолжительность сна'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Хронические заболевания */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Хронические заболевания</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    minHeight: 80
                  }]}
                  value={tempUserInfo.chronicDiseases}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, chronicDiseases: text })}
                  placeholder="Укажите хронические заболевания (если есть)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Медикаменты */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Принимаемые медикаменты</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    minHeight: 80
                  }]}
                  value={tempUserInfo.medications}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, medications: text })}
                  placeholder="Укажите принимаемые препараты (если есть)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Предыдущая терапия */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Опыт психотерапии</Text>
                <TouchableOpacity
                  style={[styles.selectInput, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => showSelectModal(
                    'Опыт психотерапии',
                    therapyOptions,
                    tempUserInfo.previousTherapy,
                    (value) => setTempUserInfo({ ...tempUserInfo, previousTherapy: value })
                  )}
                >
                  <Text style={[styles.selectText, { 
                    color: tempUserInfo.previousTherapy ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {tempUserInfo.previousTherapy || 'Выберите опыт терапии'}
                  </Text>
                  <FontAwesome5 name="chevron-down" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Семейная история психических заболеваний */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Семейная история</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    minHeight: 80
                  }]}
                  value={tempUserInfo.familyHistory}
                  onChangeText={(text) => setTempUserInfo({ ...tempUserInfo, familyHistory: text })}
                  placeholder="Психические заболевания в семье (если есть)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Assessment Modal */}
      <ClinicalAssessmentScreen
        visible={assessmentVisible}
        onClose={() => {
          setAssessmentVisible(false);
          loadUserProfile(); // Reload profile after test completion
        }}
        assessmentType={currentAssessmentType}
      />

      {/* Select Options Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{modalContent.title}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalOptionsContainer}>
              {modalContent.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor:
                        modalContent.currentValue === option
                          ? theme.colors.accent + '20'
                          : theme.colors.card,
                      borderColor:
                        modalContent.currentValue === option
                          ? theme.colors.accent
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    modalContent.onSelect(option);
                    setIsModalVisible(false);
                  }}
                >
                  <Text
                    style={{
                      color:
                        modalContent.currentValue === option
                          ? theme.colors.accent
                          : theme.colors.text,
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.header,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  scrollContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  profileName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  editProfileText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  settingRight: {
    marginLeft: theme.spacing.sm,
  },
  // New styles for progress section
  progressSection: {
    marginBottom: theme.spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  progressCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  progressTotal: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  progressLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  lastTestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  lastTestText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  testsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  testsButtonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: 'white',
  },
  // Insights section
  insightsSection: {
    marginBottom: theme.spacing.xl,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  insightsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  insightsText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalButton: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
  },
  // New user info styles
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  infoText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  // Select input styles
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
  },
  selectText: {
    fontSize: theme.typography.body.fontSize,
    flex: 1,
  },
  // Modal for select options
  optionItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  // New styles for modal options
  modalOptionsContainer: {
    maxHeight: '60%',
  },
  modalOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
  },
});
