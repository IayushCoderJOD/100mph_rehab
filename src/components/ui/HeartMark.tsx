import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { palette } from '@/theme';

/**
 * The heart mark used inside the app — progress, completion, empty states.
 * Distinct from the 100mph logo, which identifies the brand in headers.
 */
const HEART =
  'M50 87 C50 87 12 62 12 36 C12 21 24 13 35 13 C43 13 48 18 50 25 C52 18 57 13 65 13 C76 13 88 21 88 36 C88 62 50 87 50 87 Z';

export function HeartMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id="heartFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.cyan} />
          <Stop offset="1" stopColor={palette.blue} />
        </SvgGradient>
        <ClipPath id="heartClip">
          <Path d={HEART} />
        </ClipPath>
      </Defs>

      <Path d={HEART} fill="url(#heartFill)" />

      <G clipPath="url(#heartClip)">
        <Path
          d="M-5 40 Q 30 24 55 40 T 108 38 L 108 55 Q 70 44 42 58 T -5 56 Z"
          fill={palette.white}
          opacity={0.92}
        />
        <Path
          d="M-5 55 Q 30 42 58 56 T 108 52 L 108 92 L -5 92 Z"
          fill={palette.gray300}
          opacity={0.55}
        />
      </G>
    </Svg>
  );
}
