import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { ExerciseRow } from '@/components/session';
import { Button, Screen, SegmentedControl, Text } from '@/components/ui';
import { buildSessionPlan } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';
import { useProgramData } from '@/program/programData';
import { useSchedule } from '@/schedule/ScheduleProvider';
import { useTheme } from '@/theme';

type Mode = 'guided' | 'log';

export default function SessionScreen() {
  const router = useRouter();
  const dismiss = useDismiss();
  const { theme } = useTheme();
  const { exercises, sessionExercises } = useProgramData();
  const { today, completeSession } = useSchedule();

  const sessionType = today?.session_type ?? null;
  const plan = useMemo(
    () => buildSessionPlan(sessionType?.id ?? null, exercises, sessionExercises),
    [sessionType, exercises, sessionExercises]
  );

  const [mode, setMode] = useState<Mode>('guided');
  const [running, setRunning] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const finish = () => {
    completeSession();
    dismiss();
  };

  const toggle = (id: string) =>
    setDoneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (!sessionType || plan.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerText} />
          <IconButton name="close" variant="plain" onPress={dismiss} />
        </View>
        <View style={styles.empty}>
          <Text variant="title" align="center">
            Nothing scheduled today
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            Rest is part of the plan. Your next session is waiting on the schedule.
          </Text>
        </View>
      </Screen>
    );
  }

  const completedCount = doneIds.length;
  const progress = completedCount / plan.length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            {running ? 'Session in progress' : "Today's Session"}
          </Text>
          <Text variant="title">{sessionType.name}</Text>
        </View>
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      {running ? (
        <View style={styles.progressBlock}>
          <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.colors.accent },
              ]}
            />
          </View>
          <Text variant="caption" color="textSecondary" style={styles.meta}>
            {completedCount} of {plan.length} exercises done
          </Text>
        </View>
      ) : (
        <Text variant="caption" color="textSecondary" style={styles.meta}>
          {plan.length} exercises · about {sessionType.approx_duration_min} minutes ·{' '}
          {sessionType.is_primary ? 'Main session' : 'Supporting session'}
        </Text>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {plan.map(({ exercise, prescription }, index) => (
          <ExerciseRow
            key={exercise.id}
            position={index + 1}
            name={exercise.name}
            prescription={prescription}
            done={doneIds.includes(exercise.id)}
            onToggle={running ? () => toggle(exercise.id) : undefined}
            onGuide={() => router.push(`/exercise/${exercise.id}`)}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        {running ? (
          <Button
            label={completedCount === plan.length ? 'Finish Session' : 'Finish Early'}
            variant={completedCount === plan.length ? 'primary' : 'secondary'}
            onPress={finish}
          />
        ) : (
          <>
            <SegmentedControl<Mode>
              segments={[
                { label: 'Guided', value: 'guided' },
                { label: 'Log only', value: 'log' },
              ]}
              value={mode}
              onChange={setMode}
            />
            <Text variant="caption" color="textMuted" align="center" style={styles.modeNote}>
              {mode === 'guided'
                ? 'Work through the list and tick each exercise off as you go.'
                : 'Already trained? Mark the whole session done in one tap.'}
            </Text>
            <Button
              label={mode === 'guided' ? 'Start Workout' : 'Log as Complete'}
              onPress={mode === 'guided' ? () => setRunning(true) : finish}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  headerText: { flex: 1, gap: 2 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  meta: { marginTop: 10 },
  progressBlock: { marginTop: 16, gap: 8 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  list: { flex: 1, marginTop: 20 },
  listContent: { gap: 10, paddingBottom: 20 },
  footer: { borderTopWidth: 1, paddingTop: 18, gap: 14 },
  modeNote: { paddingHorizontal: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyNote: { paddingHorizontal: 24 },
});
