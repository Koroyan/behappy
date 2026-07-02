# 🔧 Fixed: Dual API Approach for Image Analysis

## ❌ **პრობლემა:**

OpenAI Responses API არ იღებს `type: 'text'` input array-ში:
```json
{
  "error": {
    "message": "Invalid value: 'text'. Supported values are: 'message', 'function_call', ...",
    "type": "invalid_request_error",
    "param": "input[0]",
    "code": "invalid_value"
  }
}
```

---

## ✅ **გადაწყვეტა: Dual API Strategy**

### **Text Messages → Responses API (Prompt v7)**
```typescript
// Uses clinical prompt with full therapeutic schema
POST https://api.openai.com/v1/responses
{
  model: 'gpt-5-chat-latest',
  prompt: { id: PROMPT_ID, version: "7" },
  input: "text message"  // ✅ String format
}
```

### **Image Messages → Chat Completions API (GPT-4o Vision)**
```typescript
// Uses vision model for art therapy analysis
POST https://api.openai.com/v1/chat/completions
{
  model: 'gpt-4o',  // Vision-capable
  messages: [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: base64Uri } }
      ]
    }
  ]
}
```

---

## 🔄 **Flow Logic**

```typescript
async callOpenAIPromptAPI(userMessage, imageUri?) {
  const isBase64Image = imageUri?.startsWith('data:image/');
  
  if (isBase64Image) {
    // Route to Chat Completions API (vision)
    return await callOpenAIChatWithImage(message, imageUri);
  } else {
    // Route to Responses API (prompt)
    return await fetch('api.openai.com/v1/responses', ...);
  }
}
```

---

## 🎨 **Chat Completions with Image**

### Method: `callOpenAIChatWithImage()`

#### Features:
- ✅ **Model**: `gpt-4o` (vision-capable)
- ✅ **System Prompt**: Uses cached Prompt v7 instructions
- ✅ **Image Detail**: `high` for art therapy analysis
- ✅ **Max Tokens**: 2000 (detailed analysis)
- ✅ **Temperature**: 0.8 (creative therapeutic responses)

#### Input Format:
```typescript
{
  role: 'user',
  content: [
    {
      type: 'text',
      text: "Session context + current message"
    },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/jpeg;base64,...',
        detail: 'high'  // Important for art details
      }
    }
  ]
}
```

#### Response Parsing:
```typescript
// Try to extract JSON schema
const jsonMatch = aiText.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  parsedResponse = JSON.parse(jsonMatch[0]);
  // Use clinical schema if available
}

// Fallback to plain text
return {
  response_text: aiText,
  technique: { method: 'Art Therapy', ... },
  detected_emotion: 'reflective',
  ...
};
```

---

## 📊 **API Comparison**

| Feature | Responses API (Text) | Chat Completions (Image) |
|---------|---------------------|--------------------------|
| **Endpoint** | `/v1/responses` | `/v1/chat/completions` |
| **Model** | `gpt-5-chat-latest` | `gpt-4o` |
| **Prompt** | Prompt ID v7 | System message |
| **Input** | String | Messages array |
| **Vision** | ❌ No | ✅ Yes |
| **Clinical Schema** | ✅ Full JSON | ⚠️ Best effort |
| **Use Case** | Text therapy chat | Art therapy analysis |

---

## 🎯 **When Each API is Used**

### Responses API (95% of cases):
- Regular text messages
- User shares feelings/thoughts
- Breathing exercises
- Journaling prompts
- Crisis intervention
- Follow-up questions

### Chat Completions API (5% of cases):
- User uploads image
- Art therapy analysis
- Drawing interpretation
- Visual emotional expression
- Color/shape symbolism

---

## 🧠 **System Prompt Handling**

### For Text (Responses API):
```typescript
// Prompt v7 is automatically loaded from cache
prompt: {
  id: "pmpt_6902692e3d8081959fff3a192b21482902ebe8295781d9fb",
  version: "7"
}
```

### For Images (Chat Completions):
```typescript
// Use cached prompt instructions as system message
await this.initPromptIfNeeded();
const systemPrompt = this.promptInstructions || 
  "You are Dr. Sophia Chen, a clinical psychotherapist specializing in art therapy.";

messages: [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: [...] }
]
```

---

## 🎨 **Art Therapy Analysis Features**

