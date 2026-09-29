import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** `danger` is for the one-way actions — deleting an account — outlined in red rather than inviting. */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();
  const isDisabled = disabled || loading;
  const lifted = hovered && !isDisabled;

  const shell: ViewStyle = {
    borderRadius: theme.radius.pill,
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    // A pointer hovering a button should get an answer before it clicks. One
    // pixel of lift is enough to read as "live" without becoming an animation
    // the eye has to wait out. Never fires on a touch device.
    transform: lifted ? [{ translateY: -1 }] : undefined,
  };

  const content =
    variant === 'primary' ? (
      <Text variant="button" color="onAccent">
        {label}
      </Text>
    ) : (
      <Text variant="button" color={variant === 'ghost' ? 'textPrimary' : variant === 'danger' ? 'danger' : 'accentText'}>
        {label}
      </Text>
    );

  return (
    <Pressable
      {...rest}
      {...hoverProps}
      disabled={isDisabled}
      style={({ pressed }) => [shell, pressed && !isDisabled && styles.pressed, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.colors.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              shadowColor: theme.colors.accentGlow,
              borderRadius: theme.radius.pill,
              shadowOpacity: lifted ? 0.75 : 0.55,
            },
          ]}
        >
          {loading ? <ActivityIndicator color={theme.colors.onAccent} /> : content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            {
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor:
                variant === 'secondary'
                  ? theme.colors.accentBorder
                  : variant === 'danger'
                    ? theme.colors.danger
                    : lifted
                      ? theme.colors.borderStrong
                      : theme.colors.border,
              // An outlined button has no fill to brighten, so hover fills it
              // instead — the border alone is too quiet to register.
              backgroundColor:
                variant === 'secondary'
                  ? theme.colors.accentSoft
                  : lifted
                    ? theme.colors.surface
                    : 'transparent',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={variant === 'danger' ? theme.colors.danger : theme.colors.textPrimary} />
          ) : (
            content
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.98 }] },
});
