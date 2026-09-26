import { useCallback, useMemo, useState } from 'react';

/**
 * Mouse hover state for a <Pressable>.
 *
 * A phone only has a pressed state, so that is all the app was built with —
 * but on a desktop browser the pointer arrives long before the click, and a
 * control that does not acknowledge it reads as inert. `onHoverIn`/`onHoverOut`
 * are part of the cross-platform Pressable API and simply never fire on a
 * touch device, so this costs nothing on iOS or Android and needs no platform
 * branch.
 *
 * Returned as props to spread rather than as handlers to wire up, so a caller
 * cannot half-adopt it and end up stuck in a hovered state.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);

  const onHoverIn = useCallback(() => setHovered(true), []);
  const onHoverOut = useCallback(() => setHovered(false), []);

  const hoverProps = useMemo(() => ({ onHoverIn, onHoverOut }), [onHoverIn, onHoverOut]);

  return { hovered, hoverProps };
}
