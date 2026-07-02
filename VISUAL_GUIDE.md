# 🎨 Art Therapy Visual Guide

## 📱 User Interface Preview

### Main Screen (ArtTherapyScreen)
```
┌─────────────────────────────────────┐
│ ← Art Therapy Journey      [EN]▼    │
│ 15 Sessions of Deep Self-Discovery  │
│                                     │
│ ████████░░░░░░░░░░░░░░░░ 7%        │
│                                     │
│   1 Completed  │  14 Remaining     │
│   2 Unlocked                        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🪞  Session 1           [✓]    │ │
│ │     Self-Portrait: Who Am I?   │ │
│ │     Self-Exploration           │ │
│ │     Begin your journey...      │ │
│ │     ⏱️ 30 min      [Completed] │ │
│ └─────────────────────────────────┘ │
│          ●  (unlocked)              │
│ ┌─────────────────────────────────┐ │
│ │ 🏡  Session 2                  │ │
│ │     The Safe Place             │ │
│ │     Safety & Grounding         │ │
│ │     Create a visual sanctuary  │ │
│ │     ⏱️ 35 min                  │ │
│ └─────────────────────────────────┘ │
│          ●  (unlocked)              │
│ ┌─────────────────────────────────┐ │
│ │ 🌦️ Session 3           [🔒]   │ │
│ │     Emotions as Weather        │ │
│ │     Complete Session 2 first   │ │
│ │     ⏱️ 30 min                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│          ...                        │
└─────────────────────────────────────┘
```

### Session Chat (ArtTherapySessionChat)
```
┌─────────────────────────────────────┐
│ ←  🪞 Self-Portrait    Phase 1/3   │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI: Welcome to Session 1!       │ │
│ │                                 │ │
│ │ 📝 Drawing Prompt:              │ │
│ │ Draw yourself as you feel       │ │
│ │ right now. Use colors, shapes,  │ │
│ │ or symbols that represent...    │ │
│ │                                 │ │
│ │ Tap 🎨 to draw or 📸 upload     │ │
│ │                      10:30 AM   │ │
│ └─────────────────────────────────┘ │
│                                     │
│             ┌───────────────────┐   │
│             │ [User Drawing]    │   │
│             │ [Image Preview]   │   │
│             │                   │   │
│             │ Here is my drawing│   │
│             │        10:32 AM   │   │
│             └───────────────────┘   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI: I notice you've used...     │ │
│ │                                 │ │
│ │ 🎨 Clinical Insights:           │ │
│ │ 💭 Emotions: melancholy, hope   │ │
│ │    Intensity: moderate          │ │
│ │                                 │ │
│ │ 🎨 Colors: blue, gray, yellow   │ │
│ │    Symbols: person, sun         │ │
│ │                                 │ │
│ │ 💡 Containment Exercise         │ │
│ │    For overwhelming emotions    │ │
│ │                                 │ │
│ │ Phase 0: Exploration           │ │
│ │                      10:33 AM   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ○ ○ ○ typing...                    │
│                                     │
├─────────────────────────────────────┤
│ 🎨 📸 [Type message...    ]  →     │
└─────────────────────────────────────┘
```

### Drawing Canvas (ArtTherapyCanvas)
```
┌─────────────────────────────────────┐
│ ✕  Art Therapy Canvas      [Save]  │
├─────────────────────────────────────┤
│ 📝 Draw yourself as you feel       │
│     right now...                    │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────┐     │
│    │                         │     │
│    │   [User's Drawing]      │     │
│    │      Canvas Area        │     │
│    │   (Touch to draw)       │     │
│    │                         │     │
│    │                         │     │
│    │                         │     │
│    └─────────────────────────┘     │
│                                     │
├─────────────────────────────────────┤
│ Colors:                             │
│ ⚫🔴🔵🟢🟡🟣🟠🟤⚪                    │
│                                     │
│ Brush: ● ●● ●●● ●●●●               │
│                                     │
│ [Undo]   [Clear]   [Complete]      │
└─────────────────────────────────────┘
```

---

## 🔄 User Flow Diagram

