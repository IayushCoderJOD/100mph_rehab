import { ExerciseCategory } from './types';

/**
 * Display order for the picker: the order a physio would scan a library in,
 * trunk first, then down the leg, then the odd ones out.
 */
export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'back',
  'core',
  'hips_glutes',
  'lower_body',
  'ankle_calf',
  'upper_body',
  'mobility',
  'athletic',
];

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  back: 'Back Strengthening',
  core: 'Core & Trunk',
  hips_glutes: 'Hips & Glutes',
  lower_body: 'Lower Body Strength',
  ankle_calf: 'Ankle & Calf',
  upper_body: 'Shoulder & Upper Body',
  mobility: 'Mobility & Stretching',
  athletic: 'Speed & Agility',
};
