import {
  Exercise,
  ISODate,
  LearnContent,
  LearnTopic,
  Plan,
  Program,
  Progress,
  Session,
  SessionExercise,
  SessionType,
  SignatureExercise,
  ProgressionLevel,
  ScheduleMap,
  Subscription,
  User,
  UserProgression,
  WeeklyScheduleEntry,
} from './types';

const USER_ID = 'user_1';
const PROGRAM_ID = 'prog_lower_back';

export const programs: Program[] = [
  {
    id: PROGRAM_ID,
    name: 'Lower Back',
    slug: 'lower_back',
    tagline: 'Rebuild strength and end back pain.',
    icon: 'body-outline',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'prog_shoulder',
    name: 'Shoulder',
    slug: 'shoulder',
    tagline: 'Restore pain-free overhead motion.',
    icon: 'barbell-outline',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'prog_knee',
    name: 'Knee',
    slug: 'knee',
    tagline: 'Bulletproof knees for daily life.',
    icon: 'walk-outline',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'prog_fitness',
    name: 'General Fitness',
    slug: 'general_fitness',
    tagline: 'Build a strong, resilient body.',
    icon: 'fitness-outline',
    created_at: '2026-08-01T00:00:00Z',
  },
];

export const program: Program = programs[0];

export const humanBodyTopics: LearnTopic[] = [
  { id: 'topic_videos', title: 'Videos', subtitle: 'Guided lessons', icon: 'play-circle-outline' },
  { id: 'topic_anatomy', title: 'Anatomy', subtitle: 'How your body works', icon: 'body-outline' },
  { id: 'topic_articles', title: 'Articles', subtitle: 'Read the science', icon: 'document-text-outline' },
  { id: 'topic_faq', title: 'FAQs', subtitle: 'Common questions', icon: 'help-circle-outline' },
];

export const plans: Plan[] = [
  {
    id: 'plan_monthly',
    name: 'Monthly',
    description: 'Full access, billed every month. Cancel any time.',
    duration_days: 30,
    price_label: '₹1,499 / month',
  },
  {
    id: 'plan_quarterly',
    name: 'Quarterly',
    description: 'Three months in one go — long enough to feel the change.',
    duration_days: 90,
    price_label: '₹3,999 / 3 months',
  },
  {
    id: 'plan_annual',
    name: 'Annual',
    description: 'The full Long Game, at the lowest monthly rate.',
    duration_days: 365,
    price_label: '₹12,999 / year',
  },
];

/** The plan a new member lands on. */
export const plan: Plan = plans[2];

export const subscription: Subscription = {
  id: 'sub_1',
  user_id: USER_ID,
  plan_id: 'plan_annual',
  status: 'active',
  started_at: '2026-08-14T00:00:00Z',
  expires_at: '2027-08-14T00:00:00Z',
};

export const user: User = {
  id: USER_ID,
  full_name: 'Ayush Tyagi',
  email: 'ayushtyagi4810poco@gmail.com',
  phone: '+91 90000 00000',
  avatar_url: null,
  active_program_id: PROGRAM_ID,
  member_since: '2026-08-14',
  created_at: '2026-08-14T09:00:00Z',
};

export const sessionTypes: SessionType[] = [
  {
    id: 'st_flow',
    program_id: PROGRAM_ID,
    name: 'Flow',
    description: 'Your main session — the core strength work that rebuilds your back.',
    icon: 'flame',
    is_primary: true,
    frequency_per_week: 3,
    approx_duration_min: 60,
  },
  {
    id: 'st_mobility',
    program_id: PROGRAM_ID,
    name: 'Mobility Flow',
    description: 'The supporting session — gentle work that keeps you moving between Flow days.',
    icon: 'droplet',
    is_primary: false,
    frequency_per_week: 2,
    approx_duration_min: 30,
  },
];

