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
    en: 'Narrative Cards',
    ka: 'ნარატივის ბარათები',
    ru: 'Нарративные карты',
    hy: 'Պատմողական Քարտեր',
    tr: 'Anlatı Kartları',
    az: 'Povest Kartları',
    es: 'Cartas Narrativas',
    de: 'Erzählkarten',
    fr: 'Cartes Narratives',
    pt: 'Cartões Narrativos',
    id: 'Kartu Naratif',
    it: 'Carte Narrative',
    ar: 'بطاقات السرد',
    hi: 'कथा कार्ड',
    zh: '叙事卡片',
    ja: 'ナラティブカード',
    ko: '서사 카드',
    uk: 'Наративні картки',
    pl: 'Karty Narracyjne',
  },
  subtitle: {
    en: 'Choose a card for narrative therapy',
    ka: 'აირჩიეთ ბარათი ნარატივული თერაპიისთვის',
    ru: 'Выберите карту для нарративной терапии',
    hy: 'Ընտրեք քարտ պատմողական թերապիայի համար',
    tr: 'Anlatı terapisi için bir kart seçin',
    az: 'Povest terapiyası üçün kart seçin',
    es: 'Elija una carta para terapia narrativa',
    de: 'Wählen Sie eine Karte für narrative Therapie',
    fr: 'Choisissez une carte pour la thérapie narrative',
    pt: 'Escolha um cartão para terapia narrativa',
    id: 'Pilih kartu untuk terapi naratif',
    it: 'Scegli una carta per la terapia narrativa',
    ar: 'اختر بطاقة للعلاج السردي',
    hi: 'कथा चिकित्सा के लिए कार्ड चुनें',
    zh: '选择叙事治疗卡片',
    ja: 'ナラティブセラピーのカードを選択',
    ko: '서사 치료를 위한 카드 선택',
    uk: 'Виберіть картку для наративної терапії',
    pl: 'Wybierz kartę do terapii narracyjnej',
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
  startNarrativeTherapy: {
    en: 'Start Narrative Therapy',
    ka: 'ნარატივული თერაპიის დაწყება',
    ru: 'Начать нарративную терапию',
    hy: 'Սկսել Պատմողական Թերապիան',
    tr: 'Anlatı Terapisini Başlat',
    az: 'Povest Terapiyasına başla',
    es: 'Iniciar Terapia Narrativa',
    de: 'Narrative Therapie starten',
    fr: 'Commencer la Thérapie Narrative',
    pt: 'Iniciar Terapia Narrativa',
    id: 'Mulai Terapi Naratif',
    it: 'Inizia Terapia Narrativa',
    ar: 'بدء العلاج السردي',
    hi: 'कथा चिकित्सा शुरू करें',
    zh: '开始叙事治疗',
    ja: 'ナラティブセラピーを開始',
    ko: '서사 치료 시작',
    uk: 'Почати Наративну Терапію',
    pl: 'Rozpocznij Terapię Narracyjną',
  },
};

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

    // Navigate to therapeutic chat with selected narrative card
    router.push({
      pathname: '/screens/cards/therapy-chat',
      params: {
        context: 'narrative',
        cardId: selectedCard.id,
        cardImageUri: JSON.stringify(selectedCard.uri), // Pass image URI
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
        <Text style={styles.headerTitle}>{pick(T.headerTitle, language)}</Text>
        <TouchableOpacity 
          onPress={() => router.push('/screens/cards/sessions-history')} 
          style={styles.historyButton}
        >
          <MaterialCommunityIcons name="history" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>
          {pick(T.subtitle, language)}
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
              <Text style={styles.startButtonText}>{pick(T.startNarrativeTherapy, language)}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}