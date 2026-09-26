/**
 * Where the layout stops being a phone layout.
 *
 * Deliberately two numbers rather than a ladder of device names: the app was
 * drawn for a phone and a phone is still the common case, so what matters is
 * the width at which a single phone-width column stops being the right answer,
 * not which device happens to be that wide.
 */
export const breakpoints = {
  tablet: 600,
  desktop: 1024,
} as const;

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export function breakpointFor(width: number): Breakpoint {
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'phone';
}

/**
 * How wide the reading column may get, per breakpoint.
 *
 * Past roughly 700px a line of body copy gets hard to track back to, so the
 * column stops growing and the page gutters absorb the extra width instead.
 * `undefined` on a phone means "no cap" — the screen is already the cap.
 */
export const contentMaxWidth: Record<Breakpoint, number | undefined> = {
  phone: undefined,
  tablet: 680,
  desktop: 760,
};
