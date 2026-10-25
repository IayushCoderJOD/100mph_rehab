import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { devanagariTextStyle, useI18n } from '@/i18n';
import { ThemeColors, useTheme } from '@/theme';
import { TextVariant, typography } from '@/theme/typography';

type ColorToken = keyof ThemeColors;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken | (string & {});
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
};

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...rest
}: TextProps) {
  const { theme } = useTheme();
  const { devanagari, devanagariFontReady } = useI18n();
  const token = theme.colors[color as keyof ThemeColors];
  const resolved = typeof token === 'string' ? token : color;

  const styles = [typography[variant], { color: resolved, textAlign: align }, style];

  return (
    <RNText
      {...rest}
      // English renders exactly as it always has; only Hindi is re-set.
      style={devanagari ? devanagariTextStyle(styles, devanagariFontReady) : styles}
    />
  );
}
