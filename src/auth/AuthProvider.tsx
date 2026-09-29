import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Entitlement, authApi, messageFor, setSessionExpiredHandler, tokenStore } from '@/api';
import { User, deviceTimezone } from '@/data';
import { StartupScreen } from '@/components/common/StartupScreen';

type AuthContextValue = {
  isAuthenticated: boolean;
  /** The signed-in user record, or null. Role lives here; check it via useAccess. */
  user: User | null;
  /**
   * What the server says this account may do. Computed server-side and the
   * only thing worth branching on for access — never derive it on the device.
   */
  entitlement: Entitlement | null;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  /** The reason the last sign-in failed, already mapped to user-facing copy. */
  error: string | null;
  signOut: () => void;
  /**
   * Deletes this account and all of its data, then signs out. Rejects with the
   * server's error — a wrong password, or the practice's last admin — and
   * leaves the session as it was.
   */
  deleteAccount: (password: string) => Promise<void>;
  /** Said once on the sign-in screen after the account was deleted. */
  notice: string | null;
  /** Re-reads GET /me. Call after something changes the account server-side. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Real auth against the 100mph API.
 *
 * Tokens live in the device keychain and are refreshed transparently by the API
 * client, so nothing above this provider has to know they exist. What this owns
 * is the session: who is signed in, what they are entitled to, and ending it
 * when the server says the session is gone.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const clearSession = useCallback(() => {
    setUser(null);
    setEntitlement(null);
  }, []);

  const loadSession = useCallback(async () => {
    const me = await authApi.me();
    setUser(me.user);
    setEntitlement(me.entitlement);
  }, []);

  // A refresh token that the server has revoked cannot be recovered from, so
  // the client tells us rather than leaving the UI in a signed-in-but-broken
  // state. Registered once, for the lifetime of the app.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  // Cold start: if there is a stored token, find out whether it is still good.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await tokenStore.read();
        if (!stored) return;
        await loadSession();
      } catch {
        // Expired, revoked, or the server is down. Either way we start signed
        // out; the tokens are already cleared by the client if they were bad.
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSession, clearSession]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setNotice(null);
      try {
        const signedIn = await authApi.signIn(email, password, deviceTimezone());
        setUser(signedIn);

        // The login response carries the user but not the entitlement, so pull
        // the boot call before handing control to the app.
        try {
          await loadSession();
        } catch {
          // Signed in but the follow-up failed; the app can still render and
          // will re-read on its next refresh.
        }
        return true;
      } catch (err) {
        setError(messageFor(err));
        clearSession();
        return false;
      }
    },
    [loadSession, clearSession]
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      await authApi.deleteAccount(password);
      clearSession();
      setError(null);
      setNotice('Your account and everything in it have been deleted.');
    },
    [clearSession]
  );

  const signOut = useCallback(() => {
    clearSession();
    setError(null);
    // Fire-and-forget: the local state is already signed out, and a failed
    // revoke must not leave the user staring at the app they just left.
    void authApi.signOut();
  }, [clearSession]);

  const refresh = useCallback(async () => {
    try {
      await loadSession();
    } catch {
      clearSession();
    }
  }, [loadSession, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!user,
      user,
      entitlement,
      signInWithPassword,
      error,
      signOut,
      deleteAccount,
      notice,
      refresh,
    }),
    [user, entitlement, signInWithPassword, error, signOut, deleteAccount, notice, refresh]
  );

  if (!hydrated) return <StartupScreen />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
