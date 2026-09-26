import { useCallback, useEffect, useRef, useState } from 'react';
import { messageFor } from '@/api';

export type Remote<T> = {
  data: T | null;
  /** True only for the first load; a reload keeps the old data on screen. */
  loading: boolean;
  /** User-facing copy for the last failure, or null. */
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * One server read with the three states every screen has to handle. Keeps the
 * previous data through a reload so pulling again never blanks a list, and
 * ignores a result that lands after the screen has moved on.
 */
export function useRemote<T>(fetcher: () => Promise<T>, deps: unknown[], enabled = true): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setError(null);
    try {
      const result = await fetcher();
      if (ticket === generation.current) setData(result);
    } catch (err) {
      if (ticket === generation.current) setError(messageFor(err));
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!enabled) {
      generation.current += 1;
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [enabled, load]);

  return { data, loading, error, reload: load };
}
