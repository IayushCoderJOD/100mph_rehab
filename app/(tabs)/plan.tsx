import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AssignedExerciseCard } from '@/components/plan';
import { Card, HeartBadge, Screen, Text } from '@/components/ui';
import { findExercise } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useProgramData } from '@/program/programData';

/**
 * What the client's physio has prescribed for them specifically, on top of the
 * program everyone on it shares. Empty until a coach adds something, which is
 * the normal state for a new member rather than an error.
 */
export default function PlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { assignmentsFor, userById } = useDirectory();
  const { exercises } = useProgramData();

  const items = useMemo(() => {
    if (!user) return [];

    return assignmentsFor(user.id).flatMap((assignment) => {
      const exercise = findExercise(exercises, assignment.exercise_id);
      // An assignment pointing at an exercise outside this program is stale
      // rather than broken — skip it instead of rendering a blank card.
      if (!exercise) return [];

      return [
        {
          assignment,
          exercise,
          assignedByName: userById(assignment.assigned_by)?.full_name ?? 'Your physio',
        },
      ];
    });
  }, [user, assignmentsFor, exercises, userById]);

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        For You
      </Text>

      {items.length === 0 ? (
        <Card style={styles.empty}>
          <HeartBadge size={72} />
          <Text variant="heading" align="center" style={styles.emptyTitle}>
            Nothing extra yet
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            When your physio prescribes something specific to you, it shows up here alongside your
            program.
          </Text>
        </Card>
      ) : (
        <>
          <Text variant="subtitle" color="textSecondary" style={styles.intro}>
            Prescribed for you specifically. Do these alongside your program, not instead of it.
          </Text>

          <View style={styles.list}>
            {items.map(({ assignment, exercise, assignedByName }) => (
              <AssignedExerciseCard
                key={assignment.id}
                assignment={assignment}
                exercise={exercise}
                assignedByName={assignedByName}
                onGuide={() => router.push(`/exercise/${exercise.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12, marginBottom: 24 },
  intro: { marginBottom: 20 },
  list: { gap: 14 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { marginTop: 20 },
  emptyNote: { marginTop: 6, paddingHorizontal: 8 },
});
