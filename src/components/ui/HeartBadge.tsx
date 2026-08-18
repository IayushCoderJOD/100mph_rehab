import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { HeartMark } from './HeartMark';

type HeartBadgeProps = {
  size?: number;
  glow?: boolean;
};

/** The heart mark in a glowing accent ring. */
export function HeartBadge({ size = 96, glow = false }: HeartBadgeProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: theme.colors.accent,
          backgroundColor: theme.colors.accentSoft,
        },
        glow && {
          shadowColor: theme.colors.accentGlow,
          shadowOpacity: 0.9,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
        },
      ]}
    >
      <HeartMark size={size * 0.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
