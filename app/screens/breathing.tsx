import CommonHeader from '@/components/CommonHeader';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.72, 270);

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

// ─── Phase visual config ─────────────────────────────────────────────────────
const PHASE_CONFIG: Record<string, { bg: readonly [string, string, string]; primary: string; glow: string; text: string }> = {
  ready:     { bg: ['#030710', '#0a1225', '#030710'], primary: '#818cf8', glow: 'rgba(99,102,241,0.22)',  text: '#c7d2fe' },
  inhale:    { bg: ['#02091a', '#0c213f', '#02091a'], primary: '#38bdf8', glow: 'rgba(14,165,233,0.28)',  text: '#bae6fd' },
  hold:      { bg: ['#0a0600', '#1e1200', '#0a0600'], primary: '#fbbf24', glow: 'rgba(245,158,11,0.28)',  text: '#fde68a' },
  exhale:    { bg: ['#0e0018', '#250040', '#0e0018'], primary: '#f472b6', glow: 'rgba(236,72,153,0.24)',  text: '#fbcfe8' },
  pause:     { bg: ['#000e08', '#001e10', '#000e08'], primary: '#34d399', glow: 'rgba(16,185,129,0.24)',  text: '#a7f3d0' },
  completed: { bg: ['#000e08', '#002018', '#000e08'], primary: '#4ade80', glow: 'rgba(34,197,94,0.28)',   text: '#bbf7d0' },
};

const PATTERN_META = [
  { gradient: ['#12103a', '#2d2a6e'] as const, accent: '#818cf8' },
  { gradient: ['#072234', '#0c4a6e'] as const, accent: '#38bdf8' },
  { gradient: ['#1a0838', '#3b0f7a'] as const, accent: '#c084fc' },
] as const;

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale' | 'pause' | 'completed';

const BREATHING_PROGRESS_KEY = '@behappy_breathing_progress';

async function saveBreathingCompletion(pattern: typeof breathingPatterns[0]) {
  const cycleSeconds = pattern.inhale + pattern.exhale + ((pattern as any).hold || 0) + ((pattern as any).pause || 0);
  const durationMinutes = Math.max(1, Math.round((cycleSeconds * pattern.cycles) / 60));

  try {
    const raw = await AsyncStorage.getItem(BREATHING_PROGRESS_KEY);
    const current = raw ? JSON.parse(raw) : {};
    const completedSessions = Array.isArray(current.completedSessions) ? current.completedSessions : [];
    const nextSessions = [
      {
        patternId: pattern.id,
        completedAt: new Date().toISOString(),
        durationMinutes,
      },
      ...completedSessions,
    ].slice(0, 100);

    await AsyncStorage.setItem(BREATHING_PROGRESS_KEY, JSON.stringify({
      totalMinutes: nextSessions.reduce((sum, session) => sum + (Number(session?.durationMinutes) || 0), 0),
      completedSessions: nextSessions,
    }));
  } catch (error) {
    console.log('Failed to save breathing progress:', error);
  }
}

