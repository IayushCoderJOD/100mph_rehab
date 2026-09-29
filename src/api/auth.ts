import { Exercise, ISODate, User, UserStatus } from '@/data';
import { api } from './client';
import { endpoints } from './endpoints';
import { tokenStore } from './tokens';
import {
  AssignedExerciseResponse,
  AuthResponse,
  CheckInPayload,
  CheckInResponse,
  CheckInSummary,
  ClientDetail,
  ClientSummary,
  CreateExercisePayload,
  CreateUserPayload,
  LogSessionPayload,
  MeResponse,
  ProgramContent,
  ProgressionResponse,
  RoutineResponse,
  SessionLogResponse,
  SessionPlanResponse,
  UpdateExercisePayload,
  UpdateMePayload,
  UpdatePlanPayload,
  UploadKind,
  UploadTicket,
  WeeklyPlanResponse,
} from './types';

export const authApi = {
  /** Signs in and persists the pair. The caller gets the user record back. */
  async signIn(email: string, password: string, timezone: string): Promise<User> {
    const body = await api.post<AuthResponse>(
      endpoints.auth.password,
      { email: email.trim(), password, timezone },
      true
    );
    await tokenStore.save({
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
    });
    return body.user;
  },

  me: () => api.get<MeResponse>(endpoints.me.root),

  updateMe: (patch: UpdateMePayload) => api.patch<MeResponse>(endpoints.me.root, patch),

  setProgram: (programId: string) =>
    api.put<MeResponse>(endpoints.me.program, { program_id: programId }),

  /**
   * Best-effort: tells the server to revoke the refresh token, then clears the
   * device either way. A logout that fails on the network must still log you
   * out locally.
   */
  async signOut(): Promise<void> {
    const stored = await tokenStore.read();
    if (stored) {
      try {
        await api.post<void>(endpoints.auth.logout, { refresh_token: stored.refreshToken }, true);
      } catch {
        // The local clear below is what matters.
      }
    }
    await tokenStore.clear();
  },

  /**
   * Replaces the member's own password. The server ends every other session
   * and hands this device a fresh pair, which is stored so it stays signed in.
   */
  /**
   * Deletes the signed-in account and everything recorded about it, for good.
   * The server ends every session with it, so this device only forgets its tokens.
   */
  async deleteAccount(password: string): Promise<void> {
    await api.delete<void>(endpoints.me.root, { password });
    await tokenStore.clear();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const body = await api.put<AuthResponse>(endpoints.me.password, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    await tokenStore.save({
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
    });
  },

  requestPasswordReset: (email: string) =>
    api.post<void>(endpoints.auth.forgotPassword, { email: email.trim() }, true),

  resetPassword: (token: string, password: string) =>
    api.post<void>(endpoints.auth.resetPassword, { token, password }, true),
};

export const contentApi = {
  programs: () => api.get<unknown[]>(endpoints.content.programs),
  /** The published library: what a coach can prescribe. */
  exercises: () => api.get<Exercise[]>(endpoints.content.exercises),
  /** One exercise, hidden ones included — for a guide opened from an older plan. */
  exercise: (exerciseId: string) => api.get<Exercise>(endpoints.content.exercise(exerciseId)),
  programContent: (programId: string) =>
    api.get<ProgramContent>(endpoints.content.programContent(programId)),
  learn: (contentId: string) => api.get(endpoints.content.learn(contentId)),
  routines: () => api.get<RoutineResponse[]>(endpoints.content.routines),
};

export const planApi = {
  /** The signed-in member's week. Read-only from this side — the physio writes it. */
  mine: () => api.get<WeeklyPlanResponse>(endpoints.plan.root),
};

export const sessionApi = {
  plan: (date?: ISODate) =>
    api.get<SessionPlanResponse>(
      date ? `${endpoints.sessions.plan}?date=${date}` : endpoints.sessions.plan
    ),

  /** Safe to retry with the same id — that is what makes offline logging work. */
  log: (payload: LogSessionPayload) =>
    api.post<SessionLogResponse>(endpoints.sessions.root, payload),

  history: (from?: ISODate, to?: ISODate) =>
    api.get<SessionLogResponse[]>(
      from && to ? `${endpoints.sessions.root}?from=${from}&to=${to}` : endpoints.sessions.root
    ),

  completedDates: () => api.get<ISODate[]>(endpoints.sessions.completedDates),

  remove: (sessionId: string) => api.delete<void>(endpoints.sessions.byId(sessionId)),
};

export const checkInApi = {
  range: (from?: ISODate, to?: ISODate) =>
    api.get<CheckInResponse[]>(
      from && to ? `${endpoints.checkIns.root}?from=${from}&to=${to}` : endpoints.checkIns.root
    ),

  summary: () => api.get<CheckInSummary>(endpoints.checkIns.summary),

  /** PUT the day: writing it twice is writing it once. */
  put: (date: ISODate, payload: CheckInPayload) =>
    api.put<CheckInResponse>(endpoints.checkIns.byDate(date), payload),
};

export const progressionApi = {
  mine: () => api.get<ProgressionResponse[]>(endpoints.progression.root),
  set: (signatureExerciseId: string, progressionLevelId: string) =>
    api.put<ProgressionResponse>(endpoints.progression.root, {
      signature_exercise_id: signatureExerciseId,
      progression_level_id: progressionLevelId,
    }),
};

export const assignmentApi = {
  mine: () => api.get<AssignedExerciseResponse[]>(endpoints.assignedExercises.root),
};

export const adminApi = {
  listUsers: () => api.get<User[]>(endpoints.admin.users),

  createUser: (payload: CreateUserPayload) => api.post<User>(endpoints.admin.users, payload),

  setUserStatus: (userId: string, status: UserStatus) =>
    api.patch<User>(endpoints.admin.userStatus(userId), { status }),

  /** A new temporary password for a client who is locked out. Signs them out everywhere. */
  /** Deletes a client's account and all of their data. Suspending is the reversible option. */
  deleteUser: (userId: string) => api.delete<void>(endpoints.admin.user(userId)),

  setUserPassword: (userId: string, password: string) =>
    api.put<void>(endpoints.admin.userPassword(userId), { password }),

  /** The roster with adherence and attention flags, computed server-side. */
  roster: () => api.get<ClientSummary[]>(endpoints.admin.clients),

  client: (userId: string) => api.get<ClientDetail>(endpoints.admin.client(userId)),

  assignExercise: (
    userId: string,
    payload: { exercise_id: string; prescription: string; note?: string }
  ) => api.post<AssignedExerciseResponse>(endpoints.admin.clientAssignments(userId), payload),

  withdrawAssignment: (userId: string, assignmentId: string) =>
    api.delete<void>(endpoints.admin.clientAssignment(userId, assignmentId)),

  clientPlan: (userId: string) => api.get<WeeklyPlanResponse>(endpoints.admin.clientPlan(userId)),

  /** Replaces the whole week — a partial plan is ambiguous about rest days. */
  replacePlan: (userId: string, payload: UpdatePlanPayload) =>
    api.put<WeeklyPlanResponse>(endpoints.admin.clientPlan(userId), payload),

  setProgression: (userId: string, signatureExerciseId: string, progressionLevelId: string) =>
    api.put<ProgressionResponse>(endpoints.admin.clientProgression(userId), {
      signature_exercise_id: signatureExerciseId,
      progression_level_id: progressionLevelId,
    }),

  /** The whole exercise library, drafts and hidden movements included. */
  exercises: () => api.get<Exercise[]>(endpoints.admin.exercises),

  createExercise: (payload: CreateExercisePayload) => api.post<Exercise>(endpoints.admin.exercises, payload),

  updateExercise: (exerciseId: string, payload: UpdateExercisePayload) =>
    api.patch<Exercise>(endpoints.admin.exercise(exerciseId), payload),

  /** Somewhere to PUT one file. The file goes straight to storage, not through the API. */
  requestUpload: (kind: UploadKind, contentType: string, sizeBytes: number, fileName: string) =>
    api.post<UploadTicket>(endpoints.admin.exerciseUploads, {
      kind,
      content_type: contentType,
      size_bytes: sizeBytes,
      file_name: fileName,
    }),
};
