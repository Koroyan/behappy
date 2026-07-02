import axios from 'axios';
import Constants from 'expo-constants';
import { API_KEY as FALLBACK_API_KEY } from './apiKey'; // Temporary fallback

// უსაფრთხოებისთვის API key-ს ნუ შენახავ კოდში, გამოიყენე .env ფაილი
const API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_KEY || process.env.EXPO_PUBLIC_API_KEY || FALLBACK_API_KEY;

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

// ახალი ფუნქცია სურათის ანალიზისთვის GPT Vision-ით
export const analyzeImageWithGPT = async (imageUri, systemPrompt, userMessage = "Analyze this artwork therapeutically") => {
  try {
    if (!API_KEY) {
      throw new Error('API key არ არის კონფიგურირებული');
    }

    console.log('Processing image URI:', imageUri.substring(0, 50) + '...');

    // Convert image to base64 for GPT Vision with better mobile support
    let base64Image;
    try {
      // Handle different URI formats (file://, content://, etc.)
      let processedUri = imageUri;
      
      console.log('Original image URI format:', imageUri.substring(0, 100));
      
      // For mobile file URIs, we need to handle them differently
      if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
        console.log('Processing mobile file/content URI...');
        
        // Use fetch with proper mobile handling
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('Image blob size:', blob.size, 'type:', blob.type);
        
        // Ensure we have a valid image
        if (blob.size === 0) {
          throw new Error('Empty image file');
        }
        
        // Validate image size (max 20MB for OpenAI)
        if (blob.size > 20 * 1024 * 1024) {
          throw new Error('Image too large (max 20MB)');
        }
        
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              // Remove data:image/...;base64, prefix
              const base64 = result.split(',')[1];
              if (base64 && base64.length > 0) {
                console.log('Base64 conversion successful for mobile file');
                resolve(base64);
              } else {
                reject(new Error('Failed to convert image to base64'));
              }
            } else {
              reject(new Error('FileReader returned non-string result'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      } else if (imageUri.startsWith('data:')) {
        console.log('Processing data URI...');
        // Already a data URI, extract base64 part
        const parts = imageUri.split(',');
        if (parts.length !== 2) {
          throw new Error('Invalid data URI format');
        }
        base64Image = parts[1];
        console.log('Extracted base64 from data URI, length:', base64Image.length);
      } else {
        console.log('Processing HTTP/HTTPS URI...');
        // For other URIs (http://, https://)
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('HTTP image blob size:', blob.size, 'type:', blob.type);
        
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result.split(',')[1]);
            } else {
              reject(new Error('Failed to process image'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      }

      console.log('Base64 conversion successful, length:', base64Image.length);
      
    } catch (error) {
      console.error('Error converting image:', error);
      throw new Error('სურათის კონვერტაცია ვერ მოხერხდა: ' + error.message);
    }

    // Validate base64 image
    if (!base64Image || base64Image.length < 100) {
      throw new Error('Invalid base64 image data');
    }

    // Enhanced auto-detection of image format and use appropriate MIME type
    let mimeType = 'image/png'; // Default to PNG since ViewShot uses PNG
    
    // Check the base64 signature for image type
    if (base64Image.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
      console.log('Detected JPEG format');
    } else if (base64Image.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png';
      console.log('Detected PNG format');
    } else if (base64Image.startsWith('R0lGODlh')) {
      mimeType = 'image/gif';
      console.log('Detected GIF format');
    } else if (base64Image.startsWith('UklGR')) {
      mimeType = 'image/webp';
      console.log('Detected WebP format');
    } else {
      // If we can't detect the format, check the original URI
      if (imageUri.includes('.jpg') || imageUri.includes('.jpeg')) {
        mimeType = 'image/jpeg';
        console.log('Detected JPEG from URI');
      } else if (imageUri.includes('.png')) {
        mimeType = 'image/png';
        console.log('Detected PNG from URI');
      } else if (imageUri.includes('.gif')) {
        mimeType = 'image/gif';
        console.log('Detected GIF from URI');
      } else if (imageUri.includes('.webp')) {
        mimeType = 'image/webp';
        console.log('Detected WebP from URI');
      } else {
        // Default for ViewShot images (which are PNG)
        mimeType = 'image/png';
        console.log('Using default PNG format (likely ViewShot image)');
      }
    }

    console.log('Final MIME type:', mimeType);

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low' // Use 'low' for better mobile performance and lower token usage
              }
            }
          ]
        }
      ],
      max_tokens: 800, // Reduced for mobile performance
      temperature: 0.7,
      top_p: 0.9
    };

    console.log('Sending request to GPT Vision API...');

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log('GPT Vision API response received:', res.status);
    return res.data;
    
  } catch (err) {
    console.error('GPT Vision API შეცდომა:', err);
    
    // More detailed error handling
    if (err.response?.status === 400) {
      console.error('400 Error details:', err.response?.data);
      return 'სურათის ფორმატი არასწორია. გთხოვთ სცადოთ სხვა სურათი.';
    } else if (err.response?.status === 401) {
      return 'API key არასწორია. შეამოწმეთ კონფიგურაცია.';
    } else if (err.response?.status === 429) {
      return 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.';
    } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return 'მოთხოვნის დრო ამოიწურა. სცადეთ თავიდან.';
    }
    
    return 'სურათის ანალიზში შეცდომა მოხდა. სცადე თავიდან.';
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
