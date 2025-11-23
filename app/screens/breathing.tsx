import CommonHeader from '@/components/CommonHeader';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Multilingual breathing patterns (names, descriptions, benefits)
const breathingPatterns = [
  {
    id: '4-7-8',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
    name: { en: '4-7-8 Calm', ka: '4-7-8 დამშვიდება', ru: 'Техника 4-7-8', hy: '4-7-8 հանգիստ', tr: '4-7-8 Sakin', az: '4-7-8 Sakitləşmə', es: '4-7-8 Calma', de: '4-7-8 Ruhe', fr: '4-7-8 Calme', pt: '4-7-8 Calma', id: '4-7-8 Tenang', it: '4-7-8 Calma', ar: '٤-٧-٨ للهدوء', hi: '4-7-8 शांत', zh: '4-7-8 平静', ja: '4-7-8 カーム', ko: '4-7-8 진정', uk: '4-7-8 Спокій', pl: '4-7-8 Spokój' },
    description: { en: 'Inhale 4 • Hold 7 • Exhale 8', ka: 'შესუნთქვა 4 • შეკავება 7 • ამოსუნთქვა 8', ru: 'Вдох 4 • Задержка 7 • Выдох 8', hy: 'Շնչում 4 • Պահում 7 • Արտաշնչում 8', tr: 'Nefes 4 • Tut 7 • Ver 8', az: 'Nəfəs 4 • Saxla 7 • Ver 8', es: 'Inhala 4 • Retén 7 • Exhala 8', de: 'Ein 4 • Halten 7 • Aus 8', fr: 'Inspire 4 • Garde 7 • Expire 8', pt: 'Inspira 4 • Segura 7 • Expira 8', id: 'Tarik 4 • Tahan 7 • Hembus 8', it: 'Inspira 4 • Trattieni 7 • Espira 8', ar: 'شهيق ٤ • حبس ٧ • زفير ٨', hi: 'साँस 4 • रोकें 7 • छोड़ें 8', zh: '吸气4 • 屏息7 • 呼气8', ja: '吸う4・止める7・吐く8', ko: '들이쉬기4 • 멈춤7 • 내쉬기8', uk: 'Вдих 4 • Затримка 7 • Видих 8', pl: 'Wdech 4 • Wstrzymaj 7 • Wydech 8' },
    benefits: { en: ['Settles nerves','Improves sleep','Reduces anxiety'], ka: ['ამშვიდებს ნერვებს','აუმჯობესებს ძილს','ამცირებს შფოთვას'], ru: ['Снижает стресс','Улучшает сон','Уменьшает тревогу'], hy: ['Նվազեցնում է լարվածությունը','Բարելավում է քունը','Նվազեցնում է անհանգստությունը'], tr: ['Siniri yatıştırır','Uykuyu iyileştirir','Kaygıyı azaltır'], az: ['Sinirləri sakitləşdirir','Yuxunu yaxşılaşdırır','Narahatlığı azaldır'], es: ['Calma los nervios','Mejora el sueño','Reduce la ansiedad'], de: ['Beruhigt Nerven','Verbessert Schlaf','Reduziert Angst'], fr: ['Apaise les nerfs','Améliore le sommeil','Réduit l’anxiété'], pt: ['Acalma os nervos','Melhora o sono','Reduz a ansiedade'], id: ['Menenangkan','Memperbaiki tidur','Mengurangi cemas'], it: ['Calma','Migliora il sonno','Riduce ansia'], ar: ['يهدئ الأعصاب','يحسن النوم','يقلل القلق'], hi: ['नर्व शांत','नींद बेहतर','चिंता घटती'], zh: ['缓解紧张','改善睡眠','减轻焦虑'], ja: ['神経を落ち着かせる','睡眠を改善','不安を減らす'], ko: ['긴장 완화','수면 개선','불안 감소'], uk: ['Заспокоює','Покращує сон','Зменшує тривогу'], pl: ['Uspokaja','Poprawia sen','Zmniejsza lęk'] }
  },
  {
    id: 'box',
    inhale: 4,
    hold: 4,
    exhale: 4,
    pause: 4,
    cycles: 4,
    name: { en: 'Box Balance', ka: 'ყუთის ბალანსი', ru: 'Квадратное дыхание', hy: 'Խորանարդային շնչ', tr: 'Kutu Dengesi', az: 'Qutu Balansı', es: 'Respiración en caja', de: 'Box Balance', fr: 'Respiration carrée', pt: 'Respiração em caixa', id: 'Napas Kotak', it: 'Respiro quadrato', ar: 'تنفس مربع', hi: 'बॉक्स ब्रीदिंग', zh: '方形呼吸', ja: 'ボックス呼吸', ko: '박스 호흡', uk: 'Квадратне дихання', pl: 'Oddychanie pudełkowe' },
    description: { en: 'Inhale • Hold • Exhale • Pause (4 each)', ka: 'შესუნთქვა • შეკავება • ამოსუნთქვა • პაუზა (4)', ru: 'Вдох • Задержка • Выдох • Пауза (по 4)', hy: 'Շնչ • Պահ • Արտաշնչ • Դադար (4)', tr: 'Al • Tut • Ver • Bekle (4)', az: 'Nəfəs • Saxla • Ver • Fasilə (4)', es: 'Inhala • Retén • Exhala • Pausa (4)', de: 'Ein • Halten • Aus • Pause (4)', fr: 'Inspire • Garde • Expire • Pause (4)', pt: 'Inspira • Segura • Expira • Pausa (4)', id: 'Tarik • Tahan • Hembus • Jeda (4)', it: 'Inspira • Trattieni • Espira • Pausa (4)', ar: 'شهيق • حبس • زفير • توقف (٤)', hi: 'साँस • रोकें • छोड़ें • विराम (4)', zh: '吸 • 屏息 • 呼 • 停 (各4)', ja: '吸う・止める・吐く・休む（各4）', ko: '들이쉬기 • 멈춤 • 내쉬기 • 휴식 (4)', uk: 'Вдих • Затримка • Видих • Пауза (4)', pl: 'Wdech • Wstrzymaj • Wydech • Pauza (4)' },
    benefits: { en: ['Focus','Balance','Calm'], ka: ['ფოკუსი','ბალანსი','სიმშვიდე'], ru: ['Концентрация','Баланс','Спокойствие'], hy: ['Կենտրոնացում','Հավասարակշռություն','Խաղաղություն'], tr: ['Odak','Denge','Sakinlik'], az: ['Fokus','Balans','Sakitlik'], es: ['Enfoque','Equilibrio','Calma'], de: ['Fokus','Balance','Ruhe'], fr: ['Focus','Équilibre','Calme'], pt: ['Foco','Equilíbrio','Calma'], id: ['Fokus','Seimbang','Tenang'], it: ['Focus','Equilibrio','Calma'], ar: ['تركيز','توازن','هدوء'], hi: ['ध्यान','संतुलन','शांति'], zh: ['专注','平衡','平静'], ja: ['集中','バランス','落ち着き'], ko: ['집중','균형','차분'], uk: ['Фокус','Баланс','Спокій'], pl: ['Skupienie','Balans','Spokój'] }
  },
  {
    id: 'calm',
    inhale: 4,
    exhale: 8,
    cycles: 6,
    name: { en: 'Calm Release', ka: 'მშვიდი გამოშვება', ru: 'Успокаивающее дыхание', hy: 'Հանգստացնող արտաշնչ', tr: 'Sakin Bırakış', az: 'Sakit Buraxılış', es: 'Liberación calma', de: 'Ruhige Entspannung', fr: 'Relâche apaisante', pt: 'Liberação calma', id: 'Lepas Tenang', it: 'Rilascio calmo', ar: 'زفير هادئ', hi: 'शांत विमोचन', zh: '平静释放', ja: '穏やかなリリース', ko: '차분한 내보내기', uk: 'Спокійне видихання', pl: 'Spokojne uwolnienie' },
    description: { en: 'Long exhale for soothing relaxation', ka: 'გრძელი ამოსუნთქვა დამამშვიდებლად', ru: 'Длинный выдох для расслабления', hy: 'Երկար արտաշնչում հանգստության համար', tr: 'Uzun nefes verme sakinlik için', az: 'Uzun nəfəsvermə rahatlıq üçün', es: 'Exhalación larga para relajación', de: 'Langer Ausatmen zur Beruhigung', fr: 'Longue expiration apaisante', pt: 'Exalação longa para relaxar', id: 'Hembusan panjang untuk tenang', it: 'Lunga espirazione rilassante', ar: 'زفير طويل للتهدئة', hi: 'लंबा श्वास छोड़ना आरामदेह', zh: '长呼气以舒缓放松', ja: '長い吐息で落ち着き', ko: '긴 내쉬기로 안정', uk: 'Довгий видих для розслаблення', pl: 'Długi wydech dla ukojenia' },
    benefits: { en: ['Relaxation','Tension release','Emotional settling'], ka: ['რელაქსი','ძაბვის მოხსნა','ემოციური მშვიდობა'], ru: ['Расслабление','Снятие напряжения','Эмоциональное успокоение'], hy: ['Հանգստություն','Լարվածության ազատում','Զգացմունքների հարթում'], tr: ['Gevşeme','Gerginliği azaltır','Duygusal yatışma'], az: ['Rahatlama','Gərginliyin azalması','Emosional sakitləşmə'], es: ['Relajación','Liberar tensión','Calma emocional'], de: ['Entspannung','Spannung lösen','Emotionale Beruhigung'], fr: ['Relaxation','Libération de tension','Apaisement émotionnel'], pt: ['Relaxamento','Alívio de tensão','Equilíbrio emocional'], id: ['Relaks','Lepas ketegangan','Tenang emosional'], it: ['Rilassamento','Scioglie tensione','Calma emotiva'], ar: ['استرخاء','تحرير التوتر','استقرار عاطفي'], hi: ['आराम','तनाव मुक्ति','भावनात्मक शांति'], zh: ['放松','释放紧张','情绪平复'], ja: ['リラックス','緊張解放','感情を落ち着かせる'], ko: ['이완','긴장 해소','감정 안정'], uk: ['Розслаблення','Зняття напруги','Емоційне заспокоєння'], pl: ['Relaks','Uwolnienie napięcia','Emocjonalne wyciszenie'] }
  }
];

