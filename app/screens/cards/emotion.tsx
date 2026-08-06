import CommonHeader from '@/components/CommonHeader';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Helper to pick translation
const pick = <T extends Record<string, any>>(obj: T, lang: AppLanguage): string => {
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
};

// Multilingual translations
const T = {
  headerTitle: {
    en: 'Emotion Cards',
    ka: 'ემოციების ბარათები',
    ru: 'Эмоциональные карты',
    hy: 'Հույզերի Քարտեր',
    tr: 'Duygu Kartları',
    az: 'Emosiya Kartları',
    es: 'Cartas de Emoción',
    de: 'Emotionskarten',
    fr: 'Cartes d\'Émotion',
    pt: 'Cartões de Emoção',
    id: 'Kartu Emosi',
    it: 'Carte delle Emozioni',
    ar: 'بطاقات العواطف',
    hi: 'भावना कार्ड',
    zh: '情感卡片',
    ja: '感情カード',
    ko: '감정 카드',
    uk: 'Емоційні картки',
    pl: 'Karty Emocji',
  },
  selectCard: {
    en: 'Select a Card',
    ka: 'აირჩიეთ ბარათი',
    ru: 'Выберите карту',
    hy: 'Ընտրեք քարտ',
    tr: 'Bir Kart Seçin',
    az: 'Kart Seçin',
    es: 'Seleccione una Carta',
    de: 'Wählen Sie eine Karte',
    fr: 'Sélectionnez une Carte',
    pt: 'Selecione um Cartão',
    id: 'Pilih Kartu',
    it: 'Seleziona una Carta',
    ar: 'اختر بطاقة',
    hi: 'एक कार्ड चुनें',
    zh: '选择卡片',
    ja: 'カードを選択',
    ko: '카드 선택',
    uk: 'Виберіть картку',
    pl: 'Wybierz Kartę',
  },
  subtitle: {
    en: 'Choose the card that best reflects your current emotional state',
    ka: 'აირჩიეთ ბარათი, რომელიც საუკეთესოდ ასახავს თქვენს მიმდინარე ემოციურ მდგომარეობას',
    ru: 'Выберите карту, которая лучше всего отражает ваше текущее эмоциональное состояние',
    hy: 'Ընտրեք քարտը, որը լավագույնս արտացոլում է ձեր ընթացիկ հուզական վիճակը',
    tr: 'Mevcut duygusal durumunuzu en iyi yansıtan kartı seçin',
    az: 'Hazırkı emosional vəziyyətinizi ən yaxşı əks etdirən kartı seçin',
    es: 'Elija la carta que mejor refleje su estado emocional actual',
    de: 'Wählen Sie die Karte, die Ihren aktuellen emotionalen Zustand am besten widerspiegelt',
    fr: 'Choisissez la carte qui reflète le mieux votre état émotionnel actuel',
    pt: 'Escolha o cartão que melhor reflete seu estado emocional atual',
    id: 'Pilih kartu yang paling mencerminkan keadaan emosional Anda saat ini',
    it: 'Scegli la carta che riflette meglio il tuo stato emotivo attuale',
    ar: 'اختر البطاقة التي تعكس بشكل أفضل حالتك العاطفية الحالية',
    hi: 'वह कार्ड चुनें जो आपकी वर्तमान भावनात्मक स्थिति को सबसे अच्छे से दर्शाता है',
    zh: '选择最能反映您当前情绪状态的卡片',
    ja: '現在の感情状態を最もよく反映するカードを選択してください',
    ko: '현재 감정 상태를 가장 잘 반영하는 카드를 선택하세요',
    uk: 'Виберіть картку, яка найкраще відображає ваш поточний емоційний стан',
    pl: 'Wybierz kartę, która najlepiej odzwierciedla Twój obecny stan emocjonalny',
  },
  errorTitle: {
    en: 'Error',
    ka: 'შეცდომა',
    ru: 'Ошибка',
    hy: 'Սխալ',
    tr: 'Hata',
    az: 'Xəta',
    es: 'Error',
    de: 'Fehler',
    fr: 'Erreur',
    pt: 'Erro',
    id: 'Kesalahan',
    it: 'Errore',
    ar: 'خطأ',
    hi: 'त्रुटि',
    zh: '错误',
    ja: 'エラー',
    ko: '오류',
    uk: 'Помилка',
    pl: 'Błąd',
  },
  selectCardError: {
    en: 'Please select a card',
    ka: 'გთხოვთ აირჩიოთ ბარათი',
    ru: 'Пожалуйста, выберите карту',
    hy: 'Խնդրում ենք ընտրել քարտ',
    tr: 'Lütfen bir kart seçin',
    az: 'Zəhmət olmasa kart seçin',
    es: 'Por favor seleccione una carta',
    de: 'Bitte wählen Sie eine Karte',
    fr: 'Veuillez sélectionner une carte',
    pt: 'Por favor selecione um cartão',
    id: 'Silakan pilih kartu',
    it: 'Si prega di selezionare una carta',
    ar: 'الرجاء اختيار بطاقة',
    hi: 'कृपया एक कार्ड चुनें',
    zh: '请选择卡片',
    ja: 'カードを選択してください',
    ko: '카드를 선택하세요',
    uk: 'Будь ласка, виберіть картку',
    pl: 'Proszę wybrać kartę',
  },
  startTherapy: {
    en: 'Start Emotion Therapy',
    ka: 'ემოციების თერაპიის დაწყება',
    ru: 'Начать эмоциональную терапию',
    hy: 'Սկսել Հույզերի Թերապիան',
    tr: 'Duygu Terapisini Başlat',
    az: 'Emosiya Terapiyasına başla',
    es: 'Iniciar Terapia Emocional',
    de: 'Emotionstherapie starten',
    fr: 'Commencer la Thérapie Émotionnelle',
    pt: 'Iniciar Terapia Emocional',
    id: 'Mulai Terapi Emosi',
    it: 'Inizia Terapia Emozionale',
    ar: 'بدء العلاج العاطفي',
    hi: 'भावना चिकित्सा शुरू करें',
    zh: '开始情感治疗',
    ja: '感情療法を開始',
    ko: '감정 치료 시작',
    uk: 'Почати Емоційну Терапію',
    pl: 'Rozpocznij Terapię Emocji',
  },
};

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
  const { language } = useLanguage();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardSize = (screenWidth - 48) / 3; // 3 columns with padding

  const handleCardSelect = (card: any) => {
    setSelectedCard(card);
  };

  const handleStartConsultation = () => {
    if (!selectedCard) {
      Alert.alert(pick(T.errorTitle, language), pick(T.selectCardError, language));
      return;
    }

    // Navigate to therapeutic chat with selected emotion card
    router.push({
      pathname: '/screens/cards/therapy-chat',
      params: {
        context: 'emotion',
        cardId: selectedCard.id,
        cardImageUri: JSON.stringify(selectedCard.uri), // Pass image URI
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
    historyButton: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      elevation: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
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
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      <CommonHeader 
        title={pick(T.headerTitle, language)}
        rightActions={
          <TouchableOpacity 
            onPress={() => router.push('/screens/cards/sessions-history')} 
            style={styles.historyButton}
          >
            <MaterialCommunityIcons name="history" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>{pick(T.selectCard, language)}</Text>
        <Text style={styles.subtitle}>
          {pick(T.subtitle, language)}
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
              <Text style={styles.startButtonText}>{pick(T.startTherapy, language)}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
