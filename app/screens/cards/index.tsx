import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Dimensions, ImageBackground, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const pick = (obj: Record<string, string>, lang: AppLanguage) => obj[lang] ?? obj.en;

const T = {
  headerTitle: { en: 'Card Collection', ka: 'ბარათების კოლექცია', ru: 'Коллекция карт', hy: 'Քարտերի հավաքածու', tr: 'Kart Koleksiyonu', az: 'Kart Kolleksiyası', es: 'Colección de cartas', de: 'Kartensammlung', fr: 'Collection de cartes', pt: 'Coleção de cartas', id: 'Koleksi Kartu', it: 'Collezione di carte', ar: 'مجموعة البطاقات', hi: 'कार्ड संग्रह', zh: '卡片集合', ja: 'カードコレクション', ko: '카드 컬렉션', uk: 'Колекція карток', pl: 'Kolekcja kart' },
  selectType: { en: 'Choose Card Type', ka: 'აირჩიეთ ბარათის ტიპი', ru: 'Выберите тип карт', hy: 'Ընտրեք քարտի տեսակը', tr: 'Kart Türünü Seçin', az: 'Kart Növünü Seçin', es: 'Elija el tipo de carta', de: 'Kartentyp wählen', fr: 'Choisissez le type de carte', pt: 'Escolha o tipo de carta', id: 'Pilih Jenis Kartu', it: 'Scegli il tipo di carta', ar: 'اختر نوع البطاقة', hi: 'कार्ड प्रकार चुनें', zh: '选择卡片类型', ja: 'カードタイプを選択', ko: '카드 유형 선택', uk: 'Виберіть тип карток', pl: 'Wybierz typ karty' },
  selectSubtitle: { en: 'Choose a card type for your therapeutic session', ka: 'აირჩიეთ ბარათის ტიპი თერაპიული სესიისთვის', ru: 'Выберите тип карт для терапевтической сессии', hy: 'Ընտրեք քարտի տեսակ ձեր բուժական սեանսի համար', tr: 'Terapötik seansınız için bir kart türü seçin', az: 'Terapevtik seansınız üçün kart növü seçin', es: 'Elija un tipo de carta para su sesión terapéutica', de: 'Wählen Sie einen Kartentyp für Ihre therapeutische Sitzung', fr: 'Choisissez un type de carte pour votre séance thérapeutique', pt: 'Escolha um tipo de carta para sua sessão terapêutica', id: 'Pilih jenis kartu untuk sesi terapi Anda', it: 'Scegli un tipo di carta per la tua sessione terapeutica', ar: 'اختر نوع البطاقة لجلستك العلاجية', hi: 'अपने चिकित्सीय सत्र के लिए कार्ड प्रकार चुनें', zh: '为您的治疗会话选择卡片类型', ja: 'セラピーセッション用のカードタイプを選択', ko: '치료 세션을 위한 카드 유형을 선택하세요', uk: 'Виберіть тип карток для терапевтичної сесії', pl: 'Wybierz typ karty dla sesji terapeutycznej' },
  emotionTitle: { en: 'Emotion Cards', ka: 'ემოციების ბარათები', ru: 'Эмоциональные карты', hy: 'Հույզերի քարտեր', tr: 'Duygu Kartları', az: 'Emosiya Kartları', es: 'Cartas de emociones', de: 'Emotionskarten', fr: 'Cartes d\'émotions', pt: 'Cartas de emoções', id: 'Kartu Emosi', it: 'Carte delle emozioni', ar: 'بطاقات العواطف', hi: 'भावना कार्ड', zh: '情感卡片', ja: '感情カード', ko: '감정 카드', uk: 'Емоційні картки', pl: 'Karty emocji' },
  emotionDesc: { en: 'Choose a card based on your emotion', ka: 'აირჩიეთ ბარათი თქვენი ემოციის მიხედვით', ru: 'Выберите карту согласно вашей эмоции', hy: 'Ընտրեք քարտը ձեր հույզի համաձայն', tr: 'Duygunuza göre bir kart seçin', az: 'Emosiyaya görə kart seçin', es: 'Elija una carta según su emoción', de: 'Wählen Sie eine Karte basierend auf Ihrer Emotion', fr: 'Choisissez une carte en fonction de votre émotion', pt: 'Escolha uma carta com base em sua emoção', id: 'Pilih kartu berdasarkan emosi Anda', it: 'Scegli una carta in base alla tua emozione', ar: 'اختر بطاقة بناءً على عاطفتك', hi: 'अपनी भावना के आधार पर कार्ड चुनें', zh: '根据您的情绪选择卡片', ja: 'あなたの感情に基づいてカードを選択', ko: '당신의 감정에 따라 카드를 선택하세요', uk: 'Виберіть картку відповідно до вашої емоції', pl: 'Wybierz kartę na podstawie swojej emocji' },
  resourcesTitle: { en: 'Resource Cards', ka: 'რესურსების ბარათები', ru: 'Карты ресурсов', hy: 'Ռեսուրսների քարտեր', tr: 'Kaynak Kartları', az: 'Resurs Kartları', es: 'Cartas de recursos', de: 'Ressourcenkarten', fr: 'Cartes de ressources', pt: 'Cartas de recursos', id: 'Kartu Sumber Daya', it: 'Carte delle risorse', ar: 'بطاقات الموارد', hi: 'संसाधन कार्ड', zh: '资源卡片', ja: 'リソースカード', ko: '자원 카드', uk: 'Ресурсні картки', pl: 'Karty zasobów' },
  resourcesDesc: { en: 'Explore your inner strength', ka: 'გამოიკვლიეთ თქვენი შიდა ძალა', ru: 'Исследуйте свою внутреннюю силу', hy: 'Հետազոտեք ձեր ներքին ուժը', tr: 'İç gücünüzü keşfedin', az: 'Daxili gücünüzü kəşf edin', es: 'Explore su fuerza interior', de: 'Erkunden Sie Ihre innere Stärke', fr: 'Explorez votre force intérieure', pt: 'Explore sua força interior', id: 'Jelajahi kekuatan batin Anda', it: 'Esplora la tua forza interiore', ar: 'استكشف قوتك الداخلية', hi: 'अपनी आंतरिक शक्ति का अन्वेषण करें', zh: '探索您的内在力量', ja: 'あなたの内なる強さを探る', ko: '내면의 힘을 탐구하세요', uk: 'Досліджуйте свою внутрішню силу', pl: 'Odkryj swoją wewnętrzną siłę' },
  narrativeTitle: { en: 'Narrative Cards', ka: 'ნარატიული ბარათები', ru: 'Нарративные карты', hy: 'Պատմողական քարտեր', tr: 'Anlatı Kartları', az: 'Narrativ Kartlar', es: 'Cartas narrativas', de: 'Narrative Karten', fr: 'Cartes narratives', pt: 'Cartas narrativas', id: 'Kartu Narasi', it: 'Carte narrative', ar: 'بطاقات السرد', hi: 'कथा कार्ड', zh: '叙事卡片', ja: 'ナラティブカード', ko: '서사 카드', uk: 'Наративні картки', pl: 'Karty narracyjne' },
  narrativeDesc: { en: 'Cards for narrative therapy', ka: 'ბარათები ნარატიული თერაპიისთვის', ru: 'Карты для нарративной терапии', hy: 'Քարտեր պատմողական թերապիայի համար', tr: 'Anlatı terapisi için kartlar', az: 'Narrativ terapiya üçün kartlar', es: 'Cartas para terapia narrativa', de: 'Karten für narrative Therapie', fr: 'Cartes pour la thérapie narrative', pt: 'Cartas para terapia narrativa', id: 'Kartu untuk terapi naratif', it: 'Carte per terapia narrativa', ar: 'بطاقات للعلاج السردي', hi: 'कथा चिकित्सा के लिए कार्ड', zh: '叙事治疗卡片', ja: 'ナラティブセラピー用カード', ko: '서사 치료용 카드', uk: 'Картки для наративної терапії', pl: 'Karty do terapii narracyjnej' },
  moodTitle: { en: 'Mood Cards', ka: 'განწყობის ბარათები', ru: 'Карты настроения', hy: 'Տրամադրության քարտեր', tr: 'Ruh Hali Kartları', az: 'Əhval-ruhiyyə Kartları', es: 'Cartas de humor', de: 'Stimmungskarten', fr: 'Cartes d\'humeur', pt: 'Cartas de humor', id: 'Kartu Suasana Hati', it: 'Carte dell\'umore', ar: 'بطاقات المزاج', hi: 'मूड कार्ड', zh: '心情卡片', ja: '気分カード', ko: '기분 카드', uk: 'Картки настрою', pl: 'Karty nastroju' },
  moodDesc: { en: 'Choose positive and negative cards', ka: 'აირჩიეთ დადებითი და უარყოფითი ბარათები', ru: 'Выберите позитивную и негативную карты', hy: 'Ընտրեք դրական և բացասական քարտեր', tr: 'Pozitif ve negatif kartları seçin', az: 'Müsbət və mənfi kartları seçin', es: 'Elija cartas positivas y negativas', de: 'Wählen Sie positive und negative Karten', fr: 'Choisissez des cartes positives et négatives', pt: 'Escolha cartas positivas e negativas', id: 'Pilih kartu positif dan negatif', it: 'Scegli carte positive e negative', ar: 'اختر البطاقات الإيجابية والسلبية', hi: 'सकारात्मक और नकारात्मक कार्ड चुनें', zh: '选择正面和负面卡片', ja: 'ポジティブとネガティブのカードを選択', ko: '긍정적 및 부정적 카드 선택', uk: 'Виберіть позитивні та негативні картки', pl: 'Wybierz pozytywne i negatywne karty' },
} as const;

