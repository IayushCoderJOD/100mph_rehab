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

  // Movements added from the app may leave any of these blank; a heading with
  // nothing under it reads as something failed to load, so it is left out.
  const prerequisites = exercise.prerequisites?.trim() || null;
  const instructions = exercise.instructions?.trim() || null;
  const purpose = exercise.purpose?.trim() || null;
  const specs = [
    prerequisites ? { label: 'Prerequisites', value: prerequisites } : null,
    method !== undefined ? { label: 'Method', value: method } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <>
      <VideoPoster videoUrl={exercise.video_url} posterUrl={exercise.thumbnail_url} />

      <Text variant="display" style={styles.name}>
        {exercise.name}
      </Text>
      {exercise.focus ? (
        <Text variant="subtitle" color="textSecondary" style={styles.focus}>
          {exercise.focus}
        </Text>
      ) : null}

      {specs.length > 0 ? (
        <View
          style={[styles.specs, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
        >
          {specs.map((row, index) => (
            <SpecRow key={row.label} label={row.label} value={row.value} last={index === specs.length - 1} />
          ))}
        </View>
      ) : null}

      {instructions ? (
        <Section label="INSTRUCTIONS">
          <Text variant="body" color="textSecondary" style={styles.prose}>
            {instructions}
          </Text>
        </Section>
      ) : null}

      {purpose ? (
        <Section label="PURPOSE">
          <Text variant="body" color="textSecondary" style={styles.prose}>
            {purpose}
          </Text>
        </Section>
      ) : null}
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