export const exercises: Exercise[] = [
  {
    id: 'ex_back_extension',
    program_id: PROGRAM_ID,
    name: 'Back Extension',
    focus: 'Spinal erectors',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Set up face down with your hips on the pad and your feet locked in. Start with your torso hanging down, then lift until your body forms one straight line from head to heel. Hold there without arching past neutral, and lower slowly.',
    purpose:
      'This is the central exercise of the program. It loads the muscles that hold your spine upright through their full range, which is what raises the tolerance of the tissue that has been letting you down.',
  },
  {
    id: 'ex_hip_hinge',
    program_id: PROGRAM_ID,
    name: 'Hip Hinge',
    focus: 'Hamstrings and glutes',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Stand with soft knees and push your hips straight back, letting your torso tip forward while your spine stays long. Go as far as your hamstrings allow without rounding, then drive your hips forward to stand tall.',
    purpose:
      'Teaches your hips to do the bending your lower back has been doing for you. Every heavy thing you pick up for the rest of your life should start with this pattern.',
  },
  {
    id: 'ex_bird_dog',
    program_id: PROGRAM_ID,
    name: 'Bird Dog',
    focus: 'Trunk control',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'On hands and knees, reach one arm forward and the opposite leg back until both are level with your torso. Keep your hips square to the floor — if they tip, you have gone too far. Return under control and switch sides.',
    purpose:
      'Trains your trunk to stay still while your limbs move, which is the job it actually has to do when you walk, carry and reach.',
  },
  {
    id: 'ex_dead_bug',
    program_id: PROGRAM_ID,
    name: 'Dead Bug',
    focus: 'Deep core',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Lie on your back with arms up and knees over hips. Press your lower back gently into the floor and lower one arm and the opposite leg until they hover. Bring them back and swap. Stop the set the moment your back lifts off the floor.',
    purpose:
      'Builds control of the position your spine is safest in, with no load on the back itself. It is the least intimidating way to start earning back trust in your midsection.',
  },
  {
    id: 'ex_split_squat',
    program_id: PROGRAM_ID,
    name: 'Split Squat',
    focus: 'Single leg strength',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'Comfortable with the hip hinge',
    instructions:
      'Take a long stride, keep your torso tall and drop your back knee straight down towards the floor. Push through the front foot to stand. Keep the weight even rather than shifting onto the front leg.',
    purpose:
      'Most back pain comes with one leg quietly doing less work. Loading each side on its own finds that gap and closes it.',
  },
  {
    id: 'ex_suitcase_carry',
    program_id: PROGRAM_ID,
    name: 'Suitcase Carry',
    focus: 'Anti-side-bend',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Hold a single weight in one hand and walk. Stand tall, shoulders level, and resist the pull to lean. Walk the distance, swap hands, repeat.',
    purpose:
      'Loads your trunk in the exact way daily life does — one bag, one side, walking. Carrying is rehab that looks like an ordinary errand.',
  },
  {
    id: 'ex_reverse_hyper',
    program_id: PROGRAM_ID,
    name: 'Reverse Hyper',
    focus: 'Posterior chain',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'Back Extension iso holds',
    instructions:
      'Lie face down with your hips at the edge of a bench and your legs hanging. Squeeze your glutes to raise your legs to body height, pause, and lower with control rather than letting them swing.',
    purpose:
      'Works the back of the hips and the base of the spine through range with very little compression, which makes it a useful finisher on days your back feels sensitive.',
  },
  {
    id: 'ex_couch_stretch',
    program_id: PROGRAM_ID,
    name: 'Couch Stretch',
    focus: 'Hip flexors and quads',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Kneel with your back shin against a wall or couch and your front foot planted. Slowly lift your torso upright until you feel a stretch down the front of the back hip and thigh. Keep your ribs down — do not let your lower back arch to escape it.',
    purpose:
      'Hours of sitting leave the front of the hip short, and a short hip flexor drags the lower back into an arch all day. Giving that tissue length takes the pull off your spine.',
  },
  {
    id: 'ex_hip_switch',
    program_id: PROGRAM_ID,
    name: '90/90 Hip Switch',
    focus: 'Hip rotation',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Sit with both knees bent at right angles, one leg in front and one out to the side. Keeping your chest tall, rotate both knees across to the other side and settle into the new position before switching back.',
    purpose:
      'Hips that cannot rotate make the lower back do the twisting instead. This gives the rotation back to the joint built for it.',
  },
  {
    id: 'ex_cat_cow',
    program_id: PROGRAM_ID,
    name: 'Cat Cow',
    focus: 'Segmental spine',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'On hands and knees, round your spine towards the ceiling one segment at a time, then reverse into a gentle arch. Move slowly enough that you can feel each part of your back take its turn.',
    purpose:
      'Backs that hurt tend to move as one stiff block. Moving through range without load reminds the spine it is allowed to bend.',
  },
  {
    id: 'ex_deep_squat',
    program_id: PROGRAM_ID,
    name: 'Deep Squat Hold',
    focus: 'Hips, ankles, adductors',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Drop into the deepest squat you can hold with your heels down, and let your elbows rest inside your knees. Hold the position and breathe. Hold a doorframe for support if your heels lift.',
    purpose:
      'The resting position most of us have lost. Time spent down here opens the hips and ankles that your back has been compensating for.',
  },
  {
    id: 'ex_thoracic_opener',
    program_id: PROGRAM_ID,
    name: 'Thoracic Opener',
    focus: 'Upper back rotation',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Lie on your side with knees stacked and bent. Open the top arm across your body towards the floor behind you, following your hand with your eyes, and let your upper back rotate while your knees stay put.',
    purpose:
      'When the upper back will not rotate, the lower back rotates for it. Restoring motion higher up removes a load your spine was never meant to carry.',
  },
  {
    id: 'ex_hamstring_floss',
    program_id: PROGRAM_ID,
    name: 'Hamstring Floss',
    focus: 'Hamstrings and sciatic glide',
    video_url: null,
    thumbnail_url: null,
    prerequisites: 'None',
    instructions:
      'Lie on your back with one knee bent towards your chest. Straighten the knee until you feel tension behind the thigh, then bend it again. Keep it moving rather than holding the stretch.',
    purpose:
      'Gentle movement rather than a held stretch, which is what irritated nerve tissue responds to best. Useful on the days sitting has made everything feel tight.',
  },
];

