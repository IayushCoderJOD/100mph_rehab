import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/**
 * The app's one way of saying "on its way": the accent spinner, centred in
 * the room it is given. A screen shows it in place of the content it is
 * fetching, rather than a line of text.
 */
export function Loader({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
});
