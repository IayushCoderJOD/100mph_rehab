import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAsync } from 'expo-font';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { fontFamily } from '@/theme/typography';
import { DEFAULT_LANGUAGE, LANGUAGES, Language, setCurrentLanguage } from './current';
import type { Strings } from './en';
import { DEVANAGARI_FONTS, FontFamilies, devanagariFontFamily } from './fonts';
import { Localizer, localizer } from './localize';
import { stringsFor } from './strings';

const STORAGE_KEY = 'app.language';

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** The app's own copy in the current language. */
  t: Strings;
  /** The practice's content — exercises, lessons — in the current language, where a translation exists. */
  localize: Localizer;
  /** The families to set type in: Devanagari ones once Hindi is chosen and its font has loaded. */
  fonts: FontFamilies;
  /** Text is Devanagari, so it needs its own line height and spacing. */
  devanagari: boolean;
  /** The Devanagari font is ready to swap in. Until then the system's own draws Hindi. */
  devanagariFontReady: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * The language the app is shown in, chosen from the dropdown on sign-in and in
 * Settings, and remembered on the device like the theme is. English unless
 * someone picks otherwise.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (LANGUAGES.includes(stored as Language)) {
          setCurrentLanguage(stored as Language);
          setLanguageState(stored as Language);
        }
      })
      // Storage the browser refuses is no reason not to open the app.
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Only Hindi needs the Devanagari font, so only Hindi downloads it. If it
  // never arrives the system font still draws every letter, just less evenly.
  useEffect(() => {
    if (language !== 'hi' || fontReady) return;
    loadAsync(DEVANAGARI_FONTS)
      .then(() => setFontReady(true))
      .catch(() => {});
  }, [language, fontReady]);

  // Tells the browser — and a screen reader — which language the page is in.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    // Before the re-render, so copy built outside React is in the new language too.
    setCurrentLanguage(next);
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => {
    const devanagari = language === 'hi';
    return {
      language,
      setLanguage,
      t: stringsFor(language),
      localize: localizer(language),
      fonts: devanagari && fontReady ? devanagariFontFamily : fontFamily,
      devanagari,
      devanagariFontReady: devanagari && fontReady,
    };
  }, [language, fontReady, setLanguage]);

  if (!hydrated) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}
