import { DAY_SHORT, WEEK_DAYS, addDays, startOfWeek, toISODate } from './calendar';
import {
  DayOfWeek,
  Exercise,
  ISODate,
  LearnContent,
  PlannedLine,
  SessionStatus,
  WeeklyPlanDays,
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
  /** The day's work in running order; empty on a rest day or with no plan yet. */
  plan: PlannedExercise[];
};

/** One line of a session: the exercise, and what the day asks of it. */
export type PlannedExercise = {
  exercise: Exercise;
  prescription: string;
};

/** Drops lines whose exercise the catalogue no longer has — a blank row helps nobody. */
export function toPlannedExercises(lines: PlannedLine[]): PlannedExercise[] {
  return [...lines]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((line) => (line.exercise ? [{ exercise: line.exercise, prescription: line.prescription }] : []));
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
  /** Null when the physio has not written the week yet — every day is rest. */
  days: WeeklyPlanDays | null;
  completedDates: ISODate[];
  /** Any date inside the week to render. Defaults to now. */
  anchor?: Date;
};

/**
 * Turns the weekly plan into the seven real, dated days of the week `anchor`
 * falls in. The plan is a template; the dates come from the calendar, so the
 * strip stays correct as days pass without any stored per-date rows.
 */
export function buildWeek({ days, completedDates, anchor = new Date() }: BuildWeekArgs): WeekDay[] {
  const monday = startOfWeek(anchor);
  const todayIso = toISODate(anchor);
  const done = new Set(completedDates);

  return WEEK_DAYS.map((dayOfWeek, index) => {
    const date = addDays(monday, index);
    const iso = toISODate(date);
    const plan = toPlannedExercises(days?.[dayOfWeek] ?? []);

    return {
      day_of_week: dayOfWeek,
      short_label: DAY_SHORT[dayOfWeek],
      date: date.getDate(),
      iso_date: iso,
      status: resolveStatus(iso, todayIso, plan.length > 0, done.has(iso)),
      is_today: iso === todayIso,
      plan,
    };
  });
}

export function getCurrentProgression() {
  const level = progressionLevels.find(
    (l) => l.id === userProgression.current_progression_level_id
  );
  return { signatureExercise, level: level ?? progressionLevels[0] };
}

export function findExercise(exercises: Exercise[], id: string | null): Exercise | null {
  return id ? (exercises.find((e) => e.id === id) ?? null) : null;
}

/** Whole years between a date of birth and today, or null when unknown. */
export function ageFrom(dateOfBirth: ISODate | null | undefined, today: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const born = new Date(dateOfBirth + 'T00:00:00');
  if (Number.isNaN(born.getTime())) return null;
  let age = today.getFullYear() - born.getFullYear();
  const beforeBirthday =
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** Learn content split by kind, each in the order it was authored. */
export function groupLearnContent(content: LearnContent[]) {
  const sorted = [...content].sort((a, b) => a.sort_order - b.sort_order);

  return {
    miniLessons: sorted.filter((item) => item.kind === 'mini_lesson'),
    longform: sorted.filter((item) => item.kind === 'longform'),
  };
}

export function findLearnContent(content: LearnContent[], id: string | null): LearnContent | null {
  return id ? (content.find((item) => item.id === id) ?? null) : null;
}
