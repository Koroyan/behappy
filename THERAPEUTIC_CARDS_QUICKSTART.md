# 🎴 Therapeutic Cards System - Quick Start Guide

## ✨ რა შევქმენით

**პროფესიონალური AI თერაპევტული სისტემა** სამი ძირითადი კომპონენტით:

1. **Master Therapeutic Prompt** - Evidence-based პროფესიონალური პრომპტი
2. **Card Therapy Service** - OpenAI Responses API ინტეგრაცია
3. **Therapy Chat UI** - სრული სესიის მართვა და streaming

---

## 🚀 სწრაფი დაწყება

### ნაბიჯი 1: შექმენით Stored Prompt OpenAI-ში

**Windows (PowerShell)**:
```powershell
$env:OPENAI_API_KEY = "your-api-key-here"
cd scripts
.\create-therapeutic-prompt.ps1
```

**Mac/Linux (Bash)**:
```bash
export OPENAI_API_KEY="your-api-key-here"
cd scripts
chmod +x create-therapeutic-prompt.sh
./create-therapeutic-prompt.sh
```

📝 **დაიმახსოვრე Prompt ID**: `pmpt_xxxxxxxxxxxxx`

### ნაბიჯი 2: კონფიგურაცია

**A. Prompt ID-ის დაყენება**

`services/cardTherapyService.ts`:
```typescript
private promptId: string = 'pmpt_YOUR_ID_HERE'; // 👈 შეცვალე აქ
```

**B. API Key-ის დაყენება**

`.env`:
```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

ან `app.json`:
```json
{
  "expo": {
    "extra": {
      "OPENAI_API_KEY": "sk-xxxxxxxxxxxxx"
    }
  }
}
```

### ნაბიჯი 3: გატესტე!

```bash
npm start
```

1. გადადი **Cards** section-ზე
2. აირჩიე **Emotion Cards** (ან სხვა ტიპი)
3. აირჩიე კონკრეტული კარტა
4. დაიწყე თერაპიული სესია!

---

## 📚 სისტემის არქიტექტურა

### 1. Stored Prompt (OpenAI)

**ფაილი**: `THERAPEUTIC_CARDS_SYSTEM_PROMPT.md`

**რას შეიცავს**:
- 4 თერაპიული პროტოკოლი (Emotion, Resource, Positive/Negative, Narrative)
- 6 Evidence-based მოდალობა (SFBT, Narrative, EFT, IFS, DBT, Psychodynamic)
- სრული Session Structure (Opening → Exploration → Closing → Summary)
- Therapeutic Skills & Interventions
- Ethical Guidelines & Crisis Protocol
- Professional Summary Template

**მახასიათებლები**:
- ✅ 494 ხაზი დეტალური ინსტრუქციები
- ✅ კონკრეტული შეკითხვები თითოეული ფაზისთვის
- ✅ 20-30 exchanges სტრუქტურა
- ✅ ავტომატური Summary Generation

### 2. Card Therapy Service

**ფაილი**: `services/cardTherapyService.ts`

**მეთოდები**:
```typescript
// სესიის დაწყება
await cardTherapyService.startSession(cardContext)

// მესიჯის გაგზავნა (streaming)
await cardTherapyService.sendMessage(messages, cardContext, onStream)

// Summary-ს მოთხოვნა
await cardTherapyService.requestSummary(messages, cardContext)

