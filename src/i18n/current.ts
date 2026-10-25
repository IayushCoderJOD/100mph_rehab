export type Language = 'en' | 'hi';

export const LANGUAGES: Language[] = ['en', 'hi'];

/** Each language named in itself, so a reader finds theirs without reading the other. */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

export const DEFAULT_LANGUAGE: Language = 'en';

let current: Language = DEFAULT_LANGUAGE;

/**
 * The language the app is showing, for code that runs outside React — error
 * copy, date formatting. LanguageProvider keeps it in step before it
 * re-renders, so anything a screen computes while rendering reads the new one.
 *
 * Deliberately imports nothing: calendar.ts depends on it, and the string
 * tables depend on calendar.ts.
 */
export function currentLanguage(): Language {
  return current;
}

export function setCurrentLanguage(language: Language): void {
  current = language;
}

/** The locale dates are written in. English keeps the device's own, as it always has. */
export function dateLocale(): string | undefined {
  return current === 'hi' ? 'hi-IN' : undefined;
}
