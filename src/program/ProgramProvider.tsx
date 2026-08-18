import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'app.program.selected';

type ProgramContextValue = {
  /** The program the user picked after signing in, or null before they have. */
  programId: string | null;
  hasSelected: boolean;
  selectProgram: (id: string) => void;
  clearProgram: () => void;
};

const ProgramContext = createContext<ProgramContextValue | null>(null);

/**
 * Holds the program chosen in the step between sign-in and the main tabs.
 * Backed by AsyncStorage for V1; this moves to the user's record on the
 * server once the backend exists.
 */
export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [programId, setProgramId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setProgramId(stored);
      setHydrated(true);
    });
  }, []);

  const selectProgram = (id: string) => {
    setProgramId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  const clearProgram = () => {
    setProgramId(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<ProgramContextValue>(
    () => ({ programId, hasSelected: !!programId, selectProgram, clearProgram }),
    [programId]
  );

  if (!hydrated) return null;

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error('useProgram must be used within ProgramProvider');
  return ctx;
}
