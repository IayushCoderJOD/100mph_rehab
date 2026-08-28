/**
 * Honorifics that are not the person's name. Splitting on the first space
 * greets "Dr. Priya Nair" as "Dr.", which reads as a bug to everyone who sees
 * it — and clinicians are exactly the users who carry one.
 */
const HONORIFICS = new Set(['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.']);

/** The name to greet someone by. Falls back to the whole string if it is one word. */
export function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const named = parts.filter((part) => !HONORIFICS.has(part.toLowerCase()));
  return (named[0] ?? parts[0]) || null;
}
