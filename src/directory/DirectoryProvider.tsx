import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AssignedExerciseResponse,
  ClientSummary,
  CreateUserPayload,
  UpdatePlanPayload,
  WeeklyPlanResponse,
  adminApi,
  messageFor,
} from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { User, UserRole, UserStatus } from '@/data';

export type CreateUserInput = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  /** Optional focus area — the week is what they train on. */
  program_id: string | null;
  role: UserRole;
};

/** One prescription in a batch. */
export type AssignLine = {
  exercise_id: string;
  prescription: string;
};

/** Mutations report failure as a message rather than throwing, so forms can render it. */
export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

/** A batch write: what landed, and what did not, so a form can say exactly that. */
export type BatchResult = {
  created: AssignedExerciseResponse[];
  failed: { exercise_id: string; error: string }[];
};

type DirectoryContextValue = {
  /** The roster with the server's read of each client — adherence, pain, attention. */
  roster: ClientSummary[];
  /** True while the roster is being fetched, for the screens that show it. */
  loading: boolean;
  error: string | null;
  userById: (id: string | null) => User | null;
  summaryById: (id: string | null) => ClientSummary | null;
  createUser: (input: CreateUserInput) => Promise<Result<User>>;
  setUserStatus: (userId: string, status: UserStatus) => Promise<Result<User>>;
  /** Deletes the account and all of its data; the client leaves the roster at once. */
  deleteUser: (userId: string) => Promise<Result>;
  assignExercises: (userId: string, lines: AssignLine[], note: string) => Promise<BatchResult>;
  removeAssignment: (userId: string, assignmentId: string) => Promise<Result>;
  replacePlan: (userId: string, payload: UpdatePlanPayload) => Promise<Result<WeeklyPlanResponse>>;
  reload: () => Promise<void>;
};

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

/**
 * The practice's roster and the writes a coach makes against it, all through
 * the API. Nothing here is cached on the device: a prescription written on
 * the physio's phone has to be on the member's phone by the time they look,
 * and the only place both of them read from is the server.
 *
 * `/admin/*` is admin-only, so this only fetches for staff; a member's screens
 * never ask for the list.
 */
export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser } = useAuth();
  const isStaff = currentUser?.role === 'admin';

  const [roster, setRoster] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isStaff) {
      setRoster([]);
      return;
    }
    setError(null);
    try {
      setRoster(await adminApi.roster());
    } catch (err) {
      // A failed roster read leaves the previous list rather than blanking the
      // screen; the staff member can pull again.
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff) setLoading(true);
    void reload();
  }, [reload, isStaff]);

  /** Swaps one client's server row after a write, so the list is right without a refetch. */
  const patchUser = useCallback((updated: User) => {
    setRoster((current) =>
      current.map((row) => (row.user.id === updated.id ? { ...row, user: updated } : row))
    );
  }, []);

  const createUser = useCallback(
    async (input: CreateUserInput): Promise<Result<User>> => {
      const payload: CreateUserPayload = {
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        password: input.password,
        role: input.role,
      };
      if (input.program_id) payload.program_id = input.program_id;
      const phone = input.phone.trim();
      if (phone) payload.phone = phone;

      try {
        const created = await adminApi.createUser(payload);
        // The summary columns are the server's to compute; pull the row properly.
        void reload();
        return { ok: true, value: created };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [reload]
  );

  const setUserStatus = useCallback(
    async (userId: string, status: UserStatus): Promise<Result<User>> => {
      try {
        const updated = await adminApi.setUserStatus(userId, status);
        patchUser(updated);
        return { ok: true, value: updated };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [patchUser]
  );

  const deleteUser = useCallback(async (userId: string): Promise<Result> => {
    try {
      await adminApi.deleteUser(userId);
      setRoster((current) => current.filter((row) => row.user.id !== userId));
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: messageFor(err) };
    }
  }, []);

  const assignExercises = useCallback(
    async (userId: string, lines: AssignLine[], note: string): Promise<BatchResult> => {
      const created: AssignedExerciseResponse[] = [];
      const failed: BatchResult['failed'] = [];
      const trimmedNote = note.trim();

      // One row at a time, in the order the coach listed them, so sort_order
      // on the server matches what they saw. A failure on one line does not
      // stop the rest — the form reports exactly which ones did not land.
      for (const line of lines) {
        try {
          created.push(
            await adminApi.assignExercise(userId, {
              exercise_id: line.exercise_id,
              prescription: line.prescription.trim(),
              ...(trimmedNote ? { note: trimmedNote } : {}),
            })
          );
        } catch (err) {
          failed.push({ exercise_id: line.exercise_id, error: messageFor(err) });
        }
      }

      if (created.length > 0) void reload();
      return { created, failed };
    },
    [reload]
  );

  const removeAssignment = useCallback(
    async (userId: string, assignmentId: string): Promise<Result> => {
      try {
        await adminApi.withdrawAssignment(userId, assignmentId);
        void reload();
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [reload]
  );

  const replacePlan = useCallback(
    async (userId: string, payload: UpdatePlanPayload): Promise<Result<WeeklyPlanResponse>> => {
      try {
        const saved = await adminApi.replacePlan(userId, payload);
        void reload();
        return { ok: true, value: saved };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    [reload]
  );

  const value = useMemo<DirectoryContextValue>(
    () => ({
      roster,
      loading,
      error,
      userById: (id) => {
        if (!id) return null;
        // The signed-in user is known from the session even when the roster is
        // not loaded — which is the case for every member.
        if (currentUser && currentUser.id === id) return currentUser;
        return roster.find((row) => row.user.id === id)?.user ?? null;
      },
      summaryById: (id) => (id ? (roster.find((row) => row.user.id === id) ?? null) : null),
      createUser,
      setUserStatus,
      deleteUser,
      assignExercises,
      removeAssignment,
      replacePlan,
      reload,
    }),
    [
      roster,
      loading,
      error,
      currentUser,
      createUser,
      setUserStatus,
      deleteUser,
      assignExercises,
      removeAssignment,
      replacePlan,
      reload,
    ]
  );

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory() {
  const ctx = useContext(DirectoryContext);
  if (!ctx) throw new Error('useDirectory must be used within DirectoryProvider');
  return ctx;
}
