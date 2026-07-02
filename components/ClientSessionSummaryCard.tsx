import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLanguage, useLanguage } from '../contexts/LanguageContext';
import { TherapyColors } from '../styles/therapyStyles';

const p = (o: Record<string, string>, l: AppLanguage): string => o[l] ?? o.en;

const LOCALE_MAP: Record<AppLanguage, string> = {
  en:'en-US', ru:'ru-RU', ka:'ka-GE', hy:'hy-AM', tr:'tr-TR', az:'az-AZ',
  es:'es-ES', de:'de-DE', fr:'fr-FR', pt:'pt-PT', id:'id-ID', it:'it-IT',
  ar:'ar-SA', hi:'hi-IN', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR', uk:'uk-UA', pl:'pl-PL',
};

const HY_WEEKDAYS = ['կիրակի', 'երկուշաբթի', 'երեքշաբթի', 'չորեքշաբթի', 'հինգշաբթի', 'ուրբաթ', 'շաբաթ'];
const HY_MONTHS = ['հունվարի', 'փետրվարի', 'մարտի', 'ապրիլի', 'մայիսի', 'հունիսի', 'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի'];

// Client-safe version - minimal clinical details
export interface ClientSessionSummary {
  sessionDate: Date;
  duration: number; // minutes
  mainFeelings: string[]; // Simplified emotions
  practiceActivities: string[]; // Simplified homework/techniques
  encouragement: string; // Positive message
  personalGrowth?: string; // Optional growth note
}

interface ClientSessionSummaryCardProps {
  summary: ClientSessionSummary;
  onClose?: () => void;
  onSave?: () => void;
}

