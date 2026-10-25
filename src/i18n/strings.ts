import { Language, currentLanguage } from './current';
import { Strings, en } from './en';
import { hi } from './hi';

const TABLES: Record<Language, Strings> = { en, hi };

export function stringsFor(language: Language): Strings {
  return TABLES[language];
}

/**
 * The current language's copy, for code outside React: error messages raised
 * in a provider or the upload pipeline. Components read `useI18n().t`, which
 * also re-renders them when the language changes.
 */
export function strings(): Strings {
  return TABLES[currentLanguage()];
}
