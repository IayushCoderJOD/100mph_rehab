import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { ExerciseRow } from '@/components/session';
import { Button, Screen, SegmentedControl, Text } from '@/components/ui';
import { DAY_LABEL, formatShortDate } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';
import { LOG_WINDOW_DAYS, usePlan } from '@/plan/PlanProvider';
import { useTheme } from '@/theme';

type Mode = 'guided' | 'log';

export default function SessionScreen() {
  const router = useRouter();
  const dismiss = useDismiss();
  const { theme } = useTheme();
  const { todayIso, dayFor, canLog, logSession, unlogSession } = usePlan();
  const { date } = useLocalSearchParams<{ date?: string }>();

  // No date param means today, so the home screen's primary action is unchanged.
  const targetIso = date ?? todayIso;
  const day = dayFor(targetIso);
  const plan = day.plan;

  const isToday = targetIso === todayIso;
  const isFuture = targetIso > todayIso;
  const alreadyDone = day.status === 'completed';
  // A past day inside the window can still be logged — people forget, and a
  // session that happened should count. Only the future is read-only.
  const loggable = canLog(targetIso) && !alreadyDone;
  // A tick made by mistake can be taken back inside the same window.
  const undoable = alreadyDone && canLog(targetIso);

  const [mode, setMode] = useState<Mode>('guided');
  const [running, setRunning] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await logSession({
      date: targetIso,
      completedExerciseIds: running ? doneIds : [],
      source: running ? 'guided' : 'logged',
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dismiss();
  };

  const undo = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await unlogSession(targetIso);
    setSaving(false);
    if (!result.ok) setError(result.error);
  };

  const toggle = (id: string) =>
    setDoneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const dayLabel = `${DAY_LABEL[day.day_of_week]} · ${formatShortDate(targetIso)}`;

  // Carry the date into the guide so the prescription shown is the one this
  // day asks for, not whatever today happens to prescribe.
  const openGuide = (exerciseId: string) =>
    router.push(isToday ? `/exercise/${exerciseId}` : `/exercise/${exerciseId}?date=${targetIso}`);

  if (plan.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="label" color="textSecondary" style={styles.kicker}>
              {dayLabel}
            </Text>
          </View>
          <IconButton name="close" variant="plain" onPress={dismiss} />
        </View>
        <View style={styles.empty}>
          <Text variant="title" align="center">
            {isToday ? 'Nothing scheduled today' : 'Rest day'}
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            Rest is part of the plan. Your next session is waiting on the week.
          </Text>
        </View>
      </Screen>
    );
  }

  const completedCount = doneIds.length;
  const progress = completedCount / plan.length;

  const kicker = running ? 'Session in progress' : isToday ? "Today's Session" : dayLabel;
  const title = `${DAY_LABEL[day.day_of_week]} Session`;

  const readOnlyNote = alreadyDone
    ? 'You completed this session.'
    : isFuture
      ? 'This is the plan for that day. You can log it when it comes around.'
      : `Sessions can be logged up to ${LOG_WINDOW_DAYS} days back. That day is further than that.`;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            {kicker}
          </Text>
          <Text variant="title">{title}</Text>
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
          {plan.length} exercise{plan.length === 1 ? '' : 's'}
          {!isToday && loggable ? ' · not logged yet' : ''}
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
            onGuide={() => openGuide(exercise.id)}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        {error ? (
          <Text variant="caption" color="danger" align="center">
            {error}
          </Text>
        ) : null}

        {!loggable ? (
          <>
            <Text variant="caption" color="textMuted" align="center" style={styles.modeNote}>
              {readOnlyNote}
            </Text>
            {undoable ? (
              <Button label="Undo — Mark as Not Done" variant="ghost" loading={saving} onPress={() => void undo()} />
            ) : null}
          </>
        ) : running ? (
          <Button
            label={completedCount === plan.length ? 'Finish Session' : 'Finish Early'}
            variant={completedCount === plan.length ? 'primary' : 'secondary'}
            loading={saving}
            onPress={() => void finish()}
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
                : isToday
                  ? 'Already trained? Mark the whole session done in one tap.'
                  : `Did this on ${DAY_LABEL[day.day_of_week]} but forgot to log it? Mark it done now.`}
            </Text>
            <Button
              label={mode === 'guided' ? 'Start Workout' : isToday ? 'Log as Complete' : `Log ${DAY_LABEL[day.day_of_week]} as Complete`}
              loading={saving && mode === 'log'}
              onPress={mode === 'guided' ? () => setRunning(true) : () => void finish()}
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