const T = {
  headerTitle: { en: 'Breathing techniques', ka: 'სუნთქვის ტექნიკები', ru: 'Дыхательные техники', hy: 'Շնչառական տեխնիկա', tr: 'Nefes teknikleri', az: 'Nəfəsləmə texnikaları', es: 'Técnicas de respiración', de: 'Atemtechniken', fr: 'Techniques de respiration', pt: 'Técnicas de respiração', id: 'Teknik pernapasan', it: 'Tecniche di respirazione', ar: 'تقنيات التنفس', hi: 'श्वास तकनीकें', zh: '呼吸技巧', ja: '呼吸テクニック', ko: '호흡 기법', uk: 'Техніки дихання', pl: 'Techniki oddychania' },
  choosePattern: { en: 'Choose a breathing technique', ka: 'აირჩიე სუნთქვის ტექნიკა', ru: 'Выберите технику дыхания', hy: 'Ընտրեք շնչառության տեխնիկա', tr: 'Bir nefes tekniği seç', az: 'Nəfəsləmə texnikası seçin', es: 'Elige una técnica de respiración', de: 'Wähle eine Atemtechnik', fr: 'Choisis une technique de respiration', pt: 'Escolha uma técnica de respiração', id: 'Pilih teknik pernapasan', it: 'Scegli una tecnica di respirazione', ar: 'اختر تقنية تنفس', hi: 'एक श्वास तकनीक चुनें', zh: '选择一种呼吸技巧', ja: '呼吸法を選ぶ', ko: '호흡 기법을 선택하세요', uk: 'Обери техніку дихання', pl: 'Wybierz technikę oddychania' },
  start: { en: 'Start', ka: 'დაწყება', ru: 'Начать', hy: 'Սկսել', tr: 'Başla', az: 'Başla', es: 'Comenzar', de: 'Start', fr: 'Démarrer', pt: 'Iniciar', id: 'Mulai', it: 'Avvia', ar: 'ابدأ', hi: 'शुरू करें', zh: '开始', ja: '開始', ko: '시작', uk: 'Почати', pl: 'Start' },
  stop: { en: 'Stop', ka: 'შეჩერება', ru: 'Остановить', hy: 'Կանգնեցնել', tr: 'Durdur', az: 'Dayandır', es: 'Detener', de: 'Stopp', fr: 'Arrêter', pt: 'Parar', id: 'Hentikan', it: 'Ferma', ar: 'إيقاف', hi: 'रोकें', zh: '停止', ja: '停止', ko: '중지', uk: 'Зупинити', pl: 'Stop' },
  cycle: { en: 'Cycle', ka: 'ციკლი', ru: 'Цикл', hy: 'Շրջ', tr: 'Döngü', az: 'Dövriyyə', es: 'Ciclo', de: 'Zyklus', fr: 'Cycle', pt: 'Ciclo', id: 'Siklus', it: 'Ciclo', ar: 'دورة', hi: 'चक्र', zh: '循环', ja: 'サイクル', ko: '사이클', uk: 'Цикл', pl: 'Cykl' },
  ready: { en: 'Tap to start', ka: 'დასაწყებად შეეხე', ru: 'Нажмите чтобы начать', hy: 'Սեղմիր սկսելու համար', tr: 'Başlamak için dokun', az: 'Başlamaq üçün toxun', es: 'Toca para empezar', de: 'Zum Start tippen', fr: 'Appuie pour démarrer', pt: 'Toque para iniciar', id: 'Sentuh untuk mulai', it: 'Tocca per iniziare', ar: 'اضغط للبدء', hi: 'शुरू करने के लिए टैप करें', zh: '点击开始', ja: 'タップで開始', ko: '탭하여 시작', uk: 'Торкніться, щоб почати', pl: 'Dotknij, aby zacząć' },
  phases: {
    inhale: { en: 'Inhale', ka: 'შესუნთქვა', ru: 'Вдох', hy: 'Շնչում', tr: 'Nefes al', az: 'Nəfəs al', es: 'Inhala', de: 'Einatmen', fr: 'Inspire', pt: 'Inspire', id: 'Tarik', it: 'Inspira', ar: 'شهيق', hi: 'साँस लो', zh: '吸气', ja: '吸う', ko: '들이쉬기', uk: 'Вдих', pl: 'Wdech' },
    hold: { en: 'Hold', ka: 'შეკავება', ru: 'Задержка', hy: 'Պահում', tr: 'Tut', az: 'Saxla', es: 'Retén', de: 'Halten', fr: 'Retiens', pt: 'Segure', id: 'Tahan', it: 'Trattieni', ar: 'احبس', hi: 'रोकें', zh: '屏息', ja: '止める', ko: '멈춤', uk: 'Затримка', pl: 'Wstrzymaj' },
    exhale: { en: 'Exhale', ka: 'ამოსუნთქვა', ru: 'Выдох', hy: 'Արտաշնչում', tr: 'Nefes ver', az: 'Nəfəs ver', es: 'Exhala', de: 'Ausatmen', fr: 'Expire', pt: 'Expire', id: 'Hembus', it: 'Espira', ar: 'زفير', hi: 'साँस छोड़ें', zh: '呼气', ja: '吐く', ko: '내쉬기', uk: 'Видих', pl: 'Wydech' },
    pause: { en: 'Pause', ka: 'პაუზა', ru: 'Пауза', hy: 'Դադար', tr: 'Bekle', az: 'Fasilə', es: 'Pausa', de: 'Pause', fr: 'Pause', pt: 'Pausa', id: 'Jeda', it: 'Pausa', ar: 'توقف', hi: 'विराम', zh: '停顿', ja: '休止', ko: '휴식', uk: 'Пауза', pl: 'Pauza' },
    completed: { en: 'Completed!', ka: 'დასრულდა!', ru: 'Завершено!', hy: 'Ավարտվեց!', tr: 'Tamamlandı!', az: 'Bitdi!', es: '¡Completado!', de: 'Fertig!', fr: 'Terminé !', pt: 'Concluído!', id: 'Selesai!', it: 'Completato!', ar: 'تم!', hi: 'पूर्ण!', zh: '完成!', ja: '完了!', ko: '완료!', uk: 'Завершено!', pl: 'Ukończono!' },
  },
} as const;

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'completed';
type PhaseInfo = { text: string; color: string };
type Phases = { [key in Phase]: PhaseInfo };

