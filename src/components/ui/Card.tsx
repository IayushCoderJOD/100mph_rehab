import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type CardProps = {
  children: ReactNode;
  variant?: 'surface' | 'alt' | 'outline';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'surface', padded = true, style }: CardProps) {
  const { theme } = useTheme();

  const background =
    variant === 'alt'
      ? theme.colors.surfaceAlt
      : variant === 'outline'
        ? 'transparent'
        : theme.colors.surface;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing(5) : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
});
