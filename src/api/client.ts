import { deviceTimezone } from '@/data';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { endpoints } from './endpoints';
import { ApiError } from './errors';
import { TokenPair, tokenStore } from './tokens';
import { ensureServerAwake, markServerContact } from './wake';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Set for the auth endpoints, which must not carry (or refresh) a token. */
  anonymous?: boolean;
};

/**
 * Called when the session cannot be recovered — a revoked refresh token, or a
 * suspended account. AuthProvider registers a handler that signs the user out,
 * so a dead session ends in the UI rather than as a wall of failed requests.
 */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/**
 * The single in-flight refresh.
 *
 * On a cold start the app fires several requests at once. If the access token
 * has expired they will all 401 together, and each one refreshing on its own
 * would rotate the token N times — with reuse detection on the server, that
 * revokes the whole family and logs the user out. So the first 401 starts a
 * refresh and everyone else awaits the same promise.
 */
let refreshInFlight: Promise<TokenPair | null> | null = null;

async function parseError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('X-Request-Id');
  try {
    const body = await response.json();
    const envelope = body?.error;
    if (envelope?.code) {
      return new ApiError(
        envelope.code,
        envelope.message ?? 'Request failed',
        response.status,
        envelope.details ?? {},
        requestId
      );
    }
  } catch {
    // Not JSON — fall through to a status-shaped error.
  }
  return new ApiError('internal_error', `HTTP ${response.status}`, response.status, {}, requestId);
}

async function rawRequest(path: string, options: RequestOptions, accessToken: string | null) {
  // After a quiet spell the API may be asleep; wait for it before the clock
  // below starts, rather than timing out on the host's boot.
  await ensureServerAwake();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (response.status < 500) markServerContact();
    return response;
  } catch {
    // fetch only rejects on a transport failure; HTTP errors resolve normally.
    throw new ApiError('network_error', 'Could not reach the server', 0);
  } finally {
    clearTimeout(timeout);
  }
}

/** The Web Locks API, where the browser has it. Native has no second tab to race. */
type LockManager = { request: <T>(name: string, callback: () => Promise<T>) => Promise<T> };

/**
 * Serialises refreshes across browser tabs. The in-flight promise below only
 * coalesces within one tab; two tabs share one refresh token in localStorage,
 * and both spending it is, to the server, a stolen token — it revokes the
 * family and signs the member out everywhere.
 */
function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as { locks?: LockManager } | undefined)?.locks;
  return locks ? locks.request('100mph-token-refresh', work) : work();
}

async function refreshTokens(staleAccessToken: string): Promise<TokenPair | null> {
  const stored = await tokenStore.read();
  if (!stored) return null;

  // Someone else — another tab, or an earlier refresh this request raced —
  // already rotated the pair. Use theirs rather than spending the old refresh
  // token a second time.
  if (stored.accessToken !== staleAccessToken) return stored;

  // The zone rides along on every refresh. Sign-in is too rare to keep it
  // honest: the refresh token lasts 30 days, so a member who travels or
  // relocates would otherwise have their day roll over in the old place.
  const response = await rawRequest(
    endpoints.auth.refresh,
    {
      method: 'POST',
      body: { refresh_token: stored.refreshToken, timezone: deviceTimezone() },
    },
    null
  );

  if (!response.ok) {
    // Only a verdict on the token itself ends the session. A 502 during a
    // deploy or a 429 must not sign every member out; it surfaces as an error
    // and the next request tries again with the same, still valid, token.
    if (response.status === 401 || response.status === 403) {
      await tokenStore.clear();
      return null;
    }
    throw await parseError(response);
  }

  const body = await response.json();
  const pair: TokenPair = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
  };
  await tokenStore.save(pair);
  return pair;
}

/** Coalesces concurrent refreshes into one, then clears the slot. */
function refreshOnce(staleAccessToken: string): Promise<TokenPair | null> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(() => refreshTokens(staleAccessToken)).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const stored = options.anonymous ? null : await tokenStore.read();
  let response = await rawRequest(path, options, stored?.accessToken ?? null);

  // One retry, and only for an expired token. A 401 from the auth endpoints
  // themselves is a real failure, not something a refresh can fix.
  if (response.status === 401 && !options.anonymous && stored) {
    const refreshed = await refreshOnce(stored.accessToken);

    if (!refreshed) {
      onSessionExpired?.();
      throw await parseError(response);
    }

    response = await rawRequest(path, options, refreshed.accessToken);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    request<T>(path, { method: 'POST', body, anonymous }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
