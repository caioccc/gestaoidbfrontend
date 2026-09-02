import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SupportedLocale } from './translations';

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: typeof translations['pt-br'];
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportedLocale>('pt-br');

  useEffect(() => {
    const saved = localStorage.getItem('idb_locale') as SupportedLocale;
    if (saved && ['pt-br', 'en', 'es'].includes(saved)) {
      setLocale(saved);
    }
  }, []);

  const changeLocale = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    localStorage.setItem('idb_locale', newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale: changeLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);