// ─── Rhythm visualizer bar ───────────────────────────────────────────────────
function RhythmBars({ pattern }: { pattern: typeof breathingPatterns[0] }) {
  const segs: Array<{ dur: number; color: string; label: string }> = [];
  if (pattern.inhale > 0)         segs.push({ dur: pattern.inhale,         color: '#38bdf8', label: `↑ ${pattern.inhale}s` });
  if ((pattern as any).hold > 0)  segs.push({ dur: (pattern as any).hold,  color: '#fbbf24', label: `◉ ${(pattern as any).hold}s` });
  if (pattern.exhale > 0)         segs.push({ dur: pattern.exhale,         color: '#f472b6', label: `↓ ${pattern.exhale}s` });
  if ((pattern as any).pause > 0) segs.push({ dur: (pattern as any).pause, color: '#34d399', label: `○ ${(pattern as any).pause}s` });
  const total = segs.reduce((s, x) => s + x.dur, 0);
  return (
    <View style={{ marginVertical: 10 }}>
      <View style={{ flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        {segs.map((s, i) => (
          <View key={i} style={{ flex: s.dur / total, backgroundColor: s.color, marginHorizontal: 0.5 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {segs.map((s, i) => (
          <Text key={i} style={{ fontSize: 11, color: s.color, fontWeight: '600' }}>{s.label}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function BreathingScreen() {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('ready');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const selectedPattern = breathingPatterns[selectedIdx];
  const phaseConfig = PHASE_CONFIG[currentPhase] ?? PHASE_CONFIG.ready;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const rippleLoops = useRef<Animated.CompositeAnimation[]>([]);
  const rippleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const p = useCallback(
    (obj: Record<string, any>): any => (obj as any)[language as AppLanguage] ?? (obj as any).en,
    [language]
  );

  const doScale = useCallback((toValue: number, duration: number) => {
    Animated.timing(scaleAnim, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();
  }, [scaleAnim]);

  const startRipples = useCallback(() => {
    rippleLoops.current.forEach(l => l.stop());
    rippleTimers.current.forEach(t => clearTimeout(t));
    rippleLoops.current = [];
    rippleTimers.current = [];
    rippleAnims.forEach((anim, i) => {
      anim.setValue(0);
      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          })
        );
        loop.start();
        rippleLoops.current.push(loop);
      }, i * 800);
      rippleTimers.current.push(t);
    });
  }, [rippleAnims]);

  const stopRipples = useCallback(() => {
    rippleLoops.current.forEach(l => l.stop());
    rippleTimers.current.forEach(t => clearTimeout(t));
    rippleLoops.current = [];
    rippleTimers.current = [];
    rippleAnims.forEach(a => a.setValue(0));
  }, [rippleAnims]);

  useEffect(() => () => { stopRipples(); }, [stopRipples]);

  const startBreathing = useCallback(() => {
    setIsActive(true);
    setCurrentCycle(0);
    setCurrentPhase('inhale');
    setTimeLeft(selectedPattern.inhale);
    startRipples();
    doScale(1.65, selectedPattern.inhale * 1000);
  }, [selectedPattern, startRipples, doScale]);

  const stopBreathing = useCallback(() => {
    setIsActive(false);
    setCurrentPhase('ready');
    setCurrentCycle(0);
    setTimeLeft(0);
    stopRipples();
    doScale(1, 600);
  }, [stopRipples, doScale]);

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
    switch (currentPhase) {
      case 'inhale': {
        const holdTime = (selectedPattern as any).hold || 0;
        if (holdTime > 0) {
          setCurrentPhase('hold');
          setTimeLeft(holdTime);
        } else {
          setCurrentPhase('exhale');
          setTimeLeft(selectedPattern.exhale);
          doScale(1, selectedPattern.exhale * 1000);
        }
        break;
      }
      case 'hold': {
        setCurrentPhase('exhale');
        setTimeLeft(selectedPattern.exhale);
        doScale(1, selectedPattern.exhale * 1000);
        break;
      }
      case 'exhale': {
        const pauseTime = (selectedPattern as any).pause || 0;
        if (pauseTime > 0) {
          setCurrentPhase('pause');
          setTimeLeft(pauseTime);
        } else {
          const next = currentCycle + 1;
          if (next < selectedPattern.cycles) {
            setCurrentCycle(next);
            setCurrentPhase('inhale');
            setTimeLeft(selectedPattern.inhale);
            doScale(1.65, selectedPattern.inhale * 1000);
          } else {
            setCurrentPhase('completed');
            setIsActive(false);
            stopRipples();
            void saveBreathingCompletion(selectedPattern);
            setTimeout(() => setCurrentPhase('ready'), 3500);
          }
        }
        break;
      }
      case 'pause': {
        const next = currentCycle + 1;
        if (next < selectedPattern.cycles) {
          setCurrentCycle(next);
          setCurrentPhase('inhale');
          setTimeLeft(selectedPattern.inhale);
          doScale(1.65, selectedPattern.inhale * 1000);
        } else {
          setCurrentPhase('completed');
          setIsActive(false);
          stopRipples();
          void saveBreathingCompletion(selectedPattern);
          setTimeout(() => setCurrentPhase('ready'), 3500);
        }
        break;
      }
    }
  }, [isActive, timeLeft, currentPhase, currentCycle, selectedPattern, doScale, stopRipples]);

  const phaseLabel: Record<Phase, string> = {
    ready:     p(T.ready),
    inhale:    p(T.phases.inhale),
    hold:      p(T.phases.hold),
    exhale:    p(T.phases.exhale),
    pause:     p(T.phases.pause),
    completed: p(T.phases.completed),
  };

  // ── SELECTION SCREEN ──────────────────────────────────────────────────────
  if (!isActive && currentPhase === 'ready') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <LinearGradient colors={['#030710', '#0a1225', '#030710']} style={StyleSheet.absoluteFill} />
        <CommonHeader title={p(T.headerTitle)} />
        <ScrollView contentContainerStyle={styles.selectionScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.selectionTitle}>{p(T.choosePattern)}</Text>

          {breathingPatterns.map((pattern, idx) => {
            const meta = PATTERN_META[idx];
            const isSel = selectedIdx === idx;
            return (
              <TouchableOpacity key={pattern.id} onPress={() => setSelectedIdx(idx)} activeOpacity={0.85}>
                <LinearGradient
                  colors={isSel
                    ? [meta.gradient[0], meta.gradient[1], meta.accent + '33']
                    : [meta.gradient[0], meta.gradient[1]]}
                  style={[styles.patternCard, isSel && { borderColor: meta.accent, borderWidth: 1.5 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.patternCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patternCardName}>{p(pattern.name)}</Text>
                      <Text style={styles.patternCardDesc}>{p(pattern.description)}</Text>
                    </View>
                    {isSel && (
                      <View style={[styles.checkBadge, { backgroundColor: meta.accent }]}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <RhythmBars pattern={pattern} />
                  <View style={styles.chipRow}>
                    {(p(pattern.benefits) as string[]).map((b, i) => (
                      <View key={i} style={[styles.chip, { borderColor: meta.accent + '55', backgroundColor: meta.accent + '18' }]}>
                        <Text style={[styles.chipText, { color: meta.accent }]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={startBreathing} activeOpacity={0.85}>
            <LinearGradient
              colors={[PATTERN_META[selectedIdx].accent, PATTERN_META[selectedIdx].accent + 'bb']}
              style={styles.startBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.startBtnText}>{p(T.start)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ACTIVE BREATHING SCREEN ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={phaseConfig.bg} style={StyleSheet.absoluteFill} />
      <CommonHeader title={p(T.headerTitle)} />

      <View style={styles.activeOuter}>
        {/* Circle + ripple rings */}
        <View style={styles.circleArea}>
          {rippleAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.rippleRing,
                {
                  borderColor: phaseConfig.primary + '55',
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.7] }) }],
                  opacity: anim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.55, 0.18, 0] }),
                },
              ]}
            />
          ))}

          {/* Atmospheric halo */}
          <View style={[styles.haloGlow, { backgroundColor: phaseConfig.glow, borderColor: phaseConfig.primary + '22' }]} />

          {/* Main breathing circle */}
          <Animated.View
            style={[
              styles.breathCircle,
              {
                borderColor: phaseConfig.primary,
                backgroundColor: phaseConfig.glow,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={[styles.phaseText, { color: phaseConfig.text }]}>
              {phaseLabel[currentPhase]}
            </Text>
            {timeLeft > 0 && (
              <Text style={[styles.countdownNum, { color: phaseConfig.primary }]}>
                {timeLeft}
              </Text>
            )}
          </Animated.View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomArea}>
          {(isActive || currentPhase === 'completed') && (
            <View style={styles.dotRow}>
              {Array.from({ length: selectedPattern.cycles }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i < currentCycle ? phaseConfig.primary :
                        i === currentCycle && isActive ? phaseConfig.primary + 'aa' :
                        'rgba(255,255,255,0.15)',
                      transform: [{ scale: i === currentCycle && isActive ? 1.4 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {isActive && (
            <Text style={styles.cycleText}>
              {`${p(T.cycle)} ${currentCycle + 1} / ${selectedPattern.cycles}`}
            </Text>
          )}

          {currentPhase === 'completed' && (
            <Text style={[styles.completedText, { color: phaseConfig.primary }]}>
              {phaseLabel.completed}
            </Text>
          )}

          {isActive && (
            <TouchableOpacity onPress={stopBreathing} activeOpacity={0.75}>
              <View style={[styles.stopBtn, { borderColor: phaseConfig.primary + '55' }]}>
                <Text style={[styles.stopBtnText, { color: phaseConfig.text }]}>
                  {p(T.stop)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030710',
  },

  // Selection screen ──────────────────────────────────────────────────────────
  selectionScroll: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  selectionTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  patternCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  patternCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  patternCardName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  patternCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  checkBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  startBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Active breathing screen ───────────────────────────────────────────────────
  activeOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rippleRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
  },
  haloGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE + 70,
    height: CIRCLE_SIZE + 70,
    borderRadius: (CIRCLE_SIZE + 70) / 2,
    borderWidth: 1,
  },
  breathCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  countdownNum: {
    fontSize: 80,
    fontWeight: '100',
    letterSpacing: -4,
    lineHeight: 88,
  },
  bottomArea: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 32,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  cycleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  completedText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  stopBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 44,
    paddingVertical: 15,
    marginTop: 4,
  },
  stopBtnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
