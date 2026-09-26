import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { messageFor, planApi, sessionApi } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import {
  ISODate,
  WeekDay,
  WeeklyPlan,
  addDays,
  buildWeek,
  newId,
  parseISODate,
  toISODate,
  todayISO,
} from '@/data';

/** How far back a member may still log a session they did but forgot to record. */
export const LOG_WINDOW_DAYS = 14;

export type LogSessionInput = {
  date: ISODate;
  /** Which lines were ticked. Empty means "the whole session, in one tap". */
  completedExerciseIds: string[];
  source: 'guided' | 'logged';
};

export type Result = { ok: true } | { ok: false; error: string };

type PlanContextValue = {
  /** The week as the physio wrote it, or null before it has loaded or been written. */
  plan: WeeklyPlan | null;
  /** True once the physio has put work on at least one day. */
  hasPlan: boolean;
  /** This calendar week, Monday → Sunday, with real dates and statuses. */
  week: WeekDay[];
  today: WeekDay | null;
  todayIso: ISODate;
  /** Any date — this week or another — resolved against the plan and the log. */
  dayFor: (iso: ISODate) => WeekDay;
  /** Today, or a past day inside the logging window. Future days are read-only. */
  canLog: (iso: ISODate) => boolean;
  loading: boolean;
  error: string | null;
  logSession: (input: LogSessionInput) => Promise<Result>;
  /** Takes back a session logged by mistake. Same window as logging. */
  unlogSession: (date: ISODate) => Promise<Result>;
  reload: () => Promise<void>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

/**
 * The member's training week and completion log, read from the API.
 *
 * The plan is written by the physio through the admin tree; this side only
 * reads it. Sessions are logged here so the week strip updates the moment a
 * member finishes, and the id is minted on the device so a retry after a
 * dropped connection updates the same row rather than adding one.
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isMember = user?.role === 'member';
  const userId = user?.id ?? null;

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [completed, setCompleted] = useState<ISODate[]>([]);
  const [todayIso, setTodayIso] = useState<ISODate>(todayISO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isMember) {
      setPlan(null);
      setCompleted([]);
      return;
    }
    setError(null);
    try {
      const [nextPlan, dates] = await Promise.all([planApi.mine(), sessionApi.completedDates()]);
      setPlan(nextPlan);
      setCompleted(dates);
    } catch (err) {
      // Keep whatever was on screen; the member can pull again.
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [isMember]);

  useEffect(() => {
    if (isMember) setLoading(true);
    void reload();
  }, [reload, isMember, userId]);

  // A week view that is wrong after midnight is not a calendar. Re-read the
  // date — and the plan, in case the physio changed it — on every foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTodayIso(todayISO());
        void reload();
      }
    });
    return () => sub.remove();
  }, [reload]);

  const week = useMemo(
    () => buildWeek({ days: plan?.days ?? null, completedDates: completed, anchor: parseISODate(todayIso) }),
    [plan, completed, todayIso]
  );

  const dayFor = useCallback(
    (iso: ISODate): WeekDay => {
      const inThisWeek = week.find((d) => d.iso_date === iso);
      if (inThisWeek) return inThisWeek;
      // Another week: same template, different dates.
      const other = buildWeek({ days: plan?.days ?? null, completedDates: completed, anchor: parseISODate(iso) });
      return other.find((d) => d.iso_date === iso) ?? other[0];
    },
    [week, plan, completed]
  );

  const canLog = useCallback(
    (iso: ISODate) => {
      if (iso > todayIso) return false;
      const floor = toISODate(addDays(parseISODate(todayIso), -(LOG_WINDOW_DAYS - 1)));
      return iso >= floor;
    },
    [todayIso]
  );

  const logSession = useCallback(
    async ({ date, completedExerciseIds, source }: LogSessionInput): Promise<Result> => {
      if (!canLog(date)) {
        return { ok: false, error: 'That day is outside the window for logging a session.' };
      }
      const lines = dayFor(date).plan;
      const ticked = new Set(completedExerciseIds);
      try {
        await sessionApi.log({
          id: newId(),
          local_date: date,
          source,
          exercises: lines.map(({ exercise }) => ({
            exercise_id: exercise.id,
            completed: completedExerciseIds.length === 0 || ticked.has(exercise.id),
          })),
        });
        setCompleted((prev) => (prev.includes(date) ? prev : [...prev, date]));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [canLog, dayFor]
  );

  const unlogSession = useCallback(
    async (date: ISODate): Promise<Result> => {
      if (!canLog(date)) {
        return { ok: false, error: 'That day is outside the window for changing a session.' };
      }
      try {
        // The log id was minted on whichever device logged it, so look it up
        // by date rather than trusting anything this device remembers.
        const logs = await sessionApi.history(date, date);
        await Promise.all(logs.map((log) => sessionApi.remove(log.id)));
        setCompleted((prev) => prev.filter((d) => d !== date));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [canLog]
  );

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      hasPlan: !!plan && Object.values(plan.days).some((lines) => lines.length > 0),
      week,
      today: week.find((d) => d.is_today) ?? null,
      todayIso,
      dayFor,
      canLog,
      loading,
      error,
      logSession,
      unlogSession,
      reload,
    }),
    [plan, week, todayIso, dayFor, canLog, loading, error, logSession, unlogSession, reload]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
