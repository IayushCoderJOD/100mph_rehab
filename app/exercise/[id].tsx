import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { ExerciseGuide } from '@/components/session';
import { Screen, Text } from '@/components/ui';
import { useExercise } from '@/exercises';
import { useDismiss } from '@/navigation/useDismiss';
import { usePlan } from '@/plan/PlanProvider';
import { useTheme } from '@/theme';

export default function ExerciseGuideScreen() {
  const dismiss = useDismiss();
  const { theme } = useTheme();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { today, dayFor, week } = usePlan();

  const { exercise, loading } = useExercise(id ?? null);

  // Prefer what the session being viewed asks for — that is the day passed in,
  // or today when the guide is opened on its own — then fall back to any other
  // day this week that prescribes it, so the guide is readable outside a session.
  const viewedDay = date ? dayFor(date) : today;
  const prescription =
    viewedDay?.plan.find((line) => line.exercise.id === id)?.prescription ??
    week.flatMap((d) => d.plan).find((line) => line.exercise.id === id)?.prescription ??
    null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : !exercise ? (
        <View style={styles.empty}>
          <Text variant="title" align="center">
            Exercise not found
          </Text>
        </View>
      ) : (
        // No row at all beats a vague "As prescribed" when nothing is on the plan.
        <ExerciseGuide exercise={exercise} method={prescription ?? undefined} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  headerSpacer: { flex: 1 },
  empty: { paddingTop: 80 },
});
