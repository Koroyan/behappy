import axios from 'axios';

// უსაფრთხოებისთვის API key-ს ნუ შენახავ კოდში, გამოიყენე .env ფაილი
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

export const sendMessageToGPT = async (messages, systemPrompt = null) => {
  try {
    if (!API_KEY) {
      throw new Error('API key არ არის კონფიგურირებული');
    }

    const requestBody = {
      model: 'gpt-4o',
      messages: systemPrompt ? [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messages }
      ] : (Array.isArray(messages) ? messages : [{ role: 'user', content: messages }]),
      max_tokens: 600,
      temperature: 0.8
    };

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    // Return full response for token tracking
    return res.data;
  } catch (err) {
    console.error('GPT API შეცდომა:', err);
    if (err.response?.status === 401) {
      return 'API key არასწორია. შეამოწმეთ კონფიგურაცია.';
    } else if (err.response?.status === 429) {
      return 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.';
    }
    return 'შეცდომა მოხდა. სცადე თავიდან.';
  }
};

export const generateAIResponse = async (prompt, systemPrompt = null) => {
  try {
    if (!API_KEY) {
      throw new Error('API key არ არის კონფიგურირებული');
    }

    const messages = [{ role: 'user', content: prompt }];
    
    const requestBody = {
      model: 'gpt-4o',
      messages: systemPrompt ? [
        { role: 'system', content: systemPrompt },
        ...messages
      ] : messages,
      max_tokens: 800,
      temperature: 0.7
    };

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    return res.data.choices?.[0]?.message?.content || 'Не удалось получить ответ.';
  } catch (err) {
    console.error('GPT API შეცდომა:', err);
    if (err.response?.status === 401) {
      return 'API key არასწორია. შეამოწმეთ კონფიგურაცია.';
    } else if (err.response?.status === 429) {
      return 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.';
    }
    return 'შეცდომა მოხდა. სცადე თავიდან.';
  }
};