```
┌──────────────┐
│  App Launch  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Navigate to     │
│  Art Therapy Tab │
└──────┬───────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Main Screen                        │
│  • See 15 sessions                  │
│  • Session 1 unlocked               │
│  • Progress: 0%                     │
└──────┬──────────────────────────────┘
       │
       │ [Tap Session 1]
       ▼
┌─────────────────────────────────────┐
│  Session 1 Chat                     │
│  • AI welcomes user                 │
│  • Provides drawing prompt          │
│  • Phase 0: Exploration             │
└──────┬──────────────────────────────┘
       │
       │ [Tap 🎨 Draw]
       ▼
┌─────────────────────────────────────┐
│  Drawing Canvas                     │
│  • User creates artwork             │
│  • 12 colors, 4 brush sizes         │
│  • Undo/Clear/Complete              │
└──────┬──────────────────────────────┘
       │
       │ [Complete & Save]
       ▼
┌─────────────────────────────────────┐
│  Chat (Image Sent)                  │
│  • Image uploaded to AI             │
│  • Processing... (5-10s)            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  AI Analysis Response               │
│  • Warm, empathetic text            │
│  • Clinical insights card           │
│  • Colors, emotions, themes         │
│  • Safety assessment                │
│  • Therapeutic technique            │
└──────┬──────────────────────────────┘
       │
       │ [User continues chatting]
       ▼
┌─────────────────────────────────────┐
│  Conversation                       │
│  • User types thoughts              │
│  • AI responds with questions       │
│  • Builds therapeutic alliance      │
└──────┬──────────────────────────────┘
       │
       │ [Phase 1 triggered]
       ▼
┌─────────────────────────────────────┐
│  Transformation Invitation          │
│  • AI: "Would you like to change    │
│    anything in this drawing?"       │
│  • User creates 2nd drawing         │
└──────┬──────────────────────────────┘
       │
       │ [2nd drawing submitted]
       ▼
┌─────────────────────────────────────┐
│  Integration (Phase 2)              │
│  • Compare both drawings            │
│  • Reflect on changes               │
│  • Celebrate insights               │
│  • Ground and close                 │
└──────┬──────────────────────────────┘
       │
       │ [Session complete]
       ▼
┌─────────────────────────────────────┐
│  Completion Dialog                  │
│  • ✨ Session Complete!             │
│  • Session 2 now unlocked           │
│  • Progress saved                   │
│  • [View Summary] or [Continue]     │
└──────┬──────────────────────────────┘
       │
       │ [Back to main screen]
       ▼
┌─────────────────────────────────────┐
│  Main Screen (Updated)              │
│  • Session 1: ✓ Completed           │
│  • Session 2: 🔓 Unlocked           │
│  • Progress: 7% (1/15)              │
└─────────────────────────────────────┘
```

---

## 🎨 Color System

```
Primary Colors:
┌────────────┬────────────┬────────────┐
│  Indigo    │  Purple    │    Pink    │
│  #6366F1   │  #8B5CF6   │  #EC4899   │
│  (Primary) │ (Healing)  │ (Support)  │
└────────────┴────────────┴────────────┘

Session Colors:
┌────────────┬────────────┬────────────┐
│  Session 1 │  Session 2 │  Session 3 │
│  #6366F1   │  #10B981   │  #3B82F6   │
│  (Indigo)  │  (Green)   │  (Blue)    │
└────────────┴────────────┴────────────┘

Status Colors:
┌────────────┬────────────┬────────────┐
│  Success   │  Warning   │   Danger   │
│  #10B981   │  #F59E0B   │  #DC2626   │
│  (Green)   │ (Amber)    │  (Red)     │
└────────────┴────────────┴────────────┘

Neutral Colors:
┌────────────┬────────────┬────────────┐
│ Background │    Text    │  Secondary │
│  #F9FAFB   │  #1F2937   │  #64748B   │
│  (Gray 50) │ (Gray 900) │ (Slate)    │
└────────────┴────────────┴────────────┘
```

---

## 📊 Data Structure Visualization

### Session Progress Object
```typescript
{
  sessionId: 1,
  completed: false,
  phase: 0,  // 0 → 1 → 2
  startedAt: Date("2024-01-15T10:30:00Z"),
  completedAt: null,
  firstDrawingUri: "file:///path/to/drawing1.jpg",
  secondDrawingUri: null,
  chatHistory: [
    {
      id: "msg_1",
      role: "assistant",
      content: "Welcome to Session 1...",
      timestamp: Date,
      clinicalData: {...}
    },
    {
      id: "msg_2",
      role: "user",
      content: "Here is my drawing...",
      timestamp: Date,
      imageUri: "file:///...",
      imageBase64: "data:image/jpeg;base64,..."
    }
  ],
  clinicalSummary: {
    response_text: "...",
    clinical_insights: {...},
    safety_assessment: {...}
  }
}
```

