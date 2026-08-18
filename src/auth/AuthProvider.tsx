import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'app.auth.phone';

type AuthContextValue = {
  isAuthenticated: boolean;
  identifier: string | null;
  pendingPhone: string | null;
  requestOtp: (phone: string) => void;
  verifyOtp: (code: string) => Promise<boolean>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Static auth for V1. `verifyOtp` accepts any input; real verification
 * (Supabase Auth / SMS provider) slots in behind these same methods later.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setIdentifier(stored);
      setHydrated(true);
    });
  }, []);

  const persist = (value: string) => {
    setIdentifier(value);
    setPendingPhone(null);
    AsyncStorage.setItem(STORAGE_KEY, value);
  };

  const requestOtp = (next: string) => setPendingPhone(next);

  const verifyOtp = async (_code: string) => {
    persist(pendingPhone ?? '');
    return true;
  };

  const signInWithPassword = async (email: string, _password: string) => {
    persist(email);
    return true;
  };

  const signOut = () => {
    setIdentifier(null);
    setPendingPhone(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!identifier,
      identifier,
      pendingPhone,
      requestOtp,
      verifyOtp,
      signInWithPassword,
      signOut,
    }),
    [identifier, pendingPhone]
  );

  if (!hydrated) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
