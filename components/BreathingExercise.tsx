import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { AppLanguage, useLanguage } from '../contexts/LanguageContext';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

const BE_STRINGS = {
  title: { en: '🫁 Mindful Breathing', ru: '🫁 Осознанное дыхание', ka: '🫁 ცნობიერი სუნთქვა', hy: '🫁 Գիտակից շնչառություն', tr: '🫁 Bilinçli Nefes', az: '🫁 Şüurlu Nəfəs', es: '🫁 Respiración Consciente', de: '🫁 Bewusstes Atmen', fr: '🫁 Respiration Consciente', pt: '🫁 Respiração Consciente', id: '🫁 Pernapasan Sadar', it: '🫁 Respirazione Consapevole', ar: '🫁 التنفس الواعي', hi: '🫁 सचेत श्वास', zh: '🫁 正念呼吸', ja: '🫁 マインドフル呼吸', ko: '🫁 마음챙김 호흡', uk: '🫁 Усвідомлене дихання', pl: '🫁 Świadomy Oddech' },
  desc: { en: 'A guided breathing exercise to help you find calm and presence.', ru: 'Упражнение для обретения спокойствия и присутствия.', ka: 'სავარჯიშო სიმშვიდისა და ცნობიერების შესაძენად.', hy: 'Վարժություն հանգստություն գտնելու համար։', tr: 'Sakinlik ve hazırlık için nefes egzersizi.', az: 'Sakitlik tapmaq üçün nəfəs məşqi.', es: 'Ejercicio para encontrar calma y presencia.', de: 'Übung für Ruhe und Präsenz.', fr: 'Exercice pour trouver calme et présence.', pt: 'Exercício para encontrar calma e presença.', id: 'Latihan napas untuk ketenangan.', it: 'Esercizio per trovare calma e presenza.', ar: 'تمرين للعثور على الهدوء.', hi: 'शांति पाने के लिए श्वास अभ्यास।', zh: '帮助找到平静的呼吸练习。', ja: '落ち着きを取り戻す呼吸法。', ko: '평온함을 찾는 호흡 운동.', uk: 'Вправа для спокою та усвідомленості.', pl: 'Ćwiczenie oddechu dla spokoju.' },
  cycle: (n: number, max: number) => ({ en: `Cycle ${n} of ${max}`, ru: `Цикл ${n} из ${max}`, ka: `ციკლი ${n} / ${max}`, hy: `Ցիկл ${n}-ից ${max}`, tr: `Döngü ${n} / ${max}`, az: `Dövr ${n} / ${max}`, es: `Ciclo ${n} de ${max}`, de: `Zyklus ${n} von ${max}`, fr: `Cycle ${n} sur ${max}`, pt: `Ciclo ${n} de ${max}`, id: `Siklus ${n} dari ${max}`, it: `Ciclo ${n} di ${max}`, ar: `دورة ${n} من ${max}`, hi: `चक्र ${n} / ${max}`, zh: `第 ${n} / ${max} 轮`, ja: `${n} / ${max} サイクル`, ko: `사이클 ${n} / ${max}`, uk: `Цикл ${n} з ${max}`, pl: `Cykl ${n} z ${max}` }),
  begin: { en: 'Begin Breathing Exercise', ru: 'Начать упражнение', ka: 'სავარჯიშოს დაწყება', hy: 'Սկսել վարժությունը', tr: 'Egzersizi Başlat', az: 'Məşqi başla', es: 'Comenzar Ejercicio', de: 'Übung Starten', fr: 'Commencer l\'Exercice', pt: 'Iniciar Exercício', id: 'Mulai Latihan', it: 'Inizia Esercizio', ar: 'ابدأ التمرين', hi: 'अभ्यास शुरू करें', zh: '开始练习', ja: '練習を開始', ko: '운동 시작', uk: 'Розпочати вправу', pl: 'Rozpocznij Ćwiczenie' },
  pattern: (i: number, h: number, e: number) => ({ en: `Pattern: ${i}s inhale \u2022 ${h}s hold \u2022 ${e}s exhale`, ru: `Паттерн: ${i}с вдох • ${h}с задержка • ${e}с выдох`, ka: `ნიმუში: ${i}წ ჩასუნთქვა • ${h}წ შეკავება • ${e}წ ამოსუნთქვა`, hy: `Ռիթմ: ${i}վ ներշ • ${h}վ պահ • ${e}վ արտ`, tr: `Desen: ${i}sn al • ${h}sn tut • ${e}sn ver`, az: `Nümunə: ${i}s al • ${h}s saxla • ${e}s ver`, es: `Patrón: ${i}s inhalar • ${h}s sostener • ${e}s exhalar`, de: `Muster: ${i}s ein • ${h}s halten • ${e}s aus`, fr: `Schéma: ${i}s inspirer • ${h}s retenir • ${e}s expirer`, pt: `Padrão: ${i}s inspirar • ${h}s segurar • ${e}s expirar`, id: `Pola: ${i}d tarik • ${h}d tahan • ${e}d buang`, it: `Schema: ${i}s inspira • ${h}s tieni • ${e}s espira`, ar: `النمط: ${i}ث شهيق • ${h}ث احبس • ${e}ث زفير`, hi: `पैटर्न: ${i}स वदन • ${h}स रोकें • ${e}स छोड़ें`, zh: `节奏: ${i}s吸 • ${h}s憋 • ${e}s呼`, ja: `パターン: ${i}s吸 • ${h}s止 • ${e}s吐`, ko: `패턴: ${i}s들숨 • ${h}s정지 • ${e}s날숨`, uk: `Патерн: ${i}с вдих • ${h}с затримка • ${e}с видих`, pl: `Wzorzec: ${i}s wdech • ${h}s wstrzymaj • ${e}s wydech` }),
  phases: {
    inhale: { en: 'Inhale', ru: 'Вдох', ka: 'ჩასუნთქვა', hy: 'Ներշնչել', tr: 'Nefes Al', az: 'Nəfəs Al', es: 'Inhala', de: 'Einatmen', fr: 'Inspirer', pt: 'Inspirar', id: 'Tarik Napas', it: 'Inspira', ar: 'شهيق', hi: 'श्वास लें', zh: '吸气', ja: '吸って', ko: '들숨', uk: 'Вдих', pl: 'Wdech' },
    hold: { en: 'Hold', ru: 'Задержка', ka: 'შეკავება', hy: 'Պահել', tr: 'Tut', az: 'Saxla', es: 'Sostén', de: 'Halten', fr: 'Retenir', pt: 'Segurar', id: 'Tahan', it: 'Tieni', ar: 'احبس', hi: 'रोकें', zh: '屏息', ja: '止めて', ko: '정지', uk: 'Затримка', pl: 'Wstrzymaj' },
    exhale: { en: 'Exhale', ru: 'Выдох', ka: 'ამოსუნთქვა', hy: 'Արտաշնչել', tr: 'Nefes Ver', az: 'Nəfəs Ver', es: 'Exhala', de: 'Ausatmen', fr: 'Expirer', pt: 'Expirar', id: 'Buang Napas', it: 'Espira', ar: 'زفير', hi: 'श्वास छोड़ें', zh: '呼气', ja: '吐いて', ko: '날숨', uk: 'Видих', pl: 'Wydech' },
    breathe: { en: 'Breathe', ru: 'Дышите', ka: 'სუნთქვა', hy: 'Շնչեք', tr: 'Nefes Al', az: 'Nəfəs Al', es: 'Respira', de: 'Atme', fr: 'Respire', pt: 'Respira', id: 'Bernapas', it: 'Respira', ar: 'تنفس', hi: 'श्वास लें', zh: '呼吸', ja: '呼吸して', ko: '숨쉬세요', uk: 'Дихайте', pl: 'Oddychaj' },
  },
  instructions: {
    inhale: { en: 'Breathe in slowly through your nose', ru: 'Медленно вдыхайте через нос', ka: 'ნელა ჩაისუნთქეთ ცხვირით', hy: 'Դանդաղ ներշնչեք քթով', tr: 'Burnunuzdan yavaşça nefes alın', az: 'Burnunuzdan yavaşca nəfəs alın', es: 'Inhala lentamente por la nariz', de: 'Atme langsam durch die Nase ein', fr: 'Inspirez lentement par le nez', pt: 'Inspire lentamente pelo nariz', id: 'Tarik napas pelan melalui hidung', it: 'Inspira lentamente dal naso', ar: 'تنفس ببطء من أنفك', hi: 'नाक से धीरे-धीरे सांस लें', zh: '缓缓用鼻子吸气', ja: '鼻からゆっくり吸って', ko: '코로 천천히 들이마세요', uk: 'Повільно вдихайте через ніс', pl: 'Wdychaj powoli przez nos' },
    hold: { en: 'Hold your breath gently', ru: 'Мягко задержите дыхание', ka: 'მსუბუქად შეიკავეთ სუნთქვა', hy: 'Մեղմ կատարեք ապնդ', tr: 'Nefesini nazikçe tut', az: 'Nəfəsini yumşaqca saxla', es: 'Sostén suavemente la respiración', de: 'Halte den Atem sanft an', fr: 'Retenez doucement votre souffle', pt: 'Segure a respiração suavemente', id: 'Tahan napas dengan lembut', it: 'Tieni il respiro delicatamente', ar: 'احبس نفسك برفق', hi: 'सांस को धीरे से रोकें', zh: '轻轻屏住呼吸', ja: 'やさしく息を止めて', ko: '숨을 부드럽게 멈추세요', uk: 'М\'яко затримайте дихання', pl: 'Łagodnie wstrzymaj oddech' },
    exhale: { en: 'Breathe out slowly through your mouth', ru: 'Медленно выдыхайте через рот', ka: 'ნელა ამოისუნთქეთ პირით', hy: 'Դանդаղ արտаշнчеք բерано', tr: 'Ağzından yavaşça nefes ver', az: 'Ağzınızdan yavaşca nəfəs verin', es: 'Exhala lentamente por la boca', de: 'Atme langsam durch den Mund aus', fr: 'Expirez lentement par la bouche', pt: 'Expire lentamente pela boca', id: 'Buang napas pelan melalui mulut', it: 'Espira lentamente dalla bocca', ar: 'تنفس للخارج ببطء من فمك', hi: 'मुँह से धीरे-धीरे सांस छोड़ें', zh: '缓缓用嘴呼气', ja: '口からゆっくり吐いて', ko: '입으로 천천히 내쉬세요', uk: 'Повільно видихайте через рот', pl: 'Wydychaj powoli przez usta' },
    default: { en: 'Follow the breathing pattern', ru: 'Следуйте ритму дыхания', ka: 'მიჰყევით სუნთქვის რიტმს', hy: 'Հետևեք շনчеք ռитмին', tr: 'Nefes ritmine uy', az: 'Nəfəs ritmlə', es: 'Sigue el patrón de respiración', de: 'Folge dem Ateммuster', fr: 'Suivez le schéma respiratoire', pt: 'Siga o padrão respiratório', id: 'Ikuti pola pernapasan', it: 'Segui lo schema respiratorio', ar: 'اتبع نمط التنفس', hi: 'श्वास पैटर्न का पालन करें', zh: '跟随呼吸节奏', ja: '呼吸パターンに従って', ko: '호흡 패턴을 따르세요', uk: 'Дотримуйтесь ритму дихання', pl: 'Podążaj za wzorcem oddechu' },
  },
  progress: (n: number, max: number) => ({ en: `Progress: ${n} / ${max}`, ru: `Прогресс: ${n} / ${max}`, ka: `პროგრესი: ${n} / ${max}`, hy: `Πрогресс: ${n} / ${max}`, tr: `İlerleme: ${n} / ${max}`, az: `İrəliləyiş: ${n} / ${max}`, es: `Progreso: ${n} / ${max}`, de: `Fortschritt: ${n} / ${max}`, fr: `Progression: ${n} / ${max}`, pt: `Progresso: ${n} / ${max}`, id: `Kemajuan: ${n} / ${max}`, it: `Progresso: ${n} / ${max}`, ar: `التقدم: ${n} / ${max}`, hi: `प्रगति: ${n} / ${max}`, zh: `进度: ${n} / ${max}`, ja: `進捗: ${n} / ${max}`, ko: `진행: ${n} / ${max}`, uk: `Прогрес: ${n} / ${max}`, pl: `Postęp: ${n} / ${max}` }),
  complete: { en: '🎉 Complete!', ru: '🎉 Завершено!', ka: '🎉 დასრულდა!', hy: '🎉 Ավартված!', tr: '🎉 Tamamlandı!', az: '🎉 Tamamlandı!', es: '🎉 ¡Completado!', de: '🎉 Fertig!', fr: '🎉 Terminé!', pt: '🎉 Concluído!', id: '🎉 Selesai!', it: '🎉 Completato!', ar: '🎉 اكتمل!', hi: '🎉 पूर्ण!', zh: '🎉 完成！', ja: '🎉 完了！', ko: '🎉 완료!', uk: '🎉 Завершено!', pl: '🎉 Ukończono!' },
  labels: {
    inhale: { en: 'INHALE', ru: 'ВДОХ', ka: 'ჩასუნთქვა', hy: 'ՆԵՐШИХ', tr: 'NEFes AL', az: 'NƏFƏS AL', es: 'INHALAR', de: 'EINATMEN', fr: 'INSPIRER', pt: 'INSPIRAR', id: 'TARIK', it: 'INSPIRA', ar: 'شهيق', hi: 'श्वास', zh: '吸气', ja: '吸う', ko: '들숨', uk: 'ВДИХ', pl: 'WDECH' },
    hold: { en: 'HOLD', ru: 'ЗАДЕРЖКА', ka: 'შეკავება', hy: 'ՊԱՀԵԼ', tr: 'TUT', az: 'SAXLA', es: 'SOSTENER', de: 'HALTEN', fr: 'RETENIR', pt: 'SEGURAR', id: 'TAHAN', it: 'TIENI', ar: 'احبس', hi: 'रोकें', zh: '屏息', ja: '止める', ko: '정지', uk: 'ЗАТРИМКА', pl: 'WSTRZYMAJ' },
    exhale: { en: 'EXHALE', ru: 'ВЫДОХ', ka: 'ამოსუნთქვა', hy: 'ԱՐТАШИХ', tr: 'VER', az: 'VER', es: 'EXHALAR', de: 'AUSATMEN', fr: 'EXPIRER', pt: 'EXPIRAR', id: 'BUANG', it: 'ESPIRA', ar: 'زفير', hi: 'छोड़ें', zh: '呼气', ja: '吐く', ko: '날숨', uk: 'ВИДИХ', pl: 'WYDECH' },
  },
};

