import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
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
  const token = theme.colors[color as keyof ThemeColors];
  const resolved = typeof token === 'string' ? token : color;

  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: resolved, textAlign: align }, style]}
    />
  );
}
