import { ClientDetail, adminApi } from '@/api';
import { useRemote } from '@/hooks/useRemote';

/**
 * The whole picture of one client in one call — what the coach opens before a
 * consultation. Server-assembled, so the check-ins the member logged a minute
 * ago are already in it.
 */
export function useClientDetail(userId: string | null) {
  return useRemote<ClientDetail>(
    () => adminApi.client(userId as string),
    [userId],
    !!userId
  );
}
