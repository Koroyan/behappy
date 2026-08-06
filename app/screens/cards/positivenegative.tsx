import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Helper to pick translation
const pick = <T extends Record<string, any>>(obj: T, lang: AppLanguage): string => {
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
};

// Multilingual translations
const T = {
  headerTitle: {
    en: 'Mood Cards',
    ka: 'განწყობის ბარათები',
    ru: 'Карты настроения',
    hy: 'Տրամադրության Քարտեր',
    tr: 'Ruh Hali Kartları',
    az: 'Əhval-ruhiyyə Kartları',
    es: 'Cartas de Estado de Ánimo',
    de: 'Stimmungskarten',
    fr: 'Cartes d\'Humeur',
    pt: 'Cartões de Humor',
    id: 'Kartu Suasana Hati',
    it: 'Carte dell\'Umore',
    ar: 'بطاقات المزاج',
    hi: 'मनोदशा कार्ड',
    zh: '心情卡片',
    ja: '気分カード',
    ko: '기분 카드',
    uk: 'Картки Настрою',
    pl: 'Karty Nastroju',
  },
  selectTwoCards: {
    en: 'Choose Two Cards',
    ka: 'აირჩიეთ ორი ბარათი',
    ru: 'Выберите две карты',
    hy: 'Ընտրեք երկու քարտ',
    tr: 'İki Kart Seçin',
    az: 'İki Kart Seçin',
    es: 'Elija Dos Cartas',
    de: 'Wählen Sie zwei Karten',
    fr: 'Choisissez Deux Cartes',
    pt: 'Escolha Dois Cartões',
    id: 'Pilih Dua Kartu',
    it: 'Scegli Due Carte',
    ar: 'اختر بطاقتين',
    hi: 'दो कार्ड चुनें',
    zh: '选择两张卡片',
    ja: '2枚のカードを選択',
    ko: '두 장의 카드 선택',
    uk: 'Виберіть дві картки',
    pl: 'Wybierz Dwie Karty',
  },
  subtitle: {
    en: 'Choose one that evokes positive feelings and one that evokes negative emotions',
    ka: 'აირჩიეთ ერთი, რომელიც გამოწვევს პოზიტიურ გრძნობებს და ერთი, რომელიც გამოწვევს ნეგატიურ ემოციებს',
    ru: 'Выберите одну, которая вызывает у вас позитивные чувства, и одну, которая вызывает негативные эмоции',
    hy: 'Ընտրեք մեկը, որը դրական զգացմունքներ է առաջացնում, և մեկը՝ բացասական հուզմունքներ',
    tr: 'Pozitif duygular uyandıran bir tane ve negatif duygular uyandıran bir tane seçin',
    az: 'Müsbət hisslər oyadan birini və mənfi emosiyalar oyadan birini seçin',
    es: 'Elija una que evoque sentimientos positivos y una que evoque emociones negativas',
    de: 'Wählen Sie eine, die positive Gefühle hervorruft, und eine, die negative Emotionen hervorruft',
    fr: 'Choisissez-en une qui évoque des sentiments positifs et une qui évoque des émotions négatives',
    pt: 'Escolha uma que evoque sentimentos positivos e uma que evoque emoções negativas',
    id: 'Pilih satu yang membangkitkan perasaan positif dan satu yang membangkitkan emosi negatif',
    it: 'Scegli una che evoca sentimenti positivi e una che evoca emozioni negative',
    ar: 'اختر واحدة تثير مشاعر إيجابية وواحدة تثير عواطف سلبية',
    hi: 'एक चुनें जो सकारात्मक भावनाएँ जगाता है और एक जो नकारात्मक भावनाएँ जगाता है',
    zh: '选择一张唤起积极感受的和一张唤起消极情绪的',
    ja: 'ポジティブな感情を呼び起こすものを1つと、ネガティブな感情を呼び起こすものを1つ選択してください',
    ko: '긍정적인 감정을 불러일으키는 것 하나와 부정적인 감정을 불러일으키는 것 하나를 선택하세요',
    uk: 'Виберіть одну, яка викликає позитивні почуття, і одну, яка викликає негативні емоції',
    pl: 'Wybierz jedną, która wywołuje pozytywne uczucia, i jedną, która wywołuje negatywne emocje',
  },
  positive: {
    en: 'Positive',
    ka: 'პოზიტიური',
    ru: 'Позитив',
    hy: 'Դրական',
    tr: 'Pozitif',
    az: 'Müsbət',
    es: 'Positivo',
    de: 'Positiv',
    fr: 'Positif',
    pt: 'Positivo',
    id: 'Positif',
    it: 'Positivo',
    ar: 'إيجابي',
    hi: 'सकारात्मक',
    zh: '积极',
    ja: 'ポジティブ',
    ko: '긍정',
    uk: 'Позитив',
    pl: 'Pozytywny',
  },
  negative: {
    en: 'Negative',
    ka: 'ნეგატიური',
    ru: 'Негатив',
    hy: 'Բացասական',
    tr: 'Negatif',
    az: 'Mənfi',
    es: 'Negativo',
    de: 'Negativ',
    fr: 'Négatif',
    pt: 'Negativo',
    id: 'Negatif',
    it: 'Negativo',
    ar: 'سلبي',
    hi: 'नकारात्मक',
    zh: '消极',
    ja: 'ネガティブ',
    ko: '부정',
    uk: 'Негатив',
    pl: 'Negatywny',
  },
  selectBothTitle: {
    en: 'Select Both Cards',
    ka: 'აირჩიეთ ორივე ბარათი',
    ru: 'Выберите обе карты',
    hy: 'Ընտրեք երկու քարտերը',
    tr: 'Her İki Kartı Seçin',
    az: 'Hər iki kartı seçin',
    es: 'Seleccione Ambas Cartas',
    de: 'Beide Karten wählen',
    fr: 'Sélectionner les Deux Cartes',
    pt: 'Selecione Ambos os Cartões',
    id: 'Pilih Kedua Kartu',
    it: 'Seleziona Entrambe le Carte',
    ar: 'حدد كلتا البطاقتين',
    hi: 'दोनों कार्ड चुनें',
    zh: '选择两张卡片',
    ja: '両方のカードを選択',
    ko: '두 카드 모두 선택',
    uk: 'Виберіть обидві картки',
    pl: 'Wybierz Obie Karty',
  },
  selectBothMessage: {
    en: 'Choose one positive and one negative card',
    ka: 'აირჩიეთ ერთი პოზიტიური და ერთი ნეგატიური ბარათი',
    ru: 'Выберите одну позитивную и одну негативную карту',
    hy: 'Ընտրեք մեկ դրական և մեկ բացասական քարտ',
    tr: 'Bir pozitif ve bir negatif kart seçin',
    az: 'Bir müsbət və bir mənfi kart seçin',
    es: 'Elija una carta positiva y una negativa',
    de: 'Wählen Sie eine positive und eine negative Karte',
    fr: 'Choisissez une carte positive et une négative',
    pt: 'Escolha um cartão positivo e um negativo',
    id: 'Pilih satu kartu positif dan satu negatif',
    it: 'Scegli una carta positiva e una negativa',
    ar: 'اختر بطاقة إيجابية وبطاقة سلبية',
    hi: 'एक सकारात्मक और एक नकारात्मक कार्ड चुनें',
    zh: '选择一张积极卡片和一张消极卡片',
    ja: 'ポジティブなカード1枚とネガティブなカード1枚を選択してください',
    ko: '긍정적인 카드 하나와 부정적인 카드 하나를 선택하세요',
    uk: 'Виберіть одну позитивну та одну негативну картку',
    pl: 'Wybierz jedną pozytywną i jedną negatywną kartę',
  },
  cardsAlreadySelectedTitle: {
    en: 'Cards Already Selected',
    ka: 'ბარათები უკვე არჩეულია',
    ru: 'Карты уже выбраны',
    hy: 'Քարտերը արդեն ընտրված են',
    tr: 'Kartlar Zaten Seçildi',
    az: 'Kartlar artıq seçildi',
    es: 'Cartas Ya Seleccionadas',
    de: 'Karten bereits ausgewählt',
    fr: 'Cartes Déjà Sélectionnées',
    pt: 'Cartões Já Selecionados',
    id: 'Kartu Sudah Dipilih',
    it: 'Carte Già Selezionate',
    ar: 'البطاقات محددة بالفعل',
    hi: 'कार्ड पहले से चुने गए',
    zh: '卡片已选择',
    ja: 'カードは既に選択されています',
    ko: '카드가 이미 선택됨',
    uk: 'Картки вже вибрані',
    pl: 'Karty Już Wybrane',
  },
  cardsAlreadySelectedMessage: {
    en: 'You have already selected a positive and negative card. Deselect one to choose another card.',
    ka: 'თქვენ უკვე აირჩიეთ პოზიტიური და ნეგატიური ბარათი. გააუქმეთ ერთ-ერთის არჩევა სხვა ბარათის ასარჩევად.',
    ru: 'Вы уже выбрали позитивную и негативную карту. Отмените один из выборов, чтобы выбрать другую карту.',
    hy: 'Դուք արդեն ընտրել եք դրական և բացասական քարտ: Հանեք մեկը մեկ ուրիշ քարտ ընտրելու համար:',
    tr: 'Zaten bir pozitif ve negatif kart seçtiniz. Başka bir kart seçmek için birinin seçimini kaldırın.',
    az: 'Siz artıq müsbət və mənfi kart seçmisiniz. Başqa kart seçmək üçün birini ləğv edin.',
    es: 'Ya ha seleccionado una carta positiva y negativa. Anule la selección de una para elegir otra carta.',
    de: 'Sie haben bereits eine positive und negative Karte ausgewählt. Heben Sie die Auswahl einer Karte auf, um eine andere auszuwählen.',
    fr: 'Vous avez déjà sélectionné une carte positive et négative. Désélectionnez-en une pour choisir une autre carte.',
    pt: 'Você já selecionou um cartão positivo e negativo. Desmarque um para escolher outro cartão.',
    id: 'Anda sudah memilih kartu positif dan negatif. Batalkan pilihan salah satu untuk memilih kartu lain.',
    it: 'Hai già selezionato una carta positiva e negativa. Deseleziona una per sceglierne un\'altra.',
    ar: 'لقد حددت بالفعل بطاقة إيجابية وسلبية. قم بإلغاء تحديد واحدة لاختيار بطاقة أخرى.',
    hi: 'आपने पहले से ही एक सकारात्मक और नकारात्मक कार्ड चुना है। दूसरा कार्ड चुनने के लिए एक को अचयनित करें।',
    zh: '您已经选择了积极和消极卡片。取消选择一个以选择另一张卡片。',
    ja: 'すでにポジティブとネガティブのカードを選択しています。別のカードを選ぶには、1つの選択を解除してください。',
    ko: '이미 긍정적인 카드와 부정적인 카드를 선택했습니다. 다른 카드를 선택하려면 하나를 선택 해제하세요.',
    uk: 'Ви вже вибрали позитивну та негативну картку. Скасуйте вибір однієї, щоб вибрати іншу картку.',
    pl: 'Już wybrałeś kartę pozytywną i negatywną. Odznacz jedną, aby wybrać inną kartę.',
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
  prepareDataError: {
    en: 'Failed to prepare data for chat',
    ka: 'ჩათისთვის მონაცემების მომზადება ვერ მოხერხდა',
    ru: 'Не удалось подготовить данные для чата',
    hy: 'Չհաջողվեց նախապատրաստել տվյալները զրույցի համար',
    tr: 'Sohbet için veri hazırlanamadı',
    az: 'Söhbət üçün məlumatları hazırlamaq alınmadı',
    es: 'No se pudieron preparar los datos para el chat',
    de: 'Daten für Chat konnten nicht vorbereitet werden',
    fr: 'Échec de préparation des données pour le chat',
    pt: 'Falha ao preparar dados para o chat',
    id: 'Gagal menyiapkan data untuk obrolan',
    it: 'Impossibile preparare i dati per la chat',
    ar: 'فشل في إعداد البيانات للمحادثة',
    hi: 'चैट के लिए डेटा तैयार करने में विफल',
    zh: '无法为聊天准备数据',
    ja: 'チャット用のデータの準備に失敗しました',
    ko: '채팅용 데이터 준비 실패',
    uk: 'Не вдалося підготувати дані для чату',
    pl: 'Nie udało się przygotować danych do czatu',
  },
  startSession: {
    en: 'Start Session',
    ka: 'სესიის დაწყება',
    ru: 'Начать сессию',
    hy: 'Սկսել սեանսը',
    tr: 'Oturumu Başlat',
    az: 'Seansı başla',
    es: 'Iniciar Sesión',
    de: 'Sitzung starten',
    fr: 'Commencer la Séance',
    pt: 'Iniciar Sessão',
    id: 'Mulai Sesi',
    it: 'Inizia Sessione',
    ar: 'بدء الجلسة',
    hi: 'सत्र शुरू करें',
    zh: '开始会话',
    ja: 'セッションを開始',
    ko: '세션 시작',
    uk: 'Почати Сесію',
    pl: 'Rozpocznij Sesję',
  },
};

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
  const { language } = useLanguage();
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

  const handleContinue = async () => {
    if (!positiveCard || !negativeCard) {
      Alert.alert(pick(T.selectBothTitle, language), pick(T.selectBothMessage, language));
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
        pathname: '/screens/cards/therapy-chat',
        params: { 
          context: 'positive_negative',
          positive_card_id: positiveCardId,
          negative_card_id: negativeCardId,
          positiveCardImageUri: JSON.stringify(positiveCard.uri), // Pass positive card image
          negativeCardImageUri: JSON.stringify(negativeCard.uri), // Pass negative card image
        },
      });
    } catch (error) {
      console.error("Error in handleContinue:", error);
      Alert.alert(pick(T.errorTitle, language), pick(T.prepareDataError, language));
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
        <Text style={styles.title}>{pick(T.selectTwoCards, language)}</Text>
        <Text style={styles.subtitle}>{pick(T.subtitle, language)}</Text>
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
                    Alert.alert(pick(T.cardsAlreadySelectedTitle, language), pick(T.cardsAlreadySelectedMessage, language));
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
                    <Text style={styles.badgeText}>{pick(T.positive, language)}</Text>
                  </View>
                )}
                {isNegative && (
                  <View style={[styles.emotionBadge, styles.negativeBadge]}>
                    <Text style={styles.badgeText}>{pick(T.negative, language)}</Text>
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
                      {pick(T.positive, language)}
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
                      {pick(T.negative, language)}
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
                <Text style={styles.continueText}>{pick(T.startSession, language)}</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
