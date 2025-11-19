# 🎯 Context-Aware API Strategy - სესიის კონტექსტის შენარჩუნება

## ❌ **პრობლემა:**

**Before:**
- სურათის გაგზავნა → Chat Completions API (GPT-4o)
- შემდეგი text მესიჯები → Responses API (Prompt v7)
- ❌ **Context იკარგებოდა** - AI არ ახსოვდა რა სურათზე ისაუბრა

**Example:**
```
User: [sends drawing image]
AI (GPT-4o): "I see blue colors representing sadness..."

User: "Why do you think I chose blue?"
AI (Prompt v7): "I don't have information about any drawing..." ❌
```

---

## ✅ **გადაწყვეტა: Session-Aware API Selection**

### **Smart Routing Logic:**
```typescript
if (hasImageInSession) {
  // Use Chat Completions for ENTIRE session
  return callOpenAIChatAPI(); // With full conversation history
} else {
  // Use Responses API only for pure text sessions
  return Responses API;
}
```

### **Key Feature: `hasImageInSession` Flag**
```typescript
private hasImageInSession: boolean = false;

// Set flag when image is sent
if (imageUri?.startsWith('data:image/')) {
  this.hasImageInSession = true;
}

// Reset on new session
startNewSession() {
  this.hasImageInSession = false;
}
```

---

## 🔄 **How It Works**

### **Scenario 1: Pure Text Session**
```
User: "I'm feeling anxious"
  ↓ hasImageInSession = false
  ↓ Use Responses API
AI (Prompt v7): Full clinical schema

User: "Can you help me?"
  ↓ hasImageInSession = false
  ↓ Use Responses API
AI (Prompt v7): Full clinical schema
```

### **Scenario 2: Session with Image**
```
User: [sends drawing]
  ↓ hasImageInSession = TRUE
  ↓ Use Chat Completions API
AI (GPT-4o): "I see your artwork..."

User: "Why do you think I drew this?"
  ↓ hasImageInSession = TRUE ✅
  ↓ Use Chat Completions API WITH HISTORY
AI (GPT-4o): "Based on the drawing you shared,
              the blue colors and shapes suggest..." ✅
```

---

## 🧠 **Enhanced `callOpenAIChatAPI()`**

### **Features:**
1. **Full Conversation History** - ბოლო 20 მესიჯი (10 exchange)
2. **Image Support** - სურათები history-ში
3. **Context Continuity** - AI ხედავს მთელ საუბარს
4. **System Prompt** - იყენებს cached Prompt v7 instructions

### **Message Building:**
```typescript
const messages: any[] = [
  { role: 'system', content: systemPrompt }
];

// Add conversation history
for (const msg of recentHistory) {
  if (msg.type === 'user') {
    if (msg.imageUri) {
      // Message with image
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: msg.content },
          { type: 'image_url', image_url: { url: msg.imageUri } }
        ]
      });
    } else {
      // Text message
      messages.push({
        role: 'user',
        content: msg.content
      });
    }
  } else {
    // AI response
    messages.push({
      role: 'assistant',
      content: msg.content
    });
  }
}
```

---

## 📊 **API Selection Matrix**

| Situation | `hasImageInSession` | API Used | Context |
|-----------|---------------------|----------|---------|
| Text only, new session | `false` | Responses | Full prompt |
| Text only, ongoing | `false` | Responses | History in string |
| Image sent | `true` | Chat Completions | Full messages |
| Text after image | `true` | Chat Completions | **WITH IMAGE CONTEXT** ✅ |
| New session starts | `false` | Reset & Responses | Fresh start |

---

## 🎯 **Conversation History Format**

### **Chat Completions API (when `hasImageInSession = true`):**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are Dr. Sophia Chen..."
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Here's my drawing" },
        { "type": "image_url", "image_url": { "url": "data:image/..." } }
      ]
    },
    {
      "role": "assistant",
      "content": "I notice predominantly blue colors..."
    },
    {
      "role": "user",
      "content": "Why blue?"
    },
    {
      "role": "assistant",
      "content": "Based on your drawing, blue often represents..."
    }
  ]
}
```

### **Responses API (when `hasImageInSession = false`):**
```json
{
  "model": "gpt-5-chat-latest",
  "prompt": { "id": "...", "version": "7" },
  "input": "Session context:\nClient: I'm anxious\nTherapist: Let's explore...\n\nCurrent: Can you help?"
}
```

---

## 🔄 **Session Lifecycle**

### **1. Session Start:**
```typescript
startNewSession() {
  this.sessionHistory = [];
  this.hasImageInSession = false; // ✅ Reset flag
}
```

### **2. Text Messages (no image yet):**
```typescript
processMessage("I'm feeling sad") {
  // hasImageInSession = false
  → Responses API
}
```

### **3. Image Sent:**
```typescript
processMessage("Here's my drawing", imageUri) {
  this.hasImageInSession = true; // ✅ Set flag
  → Chat Completions API
}
```

### **4. Follow-up Messages:**
```typescript
processMessage("What does this mean?") {
  // hasImageInSession = true ✅
  → Chat Completions API WITH FULL HISTORY
  // AI can reference the image!
}
```

### **5. New Session:**
```typescript
startNewSession() {
  this.hasImageInSession = false; // ✅ Reset
  → Back to Responses API for pure text
}
```

---

## 💡 **Example Conversation**

### **With Context Continuity:**
```
👤 User: [sends drawing with dark colors]

