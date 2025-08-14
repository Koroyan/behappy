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

// Import resource cards from assets/cards/narrative folder
const resourceCards = [
  { id: '1', uri: require('../../../assets/cards/narrative/1.jpg') },
  { id: '2', uri: require('../../../assets/cards/narrative/2.jpg') },
  { id: '3', uri: require('../../../assets/cards/narrative/3.jpg') },
  { id: '4', uri: require('../../../assets/cards/narrative/4.jpg') },
  { id: '5', uri: require('../../../assets/cards/narrative/5.jpg') },
  { id: '6', uri: require('../../../assets/cards/narrative/6.jpg') },
  { id: '7', uri: require('../../../assets/cards/narrative/7.jpg') },
  { id: '8', uri: require('../../../assets/cards/narrative/8.jpg') },
  { id: '9', uri: require('../../../assets/cards/narrative/9.jpg') },
  { id: '10', uri: require('../../../assets/cards/narrative/10.jpg') },
  { id: '11', uri: require('../../../assets/cards/narrative/11.jpg') },
  { id: '12', uri: require('../../../assets/cards/narrative/12.jpg') },
  { id: '13', uri: require('../../../assets/cards/narrative/13.jpg') },
  { id: '14', uri: require('../../../assets/cards/narrative/14.jpg') },
  { id: '15', uri: require('../../../assets/cards/narrative/15.jpg') },
  { id: '16', uri: require('../../../assets/cards/narrative/16.jpg') },
  { id: '17', uri: require('../../../assets/cards/narrative/17.jpg') },
  { id: '18', uri: require('../../../assets/cards/narrative/18.jpg') },
  { id: '19', uri: require('../../../assets/cards/narrative/19.jpg') },
  { id: '20', uri: require('../../../assets/cards/narrative/20.jpg') },
  { id: '21', uri: require('../../../assets/cards/narrative/21.jpg') },
];

export default function InnerChildCardsScreen() {
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

    // Navigate to chat with selected inner child card
    router.push({
      pathname: '/chat',
      params: {
        context: 'narrative_card',
        cardId: selectedCard.id,
        cardType: 'narrative'
      }
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
    instructionText: {
      fontSize: 14,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 20,
      opacity: 0.8,
      fontWeight: '500',
    },
    scrollContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    cardsContainer: {
      padding: 16,
      paddingBottom: 100,
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    cardContainer: {
      marginBottom: 20,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      transform: [{ scale: 1 }],
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
    cardWrapper: {
      position: 'relative',
      aspectRatio: 0.7,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      borderRadius: 15,
    },
    selectionOverlay: {
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
    checkIcon: {
      backgroundColor: '#4a90e2',
      borderRadius: 20,
      width: 40,
      height: 40,
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
  });

  const renderCard = (card: any) => (
    <TouchableOpacity
      key={card.id}
      style={[
        styles.cardContainer,
        { width: cardSize, height: cardSize * 1.4 },
        selectedCard?.id === card.id && styles.selectedCard
      ]}
      onPress={() => handleCardSelect(card)}
    >
      <View style={styles.cardWrapper}>
        <Image source={card.uri} style={styles.cardImage} resizeMode="cover" />
        {selectedCard?.id === card.id && (
          <View style={styles.selectionOverlay}>
            <View style={styles.checkIcon}>
              <FontAwesome5 name="check" size={20} color="#ffffff" />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Нарративные карты</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>
          Выберите карту для нарративной терапии
        </Text>
      </View>

      {/* Cards Grid */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsGrid}>
          {resourceCards.map(renderCard)}
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
              <Text style={styles.startButtonText}>Начать нарративную терапию</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}