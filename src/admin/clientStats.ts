import { ISODate, Progress, mock, parseISODate, todayISO } from '@/data';

export type ClientStats = {
  latestPain: number | null;
  weekAvg: number | null;
  /** Change against the previous seven days. Negative is improvement. */
  delta: number | null;
  checkInCount: number;
  sessionsLast7: number;
  lastCheckIn: ISODate | null;
  /** Days since the last check-in. Null when they have never checked in. */
  daysSinceCheckIn: number | null;
  /** True once a client has gone quiet long enough to be worth a nudge. */
  needsAttention: boolean;
};

const ATTENTION_DAYS = 4;

const mean = (entries: Progress[]) =>
  entries.length === 0
    ? null
    : entries.reduce((sum, e) => sum + (e.pain_score ?? 0), 0) / entries.length;

function daysBetween(fromIso: ISODate, toIso: ISODate): number {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

export function checkInsFor(userId: string): Progress[] {
  return [...(mock.progressByUser[userId] ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function completedFor(userId: string): ISODate[] {
  return mock.completedByUser[userId] ?? [];
}

/**
 * The roster columns, derived rather than stored. Everything here is a read of
 * the client's own log, so it stays correct without a nightly rollup.
 */
export function clientStats(userId: string, today: ISODate = todayISO()): ClientStats {
  const checkIns = checkInsFor(userId);
  const scored = checkIns.filter((entry) => entry.pain_score !== null);

  const recent = scored.slice(-7);
  const previous = scored.slice(-14, -7);
  const weekAvg = mean(recent);
  const previousAvg = mean(previous);

  const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1].date : null;
  const daysSinceCheckIn = lastCheckIn ? daysBetween(lastCheckIn, today) : null;

  const sessionsLast7 = completedFor(userId).filter(
    (iso) => daysBetween(iso, today) >= 0 && daysBetween(iso, today) < 7
  ).length;

  return {
    latestPain: scored.length > 0 ? (scored[scored.length - 1].pain_score ?? null) : null,
    weekAvg,
    delta: weekAvg !== null && previousAvg !== null ? weekAvg - previousAvg : null,
    checkInCount: checkIns.length,
    sessionsLast7,
    lastCheckIn,
    daysSinceCheckIn,
    needsAttention: daysSinceCheckIn === null || daysSinceCheckIn >= ATTENTION_DAYS,
  };
}
