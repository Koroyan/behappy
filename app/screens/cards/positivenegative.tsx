import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const cards = [
  { id: '1', uri: require('../../../assets/cards/positivenegative/1.jpg')},
  { id: '2', uri: require('../../../assets/cards/positivenegative/2.jpg') },
  { id: '3', uri: require('../../../assets/cards/positivenegative/3.jpg') },
  { id: '4', uri: require('../../../assets/cards/positivenegative/4.jpg') },
  { id: '5', uri: require('../../../assets/cards/positivenegative/5.jpg') },
  { id: '6', uri: require('../../../assets/cards/positivenegative/6.jpg') },
  { id: '7', uri: require('../../../assets/cards/positivenegative/7.jpg') },
  { id: '8', uri: require('../../../assets/cards/positivenegative/8.jpg') },
  { id: '9', uri: require('../../../assets/cards/positivenegative/9.jpg') },
  { id: '10', uri: require('../../../assets/cards/positivenegative/10.jpg') },
  { id: '11', uri: require('../../../assets/cards/positivenegative/11.jpg') },
  { id: '12', uri: require('../../../assets/cards/positivenegative/12.jpg') },
  { id: '13', uri: require('../../../assets/cards/positivenegative/13.jpg') },
  { id: '14', uri: require('../../../assets/cards/positivenegative/14.jpg') },
  { id: '15', uri: require('../../../assets/cards/positivenegative/15.jpg') },
  { id: '16', uri: require('../../../assets/cards/positivenegative/16.jpg') },
  { id: '17', uri: require('../../../assets/cards/positivenegative/17.jpg') },
  { id: '18', uri: require('../../../assets/cards/positivenegative/18.jpg') },
  { id: '19', uri: require('../../../assets/cards/positivenegative/19.jpg') },
  { id: '20', uri: require('../../../assets/cards/positivenegative/20.jpg') },
];

interface Card {
  id: string;
  uri: any;
}

