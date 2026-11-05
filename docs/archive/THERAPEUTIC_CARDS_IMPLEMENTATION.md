# 🎴 Therapeutic Cards System - Implementation Guide

## Overview

This system implements **professional therapeutic card therapy** using OpenAI's Stored Prompts API and evidence-based therapeutic modalities (SFBT, Narrative Therapy, EFT, IFS, DBT).

## 🏗️ Architecture

### 1. **Stored Prompt** (OpenAI Platform)
- Master therapeutic facilitator prompt stored on OpenAI
- Single source of truth for all therapeutic protocols
- Can be updated centrally without app changes
- Prompt ID: `pmpt_xxxxx` (replace with your actual ID)

### 2. **Card Therapy Service** (`services/cardTherapyService.ts`)
- Handles all communication with OpenAI Responses API
- Manages session state and context
- Provides streaming support
- Detects session completion and summaries

### 3. **Therapy Chat Screen** (`app/screens/cards/therapy-chat.tsx`)
- Universal chat interface for all card types
- Real-time streaming responses
- Exchange counter (tracks 20-30 exchange goal)
- Summary request button (appears at 20+ exchanges)
- Session closure detection

### 4. **Card Selection Screens**
- `emotion.tsx` - Emotional awareness cards
- `resources.tsx` - Internal strengths cards
- `positivenegative.tsx` - Dual polarity cards
- `innerchild.tsx` - Narrative therapy cards

## 🚀 Setup Instructions

### Step 1: Create Stored Prompt on OpenAI

Run the provided bash script:

```bash
cd scripts
chmod +x create-therapeutic-prompt.sh
export OPENAI_API_KEY="your-openai-api-key"
./create-therapeutic-prompt.sh
```

This will:
1. Upload the full therapeutic prompt to OpenAI
2. Return a Prompt ID (e.g., `pmpt_690f8a73...`)
3. Save this ID for the next step

### Step 2: Configure Prompt ID

Edit `services/cardTherapyService.ts`:

```typescript
private promptId: string = 'pmpt_YOUR_ACTUAL_PROMPT_ID_HERE';
```

### Step 3: Set API Key

Add to your environment:

```bash
# .env
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
```

Or in `app.json`:

```json
{
  "expo": {
    "extra": {
      "OPENAI_API_KEY": "your-openai-api-key"
    }
  }
}
```

### Step 4: Test the System

1. Run the app: `npm start`
2. Navigate to Cards section
3. Select a card type (Emotion, Resource, etc.)
4. Choose a specific card
5. Start therapeutic session
6. Engage for 20-30 exchanges
7. Request summary

## 📊 Card Types & Protocols

### 1. **Emotion Cards** (`context: 'emotion'`)
**Purpose**: Emotional awareness, validation, and processing

**Session Flow**:
- Phase 1: Initial Projection (5-7 exchanges)
  - What drew you to this card?
  - What emotions arise?
  - What would the card say?

- Phase 2: Exploration & Depth (8-12 exchanges)
  - Recent moments feeling this way
  - What does this emotion need?
  - Somatic exploration

- Phase 3: Integration & Transformation (5-8 exchanges)
  - What would change if you honored this emotion?
  - Small actionable step
  - Symbolic ritual

**Navigation**:
```typescript
router.push({
  pathname: '/screens/cards/therapy-chat',
  params: {
    context: 'emotion',
    cardId: '5',
  },
});
```

### 2. **Resource Cards** (`context: 'resource'`)
**Purpose**: Activate internal strengths and resilience

**Session Flow**:
- Phase 1: Resource Identification (4-6 exchanges)
- Phase 2: Resource Deepening (6-10 exchanges)
- Phase 3: Resource Application (5-7 exchanges)

**Navigation**:
```typescript
router.push({
  pathname: '/screens/cards/therapy-chat',
  params: {
    context: 'resource',
    cardId: '12',
  },
});
```

### 3. **Positive/Negative Cards** (`context: 'positive_negative'`)
**Purpose**: Integrate polarity, explore ambivalence

**Session Flow**:
- Phase 1: Parallel Exploration (6-8 exchanges)
- Phase 2: Relational Dynamics (8-12 exchanges)
- Phase 3: Dialectical Integration (6-10 exchanges)

