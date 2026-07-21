import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserProfile, Gender, saveUserProfile, UserProfile } from '@/services/userProfileService';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const pick = (obj: Record<string, string>, lang: AppLanguage) => obj[lang] ?? obj.en;

const T = {
  titleOnboarding: {
    en: 'Tell us about you', ka: 'გვიამბე შენ შესახებ', ru: 'Расскажите о себе', hy: 'Պատմեք ձեր մասին',
    tr: 'Bize kendinizden bahsedin', az: 'Özünüz haqqında danışın', es: 'Cuéntanos sobre ti', de: 'Erzähl uns von dir',
    fr: 'Parlez-nous de vous', pt: 'Conte-nos sobre você', id: 'Ceritakan tentang diri Anda', it: 'Parlaci di te',
    ar: 'أخبرنا عن نفسك', hi: 'हमें अपने बारे में बताएं', zh: '介绍一下自己', ja: 'あなたについて教えてください',
    ko: '자신에 대해 알려주세요', uk: 'Розкажіть про себе', pl: 'Opowiedz nam o sobie',
  },
  titleEdit: {
    en: 'Your profile', ka: 'შენი პროფილი', ru: 'Ваш профиль', hy: 'Ձեր պրոֆիլը', tr: 'Profiliniz',
    az: 'Profiliniz', es: 'Tu perfil', de: 'Dein Profil', fr: 'Votre profil', pt: 'Seu perfil',
    id: 'Profil Anda', it: 'Il tuo profilo', ar: 'ملفك الشخصي', hi: 'आपकी प्रोफ़ाइल', zh: '您的个人资料',
    ja: 'あなたのプロフィール', ko: '내 프로필', uk: 'Ваш профіль', pl: 'Twój profil',
  },
  subtitle: {
    en: 'This helps your AI companion understand and address you personally. Everything stays on your device.',
    ka: 'ეს ეხმარება შენს AI თანამგზავრს პირადულად გაგიგოს და მოგმართოს. ყველაფერი რჩება მხოლოდ შენს მოწყობილობაზე.',
    ru: 'Это помогает вашему AI-компаньону лучше вас понимать и обращаться к вам лично. Всё остаётся только на вашем устройстве.',
    hy: 'Սա օգնում է ձեր AI ուղեկցին անձամբ հասկանալ և դիմել ձեզ։ Ամեն ինչ մնում է միայն ձեր սարքում։',
    tr: 'Bu, AI arkadaşınızın sizi kişisel olarak anlamasına ve size hitap etmesine yardımcı olur. Her şey yalnızca cihazınızda kalır.',
    az: 'Bu, AI yoldaşınızın sizi şəxsi olaraq anlamasına və sizə müraciət etməsinə kömək edir. Hər şey yalnız cihazınızda qalır.',
    es: 'Esto ayuda a tu compañero de IA a entenderte y dirigirse a ti personalmente. Todo permanece solo en tu dispositivo.',
    de: 'Das hilft deinem KI-Begleiter, dich persönlich zu verstehen und anzusprechen. Alles bleibt nur auf deinem Gerät.',
    fr: 'Cela aide votre compagnon IA à vous comprendre et à s\'adresser à vous personnellement. Tout reste uniquement sur votre appareil.',
    pt: 'Isso ajuda seu companheiro de IA a entender e se dirigir a você pessoalmente. Tudo permanece apenas no seu dispositivo.',
    id: 'Ini membantu pendamping AI Anda memahami dan menyapa Anda secara pribadi. Semuanya tetap hanya di perangkat Anda.',
    it: 'Questo aiuta il tuo compagno IA a capirti e rivolgersi a te personalmente. Tutto rimane solo sul tuo dispositivo.',
    ar: 'هذا يساعد رفيقك الذكي على فهمك ومخاطبتك بشكل شخصي. يبقى كل شيء على جهازك فقط.',
    hi: 'यह आपके AI साथी को आपको व्यक्तिगत रूप से समझने और संबोधित करने में मदद करता है। सब कुछ केवल आपके डिवाइस पर रहता है।',
    zh: '这有助于你的 AI 伙伴personally地了解你并称呼你。所有内容仅保存在你的设备上。',
    ja: 'これにより、AIコンパニオンがあなたを個人的に理解し、呼びかけることができます。すべてはあなたの端末にのみ保存されます。',
    ko: '이 정보는 AI 동반자가 당신을 개인적으로 이해하고 이름으로 부를 수 있도록 도와줍니다. 모든 정보는 기기에만 저장됩니다.',
    uk: 'Це допомагає вашому AI-супутнику особисто розуміти вас і звертатися до вас. Все залишається лише на вашому пристрої.',
    pl: 'To pomaga Twojemu towarzyszowi AI zrozumieć Cię i zwracać się do Ciebie osobiście. Wszystko pozostaje tylko na Twoim urządzeniu.',
  },
  nameLabel: {
    en: 'Name', ka: 'სახელი', ru: 'Имя', hy: 'Անուն', tr: 'İsim', az: 'Ad', es: 'Nombre', de: 'Name',
    fr: 'Prénom', pt: 'Nome', id: 'Nama', it: 'Nome', ar: 'الاسم', hi: 'नाम', zh: '姓名', ja: '名前',
    ko: '이름', uk: 'Ім\'я', pl: 'Imię',
  },
  namePlaceholder: {
    en: 'e.g. Nino', ka: 'მაგ. ნინო', ru: 'напр. Нино', hy: 'օր. Նինո', tr: 'ör. Nino', az: 'məs. Nino',
    es: 'ej. Nino', de: 'z. B. Nino', fr: 'ex. Nino', pt: 'ex. Nino', id: 'mis. Nino', it: 'es. Nino',
    ar: 'مثال: نينو', hi: 'जैसे नीनो', zh: '例如：Nino', ja: '例：Nino', ko: '예: Nino', uk: 'напр. Ніно', pl: 'np. Nino',
  },
  genderLabel: {
    en: 'Gender', ka: 'სქესი', ru: 'Пол', hy: 'Սեռ', tr: 'Cinsiyet', az: 'Cins', es: 'Género', de: 'Geschlecht',
    fr: 'Genre', pt: 'Gênero', id: 'Jenis kelamin', it: 'Genere', ar: 'الجنس', hi: 'लिंग', zh: '性别',
    ja: '性別', ko: '성별', uk: 'Стать', pl: 'Płeć',
  },
  genderOptions: {
    male: { en: 'Male', ka: 'მამრობითი', ru: 'Мужской', hy: 'Արական', tr: 'Erkek', az: 'Kişi', es: 'Masculino', de: 'Männlich', fr: 'Homme', pt: 'Masculino', id: 'Laki-laki', it: 'Maschio', ar: 'ذكر', hi: 'पुरुष', zh: '男', ja: '男性', ko: '남성', uk: 'Чоловіча', pl: 'Mężczyzna' },
    female: { en: 'Female', ka: 'მდედრობითი', ru: 'Женский', hy: 'Իգական', tr: 'Kadın', az: 'Qadın', es: 'Femenino', de: 'Weiblich', fr: 'Femme', pt: 'Feminino', id: 'Perempuan', it: 'Femmina', ar: 'أنثى', hi: 'महिला', zh: '女', ja: '女性', ko: '여성', uk: 'Жіноча', pl: 'Kobieta' },
    other: { en: 'Other', ka: 'სხვა', ru: 'Другое', hy: 'Այլ', tr: 'Diğer', az: 'Digər', es: 'Otro', de: 'Andere', fr: 'Autre', pt: 'Outro', id: 'Lainnya', it: 'Altro', ar: 'آخر', hi: 'अन्य', zh: '其他', ja: 'その他', ko: '기타', uk: 'Інше', pl: 'Inna' },
    prefer_not_to_say: { en: 'Prefer not to say', ka: 'არ მსურს თქმა', ru: 'Не хочу говорить', hy: 'Չեմ ցանկանում ասել', tr: 'Belirtmek istemiyorum', az: 'Demək istəmirəm', es: 'Prefiero no decirlo', de: 'Möchte ich nicht sagen', fr: 'Je préfère ne pas dire', pt: 'Prefiro não dizer', id: 'Tidak ingin menyebutkan', it: 'Preferisco non dirlo', ar: 'أفضل عدم القول', hi: 'नहीं बताना चाहता/चाहती', zh: '不愿透露', ja: '答えたくない', ko: '밝히지 않음', uk: 'Не хочу казати', pl: 'Wolę nie mówić' },
  },
  ageLabel: {
    en: 'Age', ka: 'ასაკი', ru: 'Возраст', hy: 'Տարիք', tr: 'Yaş', az: 'Yaş', es: 'Edad', de: 'Alter',
    fr: 'Âge', pt: 'Idade', id: 'Usia', it: 'Età', ar: 'العمر', hi: 'उम्र', zh: '年龄', ja: '年齢',
    ko: '나이', uk: 'Вік', pl: 'Wiek',
  },
  healthLabel: {
    en: 'Health conditions (optional)', ka: 'ჯანმრთელობის მდგომარეობა (არასავალდებულო)', ru: 'Состояние здоровья (необязательно)',
    hy: 'Առողջական վիճակ (ըստ ցանկության)', tr: 'Sağlık durumu (isteğe bağlı)', az: 'Sağlamlıq vəziyyəti (istəyə bağlı)',
    es: 'Condiciones de salud (opcional)', de: 'Gesundheitszustand (optional)', fr: 'État de santé (facultatif)',
    pt: 'Condições de saúde (opcional)', id: 'Kondisi kesehatan (opsional)', it: 'Condizioni di salute (facoltativo)',
    ar: 'الحالة الصحية (اختياري)', hi: 'स्वास्थ्य स्थिति (वैकल्पिक)', zh: '健康状况（可选）', ja: '健康状態（任意）',
    ko: '건강 상태 (선택 사항)', uk: 'Стан здоров\'я (необов\'язково)', pl: 'Stan zdrowia (opcjonalnie)',
  },
  healthPlaceholder: {
    en: 'Anything relevant — conditions, medication, etc.', ka: 'ნებისმიერი მნიშვნელოვანი — დიაგნოზი, მედიკამენტები და ა.შ.',
    ru: 'Всё важное — диагнозы, лекарства и т.д.', hy: 'Ցանկացած կարևոր բան՝ ախտորոշում, դեղեր և այլն',
    tr: 'İlgili her şey — rahatsızlıklar, ilaçlar vb.', az: 'Əlaqəli hər şey — xəstəliklər, dərmanlar və s.',
    es: 'Cualquier cosa relevante: afecciones, medicación, etc.', de: 'Alles Relevante — Erkrankungen, Medikamente usw.',
    fr: 'Tout ce qui est pertinent — affections, médicaments, etc.', pt: 'Qualquer coisa relevante — condições, medicação, etc.',
    id: 'Apa pun yang relevan — kondisi, obat, dll.', it: 'Qualsiasi cosa rilevante — condizioni, farmaci, ecc.',
    ar: 'أي شيء ذي صلة — حالات، أدوية، إلخ.', hi: 'कोई भी प्रासंगिक बात — स्थितियाँ, दवाएँ आदि।', zh: '任何相关信息——病症、药物等。',
    ja: '関連することを何でも — 病状、服薬など', ko: '관련된 사항 — 질환, 복용 약물 등', uk: 'Усе важливе — стан, ліки тощо',
    pl: 'Wszystko istotne — schorzenia, leki itp.',
  },
  concernsLabel: {
    en: 'What brought you here? (optional)', ka: 'რამ მოგიყვანა აქ? (არასავალდებულო)', ru: 'Что привело вас сюда? (необязательно)',
    hy: 'Ի՞նչն է ձեզ բերել այստեղ (ըստ ցանկության)', tr: 'Sizi buraya ne getirdi? (isteğe bağlı)', az: 'Sizi buraya nə gətirdi? (istəyə bağlı)',
    es: '¿Qué te trajo aquí? (opcional)', de: 'Was hat dich hierher geführt? (optional)', fr: 'Qu\'est-ce qui vous amène ? (facultatif)',
    pt: 'O que te trouxe aqui? (opcional)', id: 'Apa yang membawa Anda ke sini? (opsional)', it: 'Cosa ti ha portato qui? (facoltativo)',
    ar: 'ما الذي جاء بك إلى هنا؟ (اختياري)', hi: 'आपको यहाँ क्या लेकर आया? (वैकल्पिक)', zh: '是什么让你来到这里？（可选）',
    ja: 'ここに来た理由は？（任意）', ko: '무엇 때문에 오셨나요? (선택 사항)', uk: 'Що привело вас сюди? (необов\'язково)',
    pl: 'Co Cię tu sprowadza? (opcjonalnie)',
  },
  concernsPlaceholder: {
    en: 'Whatever feels relevant to share', ka: 'რასაც გინდა გაუზიარო', ru: 'То, что кажется важным поделиться',
    hy: 'Այն, ինչ ուզում ես կիսվել', tr: 'Paylaşmak istediğin her şey', az: 'Paylaşmaq istədiyin hər şey',
    es: 'Lo que sientas relevante compartir', de: 'Was auch immer du teilen möchtest', fr: 'Ce que vous jugez pertinent de partager',
    pt: 'O que você achar relevante compartilhar', id: 'Apa pun yang terasa relevan untuk dibagikan', it: 'Qualsiasi cosa tu voglia condividere',
    ar: 'أي شيء تشعر أنه من المناسب مشاركته', hi: 'जो भी साझा करना उचित लगे', zh: '任何你觉得值得分享的内容', ja: '共有したいと思うこと',
    ko: '나누고 싶은 것', uk: 'Усе, чим варто поділитися', pl: 'Cokolwiek chcesz podzielić się',
  },
  save: {
    en: 'Save', ka: 'შენახვა', ru: 'Сохранить', hy: 'Պահպանել', tr: 'Kaydet', az: 'Yadda saxla', es: 'Guardar',
    de: 'Speichern', fr: 'Enregistrer', pt: 'Salvar', id: 'Simpan', it: 'Salva', ar: 'حفظ', hi: 'सहेजें',
    zh: '保存', ja: '保存', ko: '저장', uk: 'Зберегти', pl: 'Zapisz',
  },
  skip: {
    en: 'Skip for now', ka: 'ჯერჯერობით გამოტოვება', ru: 'Пропустить пока', hy: 'Առայժմ բաց թողնել', tr: 'Şimdilik geç',
    az: 'İndilik keç', es: 'Omitir por ahora', de: 'Vorerst überspringen', fr: 'Passer pour l\'instant', pt: 'Pular por agora',
    id: 'Lewati dulu', it: 'Salta per ora', ar: 'تخطَّ الآن', hi: 'अभी छोड़ें', zh: '暂时跳过', ja: '今はスキップ',
    ko: '나중에 하기', uk: 'Пропустити поки що', pl: 'Pomiń na razie',
  },
  missingFields: {
    en: 'Please fill in your name and age.', ka: 'გთხოვთ შეავსოთ სახელი და ასაკი.', ru: 'Пожалуйста, укажите имя и возраст.',
    hy: 'Խնդրում ենք լրացնել անունը և տարիքը։', tr: 'Lütfen adınızı ve yaşınızı girin.', az: 'Zəhmət olmasa ad və yaş daxil edin.',
    es: 'Por favor, completa tu nombre y edad.', de: 'Bitte gib Namen und Alter an.', fr: 'Veuillez indiquer votre nom et votre âge.',
    pt: 'Por favor, preencha seu nome e idade.', id: 'Silakan isi nama dan usia Anda.', it: 'Inserisci nome ed età.',
    ar: 'يرجى إدخال الاسم والعمر.', hi: 'कृपया अपना नाम और उम्र भरें।', zh: '请填写姓名和年龄。', ja: '名前と年齢を入力してください。',
    ko: '이름과 나이를 입력해 주세요.', uk: 'Будь ласка, вкажіть ім\'я та вік.', pl: 'Podaj imię i wiek.',
  },
};

