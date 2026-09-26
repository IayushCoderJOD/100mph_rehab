import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { CheckInResponse, CheckInSummary, checkInApi, messageFor } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { CheckIn, ISODate, todayISO } from '@/data';

export type CheckInInput = {
  pain_score: number;
  pain_location: string;
  /** Defaults to today. */
  date?: ISODate;
};

export type Result = { ok: true } | { ok: false; error: string };

type CheckInContextValue = {
  /** Every check-in, oldest first. */
  checkIns: CheckIn[];
  /** Streaks, totals and adherence, computed by the server. */
  summary: CheckInSummary | null;
  todayCheckIn: CheckIn | null;
  hasCheckedInToday: boolean;
  todayIso: ISODate;
  loading: boolean;
  error: string | null;
  saveCheckIn: (input: CheckInInput) => Promise<Result>;
  /** Most recent `count` scored check-ins, oldest first — what the trend draws. */
  recent: (count: number) => CheckIn[];
  averageScore: (count: number) => number | null;
  reload: () => Promise<void>;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

const byDate = (a: CheckIn, b: CheckIn) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

function toCheckIn(row: CheckInResponse): CheckIn {
  return {
    id: row.id,
    date: row.local_date,
    checked_in: row.checked_in,
    pain_score: row.pain_score,
    pain_location: row.pain_location,
  };
}

/**
 * The daily pain log, read from and written to the API. Writing goes through
 * PUT on the day, so logging twice revises the day rather than stacking a
 * second point on the same date — and the physio sees it the moment it lands.
 */
export function CheckInProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isMember = user?.role === 'member';
  const userId = user?.id ?? null;

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [todayIso, setTodayIso] = useState<ISODate>(todayISO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isMember) {
      setCheckIns([]);
      setSummary(null);
      return;
    }
    setError(null);
    try {
      const [rows, nextSummary] = await Promise.all([checkInApi.range(), checkInApi.summary()]);
      setCheckIns(rows.map(toCheckIn).sort(byDate));
      setSummary(nextSummary);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [isMember]);

  useEffect(() => {
    if (isMember) setLoading(true);
    void reload();
  }, [reload, isMember, userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTodayIso(todayISO());
    });
    return () => sub.remove();
  }, []);

  const saveCheckIn = useCallback(
    async ({ pain_score, pain_location, date }: CheckInInput): Promise<Result> => {
      const day = date ?? todayIso;
      try {
        const saved = toCheckIn(
          await checkInApi.put(day, {
            checked_in: true,
            pain_score,
            pain_location: pain_location.trim() || null,
          })
        );
        setCheckIns((prev) => [...prev.filter((e) => e.date !== day), saved].sort(byDate));
        // The summary is server arithmetic; re-read rather than guess at the streak.
        checkInApi.summary().then(setSummary).catch(() => {});
        return { ok: true };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [todayIso]
  );

  const value = useMemo<CheckInContextValue>(() => {
    const scored = checkIns.filter((entry) => entry.pain_score !== null);

    return {
      checkIns,
      summary,
      todayCheckIn: checkIns.find((entry) => entry.date === todayIso) ?? null,
      hasCheckedInToday: checkIns.some((entry) => entry.date === todayIso && entry.checked_in),
      todayIso,
      loading,
      error,
      saveCheckIn,
      recent: (count: number) => scored.slice(-count),
      averageScore: (count: number) => {
        const window = scored.slice(-count);
        if (window.length === 0) return null;
        const total = window.reduce((sum, entry) => sum + (entry.pain_score ?? 0), 0);
        return total / window.length;
      },
      reload,
    };
  }, [checkIns, summary, todayIso, loading, error, saveCheckIn, reload]);

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>;
}

export function useCheckIns() {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckIns must be used within CheckInProvider');
  return ctx;
}
