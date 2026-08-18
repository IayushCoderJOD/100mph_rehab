import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SessionType } from '@/data';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type SessionChipProps = {
  /** null renders the rest-day chip. */
  sessionType: SessionType | null;
  showGrip?: boolean;
  restLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** The six-dot drag handle from the schedule editor. */
function Grip({ color }: { color: string }) {
  return (
    <View style={styles.grip}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/**
 * One session as it appears in a schedule: the primary session carries the
 * accent, supporting sessions stay neutral, rest reads as absence.
 */
export function SessionChip({
  sessionType,
  showGrip = false,
  restLabel = 'Rest',
  style,
}: SessionChipProps) {
  const { theme } = useTheme();

  const isRest = !sessionType;
  const isPrimary = !!sessionType?.is_primary;

  const background = isRest
    ? 'transparent'
    : isPrimary
      ? theme.colors.accentSoft
      : theme.colors.surfaceRaised;

  const borderColor = isRest
    ? 'transparent'
    : isPrimary
      ? theme.colors.accentBorder
      : theme.colors.border;

  const labelColor = isRest ? 'textMuted' : isPrimary ? 'accentText' : 'textPrimary';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: background,
          borderColor,
          borderRadius: theme.radius.sm,
        },
        style,
      ]}
    >
      <Text variant="bodyStrong" color={labelColor} numberOfLines={1} style={styles.label}>
        {sessionType ? sessionType.name : restLabel}
      </Text>
      {showGrip && !isRest ? (
        <Grip color={isPrimary ? theme.colors.accentText : theme.colors.textMuted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  label: { flexShrink: 1 },
  grip: {
    width: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});
