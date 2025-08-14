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
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const cards = [
  { id: '1', uri: require('../../../assets/cards/card1.png') },
  { id: '2', uri: require('../../../assets/cards/card2.png') },
  { id: '3', uri: require('../../../assets/cards/card3.png') },
  { id: '4', uri: require('../../../assets/cards/card4.png') },
  { id: '5', uri: require('../../../assets/cards/card5.png') },
  { id: '6', uri: require('../../../assets/cards/card6.png') },
  { id: '7', uri: require('../../../assets/cards/card7.png') },
  { id: '8', uri: require('../../../assets/cards/card8.png') },
  { id: '9', uri: require('../../../assets/cards/card9.png') },
  { id: '10', uri: require('../../../assets/cards/card10.png') },
  { id: '11', uri: require('../../../assets/cards/card11.png') },
  { id: '12', uri: require('../../../assets/cards/card12.png') },
  { id: '13', uri: require('../../../assets/cards/card13.png') },
  { id: '14', uri: require('../../../assets/cards/card14.png') },
  { id: '15', uri: require('../../../assets/cards/card15.png') },
  { id: '16', uri: require('../../../assets/cards/card16.png') },
  { id: '17', uri: require('../../../assets/cards/card17.png') },
  { id: '18', uri: require('../../../assets/cards/card18.png') },
  { id: '19', uri: require('../../../assets/cards/card19.png') },
  { id: '20', uri: require('../../../assets/cards/card20.png') },
];

interface Card {
  id: string;
  uri: any;
}

export default function MoodCardsScreen() {
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
🟢 ${positiveCard.label} (позитивное чувство) - карточка #${positiveCardId}
🔴 ${negativeCard.label} (негативное чувство) - карточка #${negativeCardId}

Пожалуйста, помогите мне понять и исследовать эти эмоции. Карты представляют визуальные образы, которые резонируют с этими эмоциями.
`;

      router.push({
        pathname: '/(tabs)/chat',
        params: { 
          starter: encodeURIComponent(starter),
          context: 'mood_cards',
          positive_emotion: positiveCard.label,
          negative_emotion: negativeCard.label,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color="#000000" />
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
              </TouchableOpacity>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.choiceButton, styles.positiveButton, isPositive && styles.activePositive]}
                  onPress={() => selectCard(item, 'positive')}
                >
                  <FontAwesome5 name="smile" size={12} color={isPositive ? "#ffffff" : "#4CAF50"} />
                  <Text style={[styles.choiceText, isPositive && styles.activeButtonText]}>Позитивная</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceButton, styles.negativeButton, isNegative && styles.activeNegative]}
                  onPress={() => selectCard(item, 'negative')}
                >
                  <FontAwesome5 name="frown" size={12} color={isNegative ? "#ffffff" : "#F44336"} />
                  <Text style={[styles.choiceText, isNegative && styles.activeButtonText]}>Негативная</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Continue Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.continueButton, (!(positiveCard && negativeCard) || loading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!(positiveCard && negativeCard) || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <FontAwesome5 name="comments" size={16} color="#ffffff" />
              <Text style={styles.continueText}>Начать сессию</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 34,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  cardWrapper: {
    flex: 1,
    margin: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    transform: [{ scale: 1.0 }],
  },
  selectedCardWrapper: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.03 }],
    borderWidth: Platform.OS === 'ios' ? 0 : 2,
    borderColor: '#007AFF',
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  selectedCardImage: {
    opacity: 0.9,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  positiveButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  negativeButton: {
    borderColor: '#F44336',
    backgroundColor: '#fff8f8',
  },
  choiceText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  activePositive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activeNegative: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.3,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
