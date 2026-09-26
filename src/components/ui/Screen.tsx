import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useBreakpoint } from '@/responsive';
import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Let the content run the full width of the window instead of stopping at a
   * readable column. For screens that are genuinely a canvas rather than a
   * page — a full-bleed video, a chart that earns the extra width.
   */
  fullBleed?: boolean;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = ['top', 'bottom'],
  contentStyle,
  fullBleed = false,
}: ScreenProps) {
  const { theme } = useTheme();
  const { maxContentWidth } = useBreakpoint();
  const padding = padded ? { paddingHorizontal: theme.spacing(5) } : null;

  // On a phone this is `undefined` and changes nothing — the screen is already
  // the limit. On a tablet or a desktop browser it stops a layout drawn for a
  // 390pt column from being stretched across 1500px of monitor, which is the
  // single biggest thing that makes a ported phone app look wrong on the web.
  const column: ViewStyle | null =
    fullBleed || !maxContentWidth
      ? null
      : { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padding, column, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, column, contentStyle]}>{children}</View>
  );

  const inner = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={edges}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
});
