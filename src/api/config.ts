import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * `localhost` only means "this machine" on the web build and the iOS simulator.
 * A real phone on your wifi has to be told the dev machine's LAN address, so in
 * development we derive it from the Metro host Expo already connected to —
 * which is the same machine the API runs on. Set EXPO_PUBLIC_API_BASE_URL to
 * override, and always set it for a release build.
 */
const DEV_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? 8080);

function inferDevHost(): string | null {
  // e.g. "192.168.1.14:8081" — the host Metro is being served from.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  return host ? `http://${host}:${DEV_PORT}/v1` : null;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  inferDevHost() ??
  `http://localhost:${DEV_PORT}/v1`;

/**
 * Where the demonstration videos and their posters are served from, without a
 * trailing slash — e.g. `https://media.100mph.in`.
 *
 * Deliberately separate from API_BASE_URL. The API is one origin in one region
 * that must be reached to answer anything; media is a static library that lives
 * on a CDN and is cached at the edge nearest the member. Pointing them at the
 * same host would give up that difference for nothing.
 *
 * Unset is a supported state: `mediaUrl()` then resolves every key to null and
 * the app renders its "coming soon" placeholders, which is exactly right before
 * the footage exists.
 */
export const MEDIA_BASE_URL = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

/**
 * How long a single request may take before we stop waiting on it.
 *
 * Sized for the worst honest case rather than the local one: a member on mobile
 * data several thousand kilometres from the API region pays TLS setup plus
 * round-trip on every call, and 15s put a cold start inside the margin. This is
 * a ceiling on hopeless requests, not a target — nothing waits this long when
 * the network is healthy.
 */
export const REQUEST_TIMEOUT_MS = 25000;