const ClientSessionSummaryCard: React.FC<ClientSessionSummaryCardProps> = ({
  summary,
  onClose,
  onSave,
}) => {
  const { language } = useLanguage();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const h = p({ en:'h', ru:'ч', ka:'სთ', hy:'ժ', tr:'s', az:'s', es:'h', de:'Std', fr:'h', pt:'h', id:'j', it:'h', ar:'س', hi:'घं', zh:'时', ja:'時間', ko:'시간', uk:'г', pl:'godz' }, language);
    const m = p({ en:' min', ru:' мин', ka:' წთ', hy:' ր', tr:' dk', az:' dəq', es:' min', de:' Min', fr:' min', pt:' min', id:' mnt', it:' min', ar:' دق', hi:' मि', zh:' 分', ja:' 分', ko:' 분', uk:' хв', pl:' min' }, language);
    if (hours > 0) return `${hours}${h} ${mins}${m}`;
    return `${mins}${m}`;
  };

  const formatDate = (date: Date): string => {
    if (language === 'hy') {
      return `${HY_WEEKDAYS[date.getDay()]}, ${HY_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    return date.toLocaleDateString(LOCALE_MAP[language] || 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#E8F5E9', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={32} color="#66BB6A" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{p({ en:'Your Session', ru:'Ваша сессия', ka:'თქვენი სესია', hy:'Ձեր սեանսը', tr:'Oturumunuz', az:'Sessiyanız', es:'Tu Sesión', de:'Deine Sitzung', fr:'Votre Séance', pt:'Sua Sessão', id:'Sesi Anda', it:'La Tua Sessione', ar:'جلستك', hi:'आपका सत्र', zh:'您的会话', ja:'セッション', ko:'세션', uk:'Ваша сесія', pl:'Twoja Sesja' }, language)}</Text>
              <Text style={styles.subtitle}>{formatDate(summary.sessionDate)}</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#718096" />
            </TouchableOpacity>
          )}
        </View>

        {/* Session Time */}
        <View style={styles.timeCard}>
          <Ionicons name="time" size={24} color={TherapyColors.healing} />
          <View style={styles.timeContent}>
            <Text style={styles.timeLabel}>{p({ en:'Session Duration', ru:'Длительность сессии', ka:'სესიის ხანგრძლივობა', hy:'Սեանսի տևողությունը', tr:'Oturum Süresi', az:'Sessiya Müddəti', es:'Duración', de:'Sitzungsdauer', fr:'Durée', pt:'Duração', id:'Durasi Sesi', it:'Durata', ar:'مدة الجلسة', hi:'सत्र अवधि', zh:'会话时长', ja:'セッション時間', ko:'세션 시간', uk:'Тривалість сесії', pl:'Czas Sesji' }, language)}</Text>
            <Text style={styles.timeValue}>{formatDuration(summary.duration)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Main Feelings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="happy-outline" size={22} color={TherapyColors.support} />
            <Text style={styles.sectionTitle}>{p({ en:'What We Explored Today', ru:'Что мы исследовали сегодня', ka:'რა გამოვიკვლიეთ დღეს', hy:'Ինչ ուսումնասիրեցինք այսօր', tr:'Bugün Ne Keşfettik', az:'Bu gün nələri araşdırdıq', es:'Lo Que Exploramos Hoy', de:'Was Wir Heute Erkundet Haben', fr:"Ce Que Nous Avons Exploré Aujourd'hui", pt:'O Que Exploramos Hoje', id:'Yang Kami Jelajahi Hari Ini', it:'Cosa Abbiamo Esplorato Oggi', ar:'ما استكشفناه اليوم', hi:'आज हमने क्या खोजा', zh:'今天我们探索了什么', ja:'今日探ったこと', ko:'오늘 탐색한 것', uk:'Що ми досліджували сьогодні', pl:'Co Dzisiaj Odkryliśmy' }, language)}</Text>
          </View>
          <View style={styles.feelingsContainer}>
            {summary.mainFeelings.map((feeling, index) => (
              <View key={index} style={styles.feelingChip}>
                <Text style={styles.feelingEmoji}>💭</Text>
                <Text style={styles.feelingText}>{feeling}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal Growth Note */}
        {summary.personalGrowth && (
          <View style={styles.growthCard}>
            <View style={styles.growthHeader}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.growthTitle}>{p({ en:'Your Growth', ru:'Ваш рост', ka:'თქვენი ზრდა', hy:'Ձեր աճը', tr:'Büyümeniz', az:'İnkişafınız', es:'Tu Crecimiento', de:'Dein Wachstum', fr:'Votre Croissance', pt:'Seu Crescimento', id:'Pertumbuhan Anda', it:'La Tua Crescita', ar:'نموك', hi:'आपकी वृद्धि', zh:'您的成长', ja:'あなたの成長', ko:'당신의 성장', uk:'Ваш розвиток', pl:'Twój Rozwój' }, language)}</Text>
            </View>
            <Text style={styles.growthText}>{summary.personalGrowth}</Text>
          </View>
        )}

        {/* Practice Activities */}
        {summary.practiceActivities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness-outline" size={22} color={TherapyColors.primary} />
              <Text style={styles.sectionTitle}>{p({ en:'Things to Try', ru:'Что попробовать', ka:'სავარჯიშოები', hy:'Փորձելու բաներ', tr:'Denenecek Şeyler', az:'Sınanacaq şeylər', es:'Cosas para Probar', de:'Dinge zum Ausprobieren', fr:'Choses à Essayer', pt:'Coisas para Tentar', id:'Hal yang Perlu Dicoba', it:'Cose da Provare', ar:'أشياء للتجربة', hi:'आजमाने की चीजें', zh:'可以尝试的事', ja:'試してみること', ko:'시도해볼 것들', uk:'Що спробувати', pl:'Rzeczy do Wypróbowania' }, language)}</Text>
            </View>
            <Text style={styles.practiceIntro}>
              {p({ en:'Here are some activities that might help you feel better:', ru:'Вот несколько занятий, которые помогут вам чувствовать себя лучше:', ka:'აქ არის სავარჯიშოები, რომელიც დაგეხმარებათ:', hy:'Ահա մի քանի գործողություն, որոնք կարող են օգնել ձեզ ավելի լավ զգալ:', tr:'İyi hissetmenize yardımcı olacak aktiviteler:', az:'Özünüzü daha yaxşı hiss etməyinizə kömək edəcək fəaliyyətlər:', es:'Actividades que podrían ayudarte a sentirte mejor:', de:'Aktivitäten, die dir helfen können:', fr:'Activités qui pourraient vous aider:', pt:'Atividades que podem ajudar:', id:'Aktivitas yang mungkin membantu:', it:'Attività che potrebbero aiutarti:', ar:'أنشطة قد تساعدك على الشعور بتحسن:', hi:'गतिविधियाँ जो आपको बेहतर महसूस कराने में मदद कर सकती हैं:', zh:'以下活动可能帮助您感觉更好：', ja:'気分が良くなる活動：', ko:'더 나은 기분을 위한 활동들:', uk:'Ось кілька занять, які можуть допомогти:', pl:'Oto działania, które mogą ci pomóc:' }, language)}
            </Text>
            {summary.practiceActivities.map((activity, index) => (
              <View key={index} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={TherapyColors.healing} />
                </View>
                <Text style={styles.activityText}>{activity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Encouragement Message */}
        <LinearGradient
          colors={['#66BB6A', '#4CAF50']}
          style={styles.encouragementCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-circle" size={32} color="#FFFFFF" />
          <Text style={styles.encouragementText}>{summary.encouragement}</Text>
        </LinearGradient>

        {/* Reminder Note */}
        <View style={styles.reminderBox}>
          <Ionicons name="information-circle-outline" size={20} color="#5E8396" />
          <Text style={styles.reminderText}>
            {p({ en:'Remember: Progress takes time. Be kind to yourself. 💚', ru:'Помните: Прогресс требует времени. Будьте добры к себе. 💚', ka:'დაიმახსოვრეთ: წინსვლას დრო სჭირდება. იყავით მოწყალე საკუთარი თავის მიმართ. 💚', hy:'Հիշեք. առաջընթացը ժամանակ է պահանջում: Բարի եղեք ձեր հանդեպ. 💚', tr:'Unutmayın: İlerleme zaman alır. Kendinize nazik olun. 💚', az:'Unutmayın: İrəliləmə vaxt tələb edir. Özünüzə mehriban olun. 💚', es:'Recuerda: El progreso lleva tiempo. Sé amable contigo mismo. 💚', de:'Denke daran: Fortschritt braucht Zeit. Sei gut zu dir. 💚', fr:"N'oubliez pas : Le progrès prend du temps. Soyez bienveillant. 💚", pt:'Lembre-se: O progresso leva tempo. Seja gentil consigo mesmo. 💚', id:'Ingat: Kemajuan butuh waktu. Berbaik hatilah pada diri sendiri. 💚', it:'Ricorda: Il progresso richiede tempo. Sii gentile con te stesso. 💚', ar:'تذكر: التقدم يستغرق وقتاً. كن لطيفاً مع نفسك. 💚', hi:'याद रखें: प्रगति में समय लगता है। खुद के साथ दयालु रहें। 💚', zh:'记住：进步需要时间。善待自己。💚', ja:'覚えておいて：進歩には時間がかかります。自分に優しく。💚', ko:'기억하세요: 성장에는 시간이 걸립니다. 자신에게 친절하세요. 💚', uk:"Пам'ятайте: Прогрес потребує часу. Будьте добрі до себе. 💚", pl:'Pamiętaj: Postęp wymaga czasu. Bądź dla siebie łagodny. 💚' }, language)}
          </Text>
        </View>

        {/* Save Button */}
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{p({ en:'Save This Summary', ru:'Сохранить резюме', ka:'შეინახე შეჯამება', hy:'Պահպանել այս ամփոփումը', tr:'Bu Özeti Kaydet', az:'Bu Xülasəni Saxla', es:'Guardar Resumen', de:'Zusammenfassung Speichern', fr:'Enregistrer le Résumé', pt:'Salvar Resumo', id:'Simpan Ringkasan', it:'Salva Riepilogo', ar:'حفظ الملخص', hi:'सारांश सहेजें', zh:'保存摘要', ja:'サマリーを保存', ko:'요약 저장', uk:'Зберегти підсумок', pl:'Zapisz Podsumowanie' }, language)}</Text>
          </TouchableOpacity>
        )}

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>
          {p({ en:'This is a personal summary for your reflection. Your detailed session notes are kept private and secure.', ru:'Это личное резюме для вашего осмысления. Подробные записи сессии хранятся конфиденциально.', ka:'ეს არის პირადი შეჯამება თქვენი ასახვისთვის. სესიის დეტალური ჩანაწერები კონფიდენციალურია.', hy:'Սա անձնական ամփոփում է ձեր անդրադարձի համար: Ձեր սեանսի մանրամասն գրառումները պահվում են գաղտնի և անվտանգ։', tr:'Bu, yansımanız için kişisel bir özetdir. Oturum notlarınız gizli tutulmaktadır.', az:'Bu şəxsi xülasədir. Sessiya qeydləriniz gizli saxlanılır.', es:'Este es un resumen personal para tu reflexión. Tus notas están seguras.', de:'Dies ist eine persönliche Zusammenfassung. Deine Sitzungsnotizen bleiben privat.', fr:"Il s'agit d'un résumé personnel. Vos notes sont conservées en toute confidentialité.", pt:'Este é um resumo pessoal. Suas notas são mantidas privadas.', id:'Ini ringkasan pribadi Anda. Catatan sesi dijaga kerahasiaannya.', it:'Questo è un riepilogo personale. Le note dettagliate sono private.', ar:'هذا ملخص شخصي لتأملك. ملاحظاتك محفوظة بشكل آمن.', hi:'यह आपके विचार के लिए व्यक्तिगत सारांश है। नोट्स निजी रखे जाते हैं।', zh:'这是您个人反思的摘要。详细记录保密存储。', ja:'これはあなたの個人的なサマリーです。詳細なノートは非公開です。', ko:'이것은 개인 성찰 요약입니다. 세부 노트는 비공개입니다.', uk:'Це особистий підсумок. Детальні записи зберігаються конфіденційно.', pl:'To osobiste podsumowanie. Notatki są przechowywane prywatnie.' }, language)}
        </Text>
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },
  gradient: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
  },
  closeButton: {
    padding: 4,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  timeContent: {
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginLeft: 8,
  },
  feelingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  feelingEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  feelingText: {
    fontSize: 15,
    color: '#F57C00',
    fontWeight: '600',
  },
  growthCard: {
    backgroundColor: '#FFF3E0',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  growthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginLeft: 8,
  },
  growthText: {
    fontSize: 15,
    color: '#5D4037',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  practiceIntro: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  activityIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  activityText: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 21,
  },
  encouragementCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  encouragementText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 10,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TherapyColors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  privacyNote: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default ClientSessionSummaryCard;