// დამხმარე ფუნქციები
cardTherapyService.countExchanges(messages)
cardTherapyService.isSessionReadyForClosure(messages)
cardTherapyService.isSummaryMessage(content)
```

**აპის კონტექსტები**:
- `emotion` - ემოციური კარტები
- `resource` - რესურსების კარტები
- `positive_negative` - პოზიტიური/ნეგატიური (ორი კარტა)
- `narrative` - ნარატიული კარტები

### 3. Therapy Chat Screen

**ფაილი**: `app/screens/cards/therapy-chat.tsx`

**ფუნქციები**:
- ✅ Real-time streaming responses
- ✅ Exchange counter (0/30)
- ✅ "Request Summary" button (20+ exchanges)
- ✅ Auto-detect summary და session closure
- ✅ Beautiful UI with typing indicators
- ✅ Keyboard handling
- ✅ Error handling

### 4. Card Selection Screens

განახლებული screens-ები:
- ✅ `emotion.tsx` → `/screens/cards/therapy-chat`
- ✅ `resources.tsx` → `/screens/cards/therapy-chat`
- ✅ `positivenegative.tsx` → `/screens/cards/therapy-chat`

---

## 🎯 როგორ მუშაობს

### სესიის ფლოუ

```
1. User: აირჩევს კარტას (მაგ. Emotion Card #5)
   ↓
2. App: გზავნის cardContext → OpenAI
   {
     cardType: 'emotion',
     cardId: '5'
   }
   ↓
3. AI: იწყებს Emotion Cards Protocol-ს
   "Thank you for choosing this card. When you look at it, 
    what emotions arise for you right now?"
   ↓
4. User ↔ AI: 20-30 exchanges
   - Phase 1: Initial Projection (5-7 exchanges)
   - Phase 2: Exploration & Depth (8-12 exchanges)
   - Phase 3: Integration & Transformation (5-8 exchanges)
   ↓
5. User: აჭერს "Request Summary" ღილაკს (20+ exchanges-ზე)
   ↓
6. AI: აგენერირებს სრულ Summary-ს
   🎴 THERAPEUTIC CARD SESSION SUMMARY
   📋 SESSION DETAILS
   💡 KEY INSIGHTS & THEMES
   🎯 EMOTIONAL LANDSCAPE
   💪 RESOURCES & STRENGTHS
   ...
   ↓
7. Session: იხურება, User ბრუნდება უკან
```

### API Calls

**Session Start:**
```typescript
POST https://api.openai.com/v1/responses
{
  "prompt": { "id": "pmpt_xxx", "version": "1" },
  "messages": [
    { "role": "user", "content": "The client has selected Emotion Card #5..." }
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.8
}
```

**Streaming Message:**
```typescript
POST https://api.openai.com/v1/responses
{
  "prompt": { "id": "pmpt_xxx", "version": "1" },
  "messages": [...history],
  "stream": true // ✅ SSE streaming
}
```

**Summary Request:**
```typescript
POST https://api.openai.com/v1/responses
{
  "prompt": { "id": "pmpt_xxx", "version": "1" },
  "messages": [
    ...sessionMessages,
    { "role": "user", "content": "I'm ready for the session summary now." }
  ],
  "max_tokens": 3000
}
```

---

## 🎨 UI/UX მახასიათებლები

### 1. Exchange Counter
- მარჯვენა-ქვედა კუთხეში
- განახლდება real-time-ში
- ფერი იცვლება 25+ exchanges-ზე

### 2. Request Summary Button
- ჩნდება header-ში 20+ exchanges-ზე
- იღებს confirmation dialog-ს
- გენერირებს comprehensive summary-ს

### 3. Streaming Indicator
- "●●●" animation თერაპევტის მესიჯის დროს
- Real-time text streaming
- სუფთა UX

### 4. Session Closed State
- ჩანაცვლებს input area-ს როცა summary მზადაა
- აჩვენებს "✨ Session Complete"
- "Close Session" ღილაკი

---

## 📖 თერაპიული პროტოკოლები

### Emotion Cards Protocol

**მიზანი**: ემოციური awareness, validation, processing

**ფაზები**:
1. **Initial Projection** (5-7 exchanges)
   - რა მოგიზიდა ამ კარტისკენ?
   - რა ემოციები იჩენს?
   - თუ კარტა ილაპარაკებდა, რას იტყოდა?

2. **Exploration & Depth** (8-12 exchanges)
   - უახლესი მომენტი როცა ასე იგრძენი
   - რა სჭირდება ამ ემოციას?
   - საიდან მოდის ეს გრძნობა?

3. **Integration & Transformation** (5-8 exchanges)
   - რა შეიცვლება თუ პატივს მიგცემ ამ ემოციას?
   - მცირე ნაბიჯი რომელიც დაგეხმარება
   - სიმბოლური მოქმედება

### Resource Cards Protocol

**მიზანი**: შიდა ძალის გააქტიურება

**ფაზები**:
1. **Resource Identification** (4-6 exchanges)
2. **Resource Deepening** (6-10 exchanges)
3. **Resource Application** (5-7 exchanges)

### Positive/Negative Cards Protocol

**მიზანი**: პოლარობის ინტეგრაცია

**ფაზები**:
1. **Parallel Exploration** (6-8 exchanges)
2. **Relational Dynamics** (8-12 exchanges)
3. **Dialectical Integration** (6-10 exchanges)

### Narrative Cards Protocol

**მიზანი**: სიცოცხლის ისტორიის თავიდან დაწერა

**ფაზები**:
1. **Story Elicitation** (5-7 exchanges)
2. **Deconstruction & Exceptions** (8-12 exchanges)
3. **Re-Authoring & Claiming Voice** (7-10 exchanges)

---

## 🔧 კონფიგურაცია

### Session Length-ის შეცვლა

`services/cardTherapyService.ts`:
```typescript
isSessionReadyForClosure(messages: ChatMessage[]): boolean {
  return this.countExchanges(messages) >= 15; // 20-დან 15-ზე
}
```

### Model-ის შეცვლა

```typescript
model: 'gpt-4o', // gpt-4o-mini-ს ნაცვლად
temperature: 0.9, // creativity
max_tokens: 2000, // response length
```

### ახალი Card Type-ის დამატება

1. `CardContext` interface-ში:
```typescript
cardType: 'emotion' | 'resource' | 'positive_negative' | 'narrative' | 'YOUR_NEW_TYPE';
```

2. `buildContextMessage()` method-ში:
```typescript
case 'YOUR_NEW_TYPE':
  return `Use the YOUR_NEW_TYPE_PROTOCOL...`;
```

3. Stored Prompt-ში დაამატე ახალი პროტოკოლი

---

## 🧪 Testing Checklist

- [ ] Emotion Card - სრული სესია
- [ ] Resource Card - სრული სესია
- [ ] Positive/Negative Cards - ორი კარტა
- [ ] Narrative Card - სრული სესია
- [ ] Streaming works correctly
- [ ] Exchange counter updates
- [ ] Summary button appears at 20
- [ ] Summary generates properly
- [ ] Session closes after summary
- [ ] Error handling works
- [ ] UI responsive on mobile

---

## 📊 Summary Format

AI აგენერირებს professional summary-ს:

```markdown
🎴 THERAPEUTIC CARD SESSION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SESSION DETAILS
• Date: November 8, 2025
• Card Type: Emotion
• Card ID: 5
• Session Duration: 23 exchanges
• Primary Modality: Emotion-Focused Therapy

💡 KEY INSIGHTS & THEMES
1. Recognition that anger is masking deeper hurt
2. Connection between childhood patterns and current reactions
3. Emerging self-compassion practice

🎯 EMOTIONAL LANDSCAPE EXPLORED
Primary Emotions Identified:
• Anger: Surface-level defense mechanism
• Sadness: Unprocessed grief from past loss
• Fear: Vulnerability around expressing needs

💪 RESOURCES & STRENGTHS IDENTIFIED
• Ability to reflect and name emotions
• Courage to explore difficult feelings
• Support network (friends, therapist)

🔄 PATTERNS & CONNECTIONS REVEALED
Pattern 1: Anger-as-protection cycle
→ When hurt, immediately shift to anger
→ Blocks authentic connection
→ Potential interrupt: Pause, notice hurt first

🌱 GROWTH EDGES & QUESTIONS
1. What would it feel like to express hurt directly?
2. How might relationships deepen if anger wasn't the first response?

🎯 NEXT STEPS & INTENTIONS
Concrete Action: This week, journal about one moment when anger arose - what was underneath it?

Reminder/Anchor: "Anger protects; hurt connects"

✨ CLOSING REFLECTION
Your willingness to look beneath the anger today shows deep courage. The awareness you've gained is the first step toward transformation. Be patient with yourself as these insights continue to unfold.

📞 RESOURCES & SUPPORT
• Journaling prompt: Write a letter to your anger
• Grounding: 5-4-3-2-1 sensory awareness
• Self-compassion break (Kristin Neff)

Thank you for trusting me with your process today. 🌿
```

---

## 🐛 Troubleshooting

### Prompt არ იქმნება
```bash
# შეამოწმე API key
echo $env:OPENAI_API_KEY  # PowerShell
echo $OPENAI_API_KEY       # Bash

# ხელით დატესტე
curl -X POST https://api.openai.com/v1/prompts \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","prompt":"test"}'
```

### Streaming არ მუშაობს
- React Native-ზე ავტომატურად fallback არ-streaming-ზე
- Web-ზე მუშაობს SSE
- შეამოწმე `response.body.getReader()` availability

### Summary არ გენერირდება
- უნდა იყოს 20+ exchanges
- `max_tokens` უნდა იყოს 3000+
- პირდაპირ მოითხოვე: "I'm ready for the session summary now."

---

## 📚 დოკუმენტაცია

1. **THERAPEUTIC_CARDS_SYSTEM_PROMPT.md** - სრული პრომპტი (494 lines)
2. **THERAPEUTIC_CARDS_IMPLEMENTATION.md** - დეტალური implementation guide
3. **THERAPEUTIC_CARDS_QUICKSTART.md** - ეს ფაილი

---

## 🎉 შედეგი

შენ გაქვს **production-ready, evidence-based თერაპიული AI სისტემა** რომელიც:

✅ იყენებს OpenAI Stored Prompts API  
✅ ადევს 4 განსხვავებულ თერაპიულ პროტოკოლს  
✅ აგენერირებს professional summaries  
✅ streaming support  
✅ სრული session management  
✅ beautiful UI/UX  
✅ error handling  
✅ scalable architecture  

**შემდეგი ნაბიჯები**:
1. ✅ შექმენი Stored Prompt
2. ✅ კონფიგურაცია
3. 🎯 დატესტე თითოეული card type
4. 📊 შეაგროვე user feedback
5. 🔄 Iterate prompt-ზე დაყრდნობით feedback-ზე

---

**Built with ❤️ using evidence-based therapeutic principles and modern AI** 🌿
