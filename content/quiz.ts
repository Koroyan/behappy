// Ad-landing quiz content, carried over verbatim from the pre-2.0 /quiz page
// (English, Georgian, Russian; other languages fall back to English).
// A self-reflection check-in, deliberately NOT a clinical instrument.
import type { Localized } from './types';

export type FocusTag = 'anxiety' | 'burnout' | 'mood' | 'sleep' | 'relationships' | 'confidence';

export interface QuizOption {
  id: string;
  label: Localized;
  tag: FocusTag;
  weight: number;
}

export interface QuizQuestion {
  id?: string;
  question: Localized;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    "id": "feeling",
    "question": {
      "en": "Which feels closest to you lately?",
      "ka": "ბოლო დღეებში რომელი გრძნობაა შენთან ყველაზე ახლოს?",
      "ru": "Что вам ближе всего в последнее время?"
    },
    "options": [
      {
        "id": "anxious",
        "label": {
          "en": "Anxious, on edge",
          "ka": "შფოთვა და მღელვარება",
          "ru": "Тревога, на нервах"
        },
        "tag": "anxiety",
        "weight": 75
      },
      {
        "id": "drained",
        "label": {
          "en": "Drained, burnt out",
          "ka": "დაცლილობა და გადაწვის შეგრძნება",
          "ru": "Опустошённость, выгорание"
        },
        "tag": "burnout",
        "weight": 70
      },
      {
        "id": "sad",
        "label": {
          "en": "Sad or low",
          "ka": "მოწყენილობა, სევდა",
          "ru": "Грусть, подавленность"
        },
        "tag": "mood",
        "weight": 65
      },
      {
        "id": "fine",
        "label": {
          "en": "Actually okay — just curious",
          "ka": "საერთოდ კარგად, უბრალოდ ცნობისმოყვარეა",
          "ru": "В целом неплохо — просто любопытно"
        },
        "tag": "mood",
        "weight": 15
      }
    ]
  },
  {
    "id": "sleep",
    "question": {
      "en": "How well have you been sleeping?",
      "ka": "რამდენად კარგად გძინავს ღამღამობით?",
      "ru": "Как вы спите по ночам?"
    },
    "options": [
      {
        "id": "very-poor",
        "label": {
          "en": "Very poorly, almost every night",
          "ka": "ძალიან ცუდად, თითქმის ყოველ ღამე",
          "ru": "Очень плохо, почти каждую ночь"
        },
        "tag": "sleep",
        "weight": 85
      },
      {
        "id": "often",
        "label": {
          "en": "I often struggle to fall asleep",
          "ka": "ხშირად მიჭირს დაძინება",
          "ru": "Часто трудно уснуть"
        },
        "tag": "sleep",
        "weight": 60
      },
      {
        "id": "sometimes",
        "label": {
          "en": "Sometimes",
          "ka": "ხანდახან",
          "ru": "Иногда"
        },
        "tag": "sleep",
        "weight": 35
      },
      {
        "id": "fine",
        "label": {
          "en": "I sleep just fine",
          "ka": "კარგად ვიძინებ",
          "ru": "Сплю нормально"
        },
        "tag": "sleep",
        "weight": 10
      }
    ]
  },
  {
    "id": "bothering",
    "question": {
      "en": "What weighs on you the most right now?",
      "ka": "რა გაწუხებს ყველაზე მეტად ამჟამად?",
      "ru": "Что беспокоит вас больше всего сейчас?"
    },
    "options": [
      {
        "id": "anxiety",
        "label": {
          "en": "Anxiety and racing thoughts",
          "ka": "შფოთვა და გაუთავებელი ფიქრები",
          "ru": "Тревога и навязчивые мысли"
        },
        "tag": "anxiety",
        "weight": 80
      },
      {
        "id": "relationships",
        "label": {
          "en": "Relationships with people close to me",
          "ka": "ურთიერთობები ახლობლებთან",
          "ru": "Отношения с близкими"
        },
        "tag": "relationships",
        "weight": 60
      },
      {
        "id": "confidence",
        "label": {
          "en": "Confidence and self-worth",
          "ka": "თავდაჯერებულობა და თვითშეფასება",
          "ru": "Уверенность и самооценка"
        },
        "tag": "confidence",
        "weight": 55
      },
      {
        "id": "burnout",
        "label": {
          "en": "Work overload and burnout",
          "ka": "სამუშაო დატვირთვა და გადაწვა",
          "ru": "Перегрузка и выгорание на работе"
        },
        "tag": "burnout",
        "weight": 75
      }
    ]
  },
  {
    "id": "tried-before",
    "question": {
      "en": "Have you tried therapy or self-help tools before?",
      "ka": "გიცდია აქამდე თერაპია ან თვითდახმარების ინსტრუმენტები?",
      "ru": "Пробовали ли вы раньше терапию или инструменты самопомощи?"
    },
    "options": [
      {
        "id": "yes-helped",
        "label": {
          "en": "Yes, and it helped",
          "ka": "დიახ, დამეხმარა",
          "ru": "Да, и это помогло"
        },
        "tag": "mood",
        "weight": 20
      },
      {
        "id": "yes-not-enough",
        "label": {
          "en": "Yes, but not enough",
          "ka": "დიახ, მაგრამ საკმარისად არა",
          "ru": "Да, но недостаточно"
        },
        "tag": "mood",
        "weight": 50
      },
      {
        "id": "no-never",
        "label": {
          "en": "No, never",
          "ka": "არა, არასდროს",
          "ru": "Нет, никогда"
        },
        "tag": "mood",
        "weight": 45
      },
      {
        "id": "thinking",
        "label": {
          "en": "Thinking about it right now",
          "ka": "ახლა სწორედ ამაზე ვფიქრობ",
          "ru": "Как раз сейчас об этом думаю"
        },
        "tag": "mood",
        "weight": 55
      }
    ]
  },
  {
    "id": "energy",
    "question": {
      "en": "What does your typical daily energy look like?",
      "ka": "როგორია შენი დღის ტიპური ენერგია?",
      "ru": "Какая у вас обычно энергия в течение дня?"
    },
    "options": [
      {
        "id": "empty",
        "label": {
          "en": "Running on empty",
          "ka": "ბოლომდე დაცლილი",
          "ru": "На нуле"
        },
        "tag": "burnout",
        "weight": 85
      },
      {
        "id": "updown",
        "label": {
          "en": "Up and down",
          "ka": "ხან კარგად, ხან ცუდად",
          "ru": "То взлёт, то падение"
        },
        "tag": "mood",
        "weight": 50
      },
      {
        "id": "okay",
        "label": {
          "en": "Mostly okay",
          "ka": "საშუალოდ ნორმალურად",
          "ru": "В целом нормально"
        },
        "tag": "mood",
        "weight": 25
      },
      {
        "id": "energetic",
        "label": {
          "en": "Energetic and active",
          "ka": "ენერგიული და აქტიური",
          "ru": "Энергичная и активная"
        },
        "tag": "mood",
        "weight": 10
      }
    ]
  },
  {
    "id": "goal",
    "question": {
      "en": "What would you like most right now?",
      "ka": "რისი მიღწევა გინდა ყველაზე მეტად ახლა?",
      "ru": "Чего вам хотелось бы больше всего сейчас?"
    },
    "options": [
      {
        "id": "calm",
        "label": {
          "en": "Calm, and less anxiety",
          "ka": "სიმშვიდე და შფოთვის შემცირება",
          "ru": "Спокойствие и меньше тревоги"
        },
        "tag": "anxiety",
        "weight": 70
      },
      {
        "id": "understand",
        "label": {
          "en": "Understand myself better",
          "ka": "საკუთარი თავის უკეთ გაცნობა",
          "ru": "Лучше понять себя"
        },
        "tag": "confidence",
        "weight": 55
      },
      {
        "id": "relationships",
        "label": {
          "en": "Better relationships",
          "ka": "ურთიერთობების გაუმჯობესება",
          "ru": "Улучшить отношения"
        },
        "tag": "relationships",
        "weight": 55
      },
      {
        "id": "try",
        "label": {
          "en": "Just try something new",
          "ka": "უბრალოდ ახალი რაღაცის ცდა",
          "ru": "Просто попробовать что-то новое"
        },
        "tag": "mood",
        "weight": 30
      }
    ]
  }
];

