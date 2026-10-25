import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari/500Medium';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import { fontFamily } from '@/theme/typography';

export type FontFamilies = { [Weight in keyof typeof fontFamily]: string };

/**
 * Space Grotesk has no Devanagari, so Hindi is set in Noto Sans Devanagari at
 * the same four weights. It carries Latin too, so a name or a number inside a
 * Hindi screen matches the words around it.
 */
export const devanagariFontFamily: FontFamilies = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_500Medium',
  semibold: 'NotoSansDevanagari_600SemiBold',
  bold: 'NotoSansDevanagari_700Bold',
};

/** Loaded only once someone picks Hindi, so English pays nothing for it. */
export const DEVANAGARI_FONTS = {
  [devanagariFontFamily.regular]: NotoSansDevanagari_400Regular,
  [devanagariFontFamily.medium]: NotoSansDevanagari_500Medium,
  [devanagariFontFamily.semibold]: NotoSansDevanagari_600SemiBold,
  [devanagariFontFamily.bold]: NotoSansDevanagari_700Bold,
};

const DEVANAGARI_FOR: Record<string, string> = {
  [fontFamily.regular]: devanagariFontFamily.regular,
  [fontFamily.medium]: devanagariFontFamily.medium,
  [fontFamily.semibold]: devanagariFontFamily.semibold,
  [fontFamily.bold]: devanagariFontFamily.bold,
};

/**
 * Vowel signs sit above and below a Devanagari line, so it needs more room
 * than the Latin scale gives it — Noto's own line is 1.3 em; this leaves a
 * little air on top of that.
 */
const DEVANAGARI_LINE_HEIGHT = 1.45;

/**
 * A text style made right for Devanagari: the line tall enough that matras are
 * not clipped, and no letter-spacing — spacing pulls apart the headline that
 * joins the letters of a word. With `swapFont`, the matching Noto weight too.
 */
export function devanagariTextStyle(style: StyleProp<TextStyle>, swapFont: boolean): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const size = flat.fontSize ?? 14;
  return {
    ...flat,
    ...(swapFont && flat.fontFamily ? { fontFamily: DEVANAGARI_FOR[flat.fontFamily] ?? flat.fontFamily } : null),
    letterSpacing: 0,
    lineHeight: Math.max(flat.lineHeight ?? 0, Math.ceil(size * DEVANAGARI_LINE_HEIGHT)),
  };
}
