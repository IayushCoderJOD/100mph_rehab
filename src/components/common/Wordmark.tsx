import { StyleSheet, View } from 'react-native';
import { Logo } from '../ui/Logo';

type WordmarkProps = {
  /** Height of the logo in points. */
  height?: number;
};

/**
 * Brand lockup for screen headers. The name and "HIGH PERFORMANCE" tagline
 * are part of the logo artwork, so nothing is set in type here.
 */
export function Wordmark({ height = 34 }: WordmarkProps) {
  return (
    <View style={styles.wrap}>
      <Logo height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
