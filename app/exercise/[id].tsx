import { useLocalSearchParams } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { VideoPoster } from '@/components/session';
import { Screen, Text } from '@/components/ui';
import { findExercise } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';
import { useProgramData } from '@/program/programData';
import { useSchedule } from '@/schedule/ScheduleProvider';
import { useTheme } from '@/theme';

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

export default function ExerciseGuideScreen() {
  const dismiss = useDismiss();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, sessionExercises } = useProgramData();
  const { today } = useSchedule();

  const exercise = findExercise(exercises, id ?? null);

  // Prefer what today's session asks for; fall back to wherever else the
  // exercise is prescribed, so the guide is readable outside a session too.
  const todayTypeId = today?.session_type?.id ?? null;
  const links = sessionExercises.filter((link) => link.exercise_id === id);
  const prescription =
    links.find((link) => link.session_type_id === todayTypeId)?.prescription ??
    links[0]?.prescription ??
    null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      {!exercise ? (
        <View style={styles.empty}>
          <Text variant="title" align="center">
            Exercise not found
          </Text>
        </View>
      ) : (
        <>
          <VideoPoster videoUrl={exercise.video_url} />

          <Text variant="display" style={styles.name}>
            {exercise.name}
          </Text>
          <Text variant="subtitle" color="textSecondary" style={styles.focus}>
            {exercise.focus}
          </Text>

          <View
            style={[
              styles.specs,
              { borderColor: theme.colors.border, borderRadius: theme.radius.md },
            ]}
          >
            <SpecRow label="Prerequisites" value={exercise.prerequisites} />
            <SpecRow label="Method" value={prescription ?? 'As prescribed'} last />
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
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  headerSpacer: { flex: 1 },
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
  empty: { paddingTop: 80 },
});
