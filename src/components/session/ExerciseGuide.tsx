import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Exercise } from '@/data';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';
import { VideoPoster } from './VideoPoster';

/** An accent tick before the label, so sections read as a spine down the page. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.tick, { backgroundColor: theme.colors.accent }]} />
        <Text variant="label" color="accentText" style={styles.sectionLabel}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

function SpecRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.specRow,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
      ]}
    >
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.specValue}>
        {value}
      </Text>
    </View>
  );
}

type ExerciseGuideProps = {
  exercise: Exercise;
  /**
   * How this exercise is prescribed, e.g. '3 x 10'. Left out where there is no
   * prescription yet — a coach previewing the catalogue has not written one.
   */
  method?: string;
};

/**
 * One exercise, the way a member reads it: the demonstration, then what it
 * asks for and why. Shared by the member's guide screen and the coach's
 * preview in the exercise picker, so both see exactly the same thing.
 */
export function ExerciseGuide({ exercise, method }: ExerciseGuideProps) {
  const { theme } = useTheme();

  return (
    <>
      <VideoPoster videoUrl={exercise.video_url} posterUrl={exercise.thumbnail_url} />

      <Text variant="display" style={styles.name}>
        {exercise.name}
      </Text>
      <Text variant="subtitle" color="textSecondary" style={styles.focus}>
        {exercise.focus}
      </Text>

      <View
        style={[styles.specs, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
      >
        <SpecRow label="Prerequisites" value={exercise.prerequisites} last={method === undefined} />
        {method !== undefined ? <SpecRow label="Method" value={method} last /> : null}
      </View>

      <Section label="INSTRUCTIONS">
        <Text variant="body" color="textSecondary" style={styles.prose}>
          {exercise.instructions}
        </Text>
      </Section>

      <Section label="PURPOSE">
        <Text variant="body" color="textSecondary" style={styles.prose}>
          {exercise.purpose}
        </Text>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  name: { marginTop: 26 },
  focus: { marginTop: 4 },
  specs: { borderWidth: 1, marginTop: 22, paddingHorizontal: 16 },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
  },
  specValue: { flexShrink: 1, textAlign: 'right' },
  section: { marginTop: 30, gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 3, height: 14, borderRadius: 2 },
  sectionLabel: { letterSpacing: 1.4 },
  prose: { lineHeight: 24 },
});
