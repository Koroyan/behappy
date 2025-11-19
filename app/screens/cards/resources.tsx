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
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Helper to pick translation
const pick = <T extends Record<string, any>>(obj: T, lang: AppLanguage): string => {
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
};

// Multilingual translations
const T = {
  headerTitle: {
    en: 'Resource Cards',
    ka: 'რესურსების ბარათები',
    ru: 'Карты ресурсов',
    hy: 'Ռեսուրսների Քարտեր',
    tr: 'Kaynak Kartları',
    az: 'Resurs Kartları',
    es: 'Cartas de Recursos',
    de: 'Ressourcenkarten',
    fr: 'Cartes de Ressources',
    pt: 'Cartões de Recursos',
    id: 'Kartu Sumber Daya',
    it: 'Carte delle Risorse',
    ar: 'بطاقات الموارد',
    hi: 'संसाधन कार्ड',
    zh: '资源卡片',
    ja: 'リソースカード',
    ko: '자원 카드',
    uk: 'Ресурсні картки',
    pl: 'Karty Zasobów',
  },
  subtitle: {
    en: 'Choose a resource card to explore inner strength',
    ka: 'აირჩიეთ რესურსის ბარათი შიდა ძალის შესასწავლად',
    ru: 'Выберите карту ресурса для исследования внутренней силы',
    hy: 'Ընտրեք ռեսուրսի քարտ ներքին ուժը ուսումնասիրելու համար',
    tr: 'İç gücü keşfetmek için bir kaynak kartı seçin',
    az: 'Daxili gücü öyrənmək üçün resurs kartı seçin',
    es: 'Elija una carta de recurso para explorar la fuerza interior',
    de: 'Wählen Sie eine Ressourcenkarte, um innere Stärke zu erforschen',
    fr: 'Choisissez une carte de ressource pour explorer la force intérieure',
    pt: 'Escolha um cartão de recurso para explorar a força interior',
    id: 'Pilih kartu sumber daya untuk menjelajahi kekuatan batin',
    it: 'Scegli una carta delle risorse per esplorare la forza interiore',
    ar: 'اختر بطاقة موارد لاستكشاف القوة الداخلية',
    hi: 'आंतरिक शक्ति का पता लगाने के लिए संसाधन कार्ड चुनें',
    zh: '选择资源卡片探索内在力量',
    ja: '内なる力を探求するためにリソースカードを選択してください',
    ko: '내면의 힘을 탐구하기 위한 자원 카드 선택',
    uk: 'Виберіть ресурсну картку для дослідження внутрішньої сили',
    pl: 'Wybierz kartę zasobów, aby zbadać wewnętrzną siłę',
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
  startConsultation: {
    en: 'Start Consultation',
    ka: 'კონსულტაციის დაწყება',
    ru: 'Начать консультацию',
    hy: 'Սկսել Խորհրդատվությունը',
    tr: 'Danışmayı Başlat',
    az: 'Məsləhətə başla',
    es: 'Iniciar Consulta',
    de: 'Beratung starten',
    fr: 'Commencer la Consultation',
    pt: 'Iniciar Consulta',
    id: 'Mulai Konsultasi',
    it: 'Inizia Consultazione',
    ar: 'بدء الاستشارة',
    hi: 'परामर्श शुरू करें',
    zh: '开始咨询',
    ja: '相談を開始',
    ko: '상담 시작',
    uk: 'Почати Консультацію',
    pl: 'Rozpocznij Konsultację',
  },
};

// Import resource cards from assets/cards/resources folder
const resourceCards = [
  { id: '1', uri: require('../../../assets/cards/resources/card1.jpg') },
  { id: '2', uri: require('../../../assets/cards/resources/card2.jpg') },
  { id: '3', uri: require('../../../assets/cards/resources/card3.jpg') },
  { id: '4', uri: require('../../../assets/cards/resources/card4.jpg') },
  { id: '5', uri: require('../../../assets/cards/resources/card5.jpg') },
  { id: '6', uri: require('../../../assets/cards/resources/card6.jpg') },
  { id: '7', uri: require('../../../assets/cards/resources/card7.jpg') },
  { id: '8', uri: require('../../../assets/cards/resources/card8.jpg') },
  { id: '9', uri: require('../../../assets/cards/resources/card9.jpg') },
  { id: '10', uri: require('../../../assets/cards/resources/card10.jpg') },
  { id: '11', uri: require('../../../assets/cards/resources/card11.jpg') },
  { id: '12', uri: require('../../../assets/cards/resources/card12.jpg') },
  { id: '13', uri: require('../../../assets/cards/resources/card13.jpg') },
  { id: '14', uri: require('../../../assets/cards/resources/card14.jpg') },
  { id: '15', uri: require('../../../assets/cards/resources/card15.jpg') },
  { id: '16', uri: require('../../../assets/cards/resources/card16.jpg') },
  { id: '17', uri: require('../../../assets/cards/resources/card17.jpg') },
  { id: '18', uri: require('../../../assets/cards/resources/card18.jpg') },
  { id: '19', uri: require('../../../assets/cards/resources/card19.jpg') },
  { id: '20', uri: require('../../../assets/cards/resources/card20.jpg') },
  { id: '21', uri: require('../../../assets/cards/resources/card21.jpg') },
];

export default function ResourceCardsScreen() {
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

    // Navigate to therapeutic chat with selected resource card
    router.push({
      pathname: '/screens/cards/therapy-chat',
      params: {
        context: 'resource',
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
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 120,
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
      elevation: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      backgroundColor: theme.colors.card,
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
      top: 8,
      right: 8,
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
            <FontAwesome5 name="check-circle" size={30} color="#ffffff" />
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
            colors={['#4a90e2', '#357abd']}
            style={styles.startButton}
          >
            <TouchableOpacity 
              onPress={handleStartConsultation}
              style={styles.startButtonInner}
            >
              <FontAwesome5 name="comments" size={20} color="#ffffff" />
              <Text style={styles.startButtonText}>{pick(T.startConsultation, language)}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
