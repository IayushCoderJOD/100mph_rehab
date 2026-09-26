import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { useHover } from '@/hooks/useHover';

type IconButtonProps = {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  variant?: 'plain' | 'outline' | 'soft';
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  variant = 'outline',
  style,
}: IconButtonProps) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  const background =
    variant === 'soft' ? theme.colors.surfaceAlt : variant === 'outline' ? 'transparent' : 'transparent';

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          // hitSlop makes the target bigger than it looks, which on a mouse
          // means the hover fill is the only honest edge of the control.
          backgroundColor: hovered ? theme.colors.surfaceAlt : background,
          borderColor: variant === 'outline' ? theme.colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
