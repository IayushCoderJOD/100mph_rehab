import { useWindowDimensions } from 'react-native';
import { Breakpoint, breakpointFor, contentMaxWidth } from './breakpoints';

export type BreakpointInfo = {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True from tablet up — the common "this is not a phone" test. */
  isWide: boolean;
  maxContentWidth: number | undefined;
};

/**
 * The current layout size.
 *
 * Built on useWindowDimensions rather than a media query so it behaves the same
 * on all three platforms: a browser window being dragged wider re-renders for
 * the same reason an iPad rotating does.
 */
export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = breakpointFor(width);

  return {
    width,
    height,
    breakpoint,
    isPhone: breakpoint === 'phone',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint !== 'phone',
    maxContentWidth: contentMaxWidth[breakpoint],
  };
}
