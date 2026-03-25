'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { translations, Language, Translations } from './translations';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useLocalStorage<Language>('app-language', 'en');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, [setLanguageState]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
