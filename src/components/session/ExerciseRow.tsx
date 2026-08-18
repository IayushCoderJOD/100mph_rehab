import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type ExerciseRowProps = {
  position: number;
  name: string;
  prescription: string;
  /** Only meaningful once a session is running. */
  done?: boolean;
  onToggle?: () => void;
  onGuide?: () => void;
};

/**
 * One line of a session plan. The marker on the left is a plain number until
 * the session is running, at which point it becomes the thing you tap to tick
 * the exercise off.
 */
export function ExerciseRow({
  position,
  name,
  prescription,
  done = false,
  onToggle,
  onGuide,
}: ExerciseRowProps) {
  const { theme } = useTheme();
  const live = !!onToggle;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: done ? theme.colors.accentBorder : theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        disabled={!live}
        hitSlop={6}
        accessibilityRole={live ? 'checkbox' : undefined}
        accessibilityState={live ? { checked: done } : undefined}
        style={[
          styles.marker,
          {
            borderColor: done ? theme.colors.accent : theme.colors.border,
            backgroundColor: done ? theme.colors.accentSoft : 'transparent',
          },
        ]}
      >
        {done ? (
          <Ionicons name="checkmark-sharp" size={16} color={theme.colors.accent} />
        ) : (
          <Text variant="bodyStrong" color={live ? 'textSecondary' : 'accentText'}>
            {position}
          </Text>
        )}
      </Pressable>

      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {prescription}
        </Text>
      </View>

      {onGuide ? (
        <Pressable
          onPress={onGuide}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${name} guide`}
          style={({ pressed }) => [
            styles.guide,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text variant="label" color="textSecondary">
            Guide
          </Text>
          <Ionicons name="chevron-forward" size={13} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
});