export default function BreathingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();

  const [selectedPattern, setSelectedPattern] = useState(breathingPatterns[0]);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('ready');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pick = (obj: Record<string, any>) => (obj as any)[language as AppLanguage] ?? (obj as any).en;

  const phasesText: Phases = useMemo(
    () => ({
      ready: { text: pick(T.ready as any), color: '#A8A8A8' },
      inhale: { text: pick(T.phases.inhale as any), color: '#4ECDC4' },
      hold: { text: pick(T.phases.hold as any), color: '#FFE66D' },
      exhale: { text: pick(T.phases.exhale as any), color: '#FF6B6B' },
      pause: { text: pick(T.phases.pause as any), color: '#A8E6CF' },
      completed: { text: pick(T.phases.completed as any), color: '#4BB543' },
    }),
    [language]
  );

  const startBreathing = () => {
    setIsActive(true);
    setCurrentCycle(0);
    setCurrentPhase('inhale');
    setTimeLeft(selectedPattern.inhale);

    Animated.timing(scaleAnim, {
      toValue: 1.5,
      duration: selectedPattern.inhale * 1000,
      useNativeDriver: true,
    }).start();
  };

  const stopBreathing = () => {
    setIsActive(false);
    setCurrentPhase('ready');
    setCurrentCycle(0);
    setTimeLeft(0);

    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (isActive && timeLeft === 0) {
      switch (currentPhase) {
        case 'inhale': {
          const nextHold = (selectedPattern as any).hold || 0;
          if (nextHold > 0) {
            setCurrentPhase('hold');
            setTimeLeft(nextHold);
            Animated.timing(scaleAnim, {
              toValue: 1.5,
              duration: nextHold * 1000,
              useNativeDriver: true,
            }).start();
          } else {
            setCurrentPhase('exhale');
            setTimeLeft(selectedPattern.exhale);
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: selectedPattern.exhale * 1000,
              useNativeDriver: true,
            }).start();
          }
          break;
        }
        case 'hold': {
          setCurrentPhase('exhale');
          setTimeLeft(selectedPattern.exhale);
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: selectedPattern.exhale * 1000,
            useNativeDriver: true,
          }).start();
          break;
        }
        case 'exhale': {
          const nextPause = (selectedPattern as any).pause || 0;
          if (nextPause > 0) {
            setCurrentPhase('pause');
            setTimeLeft(nextPause);
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: nextPause * 1000,
              useNativeDriver: true,
            }).start();
          } else {
            const nextCycle = currentCycle + 1;
            if (nextCycle < selectedPattern.cycles) {
              setCurrentCycle(nextCycle);
              setCurrentPhase('inhale');
              setTimeLeft(selectedPattern.inhale);
              Animated.timing(scaleAnim, {
                toValue: 1.5,
                duration: selectedPattern.inhale * 1000,
                useNativeDriver: true,
              }).start();
            } else {
              setCurrentPhase('completed');
              setIsActive(false);
              setTimeout(() => setCurrentPhase('ready'), 3000);
            }
          }
          break;
        }
        case 'pause': {
          const nextCycle = currentCycle + 1;
          if (nextCycle < selectedPattern.cycles) {
            setCurrentCycle(nextCycle);
            setCurrentPhase('inhale');
            setTimeLeft(selectedPattern.inhale);
            Animated.timing(scaleAnim, {
              toValue: 1.5,
              duration: selectedPattern.inhale * 1000,
              useNativeDriver: true,
            }).start();
          } else {
            setCurrentPhase('completed');
            setIsActive(false);
            setTimeout(() => setCurrentPhase('ready'), 3000);
          }
          break;
        }
      }
    }
  }, [isActive, timeLeft, currentPhase, currentCycle, selectedPattern, scaleAnim]);

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader title={pick(T.headerTitle as any)} />

      {!isActive && currentPhase === 'ready' ? (
        <View style={styles.patternContainer}>
          <Text style={styles.sectionTitle}>{pick(T.choosePattern as any)}</Text>
          <View style={styles.patternGrid}>
            {breathingPatterns.map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                style={[
                  styles.patternCard,
                  selectedPattern.id === pattern.id && styles.selectedPattern,
                ]}
                onPress={() => setSelectedPattern(pattern)}
              >
                <Text style={styles.patternName}>{pick(pattern.name)}</Text>
                <Text style={styles.patternDescription}>{pick(pattern.description)}</Text>
                <View style={styles.benefitsList}>
                  {pick(pattern.benefits).map((b: string, i: number) => (
                    <View key={i} style={styles.benefitItem}>
                      <FontAwesome5 name="check-circle" size={12} color={theme.colors.success} />
                      <Text style={styles.benefitText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.controlButton} onPress={startBreathing}>
            <Text style={styles.controlButtonText}>{pick(T.start as any)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              { transform: [{ scale: scaleAnim }], borderColor: phasesText[currentPhase].color },
            ]}
          >
            <Text style={[styles.phaseText, { color: phasesText[currentPhase].color }]}>
              {phasesText[currentPhase].text}
            </Text>
            {timeLeft > 0 && (
              <Text style={[styles.timeText, { color: phasesText[currentPhase].color }]}>
                {timeLeft}
              </Text>
            )}
          </Animated.View>

          {currentPhase !== 'completed' && (
            <Text style={styles.cycleText}>
              {pick(T.cycle as any)} {currentCycle + 1} / {selectedPattern.cycles}
            </Text>
          )}

          {isActive && (
            <TouchableOpacity style={styles.controlButton} onPress={stopBreathing}>
              <Text style={styles.controlButtonText}>{pick(T.stop as any)}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.text },
    backButton: { padding: 8 },
    placeholder: { width: 40 },

    patternContainer: { flex: 1, padding: 16 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    patternGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    patternCard: {
      width: '48%',
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    selectedPattern: { borderWidth: 2, borderColor: theme.colors.accent },
    patternName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    patternDescription: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 },
    benefitsList: { marginTop: 8 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    benefitText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },

    circleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    breathingCircle: {
      width: width * 0.62,
      height: width * 0.62,
      borderRadius: width * 0.31,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 3,
    },
    phaseText: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    timeText: { fontSize: 48, fontWeight: '300' },
    cycleText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 16 },

    controlButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 36,
      paddingVertical: 16,
      borderRadius: 32,
      marginTop: 32,
      marginBottom: 16,
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    controlButtonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  });
