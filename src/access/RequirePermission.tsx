import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { Permission } from './permissions';
import { useAccess } from './useAccess';

type RequirePermissionProps = {
  permission: Permission;
  children: ReactNode;
  /** Where to send someone who should not be here. */
  fallback?: string;
};

/**
 * Route guard. Hiding a button is presentation; this is what actually stops a
 * deep link or a stale back-stack entry from opening a screen. The real
 * enforcement is still the server's — this only keeps the UI honest.
 */
export function RequirePermission({
  permission,
  children,
  fallback = '/(tabs)',
}: RequirePermissionProps) {
  const { can } = useAccess();

  if (!can(permission)) return <Redirect href={fallback} />;

  return <>{children}</>;
}