/** The running order of each session. Prescriptions live here, not on the exercise. */
export const sessionExercises: SessionExercise[] = [
  { id: 'se_flow_1', session_type_id: 'st_flow', exercise_id: 'ex_back_extension', sort_order: 1, prescription: '3 x 2m holds' },
  { id: 'se_flow_2', session_type_id: 'st_flow', exercise_id: 'ex_hip_hinge', sort_order: 2, prescription: '3 x 10 reps' },
  { id: 'se_flow_3', session_type_id: 'st_flow', exercise_id: 'ex_bird_dog', sort_order: 3, prescription: '3 x 8 reps · Both sides' },
  { id: 'se_flow_4', session_type_id: 'st_flow', exercise_id: 'ex_dead_bug', sort_order: 4, prescription: '3 x 10 reps' },
  { id: 'se_flow_5', session_type_id: 'st_flow', exercise_id: 'ex_split_squat', sort_order: 5, prescription: '3 x 8 reps · Both sides' },
  { id: 'se_flow_6', session_type_id: 'st_flow', exercise_id: 'ex_suitcase_carry', sort_order: 6, prescription: '3 x 30m · Both sides' },
  { id: 'se_flow_7', session_type_id: 'st_flow', exercise_id: 'ex_reverse_hyper', sort_order: 7, prescription: '2 x 12 reps' },

  { id: 'se_mob_1', session_type_id: 'st_mobility', exercise_id: 'ex_couch_stretch', sort_order: 1, prescription: '2 x 1m holds · Both sides' },
  { id: 'se_mob_2', session_type_id: 'st_mobility', exercise_id: 'ex_hip_switch', sort_order: 2, prescription: '2 x 10 reps' },
  { id: 'se_mob_3', session_type_id: 'st_mobility', exercise_id: 'ex_cat_cow', sort_order: 3, prescription: '2 x 10 reps' },
  { id: 'se_mob_4', session_type_id: 'st_mobility', exercise_id: 'ex_deep_squat', sort_order: 4, prescription: '2 x 2m holds' },
  { id: 'se_mob_5', session_type_id: 'st_mobility', exercise_id: 'ex_thoracic_opener', sort_order: 5, prescription: '2 x 1m · Both sides' },
  { id: 'se_mob_6', session_type_id: 'st_mobility', exercise_id: 'ex_hamstring_floss', sort_order: 6, prescription: '2 x 12 reps · Both sides' },
];

export const weeklySchedule: WeeklyScheduleEntry[] = [
  { id: 'ws_mon', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'monday', session_type_id: 'st_flow' },
  { id: 'ws_tue', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'tuesday', session_type_id: 'st_mobility' },
  { id: 'ws_wed', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'wednesday', session_type_id: 'st_flow' },
  { id: 'ws_thu', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'thursday', session_type_id: 'st_mobility' },
  { id: 'ws_fri', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'friday', session_type_id: 'st_flow' },
  { id: 'ws_sat', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'saturday', session_type_id: null },
  { id: 'ws_sun', user_id: USER_ID, program_id: PROGRAM_ID, day_of_week: 'sunday', session_type_id: null },
];

/** The same plan in the shape the schedule editor works with. */
export const defaultSchedule: ScheduleMap = weeklySchedule.reduce((acc, entry) => {
  acc[entry.day_of_week] = entry.session_type_id;
  return acc;
}, {} as ScheduleMap);

export const sessions: Session[] = [
  { id: 's_17', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: 'st_flow', scheduled_date: '2026-08-17', status: 'completed', completed_at: '2026-08-17T08:30:00Z' },
  { id: 's_18', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: 'st_mobility', scheduled_date: '2026-08-18', status: 'scheduled', completed_at: null },
  { id: 's_19', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: 'st_flow', scheduled_date: '2026-08-19', status: 'scheduled', completed_at: null },
  { id: 's_20', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: 'st_mobility', scheduled_date: '2026-08-20', status: 'scheduled', completed_at: null },
  { id: 's_21', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: 'st_flow', scheduled_date: '2026-08-21', status: 'scheduled', completed_at: null },
  { id: 's_22', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: null, scheduled_date: '2026-08-22', status: 'rest', completed_at: null },
  { id: 's_23', user_id: USER_ID, program_id: PROGRAM_ID, session_type_id: null, scheduled_date: '2026-08-23', status: 'rest', completed_at: null },
];