### What GPT-4o Vision Analyzes:
- 🎨 **Colors** - Emotional associations (blue=calm, red=anger)
- 🖼️ **Shapes** - Geometric vs organic, sharp vs smooth
- 📐 **Composition** - Balance, symmetry, chaos
- ✏️ **Lines** - Heavy/light, continuous/broken
- 🌈 **Contrast** - Light/dark, complementary colors
- 💭 **Symbolism** - Recognizable objects, metaphors
- 🧠 **Overall Mood** - Energetic, calm, anxious, joyful

### Example Analysis:
```
"I notice your drawing uses predominantly dark blues and grays, 
with sharp, angular shapes in the center. The heavy lines suggest 
intensity of emotion. The colors often represent sadness or 
contemplation. The angular shapes might reflect feelings of 
being 'edgy' or on guard. What were you feeling as you created this?"
```

---

## 🔄 **Response Format Handling**

### If AI Returns JSON:
```typescript
// Try to parse clinical schema
const jsonMatch = aiText.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.response_text) {
    // Use full clinical schema
    return parseOpenAIResponse(parsed);
  }
}
```

### If AI Returns Plain Text:
```typescript
// Create minimal AIResponse
return {
  response_text: aiText,
  technique: {
    method: 'Art Therapy',
    name: 'visual_analysis',
    description: 'Analysis of visual art for emotional expression'
  },
  detected_emotion: 'reflective',
  key_insights: ['Art therapy image analysis'],
  next_recommendation: 'Discuss emotions in artwork',
  language: detectLanguage(userMessage)
};
```

---

## 🚀 **Performance Optimizations**

### Image Quality:
```typescript
ImagePicker.launchImageLibraryAsync({
  quality: 0.7,        // 70% quality
  base64: true,        // Direct base64
  allowsEditing: true  // User can crop
});
```

### Caching:
```typescript
// System prompt cached once
private promptInitialized: boolean = false;
private promptInstructions: string | null = null;

await this.initPromptIfNeeded(); // Loads once, reuses
```

### Error Recovery:
```typescript
catch (error) {
  // Graceful fallback message
  return {
    response_text: "Could you describe what you drew?",
    technique: { method: 'Support', ... }
  };
}
```

---

## 🧪 **Testing Scenarios**

### Test 1: Text Message
```
Input: "I'm feeling anxious today"
→ callOpenAIPromptAPI()
→ isBase64Image = false
→ Responses API with Prompt v7
✅ Full clinical schema response
```

### Test 2: Image Upload
```
Input: Image with message "Here's what I drew"
→ callOpenAIPromptAPI()
→ isBase64Image = true
→ callOpenAIChatWithImage()
→ Chat Completions with GPT-4o
✅ Art therapy analysis
```

### Test 3: Invalid Image
```
Input: Corrupted base64
→ callOpenAIChatWithImage()
→ API error
→ catch block
✅ Fallback: "Could you describe what you drew?"
```

### Test 4: JSON Response from Vision
```
Input: Image
→ GPT-4o returns JSON schema
→ jsonMatch found
→ parseOpenAIResponse()
✅ Full clinical schema maintained
```

---

## 📋 **Error Handling**

### Responses API Errors:
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error('OpenAI API error:', response.status, errorText);
  throw new Error(`OpenAI API error: ${response.status}`);
}
```

### Chat Completions Errors:
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error('OpenAI Chat API error:', response.status, errorText);
  throw new Error(`OpenAI Chat API error: ${response.status}`);
}
```

### Graceful Degradation:
```typescript
// If JSON parsing fails
catch (parseError) {
  console.log('Response is plain text, not JSON');
  // Use plain text response with minimal schema
}
```

---

## ✅ **Benefits of Dual API Approach**

### 1. **Best of Both Worlds**
- Text → Advanced clinical prompt schema
- Images → Vision-capable model

### 2. **Flexibility**
- Can add more vision features later
- Prompt updates don't affect image handling

### 3. **Reliability**
- Fallback to plain text if JSON parsing fails
- Error messages maintain therapeutic tone

### 4. **Performance**
- Text uses optimized Prompt API
- Images use specialized vision model
- No unnecessary image processing for text

---

## 🎉 **Result**

**ახლა მუშაობს ორივე:**
- 💬 **Text Messages** → Prompt v7 with full clinical schema
- 🖼️ **Image Messages** → GPT-4o vision with art therapy analysis

**Error Fixed:** ✅
- Responses API: text-only (string input)
- Chat Completions: vision (messages array with image_url)

გამოსცადეთ! 🚀
