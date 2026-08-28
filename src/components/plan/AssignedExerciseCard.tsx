import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AssignedExercise, Exercise } from '@/data';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type AssignedExerciseCardProps = {
  assignment: AssignedExercise;
  exercise: Exercise;
  /** Who prescribed it, already resolved to a name. */
  assignedByName: string;
  onGuide?: () => void;
  onRemove?: () => void;
};

/**
 * One prescribed exercise. The coach's note is the point of this card — it is
 * the only place in the app where a client is spoken to directly, so it gets
 * the accent rule rather than being buried as another grey caption.
 */
export function AssignedExerciseCard({
  assignment,
  exercise,
  assignedByName,
  onGuide,
  onRemove,
}: AssignedExerciseCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text variant="bodyStrong">{exercise.name}</Text>
          <Text variant="caption" color="textSecondary">
            {exercise.focus}
          </Text>
        </View>

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${exercise.name}`}
            style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.prescription,
          { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm },
        ]}
      >
        <Ionicons name="repeat-outline" size={15} color={theme.colors.accent} />
        <Text variant="caption" color="textPrimary" style={styles.prescriptionText}>
          {assignment.prescription}
        </Text>
      </View>

      {assignment.note ? (
        <View style={styles.note}>
          <View style={[styles.tick, { backgroundColor: theme.colors.accent }]} />
          <View style={styles.noteBody}>
            <Text variant="label" color="accentText" style={styles.noteLabel}>
              {assignedByName.toUpperCase()}
            </Text>
            <Text variant="caption" color="textSecondary" style={styles.noteText}>
              {assignment.note}
            </Text>
          </View>
        </View>
      ) : null}

      {onGuide ? (
        <Pressable
          onPress={onGuide}
          accessibilityRole="button"
          accessibilityLabel={`${exercise.name} guide`}
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
            View Guide
          </Text>
          <Ionicons name="chevron-forward" size={13} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headText: { flex: 1, gap: 2 },
  remove: { padding: 2 },
  prescription: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  prescriptionText: { flex: 1 },
  note: { flexDirection: 'row', gap: 10 },
  tick: { width: 3, borderRadius: 2 },
  noteBody: { flex: 1, gap: 4 },
  noteLabel: { letterSpacing: 1.2 },
  noteText: { lineHeight: 19 },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
  },
});
