import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { ExerciseGuide } from '@/components/session';
import { Screen, Text } from '@/components/ui';
import { findExercise } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';
import { useProgramData } from '@/program/programData';
import { usePlan } from '@/plan/PlanProvider';

export default function ExerciseGuideScreen() {
  const dismiss = useDismiss();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { exercises } = useProgramData();
  const { today, dayFor, week } = usePlan();

  const exercise = findExercise(exercises, id ?? null);

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

      {!exercise ? (
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