export default function CardsMainScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  
  const cardTypes = [
    {
      id: 'emotion',
      title: pick(T.emotionTitle, language),
      description: pick(T.emotionDesc, language),
      icon: 'heart',
      gradient: ['#ff6b9d', '#c471ed', '#12c2e9'] as [string, string, string],
      backgroundImage: require('../../../assets/cards/emotions/background.jpg'),
      path: '/screens/cards/emotion',
    },
    {
      id: 'resources',
      title: pick(T.resourcesTitle, language),
      description: pick(T.resourcesDesc, language),
      icon: 'gem',
      gradient: ['#00c851', '#007e33', '#39dbff'] as [string, string, string],
      backgroundImage: require('../../../assets/cards/resources/background.jpg'),
      path: '/screens/cards/resources',
    },
    {
      id: 'innerchild',
      title: pick(T.narrativeTitle, language),
      description: pick(T.narrativeDesc, language),
      icon: 'child-friendly',
      gradient: ['#ffa726', '#ff7043', '#f06292'] as [string, string, string],
      backgroundImage: require('../../../assets/cards/narrative/background.jpg'),
      path: '/screens/cards/innerchild',
    },
    {
      id: 'mood', 
      title: pick(T.moodTitle, language),
      description: pick(T.moodDesc, language),
      icon: 'magic',
      gradient: ['#667eea', '#764ba2', '#f093fb'] as [string, string, string],
      backgroundImage: require('../../../assets/cards/positivenegative/background.jpg'),
      path: '/screens/cards/positivenegative',
    },
    {
      id: 'mood2', 
      title: pick(T.moodTitle, language),
      description: pick(T.moodDesc, language),
      icon: 'magic',
      gradient: ['#667eea', '#764ba2', '#f093fb'] as [string, string, string],
      backgroundImage: require('../../../assets/cards/background.jpg'),
      path: '/screens/cards/positivenegative2',
    },
  ];
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
    historyButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
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
        <Text style={styles.title}>{pick(T.selectType, language)}</Text>
        <Text style={styles.subtitle}>
          {pick(T.selectSubtitle, language)}
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
