import {
  AssignedExercise,
  DayOfWeek,
  Exercise,
  ISODate,
  LearnContent,
  LearnTopic,
  Program,
  ProgressionLevel,
  Routine,
  SessionExercise,
  SessionType,
  SignatureExercise,
  User,
  UserStatus,
  WeeklyPlan,
} from '@/data';

/** POST /auth/password and /auth/refresh both return this. */
export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
};

export type Entitlement = {
  can_train: boolean;
  can_view_learn: boolean;
  /** Why not, when can_train is false: 'account_suspended', 'no_program', … */
  reason: string | null;
};

export type MeResponse = {
  user: User;
  subscription: unknown | null;
  entitlement: Entitlement;
  flags: { learn_tab_enabled: boolean };
};

/** GET /programs/:id/content — the whole catalogue for one program. */
export type ProgramContent = {
  program: Program;
  session_types: SessionType[];
  exercises: Exercise[];
  session_exercises: SessionExercise[];
  signature_exercises: SignatureExercise[];
  progression_levels: ProgressionLevel[];
  learn_content: LearnContent[];
  learn_topics: LearnTopic[];
  default_schedule: { program_id: string; day_of_week: DayOfWeek; session_type_id: string }[];
};

/** GET /plan and /admin/clients/:id/plan — every day present, rest days empty. */
export type WeeklyPlanResponse = WeeklyPlan;

/** PUT /admin/clients/:id/plan. Days left out are rest; order in the list is the order. */
export type UpdatePlanPayload = {
  days: Partial<Record<DayOfWeek, { exercise_id: string; prescription: string }[]>>;
};

export type RoutineResponse = Routine;

export type SessionPlanResponse = {
  local_date: ISODate;
  exercises: { exercise: Exercise; prescription: string }[];
  completed: boolean;
};

export type SessionLogResponse = {
  id: string;
  user_id: string;
  program_id: string;
  session_type_id: string | null;
  local_date: ISODate;
  source: string;
  duration_min: number | null;
  note: string | null;
  completed_exercises: { exercise_id: string; completed: boolean; note: string | null }[];
  completed_at: string;
};

export type LogSessionPayload = {
  /** Generated on the device at the moment of the tap, so a retry is safe. */
  id: string;
  local_date?: ISODate;
  session_type_id?: string | null;
  source?: 'guided' | 'logged';
  duration_min?: number;
  note?: string;
  exercises?: { exercise_id: string; completed?: boolean; note?: string }[];
};

export type CheckInResponse = {
  id: string;
  local_date: ISODate;
  checked_in: boolean;
  pain_score: number | null;
  pain_location: string | null;
  note: string | null;
};

export type CheckInPayload = {
  checked_in?: boolean;
  pain_score?: number | null;
  pain_location?: string | null;
  note?: string | null;
};

export type CheckInSummary = {
  current_streak: number;
  longest_streak: number;
  total_check_ins: number;
  total_sessions: number;
  average_pain_score: number | null;
  latest_pain_score: number | null;
  latest_check_in_date: ISODate | null;
  /** Share of planned sessions completed over the last four weeks, 0–1. */
  adherence: number | null;
};

export type ProgressionResponse = {
  signature_exercise: SignatureExercise;
  current_level: ProgressionLevel;
  levels: ProgressionLevel[];
};

/** A prescription, with the catalogue exercise already inlined. */
export type AssignedExerciseResponse = AssignedExercise & {
  exercise: Exercise | null;
  assigned_by_name: string;
};

export type ClientSummary = {
  user: User;
  adherence: number | null;
  latest_pain_score: number | null;
  average_pain_score: number | null;
  last_active_date: ISODate | null;
  current_streak: number;
  total_check_ins: number;
  checked_in_today: boolean;
  /** Sessions logged in the last seven days, today included. */
  sessions_this_week: number;
  active_assignments: number;
  /** False until the coach has written this client's week. */
  has_plan: boolean;
  /** Computed by the server, so every client agrees who needs a call. */
  needs_attention: boolean;
};

export type ClientDetail = {
  user: User;
  plan: WeeklyPlanResponse | null;
  recent_sessions: SessionLogResponse[];
  recent_check_ins: CheckInResponse[];
  summary: CheckInSummary;
  assigned_exercises: AssignedExerciseResponse[];
  progression: ProgressionResponse[];
};

export type CreateUserPayload = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  /** Optional focus area. The week the coach writes is what the member trains on. */
  program_id?: string;
  role: 'member' | 'admin';
};

export type UpdateMePayload = {
  full_name?: string;
  /** Empty string clears it. */
  phone?: string;
  timezone?: string;
  avatar_url?: string | null;
  date_of_birth?: ISODate;
  height_cm?: number;
  weight_kg?: number;
};

export type SetStatusPayload = { status: UserStatus };
