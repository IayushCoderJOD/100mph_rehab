import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  DayOfWeek,
  ISODate,
  ScheduleMap,
  SessionType,
  WeekDay,
  buildWeek,
  mock,
  parseISODate,
  todayISO,
} from '@/data';
import { useAuth } from '@/auth/AuthProvider';
import { useProgram } from '@/program/ProgramProvider';
import { useProgramData } from '@/program/programData';

/** Scoped to user and program: one device may hold several accounts. */
const scheduleKey = (userId: string, programId: string) => `app.schedule.${userId}.${programId}`;
const completedKey = (userId: string, programId: string) => `app.completed.${userId}.${programId}`;

type ScheduleContextValue = {
  /** The editable weekly plan for the active program. */
  schedule: ScheduleMap;
  sessionTypes: SessionType[];
  /** This calendar week, Monday → Sunday, with real dates and statuses. */
  week: WeekDay[];
  today: WeekDay | null;
  todayIso: ISODate;
  /** The day in this week matching an ISO date, or null if it falls outside it. */
  dayFor: (iso: ISODate) => WeekDay | null;
  /** False once the user has moved anything away from the program default. */
  isDefault: boolean;
  swapDays: (a: DayOfWeek, b: DayOfWeek) => void;
  assignSession: (day: DayOfWeek, sessionTypeId: string | null) => void;
  resetSchedule: () => void;
  completeSession: (iso?: ISODate) => void;
  clearSession: (iso: ISODate) => void;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

/**
 * Owns the user's weekly plan and their completion log, per program, backed by
 * AsyncStorage for V1. Screens read the derived week rather than dated rows, so
 * editing the plan updates every view at once.
 */
export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { programId } = useProgram();
  const { defaultSchedule, sessionTypes } = useProgramData();

  const [schedule, setSchedule] = useState<ScheduleMap>(defaultSchedule);
  const [completed, setCompleted] = useState<ISODate[]>([]);
  const [todayIso, setTodayIso] = useState<ISODate>(todayISO);
  const [hydrated, setHydrated] = useState(false);
  const hydratedOnce = useRef(false);

  // Reload whenever the active program changes; only the very first read blocks
  // rendering, so switching programs never tears the tree down.
  useEffect(() => {
    let cancelled = false;
    if (!programId || !userId) {
      setSchedule(defaultSchedule);
      setCompleted([]);
      setHydrated(true);
      hydratedOnce.current = true;
      return;
    }

    if (!hydratedOnce.current) setHydrated(false);

    AsyncStorage.multiGet([scheduleKey(userId, programId), completedKey(userId, programId)])
      .then(([[, storedSchedule], [, storedCompleted]]) => {
        if (cancelled) return;
        setSchedule(storedSchedule ? (JSON.parse(storedSchedule) as ScheduleMap) : defaultSchedule);
        setCompleted(
          storedCompleted
            ? (JSON.parse(storedCompleted) as ISODate[])
            : (mock.completedByUser[userId] ?? [])
        );
      })
      .catch(() => {
        if (cancelled) return;
        setSchedule(defaultSchedule);
        setCompleted(mock.completedByUser[userId] ?? []);
      })
      .finally(() => {
        if (cancelled) return;
        setHydrated(true);
        hydratedOnce.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [programId, userId, defaultSchedule]);

  // A week view that is wrong after midnight is not a calendar. Re-read the
  // date whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTodayIso(todayISO());
    });
    return () => sub.remove();
  }, []);

  const persistSchedule = useCallback(
    (next: ScheduleMap) => {
      setSchedule(next);
      if (programId && userId) {
        AsyncStorage.setItem(scheduleKey(userId, programId), JSON.stringify(next));
      }
    },
    [programId, userId]
  );

  const persistCompleted = useCallback(
    (next: ISODate[]) => {
      setCompleted(next);
      if (programId && userId) {
        AsyncStorage.setItem(completedKey(userId, programId), JSON.stringify(next));
      }
    },
    [programId, userId]
  );

  const swapDays = useCallback(
    (a: DayOfWeek, b: DayOfWeek) => {
      if (a === b) return;
      persistSchedule({ ...schedule, [a]: schedule[b], [b]: schedule[a] });
    },
    [schedule, persistSchedule]
  );

  const assignSession = useCallback(
    (day: DayOfWeek, sessionTypeId: string | null) => {
      persistSchedule({ ...schedule, [day]: sessionTypeId });
    },
    [schedule, persistSchedule]
  );

  const resetSchedule = useCallback(() => {
    persistSchedule(defaultSchedule);
  }, [defaultSchedule, persistSchedule]);

  const completeSession = useCallback(
    (iso?: ISODate) => {
      const date = iso ?? todayIso;
      if (completed.includes(date)) return;
      persistCompleted([...completed, date]);
    },
    [completed, todayIso, persistCompleted]
  );

  const clearSession = useCallback(
    (iso: ISODate) => {
      persistCompleted(completed.filter((d) => d !== iso));
    },
    [completed, persistCompleted]
  );

  const week = useMemo(
    () =>
      buildWeek({
        schedule,
        sessionTypes,
        completedDates: completed,
        anchor: parseISODate(todayIso),
      }),
    [schedule, sessionTypes, completed, todayIso]
  );

  const value = useMemo<ScheduleContextValue>(
    () => ({
      schedule,
      sessionTypes,
      week,
      today: week.find((d) => d.is_today) ?? null,
      todayIso,
      dayFor: (iso: ISODate) => week.find((d) => d.iso_date === iso) ?? null,
      isDefault: Object.keys(defaultSchedule).every(
        (day) => schedule[day as DayOfWeek] === defaultSchedule[day as DayOfWeek]
      ),
      swapDays,
      assignSession,
      resetSchedule,
      completeSession,
      clearSession,
    }),
    [
      schedule,
      sessionTypes,
      week,
      todayIso,
      defaultSchedule,
      swapDays,
      assignSession,
      resetSchedule,
      completeSession,
      clearSession,
    ]
  );

  if (!hydrated) return null;

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
}