### AI Response Structure
```typescript
{
  response_text: "Warm, empathetic response in user's language",
  session_phase: 0 | 1 | 2,
  
  clinical_insights: {
    visual_analysis: {
      colors: ["blue", "gray", "yellow"],
      shapes: ["circular", "angular"],
      symbols: ["person", "sun", "path"],
      composition: "Centered with radiating elements",
      line_quality: "Varied pressure, flowing",
      spatial_use: "Balanced with open space"
    },
    emotional_indicators: {
      detected_emotions: ["melancholy", "hope", "curiosity"],
      intensity: "moderate",
      conflicting_emotions: true
    },
    psychological_themes: [
      "Isolation vs. connection",
      "Safety vs. threat",
      "Present-moment awareness"
    ],
    cultural_elements: [
      "Western individualistic symbolism",
      "Universal hope imagery (sun)"
    ],
    trauma_indicators: []
  },
  
  safety_assessment: {
    risk_level: "low",
    concerning_imagery: [],
    immediate_action_needed: false,
    safety_recommendations: []
  },
  
  therapeutic_techniques: {
    suggested_technique: "Grounding Exercise",
    rationale: "To stabilize after emotional expression",
    instructions: "Place both feet on the ground..."
  },
  
  somatic_guidance: {
    body_awareness_prompt: "Notice where in your body you feel this emotion",
    grounding_technique: "5-4-3-2-1 sensory exercise"
  },
  
  progress_tracking: {
    emotional_shift: "From anxious to curious",
    insight_gained: "Realized isolation is self-imposed",
    therapeutic_alliance: "Strong, client feels heard"
  },
  
  next_steps: "Continue exploring the meaning of colors in your drawing"
}
```

---

## 🌍 Language Switching Example

### English (en)
```
Title: Self-Portrait: Who Am I?
Theme: Self-Exploration
Prompt: Draw yourself as you feel right now.
        Use colors, shapes, or symbols that
        represent your current state.
```

### Georgian (ka)
```
Title: ავტოპორტრეტი: ვინ ვარ მე?
Theme: თვითშემეცნება
Prompt: დახატე საკუთარი თავი ისე, როგორც
        ახლა გრძნობ. გამოიყენე ფერები, ფორმები
        ან სიმბოლოები.
```

### Russian (ru)
```
Title: Автопортрет: Кто я?
Theme: Самопознание
Prompt: Нарисуйте себя таким, каким чувствуете
        себя сейчас. Используйте цвета, формы
        или символы.
```

### Armenian (hy)
```
Title: Ինքնապատկեր: Ո՞վ եմ ես
Theme: Ինքնաճանաչում
Prompt: Նկարեք ինքներդ ձեզ այնպես, ինչպես
        զգում եք հիմա. Օգտագործեք գույներ,
        ձևեր կամ խորհրդանիշներ.
```

---

## 🎭 Session Icons & Themes

```
Session  Icon  Theme                      Colors
──────────────────────────────────────────────────
   1     🪞    Self-Portrait              #6366F1 (Indigo)
   2     🏡    Safe Place                 #10B981 (Green)
   3     🌦️   Emotions as Weather        #3B82F6 (Blue)
   4     🎭    The Mask I Wear            #8B5CF6 (Purple)
   5     🌳    Family Tree                #059669 (Emerald)
   6     🌑    Shadow Self                #1F2937 (Dark)
   7     🧘    Body Map                   #EC4899 (Pink)
   8     👶    Inner Child                #F59E0B (Amber)
   9     🛤️    Journey So Far             #14B8A6 (Teal)
   10    🗣️    Dialogues with Parts       #A855F7 (Violet)
   11    🏛️    Cultural Roots             #DC2626 (Red)
   12    🕊️    Grief & Loss               #6B7280 (Gray)
   13    🦋    Transformation             #7C3AED (Purple)
   14    🛡️    Boundaries                 #0891B2 (Cyan)
   15    ✨    Future Self                #F59E0B (Amber)
```