export default function ProfileSetupScreen() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isOnboarding = mode === 'onboarding';

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('prefer_not_to_say');
  const [age, setAge] = useState('');
  const [healthConditions, setHealthConditions] = useState('');
  const [mainConcerns, setMainConcerns] = useState('');

  useEffect(() => {
    getUserProfile().then((profile: UserProfile | null) => {
      if (!profile) return;
      setName(profile.name || '');
      setGender(profile.gender || 'prefer_not_to_say');
      setAge(profile.age ? String(profile.age) : '');
      setHealthConditions(profile.healthConditions || '');
      setMainConcerns(profile.mainConcerns || '');
    });
  }, []);

  const genderOptions: Gender[] = ['male', 'female', 'other', 'prefer_not_to_say'];

  const handleSave = async () => {
    const ageNum = parseInt(age, 10);
    if (!name.trim() || !ageNum || ageNum <= 0) {
      Alert.alert('', pick(T.missingFields, language as AppLanguage));
      return;
    }

    await saveUserProfile({
      name: name.trim(),
      gender,
      age: ageNum,
      healthConditions: healthConditions.trim() || undefined,
      mainConcerns: mainConcerns.trim() || undefined,
    });

    if (isOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={isDark ? ['#111827', '#1F2937'] : ['#F8FAFC', '#E0F2FE']}
            style={[styles.header, { borderColor: theme.colors.border }]}
          >
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.accent }]}>
              <FontAwesome5 name="user" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {isOnboarding ? pick(T.titleOnboarding, language as AppLanguage) : pick(T.titleEdit, language as AppLanguage)}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{pick(T.subtitle, language as AppLanguage)}</Text>
          </LinearGradient>

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{pick(T.nameLabel, language as AppLanguage)}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', color: theme.colors.text, borderColor: theme.colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder={pick(T.namePlaceholder, language as AppLanguage)}
              placeholderTextColor={theme.colors.textMuted}
              maxLength={40}
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 18 }]}>{pick(T.genderLabel, language as AppLanguage)}</Text>
            <View style={styles.chipsRow}>
              {genderOptions.map((g) => {
                const active = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.colors.accent : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.colors.text }]}>
                      {pick(T.genderOptions[g], language as AppLanguage)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 18 }]}>{pick(T.ageLabel, language as AppLanguage)}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', color: theme.colors.text, borderColor: theme.colors.border }]}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="25"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 18 }]}>{pick(T.healthLabel, language as AppLanguage)}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', color: theme.colors.text, borderColor: theme.colors.border }]}
              value={healthConditions}
              onChangeText={setHealthConditions}
              placeholder={pick(T.healthPlaceholder, language as AppLanguage)}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={300}
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 18 }]}>{pick(T.concernsLabel, language as AppLanguage)}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', color: theme.colors.text, borderColor: theme.colors.border }]}
              value={mainConcerns}
              onChangeText={setMainConcerns}
              placeholder={pick(T.concernsPlaceholder, language as AppLanguage)}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={300}
            />
          </View>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{pick(T.save, language as AppLanguage)}</Text>
          </TouchableOpacity>

          {isOnboarding && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={[styles.skipButtonText, { color: theme.colors.textMuted }]}>{pick(T.skip, language as AppLanguage)}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 20, paddingVertical: 24,
    borderRadius: 20, borderWidth: 1, alignItems: 'center',
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  card: {
    marginHorizontal: 16, marginTop: 20, padding: 16, borderRadius: 18, borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  saveButton: {
    marginHorizontal: 16, marginTop: 20, paddingVertical: 15, borderRadius: 14, alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  skipButton: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  skipButtonText: { fontSize: 13, fontWeight: '600' },
});
