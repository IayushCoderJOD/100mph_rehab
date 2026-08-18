import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { ISODate, Progress, mock, todayISO } from '@/data';

const STORAGE_KEY = 'app.checkins';

export type CheckInInput = {
  pain_score: number;
  pain_location: string;
};

type CheckInContextValue = {
  /** Every check-in, oldest first. */
  checkIns: Progress[];
  todayCheckIn: Progress | null;
  hasCheckedInToday: boolean;
  todayIso: ISODate;
  saveCheckIn: (input: CheckInInput) => void;
  /** Most recent `count` check-ins, oldest first — what the trend draws. */
  recent: (count: number) => Progress[];
  averageScore: (count: number) => number | null;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

const byDate = (a: Progress, b: Progress) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/**
 * The daily pain log. Seeded with the mock week so the trend has a shape on
 * first run; everything the user adds is stored locally for V1.
 */
export function CheckInProvider({ children }: { children: React.ReactNode }) {
  const [checkIns, setCheckIns] = useState<Progress[]>(() => [...mock.progress].sort(byDate));
  const [todayIso, setTodayIso] = useState<ISODate>(todayISO);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setCheckIns((JSON.parse(stored) as Progress[]).sort(byDate));
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTodayIso(todayISO());
    });
    return () => sub.remove();
  }, []);

  const saveCheckIn = useCallback(
    ({ pain_score, pain_location }: CheckInInput) => {
      setCheckIns((prev) => {
        const existing = prev.find((entry) => entry.date === todayIso);
        const location = pain_location.trim() || null;

        // One check-in per day: logging again updates the day rather than
        // stacking a second point onto the same date.
        const entry: Progress = existing
          ? { ...existing, checked_in: true, pain_score, pain_location: location }
          : {
              id: `pr_${todayIso}`,
              user_id: mock.user.id,
              date: todayIso,
              checked_in: true,
              pain_score,
              pain_location: location,
              deposits_made: 1,
              workouts_completed: 0,
            };

        const next = [...prev.filter((e) => e.date !== todayIso), entry].sort(byDate);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [todayIso]
  );

  const value = useMemo<CheckInContextValue>(() => {
    const scored = checkIns.filter((entry) => entry.pain_score !== null);

    return {
      checkIns,
      todayCheckIn: checkIns.find((entry) => entry.date === todayIso) ?? null,
      hasCheckedInToday: checkIns.some((entry) => entry.date === todayIso && entry.checked_in),
      todayIso,
      saveCheckIn,
      recent: (count: number) => scored.slice(-count),
      averageScore: (count: number) => {
        const window = scored.slice(-count);
        if (window.length === 0) return null;
        const total = window.reduce((sum, entry) => sum + (entry.pain_score ?? 0), 0);
        return total / window.length;
      },
    };
  }, [checkIns, todayIso, saveCheckIn]);

  if (!hydrated) return null;

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>;
}

export function useCheckIns() {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckIns must be used within CheckInProvider');
  return ctx;
}
