import { useMemo } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Permission, can, isAdmin } from './permissions';

/**
 * Permission checks for the signed-in user. Prefer this over reading
 * `user.role` in a screen — it keeps the rules in one place.
 */
export function useAccess() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return useMemo(
    () => ({
      role,
      isAdmin: isAdmin(role),
      can: (permission: Permission) => can(role, permission),
    }),
    [role]
  );
}
