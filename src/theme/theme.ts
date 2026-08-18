import { palette } from './palette';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentText: string;
  accentSoft: string;
  accentBorder: string;
  onAccent: string;
  accentGradient: [string, string];
  accentGlow: string;

  success: string;
  danger: string;

  /** Chart marks are their own step: the UI accent is too light on a dark plot. */
  chartLine: string;
  chartFill: string;

  tabBar: string;
  tabInactive: string;
  overlay: string;
  inputBackground: string;
};

export type Theme = {
  mode: ThemeMode;
  colors: ThemeColors;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: (n: number) => number;
};

const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
const spacing = (n: number) => n * 4;

const darkColors: ThemeColors = {
  background: palette.ink900,
  surface: palette.ink800,
  surfaceAlt: palette.ink750,
  surfaceRaised: palette.ink700,
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',

  textPrimary: palette.white,
  textSecondary: palette.gray400,
  textMuted: palette.gray500,

  accent: palette.sky,
  accentText: palette.blueBright,
  accentSoft: 'rgba(45,200,235,0.12)',
  accentBorder: 'rgba(56,198,236,0.45)',
  onAccent: palette.white,
  accentGradient: [palette.cyan, palette.blue],
  accentGlow: 'rgba(45,190,235,0.5)',

  success: palette.sky,
  danger: palette.red,

  chartLine: palette.chartCyan,
  chartFill: 'rgba(14,155,210,0.9)',

  tabBar: 'rgba(11,11,12,0.92)',
  tabInactive: palette.gray500,
  overlay: 'rgba(0,0,0,0.6)',
  inputBackground: palette.ink800,
};

const lightColors: ThemeColors = {
  background: palette.paper,
  surface: palette.paper2,
  surfaceAlt: palette.gray100,
  surfaceRaised: palette.white,
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',

  textPrimary: palette.ink850,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,

  accent: palette.blue,
  accentText: palette.blueDeep,
  accentSoft: 'rgba(30,99,224,0.10)',
  accentBorder: 'rgba(30,99,224,0.40)',
  onAccent: palette.white,
  accentGradient: [palette.cyan, palette.blue],
  accentGlow: 'rgba(30,120,220,0.35)',

  success: palette.blueDeep,
  danger: palette.redDeep,

  chartLine: palette.blue,
  chartFill: 'rgba(30,99,224,0.9)',

  tabBar: 'rgba(245,245,242,0.92)',
  tabInactive: palette.gray500,
  overlay: 'rgba(0,0,0,0.35)',
  inputBackground: palette.white,
};

export const darkTheme: Theme = { mode: 'dark', colors: darkColors, radius, spacing };
export const lightTheme: Theme = { mode: 'light', colors: lightColors, radius, spacing };

export const themes: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme };
