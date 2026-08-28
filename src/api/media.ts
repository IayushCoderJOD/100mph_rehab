/**
 * Where the demonstration footage lives.
 *
 * The catalogue stores a *key* — `demos/back-ext-a7f3c9e1-720.mp4` — not an
 * absolute URL, and this file is the only place that turns one into the other.
 * That indirection is the whole point: the CDN host, the bucket, even the
 * provider can change without touching a single stored document. A full URL is
 * still passed through untouched, so footage hosted somewhere else keeps
 * working while the library is being moved.
 *
 * Nothing here is a secret. These are exercise demonstrations on a public
 * cache-friendly origin; the member's own data never travels this path.
 */
import { MEDIA_BASE_URL } from './config';

/** Absolute already? Leave it alone — it is not ours to rewrite. */
function isAbsolute(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

/**
 * A stored media reference resolved against the CDN, or null.
 *
 * Null in, null out — the catalogue is written before it is filmed, and every
 * component that renders media already treats null as the designed state
 * rather than an error. An unresolvable key returns null for the same reason:
 * a placeholder is a better answer than a broken frame.
 */
export function mediaUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;

  const trimmed = ref.trim();
  if (!trimmed) return null;
  if (isAbsolute(trimmed)) return trimmed;
  if (!MEDIA_BASE_URL) return null;

  return `${MEDIA_BASE_URL}/${trimmed.replace(/^\/+/, '')}`;
}
