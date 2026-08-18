import { DAY_SHORT, WEEK_DAYS, addDays, startOfWeek, toISODate } from './calendar';
import {
  DayOfWeek,
  Exercise,
  ISODate,
  ScheduleMap,
  SessionExercise,
  SessionStatus,
  SessionType,
} from './types';
import { progressionLevels, signatureExercise, userProgression } from './mock';

export type WeekDay = {
  day_of_week: DayOfWeek;
  short_label: string;
  /** Day of the month, for the number inside the circle. */
  date: number;
  iso_date: ISODate;
  status: SessionStatus;
  is_today: boolean;
  session_type: SessionType | null;
};

export function findSessionType(
  sessionTypes: SessionType[],
  id: string | null
): SessionType | null {
  return id ? (sessionTypes.find((s) => s.id === id) ?? null) : null;
}

/** ISO dates sort lexicographically, so plain comparison is a date comparison. */
function resolveStatus(
  iso: ISODate,
  todayIso: ISODate,
  hasSession: boolean,
  isCompleted: boolean
): SessionStatus {
  if (isCompleted) return 'completed';
  if (!hasSession) return 'rest';
  if (iso < todayIso) return 'missed';
  if (iso === todayIso) return 'scheduled';
  return 'upcoming';
}

type BuildWeekArgs = {
  schedule: ScheduleMap;
  sessionTypes: SessionType[];
  completedDates: ISODate[];
  /** Any date inside the week to render. Defaults to now. */
  anchor?: Date;
};

/**
 * Turns the weekly plan into the seven real, dated days of the week `anchor`
 * falls in. The plan is a template; the dates come from the calendar, so the
 * strip stays correct as days pass without any stored per-date rows.
 */
export function buildWeek({
  schedule,
  sessionTypes,
  completedDates,
  anchor = new Date(),
}: BuildWeekArgs): WeekDay[] {
  const monday = startOfWeek(anchor);
  const todayIso = toISODate(anchor);
  const done = new Set(completedDates);

  return WEEK_DAYS.map((dayOfWeek, index) => {
    const date = addDays(monday, index);
    const iso = toISODate(date);
    const sessionType = findSessionType(sessionTypes, schedule[dayOfWeek]);

    return {
      day_of_week: dayOfWeek,
      short_label: DAY_SHORT[dayOfWeek],
      date: date.getDate(),
      iso_date: iso,
      status: resolveStatus(iso, todayIso, !!sessionType, done.has(iso)),
      is_today: iso === todayIso,
      session_type: sessionType,
    };
  });
}

export function getCurrentProgression() {
  const level = progressionLevels.find(
    (l) => l.id === userProgression.current_progression_level_id
  );
  return { signatureExercise, level: level ?? progressionLevels[0] };
}

/** One line of a session: the exercise, and what today asks of it. */
export type PlannedExercise = {
  exercise: Exercise;
  prescription: string;
};

export function findExercise(exercises: Exercise[], id: string | null): Exercise | null {
  return id ? (exercises.find((e) => e.id === id) ?? null) : null;
}

/**
 * The running order for a session type. Returns an empty plan for rest days,
 * so callers can render the same way whether or not there is a session.
 */
export function buildSessionPlan(
  sessionTypeId: string | null,
  exercises: Exercise[],
  sessionExercises: SessionExercise[]
): PlannedExercise[] {
  if (!sessionTypeId) return [];

  return sessionExercises
    .filter((link) => link.session_type_id === sessionTypeId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .reduce<PlannedExercise[]>((plan, link) => {
      const exercise = findExercise(exercises, link.exercise_id);
      if (exercise) plan.push({ exercise, prescription: link.prescription });
      return plan;
    }, []);
}
