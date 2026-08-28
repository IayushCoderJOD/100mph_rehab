import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CreateUserPayload, adminApi, messageFor } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { AssignedExercise, User, UserRole, UserStatus, mock } from '@/data';

const ASSIGNMENTS_KEY = 'app.directory.assignments';

export type CreateUserInput = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  program_id: string;
  role: UserRole;
};

export type AssignExerciseInput = {
  user_id: string;
  exercise_id: string;
  assigned_by: string;
  prescription: string;
  note: string;
};

/** Mutations report failure as a message rather than throwing, so forms can render it. */
export type Result = { ok: true } | { ok: false; error: string };

type DirectoryContextValue = {
  users: User[];
  assignments: AssignedExercise[];
  /** True while the roster is being fetched, for the screens that show it. */
  loading: boolean;
  userById: (id: string | null) => User | null;
  assignmentsFor: (userId: string) => AssignedExercise[];
  createUser: (input: CreateUserInput) => Promise<Result>;
  setUserStatus: (userId: string, status: UserStatus) => Promise<Result>;
  assignExercise: (input: AssignExerciseInput) => Result;
  removeAssignment: (assignmentId: string) => void;
  reload: () => Promise<void>;
};

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

/**
 * The roster, backed by the API.
 *
 * `/admin/users` is admin-only, so this only fetches for staff; a member's
 * screens never ask for the list. It sits *below* AuthProvider now — the
 * requests it makes need a token, and the mock credential check it used to own
 * has moved to the server where it belongs.
 *
 * Assignments are still local. The prescribe-an-exercise endpoints are Phase 7
 * on the backend and do not exist yet, so that slice keeps working exactly as
 * it did rather than being half-migrated.
 */
export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser } = useAuth();
  const isStaff = currentUser?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssignedExercise[]>(mock.assignedExercises);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isStaff) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      setUsers(await adminApi.listUsers());
    } catch {
      // A failed roster read leaves the previous list rather than blanking the
      // screen; the staff member can pull again.
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    AsyncStorage.getItem(ASSIGNMENTS_KEY)
      .then((stored) => {
        if (stored) setAssignments(JSON.parse(stored) as AssignedExercise[]);
      })
      .catch(() => {
        // A corrupt cache should not break the screen — keep the seed.
      });
  }, []);

  const persistAssignments = useCallback((next: AssignedExercise[]) => {
    setAssignments(next);
    AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(next));
  }, []);

  const createUser = useCallback(
    async (input: CreateUserInput): Promise<Result> => {
      const payload: CreateUserPayload = {
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        password: input.password,
        program_id: input.program_id,
        role: input.role,
      };

      const phone = input.phone.trim();
      if (phone) payload.phone = phone;

      try {
        const created = await adminApi.createUser(payload);
        setUsers((current) => [...current, created]);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    []
  );

  const setUserStatus = useCallback(
    async (userId: string, status: UserStatus): Promise<Result> => {
      try {
        const updated = await adminApi.setUserStatus(userId, status);
        setUsers((current) => current.map((u) => (u.id === userId ? updated : u)));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: messageFor(err) };
      }
    },
    []
  );

  const assignExercise = useCallback(
    (input: AssignExerciseInput): Result => {
      const existing = assignments.filter((a) => a.user_id === input.user_id && a.is_active);
      if (existing.some((a) => a.exercise_id === input.exercise_id)) {
        return { ok: false, error: 'That exercise is already assigned to this client.' };
      }

      const created: AssignedExercise = {
        id: `ae_${Date.now()}`,
        user_id: input.user_id,
        exercise_id: input.exercise_id,
        assigned_by: input.assigned_by,
        prescription: input.prescription.trim(),
        note: input.note.trim() || null,
        sort_order: existing.length + 1,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      persistAssignments([...assignments, created]);
      return { ok: true };
    },
    [assignments, persistAssignments]
  );

  const removeAssignment = useCallback(
    (assignmentId: string) => {
      persistAssignments(assignments.filter((a) => a.id !== assignmentId));
    },
    [assignments, persistAssignments]
  );

  const value = useMemo<DirectoryContextValue>(
    () => ({
      users,
      assignments,
      loading,
      userById: (id) => {
        if (!id) return null;
        // The signed-in user is known from the session even when the roster is
        // not loaded — which is the case for every member.
        if (currentUser && currentUser.id === id) return currentUser;
        return users.find((u) => u.id === id) ?? null;
      },
      assignmentsFor: (userId) =>
        assignments
          .filter((a) => a.user_id === userId && a.is_active)
          .sort((a, b) => a.sort_order - b.sort_order),
      createUser,
      setUserStatus,
      assignExercise,
      removeAssignment,
      reload,
    }),
    [
      users,
      assignments,
      loading,
      currentUser,
      createUser,
      setUserStatus,
      assignExercise,
      removeAssignment,
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