const bePick = (obj: Record<string, string>, lang: AppLanguage): string => obj[lang] ?? obj.en;

interface BreathingExerciseProps {
  onComplete?: (data: { cycles: number; totalTime: number }) => void;
  duration?: number; // Total duration in seconds
  pattern?: [number, number, number]; // [inhale, hold, exhale] in seconds
}

const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  onComplete,
  duration = 300, // 5 minutes default
  pattern = [4, 2, 6], // 4-2-6 pattern
}) => {
  const { language } = useLanguage();
  const [currentPhase, setCurrentPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale'>('ready');
  const [currentCount, setCurrentCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;
  const countdownRef = useRef<any>(null);
  const phaseRef = useRef<any>(null);

  const { width } = Dimensions.get('window');
  const circleSize = Math.min(width * 0.6, 240);

  const [inhaleTime, holdTime, exhaleTime] = pattern;
  const cycleTime = inhaleTime + holdTime + exhaleTime;
  const MAX_CYCLES = 10; // Auto-complete after 10 cycles

  const startExercise = () => {
    setIsActive(true);
    setCurrentPhase('inhale');
    setCurrentCount(inhaleTime);
    setCompletedCycles(0);
    setTotalTime(0);
    setIsPaused(false);
    startBreathingCycle();
  };

  const pauseExercise = () => {
    setIsPaused(true);
    setIsActive(false);
    stopBreathingCycle();
  };

  const resumeExercise = () => {
    setIsPaused(false);
    setIsActive(true);
    startBreathingCycle();
  };

  const stopExercise = () => {
    // Send completion data to AI before stopping
    if (completedCycles > 0) {
      onComplete?.({ cycles: completedCycles, totalTime });
    }
    
    setIsActive(false);
    setIsPaused(false);
    setCurrentPhase('ready');
    setCompletedCycles(0);
    setTotalTime(0);
    stopBreathingCycle();
  };

  useEffect(() => {
    if (isActive && !isPaused) {
      startBreathingCycle();
    } else {
      stopBreathingCycle();
    }

    return () => {
      stopBreathingCycle();
    };
  }, [isActive, isPaused]);

  // Remove auto-start - let user control when to begin
  useEffect(() => {
    return () => {
      stopBreathingCycle();
    };
  }, []);

  // Auto-complete when reaching MAX_CYCLES
  useEffect(() => {
    if (completedCycles >= MAX_CYCLES && isActive) {
      console.log(`🎉 Completed ${MAX_CYCLES} cycles - finishing exercise`);
      setTimeout(() => {
        stopExercise();
      }, 2000); // Give 2 seconds to see the completion
    }
  }, [completedCycles, isActive]);

  const startBreathingCycle = () => {
    setCurrentPhase('inhale');
    setCurrentCount(inhaleTime);
    animatePhase('inhale', inhaleTime);
  };

  const stopBreathingCycle = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (phaseRef.current) {
      clearTimeout(phaseRef.current);
      phaseRef.current = null;
    }
  };

  const animatePhase = (phase: 'inhale' | 'hold' | 'exhale', duration: number) => {
    if (!isActive || isPaused) return;
    
    setCurrentPhase(phase);
    setCurrentCount(duration);

    // Animate the circle based on the phase
    const targetScale = phase === 'inhale' ? 1.2 : phase === 'hold' ? 1.2 : 0.7;
    const targetOpacity = phase === 'inhale' ? 0.9 : phase === 'hold' ? 1.0 : 0.5;

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: targetScale,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: targetOpacity,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Countdown timer
    let count = duration;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCurrentCount(count);
      
      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        
        // Move to next phase
        if (phase === 'inhale') {
          phaseRef.current = setTimeout(() => animatePhase('hold', holdTime), 100);
        } else if (phase === 'hold') {
          phaseRef.current = setTimeout(() => animatePhase('exhale', exhaleTime), 100);
        } else if (phase === 'exhale') {
          // Complete one full cycle - increment counter
          setCompletedCycles(prev => {
            const newCount = prev + 1;
            console.log(`✅ Cycle ${newCount} completed`);
            
            // Auto-complete after MAX_CYCLES
            if (newCount >= MAX_CYCLES) {
              console.log(`🎉 Reached ${MAX_CYCLES} cycles - auto-completing`);
              setTimeout(() => {
                stopBreathingCycle();
                setIsActive(false);
                setIsPaused(false);
                // Trigger completion with final data
                onComplete?.({ cycles: newCount, totalTime: totalTime + cycleTime });
              }, 1000);
            }
            
            return newCount;
          });
          
          setTotalTime(prev => prev + cycleTime);
          
          // Continue to next cycle if still active and under MAX_CYCLES
          if (isActive && !isPaused && completedCycles + 1 < MAX_CYCLES) {
            phaseRef.current = setTimeout(() => animatePhase('inhale', inhaleTime), 1000);
          }
        }
      }
    }, 1000);
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale': return bePick(BE_STRINGS.phases.inhale, language);
      case 'hold': return bePick(BE_STRINGS.phases.hold, language);
      case 'exhale': return bePick(BE_STRINGS.phases.exhale, language);
      default: return bePick(BE_STRINGS.phases.breathe, language);
    }
  };

  const getPhaseInstructions = () => {
    switch (currentPhase) {
      case 'inhale': return bePick(BE_STRINGS.instructions.inhale, language);
      case 'hold': return bePick(BE_STRINGS.instructions.hold, language);
      case 'exhale': return bePick(BE_STRINGS.instructions.exhale, language);
      default: return bePick(BE_STRINGS.instructions.default, language);
    }
  };

  const getGradientColors = (): [string, string] => {
    switch (currentPhase) {
      case 'inhale':
        return TherapyColors.gradients.ocean as [string, string];
      case 'hold':
        return TherapyColors.gradients.calm as [string, string];
      case 'exhale':
        return TherapyColors.gradients.healing as [string, string];
      default:
        return TherapyColors.gradients.calm as [string, string];
    }
  };

  return (
    <View style={therapyStyles.interactiveContainer}>
      <Text style={therapyStyles.subtitle}>{bePick(BE_STRINGS.title, language)}</Text>
      <Text style={therapyStyles.bodySecondary}>
        {currentPhase === 'ready'
          ? bePick(BE_STRINGS.desc, language)
          : bePick(BE_STRINGS.cycle(completedCycles + 1, MAX_CYCLES), language)
        }
      </Text>
      
      {/* Control Buttons */}
      {currentPhase === 'ready' && (
        <View style={{ marginVertical: 20 }}>
          <TouchableOpacity
            onPress={startExercise}
            style={[therapyStyles.primaryButton, { marginBottom: 12 }]}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={therapyStyles.primaryButtonText}>{bePick(BE_STRINGS.begin, language)}</Text>
          </TouchableOpacity>
          
          <Text style={[therapyStyles.bodySecondary, { textAlign: 'center', fontSize: 12 }]}>
            {bePick(BE_STRINGS.pattern(inhaleTime, holdTime, exhaleTime), language)}
          </Text>
        </View>
      )}

      {/* Active Controls */}
      {currentPhase !== 'ready' && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          marginVertical: 16,
          gap: 12,
        }}>
          <TouchableOpacity
            onPress={isPaused ? resumeExercise : pauseExercise}
            style={[therapyStyles.secondaryButton, { flex: 1, maxWidth: 120 }]}
          >
            <Ionicons 
              name={isPaused ? "play" : "pause"} 
              size={16} 
              color={TherapyColors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={stopExercise}
            style={[therapyStyles.secondaryButton, { flex: 1, maxWidth: 120 }]}
          >
            <Ionicons name="stop" size={16} color={TherapyColors.primary} />
          </TouchableOpacity>
        </View>
      )}
      
      {currentPhase !== 'ready' && (
        <View style={therapyStyles.breathingContainer}>
        <Animated.View
          style={[
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
            therapyStyles.breathingCircle,
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: circleSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[therapyStyles.breathingText, { fontSize: 24, marginBottom: 8 }]}>
              {getPhaseText()}
            </Text>
            <Text style={[therapyStyles.breathingText, { fontSize: 48, fontWeight: '300' }]}>
              {currentCount}
            </Text>
          </LinearGradient>
        </Animated.View>

        <Text style={therapyStyles.breathingInstructions}>
          {getPhaseInstructions()}
        </Text>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={[therapyStyles.body, { color: TherapyColors.primary, fontWeight: '600' }]}>
            {bePick(BE_STRINGS.progress(completedCycles, MAX_CYCLES), language)}
          </Text>
          {completedCycles >= MAX_CYCLES && (
            <Text style={[therapyStyles.body, { color: TherapyColors.healing, marginTop: 8, fontWeight: '600' }]}>
              {bePick(BE_STRINGS.complete, language)}
            </Text>
          )}
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 20,
          paddingHorizontal: 20,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>{bePick(BE_STRINGS.labels.inhale, language)}</Text>
            <Text style={therapyStyles.bodySecondary}>{inhaleTime}s</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>{bePick(BE_STRINGS.labels.hold, language)}</Text>
            <Text style={therapyStyles.bodySecondary}>{holdTime}s</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[therapyStyles.caption, { color: TherapyColors.primary }]}>{bePick(BE_STRINGS.labels.exhale, language)}</Text>
            <Text style={therapyStyles.bodySecondary}>{exhaleTime}s</Text>
          </View>
        </View>

          {/* Progress Message - Shows cycles completed */}
          {completedCycles > 0 && !isActive && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={[therapyStyles.body, { color: TherapyColors.healing, textAlign: 'center' }]}>
                {completedCycles >= MAX_CYCLES 
                  ? `🎉 Excellent! You completed all ${MAX_CYCLES} breathing cycles!`
                  : `✨ Great work! You've completed ${completedCycles} breathing cycle${completedCycles > 1 ? 's' : ''}.`
                }
              </Text>
              <Text style={[therapyStyles.bodySecondary, { textAlign: 'center', marginTop: 8 }]}>
                {completedCycles >= MAX_CYCLES
                  ? 'You reached your goal. The AI will provide personalized feedback.'
                  : 'Take your time. You can continue or finish when you feel ready.'
                }
              </Text>
              {completedCycles < MAX_CYCLES && (
                <TouchableOpacity
                  onPress={() => onComplete?.({ cycles: completedCycles, totalTime })}
                  style={[therapyStyles.primaryButton, { marginTop: 12 }]}
                >
                  <Text style={therapyStyles.primaryButtonText}>I'm Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default BreathingExercise;