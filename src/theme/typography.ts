import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'button';

export const typography: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 38, letterSpacing: 0.2 },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: 0.2 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  subtitle: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 20, letterSpacing: 0.3 },
};