---

## 📱 Responsive Layout

### Mobile Portrait (Most Common)
```
┌───────────────┐
│   [Header]    │
│   Progress    │
├───────────────┤
│               │
│  Session Card │
│  Session Card │
│  Session Card │
│  Session Card │
│       ...     │
│               │
└───────────────┘
```

### Mobile Landscape
```
┌─────────────────────────────────┐
│ [Header]       Progress         │
├─────────────────────────────────┤
│  Card │  Card │  Card │  Card   │
│  Card │  Card │  Card │  Card   │
└─────────────────────────────────┘
```

### Tablet/iPad
```
┌───────────────────────────────────────┐
│  [Header]              Progress       │
├───────────────────────────────────────┤
│  Card │  Card │  Card │  Card │  Card │
│  Card │  Card │  Card │  Card │  Card │
│  Card │  Card │  Card │  Card │  Card │
└───────────────────────────────────────┘
```

---

## 🎯 Key Metrics to Track

### User Engagement
- Sessions started
- Sessions completed
- Average time per session
- Drop-off points
- Return rate

### Clinical Outcomes
- Emotional shifts reported
- Safety alerts triggered
- Crisis resources accessed
- Progression through 15 sessions

### Technical Performance
- API response times
- Image upload success rate
- Canvas save success rate
- App crash rate
- Storage usage

---

## 🔐 Security Layers

```
┌─────────────────────────────────────┐
│  User Device                        │
│  ┌───────────────────────────────┐  │
│  │  App                          │  │
│  │  • .env (API key)            │  │
│  │  • AsyncStorage (local data) │  │
│  │  • Image processing          │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│  OpenAI API                         │
│  • GPT-4 Vision                     │
│  • Image analysis                   │
│  • JSON response                    │
└─────────────────────────────────────┘
```

**Security Notes:**
- ✅ API key never exposed to client (stored in .env)
- ✅ Images sent via HTTPS
- ✅ No cloud storage (all local)
- ✅ No user accounts (no auth vulnerabilities)
- ⚠️ Consider encrypting AsyncStorage for production

---

## 🎨 Animation & Transitions

### Screen Transitions
```
Main Screen → Session Chat
  [Slide from right, 300ms]

Session Chat → Drawing Canvas
  [Modal from bottom, 250ms]

Drawing Complete → Chat
  [Fade in, 200ms]
```

### Micro-interactions
```
Button Press:
  • Haptic feedback (light)
  • Scale down (0.95)
  • Opacity (0.7)
  • Duration: 100ms

Progress Bar Fill:
  • Animated spring
  • Duration: 800ms
  • Easing: easeInOutCubic

Session Unlock:
  • Fade in
  • Scale up (0.8 → 1.0)
  • Celebrate emoji (✨)
```

---

## 📚 Resources Used

### Therapeutic Frameworks
- **Jungian Analytical Psychology** (Shadow work, archetypes)
- **Internal Family Systems** (Parts work)
- **Trauma-Informed Care** (Safety, grounding)
- **Somatic Experiencing** (Body awareness)
- **Cross-Cultural Psychology** (Cultural adaptation)

### Technical Stack
- **React Native** + **Expo** (Framework)
- **TypeScript** (Type safety)
- **@shopify/react-native-skia** (Drawing canvas)
- **AsyncStorage** (Local persistence)
- **expo-image-picker** (Image upload)
- **OpenAI GPT-4 Vision** (AI analysis)

---

## 🎉 Success Indicators

Your implementation is successful when you see:

✅ All 15 sessions visible on main screen  
✅ Session 1 unlocked, others locked  
✅ Progress bar shows 0%  
✅ Tap Session 1 → Opens chat with prompt  
✅ Tap 🎨 → Opens drawing canvas  
✅ Draw → Save → Returns to chat  
✅ AI analyzes drawing in 5-10 seconds  
✅ Clinical insights display in card  
✅ Chat history persists after app close  
✅ Complete session → Session 2 unlocks  
✅ Progress updates to 7%  
✅ Language switch changes all UI text  
✅ No crashes or errors  

---

**გაიხარე! (Congratulations!)** 🎉

You've built something truly special that can help people heal through creative expression. 💜🎨
