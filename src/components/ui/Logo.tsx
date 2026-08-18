import { Image } from 'react-native';
import { useTheme } from '@/theme';

/**
 * 100mph High Performance logo.
 *
 * Two variants ship so the wordmark stays readable on either theme: the
 * artwork is dark by default and inverted to white for dark backgrounds.
 * Both are generated from assets/100mph_Logo.jpg with the white keyed out.
 */
const SOURCES = {
  light: require('../../../assets/brand/logo-on-dark.png'),
  dark: require('../../../assets/brand/logo-on-light.png'),
};

/** Intrinsic aspect ratio of the artwork — the logo is a wide lockup. */
export const LOGO_ASPECT = 2.518;

type LogoProps = {
  /** Rendered height in points; width follows the logo's aspect ratio. */
  height?: number;
  /** `light` = white artwork for dark surfaces. `auto` follows the theme. */
  tone?: 'auto' | 'light' | 'dark';
};

export function Logo({ height = 28, tone = 'auto' }: LogoProps) {
  const { isDark } = useTheme();
  const themeTone = isDark ? 'light' : 'dark';
  const resolved = tone === 'auto' ? themeTone : tone;

  return (
    <Image
      source={SOURCES[resolved]}
      style={{ height, width: height * LOGO_ASPECT }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="100mph High Performance"
    />
  );
}
