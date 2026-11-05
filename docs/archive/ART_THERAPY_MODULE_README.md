# Art Therapy Module - Professional 15-Session Program

## Overview
A comprehensive art therapy system with 15 professionally designed sessions, featuring multilingual AI therapist support (English, Georgian, Russian, Armenian), progressive unlocking (Duolingo-style), and clinical-grade insights.

## Features

### ✨ Core Capabilities
- **15 Therapeutic Sessions**: Carefully designed progression from self-exploration to future visioning
- **AI Art Therapist**: Advanced multilingual AI using GPT-4 Vision with specialized art therapy prompt
- **3-Phase Process**: Exploration → Transformation → Integration
- **Progressive Unlocking**: Complete one session to unlock the next
- **Drawing Canvas**: Professional-grade canvas with multiple colors, brush sizes, and gestures
- **Clinical Insights**: Real-time emotional analysis, visual element detection, trauma indicators
- **Cultural Sensitivity**: Adapted responses for Georgian, Russian, Armenian, and Western cultures
- **Safety Assessment**: Automatic risk level detection with crisis resources
- **Progress Tracking**: Session completion, artwork storage, clinical summaries

### 📋 15 Session Themes
1. **Self-Portrait**: Who Am I?
2. **The Safe Place**: Safety & Grounding
3. **Emotions as Weather**: Emotional Awareness
4. **The Mask I Wear**: Authenticity vs. Social Facade
5. **Family Tree of Emotions**: Intergenerational Patterns
6. **The Shadow Self**: Jungian Shadow Work
7. **Body Map of Feelings**: Somatic Awareness
8. **The Inner Child**: Inner Child Healing
9. **The Journey So Far**: Life Review
10. **Dialogues with Parts**: Internal Family Systems
11. **Cultural Roots**: Cultural Identity
12. **Grief & Loss**: Processing Loss
13. **Transformation**: Growth & Change
14. **Boundaries & Protection**: Setting Healthy Boundaries
15. **The Future Self**: Vision & Hope

## Files Created

### Services
- **`services/artTherapyService.ts`**: OpenAI API integration with vision capabilities
- **`services/artTherapyProgram.ts`**: 15-session program structure with progress management

### Components
- **`components/ArtTherapyScreen.tsx`**: Main screen with session list and progress
- **`components/ArtTherapySessionChat.tsx`**: Individual session chat with AI therapist
- **`components/ArtTherapyCanvas.tsx`**: Professional drawing canvas with save functionality

## Setup Instructions

### 1. Install Dependencies
All required dependencies are already in your `package.json`:
```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=sk-REDACTED-rotate-this-key
```

Update `app.config.js` to include the environment variable:
```javascript
export default {
  // ... existing config
  extra: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
};
```

### 3. Add to Navigation

Add the Art Therapy screen to your app navigation. Example for tab navigation:

**File: `app/(tabs)/_layout.tsx`**
```typescript
<Tabs.Screen
  name="arttherapy"
  options={{
    title: 'Art Therapy',
    tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎨</Text>,
  }}
/>
```

**File: `app/(tabs)/arttherapy.tsx`**
```typescript
import ArtTherapyScreen from '../../components/ArtTherapyScreen';

export default ArtTherapyScreen;
```

Add session chat to stack navigator:

**File: `app/_layout.tsx` or main navigator**
```typescript
<Stack.Screen
  name="ArtTherapySession"
  component={ArtTherapySessionChat}
  options={{ headerShown: false }}
/>
```

## How It Works

### Session Flow
1. **User Opens Main Screen**: Sees all 15 sessions, with only Session 1 unlocked initially
2. **Starts Session**: Taps on unlocked session → Opens chat with AI therapist
3. **Receives Prompt**: AI provides themed drawing prompt in user's language
4. **Creates Artwork**: User draws or uploads image
5. **AI Analysis**: GPT-4 Vision analyzes the artwork with clinical precision
6. **Therapeutic Dialogue**: User and AI discuss the artwork (Phase 0: Exploration)
7. **Transformation Invitation**: AI invites user to create a modified version (Phase 1)
8. **Second Drawing**: User creates transformed artwork
9. **Integration**: AI helps integrate insights (Phase 2)
10. **Session Complete**: Next session unlocks automatically

### AI Response Structure
Every AI response includes:
- **Therapeutic Response**: Warm, culturally sensitive, non-directive
- **Clinical Insights**: Colors, shapes, symbols, composition, emotions
- **Emotional Indicators**: Detected emotions and intensity
- **Psychological Themes**: Recurring patterns
- **Safety Assessment**: Risk level and crisis resources if needed
- **Therapeutic Techniques**: Suggested exercises with rationale
- **Somatic Guidance**: Body awareness and grounding
- **Progress Tracking**: Emotional shifts and insights

## Cultural Adaptation

The AI automatically adapts based on user language:

### Georgian (ka)
- Honors family and Orthodox Christian traditions
- Recognizes Soviet trauma legacy
- Uses warm, family-oriented language