export const QUIZ_FOCUS: Record<FocusTag, { title: Localized; desc: Localized; icon: string; feature: Localized }> = {
  "anxiety": {
    "title": {
      "en": "Anxiety & racing thoughts",
      "ka": "შფოთვა და გაუთავებელი ფიქრები",
      "ru": "Тревога и навязчивые мысли"
    },
    "desc": {
      "en": "Your answers point to a mind that rarely gets to rest.",
      "ka": "შენი პასუხები მიუთითებს გონებაზე, რომელსაც იშვიათად ეძლევა დასვენება.",
      "ru": "Ваши ответы указывают на ум, который редко получает отдых."
    },
    "icon": "brain",
    "feature": {
      "en": "Conversations with Anulia, your AI companion, plus breathing and grounding for when anxiety spikes",
      "ka": "საუბრები ანულიასთან, შენს AI თანამგზავრთან, და სუნთქვისა და დამიწების პრაქტიკები, როცა შფოთვა მატულობს",
      "ru": "Беседы с Анулией, вашим AI-компаньоном, а также дыхание и заземление, когда тревога усиливается"
    }
  },
  "burnout": {
    "title": {
      "en": "Burnout & overload",
      "ka": "გადაწვა და გადატვირთვა",
      "ru": "Выгорание и перегрузка"
    },
    "desc": {
      "en": "It sounds like you’ve been running on empty for a while.",
      "ka": "როგორც ჩანს, დიდი ხანია ბოლომდე დაცლილი ხარ.",
      "ru": "Похоже, вы уже давно работаете на пределе."
    },
    "icon": "battery-quarter",
    "feature": {
      "en": "A structured Art Therapy program on paper, one new session a day — no rush",
      "ka": "სტრუქტურირებული არტ თერაპიის პროგრამა ფურცელზე, დღეში ერთი ახალი სესიით — აჩქარების გარეშე",
      "ru": "Структурированная программа арт-терапии на бумаге — одна новая сессия в день, без спешки"
    }
  },
  "mood": {
    "title": {
      "en": "Low mood & heaviness",
      "ka": "დაბალი განწყობა და სიმძიმე",
      "ru": "Сниженное настроение и тяжесть"
    },
    "desc": {
      "en": "A gentle, creative outlet could help more than pushing through alone.",
      "ka": "რბილმა, შემოქმედებითმა გამოხატვამ შეიძლება მეტი დაგეხმაროს, ვიდრე მარტო გამკლავებამ.",
      "ru": "Мягкий творческий выход может помочь больше, чем попытки справиться в одиночку."
    },
    "icon": "palette",
    "feature": {
      "en": "Art Therapy on paper — express what’s hard to put into words, one drawing at a time",
      "ka": "არტ თერაპია ფურცელზე — გამოხატე ის, რისი თქმაც სიტყვებით გიჭირს, ნახატ-ნახატ",
      "ru": "Арт-терапия на бумаге — выразите то, что трудно облечь в слова, рисунок за рисунком"
    }
  },
  "sleep": {
    "title": {
      "en": "Restless nights",
      "ka": "მშფოთვარე ღამეები",
      "ru": "Беспокойные ночи"
    },
    "desc": {
      "en": "Poor sleep quietly makes everything else harder.",
      "ka": "ცუდი ძილი ჩუმად ართულებს ყველაფერს დანარჩენს.",
      "ru": "Плохой сон незаметно усложняет всё остальное."
    },
    "icon": "moon",
    "feature": {
      "en": "Guided breathing and a calming conversation with Anulia before bed",
      "ka": "მართული სუნთქვა და მშვიდი საუბარი ანულიასთან ძილის წინ",
      "ru": "Дыхательные практики и спокойная беседа с Анулией перед сном"
    }
  },
  "relationships": {
    "title": {
      "en": "Relationships & connection",
      "ka": "ურთიერთობები და კავშირი",
      "ru": "Отношения и связь"
    },
    "desc": {
      "en": "A lot of what troubles us shows up between us and other people.",
      "ka": "ის, რაც გვაწუხებს, ხშირად სწორედ ურთიერთობებში ვლინდება.",
      "ru": "Многое из того, что нас беспокоит, проявляется именно в отношениях."
    },
    "icon": "clone",
    "feature": {
      "en": "Reflection cards — a gentle, story-based way into what’s really going on",
      "ka": "რეფლექსიის ბარათები — ნაზი, ისტორიებზე დაფუძნებული გზა იმის გასაგებად, რაც სინამდვილეში ხდება",
      "ru": "Карты для рефлексии — мягкий способ через истории понять, что происходит на самом деле"
    }
  },
  "confidence": {
    "title": {
      "en": "Confidence & self-worth",
      "ka": "თავდაჯერებულობა და თვითშეფასება",
      "ru": "Уверенность и самооценка"
    },
    "desc": {
      "en": "Understanding yourself better is often the first real step.",
      "ka": "საკუთარი თავის უკეთ გაცნობა ხშირად პირველი ნამდვილი ნაბიჯია.",
      "ru": "Лучше понять себя — часто первый настоящий шаг."
    },
    "icon": "star",
    "feature": {
      "en": "Reflection cards and conversations with Anulia, both built to help you notice your own patterns",
      "ka": "რეფლექსიის ბარათები და საუბრები ანულიასთან — ორივე შენი ნიმუშების შესამჩნევად",
      "ru": "Карты для рефлексии и беседы с Анулией — чтобы замечать собственные паттерны"
    }
  }
};

