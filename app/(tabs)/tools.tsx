import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, SafeAreaView, StatusBar, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const tools = [
  // Therapy with Anulya - featured at top
  {
    name: 'Терапия с Anulya',
    icon: 'comment-medical',
    description: 'Персональная терапия по конкретным проблемам',
    path: '/screens/problems',
    gradient: ['#667eea', '#764ba2'] as [string, string],
    category: 'therapy',
  },
  
  // AI Assistant - featured at top
  {
    name: 'AI Психолог',
    icon: 'robot',
    description: 'Умный помощник доступный 24/7',
    path: '/screens/ai-assistant',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
    category: 'ai',
  },
  
  // Core therapy modules - most important
  {
    name: 'CBT Терапия',
    icon: 'brain',
    description: 'Когнитивно-поведенческая терапия',
    path: '/screens/cbt',
    gradient: ['#667eea', '#764ba2'] as [string, string],
    category: 'therapy',
  },
  {
    name: 'DBT Терапия',
    icon: 'heart',
    description: 'Диалектическая поведенческая терапия',
    path: '/screens/dbt',
    gradient: ['#f093fb', '#f5576c'] as [string, string],
    category: 'therapy',
  },
  {
    name: 'EMDR Терапия',
    icon: 'eye',
    description: 'Десенсибилизация и переработка травм',
    path: '/screens/emdr',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
    category: 'therapy',
  },
  
  // Assessment and tracking tools
  {
    name: 'Психологические тесты',
    icon: 'clipboard-list',
    description: 'Оцените свое психическое здоровье',
    path: '/screens/tests',
    gradient: ['#FF6B6B', '#FF8E8E'] as [string, string],
    category: 'assessment',
  },
  {
    name: 'Трекер прогресса',
    icon: 'chart-line',
    description: 'Отслеживайте свое развитие',
    path: '/screens/wellness-tracker',
    gradient: ['#84fab0', '#8fd3f4'] as [string, string],
    category: 'tracking',
  },
  
  // Wellness and mindfulness
  {
    name: 'Медитация',
    icon: 'leaf',
    description: 'Практики осознанности и медитации',
    path: '/screens/mindfulness',
    gradient: ['#9C27B0', '#2196F3'] as [string, string],
    category: 'wellness',
  },
  {
    name: 'Дыхательные техники',
    icon: 'wind',
    description: 'Быстрое успокоение и расслабление',
    path: '/screens/breathing',
    gradient: ['#4ECDC4', '#44A08D'] as [string, string],
    category: 'wellness',
  },
  {
    name: 'Техники релаксации',
    icon: 'spa',
    description: 'Мышечная релаксация и снятие стресса',
    path: '/screens/relaxation-techniques',
    gradient: ['#82AAE3', '#5D8BC9'] as [string, string],
    category: 'wellness',
  },
  
  // Creative expression tools
  {
    name: 'Арт-терапия',
    icon: 'paint-brush',
    description: 'Выразите эмоции через рисунок',
    path: '/screens/art-therapy',
    gradient: ['#45B7D1', '#96C93D'] as [string, string],
    category: 'creative',
  },
  {
    name: 'Карты эмоций',
    icon: 'clone',
    description: 'Исследуйте свое настроение',
    path: '/screens/cards',
    gradient: ['#96CEB4', '#6EA792'] as [string, string],
    category: 'creative',
  },
  {
    name: 'Умный дневник',
    icon: 'book',
    description: 'Ведите дневник с ИИ поддержкой',
    path: '/screens/journal',
    gradient: ['#FFA726', '#FF7043'] as [string, string],
    category: 'creative',
  },
  
  // Learning and support
  {
    name: 'Обучающие курсы',
    icon: 'graduation-cap',
    description: 'Путь к психологическому благополучию',
    path: '/screens/curses',
    gradient: ['#FFA726', '#FF8A65'] as [string, string],
    category: 'learning',
  },
  {
    name: 'Персональные советы',
    icon: 'lightbulb',
    description: 'AI рекомендации для вашего роста',
    path: '/screens/recommendations',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
    category: 'learning',
  },
  
  // Chat and communication
  {
    name: 'Чат с психологом',
    icon: 'comments',
    description: 'Поговорите с ИИ консультантом',
    path: '/chat',
    gradient: ['#AB47BC', '#8E24AA'] as [string, string],
    category: 'chat',
  },
];

// Organize tools by categories for better UX
const toolCategories = [
  {
    title: '🤖 ИИ Помощник',
    description: 'Умный психолог всегда с вами',
    tools: tools.filter(tool => tool.category === 'ai')
  },
  {
    title: '🧠 Профессиональная терапия', 
    description: 'Научно обоснованные методы лечения',
    tools: tools.filter(tool => tool.category === 'therapy')
  },
  {
    title: '📊 Оценка и трекинг',
    description: 'Измеряйте и отслеживайте прогресс',
    tools: tools.filter(tool => tool.category === 'assessment' || tool.category === 'tracking')
  },
  {
    title: '🧘 Благополучие и осознанность',
    description: 'Практики для ментального здоровья',
    tools: tools.filter(tool => tool.category === 'wellness')
  },
  {
    title: '🎨 Творческое самовыражение',
    description: 'Исцеление через творчество',
    tools: tools.filter(tool => tool.category === 'creative')
  },
  {
    title: '🎓 Обучение и развитие',
    description: 'Знания для личностного роста',
    tools: tools.filter(tool => tool.category === 'learning')
  },
  {
    title: '💬 Общение и поддержка',
    description: 'Персональная психологическая помощь',
    tools: tools.filter(tool => tool.category === 'chat')
  }
];

export default function ToolsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 2; // 2 columns with padding

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    gridContainer: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridItem: {
      width: itemWidth,
      height: itemWidth * 1.2,
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
    },
    itemGradient: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    itemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemContent: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    itemName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    categorySection: {
      marginBottom: 32,
    },
    categoryHeader: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    categoryTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    categoryDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Инструменты</Text>
          <Text style={styles.subtitle}>Выберите то, что вам поможет</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {toolCategories.map((category, categoryIndex) => (
          category.tools.length > 0 && (
            <View key={categoryIndex} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <View style={styles.gridContainer}>
                {category.tools.map((tool, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.gridItem}
                    onPress={() => router.push(tool.path as any)}
                  >
                    <LinearGradient
                      colors={tool.gradient}
                      style={styles.itemGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.itemIcon}>
                        <FontAwesome5 name={tool.icon} size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemName}>{tool.name}</Text>
                        <Text style={styles.itemDescription}>{tool.description}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
