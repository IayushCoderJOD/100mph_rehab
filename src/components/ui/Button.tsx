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
import { useTheme } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

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
  const isDisabled = disabled || loading;

  const shell: ViewStyle = {
    borderRadius: theme.radius.pill,
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  const content =
    variant === 'primary' ? (
      <Text variant="button" color="onAccent">
        {label}
      </Text>
    ) : (
      <Text variant="button" color={variant === 'ghost' ? 'textPrimary' : 'accentText'}>
        {label}
      </Text>
    );

  return (
    <Pressable
      {...rest}
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
              borderColor: variant === 'secondary' ? theme.colors.accentBorder : theme.colors.border,
              backgroundColor: variant === 'secondary' ? theme.colors.accentSoft : 'transparent',
            },
          ]}
        >
          {loading ? <ActivityIndicator color={theme.colors.textPrimary} /> : content}
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