**Navigation**:
```typescript
router.push({
  pathname: '/screens/cards/therapy-chat',
  params: {
    context: 'positive_negative',
    positive_card_id: '7',
    negative_card_id: '14',
  },
});
```

### 4. **Narrative Cards** (`context: 'narrative'`)
**Purpose**: Re-author life narrative, heal wounds

**Session Flow**:
- Phase 1: Story Elicitation (5-7 exchanges)
- Phase 2: Deconstruction & Exceptions (8-12 exchanges)
- Phase 3: Re-Authoring & Claiming Voice (7-10 exchanges)

**Navigation**:
```typescript
router.push({
  pathname: '/screens/cards/therapy-chat',
  params: {
    context: 'narrative',
    cardId: '3',
  },
});
```

## 🔄 API Flow

### Starting a Session

```typescript
// Client → OpenAI
POST https://api.openai.com/v1/responses
{
  "prompt": {
    "id": "pmpt_xxxxx",
    "version": "1"
  },
  "messages": [
    {
      "role": "user",
      "content": "The client has selected Emotion Card #5..."
    }
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.8,
  "max_tokens": 1500
}

// OpenAI → Client
{
  "response": "Thank you for choosing this card..."
}
```

### Sending Messages (Streaming)

```typescript
// Client → OpenAI
POST https://api.openai.com/v1/responses
{
  "prompt": {
    "id": "pmpt_xxxxx",
    "version": "1"
  },
  "messages": [...previousMessages],
  "stream": true
}

// OpenAI → Client (SSE)
data: {"delta": "I"}
data: {"delta": " understand"}
data: {"delta": " that"}
...
data: [DONE]
```

### Requesting Summary

```typescript
// Client → OpenAI
POST https://api.openai.com/v1/responses
{
  "prompt": {
    "id": "pmpt_xxxxx",
    "version": "1"
  },
  "messages": [
    ...sessionMessages,
    {
      "role": "user",
      "content": "I'm ready for the session summary now."
    }
  ],
  "max_tokens": 3000
}

// OpenAI → Client
{
  "response": "🎴 THERAPEUTIC CARD SESSION SUMMARY\n━━━..."
}
```

## 📈 Session Management

### Exchange Tracking

```typescript
// Count exchanges (user messages)
const exchangeCount = messages.filter(m => m.role === 'user').length;

// Check if ready for closure
if (exchangeCount >= 20) {
  // Show "Request Summary" button
}

// Suggest summary at 25+
if (exchangeCount >= 25) {
  // Highlight summary button
}
```

### Session States

1. **Active**: 0-19 exchanges
   - Normal chat flow
   - No summary button

2. **Ready for Closure**: 20-24 exchanges
   - Summary button appears
   - User can continue or close

3. **Suggested Closure**: 25+ exchanges
   - Summary button highlighted
   - System suggests wrapping up

4. **Closed**: After summary
   - Input disabled
   - "Session Complete" message
   - "Close Session" button

### Summary Detection

```typescript
function isSummaryMessage(content: string): boolean {
  const indicators = [
    '🎴 THERAPEUTIC CARD SESSION SUMMARY',
    'SESSION SUMMARY',
    '📋 SESSION DETAILS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];
  
  return indicators.some(indicator => content.includes(indicator));
}
```

## 🎨 UI/UX Features

### Exchange Counter
- Bottom-right badge showing current exchange count
- Updates in real-time
- Color changes as approaching 25+

### Summary Request Button
- Appears in header at 20+ exchanges
- Opens confirmation dialog
- Generates comprehensive summary

### Streaming Indicator
- Typing dots animation during AI response
- Real-time text streaming
- Smooth user experience

### Session Closed Overlay
- Replaces input area when session complete
- Displays "Session Complete" message
- "Close Session" button to exit

## 🧪 Testing

### Manual Test Checklist

1. **Emotion Card Session**
   - [ ] Select emotion card
   - [ ] Receive welcoming opening (2-3 exchanges)
   - [ ] Progress through exploration (15-20 exchanges)
   - [ ] See exchange counter update
   - [ ] Summary button appears at 20+
   - [ ] Request summary
   - [ ] Receive formatted summary
   - [ ] Session closes properly