export default function MoodCardsScreen() {
  const { theme, isDark } = useTheme();
  const [positiveCard, setPositiveCard] = useState<Card | null>(null);
  const [negativeCard, setNegativeCard] = useState<Card | null>(null);
  const router = useRouter();

  const selectCard = (card: Card, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      setPositiveCard(card);
    } else {
      setNegativeCard(card);
    }
  };

  const [loading, setLoading] = useState(false);
  
  // Function to get image path from asset
  const getAssetPath = async (assetModule: any) => {
    try {
      // For local assets, we need to resolve the file path
      // This is a simplification - in a real app you might need more complex logic
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + `card-${Date.now()}.png`);
      const localUri = info.exists ? info.uri : FileSystem.documentDirectory + `card-${Date.now()}.png`;
      
      return localUri;
    } catch (error) {
      console.error("Error getting asset path:", error);
      return null;
    }
  };

  const handleContinue = async () => {
    if (!positiveCard || !negativeCard) {
      Alert.alert('Выберите обе карты', 'Выберите одну позитивную и одну негативную карту');
      return;
    }
    
    setLoading(true);
    
    try {
      const positiveCardId = positiveCard.id;
      const negativeCardId = negativeCard.id;

      const starter = `
Пользователь выбрал две карты:
🟢 Карта #${positiveCardId} (позитивное чувство)
🔴 Карта #${negativeCardId} (негативное чувство)

Пожалуйста, помогите мне понять и исследовать эти эмоции. Карты представляют визуальные образы, которые резонируют с этими эмоциями.
`;

      router.push({
        pathname: '/(tabs)/chat',
        params: { 
          starter: encodeURIComponent(starter),
          context: 'mood_cards',
          positive_emotion: `Карта #${positiveCardId}`,
          negative_emotion: `Карта #${negativeCardId}`,
          positive_card_id: positiveCardId,
          negative_card_id: negativeCardId,
          show_card_images: 'true' // Flag to tell the chat to show the images
        },
      });
    } catch (error) {
      console.error("Error in handleContinue:", error);
      Alert.alert("Ошибка", "Не удалось подготовить данные для чата");
    } finally {
      setLoading(false);
    }
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
    cardsContainer: {
      paddingHorizontal: 10,
      paddingBottom: 120,
    },
    cardWrapper: {
      flex: 1,
      margin: 10,
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
      transform: [{ scale: 1.0 }],
    },
    selectedCardWrapper: {
      shadowColor: '#4a90e2',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      transform: [{ scale: 1.02 }],
      borderWidth: 2,
      borderColor: '#4a90e2',
    },
    cardImage: {
      width: '100%',
      height: 140,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
    },
    selectedCardImage: {
      opacity: 0.9,
    },
    cardLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      paddingVertical: 8,
      backgroundColor: theme.colors.card,
    },
    emotionBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    positiveBadge: {
      backgroundColor: '#4CAF50',
    },
    negativeBadge: {
      backgroundColor: '#F44336',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardSelectionArea: {
      padding: 12,
      backgroundColor: theme.colors.card,
    },
    selectionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    emotionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.background,
      gap: 6,
    },
    positiveButton: {
      borderColor: '#4CAF50',
    },
    negativeButton: {
      borderColor: '#F44336',
    },
    activePositive: {
      backgroundColor: '#4CAF50',
      borderColor: '#4CAF50',
    },
    activeNegative: {
      backgroundColor: '#F44336',
      borderColor: '#F44336',
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    activeButtonText: {
      color: '#ffffff',
    },
    actionContainer: {
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
    continueButton: {
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#4a90e2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    continueButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 24,
    },
    disabledButton: {
      opacity: 0.3,
    },
    continueText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      marginLeft: 8,
      letterSpacing: 0.5,
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
        <Text style={styles.headerTitle}>Карты настроения</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>Выберите две карты</Text>
        <Text style={styles.subtitle}>Выберите одну, которая вызывает у вас позитивные чувства, и одну, которая вызывает негативные эмоции</Text>
      </View>

      {/* Cards Grid */}
      <FlatList
        data={cards}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPositive = positiveCard?.id === item.id;
          const isNegative = negativeCard?.id === item.id;
          const isSelected = isPositive || isNegative;
          
          return (
            <View style={[
              styles.cardWrapper, 
              isSelected && styles.selectedCardWrapper
            ]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (isPositive) {
                    setPositiveCard(null);
                  } else if (isNegative) {
                    setNegativeCard(null);
                  } else if (!positiveCard) {
                    selectCard(item, 'positive');
                  } else if (!negativeCard) {
                    selectCard(item, 'negative');
                  } else {
                    Alert.alert('Карты уже выбраны', 'Вы уже выбрали позитивную и негативную карту. Отмените один из выборов, чтобы выбрать другую карту.');
                  }
                }}
              >
                <Image 
                  source={item.uri} 
                  style={[
                    styles.cardImage,
                    isSelected && styles.selectedCardImage
                  ]} 
                  resizeMode="cover" 
                />
                
                {/* Emotion Badge */}
                {isPositive && (
                  <View style={[styles.emotionBadge, styles.positiveBadge]}>
                    <Text style={styles.badgeText}>Позитив</Text>
                  </View>
                )}
                {isNegative && (
                  <View style={[styles.emotionBadge, styles.negativeBadge]}>
                    <Text style={styles.badgeText}>Негатив</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Improved Selection Buttons */}
              <View style={styles.cardSelectionArea}>
                <View style={styles.selectionRow}>
                  <TouchableOpacity
                    style={[
                      styles.emotionButton, 
                      styles.positiveButton, 
                      isPositive && styles.activePositive
                    ]}
                    onPress={() => selectCard(item, 'positive')}
                  >
                    <FontAwesome5 
                      name="heart" 
                      size={14} 
                      color={isPositive ? "#ffffff" : "#4CAF50"} 
                    />
                    <Text style={[styles.buttonText, isPositive && styles.activeButtonText]}>
                      Позитив
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.emotionButton, 
                      styles.negativeButton, 
                      isNegative && styles.activeNegative
                    ]}
                    onPress={() => selectCard(item, 'negative')}
                  >
                    <FontAwesome5 
                      name="heart-broken" 
                      size={14} 
                      color={isNegative ? "#ffffff" : "#F44336"} 
                    />
                    <Text style={[styles.buttonText, isNegative && styles.activeButtonText]}>
                      Негатив
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Continue Button */}
      <View style={styles.actionContainer}>
        <LinearGradient
          colors={['#4a90e2', '#357abd']}
          style={styles.continueButton}
        >
          <TouchableOpacity
            style={[styles.continueButtonInner, (!(positiveCard && negativeCard) || loading) && styles.disabledButton]}
            onPress={handleContinue}
            disabled={!(positiveCard && negativeCard) || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <FontAwesome5 name="comments" size={18} color="#ffffff" />
                <Text style={styles.continueText}>Начать сессию</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
