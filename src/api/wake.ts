import { useSyncExternalStore } from 'react';
import { API_BASE_URL } from './config';
import { endpoints } from './endpoints';

/**
 * Waits out an API that has been put to sleep.
 *
 * A host that idles the API after a quiet spell (Render's free plan, a
 * scale-to-zero container) holds the first request open while it boots, which
 * can take a minute — well past REQUEST_TIMEOUT_MS. Left alone, the first tap
 * after a break fails with "cannot reach the server" and the second one works.
 *
 * So before a request goes out after a quiet spell, a health check goes first
 * and every request waits behind it. The real request is only sent once the
 * server answers, which means it is never cut off mid-boot and never retried —
 * nothing that writes can land twice. The app also calls this on launch, so
 * the boot overlaps with the member reading the screen or typing a password.
 *
 * On an always-on host this costs one tiny request per ten quiet minutes.
 */

/** Hosts idle an API after ~15 quiet minutes; check again well before that. */
const TRUST_CONTACT_FOR_MS = 10 * 60 * 1000;
/** Only tell the member something is happening once the wait is noticeable. */
const SLOW_AFTER_MS = 2500;
/** A boot longer than this is not a boot; let the real request fail and say so. */
const GIVE_UP_AFTER_MS = 120 * 1000;
/** One health attempt. The host holds it open while booting, so give it room. */
const ATTEMPT_TIMEOUT_MS = 60 * 1000;
const RETRY_EVERY_MS = 3000;
/** A failure faster than this is the phone being offline, not a server booting. */
const INSTANT_FAILURE_MS = 1500;

let lastContactAt = 0;
let wakeInFlight: Promise<void> | null = null;
let waking = false;
const listeners = new Set<() => void>();

function setWaking(next: boolean) {
  if (waking === next) return;
  waking = next;
  listeners.forEach((listener) => listener());
}

/** Any response at all — even an error — means the server is up. */
export function markServerContact() {
  lastContactAt = Date.now();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pingUntilAwake(): Promise<void> {
  const slowTimer = setTimeout(() => setWaking(true), SLOW_AFTER_MS);
  const deadline = Date.now() + GIVE_UP_AFTER_MS;

  try {
    while (Date.now() < deadline) {
      const started = Date.now();
      const controller = new AbortController();
      const attemptTimer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE_URL}${endpoints.health}`, { signal: controller.signal });
        // A 5xx is the host's proxy answering for a server still booting.
        if (response.status < 500) {
          markServerContact();
          return;
        }
      } catch {
        // Offline, DNS failure, connection refused: these fail at once, and
        // waiting would only delay the error the member needs to see.
        if (Date.now() - started < INSTANT_FAILURE_MS) return;
      } finally {
        clearTimeout(attemptTimer);
      }
      await sleep(RETRY_EVERY_MS);
    }
  } finally {
    clearTimeout(slowTimer);
    setWaking(false);
  }
}

/**
 * Resolves once the API has answered recently, waking it first if needed.
 * Never rejects: if the server stays unreachable, the real request fails with
 * its own, accurate error.
 */
export function ensureServerAwake(): Promise<void> {
  if (Date.now() - lastContactAt < TRUST_CONTACT_FOR_MS) return Promise.resolve();
  if (!wakeInFlight) {
    wakeInFlight = pingUntilAwake().finally(() => {
      wakeInFlight = null;
    });
  }
  return wakeInFlight;
}

/** True while the app is visibly waiting for the server to boot. */
export function useServerWaking(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waking,
    () => false
  );
}
