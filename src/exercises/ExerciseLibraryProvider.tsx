import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, adminApi, messageFor } from '@/api';
import { useAccess } from '@/access';
import { Exercise, mock } from '@/data';

type ExerciseLibraryValue = {
  /** Every movement, drafts and hidden ones included. Empty for members. */
  all: Exercise[];
  /** What the picker offers: filmed and not hidden. */
  published: Exercise[];
  find: (exerciseId: string) => Exercise | null;
  loading: boolean;
  error: string | null;
  /**
   * The API is older than the library (or unreachable on first load), so the
   * catalogue built into the app is standing in. Plans still work; adding and
   * editing movements does not.
   */
  usingBundledCatalogue: boolean;
  reload: () => Promise<void>;
  /** Puts a movement the API just returned into the list without a refetch. */
  remember: (exercise: Exercise) => void;
};

const ExerciseLibraryContext = createContext<ExerciseLibraryValue | null>(null);

/** Filmed and not retired — the only movements a coach may put on a week. */
export function isPublished(exercise: Exercise): boolean {
  return !exercise.hidden && !!exercise.video_url;
}

const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name);

/** The catalogue compiled into the app, shaped like the API's library. */
function bundledCatalogue(): Exercise[] {
  return mock.exercises
    .map((exercise) => ({
      ...exercise,
      suggested_sets: mock.suggestedSets[exercise.id] ?? null,
      hidden: false,
    }))
    .sort(byName);
}

/**
 * The exercise library, as the admin screens see it.
 *
 * It lives in the API now — an admin can add and film a movement without a
 * deploy — so every coach-facing list reads from here rather than from the
 * catalogue compiled into the app. Members never load it: the movements on
 * their week arrive inside the plan itself.
 */
export function ExerciseLibraryProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAccess();
  const [all, setAll] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingBundledCatalogue, setUsingBundledCatalogue] = useState(false);
  // What is on screen now, readable from the loader without making it a dependency.
  const current = useRef<Exercise[]>([]);
  current.current = all;

  const reload = useCallback(async () => {
    if (!isAdmin) {
      setAll([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await adminApi.exercises();
      setAll([...next].sort(byName));
      setUsingBundledCatalogue(false);
    } catch (err) {
      // An API from before the library answers 404 here. Anything else on a
      // first load is the network; either way the week editor still needs a
      // list to work from, so the bundled one stands in until a reload works.
      const olderApi = err instanceof ApiError && err.status === 404;
      if (olderApi || current.current.length === 0) {
        setAll(bundledCatalogue());
        setUsingBundledCatalogue(true);
      }
      if (!olderApi) setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remember = useCallback((exercise: Exercise) => {
    setAll((current) => [...current.filter((e) => e.id !== exercise.id), exercise].sort(byName));
  }, []);

  const value = useMemo<ExerciseLibraryValue>(() => {
    const byId = new Map(all.map((exercise) => [exercise.id, exercise]));
    return {
      all,
      published: all.filter(isPublished),
      find: (exerciseId) => byId.get(exerciseId) ?? null,
      loading,
      error,
      usingBundledCatalogue,
      reload,
      remember,
    };
  }, [all, loading, error, usingBundledCatalogue, reload, remember]);

  return <ExerciseLibraryContext.Provider value={value}>{children}</ExerciseLibraryContext.Provider>;
}

export function useExerciseLibrary() {
  const ctx = useContext(ExerciseLibraryContext);
  if (!ctx) throw new Error('useExerciseLibrary must be used within ExerciseLibraryProvider');
  return ctx;
}