export const QUIZ_TEXT: Record<string, Localized> = {
  "introKicker": {
    "en": "A 2-MINUTE CHECK-IN",
    "ka": "2-წუთიანი თვითშემოწმება",
    "ru": "2-МИНУТНЫЙ ЧЕК-ИН"
  },
  "introTitle": {
    "en": "How are you\nreally doing?",
    "ka": "როგორ ხარ\nსინამდვილეში?",
    "ru": "Как вы\nна самом деле?"
  },
  "introSubtitle": {
    "en": "Answer a few honest questions and get a personalized starting point — free, private, takes about 2 minutes.",
    "ka": "უპასუხე რამდენიმე გულწრფელ კითხვას და მიიღე პერსონალური საწყისი წერტილი — უფასოდ, პირადულად, დაახლოებით 2 წუთში.",
    "ru": "Ответьте на несколько честных вопросов и получите персональную отправную точку — бесплатно, конфиденциально, около 2 минут."
  },
  "introStart": {
    "en": "Start the check-in",
    "ka": "დაწყება",
    "ru": "Начать"
  },
  "introFootnote": {
    "en": "Not a clinical diagnosis. If you’re in crisis, please contact a licensed professional or local emergency line.",
    "ka": "ეს არ არის კლინიკური დიაგნოზი. კრიზისის შემთხვევაში მიმართე სპეციალისტს ან საგანგებო სამსახურს.",
    "ru": "Это не клинический диагноз. В кризисной ситуации обратитесь к специалисту или на горячую линию."
  },
  "emailPlaceholder": {
    "en": "you@email.com",
    "ka": "you@email.com",
    "ru": "you@email.com"
  },
  "emailInvalid": {
    "en": "Please enter a valid email",
    "ka": "გთხოვ შეიყვანე სწორი ელფოსტა",
    "ru": "Введите корректный email"
  },
  "emailContinue": {
    "en": "Show my results",
    "ka": "შედეგების ნახვა",
    "ru": "Показать результат"
  },
  "emailSkip": {
    "en": "Maybe later — just start free",
    "ka": "ალბათ მოგვიანებით — დაწყება უფასოდ",
    "ru": "Может позже — начать бесплатно"
  },
  "resultsKicker": {
    "en": "YOUR STARTING POINT",
    "ka": "შენი საწყისი წერტილი",
    "ru": "ВАША ОТПРАВНАЯ ТОЧКА"
  },
  "scoreLabel": {
    "en": "Current pressure level",
    "ka": "ამჟამინდელი დატვირთვის დონე",
    "ru": "Текущий уровень нагрузки"
  },
  "scoreZoneLow": {
    "en": "Balanced",
    "ka": "დაბალანსებული",
    "ru": "Сбалансировано"
  },
  "scoreZoneMid": {
    "en": "Under some pressure",
    "ka": "გარკვეული წნეხის ქვეშ",
    "ru": "Под некоторым давлением"
  },
  "scoreZoneHigh": {
    "en": "Significant strain",
    "ka": "მნიშვნელოვანი დაძაბულობა",
    "ru": "Значительное напряжение"
  },
  "recommendedTitle": {
    "en": "Built for exactly this",
    "ka": "ზუსტად ამისთვისაა შექმნილი",
    "ru": "Создано именно для этого"
  },
  "freeCta": {
    "en": "Start my first session — free",
    "ka": "დავიწყო პირველი სესია — უფასოდ",
    "ru": "Начать первую сессию — бесплатно"
  },
  "freeCtaSub": {
    "en": "No card needed. Unlock Premium any time after.",
    "ka": "ბარათი არ სჭირდება. Premium ნებისმიერ დროს შეგიძლია გახსნა.",
    "ru": "Карта не нужна. Premium можно открыть в любой момент позже."
  },
  "trustPrivate": {
    "en": "No sign-up needed",
    "ka": "რეგისტრაცია არ არის საჭირო",
    "ru": "Без регистрации"
  },
  "trustAnytime": {
    "en": "About 2 minutes",
    "ka": "დაახლოებით 2 წუთი",
    "ru": "Около 2 минут"
  }
};
