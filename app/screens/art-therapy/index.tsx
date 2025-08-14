import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface ArtTherapyTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const artTherapyTopics: ArtTherapyTopic[] = [
  {
    id: 'free-drawing',
    title: 'Свободная тема',
    description: 'Свободно выражайте свои чувства',
    icon: 'paint-brush',
    color: '#FF6B6B',
  },
  {
    id: 'self-portrait',
    title: 'Автопортрет',
    description: 'Создайте свой автопортрет',
    icon: 'user',
    color: '#4ECDC4',
  },
  {
    id: 'emotions',
    title: 'Эмоции',
    description: 'Выразите свои эмоции через рисование',
    icon: 'heart',
    color: '#45B7D1',
  },
  {
    id: 'nature',
    title: 'Природа',
    description: 'Нарисуйте природные сцены',
    icon: 'tree',
    color: '#96CEB4',
  },
  {
    id: 'dreams',
    title: 'Сны',
    description: 'Визуализируйте свои сны',
    icon: 'moon',
    color: '#FFEAA7',
  },
  {
    id: 'family',
    title: 'Семья',
    description: 'Нарисуйте свою семью',
    icon: 'users',
    color: '#DDA0DD',
  },
  {
    id: 'future',
    title: 'Будущее',
    description: 'Визуализируйте свое будущее',
    icon: 'rocket',
    color: '#FDA7DF',
  },
  {
    id: 'memories',
    title: 'Воспоминания',
    description: 'Нарисуйте важные воспоминания',
    icon: 'images',
    color: '#74B9FF',
  },
];

export default function ArtTherapyIndexScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const styles = createStyles(theme, isDark);

  const handleTopicPress = (topic: ArtTherapyTopic) => {
    // ყველა თემა arttherapy.tsx-ს გახსნის, შეგიძლია params-ით გადაცე თემის ინფორმაცია
    router.push({
      pathname: '/screens/art-therapy/arttherapy',
      params: { 
        theme: topic.title,
        color: topic.color 
      }
    });
  };

  const handleHistoryPress = () => {
    router.push('/screens/art-therapy/art-therapy-history');
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <FontAwesome5 
            name="arrow-left" 
            size={20} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Арт-терапия</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={handleHistoryPress}
        >
          <FontAwesome5 
            name="history" 
            size={20} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>
          Выберите тему
        </Text>
        
        <View style={styles.topicsContainer}>
          {artTherapyTopics.map((topic, index) => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicCard,
                { 
                  backgroundColor: isDark ? theme.colors.card : topic.color + '20',
                  borderColor: topic.color,
                }
              ]}
              onPress={() => handleTopicPress(topic)}
              activeOpacity={0.7}
            >
              <View style={[styles.topicIcon, { backgroundColor: topic.color }]}>
                <FontAwesome5 
                  name={topic.icon} 
                  size={24} 
                  color="white" 
                />
              </View>
              
              <View style={styles.topicContent}>
                <Text style={styles.topicTitle}>
                  {topic.title}
                </Text>
                <Text style={styles.topicDescription}>
                  {topic.description}
                </Text>
              </View>
              
              <FontAwesome5 
                name="chevron-right" 
                size={16} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Польза арт-терапии</Text>
          
          <Text style={styles.infoBenefit}>• Выражение эмоций</Text>
          <Text style={styles.infoBenefit}>• Снижение стресса</Text>
          <Text style={styles.infoBenefit}>• Развитие творчества</Text>
          <Text style={styles.infoBenefit}>• Повышение самосознания</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 10,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  historyButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: 20,
    textAlign: 'center',
  },
  topicsContainer: {
    paddingBottom: 20,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topicIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  topicTitleRu: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  topicDescriptionRu: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  infoTitleRu: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 15,
  },
  infoBenefit: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});
