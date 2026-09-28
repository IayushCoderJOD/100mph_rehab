import { UpdatePlanPayload } from '@/api';
import { DayOfWeek, Exercise, Routine, WEEK_DAYS, WeeklyPlan, mock } from '@/data';

/** One line as the coach edits it. Prescription may still be blank mid-edit. */
export type PlanDraftLine = { exercise_id: string; prescription: string };

/** The week under edit: every day present, rest days empty. */
export type PlanDraft = Record<DayOfWeek, PlanDraftLine[]>;

export function emptyDraft(): PlanDraft {
  return Object.fromEntries(WEEK_DAYS.map((day) => [day, [] as PlanDraftLine[]])) as PlanDraft;
}

export function draftFromPlan(plan: WeeklyPlan | null): PlanDraft {
  const draft = emptyDraft();
  if (!plan) return draft;
  for (const day of WEEK_DAYS) {
    draft[day] = [...(plan.days[day] ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ exercise_id, prescription }) => ({ exercise_id, prescription }));
  }
  return draft;
}

/** Only days with work go on the wire — the server treats a missing day as rest. */
export function draftToPayload(draft: PlanDraft): UpdatePlanPayload {
  const days: UpdatePlanPayload['days'] = {};
  for (const day of WEEK_DAYS) {
    if (draft[day].length > 0) {
      days[day] = draft[day].map((line) => ({
        exercise_id: line.exercise_id,
        prescription: line.prescription.trim(),
      }));
    }
  }
  return { days };
}

export function draftHasWork(draft: PlanDraft): boolean {
  return WEEK_DAYS.some((day) => draft[day].length > 0);
}

export function trainingDayCount(draft: PlanDraft): number {
  return WEEK_DAYS.filter((day) => draft[day].length > 0).length;
}

/** Days whose lines are missing a prescription — the one thing the server will refuse. */
export function daysMissingPrescriptions(draft: PlanDraft): DayOfWeek[] {
  return WEEK_DAYS.filter((day) => draft[day].some((line) => line.prescription.trim().length === 0));
}

export function draftEquals(a: PlanDraft, b: PlanDraft): boolean {
  return WEEK_DAYS.every(
    (day) =>
      a[day].length === b[day].length &&
      a[day].every(
        (line, i) =>
          line.exercise_id === b[day][i].exercise_id &&
          line.prescription.trim() === b[day][i].prescription.trim()
      )
  );
}

// ------------------------------------------------------------------ edits
//
// Every edit returns a new draft, so a screen can hold it in state and diff it
// against what was loaded to know whether there is anything to save.

export function addExercises(
  draft: PlanDraft,
  day: DayOfWeek,
  exerciseIds: string[],
  routines: Routine[],
  exercises: Exercise[] = []
): PlanDraft {
  const existing = new Set(draft[day].map((line) => line.exercise_id));
  const added = exerciseIds
    .filter((id) => !existing.has(id))
    .map((id) => ({ exercise_id: id, prescription: suggestedPrescription(id, routines, exercises) }));
  return { ...draft, [day]: [...draft[day], ...added] };
}

export function removeLine(draft: PlanDraft, day: DayOfWeek, index: number): PlanDraft {
  return { ...draft, [day]: draft[day].filter((_, i) => i !== index) };
}

export function moveLine(draft: PlanDraft, day: DayOfWeek, index: number, delta: -1 | 1): PlanDraft {
  const lines = [...draft[day]];
  const target = index + delta;
  if (target < 0 || target >= lines.length) return draft;
  [lines[index], lines[target]] = [lines[target], lines[index]];
  return { ...draft, [day]: lines };
}

export function setPrescription(
  draft: PlanDraft,
  day: DayOfWeek,
  index: number,
  prescription: string
): PlanDraft {
  return {
    ...draft,
    [day]: draft[day].map((line, i) => (i === index ? { ...line, prescription } : line)),
  };
}

export function clearDay(draft: PlanDraft, day: DayOfWeek): PlanDraft {
  return { ...draft, [day]: [] };
}

/** Replaces the day with a routine's lines — a starting point the coach then tunes. */
export function applyRoutine(draft: PlanDraft, day: DayOfWeek, routine: Routine): PlanDraft {
  const lines = [...routine.exercises]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ exercise_id, prescription }) => ({ exercise_id, prescription }));
  return { ...draft, [day]: lines };
}

export function copyDay(draft: PlanDraft, from: DayOfWeek, to: DayOfWeek[]): PlanDraft {
  const next = { ...draft };
  for (const day of to) {
    if (day !== from) next[day] = draft[from].map((line) => ({ ...line }));
  }
  return next;
}

/**
 * A prescription to start from when an exercise is added by hand: the sets
 * the library holds for that movement (an admin can edit them), else the ones
 * authored in the app, else whatever a routine says, else blank to fill in.
 */
export function suggestedPrescription(exerciseId: string, routines: Routine[], exercises: Exercise[] = []): string {
  const fromLibrary = exercises.find((exercise) => exercise.id === exerciseId)?.suggested_sets;
  if (fromLibrary) return fromLibrary;
  const authored = mock.suggestedSets[exerciseId];
  if (authored) return authored;
  for (const routine of routines) {
    const line = routine.exercises.find((e) => e.exercise_id === exerciseId);
    if (line) return line.prescription;
  }
  return '';
}

/** Lines resolved against the catalogue, in order, for rendering. */
export function resolveLines(
  lines: PlanDraftLine[],
  exercises: Exercise[]
): { line: PlanDraftLine; exercise: Exercise | null }[] {
  return lines.map((line) => ({
    line,
    exercise: exercises.find((e) => e.id === line.exercise_id) ?? null,
  }));
}
