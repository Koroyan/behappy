// Breathing techniques carried over verbatim from the pre-2.0 breathing screen (19 languages).
import type { Localized, LocalizedList } from './types';

export interface BreathingPattern {
  id: string;
  inhale: number;
  hold: number;
  exhale: number;
  pause: number;
  cycles: number;
  name: Localized;
  description: Localized;
  benefits: LocalizedList;
}

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    "id": "4-7-8",
    "inhale": 4,
    "hold": 7,
    "exhale": 8,
    "pause": 0,
    "cycles": 4,
    "name": {
      "en": "4-7-8 Calm",
      "ka": "4-7-8 დამშვიდება",
      "ru": "Техника 4-7-8",
      "hy": "4-7-8 հանգիստ",
      "uk": "4-7-8 Спокій",
      "tr": "4-7-8 Sakin",
      "az": "4-7-8 Sakitləşmə",
      "de": "4-7-8 Ruhe",
      "fr": "4-7-8 Calme",
      "es": "4-7-8 Calma",
      "it": "4-7-8 Calma",
      "pt": "4-7-8 Calma",
      "pl": "4-7-8 Spokój",
      "id": "4-7-8 Tenang",
      "ar": "٤-٧-٨ للهدوء",
      "hi": "4-7-8 शांत",
      "zh": "4-7-8 平静",
      "ja": "4-7-8 カーム",
      "ko": "4-7-8 진정"
    },
    "description": {
      "en": "Inhale 4 • Hold 7 • Exhale 8",
      "ka": "შესუნთქვა 4 • შეკავება 7 • ამოსუნთქვა 8",
      "ru": "Вдох 4 • Задержка 7 • Выдох 8",
      "hy": "Շնչում 4 • Պահում 7 • Արտաշնչում 8",
      "uk": "Вдих 4 • Затримка 7 • Видих 8",
      "tr": "Nefes 4 • Tut 7 • Ver 8",
      "az": "Nəfəs 4 • Saxla 7 • Ver 8",
      "de": "Ein 4 • Halten 7 • Aus 8",
      "fr": "Inspire 4 • Garde 7 • Expire 8",
      "es": "Inhala 4 • Retén 7 • Exhala 8",
      "it": "Inspira 4 • Trattieni 7 • Espira 8",
      "pt": "Inspira 4 • Segura 7 • Expira 8",
      "pl": "Wdech 4 • Wstrzymaj 7 • Wydech 8",
      "id": "Tarik 4 • Tahan 7 • Hembus 8",
      "ar": "شهيق ٤ • حبس ٧ • زفير ٨",
      "hi": "साँस 4 • रोकें 7 • छोड़ें 8",
      "zh": "吸气4 • 屏息7 • 呼气8",
      "ja": "吸う4・止める7・吐く8",
      "ko": "들이쉬기4 • 멈춤7 • 내쉬기8"
    },
    "benefits": {
      "en": [
        "Settles nerves",
        "Improves sleep",
        "Reduces anxiety"
      ],
      "ka": [
        "ამშვიდებს ნერვებს",
        "აუმჯობესებს ძილს",
        "ამცირებს შფოთვას"
      ],
      "ru": [
        "Снижает стресс",
        "Улучшает сон",
        "Уменьшает тревогу"
      ],
      "hy": [
        "Նվազեցնում է լարվածությունը",
        "Բարելավում է քունը",
        "Նվազեցնում է անհանգստությունը"
      ],
      "uk": [
        "Заспокоює",
        "Покращує сон",
        "Зменшує тривогу"
      ],
      "tr": [
        "Siniri yatıştırır",
        "Uykuyu iyileştirir",
        "Kaygıyı azaltır"
      ],
      "az": [
        "Sinirləri sakitləşdirir",
        "Yuxunu yaxşılaşdırır",
        "Narahatlığı azaldır"
      ],
      "de": [
        "Beruhigt Nerven",
        "Verbessert Schlaf",
        "Reduziert Angst"
      ],
      "fr": [
        "Apaise les nerfs",
        "Améliore le sommeil",
        "Réduit l’anxiété"
      ],
      "es": [
        "Calma los nervios",
        "Mejora el sueño",
        "Reduce la ansiedad"
      ],
      "it": [
        "Calma",
        "Migliora il sonno",
        "Riduce ansia"
      ],
      "pt": [
        "Acalma os nervos",
        "Melhora o sono",
        "Reduz a ansiedade"
      ],
      "pl": [
        "Uspokaja",
        "Poprawia sen",
        "Zmniejsza lęk"
      ],
      "id": [
        "Menenangkan",
        "Memperbaiki tidur",
        "Mengurangi cemas"
      ],
      "ar": [
        "يهدئ الأعصاب",
        "يحسن النوم",
        "يقلل القلق"
      ],
      "hi": [
        "नर्व शांत",
        "नींद बेहतर",
        "चिंता घटती"
      ],
      "zh": [
        "缓解紧张",
        "改善睡眠",
        "减轻焦虑"
      ],
      "ja": [
        "神経を落ち着かせる",
        "睡眠を改善",
        "不安を減らす"
      ],
      "ko": [
        "긴장 완화",
        "수면 개선",
        "불안 감소"
      ]
    }
  },
  {
    "id": "box",
    "inhale": 4,
    "hold": 4,
    "exhale": 4,
    "pause": 4,
    "cycles": 4,
    "name": {
      "en": "Box Balance",
      "ka": "ყუთის ბალანსი",
      "ru": "Квадратное дыхание",
      "hy": "Խորանարդային շնչ",
      "uk": "Квадратне дихання",
      "tr": "Kutu Dengesi",
      "az": "Qutu Balansı",
      "de": "Box Balance",
      "fr": "Respiration carrée",
      "es": "Respiración en caja",
      "it": "Respiro quadrato",
      "pt": "Respiração em caixa",
      "pl": "Oddychanie pudełkowe",
      "id": "Napas Kotak",
      "ar": "تنفس مربع",
      "hi": "बॉक्स ब्रीदिंग",
      "zh": "方形呼吸",
      "ja": "ボックス呼吸",
      "ko": "박스 호흡"
    },
    "description": {
      "en": "Inhale • Hold • Exhale • Pause (4 each)",
      "ka": "შესუნთქვა • შეკავება • ამოსუნთქვა • პაუზა (4)",
      "ru": "Вдох • Задержка • Выдох • Пауза (по 4)",
      "hy": "Շնչ • Պահ • Արտաշնչ • Դադար (4)",
      "uk": "Вдих • Затримка • Видих • Пауза (4)",
      "tr": "Al • Tut • Ver • Bekle (4)",
      "az": "Nəfəs • Saxla • Ver • Fasilə (4)",
      "de": "Ein • Halten • Aus • Pause (4)",
      "fr": "Inspire • Garde • Expire • Pause (4)",
      "es": "Inhala • Retén • Exhala • Pausa (4)",
      "it": "Inspira • Trattieni • Espira • Pausa (4)",
      "pt": "Inspira • Segura • Expira • Pausa (4)",
      "pl": "Wdech • Wstrzymaj • Wydech • Pauza (4)",
      "id": "Tarik • Tahan • Hembus • Jeda (4)",
      "ar": "شهيق • حبس • زفير • توقف (٤)",
      "hi": "साँस • रोकें • छोड़ें • विराम (4)",
      "zh": "吸 • 屏息 • 呼 • 停 (各4)",
      "ja": "吸う・止める・吐く・休む（各4）",
      "ko": "들이쉬기 • 멈춤 • 내쉬기 • 휴식 (4)"
    },
    "benefits": {
      "en": [
        "Focus",
        "Balance",
        "Calm"
      ],
      "ka": [
        "ფოკუსი",
        "ბალანსი",
        "სიმშვიდე"
      ],
      "ru": [
        "Концентрация",
        "Баланс",
        "Спокойствие"
      ],
      "hy": [
        "Կենտրոնացում",
        "Հավասարակշռություն",
        "Խաղաղություն"
      ],
      "uk": [
        "Фокус",
        "Баланс",
        "Спокій"
      ],
      "tr": [
        "Odak",
        "Denge",
        "Sakinlik"
      ],
      "az": [
        "Fokus",
        "Balans",
        "Sakitlik"
      ],
      "de": [
        "Fokus",
        "Balance",
        "Ruhe"
      ],
      "fr": [
        "Focus",
        "Équilibre",
        "Calme"
      ],
      "es": [
        "Enfoque",
        "Equilibrio",
        "Calma"
      ],
      "it": [
        "Focus",
        "Equilibrio",
        "Calma"
      ],
      "pt": [
        "Foco",
        "Equilíbrio",
        "Calma"
      ],
      "pl": [
        "Skupienie",
        "Balans",
        "Spokój"
      ],
      "id": [
        "Fokus",
        "Seimbang",
        "Tenang"
      ],
      "ar": [
        "تركيز",
        "توازن",
        "هدوء"
      ],
      "hi": [
        "ध्यान",
        "संतुलन",
        "शांति"
      ],
      "zh": [
        "专注",
        "平衡",
        "平静"
      ],
      "ja": [
        "集中",
        "バランス",
        "落ち着き"
      ],
      "ko": [
        "집중",
        "균형",
        "차분"
      ]
    }
  },
  {
    "id": "calm",
    "inhale": 4,
    "hold": 0,
    "exhale": 8,
    "pause": 0,
    "cycles": 6,
    "name": {
      "en": "Calm Release",
      "ka": "მშვიდი გამოშვება",
      "ru": "Успокаивающее дыхание",
      "hy": "Հանգստացնող արտաշնչ",
      "uk": "Спокійне видихання",
      "tr": "Sakin Bırakış",
      "az": "Sakit Buraxılış",
      "de": "Ruhige Entspannung",
      "fr": "Relâche apaisante",
      "es": "Liberación calma",
      "it": "Rilascio calmo",
      "pt": "Liberação calma",
      "pl": "Spokojne uwolnienie",
      "id": "Lepas Tenang",
      "ar": "زفير هادئ",
      "hi": "शांत विमोचन",
      "zh": "平静释放",
      "ja": "穏やかなリリース",
      "ko": "차분한 내보내기"
    },
    "description": {
      "en": "Long exhale for soothing relaxation",
      "ka": "გრძელი ამოსუნთქვა დამამშვიდებლად",
      "ru": "Длинный выдох для расслабления",
      "hy": "Երկար արտաշնչում հանգստության համար",
      "uk": "Довгий видих для розслаблення",
      "tr": "Uzun nefes verme sakinlik için",
      "az": "Uzun nəfəsvermə rahatlıq üçün",
      "de": "Langer Ausatmen zur Beruhigung",
      "fr": "Longue expiration apaisante",
      "es": "Exhalación larga para relajación",
      "it": "Lunga espirazione rilassante",
      "pt": "Exalação longa para relaxar",
      "pl": "Długi wydech dla ukojenia",
      "id": "Hembusan panjang untuk tenang",
      "ar": "زفير طويل للتهدئة",
      "hi": "लंबा श्वास छोड़ना आरामदेह",
      "zh": "长呼气以舒缓放松",
      "ja": "長い吐息で落ち着き",
      "ko": "긴 내쉬기로 안정"
    },
    "benefits": {
      "en": [
        "Relaxation",
        "Tension release",
        "Emotional settling"
      ],
      "ka": [
        "რელაქსი",
        "ძაბვის მოხსნა",
        "ემოციური მშვიდობა"
      ],
      "ru": [
        "Расслабление",
        "Снятие напряжения",
        "Эмоциональное успокоение"
      ],
      "hy": [
        "Հանգստություն",
        "Լարվածության ազատում",
        "Զգացմունքների հարթում"
      ],
      "uk": [
        "Розслаблення",
        "Зняття напруги",
        "Емоційне заспокоєння"
      ],
      "tr": [
        "Gevşeme",
        "Gerginliği azaltır",
        "Duygusal yatışma"
      ],
      "az": [
        "Rahatlama",
        "Gərginliyin azalması",
        "Emosional sakitləşmə"
      ],
      "de": [
        "Entspannung",
        "Spannung lösen",
        "Emotionale Beruhigung"
      ],
      "fr": [
        "Relaxation",
        "Libération de tension",
        "Apaisement émotionnel"
      ],
      "es": [
        "Relajación",
        "Liberar tensión",
        "Calma emocional"
      ],
      "it": [
        "Rilassamento",
        "Scioglie tensione",
        "Calma emotiva"
      ],
      "pt": [
        "Relaxamento",
        "Alívio de tensão",
        "Equilíbrio emocional"
      ],
      "pl": [
        "Relaks",
        "Uwolnienie napięcia",
        "Emocjonalne wyciszenie"
      ],
      "id": [
        "Relaks",
        "Lepas ketegangan",
        "Tenang emosional"
      ],
      "ar": [
        "استرخاء",
        "تحرير التوتر",
        "استقرار عاطفي"
      ],
      "hi": [
        "आराम",
        "तनाव मुक्ति",
        "भावनात्मक शांति"
      ],
      "zh": [
        "放松",
        "释放紧张",
        "情绪平复"
      ],
      "ja": [
        "リラックス",
        "緊張解放",
        "感情を落ち着かせる"
      ],
      "ko": [
        "이완",
        "긴장 해소",
        "감정 안정"
      ]
    }
  }
];
