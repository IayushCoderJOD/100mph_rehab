import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Closing a modal. `router.back()` alone throws away the close action when
 * there is no history — reloading straight onto a modal route, or opening its
 * URL directly — so fall back to replacing it with the screen it sits over.
 */
export function useDismiss(fallback = '/(tabs)') {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, [router, fallback]);
}
