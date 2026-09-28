import { useEffect, useMemo, useState } from 'react';
import { contentApi } from '@/api';
import { Exercise, findExercise, mock } from '@/data';
import { usePlan } from '@/plan/PlanProvider';
import { useExerciseLibrary } from './ExerciseLibraryProvider';

/**
 * One exercise, for the guide screen, from wherever it is already known.
 *
 * A member's week arrives with every movement on it inlined, and an admin
 * has the whole library loaded, so the usual case costs nothing. Only a
 * movement neither has seen — a link opened cold — is fetched. The catalogue
 * compiled into the app is the last resort, for an API that predates the
 * library.
 */
export function useExercise(exerciseId: string | null): { exercise: Exercise | null; loading: boolean } {
  const { week } = usePlan();
  const library = useExerciseLibrary();

  const known = useMemo(() => {
    if (!exerciseId) return null;
    const fromPlan = week.flatMap((day) => day.plan).find((line) => line.exercise.id === exerciseId)?.exercise;
    return fromPlan ?? library.find(exerciseId);
  }, [exerciseId, week, library]);

  const [fetched, setFetched] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (known || !exerciseId) return;
    let cancelled = false;
    setLoading(true);
    contentApi
      .exercise(exerciseId)
      .then((exercise) => {
        if (!cancelled) setFetched(exercise);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, known]);

  const exercise = known ?? fetched ?? (loading ? null : findExercise(mock.exercises, exerciseId));
  return { exercise, loading: !known && loading };
}