export const signatureExercise: SignatureExercise = {
  id: 'sig_back_ext',
  program_id: PROGRAM_ID,
  name: 'Back Extension',
  description: 'The central exercise of the Long Game.',
  is_central: true,
};

export const progressionLevels: ProgressionLevel[] = [
  { id: 'pl_iso', signature_exercise_id: 'sig_back_ext', name: 'Iso Holds', level: 1, goal_label: '1 × 2m hold', metric: 'time' },
  { id: 'pl_sl_iso', signature_exercise_id: 'sig_back_ext', name: 'Single Leg Iso Holds', level: 2, goal_label: '1 × 1m hold · Both sides', metric: 'time' },
  { id: 'pl_reps', signature_exercise_id: 'sig_back_ext', name: 'Reps', level: 3, goal_label: '1 × 30 reps', metric: 'reps' },
  { id: 'pl_sl_reps', signature_exercise_id: 'sig_back_ext', name: 'Single Leg Reps', level: 4, goal_label: '1 × 20 reps · Both sides', metric: 'reps' },
  { id: 'pl_weighted', signature_exercise_id: 'sig_back_ext', name: 'Weighted Reps', level: 5, goal_label: '1 × 10 reps', metric: 'reps' },
];

export const userProgression: UserProgression = {
  id: 'up_1',
  user_id: USER_ID,
  signature_exercise_id: 'sig_back_ext',
  current_progression_level_id: 'pl_iso',
  updated_at: '2026-08-17T08:30:00Z',
};

export const learnContent: LearnContent[] = [
  { id: 'lc_1', program_id: PROGRAM_ID, kind: 'mini_lesson', title: 'Lesson 1', subtitle: 'Tissue Tolerance', thumbnail_url: null, video_url: null, sort_order: 1 },
  { id: 'lc_2', program_id: PROGRAM_ID, kind: 'mini_lesson', title: 'Lesson 2', subtitle: 'Your Mentality', thumbnail_url: null, video_url: null, sort_order: 2 },
  { id: 'lc_3', program_id: PROGRAM_ID, kind: 'longform', title: 'Will This Work for My Injury?', subtitle: 'Understand the real problem before the real solution.', thumbnail_url: null, video_url: null, sort_order: 3 },
  { id: 'lc_4', program_id: PROGRAM_ID, kind: 'longform', title: 'Tissue Tolerance, In Depth', subtitle: 'Committing to understanding tolerance.', thumbnail_url: null, video_url: null, sort_order: 4 },
];

/** A week of check-ins so the trend has something to draw before the user adds theirs. */
export const progress: Progress[] = [
  { id: 'pr_11', user_id: USER_ID, date: '2026-08-11', checked_in: true, pain_score: 7, pain_location: 'Lower back, left side', deposits_made: 1, workouts_completed: 1 },
  { id: 'pr_12', user_id: USER_ID, date: '2026-08-12', checked_in: true, pain_score: 6, pain_location: 'Lower back', deposits_made: 1, workouts_completed: 0 },
  { id: 'pr_13', user_id: USER_ID, date: '2026-08-13', checked_in: true, pain_score: 6, pain_location: 'Lower back into the glute', deposits_made: 1, workouts_completed: 1 },
  { id: 'pr_14', user_id: USER_ID, date: '2026-08-14', checked_in: true, pain_score: 5, pain_location: 'Lower back', deposits_made: 1, workouts_completed: 1 },
  { id: 'pr_15', user_id: USER_ID, date: '2026-08-15', checked_in: true, pain_score: 4, pain_location: 'Stiff in the morning only', deposits_made: 1, workouts_completed: 0 },
  { id: 'pr_16', user_id: USER_ID, date: '2026-08-16', checked_in: true, pain_score: 4, pain_location: 'Lower back', deposits_made: 1, workouts_completed: 1 },
  { id: 'pr_17', user_id: USER_ID, date: '2026-08-17', checked_in: true, pain_score: 3, pain_location: 'Barely there after the session', deposits_made: 1, workouts_completed: 1 },
];

export const todayProgress: Progress = progress[progress.length - 1];

/** Dates the user has already finished a session on — the seed for the log. */
export const completedDates: ISODate[] = sessions
  .filter((s) => s.status === 'completed')
  .map((s) => s.scheduled_date);