2. **Resource Card Session**
   - [ ] Same flow as above
   - [ ] Verify resource-specific questions
   - [ ] Check summary includes resources identified

3. **Positive/Negative Cards**
   - [ ] Select two cards
   - [ ] Receive both/and exploration
   - [ ] Verify dialectical integration
   - [ ] Summary includes polarity work

4. **Streaming**
   - [ ] Verify real-time text streaming
   - [ ] No lag or blocking
   - [ ] Smooth character-by-character display

5. **Error Handling**
   - [ ] Test without API key
   - [ ] Test with invalid prompt ID
   - [ ] Test network interruption
   - [ ] Verify error alerts

## 📊 Summary Format

The AI generates a comprehensive summary with these sections:

```
🎴 THERAPEUTIC CARD SESSION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SESSION DETAILS
💡 KEY INSIGHTS & THEMES
🎯 EMOTIONAL LANDSCAPE EXPLORED
💪 RESOURCES & STRENGTHS IDENTIFIED
🔄 PATTERNS & CONNECTIONS REVEALED
🌱 GROWTH EDGES & QUESTIONS TO CARRY FORWARD
🎯 NEXT STEPS & INTENTIONS
✨ CLOSING REFLECTION
📞 RESOURCES & SUPPORT
```

## 🔧 Customization

### Adjusting Session Length

Edit `cardTherapyService.ts`:

```typescript
isSessionReadyForClosure(messages: ChatMessage[]): boolean {
  const exchanges = this.countExchanges(messages);
  return exchanges >= 15; // Change from 20
}

shouldSuggestSummary(messages: ChatMessage[]): boolean {
  const exchanges = this.countExchanges(messages);
  return exchanges >= 20; // Change from 25
}
```

### Changing Models

Edit `cardTherapyService.ts`:

```typescript
model: 'gpt-4o', // Change from gpt-4o-mini
temperature: 0.9, // Adjust creativity
max_tokens: 2000, // Adjust response length
```

### Adding New Card Types

1. Add new card type to `CardContext`:

```typescript
interface CardContext {
  cardType: 'emotion' | 'resource' | 'positive_negative' | 'narrative' | 'YOUR_NEW_TYPE';
  // ...
}
```

2. Add case in `buildContextMessage()`:

```typescript
case 'YOUR_NEW_TYPE':
  return `The client has selected YOUR_NEW_TYPE Card #${cardId}. Use the YOUR_NEW_TYPE_PROTOCOL...`;
```

3. Update stored prompt with new protocol

## 🐛 Troubleshooting

### "Failed to start session"
- Check API key is set correctly
- Verify prompt ID is valid
- Test API key with curl

### "Streaming not available"
- Falls back to non-streaming automatically
- Check if running on React Native (no ReadableStream)
- Works on web by default

### Summary not generated
- Ensure 20+ exchanges
- Check if user explicitly requested summary
- Verify max_tokens is sufficient (3000+)

### Messages not streaming
- Check network connection
- Verify SSE parsing in service
- Test with non-streaming fallback

## 📚 Resources

### Therapeutic Modalities Used
- **SFBT**: Solution-Focused Brief Therapy
- **Narrative Therapy**: Michael White & David Epston
- **EFT**: Emotion-Focused Therapy (Greenberg)
- **IFS**: Internal Family Systems (Schwartz)
- **DBT**: Dialectical Behavioral Therapy (Linehan)

### Further Reading
- `THERAPEUTIC_CARDS_SYSTEM_PROMPT.md` - Full prompt documentation
- `services/cardTherapyService.ts` - Service implementation
- `app/screens/cards/therapy-chat.tsx` - Chat UI implementation

## 🎯 Next Steps

1. **Create Stored Prompt on OpenAI** ✓
2. **Configure Prompt ID** ✓
3. **Test each card type** 
4. **Gather user feedback**
5. **Iterate on prompt based on sessions**
6. **Add analytics tracking**
7. **Implement session history**
8. **Add session export/share**

---

**Built with ❤️ using evidence-based therapeutic principles and modern AI**
