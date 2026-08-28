import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/auth/AuthProvider';

type ProgramContextValue = {
  /** The program this user is on, or null when signed out. */
  programId: string | null;
};

const ProgramContext = createContext<ProgramContextValue | null>(null);

/**
 * Which program the signed-in user is on. There is no selection step: a coach
 * assigns the program when they create the account, so this is a read of the
 * user's own record and nothing else. It stays a provider because the schedule
 * and the content bundle both need one answer to "which program", and because
 * a coach reassigning one should move the whole app at once.
 */
export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<ProgramContextValue>(
    () => ({ programId: user?.active_program_id ?? null }),
    [user?.active_program_id]
  );

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error('useProgram must be used within ProgramProvider');
  return ctx;
}
