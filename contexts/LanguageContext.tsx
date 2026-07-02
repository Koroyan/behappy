import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export type AppLanguage =
  | 'en' // English
  | 'ka' // Georgian
  | 'ru' // Russian
  | 'hy' // Armenian
  | 'tr' // Turkish
  | 'az' // Azerbaijani
  | 'es' // Spanish
  | 'de' // German
  | 'fr' // French
  | 'pt' // Portuguese
  | 'id' // Indonesian
  | 'it' // Italian
  | 'ar' // Arabic (RTL)
  | 'hi' // Hindi
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'uk' // Ukrainian
  | 'pl'; // Polish

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = '@behappy_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('ru');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (
          [
            'en','ka','ru','hy','tr','az','es','de','fr','pt','id','it','ar','hi','zh','ja','ko','uk','pl'
          ] as string[]
        ).includes(saved)) {
          setLanguageState(saved as AppLanguage);
        } else {
          // Default to Russian temporarily
          setLanguageState('ru');
        }
      } catch (error) {
        console.log('Failed to load language preference:', error);
      }
      setLoaded(true);
    })();
  }, []);

  const setLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.log('Failed to save language preference:', error);
    }
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  // Show loading indicator instead of returning null
  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Provide fallback instead of throwing error
    console.warn('useLanguage used outside LanguageProvider, using default language');
    return {
      language: 'en' as AppLanguage,
      setLanguage: async () => {},
    };
  }
  return ctx;
};