### Russian (ru)
- Direct, honest communication style
- Acknowledges historical trauma
- References Russian soul (dusha) concept

### Armenian (hy)
- Respects intergenerational genocide trauma
- Values family loyalty and survival narratives
- Acknowledges diaspora experience

### English/Western (en)
- Individualistic framework
- Direct emotional expression
- Autonomy and self-actualization focus

## Technical Details

### Storage
- Uses `AsyncStorage` for local persistence
- Stores: session progress, chat history, artwork URIs, clinical summaries
- Key: `@behappy_art_therapy_progress`

### Image Handling
- Images compressed to 1024px width, 70% quality
- Converted to base64 for API transmission
- Stored locally with URIs

### API Integration
- Endpoint: OpenAI Chat Completions with GPT-4o (vision-enabled)
- Custom system prompt with cultural context
- JSON response format for structured clinical data
- 60-second timeout for complex image analysis

## Safety Features

### Risk Detection
Automatic detection of:
- Self-harm imagery
- Death-related content
- Severe dissociation indicators
- Overwhelming chaos or violence

### Crisis Resources
Language-specific hotlines:
- **USA**: 988 Suicide Prevention Lifeline
- **Georgia**: 116 006
- **Russia**: 8-800-2000-122
- **Armenia**: +374 (0)60 655 000
- **International**: befrienders.org

### Clinical Boundaries
- AI never diagnoses
- AI asks what art means to client first
- AI offers reflections as open questions
- AI refers to professional help when needed

## Usage Example

```typescript
// In your app navigation
import ArtTherapyScreen from './components/ArtTherapyScreen';
import ArtTherapySessionChat from './components/ArtTherapySessionChat';

// Add to your routes
<Stack.Screen name="ArtTherapy" component={ArtTherapyScreen} />
<Stack.Screen name="ArtTherapySession" component={ArtTherapySessionChat} />
```

## Customization

### Add More Sessions
Edit `services/artTherapyProgram.ts`:
```typescript
export const ART_THERAPY_SESSIONS: ArtTherapySession[] = [
  // Add new session object with multilingual content
  {
    id: 16,
    title: { en: '...', ka: '...', ru: '...', hy: '...' },
    // ... other fields
  }
];
```

### Modify AI Behavior
The AI uses the prompt ID: `pmpt_69066087cdcc81958bec8cb94570a21806db56a8ed378e71`

To use a different prompt, update `services/artTherapyService.ts`:
```typescript
private promptId: string = 'your-new-prompt-id';
```

### Change Colors/Styling
All colors are defined inline in component StyleSheets. Key colors:
- Primary: `#6366F1` (Indigo)
- Success: `#10B981` (Green)
- Danger: `#DC2626` (Red)
- Background: `#F9FAFB`

## Testing Checklist

- [ ] Test session unlocking logic
- [ ] Test image upload and drawing canvas
- [ ] Test AI response with image analysis
- [ ] Test chat persistence (close/reopen app)
- [ ] Test session completion flow
- [ ] Test multilingual content (all 4 languages)
- [ ] Test safety assessment triggers
- [ ] Test progress percentage calculation
- [ ] Test navigation (back button, tab switching)
- [ ] Test on both iOS and Android

## Known Limitations

1. **Drawing Canvas**: Requires native platform (not web)
2. **Image Size**: Large images may take longer to process
3. **API Costs**: Each image analysis uses GPT-4 Vision tokens (~$0.01-0.05 per image)
4. **Offline Mode**: Requires internet connection for AI features
5. **Storage**: Large chat histories may grow AsyncStorage size

## Future Enhancements

- [ ] Export session summaries as PDF
- [ ] Share artwork with therapist via email
- [ ] Add voice recording for session reflections
- [ ] Implement mood tracking integration
- [ ] Add session reminders/notifications
- [ ] Create therapist dashboard for professional use
- [ ] Add group therapy support
- [ ] Implement end-to-end encryption for sensitive data

## Support & Resources

### For Users
- Each session includes crisis resources
- AI provides grounding techniques
- Safe place imagery for anxiety management

### For Developers
- All code is commented and typed
- Error handling with user-friendly messages
- Console logs for debugging
- TypeScript interfaces for type safety

## License & Ethics

This art therapy module is designed for **supportive mental health tools**, not as a replacement for professional therapy. Users should be informed:

> "This is an AI-assisted art therapy tool for self-exploration and emotional wellness. It is not a substitute for professional mental health care. If you are in crisis or experiencing severe symptoms, please contact a mental health professional or crisis hotline."

---

## Quick Start

1. Add `.env` with OpenAI API key
2. Import `ArtTherapyScreen` in your navigation
3. Run `npm start`
4. Navigate to Art Therapy tab
5. Start Session 1
6. Draw, chat, transform, integrate! 🎨

**Built with love for emotional wellness and healing through art.** 💜
