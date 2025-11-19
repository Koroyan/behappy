# AI Therapy Chat System

A complete AI-powered therapy chat component for the BeHappy React Native app built with Expo.

## Overview

The AI Therapy Chat system simulates a professional AI psychotherapist that understands and applies multiple therapy techniques including CBT, ACT, Mindfulness, Self-Compassion, Narrative Therapy, Art Therapy, Positive Psychology, Solution-Focused Therapy, Transactional Analysis, and Body-Oriented Techniques.

## Features

### 🧠 Intelligent AI Therapist
- **Multi-technique Support**: Automatically selects from 10+ therapeutic approaches
- **Emotion Detection**: Analyzes user messages to detect emotional states
- **Multilingual**: Responds in the same language the user uses (English, Georgian, Russian, Armenian)
- **Structured Responses**: JSON format for enhanced interactivity

### 💬 Advanced Chat Interface
- **Text Messages**: User ↔ AI conversation
- **Image Sharing**: Send art therapy drawings or emotion sketches
- **Session Management**: Local storage of conversation history
- **Real-time Interaction**: Smooth, responsive chat experience

### 🎨 Interactive Therapeutic Components
- **Breathing Exercise**: Animated 4-2-6 rhythm breathing circle
- **Drawing Canvas**: Touch-based art therapy with multiple colors and brushes
- **Journaling Prompts**: In-chat text fields for reflection
- **Emotion Tracker**: Mood progress charts with local data storage

### 📊 Data & Analytics
- **Session History**: Persistent storage using AsyncStorage
- **Emotion Tracking**: Charts showing emotional journey over time
- **Key Insights**: AI-generated insights from each session
- **Personalized Recommendations**: Context-aware follow-up suggestions

## Components

### 1. AITherapyChatScreen
Main chat interface with:
- Real-time messaging
- Session management
- Keyboard handling
- Image picker integration
- Completion flow

### 2. ChatMessage
Reusable message component that renders:
- Text messages with therapy technique badges
- Interactive components (breathing, drawing, journaling)
- Key insights display
- Completion status tracking

### 3. BreathingExercise
Animated breathing component featuring:
- 4-2-6 breathing pattern (customizable)
- Visual circle animation with gradients
- Progress tracking
- Auto-completion after duration

### 4. DrawingCanvas
Art therapy canvas with:
- React Native Skia drawing engine
- 10 color palette
- 4 brush sizes
- Undo/clear functionality
- Save and export capabilities

### 5. EmotionTracker
Mood tracking visualization:
- Line chart using react-native-chart-kit
- Weekly/monthly view options
- Emotion intensity tracking
- AI-generated insights from patterns

### 6. AITherapyService
Core AI service providing:
- Message processing and emotion detection
- Therapy technique selection
- Structured JSON responses
- Local data storage
- OpenAI integration placeholder

## Therapy Techniques Supported

### 1. Cognitive Behavioral Therapy (CBT)
- Thought reframing
- Cognitive restructuring
- Behavioral activation
- Exposure therapy

### 2. Acceptance and Commitment Therapy (ACT)
- Mindful acceptance
- Values clarification
- Psychological flexibility
- Defusion techniques

### 3. Mindfulness-Based Approaches
- Breathing meditation
- Body scan
- Present moment awareness
- Mindful observation

### 4. Self-Compassion Therapy
- Self-kindness practices
- Common humanity
- Mindful self-compassion
- Loving-kindness meditation

### 5. Narrative Therapy
- Story re-authoring
- Problem externalization
- Unique outcomes exploration
- Preferred story creation

### 6. Art Therapy
- Emotional drawing
- Mandala creation
- Color-emotion mapping
- Visual metaphor exploration

### 7. Positive Psychology
- Gratitude practices
- Strength identification
- Flow activities
- Meaning-making exercises

### 8. Solution-Focused Therapy
- Miracle question
- Scaling questions
- Exception finding
- Goal setting

### 9. Transactional Analysis
- Ego state analysis
- Script analysis
- Stroke economy
- Game analysis

### 10. Body-Oriented Techniques
- Breathing exercises
- Body awareness
- Progressive relaxation
- Grounding techniques

## Usage

