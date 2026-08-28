/**
 * Every path the app calls, in one place.
 *
 * No route string is written anywhere else — a call site names an endpoint, it
 * does not spell one. That way the API surface can be read in full from this
 * file, and a change to a path is a change in exactly one place rather than a
 * search across screens.
 *
 * Paths are relative to the base URL in config.ts, which already carries `/v1`.
 */
export const endpoints = {
  health: '/health',

  auth: {
    /** POST — email + password sign-in. */
    password: '/auth/password',
    /** POST — exchange a refresh token for a rotated pair. */
    refresh: '/auth/refresh',
    /** POST — revoke one refresh token. */
    logout: '/auth/logout',
    /** POST — always 202, whether or not the address is a member. */
    forgotPassword: '/auth/password/forgot',
    /** POST — consume a reset grant and set a new password. */
    resetPassword: '/auth/password/reset',
  },

  me: {
    /** GET — the boot call. PATCH — profile fields. */
    root: '/me',
    /** PUT — set the program this member trains on. */
    program: '/me/program',
  },

  content: {
    /** GET — public; backs the program picker. */
    programs: '/programs',
    /** GET — everything needed to render one program, in one request. */
    programContent: (programId: string) => `/programs/${programId}/content`,
    /** GET — one exercise, for the guide screen. */
    exercise: (exerciseId: string) => `/exercises/${exerciseId}`,
    /** GET — one lesson. */
    learn: (contentId: string) => `/learn/${contentId}`,
  },

  schedule: {
    /** GET the week. PUT replaces it whole. */
    root: '/schedule',
  },

  sessions: {
    /** GET — history. POST — log a completed session. */
    root: '/sessions',
    /** GET — what a given day asks for. */
    plan: '/sessions/plan',
    /** GET — just the dates, for the week strip. */
    completedDates: '/sessions/completed-dates',
    /** DELETE — remove a logged session. */
    byId: (sessionId: string) => `/sessions/${sessionId}`,
  },

  checkIns: {
    /** GET — a range of days. */
    root: '/check-ins',
    /** GET — streaks, adherence and latest pain, all computed server-side. */
    summary: '/check-ins/summary',
    /** GET one day. PUT writes or revises it. */
    byDate: (date: string) => `/check-ins/${date}`,
  },

  progression: {
    /** GET — every ladder in the program. PUT — move yourself. */
    root: '/progression',
  },

  assignedExercises: {
    /** GET — what the coach has prescribed to me. */
    root: '/assigned-exercises',
  },

  admin: {
    /** POST — provision an account. GET — the raw user list. */
    users: '/admin/users',
    /** PATCH — active / invited / suspended. */
    userStatus: (userId: string) => `/admin/users/${userId}/status`,

    /** GET — the roster, with adherence and attention flags. */
    clients: '/admin/clients',
    /** GET — the whole picture of one client. */
    client: (userId: string) => `/admin/clients/${userId}`,
    /** GET the client's prescriptions. POST adds one. */
    clientAssignments: (userId: string) => `/admin/clients/${userId}/assigned-exercises`,
    /** DELETE — withdraw a prescription. */
    clientAssignment: (userId: string, assignmentId: string) =>
      `/admin/clients/${userId}/assigned-exercises/${assignmentId}`,
    /** PUT — a coach override of a client's progression. */
    clientProgression: (userId: string) => `/admin/clients/${userId}/progression`,
  },
} as const;