🤖 AI (GPT-4o): "I notice your artwork uses predominantly 
    dark blues and grays. The heavy lines suggest intensity. 
    What were you feeling as you created this?"

👤 User: "I was thinking about my childhood"

🤖 AI (GPT-4o): "The dark colors in your drawing might 
    reflect the weight of those childhood memories. 
    The heavy lines could represent the intensity of 
    those feelings. Can you tell me more about what 
    comes up when you look at the drawing now?"
    ✅ AI remembers the drawing!

👤 User: "The shapes feel chaotic"

🤖 AI (GPT-4o): "Yes, I see that in the angular, overlapping 
    shapes in your artwork. Chaos in art often mirrors 
    inner emotional turbulence. The dark colors combined 
    with chaotic shapes suggest unprocessed emotions..."
    ✅ AI references specific visual elements!
```

---

## 🎨 **Benefits**

### 1. **Context Continuity**
- ✅ AI remembers what was discussed about the image
- ✅ Can reference specific visual elements later
- ✅ Builds on previous insights

### 2. **Natural Conversation**
- ✅ User doesn't need to repeat image description
- ✅ Flows like real therapy session
- ✅ Deeper exploration possible

### 3. **Therapeutic Value**
- ✅ Art therapy becomes multi-turn dialogue
- ✅ Can explore symbolism deeper
- ✅ Process emotions through visual discussion

### 4. **Efficiency**
- ✅ Optimal API selection
- ✅ Full prompt for text-only sessions
- ✅ Vision model only when needed

---

## 📋 **Code Highlights**

### **Session Flag:**
```typescript
private hasImageInSession: boolean = false;
```

### **Image Detection:**
```typescript
if (imageUri?.startsWith('data:image/')) {
  this.hasImageInSession = true;
}
```

### **Smart Routing:**
```typescript
const shouldUseChatAPI = isBase64Image || this.hasImageInSession;
if (shouldUseChatAPI) {
  return await this.callOpenAIChatAPI(userMessage, imageUri);
}
```

### **History Building:**
```typescript
// Include images in conversation history
if (msg.imageUri && msg.imageUri.startsWith('data:image/')) {
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: msg.content },
      { type: 'image_url', image_url: { url: msg.imageUri } }
    ]
  });
}
```

### **Session Reset:**
```typescript
startNewSession(): void {
  this.sessionHistory = [];
  this.hasImageInSession = false; // Reset for new session
}
```

---

## 🧪 **Testing Scenarios**

### Test 1: Pure Text Session
```
✅ User: "I'm anxious"
   → Responses API
✅ User: "Can you help?"
   → Responses API
✅ hasImageInSession = false throughout
```

### Test 2: Image Then Text
```
✅ User: [sends image]
   → Chat API, hasImageInSession = true
✅ User: "What do you see?"
   → Chat API WITH image in history
✅ User: "The colors represent..."
   → Chat API, AI remembers drawing
```

### Test 3: New Session After Image
```
✅ User: [sends image in session 1]
   → hasImageInSession = true
✅ Click "New Session"
   → hasImageInSession = false
✅ User: "I'm feeling better"
   → Responses API (fresh start)
```

### Test 4: Multiple Images
```
✅ User: [sends image 1]
   → hasImageInSession = true
✅ User: "What about this?"
   → Chat API with image 1 in history
✅ User: [sends image 2]
   → Chat API with BOTH images in history
✅ User: "Compare them"
   → Chat API can reference both! ✅
```

---

## ✅ **Status**

- ✅ TypeScript: 0 errors
- ✅ Session tracking: `hasImageInSession` flag
- ✅ Context continuity: Full conversation history
- ✅ API selection: Automatic based on session
- ✅ Image memory: Images preserved in history
- ✅ Session reset: Clean new sessions

---

## 🎉 **Result**

**ახლა AI ახსოვს სრულიად საუბარი სურათის შესახებ!**

```
როცა სურათს აგზავნი:
  ↓
hasImageInSession = true
  ↓
ყველა მომდევნო მესიჯი → Chat Completions API
  ↓
AI ხედავს მთელ საუბარს, მათ შორის სურათს
  ↓
✅ Context სრულად შენარჩუნებულია!
```

**No more context loss!** 🚀
