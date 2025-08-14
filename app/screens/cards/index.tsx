import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, SafeAreaView, StatusBar, Dimensions, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const cardTypes = [
  {
    id: 'emotion',
    title: 'Эмоциональные карты',
    description: 'Выберите карту согласно вашей эмоции',
    icon: 'heart',
    gradient: ['#ff6b9d', '#c471ed', '#12c2e9'] as [string, string, string],
    backgroundImage: require('../../../assets/cards/emotions/background.jpg'),
    path: '/screens/cards/emotion',
  },
  {
    id: 'resources',
    title: 'Карты ресурсов',
    description: 'Исследуйте свою внутреннюю силу',
    icon: 'gem',
    gradient: ['#00c851', '#007e33', '#39dbff'] as [string, string, string],
    backgroundImage: require('../../../assets/cards/resources/background.jpg'),
    path: '/screens/cards/resources',
  },
  {
    id: 'innerchild',
    title: 'Нарративные карты',
    description: 'Карты для нарративной терапии',
    icon: 'child-friendly',
    gradient: ['#ffa726', '#ff7043', '#f06292'] as [string, string, string],
    backgroundImage: require('../../../assets/cards/narrative/background.jpg'),
    path: '/screens/cards/innerchild',
  },
  {
    id: 'mood', 
    title: 'Карты настроения',
    description: 'Выберите позитивную и негативную карты',
    icon: 'magic',
    gradient: ['#667eea', '#764ba2', '#f093fb'] as [string, string, string],
    backgroundImage: require('../../../assets/cards/positivenegative/background.jpg'),
    path: '/screens/cards/positivenegative',
  },
  {
    id: 'mood', 
    title: 'Карты настроения',
    description: 'Выберите позитивную и негативную карты',
    icon: 'magic',
    gradient: ['#667eea', '#764ba2', '#f093fb'] as [string, string, string],
    backgroundImage: require('../../../assets/cards/background.jpg'),
    path: '/screens/cards/positivenegative2',
  },
];

export default function CardsMainScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 2 columns with padding

  const styles = StyleSheet.create({
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
      backgroundColor: theme.colors.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    placeholder: {
      width: 34,
    },
    instructionsContainer: {
      paddingHorizontal: 20,
      paddingVertical: 30,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    cardContainer: {
      width: cardWidth,
      marginBottom: 20,
    },
    cardWrapper: {
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      shadowColor: isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 8,
      elevation: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardContent: {
      height: cardWidth * 1.2,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    cardOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      width: '100%',
      borderRadius: 12,
    },
    imageBackground: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 8,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    cardDescription: {
      fontSize: 12,
      color: '#FFFFFF',
      textAlign: 'center',
      opacity: 0.9,
      lineHeight: 16,
      paddingHorizontal: 8,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cardLabel: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    cardLabelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Коллекция карт</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>Выберите тип карт</Text>
        <Text style={styles.subtitle}>
          Выберите тип карт для терапевтической сессии
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {cardTypes.map((cardType) => (
            <TouchableOpacity
              key={cardType.id}
              onPress={() => router.push(cardType.path as any)}
              activeOpacity={0.8}
              style={styles.cardContainer}
            >
              <View style={styles.cardWrapper}>
                <LinearGradient
                  colors={cardType.gradient}
                  style={styles.cardContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.5, 1]}
                >
                  {cardType.backgroundImage ? (
                    <ImageBackground
                      source={cardType.backgroundImage}
                      style={styles.imageBackground}
                      imageStyle={{ borderRadius: 12, opacity: 0.6 }}
                      resizeMode="cover"
                    >
                      <View style={styles.cardOverlay}>
                        <View style={styles.cardIconContainer}>
                          <FontAwesome5 
                            name={cardType.icon} 
                            size={24} 
                            color="#667eea" 
                          />
                        </View>
                        <Text style={styles.cardTitle}>{cardType.title}</Text>
                        <Text style={styles.cardDescription}>
                          {cardType.description}
                        </Text>
                      </View>
                    </ImageBackground>
                  ) : (
                    <>
                      <View style={styles.cardIconContainer}>
                        <FontAwesome5 
                          name={cardType.icon} 
                          size={24} 
                          color="#667eea" 
                        />
                      </View>
                      <Text style={styles.cardTitle}>{cardType.title}</Text>
                      <Text style={styles.cardDescription}>
                        {cardType.description}
                      </Text>
                    </>
                  )}
                </LinearGradient>
                
                {/* Card label */}
                <View style={styles.cardLabel}>
                  <Text style={styles.cardLabelText}>{cardType.title}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
