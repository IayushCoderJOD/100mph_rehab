import { draftExercises, exercises as catalogue, learnContent, plans, programs } from '@/data/mock';
import { Exercise, LearnContent, LearnTopic, Plan, Program, Routine } from '@/data/types';
import { EXERCISES_HI, ExerciseText, LESSONS_HI, PLANS_HI, PROGRAMS_HI, ROUTINES_HI, TOPICS_HI } from './content.hi';
import { Language } from './current';
import { prescriptionInHindi } from './prescription';

/**
 * Content the practice wrote, in the reader's language where a translation
 * exists. English is always the identity: nothing it touches changes.
 *
 * For display only. A form that edits a movement works on the stored text,
 * never on this, or saving would write the translation back to the server.
 */
export type Localizer = {
  exercise: (exercise: Exercise) => Exercise;
  lesson: (lesson: LearnContent) => LearnContent;
  program: (program: Program) => Program;
  routine: (routine: Routine) => Routine;
  topic: (topic: LearnTopic) => LearnTopic;
  plan: (plan: Plan) => Plan;
  prescription: (text: string) => string;
};

const same = <T>(value: T) => value;

const english: Localizer = {
  exercise: same,
  lesson: same,
  program: same,
  routine: same,
  topic: same,
  plan: same,
  prescription: same,
};

const EXERCISE_FIELDS: (keyof ExerciseText)[] = ['name', 'focus', 'prerequisites', 'instructions', 'purpose'];

/** The English each translation was made from, to tell whether it still applies. */
const AUTHORED = new Map([...catalogue, ...draftExercises].map((exercise) => [exercise.id, exercise]));

/**
 * Short lines that recur across movements — "None", "Glutes" — by their
 * English, so a movement an admin adds with the same words reads in Hindi too.
 */
const SHORT_LINES_HI = new Map<string, string>();
for (const [id, text] of Object.entries(EXERCISES_HI)) {
  const source = AUTHORED.get(id);
  if (!source) continue;
  SHORT_LINES_HI.set(source.focus.trim(), text.focus);
  SHORT_LINES_HI.set(source.prerequisites.trim(), text.prerequisites);
}

const sourceOf = <T extends { id: string }>(list: T[]) => new Map(list.map((item) => [item.id, item]));
const AUTHORED_LESSONS = sourceOf(learnContent);
const AUTHORED_PROGRAMS = sourceOf(programs);
const AUTHORED_PLANS = sourceOf(plans);

/**
 * A field's translation, but only while the field still says what was
 * translated. Once an admin rewrites it, their words are the right ones —
 * even in English — and a stale translation of the old text would be wrong.
 */
function translated(current: string, original: string | undefined, translation: string | undefined): string {
  return translation !== undefined && original !== undefined && current.trim() === original.trim() ? translation : current;
}

function exerciseInHindi(exercise: Exercise): Exercise {
  const source = AUTHORED.get(exercise.id);
  const text = EXERCISES_HI[exercise.id];
  const next = { ...exercise };
  for (const field of EXERCISE_FIELDS) {
    const value = exercise[field];
    if (!value) continue;
    if (text && source && value.trim() === source[field].trim()) next[field] = text[field];
    else if (field === 'focus' || field === 'prerequisites') next[field] = SHORT_LINES_HI.get(value.trim()) ?? value;
  }
  return next;
}

const hindi: Localizer = {
  exercise: exerciseInHindi,
  lesson: (lesson) => {
    const source = AUTHORED_LESSONS.get(lesson.id);
    const text = LESSONS_HI[lesson.id];
    return {
      ...lesson,
      title: translated(lesson.title, source?.title, text?.title),
      subtitle: translated(lesson.subtitle, source?.subtitle, text?.subtitle),
      description: translated(lesson.description, source?.description, text?.description),
    };
  },
  program: (program) => {
    const source = AUTHORED_PROGRAMS.get(program.id);
    const text = PROGRAMS_HI[program.id];
    return {
      ...program,
      name: translated(program.name, source?.name, text?.name),
      tagline: translated(program.tagline, source?.tagline, text?.tagline),
    };
  },
  routine: (routine) => {
    const text = ROUTINES_HI[routine.id];
    return text ? { ...routine, name: text.name, description: text.description } : routine;
  },
  topic: (topic) => {
    const text = TOPICS_HI[topic.id];
    return text ? { ...topic, title: text.title, subtitle: text.subtitle } : topic;
  },
  plan: (plan) => {
    const source = AUTHORED_PLANS.get(plan.id);
    const text = PLANS_HI[plan.id];
    return {
      ...plan,
      name: translated(plan.name, source?.name, text?.name),
      description: translated(plan.description, source?.description, text?.description),
      price_label: translated(plan.price_label, source?.price_label, text?.price_label),
    };
  },
  prescription: prescriptionInHindi,
};

export function localizer(language: Language): Localizer {
  return language === 'hi' ? hindi : english;
}
