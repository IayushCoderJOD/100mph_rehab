import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type PainScaleProps = {
  value: number | null;
  onChange: (value: number) => void;
};

/**
 * Severity in words rather than colour — a red pill would encode state with
 * colour alone, and the wording is what the user is actually being asked for.
 */
export function describePain(score: number): string {
  if (score === 0) return 'No pain at all';
  if (score <= 2) return 'Barely noticeable';
  if (score <= 4) return 'Mild — easy to work around';
  if (score <= 6) return 'Moderate — hard to ignore';
  if (score <= 8) return 'Strong — limiting what you do';
  return 'Severe — everything is difficult';
}

export function PainScale({ value, onChange }: PainScaleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      {/* Wraps to two centred rows on a phone, one row where there is room. */}
      <View style={styles.grid}>
        {SCORES.map((score) => {
          const active = value === score;

          return (
            <Pressable
              key={score}
              onPress={() => onChange(score)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${score} out of 10`}
              style={({ pressed }) => [
                styles.pill,
                {
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                  backgroundColor: active ? theme.colors.accentSoft : 'transparent',
                  opacity: pressed && !active ? 0.6 : 1,
                },
                active && {
                  shadowColor: theme.colors.accentGlow,
                  shadowOpacity: 0.7,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                },
              ]}
            >
              <Text variant="bodyStrong" color={active ? 'accentText' : 'textSecondary'}>
                {score}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Text variant="caption" color="textMuted">
          0 · None
        </Text>
        <Text variant="caption" color="textMuted">
          10 · Severe
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
});
