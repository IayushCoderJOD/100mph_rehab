import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServerWaking } from '@/api';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

/**
 * Says why the app is waiting when the API is booting after a quiet spell.
 *
 * Every screen already shows its own spinner; without this line, a spinner that
 * runs for most of a minute reads as a hang. It appears only once the wait is
 * noticeable, sits over the top of whatever screen is open, and ignores
 * touches so it never gets in the way of the form underneath.
 */
export function ServerWakeNotice() {
  const waking = useServerWaking();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!waking) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 12 }]}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.accentBorder,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text variant="caption" color="textSecondary" style={styles.text}>
          Starting up — the first load after a break can take up to a minute.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    maxWidth: 520,
  },
  text: { flexShrink: 1 },
});
