import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Loader } from '../ui/Loader';
import { ServerWakeNotice } from './ServerWakeNotice';

/**
 * What the app shows while it checks a saved sign-in with the server. That
 * check is the first request a returning member makes, so on a server that has
 * gone to sleep it can take most of a minute — a blank screen for that long
 * reads as a crash.
 */
export function StartupScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <Loader />
      <ServerWakeNotice />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
});
