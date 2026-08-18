/**
 * Field names mirror the planned Supabase/Postgres columns (snake_case) so that
 * swapping mock data for real queries is a data-source change, not a rewrite.
 */

export type UUID = string;
export type ISODate = string;

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type SessionStatus = 'completed' | 'scheduled' | 'upcoming' | 'rest' | 'missed';
export type ProgressionMetric = 'time' | 'reps';
export type LearnKind = 'mini_lesson' | 'longform';
export type SubscriptionStatus = 'active' | 'expired' | 'pending';

export interface User {
  id: UUID;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  active_program_id: UUID;
  member_since: ISODate;
  created_at: ISODate;
}

export interface Plan {
  id: UUID;
  name: string;
  description: string;
  duration_days: number;
  /** Display-ready price, so currency and cadence stay a content decision. */
  price_label: string;
}

export interface Subscription {
  id: UUID;
  user_id: UUID;
  plan_id: UUID;
  status: SubscriptionStatus;
  started_at: ISODate;
  expires_at: ISODate;
}

export interface Program {
  id: UUID;
  name: string;
  slug: string;
  tagline: string;
  icon: string;
  created_at: ISODate;
}

export interface LearnTopic {
  id: UUID;
  title: string;
  subtitle: string;
  icon: string;
}

export interface SessionType {
  id: UUID;
  program_id: UUID;
  name: string;
  description: string;
  icon: string;
  is_primary: boolean;
  frequency_per_week: number;
  approx_duration_min: number;
}

export interface Session {
  id: UUID;
  user_id: UUID;
  program_id: UUID;
  session_type_id: UUID | null;
  scheduled_date: ISODate;
  status: SessionStatus;
  completed_at: ISODate | null;
}

export interface WeeklyScheduleEntry {
  id: UUID;
  user_id: UUID;
  program_id: UUID;
  day_of_week: DayOfWeek;
  session_type_id: UUID | null;
}

/**
 * A week of training the way the user edits it: one session type per day, or
 * null for rest. This is the editable shape; WeeklyScheduleEntry is how the
 * same thing is stored as rows.
 */
export type ScheduleMap = Record<DayOfWeek, UUID | null>;

export interface Exercise {
  id: UUID;
  program_id: UUID;
  name: string;
  /** One line on what it works, for the list and the guide subtitle. */
  focus: string;
  video_url: string | null;
  thumbnail_url: string | null;
  prerequisites: string;
  instructions: string;
  purpose: string;
}

/** Which exercises make up a session type, in the order they are performed. */
export interface SessionExercise {
  id: UUID;
  session_type_id: UUID;
  exercise_id: UUID;
  sort_order: number;
  /** What this session asks for today, e.g. '2 x 1m holds'. */
  prescription: string;
}

export interface SignatureExercise {
  id: UUID;
  program_id: UUID;
  name: string;
  description: string;
  is_central: boolean;
}

export interface ProgressionLevel {
  id: UUID;
  signature_exercise_id: UUID;
  name: string;
  level: number;
  goal_label: string;
  metric: ProgressionMetric;
}

export interface UserProgression {
  id: UUID;
  user_id: UUID;
  signature_exercise_id: UUID;
  current_progression_level_id: UUID;
  updated_at: ISODate;
}

export interface LearnContent {
  id: UUID;
  program_id: UUID;
  kind: LearnKind;
  title: string;
  subtitle: string;
  thumbnail_url: string | null;
  video_url: string | null;
  sort_order: number;
}

export interface Progress {
  id: UUID;
  user_id: UUID;
  date: ISODate;
  checked_in: boolean;
  /** 0 = no pain, 10 = severe. Null when the day was logged without a score. */
  pain_score: number | null;
  /** Free text: where it was felt. */
  pain_location: string | null;
  deposits_made: number;
  workouts_completed: number;
}
