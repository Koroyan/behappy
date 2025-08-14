import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Import emotion cards from assets/cards/emotions folder
const emotionCards = [
  { id: '1', uri: require('../../../assets/cards/emotions/card1.jpg') },
  { id: '2', uri: require('../../../assets/cards/emotions/card2.jpg') },
  { id: '3', uri: require('../../../assets/cards/emotions/card3.jpg') },
  { id: '4', uri: require('../../../assets/cards/emotions/card4.jpg') },
  { id: '5', uri: require('../../../assets/cards/emotions/card5.jpg') },
  { id: '6', uri: require('../../../assets/cards/emotions/card6.jpg') },
  { id: '7', uri: require('../../../assets/cards/emotions/card7.jpg') },
  { id: '8', uri: require('../../../assets/cards/emotions/card8.jpg') },
  { id: '9', uri: require('../../../assets/cards/emotions/card9.jpg') },
  { id: '10', uri: require('../../../assets/cards/emotions/card10.jpg') },
  { id: '11', uri: require('../../../assets/cards/emotions/card11.jpg') },
  { id: '12', uri: require('../../../assets/cards/emotions/card12.jpg') },
  { id: '13', uri: require('../../../assets/cards/emotions/card13.jpg') },
  { id: '14', uri: require('../../../assets/cards/emotions/card14.jpg') },
  { id: '15', uri: require('../../../assets/cards/emotions/card15.jpg') },
  { id: '16', uri: require('../../../assets/cards/emotions/card16.jpg') },
  { id: '17', uri: require('../../../assets/cards/emotions/card17.jpg') },
  { id: '18', uri: require('../../../assets/cards/emotions/card18.jpg') },
  { id: '19', uri: require('../../../assets/cards/emotions/card19.jpg') },
  { id: '20', uri: require('../../../assets/cards/emotions/card20.jpg') },
  {id: '21', uri: require('../../../assets/cards/emotions/card21.jpg') },
];

export default function EmotionCardsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardSize = (screenWidth - 48) / 3; // 3 columns with padding

  const handleCardSelect = (card: any) => {
    setSelectedCard(card);
  };

  const handleStartConsultation = () => {
    if (!selectedCard) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите карту');
      return;
    }

    // Navigate to chat with selected emotion card parameters
    router.push({
      pathname: '/chat',
      params: {
        context: 'emotion_card',
        cardId: selectedCard.id,
        cardType: 'emotions'
      },
    });
  };

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
      paddingVertical: 16,
      backgroundColor: theme.colors.card,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    backButton: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      elevation: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      flex: 1,
    },
    placeholder: {
      width: 40,
    },
    instructionsContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 20,
      opacity: 0.8,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 10,
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingBottom: 120,
      paddingTop: 10,
    },
    cardWrapper: {
      width: (Dimensions.get('window').width - 60) / 3,
      marginBottom: 20,
      marginHorizontal: 5,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      transform: [{ scale: 1 }],
    },
    cardContainer: {
      width: '100%',
      aspectRatio: 0.75,
      borderRadius: 15,
      overflow: 'hidden',
      position: 'relative',
    },
    selectedCard: {
      borderWidth: 2,
      borderColor: '#4a90e2',
      shadowColor: '#4a90e2',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      transform: [{ scale: 1.02 }],
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    selectedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(74, 144, 226, 0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 15,
    },
    selectedIcon: {
      backgroundColor: '#4a90e2',
      borderRadius: 18,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      elevation: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    startButton: {
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#4a90e2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    startButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 24,
    },
    startButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      marginLeft: 8,
      letterSpacing: 0.5,
    },
    disabledButton: {
      opacity: 0.3,
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
        <Text style={styles.headerTitle}>Эмоциональные карты</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>Выберите карту</Text>
        <Text style={styles.subtitle}>
          Выберите карту, которая лучше всего отражает ваше текущее эмоциональное состояние
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsGrid}>
          {emotionCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => handleCardSelect(card)}
              activeOpacity={0.8}
              style={styles.cardWrapper}
            >
              <View style={[
                styles.cardContainer,
                selectedCard?.id === card.id && styles.selectedCard
              ]}>
                <Image source={card.uri} style={styles.cardImage} />
                {selectedCard?.id === card.id && (
                  <View style={styles.selectedOverlay}>
                    <View style={styles.selectedIcon}>
                      <FontAwesome5 name="check" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {selectedCard && (
        <View style={styles.bottomContainer}>
          <LinearGradient
            colors={[theme.colors.primary, '#357abd']}
            style={styles.startButton}
          >
            <TouchableOpacity 
              onPress={handleStartConsultation}
              style={styles.startButtonInner}
            >
              <FontAwesome5 name="comments" size={20} color="#ffffff" />
              <Text style={styles.startButtonText}>Начать эмоциональную терапию</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