### Adding to Navigation
The AI Therapy Chat is added as a tab in the main navigation:

```tsx
<Tabs.Screen
  name="ai-therapy-chat"
  options={{
    title: "AI Терапия",
    tabBarIcon: ({ color, size }) => (
      <FontAwesome5 name="brain" size={size} color={color} />
    ),
  }}
/>
```

### Basic Implementation
```tsx
import AITherapyChatScreen from '../screens/ai-therapy-chat';

export default function AITherapyTab() {
  return <AITherapyChatScreen />;
}
```

### Custom Configuration
```tsx
import aiTherapyService from '../services/aiTherapyService';

// Set OpenAI API key (optional)
await aiTherapyService.setApiKey('your-openai-api-key');

// Process user message
const response = await aiTherapyService.processMessage(
  "I'm feeling anxious about tomorrow",
  imageUri // optional
);
```

## Data Storage

### Session Data
```typescript
interface SessionData {
  id: string;
  messages: ChatMessage[];
  startTime: Date;
  endTime?: Date;
  insights: string[];
  emotions: { emotion: string; intensity: number; timestamp: Date }[];
}
```

### AI Response Format
```typescript
interface AIResponse {
  response_text: string;
  technique: {
    method: string;
    name: string;
    description: string;
  };
  detected_emotion: string;
  key_insights: string[];
  next_recommendation: string;
  interactive_component?: 'breathing' | 'drawing' | 'journaling' | 'emotion_tracker';
  language?: string;
}
```

## Styling

The system uses a comprehensive therapeutic design system:

### Color Palette
- **Primary**: Calming blues and purples
- **Healing**: Green tones for growth
- **Support**: Warm oranges for comfort
- **Emotions**: Specific colors for each emotion type

### Typography
- Clean, readable fonts
- Proper hierarchy and spacing
- Accessibility-compliant contrast

### Animations
- Smooth transitions using Reanimated
- Gentle breathing animations
- Satisfying interaction feedback

## Requirements

### Dependencies
```json
{
  "@react-native-async-storage/async-storage": "^2.1.2",
  "@shopify/react-native-skia": "^2.0.0-next.4",
  "react-native-chart-kit": "^6.12.0",
  "react-native-gesture-handler": "^2.24.0",
  "react-native-reanimated": "^3.17.4",
  "expo-linear-gradient": "^14.1.5",
  "expo-image-picker": "^16.1.4"
}
```

### Platform Support
- ✅ iOS
- ✅ Android  
- ✅ Expo Go
- ⚠️ Web (limited Skia support)

## Setup Instructions

1. **Install Dependencies**
```bash
npm install victory-native --legacy-peer-deps
```

2. **Add Files**
- Copy all component files to `/components/`
- Copy service files to `/services/`
- Copy styles to `/styles/`
- Copy screen to `/app/screens/`

3. **Update Navigation**
Add the AI therapy tab to your tab navigator.

4. **Configure Permissions**
Add image picker permissions to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos for art therapy exercises."
        }
      ]
    ]
  }
}
```

## Future Enhancements

### Short Term
- [ ] Voice message support
- [ ] Biometric mood detection
- [ ] Group therapy sessions
- [ ] Therapist matching

### Long Term
- [ ] VR/AR therapy experiences
- [ ] AI-powered therapy recommendations
- [ ] Integration with wearable devices
- [ ] Professional therapist consultation

## Contributing

When contributing to the AI therapy system:

1. **Maintain Therapeutic Principles**: Ensure all additions follow ethical therapy practices
2. **Test Thoroughly**: All interactive components must be tested across platforms
3. **Accessibility First**: Components must be accessible to users with disabilities
4. **Privacy Focus**: Handle sensitive therapy data with utmost care

## Security & Privacy

- All session data is stored locally using AsyncStorage
- No user data is transmitted to external servers by default
- OpenAI integration is optional and configurable
- Emotion data is anonymized and aggregated

## License

Part of the BeHappy mental health application. All therapeutic techniques are implemented based on established psychological research and best practices.

---

**⚠️ Important Note**: This AI therapy system is designed to supplement, not replace, professional mental health care. Users experiencing severe mental health issues should be encouraged to seek help from licensed professionals.